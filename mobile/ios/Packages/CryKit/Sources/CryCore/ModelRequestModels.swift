import Foundation

public struct ModelRequestCardData: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `targetBotId`: String
    public var `targetName`: String
    public var `createdAt`: Double
    public var `reason`: String
    public var `selection`: ModelSelection
    public var `before`: ModelSelection
    public var `appliedAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `targetBotId`: String,
        `targetName`: String,
        `createdAt`: Double,
        `reason`: String,
        `selection`: ModelSelection,
        `before`: ModelSelection,
        `appliedAt`: Double? = nil
    ) {
        self.`version` = `version`
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`targetBotId` = `targetBotId`
        self.`targetName` = `targetName`
        self.`createdAt` = `createdAt`
        self.`reason` = `reason`
        self.`selection` = `selection`
        self.`before` = `before`
        self.`appliedAt` = `appliedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `requestId` = try object.required("requestId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `targetBotId` = try object.required("targetBotId")
        `targetName` = try object.required("targetName")
        `createdAt` = try object.required("createdAt")
        `reason` = try object.required("reason")
        `selection` = try object.required("selection")
        `before` = try object.required("before")
        `appliedAt` = try object.optional("appliedAt")
        additionalFields = object.remainder(excluding: ["version", "requestId", "botId", "threadId", "targetBotId", "targetName", "createdAt", "reason", "selection", "before", "appliedAt"])
        explicitNulls = object.nullKeys.intersection(["version", "requestId", "botId", "threadId", "targetBotId", "targetName", "createdAt", "reason", "selection", "before", "appliedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("requestId", `requestId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("targetBotId", `targetBotId`)
        try object.put("targetName", `targetName`)
        try object.put("createdAt", `createdAt`)
        try object.put("reason", `reason`)
        try object.put("selection", `selection`)
        try object.put("before", `before`)
        try object.putOptional("appliedAt", `appliedAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
