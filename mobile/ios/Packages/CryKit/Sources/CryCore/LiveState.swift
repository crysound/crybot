import Foundation

public struct LiveStreamID: Hashable {
    public var turnId: String?
    public var itemId: String?
    public var kind: String

    public init(turnId: String?, itemId: String?, kind: String) {
        self.turnId = turnId
        self.itemId = itemId
        self.kind = kind
    }
}

public struct LiveRuntimeItem: Equatable {
    public var type: String
    public var title: String?
    public var summary: String?
    public var input: String?
    public var output = ""
    public var tokens: Double?
    public var completed = false
    public var ok: Bool?
    public var step: LiveStep?

    public init(type: String) { self.type = type }
}

/// Value state shared by the app and fixture transports. Subscription-only frames increment `unhandledFrameCounts`.
public struct LiveState {
    public private(set) var bots: [WireBot] = []
    public private(set) var groups: [WireGroup] = []
    public private(set) var sections: [String] = []
    public private(set) var threads: [ThreadID: ThreadPage] = [:]
    public private(set) var queues: BotQueuedMessages = [:]
    public private(set) var teamPresence: [String: Bool] = [:]
    public private(set) var threadPresence: [ThreadID: [String]] = [:]
    public private(set) var peopleRevision = 0
    public private(set) var config: [String: JSONValue] = [:]
    public private(set) var notifications: [NotificationLogEntry] = []
    public var unreadNotificationCount: Int { notifications.filter { !$0.read }.count }
    public private(set) var computer: [BotID: ServerFrameComputer] = [:]
    public private(set) var computerControl: [BotID: ComputerControlState] = [:]
    public private(set) var calls: [BotID: LiveCallState] = [:]
    public private(set) var screens: [BotID: ServerFrameScreen] = [:]
    public private(set) var streamingText: [ThreadID: [LiveStreamID: String]] = [:]
    public private(set) var runtimeItems: [ThreadID: [String: LiveRuntimeItem]] = [:]
    public private(set) var requests: [ThreadID: [String: RuntimeEventRequestOpened]] = [:]
    public private(set) var resolvedRequests: [ThreadID: [String: RuntimeEventRequestResolved]] = [:]
    public private(set) var latestRuntime: [ThreadID: RuntimeEvent] = [:]
    public private(set) var unhandledFrameCounts: [String: Int] = [:]
    private var readNotificationIDs: Set<String> = []
    private var eventIDs: Set<String> = []
    private var eventOrder: [String] = []

    public init() {}

    public mutating func load(notifications page: NotificationsPage) {
        let served = Set(page.notifications.map(\.id))
        notifications = Array((notifications.filter { !served.contains($0.id) } + page.notifications)
            .sorted { $0.at > $1.at }.prefix(500))
        readNotificationIDs.subtract(served)
        readNotificationIDs.formUnion(page.notifications.filter(\.read).map(\.id))
    }

    public mutating func load(config response: ConfigResponse) throws {
        config = try JSONValue(encoding: response).objectValue ?? [:]
    }

    public mutating func load(snapshot: BotsSnapshot) {
        let previous = self
        self = LiveState()
        notifications = previous.notifications
        readNotificationIDs = previous.readNotificationIDs
        config = previous.config
        calls = previous.calls
        computer = previous.computer
        screens = previous.screens
        teamPresence = previous.teamPresence
        threadPresence = previous.threadPresence
        peopleRevision = previous.peopleRevision
        unhandledFrameCounts = previous.unhandledFrameCounts
        bots = snapshot.bots
        groups = snapshot.groups
        sections = snapshot.sections
        queues = snapshot.botQueuedMessages ?? [:]
        computerControl = snapshot.computerControl ?? [:]
        for bot in bots {
            threads[bot.threadId] = ThreadPage(messages: bot.messages ?? [], activeLeafId: bot.activeLeafId, hasMore: bot.hasMore)
        }
        for group in groups {
            threads[group.threadId] = ThreadPage(messages: group.messages ?? [], activeLeafId: group.activeLeafId, hasMore: group.hasMore)
        }
    }

