import Foundation

public struct WebhookRequestCardData: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `createdAt`: Double
    public var `operation`: WebhookRequestOperation
    public var `resultId`: String?
    public var `undo`: WebhookRequestUndo?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `createdAt`: Double,
        `operation`: WebhookRequestOperation,
        `resultId`: String? = nil,
        `undo`: WebhookRequestUndo? = nil
    ) {
        self.`version` = `version`
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`operation` = `operation`
        self.`resultId` = `resultId`
        self.`undo` = `undo`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `requestId` = try object.required("requestId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `operation` = try object.required("operation")
        `resultId` = try object.optional("resultId")
        `undo` = try object.optional("undo")
        additionalFields = object.remainder(excluding: ["version", "requestId", "botId", "threadId", "createdAt", "operation", "resultId", "undo"])
        explicitNulls = object.nullKeys.intersection(["version", "requestId", "botId", "threadId", "createdAt", "operation", "resultId", "undo"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("requestId", `requestId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.put("operation", `operation`)
        try object.putOptional("resultId", `resultId`, nulls: explicitNulls)
        try object.putOptional("undo", `undo`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestOperationCreate: WireModel {
    public var `webhook`: WebhookRequestDefinition
    public var `forBot`: WebhookRequestOperationCreateForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhook`: WebhookRequestDefinition, `forBot`: WebhookRequestOperationCreateForBot? = nil) {
        self.`webhook` = `webhook`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhook` = try object.required("webhook")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["webhook", "forBot"])
        explicitNulls = object.nullKeys.intersection(["webhook", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhook", `webhook`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestDefinition: WireModel {
    public var `name`: String
    public var `instructions`: String
    public var `runOn`: WebhookRequestDefinitionRunOn
    public var `eventTypes`: [String]?
    public var `payloadFilter`: [String: String]?
    public var `sameConversation`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `instructions`: String,
        `runOn`: WebhookRequestDefinitionRunOn,
        `eventTypes`: [String]? = nil,
        `payloadFilter`: [String: String]? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`runOn` = `runOn`
        self.`eventTypes` = `eventTypes`
        self.`payloadFilter` = `payloadFilter`
        self.`sameConversation` = `sameConversation`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `instructions` = try object.required("instructions")
        `runOn` = try object.required("runOn")
        `eventTypes` = try object.optional("eventTypes")
        `payloadFilter` = try object.optional("payloadFilter")
        `sameConversation` = try object.optional("sameConversation")
        additionalFields = object.remainder(excluding: ["name", "instructions", "runOn", "eventTypes", "payloadFilter", "sameConversation"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "runOn", "eventTypes", "payloadFilter", "sameConversation"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("instructions", `instructions`)
        try object.put("runOn", `runOn`)
        try object.putOptional("eventTypes", `eventTypes`, nulls: explicitNulls)
        try object.putOptional("payloadFilter", `payloadFilter`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WebhookRequestDefinitionRunOn: WireModel, Hashable, Sendable {
    case `bot`
    case `cloud`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "cloud": self = .`cloud`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`cloud`: return "cloud"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WebhookRequestOperationCreateForBot: WireModel {
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

public struct WebhookRequestOperationUpdate: WireModel {
    public var `webhookId`: String
    public var `changes`: WebhookRequestOperationUpdateChanges
    public var `forBot`: WebhookRequestOperationUpdateForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhookId`: String, `changes`: WebhookRequestOperationUpdateChanges, `forBot`: WebhookRequestOperationUpdateForBot? = nil) {
        self.`webhookId` = `webhookId`
        self.`changes` = `changes`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhookId` = try object.required("webhookId")
        `changes` = try object.required("changes")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["webhookId", "changes", "forBot"])
        explicitNulls = object.nullKeys.intersection(["webhookId", "changes", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhookId", `webhookId`)
        try object.put("changes", `changes`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestOperationUpdateChanges: WireModel {
    public var `name`: String?
    public var `instructions`: String?
    public var `runOn`: WebhookRequestOperationUpdateChangesRunOn?
    public var `eventTypes`: [String]?
    public var `payloadFilter`: [String: String]?
    public var `sameConversation`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String? = nil,
        `instructions`: String? = nil,
        `runOn`: WebhookRequestOperationUpdateChangesRunOn? = nil,
        `eventTypes`: [String]? = nil,
        `payloadFilter`: [String: String]? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`runOn` = `runOn`
        self.`eventTypes` = `eventTypes`
        self.`payloadFilter` = `payloadFilter`
        self.`sameConversation` = `sameConversation`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.optional("name")
        `instructions` = try object.optional("instructions")
        `runOn` = try object.optional("runOn")
        `eventTypes` = try object.optional("eventTypes")
        `payloadFilter` = try object.optional("payloadFilter")
        `sameConversation` = try object.optional("sameConversation")
        additionalFields = object.remainder(excluding: ["name", "instructions", "runOn", "eventTypes", "payloadFilter", "sameConversation"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "runOn", "eventTypes", "payloadFilter", "sameConversation"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("instructions", `instructions`, nulls: explicitNulls)
        try object.putOptional("runOn", `runOn`, nulls: explicitNulls)
        try object.putOptional("eventTypes", `eventTypes`, nulls: explicitNulls)
        try object.putOptional("payloadFilter", `payloadFilter`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WebhookRequestOperationUpdateChangesRunOn: WireModel, Hashable, Sendable {
    case `bot`
    case `cloud`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "cloud": self = .`cloud`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`cloud`: return "cloud"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WebhookRequestOperationUpdateForBot: WireModel {
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

public struct WebhookRequestOperationPause: WireModel {
    public var `webhookId`: String
    public var `forBot`: WebhookRequestOperationPauseForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhookId`: String, `forBot`: WebhookRequestOperationPauseForBot? = nil) {
        self.`webhookId` = `webhookId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhookId` = try object.required("webhookId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["webhookId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["webhookId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhookId", `webhookId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestOperationPauseForBot: WireModel {
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

public struct WebhookRequestOperationResume: WireModel {
    public var `webhookId`: String
    public var `forBot`: WebhookRequestOperationResumeForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhookId`: String, `forBot`: WebhookRequestOperationResumeForBot? = nil) {
        self.`webhookId` = `webhookId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhookId` = try object.required("webhookId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["webhookId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["webhookId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhookId", `webhookId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestOperationResumeForBot: WireModel {
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

public struct WebhookRequestOperationRunNow: WireModel {
    public var `webhookId`: String
    public var `forBot`: WebhookRequestOperationRunNowForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhookId`: String, `forBot`: WebhookRequestOperationRunNowForBot? = nil) {
        self.`webhookId` = `webhookId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhookId` = try object.required("webhookId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["webhookId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["webhookId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhookId", `webhookId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestOperationRunNowForBot: WireModel {
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

public struct WebhookRequestOperationDelete: WireModel {
    public var `webhookId`: String
    public var `forBot`: WebhookRequestOperationDeleteForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhookId`: String, `forBot`: WebhookRequestOperationDeleteForBot? = nil) {
        self.`webhookId` = `webhookId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhookId` = try object.required("webhookId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["webhookId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["webhookId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhookId", `webhookId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestOperationDeleteForBot: WireModel {
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

public indirect enum WebhookRequestOperation: WireModel {
    case `create`(WebhookRequestOperationCreate)
    case `update`(WebhookRequestOperationUpdate)
    case `pause`(WebhookRequestOperationPause)
    case `resume`(WebhookRequestOperationResume)
    case `runNow`(WebhookRequestOperationRunNow)
    case `delete`(WebhookRequestOperationDelete)
    case unknown(kind: String, raw: JSONValue)

    public var action: String {
        switch self {
        case .`create`: return "create"
        case .`update`: return "update"
        case .`pause`: return "pause"
        case .`resume`: return "resume"
        case .`runNow`: return "run_now"
        case .`delete`: return "delete"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["action"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing action"))
        }
        var payload = raw
        payload["action"] = nil
        switch kind {
        case "create": self = .`create`(try payload.decode(WebhookRequestOperationCreate.self))
        case "update": self = .`update`(try payload.decode(WebhookRequestOperationUpdate.self))
        case "pause": self = .`pause`(try payload.decode(WebhookRequestOperationPause.self))
        case "resume": self = .`resume`(try payload.decode(WebhookRequestOperationResume.self))
        case "run_now": self = .`runNow`(try payload.decode(WebhookRequestOperationRunNow.self))
        case "delete": self = .`delete`(try payload.decode(WebhookRequestOperationDelete.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`create`(let value): raw = try JSONValue(encoding: value)
        case .`update`(let value): raw = try JSONValue(encoding: value)
        case .`pause`(let value): raw = try JSONValue(encoding: value)
        case .`resume`(let value): raw = try JSONValue(encoding: value)
        case .`runNow`(let value): raw = try JSONValue(encoding: value)
        case .`delete`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["action"] = .string(action)
        try raw.encode(to: encoder)
    }
}

public struct WebhookRequestUndo: WireModel {
    public var `name`: String
    public var `appliedUpdatedAt`: Double?
    public var `before`: WebhookRequestSnapshot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `appliedUpdatedAt`: Double? = nil, `before`: WebhookRequestSnapshot? = nil) {
        self.`name` = `name`
        self.`appliedUpdatedAt` = `appliedUpdatedAt`
        self.`before` = `before`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `appliedUpdatedAt` = try object.optional("appliedUpdatedAt")
        `before` = try object.optional("before")
        additionalFields = object.remainder(excluding: ["name", "appliedUpdatedAt", "before"])
        explicitNulls = object.nullKeys.intersection(["name", "appliedUpdatedAt", "before"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("appliedUpdatedAt", `appliedUpdatedAt`, nulls: explicitNulls)
        try object.putOptional("before", `before`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookRequestSnapshot: WireModel {
    public var `name`: String
    public var `instructions`: String
    public var `runOn`: WebhookRequestSnapshotRunOn
    public var `eventTypes`: [String]?
    public var `payloadFilter`: [String: String]?
    public var `sameConversation`: Bool?
    public var `enabled`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `instructions`: String,
        `runOn`: WebhookRequestSnapshotRunOn,
        `enabled`: Bool,
        `eventTypes`: [String]? = nil,
        `payloadFilter`: [String: String]? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`runOn` = `runOn`
        self.`eventTypes` = `eventTypes`
        self.`payloadFilter` = `payloadFilter`
        self.`sameConversation` = `sameConversation`
        self.`enabled` = `enabled`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `instructions` = try object.required("instructions")
        `runOn` = try object.required("runOn")
        `eventTypes` = try object.optional("eventTypes")
        `payloadFilter` = try object.optional("payloadFilter")
        `sameConversation` = try object.optional("sameConversation")
        `enabled` = try object.required("enabled")
        additionalFields = object.remainder(excluding: ["name", "instructions", "runOn", "eventTypes", "payloadFilter", "sameConversation", "enabled"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "runOn", "eventTypes", "payloadFilter", "sameConversation", "enabled"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("instructions", `instructions`)
        try object.put("runOn", `runOn`)
        try object.putOptional("eventTypes", `eventTypes`, nulls: explicitNulls)
        try object.putOptional("payloadFilter", `payloadFilter`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.put("enabled", `enabled`)
        try object.encode(to: encoder)
    }
}

public enum WebhookRequestSnapshotRunOn: WireModel, Hashable, Sendable {
    case `bot`
    case `cloud`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "cloud": self = .`cloud`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`cloud`: return "cloud"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
