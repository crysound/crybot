import Foundation

public enum MascotFaceColor: WireModel, Hashable, Sendable {
    case `white`
    case `black`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "white": self = .`white`
        case "black": self = .`black`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`white`: return "white"
        case .`black`: return "black"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum BotAvatarCrop: WireModel, Hashable, Sendable {
    case `mascot`
    case `circle`
    case `rounded`
    case `square`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "mascot": self = .`mascot`
        case "circle": self = .`circle`
        case "rounded": self = .`rounded`
        case "square": self = .`square`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`mascot`: return "mascot"
        case .`circle`: return "circle"
        case .`rounded`: return "rounded"
        case .`square`: return "square"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
