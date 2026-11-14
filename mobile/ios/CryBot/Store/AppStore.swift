import Foundation
import Observation
import CryCore

@Observable @MainActor
final class AppStore {
    enum RootTab: Hashable { case chats, inbox }
    enum ConnectionStatus: Equatable { case disconnected, connecting, connected, waiting(TimeInterval) }
    enum StoreError: Error { case detached, inactiveConnection }

    private(set) var state = LiveState()
    private(set) var transport: (any Transport)?
    private(set) var signedIn = false
    private(set) var isFixture = false
    private(set) var fixtureError: String?
    private(set) var connectionStatus: ConnectionStatus = .disconnected
    private(set) var screens = false
    private(set) var inboxUnreadCount = 0
    private(set) var sessionID = UUID()
    private(set) var isSigningOut = false
    var selectedTab: RootTab = .chats
    var chatsPath: [AppRoute] = []
    var inboxPath: [AppRoute] = []
    var path: [AppRoute] {
        get { selectedTab == .chats ? chatsPath : inboxPath }
        set {
            switch selectedTab {
            case .chats: chatsPath = newValue
            case .inbox: inboxPath = newValue
            }
        }
    }
    var webTarget: WebHostTarget?

    @ObservationIgnored let imageCache = ImageDataCache()
    @ObservationIgnored private let clock: ShellClock
    @ObservationIgnored private let connection = ConnectionTaskLifetime()
    @ObservationIgnored private var connectionID = UUID()
    @ObservationIgnored private var signOutTask: Task<Void, Never>?
    @ObservationIgnored private var signOutHandlers: [@MainActor () async -> Void] = []
    @ObservationIgnored private var subscriptions: [UUID: FrameSubscription] = [:]
    @ObservationIgnored private var cursor: String?
    @ObservationIgnored private var policy: ConnectionPolicy
    @ObservationIgnored private var foreground = true
    private var historyPages: [ThreadID: ThreadPage] = [:]

    private struct FrameSubscription {
        var kinds: Set<String>
        var continuation: AsyncStream<ServerFrame>.Continuation
    }

    init(clock: ShellClock = .continuous) {
        self.clock = clock
        policy = ConnectionPolicy(now: clock.now())
    }

    func attach(transport: any Transport) {
        guard !isSigningOut else { return }
        let wasForeground = foreground
        detach()
        clearMemory()
        foreground = wasForeground
        isFixture = transport is FixtureTransport
        self.transport = transport
        signedIn = true
        if foreground { resumeRealtime() }
    }

    func detach() {
        let wasForeground = foreground
        pauseRealtime()
        foreground = wasForeground
        transport = nil
        sessionID = UUID()
        cursor = nil
        finishSubscriptions()
    }

    func resumeRealtime() {
        foreground = true
        guard signedIn, transport != nil, connection.task == nil, !isSigningOut else { return }
        let id = UUID()
        connectionID = id
        connection.task = Task { [weak self] in
            await self?.runConnection(id: id)
        }
    }

    func pauseRealtime() {
        foreground = false
        connectionID = UUID()
        connection.task?.cancel()
        connection.task = nil
        connectionStatus = .disconnected
    }

    func request<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R {
        guard let transport else { throw StoreError.detached }
        let session = sessionID
        let response = try await transport.send(endpoint)
        try Task.checkCancellation()
        guard session == sessionID else { throw CancellationError() }
        return response
    }

    func refreshSnapshot() async throws {
        let snapshot = try await request(CoreEndpoints.snapshot())
        state.load(snapshot: snapshot)
        try? await refreshInboxCount()
    }

    func refreshInboxCount() async throws {
        let response = try await request(CoreEndpoints.inboxCount)
        inboxUnreadCount = max(0, Int(min(response.count.isFinite ? response.count : 0, Double(Int32.max))))
    }

    @discardableResult
    func loadOlder(thread: ThreadID) async throws -> ThreadPage {
        let before = page(thread: thread).messages.first?.id
        let older = try await request(CoreEndpoints.history(thread: thread, before: before))
        let cached = historyPages[thread]?.messages ?? []
        let ids = Set(older.messages.compactMap(\.id))
        historyPages[thread] = ThreadPage(messages: older.messages + cached.filter { !ids.contains($0.id ?? "") },
                                          activeLeafId: older.activeLeafId, hasMore: older.hasMore)
        return page(thread: thread)
    }

