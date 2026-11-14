import SwiftUI
import CryCore

struct InboxScreen: View {

    var body: some View {
        Text("InboxScreen")
            .accessibilityIdentifier("Inbox.placeholder")
    }
}

struct NotificationsScreen: View {

    var body: some View {
        Text("NotificationsScreen")
            .accessibilityIdentifier("Inbox.placeholder")
    }
}

struct NotifyBannerHost: View {

    var body: some View {
        Text("NotifyBannerHost")
            .font(.caption2)
            .accessibilityIdentifier("Inbox.placeholder")
            .allowsHitTesting(false)
    }
}

struct InboxGallery: View {
    var body: some View {
        Text("InboxGallery")
            .accessibilityIdentifier("Inbox.placeholder")
    }
}
