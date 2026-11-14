import Foundation
import CryCore

struct PersonRef: Hashable {
    var id: String?
    var name: String
    var email: String?
    var imageURL: URL?
    var color: String?

    init(id: String? = nil, name: String, email: String? = nil, imageURL: URL? = nil, color: String? = nil) {
        self.id = id
        self.name = name
        self.email = email
        self.imageURL = imageURL
        self.color = color
    }

    init(sender: ResolvedSender) {
        self.init(id: sender.id, name: sender.name)
    }

    init(relay: WireMessageFieldsRelay) {
        self.init(name: relay.name, email: relay.email)
    }

    init(member: [String: JSONValue]) {
        self.init(id: member["id"]?.stringValue,
                  name: member["name"]?.stringValue ?? member["email"]?.stringValue ?? "",
                  email: member["email"]?.stringValue,
                  imageURL: member["avatarUrl"]?.stringValue.flatMap(URL.init(string:)),
                  color: member["color"]?.stringValue)
    }
}

enum ConversationRef: Hashable {
    case bot(BotID, thread: ThreadID?, focus: MessageID? = nil)
    case group(GroupID, thread: ThreadID?, focus: MessageID? = nil)

    var thread: ThreadID? {
        switch self {
        case .bot(_, let thread, _), .group(_, let thread, _): return thread
        }
    }

    var focus: MessageID? {
        switch self {
        case .bot(_, _, let focus), .group(_, _, let focus): return focus
        }
    }

    var isGroup: Bool {
        if case .group = self { return true }
        return false
    }
}

struct ComposerTarget: Hashable {
    var conversation: ConversationRef
    var thread: ThreadID
    var replyTo: MessageID? = nil
}

struct RespondAction: Hashable {
    var thread: ThreadID
    var body: RespondBody

    func hash(into hasher: inout Hasher) {
        hasher.combine(thread)
        hasher.combine(body.requestId)
    }
}

struct WidgetAction: Hashable {
    var action: String
    var values: [String: JSONValue] = [:]

    func hash(into hasher: inout Hasher) { hasher.combine(action) }
}

struct MessageContext {
    var conversation: ConversationRef
    var thread: ThreadID
    var isStreaming: Bool
    var isGroup: Bool
    var respond: (RespondAction) async throws -> Void
    var openLink: (URL) -> Void
    var open: (AppRoute) -> Void
}

struct CardContext {
    var message: MessageContext
    var isPending: Bool
    var respond: (RespondAction) async throws -> Void
}

struct WidgetContext {
    var message: MessageContext
    var submit: (WidgetAction) async throws -> Void
}

enum TimelineStyle: Hashable { case direct, group }

struct DesktopTarget: Hashable {
    var bot: BotID
    var desktopID: String? = nil
}

struct CallRef: Hashable {
    var bot: BotID
    var callID: String? = nil
}

enum McpScope: Hashable { case global, bot(BotID) }

enum AppRoute: Hashable {
    case conversation(ConversationRef)
    case inbox
    case notifications
    case desktop(DesktopTarget)
    case web(WebHostTarget)
}

enum WebHostTarget: Hashable {
    case settings(SettingsPageID?)
    case botSettings(BotID, BotSettingsSection?)
    case botPanel(BotID, PanelTarget?)
    case newBot
    case automations(id: String?)
    case files
    case teamMap
    case mcp(McpScope)
    case plugins
    case webPanel
    case publishedApps
    case browser(BotID)
    case phone(PhoneDeviceID)
    case computer(BotID)
    case call(CallRef)
    case message(ConversationRef, MessageID)

    func hash(into hasher: inout Hasher) {
        switch self {
        case .settings(let page): hasher.combine(0); hasher.combine(page)
        case .botSettings(let bot, let section): hasher.combine(1); hasher.combine(bot); hasher.combine(section)
        case .botPanel(let bot, let panel):
            hasher.combine(2)
            hasher.combine(bot)
            hasher.combine(panel?.tab)
            hasher.combine(panel?.page)
            hasher.combine(panel?.anchor)
            hasher.combine(panel?.editInstructions)
        case .newBot: hasher.combine(3)
        case .automations(let id): hasher.combine(4); hasher.combine(id)
        case .files: hasher.combine(5)
        case .teamMap: hasher.combine(6)
        case .mcp(let scope): hasher.combine(7); hasher.combine(scope)
        case .plugins: hasher.combine(8)
        case .webPanel: hasher.combine(9)
        case .publishedApps: hasher.combine(10)
        case .browser(let bot): hasher.combine(11); hasher.combine(bot)
        case .phone(let device): hasher.combine(12); hasher.combine(device)
        case .computer(let bot): hasher.combine(13); hasher.combine(bot)
        case .call(let call): hasher.combine(14); hasher.combine(call)
        case .message(let conversation, let message):
            hasher.combine(15); hasher.combine(conversation); hasher.combine(message)
        }
    }
}

enum WebEntryScope: Hashable {
    case global
    case bot(BotID)
    case group(GroupID)
}
