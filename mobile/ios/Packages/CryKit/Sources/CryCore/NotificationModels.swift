import Foundation

public struct NotificationLogEntry: WireModel {
    public var `kind`: NotifyKind
    public var `botId`: String
    public var `botName`: String
    public var `threadId`: String
    public var `title`: String
    public var `body`: String
    public var `avatarUrl`: String?
    public var `groupId`: String?
    public var `forPerson`: String?
    public var `id`: String
    public var `at`: Double
    public var `read`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `kind`: NotifyKind,
        `botId`: String,
        `botName`: String,
        `threadId`: String,
        `title`: String,
        `body`: String,
        `id`: String,
        `at`: Double,
        `read`: Bool,
        `avatarUrl`: String? = nil,
        `groupId`: String? = nil,
        `forPerson`: String? = nil
    ) {
        self.`kind` = `kind`
        self.`botId` = `botId`
        self.`botName` = `botName`
        self.`threadId` = `threadId`
        self.`title` = `title`
        self.`body` = `body`
        self.`avatarUrl` = `avatarUrl`
        self.`groupId` = `groupId`
        self.`forPerson` = `forPerson`
        self.`id` = `id`
        self.`at` = `at`
        self.`read` = `read`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `botId` = try object.required("botId")
        `botName` = try object.required("botName")
        `threadId` = try object.required("threadId")
        `title` = try object.required("title")
        `body` = try object.required("body")
        `avatarUrl` = try object.optional("avatarUrl")
        `groupId` = try object.optional("groupId")
        `forPerson` = try object.optional("forPerson")
        `id` = try object.required("id")
        `at` = try object.required("at")
        `read` = try object.required("read")
        additionalFields = object.remainder(excluding: ["kind", "botId", "botName", "threadId", "title", "body", "avatarUrl", "groupId", "forPerson", "id", "at", "read"])
        explicitNulls = object.nullKeys.intersection(["kind", "botId", "botName", "threadId", "title", "body", "avatarUrl", "groupId", "forPerson", "id", "at", "read"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.put("botId", `botId`)
        try object.put("botName", `botName`)
        try object.put("threadId", `threadId`)
        try object.put("title", `title`)
        try object.put("body", `body`)
        try object.putOptional("avatarUrl", `avatarUrl`, nulls: explicitNulls)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.putOptional("forPerson", `forPerson`, nulls: explicitNulls)
        try object.put("id", `id`)
        try object.put("at", `at`)
        try object.put("read", `read`)
        try object.encode(to: encoder)
    }
}

public enum NotifyKind: WireModel, Hashable, Sendable {
    case `approval`
    case `question`
    case `done`
    case `routineFailed`
    case `routineDeferred`
    case `turnFailed`
    case `incident`
    case `signIn`
    case `secret`
    case `delegationSettled`
    case `mention`
    case `spend`
    case `brief`
    case `wait`
    case `notice`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "approval": self = .`approval`
        case "question": self = .`question`
        case "done": self = .`done`
        case "routine-failed": self = .`routineFailed`
        case "routine-deferred": self = .`routineDeferred`
        case "turn-failed": self = .`turnFailed`
        case "incident": self = .`incident`
        case "sign-in": self = .`signIn`
        case "secret": self = .`secret`
        case "delegation-settled": self = .`delegationSettled`
        case "mention": self = .`mention`
        case "spend": self = .`spend`
        case "brief": self = .`brief`
        case "wait": self = .`wait`
        case "notice": self = .`notice`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`approval`: return "approval"
        case .`question`: return "question"
        case .`done`: return "done"
        case .`routineFailed`: return "routine-failed"
        case .`routineDeferred`: return "routine-deferred"
        case .`turnFailed`: return "turn-failed"
        case .`incident`: return "incident"
        case .`signIn`: return "sign-in"
        case .`secret`: return "secret"
        case .`delegationSettled`: return "delegation-settled"
        case .`mention`: return "mention"
        case .`spend`: return "spend"
        case .`brief`: return "brief"
        case .`wait`: return "wait"
        case .`notice`: return "notice"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
