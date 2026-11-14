#if canImport(Security)
import Foundation
import CryCore
import CryNetLogic

public final class LiveTransport: Transport {
    private let client: HTTPClient
    private let onSnapshotRequired: () async throws -> Void
    private let uploadProgress: (Int64, Int64) -> Void
    private let clock: () -> TimeInterval
    private let sleep: (TimeInterval) async throws -> Void

    public init(server: CryServer, store: any SessionStore, configuration: URLSessionConfiguration = .ephemeral,
                onSnapshotRequired: @escaping () async throws -> Void,
                onLoginExpired: @escaping () -> Void = {}, uploadProgress: @escaping (Int64, Int64) -> Void = { _, _ in },
                clock: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime },
                sleep: @escaping (TimeInterval) async throws -> Void = { try await Task.sleep(nanoseconds: UInt64($0 * 1_000_000_000)) }) {
        client = HTTPClient(server: server, store: store, configuration: configuration, onLoginExpired: onLoginExpired)
        self.onSnapshotRequired = onSnapshotRequired
        self.uploadProgress = uploadProgress
        self.clock = clock
        self.sleep = sleep
    }
    public func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R { try await client.send(endpoint) }

    public func events(since: String?, screens: Bool) -> AsyncThrowingStream<ServerFrame, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                let connection = EventConnection(since: since, clock: clock)
                do {
                    while !Task.isCancelled {
                        do {
                            try await eventConnection(connection, screens: screens, continuation: continuation)
                        } catch {
                            if Task.isCancelled || error is CancellationError { throw CancellationError() }
                            if case CryNetError.loginExpired = error { throw error }
                            if case CryNetError.storage = error { throw error }
                            try await sleep(connection.disconnected())
                        }
                    }
                    continuation.finish()
                } catch is CancellationError { continuation.finish() }
                catch { continuation.finish(throwing: client.safeError(error)) }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func eventConnection(_ connection: EventConnection, screens: Bool,
                                 continuation: AsyncThrowingStream<ServerFrame, Error>.Continuation) async throws {
        connection.connected()
        try await withThrowingTaskGroup(of: Void.self) { group in
            defer { group.cancelAll() }
            group.addTask {
                var query = [URLQueryItem(name: "screens", value: screens ? "on" : "off")]
                if let cursor = connection.cursor { query.append(URLQueryItem(name: "since", value: cursor)) }
                var prepared = try self.client.prepare(Endpoint<Data>(path: "/api/events", query: query, decode: { $0 }))
                prepared.request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                let (bytes, response) = try await self.client.session.bytes(for: prepared.request)
                defer { bytes.task.cancel() }
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                if !(200..<300).contains(status) {
                    var body = Data()
                    for try await byte in bytes { body.append(byte); if body.count >= 65536 { break } }
                    try self.client.accept(response, body: body, prepared: prepared)
                    throw CryNetError.invalidResponse
                }
                try self.client.accept(response, body: Data(), prepared: prepared)
                guard (response as? HTTPURLResponse)?.mimeType?.lowercased() == "text/event-stream" else { throw CryNetError.invalidResponse }
                var parser = SSEParser()
                var line = Data()
                for try await byte in bytes {
                    try Task.checkCancellation()
                    line.append(byte)
                    guard byte == 10 || byte == 13 || line.count >= 8192 else { continue }
                    let frames = try parser.feed(line)
                    line.removeAll(keepingCapacity: true)
                    for frame in frames {
                        connection.receive(frame, eventID: parser.lastEventID)
                        if connection.snapshotRequired {
                            try await self.onSnapshotRequired()
                            try Task.checkCancellation()
                            connection.snapshotLoaded()
                        }
                        continuation.yield(frame)
                    }
                }
                parser.finish()
                throw CryNetError.connectionClosed
            }
            group.addTask {
                while !Task.isCancelled {
                    try await self.sleep(1)
                    if connection.isStale { throw CryNetError.connectionClosed }
                }
            }
            try await group.next()
        }
    }

    public func upload(_ data: Data, to endpoint: Endpoint<UploadResponse>) async throws -> UploadResponse {
        try await upload(data, to: endpoint, progress: uploadProgress)
    }
    public func upload(_ data: Data, to endpoint: Endpoint<UploadResponse>, progress: @escaping (Int64, Int64) -> Void) async throws -> UploadResponse {
        let prepared = try client.prepare(endpoint)
        do {
            progress(0, Int64(data.count))
            let (body, response) = try await client.session.upload(for: prepared.request, from: data, delegate: HTTPTaskDelegate(progress: progress))
            try Task.checkCancellation()
            try client.accept(response, body: body, prepared: prepared)
            let value: UploadResponse
            do { value = try endpoint.decode(body) } catch { throw CryNetError.invalidResponse }
            progress(Int64(data.count), Int64(data.count))
            return value
        } catch { throw client.safeError(error) }
    }

    public func download(_ endpoint: Endpoint<Data>) async throws -> Data {
        let file = try await downloadFile(endpoint)
        defer { try? FileManager.default.removeItem(at: file) }
        do { return try Data(contentsOf: file) } catch { throw CryNetError.invalidResponse }
    }

    public func downloadFile(_ endpoint: Endpoint<Data>, resuming file: URL? = nil, ifRange: String? = nil) async throws -> URL {
        let destination = file ?? FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        var prepared = try client.prepare(endpoint)
        let offset: Int64
        do {
            offset = FileManager.default.fileExists(atPath: destination.path)
                ? (try FileManager.default.attributesOfItem(atPath: destination.path)[.size] as? NSNumber)?.int64Value ?? 0 : 0
        } catch { throw CryNetError.invalidResponse }
        if offset > 0 {
            prepared.request.setValue("bytes=\(offset)-", forHTTPHeaderField: "Range")
            if let ifRange { prepared.request.setValue(ifRange, forHTTPHeaderField: "If-Range") }
        }
        prepared.request.setValue("identity", forHTTPHeaderField: "Accept-Encoding")
        do {
            let (bytes, response) = try await client.session.bytes(for: prepared.request)
            defer { bytes.task.cancel() }
            guard let http = response as? HTTPURLResponse else { throw CryNetError.invalidResponse }
            if !(200..<300).contains(http.statusCode) {
                var body = Data()
                for try await byte in bytes { body.append(byte); if body.count >= 65536 { break } }
                try client.accept(response, body: body, prepared: prepared)
            } else { try client.accept(response, body: Data(), prepared: prepared) }
            let append = http.statusCode == 206
            let expectedLength: Int64?
            if append {
                guard let range = http.value(forHTTPHeaderField: "Content-Range"),
                      let parsed = DownloadRange(range), parsed.start == offset else { throw CryNetError.invalidRange }
                expectedLength = parsed.end - parsed.start + 1
            } else {
                guard http.statusCode == 200 else { throw CryNetError.invalidResponse }
                expectedLength = http.expectedContentLength >= 0 ? http.expectedContentLength : nil
            }
            if !FileManager.default.fileExists(atPath: destination.path) {
                guard FileManager.default.createFile(atPath: destination.path, contents: nil) else { throw CryNetError.invalidResponse }
            }
            let handle = try FileHandle(forWritingTo: destination)
            defer { try? handle.close() }
            if append { try handle.seekToEnd() } else { try handle.truncate(atOffset: 0) }
            var buffer = Data()
            var count: Int64 = 0
            for try await byte in bytes {
                try Task.checkCancellation()
                buffer.append(byte)
                count += 1
                if let expectedLength, count > expectedLength { throw CryNetError.invalidRange }
                if buffer.count >= 65536 { try handle.write(contentsOf: buffer); buffer.removeAll(keepingCapacity: true) }
            }
            try handle.write(contentsOf: buffer)
            if let expectedLength, count != expectedLength { throw CryNetError.invalidRange }
            return destination
        } catch {
            if file == nil { try? FileManager.default.removeItem(at: destination) }
            throw client.safeError(error)
        }
    }

    public func webSocket(path: String) async throws -> any WebSocketChannel {
        var prepared = try client.prepare(Endpoint<Data>(path: path, decode: { $0 }))
        guard let url = prepared.request.url, var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { throw CryNetError.invalidResponse }
        components.scheme = "wss"
        prepared.request.url = components.url
        let socket = client.session.webSocketTask(with: prepared.request)
        let channel = LiveWebSocketChannel(task: socket, client: client, prepared: prepared)
        try await channel.open()
        return channel
    }
}

