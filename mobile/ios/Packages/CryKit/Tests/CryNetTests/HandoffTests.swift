#if canImport(Security) && canImport(CryptoKit)
import Foundation
import CryptoKit
import XCTest
import CryCore
import CryNetLogic
@testable import CryNet

final class HandoffTests: NetworkTestCase {
    private let state = String(repeating: "s", count: 43)
    private let date = Date(timeIntervalSince1970: 1000)

    private func key(_ lastByte: UInt8) throws -> P256.KeyAgreement.PrivateKey {
        var bytes = Data(repeating: 0, count: 32)
        bytes[31] = lastByte
        return try P256.KeyAgreement.PrivateKey(rawRepresentation: bytes)
    }
    private func jwt() -> String {
        [Data(#"{"alg":"test"}"#.utf8), Data(#"{"exp":5000}"#.utf8), Data("fixture-signature".utf8)]
            .map(HandoffEncoding.base64URL).joined(separator: ".")
    }
    private func encryptedQuery(recipient: P256.KeyAgreement.PrivateKey, token: String) throws -> [URLQueryItem] {
        let ephemeral = try key(2)
        let secret = try ephemeral.sharedSecretFromKeyAgreement(with: recipient.publicKey)
        let stateBytes = Data(state.utf8)
        let symmetric = secret.hkdfDerivedSymmetricKey(using: SHA256.self, salt: stateBytes,
                                                       sharedInfo: Data("crybot-app-handoff-v1".utf8), outputByteCount: 32)
        let nonceBytes = Data(repeating: 1, count: 12)
        let box = try AES.GCM.seal(Data(token.utf8), using: symmetric, nonce: AES.GCM.Nonce(data: nonceBytes), authenticating: stateBytes)
        return [.init(name: "v", value: "1"), .init(name: "state", value: state),
                .init(name: "epk", value: HandoffEncoding.base64URL(ephemeral.publicKey.x963Representation)),
                .init(name: "iv", value: HandoffEncoding.base64URL(nonceBytes)),
                .init(name: "ct", value: HandoffEncoding.base64URL(box.ciphertext + box.tag))]
    }
    private func callback(_ base: String, query: [URLQueryItem]) -> URL {
        var components = URLComponents(string: base)!
        components.queryItems = query
        return components.url!
    }
    @MainActor func testSameCiphertextLogsInThroughBothCallbackEntrances() async throws {
        let privateKey = try key(1)
        let token = jwt()
        let query = try encryptedQuery(recipient: privateKey, token: token)
        for base in ["crybot://auth", "https://EXAMPLE.COM/auth/app-return"] {
            let store = MemorySessionStore()
            let router = CallbackRouter(linkHost: "example.com")
            let client = HTTPClient(server: try server(), store: store, configuration: NetworkFixture.configuration(), now: { self.date })
            let completed = expectation(description: base)
            var failure: Error?
            var logs: [NetworkLogEvent] = []
            let handoff = AppHandoff(client: client, router: router, log: { logs.append($0) }) { result in
                if case .failure(let error) = result { failure = error }
                completed.fulfill()
            }
            let attempt = try handoff.begin(privateKey: privateKey, state: state)
            XCTAssertEqual(attempt.url.host, "example.com")
            XCTAssertEqual(attempt.url.path, "/web/auth/app-handoff")
            XCTAssertEqual(URLComponents(url: attempt.url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "pk" })?.value,
                           HandoffEncoding.base64URL(privateKey.publicKey.x963Representation))
            NetworkFixture.install { request in
                self.assertHeaders(request, token: nil, cf: token)
                XCTAssertNil(request.value(forHTTPHeaderField: "Cf-Access-Jwt-Assertion"))
                XCTAssertEqual(request.url?.path, "/root/api/auth/session")
                return FixtureReply(headers: ["Set-Cookie": "cry_session_fixture=cry_sess_handoff; Max-Age=1000"], body: self.sessionBody)
            }
            XCTAssertTrue(router.handle(callback(base, query: query)))
            await fulfillment(of: [completed], timeout: 3)
            XCTAssertNil(failure)
            let record = try XCTUnwrap(store.read())
            XCTAssertEqual(record.method, .cfHandoff)
            XCTAssertEqual(record.cfAuthorization, token)
            XCTAssertEqual(record.cfExpires, Date(timeIntervalSince1970: 5000))
            XCTAssertEqual(record.sessionToken, "cry_sess_handoff")
            XCTAssertEqual(record.sessionExpires, Date(timeIntervalSince1970: 4102444800))
            XCTAssertEqual(logs.map(\.description), ["handoff exchange assertion=false status=200 session=true"])
            XCTAssertFalse(logs.map(\.description).joined().contains(token))
            do { try await handoff.registry.handle(callback(base, query: query)); XCTFail("Expected replay refusal") }
            catch { XCTAssertEqual(error as? HandoffError, .expiredAttempt) }
        }
    }
    @MainActor func testMissingCookieRetriesWithAssertionAndLogsBothResults() async throws {
        let store = MemorySessionStore()
        let client = HTTPClient(server: try server(), store: store, configuration: NetworkFixture.configuration(), now: { self.date })
        let router = CallbackRouter(linkHost: "example.com")
        var logs: [NetworkLogEvent] = []
        let handoff = AppHandoff(client: client, router: router, log: { logs.append($0) }, completion: { _ in })
        let privateKey = try key(1)
        _ = try handoff.begin(privateKey: privateKey, state: state)
        let token = jwt()
        var requests = 0
        NetworkFixture.install { request in
            requests += 1
            self.assertHeaders(request, token: nil, cf: token)
            XCTAssertEqual(request.value(forHTTPHeaderField: "Cf-Access-Jwt-Assertion"), requests == 1 ? nil : token)
            return FixtureReply(headers: requests == 1 ? [:] : ["Set-Cookie": "cry_session_fixture=cry_sess_fallback"], body: self.sessionBody)
        }
        try await handoff.registry.handle(callback("crybot://auth", query: encryptedQuery(recipient: privateKey, token: token)))
        XCTAssertEqual(requests, 2)
        XCTAssertEqual(store.read()?.sessionToken, "cry_sess_fallback")
        XCTAssertEqual(logs.map(\.description), ["handoff exchange assertion=false status=200 session=false", "handoff exchange assertion=true status=200 session=true"])
        for text in logs.map(\.description) { XCTAssertFalse(text.contains(token)); XCTAssertFalse(text.contains("cry_sess_fallback")) }
    }
    @MainActor func testInvalidStateTamperingAndUnknownVersionDoNotContactServer() async throws {
        let store = MemorySessionStore()
        let client = HTTPClient(server: try server(), store: store, configuration: NetworkFixture.configuration(), now: { self.date })
        let handoff = AppHandoff(client: client, router: CallbackRouter(), completion: { _ in })
        let privateKey = try key(1)
        _ = try handoff.begin(privateKey: privateKey, state: state)
        NetworkFixture.install { _ in XCTFail("Invalid callbacks must not contact server"); return FixtureReply() }
        do { try await handoff.registry.handle(URL(string: "crybot://auth?v=99&state=anything")!); XCTFail("Expected unknown version") }
        catch { XCTAssertEqual(error as? HandoffError, .unsupportedVersion) }
        do { try await handoff.registry.handle(URL(string: "crybot://auth?v=1&state=wrong")!); XCTFail("Expected invalid state") }
        catch { XCTAssertEqual(error as? HandoffError, .invalidState) }
        var query = try encryptedQuery(recipient: privateKey, token: jwt())
        query.removeAll { $0.name == "ct" }
        query.append(.init(name: "ct", value: HandoffEncoding.base64URL(Data(repeating: 0, count: 32))))
        do { try await handoff.registry.handle(callback("crybot://auth", query: query)); XCTFail("Expected authentication failure") }
        catch {
            XCTAssertEqual(error as? HandoffError, .invalidPayload)
            XCTAssertFalse(error.localizedDescription.contains(jwt()))
            XCTAssertFalse(error.localizedDescription.contains(state))
        }
        XCTAssertNil(store.read())
    }
    @MainActor func testAttemptExpiryAndCancellation() async throws {
        var now = date
        let store = MemorySessionStore()
        let client = HTTPClient(server: try server(), store: store, configuration: NetworkFixture.configuration(), now: { now })
        let handoff = AppHandoff(client: client, router: CallbackRouter(), completion: { _ in })
        let privateKey = try key(1)
        _ = try handoff.begin(privateKey: privateKey, state: state)
        let url = try callback("crybot://auth", query: encryptedQuery(recipient: privateKey, token: jwt()))
        now = date.addingTimeInterval(600)
        do { try await handoff.registry.handle(url); XCTFail("Expected expired attempt") }
        catch { XCTAssertEqual(error as? HandoffError, .expiredAttempt) }
        _ = try handoff.begin(privateKey: privateKey, state: state)
        handoff.cancel()
        do { try await handoff.registry.handle(url); XCTFail("Expected cancelled attempt") }
        catch { XCTAssertEqual(error as? HandoffError, .expiredAttempt) }
        XCTAssertNil(store.read())
    }
}
#endif
