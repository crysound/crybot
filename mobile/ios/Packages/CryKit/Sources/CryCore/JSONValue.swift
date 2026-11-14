import Foundation

/// JSON numbers retain decimal precision; unknown fields and explicit nulls survive a round trip.
public enum JSONValue: Codable, Equatable, Sendable {
    case null
    case bool(Bool)
    case number(Decimal)
    case floatingPoint(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    public init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer()
        if value.decodeNil() { self = .null }
        else if let bool = try? value.decode(Bool.self) { self = .bool(bool) }
        else if let number = try? value.decode(Decimal.self) { self = .number(number) }
        else if let number = try? value.decode(Double.self) { self = .floatingPoint(number) }
        else if let string = try? value.decode(String.self) { self = .string(string) }
        else if let array = try? value.decode([JSONValue].self) { self = .array(array) }
        else { self = .object(try value.decode([String: JSONValue].self)) }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .floatingPoint(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }

    public subscript(key: String) -> JSONValue? {
        get { objectValue?[key] }
        set {
            var object = objectValue ?? [:]
            object[key] = newValue
            self = .object(object)
        }
    }
    public var objectValue: [String: JSONValue]? { if case .object(let v) = self { return v }; return nil }
    public var arrayValue: [JSONValue]? { if case .array(let v) = self { return v }; return nil }
    public var stringValue: String? { if case .string(let v) = self { return v }; return nil }
    public var boolValue: Bool? { if case .bool(let v) = self { return v }; return nil }
    public var doubleValue: Double? {
        switch self {
        case .number(let value): return NSDecimalNumber(decimal: value).doubleValue
        case .floatingPoint(let value): return value
        default: return nil
        }
    }

    public init<T: Encodable>(encoding value: T) throws {
        self = try JSONDecoder().decode(Self.self, from: JSONEncoder().encode(value))
    }
    public func decode<T: Decodable>(_ type: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(type, from: JSONEncoder().encode(self))
    }
}

/// Keys excluded from contract comparisons. Models preserve every key by default.
public protocol WireModel: Codable, Equatable, Sendable {
    static var ignoredKeys: Set<String> { get }
}

public extension WireModel {
    static var ignoredKeys: Set<String> { [] }
}

struct WireObject {
    var values: [String: JSONValue]
    let codingPath: [CodingKey]

    init(from decoder: Decoder) throws {
        values = try [String: JSONValue](from: decoder)
        codingPath = decoder.codingPath
    }
    init(_ values: [String: JSONValue]) { self.values = values; codingPath = [] }

    func required<T: Decodable>(_ key: String) throws -> T {
        guard let value = values[key] else {
            throw DecodingError.keyNotFound(WireKey(key), .init(codingPath: codingPath, debugDescription: "Missing \(key)"))
        }
        return try value.decode()
    }
    func optional<T: Decodable>(_ key: String) throws -> T? {
        guard let value = values[key], value != .null else { return nil }
        return try value.decode()
    }
    func nullable<T: Decodable>(_ key: String) throws -> T? {
        guard values[key] != nil else {
            throw DecodingError.keyNotFound(WireKey(key), .init(codingPath: codingPath, debugDescription: "Missing \(key)"))
        }
        return try optional(key)
    }
    func remainder(excluding keys: Set<String>) -> [String: JSONValue] {
        values.filter { !keys.contains($0.key) }
    }
    var nullKeys: Set<String> { Set(values.filter { $0.value == .null }.keys) }
    mutating func put<T: Encodable>(_ key: String, _ value: T) throws {
        values[key] = try JSONValue(encoding: value)
    }
    mutating func putOptional<T: Encodable>(_ key: String, _ value: T?, nulls: Set<String>) throws {
        if let value { try put(key, value) }
        else if nulls.contains(key) { values[key] = .null }
        else { values.removeValue(forKey: key) }
    }
    mutating func putNullable<T: Encodable>(_ key: String, _ value: T?) throws {
        values[key] = try value.map { try JSONValue(encoding: $0) } ?? .null
    }
    func encode(to encoder: Encoder) throws { try values.encode(to: encoder) }
}

struct WireKey: CodingKey {
    var stringValue: String
    var intValue: Int? { nil }
    init(_ value: String) { stringValue = value }
    init?(stringValue: String) { self.init(stringValue) }
    init?(intValue: Int) { return nil }
}
