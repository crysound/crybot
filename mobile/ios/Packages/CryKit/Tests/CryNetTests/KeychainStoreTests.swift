#if canImport(Security)
import Foundation
import Security
import XCTest
import CryNetLogic
@testable import CryNet

final class KeychainStoreTests: XCTestCase {
    func testWriteAttributesUseDeviceOnlyAccessibility() throws {
        let data = Data("fixture".utf8)
        let attributes = KeychainSessionStore.writeAttributes(data: data)
        XCTAssertEqual(attributes[kSecAttrAccessible as String] as? String, kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String)
        XCTAssertEqual(attributes[kSecValueData as String] as? Data, data)
    }
    func testIsolatedKeychainRecordIsJSONAndSharedBetweenReaders() throws {
        let service = "com.example.crybot.tests.\(UUID().uuidString)"
        let first = KeychainSessionStore(service: service, accessGroup: nil)
        let second = KeychainSessionStore(service: service, accessGroup: nil)
        defer { try? first.clear() }
        XCTAssertNil(try first.read())
        let record = SessionRecord(server: try CryServer(webURL: "https://example.com"), method: .feishu, sessionToken: "cry_sess_keychain")
        try first.write(record)
        XCTAssertEqual(try second.read(), record)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                   kSecAttrAccount as String: "current", kSecReturnData as String: true, kSecReturnAttributes as String: true]
        var result: CFTypeRef?
        XCTAssertEqual(SecItemCopyMatching(query as CFDictionary, &result), errSecSuccess)
        let attributes = try XCTUnwrap(result as? [String: Any])
        let data = try XCTUnwrap(attributes[kSecValueData as String] as? Data)
        XCTAssertEqual(try JSONDecoder().decode(SessionRecord.self, from: data), record)
        XCTAssertTrue(try second.replace(ifMatching: record, with: record.signedOut()))
        XCTAssertFalse(try first.replace(ifMatching: record, with: record))
        XCTAssertFalse(try first.read()?.isAuthenticated == true)
        try second.clear()
        XCTAssertNil(try first.read())
    }
}
#endif
