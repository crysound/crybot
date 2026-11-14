import Foundation

public struct SkillRequestCardData: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `stagedId`: String
    public var `action`: SkillRequestAction
    public var `name`: String
    public var `gist`: String
    public var `source`: String?
    public var `preview`: String?
    public var `sha256`: String?
    public var `references`: [SkillRequestCardDataReferencesElement]?
    public var `referencesSha256`: String?
    public var `warnings`: [String]
    public var `createdAt`: Double
    public var `previous`: SkillRequestCardDataPrevious?
    public var `shared`: SkillShareRecord?
    public var `shareError`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `stagedId`: String,
        `action`: SkillRequestAction,
        `name`: String,
        `gist`: String,
        `warnings`: [String],
        `createdAt`: Double,
        `source`: String? = nil,
        `preview`: String? = nil,
        `sha256`: String? = nil,
        `references`: [SkillRequestCardDataReferencesElement]? = nil,
        `referencesSha256`: String? = nil,
        `previous`: SkillRequestCardDataPrevious? = nil,
        `shared`: SkillShareRecord? = nil,
        `shareError`: String? = nil
    ) {
        self.`version` = `version`
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`stagedId` = `stagedId`
        self.`action` = `action`
        self.`name` = `name`
        self.`gist` = `gist`
        self.`source` = `source`
        self.`preview` = `preview`
        self.`sha256` = `sha256`
        self.`references` = `references`
        self.`referencesSha256` = `referencesSha256`
        self.`warnings` = `warnings`
        self.`createdAt` = `createdAt`
        self.`previous` = `previous`
        self.`shared` = `shared`
        self.`shareError` = `shareError`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `requestId` = try object.required("requestId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `stagedId` = try object.required("stagedId")
        `action` = try object.required("action")
        `name` = try object.required("name")
        `gist` = try object.required("gist")
        `source` = try object.optional("source")
        `preview` = try object.optional("preview")
        `sha256` = try object.optional("sha256")
        `references` = try object.optional("references")
        `referencesSha256` = try object.optional("referencesSha256")
        `warnings` = try object.required("warnings")
        `createdAt` = try object.required("createdAt")
        `previous` = try object.optional("previous")
        `shared` = try object.optional("shared")
        `shareError` = try object.optional("shareError")
        additionalFields = object.remainder(excluding: ["version", "requestId", "botId", "threadId", "stagedId", "action", "name", "gist", "source", "preview", "sha256", "references", "referencesSha256", "warnings", "createdAt", "previous", "shared", "shareError"])
        explicitNulls = object.nullKeys.intersection(["version", "requestId", "botId", "threadId", "stagedId", "action", "name", "gist", "source", "preview", "sha256", "references", "referencesSha256", "warnings", "createdAt", "previous", "shared", "shareError"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("requestId", `requestId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("stagedId", `stagedId`)
        try object.put("action", `action`)
        try object.put("name", `name`)
        try object.put("gist", `gist`)
        try object.putOptional("source", `source`, nulls: explicitNulls)
        try object.putOptional("preview", `preview`, nulls: explicitNulls)
        try object.putOptional("sha256", `sha256`, nulls: explicitNulls)
        try object.putOptional("references", `references`, nulls: explicitNulls)
        try object.putOptional("referencesSha256", `referencesSha256`, nulls: explicitNulls)
        try object.put("warnings", `warnings`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("previous", `previous`, nulls: explicitNulls)
        try object.putOptional("shared", `shared`, nulls: explicitNulls)
        try object.putOptional("shareError", `shareError`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum SkillRequestAction: WireModel, Hashable, Sendable {
    case `create`
    case `update`
    case `enable`
    case `disable`
    case `delete`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "create": self = .`create`
        case "update": self = .`update`
        case "enable": self = .`enable`
        case "disable": self = .`disable`
        case "delete": self = .`delete`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`create`: return "create"
        case .`update`: return "update"
        case .`enable`: return "enable"
        case .`disable`: return "disable"
        case .`delete`: return "delete"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct SkillRequestCardDataReferencesElement: WireModel {
    public var `path`: String
    public var `content`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`path`: String, `content`: String) {
        self.`path` = `path`
        self.`content` = `content`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `content` = try object.required("content")
        additionalFields = object.remainder(excluding: ["path", "content"])
        explicitNulls = object.nullKeys.intersection(["path", "content"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("content", `content`)
        try object.encode(to: encoder)
    }
}

public struct SkillRequestCardDataPrevious: WireModel {
    public var `preview`: String
    public var `source`: String
    public var `references`: [SkillRequestCardDataPreviousReferencesElement]?
    public var `enabled`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`preview`: String, `source`: String, `references`: [SkillRequestCardDataPreviousReferencesElement]? = nil, `enabled`: Bool? = nil) {
        self.`preview` = `preview`
        self.`source` = `source`
        self.`references` = `references`
        self.`enabled` = `enabled`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `preview` = try object.required("preview")
        `source` = try object.required("source")
        `references` = try object.optional("references")
        `enabled` = try object.optional("enabled")
        additionalFields = object.remainder(excluding: ["preview", "source", "references", "enabled"])
        explicitNulls = object.nullKeys.intersection(["preview", "source", "references", "enabled"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("preview", `preview`)
        try object.put("source", `source`)
        try object.putOptional("references", `references`, nulls: explicitNulls)
        try object.putOptional("enabled", `enabled`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct SkillRequestCardDataPreviousReferencesElement: WireModel {
    public var `path`: String
    public var `content`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`path`: String, `content`: String) {
        self.`path` = `path`
        self.`content` = `content`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `content` = try object.required("content")
        additionalFields = object.remainder(excluding: ["path", "content"])
        explicitNulls = object.nullKeys.intersection(["path", "content"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("content", `content`)
        try object.encode(to: encoder)
    }
}

public struct SkillShareRecord: WireModel {
    public var `library`: SkillShareRecordLibrary
    public var `sha256`: String
    public var `sharedAt`: Double
    public var `assigned`: [SkillShareRecordAssignedElement]
    public var `skipped`: [SkillShareRecordSkippedElement]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `library`: SkillShareRecordLibrary,
        `sha256`: String,
        `sharedAt`: Double,
        `assigned`: [SkillShareRecordAssignedElement],
        `skipped`: [SkillShareRecordSkippedElement]
    ) {
        self.`library` = `library`
        self.`sha256` = `sha256`
        self.`sharedAt` = `sharedAt`
        self.`assigned` = `assigned`
        self.`skipped` = `skipped`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `library` = try object.required("library")
        `sha256` = try object.required("sha256")
        `sharedAt` = try object.required("sharedAt")
        `assigned` = try object.required("assigned")
        `skipped` = try object.required("skipped")
        additionalFields = object.remainder(excluding: ["library", "sha256", "sharedAt", "assigned", "skipped"])
        explicitNulls = object.nullKeys.intersection(["library", "sha256", "sharedAt", "assigned", "skipped"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("library", `library`)
        try object.put("sha256", `sha256`)
        try object.put("sharedAt", `sharedAt`)
        try object.put("assigned", `assigned`)
        try object.put("skipped", `skipped`)
        try object.encode(to: encoder)
    }
}

public enum SkillShareRecordLibrary: WireModel, Hashable, Sendable {
    case `installed`
    case `deduplicated`
    case `assigned`
    case `updated`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "installed": self = .`installed`
        case "deduplicated": self = .`deduplicated`
        case "assigned": self = .`assigned`
        case "updated": self = .`updated`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`installed`: return "installed"
        case .`deduplicated`: return "deduplicated"
        case .`assigned`: return "assigned"
        case .`updated`: return "updated"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct SkillShareRecordAssignedElement: WireModel {
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

public struct SkillShareRecordSkippedElement: WireModel {
    public var `botId`: String
    public var `name`: String
    public var `reason`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String, `reason`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
        self.`reason` = `reason`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        `reason` = try object.required("reason")
        additionalFields = object.remainder(excluding: ["botId", "name", "reason"])
        explicitNulls = object.nullKeys.intersection(["botId", "name", "reason"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.put("reason", `reason`)
        try object.encode(to: encoder)
    }
}
