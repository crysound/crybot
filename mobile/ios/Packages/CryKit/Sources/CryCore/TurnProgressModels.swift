import Foundation

public struct LiveStep: WireModel {
    public var `activity`: TurnProgressActivity
    public var `target`: String
    public var `detail`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`activity`: TurnProgressActivity, `target`: String, `detail`: String? = nil) {
        self.`activity` = `activity`
        self.`target` = `target`
        self.`detail` = `detail`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `activity` = try object.required("activity")
        `target` = try object.required("target")
        `detail` = try object.optional("detail")
        additionalFields = object.remainder(excluding: ["activity", "target", "detail"])
        explicitNulls = object.nullKeys.intersection(["activity", "target", "detail"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("activity", `activity`)
        try object.put("target", `target`)
        try object.putOptional("detail", `detail`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum TurnProgressActivity: WireModel, Hashable, Sendable {
    case `write`
    case `edit`
    case `command`
    case `web`
    case `read`
    case `fetch`
    case `search`
    case `tool`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "write": self = .`write`
        case "edit": self = .`edit`
        case "command": self = .`command`
        case "web": self = .`web`
        case "read": self = .`read`
        case "fetch": self = .`fetch`
        case "search": self = .`search`
        case "tool": self = .`tool`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`write`: return "write"
        case .`edit`: return "edit"
        case .`command`: return "command"
        case .`web`: return "web"
        case .`read`: return "read"
        case .`fetch`: return "fetch"
        case .`search`: return "search"
        case .`tool`: return "tool"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct StepQuietOutput: WireModel {
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

public struct StepQuietNetwork: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct StepQuietBusy: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct StepQuietIdle: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public indirect enum StepQuiet: WireModel {
    case `output`(StepQuietOutput)
    case `network`(StepQuietNetwork)
    case `busy`(StepQuietBusy)
    case `idle`(StepQuietIdle)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`output`: return "output"
        case .`network`: return "network"
        case .`busy`: return "busy"
        case .`idle`: return "idle"
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
        case "output": self = .`output`(try payload.decode(StepQuietOutput.self))
        case "network": self = .`network`(try payload.decode(StepQuietNetwork.self))
        case "busy": self = .`busy`(try payload.decode(StepQuietBusy.self))
        case "idle": self = .`idle`(try payload.decode(StepQuietIdle.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`output`(let value): raw = try JSONValue(encoding: value)
        case .`network`(let value): raw = try JSONValue(encoding: value)
        case .`busy`(let value): raw = try JSONValue(encoding: value)
        case .`idle`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["kind"] = .string(kind)
        try raw.encode(to: encoder)
    }
}
