import Foundation

public struct FirstReplyRescue: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `turnId`: String
    public var `requestMessageId`: String?
    public var `instanceId`: String
    public var `ai`: String
    public var `groupId`: String?
    public var `settled`: Bool?
    public var `over`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `threadId`: String,
        `turnId`: String,
        `instanceId`: String,
        `ai`: String,
        `requestMessageId`: String? = nil,
        `groupId`: String? = nil,
        `settled`: Bool? = nil,
        `over`: Bool? = nil
    ) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`turnId` = `turnId`
        self.`requestMessageId` = `requestMessageId`
        self.`instanceId` = `instanceId`
        self.`ai` = `ai`
        self.`groupId` = `groupId`
        self.`settled` = `settled`
        self.`over` = `over`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `turnId` = try object.required("turnId")
        `requestMessageId` = try object.optional("requestMessageId")
        `instanceId` = try object.required("instanceId")
        `ai` = try object.required("ai")
        `groupId` = try object.optional("groupId")
        `settled` = try object.optional("settled")
        `over` = try object.optional("over")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "turnId", "requestMessageId", "instanceId", "ai", "groupId", "settled", "over"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "turnId", "requestMessageId", "instanceId", "ai", "groupId", "settled", "over"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("turnId", `turnId`)
        try object.putOptional("requestMessageId", `requestMessageId`, nulls: explicitNulls)
        try object.put("instanceId", `instanceId`)
        try object.put("ai", `ai`)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.putOptional("settled", `settled`, nulls: explicitNulls)
        try object.putOptional("over", `over`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
