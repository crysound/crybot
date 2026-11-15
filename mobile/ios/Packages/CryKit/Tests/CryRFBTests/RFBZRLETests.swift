import Foundation
import XCTest
import CryRFB

final class RFBZRLETests: XCTestCase {
    private let red = RFBFixture.red
    private let green = RFBFixture.green
    private let blue = RFBFixture.blue

    private func assertTile(_ payload: [UInt8], width: Int, height: Int, expected: [UInt8],
                            file: StaticString = #filePath, line: UInt = #line) {
        for bytewise in [false, true] {
            let inflater = StoredBlockInflater()
            let client = RFBFixture.connected(width: width, height: height, inflater: inflater)
            let update = RFBFixture.update([RFBFixture.zrle(payload, width: width, height: height)])
            let output = RFBFixture.feed(update, to: client, bytewise: bytewise)
            XCTAssertEqual(client.state, .connected, file: file, line: line)
            XCTAssertEqual(client.framebuffer?.pixels, expected, file: file, line: line)
            XCTAssertEqual(RFBFixture.events(output), [.framebufferUpdated([RFBRectangle(x: 0, y: 0, width: width, height: height)])],
                           file: file, line: line)
            XCTAssertEqual(inflater.calls.count, 1, file: file, line: line)
        }
    }

    func testRawCPIXELExpandsBGRToOpaqueBGRA() {
        assertTile([0, 0, 0, 255, 0, 255, 0, 255, 0, 0, 3, 2, 1], width: 2, height: 2,
                   expected: red + green + blue + [3, 2, 1, 255])
    }

    func testSolidSubencoding() {
        assertTile([1, 0, 0, 255], width: 3, height: 2,
                   expected: Array(repeating: red, count: 6).flatMap { $0 })
    }

    func testPackedPaletteOneBitPadsEachRow() {
        assertTile([2, 0, 0, 255, 0, 255, 0, 0b01011111, 0b10111111], width: 3, height: 2,
                   expected: red + green + red + green + red + green)
    }

    func testPackedPaletteTwoBitsUsesMSBFirst() {
        let palette: [UInt8] = [3, 0, 0, 255, 0, 255, 0, 255, 0, 0]
        assertTile(palette + [0b00011011, 0b10010011], width: 3, height: 2,
                   expected: red + green + blue + blue + green + red)
    }

    func testPackedPaletteFourBitsAndUnusedRowPadding() {
        let palette: [UInt8] = [5, 0, 0, 255, 0, 255, 0, 255, 0, 0, 3, 2, 1, 6, 5, 4]
        assertTile(palette + [0x04, 0x2f, 0x31, 0x0f], width: 3, height: 2,
                   expected: red + [6, 5, 4, 255] + blue + [3, 2, 1, 255] + green + red)
    }

    func testPlainRLEAndExtendedRunLength() {
        let expected = Array(repeating: red, count: 256).flatMap { $0 } + Array(repeating: green, count: 64).flatMap { $0 }
        assertTile([128, 0, 0, 255, 255, 0, 0, 255, 0, 63], width: 64, height: 5, expected: expected)
    }

    func testPaletteRLESingletonAndExtendedRunLength() {
        let expected = green + Array(repeating: red, count: 319).flatMap { $0 }
        assertTile([130, 0, 0, 255, 0, 255, 0, 1, 128, 255, 63], width: 64, height: 5, expected: expected)
    }

    func testTilesAre64By64AndEdgeTilesUseRemainingDimensions() {
        let payload: [UInt8] = [1, 0, 0, 255, 1, 0, 255, 0, 1, 255, 0, 0, 1, 3, 2, 1]
        var expected: [UInt8] = []
        for _ in 0..<64 { expected += Array(repeating: red, count: 64).flatMap { $0 } + green }
        expected += Array(repeating: blue, count: 64).flatMap { $0 } + [3, 2, 1, 255]
        assertTile(payload, width: 65, height: 65, expected: expected)
    }

    func testZRLEWritesAtRectangleOffset() {
        let client = RFBFixture.connected()
        let compressed = RFBFixture.stored([1, 0, 0, 255])
        let rect = RFBFixture.rectangle(x: 1, y: 1, width: 2, height: 1, encoding: 16,
                                        payload: RFBFixture.u32(UInt32(compressed.count)) + compressed)
        _ = client.receive(Data(RFBFixture.update([rect])))
        XCTAssertEqual(client.framebuffer?.pixels,
                       Array(repeating: [UInt8(0), 0, 0, 255], count: 4).flatMap { $0 } + red + red)
    }

