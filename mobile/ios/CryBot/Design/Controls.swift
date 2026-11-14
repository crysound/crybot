import SwiftUI

struct CardContainer<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        content
            .padding(Theme.Spacing.medium)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.Radius.card))
    }
}

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(Theme.Fonts.headline)
            .accessibilityAddTraits(.isHeader)
    }
}

struct EmptyState: View {
    let title: String
    let systemImage: String

    var body: some View {
        ContentUnavailableView(title, systemImage: systemImage)
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "exclamationmark.triangle")
            .foregroundStyle(Theme.danger)
            .padding(Theme.Spacing.medium)
            .accessibilityIdentifier("Design.error")
    }
}

struct LoadingRow: View {
    var body: some View {
        ProgressView(ShellText.value("loading"))
            .accessibilityIdentifier("Design.loading")
    }
}
