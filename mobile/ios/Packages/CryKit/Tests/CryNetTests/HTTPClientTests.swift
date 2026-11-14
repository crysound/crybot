#if canImport(Security)
import Foundation
import XCTest
import CryCore
import CryNetLogic
@testable import CryNet

final class HTTPClientTests: NetworkTestCase {
    func testPublicEnvironmentRequestDoesNotRequireOrSendStoredCredentials() async throws {
        let store = try store(cf: "cf-fixture")
        NetworkFixture.install { request in
            self.assertHeaders(request, token: nil)
            XCTAssertEqual(request.url?.path, "/root/.well-known/crybot/environment")
            return FixtureReply(body: self.environmentBody)
        }
        let environment = try await client(store).send(CoreEndpoints.environment, authenticated: false)
        XCTAssertEqual(environment.environmentId, "fixture")
        XCTAssertEqual(store.read()?.sessionToken, "cry_sess_fixture")
    }

    func testBearerOnlyUsesAPIURLAndDoesNotRequireRotation() async throws {
        let store = try store()
        let before = store.read()
        NetworkFixture.install { request in
            self.assertHeaders(request)
            XCTAssertEqual(request.url?.absoluteString, "https://api.example.com/root/api/auth/session")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
            return FixtureReply(body: self.sessionBody)
        }
        _ = try await client(store).send(CoreEndpoints.authSession)
        XCTAssertEqual(store.read(), before)
    }
    func testCFAndCookieRotationAreUsedByNextRequest() async throws {
        let store = try store(cf: "cf-fixture")
        let client = try client(store)
        NetworkFixture.install { request in
            self.assertHeaders(request, cf: "cf-fixture")
            return FixtureReply(headers: ["Set-Cookie": "cry_session_443_fixture=cry_sess_rotated; Max-Age=120"], body: self.sessionBody)
        }
        _ = try await client.send(CoreEndpoints.authSession)
        XCTAssertEqual(store.read()?.sessionToken, "cry_sess_rotated")
        XCTAssertNotNil(store.read()?.sessionExpires)
        NetworkFixture.install { request in
            self.assertHeaders(request, token: "cry_sess_rotated", cf: "cf-fixture")
            return FixtureReply(body: self.sessionBody)
        }
        _ = try await client.send(CoreEndpoints.authSession)
    }
    func testEndpointsCannotInjectCookieOriginOrIdentity() async throws {
        let store = try store()
        NetworkFixture.install { request in
            self.assertHeaders(request)
            XCTAssertNil(request.value(forHTTPHeaderField: "Cf-Access-Jwt-Assertion"))
            return FixtureReply(body: self.sessionBody)
        }
        let endpoint = Endpoint<AuthSession>(path: "/api/auth/session", headers: ["Origin": "https://example.com", "Cookie": "bad=value", "Authorization": "bad", "Cf-Access-Jwt-Assertion": "bad"])
        _ = try await client(store).send(endpoint)
    }
    func testExpiredResponseClearsCredentialsAndRetainsServer() async throws {
        for status in [302, 303, 307, 401, 403] {
            let store = try store()
            let expired = expectation(description: "expired \(status)")
            NetworkFixture.install { _ in FixtureReply(status: status, headers: ["Location": "https://login.example.com"], body: "<html>login</html>") }
            do { _ = try await client(store, expired: { expired.fulfill() }).send(CoreEndpoints.authSession); XCTFail("Expected expiration") }
            catch { guard case CryNetError.loginExpired = error else { return XCTFail("Wrong error") } }
            await fulfillment(of: [expired], timeout: 2)
            XCTAssertEqual(store.read()?.server, try server())
            XCTAssertEqual(store.read()?.sessionToken, "")
            XCTAssertNil(store.read()?.cfAuthorization)
        }
    }
    func testRealRedirectionDelegateRefusesNewDestination() async throws {
        let store = try store()
        var requests = 0
        NetworkFixture.install { request in
            requests += 1
            XCTAssertEqual(request.url?.host, "api.example.com")
            return FixtureReply(status: 302, headers: ["Location": "https://login.example.com"], redirect: URL(string: "https://login.example.com")!)
        }
        do { _ = try await client(store).send(CoreEndpoints.authSession); XCTFail("Expected expiration") }
        catch { guard case CryNetError.loginExpired = error else { return XCTFail("Wrong redirect error") } }
        XCTAssertEqual(requests, 1)
    }
    func testJSONForbiddenIsAPIErrorAndSecretsAreRedacted() async throws {
        let store = try store(cf: "cf-secret")
        let jwt = ["header", "payload", "signature"].map { HandoffEncoding.base64URL(Data($0.utf8)) }.joined(separator: ".")
        NetworkFixture.install { _ in
            FixtureReply(status: 403, body: "{\"error\":\"cry_sess_fixture cf-secret \(jwt) 123456\",\"code\":\"DENIED\"}")
        }
        do { _ = try await client(store).send(CoreEndpoints.authSession); XCTFail("Expected API error") }
        catch {
            guard case CryNetError.api(let api) = error else { return XCTFail("Wrong API error") }
            XCTAssertEqual(api.code, "DENIED")
            for text in [api.error, String(describing: error), String(reflecting: error), error.localizedDescription] {
                for secret in ["cry_sess_fixture", "cf-secret", jwt, "123456"] { XCTAssertFalse(text.contains(secret)) }
            }
        }
        XCTAssertTrue(store.read()?.isAuthenticated == true)
    }
    func testLateResponsesCannotRestoreSignedOutOrReplacedSession() throws {
        let store = try store()
        let client = try client(store)
        let prepared = try client.prepare(CoreEndpoints.authSession)
        store.clear()
        let response = HTTPURLResponse(url: prepared.request.url!, statusCode: 200, httpVersion: nil,
                                       headerFields: ["Set-Cookie": "cry_session_fixture=cry_sess_late"])!
        try client.accept(response, body: Data(), prepared: prepared)
        XCTAssertNil(store.read())
        var new = try XCTUnwrap(prepared.record)
        new.sessionToken = "cry_sess_new"
        store.write(new)
        let unauthorized = HTTPURLResponse(url: prepared.request.url!, statusCode: 401, httpVersion: nil, headerFields: nil)!
        XCTAssertThrowsError(try client.accept(unauthorized, body: Data(), prepared: prepared))
        XCTAssertEqual(store.read(), new)
    }
    func testStoreSharedReadersAndCompareAndSwap() throws {
        let store = try store()
        let first: any SessionStore = store
        let second: any SessionStore = store
        let old = try first.read()
        var next = try XCTUnwrap(old)
        next.sessionToken = "cry_sess_next"
        XCTAssertTrue(try first.replace(ifMatching: old, with: next))
        XCTAssertEqual(try second.read(), next)
        XCTAssertFalse(try second.replace(ifMatching: old, with: old))
        try first.clear()
        XCTAssertNil(try second.read())
    }
}
#endif
