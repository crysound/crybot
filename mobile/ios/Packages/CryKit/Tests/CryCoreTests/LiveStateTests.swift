import XCTest
@testable import CryCore

final class LiveStateTests: XCTestCase {
    private func bot(_ id: String, thread: String = "thread-1") throws -> WireBot {
        var value = try fixture(WireBot.self)
        value.id = id
        value.threadId = thread
        value.tasks = [WireTask(threadId: thread, title: "Conversation", createdAt: 1)]
        value.messages = []
        value.activeLeafId = nil
        return value
    }
    private func group(_ id: String) throws -> WireGroup {
        var value = try fixture(WireGroup.self)
        value.id = id
        value.threadId = "thread-" + id
        value.tasks = []
        value.messages = []
        value.activeLeafId = nil
        return value
    }
    private func message(_ id: String, text: String = "Hello", parent: String? = nil) -> WireMessage {
        .text(WireMessageFields(id: id, role: .bot, at: 10, text: text, parentId: parent))
    }
    private func runtime(_ type: String, id: String = UUID().uuidString, extra: [String: JSONValue] = [:]) throws -> ServerFrame {
        var raw: JSONValue = .object([
            "type": .string(type), "eventId": .string(id), "provider": .string("sample-provider"),
            "threadId": .string("thread-1"), "turnId": .string("turn-1"), "itemId": .string("item-1"),
            "requestId": .string("request-1"), "createdAt": .string("2026-11-14T00:00:00Z")
        ])
        for (key, value) in extra { raw[key] = value }
        return .runtime(ServerFrameRuntime(event: try raw.decode(RuntimeEvent.self)))
    }

