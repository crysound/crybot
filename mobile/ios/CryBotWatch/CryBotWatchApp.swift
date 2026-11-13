import SwiftUI

@main
@MainActor
struct CryBotWatchApp: App {
    @StateObject private var session = Session()

    var body: some Scene {
        WindowGroup {
            BotListView()
                .id(session.accountGeneration)
                .environmentObject(session)
        }
    }
}

func localized(_ key: String) -> String { NSLocalizedString(key, comment: "") }

@MainActor
struct SessionNotice: View {
    @EnvironmentObject private var session: Session

    var body: some View {
        if session.expired || session.notice != nil {
            VStack(alignment: .leading) {
                if session.expired { Text("LOGIN_EXPIRED") }
                if let notice = session.notice { Text(localized(notice)) }
                Button("RETRY") { session.requestRefresh() }
                    .disabled(session.refreshing)
                if session.refreshing { ProgressView().accessibilityLabel(Text("REFRESHING")) }
            }
            .font(.caption)
            .foregroundStyle(.orange)
        }
    }
}

@MainActor
struct BotListView: View {
    @EnvironmentObject private var session: Session
    @Environment(\.scenePhase) private var scenePhase
    @State private var bots: [WatchBot] = []
    @State private var path: [String] = []
    @State private var loading = false
    @State private var errorKey: String?
    private let api = APIClient.shared

    private var pollingKey: String { "\(scenePhase == .active)-\(path.isEmpty)-\(session.pollIdentity)" }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                SessionNotice()
                if !session.ready && bots.isEmpty {
                    Text("SIGN_IN_ON_PHONE")
                    Button("RETRY") { session.requestRefresh() }
                        .disabled(session.refreshing)
                } else {
                    ForEach(bots) { bot in
                        NavigationLink(value: bot.id) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(bot.displayName).font(.headline)
                                if let reply = bot.latestReply {
                                    Text(reply.displayText(localize: localized)).font(.body).lineLimit(2)
                                    Text(reply.date, style: .relative).font(.caption).foregroundStyle(.secondary)
                                } else {
                                    Text("NO_REPLIES").font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    if bots.isEmpty && !loading { Text("NO_BOTS") }
                    Button("REFRESH") { Task { await refresh() } }
                        .disabled(loading || session.expired)
                }
                if loading { ProgressView().accessibilityLabel(Text("REFRESHING")) }
                if let errorKey, errorKey != "LOGIN_EXPIRED" { Text(localized(errorKey)).foregroundStyle(.orange) }
            }
            .navigationTitle("Cry Bot")
            .navigationDestination(for: String.self) { botId in
                if let bot = bots.first(where: { $0.id == botId }), let threadId = bot.threadId {
                    ConversationView(bot: bot, threadId: threadId)
                }
            }
            .task(id: pollingKey) {
                guard scenePhase == .active, path.isEmpty else { return }
                while !Task.isCancelled {
                    await refresh()
                    do { try await Task.sleep(for: .seconds(15)) }
                    catch { return }
                }
            }
        }
    }

    @MainActor private func refresh() async {
        guard scenePhase == .active, !loading, let credentials = session.currentCredentials() else { return }
        loading = true
        defer { loading = false }
        do {
            let loaded = try await api.bots(credentials: credentials)
            guard !Task.isCancelled, session.credentials == credentials else { return }
            bots = loaded
            errorKey = nil
        } catch is CancellationError {
        } catch {
            guard session.credentials == credentials else { return }
            session.report(error)
            errorKey = (error as? WatchAPIError)?.localizationKey ?? "CANNOT_CONNECT"
        }
    }
}

@MainActor
struct ConversationView: View {
    @EnvironmentObject private var session: Session
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: ConversationModel
    @State private var showReplies = false
    private let name: String
    private let quickReplies = ["QUICK_OK", "QUICK_CONTINUE", "QUICK_STOP", "QUICK_DETAILS"]

    init(bot: WatchBot, threadId: String) {
        name = bot.displayName
        _model = StateObject(wrappedValue: ConversationModel(bot: bot, threadId: threadId))
    }

    private var pollingKey: String { "\(scenePhase == .active)-\(session.pollIdentity)-\(model.awaitingReply)" }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 8) {
                    SessionNotice()
                    ForEach(model.messages) { message in
                        HStack {
                            if message.role == "user" { Spacer(minLength: 16) }
                            Text(message.displayText(localize: localized))
                                .font(.body)
                                .lineLimit(message.kind == "text" ? nil : 1)
                                .padding(8)
                                .background(message.role == "user" ? Color.accentColor.opacity(0.3) : Color.secondary.opacity(0.2))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .accessibilityLabel(Text(localized(message.role == "user" ? "SPEAKER_ME" : "SPEAKER_BOT") + ": " + message.displayText(localize: localized)))
                            if message.role != "user" { Spacer(minLength: 16) }
                        }
                        .id(message.id)
                    }
                    if model.queued { Text("QUEUED").font(.caption) }
                    if let error = model.errorKey, error != "LOGIN_EXPIRED" {
                        Text(localized(error)).font(.caption).foregroundStyle(.orange)
                    }
                    if let pending = model.pending {
                        Text(pending.text).font(.body)
                        if !model.sending {
                            Button("RESEND") { Task { await model.retry(session: session) } }
                                .disabled(session.expired || !session.ready)
                        }
                    }
                    if model.sending { ProgressView().accessibilityLabel(Text("SENDING")) }
                    TextField("MESSAGE_INPUT", text: $model.draft)
                        .accessibilityLabel(Text("MESSAGE_INPUT"))
                    Button("SEND") { Task { await model.send(text: model.draft, session: session) } }
                        .disabled(model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || cannotSend)
                    Button("QUICK_REPLIES") { showReplies = true }
                        .disabled(cannotSend)
                }
                .id("conversationContent")
            }
            .onChange(of: model.messages.last?.id) { _ in
                if let id = model.messages.last?.id { proxy.scrollTo(id, anchor: .bottom) }
            }
        }
        .navigationTitle(name)
        .confirmationDialog("QUICK_REPLIES", isPresented: $showReplies, titleVisibility: .visible) {
            ForEach(quickReplies, id: \.self) { key in
                Button(localized(key)) { Task { await model.send(text: localized(key), session: session) } }
            }
            Button("CANCEL", role: .cancel) {}
        }
        .task(id: pollingKey) {
            guard scenePhase == .active else { return }
            while !Task.isCancelled {
                await model.refresh(session: session)
                do { try await Task.sleep(for: .seconds(model.awaitingReply ? 2 : 3)) }
                catch { return }
            }
        }
    }

    private var cannotSend: Bool { model.sending || model.pending != nil || session.expired || !session.ready }
}
