import Foundation

public enum CredentialTargetId: WireModel, Hashable, Sendable {
    case `xaiApiKey`
    case `boxToken`
    case `opencodeGoApiKey`
    case `ttsKey`
    case `geminiTtsKey`
    case `fishAudioKey`
    case `openaiImageApiKey`
    case `onePasswordToken`
    case `composioApiKey`
    case `openaiApiKey`
    case `anthropicApiKey`
    case `openrouterApiKey`
    case `mistralApiKey`
    case `cerebrasApiKey`
    case `groqApiKey`
    case `greenferenceApiKey`
    case `modelgoApiKey`
    case `metaApiKey`
    case `deepseekApiKey`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "xaiApiKey": self = .`xaiApiKey`
        case "boxToken": self = .`boxToken`
        case "opencodeGoApiKey": self = .`opencodeGoApiKey`
        case "ttsKey": self = .`ttsKey`
        case "geminiTtsKey": self = .`geminiTtsKey`
        case "fishAudioKey": self = .`fishAudioKey`
        case "openaiImageApiKey": self = .`openaiImageApiKey`
        case "onePasswordToken": self = .`onePasswordToken`
        case "composioApiKey": self = .`composioApiKey`
        case "openaiApiKey": self = .`openaiApiKey`
        case "anthropicApiKey": self = .`anthropicApiKey`
        case "openrouterApiKey": self = .`openrouterApiKey`
        case "mistralApiKey": self = .`mistralApiKey`
        case "cerebrasApiKey": self = .`cerebrasApiKey`
        case "groqApiKey": self = .`groqApiKey`
        case "greenferenceApiKey": self = .`greenferenceApiKey`
        case "modelgoApiKey": self = .`modelgoApiKey`
        case "metaApiKey": self = .`metaApiKey`
        case "deepseekApiKey": self = .`deepseekApiKey`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`xaiApiKey`: return "xaiApiKey"
        case .`boxToken`: return "boxToken"
        case .`opencodeGoApiKey`: return "opencodeGoApiKey"
        case .`ttsKey`: return "ttsKey"
        case .`geminiTtsKey`: return "geminiTtsKey"
        case .`fishAudioKey`: return "fishAudioKey"
        case .`openaiImageApiKey`: return "openaiImageApiKey"
        case .`onePasswordToken`: return "onePasswordToken"
        case .`composioApiKey`: return "composioApiKey"
        case .`openaiApiKey`: return "openaiApiKey"
        case .`anthropicApiKey`: return "anthropicApiKey"
        case .`openrouterApiKey`: return "openrouterApiKey"
        case .`mistralApiKey`: return "mistralApiKey"
        case .`cerebrasApiKey`: return "cerebrasApiKey"
        case .`groqApiKey`: return "groqApiKey"
        case .`greenferenceApiKey`: return "greenferenceApiKey"
        case .`modelgoApiKey`: return "modelgoApiKey"
        case .`metaApiKey`: return "metaApiKey"
        case .`deepseekApiKey`: return "deepseekApiKey"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
