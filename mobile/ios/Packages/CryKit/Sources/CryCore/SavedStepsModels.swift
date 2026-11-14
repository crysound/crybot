import Foundation

public struct SavedStepsMark: WireModel {
    public var `recipeId`: String
    public var `learned`: Bool?
    public var `replayed`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`recipeId`: String, `learned`: Bool? = nil, `replayed`: Bool? = nil) {
        self.`recipeId` = `recipeId`
        self.`learned` = `learned`
        self.`replayed` = `replayed`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `recipeId` = try object.required("recipeId")
        `learned` = try object.optional("learned")
        `replayed` = try object.optional("replayed")
        additionalFields = object.remainder(excluding: ["recipeId", "learned", "replayed"])
        explicitNulls = object.nullKeys.intersection(["recipeId", "learned", "replayed"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("recipeId", `recipeId`)
        try object.putOptional("learned", `learned`, nulls: explicitNulls)
        try object.putOptional("replayed", `replayed`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
