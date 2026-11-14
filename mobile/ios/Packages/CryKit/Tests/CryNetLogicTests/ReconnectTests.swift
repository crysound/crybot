import XCTest
import Foundation
import CryCore
@testable import CryNetLogic

final class ReconnectTests: XCTestCase {
    func testBackoffAndPingReset() {
        var state = ReconnectState()
        XCTAssertEqual((0..<8).map { _ in state.disconnected() }, [1, 2, 4, 8, 16, 30, 30, 30])
        state.connected()
        state.receive(.hello(.init(resumed: true)), eventID: nil)
        XCTAssertEqual(state.disconnected(), 30)
        state.receive(.ping(.init()), eventID: nil)
        XCTAssertEqual(state.disconnected(), 1)
    }
    func testFortySecondsWithoutFrame() {
        var time: TimeInterval = 0
        var state = ReconnectState(clock: { time })
        time = 39.999
        XCTAssertFalse(state.isStale)
        time = 40
        XCTAssertTrue(state.isStale)
        state.receive(.ping(.init()), eventID: nil)
        XCTAssertFalse(state.isStale)
        time = 80
        XCTAssertTrue(state.isStale)
        state.connected()
        XCTAssertFalse(state.isStale)
    }
    func testResumedHelloNeverSkipsReplay() throws {
        var state = ReconnectState(since: "10")
        state.receive(.hello(.init(resumed: true, cursor: "20")), eventID: "20")
        XCTAssertEqual(state.cursor, "10")
        XCTAssertFalse(state.snapshotRequired)
        state.receive(try frame(), eventID: "11")
        XCTAssertEqual(state.cursor, "11")
        _ = state.disconnected()
        XCTAssertEqual(state.cursor, "11")
    }
    func testSnapshotCursorCommitsOnlyAfterSnapshotAndKeepsNewerFrames() throws {
        var state = ReconnectState(since: "10")
        state.receive(.hello(.init(resumed: false, cursor: "20")), eventID: nil)
        XCTAssertTrue(state.snapshotRequired)
        XCTAssertEqual(state.cursor, "10")
        state.receive(try frame(), eventID: "21")
        XCTAssertEqual(state.cursor, "10")
        state.snapshotLoaded()
        XCTAssertFalse(state.snapshotRequired)
        XCTAssertEqual(state.cursor, "21")
        state.receive(.hello(.init(resumed: false, cursor: "30")), eventID: nil)
        _ = state.disconnected()
        state.snapshotLoaded()
        XCTAssertEqual(state.cursor, "21")
        state.receive(.hello(.init(resumed: false, cursor: "40")), eventID: nil)
        state.snapshotLoaded()
        XCTAssertEqual(state.cursor, "40")
    }
    func testParserAndStatePreserveEachFrameCursor() throws {
        let wire = "data: {\"kind\":\"hello\",\"resumed\":true,\"cursor\":\"30\"}\n\nid: 11\ndata: {\"kind\":\"sections\",\"sections\":[]}\n\nid: 12\ndata: {\"kind\":\"sections\",\"sections\":[]}\n\n"
        var parser = SSEParser()
        var state = ReconnectState(since: "10")
        var cursors: [String?] = []
        for byte in wire.utf8 {
            for frame in try parser.feed(Data([byte])) {
                state.receive(frame, eventID: parser.lastEventID)
                cursors.append(state.cursor)
            }
        }
        XCTAssertEqual(cursors, ["10", "11", "12"])
    }
    private func frame() throws -> ServerFrame {
        try JSONDecoder().decode(ServerFrame.self, from: Data(#"{"kind":"sections","sections":[]}"#.utf8))
    }
}
