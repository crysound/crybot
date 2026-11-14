import Foundation

public struct OnboardingStatus: WireModel {
    public var `completedAt`: String
    public var `version`: Double
    public var `reelSeen`: Bool
    public var `hintsSeen`: [String]
    public var `firstTurnAt`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `completedAt`: String,
        `version`: Double,
        `reelSeen`: Bool,
        `hintsSeen`: [String],
        `firstTurnAt`: String? = nil
    ) {
        self.`completedAt` = `completedAt`
        self.`version` = `version`
        self.`reelSeen` = `reelSeen`
        self.`hintsSeen` = `hintsSeen`
        self.`firstTurnAt` = `firstTurnAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `completedAt` = try object.required("completedAt")
        `version` = try object.required("version")
        `reelSeen` = try object.required("reelSeen")
        `hintsSeen` = try object.required("hintsSeen")
        `firstTurnAt` = try object.optional("firstTurnAt")
        additionalFields = object.remainder(excluding: ["completedAt", "version", "reelSeen", "hintsSeen", "firstTurnAt"])
        explicitNulls = object.nullKeys.intersection(["completedAt", "version", "reelSeen", "hintsSeen", "firstTurnAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("completedAt", `completedAt`)
        try object.put("version", `version`)
        try object.put("reelSeen", `reelSeen`)
        try object.put("hintsSeen", `hintsSeen`)
        try object.putOptional("firstTurnAt", `firstTurnAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