private final class EventConnection: @unchecked Sendable {
    private let lock = NSLock()
    private var state: ReconnectState
    init(since: String?, clock: @escaping () -> TimeInterval) { state = ReconnectState(since: since, clock: clock) }
    var cursor: String? { lock.withLock { state.cursor } }
    var isStale: Bool { lock.withLock { state.isStale } }
    var snapshotRequired: Bool { lock.withLock { state.snapshotRequired } }
    func connected() { lock.withLock { state.connected() } }
    func disconnected() -> TimeInterval { lock.withLock { state.disconnected() } }
    func receive(_ frame: ServerFrame, eventID: String?) { lock.withLock { state.receive(frame, eventID: eventID) } }
    func snapshotLoaded() { lock.withLock { state.snapshotLoaded() } }
}

private struct DownloadRange {
    let start: Int64
    let end: Int64
    init?(_ text: String) {
        guard text.hasPrefix("bytes ") else { return nil }
        let parts = text.dropFirst(6).split(separator: "/")
        guard parts.count == 2 else { return nil }
        let bounds = parts[0].split(separator: "-")
        guard bounds.count == 2, let start = Int64(bounds[0]), let end = Int64(bounds[1]), start >= 0, end >= start,
              parts[1] == "*" || Int64(parts[1]).map({ $0 > end && $0 - 1 == end }) == true else { return nil }
        self.start = start
        self.end = end
    }
}
#endif
