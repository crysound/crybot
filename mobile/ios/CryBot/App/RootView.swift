import SwiftUI

struct RootView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var loginModel = LoginModel()
    var options = LaunchOptions(arguments: [])

    var body: some View {
        @Bindable var store = store
        Group {
            if let error = store.fixtureError {
                ErrorBanner(message: error)
            } else if let gallery = options.gallery {
                GalleryDestination(name: gallery)
            } else if store.signedIn {
                signedInRoot
            } else {
                LoginFlowView(model: loginModel)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
        .foregroundStyle(Theme.ink)
        .overlay(alignment: .top) { NotifyBannerHost() }
        .fullScreenCover(isPresented: Binding(
            get: { store.webTarget != nil },
            set: { if !$0 { store.webTarget = nil } }
        )) {
            if let target = store.webTarget {
                WebHostScreen(target: target)
                    .environment(store)
            }
        }
    }

    @ViewBuilder private var signedInRoot: some View {
        @Bindable var store = store
        if sizeClass == .regular {
            NavigationSplitView {
                RootTabs(usesNavigationStacks: false)
            } detail: {
                NavigationStack(path: $store.path) {
                    EmptyState(title: ShellText.value("selectConversation"), systemImage: "bubble.left.and.bubble.right")
                        .navigationDestination(for: AppRoute.self) { RouteDestination(route: $0) }
                }
            }
        } else {
            RootTabs()
        }
    }
}

private struct RootTabs: View {
    var usesNavigationStacks = true
    @Environment(AppStore.self) private var store

    var body: some View {
        @Bindable var store = store
        TabView(selection: $store.selectedTab) {
            Group {
                if usesNavigationStacks {
                    NavigationStack(path: $store.chatsPath) {
                        ConversationListView()
                            .navigationDestination(for: AppRoute.self) { RouteDestination(route: $0) }
                    }
                } else {
                    ConversationListView()
                }
            }
            .tabItem {
                Label(ShellText.value("chats"), systemImage: "bubble.left.and.bubble.right")
                    .accessibilityIdentifier("Root.tab.chats")
            }
            .tag(AppStore.RootTab.chats)
            .accessibilityIdentifier("Root.tab.chats")
            Group {
                if usesNavigationStacks {
                    NavigationStack(path: $store.inboxPath) {
                        InboxScreen()
                            .navigationDestination(for: AppRoute.self) { RouteDestination(route: $0) }
                    }
                } else {
                    InboxScreen()
                }
            }
            .tabItem {
                Label(ShellText.value("inbox"), systemImage: "tray")
                    .accessibilityIdentifier("Root.tab.inbox")
            }
            .badge(store.inboxUnreadCount)
            .tag(AppStore.RootTab.inbox)
            .accessibilityIdentifier("Root.tab.inbox")
        }
    }
}

private struct RouteDestination: View {
    let route: AppRoute

    var body: some View {
        switch route {
        case .conversation(let ref):
            switch ref {
            case .bot: ChatScreen(ref: ref)
            case .group(let id, let thread, let focus): GroupScreen(group: id, thread: thread, focus: focus)
            }
        case .inbox: InboxScreen()
        case .notifications: NotificationsScreen()
        case .desktop(let target): DesktopViewer(target: target)
        case .web: EmptyView()
        }
    }
}
