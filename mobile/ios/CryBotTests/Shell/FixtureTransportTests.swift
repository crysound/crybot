import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

@MainActor
final class FixtureTransportTests: XCTestCase {
    func testResponsesHistoryAndRequestRecording() async throws {
        var scenario = shellScenario()
        scenario.threads["thread-1"] = ThreadPage(messages: [], activeLeafId: nil, hasMore: false)
        scenario.responses["GET /api/inbox"] = .object(["count": .number(3)])
        scenario.responses["GET /api/inbox?filter=unread"] = .object(["count": .number(1)])
        let transport = FixtureTransport(scenario: scenario)
        let basic = try await transport.send(Endpoint<InboxCount>(path: "/api/inbox"))
        let filtered = try await transport.send(Endpoint<InboxCount>(path: "/api/inbox", query: [.init(name: "filter", value: "unread")]))
        let history = try await transport.send(CoreEndpoints.history(thread: "thread-1"))
        XCTAssertEqual(basic.count, 3)
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(history.hasMore, false)
        XCTAssertEqual(transport.requests.map(\.method), ["GET", "GET", "GET"])
        XCTAssertEqual(transport.requests[1].query, [.init(name: "filter", value: "unread")])
        do {
            _ = try await transport.send(Endpoint<InboxCount>(path: "/missing"))
            XCTFail("An unregistered request must fail")
        } catch {
            XCTAssertEqual(error as? FixtureError, .missingResponse("GET /missing"))
        }
    }

    func testUploadDownloadAndSocketReplayRecordPayloads() async throws {
        var scenario = shellScenario()
        scenario.responses["POST /api/attachments"] = .object(["path": .string("example.png"), "mime": .string("image/png")])
        scenario.responses["GET /api/attachments/example.png"] = .object(["base64": .string("AQID")])
        scenario.sockets["/fixture/socket"] = [
            .init(afterMs: 1_000, data: .string("hello")),
            .init(afterMs: 2_000, data: .object(["base64": .string("AQID")]))
        ]
        let clock = ShellManualClock()
        let transport = FixtureTransport(scenario: scenario, clock: clock.clock)
        let upload = try await transport.upload(Data([4, 5]), to: CoreEndpoints.uploadImage(mime: "image/png"))
        XCTAssertEqual(upload.path, "example.png")
        let download = try await transport.download(CoreEndpoints.attachment(name: "example.png"))
        XCTAssertEqual(download, Data([1, 2, 3]))
        let socket = try await transport.webSocket(path: "/fixture/socket")
        try await socket.send(.text("client"))
        try await shellEventually { clock.sleeperCount == 1 }
        clock.advance(by: 1)
        let first = try await socket.receive()
        XCTAssertEqual(first, .text("hello"))
        try await shellEventually { clock.sleeperCount == 1 }
        clock.advance(by: 1)
        let second = try await socket.receive()
        XCTAssertEqual(second, .binary(Data([1, 2, 3])))
        await socket.close()
        XCTAssertEqual(transport.requests.map(\.operation), [.upload, .download, .socket, .socketSend, .socketClose])
        XCTAssertEqual(transport.requests.first?.body, Data([4, 5]))
        XCTAssertEqual(transport.requests[3].payload, .text("client"))
        do { try await socket.send(.text("closed")); XCTFail("Closed sockets cannot send") }
        catch { XCTAssertEqual(error as? FixtureError, .socketClosed) }
    }

    func testClosingSocketReleasesPendingReceive() async throws {
        var scenario = shellScenario()
        scenario.sockets["/fixture/socket"] = [.init(afterMs: 10_000, data: .string("late"))]
        let clock = ShellManualClock()
        let transport = FixtureTransport(scenario: scenario, clock: clock.clock)
        let socket = try await transport.webSocket(path: "/fixture/socket")
        let pending = Task { try await socket.receive() }
        try await shellEventually { clock.sleeperCount == 1 }
        await socket.close()
        do { _ = try await pending.value; XCTFail("Pending receive must be released") }
        catch { XCTAssertTrue(error is FixtureError || error is CancellationError) }
        try await shellEventually { clock.sleeperCount == 0 }
    }

    func testResumeSkipsFramesThroughTheHelloPrefixAndSequence() async throws {
        let scenario = shellScenario(frames: [
            .init(afterMs: 0, frame: .hello(ServerFrameHello(resumed: true, cursor: "STREAM:0"))),
            .init(afterMs: 0, frame: try shellFrame(#"{"kind":"sections","sections":["old"],"seq":7}"#)),
            .init(afterMs: 0, frame: try shellFrame(#"{"kind":"sections","sections":["new"],"seq":8}"#))
        ])
        let transport = FixtureTransport(scenario: scenario)
        var iterator = transport.events(since: "STREAM:7", screens: false).makeAsyncIterator()
        let frame = try await iterator.next()
        guard case .sections(let sections) = frame else { return XCTFail("Expected the next sequenced frame") }
        XCTAssertEqual(sections.sections, ["new"])
        XCTAssertEqual(sections.additionalFields["seq"], .number(8))
    }

    func testMalformedFixtureTimingIsRejected() {
        let json = #"{"signedIn":true,"snapshot":{"bots":[],"groups":[],"sections":[]},"frames":[{"afterMs":-1,"frame":{"kind":"ping"}}]}"#
        XCTAssertThrowsError(try JSONDecoder().decode(FixtureScenario.self, from: Data(json.utf8)))
        XCTAssertThrowsError(try FixtureScenario.load(named: "../shell-basic"))
    }
}