    func page(thread: ThreadID) -> ThreadPage {
        let live = state.threads[thread]
        let older = historyPages[thread]
        let liveIDs = Set((live?.messages ?? []).compactMap(\.id))
        let messages = (older?.messages ?? []).filter { !liveIDs.contains($0.id ?? "") } + (live?.messages ?? [])
        return ThreadPage(messages: messages, activeLeafId: live?.activeLeafId ?? older?.activeLeafId,
                          hasMore: older?.hasMore ?? live?.hasMore)
    }

    @discardableResult
    func send(to conversation: ConversationRef, body: ChatSendBody) async throws -> SendResponse {
        switch conversation {
        case .bot(let id, _, _): return try await request(CoreEndpoints.send(bot: id, body: body))
        case .group(let id, _, _): return try await request(CoreEndpoints.send(group: id, body: body))
        }
    }

    @discardableResult
    func respond(thread: ThreadID, body: RespondBody) async throws -> ActionResponse {
        try await request(CoreEndpoints.respond(thread: thread, body: body))
    }

    func respond(_ action: RespondAction) async throws {
        _ = try await respond(thread: action.thread, body: action.body)
    }

    @discardableResult
    func interrupt(_ conversation: ConversationRef) async throws -> ActionResponse {
        switch conversation {
        case .bot(let id, let thread, _): return try await request(CoreEndpoints.interrupt(bot: id, thread: thread))
        case .group(let id, let thread, _): return try await request(CoreEndpoints.interrupt(group: id, thread: thread))
        }
    }

    @discardableResult
    func markRead(_ conversation: ConversationRef) async throws -> ActionResponse {
        switch conversation {
        case .bot(let id, let thread, _): return try await request(CoreEndpoints.markRead(bot: id, thread: thread))
        case .group(let id, let thread, _): return try await request(CoreEndpoints.markRead(group: id, thread: thread))
        }
    }

    @discardableResult
    func react(thread: ThreadID, message: MessageID, emoji: String, on: Bool? = nil) async throws -> ActionResponse {
        try await request(CoreEndpoints.react(thread: thread, message: message, emoji: emoji, on: on))
    }

    func frames(kinds: Set<String>) -> AsyncStream<ServerFrame> {
        let id = UUID()
        let stream = AsyncStream<ServerFrame>.makeStream()
        subscriptions[id] = FrameSubscription(kinds: kinds, continuation: stream.continuation)
        stream.continuation.onTermination = { [weak self] _ in
            Task { @MainActor in self?.subscriptions.removeValue(forKey: id) }
        }
        return stream.stream
    }

    var frameSubscriberCount: Int { subscriptions.count }

    func navigate(to route: AppRoute) {
        guard signedIn, !isSigningOut else { return }
        switch route {
        case .web(let target): webTarget = target
        case .inbox: selectedTab = .inbox; path = []
        default: path.append(route)
        }
    }

    func registerSignOut(_ handler: @escaping @MainActor () async -> Void) {
        signOutHandlers.append(handler)
    }

    func signOut() async {
        if let task = signOutTask { await task.value; return }
        isSigningOut = true
        detach()
        let handlers = signOutHandlers
        let task = Task { @MainActor [weak self] in
            for handler in handlers { await handler() }
            self?.clearMemory()
            self?.isSigningOut = false
        }
        signOutTask = task
        await task.value
        signOutTask = nil
    }

    func setScreens(_ on: Bool) { screens = on }

    static func fixture(scenario: String) -> AppStore {
        do { return try fixture(loaded: FixtureScenario.load(named: scenario)) }
        catch {
            let store = AppStore()
            store.isFixture = true
            store.fixtureError = String(describing: error)
            return store
        }
    }

