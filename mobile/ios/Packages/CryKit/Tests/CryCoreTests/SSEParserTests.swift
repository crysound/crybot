import XCTest
@testable import CryCore

final class SSEParserTests: XCTestCase {
    func testGoodBadGoodFramesInOneChunk() throws {
        var parser = SSEParser()
        let stream = "id: s:1\ndata: {\"kind\":\"sections\",\"sections\":[\"One\"]}\n\nid: s:2\ndata: {\"kind\":\"sections\",\"sections\":false}\n\nid: s:3\ndata: {\"kind\":\"sections\",\"sections\":[\"Three\"]}\n\n"
        let frames = try parser.feed(Data(stream.utf8))
        XCTAssertEqual(frames, [.sections(.init(sections: ["One"])), .sections(.init(sections: ["Three"]))])
        XCTAssertEqual(parser.lastEventID, "s:3")
        XCTAssertEqual(parser.invalidEventCount, 1)
    }

    func testMalformedEventsRecoverAtEveryChunkBoundary() throws {
        let good = Data("data: {\"kind\":\"ping\"}\r\n\r\n".utf8)
        let stream = good + Data([0xFF, 13, 10, 13, 10]) + good
            + Data("data: nope\r\n\r\n".utf8) + good
            + Data(repeating: 65, count: 41) + Data("\r\n\r\n".utf8) + good
        for boundary in 0...stream.count {
            var parser = SSEParser(maximumEventBytes: 40)
            let frames = try parser.feed(Data(stream.prefix(boundary)))
                + parser.feed(Data(stream.dropFirst(boundary)))
            XCTAssertEqual(frames.map(\.kind), ["ping", "ping", "ping", "ping"])
            XCTAssertEqual(parser.invalidEventCount, 3)
        }
    }

    func testIncompleteEventDoesNotCommitID() throws {
        var parser = SSEParser()
        _ = try parser.feed(Data("id: s:4\n\n".utf8))
        _ = try parser.feed(Data("id: s:5\ndata: {\"kind\":".utf8))
        XCTAssertEqual(parser.lastEventID, "s:4")
        parser.finish()
        XCTAssertEqual(parser.lastEventID, "s:4")
        _ = try parser.feed(Data("data: {\"kind\":\"ping\"}\n\n".utf8))
        XCTAssertEqual(parser.lastEventID, "s:4")
    }

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
        XCTAssertTrue(try parser.feed(Data("data: {}\n\n".utf8)).isEmpty)
        XCTAssertEqual(parser.invalidEventCount, 1)
    }

    func testMalformedJSONUTF8AndSizeLimits() throws {
        var parser = SSEParser()
        XCTAssertTrue(try parser.feed(Data("data: nope\n\n".utf8)).isEmpty)
        XCTAssertEqual(parser.invalidEventCount, 1)
        XCTAssertEqual(try parser.feed(Data("data: {\"kind\":\"ping\"}\n\n".utf8)).count, 1)
        var bad = SSEParser()
        XCTAssertTrue(try bad.feed(Data([0xFF, 0x0A, 0x0A])).isEmpty)
        XCTAssertEqual(bad.invalidEventCount, 1)
        var bounded = SSEParser(maximumEventBytes: 20)
        XCTAssertTrue(try bounded.feed(Data(repeating: 65, count: 21)).isEmpty)
        _ = try bounded.feed(Data("\n\n".utf8))
        XCTAssertEqual(bounded.invalidEventCount, 1)
        var multiline = SSEParser(maximumEventBytes: 25)
        XCTAssertTrue(try multiline.feed(Data("data: 1234567890\ndata: 1234567890\ndata: 1234567890\n\n".utf8)).isEmpty)
        XCTAssertEqual(multiline.invalidEventCount, 1)
        XCTAssertEqual(try multiline.feed(Data("data: {\"kind\":\"ping\"}\n\n".utf8)).count, 1)
    }
}
