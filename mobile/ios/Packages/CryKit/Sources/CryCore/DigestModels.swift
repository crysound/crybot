import Foundation

public struct TurnDigest: WireModel {
    public var `turnId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `at`: Double
    public var `durationMs`: Double
    public var `tools`: [DigestTool]
    public var `toolCalls`: Double?
    public var `toolsDropped`: Double?
    public var `files`: DigestFiles?
    public var `memory`: [TurnDigestMemoryElement]
    public var `memoryDropped`: Double?
    public var `reply`: String
    public var `usage`: TurnDigestUsage?
    public var `hookCoverage`: HookCoverage
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `turnId`: String,
        `botId`: String,
        `threadId`: String,
        `at`: Double,
        `durationMs`: Double,
        `tools`: [DigestTool],
        `memory`: [TurnDigestMemoryElement],
        `reply`: String,
        `hookCoverage`: HookCoverage,
        `toolCalls`: Double? = nil,
        `toolsDropped`: Double? = nil,
        `files`: DigestFiles? = nil,
        `memoryDropped`: Double? = nil,
        `usage`: TurnDigestUsage? = nil
    ) {
        self.`turnId` = `turnId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`at` = `at`
        self.`durationMs` = `durationMs`
        self.`tools` = `tools`
        self.`toolCalls` = `toolCalls`
        self.`toolsDropped` = `toolsDropped`
        self.`files` = `files`
        self.`memory` = `memory`
        self.`memoryDropped` = `memoryDropped`
        self.`reply` = `reply`
        self.`usage` = `usage`
        self.`hookCoverage` = `hookCoverage`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `turnId` = try object.required("turnId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `at` = try object.required("at")
        `durationMs` = try object.required("durationMs")
        `tools` = try object.required("tools")
        `toolCalls` = try object.optional("toolCalls")
        `toolsDropped` = try object.optional("toolsDropped")
        `files` = try object.optional("files")
        `memory` = try object.required("memory")
        `memoryDropped` = try object.optional("memoryDropped")
        `reply` = try object.required("reply")
        `usage` = try object.optional("usage")
        `hookCoverage` = try object.required("hookCoverage")
        additionalFields = object.remainder(excluding: ["turnId", "botId", "threadId", "at", "durationMs", "tools", "toolCalls", "toolsDropped", "files", "memory", "memoryDropped", "reply", "usage", "hookCoverage"])
        explicitNulls = object.nullKeys.intersection(["turnId", "botId", "threadId", "at", "durationMs", "tools", "toolCalls", "toolsDropped", "files", "memory", "memoryDropped", "reply", "usage", "hookCoverage"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("turnId", `turnId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("at", `at`)
        try object.put("durationMs", `durationMs`)
        try object.put("tools", `tools`)
        try object.putOptional("toolCalls", `toolCalls`, nulls: explicitNulls)
        try object.putOptional("toolsDropped", `toolsDropped`, nulls: explicitNulls)
        try object.putOptional("files", `files`, nulls: explicitNulls)
        try object.put("memory", `memory`)
        try object.putOptional("memoryDropped", `memoryDropped`, nulls: explicitNulls)
        try object.put("reply", `reply`)
        try object.putOptional("usage", `usage`, nulls: explicitNulls)
        try object.put("hookCoverage", `hookCoverage`)
        try object.encode(to: encoder)
    }
}

public struct DigestTool: WireModel {
    public var `name`: String
    public var `count`: Double
    public var `failed`: Double
    public var `sample`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `count`: Double, `failed`: Double, `sample`: String? = nil) {
        self.`name` = `name`
        self.`count` = `count`
        self.`failed` = `failed`
        self.`sample` = `sample`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `count` = try object.required("count")
        `failed` = try object.required("failed")
        `sample` = try object.optional("sample")
        additionalFields = object.remainder(excluding: ["name", "count", "failed", "sample"])
        explicitNulls = object.nullKeys.intersection(["name", "count", "failed", "sample"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("count", `count`)
        try object.put("failed", `failed`)
        try object.putOptional("sample", `sample`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct DigestFiles: WireModel {
    public var `changed`: [String]
    public var `added`: [String]
    public var `deleted`: [String]
    public var `truncated`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`changed`: [String], `added`: [String], `deleted`: [String], `truncated`: Double? = nil) {
        self.`changed` = `changed`
        self.`added` = `added`
        self.`deleted` = `deleted`
        self.`truncated` = `truncated`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `changed` = try object.required("changed")
        `added` = try object.required("added")
        `deleted` = try object.required("deleted")
        `truncated` = try object.optional("truncated")
        additionalFields = object.remainder(excluding: ["changed", "added", "deleted", "truncated"])
        explicitNulls = object.nullKeys.intersection(["changed", "added", "deleted", "truncated"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("changed", `changed`)
        try object.put("added", `added`)
        try object.put("deleted", `deleted`)
        try object.putOptional("truncated", `truncated`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct TurnDigestMemoryElement: WireModel {
    public var `path`: String
    public var `kind`: TurnDigestMemoryElementKind
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`path`: String, `kind`: TurnDigestMemoryElementKind) {
        self.`path` = `path`
        self.`kind` = `kind`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `kind` = try object.required("kind")
        additionalFields = object.remainder(excluding: ["path", "kind"])
        explicitNulls = object.nullKeys.intersection(["path", "kind"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("kind", `kind`)
        try object.encode(to: encoder)
    }
}

public enum TurnDigestMemoryElementKind: WireModel, Hashable, Sendable {
    case `created`
    case `updated`
    case `deleted`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "created": self = .`created`
        case "updated": self = .`updated`
        case "deleted": self = .`deleted`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`created`: return "created"
        case .`updated`: return "updated"
        case .`deleted`: return "deleted"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct TurnDigestUsage: WireModel {
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var `costUsd`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`input`: Double, `output`: Double, `cachedInput`: Double? = nil, `costUsd`: Double? = nil) {
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
        self.`costUsd` = `costUsd`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        `costUsd` = try object.optional("costUsd")
        additionalFields = object.remainder(excluding: ["input", "output", "cachedInput", "costUsd"])
        explicitNulls = object.nullKeys.intersection(["input", "output", "cachedInput", "costUsd"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.putOptional("costUsd", `costUsd`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum HookCoverage: WireModel, Hashable, Sendable {
    case `full`
    case `preview`
    case `none`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "full": self = .`full`
        case "preview": self = .`preview`
        case "none": self = .`none`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`full`: return "full"
        case .`preview`: return "preview"
        case .`none`: return "none"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
