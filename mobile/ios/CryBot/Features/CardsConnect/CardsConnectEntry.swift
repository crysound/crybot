import SwiftUI
import CryCore

struct ConnectCardView: View {
    let message: WireMessage
    let context: CardContext

    var body: some View {
        Text("ConnectCardView")
            .accessibilityIdentifier("CardsConnect.placeholder")
    }
}

struct CardsConnectGallery: View {
    var body: some View {
        Text("CardsConnectGallery")
            .accessibilityIdentifier("CardsConnect.placeholder")
    }
}
