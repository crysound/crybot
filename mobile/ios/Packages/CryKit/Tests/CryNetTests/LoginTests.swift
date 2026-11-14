#if canImport(Security)
import Foundation
import XCTest
import CryCore
import CryNetLogic
@testable import CryNet

final class LoginTests: NetworkTestCase {
    func testPairingRequestBodyAndStoredRecord() async throws {
        let store = MemorySessionStore()
        NetworkFixture.install { request in
            self.assertHeaders(request, token: nil)
            XCTAssertEqual(request.url?.path, "/root/api/auth/pair")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
            let body = try JSONSerialization.jsonObject(with: NetworkFixture.body(request)) as? [String: String]
            XCTAssertEqual(body, ["code": "123456", "label": "Test Phone", "attemptId": "00000000-0000-4000-8000-000000000000"])
            return FixtureReply(body: "{\"token\":\"cry_sess_pair\",\"session\":\(self.publicSessionBody)}")
        }
        let record = try await PairingLogin(client: client(store)).login(code: "123456", label: "Test Phone", attemptId: "00000000-0000-4000-8000-000000000000")
        XCTAssertEqual(record.method, .pairing)
        XCTAssertEqual(record.sessionToken, "cry_sess_pair")
        XCTAssertEqual(record.sessionExpires, Date(timeIntervalSince1970: 4102444800))
        XCTAssertNil(record.cfAuthorization)
        XCTAssertNil(record.cfExpires)
        XCTAssertEqual(store.read(), record)
    }
    func testPairingInviteRedeemsTokenAndRejectsDifferentServer() async throws {
        let store = MemorySessionStore()
        let server = try CryServer(webURL: "https://example.com")
        let client = HTTPClient(server: server, store: store, configuration: NetworkFixture.configuration())
        let token = "cry_pair_" + String(repeating: "a", count: 43)
        let invite = try PairingInvite.parse("crybot://pair?address=https%3A%2F%2Fexample.com&token=\(token)&code=123456")
        NetworkFixture.install { request in
            let body = try JSONSerialization.jsonObject(with: NetworkFixture.body(request)) as? [String: String]
            XCTAssertEqual(body?["code"], token)
            return FixtureReply(body: #"{"token":"cry_sess_pair"}"#)
        }
        _ = try await PairingLogin(client: client).login(invite: invite, label: "Phone")
        XCTAssertEqual(store.read()?.method, .pairing)
        let other = try PairingInvite.parse("crybot://pair?address=https%3A%2F%2Fother.example.com&token=\(token)")
        do { _ = try await PairingLogin(client: client).login(invite: other, label: "Phone"); XCTFail("Expected server mismatch") }
        catch { XCTAssertTrue(error is PairingInviteError) }
    }
    func testEmailStartVerifyBodiesAndCookieToken() async throws {
        let store = MemorySessionStore()
        let login = try EmailLogin(client: client(store))
        NetworkFixture.install { request in
            self.assertHeaders(request, token: nil)
            XCTAssertEqual(request.url?.path, "/root/api/auth/email/start")
            XCTAssertEqual(try JSONSerialization.jsonObject(with: NetworkFixture.body(request)) as? [String: String], ["email": "person@example.com"])
            return FixtureReply(body: #"{"ok":true}"#)
        }
        try await login.start(email: "person@example.com")
        NetworkFixture.install { request in
            self.assertHeaders(request, token: nil)
            XCTAssertEqual(request.url?.path, "/root/api/auth/email/verify")
            XCTAssertEqual(try JSONSerialization.jsonObject(with: NetworkFixture.body(request)) as? [String: String], ["email": "person@example.com", "code": "12345678", "label": "Phone"])
            return FixtureReply(headers: ["Set-Cookie": "cry_session_fixture=cry_sess_email; Max-Age=3600"], body: "{\"session\":\(self.publicSessionBody),\"environment\":\(self.environmentBody)}")
        }
        let record = try await login.verify(email: "person@example.com", code: "12345678", label: "Phone")
        XCTAssertEqual(record.method, .email)
        XCTAssertEqual(record.sessionToken, "cry_sess_email")
        XCTAssertEqual(record.sessionExpires, Date(timeIntervalSince1970: 4102444800))
        XCTAssertNil(record.cfAuthorization)
        XCTAssertNil(record.cfExpires)
        XCTAssertEqual(store.read(), record)
    }
    func testEmailMissingCookieDoesNotSignIn() async throws {
        let store = MemorySessionStore()
        NetworkFixture.install { _ in FixtureReply(body: "{\"session\":\(self.publicSessionBody),\"environment\":\(self.environmentBody)}") }
        do { _ = try await EmailLogin(client: client(store)).verify(email: "person@example.com", code: "12345678", label: "Phone"); XCTFail("Expected missing session") }
        catch { XCTAssertEqual(error as? HandoffError, .missingSession) }
        XCTAssertNil(store.read())
    }
    func testPairingErrorDoesNotExposeCode() async throws {
        let store = MemorySessionStore()
        NetworkFixture.install { _ in FixtureReply(status: 400, body: #"{"error":"Invalid code custom-pair-code"}"#) }
        do { _ = try await PairingLogin(client: client(store)).login(code: "custom-pair-code", label: "Phone"); XCTFail("Expected failure") }
        catch {
            guard case CryNetError.api(let api) = error else { return XCTFail("Wrong error") }
            for text in [api.error, String(describing: error), String(reflecting: error), error.localizedDescription] {
                XCTAssertFalse(text.contains("custom-pair-code"))
            }
        }
        XCTAssertNil(store.read())
    }
}
#endif
