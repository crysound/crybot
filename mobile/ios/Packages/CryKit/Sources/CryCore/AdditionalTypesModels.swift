import Foundation

public typealias BotBodyId = String

public typealias PhoneApps = [String: PhoneGrant]

public enum TeamRole: WireModel, Hashable, Sendable {
    case `owner`
    case `admin`
    case `member`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "owner": self = .`owner`
        case "admin": self = .`admin`
        case "member": self = .`member`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`owner`: return "owner"
        case .`admin`: return "admin"
        case .`member`: return "member"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
