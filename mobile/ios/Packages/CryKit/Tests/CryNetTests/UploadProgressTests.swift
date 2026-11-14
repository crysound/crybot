#if canImport(Security) && canImport(Network)
import Foundation
import Network
import XCTest
import CryCore
import CryNetLogic
@testable import CryNet

final class UploadProgressTests: XCTestCase {
    func testLiveTransportConnectsTaskDelegateToUploadProgress() async throws {
        let server = try CryServer(webURL: "https://example.com")
        let store = MemorySessionStore(SessionRecord(server: server, method: .pairing, sessionToken: "cry_sess_fixture"))
        for explicitProgress in [false, true] {
            let lock = NSLock()
            var progress: [Int64] = []
            let observe: (Int64, Int64) -> Void = { sent, total in
                XCTAssertEqual(total, 10)
                lock.withLock { progress.append(sent) }
            }
            let transport = LiveTransport(server: server, store: store, onSnapshotRequired: {}, uploadProgress: observe)
            var uploads = 0
            transport.performUpload = { session, request, data, delegate in
                uploads += 1
                XCTAssertEqual(request.url?.path, "/api/attachments")
                XCTAssertEqual(data, Data(repeating: 42, count: 10))
                let delegate = try XCTUnwrap(delegate as? HTTPTaskDelegate)
                let task = session.uploadTask(with: request, from: data)
                defer { task.cancel() }
                delegate.urlSession(session, task: task, didSendBodyData: 4, totalBytesSent: 4, totalBytesExpectedToSend: 10)
                XCTAssertEqual(lock.withLock { progress }, [0, 4])
                let body = Data(#"{"path":"/api/files/test","mime":"image/png"}"#.utf8)
                return (body, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
            }
            let endpoint = CoreEndpoints.uploadImage(mime: "image/png")
            let result: UploadResponse
            if explicitProgress {
                result = try await transport.upload(Data(repeating: 42, count: 10), to: endpoint, progress: observe)
            } else {
                result = try await transport.upload(Data(repeating: 42, count: 10), to: endpoint)
            }
            XCTAssertEqual(result.path, "/api/files/test")
            XCTAssertEqual(uploads, 1)
            XCTAssertEqual(lock.withLock { progress }, [0, 4, 10])
        }
    }

    func testLiveTransportReceivesRealURLSessionBodyProgress() async throws {
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
        let callback = expectation(description: "URLSession didSendBodyData")
        callback.assertForOverFulfill = false
        let lock = NSLock()
        var progress: [(Int64, Int64)] = []
        let server = try CryServer(webURL: "https://example.com")
        let store = MemorySessionStore(SessionRecord(server: server, method: .pairing, sessionToken: "cry_sess_fixture"))
        let transport = LiveTransport(server: server, store: store, configuration: configuration, onSnapshotRequired: {}, uploadProgress: { sent, total in
            lock.withLock { progress.append((sent, total)) }
            if sent > 0 { callback.fulfill() }
        })
        transport.performUpload = { session, request, data, delegate in
            XCTAssertTrue(delegate is HTTPTaskDelegate)
            XCTAssertEqual(data, payload)
            XCTAssertEqual(request.url?.scheme, "https")
            XCTAssertEqual(request.url?.path, "/api/files")
            var localRequest = request
            localRequest.url = URL(string: "http://127.0.0.1:\(port.rawValue)/upload")!
            localRequest.setValue(String(data.count), forHTTPHeaderField: "Content-Length")
            let reply = try await session.upload(for: localRequest, from: data, delegate: delegate)
            let callbacks = lock.withLock { Array(progress.dropFirst()) }
            XCTAssertFalse(callbacks.isEmpty)
            XCTAssertEqual(callbacks.last?.0, Int64(payload.count))
            XCTAssertEqual(callbacks.last?.1, Int64(payload.count))
            XCTAssertTrue(callbacks.allSatisfy { $0.0 > 0 && $0.0 <= $0.1 })
            return reply
        }
        let result = try await transport.upload(payload, to: CoreEndpoints.uploadFile(name: "test.bin", mime: "application/octet-stream"))
        await fulfillment(of: [callback], timeout: 2)
        XCTAssertEqual(result.path, "/api/files/test")
        let observed = lock.withLock { progress }
        XCTAssertEqual(observed.first?.0, 0)
        XCTAssertEqual(observed.last?.0, Int64(payload.count))
        XCTAssertEqual(observed.last?.1, Int64(payload.count))
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
                let body = #"{"path":"/api/files/test","mime":"application/octet-stream"}"#
                let response = Data("HTTP/1.1 200 OK\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)".utf8)
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
