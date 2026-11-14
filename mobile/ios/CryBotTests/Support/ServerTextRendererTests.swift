import XCTest
import CryCore
@testable import CryBot

final class ServerTextRendererTests: XCTestCase {
    func testFallsBackToOriginalTextAndSubstitutesParameters() {
        var line = ServerTextLine(textCode: "missing.notice", textParams: ["name": .string("Ada")])
        line.additionalFields["text"] = .string("Hello %@")
        XCTAssertEqual(ServerTextRenderer().render(line), "Hello Ada")
    }

    func testFallsBackToCodeWhenNoOriginalTextExists() {
        XCTAssertEqual(ServerTextRenderer().render(ServerTextLine(textCode: "missing.notice")), "missing.notice")
    }
}
