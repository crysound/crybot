import SwiftUI
import CryCore

struct CodeBlockView: View {
    let code: String
    let language: String?

    var body: some View {
        Text("CodeBlockView")
            .accessibilityIdentifier("Code.placeholder")
    }
}

struct CodeGallery: View {
    var body: some View {
        Text("CodeGallery")
            .accessibilityIdentifier("Code.placeholder")
    }
}
