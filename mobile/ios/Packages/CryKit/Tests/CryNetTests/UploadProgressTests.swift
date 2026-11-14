#if canImport(Security) && canImport(Network)
import Foundation
import Network
import XCTest
@testable import CryNet

final class UploadProgressTests: XCTestCase {
    func testURLSessionDeliversBodyProgressToHTTPTaskDelegate() async throws {
        let payload = Data(repeating: 42, count: 256 * 1024)
        let fixture = try UploadProgressFixture(payload: payload)
        defer { fixture.stop() }
        let ready = expectation(description: "isolated upload listener ready")
        fixture.start { state in
            switch state {
            case .ready: ready.fulfill()
            case .failed(let error): XCTFail("Upload fixture failed: \(error)"); ready.fulfill()
            default: break
            }
        }
        await fulfillment(of: [ready], timeout: 5)
        let port = try XCTUnwrap(fixture.listener.port)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 5
        configuration.connectionProxyDictionary = [:]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        let callback = expectation(description: "URLSession didSendBodyData")
        callback.assertForOverFulfill = false
        let lock = NSLock()
        var progress: [(Int64, Int64)] = []
        let delegate = HTTPTaskDelegate { sent, total in
            lock.withLock { progress.append((sent, total)) }
            if sent > 0 { callback.fulfill() }
        }
        var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port.rawValue)/upload")!)
        request.httpMethod = "POST"
        request.setValue(String(payload.count), forHTTPHeaderField: "Content-Length")
        let (_, response) = try await session.upload(for: request, from: payload, delegate: delegate)
        await fulfillment(of: [callback], timeout: 2)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
        let observed = lock.withLock { progress }
        XCTAssertEqual(observed.last?.0, Int64(payload.count))
        XCTAssertEqual(observed.last?.1, Int64(payload.count))
        XCTAssertTrue(observed.allSatisfy { $0.0 > 0 && $0.0 <= $0.1 })
    }
}

private final class UploadProgressFixture {
    let listener: NWListener
    private let queue = DispatchQueue(label: "com.example.crybot.upload-fixture")
    private let payload: Data
    private var connections: [NWConnection] = []

    init(payload: Data) throws {
        self.payload = payload
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: .any)
        listener = try NWListener(using: parameters)
    }
    func start(state: @escaping (NWListener.State) -> Void) {
        listener.stateUpdateHandler = state
        listener.newConnectionHandler = { [weak self] connection in
            guard let self else { connection.cancel(); return }
            self.connections.append(connection)
            connection.start(queue: self.queue)
            self.receive(connection, accumulated: Data())
        }
        listener.start(queue: queue)
    }
    func stop() {
        queue.sync {
            listener.cancel()
            connections.forEach { $0.cancel() }
            connections.removeAll()
        }
    }
    private func receive(_ connection: NWConnection, accumulated: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, complete, error in
            guard let self else { connection.cancel(); return }
            var bytes = accumulated
            if let data { bytes.append(data) }
            if let separator = bytes.range(of: Data("\r\n\r\n".utf8)), bytes.count - separator.upperBound >= self.payload.count {
                XCTAssertEqual(Data(bytes[separator.upperBound...]), self.payload)
                let response = Data("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}".utf8)
                connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
            } else if complete || error != nil {
                XCTFail("Upload connection ended before receiving the body")
                connection.cancel()
            } else {
                self.receive(connection, accumulated: bytes)
            }
        }
    }
}
#endif
