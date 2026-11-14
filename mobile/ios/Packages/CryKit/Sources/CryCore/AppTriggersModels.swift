import Foundation

public struct AppTriggerRequestCardData: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `createdAt`: Double
    public var `operation`: AppTriggerRequestOperation
    public var `resultId`: String?
    public var `undo`: AppTriggerRequestCardDataUndo?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `createdAt`: Double,
        `operation`: AppTriggerRequestOperation,
        `resultId`: String? = nil,
        `undo`: AppTriggerRequestCardDataUndo? = nil
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

public struct AppTriggerRequestOperationCreate: WireModel {
    public var `trigger`: AppTriggerDefinition
    public var `forBot`: AppTriggerRequestOperationCreateForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`trigger`: AppTriggerDefinition, `forBot`: AppTriggerRequestOperationCreateForBot? = nil) {
        self.`trigger` = `trigger`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `trigger` = try object.required("trigger")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["trigger", "forBot"])
        explicitNulls = object.nullKeys.intersection(["trigger", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("trigger", `trigger`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerDefinition: WireModel {
    public var `name`: String
    public var `instructions`: String
    public var `app`: String
    public var `event`: String
    public var `account`: String?
    public var `filter`: AppTriggerFilter?
    public var `config`: [String: JSONValue]?
    public var `runOn`: RoutineRunOn?
    public var `sameConversation`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `instructions`: String,
        `app`: String,
        `event`: String,
        `account`: String? = nil,
        `filter`: AppTriggerFilter? = nil,
        `config`: [String: JSONValue]? = nil,
        `runOn`: RoutineRunOn? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`app` = `app`
        self.`event` = `event`
        self.`account` = `account`
        self.`filter` = `filter`
        self.`config` = `config`
        self.`runOn` = `runOn`
        self.`sameConversation` = `sameConversation`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `instructions` = try object.required("instructions")
        `app` = try object.required("app")
        `event` = try object.required("event")
        `account` = try object.optional("account")
        `filter` = try object.optional("filter")
        `config` = try object.optional("config")
        `runOn` = try object.optional("runOn")
        `sameConversation` = try object.optional("sameConversation")
        additionalFields = object.remainder(excluding: ["name", "instructions", "app", "event", "account", "filter", "config", "runOn", "sameConversation"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "app", "event", "account", "filter", "config", "runOn", "sameConversation"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("instructions", `instructions`)
        try object.put("app", `app`)
        try object.put("event", `event`)
        try object.putOptional("account", `account`, nulls: explicitNulls)
        try object.putOptional("filter", `filter`, nulls: explicitNulls)
        try object.putOptional("config", `config`, nulls: explicitNulls)
        try object.putOptional("runOn", `runOn`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerFilter: WireModel {
    public var `from`: String?
    public var `subject`: String?
    public var `label`: String?
    public var `text`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`from`: String? = nil, `subject`: String? = nil, `label`: String? = nil, `text`: String? = nil) {
        self.`from` = `from`
        self.`subject` = `subject`
        self.`label` = `label`
        self.`text` = `text`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `from` = try object.optional("from")
        `subject` = try object.optional("subject")
        `label` = try object.optional("label")
        `text` = try object.optional("text")
        additionalFields = object.remainder(excluding: ["from", "subject", "label", "text"])
        explicitNulls = object.nullKeys.intersection(["from", "subject", "label", "text"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("from", `from`, nulls: explicitNulls)
        try object.putOptional("subject", `subject`, nulls: explicitNulls)
        try object.putOptional("label", `label`, nulls: explicitNulls)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerRequestOperationCreateForBot: WireModel {
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

public struct AppTriggerRequestOperationUpdate: WireModel {
    public var `triggerId`: String
    public var `changes`: AppTriggerChange
    public var `forBot`: AppTriggerRequestOperationUpdateForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`triggerId`: String, `changes`: AppTriggerChange, `forBot`: AppTriggerRequestOperationUpdateForBot? = nil) {
        self.`triggerId` = `triggerId`
        self.`changes` = `changes`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.required("triggerId")
        `changes` = try object.required("changes")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["triggerId", "changes", "forBot"])
        explicitNulls = object.nullKeys.intersection(["triggerId", "changes", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("triggerId", `triggerId`)
        try object.put("changes", `changes`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerChange: WireModel {
    public var `name`: String?
    public var `instructions`: String?
    public var `filter`: AppTriggerFilter?
    public var `config`: [String: JSONValue]?
    public var `runOn`: RoutineRunOn?
    public var `sameConversation`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String? = nil,
        `instructions`: String? = nil,
        `filter`: AppTriggerFilter? = nil,
        `config`: [String: JSONValue]? = nil,
        `runOn`: RoutineRunOn? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`filter` = `filter`
        self.`config` = `config`
        self.`runOn` = `runOn`
        self.`sameConversation` = `sameConversation`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.optional("name")
        `instructions` = try object.optional("instructions")
        `filter` = try object.optional("filter")
        `config` = try object.optional("config")
        `runOn` = try object.optional("runOn")
        `sameConversation` = try object.optional("sameConversation")
        additionalFields = object.remainder(excluding: ["name", "instructions", "filter", "config", "runOn", "sameConversation"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "filter", "config", "runOn", "sameConversation"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("instructions", `instructions`, nulls: explicitNulls)
        try object.putOptional("filter", `filter`, nulls: explicitNulls)
        try object.putOptional("config", `config`, nulls: explicitNulls)
        try object.putOptional("runOn", `runOn`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerRequestOperationUpdateForBot: WireModel {
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

public struct AppTriggerRequestOperationPause: WireModel {
    public var `triggerId`: String
    public var `forBot`: AppTriggerRequestOperationPauseForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`triggerId`: String, `forBot`: AppTriggerRequestOperationPauseForBot? = nil) {
        self.`triggerId` = `triggerId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.required("triggerId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["triggerId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["triggerId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("triggerId", `triggerId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerRequestOperationPauseForBot: WireModel {
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

public struct AppTriggerRequestOperationResume: WireModel {
    public var `triggerId`: String
    public var `forBot`: AppTriggerRequestOperationResumeForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`triggerId`: String, `forBot`: AppTriggerRequestOperationResumeForBot? = nil) {
        self.`triggerId` = `triggerId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.required("triggerId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["triggerId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["triggerId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("triggerId", `triggerId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerRequestOperationResumeForBot: WireModel {
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

public struct AppTriggerRequestOperationRunNow: WireModel {
    public var `triggerId`: String
    public var `forBot`: AppTriggerRequestOperationRunNowForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`triggerId`: String, `forBot`: AppTriggerRequestOperationRunNowForBot? = nil) {
        self.`triggerId` = `triggerId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.required("triggerId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["triggerId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["triggerId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("triggerId", `triggerId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerRequestOperationRunNowForBot: WireModel {
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

public struct AppTriggerRequestOperationDelete: WireModel {
    public var `triggerId`: String
    public var `forBot`: AppTriggerRequestOperationDeleteForBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`triggerId`: String, `forBot`: AppTriggerRequestOperationDeleteForBot? = nil) {
        self.`triggerId` = `triggerId`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.required("triggerId")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["triggerId", "forBot"])
        explicitNulls = object.nullKeys.intersection(["triggerId", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("triggerId", `triggerId`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerRequestOperationDeleteForBot: WireModel {
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

public indirect enum AppTriggerRequestOperation: WireModel {
    case `create`(AppTriggerRequestOperationCreate)
    case `update`(AppTriggerRequestOperationUpdate)
    case `pause`(AppTriggerRequestOperationPause)
    case `resume`(AppTriggerRequestOperationResume)
    case `runNow`(AppTriggerRequestOperationRunNow)
    case `delete`(AppTriggerRequestOperationDelete)
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
        case "create": self = .`create`(try payload.decode(AppTriggerRequestOperationCreate.self))
        case "update": self = .`update`(try payload.decode(AppTriggerRequestOperationUpdate.self))
        case "pause": self = .`pause`(try payload.decode(AppTriggerRequestOperationPause.self))
        case "resume": self = .`resume`(try payload.decode(AppTriggerRequestOperationResume.self))
        case "run_now": self = .`runNow`(try payload.decode(AppTriggerRequestOperationRunNow.self))
        case "delete": self = .`delete`(try payload.decode(AppTriggerRequestOperationDelete.self))
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

public struct AppTriggerRequestCardDataUndo: WireModel {
    public var `name`: String
    public var `appliedUpdatedAt`: Double?
    public var `before`: AppTriggerRequestCardDataUndoBefore?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `appliedUpdatedAt`: Double? = nil, `before`: AppTriggerRequestCardDataUndoBefore? = nil) {
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

public struct AppTriggerRequestCardDataUndoBefore: WireModel {
    public var `name`: String
    public var `prompt`: String
    public var `runOn`: RoutineRunOn
    public var `enabled`: Bool
    public var `filter`: AppTriggerFilter?
    public var `config`: [String: JSONValue]
    public var `sameConversation`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `prompt`: String,
        `runOn`: RoutineRunOn,
        `enabled`: Bool,
        `config`: [String: JSONValue],
        `filter`: AppTriggerFilter? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`prompt` = `prompt`
        self.`runOn` = `runOn`
        self.`enabled` = `enabled`
        self.`filter` = `filter`
        self.`config` = `config`
        self.`sameConversation` = `sameConversation`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `prompt` = try object.required("prompt")
        `runOn` = try object.required("runOn")
        `enabled` = try object.required("enabled")
        `filter` = try object.optional("filter")
        `config` = try object.required("config")
        `sameConversation` = try object.optional("sameConversation")
        additionalFields = object.remainder(excluding: ["name", "prompt", "runOn", "enabled", "filter", "config", "sameConversation"])
        explicitNulls = object.nullKeys.intersection(["name", "prompt", "runOn", "enabled", "filter", "config", "sameConversation"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("prompt", `prompt`)
        try object.put("runOn", `runOn`)
        try object.put("enabled", `enabled`)
        try object.putOptional("filter", `filter`, nulls: explicitNulls)
        try object.put("config", `config`)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppTrigger: WireModel {
    public var `id`: String
    public var `name`: String
    public var `prompt`: String
    public var `botId`: String
    public var `runOn`: RoutineRunOn
    public var `enabled`: Bool
    public var `app`: String
    public var `appName`: String
    public var `event`: String
    public var `eventName`: String
    public var `delivery`: AppTriggerDelivery
    public var `accountId`: String
    public var `accountLabel`: String?
    public var `config`: [String: JSONValue]
    public var `filter`: AppTriggerFilter?
    public var `remote`: AppTriggerRemote
    public var `problem`: AppTriggerProblem?
    public var `sourceThreadId`: String?
    public var `sameConversation`: Bool?
    public var `received`: Double
    public var `filtered`: Double
    public var `skipped`: AppTriggerSkipped?
    public var `lastEventAt`: Double?
    public var `lastRunId`: String?
    public var `createdAt`: Double
    public var `updatedAt`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `name`: String,
        `prompt`: String,
        `botId`: String,
        `runOn`: RoutineRunOn,
        `enabled`: Bool,
        `app`: String,
        `appName`: String,
        `event`: String,
        `eventName`: String,
        `delivery`: AppTriggerDelivery,
        `accountId`: String,
        `config`: [String: JSONValue],
        `remote`: AppTriggerRemote,
        `received`: Double,
        `filtered`: Double,
        `createdAt`: Double,
        `updatedAt`: Double,
        `accountLabel`: String? = nil,
        `filter`: AppTriggerFilter? = nil,
        `problem`: AppTriggerProblem? = nil,
        `sourceThreadId`: String? = nil,
        `sameConversation`: Bool? = nil,
        `skipped`: AppTriggerSkipped? = nil,
        `lastEventAt`: Double? = nil,
        `lastRunId`: String? = nil
    ) {
        self.`id` = `id`
        self.`name` = `name`
        self.`prompt` = `prompt`
        self.`botId` = `botId`
        self.`runOn` = `runOn`
        self.`enabled` = `enabled`
        self.`app` = `app`
        self.`appName` = `appName`
        self.`event` = `event`
        self.`eventName` = `eventName`
        self.`delivery` = `delivery`
        self.`accountId` = `accountId`
        self.`accountLabel` = `accountLabel`
        self.`config` = `config`
        self.`filter` = `filter`
        self.`remote` = `remote`
        self.`problem` = `problem`
        self.`sourceThreadId` = `sourceThreadId`
        self.`sameConversation` = `sameConversation`
        self.`received` = `received`
        self.`filtered` = `filtered`
        self.`skipped` = `skipped`
        self.`lastEventAt` = `lastEventAt`
        self.`lastRunId` = `lastRunId`
        self.`createdAt` = `createdAt`
        self.`updatedAt` = `updatedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `prompt` = try object.required("prompt")
        `botId` = try object.required("botId")
        `runOn` = try object.required("runOn")
        `enabled` = try object.required("enabled")
        `app` = try object.required("app")
        `appName` = try object.required("appName")
        `event` = try object.required("event")
        `eventName` = try object.required("eventName")
        `delivery` = try object.required("delivery")
        `accountId` = try object.required("accountId")
        `accountLabel` = try object.optional("accountLabel")
        `config` = try object.required("config")
        `filter` = try object.optional("filter")
        `remote` = try object.required("remote")
        `problem` = try object.optional("problem")
        `sourceThreadId` = try object.optional("sourceThreadId")
        `sameConversation` = try object.optional("sameConversation")
        `received` = try object.required("received")
        `filtered` = try object.required("filtered")
        `skipped` = try object.optional("skipped")
        `lastEventAt` = try object.optional("lastEventAt")
        `lastRunId` = try object.optional("lastRunId")
        `createdAt` = try object.required("createdAt")
        `updatedAt` = try object.required("updatedAt")
        additionalFields = object.remainder(excluding: ["id", "name", "prompt", "botId", "runOn", "enabled", "app", "appName", "event", "eventName", "delivery", "accountId", "accountLabel", "config", "filter", "remote", "problem", "sourceThreadId", "sameConversation", "received", "filtered", "skipped", "lastEventAt", "lastRunId", "createdAt", "updatedAt"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "prompt", "botId", "runOn", "enabled", "app", "appName", "event", "eventName", "delivery", "accountId", "accountLabel", "config", "filter", "remote", "problem", "sourceThreadId", "sameConversation", "received", "filtered", "skipped", "lastEventAt", "lastRunId", "createdAt", "updatedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.put("prompt", `prompt`)
        try object.put("botId", `botId`)
        try object.put("runOn", `runOn`)
        try object.put("enabled", `enabled`)
        try object.put("app", `app`)
        try object.put("appName", `appName`)
        try object.put("event", `event`)
        try object.put("eventName", `eventName`)
        try object.put("delivery", `delivery`)
        try object.put("accountId", `accountId`)
        try object.putOptional("accountLabel", `accountLabel`, nulls: explicitNulls)
        try object.put("config", `config`)
        try object.putOptional("filter", `filter`, nulls: explicitNulls)
        try object.put("remote", `remote`)
        try object.putOptional("problem", `problem`, nulls: explicitNulls)
        try object.putOptional("sourceThreadId", `sourceThreadId`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.put("received", `received`)
        try object.put("filtered", `filtered`)
        try object.putOptional("skipped", `skipped`, nulls: explicitNulls)
        try object.putOptional("lastEventAt", `lastEventAt`, nulls: explicitNulls)
        try object.putOptional("lastRunId", `lastRunId`, nulls: explicitNulls)
        try object.put("createdAt", `createdAt`)
        try object.put("updatedAt", `updatedAt`)
        try object.encode(to: encoder)
    }
}

public enum AppTriggerDelivery: WireModel, Hashable, Sendable {
    case `instant`
    case `poll`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "instant": self = .`instant`
        case "poll": self = .`poll`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`instant`: return "instant"
        case .`poll`: return "poll"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AppTriggerRemote: WireModel {
    public var `triggerId`: String?
    public var `state`: AppTriggerRemoteState
    public var `error`: String?
    public var `syncedAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`state`: AppTriggerRemoteState, `triggerId`: String? = nil, `error`: String? = nil, `syncedAt`: Double? = nil) {
        self.`triggerId` = `triggerId`
        self.`state` = `state`
        self.`error` = `error`
        self.`syncedAt` = `syncedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.optional("triggerId")
        `state` = try object.required("state")
        `error` = try object.optional("error")
        `syncedAt` = try object.optional("syncedAt")
        additionalFields = object.remainder(excluding: ["triggerId", "state", "error", "syncedAt"])
        explicitNulls = object.nullKeys.intersection(["triggerId", "state", "error", "syncedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("triggerId", `triggerId`, nulls: explicitNulls)
        try object.put("state", `state`)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.putOptional("syncedAt", `syncedAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum AppTriggerRemoteState: WireModel, Hashable, Sendable {
    case `active`
    case `pending`
    case `error`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "active": self = .`active`
        case "pending": self = .`pending`
        case "error": self = .`error`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`active`: return "active"
        case .`pending`: return "pending"
        case .`error`: return "error"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AppTriggerProblemReconnect: WireModel {
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`at`: Double) {
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["at"])
        explicitNulls = object.nullKeys.intersection(["at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public struct AppTriggerProblemError: WireModel {
    public var `text`: String
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`text`: String, `at`: Double) {
        self.`text` = `text`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `text` = try object.required("text")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["text", "at"])
        explicitNulls = object.nullKeys.intersection(["text", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("text", `text`)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public indirect enum AppTriggerProblem: WireModel {
    case `reconnect`(AppTriggerProblemReconnect)
    case `error`(AppTriggerProblemError)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`reconnect`: return "reconnect"
        case .`error`: return "error"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing kind"))
        }
        var payload = raw
        payload["kind"] = nil
        switch kind {
        case "reconnect": self = .`reconnect`(try payload.decode(AppTriggerProblemReconnect.self))
        case "error": self = .`error`(try payload.decode(AppTriggerProblemError.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`reconnect`(let value): raw = try JSONValue(encoding: value)
        case .`error`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["kind"] = .string(kind)
        try raw.encode(to: encoder)
    }
}

public struct AppTriggerSkipped: WireModel {
    public var `day`: String
    public var `dailyLimit`: Double
    public var `queueFull`: Double
    public var `expired`: Double
    public var `tooMany`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `day`: String,
        `dailyLimit`: Double,
        `queueFull`: Double,
        `expired`: Double,
        `tooMany`: Double
    ) {
        self.`day` = `day`
        self.`dailyLimit` = `dailyLimit`
        self.`queueFull` = `queueFull`
        self.`expired` = `expired`
        self.`tooMany` = `tooMany`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `day` = try object.required("day")
        `dailyLimit` = try object.required("dailyLimit")
        `queueFull` = try object.required("queueFull")
        `expired` = try object.required("expired")
        `tooMany` = try object.required("tooMany")
        additionalFields = object.remainder(excluding: ["day", "dailyLimit", "queueFull", "expired", "tooMany"])
        explicitNulls = object.nullKeys.intersection(["day", "dailyLimit", "queueFull", "expired", "tooMany"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("day", `day`)
        try object.put("dailyLimit", `dailyLimit`)
        try object.put("queueFull", `queueFull`)
        try object.put("expired", `expired`)
        try object.put("tooMany", `tooMany`)
        try object.encode(to: encoder)
    }
}

public struct AppEventAttempt: WireModel {
    public var `id`: String
    public var `triggerId`: String
    public var `eventId`: String
    public var `at`: Double
    public var `outcome`: AppEventOutcome
    public var `reason`: String?
    public var `runId`: String?
    public var `preview`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `triggerId`: String,
        `eventId`: String,
        `at`: Double,
        `outcome`: AppEventOutcome,
        `reason`: String? = nil,
        `runId`: String? = nil,
        `preview`: String? = nil
    ) {
        self.`id` = `id`
        self.`triggerId` = `triggerId`
        self.`eventId` = `eventId`
        self.`at` = `at`
        self.`outcome` = `outcome`
        self.`reason` = `reason`
        self.`runId` = `runId`
        self.`preview` = `preview`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `triggerId` = try object.required("triggerId")
        `eventId` = try object.required("eventId")
        `at` = try object.required("at")
        `outcome` = try object.required("outcome")
        `reason` = try object.optional("reason")
        `runId` = try object.optional("runId")
        `preview` = try object.optional("preview")
        additionalFields = object.remainder(excluding: ["id", "triggerId", "eventId", "at", "outcome", "reason", "runId", "preview"])
        explicitNulls = object.nullKeys.intersection(["id", "triggerId", "eventId", "at", "outcome", "reason", "runId", "preview"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("triggerId", `triggerId`)
        try object.put("eventId", `eventId`)
        try object.put("at", `at`)
        try object.put("outcome", `outcome`)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("runId", `runId`, nulls: explicitNulls)
        try object.putOptional("preview", `preview`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum AppEventOutcome: WireModel, Hashable, Sendable {
    case `started`
    case `joined`
    case `filtered`
    case `duplicate`
    case `skipped`
    case `rejected`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "started": self = .`started`
        case "joined": self = .`joined`
        case "filtered": self = .`filtered`
        case "duplicate": self = .`duplicate`
        case "skipped": self = .`skipped`
        case "rejected": self = .`rejected`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`started`: return "started"
        case .`joined`: return "joined"
        case .`filtered`: return "filtered"
        case .`duplicate`: return "duplicate"
        case .`skipped`: return "skipped"
        case .`rejected`: return "rejected"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AppTriggerService: WireModel {
    public var `available`: Bool
    public var `reason`: AppTriggerServiceReason?
    public var `plan`: AppTriggerServicePlan?
    public var `eventsPerDay`: Double?
    public var `eventsToday`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `available`: Bool,
        `reason`: AppTriggerServiceReason? = nil,
        `plan`: AppTriggerServicePlan? = nil,
        `eventsPerDay`: Double? = nil,
        `eventsToday`: Double? = nil
    ) {
        self.`available` = `available`
        self.`reason` = `reason`
        self.`plan` = `plan`
        self.`eventsPerDay` = `eventsPerDay`
        self.`eventsToday` = `eventsToday`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `available` = try object.required("available")
        `reason` = try object.optional("reason")
        `plan` = try object.optional("plan")
        `eventsPerDay` = try object.optional("eventsPerDay")
        `eventsToday` = try object.optional("eventsToday")
        additionalFields = object.remainder(excluding: ["available", "reason", "plan", "eventsPerDay", "eventsToday"])
        explicitNulls = object.nullKeys.intersection(["available", "reason", "plan", "eventsPerDay", "eventsToday"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("available", `available`)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("plan", `plan`, nulls: explicitNulls)
        try object.putOptional("eventsPerDay", `eventsPerDay`, nulls: explicitNulls)
        try object.putOptional("eventsToday", `eventsToday`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum AppTriggerServiceReason: WireModel, Hashable, Sendable {
    case `selfHosted`
    case `unavailable`
    case `off`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "self-hosted": self = .`selfHosted`
        case "unavailable": self = .`unavailable`
        case "off": self = .`off`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`selfHosted`: return "self-hosted"
        case .`unavailable`: return "unavailable"
        case .`off`: return "off"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum AppTriggerServicePlan: WireModel, Hashable, Sendable {
    case `desktop`
    case `cloud`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "desktop": self = .`desktop`
        case "cloud": self = .`cloud`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`desktop`: return "desktop"
        case .`cloud`: return "cloud"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
