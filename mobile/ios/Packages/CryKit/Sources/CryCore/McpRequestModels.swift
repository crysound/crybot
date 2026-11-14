import Foundation

public struct McpChangeRequest: WireModel {
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `action`: McpChangeRequestAction
    public var `name`: String
    public var `targetHash`: String
    public var `result`: McpChangeRequestResult?
    public var `resumed`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `action`: McpChangeRequestAction,
        `name`: String,
        `targetHash`: String,
        `result`: McpChangeRequestResult? = nil,
        `resumed`: Bool? = nil
    ) {
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`action` = `action`
        self.`name` = `name`
        self.`targetHash` = `targetHash`
        self.`result` = `result`
        self.`resumed` = `resumed`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `requestId` = try object.required("requestId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `action` = try object.required("action")
        `name` = try object.required("name")
        `targetHash` = try object.required("targetHash")
        `result` = try object.optional("result")
        `resumed` = try object.optional("resumed")
        additionalFields = object.remainder(excluding: ["requestId", "botId", "threadId", "action", "name", "targetHash", "result", "resumed"])
        explicitNulls = object.nullKeys.intersection(["requestId", "botId", "threadId", "action", "name", "targetHash", "result", "resumed"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("requestId", `requestId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("action", `action`)
        try object.put("name", `name`)
        try object.put("targetHash", `targetHash`)
        try object.putOptional("result", `result`, nulls: explicitNulls)
        try object.putOptional("resumed", `resumed`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum McpChangeRequestAction: WireModel, Hashable, Sendable {
    case `enable`
    case `update`
    case `remove`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "enable": self = .`enable`
        case "update": self = .`update`
        case "remove": self = .`remove`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`enable`: return "enable"
        case .`update`: return "update"
        case .`remove`: return "remove"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct McpChangeRequestResult: WireModel {
    public var `state`: McpChangeRequestResultState
    public var `text`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`state`: McpChangeRequestResultState, `text`: String) {
        self.`state` = `state`
        self.`text` = `text`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `state` = try object.required("state")
        `text` = try object.required("text")
        additionalFields = object.remainder(excluding: ["state", "text"])
        explicitNulls = object.nullKeys.intersection(["state", "text"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("state", `state`)
        try object.put("text", `text`)
        try object.encode(to: encoder)
    }
}

public enum McpChangeRequestResultState: WireModel, Hashable, Sendable {
    case `applied`
    case `denied`
    case `expired`
    case `failed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "applied": self = .`applied`
        case "denied": self = .`denied`
        case "expired": self = .`expired`
        case "failed": self = .`failed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`applied`: return "applied"
        case .`denied`: return "denied"
        case .`expired`: return "expired"
        case .`failed`: return "failed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
