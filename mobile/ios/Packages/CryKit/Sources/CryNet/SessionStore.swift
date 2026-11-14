import Foundation
import CryNetLogic

public protocol SessionStore: AnyObject {
    func read() throws -> SessionRecord?
    func write(_ record: SessionRecord) throws
    func clear() throws
    @discardableResult func replace(ifMatching expected: SessionRecord?, with record: SessionRecord?) throws -> Bool
}

extension SessionStore {
    func storeLogin(_ record: SessionRecord, replacing previous: SessionRecord?) throws {
        var expected = previous
        while true {
            try Task.checkCancellation()
            if try replace(ifMatching: expected, with: record) { return }
            expected = try read()
            guard expected == nil || expected?.server == record.server else { throw CryNetError.serverChanged }
        }
    }
}

public final class MemorySessionStore: SessionStore {
    private let lock = NSLock()
    private var record: SessionRecord?
    public init(_ record: SessionRecord? = nil) { self.record = record }
    public func read() -> SessionRecord? { lock.withLock { record } }
    public func write(_ record: SessionRecord) { lock.withLock { self.record = record } }
    public func clear() { lock.withLock { record = nil } }
    @discardableResult public func replace(ifMatching expected: SessionRecord?, with record: SessionRecord?) -> Bool {
        lock.withLock {
            guard self.record == expected else { return false }
            self.record = record
            return true
        }
    }
}

#if canImport(Security)
import Security

public final class KeychainSessionStore: SessionStore {
    // Serialize all instances so readers sharing a Keychain item cannot resurrect a signed-out session.
    private static let lock = NSLock()
    private let service: String
    private let account: String
    private let accessGroup: String?
    public init(service: String = "com.crysound.crybot.session", account: String = "current", accessGroup: String? = nil) {
        self.service = service
        self.account = account
        self.accessGroup = accessGroup
    }
    private var query: [String: Any] {
        var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                   kSecAttrService as String: service, kSecAttrAccount as String: account]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return query
    }
    public func read() throws -> SessionRecord? { try Self.lock.withLock { try load() } }
    public func write(_ record: SessionRecord) throws { try Self.lock.withLock { try save(record) } }
    public func clear() throws { try Self.lock.withLock { try remove() } }
    @discardableResult public func replace(ifMatching expected: SessionRecord?, with record: SessionRecord?) throws -> Bool {
        try Self.lock.withLock {
            guard try load() == expected else { return false }
            if let record { try save(record) } else { try remove() }
            return true
        }
    }
    private func load() throws -> SessionRecord? {
        var query = query
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw CryNetError.storage }
        do { return try JSONDecoder().decode(SessionRecord.self, from: data) }
        catch { throw CryNetError.storage }
    }
    static func writeAttributes(data: Data) -> [String: Any] {
        [kSecValueData as String: data,
         kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
    }
    private func save(_ record: SessionRecord) throws {
        let data: Data
        do { data = try JSONEncoder().encode(record) } catch { throw CryNetError.storage }
        let attributes = Self.writeAttributes(data: data)
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            guard SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil) == errSecSuccess else { throw CryNetError.storage }
        } else if status != errSecSuccess { throw CryNetError.storage }
    }
    private func remove() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw CryNetError.storage }
    }
}
#endif
