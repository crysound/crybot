import SwiftUI
import CryCore

struct ChatScreen: View {
    let ref: ConversationRef
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Text("ChatScreen").accessibilityIdentifier("Chat.placeholder")
                Spacer()
                if case .bot(let id, _, _) = ref { WebEntryMenu(scope: .bot(id)) }
            }
            .padding()
            if let thread = resolvedThread { ThreadTimelineView(thread: thread, style: .direct) }
        }
    }

    private var resolvedThread: ThreadID? {
        if let thread = ref.thread { return thread }
        if case .bot(let id, _, _) = ref { return store.state.bots.first { $0.id == id }?.threadId }
        return nil
    }
}

struct ThreadTimelineView: View {
    let thread: ThreadID
    let style: TimelineStyle
    @Environment(AppStore.self) private var store
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
                Text("ThreadTimelineView").accessibilityIdentifier("Chat.placeholder")
                ForEach(Array(store.page(thread: thread).messages.enumerated()), id: \.offset) { _, message in
                    MessageBodyView(message: message, context: context)
                }
            }
            .padding()
        }
    }

    private var context: MessageContext {
        let conversation: ConversationRef
        if style == .group {
            let id = store.state.groups.first { $0.threadId == thread }?.id ?? ""
            conversation = .group(id, thread: thread)
        } else {
            let id = store.state.bots.first { $0.threadId == thread }?.id ?? ""
            conversation = .bot(id, thread: thread)
        }
        return MessageContext(conversation: conversation, thread: thread, isStreaming: false,
                              isGroup: style == .group, respond: { try await store.respond($0) },
                              openLink: { _ = openURL($0) }, open: { store.navigate(to: $0) })
    }
}

struct ChatGallery: View {
    var body: some View {
        Text("ChatGallery").accessibilityIdentifier("Chat.placeholder")
    }
}
