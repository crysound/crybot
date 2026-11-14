import SwiftUI
import CryCore

struct MessageLeadingExtras: View {
    let message: WireMessage
    let context: MessageContext

    var body: some View {
        Text("MessageLeadingExtras")
            .accessibilityIdentifier("MessageExtras.placeholder")
    }
}

struct MessageTrailingExtras: View {
    let message: WireMessage
    let context: MessageContext

    var body: some View {
        Text("MessageTrailingExtras")
            .accessibilityIdentifier("MessageExtras.placeholder")
    }
}

struct MessageExtrasGallery: View {
    var body: some View {
        Text("MessageExtrasGallery")
            .accessibilityIdentifier("MessageExtras.placeholder")
    }
}
