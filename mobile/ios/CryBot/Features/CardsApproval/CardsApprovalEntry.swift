import SwiftUI
import CryCore

struct OptionsCardView: View {
    let message: WireMessage
    let context: CardContext

    var body: some View {
        Text("OptionsCardView")
            .accessibilityIdentifier("CardsApproval.placeholder")
    }
}

struct CardsApprovalGallery: View {
    var body: some View {
        Text("CardsApprovalGallery")
            .accessibilityIdentifier("CardsApproval.placeholder")
    }
}
