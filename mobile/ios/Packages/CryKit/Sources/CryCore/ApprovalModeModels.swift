import Foundation

public enum ApprovalMode: WireModel, Hashable, Sendable {
    case `ask`
    case `edits`
    case `auto`
    case `full`
    case `custom`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "ask": self = .`ask`
        case "edits": self = .`edits`
        case "auto": self = .`auto`
        case "full": self = .`full`
        case "custom": self = .`custom`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`ask`: return "ask"
        case .`edits`: return "edits"
        case .`auto`: return "auto"
        case .`full`: return "full"
        case .`custom`: return "custom"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
