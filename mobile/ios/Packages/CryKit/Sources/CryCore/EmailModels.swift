import Foundation

public struct EmailOutgoingFields: WireModel {
    public var `smtpHost`: String?
    public var `smtpPort`: Double?
    public var `smtpSecurity`: EmailSecurity?
    public var `smtpUsername`: String?
    public var `smtpPassword`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `smtpHost`: String? = nil,
        `smtpPort`: Double? = nil,
        `smtpSecurity`: EmailSecurity? = nil,
        `smtpUsername`: String? = nil,
        `smtpPassword`: String? = nil
    ) {
        self.`smtpHost` = `smtpHost`
        self.`smtpPort` = `smtpPort`
        self.`smtpSecurity` = `smtpSecurity`
        self.`smtpUsername` = `smtpUsername`
        self.`smtpPassword` = `smtpPassword`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `smtpHost` = try object.optional("smtpHost")
        `smtpPort` = try object.optional("smtpPort")
        `smtpSecurity` = try object.optional("smtpSecurity")
        `smtpUsername` = try object.optional("smtpUsername")
        `smtpPassword` = try object.optional("smtpPassword")
        additionalFields = object.remainder(excluding: ["smtpHost", "smtpPort", "smtpSecurity", "smtpUsername", "smtpPassword"])
        explicitNulls = object.nullKeys.intersection(["smtpHost", "smtpPort", "smtpSecurity", "smtpUsername", "smtpPassword"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("smtpHost", `smtpHost`, nulls: explicitNulls)
        try object.putOptional("smtpPort", `smtpPort`, nulls: explicitNulls)
        try object.putOptional("smtpSecurity", `smtpSecurity`, nulls: explicitNulls)
        try object.putOptional("smtpUsername", `smtpUsername`, nulls: explicitNulls)
        try object.putOptional("smtpPassword", `smtpPassword`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum EmailSecurity: WireModel, Hashable, Sendable {
    case `tls`
    case `starttls`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "tls": self = .`tls`
        case "starttls": self = .`starttls`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`tls`: return "tls"
        case .`starttls`: return "starttls"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
