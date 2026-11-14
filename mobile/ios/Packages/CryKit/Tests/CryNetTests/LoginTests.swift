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
    func testWrongPairingAndEmailCodesPreserveAPIErrorKeys() async throws {
        for email in [false, true] {
            let store = try store()
            let previous = store.read()
            let errorKey = email ? "serverError.email.codeWrong" : "serverError.pair.codeWrong"
            NetworkFixture.install { request in
                self.assertHeaders(request, token: nil)
                return FixtureReply(status: 401, body: "{\"error\":\"Wrong code 123456\",\"code\":\"auth.code.wrong\",\"errorKey\":\"\(errorKey)\"}")
            }
            let client = try client(store, expired: { XCTFail("Public request expired stored session") })
            do {
                if email { _ = try await EmailLogin(client: client).verify(email: "person@example.com", code: "123456", label: "Phone") }
                else { _ = try await PairingLogin(client: client).login(code: "123456", label: "Phone") }
                XCTFail("Expected API error")
            } catch {
                guard case CryNetError.api(let api) = error else { return XCTFail("Wrong login error") }
                XCTAssertEqual(api.errorKey, errorKey)
                XCTAssertEqual(api.code, "auth.code.wrong")
                XCTAssertFalse(api.error.contains("123456"))
            }
            XCTAssertEqual(store.read(), previous)
        }
    }
    func testLoginRetriesSameServerCASAndRejectsChangedServer() async throws {
        for email in [false, true] {
            for mutation in ["rotation", "expiry", "server"] {
                let store = try store()
                var changed = try XCTUnwrap(store.read())
                if mutation == "rotation" { changed.sessionToken = "cry_sess_rotated" }
                if mutation == "expiry" { changed = changed.signedOut() }
                if mutation == "server" {
                    changed = SessionRecord(server: try CryServer(webURL: "https://other.example.com"), method: .email, sessionToken: "cry_sess_other")
                }
                let concurrent = changed
                NetworkFixture.install { _ in
                    store.write(concurrent)
                    return FixtureReply(headers: ["Set-Cookie": "cry_session_fixture=cry_sess_new"], body: email
                        ? "{\"session\":\(self.publicSessionBody),\"environment\":\(self.environmentBody)}"
                        : "{\"token\":\"cry_sess_new\"}")
                }
                do {
                    let client = try client(store)
                    let record: SessionRecord
                    if email { record = try await EmailLogin(client: client).verify(email: "person@example.com", code: "12345678", label: "Phone") }
                    else { record = try await PairingLogin(client: client).login(code: "123456", label: "Phone") }
                    XCTAssertNotEqual(mutation, "server")
                    XCTAssertEqual(store.read(), record)
                    XCTAssertEqual(record.sessionToken, "cry_sess_new")
                } catch {
                    XCTAssertEqual(mutation, "server")
                    guard case CryNetError.serverChanged = error else { return XCTFail("Wrong conflict error") }
                    XCTAssertEqual(store.read(), concurrent)
                }
            }
        }
    }
    func testPairingErrorDoesNotExposeCode() async throws {
        let store = MemorySessionStore()
        NetworkFixture.install { _ in FixtureReply(status: 400, body: #"{"error":"Invalid code 123456","code":"123456","errorKey":"123456"}"#) }
        do { _ = try await PairingLogin(client: client(store)).login(code: "123456", label: "Phone"); XCTFail("Expected failure") }
        catch {
            guard case CryNetError.api(let api) = error else { return XCTFail("Wrong error") }
            XCTAssertEqual(api.code, "[redacted]")
            XCTAssertEqual(api.errorKey, "[redacted]")
            XCTAssertEqual(api.error, "Invalid code [redacted]")
            for text in [api.error, String(describing: error), String(reflecting: error), error.localizedDescription] {
                XCTAssertFalse(text.contains("123456"))
            }
        }
        XCTAssertNil(store.read())
    }
    func testErrorIdentifiersPreserveCodesAndRedactSecretShapes() async throws {
        let jwt = "eyJhbGciOiJIUzI1NiJ9.payload.signature"
        let cases: [(String, String, String?, String?)] = [
            ("changed-since", "auth.code.wrong", "changed-since", "auth.code.wrong"),
            ("cry_sess_fixture", "cry_sess_fixture", "[redacted]", "[redacted]"),
            ("cry_pair_fixture", "cry_pair_fixture", "[redacted]", "[redacted]"),
            ("cry_tick_fixture", "cry_tick_fixture", "[redacted]", "[redacted]"),
            (jwt, jwt, "[redacted]", "[redacted]")
        ]
        for (code, errorKey, expectedCode, expectedErrorKey) in cases {
            let store = MemorySessionStore()
            NetworkFixture.install { _ in
                FixtureReply(status: 400, body: "{\"error\":\"Rejected\",\"code\":\"\(code)\",\"errorKey\":\"\(errorKey)\"}")
            }
            do {
                _ = try await PairingLogin(client: client(store)).login(code: "code", label: "Phone")
                XCTFail("Expected failure")
            } catch {
                guard case CryNetError.api(let api) = error else { return XCTFail("Wrong error") }
                XCTAssertEqual(api.code, expectedCode)
                XCTAssertEqual(api.errorKey, expectedErrorKey)
            }
        }
    }
    func testShortPairingCodeDoesNotRedactErrorIdentifiers() async throws {
        for code in ["code", "changed-since", "serverError.pair.codeWrong", "auth.code.wrong"] {
            let store = try store()
            let previous = store.read()
            NetworkFixture.install { _ in
                FixtureReply(status: 401, body: "{\"error\":\"Rejected \(code)\",\"code\":\"auth.code.wrong\",\"errorKey\":\"serverError.pair.codeWrong\",\"errorParams\":{\"input\":\"\(code)\"}}")
            }
            do {
                _ = try await PairingLogin(client: client(store)).login(code: code, label: "Phone")
                XCTFail("Expected API error")
            } catch {
                guard case CryNetError.api(let api) = error else { return XCTFail("Wrong error") }
                XCTAssertEqual(api.code, "auth.code.wrong")
                XCTAssertEqual(api.errorKey, "serverError.pair.codeWrong")
                XCTAssertEqual(api.error, "Rejected [redacted]")
                XCTAssertEqual(api.errorParams?["input"], .string("[redacted]"))
            }
            XCTAssertEqual(store.read(), previous)
        }
    }
}
#endif
