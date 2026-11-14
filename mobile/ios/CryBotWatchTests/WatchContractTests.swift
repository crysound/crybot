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

    func testMissingAccessCookieProducesReadyBearerLogin() {
        let selected = LoginCookies.select(from: [cookie("cry_session_443_222222222222", "cry_sess_server")],
                                           server: server, now: now)
        XCTAssertEqual(selected.sessionToken, "cry_sess_server")
        XCTAssertNil(selected.cfAuthorization)
        XCTAssertNil(selected.cfExpires)
        XCTAssertTrue(selected.isReady)
    }

    func testIgnoresExpiredWrongPathAndNonSessionCookies() {
        let selected = LoginCookies.select(from: [
            cookie("CF_Authorization", "expired", expires: now.addingTimeInterval(-1)),
            cookie("cry_session_443_111111111111", "cry_sess_wrong_path", path: "/other"),
            cookie("unrelated", "cry_sess_unrelated"),
            cookie("cry_session_443_222222222222", "invalid")
        ], server: server, now: now)
        XCTAssertEqual(selected.sessionToken, "")
        XCTAssertNil(selected.cfAuthorization)
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

    func testSelectsLatestExpiryRegardlessOfPublicPort() {
        let selected = LoginCookies.select(from: [
            cookie("cry_session_3000_111111111111", "cry_sess_latest", expires: now.addingTimeInterval(7200)),
            cookie("cry_session_8443_222222222222", "cry_sess_port", expires: now.addingTimeInterval(3600)),
            cookie("cry_session_4000_333333333333", "cry_sess_older", expires: now.addingTimeInterval(1800)),
            cookie("CF_Authorization", "access")
        ], server: URL(string: "https://bot.example.com:8443")!, now: now)
        XCTAssertEqual(selected.sessionToken, "cry_sess_latest")
    }

    func testSessionExpiryTakesPriorityOverMatchingDomainAndPathSpecificity() {
        let selected = LoginCookies.select(from: [
            cookie("cry_session_3000_111111111111", "cry_sess_specific", expires: now.addingTimeInterval(3600), path: "/app"),
            cookie("cry_session_4000_222222222222", "cry_sess_latest", domain: ".example.com", expires: now.addingTimeInterval(7200))
        ], server: URL(string: "https://bot.example.com/app")!, now: now)
        XCTAssertEqual(selected.sessionToken, "cry_sess_latest")
    }

    func testLegacyCredentialsDecodeAndEncodeBothAccessFields() throws {
        let data = Data(#"{"server":"https://bot.example.com","sessionToken":"fixture-session","cfAuthorization":"fixture-access","cfExpires":1800003600}"#.utf8)
        let credentials = try JSONDecoder().decode(WatchCredentials.self, from: data)
        XCTAssertEqual(credentials.server, "https://bot.example.com")
        XCTAssertEqual(credentials.sessionToken, "fixture-session")
        XCTAssertEqual(credentials.cfAuthorization, "fixture-access")
        XCTAssertEqual(credentials.cfExpires, 1_800_003_600)
        XCTAssertTrue(credentials.isReady)
        let encoded = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(credentials)) as? [String: Any])
        XCTAssertEqual(encoded["server"] as? String, "https://bot.example.com")
        XCTAssertEqual(encoded["sessionToken"] as? String, "fixture-session")
        XCTAssertEqual(encoded["cfAuthorization"] as? String, "fixture-access")
        XCTAssertEqual(encoded["cfExpires"] as? TimeInterval, 1_800_003_600)
    }

    func testBearerCredentialsDecodeAbsentOrNullAccessFieldsAndOmitThemWhenEncoded() throws {
        for json in [
            #"{"server":"https://bot.example.com","sessionToken":"fixture-session"}"#,
            #"{"server":"https://bot.example.com","sessionToken":"fixture-session","cfAuthorization":null,"cfExpires":null}"#
        ] {
            let credentials = try JSONDecoder().decode(WatchCredentials.self, from: Data(json.utf8))
            XCTAssertEqual(credentials.server, "https://bot.example.com")
            XCTAssertEqual(credentials.sessionToken, "fixture-session")
            XCTAssertNil(credentials.cfAuthorization)
            XCTAssertNil(credentials.cfExpires)
            XCTAssertTrue(credentials.isReady)
            let encoded = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(credentials)) as? [String: Any])
            XCTAssertEqual(Set(encoded.keys), Set(["server", "sessionToken"]))
            XCTAssertEqual(encoded["server"] as? String, "https://bot.example.com")
            XCTAssertEqual(encoded["sessionToken"] as? String, "fixture-session")
        }
    }

    func testContextsDecodeWithAndWithoutAccessFields() throws {
        let bearerContext: [String: Any] = ["server": "https://bot.example.com", "sessionToken": "fixture-session"]
        let bearer = try XCTUnwrap(WatchCredentials(context: bearerContext))
        XCTAssertEqual(bearer.server, "https://bot.example.com")
        XCTAssertEqual(bearer.sessionToken, "fixture-session")
        XCTAssertNil(bearer.cfAuthorization)
        XCTAssertNil(bearer.cfExpires)
        XCTAssertTrue(bearer.isReady)
        XCTAssertEqual(Set(bearer.context.keys), Set(["server", "sessionToken", "updatedAt"]))
        XCTAssertEqual(WatchCredentials(context: bearer.context), bearer)

        var legacyContext = bearerContext
        legacyContext["cfAuthorization"] = "fixture-access"
        legacyContext["cfExpires"] = 1_800_003_600.0
        let legacy = try XCTUnwrap(WatchCredentials(context: legacyContext))
        XCTAssertEqual(legacy.cfAuthorization, "fixture-access")
        XCTAssertEqual(legacy.cfExpires, 1_800_003_600)
        XCTAssertTrue(legacy.isReady)
        XCTAssertEqual(legacy.context["cfAuthorization"] as? String, "fixture-access")
        XCTAssertEqual(legacy.context["cfExpires"] as? TimeInterval, 1_800_003_600)
        XCTAssertEqual(WatchCredentials(context: legacy.context), legacy)
    }

    func testReadinessRequiresSecureServerAndNonemptySessionToken() {
        for access in [nil, "", "fixture-access"] as [String?] {
            let ready = WatchCredentials(server: server.absoluteString, sessionToken: "fixture-session",
                                         cfAuthorization: access, cfExpires: nil)
            XCTAssertTrue(ready.isReady)
            let emptyToken = WatchCredentials(server: server.absoluteString, sessionToken: "",
                                              cfAuthorization: access, cfExpires: nil)
            XCTAssertFalse(emptyToken.isReady)
            for address in ["", "http://bot.example.com", "https://"] {
                let invalidServer = WatchCredentials(server: address, sessionToken: "fixture-session",
                                                     cfAuthorization: access, cfExpires: nil)
                XCTAssertFalse(invalidServer.isReady)
            }
        }
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
        for status in [301, 304, 308, 500] {
            XCTAssertThrowsError(try WatchRequest.validate(status: status)) {
                XCTAssertEqual($0 as? WatchAPIError, .rejected(status))
            }
        }
    }

    func testForbiddenResponseRequiresServerJSONErrorToPreserveLogin() {
        for body in [#"{"error":"Forbidden"}"#, #"{"error":{"message":"Forbidden"}}"#] {
            XCTAssertThrowsError(try WatchRequest.validate(status: 403, body: Data(body.utf8))) {
                XCTAssertEqual($0 as? WatchAPIError, .rejected(403))
                XCTAssertEqual(($0 as? WatchAPIError)?.localizationKey, "REQUEST_FAILED")
            }
        }
        for body in ["<html>Access denied</html>", #"{"message":"Access denied"}"#, "[]", ""] {
            XCTAssertThrowsError(try WatchRequest.validate(status: 403, body: Data(body.utf8))) {
                XCTAssertEqual($0 as? WatchAPIError, .loginExpired)
            }
        }
        for status in [302, 303, 307, 401] {
            XCTAssertThrowsError(try WatchRequest.validate(status: status, body: Data(#"{"error":"Unauthorized"}"#.utf8))) {
                XCTAssertEqual($0 as? WatchAPIError, .loginExpired)
            }
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

    func testBotThreadIdMayBeMissingOrNull() throws {
        for json in [#"{"id":"missing","name":"Hidden"}"#, #"{"id":"null","name":"Hidden","threadId":null}"#] {
            let bot = try JSONDecoder().decode(WatchBot.self, from: Data(json.utf8))
            XCTAssertNil(bot.threadId)
        }
    }

    func testBotListSkipsUnusableEntriesAndKeepsValidNeighbors() throws {
        let json = #"""
        {"bots":[
          {"id":"first","name":"First","threadId":"thread-1"},
          {"id":"missing","name":"Missing"},
          {"id":"null","name":"Null","threadId":null},
          {"id":"empty","name":"Empty","threadId":""},
          {"id":"bad-thread","name":"Bad","threadId":42},
          {"id":42,"name":"Bad","threadId":"thread-2"},
          {"id":"bad-messages","name":"Bad","threadId":"thread-3","messages":[{"id":"broken"}]},
          null, "invalid", [],
          {"id":"last","name":"Last","threadId":"thread-4"}
        ]}
        """#
        let list = try JSONDecoder().decode(BotList.self, from: Data(json.utf8))
        XCTAssertEqual(list.bots.map(\.id), ["first", "last"])
        XCTAssertEqual(list.bots.map(\.threadId), ["thread-1", "thread-4"])
        let empty = try JSONDecoder().decode(BotList.self, from: Data(#"{"bots":[null,{}]}"#.utf8))
        XCTAssertTrue(empty.bots.isEmpty)
    }

    func testLatestReplyPrefersNewestBotTextOverLaterActivity() throws {
        let json = #"""
        {"id":"bot","name":"Assistant","messages":[
          {"id":"new-text","role":"bot","kind":"text","text":"Answer","at":2000},
          {"id":"old-text","role":"bot","kind":"text","text":"Earlier","at":1000},
          {"id":"tool","role":"bot","kind":"activity","at":3000},
          {"id":"user","role":"user","kind":"text","text":"Question","at":4000}
        ]}
        """#
        let bot = try JSONDecoder().decode(WatchBot.self, from: Data(json.utf8))
        XCTAssertEqual(bot.latestReply?.id, "new-text")
        XCTAssertEqual(bot.latestReply?.text, "Answer")
    }

    func testLatestReplyFallsBackToNewestBotMessageOrNil() throws {
        let page = try JSONDecoder().decode(MessagePage.self, from: Data(WatchFixtures.messages.utf8))
        let bot = WatchBot(id: "bot", name: "Assistant", title: nil, threadId: nil, messages: page.messages)
        XCTAssertEqual(bot.latestReply?.id, "m4")
        let userOnly = WatchBot(id: "bot", name: "Assistant", title: nil, threadId: nil,
                                messages: page.messages.filter { $0.role == "user" })
        XCTAssertNil(userOnly.latestReply)
        let empty = WatchBot(id: "bot", name: "Assistant", title: nil, threadId: nil, messages: nil)
        XCTAssertNil(empty.latestReply)
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
