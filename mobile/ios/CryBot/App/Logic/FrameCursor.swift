import Foundation
import CryCore

enum FrameCursor {
    static func value(for frame: ServerFrame, previous: String?) -> String? {
        if case .hello(let hello) = frame { return hello.cursor }
        guard let previous, let separator = previous.lastIndex(of: ":"),
              case .number(let raw) = additionalFields(for: frame)["seq"],
              let seq = Int64("\(raw)"), seq >= 0, seq <= 9_007_199_254_740_991 else { return nil }
        return "\(previous[..<separator]):\(seq)"
    }

    private static func additionalFields(for frame: ServerFrame) -> [String: JSONValue] {
        switch frame {
        case .sections(let value): return value.additionalFields
        case .botQueued(let value): return value.additionalFields
        case .message(let value): return value.additionalFields
        case .messagePatch(let value): return value.additionalFields
        case .thread(let value): return value.additionalFields
        case .bot(let value): return value.additionalFields
        case .group(let value): return value.additionalFields
        case .notify(let value): return value.additionalFields
        case .notificationsRead(let value): return value.additionalFields
        case .groupDeleted(let value): return value.additionalFields
        case .routine(let value): return value.additionalFields
        case .routineDeleted(let value): return value.additionalFields
        case .routineRun(let value): return value.additionalFields
        case .webhook(let value): return value.additionalFields
        case .webhookAttempt(let value): return value.additionalFields
        case .webhookDeleted(let value): return value.additionalFields
        case .appTrigger(let value): return value.additionalFields
        case .appTriggerAttempt(let value): return value.additionalFields
        case .appTriggerDeleted(let value): return value.additionalFields
        case .appTriggerService(let value): return value.additionalFields
        case .runtime(let value): return value.additionalFields
        case .mcpChanged(let value): return value.additionalFields
        case .screen(let value): return value.additionalFields
        case .computer(let value): return value.additionalFields
        case .computerControl(let value): return value.additionalFields
        case .data(let value): return value.additionalFields
        case .botDeleted(let value): return value.additionalFields
        case .botsOrder(let value): return value.additionalFields
        case .groupsOrder(let value): return value.additionalFields
        case .liveCall(let value): return value.additionalFields
        case .deviceJob(let value): return value.additionalFields
        case .teamPresence(let value): return value.additionalFields
        case .threadPresence(let value): return value.additionalFields
        case .teamPeople(let value): return value.additionalFields
        case .config(let value): return value.additionalFields
        case .hello(let value): return value.additionalFields
        case .ping(let value): return value.additionalFields
        case .snapshot(let value): return value.additionalFields
        case .unknown(_, let raw): return raw.objectValue ?? [:]
        }
    }
}
