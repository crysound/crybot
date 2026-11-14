import SwiftUI
import CryCore

struct ConversationListView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        List {
            Text("ConversationListView").accessibilityIdentifier("Sidebar.placeholder")
            ForEach(store.state.bots, id: \.id) { bot in
                Button(bot.name) {
                    store.navigate(to: .conversation(.bot(bot.id, thread: bot.threadId)))
                }
                .accessibilityIdentifier("Sidebar.bot.\(bot.id)")
            }
            ForEach(store.state.groups, id: \.id) { group in
                Button(group.name) {
                    store.navigate(to: .conversation(.group(group.id, thread: group.threadId)))
                }
                .accessibilityIdentifier("Sidebar.group.\(group.id)")
            }
        }
        .navigationTitle(ShellText.value("chats"))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { WebEntryMenu(scope: .global) }
        }
    }
}

struct SidebarGallery: View {
    var body: some View { ConversationListView() }
}
