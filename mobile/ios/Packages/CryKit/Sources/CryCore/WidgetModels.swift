import Foundation

public struct WidgetButtonSpec: WireModel {
    public var `label`: String
    public var `action`: WidgetAction
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`label`: String, `action`: WidgetAction) {
        self.`label` = `label`
        self.`action` = `action`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `label` = try object.required("label")
        `action` = try object.required("action")
        additionalFields = object.remainder(excluding: ["label", "action"])
        explicitNulls = object.nullKeys.intersection(["label", "action"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("label", `label`)
        try object.put("action", `action`)
        try object.encode(to: encoder)
    }
}

public struct WidgetAction: WireModel {
    public var `type`: String
    public var `payload`: JSONValue?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`type`: String, `payload`: JSONValue? = nil) {
        self.`type` = `type`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `type` = try object.required("type")
        `payload` = try object.optional("payload")
        additionalFields = object.remainder(excluding: ["type", "payload"])
        explicitNulls = object.nullKeys.intersection(["type", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("type", `type`)
        try object.putOptional("payload", `payload`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WidgetPayload: WireModel {
    public var `v`: Double
    public var `root`: WidgetNode
    public var `rev`: Double?
    public var `settled`: WidgetSettled?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`v`: Double, `root`: WidgetNode, `rev`: Double? = nil, `settled`: WidgetSettled? = nil) {
        self.`v` = `v`
        self.`root` = `root`
        self.`rev` = `rev`
        self.`settled` = `settled`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `v` = try object.required("v")
        `root` = try object.required("root")
        `rev` = try object.optional("rev")
        `settled` = try object.optional("settled")
        additionalFields = object.remainder(excluding: ["v", "root", "rev", "settled"])
        explicitNulls = object.nullKeys.intersection(["v", "root", "rev", "settled"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("v", `v`)
        try object.put("root", `root`)
        try object.putOptional("rev", `rev`, nulls: explicitNulls)
        try object.putOptional("settled", `settled`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WidgetSettled: WireModel {
    public var `ref`: String
    public var `label`: String
    public var `tone`: WidgetSettledTone
    public var `at`: Double
    public var `sendId`: String?
    public var `values`: WidgetValues?
    public var `other`: WidgetOther?
    public var `queueId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `ref`: String,
        `label`: String,
        `tone`: WidgetSettledTone,
        `at`: Double,
        `sendId`: String? = nil,
        `values`: WidgetValues? = nil,
        `other`: WidgetOther? = nil,
        `queueId`: String? = nil
    ) {
        self.`ref` = `ref`
        self.`label` = `label`
        self.`tone` = `tone`
        self.`at` = `at`
        self.`sendId` = `sendId`
        self.`values` = `values`
        self.`other` = `other`
        self.`queueId` = `queueId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `ref` = try object.required("ref")
        `label` = try object.required("label")
        `tone` = try object.required("tone")
        `at` = try object.required("at")
        `sendId` = try object.optional("sendId")
        `values` = try object.optional("values")
        `other` = try object.optional("other")
        `queueId` = try object.optional("queueId")
        additionalFields = object.remainder(excluding: ["ref", "label", "tone", "at", "sendId", "values", "other", "queueId"])
        explicitNulls = object.nullKeys.intersection(["ref", "label", "tone", "at", "sendId", "values", "other", "queueId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("ref", `ref`)
        try object.put("label", `label`)
        try object.put("tone", `tone`)
        try object.put("at", `at`)
        try object.putOptional("sendId", `sendId`, nulls: explicitNulls)
        try object.putOptional("values", `values`, nulls: explicitNulls)
        try object.putOptional("other", `other`, nulls: explicitNulls)
        try object.putOptional("queueId", `queueId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WidgetSettledTone: WireModel, Hashable, Sendable {
    case `confirm`
    case `cancel`
    case `submit`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "confirm": self = .`confirm`
        case "cancel": self = .`cancel`
        case "submit": self = .`submit`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`confirm`: return "confirm"
        case .`cancel`: return "cancel"
        case .`submit`: return "submit"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public indirect enum WidgetValuesValueValue: WireModel {
    case string(String)
    case bool(Bool)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode(Bool.self) { self = .bool(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .bool(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public typealias WidgetValues = [String: WidgetValuesValueValue]

public typealias WidgetOther = [String: String]