    public mutating func apply(_ frame: ServerFrame) {
        switch frame {
        case .snapshot(let value): load(snapshot: value.snapshot)
        case .sections(let value): sections = value.sections
        case .bot(let value): update(bot: value.bot)
        case .group(let value): update(group: value.group)
        case .botDeleted(let value):
            let removed = bots.filter { $0.id == value.botId }.flatMap { [$0.threadId] + ($0.tasks ?? []).map(\.threadId) }
            bots.removeAll { $0.id == value.botId }
            removeThreads(removed)
            computer[value.botId] = nil
            computerControl[value.botId] = nil
            calls[value.botId] = nil
            screens[value.botId] = nil
        case .groupDeleted(let value):
            let removed = groups.filter { $0.id == value.groupId }.flatMap { [$0.threadId] + ($0.tasks ?? []).map(\.threadId) }
            groups.removeAll { $0.id == value.groupId }
            removeThreads(removed)
        case .botsOrder(let value): bots = reordered(bots, ids: value.botIds, id: \.id)
        case .groupsOrder(let value): groups = reordered(groups, ids: value.groupIds, id: \.id)
        case .teamPresence(let value): teamPresence[value.email] = value.here
        case .threadPresence(let value): threadPresence[value.threadId] = value.people
        case .teamPeople: peopleRevision += 1
        case .config(let value):
            config = value.additionalFields.filter { $0.key != "kind" }
        case .message(let value): merge(message: value.message, thread: value.threadId, patch: false)
        case .messagePatch(let value): merge(message: value.message, thread: value.threadId, patch: true)
        case .thread(let value):
            var page = threads[value.threadId] ?? ThreadPage(messages: [], activeLeafId: nil)
            page.activeLeafId = value.activeLeafId
            threads[value.threadId] = page
        case .botQueued(let value): queues = value.queues
        case .runtime(let value): apply(runtime: value.event)
        case .notify(let value):
            if let index = notifications.firstIndex(where: { $0.id == value.notification.id }) {
                var next = value.notification
                next.read = next.read || notifications[index].read
                notifications[index] = next
            } else {
                var next = value.notification
                next.read = next.read || readNotificationIDs.contains(next.id)
                notifications.insert(next, at: 0)
            }
        case .notificationsRead(let value):
            let ids = Set(value.ids)
            readNotificationIDs.formUnion(ids)
            for index in notifications.indices where ids.contains(notifications[index].id) { notifications[index].read = true }
        case .computer(let value): computer[value.botId] = value
        case .computerControl(let value):
            computerControl[value.botId] = ComputerControlState(held: value.held, helpReason: value.helpReason, help: value.help)
        case .liveCall(let value): calls[value.botId] = value.call
        case .screen(let value):
            screens[value.botId] = value
            computer[value.botId] = nil
        default: unhandledFrameCounts[frame.kind, default: 0] += 1
        }
    }

    private mutating func update(bot: WireBot) {
        if let index = bots.firstIndex(where: { $0.id == bot.id }) {
            var next = bot
            next.messages = nil
            next.activeLeafId = nil
            next.hasMore = nil
            bots[index] = next
        } else { bots.insert(bot, at: 0) }
        if threads[bot.threadId] == nil {
            threads[bot.threadId] = ThreadPage(messages: bot.messages ?? [], activeLeafId: bot.activeLeafId, hasMore: bot.hasMore)
        }
        if bot.busy == false { computer[bot.id] = nil }
    }

    private mutating func update(group: WireGroup) {
        if let index = groups.firstIndex(where: { $0.id == group.id }) { groups[index] = group }
        else { groups.insert(group, at: 0) }
        if threads[group.threadId] == nil {
            threads[group.threadId] = ThreadPage(messages: group.messages ?? [], activeLeafId: group.activeLeafId, hasMore: group.hasMore)
        }
    }

    private mutating func merge(message: WireMessage, thread: ThreadID, patch: Bool) {
        var page = threads[thread] ?? ThreadPage(messages: [], activeLeafId: nil)
        guard let id = message.id else { return }
        if !patch, let queueID = message.fields?.queueId {
            queues[thread]?.removeAll { $0.queueId == queueID }
        }
        if let index = page.messages.firstIndex(where: { $0.id == id }) {
            if !patch { return }
            page.messages[index] = message
        } else if !patch {
            page.messages.append(message)
            if message.parentId == page.activeLeafId { page.activeLeafId = id }
        }
        threads[thread] = page
        if message.kind == "text", message.fields?.role == .bot {
            let item = message.fields?.itemId, turn = message.fields?.turnId
            streamingText[thread] = streamingText[thread]?.filter {
                if let item { return $0.key.itemId != item }
                if let turn { return $0.key.turnId != turn }
                return true
            }
        }
        stamp(thread: thread, message: message)
    }

