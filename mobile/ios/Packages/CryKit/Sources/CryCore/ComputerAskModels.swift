import Foundation

public struct ComputerAskCard: WireModel {
    public var `need`: ComputerNeed
    public var `reason`: ComputerAskReason
    public var `device`: ComputerDevice
    public var `state`: ComputerAskState
    public var `why`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `need`: ComputerNeed,
        `reason`: ComputerAskReason,
        `device`: ComputerDevice,
        `state`: ComputerAskState,
        `why`: String? = nil
    ) {
        self.`need` = `need`
        self.`reason` = `reason`
        self.`device` = `device`
        self.`state` = `state`
        self.`why` = `why`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `need` = try object.required("need")
        `reason` = try object.required("reason")
        `device` = try object.required("device")
        `state` = try object.required("state")
        `why` = try object.optional("why")
        additionalFields = object.remainder(excluding: ["need", "reason", "device", "state", "why"])
        explicitNulls = object.nullKeys.intersection(["need", "reason", "device", "state", "why"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("need", `need`)
        try object.put("reason", `reason`)
        try object.put("device", `device`)
        try object.put("state", `state`)
        try object.putOptional("why", `why`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ComputerNeed: WireModel, Hashable, Sendable {
    case `screen`
    case `folders`
    case `terminal`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "screen": self = .`screen`
        case "folders": self = .`folders`
        case "terminal": self = .`terminal`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`screen`: return "screen"
        case .`folders`: return "folders"
        case .`terminal`: return "terminal"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum ComputerAskReason: WireModel, Hashable, Sendable {
    case `paused`
    case `starting`
    case `permissions`
    case `blocked`
    case `off`
    case `notRunning`
    case `unsupported`
    case `terminalOff`
    case `closed`
    case `never`
    case `update`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "paused": self = .`paused`
        case "starting": self = .`starting`
        case "permissions": self = .`permissions`
        case "blocked": self = .`blocked`
        case "off": self = .`off`
        case "not-running": self = .`notRunning`
        case "unsupported": self = .`unsupported`
        case "terminal-off": self = .`terminalOff`
        case "closed": self = .`closed`
        case "never": self = .`never`
        case "update": self = .`update`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`paused`: return "paused"
        case .`starting`: return "starting"
        case .`permissions`: return "permissions"
        case .`blocked`: return "blocked"
        case .`off`: return "off"
        case .`notRunning`: return "not-running"
        case .`unsupported`: return "unsupported"
        case .`terminalOff`: return "terminal-off"
        case .`closed`: return "closed"
        case .`never`: return "never"
        case .`update`: return "update"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum ComputerDevice: WireModel, Hashable, Sendable {
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

public enum ComputerAskState: WireModel, Hashable, Sendable {
    case `asking`
    case `turningOn`
    case `on`
    case `failed`
    case `declined`
    case `ended`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "asking": self = .`asking`
        case "turning-on": self = .`turningOn`
        case "on": self = .`on`
        case "failed": self = .`failed`
        case "declined": self = .`declined`
        case "ended": self = .`ended`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`asking`: return "asking"
        case .`turningOn`: return "turning-on"
        case .`on`: return "on"
        case .`failed`: return "failed"
        case .`declined`: return "declined"
        case .`ended`: return "ended"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
