import Foundation

public struct PublishedPageCard: WireModel {
    public var `state`: PublishedPageCardState
    public var `uncertain`: Bool?
    public var `title`: String
    public var `pageId`: String?
    public var `url`: String?
    public var `usage`: PublishedPageCardUsage?
    public var `message`: String?
    public var `upgrade`: Bool?
    public var `plan`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `state`: PublishedPageCardState,
        `title`: String,
        `uncertain`: Bool? = nil,
        `pageId`: String? = nil,
        `url`: String? = nil,
        `usage`: PublishedPageCardUsage? = nil,
        `message`: String? = nil,
        `upgrade`: Bool? = nil,
        `plan`: String? = nil
    ) {
        self.`state` = `state`
        self.`uncertain` = `uncertain`
        self.`title` = `title`
        self.`pageId` = `pageId`
        self.`url` = `url`
        self.`usage` = `usage`
        self.`message` = `message`
        self.`upgrade` = `upgrade`
        self.`plan` = `plan`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `state` = try object.required("state")
        `uncertain` = try object.optional("uncertain")
        `title` = try object.required("title")
        `pageId` = try object.optional("pageId")
        `url` = try object.optional("url")
        `usage` = try object.optional("usage")
        `message` = try object.optional("message")
        `upgrade` = try object.optional("upgrade")
        `plan` = try object.optional("plan")
        additionalFields = object.remainder(excluding: ["state", "uncertain", "title", "pageId", "url", "usage", "message", "upgrade", "plan"])
        explicitNulls = object.nullKeys.intersection(["state", "uncertain", "title", "pageId", "url", "usage", "message", "upgrade", "plan"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("state", `state`)
        try object.putOptional("uncertain", `uncertain`, nulls: explicitNulls)
        try object.put("title", `title`)
        try object.putOptional("pageId", `pageId`, nulls: explicitNulls)
        try object.putOptional("url", `url`, nulls: explicitNulls)
        try object.putOptional("usage", `usage`, nulls: explicitNulls)
        try object.putOptional("message", `message`, nulls: explicitNulls)
        try object.putOptional("upgrade", `upgrade`, nulls: explicitNulls)
        try object.putOptional("plan", `plan`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum PublishedPageCardState: WireModel, Hashable, Sendable {
    case `live`
    case `unpublished`
    case `limit`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "live": self = .`live`
        case "unpublished": self = .`unpublished`
        case "limit": self = .`limit`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`live`: return "live"
        case .`unpublished`: return "unpublished"
        case .`limit`: return "limit"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct PublishedPageCardUsage: WireModel {
    public var `pages`: Double
    public var `limit`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`pages`: Double, `limit`: Double) {
        self.`pages` = `pages`
        self.`limit` = `limit`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `pages` = try object.required("pages")
        `limit` = try object.required("limit")
        additionalFields = object.remainder(excluding: ["pages", "limit"])
        explicitNulls = object.nullKeys.intersection(["pages", "limit"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("pages", `pages`)
        try object.put("limit", `limit`)
        try object.encode(to: encoder)
    }
}
