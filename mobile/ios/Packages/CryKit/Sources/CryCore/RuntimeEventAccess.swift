import Foundation

public extension RuntimeEvent {
    var threadID: String? {
        switch self {
        case .`sessionStarted`(let value): return value.threadId
        case .`sessionModelVariants`(let value): return value.threadId
        case .`sessionExited`(let value): return value.threadId
        case .`turnStarted`(let value): return value.threadId
        case .`turnRetrying`(let value): return value.threadId
        case .`turnCompleted`(let value): return value.threadId
        case .`capExhausted`(let value): return value.threadId
        case .`turnWaitStarted`(let value): return value.threadId
        case .`turnWaitEnded`(let value): return value.threadId
        case .`itemStarted`(let value): return value.threadId
        case .`itemUpdated`(let value): return value.threadId
        case .`itemOutput`(let value): return value.threadId
        case .`turnProgress`(let value): return value.threadId
        case .`itemCompleted`(let value): return value.threadId
        case .`contentDelta`(let value): return value.threadId
        case .`requestOpened`(let value): return value.threadId
        case .`requestResolved`(let value): return value.threadId
        case .`threadTokenUsageUpdated`(let value): return value.threadId
        case .`runtimeError`(let value): return value.threadId
        case .`runtimeNotice`(let value): return value.threadId
        case .`contextCompacted`(let value): return value.threadId
        case .unknown: return nil
        }
    }
    var eventID: String? {
        switch self {
        case .`sessionStarted`(let value): return value.eventId
        case .`sessionModelVariants`(let value): return value.eventId
        case .`sessionExited`(let value): return value.eventId
        case .`turnStarted`(let value): return value.eventId
        case .`turnRetrying`(let value): return value.eventId
        case .`turnCompleted`(let value): return value.eventId
        case .`capExhausted`(let value): return value.eventId
        case .`turnWaitStarted`(let value): return value.eventId
        case .`turnWaitEnded`(let value): return value.eventId
        case .`itemStarted`(let value): return value.eventId
        case .`itemUpdated`(let value): return value.eventId
        case .`itemOutput`(let value): return value.eventId
        case .`turnProgress`(let value): return value.eventId
        case .`itemCompleted`(let value): return value.eventId
        case .`contentDelta`(let value): return value.eventId
        case .`requestOpened`(let value): return value.eventId
        case .`requestResolved`(let value): return value.eventId
        case .`threadTokenUsageUpdated`(let value): return value.eventId
        case .`runtimeError`(let value): return value.eventId
        case .`runtimeNotice`(let value): return value.eventId
        case .`contextCompacted`(let value): return value.eventId
        case .unknown: return nil
        }
    }
}
