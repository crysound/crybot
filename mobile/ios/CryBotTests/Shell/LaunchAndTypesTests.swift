import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

final class LaunchAndTypesTests: XCTestCase {
    func testLaunchOptionsAndMissingValues() {
        let options = LaunchOptions(arguments: ["CryBot", "-CryFixtureScenario", "shell-basic", "-CryAppearance", "dark", "-CryGallery", "WebHost"])
        XCTAssertEqual(options.fixtureScenario, "shell-basic")
        XCTAssertEqual(options.appearance, .dark)
        XCTAssertEqual(options.gallery, "WebHost")
        let missing = LaunchOptions(arguments: ["-CryFixtureScenario", "-CryGallery", "Chat", "-CryAppearance", "invalid"])
        XCTAssertNil(missing.fixtureScenario)
        XCTAssertNil(missing.appearance)
        XCTAssertEqual(missing.gallery, "Chat")
        XCTAssertEqual(LaunchOptions(arguments: ["-CryAppearance", "light"]).appearance, .light)
        XCTAssertEqual(LaunchOptions(arguments: ["-CryAppearance", "LIGHT"]).appearance, .light)
        XCTAssertEqual(LaunchOptions(arguments: ["-CryAppearance", "DaRk"]).appearance, .dark)
        XCTAssertNil(LaunchOptions(arguments: ["-CryGallery"]).gallery)
    }

    func testPersonSourcesAndFocusedConversation() {
        XCTAssertEqual(PersonRef(sender: ResolvedSender(name: "Maple", id: "person-1")), PersonRef(id: "person-1", name: "Maple"))
        let relay = WireMessageFieldsRelay(kind: .told, email: "maple@example.com", name: "Maple")
        XCTAssertEqual(PersonRef(relay: relay).email, "maple@example.com")
        let person = PersonRef(member: ["name": .string("Cedar"), "avatarUrl": .string("https://example.com/avatar.png"), "color": .string("purple")])
        XCTAssertEqual(person.imageURL?.host, "example.com")
        XCTAssertEqual(person.color, "purple")
        let ref = ConversationRef.bot("bot-1", thread: "thread-1", focus: "message-1")
        XCTAssertEqual(ref.focus, "message-1")
        XCTAssertEqual(ref.thread, "thread-1")
        XCTAssertFalse(ref.isGroup)
    }

    func testWebTargetsRemainHashableWithCorePanelTarget() {
        let target = WebHostTarget.botPanel("bot-1", PanelTarget(tab: .details, page: .settings))
        XCTAssertEqual(Set([target, target]).count, 1)
        let action = RespondAction(thread: "thread-1", body: RespondBody(requestId: "request-1", behavior: .allow))
        XCTAssertEqual(Set([action, action]).count, 1)
        XCTAssertEqual(Set([WidgetAction(action: "save"), WidgetAction(action: "save")]).count, 1)
    }

    func testFeatureDirectoryContract() throws {
        let ios = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let features = ios.appendingPathComponent("CryBot/Features")
        let names = try Set(FileManager.default.contentsOfDirectory(atPath: features.path))
        let expected: Set<String> = ["Login", "Avatar", "Sidebar", "Chat", "Composer", "Activity", "Markdown", "Code", "Math", "Media", "CardsApproval", "CardsRequests", "CardsConnect", "Records", "MessageExtras", "Group", "Inbox", "Desktop", "WebHost"]
        let removed: Set<String> = ["ChatFind", "Mermaid", "Widget", "Charts", "WebContent", "Automations", "Files", "TeamMap", "MCP", "BotSettings", "BotPanel", "BotPanelMore", "NewBot", "Settings", "SettingsAI", "SettingsAdmin", "ScreenStream", "Computer", "Call", "CallOpenAI", "CallFish"]
        XCTAssertTrue(expected.isSubset(of: names))
        XCTAssertTrue(names.isDisjoint(with: removed))
        for name in expected {
            XCTAssertTrue(FileManager.default.fileExists(atPath: features.appendingPathComponent("\(name)/\(name)Entry.swift").path))
            XCTAssertTrue(FileManager.default.fileExists(atPath: features.appendingPathComponent("\(name)/\(name).xcstrings").path))
        }
    }
}
