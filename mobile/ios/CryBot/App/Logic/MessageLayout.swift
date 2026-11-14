import Foundation
import CryCore

enum MessagePart: Hashable {
    case leadingExtras
    case markdown
    case optionsCard
    case connectCard
    case recordRow
    case activity
    case webSummary
    case updateRequired
    case attachments
    case trailingExtras
}

enum MessageLayout {
    static func plan(for message: WireMessage) -> [MessagePart] {
        let body: MessagePart
        switch message {
        case .text: body = .markdown
        case .options: body = .optionsCard
        case .connector, .secret, .signin: body = .connectCard
        case .routineRun, .goalRun, .burst, .digest, .compaction, .call, .screen: body = .recordRow
        case .activity: body = .activity
        case .widget, .app: body = .webSummary
        case .unknown: body = .updateRequired
        }
        var parts: [MessagePart] = [.leadingExtras, body]
        if !attachments(for: message).isEmpty { parts.append(.attachments) }
        parts.append(.trailingExtras)
        return parts
    }

    static func attachments(for message: WireMessage) -> [WireAttachment] {
        if case .unknown(_, let raw) = message {
            return (try? raw["attachments"]?.decode([WireAttachment].self)) ?? []
        }
        return message.fields?.attachments ?? []
    }
}
