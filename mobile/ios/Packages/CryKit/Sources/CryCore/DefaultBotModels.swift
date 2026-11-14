import Foundation

public struct DefaultBotMark: WireModel {
    public var `person`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`person`: String? = nil) {
        self.`person` = `person`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `person` = try object.optional("person")
        additionalFields = object.remainder(excluding: ["person"])
        explicitNulls = object.nullKeys.intersection(["person"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("person", `person`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
