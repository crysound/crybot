import Foundation

public struct ProfileRequestCardData: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `targetBotId`: String
    public var `targetName`: String
    public var `createdAt`: Double
    public var `reason`: String
    public var `changes`: ProfileRequestChanges
    public var `before`: ProfileRequestChanges
    public var `expectedRevision`: String
    public var `appliedAt`: Double?
    public var `undo`: ProfileRequestCardDataUndo?
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
        `changes`: ProfileRequestChanges,
        `before`: ProfileRequestChanges,
        `expectedRevision`: String,
        `appliedAt`: Double? = nil,
        `undo`: ProfileRequestCardDataUndo? = nil
    ) {
        self.`version` = `version`
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`targetBotId` = `targetBotId`
        self.`targetName` = `targetName`
        self.`createdAt` = `createdAt`
        self.`reason` = `reason`
        self.`changes` = `changes`
        self.`before` = `before`
        self.`expectedRevision` = `expectedRevision`
        self.`appliedAt` = `appliedAt`
        self.`undo` = `undo`
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
        `changes` = try object.required("changes")
        `before` = try object.required("before")
        `expectedRevision` = try object.required("expectedRevision")
        `appliedAt` = try object.optional("appliedAt")
        `undo` = try object.optional("undo")
        additionalFields = object.remainder(excluding: ["version", "requestId", "botId", "threadId", "targetBotId", "targetName", "createdAt", "reason", "changes", "before", "expectedRevision", "appliedAt", "undo"])
        explicitNulls = object.nullKeys.intersection(["version", "requestId", "botId", "threadId", "targetBotId", "targetName", "createdAt", "reason", "changes", "before", "expectedRevision", "appliedAt", "undo"])
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
        try object.put("changes", `changes`)
        try object.put("before", `before`)
        try object.put("expectedRevision", `expectedRevision`)
        try object.putOptional("appliedAt", `appliedAt`, nulls: explicitNulls)
        try object.putOptional("undo", `undo`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ProfileRequestChanges: WireModel {
    public var `name`: String?
    public var `title`: String?
    public var `description`: String?
    public var `soul`: String?
    public var `cwd`: String?
    public var `notifications`: Bool?
    public var `speakReplies`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String? = nil,
        `title`: String? = nil,
        `description`: String? = nil,
        `soul`: String? = nil,
        `cwd`: String? = nil,
        `notifications`: Bool? = nil,
        `speakReplies`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`title` = `title`
        self.`description` = `description`
        self.`soul` = `soul`
        self.`cwd` = `cwd`
        self.`notifications` = `notifications`
        self.`speakReplies` = `speakReplies`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.optional("name")
        `title` = try object.optional("title")
        `description` = try object.optional("description")
        `soul` = try object.optional("soul")
        `cwd` = try object.optional("cwd")
        `notifications` = try object.optional("notifications")
        `speakReplies` = try object.optional("speakReplies")
        additionalFields = object.remainder(excluding: ["name", "title", "description", "soul", "cwd", "notifications", "speakReplies"])
        explicitNulls = object.nullKeys.intersection(["name", "title", "description", "soul", "cwd", "notifications", "speakReplies"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("title", `title`, nulls: explicitNulls)
        try object.putOptional("description", `description`, nulls: explicitNulls)
        try object.putOptional("soul", `soul`, nulls: explicitNulls)
        try object.putOptional("cwd", `cwd`, nulls: explicitNulls)
        try object.putOptional("notifications", `notifications`, nulls: explicitNulls)
        try object.putOptional("speakReplies", `speakReplies`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ProfileRequestCardDataUndo: WireModel {
    public var `appliedRevision`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`appliedRevision`: String) {
        self.`appliedRevision` = `appliedRevision`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `appliedRevision` = try object.required("appliedRevision")
        additionalFields = object.remainder(excluding: ["appliedRevision"])
        explicitNulls = object.nullKeys.intersection(["appliedRevision"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("appliedRevision", `appliedRevision`)
        try object.encode(to: encoder)
    }
}
