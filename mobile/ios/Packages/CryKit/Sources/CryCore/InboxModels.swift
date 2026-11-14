import Foundation

public struct InboxItem: WireModel {
    public var `kind`: InboxItemKind
    public var `from`: InboxItemFrom
    public var `via`: InboxItemVia?
    public var `origin`: InboxItemOrigin?
    public var `replies`: Bool?
    public var `assistant`: Bool?
    public var `answers`: [InboxItemAnswersElement]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `kind`: InboxItemKind,
        `from`: InboxItemFrom,
        `via`: InboxItemVia? = nil,
        `origin`: InboxItemOrigin? = nil,
        `replies`: Bool? = nil,
        `assistant`: Bool? = nil,
        `answers`: [InboxItemAnswersElement]? = nil
    ) {
        self.`kind` = `kind`
        self.`from` = `from`
        self.`via` = `via`
        self.`origin` = `origin`
        self.`replies` = `replies`
        self.`assistant` = `assistant`
        self.`answers` = `answers`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `from` = try object.required("from")
        `via` = try object.optional("via")
        `origin` = try object.optional("origin")
        `replies` = try object.optional("replies")
        `assistant` = try object.optional("assistant")
        `answers` = try object.optional("answers")
        additionalFields = object.remainder(excluding: ["kind", "from", "via", "origin", "replies", "assistant", "answers"])
        explicitNulls = object.nullKeys.intersection(["kind", "from", "via", "origin", "replies", "assistant", "answers"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.put("from", `from`)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.putOptional("origin", `origin`, nulls: explicitNulls)
        try object.putOptional("replies", `replies`, nulls: explicitNulls)
        try object.putOptional("assistant", `assistant`, nulls: explicitNulls)
        try object.putOptional("answers", `answers`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum InboxItemKind: WireModel, Hashable, Sendable {
    case `message`
    case `ask`
    case `result`
    case `notice`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "message": self = .`message`
        case "ask": self = .`ask`
        case "result": self = .`result`
        case "notice": self = .`notice`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`message`: return "message"
        case .`ask`: return "ask"
        case .`result`: return "result"
        case .`notice`: return "notice"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct InboxItemFrom: WireModel {
    public var `name`: String
    public var `email`: String?
    public var `botId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `email`: String? = nil, `botId`: String? = nil) {
        self.`name` = `name`
        self.`email` = `email`
        self.`botId` = `botId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `email` = try object.optional("email")
        `botId` = try object.optional("botId")
        additionalFields = object.remainder(excluding: ["name", "email", "botId"])
        explicitNulls = object.nullKeys.intersection(["name", "email", "botId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("email", `email`, nulls: explicitNulls)
        try object.putOptional("botId", `botId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct InboxItemVia: WireModel {
    public var `botId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct InboxItemOrigin: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `title`: String
    public var `groupId`: String?
    public var `messageId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `threadId`: String,
        `title`: String,
        `groupId`: String? = nil,
        `messageId`: String? = nil
    ) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`title` = `title`
        self.`groupId` = `groupId`
        self.`messageId` = `messageId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `title` = try object.required("title")
        `groupId` = try object.optional("groupId")
        `messageId` = try object.optional("messageId")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "title", "groupId", "messageId"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "title", "groupId", "messageId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("title", `title`)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.putOptional("messageId", `messageId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct InboxItemAnswersElement: WireModel {
    public var `by`: InboxItemAnswersElementBy
    public var `text`: String
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`by`: InboxItemAnswersElementBy, `text`: String, `at`: Double) {
        self.`by` = `by`
        self.`text` = `text`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `by` = try object.required("by")
        `text` = try object.required("text")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["by", "text", "at"])
        explicitNulls = object.nullKeys.intersection(["by", "text", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("by", `by`)
        try object.put("text", `text`)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public enum InboxItemAnswersElementBy: WireModel, Hashable, Sendable {
    case `person`
    case `assistant`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "person": self = .`person`
        case "assistant": self = .`assistant`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`person`: return "person"
        case .`assistant`: return "assistant"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct InboxRow: WireModel {
    public var `id`: String
    public var `kind`: InboxRowKind
    public var `tab`: InboxTab
    public var `from`: InboxRowFrom
    public var `via`: InboxRowVia?
    public var `workingFor`: InboxRowWorkingFor?
    public var `askedBy`: InboxRowAskedBy?
    public var `origin`: InboxRowOrigin?
    public var `text`: String
    public var `at`: Double
    public var `unread`: Bool
    public var `replies`: Bool?
    public var `answers`: [InboxRowAnswersElement]?
    public var `card`: OptionCardData?
    public var `secret`: SecretRequestCardData?
    public var `signIn`: SignInRequestCardData?
    public var `connector`: ConnectorCardData?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `kind`: InboxRowKind,
        `tab`: InboxTab,
        `from`: InboxRowFrom,
        `text`: String,
        `at`: Double,
        `unread`: Bool,
        `via`: InboxRowVia? = nil,
        `workingFor`: InboxRowWorkingFor? = nil,
        `askedBy`: InboxRowAskedBy? = nil,
        `origin`: InboxRowOrigin? = nil,
        `replies`: Bool? = nil,
        `answers`: [InboxRowAnswersElement]? = nil,
        `card`: OptionCardData? = nil,
        `secret`: SecretRequestCardData? = nil,
        `signIn`: SignInRequestCardData? = nil,
        `connector`: ConnectorCardData? = nil
    ) {
        self.`id` = `id`
        self.`kind` = `kind`
        self.`tab` = `tab`
        self.`from` = `from`
        self.`via` = `via`
        self.`workingFor` = `workingFor`
        self.`askedBy` = `askedBy`
        self.`origin` = `origin`
        self.`text` = `text`
        self.`at` = `at`
        self.`unread` = `unread`
        self.`replies` = `replies`
        self.`answers` = `answers`
        self.`card` = `card`
        self.`secret` = `secret`
        self.`signIn` = `signIn`
        self.`connector` = `connector`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `kind` = try object.required("kind")
        `tab` = try object.required("tab")
        `from` = try object.required("from")
        `via` = try object.optional("via")
        `workingFor` = try object.optional("workingFor")
        `askedBy` = try object.optional("askedBy")
        `origin` = try object.optional("origin")
        `text` = try object.required("text")
        `at` = try object.required("at")
        `unread` = try object.required("unread")
        `replies` = try object.optional("replies")
        `answers` = try object.optional("answers")
        `card` = try object.optional("card")
        `secret` = try object.optional("secret")
        `signIn` = try object.optional("signIn")
        `connector` = try object.optional("connector")
        additionalFields = object.remainder(excluding: ["id", "kind", "tab", "from", "via", "workingFor", "askedBy", "origin", "text", "at", "unread", "replies", "answers", "card", "secret", "signIn", "connector"])
        explicitNulls = object.nullKeys.intersection(["id", "kind", "tab", "from", "via", "workingFor", "askedBy", "origin", "text", "at", "unread", "replies", "answers", "card", "secret", "signIn", "connector"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("kind", `kind`)
        try object.put("tab", `tab`)
        try object.put("from", `from`)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.putOptional("workingFor", `workingFor`, nulls: explicitNulls)
        try object.putOptional("askedBy", `askedBy`, nulls: explicitNulls)
        try object.putOptional("origin", `origin`, nulls: explicitNulls)
        try object.put("text", `text`)
        try object.put("at", `at`)
        try object.put("unread", `unread`)
        try object.putOptional("replies", `replies`, nulls: explicitNulls)
        try object.putOptional("answers", `answers`, nulls: explicitNulls)
        try object.putOptional("card", `card`, nulls: explicitNulls)
        try object.putOptional("secret", `secret`, nulls: explicitNulls)
        try object.putOptional("signIn", `signIn`, nulls: explicitNulls)
        try object.putOptional("connector", `connector`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum InboxRowKind: WireModel, Hashable, Sendable {
    case `message`
    case `ask`
    case `result`
    case `notice`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "message": self = .`message`
        case "ask": self = .`ask`
        case "result": self = .`result`
        case "notice": self = .`notice`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`message`: return "message"
        case .`ask`: return "ask"
        case .`result`: return "result"
        case .`notice`: return "notice"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum InboxTab: WireModel, Hashable, Sendable {
    case `needsYou`
    case `info`
    case `done`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "needs-you": self = .`needsYou`
        case "info": self = .`info`
        case "done": self = .`done`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`needsYou`: return "needs-you"
        case .`info`: return "info"
        case .`done`: return "done"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct InboxRowFrom: WireModel {
    public var `name`: String
    public var `email`: String?
    public var `botId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `email`: String? = nil, `botId`: String? = nil) {
        self.`name` = `name`
        self.`email` = `email`
        self.`botId` = `botId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `email` = try object.optional("email")
        `botId` = try object.optional("botId")
        additionalFields = object.remainder(excluding: ["name", "email", "botId"])
        explicitNulls = object.nullKeys.intersection(["name", "email", "botId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("email", `email`, nulls: explicitNulls)
        try object.putOptional("botId", `botId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct InboxRowVia: WireModel {
    public var `botId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct InboxRowWorkingFor: WireModel {
    public var `botId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct InboxRowAskedBy: WireModel {
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String) {
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["name"])
        explicitNulls = object.nullKeys.intersection(["name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct InboxRowOrigin: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `title`: String
    public var `groupId`: String?
    public var `messageId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `threadId`: String,
        `title`: String,
        `groupId`: String? = nil,
        `messageId`: String? = nil
    ) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`title` = `title`
        self.`groupId` = `groupId`
        self.`messageId` = `messageId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `title` = try object.required("title")
        `groupId` = try object.optional("groupId")
        `messageId` = try object.optional("messageId")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "title", "groupId", "messageId"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "title", "groupId", "messageId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("title", `title`)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.putOptional("messageId", `messageId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct InboxRowAnswersElement: WireModel {
    public var `by`: InboxRowAnswersElementBy
    public var `text`: String
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`by`: InboxRowAnswersElementBy, `text`: String, `at`: Double) {
        self.`by` = `by`
        self.`text` = `text`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `by` = try object.required("by")
        `text` = try object.required("text")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["by", "text", "at"])
        explicitNulls = object.nullKeys.intersection(["by", "text", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("by", `by`)
        try object.put("text", `text`)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public enum InboxRowAnswersElementBy: WireModel, Hashable, Sendable {
    case `person`
    case `assistant`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "person": self = .`person`
        case "assistant": self = .`assistant`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`person`: return "person"
        case .`assistant`: return "assistant"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
