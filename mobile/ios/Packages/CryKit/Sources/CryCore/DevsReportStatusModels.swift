import Foundation

public struct BugReportStatus: WireModel {
    public var `id`: String
    public var `status`: BugReportStatusStatus
    public var `fixedIn`: String?
    public var `running`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `status`: BugReportStatusStatus, `fixedIn`: String? = nil, `running`: Bool? = nil) {
        self.`id` = `id`
        self.`status` = `status`
        self.`fixedIn` = `fixedIn`
        self.`running` = `running`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `status` = try object.required("status")
        `fixedIn` = try object.optional("fixedIn")
        `running` = try object.optional("running")
        additionalFields = object.remainder(excluding: ["id", "status", "fixedIn", "running"])
        explicitNulls = object.nullKeys.intersection(["id", "status", "fixedIn", "running"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("status", `status`)
        try object.putOptional("fixedIn", `fixedIn`, nulls: explicitNulls)
        try object.putOptional("running", `running`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum BugReportStatusStatus: WireModel, Hashable, Sendable {
    case `received`
    case `fixed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "received": self = .`received`
        case "fixed": self = .`fixed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`received`: return "received"
        case .`fixed`: return "fixed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
