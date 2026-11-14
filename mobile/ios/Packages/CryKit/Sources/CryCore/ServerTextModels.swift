import Foundation

public indirect enum ServerTextParamsValueValue: WireModel {
    case string(String)
    case number(Double)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .number(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public typealias ServerTextParams = [String: ServerTextParamsValueValue]

public struct ServerText: WireModel {
    public var `key`: String
    public var `params`: ServerTextParams?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`key`: String, `params`: ServerTextParams? = nil) {
        self.`key` = `key`
        self.`params` = `params`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `key` = try object.required("key")
        `params` = try object.optional("params")
        additionalFields = object.remainder(excluding: ["key", "params"])
        explicitNulls = object.nullKeys.intersection(["key", "params"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("key", `key`)
        try object.putOptional("params", `params`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ServerTextLine: WireModel {
    public var `textCode`: String?
    public var `textParams`: ServerTextParams?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`textCode`: String? = nil, `textParams`: ServerTextParams? = nil) {
        self.`textCode` = `textCode`
        self.`textParams` = `textParams`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `textCode` = try object.optional("textCode")
        `textParams` = try object.optional("textParams")
        additionalFields = object.remainder(excluding: ["textCode", "textParams"])
        explicitNulls = object.nullKeys.intersection(["textCode", "textParams"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("textCode", `textCode`, nulls: explicitNulls)
        try object.putOptional("textParams", `textParams`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ServerToolText: WireModel {
    public var `nameCode`: String?
    public var `nameParams`: ServerTextParams?
    public var `summaryCode`: String?
    public var `summaryParams`: ServerTextParams?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`nameCode`: String? = nil, `nameParams`: ServerTextParams? = nil, `summaryCode`: String? = nil, `summaryParams`: ServerTextParams? = nil) {
        self.`nameCode` = `nameCode`
        self.`nameParams` = `nameParams`
        self.`summaryCode` = `summaryCode`
        self.`summaryParams` = `summaryParams`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `nameCode` = try object.optional("nameCode")
        `nameParams` = try object.optional("nameParams")
        `summaryCode` = try object.optional("summaryCode")
        `summaryParams` = try object.optional("summaryParams")
        additionalFields = object.remainder(excluding: ["nameCode", "nameParams", "summaryCode", "summaryParams"])
        explicitNulls = object.nullKeys.intersection(["nameCode", "nameParams", "summaryCode", "summaryParams"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("nameCode", `nameCode`, nulls: explicitNulls)
        try object.putOptional("nameParams", `nameParams`, nulls: explicitNulls)
        try object.putOptional("summaryCode", `summaryCode`, nulls: explicitNulls)
        try object.putOptional("summaryParams", `summaryParams`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
