import Foundation

public struct ToolScope: WireModel {
    public var `allow`: [String]?
    public var `deny`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`allow`: [String]? = nil, `deny`: [String]? = nil) {
        self.`allow` = `allow`
        self.`deny` = `deny`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `allow` = try object.optional("allow")
        `deny` = try object.optional("deny")
        additionalFields = object.remainder(excluding: ["allow", "deny"])
        explicitNulls = object.nullKeys.intersection(["allow", "deny"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("allow", `allow`, nulls: explicitNulls)
        try object.putOptional("deny", `deny`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
