import XCTest
@testable import CryCore

final class WireMessageStackTests: XCTestCase {
    private final class RoundTripBox: @unchecked Sendable {
        var value: ([WireMessage], ThreadPage, BotsSnapshot)?
        var error: Error?
    }

    private func makeFixture() throws -> ([WireMessage], ThreadPage, BotsSnapshot) {
        let kinds: [((WireMessageFields) -> WireMessage)] = [
            WireMessage.text, WireMessage.options, WireMessage.activity,
            WireMessage.screen, WireMessage.connector, WireMessage.secret,
            WireMessage.signin, WireMessage.routineRun, WireMessage.goalRun,
            WireMessage.burst, WireMessage.digest, WireMessage.compaction,
            WireMessage.call, WireMessage.widget, WireMessage.app
        ]
        let messages = (0..<500).map { index in
            let fields = WireMessageFields(
                id: "message-\(index)",
                role: index.isMultiple(of: 2) ? .user : .bot,
                at: Double(index),
                text: "Message \(index)"
            )
            return kinds[index % kinds.count](fields)
        }
        let page = ThreadPage(messages: messages, activeLeafId: "message-499", hasMore: true)
        var snapshot = try fixture(BotsSnapshot.self)
        var bot = try fixture(WireBot.self)
        bot.messages = messages
        snapshot.bots = [bot]
        return (messages, page, snapshot)
    }

    func testDetachedRoundTripOfLargeMessageCollections() async throws {
        let (messages, page, snapshotWithMessages) = try makeFixture()

        let result = try await Task.detached {
            let arrayData = try JSONEncoder().encode(messages)
            let pageData = try JSONEncoder().encode(page)
            let snapshotData = try JSONEncoder().encode(snapshotWithMessages)
            return (
                try JSONDecoder().decode([WireMessage].self, from: arrayData),
                try JSONDecoder().decode(ThreadPage.self, from: pageData),
                try JSONDecoder().decode(BotsSnapshot.self, from: snapshotData)
            )
        }.value

        XCTAssertEqual(result.0, messages)
        XCTAssertEqual(result.1, page)
        XCTAssertEqual(result.2, snapshotWithMessages)
        XCTAssertEqual(try XCTUnwrap(result.2.bots.first).messages, messages)
    }

    func testFixedStackRoundTripOfLargeMessageCollections() throws {
        let (messages, page, snapshot) = try makeFixture()
        let box = RoundTripBox()
        let finished = expectation(description: "fixed stack round trip")
        let thread = Thread {
            do {
                let arrayData = try JSONEncoder().encode(messages)
                let pageData = try JSONEncoder().encode(page)
                let snapshotData = try JSONEncoder().encode(snapshot)
                box.value = (
                    try JSONDecoder().decode([WireMessage].self, from: arrayData),
                    try JSONDecoder().decode(ThreadPage.self, from: pageData),
                    try JSONDecoder().decode(BotsSnapshot.self, from: snapshotData)
                )
            } catch {
                box.error = error
            }
            finished.fulfill()
        }
        thread.stackSize = 512 * 1024
        thread.start()
        wait(for: [finished], timeout: 30)
        if let error = box.error { throw error }
        let result = try XCTUnwrap(box.value)
        XCTAssertEqual(result.0, messages)
        XCTAssertEqual(result.1, page)
        XCTAssertEqual(result.2, snapshot)
        XCTAssertEqual(try XCTUnwrap(result.2.bots.first).messages, messages)
    }
}