    func testSnapshotLoadsTranscriptsQueuesAndControlAndResetsStaleState() throws {
        var state = LiveState()
        state.apply(try frame(#"{"kind":"computer","botId":"old","state":"waking"}"#))
        var first = try bot("bot-1")
        first.messages = [message("message-1")]
        first.activeLeafId = "message-1"
        var snapshot = BotsSnapshot(bots: [first], groups: [try group("group-1")], sections: ["Team"])
        snapshot.botQueuedMessages = ["thread-1": [.init(queueId: "queue-1", text: "Later")]]
        snapshot.computerControl = ["bot-1": .init(held: true, helpReason: nil)]
        state.apply(.snapshot(.init(snapshot: snapshot)))
        XCTAssertEqual(state.bots.map(\.id), ["bot-1"])
        XCTAssertEqual(state.groups.map(\.id), ["group-1"])
        XCTAssertEqual(state.sections, ["Team"])
        XCTAssertEqual(state.threads["thread-1"]?.activeLeafId, "message-1")
        XCTAssertEqual(state.threads["thread-1"]?.messages.first?.fields?.text, "Hello")
        XCTAssertEqual(state.queues["thread-1"]?.first?.queueId, "queue-1")
        XCTAssertTrue(state.computerControl["bot-1"]?.held == true)
        XCTAssertTrue(state.computer.isEmpty)
    }

    func testBotGroupUpdatesOrderingAndDeletes() throws {
        var state = LiveState()
        state.load(snapshot: BotsSnapshot(bots: [try bot("bot-1"), try bot("bot-2", thread: "thread-2")], groups: [try group("group-1"), try group("group-2")], sections: []))
        state.apply(try frame(#"{"kind":"sections","sections":["Work"]}"#))
        state.apply(try frame(#"{"kind":"bots.order","botIds":["bot-2","bot-2","missing"]}"#))
        state.apply(try frame(#"{"kind":"groups.order","groupIds":["group-2"]}"#))
        XCTAssertEqual(state.sections, ["Work"])
        XCTAssertEqual(state.bots.map(\.id), ["bot-2", "bot-1"])
        XCTAssertEqual(state.groups.map(\.id), ["group-2", "group-1"])
        var updated = try bot("bot-1")
        updated.name = "Fern"
        updated.computer = nil
        state.apply(.bot(.init(bot: updated)))
        XCTAssertEqual(state.bots.last?.name, "Fern")
        XCTAssertNil(state.bots.last?.computer)
        var room = try group("group-1")
        room.description = nil
        room.name = "Studio"
        state.apply(.group(.init(group: room)))
        XCTAssertEqual(state.groups.last?.name, "Studio")
        state.apply(.bot(.init(bot: try bot("bot-3", thread: "thread-3"))))
        state.apply(.group(.init(group: try group("group-3"))))
        XCTAssertEqual(state.bots.first?.id, "bot-3")
        XCTAssertEqual(state.groups.first?.id, "group-3")
        state.apply(try frame(#"{"kind":"bot.deleted","botId":"bot-1"}"#))
        state.apply(try frame(#"{"kind":"group.deleted","groupId":"group-1"}"#))
        XCTAssertFalse(state.bots.contains { $0.id == "bot-1" })
        XCTAssertFalse(state.groups.contains { $0.id == "group-1" })
        XCTAssertNil(state.threads["thread-1"])
        XCTAssertNil(state.threads["thread-group-1"])
    }

    func testPresenceAndConfigMerging() throws {
        var state = LiveState()
        state.apply(try frame(#"{"kind":"team.presence","email":"person@example.com","here":true}"#))
        state.apply(try frame(#"{"kind":"thread.presence","threadId":"thread-1","people":["person@example.com"]}"#))
        state.apply(try frame(#"{"kind":"team.people"}"#))
        state.apply(try frame(#"{"kind":"config","profile":{"name":"Fern"},"future":true}"#))
        state.apply(try frame(#"{"kind":"config","profile":null}"#))
        XCTAssertEqual(state.teamPresence["person@example.com"], true)
        XCTAssertEqual(state.threadPresence["thread-1"], ["person@example.com"])
        XCTAssertEqual(state.peopleRevision, 1)
        XCTAssertEqual(state.config["profile"], .null)
        XCTAssertEqual(state.config["future"], .bool(true))
        XCTAssertNil(state.config["kind"])
    }

    func testMessagesPatchesLeavesAndQueuedConsumption() throws {
        var state = LiveState()
        state.load(snapshot: BotsSnapshot(bots: [try bot("bot-1")], groups: [], sections: []))
        state.apply(try frame(#"{"kind":"bot.queued","queues":{"thread-1":[{"queueId":"queue-1","text":"Later"}]}}"#))
        let one = message("message-1")
        let two = message("message-2", parent: "message-1")
        state.apply(.message(.init(threadId: "thread-1", message: one)))
        state.apply(.message(.init(threadId: "thread-1", message: two)))
        state.apply(.message(.init(threadId: "thread-1", message: one)))
        XCTAssertEqual(state.threads["thread-1"]?.messages.count, 2)
        XCTAssertEqual(state.threads["thread-1"]?.activeLeafId, "message-2")
        state.apply(.messagePatch(.init(threadId: "thread-1", message: message("message-1", text: "Replaced"))))
        state.apply(.messagePatch(.init(threadId: "thread-1", message: message("missing"))))
        XCTAssertEqual(state.threads["thread-1"]?.messages.first?.fields?.text, "Replaced")
        XCTAssertEqual(state.threads["thread-1"]?.messages.count, 2)
        state.apply(.message(.init(threadId: "thread-1", message: message("late-branch", parent: "message-1"))))
        XCTAssertEqual(state.threads["thread-1"]?.activeLeafId, "message-2")
        state.apply(try frame(#"{"kind":"thread","threadId":"thread-1","activeLeafId":"late-branch"}"#))
        XCTAssertEqual(state.threads["thread-1"]?.activeLeafId, "late-branch")
        let queued = WireMessage.text(.init(id: "message-3", role: .user, at: 20, text: "Later", queueId: "queue-1"))
        state.apply(.message(.init(threadId: "thread-1", message: queued)))
        XCTAssertEqual(state.queues["thread-1"]?.count, 0)
        state.apply(try frame(#"{"kind":"bot.queued","queues":{"thread-1":[{"queueId":"queue-1","text":"Later"}]}}"#))
        state.apply(.message(.init(threadId: "thread-1", message: queued)))
        XCTAssertEqual(state.queues["thread-1"]?.count, 0)
        XCTAssertEqual(state.bots.first?.tasks?.first?.updatedAt, 20)
        XCTAssertEqual(state.bots.first?.tasks?.first?.lastThreadOrderAt, 20)
        state.apply(.bot(.init(bot: try bot("bot-1"))))
        XCTAssertEqual(state.threads["thread-1"]?.messages.count, 4)
    }

    func testNotificationDeduplicationReadAndReplay() throws {
        var state = LiveState()
        let notification = try frame(#"{"kind":"notify","notification":{"id":"notification-1","kind":"done","botId":"bot-1","botName":"Fern","threadId":"thread-1","title":"Done","body":"Ready","at":1,"read":false}}"#)
        state.apply(notification)
        state.apply(notification)
        XCTAssertEqual(state.notifications.count, 1)
        XCTAssertEqual(state.unreadNotificationCount, 1)
        state.apply(try frame(#"{"kind":"notifications.read","threadId":"thread-1","ids":["notification-1"]}"#))
        state.apply(notification)
        XCTAssertEqual(state.unreadNotificationCount, 0)
        state.load(snapshot: .init(bots: [], groups: [], sections: []))
        XCTAssertEqual(state.notifications.count, 1)
    }

    func testComputerControlCallAndLatestScreen() throws {
        var state = LiveState()
        state.apply(try frame(#"{"kind":"computer","botId":"bot-1","state":"provisioning","place":"cloud"}"#))
        XCTAssertEqual(state.computer["bot-1"]?.state, .provisioning)
        state.apply(try frame(#"{"kind":"computer-control","botId":"bot-1","held":true,"helpReason":"Sign in","help":null}"#))
        XCTAssertEqual(state.computerControl["bot-1"]?.helpReason, "Sign in")
        state.apply(try frame(#"{"kind":"screen","botId":"bot-1","threadId":"thread-1","png":"first"}"#))
        state.apply(try frame(#"{"kind":"screen","botId":"bot-1","threadId":"thread-1","png":"latest","surface":"browser"}"#))
        XCTAssertNil(state.computer["bot-1"])
        XCTAssertEqual(state.screens["bot-1"]?.png, "latest")
        let call = try json(#"{"callId":"call-1","botId":"bot-1","threadId":"thread-1","provider":"openai","status":"live","startedAt":1,"client":"ios","voice":"sample-voice"}"#).decode(LiveCallState.self)
        state.apply(.liveCall(.init(botId: "bot-1", threadId: "thread-1", call: call)))
        XCTAssertEqual(state.calls["bot-1"]?.callId, "call-1")
        state.apply(try frame(#"{"kind":"live.call","botId":"bot-1","threadId":"thread-1","call":null}"#))
        XCTAssertNil(state.calls["bot-1"])
    }

    func testRuntimeStreamingDeduplicationAndFinalMessageReplacement() throws {
        var state = LiveState()
        let first = try runtime("content.delta", id: "event-1", extra: ["streamKind": .string("assistant_text"), "delta": .string("Hel")])
        state.apply(first)
        state.apply(first)
        state.apply(try runtime("content.delta", extra: ["streamKind": .string("assistant_text"), "delta": .string("lo")]))
        let key = LiveStreamID(turnId: "turn-1", itemId: "item-1", kind: "assistant_text")
        XCTAssertEqual(state.streamingText["thread-1"]?[key], "Hello")
        state.apply(try runtime("content.delta", extra: ["streamKind": .string("reasoning_text"), "delta": .string("Thinking")]))
        XCTAssertEqual(state.streamingText["thread-1"]?.count, 2)
        state.apply(try runtime("item.completed", extra: ["itemType": .string("assistant_text"), "text": .string("Hello!")]))
        XCTAssertEqual(state.streamingText["thread-1"]?[key], "Hello!")
        let final = WireMessage.text(.init(id: "message-1", role: .bot, at: 20, text: "Hello!", turnId: "turn-1", itemId: "item-1"))
        state.apply(.message(.init(threadId: "thread-1", message: final)))
        XCTAssertTrue(state.streamingText["thread-1"]?.isEmpty == true)
        XCTAssertEqual(state.threads["thread-1"]?.messages.first?.fields?.text, "Hello!")
    }

    func testRuntimeItemsRequestsAndTurnReset() throws {
        var state = LiveState()
        state.apply(try runtime("item.started", extra: ["itemType": .string("tool"), "title": .string("Read")]))
        state.apply(try runtime("item.updated", extra: ["itemType": .string("tool"), "tokens": .number(5)]))
        state.apply(try runtime("item.output", extra: ["itemType": .string("tool"), "text": .string("one")]))
        state.apply(try runtime("item.output", extra: ["itemType": .string("tool"), "text": .string("two")]))
        XCTAssertEqual(state.runtimeItems["thread-1"]?["item-1"]?.output, "onetwo")
        state.apply(try runtime("item.output", extra: ["itemType": .string("tool"), "text": .string("whole"), "whole": .bool(true)]))
        XCTAssertEqual(state.runtimeItems["thread-1"]?["item-1"]?.output, "whole")
        state.apply(try runtime("item.completed", extra: ["itemType": .string("tool"), "ok": .bool(true), "output": .string("done")]))
        XCTAssertEqual(state.runtimeItems["thread-1"]?["item-1"]?.title, "Read")
        XCTAssertEqual(state.runtimeItems["thread-1"]?["item-1"]?.tokens, 5)
        XCTAssertEqual(state.runtimeItems["thread-1"]?["item-1"]?.ok, true)
        XCTAssertEqual(state.runtimeItems["thread-1"]?["item-1"]?.completed, true)
        state.apply(try runtime("request.opened", extra: ["requestType": .string("permission"), "tool": .string("read"), "summary": .string("Read file")]))
        XCTAssertEqual(state.requests["thread-1"]?["request-1"]?.summary, "Read file")
        state.apply(try runtime("request.resolved", extra: ["behavior": .string("allow"), "source": .string("user")]))
        XCTAssertNil(state.requests["thread-1"]?["request-1"])
        XCTAssertEqual(state.resolvedRequests["thread-1"]?["request-1"]?.behavior, .allow)
        state.apply(try runtime("turn.started"))
        XCTAssertTrue(state.runtimeItems["thread-1"]?.isEmpty == true)
        XCTAssertTrue(state.streamingText["thread-1"]?.isEmpty == true)
    }

    func testFutureMessagesAndReadBeforeNotify() throws {
        var state = LiveState()
        state.apply(try frame(#"{"kind":"message","threadId":"thread-1","message":{"kind":"future","id":"future-1","text":"Fallback"}}"#))
        XCTAssertEqual(state.threads["thread-1"]?.messages.first?.id, "future-1")
        if case .unknown(let kind, _) = state.threads["thread-1"]?.messages.first { XCTAssertEqual(kind, "future") }
        else { XCTFail("Expected an unknown message") }
        state.apply(try frame(#"{"kind":"notifications.read","threadId":"thread-1","ids":["notification-1"]}"#))
        state.apply(try frame(#"{"kind":"notify","notification":{"id":"notification-1","kind":"done","botId":"bot-1","botName":"Fern","threadId":"thread-1","title":"Done","body":"Ready","at":1,"read":false}}"#))
        XCTAssertEqual(state.unreadNotificationCount, 0)
        state.apply(try frame(#"{"kind":"config","future":true}"#))
        state.load(snapshot: .init(bots: [], groups: [], sections: []))
        XCTAssertEqual(state.config["future"], .bool(true))
    }

    func testSubscriptionOnlyAndUnknownFramesAreCounted() throws {
        let kinds: Set<String> = ["routine", "routine.deleted", "routine.run", "webhook", "webhook.attempt", "webhook.deleted", "app-trigger", "app-trigger.attempt", "app-trigger.deleted", "app-trigger.service", "mcp.changed", "device.job", "data", "hello", "ping"]
        var state = LiveState()
        for sample in try manualCases() where sample.swiftType == "ServerFrame" && kinds.contains(sample.name) {
            state.apply(try sample.value.decode(ServerFrame.self))
            XCTAssertEqual(state.unhandledFrameCounts[sample.name], 1)
        }
        state.apply(try frame(#"{"kind":"future","payload":true}"#))
        XCTAssertEqual(state.unhandledFrameCounts["future"], 1)
        XCTAssertEqual(state.unhandledFrameCounts.count, kinds.count + 1)
        XCTAssertTrue(state.bots.isEmpty)
        XCTAssertTrue(state.threads.isEmpty)
    }
}
