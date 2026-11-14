#if canImport(Security)
import Foundation
import CryCore
import CryNetLogic

public final class PairingLogin {
    private let client: HTTPClient
    public init(client: HTTPClient) { self.client = client }
    @discardableResult public func login(code: String, label: String, attemptId: String = UUID().uuidString) async throws -> SessionRecord {
        let previous = try client.store.read()
        let reply = try await client.exchange(CoreEndpoints.pair(code: code, label: label, attemptId: attemptId), usesSession: false)
        guard CredentialRules.isSessionToken(reply.value.token) else { throw CryNetError.invalidResponse }
        let record = SessionRecord(server: client.server, method: .pairing, sessionToken: reply.cookie?.token ?? reply.value.token,
                                   sessionExpires: SessionPolicy.serverExpiry(milliseconds: reply.value.session?.expiresAt) ?? reply.cookie?.expires)
        try Task.checkCancellation()
        try client.store.storeLogin(record, replacing: previous)
        return record
    }
    @discardableResult public func login(invite: PairingInvite, label: String, attemptId: String = UUID().uuidString) async throws -> SessionRecord {
        guard invite.server.webURL == client.server.webURL else { throw PairingInviteError.differentServer }
        return try await login(code: invite.token, label: label, attemptId: attemptId)
    }
}

public final class EmailLogin {
    private let client: HTTPClient
    public init(client: HTTPClient) { self.client = client }
    public func start(email: String) async throws {
        _ = try await client.exchange(CoreEndpoints.startEmail(email: email), usesSession: false)
    }
    @discardableResult public func verify(email: String, code: String, label: String) async throws -> SessionRecord {
        let previous = try client.store.read()
        let reply = try await client.exchange(CoreEndpoints.verifyEmail(email: email, code: code, label: label), usesSession: false)
        guard let cookie = reply.cookie else { throw HandoffError.missingSession }
        let record = SessionRecord(server: client.server, method: .email, sessionToken: cookie.token,
                                   sessionExpires: SessionPolicy.serverExpiry(milliseconds: reply.value.session.expiresAt) ?? cookie.expires)
        try Task.checkCancellation()
        try client.store.storeLogin(record, replacing: previous)
        return record
    }
}
#endif
