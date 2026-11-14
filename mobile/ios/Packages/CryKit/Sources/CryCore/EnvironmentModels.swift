import Foundation

public enum ServerInstall: WireModel, Hashable, Sendable {
    case `npx`
    case `global`
    case `docker`
    case `source`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "npx": self = .`npx`
        case "global": self = .`global`
        case "docker": self = .`docker`
        case "source": self = .`source`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`npx`: return "npx"
        case .`global`: return "global"
        case .`docker`: return "docker"
        case .`source`: return "source"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
