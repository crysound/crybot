import SwiftUI
import CryCore

struct WebHostScreen: View {
    let target: WebHostTarget
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
                    Text("WebHostScreen")
                    Text(String(describing: target))
                        .font(Theme.Fonts.caption)
                }
                .padding()
                .accessibilityIdentifier("WebHost.placeholder")
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(ShellText.value("close")) { dismiss() }
                        .accessibilityIdentifier("WebHost.close")
                }
            }
        }
    }
}

struct WebEntryMenu: View {
    let scope: WebEntryScope
    @Environment(AppStore.self) private var store

    var body: some View {
        Menu {
            switch scope {
            case .global:
                entry("settings", target: .settings(nil))
                entry("newBot", target: .newBot)
            case .bot(let id):
                entry("botSettings", target: .botSettings(id, nil))
                entry("botPanel", target: .botPanel(id, nil))
            case .group:
                entry("teamMap", target: .teamMap)
                entry("files", target: .files)
            }
        } label: {
            Label(ShellText.value("more"), systemImage: "ellipsis.circle")
        }
        .accessibilityIdentifier("WebHost.placeholder")
    }

    private func entry(_ key: String, target: WebHostTarget) -> some View {
        Button(ShellText.value(key)) { store.navigate(to: .web(target)) }
            .accessibilityIdentifier("WebHost.\(key)")
    }
}

struct WebMessageSummary: View {
    let message: WireMessage
    let context: MessageContext

    var body: some View {
        HStack {
            Text(ShellText.value(message.kind == "widget" ? "widget" : "app"))
            Spacer()
            Button(ShellText.value("open")) {
                if let id = message.id { context.open(.web(.message(context.conversation, id))) }
            }
            .disabled(message.id == nil)
            .accessibilityIdentifier("WebHost.open.\(message.id ?? "unknown")")
        }
        .accessibilityIdentifier("WebHost.placeholder")
    }
}

struct WebHostGallery: View {
    enum Scene: Hashable { case screen, menu, summary }
    @Environment(AppStore.self) private var store
    @State private var scene: Scene

    init(scene: Scene = .screen) { _scene = State(initialValue: scene) }

    var body: some View {
        TabView(selection: $scene) {
            WebHostScreen(target: .settings(nil))
                .tabItem { Text("WebHostScreen") }
                .accessibilityIdentifier("WebHostGallery.screen")
                .tag(Scene.screen)
            NavigationStack {
                VStack(spacing: Theme.Spacing.medium) {
                    WebEntryMenu(scope: .global)
                    WebEntryMenu(scope: .bot("bot-1"))
                    WebEntryMenu(scope: .group("group-1"))
                }
            }
            .tabItem { Text("WebEntryMenu") }
            .accessibilityIdentifier("WebHostGallery.menu")
            .tag(Scene.menu)
            NavigationStack {
                VStack(spacing: Theme.Spacing.medium) {
                    WebMessageSummary(message: .widget(WireMessageFields(id: "message-3", role: .bot, at: 3)), context: context)
                    WebMessageSummary(message: .app(WireMessageFields(id: "message-4", role: .bot, at: 4)), context: context)
                }
                .padding()
            }
            .tabItem { Text("WebMessageSummary") }
            .accessibilityIdentifier("WebHostGallery.summary")
            .tag(Scene.summary)
        }
    }

    private var context: MessageContext {
        MessageContext(conversation: .bot("bot-1", thread: "thread-1"), thread: "thread-1",
                       isStreaming: false, isGroup: false, respond: { try await store.respond($0) },
                       openLink: { _ in }, open: { store.navigate(to: $0) })
    }
}
