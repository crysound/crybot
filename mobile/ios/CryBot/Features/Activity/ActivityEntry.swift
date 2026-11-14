import SwiftUI
import CryCore

struct ActivityMessageView: View {
    let message: WireMessage
    let context: MessageContext

    var body: some View {
        Text("ActivityMessageView")
            .accessibilityIdentifier("Activity.placeholder")
    }
}

struct RuntimeItemsView: View {
    let thread: ThreadID

    var body: some View {
        Text("RuntimeItemsView")
            .accessibilityIdentifier("Activity.placeholder")
    }
}

struct ActivityGallery: View {
    var body: some View {
        Text("ActivityGallery")
            .accessibilityIdentifier("Activity.placeholder")
    }
}
