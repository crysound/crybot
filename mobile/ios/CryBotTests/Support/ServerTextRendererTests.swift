import XCTest
import CryCore
@testable import CryBot

final class ServerTextRendererTests: XCTestCase {
    private func renderer(_ language: String) throws -> ServerTextRenderer {
        let path = try XCTUnwrap(Bundle.main.path(forResource: language, ofType: "lproj"))
        let bundle = try XCTUnwrap(Bundle(path: path))
        return ServerTextRenderer(bundle: bundle, locale: Locale(identifier: language))
    }

    func testHitsGeneratedTableAndIgnoresFallback() throws {
        let line = ServerTextLine(textCode: "chat.notice.backupContinuingSignedOut", textParams: [
            "engine": .string("Claude"), "name": .string("Orion")
        ])
        XCTAssertEqual(try renderer("en").render(line, fallback: "Fallback"), "continuing on Orion while Claude is signed out")
        XCTAssertEqual(try renderer("en").render(ServerTextLine(textCode: "serverError.page.downloadHasFiles")),
                       "This page has files beside it, so it can't be saved as one file. Share it for a link instead.")
    }

    func testCrossLanguageOrderAndExtraParameters() throws {
        let line = ServerTextLine(textCode: "chat.notice.backupContinuingSignedOut", textParams: [
            "engine": .string("Claude"), "name": .string("Orion"),
            "resetsAt": .number(0), "timeZone": .string("UTC"), "aaa": .string("unrelated")
        ])
        let translations = [
            "zh-Hant": "Claude 已登出，改在 Orion 上繼續",
            "pt-BR": "Continuando em Orion enquanto Claude está sem login"
        ]
        for language in ["en", "de", "es", "fr", "hi", "it", "ja", "ko", "pl", "pt-BR", "ru", "tr", "uk", "vi", "zh-Hans", "zh-Hant"] {
            XCTAssertEqual(try renderer(language).render(line),
                           translations[language] ?? "continuing on Orion while Claude is signed out", language)
        }
    }

    func testHeldCodesRenderFromGeneratedTable() throws {
        let messages = [
            "native": "The provider requires your approval for this action.",
            "sandbox": "This loosens the AI's own safety limits, so only Full access can approve it automatically.",
            "outbound": "This sends something on your behalf, so it asks you first.",
            "undeliveredFull": "Full access couldn't deliver this approval.",
            "undelivered": "Approve for me couldn't answer this one."
        ]
        for (suffix, text) in messages {
            let line = ServerTextLine(textCode: "approval.held.\(suffix)")
            XCTAssertEqual(try renderer("en").render(line, fallback: "Fallback"), text)
        }
    }

    func testIntegerNumbersHaveNoDecimalSuffix() throws {
        let line = ServerTextLine(textCode: "chat.notice.codexUnsupportedMore", textParams: [
            "tools": .string("alpha, beta"), "count": .number(3)
        ])
        XCTAssertEqual(try renderer("en").render(line),
                       "Codex could not run the tools alpha, beta and 3 more (\"unsupported call\"): the AI provider sent the call back without the tool's app name, so it never reached the tool. Pick a model for this bot whose provider handles tool calls fully.")
    }

    func testFractionalNumbersKeepTheirDecimalPart() throws {
        let line = ServerTextLine(textCode: "chat.notice.goalRetry", textParams: [
            "name": .string("Orion"), "why": .number(3.5)
        ])
        XCTAssertEqual(try renderer("en").render(line), "Orion's turn did not settle (3.5) — retrying once.")
    }

    func testReferenceParametersAreTranslated() throws {
        let line = ServerTextLine(textCode: "chat.notice.claudeLimit", textParams: [
            "limit": .string("chat.notice.part.weeklyLimit"), "meanwhile": .string("chat.notice.part.chooseModel")
        ])
        XCTAssertEqual(try renderer("en").render(line),
                       "This Claude account has reached its weekly limit. For now, choose another model for this bot.")
        XCTAssertEqual(try renderer("zh-Hant").render(line), "這個 Claude 帳號已達到每週上限。目前請為這個智能體選擇另一個模型。")
        let retry = ServerTextLine(textCode: "chat.notice.goalRetry", textParams: [
            "name": .string("Orion"), "why": .string("chat.notice.part.goalTimedOut")
        ])
        XCTAssertEqual(try renderer("zh-Hant").render(retry), "Orion 的回合沒有結束（逾時），正在重試一次。")
    }

