import Foundation
import CryCore

struct FixtureScenario: Decodable, Sendable {
    struct TimedFrame: Decodable, Sendable {
        var afterMs: Double
        var frame: ServerFrame
    }

    struct SocketFrame: Decodable, Sendable {
        var afterMs: Double
        var data: JSONValue
    }

    var signedIn: Bool
    var snapshot: BotsSnapshot
    var threads: [ThreadID: ThreadPage]
    var responses: [String: JSONValue]
    var frames: [TimedFrame]
    var sockets: [String: [SocketFrame]]

    init(signedIn: Bool, snapshot: BotsSnapshot,
         threads: [ThreadID: ThreadPage] = [:], responses: [String: JSONValue] = [:],
         frames: [TimedFrame] = [], sockets: [String: [SocketFrame]] = [:]) {
        self.signedIn = signedIn
        self.snapshot = snapshot
        self.threads = threads
        self.responses = responses
        self.frames = frames
        self.sockets = sockets
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        signedIn = try values.decode(Bool.self, forKey: .signedIn)
        snapshot = try values.decode(BotsSnapshot.self, forKey: .snapshot)
        threads = try values.decodeIfPresent([String: ThreadPage].self, forKey: .threads) ?? [:]
        responses = try values.decodeIfPresent([String: JSONValue].self, forKey: .responses) ?? [:]
        frames = try values.decodeIfPresent([TimedFrame].self, forKey: .frames) ?? []
        sockets = try values.decodeIfPresent([String: [SocketFrame]].self, forKey: .sockets) ?? [:]
        guard frames.allSatisfy({ $0.afterMs.isFinite && $0.afterMs >= 0 }),
              sockets.values.joined().allSatisfy({ $0.afterMs.isFinite && $0.afterMs >= 0 }) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Invalid fixture timing"))
        }
    }

    private enum CodingKeys: String, CodingKey { case signedIn, snapshot, threads, responses, frames, sockets }

    static func load(named name: String, bundle: Bundle? = nil) throws -> Self {
        let bundle = bundle ?? Bundle(for: FixtureBundleMarker.self)
        guard !name.isEmpty, !name.contains("/"), !name.contains("\\"), name != ".", name != ".." else {
            throw FixtureError.missingScenario(name)
        }
        if let url = bundle.url(forResource: name, withExtension: "json") {
            return try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        }
        if let root = bundle.resourceURL,
           let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil) {
            for case let url as URL in enumerator where url.lastPathComponent == "\(name).json" {
                return try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
            }
        }
        throw FixtureError.missingScenario(name)
    }
}

private final class FixtureBundleMarker: NSObject {}

enum FixtureError: Error, Equatable {
    case missingScenario(String)
    case missingResponse(String)
    case invalidBinary
    case socketClosed
    case concurrentReceive
}

struct FixtureRequest: Equatable {
    enum RecordedOperation: String { case request, events, upload, download, socket, socketSend, socketClose }
    var operation: RecordedOperation
    var method: String
    var path: String
    var query: [URLQueryItem] = []
    var body: Data? = nil
    var headers: [String: String] = [:]
    var since: String? = nil
    var screens: Bool? = nil
    var payload: WebSocketPayload? = nil
}

final class FixtureTransport: Transport, @unchecked Sendable {
    let scenario: FixtureScenario
    private let clock: ShellClock
    private let lock = NSLock()
    private var recordedRequests: [FixtureRequest] = []

    var requests: [FixtureRequest] { lock.withLock { recordedRequests } }

    init(scenario: FixtureScenario, clock: ShellClock = .continuous) {
        self.scenario = scenario
        self.clock = clock
    }

    convenience init(scenario name: String) throws {
        try self.init(scenario: FixtureScenario.load(named: name))
    }

    func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R {
        record(endpoint, operation: .request)
        return try endpoint.decode(responseData(for: endpoint))
    }

    func upload(_ data: Data, to endpoint: Endpoint<UploadResponse>) async throws -> UploadResponse {
        record(endpoint, operation: .upload, body: data)
        return try endpoint.decode(responseData(for: endpoint))
    }

    func download(_ endpoint: Endpoint<Data>) async throws -> Data {
        record(endpoint, operation: .download)
        let key = "\(endpoint.method.rawValue) \(endpoint.path)"
        guard let value = scenario.responses[key] else { throw FixtureError.missingResponse(key) }
        if let base64 = value["base64"]?.stringValue {
            guard let data = Data(base64Encoded: base64) else { throw FixtureError.invalidBinary }
            return try endpoint.decode(data)
        }
        if let text = value.stringValue { return try endpoint.decode(Data(text.utf8)) }
        return try endpoint.decode(JSONEncoder().encode(value))
    }

