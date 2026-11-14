import SwiftUI
import CryCore

struct AttachmentsView: View {
    let attachments: [WireAttachment]
    let context: MessageContext

    var body: some View {
        Text("AttachmentsView")
            .accessibilityIdentifier("Media.placeholder")
    }
}

struct MediaGallery: View {
    var body: some View {
        Text("MediaGallery")
            .accessibilityIdentifier("Media.placeholder")
    }
}
