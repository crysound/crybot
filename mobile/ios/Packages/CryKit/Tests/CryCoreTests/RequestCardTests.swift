import XCTest
@testable import CryCore

final class RequestCardTests: XCTestCase {
    func testEveryKindAndEveryPriorityPair() throws {
        let full = try XCTUnwrap(manualCases().first { $0.swiftType == "OptionCardData" }).value
        let kinds = RequestCardKind.allCases
        for (index, kind) in kinds.enumerated() {
            var raw: JSONValue = .object(["title": .string("Choose"), "subtitle": .string("Next step"), "options": .array([])])
            if kind != .permission { raw[kind.rawValue] = try XCTUnwrap(full[kind.rawValue]) }
            XCTAssertEqual(RequestCardKind.classify(try raw.decode(OptionCardData.self)), kind)
            for lower in kinds.dropFirst(index + 1) where lower != .permission {
                var competing = raw
                competing[lower.rawValue] = try XCTUnwrap(full[lower.rawValue])
                XCTAssertEqual(RequestCardKind.classify(try competing.decode(OptionCardData.self)), kind, "\(kind) must outrank \(lower)")
            }
            for flag in ["expired", "stopped", "dismissed", "answered"] {
                var terminal = raw
                terminal[flag] = flag == "answered" ? .string("Allow") : .bool(true)
                XCTAssertEqual(RequestCardKind.classify(try terminal.decode(OptionCardData.self)), kind)
            }
        }
        XCTAssertEqual(kinds.count, 23)
    }

    func testFalseFlagsAndUnknownFieldUseGeneralApproval() throws {
        let card = try json(#"{"title":"Choose","subtitle":"Next","options":[],"fixedOptions":false,"undone":false,"autoApplied":false,"futureRequest":{},"requestType":"permission"}"#).decode(OptionCardData.self)
        XCTAssertEqual(RequestCardKind.classify(card), .permission)
    }
}