    func testInflaterStreamContinuesAcrossRectanglesAndUpdates() {
        for bytewise in [false, true] {
            let inflater = StoredBlockInflater()
            let client = RFBFixture.connected(width: 1, height: 1, inflater: inflater)
            let first = RFBFixture.zrle([1, 0, 0, 255], width: 1, height: 1)
            let second = RFBFixture.zrle([1, 0, 255, 0], width: 1, height: 1, first: false)
            let third = RFBFixture.zrle([1, 255, 0, 0], width: 1, height: 1, first: false)
            let output = RFBFixture.feed(RFBFixture.update([first, second]) + RFBFixture.update([third]), to: client, bytewise: bytewise)
            XCTAssertEqual(client.framebuffer?.pixels, blue)
            XCTAssertEqual(inflater.calls.map { Array($0) }, [RFBFixture.stored([1, 0, 0, 255]),
                                                              RFBFixture.stored([1, 0, 255, 0], first: false),
                                                              RFBFixture.stored([1, 255, 0, 0], first: false)])
            XCTAssertEqual(RFBFixture.events(output).count, 2)
            XCTAssertEqual(client.state, .connected)
        }
    }

    func testInflaterNotCalledUntilEntireRectangleArrives() {
        let inflater = StoredBlockInflater()
        let client = RFBFixture.connected(width: 1, height: 1, inflater: inflater)
        let bytes = RFBFixture.update([RFBFixture.zrle([1, 0, 0, 255], width: 1, height: 1)])
        XCTAssertEqual(client.receive(Data(bytes.dropLast())), [])
        XCTAssertEqual(inflater.calls.count, 0)
        _ = client.receive(Data(bytes.suffix(1)))
        XCTAssertEqual(inflater.calls.count, 1)
        XCTAssertEqual(client.framebuffer?.pixels, red)
    }

    func testMalformedTilesAreTerminalWithoutChangingFramebuffer() {
        let invalid: [[UInt8]] = [
            [], [0, 0, 0], [1, 0, 0], [17], [127], [129],
            [3, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0xc0],
            [128, 0, 0, 255, 1], [128, 0, 0, 255],
            [130, 0, 0, 255, 0, 255, 0, 2],
            [130, 0, 0, 255, 0, 255, 0, 128, 1],
            [1, 0, 0, 255, 0]
        ]
        for payload in invalid {
            for bytewise in [false, true] {
                let client = RFBFixture.connected(width: 1, height: 1)
                let bytes = RFBFixture.update([RFBFixture.zrle(payload, width: 1, height: 1)])
                let output = RFBFixture.feed(bytes, to: client, bytewise: bytewise)
                XCTAssertEqual(client.state, .failed, "Payload: \(payload)")
                XCTAssertEqual(client.framebuffer?.pixels, [0, 0, 0, 255])
                XCTAssertEqual(RFBFixture.sent(output), [])
            }
        }
    }

    func testMalformedDeflateAndOversizedCompressedLengthFail() {
        for payload: [UInt8] in [[255, 255, 255, 255], [0, 0, 0, 2, 0, 0]] {
            let client = RFBFixture.connected(width: 1, height: 1)
            let rect = RFBFixture.rectangle(width: 1, height: 1, encoding: 16, payload: payload)
            _ = client.receive(Data(RFBFixture.update([rect])))
            XCTAssertEqual(client.state, .failed)
        }
    }

    func testInflaterHasOutputBudgetAndClientChecksReturnedSize() {
        final class ExcessInflater: Inflater {
            var maximum: Int?
            func inflate(_ compressed: Data, maximumOutputSize: Int) throws -> Data {
                maximum = maximumOutputSize
                return Data(repeating: 0, count: maximumOutputSize + 1)
            }
        }
        let inflater = ExcessInflater()
        let client = RFBClient(inflater: inflater)
        _ = client.receive(Data(RFBFixture.handshake(width: 1, height: 1)))
        let bytes = RFBFixture.update([RFBFixture.zrle([1, 0, 0, 255], width: 1, height: 1)])
        XCTAssertEqual(RFBFixture.events(client.receive(Data(bytes))), [.failed(.limitExceeded)])
        XCTAssertEqual(inflater.maximum, 386)
    }

    func testCompleteSessionHasIdenticalOutputAtEverySplit() {
        let raw = RFBFixture.rectangle(width: 2, height: 1, encoding: 0, payload: red + green)
        let copy = RFBFixture.rectangle(x: 1, y: 1, width: 2, height: 1, encoding: 1, payload: [0, 0, 0, 0])
        let zrle = RFBFixture.zrle([1, 255, 0, 0], width: 1, height: 1)
        let bytes = RFBFixture.handshake() + RFBFixture.update([raw, copy, zrle]) + [2, 3, 0, 0, 0, 0, 0, 0, 1, 65]
        let whole = RFBClient(inflater: StoredBlockInflater())
        let expected = whole.receive(Data(bytes))
        for split in 0...bytes.count {
            let client = RFBClient(inflater: StoredBlockInflater())
            let first = client.receive(Data(bytes.prefix(split)))
            let second = client.receive(Data(bytes.dropFirst(split)))
            XCTAssertEqual(first + second, expected, "Split \(split)")
            XCTAssertEqual(client.framebuffer, whole.framebuffer)
        }
        let client = RFBClient(inflater: StoredBlockInflater())
        XCTAssertEqual(RFBFixture.feed(bytes, to: client, bytewise: true), expected)
        XCTAssertEqual(client.framebuffer, whole.framebuffer)
    }
}
