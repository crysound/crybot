import Foundation

public struct LiveCallRecord: WireModel {
    public var `callId`: String
    public var `botId`: String
    public var `client`: LiveClient
    public var `startedAt`: Double
    public var `endedAt`: Double
    public var `seconds`: Double
    public var `endReason`: LiveEndReason
    public var `title`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `callId`: String,
        `botId`: String,
        `client`: LiveClient,
        `startedAt`: Double,
        `endedAt`: Double,
        `seconds`: Double,
        `endReason`: LiveEndReason,
        `title`: String? = nil
    ) {
        self.`callId` = `callId`
        self.`botId` = `botId`
        self.`client` = `client`
        self.`startedAt` = `startedAt`
        self.`endedAt` = `endedAt`
        self.`seconds` = `seconds`
        self.`endReason` = `endReason`
        self.`title` = `title`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `callId` = try object.required("callId")
        `botId` = try object.required("botId")
        `client` = try object.required("client")
        `startedAt` = try object.required("startedAt")
        `endedAt` = try object.required("endedAt")
        `seconds` = try object.required("seconds")
        `endReason` = try object.required("endReason")
        `title` = try object.optional("title")
        additionalFields = object.remainder(excluding: ["callId", "botId", "client", "startedAt", "endedAt", "seconds", "endReason", "title"])
        explicitNulls = object.nullKeys.intersection(["callId", "botId", "client", "startedAt", "endedAt", "seconds", "endReason", "title"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("callId", `callId`)
        try object.put("botId", `botId`)
        try object.put("client", `client`)
        try object.put("startedAt", `startedAt`)
        try object.put("endedAt", `endedAt`)
        try object.put("seconds", `seconds`)
        try object.put("endReason", `endReason`)
        try object.putOptional("title", `title`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum LiveClient: WireModel, Hashable, Sendable {
    case `desktop`
    case `web`
    case `ios`
    case `android`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "desktop": self = .`desktop`
        case "web": self = .`web`
        case "ios": self = .`ios`
        case "android": self = .`android`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`desktop`: return "desktop"
        case .`web`: return "web"
        case .`ios`: return "ios"
        case .`android`: return "android"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum LiveEndReason: WireModel, Hashable, Sendable {
    case `hungUp`
    case `idle`
    case `expired`
    case `content`
    case `remoteHangup`
    case `connectionLost`
    case `sidebandLost`
    case `deleted`
    case `shutdown`
    case `signedOut`
    case `error`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "hung-up": self = .`hungUp`
        case "idle": self = .`idle`
        case "expired": self = .`expired`
        case "content": self = .`content`
        case "remote-hangup": self = .`remoteHangup`
        case "connection-lost": self = .`connectionLost`
        case "sideband-lost": self = .`sidebandLost`
        case "deleted": self = .`deleted`
        case "shutdown": self = .`shutdown`
        case "signed-out": self = .`signedOut`
        case "error": self = .`error`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`hungUp`: return "hung-up"
        case .`idle`: return "idle"
        case .`expired`: return "expired"
        case .`content`: return "content"
        case .`remoteHangup`: return "remote-hangup"
        case .`connectionLost`: return "connection-lost"
        case .`sidebandLost`: return "sideband-lost"
        case .`deleted`: return "deleted"
        case .`shutdown`: return "shutdown"
        case .`signedOut`: return "signed-out"
        case .`error`: return "error"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct LiveCallState: WireModel {
    public var `callId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `client`: LiveClient
    public var `voice`: String
    public var `startedAt`: Double
    public var `status`: LiveCallStatus
    public var `endReason`: LiveEndReason?
    public var `error`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `callId`: String,
        `botId`: String,
        `threadId`: String,
        `client`: LiveClient,
        `voice`: String,
        `startedAt`: Double,
        `status`: LiveCallStatus,
        `endReason`: LiveEndReason? = nil,
        `error`: String? = nil
    ) {
        self.`callId` = `callId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`client` = `client`
        self.`voice` = `voice`
        self.`startedAt` = `startedAt`
        self.`status` = `status`
        self.`endReason` = `endReason`
        self.`error` = `error`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `callId` = try object.required("callId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `client` = try object.required("client")
        `voice` = try object.required("voice")
        `startedAt` = try object.required("startedAt")
        `status` = try object.required("status")
        `endReason` = try object.optional("endReason")
        `error` = try object.optional("error")
        additionalFields = object.remainder(excluding: ["callId", "botId", "threadId", "client", "voice", "startedAt", "status", "endReason", "error"])
        explicitNulls = object.nullKeys.intersection(["callId", "botId", "threadId", "client", "voice", "startedAt", "status", "endReason", "error"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("callId", `callId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("client", `client`)
        try object.put("voice", `voice`)
        try object.put("startedAt", `startedAt`)
        try object.put("status", `status`)
        try object.putOptional("endReason", `endReason`, nulls: explicitNulls)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum LiveCallStatus: WireModel, Hashable, Sendable {
    case `connecting`
    case `live`
    case `ending`
    case `ended`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "connecting": self = .`connecting`
        case "live": self = .`live`
        case "ending": self = .`ending`
        case "ended": self = .`ended`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`connecting`: return "connecting"
        case .`live`: return "live"
        case .`ending`: return "ending"
        case .`ended`: return "ended"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct LiveSettings: WireModel {
    public var `configured`: Bool
    public var `keySource`: LiveKeySource?
    public var `provider`: LiveProvider?
    public var `azureEndpoint`: String?
    public var `azureDeployment`: String?
    public var `voice`: String
    public var `readTypedReplies`: Bool
    public var `idleMinutes`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `configured`: Bool,
        `voice`: String,
        `readTypedReplies`: Bool,
        `idleMinutes`: Double,
        `keySource`: LiveKeySource? = nil,
        `provider`: LiveProvider? = nil,
        `azureEndpoint`: String? = nil,
        `azureDeployment`: String? = nil
    ) {
        self.`configured` = `configured`
        self.`keySource` = `keySource`
        self.`provider` = `provider`
        self.`azureEndpoint` = `azureEndpoint`
        self.`azureDeployment` = `azureDeployment`
        self.`voice` = `voice`
        self.`readTypedReplies` = `readTypedReplies`
        self.`idleMinutes` = `idleMinutes`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `keySource` = try object.optional("keySource")
        `provider` = try object.optional("provider")
        `azureEndpoint` = try object.optional("azureEndpoint")
        `azureDeployment` = try object.optional("azureDeployment")
        `voice` = try object.required("voice")
        `readTypedReplies` = try object.required("readTypedReplies")
        `idleMinutes` = try object.required("idleMinutes")
        additionalFields = object.remainder(excluding: ["configured", "keySource", "provider", "azureEndpoint", "azureDeployment", "voice", "readTypedReplies", "idleMinutes"])
        explicitNulls = object.nullKeys.intersection(["configured", "keySource", "provider", "azureEndpoint", "azureDeployment", "voice", "readTypedReplies", "idleMinutes"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("keySource", `keySource`, nulls: explicitNulls)
        try object.putOptional("provider", `provider`, nulls: explicitNulls)
        try object.putOptional("azureEndpoint", `azureEndpoint`, nulls: explicitNulls)
        try object.putOptional("azureDeployment", `azureDeployment`, nulls: explicitNulls)
        try object.put("voice", `voice`)
        try object.put("readTypedReplies", `readTypedReplies`)
        try object.put("idleMinutes", `idleMinutes`)
        try object.encode(to: encoder)
    }
}

public enum LiveKeySource: WireModel, Hashable, Sendable {
    case `live`
    case `openai`
    case `fishAudio`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "live": self = .`live`
        case "openai": self = .`openai`
        case "fishAudio": self = .`fishAudio`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`live`: return "live"
        case .`openai`: return "openai"
        case .`fishAudio`: return "fishAudio"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum LiveProvider: WireModel, Hashable, Sendable {
    case `openai`
    case `azure`
    case `fish`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "openai": self = .`openai`
        case "azure": self = .`azure`
        case "fish": self = .`fish`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`openai`: return "openai"
        case .`azure`: return "azure"
        case .`fish`: return "fish"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
