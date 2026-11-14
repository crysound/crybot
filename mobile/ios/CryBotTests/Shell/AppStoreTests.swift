import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

@MainActor
final class AppStoreTests: XCTestCase {
    func testNamedFixturesLoadSynchronouslyBeforeFrames() throws {
        let store = AppStore.fixture(scenario: "shell-basic")
        XCTAssertNil(store.fixtureError)
        XCTAssertTrue(store.isFixture)
        XCTAssertTrue(store.signedIn)
        XCTAssertEqual(store.selectedTab, .chats)
        XCTAssertEqual(store.state.bots.map(\.name), ["Maple", "Cedar"])
        XCTAssertEqual(store.state.groups.map(\.name), ["Example team"])
        XCTAssertEqual(store.page(thread: "thread-1").messages.map(\.kind), ["text", "text", "widget", "app"])
        XCTAssertEqual(store.inboxUnreadCount, 2)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        XCTAssertTrue(transport.requests.isEmpty)
        let signedOut = AppStore.fixture(scenario: "shell-signed-out")
        XCTAssertNil(signedOut.fixtureError)
        XCTAssertFalse(signedOut.signedIn)
        XCTAssertTrue(signedOut.isFixture)
        signedOut.resumeRealtime()
        XCTAssertTrue((signedOut.transport as? FixtureTransport)?.requests.isEmpty == true)
    }

    func testMissingFixtureCannotFallBackToLiveMode() {
        let store = AppStore.fixture(scenario: "missing-fixture")
        XCTAssertTrue(store.isFixture)
        XCTAssertFalse(store.signedIn)
        XCTAssertNotNil(store.fixtureError)
        XCTAssertNil(store.transport)
    }

