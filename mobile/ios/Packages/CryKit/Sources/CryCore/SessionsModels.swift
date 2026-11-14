import Foundation

public struct PublicSession: WireModel {
    public var `id`: String
    public var `label`: String
    public var `scopes`: [Scope]
    public var `createdAt`: Double
    public var `lastSeenAt`: Double
    public var `expiresAt`: Double
    public var `email`: String?
    public var `accessEmail`: String?
    public var `displayName`: String?
    public var `owner`: String?
    public var `teamRole`: TeamRole?
    public var `token`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `label`: String,
        `scopes`: [Scope],
        `createdAt`: Double,
        `lastSeenAt`: Double,
        `expiresAt`: Double,
        `email`: String? = nil,
        `accessEmail`: String? = nil,
        `displayName`: String? = nil,
        `owner`: String? = nil,
        `teamRole`: TeamRole? = nil,
        `token`: Bool? = nil
    ) {
        self.`id` = `id`
        self.`label` = `label`
        self.`scopes` = `scopes`
        self.`createdAt` = `createdAt`
        self.`lastSeenAt` = `lastSeenAt`
        self.`expiresAt` = `expiresAt`
        self.`email` = `email`
        self.`accessEmail` = `accessEmail`
        self.`displayName` = `displayName`
        self.`owner` = `owner`
        self.`teamRole` = `teamRole`
        self.`token` = `token`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `label` = try object.required("label")
        `scopes` = try object.required("scopes")
        `createdAt` = try object.required("createdAt")
        `lastSeenAt` = try object.required("lastSeenAt")
        `expiresAt` = try object.required("expiresAt")
        `email` = try object.optional("email")
        `accessEmail` = try object.optional("accessEmail")
        `displayName` = try object.optional("displayName")
        `owner` = try object.optional("owner")
        `teamRole` = try object.optional("teamRole")
        `token` = try object.optional("token")
        additionalFields = object.remainder(excluding: ["id", "label", "scopes", "createdAt", "lastSeenAt", "expiresAt", "email", "accessEmail", "displayName", "owner", "teamRole", "token"])
        explicitNulls = object.nullKeys.intersection(["id", "label", "scopes", "createdAt", "lastSeenAt", "expiresAt", "email", "accessEmail", "displayName", "owner", "teamRole", "token"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("label", `label`)
        try object.put("scopes", `scopes`)
        try object.put("createdAt", `createdAt`)
        try object.put("lastSeenAt", `lastSeenAt`)
        try object.put("expiresAt", `expiresAt`)
        try object.putOptional("email", `email`, nulls: explicitNulls)
        try object.putOptional("accessEmail", `accessEmail`, nulls: explicitNulls)
        try object.putOptional("displayName", `displayName`, nulls: explicitNulls)
        try object.putOptional("owner", `owner`, nulls: explicitNulls)
        try object.putOptional("teamRole", `teamRole`, nulls: explicitNulls)
        try object.putOptional("token", `token`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum Scope: WireModel, Hashable, Sendable {
    case `admin`
    case `client`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "admin": self = .`admin`
        case "client": self = .`client`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`admin`: return "admin"
        case .`client`: return "client"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
