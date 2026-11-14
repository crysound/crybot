import XCTest
@testable import CryCore

final class SSEParserTests: XCTestCase {
    func testEveryByteBoundaryIncludingUnicodeAndCRLF() throws {
        let bytes = Data("\u{FEFF}: heartbeat\r\nid: cursor-1\r\nevent: sections\r\ndata: {\"sections\":[\"你好\"]}\r\n\r\n".utf8)
        for boundary in 0...bytes.count {
            var parser = SSEParser()
            let first = try parser.feed(Data(bytes.prefix(boundary)))
            let rest = try parser.feed(Data(bytes.dropFirst(boundary)))
            let frames = first + rest
            XCTAssertEqual(frames.count, 1)
            guard case .sections(let value) = frames.first else { return XCTFail("Missing sections") }
            XCTAssertEqual(value.sections, ["你好"])
            XCTAssertEqual(parser.lastEventID, "cursor-1")
            XCTAssertEqual(parser.lastEventName, "sections")
        }
    }

    func testMultipleDataLinesCommentsAndConsecutiveEvents() throws {
        var parser = SSEParser()
        let stream = ": comment\ndata: {\"kind\":\"sections\",\ndata: \"sections\":[\"One\",\"Two\"]}\n\nid: cursor-2\n\ndata: {\"kind\":\"ping\"}\n\n"
        let frames = try parser.feed(Data(stream.utf8))
        XCTAssertEqual(frames.map(\.kind), ["sections", "ping"])
        if case .sections(let value) = frames[0] { XCTAssertEqual(value.sections, ["One", "Two"]) }
        XCTAssertEqual(parser.lastEventID, "cursor-2")
    }

    func testCRLinesIDResetAndNulIgnored() throws {
        var parser = SSEParser()
        _ = try parser.feed(Data("id: first\rid: bad\0id\r\r".utf8))
        XCTAssertEqual(parser.lastEventID, "first")
        _ = try parser.feed(Data("id\r\r".utf8))
        XCTAssertEqual(parser.lastEventID, "")
        XCTAssertEqual(try parser.feed(Data("event: ping\rdata: {}\r\r".utf8)).map(\.kind), ["ping"])
    }

    func testEOFDiscardsIncompleteAndEventNameResets() throws {
        var parser = SSEParser()
        XCTAssertTrue(try parser.feed(Data("data: {\"kind\":\"ping\"}".utf8)).isEmpty)
        parser.finish()
        XCTAssertTrue(try parser.feed(Data("\n".utf8)).isEmpty)
        _ = try parser.feed(Data("event: ping\ndata: {}\n\n".utf8))
        XCTAssertThrowsError(try parser.feed(Data("data: {}\n\n".utf8)))
    }

    func testMalformedJSONUTF8AndSizeLimits() throws {
        var parser = SSEParser()
        XCTAssertThrowsError(try parser.feed(Data("data: nope\n\n".utf8)))
        XCTAssertEqual(try parser.feed(Data("data: {\"kind\":\"ping\"}\n\n".utf8)).count, 1)
        var bad = SSEParser()
        XCTAssertThrowsError(try bad.feed(Data([0xFF, 0x0A])))
        var bounded = SSEParser(maximumEventBytes: 20)
        XCTAssertThrowsError(try bounded.feed(Data(repeating: 65, count: 21)))
        var multiline = SSEParser(maximumEventBytes: 25)
        XCTAssertThrowsError(try multiline.feed(Data("data: 1234567890\ndata: 1234567890\ndata: 1234567890\n".utf8)))
    }
}
