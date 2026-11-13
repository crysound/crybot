import Foundation
import XCTest

final class WatchContractTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)
    private let server = URL(string: "https://bot.example.com")!

    private func cookie(_ name: String, _ value: String, domain: String = "bot.example.com",
                        expires: Date? = nil, path: String = "/") -> HTTPCookie {
        var properties: [HTTPCookiePropertyKey: Any] = [
            .name: name, .value: value, .domain: domain, .path: path, .secure: "TRUE"
        ]
        if let expires { properties[.expires] = expires }
        return HTTPCookie(properties: properties)!
    }

    func testSelectsBothCredentialsFromServerAndIgnoresOtherDomains() {
        let selected = LoginCookies.select(from: [
            cookie("cry_session_443_111111111111", "cry_sess_other", domain: "other.example.com"),
            cookie("CF_Authorization", "other-access", domain: "other.example.com"),
            cookie("cry_session_443_222222222222", "cry_sess_server"),
            cookie("CF_Authorization", "server-access", expires: now.addingTimeInterval(3600)),
            cookie("cry_session_443_333333333333", "cry_sess_suffix", domain: "notbot.example.com")
        ], server: server, now: now)
        XCTAssertEqual(selected.server, "https://bot.example.com")
        XCTAssertEqual(selected.sessionToken, "cry_sess_server")
        XCTAssertEqual(selected.cfAuthorization, "server-access")
        XCTAssertEqual(selected.cfExpires, 1_800_003_600)
        XCTAssertTrue(selected.isReady)
    }

    func testMissingAccessCookieDoesNotProduceReadyLogin() {
        let selected = LoginCookies.select(from: [cookie("cry_session_443_222222222222", "cry_sess_server")],
                                           server: server, now: now)
        XCTAssertEqual(selected.sessionToken, "cry_sess_server")
        XCTAssertEqual(selected.cfAuthorization, "")
        XCTAssertNil(selected.cfExpires)
        XCTAssertFalse(selected.isReady)
    }

    func testIgnoresExpiredWrongPathAndNonSessionCookies() {
        let selected = LoginCookies.select(from: [
            cookie("CF_Authorization", "expired", expires: now.addingTimeInterval(-1)),
            cookie("cry_session_443_111111111111", "cry_sess_wrong_path", path: "/other"),
            cookie("unrelated", "cry_sess_unrelated"),
            cookie("cry_session_443_222222222222", "invalid")
        ], server: server, now: now)
        XCTAssertEqual(selected.sessionToken, "")
        XCTAssertEqual(selected.cfAuthorization, "")
        XCTAssertFalse(selected.isReady)
    }

    func testAcceptsParentDomainCookiesButNotHostOnlyParent() {
        let selected = LoginCookies.select(from: [
            cookie("CF_Authorization", "parent-access", domain: ".example.com"),
            cookie("cry_session_443_111111111111", "cry_sess_parent", domain: "example.com"),
            cookie("cry_session_443_222222222222", "cry_sess_server")
        ], server: server, now: now)
        XCTAssertEqual(selected.sessionToken, "cry_sess_server")
        XCTAssertEqual(selected.cfAuthorization, "parent-access")
    }

    func testPrefersCurrentPortWhenMultipleSessionsShareHost() {
        let selected = LoginCookies.select(from: [
            cookie("cry_session_443_111111111111", "cry_sess_default"),
            cookie("cry_session_8443_222222222222", "cry_sess_port"),
            cookie("CF_Authorization", "access")
        ], server: URL(string: "https://bot.example.com:8443")!, now: now)
        XCTAssertEqual(selected.sessionToken, "cry_sess_port")
    }

    func testContextRoundTripOmitsAbsentExpiryAndRejectsInsecureServer() {
        let credentials = WatchCredentials(server: server.absoluteString, sessionToken: "cry_sess_test",
                                           cfAuthorization: "test-access", cfExpires: nil)
        XCTAssertNil(credentials.context["cfExpires"])
        XCTAssertNotNil(credentials.context["updatedAt"] as? TimeInterval)
        XCTAssertEqual(WatchCredentials(context: credentials.context), credentials)
        var invalid = credentials.context
        invalid["server"] = "http://bot.example.com"
        XCTAssertNil(WatchCredentials(context: invalid))
        XCTAssertTrue(ServerAddress.matches("https://bot.example.com/", "https://bot.example.com:443"))
        XCTAssertFalse(ServerAddress.matches("https://bot.example.com", "https://other.example.com"))
        XCTAssertFalse(ServerAddress.matches("https://bot.example.com", "https://bot.example.com:8443"))
    }

    func testRequestHeadersContainBothTokensAndNoOrigin() {
        let headers = WatchRequest.headers(credentials: WatchFixtures.credentials)
        XCTAssertEqual(headers["Authorization"], "Bearer cry_sess_fixture")
        XCTAssertEqual(headers["Cookie"], "CF_Authorization=fixture-access")
        XCTAssertEqual(headers["Accept"], "application/json")
        XCTAssertNil(headers["Origin"])
    }

    func testAuthStatusesAndOtherFailures() throws {
        for status in [302, 303, 307, 401, 403] {
            XCTAssertThrowsError(try WatchRequest.validate(status: status)) {
                XCTAssertEqual($0 as? WatchAPIError, .loginExpired)
            }
        }
        try WatchRequest.validate(status: 200)
        try WatchRequest.validate(status: 202)
        XCTAssertThrowsError(try WatchRequest.validate(status: 500)) {
            XCTAssertEqual($0 as? WatchAPIError, .rejected(500))
        }
    }

    func testBotsDecodeRealWireFieldsAndIgnoreUnknownFields() throws {
        let result = try JSONDecoder().decode(BotList.self, from: Data(WatchFixtures.bots.utf8))
        XCTAssertEqual(result.bots.count, 2)
        let bot = result.bots[0]
        XCTAssertEqual(bot.id, "bot-1")
        XCTAssertEqual(bot.name, "Assistant")
        XCTAssertEqual(bot.title, "Research")
        XCTAssertEqual(bot.displayName, "Assistant")
        XCTAssertEqual(bot.threadId, "thread-1")
        XCTAssertEqual(bot.latestReply?.text, "Hello")
        XCTAssertEqual(bot.latestReply?.date.timeIntervalSince1970, 1_800_000_000)
        XCTAssertNil(result.bots[1].messages)
        XCTAssertNil(result.bots[1].title)
    }

    func testMessagesDecodeOptionalFieldsAndPlaceholderBehavior() throws {
        let page = try JSONDecoder().decode(MessagePage.self, from: Data(WatchFixtures.messages.utf8))
        XCTAssertEqual(page.hasMore, true)
        XCTAssertEqual(page.activeLeafId, "m4")
        XCTAssertEqual(page.messages.map(\.id), ["m1", "m2", "m3", "m4"])
        XCTAssertEqual(page.messages[0].sendId, "11111111-1111-4111-8111-111111111111")
        XCTAssertNil(page.messages[1].text)
        let chinese = ["MESSAGE_TOOL": "[工具调用]", "MESSAGE_ATTACHMENT": "[附件]", "MESSAGE_OTHER": "[消息]"]
        let english = ["MESSAGE_TOOL": "[Tool call]", "MESSAGE_ATTACHMENT": "[Attachment]", "MESSAGE_OTHER": "[Message]"]
        XCTAssertEqual(page.messages.map { $0.displayText { chinese[$0]! } }, ["Hi", "[工具调用]", "[附件]", "[消息]"])
        XCTAssertEqual(page.messages.map { $0.displayText { english[$0]! } }, ["Hi", "[Tool call]", "[Attachment]", "[Message]"])
        let minimal = try JSONDecoder().decode(MessagePage.self, from: Data(#"{"messages":[]}"#.utf8))
        XCTAssertNil(minimal.hasMore)
        XCTAssertNil(minimal.activeLeafId)
    }

    func testTextAttachmentWithoutCaptionUsesAttachmentPlaceholder() throws {
        let json = #"{"id":"image","role":"bot","kind":"text","at":1800000000000,"attachments":[{"kind":"image","path":"/api/attachments/example.png","mime":"image/png"}]}"#
        let message = try JSONDecoder().decode(WatchMessage.self, from: Data(json.utf8))
        XCTAssertEqual(message.displayText { _ in "[附件]" }, "[附件]")
    }

    func testAcceptedAndQueuedSendDecode() throws {
        let accepted = try JSONDecoder().decode(SendResult.self, from: Data(WatchFixtures.accepted.utf8))
        XCTAssertTrue(accepted.ok)
        XCTAssertEqual(accepted.threadId, "thread-1")
        XCTAssertEqual(accepted.message?.text, "Hi")
        XCTAssertNil(accepted.queued)
        let queued = try JSONDecoder().decode(SendResult.self, from: Data(WatchFixtures.queued.utf8))
        XCTAssertEqual(queued.queued, true)
        XCTAssertNil(queued.message)
    }
}

enum WatchFixtures {
    static let credentials = WatchCredentials(server: "https://bot.example.com", sessionToken: "cry_sess_fixture",
                                               cfAuthorization: "fixture-access", cfExpires: nil)
    static let bots = #"""
    {"bots":[
      {"id":"bot-1","name":"Assistant","title":"Research","threadId":"thread-1",
       "description":"","avatarUrl":null,"notifications":true,"unread":false,
       "futureField":{"enabled":true},"messages":[
         {"id":"reply-1","role":"bot","kind":"text","text":"Hello","at":1800000000000},
         {"id":"user-2","role":"user","kind":"text","text":"Next","at":1800000001000}
       ],"hasMore":false,"activeLeafId":"user-2"},
      {"id":"bot-2","name":"Helper","threadId":"thread-2"}
    ],"botQueuedMessages":{},"groups":[],"sections":[]}
    """#
    static let messages = #"""
    {"messages":[
      {"id":"m1","role":"user","kind":"text","text":"Hi","at":1800000000000,
       "sendId":"11111111-1111-4111-8111-111111111111","parentId":null},
      {"id":"m2","role":"bot","kind":"activity","at":1800000001000,"tool":{"name":"read","input":"file"}},
      {"id":"m3","role":"bot","kind":"screen","text":"Do not expose raw payload","at":1800000002000,"hasImage":true},
      {"id":"m4","role":"bot","kind":"widget","text":"Only a placeholder","at":1800000003000,"futureField":42}
    ],"hasMore":true,"activeLeafId":"m4","unknown":true}
    """#
    static let accepted = #"""
    {"ok":true,"threadId":"thread-1","message":{
      "id":"m1","role":"user","kind":"text","text":"Hi","at":1800000000000,
      "sendId":"11111111-1111-4111-8111-111111111111"
    }}
    """#
    static let queued = #"{"ok":true,"queued":true,"threadId":"thread-1"}"#
}
