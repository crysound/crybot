import SwiftUI
import CryCore

struct ComposerView: View {
    let target: ComposerTarget

    var body: some View {
        Text("ComposerView")
            .accessibilityIdentifier("Composer.placeholder")
    }
}

struct ComposerGallery: View {
    var body: some View {
        Text("ComposerGallery")
            .accessibilityIdentifier("Composer.placeholder")
    }
}