    func testUnrecognizedPartAndMissingParameterFallBackToEnglish() throws {
        let english = "This Claude account has reached its limit. Choose another model."
        let line = ServerTextLine(textCode: "chat.notice.claudeLimit", textParams: [
            "limit": .string("chat.notice.part.futurePart"), "meanwhile": .string("chat.notice.part.chooseModel")
        ])
        XCTAssertEqual(try renderer("zh-Hant").render(line, fallback: english), english)
        let incomplete = ServerTextLine(textCode: "chat.notice.backupContinuingSignedOut", textParams: ["name": .string("Orion")])
        XCTAssertEqual(try renderer("zh-Hant").render(incomplete, fallback: "continuing on Orion"), "continuing on Orion")
    }

    func testOnlyReferenceParameterNamesAreTranslatedAndValuesAreNotReexpanded() throws {
        let line = ServerTextLine(textCode: "chat.notice.backupContinuingSignedOut", textParams: [
            "name": .string("chat.notice.part.weeklyLimit"), "engine": .string("{name} 100%")
        ])
        XCTAssertEqual(try renderer("en").render(line), "continuing on chat.notice.part.weeklyLimit while {name} 100% is signed out")
    }

    func testResetTimeUsesMillisecondsAndServerTimeZone() throws {
        let path = try XCTUnwrap(Bundle.main.path(forResource: "en", ofType: "lproj"))
        let bundle = try XCTUnwrap(Bundle(path: path))
        let renderer = ServerTextRenderer(bundle: bundle, locale: Locale(identifier: "en_GB"))
        let line = ServerTextLine(textCode: "chat.notice.claudeLimitResets", textParams: [
            "limit": .string("chat.notice.part.weeklyLimit"), "meanwhile": .string("chat.notice.part.chooseModel"),
            "resetsAt": .number(0), "timeZone": .string("Asia/Tokyo"), "resets": .string("stale")
        ])
        let text = renderer.render(line)
        XCTAssertTrue(text.hasPrefix("This Claude account has reached its weekly limit, which resets "))
        XCTAssertTrue(text.contains("1 Jan"))
        XCTAssertTrue(text.contains("09:00"))
        XCTAssertTrue(text.hasSuffix(" (Asia/Tokyo). Until then, choose another model for this bot."))
        XCTAssertFalse(text.contains("stale"))
    }

    func testInvalidTimeZoneKeepsEnglish() throws {
        let line = ServerTextLine(textCode: "chat.notice.claudeLimitResets", textParams: [
            "resetsAt": .number(0), "timeZone": .string("Unknown/Zone")
        ])
        XCTAssertEqual(try renderer("zh-Hant").render(line, fallback: "Original English"), "Original English")
    }

    func testResetHourHasTwoDigitsInTwelveAndTwentyFourHourLocales() throws {
        let path = try XCTUnwrap(Bundle.main.path(forResource: "en", ofType: "lproj"))
        let bundle = try XCTUnwrap(Bundle(path: path))
        let line = ServerTextLine(textCode: "routines.server.limitWait", textParams: [
            "resetsAt": .number(0), "timeZone": .string("Asia/Tokyo")
        ])
        for language in ["en_US", "en_GB", "zh_Hans"] {
            let renderer = ServerTextRenderer(bundle: bundle, locale: Locale(identifier: language))
            let text = renderer.render(line)
            XCTAssertTrue(text.contains("09:00"), text)
            XCTAssertTrue(text.hasSuffix("(Asia/Tokyo)"), text)
        }
    }

    func testFallsBackToOriginalTextAndCode() {
        var line = ServerTextLine(textCode: "missing.notice")
        line.additionalFields["text"] = .string("Original English")
        XCTAssertEqual(ServerTextRenderer().render(line), "Original English")
        XCTAssertEqual(ServerTextRenderer().render(line, fallback: "Explicit English"), "Explicit English")
        XCTAssertEqual(ServerTextRenderer().render(ServerTextLine(textCode: "missing.notice")), "missing.notice")
        XCTAssertEqual(ServerTextRenderer().render(ServerTextLine(), fallback: "Original English"), "Original English")
    }
}
