import SwiftUI
import CryCore

struct RecordRowView: View {
    let message: WireMessage
    let context: MessageContext

    var body: some View {
        Text("RecordRowView")
            .accessibilityIdentifier("Records.placeholder")
    }
}

struct RecordsGallery: View {
    var body: some View {
        Text("RecordsGallery")
            .accessibilityIdentifier("Records.placeholder")
    }
}
