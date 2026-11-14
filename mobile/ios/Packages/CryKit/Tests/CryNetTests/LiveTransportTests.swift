#if canImport(Security)
import Foundation
import XCTest
import CryCore
import CryNetLogic
@testable import CryNet

final class LiveTransportTests: NetworkTestCase {
    func testSSEReconnectCarriesReplayCursorAndRequestsSnapshot() async throws {
        let store = try store()
        var requests = 0
        var snapshots = 0
        let complete = expectation(description: "frames after reconnect")
        NetworkFixture.install { request in
            self.assertHeaders(request)
            XCTAssertEqual(request.url?.path, "/root/api/events")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "text/event-stream")
            let items = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)?.queryItems
            XCTAssertEqual(items?.first(where: { $0.name == "screens" })?.value, "off")
            requests += 1
            if requests == 1 {
                XCTAssertEqual(items?.first(where: { $0.name == "since" })?.value, "10")
                return FixtureReply(headers: ["Content-Type": "text/event-stream"], body:
                    "data: {\"kind\":\"hello\",\"resumed\":true,\"cursor\":\"20\"}\n\nid: 11\ndata: {\"kind\":\"sections\",\"sections\":[]}\n\n")
            }
            XCTAssertEqual(items?.first(where: { $0.name == "since" })?.value, "11")
            return FixtureReply(headers: ["Content-Type": "text/event-stream"], body:
                "data: {\"kind\":\"hello\",\"resumed\":false,\"cursor\":\"30\"}\n\nid: 31\ndata: {\"kind\":\"sections\",\"sections\":[]}\n\n", keepOpen: true)
        }
        let transport = LiveTransport(server: try server(), store: store, configuration: NetworkFixture.configuration(),
                                      onSnapshotRequired: { snapshots += 1 }, sleep: { _ in try await Task.sleep(nanoseconds: 10_000_000) })
        let consumer = Task {
            var count = 0
            for try await _ in transport.events(since: "10", screens: false) {
                count += 1
                if count == 4 { complete.fulfill(); break }
            }
            return count
        }
        await fulfillment(of: [complete], timeout: 3)
        consumer.cancel()
        let count = try await consumer.value
        XCTAssertEqual(count, 4)
        XCTAssertEqual(requests, 2)
        XCTAssertEqual(snapshots, 1)
    }
    func testSSELoginExpiryFinishesInsteadOfReconnecting() async throws {
        let store = try store()
        var requests = 0
        let expired = expectation(description: "login expired")
        NetworkFixture.install { request in
            self.assertHeaders(request)
            requests += 1
            XCTAssertTrue(request.url?.query?.contains("screens=on") == true)
            return FixtureReply(status: 401)
        }
        let transport = LiveTransport(server: try server(), store: store, configuration: NetworkFixture.configuration(),
                                      onSnapshotRequired: {}, onLoginExpired: { expired.fulfill() })
        do { for try await _ in transport.events(since: nil, screens: true) {} ; XCTFail("Expected expiration") }
        catch { guard case CryNetError.loginExpired = error else { return XCTFail("Wrong error") } }
        await fulfillment(of: [expired], timeout: 2)
        XCTAssertEqual(requests, 1)
        XCTAssertFalse(store.read()?.isAuthenticated == true)
    }
    func testSSEWatchdogCancelsSilentConnection() async throws {
        let store = try store()
        let lock = NSLock()
        var ticks: TimeInterval = 0
        let stopped = expectation(description: "stale request cancelled")
        let opened = expectation(description: "request opened")
        NetworkFixture.install { _ in
            opened.fulfill()
            return FixtureReply(headers: ["Content-Type": "text/event-stream"], body: "", keepOpen: true, stopped: { stopped.fulfill() })
        }
        let transport = LiveTransport(server: try server(), store: store, configuration: NetworkFixture.configuration(), onSnapshotRequired: {},
                                      clock: { lock.withLock { ticks } }, sleep: { _ in try await Task.sleep(nanoseconds: 50_000_000) })
        let consumer = Task { for try await _ in transport.events(since: nil, screens: false) {} }
        await fulfillment(of: [opened], timeout: 2)
        lock.withLock { ticks = 40 }
        await fulfillment(of: [stopped], timeout: 2)
        consumer.cancel()
        _ = try? await consumer.value
    }
    func testUploadRawBytesMimeAndQueriesAndProgress() async throws {
        let store = try store()
        let data = Data([0, 1, 2, 255])
        var progress: [(Int64, Int64)] = []
        let transport = LiveTransport(server: try server(), store: store, configuration: NetworkFixture.configuration(), onSnapshotRequired: {},
                                      uploadProgress: { progress.append(($0, $1)) })
        for image in [true, false] {
            NetworkFixture.install { request in
                self.assertHeaders(request)
                XCTAssertEqual(request.httpMethod, "POST")
                XCTAssertEqual(request.url?.path, image ? "/root/api/attachments" : "/root/api/files")
                XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), image ? "image/png" : "application/octet-stream")
                XCTAssertEqual(try NetworkFixture.body(request), data)
                let query = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)?.queryItems
                XCTAssertEqual(query?.first(where: { $0.name == "uploadId" })?.value, "fixture-upload")
                XCTAssertEqual(query?.first(where: { $0.name == "name" })?.value, image ? nil : "test file.bin")
                return FixtureReply(body: #"{"path":"/api/files/test","mime":"application/octet-stream"}"#)
            }
            let endpoint = image ? CoreEndpoints.uploadImage(mime: "image/png", uploadId: "fixture-upload")
                : CoreEndpoints.uploadFile(name: "test file.bin", mime: "application/octet-stream", uploadId: "fixture-upload")
            _ = try await transport.upload(data, to: endpoint)
        }
        XCTAssertEqual(progress.first?.0, 0)
        XCTAssertEqual(progress.last?.0, 4)
        XCTAssertEqual(progress.last?.1, 4)
    }
    func testRangeDownloadAppendsAndFullResponseReplacesFile() async throws {
        let store = try store()
        let transport = LiveTransport(server: try server(), store: store, configuration: NetworkFixture.configuration(), onSnapshotRequired: {})
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: file) }
        try Data("abc".utf8).write(to: file)
        NetworkFixture.install { request in
            self.assertHeaders(request)
            XCTAssertEqual(request.value(forHTTPHeaderField: "Range"), "bytes=3-")
            XCTAssertEqual(request.value(forHTTPHeaderField: "If-Range"), "fixture-etag")
            return FixtureReply(status: 206, headers: ["Content-Range": "bytes 3-5/6", "Content-Length": "3"], body: "def")
        }
        _ = try await transport.downloadFile(CoreEndpoints.attachment(name: "file.bin"), resuming: file, ifRange: "fixture-etag")
        XCTAssertEqual(try Data(contentsOf: file), Data("abcdef".utf8))
        NetworkFixture.install { _ in FixtureReply(headers: ["Content-Length": "3"], body: "new") }
        _ = try await transport.downloadFile(CoreEndpoints.attachment(name: "file.bin"), resuming: file)
        XCTAssertEqual(try Data(contentsOf: file), Data("new".utf8))
        let data = try await transport.download(CoreEndpoints.attachment(name: "file.bin"))
        XCTAssertEqual(data, Data("new".utf8))
    }
    func testIncorrectRangeDoesNotCorruptPartialFile() async throws {
        let store = try store()
        let transport = LiveTransport(server: try server(), store: store, configuration: NetworkFixture.configuration(), onSnapshotRequired: {})
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: file) }
        try Data("abc".utf8).write(to: file)
        NetworkFixture.install { _ in FixtureReply(status: 206, headers: ["Content-Range": "bytes 2-4/5"], body: "bad") }
        do { _ = try await transport.downloadFile(CoreEndpoints.attachment(name: "file.bin"), resuming: file); XCTFail("Expected invalid range") }
        catch { guard case CryNetError.invalidRange = error else { return XCTFail("Wrong error") } }
        XCTAssertEqual(try Data(contentsOf: file), Data("abc".utf8))
    }
}
#endif
