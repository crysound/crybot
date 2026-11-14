import XCTest
@testable import CryCore

final class RequestCardTests: XCTestCase {
    func testAppliedAndUndoneRequireAllowedUnheldAutoApplication() throws {
        for auto in [false, true] {
            for answered in [nil, "allow", "deny", "Allow"] as [String?] {
                for held in [nil, "", "Review required"] as [String?] {
                    for undone in [false, true] {
                        var card = try json(#"{"title":"Choose","subtitle":"Next","options":[]}"#).decode(OptionCardData.self)
                        card.profileRequest = try fixture(OptionCardData.self).profileRequest
                        card.autoApplied = auto
                        card.answered = answered
                        card.held = held
                        card.undone = undone
                        let applied = auto && answered == "allow" && (held ?? "").isEmpty
                        XCTAssertEqual(RequestCardKind.classify(card), applied ? (undone ? .undone : .autoApplied) : .profileRequest,
                                       "auto=\(auto), answered=\(String(describing: answered)), held=\(String(describing: held)), undone=\(undone)")
                    }
                }
            }
        }
    }

    func testEveryKindAndEveryPriorityPair() throws {
        let full = try XCTUnwrap(manualCases().first { $0.swiftType == "OptionCardData" }).value
        let kinds = RequestCardKind.allCases
        for (index, kind) in kinds.enumerated() {
            var raw: JSONValue = .object(["title": .string("Choose"), "subtitle": .string("Next step"), "options": .array([])])
            if kind != .permission { raw[kind.rawValue] = try XCTUnwrap(full[kind.rawValue]) }
            if kind == .autoApplied || kind == .undone {
                raw["autoApplied"] = .bool(true)
                raw["answered"] = .string("allow")
            }
            XCTAssertEqual(RequestCardKind.classify(try raw.decode(OptionCardData.self)), kind)
            for lower in kinds.dropFirst(index + 1) where lower != .permission {
                var competing = raw
                competing[lower.rawValue] = try XCTUnwrap(full[lower.rawValue])
                XCTAssertEqual(RequestCardKind.classify(try competing.decode(OptionCardData.self)), kind, "\(kind) must outrank \(lower)")
            }
            for flag in ["expired", "stopped", "dismissed"] {
                var terminal = raw
                terminal[flag] = .bool(true)
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
