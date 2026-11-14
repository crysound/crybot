import SwiftUI
import CryCore

struct MessageBodyView: View {
    let message: WireMessage
    let context: MessageContext

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            ForEach(MessageLayout.plan(for: message), id: \.self) { part in
                content(for: part)
            }
        }
    }

    private var cardContext: CardContext {
        CardContext(message: context, isPending: message.fields?.requestPending ?? false, respond: context.respond)
    }

    @ViewBuilder private func content(for part: MessagePart) -> some View {
        switch part {
        case .leadingExtras: MessageLeadingExtras(message: message, context: context)
        case .markdown: MarkdownView(source: message.fields?.text ?? "", streaming: context.isStreaming, context: context)
        case .optionsCard: OptionsCardView(message: message, context: cardContext)
        case .connectCard: ConnectCardView(message: message, context: cardContext)
        case .recordRow: RecordRowView(message: message, context: context)
        case .activity: ActivityMessageView(message: message, context: context)
        case .webSummary: WebMessageSummary(message: message, context: context)
        case .updateRequired:
            Label(ShellText.value("updateRequired"), systemImage: "arrow.down.app") // public-scan: allow domain
                .accessibilityIdentifier("Message.updateRequired")
        case .attachments: AttachmentsView(attachments: MessageLayout.attachments(for: message), context: context)
        case .trailingExtras: MessageTrailingExtras(message: message, context: context)
        }
    }
}
