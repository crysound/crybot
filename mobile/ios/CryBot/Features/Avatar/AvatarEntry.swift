import SwiftUI
import CryCore

struct BotAvatar: View {
    let bot: WireBot
    let size: CGFloat

    var body: some View {
        Text("BotAvatar")
            .accessibilityIdentifier("Avatar.placeholder")
    }
}

struct PersonAvatar: View {
    let person: PersonRef
    let size: CGFloat

    var body: some View {
        Text("PersonAvatar")
            .accessibilityIdentifier("Avatar.placeholder")
    }
}

struct AvatarGallery: View {
    var body: some View {
        Text("AvatarGallery")
            .accessibilityIdentifier("Avatar.placeholder")
    }
}
