import SwiftUI
import CryCore

struct MarkdownView: View {
    let source: String
    let streaming: Bool
    let context: MessageContext

    var body: some View {
        VStack(alignment: .leading) {
            Text("MarkdownView")
            Text(source)
        }
        .accessibilityIdentifier("Markdown.placeholder")
    }
}

struct MarkdownGallery: View {
    var body: some View {
        Text("MarkdownGallery")
            .accessibilityIdentifier("Markdown.placeholder")
    }
}
