#if canImport(Security)
import Foundation
import CryCore

final class SocketHandshake: HTTPTaskDelegate, URLSessionWebSocketDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<Void, Error>?
    private var finished: Result<Void, Error>?
    private let client: HTTPClient
    private let prepared: PreparedRequest
    init(client: HTTPClient, prepared: PreparedRequest) {
        self.client = client
        self.prepared = prepared
        super.init()
    }
    func wait(_ continuation: CheckedContinuation<Void, Error>) {
        let result = lock.withLock { () -> Result<Void, Error>? in
            if let finished { return finished }
            self.continuation = continuation
            return nil
        }
        if let result { continuation.resume(with: result) }
    }
    func complete(_ result: Result<Void, Error>) {
        let continuation = lock.withLock { () -> CheckedContinuation<Void, Error>? in
            guard finished == nil else { return nil }
            finished = result
            defer { self.continuation = nil }
            return self.continuation
        }
        continuation?.resume(with: result)
    }
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol negotiatedProtocol: String?) {
        do {
            guard let response = webSocketTask.response else { throw CryNetError.invalidResponse }
            try client.accept(response, body: Data(), prepared: prepared)
            complete(.success(()))
        } catch { complete(.failure(client.safeError(error))); webSocketTask.cancel(with: .goingAway, reason: nil) }
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        do {
            if let response = task.response { try client.accept(response, body: Data(), prepared: prepared) }
            complete(.failure(error.map(client.safeError) ?? CryNetError.connectionClosed))
        } catch { complete(.failure(client.safeError(error))) }
    }
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        complete(.failure(CryNetError.connectionClosed))
    }
}

final class LiveWebSocketChannel: WebSocketChannel {
    private let task: URLSessionWebSocketTask
    private let client: HTTPClient
    private let handshake: SocketHandshake
    init(task: URLSessionWebSocketTask, client: HTTPClient, prepared: PreparedRequest) {
        self.task = task
        self.client = client
        handshake = SocketHandshake(client: client, prepared: prepared)
        task.delegate = handshake
    }
    deinit { task.cancel(with: .goingAway, reason: nil) }
    func open() async throws {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                handshake.wait(continuation)
                task.resume()
            }
        } onCancel: {
            self.handshake.complete(.failure(CancellationError()))
            self.task.cancel(with: .goingAway, reason: nil)
        }
    }
    func send(_ payload: WebSocketPayload) async throws {
        do {
            switch payload {
            case .text(let text): try await task.send(.string(text))
            case .binary(let data): try await task.send(.data(data))
            }
        } catch { throw client.safeError(error) }
    }
    func receive() async throws -> WebSocketPayload {
        do {
            switch try await task.receive() {
            case .string(let text): return .text(text)
            case .data(let data): return .binary(data)
            @unknown default: throw CryNetError.invalidResponse
            }
        } catch { throw client.safeError(error) }
    }
    func close() async { task.cancel(with: .normalClosure, reason: nil) }
}
#endif
