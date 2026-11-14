import XCTest
import Foundation
import CryCore
@testable import CryNetLogic

final class SessionTests: XCTestCase {
    func testVersionTwoAndUnknownMethodRoundTrip() throws {
        let source = Data(#"{"version":2,"server":{"webURL":"https://example.com"},"method":"future","sessionToken":"cry_sess_test","sessionExpires":2000}"#.utf8)
        let record = try JSONDecoder().decode(SessionRecord.self, from: source)
        XCTAssertEqual(record.method, .other("future"))
        XCTAssertEqual(record.sessionExpires, Date(timeIntervalSince1970: 2000))
        XCTAssertTrue(record.isAuthenticated)
        XCTAssertEqual(try JSONDecoder().decode(SessionRecord.self, from: JSONEncoder().encode(record)), record)
    }
    func testUnknownVersionsRetainServerButDiscardCredentials() throws {
        for version in [0, 1, 3, 99] {
            let source = Data("{\"version\":\(version),\"server\":{\"webURL\":\"https://example.com\"},\"sessionToken\":\"cry_sess_old\",\"cfAuthorization\":\"secret\"}".utf8)
            let record = try JSONDecoder().decode(SessionRecord.self, from: source)
            XCTAssertEqual(record.version, version)
            XCTAssertEqual(record.server.apiURL.absoluteString, "https://example.com")
            XCTAssertFalse(record.isAuthenticated)
            XCTAssertEqual(record.sessionToken, "")
            XCTAssertNil(record.cfAuthorization)
            XCTAssertNil(record.cfExpires)
            XCTAssertNil(SessionPolicy.headers(for: record)["Authorization"])
        }
    }
    func testMethodsAndOptionalCFEncoding() throws {
        for method in [SessionRecord.Method.cfHandoff, .pairing, .email, .legacyCookie, .feishu, .other("custom")] {
            let record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: method, sessionToken: "cry_sess_test")
            let data = try JSONEncoder().encode(record)
            let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
            XCTAssertEqual(object["method"] as? String, method.rawValue)
            XCTAssertNil(object["cfAuthorization"])
            XCTAssertNil(object["cfExpires"])
            XCTAssertEqual(try JSONDecoder().decode(SessionRecord.self, from: data).method, method)
        }
    }
    func testCFFieldsRoundTripAndRedactedDescription() throws {
        let record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: .cfHandoff, sessionToken: "cry_sess_test",
                                   sessionExpires: Date(timeIntervalSince1970: 1234), cfAuthorization: "cf-secret", cfExpires: Date(timeIntervalSince1970: 2345))
        XCTAssertEqual(try JSONDecoder().decode(SessionRecord.self, from: JSONEncoder().encode(record)), record)
        for value in [String(describing: record), String(reflecting: record)] {
            XCTAssertFalse(value.contains("cry_sess_test"))
            XCTAssertFalse(value.contains("cf-secret"))
        }
        XCTAssertEqual(record.signedOut().server, record.server)
        XCTAssertFalse(record.signedOut().isAuthenticated)
    }
    func testServerNormalizationAndBuildSettings() throws {
        let server = try CryServer(buildSettings: ["CRYBOT_SERVER_URL": " HTTPS://EXAMPLE.COM:443/base/// ",
                                                  "CRYBOT_API_URL": "https://example.com/api-root/", "CRYBOT_LOGIN_HOSTS": "EXAMPLE.COM, login.example.com\nexample.com"])
        XCTAssertEqual(server.webURL.absoluteString, "https://example.com/base")
        XCTAssertEqual(server.apiURL.absoluteString, "https://example.com/api-root")
        XCTAssertEqual(server.loginHosts, ["example.com", "login.example.com"])
        let defaultAPI = try CryServer(webURL: "https://example.com/", apiURL: " ")
        XCTAssertEqual(defaultAPI.webURL, defaultAPI.apiURL)
        for value in ["http://example.com", "https://user@example.com", "https://example.com/?a=b", "https://example.com/#a", "https://example.com/a/../b", "https://example.com:0", ""] {
            XCTAssertThrowsError(try CryServer(webURL: value))
        }
        XCTAssertThrowsError(try CryServer(webURL: "https://example.com", apiURL: "http://example.com"))
    }
    func testHeadersWithAndWithoutCF() throws {
        var record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: .feishu, sessionToken: "cry_sess_test")
        XCTAssertEqual(SessionPolicy.headers(for: record), ["Accept": "application/json", "Authorization": "Bearer cry_sess_test"])
        record.cfAuthorization = "cf-token"
        XCTAssertEqual(SessionPolicy.headers(for: record)["Cookie"], "CF_Authorization=cf-token")
        XCTAssertNil(SessionPolicy.headers(for: record)["Origin"])
        record.cfAuthorization = "bad\r\nOrigin: bad"
        XCTAssertNil(SessionPolicy.headers(for: record)["Cookie"])
        record.sessionToken = "cry_sess_bad\n"
        XCTAssertFalse(record.isAuthenticated)
    }
    func testCookieRotationWithCombinedHeadersAndExpiryComma() throws {
        let now = Date(timeIntervalSince1970: 1000)
        let headers = ["sEt-CoOkIe": "other=value; Path=/, cry_session_443_test=cry_sess_new; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Max-Age=60; HttpOnly, other2=value"]
        let cookie = try XCTUnwrap(SessionCookie.parse(headers, now: now))
        XCTAssertEqual(cookie.token, "cry_sess_new")
        XCTAssertEqual(cookie.expires, now.addingTimeInterval(60))
        let record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: .pairing, sessionToken: "cry_sess_old")
        XCTAssertEqual(cookie.applying(to: record).sessionToken, "cry_sess_new")
        XCTAssertEqual(cookie.applying(to: record).method, .pairing)
        XCTAssertNil(SessionCookie.parse([:]))
        XCTAssertNil(SessionCookie.parse(["Set-Cookie": "not_cry_session_a=cry_sess_no"]))
        XCTAssertNil(SessionCookie.parse(["Set-Cookie": "cry_session_a=not-a-session"]))
        XCTAssertEqual(SessionCookie.parse(["Set-Cookie": "cry_session_a=cry_sess_first\ncry_session_a=cry_sess_last"])?.token, "cry_sess_last")
        XCTAssertEqual(SessionCookie.parse(["Set-Cookie": "cry_session_a=cry_sess_test; Max-Age=0"], now: now)?.expires, now)
        XCTAssertNotNil(SessionCookie.parse(["Set-Cookie": "cry_session_a=cry_sess_test; Expires=Wed, 21 Oct 2037 07:28:00 GMT"])?.expires)
    }
    func testCookieWithoutExpiryRetainsSessionDeadline() throws {
        let expiry = Date(timeIntervalSince1970: 2000)
        let record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: .pairing,
                                   sessionToken: "cry_sess_old", sessionExpires: expiry)
        let cookie = try XCTUnwrap(SessionCookie.parse(["Set-Cookie": "cry_session_fixture=cry_sess_rotated; HttpOnly"]))
        XCTAssertEqual(cookie.applying(to: record).sessionToken, "cry_sess_rotated")
        XCTAssertEqual(cookie.applying(to: record).sessionExpires, expiry)
        let now = expiry.addingTimeInterval(-60)
        let expired = try XCTUnwrap(SessionCookie.parse(["Set-Cookie": "cry_session_fixture=cry_sess_rotated; Max-Age=0"], now: now))
        XCTAssertEqual(expired.applying(to: record).sessionExpires, now)
    }
    func testWebSocketURLPreservesAPIOriginPortPrefixAndEscapedPath() throws {
        let server = try CryServer(webURL: "https://example.com/web", apiURL: "https://api.example.com:8443/root/")
        XCTAssertEqual(try WebSocketRequest.url(server: server, path: "/api/desktop-viewer/test%20screen/websockify").absoluteString,
                       "wss://api.example.com:8443/root/api/desktop-viewer/test%20screen/websockify")
        for path in ["https://other.example.com/socket", "//other.example.com/socket", "/../socket", "/%2e%2e/socket", "/socket?token=bad", "/socket#bad"] {
            XCTAssertThrowsError(try WebSocketRequest.url(server: server, path: path))
        }
        let defaultAPI = try CryServer(webURL: "https://example.com")
        XCTAssertEqual(try WebSocketRequest.url(server: defaultAPI, path: "/socket").absoluteString, "wss://example.com/socket")
    }
    func testResponseExpiryRules() {
        for status in [302, 303, 307, 401] {
            XCTAssertTrue(SessionPolicy.responseExpiresLogin(status: status, body: Data(#"{"error":"denied"}"#.utf8)))
        }
        XCTAssertTrue(SessionPolicy.responseExpiresLogin(status: 403, body: Data("<html>login</html>".utf8)))
        XCTAssertTrue(SessionPolicy.responseExpiresLogin(status: 403, body: Data(#"{"message":"denied"}"#.utf8)))
        XCTAssertFalse(SessionPolicy.responseExpiresLogin(status: 403, body: Data(#"{"error":"denied"}"#.utf8)))
        XCTAssertFalse(SessionPolicy.responseExpiresLogin(status: 403, body: Data(#"{"error":null}"#.utf8)))
        for status in [200, 400, 404, 429, 500] { XCTAssertFalse(SessionPolicy.responseExpiresLogin(status: status, body: Data())) }
    }
    func testExpiryByMethod() throws {
        let now = Date(timeIntervalSince1970: 1000)
        var record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: .cfHandoff, sessionToken: "cry_sess_test")
        XCTAssertEqual(SessionPolicy.needsLogin(record, now: now), .ok)
        record.cfExpires = now.addingTimeInterval(601)
        XCTAssertEqual(SessionPolicy.needsLogin(record, now: now), .ok)
        record.cfExpires = now.addingTimeInterval(600)
        XCTAssertEqual(SessionPolicy.needsLogin(record, now: now), .renewSoon)
        record.cfExpires = now
        XCTAssertEqual(SessionPolicy.needsLogin(record, now: now), .loginRequired)
        record.cfExpires = now.addingTimeInterval(600)
        record.sessionExpires = now
        XCTAssertEqual(SessionPolicy.needsLogin(record, now: now), .loginRequired)
        XCTAssertEqual(SessionPolicy.needsLogin(record.signedOut(), now: now), .loginRequired)
        for method in [SessionRecord.Method.pairing, .email, .feishu] {
            var bearer = SessionRecord(server: record.server, method: method, sessionToken: "cry_sess_test", cfExpires: now.addingTimeInterval(-1))
            XCTAssertEqual(SessionPolicy.needsLogin(bearer, now: now), .ok)
            bearer.sessionExpires = now.addingTimeInterval(1)
            XCTAssertEqual(SessionPolicy.needsLogin(bearer, now: now), .ok)
            bearer.sessionExpires = now
            XCTAssertEqual(SessionPolicy.needsLogin(bearer, now: now), .loginRequired)
        }
        XCTAssertEqual(SessionPolicy.serverExpiry(milliseconds: 1234000), Date(timeIntervalSince1970: 1234))
    }
    func testPairingLinkUsesOneTimeTokenAndRefusesUnsupportedRoutes() throws {
        let token = "cry_pair_" + String(repeating: "a", count: 43)
        let invite = try PairingInvite.parse("crybot://pair?address=https%3A%2F%2Fexample.com&token=\(token)&name=Test%20Phone&code=123456")
        XCTAssertEqual(invite.server.webURL.absoluteString, "https://example.com")
        XCTAssertEqual(invite.token, token)
        XCTAssertEqual(invite.name, "Test Phone")
        XCTAssertFalse(String(reflecting: invite).contains(token))
        for suffix in ["&token=duplicate", "&e2e=data", "&secretKey=data"] {
            XCTAssertThrowsError(try PairingInvite.parse("crybot://pair?address=https%3A%2F%2Fexample.com&token=\(token)\(suffix)"))
        }
        XCTAssertThrowsError(try PairingInvite.parse("crybot://pair?address=http%3A%2F%2Fexample.com&token=\(token)"))
    }
}
