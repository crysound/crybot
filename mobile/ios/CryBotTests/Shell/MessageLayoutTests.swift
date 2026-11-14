import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

final class MessageLayoutTests: XCTestCase {
    func testEveryKnownKindAndUnknownHaveOrderedBodies() throws {
        let expected: [(String, MessagePart)] = [
            ("text", .markdown), ("options", .optionsCard), ("activity", .activity),
            ("screen", .recordRow), ("connector", .connectCard), ("secret", .connectCard),
            ("signin", .connectCard), ("routine.run", .recordRow), // public-scan: allow domain
            ("goal.run", .recordRow), // public-scan: allow domain
            ("burst", .recordRow), ("digest", .recordRow), ("compaction", .recordRow),
            ("call", .recordRow), ("widget", .webSummary), ("app", .webSummary), ("future", .updateRequired)
        ]
        for (kind, body) in expected {
            let raw = """
            {"kind":"\(kind)","id":"message-1","role":"bot","at":0,"text":"Example"}
            """
            let message = try JSONDecoder().decode(WireMessage.self, from: Data(raw.utf8))
            XCTAssertEqual(MessageLayout.plan(for: message), [.leadingExtras, body, .trailingExtras], kind)
        }
    }

    func testAttachmentsAndExtrasSurroundEveryKnownBody() throws {
        let expected: [(String, MessagePart)] = [
            ("text", .markdown), ("options", .optionsCard), ("activity", .activity),
            ("screen", .recordRow), ("connector", .connectCard), ("secret", .connectCard),
            ("signin", .connectCard), ("routine.run", .recordRow), // public-scan: allow domain
            ("goal.run", .recordRow), // public-scan: allow domain
            ("burst", .recordRow), ("digest", .recordRow), ("compaction", .recordRow),
            ("call", .recordRow), ("widget", .webSummary), ("app", .webSummary), ("future", .updateRequired)
        ]
        for (kind, body) in expected {
            let raw = """
            {"kind":"\(kind)","id":"message-1","role":"bot","at":0,"helperIntro":true,
             "setupOffer":true,"attachments":[{"kind":"file","path":"example.txt","mime":"text/plain","name":"example.txt"}]}
            """
            let message = try JSONDecoder().decode(WireMessage.self, from: Data(raw.utf8))
            let parts = MessageLayout.plan(for: message)
            XCTAssertEqual(parts, [.leadingExtras, body, .attachments, .trailingExtras], kind)
        }
    }

    func testEmptyAttachmentsDoNotAddASection() {
        let fields = WireMessageFields(id: "message-1", role: .bot, at: 0, attachments: [])
        XCTAssertEqual(MessageLayout.plan(for: .text(fields)), [.leadingExtras, .markdown, .trailingExtras])
    }
}
