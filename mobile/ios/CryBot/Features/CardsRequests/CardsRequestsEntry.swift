import SwiftUI
import CryCore

struct RequestCardBody: View {
    let card: OptionCardData
    let kind: RequestCardKind
    let context: CardContext

    var body: some View {
        Text("RequestCardBody")
            .accessibilityIdentifier("CardsRequests.placeholder")
    }
}

struct CardsRequestsGallery: View {
    var body: some View {
        Text("CardsRequestsGallery")
            .accessibilityIdentifier("CardsRequests.placeholder")
    }
}