    func testReplayAppliesStateBeforeDeliveringEachSubscribersKinds() async throws {
        let clock = ShellManualClock()
        let frames = try [
            FixtureScenario.TimedFrame(afterMs: 1_000, frame: shellFrame(#"{"kind":"sections","sections":["first"],"seq":1}"#)),
            FixtureScenario.TimedFrame(afterMs: 2_000, frame: shellFrame(#"{"kind":"mcp.changed"}"#)),
            FixtureScenario.TimedFrame(afterMs: 3_000, frame: shellFrame(#"{"kind":"sections","sections":["second"],"seq":2}"#)),
            FixtureScenario.TimedFrame(afterMs: 4_000, frame: shellFrame(#"{"kind":"mcp.changed"}"#))
        ]
        let store = try AppStore.fixture(loaded: shellScenario(frames: frames), clock: clock.clock)
        let sections = store.frames(kinds: ["sections"])
        let mcp = store.frames(kinds: ["mcp.changed"])
        var seenSections: [[String]] = []
        var seenKinds: [String] = []
        let first = Task {
            for await _ in sections { seenSections.append(store.state.sections) }
        }
        let second = Task {
            for await frame in mcp { seenKinds.append(frame.kind) }
        }
        defer { first.cancel(); second.cancel(); store.pauseRealtime() }
        store.resumeRealtime()
        try await shellEventually { clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { seenSections == [["first"]] && clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { seenKinds.count == 1 && clock.sleeperCount == 2 }
        first.cancel()
        await first.value
        try await shellEventually { store.frameSubscriberCount == 1 }
        clock.advance(by: 1)
        try await shellEventually { store.state.sections == ["second"] && clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { seenKinds.count == 2 }
        XCTAssertEqual(seenSections, [["first"]])
        XCTAssertEqual(seenKinds, ["mcp.changed", "mcp.changed"])
        XCTAssertEqual(store.state.unhandledFrameCounts["mcp.changed"], 2)
        second.cancel()
        await second.value
        try await shellEventually { store.frameSubscriberCount == 0 }
    }

    func testReplayMessageUpdatesLiveState() async throws {
        var scenario = try FixtureScenario.load(named: "shell-basic")
        scenario.frames = Array(scenario.frames.prefix(2))
        let clock = ShellManualClock()
        let store = try AppStore.fixture(loaded: scenario, clock: clock.clock)
        defer { store.pauseRealtime() }
        store.resumeRealtime()
        try await shellEventually { clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { store.state.threads["thread-1"]?.messages.last?.id == "message-7" }
        XCTAssertEqual(store.page(thread: "thread-1").messages.count, 5)
    }

    func testNavigationKeepsWebPresentationOutOfPushPath() {
        let store = AppStore.fixture(scenario: "shell-basic")
        let ref = ConversationRef.bot("bot-1", thread: "thread-1", focus: "message-1")
        store.navigate(to: .conversation(ref))
        store.navigate(to: .notifications)
        store.navigate(to: .desktop(DesktopTarget(bot: "bot-1")))
        XCTAssertEqual(store.path, [.conversation(ref), .notifications, .desktop(DesktopTarget(bot: "bot-1"))])
        store.navigate(to: .web(.settings(.appearance)))
        XCTAssertEqual(store.webTarget, .settings(.appearance))
        XCTAssertEqual(store.path.count, 3)
        store.webTarget = nil
        XCTAssertNil(store.webTarget)
        store.navigate(to: .inbox)
        XCTAssertEqual(store.selectedTab, .inbox)
        XCTAssertTrue(store.path.isEmpty)
    }

    func testSignOutAwaitsHandlersInRegistrationOrderThenClearsState() async throws {
        let store = AppStore.fixture(scenario: "shell-basic")
        var events: [String] = []
        store.registerSignOut {
            events.append("first-start")
            await Task.yield()
            XCTAssertTrue(store.signedIn)
            events.append("first-end")
        }
        store.registerSignOut {
            XCTAssertEqual(events, ["first-start", "first-end"])
            events.append("second")
        }
        store.navigate(to: .web(.files))
        store.setScreens(true)
        let subscription = store.frames(kinds: ["message"])
        await store.signOut()
        var iterator = subscription.makeAsyncIterator()
        let end = await iterator.next()
        XCTAssertNil(end)
        XCTAssertEqual(events, ["first-start", "first-end", "second"])
        XCTAssertFalse(store.signedIn)
        XCTAssertTrue(store.state.bots.isEmpty)
        XCTAssertNil(store.transport)
        XCTAssertNil(store.webTarget)
        XCTAssertFalse(store.screens)
        XCTAssertTrue(store.isFixture)
        XCTAssertEqual(store.frameSubscriberCount, 0)
    }

    func testSignOutWithoutHandlersClearsMemoryAndNavigation() async {
        let store = AppStore.fixture(scenario: "shell-basic")
        let session = store.sessionID
        store.navigate(to: .notifications)
        await store.signOut()
        XCTAssertNotEqual(store.sessionID, session)
        XCTAssertFalse(store.signedIn)
        XCTAssertTrue(store.path.isEmpty)
        XCTAssertEqual(store.inboxUnreadCount, 0)
        XCTAssertTrue(store.state.threads.isEmpty)
        store.navigate(to: .web(.files))
        XCTAssertNil(store.webTarget)
    }

    func testActionsUseCoreEndpointsAndHistoryMergesWithoutDuplicates() async throws {
        let ok: JSONValue = .object(["ok": .bool(true)])
        let sent: JSONValue = .object(["ok": .bool(true), "threadId": .string("thread-1")])
        var scenario = try FixtureScenario.load(named: "shell-basic")
        scenario.responses.merge([
            "POST /api/bots/bot-1/messages": sent, "POST /api/groups/group-1/messages": sent,
            "POST /api/threads/thread-1/respond": ok, "POST /api/bots/bot-1/interrupt": ok,
            "POST /api/groups/group-1/interrupt": ok, "POST /api/bots/bot-1/read": ok,
            "POST /api/groups/group-1/read": ok, "POST /api/threads/thread-1/messages/message-1/reactions": ok
        ]) { _, next in next }
        let older = ThreadPage(messages: [.text(WireMessageFields(id: "message-0", role: .user, at: 0, text: "Earlier"))], activeLeafId: nil, hasMore: false)
        scenario.responses["GET /api/threads/thread-1/messages"] = try JSONValue(encoding: older)
        let store = try AppStore.fixture(loaded: scenario)
        let body = ChatSendBody(text: "Hello", threadId: "thread-1", sendId: "send-1")
        let bot = ConversationRef.bot("bot-1", thread: "thread-1")
        let group = ConversationRef.group("group-1", thread: "thread-1")
        _ = try await store.send(to: bot, body: body)
        _ = try await store.send(to: group, body: body)
        try await store.respond(RespondAction(thread: "thread-1", body: RespondBody(requestId: "request-1", behavior: .allow)))
        _ = try await store.interrupt(bot)
        _ = try await store.interrupt(group)
        _ = try await store.markRead(bot)
        _ = try await store.markRead(group)
        _ = try await store.react(thread: "thread-1", message: "message-1", emoji: "👍", on: true)
        let page = try await store.loadOlder(thread: "thread-1")
        XCTAssertEqual(page.messages.compactMap(\.id), ["message-0", "message-1", "message-2", "message-3", "message-4"])
        XCTAssertEqual(page.hasMore, false)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        XCTAssertEqual(transport.requests.map(\.path), ["/api/bots/bot-1/messages", "/api/groups/group-1/messages", "/api/threads/thread-1/respond", "/api/bots/bot-1/interrupt", "/api/groups/group-1/interrupt", "/api/bots/bot-1/read", "/api/groups/group-1/read", "/api/threads/thread-1/messages/message-1/reactions", "/api/threads/thread-1/messages"])
        let data = try XCTUnwrap(transport.requests.first?.body)
        XCTAssertEqual(try JSONDecoder().decode(ChatSendBody.self, from: data), body)
        XCTAssertEqual(transport.requests.last?.query, [URLQueryItem(name: "before", value: "message-1")])
    }

    func testImageDownloadsUseTransportCacheAndSignOutClearsIt() async throws {
        var scenario = shellScenario()
        scenario.responses["GET /api/attachments/example.png"] = .object(["base64": .string("AQID")])
        let store = try AppStore.fixture(loaded: scenario)
        let url = try XCTUnwrap(URL(string: "/api/attachments/example.png?size=small"))
        let first = try await store.imageData(url: url)
        let second = try await store.imageData(url: url)
        XCTAssertEqual(first, Data([1, 2, 3]))
        XCTAssertEqual(second, first)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        XCTAssertEqual(transport.requests.filter { $0.operation == .download }.count, 1)
        XCTAssertEqual(transport.requests.first?.path, "/api/attachments/example.png")
        XCTAssertEqual(transport.requests.first?.query, [URLQueryItem(name: "size", value: "small")])
        await store.signOut()
        XCTAssertNil(store.imageCache.data(for: url))
    }

    func testUnapprovedImagePathsFailBeforeTransportOrCache() async throws {
        let store = try AppStore.fixture(loaded: shellScenario())
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        let urls = ["https://example.com/api/attachments/example.png", "http://example.com/api/private",
                    "//example.com/api/private", "file:///api/private",
                    "api/attachments/example.png", "/api/config", "/api/attachments-other/example.png",
                    "/api/attachments/", "/api/attachments/../config", "/api/attachments/a..png",
                    "/api/attachments/example.png%0A",
                    "/api/attachments/%2e%2e/config", "/api/attachments/%252e%252e%252fconfig",
                    "/api/attachments/example.png/../../config", "/api/attachments/a%5cb.png",
                    "/api/team/people", "/api/team/people/p_0000000000000000000000/profile",
                    "/api/team/people/p_0000000000000000000000/picture/../profile"]
        for value in urls {
            let url = try XCTUnwrap(URL(string: value))
            store.imageCache.insert(Data([1]), for: url)
            do {
                _ = try await store.imageData(url: url)
                XCTFail("Unapproved image URL must fail: \(value)")
            } catch {
                XCTAssertTrue(error is EndpointError)
            }
        }
        XCTAssertTrue(transport.requests.isEmpty)
    }

    func testTeamPicturePathUsesTransportAndPreservesVersionQuery() async throws {
        let path = "/api/team/people/p_0000000000000000000000/picture"
        var scenario = shellScenario()
        scenario.responses["GET \(path)"] = .object(["base64": .string("AQID")])
        let store = try AppStore.fixture(loaded: scenario)
        let url = try XCTUnwrap(URL(string: "\(path)?v=example"))
        let data = try await store.imageData(url: url)
        XCTAssertEqual(data, Data([1, 2, 3]))
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        XCTAssertEqual(transport.requests.count, 1)
        XCTAssertEqual(transport.requests.first?.path, path)
        XCTAssertEqual(transport.requests.first?.query, [URLQueryItem(name: "v", value: "example")])
    }

    func testEachTabRetainsItsOwnNavigationPath() throws {
        let store = try AppStore.fixture(loaded: shellScenario())
        let ref = ConversationRef.group("group-1", thread: "thread-2", focus: "message-3")
        store.navigate(to: .conversation(ref))
        store.selectedTab = .inbox
        XCTAssertTrue(store.path.isEmpty)
        store.navigate(to: .notifications)
        XCTAssertEqual(store.path, [.notifications])
        store.selectedTab = .chats
        XCTAssertEqual(store.path, [.conversation(ref)])
        XCTAssertEqual(store.inboxPath, [.notifications])
        let screen = GroupScreen(group: "group-1", thread: "thread-2", focus: "message-3")
        XCTAssertEqual(screen.ref, ref)
        store.navigate(to: .desktop(DesktopTarget(bot: "bot-1")))
        XCTAssertEqual(store.chatsPath, [.conversation(ref), .desktop(DesktopTarget(bot: "bot-1"))])
    }

    func testLateSnapshotCannotRestoreSignedOutState() async throws {
        let clock = ShellManualClock()
        let base = FixtureTransport(scenario: try FixtureScenario.load(named: "shell-basic"))
        let transport = ShellDelayedTransport(base: base, clock: clock.clock)
        let store = AppStore()
        store.pauseRealtime()
        store.attach(transport: transport)
        let refresh = Task { try await store.refreshSnapshot() }
        try await shellEventually { clock.sleeperCount == 1 }
        await store.signOut()
        clock.advance(by: 10)
        do { try await refresh.value; XCTFail("An old session cannot update state") }
        catch { XCTAssertTrue(error is CancellationError) }
        XCTAssertFalse(store.signedIn)
        XCTAssertTrue(store.state.bots.isEmpty)
    }

    func testConcurrentSignOutRunsHandlersOnlyOnce() async throws {
        let store = AppStore.fixture(scenario: "shell-basic")
        let clock = ShellManualClock()
        var calls = 0
        store.registerSignOut {
            calls += 1
            try? await clock.clock.sleep(1)
        }
        let first = Task { await store.signOut() }
        try await shellEventually { clock.sleeperCount == 1 }
        var secondStarted = false
        let second = Task { secondStarted = true; await store.signOut() }
        try await shellEventually { secondStarted }
        clock.advance(by: 1)
        await first.value
        await second.value
        XCTAssertEqual(calls, 1)
        XCTAssertFalse(store.signedIn)
    }

}
