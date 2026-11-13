import Foundation
import SwiftUI

@MainActor
final class ConversationModel: ObservableObject {
    @Published private(set) var messages: [WatchMessage]
    @Published private(set) var sending = false
    @Published private(set) var pending: SendMessage?
    @Published private(set) var queued = false
    @Published private(set) var awaitingReply = false
    @Published private(set) var errorKey: String?
    @Published var draft = ""
    private let api = APIClient.shared
    private let botId: String
    private var threadId: String
    private var repliesBeforeSend: [WatchMessage] = []
    private var sentMessageId: String?
    private var acceptedSendId: String?

    init(bot: WatchBot, threadId: String) {
        botId = bot.id
        self.threadId = threadId
        messages = Array((bot.messages ?? []).sorted { $0.at < $1.at }.suffix(20))
    }

    func refresh(session: Session) async {
        guard let credentials = session.currentCredentials() else { return }
        do {
            let latest = try await api.messages(threadId: threadId, credentials: credentials)
            guard !Task.isCancelled, session.credentials == credentials else { return }
            messages = Array(latest.sorted { $0.at < $1.at }.suffix(20))
            if awaitingReply {
                let userMessage = messages.first { $0.sendId == acceptedSendId && $0.role == "user" }
                if let userMessage { sentMessageId = userMessage.id }
                let userIndex = messages.firstIndex { $0.id == sentMessageId }
                let following = userIndex.map { Array(messages.dropFirst($0 + 1)) } ?? []
                let related = messages.filter { sentMessageId != nil && $0.requestMessageId == sentMessageId }
                if (following + related).contains(where: { $0.role == "bot" && $0.kind == "text" && !repliesBeforeSend.contains($0) }) {
                    awaitingReply = false
                    queued = false
                }
            }
            if pending == nil { errorKey = nil }
        } catch is CancellationError {
        } catch {
            guard session.credentials == credentials else { return }
            session.report(error)
            errorKey = (error as? WatchAPIError)?.localizationKey ?? "CANNOT_CONNECT"
        }
    }

    func send(text: String, session: Session) async {
        guard pending == nil, !sending else { return }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        pending = SendMessage(text: trimmed, threadId: threadId)
        repliesBeforeSend = messages.filter { $0.role == "bot" }
        draft = ""
        await retry(session: session)
    }

    func retry(session: Session) async {
        guard let pending, !sending else { return }
        guard let credentials = session.currentCredentials() else {
            errorKey = "LOGIN_EXPIRED"
            return
        }
        sending = true
        errorKey = nil
        defer { sending = false }
        do {
            let result = try await api.send(botId: botId, message: pending, credentials: credentials)
            guard session.credentials == credentials else { return }
            self.pending = nil
            threadId = result.threadId
            queued = result.queued == true
            acceptedSendId = pending.sendId
            sentMessageId = result.message?.id
            awaitingReply = true
            if let message = result.message, !messages.contains(where: { $0.id == message.id }) {
                messages = Array((messages + [message]).suffix(20))
            }
        } catch {
            guard session.credentials == credentials else { return }
            session.report(error)
            errorKey = (error as? WatchAPIError)?.localizationKey ?? "CANNOT_CONNECT"
        }
    }
}
