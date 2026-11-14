import Foundation

public struct WaitLine: WireModel {
    public var `id`: String
    public var `status`: WaitLineStatus
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `status`: WaitLineStatus) {
        self.`id` = `id`
        self.`status` = `status`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `status` = try object.required("status")
        additionalFields = object.remainder(excluding: ["id", "status"])
        explicitNulls = object.nullKeys.intersection(["id", "status"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("status", `status`)
        try object.encode(to: encoder)
    }
}

public enum WaitLineStatus: WireModel, Hashable, Sendable {
    case `fired`
    case `expired`
    case `stopped`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "fired": self = .`fired`
        case "expired": self = .`expired`
        case "stopped": self = .`stopped`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`fired`: return "fired"
        case .`expired`: return "expired"
        case .`stopped`: return "stopped"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WaitCardData: WireModel {
    public var `waitId`: String
    public var `label`: String
    public var `followUp`: String
    public var `settled`: WaitCardDataSettled?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`waitId`: String, `label`: String, `followUp`: String, `settled`: WaitCardDataSettled? = nil) {
        self.`waitId` = `waitId`
        self.`label` = `label`
        self.`followUp` = `followUp`
        self.`settled` = `settled`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `waitId` = try object.required("waitId")
        `label` = try object.required("label")
        `followUp` = try object.required("followUp")
        `settled` = try object.optional("settled")
        additionalFields = object.remainder(excluding: ["waitId", "label", "followUp", "settled"])
        explicitNulls = object.nullKeys.intersection(["waitId", "label", "followUp", "settled"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("waitId", `waitId`)
        try object.put("label", `label`)
        try object.put("followUp", `followUp`)
        try object.putOptional("settled", `settled`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WaitCardDataSettled: WireModel, Hashable, Sendable {
    case `fired`
    case `expired`
    case `cancelled`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "fired": self = .`fired`
        case "expired": self = .`expired`
        case "cancelled": self = .`cancelled`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`fired`: return "fired"
        case .`expired`: return "expired"
        case .`cancelled`: return "cancelled"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
