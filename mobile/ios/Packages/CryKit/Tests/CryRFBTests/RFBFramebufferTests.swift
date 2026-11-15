import Foundation
import XCTest
import CryRFB

final class RFBFramebufferTests: XCTestCase {
    func testRawPixelsUseBGRAAndTrackDirtyRectangles() {
        let rect = RFBFixture.rectangle(x: 1, y: 0, width: 2, height: 2, encoding: 0,
                                        payload: [1, 2, 3, 0, 4, 5, 6, 7, 8, 9, 10, 0, 11, 12, 13, 0])
        for bytewise in [false, true] {
            let client = RFBFixture.connected()
            let output = RFBFixture.feed(RFBFixture.update([rect]), to: client, bytewise: bytewise)
            let dirty = [RFBRectangle(x: 1, y: 0, width: 2, height: 2)]
            XCTAssertEqual(client.framebuffer?.pixels, [0, 0, 0, 255, 1, 2, 3, 255, 4, 5, 6, 255,
                                                       0, 0, 0, 255, 8, 9, 10, 255, 11, 12, 13, 255])
            XCTAssertEqual(client.framebuffer?.dirtyRectangles, dirty)
            XCTAssertEqual(RFBFixture.events(output), [.framebufferUpdated(dirty)])
            XCTAssertEqual(RFBFixture.sent(output), [Data([3, 1, 0, 0, 0, 0, 0, 3, 0, 2])])
            _ = client.receive(Data([0, 0, 0, 0]))
            XCTAssertEqual(client.framebuffer?.dirtyRectangles, [])
        }
    }

    func testCopyRectHandlesOverlapInEveryDirection() {
        let directions = [(0, 0, 1, 0, 2, 3), (1, 0, 0, 0, 2, 3), (0, 0, 0, 1, 3, 2), (0, 1, 0, 0, 3, 2)]
        let original = (1...9).flatMap { value -> [UInt8] in [UInt8(value), 0, 0, 255] }
        for (sourceX, sourceY, destX, destY, width, height) in directions {
            for bytewise in [false, true] {
                let client = RFBFixture.connected(width: 3, height: 3)
                let raw = RFBFixture.rectangle(width: 3, height: 3, encoding: 0, payload: original)
                let copy = RFBFixture.rectangle(x: destX, y: destY, width: width, height: height, encoding: 1,
                                               payload: RFBFixture.u16(sourceX) + RFBFixture.u16(sourceY))
                let output = RFBFixture.feed(RFBFixture.update([raw, copy]), to: client, bytewise: bytewise)
                var expected = original
                for y in 0..<height {
                    for x in 0..<width {
                        expected[((destY + y) * 3 + destX + x) * 4] = UInt8((sourceY + y) * 3 + sourceX + x + 1)
                    }
                }
                XCTAssertEqual(client.framebuffer?.pixels, expected)
                XCTAssertEqual(client.framebuffer?.dirtyRectangles, [RFBRectangle(x: 0, y: 0, width: 3, height: 3),
                                                                      RFBRectangle(x: destX, y: destY, width: width, height: height)])
                XCTAssertEqual(RFBFixture.events(output).count, 1)
            }
        }
    }

    func testIncompleteRawDoesNotPublishOrWritePixels() {
        let client = RFBFixture.connected(width: 1, height: 1)
        let update = RFBFixture.update([RFBFixture.rectangle(width: 1, height: 1, encoding: 0, payload: [1, 2, 3, 0])])
        XCTAssertEqual(client.receive(Data(update.dropLast())), [])
        XCTAssertEqual(client.framebuffer?.pixels, [0, 0, 0, 255])
        XCTAssertEqual(client.receive(Data([0])).count, 2)
        XCTAssertEqual(client.framebuffer?.pixels, [1, 2, 3, 255])
    }

    func testDesktopSizeReallocatesAndRequestsFullNewSize() throws {
        for bytewise in [false, true] {
            let client = RFBFixture.connected()
            let resize = RFBFixture.rectangle(width: 2, height: 4, encoding: -223, payload: [])
            let output = RFBFixture.feed(RFBFixture.update([resize]), to: client, bytewise: bytewise)
            XCTAssertEqual(client.framebuffer?.width, 2)
            XCTAssertEqual(client.framebuffer?.height, 4)
            XCTAssertEqual(client.framebuffer?.pixels.count, 32)
            XCTAssertEqual(RFBFixture.events(output).first, .resized(width: 2, height: 4))
            XCTAssertEqual(RFBFixture.sent(output), [Data([3, 0, 0, 0, 0, 0, 0, 2, 0, 4])])
            XCTAssertEqual(try client.framebufferUpdateRequest(), Data([3, 1, 0, 0, 0, 0, 0, 2, 0, 4]))
        }
    }

    func testCursorMaskUsesMSBFirstAndPadsEveryRow() {
        for bytewise in [false, true] {
            let client = RFBFixture.connected()
            let source: [UInt8] = Array(repeating: [1, 2, 3, 0], count: 18).flatMap { $0 }
            let cursor = RFBFixture.rectangle(x: 8, y: 1, width: 9, height: 2, encoding: -239,
                                             payload: source + [0x80, 0x80, 0x40, 0x00])
            let output = RFBFixture.feed(RFBFixture.update([cursor]), to: client, bytewise: bytewise)
            guard case .cursor(let value) = RFBFixture.events(output).first else { return XCTFail("Missing cursor") }
            XCTAssertEqual(value.hotspotX, 8)
            XCTAssertEqual(value.hotspotY, 1)
            XCTAssertEqual(value.width, 9)
            XCTAssertEqual(value.height, 2)
            let expectedAlpha: [UInt8] = [255, 0, 0, 0, 0, 0, 0, 0, 255, 0, 255, 0, 0, 0, 0, 0, 0, 0]
            XCTAssertEqual(stride(from: 3, to: value.pixels.count, by: 4).map { value.pixels[$0] }, expectedAlpha)
            XCTAssertEqual(value.pixels[0..<3], [1, 2, 3])
            XCTAssertEqual(client.framebuffer?.dirtyRectangles, [])
            let hidden = RFBFixture.rectangle(width: 0, height: 0, encoding: -239, payload: [])
            guard case .cursor(let empty) = RFBFixture.events(client.receive(Data(RFBFixture.update([hidden])))).first else {
                return XCTFail("Missing hidden cursor")
            }
            XCTAssertEqual(empty.pixels, [])
        }
    }

    func testInvalidRectangleBoundsEncodingsAndResizeOrderFail() {
        let cases: [[UInt8]] = [
            RFBFixture.update([RFBFixture.rectangle(x: 3, width: 1, height: 1, encoding: 0, payload: [])]),
            RFBFixture.update([RFBFixture.rectangle(width: 1, height: 1, encoding: 1, payload: [0, 3, 0, 0])]),
            RFBFixture.update([RFBFixture.rectangle(width: 0, height: 1, encoding: 0, payload: [])]),
            RFBFixture.update([RFBFixture.rectangle(width: 1, height: 1, encoding: 99, payload: [])]),
            RFBFixture.update([RFBFixture.rectangle(width: 65535, height: 65535, encoding: -223, payload: [])]),
            RFBFixture.update([RFBFixture.rectangle(x: 3, width: 2, height: 1, encoding: -239, payload: [])]),
            [0, 0, 0, 2] + RFBFixture.rectangle(width: 1, height: 1, encoding: -223, payload: [])
        ]
        for bytes in cases {
            let client = RFBFixture.connected()
            _ = client.receive(Data(bytes))
            XCTAssertEqual(client.state, .failed)
        }
    }
}