    func events(since: String?, screens: Bool) -> AsyncThrowingStream<ServerFrame, Error> {
        record(FixtureRequest(operation: .events, method: "GET", path: "/api/events", since: since, screens: screens))
        let entries = scenario.frames.enumerated().sorted {
            $0.element.afterMs == $1.element.afterMs ? $0.offset < $1.offset : $0.element.afterMs < $1.element.afterMs
        }.map(\.element)
        var frameCursor: String?
        var startIndex = 0
        for (index, entry) in entries.enumerated() {
            if let next = FrameCursor.value(for: entry.frame, previous: frameCursor) {
                frameCursor = next
                if let since, next == since { startIndex = index + 1 }
            }
        }
        let clock = clock
        return AsyncThrowingStream { continuation in
            let task = Task {
                let start = clock.now()
                let offset = startIndex > 0 ? entries[startIndex - 1].afterMs : 0
                do {
                    for entry in entries.dropFirst(startIndex) {
                        let remaining = (entry.afterMs - offset) / 1_000 - (clock.now() - start)
                        if remaining > 0 { try await clock.sleep(remaining) }
                        try Task.checkCancellation()
                        continuation.yield(entry.frame)
                    }
                } catch { continuation.finish(throwing: error) }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    func webSocket(path: String) async throws -> any WebSocketChannel {
        record(FixtureRequest(operation: .socket, method: "GET", path: path))
        guard let entries = scenario.sockets[path] else { throw FixtureError.missingResponse(path) }
        return FixtureSocket(entries: entries, clock: clock) { [weak self] operation, payload in
            self?.record(FixtureRequest(operation: operation, method: "WS", path: path, payload: payload))
        }
    }

    private func responseData<R: Decodable>(for endpoint: Endpoint<R>) throws -> Data {
        let key = "\(endpoint.method.rawValue) \(endpoint.path)"
        var components = URLComponents()
        components.queryItems = endpoint.query.isEmpty ? nil : endpoint.query
        if let query = components.percentEncodedQuery, let value = scenario.responses["\(key)?\(query)"] {
            return try JSONEncoder().encode(value)
        }
        if let value = scenario.responses[key] { return try JSONEncoder().encode(value) }
        if endpoint.method == .get, endpoint.path == "/api/bots" { return try JSONEncoder().encode(scenario.snapshot) }
        let segments = endpoint.path.split(separator: "/")
        if endpoint.method == .get, segments.count == 4, segments[0] == "api", segments[1] == "threads",
           segments[3] == "messages", let id = String(segments[2]).removingPercentEncoding,
           let page = scenario.threads[id] {
            return try JSONEncoder().encode(page)
        }
        throw FixtureError.missingResponse(key)
    }

    private func record<R: Decodable>(_ endpoint: Endpoint<R>, operation: FixtureRequest.RecordedOperation, body: Data? = nil) {
        record(FixtureRequest(operation: operation, method: endpoint.method.rawValue, path: endpoint.path,
                              query: endpoint.query, body: body ?? endpoint.body, headers: endpoint.headers))
    }

    private func record(_ request: FixtureRequest) { lock.withLock { recordedRequests.append(request) } }
}

private actor FixtureSocket: WebSocketChannel {
    private var iterator: AsyncThrowingStream<WebSocketPayload, Error>.Iterator
    private let continuation: AsyncThrowingStream<WebSocketPayload, Error>.Continuation
    private let playback: Task<Void, Never>
    private let record: @Sendable (FixtureRequest.RecordedOperation, WebSocketPayload?) -> Void
    private var closed = false
    private var receiving = false

    init(entries: [FixtureScenario.SocketFrame], clock: ShellClock,
         record: @escaping @Sendable (FixtureRequest.RecordedOperation, WebSocketPayload?) -> Void) {
        let stream = AsyncThrowingStream<WebSocketPayload, Error>.makeStream()
        iterator = stream.stream.makeAsyncIterator()
        continuation = stream.continuation
        self.record = record
        playback = Task {
            let start = clock.now()
            do {
                for entry in entries.enumerated().sorted(by: {
                    $0.element.afterMs == $1.element.afterMs ? $0.offset < $1.offset : $0.element.afterMs < $1.element.afterMs
                }).map(\.element) {
                    let remaining = entry.afterMs / 1_000 - (clock.now() - start)
                    if remaining > 0 { try await clock.sleep(remaining) }
                    try Task.checkCancellation()
                    let payload: WebSocketPayload
                    if let text = entry.data.stringValue { payload = .text(text) }
                    else if let base64 = entry.data["base64"]?.stringValue {
                        guard let data = Data(base64Encoded: base64) else { throw FixtureError.invalidBinary }
                        payload = .binary(data)
                    } else {
                        payload = .text(String(decoding: try JSONEncoder().encode(entry.data), as: UTF8.self))
                    }
                    stream.continuation.yield(payload)
                }
                stream.continuation.finish()
            } catch { stream.continuation.finish(throwing: error) }
        }
    }

    deinit { playback.cancel(); continuation.finish() }

    func send(_ payload: WebSocketPayload) async throws {
        guard !closed else { throw FixtureError.socketClosed }
        record(.socketSend, payload)
    }

    func receive() async throws -> WebSocketPayload {
        guard !closed else { throw FixtureError.socketClosed }
        guard !receiving else { throw FixtureError.concurrentReceive }
        receiving = true
        var next = iterator
        defer { iterator = next; receiving = false }
        guard let payload = try await next.next(), !closed else { throw FixtureError.socketClosed }
        return payload
    }

    func close() async {
        guard !closed else { return }
        closed = true
        playback.cancel()
        continuation.finish(throwing: FixtureError.socketClosed)
        record(.socketClose, nil)
    }
}
