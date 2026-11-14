import SwiftUI
import CryCore

struct GroupScreen: View {
    let group: GroupID
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Text("GroupScreen").accessibilityIdentifier("Group.placeholder")
                Spacer()
                WebEntryMenu(scope: .group(group))
            }
            .padding()
            if let thread = selectedThread {
                ThreadTimelineView(thread: thread, style: .group)
            }
        }
    }

    private var selectedThread: ThreadID? {
        if let route = store.path.last, case .conversation(.group(let id, let thread, _)) = route,
           id == group, let thread {
            return thread
        }
        return store.state.groups.first { $0.id == group }?.threadId
    }
}

struct GroupGallery: View {
    var body: some View {
        Text("GroupGallery").accessibilityIdentifier("Group.placeholder")
    }
}