    private mutating func stamp(thread: ThreadID, message: WireMessage) {
        guard let fields = message.fields else { return }
        let moves = fields.role == .user ? fields.peerAsk == nil : message.kind == "text" && (fields.turnTerminal == true || fields.turnId == nil)
        for bot in bots.indices {
            guard var tasks = bots[bot].tasks else { continue }
            for index in tasks.indices where tasks[index].threadId == thread {
                tasks[index].updatedAt = max(tasks[index].updatedAt ?? 0, fields.at)
                if moves { tasks[index].lastThreadOrderAt = max(tasks[index].lastThreadOrderAt ?? 0, fields.turnCompletedAt ?? fields.at) }
            }
            bots[bot].tasks = tasks
        }
        for group in groups.indices {
            guard var tasks = groups[group].tasks else { continue }
            for index in tasks.indices where tasks[index].threadId == thread {
                tasks[index].updatedAt = max(tasks[index].updatedAt ?? 0, fields.at)
                if moves { tasks[index].lastThreadOrderAt = max(tasks[index].lastThreadOrderAt ?? 0, fields.turnCompletedAt ?? fields.at) }
            }
            groups[group].tasks = tasks
        }
    }

    private mutating func removeThreads(_ ids: [ThreadID]) {
        let botThreads = bots.flatMap { [$0.threadId] + ($0.tasks ?? []).map(\.threadId) }
        let groupThreads = groups.flatMap { [$0.threadId] + ($0.tasks ?? []).map(\.threadId) }
        let remaining = Set(botThreads + groupThreads)
        for id in ids where !remaining.contains(id) {
            threads[id] = nil
            queues[id] = nil
            streamingText[id] = nil
            runtimeItems[id] = nil
            requests[id] = nil
            resolvedRequests[id] = nil
            latestRuntime[id] = nil
            threadPresence[id] = nil
        }
    }

    private func reordered<T>(_ values: [T], ids: [String], id: KeyPath<T, String>) -> [T] {
        var seen: Set<String> = []
        let ordered = ids.compactMap { key -> T? in
            guard seen.insert(key).inserted else { return nil }
            return values.first { $0[keyPath: id] == key }
        }
        return ordered + values.filter { !seen.contains($0[keyPath: id]) }
    }

    private mutating func apply(runtime event: RuntimeEvent) {
        guard let thread = event.threadID else { unhandledFrameCounts["runtime.\(event.type)", default: 0] += 1; return }
        if let eventID = event.eventID {
            let key = thread + ":" + eventID
            guard eventIDs.insert(key).inserted else { return }
            eventOrder.append(key)
            if eventOrder.count > 4096 { eventIDs.remove(eventOrder.removeFirst()) }
        }
        latestRuntime[thread] = event
        switch event {
        case .contentDelta(let value):
            let key = LiveStreamID(turnId: value.turnId, itemId: value.itemId, kind: value.streamKind.rawValue)
            streamingText[thread, default: [:]][key, default: ""] += value.delta
        case .itemStarted(let value):
            guard let id = value.itemId else { return }
            var item = LiveRuntimeItem(type: value.itemType.rawValue)
            item.title = value.title
            item.summary = value.summary
            item.input = value.input
            item.step = value.step
            runtimeItems[thread, default: [:]][id] = item
        case .itemUpdated(let value):
            guard let id = value.itemId else { return }
            var item = runtimeItems[thread]?[id] ?? LiveRuntimeItem(type: value.itemType.rawValue)
            item.tokens = value.tokens
            runtimeItems[thread, default: [:]][id] = item
        case .itemOutput(let value):
            guard let id = value.itemId else { return }
            var item = runtimeItems[thread]?[id] ?? LiveRuntimeItem(type: value.itemType)
            item.output = value.whole == true ? value.text : item.output + value.text
            runtimeItems[thread, default: [:]][id] = item
        case .itemCompleted(let value):
            guard let id = value.itemId else { return }
            var item = runtimeItems[thread]?[id] ?? LiveRuntimeItem(type: value.itemType.rawValue)
            item.completed = true
            item.ok = value.ok
            if let output = value.output ?? value.text { item.output = output }
            runtimeItems[thread, default: [:]][id] = item
            if let text = value.text {
                let key = LiveStreamID(turnId: value.turnId, itemId: id, kind: "assistant_text")
                streamingText[thread, default: [:]][key] = text
            }
        case .requestOpened(let value):
            if let id = value.requestId {
                requests[thread, default: [:]][id] = value
                resolvedRequests[thread]?[id] = nil
            }
        case .requestResolved(let value):
            if let id = value.requestId {
                requests[thread]?[id] = nil
                resolvedRequests[thread, default: [:]][id] = value
            }
        case .turnStarted:
            streamingText[thread] = [:]
            runtimeItems[thread] = [:]
        case .turnCompleted, .sessionExited:
            requests[thread] = [:]
        default: break
        }
    }
}
