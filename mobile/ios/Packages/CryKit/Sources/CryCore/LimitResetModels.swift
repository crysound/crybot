import Foundation

public enum LimitResetRepeat: WireModel, Hashable, Sendable {
    case `once`
    case `everyReset`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "once": self = .`once`
        case "every_reset": self = .`everyReset`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`once`: return "once"
        case .`everyReset`: return "every_reset"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
