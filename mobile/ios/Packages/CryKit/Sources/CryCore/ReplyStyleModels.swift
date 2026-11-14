import Foundation

public enum ReplyStyle: WireModel, Hashable, Sendable {
    case `default`
    case `conversational`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "default": self = .`default`
        case "conversational": self = .`conversational`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`default`: return "default"
        case .`conversational`: return "conversational"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