    static func fixture(loaded scenario: FixtureScenario, clock: ShellClock = .continuous) throws -> AppStore {
        let store = AppStore(clock: clock)
        store.isFixture = true
        store.signedIn = scenario.signedIn
        store.transport = FixtureTransport(scenario: scenario, clock: clock)
        if scenario.signedIn {
            store.state.load(snapshot: scenario.snapshot)
            store.historyPages = scenario.threads
            for (thread, page) in scenario.threads {
                for message in page.messages {
                    store.state.apply(.message(ServerFrameMessage(threadId: thread, message: message)))
                    store.state.apply(.messagePatch(ServerFrameMessagePatch(threadId: thread, message: message)))
                }
                if let leaf = page.activeLeafId {
                    store.state.apply(.thread(ServerFrameThread(threadId: thread, activeLeafId: leaf)))
                }
            }
            if let config = scenario.responses["GET /api/config"] {
                try store.state.load(config: config.decode(ConfigResponse.self))
            }
            if let notifications = scenario.responses["GET /api/notifications"] {
                store.state.load(notifications: try notifications.decode(NotificationsPage.self))
            }
            if let count = scenario.responses["GET /api/inbox/count"] {
                let value = try count.decode(InboxCount.self).count
                store.inboxUnreadCount = max(0, Int(min(value.isFinite ? value : 0, Double(Int32.max))))
            }
        }
        return store
    }

    private func runConnection(id: UUID) async {
        while !Task.isCancelled, connectionID == id, let transport {
            connectionStatus = .connecting
            do {
                policy.connected(at: clock.now())
                try await withThrowingTaskGroup(of: Void.self) { group in
                    group.addTask { [weak self] in
                        guard let self else { return }
                        let since = await self.cursor
                        for try await frame in transport.events(since: since, screens: false) {
                            try Task.checkCancellation()
                            try await self.receive(frame, connection: id)
                        }
                    }
                    group.addTask { [weak self] in
                        guard let self else { return }
                        try await self.watchForTimeout(connection: id)
                    }
                    defer { group.cancelAll() }
                    _ = try await group.next()
                }
            } catch {
                if Task.isCancelled || connectionID != id { return }
            }
            guard !Task.isCancelled, connectionID == id else { return }
            let delay = policy.retryDelay()
            connectionStatus = .waiting(delay)
            do { try await clock.sleep(delay) }
            catch { return }
        }
    }

    private func watchForTimeout(connection id: UUID) async throws {
        while !Task.isCancelled, connectionID == id {
            let remaining = max(0, ConnectionPolicy.inactivityTimeout - (clock.now() - policy.lastFrameAt))
            if remaining > 0 { try await clock.sleep(remaining) }
            try Task.checkCancellation()
            if policy.isTimedOut(at: clock.now()) { throw StoreError.inactiveConnection }
        }
    }

    private func receive(_ frame: ServerFrame, connection id: UUID) async throws {
        guard id == connectionID else { throw CancellationError() }
        policy.receivedFrame(at: clock.now())
        if connectionStatus != .connected { connectionStatus = .connected }
        if let next = FrameCursor.value(for: frame, previous: cursor) { cursor = next }
        state.apply(frame)
        for subscription in subscriptions.values where subscription.kinds.contains(frame.kind) {
            subscription.continuation.yield(frame)
        }
        if case .hello(let hello) = frame, !hello.resumed {
            do { try await refreshSnapshot() }
            catch {
                if id == connectionID { cursor = nil }
                throw error
            }
        } else {
            switch frame {
            case .bot, .group, .botDeleted, .groupDeleted, .message, .messagePatch,
                 .thread, .notify, .notificationsRead, .snapshot:
                try? await refreshInboxCount()
            default: break
            }
        }
    }

    private func finishSubscriptions() {
        let active = subscriptions.values
        subscriptions.removeAll()
        for subscription in active { subscription.continuation.finish() }
    }

    private func clearMemory() {
        state = LiveState()
        imageCache.clear()
        historyPages = [:]
        signedIn = false
        fixtureError = nil
        inboxUnreadCount = 0
        selectedTab = .chats
        chatsPath = []
        inboxPath = []
        webTarget = nil
        screens = false
        policy = ConnectionPolicy(now: clock.now())
    }
}

private final class ConnectionTaskLifetime {
    var task: Task<Void, Never>?

    deinit { task?.cancel() }
}
