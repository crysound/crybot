import Foundation
import XCTest
import CryNetLogic
@testable import CryNet

final class SessionStoreTests: XCTestCase {
    private func record(_ host: String, token: String = "cry_sess_fixture") throws -> SessionRecord {
        SessionRecord(server: try CryServer(webURL: "https://\(host).example.com"), method: .pairing, sessionToken: token)
    }

    func testLoginRetriesConflictsOnPreviousOrDestinationServer() throws {
        let previous = try record("previous")
        let next = try record("next")
        for concurrent in [try record("previous", token: "cry_sess_rotated"), previous.signedOut(),
                           try record("next", token: "cry_sess_rotated"), next.signedOut()] {
            let store = ContendedSessionStore(current: previous, concurrent: concurrent, conflicts: 1)
            try store.storeLogin(next, replacing: previous)
            XCTAssertEqual(store.read(), next)
            XCTAssertEqual(store.attempts, 2)
        }
    }

    func testLoginRejectsUnrelatedServerOrClearedPreviousServer() throws {
        let previous = try record("previous")
        let next = try record("next")
        for concurrent in [try record("other"), nil] {
            let store = ContendedSessionStore(current: previous, concurrent: concurrent, conflicts: 1)
            XCTAssertThrowsError(try store.storeLogin(next, replacing: previous)) { error in
                guard case CryNetError.serverChanged = error else { return XCTFail("Wrong conflict error") }
            }
            XCTAssertEqual(store.read(), concurrent)
            XCTAssertEqual(store.attempts, 1)
        }
    }

    func testLoginStopsAfterThreeCASAttempts() throws {
        let previous = try record("previous")
        let concurrent = try record("previous", token: "cry_sess_rotated")
        let store = ContendedSessionStore(current: previous, concurrent: concurrent, conflicts: 10)
        XCTAssertThrowsError(try store.storeLogin(record("next"), replacing: previous)) { error in
            guard case CryNetError.storage = error else { return XCTFail("Wrong retry exhaustion error") }
        }
        XCTAssertEqual(store.attempts, 3)
        XCTAssertEqual(store.read(), concurrent)
    }

    func testLoginCanSucceedOnLastCASAttempt() throws {
        let previous = try record("previous")
        let next = try record("next")
        let store = ContendedSessionStore(current: previous, concurrent: previous.signedOut(), conflicts: 2)
        try store.storeLogin(next, replacing: previous)
        XCTAssertEqual(store.attempts, 3)
        XCTAssertEqual(store.read(), next)
    }
}

private final class ContendedSessionStore: SessionStore {
    private let storage: MemorySessionStore
    private let concurrent: SessionRecord?
    private var conflicts: Int
    private(set) var attempts = 0

    init(current: SessionRecord?, concurrent: SessionRecord?, conflicts: Int) {
        storage = MemorySessionStore(current)
        self.concurrent = concurrent
        self.conflicts = conflicts
    }
    func read() -> SessionRecord? { storage.read() }
    func write(_ record: SessionRecord) { storage.write(record) }
    func clear() { storage.clear() }
    func replace(ifMatching expected: SessionRecord?, with record: SessionRecord?) -> Bool {
        attempts += 1
        if conflicts > 0 {
            conflicts -= 1
            if let concurrent { storage.write(concurrent) } else { storage.clear() }
            return false
        }
        return storage.replace(ifMatching: expected, with: record)
    }
}
