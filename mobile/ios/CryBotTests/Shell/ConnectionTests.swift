import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

@MainActor
final class ConnectionTests: XCTestCase {
    func testBackoffCapsAtThirtySecondsAndAnyFrameResetsIt() {
        var policy = ConnectionPolicy(now: 10)
        XCTAssertEqual((0..<8).map { _ in policy.retryDelay() }, [1, 2, 4, 8, 16, 30, 30, 30])
        XCTAssertFalse(policy.isTimedOut(at: 49.999))
        XCTAssertTrue(policy.isTimedOut(at: 50))
        policy.connected(at: 60)
        XCTAssertFalse(policy.isTimedOut(at: 99))
        XCTAssertEqual(policy.retryDelay(), 30)
        policy.receivedFrame(at: 80)
        XCTAssertFalse(policy.isTimedOut(at: 119.999))
        XCTAssertTrue(policy.isTimedOut(at: 120))
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
        let hello = ServerFrame.hello(ServerFrameHello(resumed: true, cursor: "fixture-cursor"))
        let store = try AppStore.fixture(loaded: shellScenario(frames: [
            .init(afterMs: 1_000, frame: hello),
            .init(afterMs: 30_000, frame: .ping(ServerFramePing()))
        ]), clock: clock.clock)
        let transport = try XCTUnwrap(store.transport as? FixtureTransport)
        defer { store.pauseRealtime() }
        store.resumeRealtime()
        try await shellEventually { clock.sleeperCount == 2 }
        clock.advance(by: 1)
        try await shellEventually { store.connectionStatus == .connected && clock.sleeperCount == 2 }
        clock.advance(by: 29)
        try await shellEventually { store.state.unhandledFrameCounts["ping"] == 1 }
        clock.advance(by: 10)
        try await shellEventually { clock.sleeperCount == 1 }
        XCTAssertEqual(store.connectionStatus, .connected)
        clock.advance(by: 29)
        XCTAssertEqual(transport.requests.count, 1)
        clock.advance(by: 1)
        try await shellEventually { store.connectionStatus == .waiting(1) && clock.sleeperCount == 1 }
        clock.advance(by: 1)
        try await shellEventually { transport.requests.count == 2 }
        XCTAssertEqual(transport.requests.last?.since, "fixture-cursor")
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

    func testAttachLoadsSnapshotAndDetachStopsStream() async throws {
        let clock = ShellManualClock()
        let transport = FixtureTransport(scenario: try FixtureScenario.load(named: "shell-basic"), clock: clock.clock)
        let store = AppStore(clock: clock.clock)
        store.attach(transport: transport)
        try await shellEventually { store.state.bots.count == 2 && transport.requests.contains { $0.operation == .events } }
        XCTAssertTrue(store.signedIn)
        XCTAssertEqual(transport.requests.first?.path, "/api/bots")
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
