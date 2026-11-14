import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

@MainActor
final class ConnectionTests: XCTestCase {
    func testBackoffCapsAtThirtySecondsAndStableConnectionResetsIt() {
        var policy = ConnectionPolicy(now: 10)
        XCTAssertEqual((0..<8).map { _ in policy.retryDelay() }, [1, 2, 4, 8, 16, 30, 30, 30])
        XCTAssertFalse(policy.isTimedOut(at: 49.999))
        XCTAssertTrue(policy.isTimedOut(at: 50))
        policy.connected(at: 60)
        XCTAssertFalse(policy.isTimedOut(at: 99))
        XCTAssertEqual(policy.retryDelay(), 30)
        policy.receivedFrame(at: 90)
        XCTAssertFalse(policy.isTimedOut(at: 129.999))
        XCTAssertTrue(policy.isTimedOut(at: 130))
        XCTAssertEqual(policy.retryDelay(), 1)
    }

    func testTimeoutReconnectAndBackgroundCancellationUseInjectedClock() async throws {
        let clock = ShellManualClock()
        let store = try AppStore.fixture(loaded: shellScenario(), clock: clock.clock)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        defer { store.pauseRealtime() }
        store.setScreens(true)
        store.resumeRealtime()
        try await shellEventually { clock.sleeperCount == 1 && transport.requests.count == 1 }
        clock.advance(by: 39)
        XCTAssertEqual(transport.requests.count, 1)
        clock.advance(by: 1)
        try await shellEventually { store.connectionStatus == .waiting(1) && clock.sleeperCount == 1 }
        clock.advance(by: 1)
        try await shellEventually { transport.requests.count == 2 && clock.sleeperCount == 1 }
        clock.advance(by: 40)
        try await shellEventually { store.connectionStatus == .waiting(2) && clock.sleeperCount == 1 }
        clock.advance(by: 2)
        try await shellEventually { transport.requests.count == 3 && clock.sleeperCount == 1 }
        XCTAssertTrue(transport.requests.allSatisfy { $0.screens == false })
        store.pauseRealtime()
        try await shellEventually { clock.sleeperCount == 0 }
        clock.advance(by: 100)
        XCTAssertEqual(transport.requests.count, 3)
        XCTAssertEqual(store.connectionStatus, .disconnected)
        store.resumeRealtime()
        try await shellEventually { transport.requests.count == 4 }
    }

