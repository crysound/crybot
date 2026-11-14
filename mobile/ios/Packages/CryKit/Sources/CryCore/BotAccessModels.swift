import Foundation

public struct BotAccess: WireModel {
    public var `everyone`: BotAccessLevel
    public var `people`: [String: GrantedLevel]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`everyone`: BotAccessLevel, `people`: [String: GrantedLevel]) {
        self.`everyone` = `everyone`
        self.`people` = `people`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `everyone` = try object.required("everyone")
        `people` = try object.required("people")
        additionalFields = object.remainder(excluding: ["everyone", "people"])
        explicitNulls = object.nullKeys.intersection(["everyone", "people"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("everyone", `everyone`)
        try object.put("people", `people`)
        try object.encode(to: encoder)
    }
}

public enum BotAccessLevel: WireModel, Hashable, Sendable {
    case `none`
    case `view`
    case `chat`
    case `edit`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "none": self = .`none`
        case "view": self = .`view`
        case "chat": self = .`chat`
        case "edit": self = .`edit`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`none`: return "none"
        case .`view`: return "view"
        case .`chat`: return "chat"
        case .`edit`: return "edit"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum GrantedLevel: WireModel, Hashable, Sendable {
    case `view`
    case `chat`
    case `edit`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "view": self = .`view`
        case "chat": self = .`chat`
        case "edit": self = .`edit`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`view`: return "view"
        case .`chat`: return "chat"
        case .`edit`: return "edit"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
