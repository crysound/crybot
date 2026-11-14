import Foundation

public struct SavedKey: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        additionalFields = object.remainder(excluding: ["configured", "last4"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ImageSlotStatus: WireModel {
    public var `provider`: ImageProvider
    public var `model`: String
    public var `configured`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`provider`: ImageProvider, `model`: String, `configured`: Bool) {
        self.`provider` = `provider`
        self.`model` = `model`
        self.`configured` = `configured`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `provider` = try object.required("provider")
        `model` = try object.required("model")
        `configured` = try object.required("configured")
        additionalFields = object.remainder(excluding: ["provider", "model", "configured"])
        explicitNulls = object.nullKeys.intersection(["provider", "model", "configured"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("provider", `provider`)
        try object.put("model", `model`)
        try object.put("configured", `configured`)
        try object.encode(to: encoder)
    }
}

public struct BrowserEngineSummary: WireModel {
    public var `kind`: BrowserEngineSummaryKind
    public var `reason`: String?
    public var `installable`: Bool?
    public var `version`: String?
    public var `chrome`: String?
    public var `installing`: Bool?
    public var `installError`: String?
    public var `myChrome`: Bool?
    public var `myChromeOn`: BrowserEngineSummaryMyChromeOn?
    public var `myChromeLendable`: Bool?
    public var `engine`: BrowserEngineSummaryEngine?
    public var `serverSites`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `kind`: BrowserEngineSummaryKind,
        `reason`: String? = nil,
        `installable`: Bool? = nil,
        `version`: String? = nil,
        `chrome`: String? = nil,
        `installing`: Bool? = nil,
        `installError`: String? = nil,
        `myChrome`: Bool? = nil,
        `myChromeOn`: BrowserEngineSummaryMyChromeOn? = nil,
        `myChromeLendable`: Bool? = nil,
        `engine`: BrowserEngineSummaryEngine? = nil,
        `serverSites`: Bool? = nil
    ) {
        self.`kind` = `kind`
        self.`reason` = `reason`
        self.`installable` = `installable`
        self.`version` = `version`
        self.`chrome` = `chrome`
        self.`installing` = `installing`
        self.`installError` = `installError`
        self.`myChrome` = `myChrome`
        self.`myChromeOn` = `myChromeOn`
        self.`myChromeLendable` = `myChromeLendable`
        self.`engine` = `engine`
        self.`serverSites` = `serverSites`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `reason` = try object.optional("reason")
        `installable` = try object.optional("installable")
        `version` = try object.optional("version")
        `chrome` = try object.optional("chrome")
        `installing` = try object.optional("installing")
        `installError` = try object.optional("installError")
        `myChrome` = try object.optional("myChrome")
        `myChromeOn` = try object.optional("myChromeOn")
        `myChromeLendable` = try object.optional("myChromeLendable")
        `engine` = try object.optional("engine")
        `serverSites` = try object.optional("serverSites")
        additionalFields = object.remainder(excluding: ["kind", "reason", "installable", "version", "chrome", "installing", "installError", "myChrome", "myChromeOn", "myChromeLendable", "engine", "serverSites"])
        explicitNulls = object.nullKeys.intersection(["kind", "reason", "installable", "version", "chrome", "installing", "installError", "myChrome", "myChromeOn", "myChromeLendable", "engine", "serverSites"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("installable", `installable`, nulls: explicitNulls)
        try object.putOptional("version", `version`, nulls: explicitNulls)
        try object.putOptional("chrome", `chrome`, nulls: explicitNulls)
        try object.putOptional("installing", `installing`, nulls: explicitNulls)
        try object.putOptional("installError", `installError`, nulls: explicitNulls)
        try object.putOptional("myChrome", `myChrome`, nulls: explicitNulls)
        try object.putOptional("myChromeOn", `myChromeOn`, nulls: explicitNulls)
        try object.putOptional("myChromeLendable", `myChromeLendable`, nulls: explicitNulls)
        try object.putOptional("engine", `engine`, nulls: explicitNulls)
        try object.putOptional("serverSites", `serverSites`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum BrowserEngineSummaryKind: WireModel, Hashable, Sendable {
    case `engine`
    case `unavailable`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "engine": self = .`engine`
        case "unavailable": self = .`unavailable`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`engine`: return "engine"
        case .`unavailable`: return "unavailable"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct BrowserEngineSummaryMyChromeOn: WireModel {
    public var `name`: String
    public var `device`: BrowserEngineSummaryMyChromeOnDevice
    public var `online`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `device`: BrowserEngineSummaryMyChromeOnDevice, `online`: Bool) {
        self.`name` = `name`
        self.`device` = `device`
        self.`online` = `online`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `device` = try object.required("device")
        `online` = try object.required("online")
        additionalFields = object.remainder(excluding: ["name", "device", "online"])
        explicitNulls = object.nullKeys.intersection(["name", "device", "online"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("device", `device`)
        try object.put("online", `online`)
        try object.encode(to: encoder)
    }
}

public enum BrowserEngineSummaryMyChromeOnDevice: WireModel, Hashable, Sendable {
    case `pC`
    case `mac`
    case `computer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "PC": self = .`pC`
        case "Mac": self = .`mac`
        case "computer": self = .`computer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`pC`: return "PC"
        case .`mac`: return "Mac"
        case .`computer`: return "computer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum BrowserEngineSummaryEngine: WireModel, Hashable, Sendable {
    case `agentBrowser`
    case `chrome`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "agent-browser": self = .`agentBrowser`
        case "chrome": self = .`chrome`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`agentBrowser`: return "agent-browser"
        case .`chrome`: return "chrome"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct BrowserProfile: WireModel {
    public var `id`: String
    public var `name`: String
    public var `browser`: String?
    public var `partitionId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `name`: String, `browser`: String? = nil, `partitionId`: String? = nil) {
        self.`id` = `id`
        self.`name` = `name`
        self.`browser` = `browser`
        self.`partitionId` = `partitionId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `browser` = try object.optional("browser")
        `partitionId` = try object.optional("partitionId")
        additionalFields = object.remainder(excluding: ["id", "name", "browser", "partitionId"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "browser", "partitionId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.putOptional("browser", `browser`, nulls: explicitNulls)
        try object.putOptional("partitionId", `partitionId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ManagedPolicySummary: WireModel {
    public var `organizationName`: String
    public var `version`: Double
    public var `companyModelsOnly`: Bool
    public var `allowedEngines`: ManagedPolicySummaryAllowedEngines
    public var `mcp`: ManagedPolicySummaryMcp
    public var `computers`: ManagedPolicySummaryComputers
    public var `remoteAccess`: Bool
    public var `apps`: ManagedPolicySummaryApps?
    public var `team`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `organizationName`: String,
        `version`: Double,
        `companyModelsOnly`: Bool,
        `allowedEngines`: ManagedPolicySummaryAllowedEngines,
        `mcp`: ManagedPolicySummaryMcp,
        `computers`: ManagedPolicySummaryComputers,
        `remoteAccess`: Bool,
        `apps`: ManagedPolicySummaryApps? = nil,
        `team`: Bool? = nil
    ) {
        self.`organizationName` = `organizationName`
        self.`version` = `version`
        self.`companyModelsOnly` = `companyModelsOnly`
        self.`allowedEngines` = `allowedEngines`
        self.`mcp` = `mcp`
        self.`computers` = `computers`
        self.`remoteAccess` = `remoteAccess`
        self.`apps` = `apps`
        self.`team` = `team`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `organizationName` = try object.required("organizationName")
        `version` = try object.required("version")
        `companyModelsOnly` = try object.required("companyModelsOnly")
        `allowedEngines` = try object.required("allowedEngines")
        `mcp` = try object.required("mcp")
        `computers` = try object.required("computers")
        `remoteAccess` = try object.required("remoteAccess")
        `apps` = try object.optional("apps")
        `team` = try object.optional("team")
        additionalFields = object.remainder(excluding: ["organizationName", "version", "companyModelsOnly", "allowedEngines", "mcp", "computers", "remoteAccess", "apps", "team"])
        explicitNulls = object.nullKeys.intersection(["organizationName", "version", "companyModelsOnly", "allowedEngines", "mcp", "computers", "remoteAccess", "apps", "team"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("organizationName", `organizationName`)
        try object.put("version", `version`)
        try object.put("companyModelsOnly", `companyModelsOnly`)
        try object.put("allowedEngines", `allowedEngines`)
        try object.put("mcp", `mcp`)
        try object.put("computers", `computers`)
        try object.put("remoteAccess", `remoteAccess`)
        try object.putOptional("apps", `apps`, nulls: explicitNulls)
        try object.putOptional("team", `team`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum ManagedPolicySummaryAllowedEngines: WireModel {
    case string(String)
    case array([String])
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if raw == .string("all"), let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode([String].self) { self = .array(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .array(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct ManagedPolicySummaryMcp: WireModel {
    public var `allowCustom`: Bool
    public var `allowlist`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`allowCustom`: Bool, `allowlist`: [String]) {
        self.`allowCustom` = `allowCustom`
        self.`allowlist` = `allowlist`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `allowCustom` = try object.required("allowCustom")
        `allowlist` = try object.required("allowlist")
        additionalFields = object.remainder(excluding: ["allowCustom", "allowlist"])
        explicitNulls = object.nullKeys.intersection(["allowCustom", "allowlist"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("allowCustom", `allowCustom`)
        try object.put("allowlist", `allowlist`)
        try object.encode(to: encoder)
    }
}

public struct ManagedPolicySummaryComputers: WireModel {
    public var `thisComputer`: Bool
    public var `localVm`: Bool
    public var `box`: Bool
    public var `vps`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`thisComputer`: Bool, `localVm`: Bool, `box`: Bool, `vps`: Bool) {
        self.`thisComputer` = `thisComputer`
        self.`localVm` = `localVm`
        self.`box` = `box`
        self.`vps` = `vps`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `thisComputer` = try object.required("thisComputer")
        `localVm` = try object.required("localVm")
        `box` = try object.required("box")
        `vps` = try object.required("vps")
        additionalFields = object.remainder(excluding: ["thisComputer", "localVm", "box", "vps"])
        explicitNulls = object.nullKeys.intersection(["thisComputer", "localVm", "box", "vps"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("thisComputer", `thisComputer`)
        try object.put("localVm", `localVm`)
        try object.put("box", `box`)
        try object.put("vps", `vps`)
        try object.encode(to: encoder)
    }
}

public struct ManagedPolicySummaryApps: WireModel {
    public var `allowAll`: Bool
    public var `allowlist`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`allowAll`: Bool, `allowlist`: [String]) {
        self.`allowAll` = `allowAll`
        self.`allowlist` = `allowlist`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `allowAll` = try object.required("allowAll")
        `allowlist` = try object.required("allowlist")
        additionalFields = object.remainder(excluding: ["allowAll", "allowlist"])
        explicitNulls = object.nullKeys.intersection(["allowAll", "allowlist"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("allowAll", `allowAll`)
        try object.put("allowlist", `allowlist`)
        try object.encode(to: encoder)
    }
}
