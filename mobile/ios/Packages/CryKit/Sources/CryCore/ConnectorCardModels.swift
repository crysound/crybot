import Foundation

public struct ConnectorCardData: WireModel {
    public var `source`: ConnectorCardDataSource?
    public var `slug`: String
    public var `label`: String
    public var `description`: String
    public var `status`: ConnectorCardDataStatus
    public var `resumeKey`: String
    public var `alias`: String?
    public var `error`: String?
    public var `dismissed`: Bool?
    public var `superseded`: Bool?
    public var `resumed`: Bool?
    public var `stopped`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `slug`: String,
        `label`: String,
        `description`: String,
        `status`: ConnectorCardDataStatus,
        `resumeKey`: String,
        `source`: ConnectorCardDataSource? = nil,
        `alias`: String? = nil,
        `error`: String? = nil,
        `dismissed`: Bool? = nil,
        `superseded`: Bool? = nil,
        `resumed`: Bool? = nil,
        `stopped`: Bool? = nil
    ) {
        self.`source` = `source`
        self.`slug` = `slug`
        self.`label` = `label`
        self.`description` = `description`
        self.`status` = `status`
        self.`resumeKey` = `resumeKey`
        self.`alias` = `alias`
        self.`error` = `error`
        self.`dismissed` = `dismissed`
        self.`superseded` = `superseded`
        self.`resumed` = `resumed`
        self.`stopped` = `stopped`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.optional("source")
        `slug` = try object.required("slug")
        `label` = try object.required("label")
        `description` = try object.required("description")
        `status` = try object.required("status")
        `resumeKey` = try object.required("resumeKey")
        `alias` = try object.optional("alias")
        `error` = try object.optional("error")
        `dismissed` = try object.optional("dismissed")
        `superseded` = try object.optional("superseded")
        `resumed` = try object.optional("resumed")
        `stopped` = try object.optional("stopped")
        additionalFields = object.remainder(excluding: ["source", "slug", "label", "description", "status", "resumeKey", "alias", "error", "dismissed", "superseded", "resumed", "stopped"])
        explicitNulls = object.nullKeys.intersection(["source", "slug", "label", "description", "status", "resumeKey", "alias", "error", "dismissed", "superseded", "resumed", "stopped"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("source", `source`, nulls: explicitNulls)
        try object.put("slug", `slug`)
        try object.put("label", `label`)
        try object.put("description", `description`)
        try object.put("status", `status`)
        try object.put("resumeKey", `resumeKey`)
        try object.putOptional("alias", `alias`, nulls: explicitNulls)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.putOptional("dismissed", `dismissed`, nulls: explicitNulls)
        try object.putOptional("superseded", `superseded`, nulls: explicitNulls)
        try object.putOptional("resumed", `resumed`, nulls: explicitNulls)
        try object.putOptional("stopped", `stopped`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConnectorCardDataSource: WireModel, Hashable, Sendable {
    case `composio`
    case `mcp`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "composio": self = .`composio`
        case "mcp": self = .`mcp`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`composio`: return "composio"
        case .`mcp`: return "mcp"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum ConnectorCardDataStatus: WireModel, Hashable, Sendable {
    case `required`
    case `authorizing`
    case `connected`
    case `failed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "required": self = .`required`
        case "authorizing": self = .`authorizing`
        case "connected": self = .`connected`
        case "failed": self = .`failed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`required`: return "required"
        case .`authorizing`: return "authorizing"
        case .`connected`: return "connected"
        case .`failed`: return "failed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
