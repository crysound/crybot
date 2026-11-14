import Foundation

public enum ImageProvider: WireModel, Hashable, Sendable {
    case `openai`
    case `xai`
    case `gemini`
    case `openrouter`
    case `custom`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "openai": self = .`openai`
        case "xai": self = .`xai`
        case "gemini": self = .`gemini`
        case "openrouter": self = .`openrouter`
        case "custom": self = .`custom`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`openai`: return "openai"
        case .`xai`: return "xai"
        case .`gemini`: return "gemini"
        case .`openrouter`: return "openrouter"
        case .`custom`: return "custom"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
