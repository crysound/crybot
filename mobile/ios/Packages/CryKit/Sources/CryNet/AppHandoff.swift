#if canImport(Security) && canImport(CryptoKit)
import Foundation
import Security
import CryptoKit
import CryCore
import CryNetLogic

public struct HandoffAttempt: CustomStringConvertible, CustomDebugStringConvertible {
    public let url: URL
    public let callbackMode: HandoffCallbackMode
    public var description: String { "HandoffAttempt(redacted)" }
    public var debugDescription: String { description }
}

@MainActor public final class AppHandoff {
    public let router: CallbackRouter
    public let registry: HandoffRegistry
    private let client: HTTPClient
    private let log: (NetworkLogEvent) -> Void
    private var pending: PendingHandoff?
    private var generation = 0

    public init(client: HTTPClient, router: CallbackRouter, registry: HandoffRegistry? = nil,
                log: @escaping (NetworkLogEvent) -> Void = { NSLog("%@", $0.description) }, completion: @escaping (Result<Void, Error>) -> Void) {
        self.client = client
        self.router = router
        self.registry = registry ?? HandoffRegistry()
        self.log = log
        self.registry.register(version: 1) { [weak self] parameters in
            guard let self else { throw HandoffError.expiredAttempt }
            try await self.complete(parameters)
        }
        router.registerHandoff(self.registry, acceptsState: { [weak self] state in
            guard let pending = self?.pending else { return false }
            return pending.state == state
        }, onIgnoredState: { log(.ignoredHandoffState) }, completion: completion)
    }
    public var callbackMode: HandoffCallbackMode {
        let supportsHTTPS: Bool
        if #available(iOS 17.4, macOS 14.4, watchOS 10.4, *) { supportsHTTPS = true } else { supportsHTTPS = false }
        return HandoffCallbackMode.choose(linkHost: router.linkHost, supportsHTTPSCallback: supportsHTTPS)
    }
    public func begin() throws -> HandoffAttempt {
        var entropy = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, entropy.count, &entropy) == errSecSuccess else { throw HandoffError.invalidPayload }
        return try begin(privateKey: P256.KeyAgreement.PrivateKey(), state: HandoffEncoding.base64URL(Data(entropy)))
    }
    func begin(privateKey: P256.KeyAgreement.PrivateKey, state: String) throws -> HandoffAttempt {
        generation += 1
        let endpoint = Endpoint<Data>(path: "/auth/app-handoff", query: [
            .init(name: "state", value: state), .init(name: "pk", value: HandoffEncoding.base64URL(privateKey.publicKey.x963Representation))
        ], decode: { $0 })
        guard let url = try endpoint.request(baseURL: client.server.webURL).url else { throw HandoffError.invalidPayload }
        pending = PendingHandoff(key: privateKey, state: state, started: client.now(), previous: try client.store.read())
        return HandoffAttempt(url: url, callbackMode: callbackMode)
    }
    public func cancel() { generation += 1; pending = nil }

    private func complete(_ parameters: HandoffParameters) async throws {
        guard let attempt = pending else { throw HandoffError.expiredAttempt }
        guard parameters.state == attempt.state else { throw HandoffError.invalidState }
        pending = nil
        let age = client.now().timeIntervalSince(attempt.started)
        guard age >= 0 && age < 600 else { throw HandoffError.expiredAttempt }
        let currentGeneration = generation
        let token = try decrypt(parameters, key: attempt.key)
        guard let expiry = HandoffEncoding.tokenExpiry(token), expiry > client.now() else { throw HandoffError.invalidPayload }
        var reply: HTTPReply<AuthSession>?
        do { reply = try await client.handoffSession(token: token, assertion: false, log: log) }
        catch is CancellationError { throw CancellationError() }
        catch { }
        if reply?.cookie == nil {
            guard generation == currentGeneration else { throw CancellationError() }
            reply = try await client.handoffSession(token: token, assertion: true, log: log)
        }
        guard let reply, let cookie = reply.cookie else { throw HandoffError.missingSession }
        try Task.checkCancellation()
        guard generation == currentGeneration else { throw CancellationError() }
        let record = SessionRecord(server: client.server, method: .cfHandoff, sessionToken: cookie.token,
                                   sessionExpires: SessionPolicy.serverExpiry(milliseconds: reply.value.expiresAt) ?? cookie.expires,
                                   cfAuthorization: token, cfExpires: expiry)
        try client.store.storeLogin(record, replacing: attempt.previous)
    }

    private func decrypt(_ parameters: HandoffParameters, key: P256.KeyAgreement.PrivateKey) throws -> String {
        do {
            guard let publicBytes = HandoffEncoding.decodeBase64URL(try parameters.parameter("epk")), publicBytes.count == 65, publicBytes.first == 4,
                  let nonceBytes = HandoffEncoding.decodeBase64URL(try parameters.parameter("iv")), nonceBytes.count == 12,
                  let encrypted = HandoffEncoding.decodeBase64URL(try parameters.parameter("ct")), encrypted.count > 16 else { throw HandoffError.invalidPayload }
            let publicKey = try P256.KeyAgreement.PublicKey(x963Representation: publicBytes)
            let secret = try key.sharedSecretFromKeyAgreement(with: publicKey)
            let state = Data(parameters.state.utf8)
            let symmetric = secret.hkdfDerivedSymmetricKey(using: SHA256.self, salt: state,
                                                          sharedInfo: Data("crybot-app-handoff-v1".utf8), outputByteCount: 32)
            let box = try AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: nonceBytes), ciphertext: encrypted.dropLast(16), tag: encrypted.suffix(16))
            guard let token = String(data: try AES.GCM.open(box, using: symmetric, authenticating: state), encoding: .utf8) else { throw HandoffError.invalidPayload }
            return token
        } catch { throw HandoffError.invalidPayload }
    }
}

private struct PendingHandoff {
    let key: P256.KeyAgreement.PrivateKey
    let state: String
    let started: Date
    let previous: SessionRecord?
}
#endif
