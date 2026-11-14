import Foundation

public struct HelperFollowupFacts: WireModel {
    public var `ai`: HelperFollowupFactsAi
    public var `apps`: [String]
    public var `bots`: Double
    public var `routines`: Double
    public var `connects`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `ai`: HelperFollowupFactsAi,
        `apps`: [String],
        `bots`: Double,
        `routines`: Double,
        `connects`: String? = nil
    ) {
        self.`ai` = `ai`
        self.`apps` = `apps`
        self.`bots` = `bots`
        self.`routines` = `routines`
        self.`connects` = `connects`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `ai` = try object.required("ai")
        `apps` = try object.required("apps")
        `bots` = try object.required("bots")
        `routines` = try object.required("routines")
        `connects` = try object.optional("connects")
        additionalFields = object.remainder(excluding: ["ai", "apps", "bots", "routines", "connects"])
        explicitNulls = object.nullKeys.intersection(["ai", "apps", "bots", "routines", "connects"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("ai", `ai`)
        try object.put("apps", `apps`)
        try object.put("bots", `bots`)
        try object.put("routines", `routines`)
        try object.putOptional("connects", `connects`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum HelperFollowupFactsAi: WireModel, Hashable, Sendable {
    case `own`
    case `backup`
    case `none`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "own": self = .`own`
        case "backup": self = .`backup`
        case "none": self = .`none`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`own`: return "own"
        case .`backup`: return "backup"
        case .`none`: return "none"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
