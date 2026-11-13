import Foundation
import SwiftUI
import Security
import WatchConnectivity

private enum CredentialStore {
    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "com.crysound.crybot.watchkitapp",
         kSecAttrAccount as String: "session"]
    }

    static func load() -> WatchCredentials? {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(request as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(WatchCredentials.self, from: data)
    }

    static func save(_ credentials: WatchCredentials) throws {
        let data = try JSONEncoder().encode(credentials)
        let values: [String: Any] = [kSecValueData as String: data,
                                    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock]
        let status = SecItemUpdate(query as CFDictionary, values as CFDictionary)
        if status == errSecItemNotFound {
            let item = query.merging(values) { _, new in new }
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw StorageError.unavailable }
        } else if status != errSecSuccess {
            throw StorageError.unavailable
        }
    }

    enum StorageError: Error { case unavailable }
}

@MainActor
final class Session: NSObject, ObservableObject, WCSessionDelegate {
    @Published private(set) var credentials: WatchCredentials?
    @Published private(set) var expired = false
    @Published private(set) var revision = 0
    @Published private(set) var accountGeneration = 0
    @Published private(set) var refreshing = false
    @Published private(set) var notice: String?
    private let preferences = UserDefaults.standard
    private var lastUpdate: TimeInterval = 0
    private var lastSignedInToken: String?

    override init() {
        super.init()
        credentials = CredentialStore.load()
        lastSignedInToken = credentials?.sessionToken
        lastUpdate = preferences.double(forKey: "sessionUpdatedAt")
        validateConfiguredServer()
        if let deadline = credentials?.cfExpires { expired = deadline <= Date().timeIntervalSince1970 }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    var ready: Bool { credentials?.isReady == true }
    var pollIdentity: String { "\(revision)-\(expired)-\(ready)" }

    func currentCredentials() -> WatchCredentials? {
        guard let credentials, credentials.isReady, !expired else { return nil }
        if let deadline = credentials.cfExpires, deadline <= Date().timeIntervalSince1970 {
            expired = true
            return nil
        }
        return credentials
    }

    func report(_ error: Error) {
        if error as? WatchAPIError == .loginExpired { expired = true }
    }

    func requestRefresh() {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated,
              WCSession.default.isReachable else {
            notice = "OPEN_PHONE"
            return
        }
        refreshing = true
        notice = nil
        WCSession.default.sendMessage(["request": "refresh"], replyHandler: { context in
            Task { @MainActor in
                self.refreshing = false
                if context["status"] as? String == "openPhone" { self.notice = "OPEN_PHONE" }
                else { self.receive(context) }
            }
        }, errorHandler: { _ in
            Task { @MainActor in
                self.refreshing = false
                self.notice = "OPEN_PHONE"
            }
        })
    }

    private func validateConfiguredServer() {
        let configured = Bundle.main.object(forInfoDictionaryKey: "CRYBOT_SERVER_URL") as? String ?? ""
        guard !configured.isEmpty, let credentials else { return }
        // Credentials must never be forwarded to a different build-configured server.
        if !ServerAddress.matches(configured, credentials.server) {
            self.credentials = nil
            notice = "SERVER_MISMATCH"
        }
    }

    private func receive(_ context: [String: Any]) {
        guard let incoming = WatchCredentials(context: context),
              let updatedAt = context["updatedAt"] as? TimeInterval,
              updatedAt >= lastUpdate else { return }
        let configured = Bundle.main.object(forInfoDictionaryKey: "CRYBOT_SERVER_URL") as? String ?? ""
        guard configured.isEmpty || ServerAddress.matches(configured, incoming.server) else {
            notice = "SERVER_MISMATCH"
            return
        }
        do { try CredentialStore.save(incoming) }
        catch {
            notice = "STORAGE_ERROR"
            return
        }
        if let old = credentials,
           !ServerAddress.matches(old.server, incoming.server)
            || (!incoming.sessionToken.isEmpty && lastSignedInToken != nil && lastSignedInToken != incoming.sessionToken) {
            accountGeneration += 1
        }
        if !incoming.sessionToken.isEmpty { lastSignedInToken = incoming.sessionToken }
        credentials = incoming
        lastUpdate = updatedAt
        preferences.set(updatedAt, forKey: "sessionUpdatedAt")
        preferences.set(incoming.server, forKey: "server")
        expired = !incoming.isReady || (incoming.cfExpires.map { $0 <= Date().timeIntervalSince1970 } ?? false)
        notice = incoming.isReady ? nil : "OPEN_PHONE"
        revision += 1
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        Task { @MainActor in self.receive(context) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.receive(applicationContext) }
    }
}
