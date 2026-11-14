import Foundation

public struct AppPayload: WireModel {
    public var `v`: Double
    public var `source`: AppSource
    public var `title`: String
    public var `doc`: String
    public var `rev`: Double
    public var `history`: [String]?
    public var `format`: String?
    public var `bytes`: Double
    public var `height`: Double?
    public var `border`: Bool
    public var `network`: AppNetwork
    public var `mcp`: AppMcpRef?
    public var `context`: AppContextState?
    public var `done`: AppDoneState?
    public var `blocked`: AppBlockedReason?
    public var `live`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `v`: Double,
        `source`: AppSource,
        `title`: String,
        `doc`: String,
        `rev`: Double,
        `bytes`: Double,
        `border`: Bool,
        `network`: AppNetwork,
        `history`: [String]? = nil,
        `format`: String? = nil,
        `height`: Double? = nil,
        `mcp`: AppMcpRef? = nil,
        `context`: AppContextState? = nil,
        `done`: AppDoneState? = nil,
        `blocked`: AppBlockedReason? = nil,
        `live`: Bool? = nil
    ) {
        self.`v` = `v`
        self.`source` = `source`
        self.`title` = `title`
        self.`doc` = `doc`
        self.`rev` = `rev`
        self.`history` = `history`
        self.`format` = `format`
        self.`bytes` = `bytes`
        self.`height` = `height`
        self.`border` = `border`
        self.`network` = `network`
        self.`mcp` = `mcp`
        self.`context` = `context`
        self.`done` = `done`
        self.`blocked` = `blocked`
        self.`live` = `live`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `v` = try object.required("v")
        `source` = try object.required("source")
        `title` = try object.required("title")
        `doc` = try object.required("doc")
        `rev` = try object.required("rev")
        `history` = try object.optional("history")
        `format` = try object.optional("format")
        `bytes` = try object.required("bytes")
        `height` = try object.optional("height")
        `border` = try object.required("border")
        `network` = try object.required("network")
        `mcp` = try object.optional("mcp")
        `context` = try object.optional("context")
        `done` = try object.optional("done")
        `blocked` = try object.optional("blocked")
        `live` = try object.optional("live")
        additionalFields = object.remainder(excluding: ["v", "source", "title", "doc", "rev", "history", "format", "bytes", "height", "border", "network", "mcp", "context", "done", "blocked", "live"])
        explicitNulls = object.nullKeys.intersection(["v", "source", "title", "doc", "rev", "history", "format", "bytes", "height", "border", "network", "mcp", "context", "done", "blocked", "live"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("v", `v`)
        try object.put("source", `source`)
        try object.put("title", `title`)
        try object.put("doc", `doc`)
        try object.put("rev", `rev`)
        try object.putOptional("history", `history`, nulls: explicitNulls)
        try object.putOptional("format", `format`, nulls: explicitNulls)
        try object.put("bytes", `bytes`)
        try object.putOptional("height", `height`, nulls: explicitNulls)
        try object.put("border", `border`)
        try object.put("network", `network`)
        try object.putOptional("mcp", `mcp`, nulls: explicitNulls)
        try object.putOptional("context", `context`, nulls: explicitNulls)
        try object.putOptional("done", `done`, nulls: explicitNulls)
        try object.putOptional("blocked", `blocked`, nulls: explicitNulls)
        try object.putOptional("live", `live`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum AppSource: WireModel, Hashable, Sendable {
    case `html`
    case `mcp`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "html": self = .`html`
        case "mcp": self = .`mcp`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`html`: return "html"
        case .`mcp`: return "mcp"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AppNetwork: WireModel {
    public var `connect`: [String]
    public var `resources`: [String]
    public var `refused`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`connect`: [String], `resources`: [String], `refused`: [String]? = nil) {
        self.`connect` = `connect`
        self.`resources` = `resources`
        self.`refused` = `refused`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `connect` = try object.required("connect")
        `resources` = try object.required("resources")
        `refused` = try object.optional("refused")
        additionalFields = object.remainder(excluding: ["connect", "resources", "refused"])
        explicitNulls = object.nullKeys.intersection(["connect", "resources", "refused"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("connect", `connect`)
        try object.put("resources", `resources`)
        try object.putOptional("refused", `refused`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppMcpRef: WireModel {
    public var `server`: String
    public var `serverTitle`: String?
    public var `tool`: String
    public var `resourceUri`: String
    public var `isError`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `server`: String,
        `tool`: String,
        `resourceUri`: String,
        `serverTitle`: String? = nil,
        `isError`: Bool? = nil
    ) {
        self.`server` = `server`
        self.`serverTitle` = `serverTitle`
        self.`tool` = `tool`
        self.`resourceUri` = `resourceUri`
        self.`isError` = `isError`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `server` = try object.required("server")
        `serverTitle` = try object.optional("serverTitle")
        `tool` = try object.required("tool")
        `resourceUri` = try object.required("resourceUri")
        `isError` = try object.optional("isError")
        additionalFields = object.remainder(excluding: ["server", "serverTitle", "tool", "resourceUri", "isError"])
        explicitNulls = object.nullKeys.intersection(["server", "serverTitle", "tool", "resourceUri", "isError"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("server", `server`)
        try object.putOptional("serverTitle", `serverTitle`, nulls: explicitNulls)
        try object.put("tool", `tool`)
        try object.put("resourceUri", `resourceUri`)
        try object.putOptional("isError", `isError`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AppContextState: WireModel {
    public var `text`: String
    public var `at`: Double
    public var `delivered`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`text`: String, `at`: Double, `delivered`: Bool) {
        self.`text` = `text`
        self.`at` = `at`
        self.`delivered` = `delivered`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `text` = try object.required("text")
        `at` = try object.required("at")
        `delivered` = try object.required("delivered")
        additionalFields = object.remainder(excluding: ["text", "at", "delivered"])
        explicitNulls = object.nullKeys.intersection(["text", "at", "delivered"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("text", `text`)
        try object.put("at", `at`)
        try object.put("delivered", `delivered`)
        try object.encode(to: encoder)
    }
}

public struct AppDoneState: WireModel {
    public var `tool`: String
    public var `text`: String?
    public var `url`: String?
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tool`: String, `at`: Double, `text`: String? = nil, `url`: String? = nil) {
        self.`tool` = `tool`
        self.`text` = `text`
        self.`url` = `url`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tool` = try object.required("tool")
        `text` = try object.optional("text")
        `url` = try object.optional("url")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["tool", "text", "url", "at"])
        explicitNulls = object.nullKeys.intersection(["tool", "text", "url", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tool", `tool`)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.putOptional("url", `url`, nulls: explicitNulls)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public enum AppBlockedReason: WireModel, Hashable, Sendable {
    case `signedOut`
    case `serverRemoved`
    case `serverDisabled`
    case `appsOff`
    case `tooLarge`
    case `unavailable`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "signed-out": self = .`signedOut`
        case "server-removed": self = .`serverRemoved`
        case "server-disabled": self = .`serverDisabled`
        case "apps-off": self = .`appsOff`
        case "too-large": self = .`tooLarge`
        case "unavailable": self = .`unavailable`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`signedOut`: return "signed-out"
        case .`serverRemoved`: return "server-removed"
        case .`serverDisabled`: return "server-disabled"
        case .`appsOff`: return "apps-off"
        case .`tooLarge`: return "too-large"
        case .`unavailable`: return "unavailable"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AppFromRef: WireModel {
    public var `messageId`: String
    public var `title`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`messageId`: String, `title`: String) {
        self.`messageId` = `messageId`
        self.`title` = `title`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `messageId` = try object.required("messageId")
        `title` = try object.required("title")
        additionalFields = object.remainder(excluding: ["messageId", "title"])
        explicitNulls = object.nullKeys.intersection(["messageId", "title"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("messageId", `messageId`)
        try object.put("title", `title`)
        try object.encode(to: encoder)
    }
}

public struct AppPointedRef: WireModel {
    public var `appId`: String
    public var `label`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`appId`: String, `label`: String) {
        self.`appId` = `appId`
        self.`label` = `label`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `appId` = try object.required("appId")
        `label` = try object.required("label")
        additionalFields = object.remainder(excluding: ["appId", "label"])
        explicitNulls = object.nullKeys.intersection(["appId", "label"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("appId", `appId`)
        try object.put("label", `label`)
        try object.encode(to: encoder)
    }
}
