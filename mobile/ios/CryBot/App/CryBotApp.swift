import SwiftUI

@main
struct CryBotApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @State private var store: AppStore
    private let options: LaunchOptions

    @MainActor
    init() {
        let options = LaunchOptions()
        self.options = options
        if let scenario = options.fixtureScenario {
            _store = State(initialValue: AppStore.fixture(scenario: scenario))
        } else if options.gallery != nil {
            _store = State(initialValue: AppStore.fixture(scenario: "shell-basic"))
        } else {
            _store = State(initialValue: AppStore())
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView(options: options)
                .environment(store)
                .preferredColorScheme(colorScheme)
                .tint(Theme.accent)
                .onOpenURL { url in _ = LoginRouter.handle(url: url) }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL { _ = LoginRouter.handle(url: url) }
                }
                .onChange(of: scenePhase, initial: true) { _, phase in
                    switch phase {
                    case .active:
                        if !store.isFixture { WatchSync.shared.refresh() }
                        store.resumeRealtime()
                    case .background: store.pauseRealtime()
                    default: break
                    }
                }
        }
    }

    private var colorScheme: ColorScheme? {
        switch options.appearance {
        case .light: return .light
        case .dark: return .dark
        case nil: return nil
        }
    }
}
