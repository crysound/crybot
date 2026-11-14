import Foundation

/// All app network access, implemented by the live client and isolated fixture client.
public protocol Transport {
    func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R
    func events(since: String?, screens: Bool) -> AsyncThrowingStream<ServerFrame, Error>
    func upload(_ data: Data, to endpoint: Endpoint<UploadResponse>) async throws -> UploadResponse
    func download(_ endpoint: Endpoint<Data>) async throws -> Data
    func webSocket(path: String) async throws -> any WebSocketChannel
}

public enum WebSocketPayload: Equatable, Sendable {
    case text(String)
    case binary(Data)
}

/// One ordered text/binary socket; closing cancels pending receives and releases the connection.
public protocol WebSocketChannel {
    func send(_ payload: WebSocketPayload) async throws
    func receive() async throws -> WebSocketPayload
    func close() async
}
