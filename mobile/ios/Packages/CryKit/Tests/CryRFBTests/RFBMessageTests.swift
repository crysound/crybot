import Foundation
import XCTest
import CryRFB

final class RFBMessageTests: XCTestCase {
    func testEveryClientMessageHasExactWireBytes() throws {
        let client = RFBFixture.connected(width: 513, height: 258)
        XCTAssertEqual(try client.keyEvent(keysym: 0xff0d, down: true), Data([4, 1, 0, 0, 0, 0, 255, 13]))
        XCTAssertEqual(try client.keyEvent(keysym: 0x01004e2d, down: false), Data([4, 0, 0, 0, 1, 0, 78, 45]))
        XCTAssertEqual(try client.pointerEvent(x: 258, y: 513, buttons: 0x85), Data([5, 133, 1, 2, 2, 1]))
        XCTAssertEqual(try client.pointerEvent(x: 0, y: 0, buttons: 0), Data([5, 0, 0, 0, 0, 0]))
        XCTAssertEqual(try client.clientCutText("Aé\n"), Data([6, 0, 0, 0, 0, 0, 0, 3, 65, 233, 10]))
        XCTAssertEqual(try client.clientCutText(""), Data([6, 0, 0, 0, 0, 0, 0, 0]))
        XCTAssertEqual(try client.framebufferUpdateRequest(), Data([3, 1, 0, 0, 0, 0, 2, 1, 1, 2]))
        XCTAssertEqual(try client.framebufferUpdateRequest(incremental: false), Data([3, 0, 0, 0, 0, 0, 2, 1, 1, 2]))
        XCTAssertThrowsError(try client.clientCutText("你好")) { XCTAssertEqual($0 as? RFBError, .textNotLatin1) }
    }

    func testClientMessagesRequireConnectedState() {
        let client = RFBClient(inflater: StoredBlockInflater())
        for failFirst in [false, true] {
            if failFirst { _ = client.receive(Data("BAD 003.008\n".utf8)) }
            XCTAssertThrowsError(try client.keyEvent(keysym: 65, down: true)) { XCTAssertEqual($0 as? RFBError, .notConnected) }
            XCTAssertThrowsError(try client.pointerEvent(x: 1, y: 2, buttons: 1)) { XCTAssertEqual($0 as? RFBError, .notConnected) }
            XCTAssertThrowsError(try client.clientCutText("Example")) { XCTAssertEqual($0 as? RFBError, .notConnected) }
            XCTAssertThrowsError(try client.framebufferUpdateRequest()) { XCTAssertEqual($0 as? RFBError, .notConnected) }
        }
    }

    func testServerClipboardBellAndIgnoredColourMapStayAligned() {
        let colourMap: [UInt8] = [1, 0, 0, 7, 0, 2, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6]
        let cutText: [UInt8] = [3, 0, 0, 0, 0, 0, 0, 3, 65, 233, 10]
        let emptyText: [UInt8] = [3, 0, 0, 0, 0, 0, 0, 0]
        for bytewise in [false, true] {
            let client = RFBFixture.connected()
            let output = RFBFixture.feed(colourMap + [2] + cutText + emptyText + [2], to: client, bytewise: bytewise)
            XCTAssertEqual(RFBFixture.events(output), [.bell, .clipboard("Aé\n"), .clipboard(""), .bell])
            XCTAssertEqual(RFBFixture.sent(output), [])
        }
    }

    func testEmptyFramebufferUpdateRequestsNextFrame() {
        let client = RFBFixture.connected()
        XCTAssertEqual(client.receive(Data([0, 0, 0, 0])), [
            .event(.framebufferUpdated([])), .send(Data([3, 1, 0, 0, 0, 0, 0, 3, 0, 2]))
        ])
    }

    func testUnknownMessageAndOversizedClipboardFailImmediately() {
        for bytes: [UInt8] in [[99], [3, 0, 0, 0, 255, 255, 255, 255]] {
            let client = RFBFixture.connected()
            let output = client.receive(Data(bytes))
            XCTAssertEqual(client.state, .failed)
            XCTAssertEqual(RFBFixture.events(output).count, 1)
            XCTAssertEqual(RFBFixture.sent(output), [])
        }
    }
}
