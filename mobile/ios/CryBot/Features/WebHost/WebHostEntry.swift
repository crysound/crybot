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
    var body: some View {
        WebHostScreen(target: .settings(nil))
    }
}
