import SwiftUI
import CryCore

struct MathView: View {
    let latex: String
    let display: Bool

    var body: some View {
        Text("MathView")
            .accessibilityIdentifier("Math.placeholder")
    }
}

struct MathGallery: View {
    var body: some View {
        Text("MathGallery")
            .accessibilityIdentifier("Math.placeholder")
    }
}
