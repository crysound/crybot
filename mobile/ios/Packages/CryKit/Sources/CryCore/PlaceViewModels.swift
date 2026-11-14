import Foundation

public struct PlaceRow: WireModel {
    public var `state`: PlaceState
    public var `params`: PlaceParams
    public var `source`: PlaceSource
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`state`: PlaceState, `params`: PlaceParams, `source`: PlaceSource) {
        self.`state` = `state`
        self.`params` = `params`
        self.`source` = `source`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `state` = try object.required("state")
        `params` = try object.required("params")
        `source` = try object.required("source")
        additionalFields = object.remainder(excluding: ["state", "params", "source"])
        explicitNulls = object.nullKeys.intersection(["state", "params", "source"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("state", `state`)
        try object.put("params", `params`)
        try object.put("source", `source`)
        try object.encode(to: encoder)
    }
}

public enum PlaceState: WireModel, Hashable, Sendable {
    case `auto`
    case `autoTeam`
    case `ccCannot`
    case `ccToolsOff`
    case `ccSignIn`
    case `ccNew`
    case `ccStarting`
    case `ccWaking`
    case `ccOn`
    case `ccAsleep`
    case `ccNoHours`
    case `ccAtOnce`
    case `ccUnavailable`
    case `ccEnded`
    case `ccNoStart`
    case `ccClearing`
    case `ccProvider`
    case `ccOnMyCloud`
    case `ccNeedsKey`
    case `vps`
    case `browser`
    case `browserOff`
    case `browserCannot`
    case `local`
    case `localUnavailable`
    case `vm`
    case `vmCannot`
    case `placeFailed`
    case `off`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "auto": self = .`auto`
        case "auto-team": self = .`autoTeam`
        case "cc-cannot": self = .`ccCannot`
        case "cc-tools-off": self = .`ccToolsOff`
        case "cc-sign-in": self = .`ccSignIn`
        case "cc-new": self = .`ccNew`
        case "cc-starting": self = .`ccStarting`
        case "cc-waking": self = .`ccWaking`
        case "cc-on": self = .`ccOn`
        case "cc-asleep": self = .`ccAsleep`
        case "cc-no-hours": self = .`ccNoHours`
        case "cc-at-once": self = .`ccAtOnce`
        case "cc-unavailable": self = .`ccUnavailable`
        case "cc-ended": self = .`ccEnded`
        case "cc-no-start": self = .`ccNoStart`
        case "cc-clearing": self = .`ccClearing`
        case "cc-provider": self = .`ccProvider`
        case "cc-on-my-cloud": self = .`ccOnMyCloud`
        case "cc-needs-key": self = .`ccNeedsKey`
        case "vps": self = .`vps`
        case "browser": self = .`browser`
        case "browser-off": self = .`browserOff`
        case "browser-cannot": self = .`browserCannot`
        case "local": self = .`local`
        case "local-unavailable": self = .`localUnavailable`
        case "vm": self = .`vm`
        case "vm-cannot": self = .`vmCannot`
        case "place-failed": self = .`placeFailed`
        case "off": self = .`off`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`auto`: return "auto"
        case .`autoTeam`: return "auto-team"
        case .`ccCannot`: return "cc-cannot"
        case .`ccToolsOff`: return "cc-tools-off"
        case .`ccSignIn`: return "cc-sign-in"
        case .`ccNew`: return "cc-new"
        case .`ccStarting`: return "cc-starting"
        case .`ccWaking`: return "cc-waking"
        case .`ccOn`: return "cc-on"
        case .`ccAsleep`: return "cc-asleep"
        case .`ccNoHours`: return "cc-no-hours"
        case .`ccAtOnce`: return "cc-at-once"
        case .`ccUnavailable`: return "cc-unavailable"
        case .`ccEnded`: return "cc-ended"
        case .`ccNoStart`: return "cc-no-start"
        case .`ccClearing`: return "cc-clearing"
        case .`ccProvider`: return "cc-provider"
        case .`ccOnMyCloud`: return "cc-on-my-cloud"
        case .`ccNeedsKey`: return "cc-needs-key"
        case .`vps`: return "vps"
        case .`browser`: return "browser"
        case .`browserOff`: return "browser-off"
        case .`browserCannot`: return "browser-cannot"
        case .`local`: return "local"
        case .`localUnavailable`: return "local-unavailable"
        case .`vm`: return "vm"
        case .`vmCannot`: return "vm-cannot"
        case .`placeFailed`: return "place-failed"
        case .`off`: return "off"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct PlaceParams: WireModel {
    public var `bot`: String?
    public var `engine`: String?
    public var `model`: String?
    public var `computer`: String?
    public var `hours`: Double?
    public var `month`: String?
    public var `plan`: String?
    public var `max`: Double?
    public var `holders`: [String]?
    public var `words`: String?
    public var `reason`: String?
    public var `cause`: String?
    public var `trial`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `bot`: String? = nil,
        `engine`: String? = nil,
        `model`: String? = nil,
        `computer`: String? = nil,
        `hours`: Double? = nil,
        `month`: String? = nil,
        `plan`: String? = nil,
        `max`: Double? = nil,
        `holders`: [String]? = nil,
        `words`: String? = nil,
        `reason`: String? = nil,
        `cause`: String? = nil,
        `trial`: Bool? = nil
    ) {
        self.`bot` = `bot`
        self.`engine` = `engine`
        self.`model` = `model`
        self.`computer` = `computer`
        self.`hours` = `hours`
        self.`month` = `month`
        self.`plan` = `plan`
        self.`max` = `max`
        self.`holders` = `holders`
        self.`words` = `words`
        self.`reason` = `reason`
        self.`cause` = `cause`
        self.`trial` = `trial`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `bot` = try object.optional("bot")
        `engine` = try object.optional("engine")
        `model` = try object.optional("model")
        `computer` = try object.optional("computer")
        `hours` = try object.optional("hours")
        `month` = try object.optional("month")
        `plan` = try object.optional("plan")
        `max` = try object.optional("max")
        `holders` = try object.optional("holders")
        `words` = try object.optional("words")
        `reason` = try object.optional("reason")
        `cause` = try object.optional("cause")
        `trial` = try object.optional("trial")
        additionalFields = object.remainder(excluding: ["bot", "engine", "model", "computer", "hours", "month", "plan", "max", "holders", "words", "reason", "cause", "trial"])
        explicitNulls = object.nullKeys.intersection(["bot", "engine", "model", "computer", "hours", "month", "plan", "max", "holders", "words", "reason", "cause", "trial"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("bot", `bot`, nulls: explicitNulls)
        try object.putOptional("engine", `engine`, nulls: explicitNulls)
        try object.putOptional("model", `model`, nulls: explicitNulls)
        try object.putOptional("computer", `computer`, nulls: explicitNulls)
        try object.putOptional("hours", `hours`, nulls: explicitNulls)
        try object.putOptional("month", `month`, nulls: explicitNulls)
        try object.putOptional("plan", `plan`, nulls: explicitNulls)
        try object.putOptional("max", `max`, nulls: explicitNulls)
        try object.putOptional("holders", `holders`, nulls: explicitNulls)
        try object.putOptional("words", `words`, nulls: explicitNulls)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("cause", `cause`, nulls: explicitNulls)
        try object.putOptional("trial", `trial`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum PlaceSource: WireModel, Hashable, Sendable {
    case `worksOn`
    case `pin`
    case `autoPin`
    case `routine`
    case `room`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "works-on": self = .`worksOn`
        case "pin": self = .`pin`
        case "auto-pin": self = .`autoPin`
        case "routine": self = .`routine`
        case "room": self = .`room`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`worksOn`: return "works-on"
        case .`pin`: return "pin"
        case .`autoPin`: return "auto-pin"
        case .`routine`: return "routine"
        case .`room`: return "room"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