    func testPingExtendsDeadlineAndResumeCarriesCursor() async throws {
        let clock = ShellManualClock()
        let hello = ServerFrame.hello(ServerFrameHello(resumed: false, cursor: "STREAM:0"))
        let store = try AppStore.fixture(loaded: shellScenario(frames: [
            .init(afterMs: 0, frame: hello),
            .init(afterMs: 1_000, frame: try shellFrame(#"{"kind":"mcp.changed","seq":7}"#)),
            .init(afterMs: 30_000, frame: .ping(ServerFramePing()))
        ]), clock: clock.clock)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        defer { store.pauseRealtime() }
        store.resumeRealtime()
        try await shellEventually { clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { store.state.unhandledFrameCounts["mcp.changed"] == 1 && clock.sleeperCount == 2 }
        clock.advance(by: 29)
        try await shellEventually { store.state.unhandledFrameCounts["ping"] == 1 }
        clock.advance(by: 10)
        try await shellEventually { clock.sleeperCount == 1 }
        XCTAssertEqual(store.connectionStatus, .connected)
        clock.advance(by: 29)
        XCTAssertEqual(transport.requests.filter { $0.operation == .events }.count, 1)
        clock.advance(by: 1)
        try await shellEventually { store.connectionStatus == .waiting(1) && clock.sleeperCount == 1 }
        clock.advance(by: 1)
        try await shellEventually { transport.requests.filter { $0.operation == .events }.count == 2 }
        XCTAssertEqual(transport.requests.last { $0.operation == .events }?.since, "STREAM:7")
    }

    func testHelloWithoutResumeRefreshesSnapshotButResumedHelloDoesNot() async throws {
        let clock = ShellManualClock()
        let store = try AppStore.fixture(loaded: shellScenario(frames: [
            .init(afterMs: 1_000, frame: .hello(ServerFrameHello(resumed: true))),
            .init(afterMs: 2_000, frame: .sections(ServerFrameSections(sections: ["changed"]))),
            .init(afterMs: 3_000, frame: .hello(ServerFrameHello(resumed: false)))
        ]), clock: clock.clock)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        defer { store.pauseRealtime() }
        store.resumeRealtime()
        try await shellEventually { clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { store.connectionStatus == .connected && clock.sleeperCount == 2 }
        XCTAssertFalse(transport.requests.contains { $0.path == "/api/bots" })
        clock.advance(by: 1)
        try await shellEventually { store.state.sections == ["changed"] && clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { transport.requests.contains { $0.path == "/api/bots" } && store.state.sections.isEmpty }
        XCTAssertEqual(transport.requests.filter { $0.path == "/api/bots" }.count, 1)
    }

    func testFirstConnectionWaitsForHelloAndOnlyNonResumedHelloLoadsOneSnapshot() async throws {
        for resumed in [false, true] {
            let clock = ShellManualClock()
            let transport = ShellControlledTransport()
            let store = AppStore(clock: clock.clock)
            defer { store.pauseRealtime() }
            store.attach(transport: transport)
            try await shellEventually { transport.eventRequests.count == 1 }
            XCTAssertFalse(store.isFixture)
            XCTAssertTrue(transport.base.requests.isEmpty)
            transport.emit(.hello(ServerFrameHello(resumed: resumed, cursor: "STREAM:0")))
            try await shellEventually {
                store.connectionStatus == .connected && (resumed || transport.inboxRequestCount == 1)
            }
            XCTAssertEqual(transport.base.requests.filter { $0.path == "/api/bots" }.count, resumed ? 0 : 1)
            XCTAssertEqual(transport.inboxRequestCount, resumed ? 0 : 1)
        }
    }

    func testHelloOnlyDisconnectionsKeepIncreasingBackoff() async throws {
        let clock = ShellManualClock()
        let transport = ShellControlledTransport()
        let store = AppStore(clock: clock.clock)
        defer { store.pauseRealtime() }
        store.attach(transport: transport)
        for (index, delay) in [1.0, 2.0, 4.0, 8.0].enumerated() {
            try await shellEventually { transport.eventRequests.count == index + 1 && clock.sleeperCount == 1 }
            transport.emit(.hello(ServerFrameHello(resumed: true, cursor: "STREAM:0")))
            try await shellEventually { store.connectionStatus == .connected }
            transport.finish()
            try await shellEventually { store.connectionStatus == .waiting(delay) && clock.sleeperCount == 1 }
            clock.advance(by: delay)
        }
    }

    func testLiveInboxBadgeRefreshesAfterSnapshotAndRelevantFrames() async throws {
        let clock = ShellManualClock()
        let scenario = try FixtureScenario.load(named: "shell-basic")
        let transport = ShellControlledTransport(scenario: scenario)
        transport.inboxCount = 3
        let store = AppStore(clock: clock.clock)
        defer { store.pauseRealtime() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        XCTAssertFalse(store.isFixture)
        XCTAssertEqual(store.inboxUnreadCount, 0)
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:0")))
        try await shellEventually { store.inboxUnreadCount == 3 }
        XCTAssertEqual(transport.inboxRequestCount, 1)
        let changes: [(ServerFrame, Int)] = [
            (.bot(ServerFrameBot(bot: scenario.snapshot.bots[0])), 5),
            (.group(ServerFrameGroup(group: scenario.snapshot.groups[0])), 4),
            (.botDeleted(ServerFrameBotDeleted(botId: "bot-1")), 2),
            (.notificationsRead(ServerFrameNotificationsRead(threadId: "thread-1", ids: [])), 0)
        ]
        for (frame, count) in changes {
            transport.inboxCount = count
            transport.emit(frame)
            try await shellEventually { store.inboxUnreadCount == count }
        }
        XCTAssertLessThanOrEqual(transport.inboxRequestCount, 1 + changes.count)
        transport.inboxCount = 2
        try await store.refreshSnapshot()
        try await shellEventually { store.inboxUnreadCount == 2 }
        XCTAssertLessThanOrEqual(transport.inboxRequestCount, 2 + changes.count)
    }

    func testReconnectSinceUsesLatestSequenceAfterHello() async throws {
        let clock = ShellManualClock()
        let transport = ShellControlledTransport()
        let store = AppStore(clock: clock.clock)
        defer { store.pauseRealtime() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:0")))
        transport.emit(try shellFrame(#"{"kind":"mcp.changed","seq":42}"#))
        try await shellEventually { store.state.unhandledFrameCounts["mcp.changed"] == 1 }
        transport.finish()
        try await shellEventually { store.connectionStatus == .waiting(1) && clock.sleeperCount == 1 }
        clock.advance(by: 1)
        try await shellEventually { transport.eventRequests.count == 2 }
        XCTAssertEqual(transport.eventRequests.last?.since, "STREAM:42")
        XCTAssertEqual(transport.eventRequests.last?.screens, false)
    }

    func testPauseDuringSnapshotRequiresAnotherSnapshotOnResume() async throws {
        let clock = ShellManualClock()
        let scenario = try FixtureScenario.load(named: "shell-basic")
        let transport = ShellControlledTransport(scenario: scenario, clock: clock.clock, snapshotDelay: 10)
        let store = AppStore(clock: clock.clock)
        defer { store.detach() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:5")))
        try await shellEventually { transport.snapshotRequestCount == 1 && clock.sleeperCount == 2 }
        XCTAssertTrue(store.state.bots.isEmpty)
        store.pauseRealtime()
        store.resumeRealtime()
        try await shellEventually { transport.eventRequests.count == 2 && clock.sleeperCount == 1 }
        XCTAssertNil(transport.eventRequests.last?.since)
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:6")))
        transport.emit(.sections(ServerFrameSections(sections: ["snapshot-ready"])))
        try await shellEventually { transport.snapshotRequestCount == 2 && clock.sleeperCount == 2 }
        clock.advance(by: 10)
        try await shellEventually { store.state.bots.count == 2 && store.state.sections == ["snapshot-ready"] }
        store.pauseRealtime()
        store.resumeRealtime()
        try await shellEventually { transport.eventRequests.count == 3 }
        XCTAssertEqual(transport.eventRequests.last?.since, "STREAM:6")
    }

    func testFailedSnapshotDiscardsHelloCursor() async throws {
        let clock = ShellManualClock()
        let transport = ShellControlledTransport(snapshotFails: true)
        let store = AppStore(clock: clock.clock)
        defer { store.detach() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:5")))
        try await shellEventually { store.connectionStatus == .waiting(1) && clock.sleeperCount == 1 }
        clock.advance(by: 1)
        try await shellEventually { transport.eventRequests.count == 2 }
        XCTAssertNil(transport.eventRequests.last?.since)
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:6")))
        try await shellEventually { transport.snapshotRequestCount == 2 }
    }

    func testResumedHelloCannotSkipReplayOnNextConnection() async throws {
        let clock = ShellManualClock()
        let transport = ShellControlledTransport()
        let store = AppStore(clock: clock.clock)
        defer { store.detach() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:5")))
        transport.emit(.sections(ServerFrameSections(sections: ["ready"])))
        try await shellEventually { store.state.sections == ["ready"] }
        for index in 2...3 {
            transport.finish()
            try await shellEventually { store.connectionStatus == .waiting(Double(index - 1)) && clock.sleeperCount == 1 }
            clock.advance(by: Double(index - 1))
            try await shellEventually { transport.eventRequests.count == index }
            XCTAssertEqual(transport.eventRequests.last?.since, "STREAM:5")
            transport.emit(.hello(ServerFrameHello(resumed: true, cursor: "STREAM:20")))
            try await shellEventually { store.connectionStatus == .connected }
        }
        XCTAssertEqual(transport.snapshotRequestCount, 1)
        transport.emit(try shellFrame(#"{"kind":"mcp.changed","seq":6}"#))
        try await shellEventually { store.state.unhandledFrameCounts["mcp.changed"] == 1 }
        store.pauseRealtime()
        store.resumeRealtime()
        try await shellEventually { transport.eventRequests.count == 4 }
        XCTAssertEqual(transport.eventRequests.last?.since, "STREAM:6")
    }

    func testSlowInboxRefreshDoesNotBlockFramesAndCoalescesChanges() async throws {
        let clock = ShellManualClock()
        let scenario = try FixtureScenario.load(named: "shell-basic")
        let transport = ShellControlledTransport(scenario: scenario, clock: clock.clock, inboxDelay: 60)
        transport.inboxCount = 3
        let store = AppStore(clock: clock.clock)
        defer { store.detach() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:0")))
        try await shellEventually { transport.inboxRequestCount == 1 && clock.sleeperCount == 2 }
        for index in 1...10 {
            let frame = try shellFrame("{\"kind\":\"message.patch\",\"threadId\":\"thread-1\",\"message\":{\"id\":\"message-1\",\"role\":\"bot\",\"at\":0,\"kind\":\"text\",\"text\":\"patch-\(index)\"},\"seq\":\(index)}")
            transport.emit(frame)
        }
        transport.emit(.sections(ServerFrameSections(sections: ["patches-applied"])))
        try await shellEventually { store.state.sections == ["patches-applied"] }
        XCTAssertEqual(store.page(thread: "thread-1").messages.first?.fields?.text, "patch-10")
        XCTAssertEqual(transport.inboxRequestCount, 1)
        for index in 1...2 {
            clock.advance(by: 20)
            transport.emit(.sections(ServerFrameSections(sections: ["active-\(index)"])))
            try await shellEventually { store.state.sections == ["active-\(index)"] && clock.sleeperCount == 2 }
        }
        XCTAssertEqual(store.connectionStatus, .connected)
        XCTAssertEqual(transport.eventRequests.count, 1)
        transport.inboxCount = 7
        for _ in 0..<20 {
            transport.emit(.notificationsRead(ServerFrameNotificationsRead(threadId: "thread-1", ids: [])))
        }
        transport.emit(.sections(ServerFrameSections(sections: ["changes-applied"])))
        try await shellEventually { store.state.sections == ["changes-applied"] }
        XCTAssertEqual(transport.inboxRequestCount, 1)
        clock.advance(by: 20)
        try await shellEventually { transport.inboxRequestCount == 2 && clock.sleeperCount == 2 }
        XCTAssertEqual(store.inboxUnreadCount, 3)
        store.pauseRealtime()
        try await shellEventually { clock.sleeperCount == 1 }
        clock.advance(by: 60)
        try await shellEventually { store.inboxUnreadCount == 7 && transport.activeInboxRequests == 0 }
        XCTAssertEqual(transport.inboxRequestCount, 2)
        XCTAssertEqual(transport.peakInboxRequests, 1)
    }

    func testPatchBurstDoesNotScheduleTrailingInboxRefresh() async throws {
        let clock = ShellManualClock()
        let transport = ShellControlledTransport(clock: clock.clock, inboxDelay: 10)
        transport.inboxCount = 3
        let store = AppStore(clock: clock.clock)
        defer { store.detach() }
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:0")))
        try await shellEventually { transport.inboxRequestCount == 1 && clock.sleeperCount == 2 }
        let message = WireMessage.text(WireMessageFields(id: "message-1", role: .bot, at: 0, text: "Patch"))
        for _ in 0..<20 {
            transport.emit(.messagePatch(ServerFrameMessagePatch(threadId: "thread-1", message: message)))
        }
        transport.emit(.sections(ServerFrameSections(sections: ["processed"])))
        try await shellEventually { store.state.sections == ["processed"] }
        clock.advance(by: 10)
        try await shellEventually { store.inboxUnreadCount == 3 && transport.activeInboxRequests == 0 }
        XCTAssertEqual(transport.inboxRequestCount, 1)
    }

    func testSignOutCancelsPendingInboxRefresh() async throws {
        let clock = ShellManualClock()
        let transport = ShellControlledTransport(clock: clock.clock, inboxDelay: 10)
        transport.inboxCount = 3
        let store = AppStore(clock: clock.clock)
        store.attach(transport: transport)
        try await shellEventually { transport.eventRequests.count == 1 }
        transport.emit(.hello(ServerFrameHello(resumed: false, cursor: "STREAM:0")))
        try await shellEventually { transport.activeInboxRequests == 1 && clock.sleeperCount == 2 }
        await store.signOut()
        try await shellEventually { transport.activeInboxRequests == 0 && clock.sleeperCount == 0 }
        clock.advance(by: 10)
        XCTAssertEqual(store.inboxUnreadCount, 0)
        XCTAssertFalse(store.signedIn)
        XCTAssertEqual(transport.inboxRequestCount, 1)
    }

    func testCursorHandlesUnknownFramesHeartbeatAndStreamChanges() throws {
        XCTAssertEqual(FrameCursor.value(for: try shellFrame(#"{"kind":"future","seq":9}"#), previous: "STREAM:8"), "STREAM:9")
        XCTAssertNil(FrameCursor.value(for: .ping(ServerFramePing()), previous: "STREAM:9"))
        XCTAssertEqual(FrameCursor.value(for: .hello(ServerFrameHello(resumed: false, cursor: "NEXT:0")), previous: "STREAM:9"), "NEXT:0")
        for seq in ["-1", "1.5", "9007199254740992", "9223372036854775808", "null", "\"9\""] {
            let frame = try shellFrame("{\"kind\":\"mcp.changed\",\"seq\":\(seq)}")
            XCTAssertNil(FrameCursor.value(for: frame, previous: "STREAM:9"))
        }
        for seq in ["0", "9007199254740991"] {
            let frame = try shellFrame("{\"kind\":\"mcp.changed\",\"seq\":\(seq)}")
            XCTAssertEqual(FrameCursor.value(for: frame, previous: "STREAM:9"), "STREAM:\(seq)")
        }
        XCTAssertNil(FrameCursor.value(for: try shellFrame(#"{"kind":"mcp.changed","seq":1}"#), previous: nil))
    }

    func testAttachLoadsSnapshotAndDetachStopsStream() async throws {
        let clock = ShellManualClock()
        let transport = FixtureTransport(scenario: try FixtureScenario.load(named: "shell-basic"), clock: clock.clock)
        let store = AppStore(clock: clock.clock)
        store.attach(transport: transport)
        try await shellEventually { store.state.bots.count == 2 && transport.requests.contains { $0.operation == .events } }
        XCTAssertTrue(store.signedIn)
        XCTAssertEqual(transport.requests.first?.path, "/api/events")
        XCTAssertEqual(transport.requests.filter { $0.path == "/api/bots" }.count, 1)
        store.detach()
        XCTAssertNil(store.transport)
        XCTAssertEqual(store.connectionStatus, .disconnected)
        try await shellEventually { clock.sleeperCount == 0 }
        await store.signOut()
        store.attach(transport: transport)
        try await shellEventually { transport.requests.filter { $0.operation == .events }.count == 2 }
        XCTAssertTrue(store.signedIn)
        store.detach()
        try await shellEventually { clock.sleeperCount == 0 }
    }
}
