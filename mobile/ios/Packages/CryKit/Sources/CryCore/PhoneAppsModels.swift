import Foundation

public enum PhoneGrant: WireModel, Hashable, Sendable {
    case `read`
    case `write`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "read": self = .`read`
        case "write": self = .`write`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`read`: return "read"
        case .`write`: return "write"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
