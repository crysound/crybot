import Foundation

public struct TeamSetupRequest: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `reason`: String
    public var `createdAt`: Double
    public var `requesterRevision`: String
    public var `operations`: [TeamSetupOperation]
    public var `newTeams`: [String]
    public var `deletion`: TeamSetupRequestDeletion?
    public var `result`: TeamSetupResult?
    public var `resumed`: Bool?
    public var `undo`: TeamSetupUndo?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `reason`: String,
        `createdAt`: Double,
        `requesterRevision`: String,
        `operations`: [TeamSetupOperation],
        `newTeams`: [String],
        `deletion`: TeamSetupRequestDeletion? = nil,
        `result`: TeamSetupResult? = nil,
        `resumed`: Bool? = nil,
        `undo`: TeamSetupUndo? = nil
    ) {
        self.`version` = `version`
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`reason` = `reason`
        self.`createdAt` = `createdAt`
        self.`requesterRevision` = `requesterRevision`
        self.`operations` = `operations`
        self.`newTeams` = `newTeams`
        self.`deletion` = `deletion`
        self.`result` = `result`
        self.`resumed` = `resumed`
        self.`undo` = `undo`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `requestId` = try object.required("requestId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `reason` = try object.required("reason")
        `createdAt` = try object.required("createdAt")
        `requesterRevision` = try object.required("requesterRevision")
        `operations` = try object.required("operations")
        `newTeams` = try object.required("newTeams")
        `deletion` = try object.optional("deletion")
        `result` = try object.optional("result")
        `resumed` = try object.optional("resumed")
        `undo` = try object.optional("undo")
        additionalFields = object.remainder(excluding: ["version", "requestId", "botId", "threadId", "reason", "createdAt", "requesterRevision", "operations", "newTeams", "deletion", "result", "resumed", "undo"])
        explicitNulls = object.nullKeys.intersection(["version", "requestId", "botId", "threadId", "reason", "createdAt", "requesterRevision", "operations", "newTeams", "deletion", "result", "resumed", "undo"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("requestId", `requestId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("reason", `reason`)
        try object.put("createdAt", `createdAt`)
        try object.put("requesterRevision", `requesterRevision`)
        try object.put("operations", `operations`)
        try object.put("newTeams", `newTeams`)
        try object.putOptional("deletion", `deletion`, nulls: explicitNulls)
        try object.putOptional("result", `result`, nulls: explicitNulls)
        try object.putOptional("resumed", `resumed`, nulls: explicitNulls)
        try object.putOptional("undo", `undo`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct TeamSetupOperation: WireModel {
    public var `action`: TeamSetupOperationAction
    public var `botId`: String
    public var `threadId`: String?
    public var `fields`: TeamSetupFields
    public var `expectedRevision`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `action`: TeamSetupOperationAction,
        `botId`: String,
        `fields`: TeamSetupFields,
        `threadId`: String? = nil,
        `expectedRevision`: String? = nil
    ) {
        self.`action` = `action`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`fields` = `fields`
        self.`expectedRevision` = `expectedRevision`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `action` = try object.required("action")
        `botId` = try object.required("botId")
        `threadId` = try object.optional("threadId")
        `fields` = try object.required("fields")
        `expectedRevision` = try object.optional("expectedRevision")
        additionalFields = object.remainder(excluding: ["action", "botId", "threadId", "fields", "expectedRevision"])
        explicitNulls = object.nullKeys.intersection(["action", "botId", "threadId", "fields", "expectedRevision"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("action", `action`)
        try object.put("botId", `botId`)
        try object.putOptional("threadId", `threadId`, nulls: explicitNulls)
        try object.put("fields", `fields`)
        try object.putOptional("expectedRevision", `expectedRevision`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum TeamSetupOperationAction: WireModel, Hashable, Sendable {
    case `create`
    case `update`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "create": self = .`create`
        case "update": self = .`update`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`create`: return "create"
        case .`update`: return "update"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct TeamSetupFields: WireModel {
    public var `name`: String?
    public var `title`: String?
    public var `description`: String?
    public var `soul`: String?
    public var `cwd`: String?
    public var `section`: String?
    public var `modelSelection`: ModelSelection?
    public var `chiefOfStaff`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String? = nil,
        `title`: String? = nil,
        `description`: String? = nil,
        `soul`: String? = nil,
        `cwd`: String? = nil,
        `section`: String? = nil,
        `modelSelection`: ModelSelection? = nil,
        `chiefOfStaff`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`title` = `title`
        self.`description` = `description`
        self.`soul` = `soul`
        self.`cwd` = `cwd`
        self.`section` = `section`
        self.`modelSelection` = `modelSelection`
        self.`chiefOfStaff` = `chiefOfStaff`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.optional("name")
        `title` = try object.optional("title")
        `description` = try object.optional("description")
        `soul` = try object.optional("soul")
        `cwd` = try object.optional("cwd")
        `section` = try object.optional("section")
        `modelSelection` = try object.optional("modelSelection")
        `chiefOfStaff` = try object.optional("chiefOfStaff")
        additionalFields = object.remainder(excluding: ["name", "title", "description", "soul", "cwd", "section", "modelSelection", "chiefOfStaff"])
        explicitNulls = object.nullKeys.intersection(["name", "title", "description", "soul", "cwd", "section", "modelSelection", "chiefOfStaff"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("title", `title`, nulls: explicitNulls)
        try object.putOptional("description", `description`, nulls: explicitNulls)
        try object.putOptional("soul", `soul`, nulls: explicitNulls)
        try object.putOptional("cwd", `cwd`, nulls: explicitNulls)
        try object.putOptional("section", `section`, nulls: explicitNulls)
        try object.putOptional("modelSelection", `modelSelection`, nulls: explicitNulls)
        try object.putOptional("chiefOfStaff", `chiefOfStaff`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct TeamSetupRequestDeletion: WireModel {
    public var `botId`: String
    public var `name`: String
    public var `expectedRevision`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String, `expectedRevision`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
        self.`expectedRevision` = `expectedRevision`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        `expectedRevision` = try object.required("expectedRevision")
        additionalFields = object.remainder(excluding: ["botId", "name", "expectedRevision"])
        explicitNulls = object.nullKeys.intersection(["botId", "name", "expectedRevision"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.put("expectedRevision", `expectedRevision`)
        try object.encode(to: encoder)
    }
}

public struct TeamSetupResult: WireModel {
    public var `state`: TeamSetupResultState
    public var `bots`: [TeamSetupResultBotsElement]
    public var `newTeams`: [String]
    public var `error`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`state`: TeamSetupResultState, `bots`: [TeamSetupResultBotsElement], `newTeams`: [String], `error`: String? = nil) {
        self.`state` = `state`
        self.`bots` = `bots`
        self.`newTeams` = `newTeams`
        self.`error` = `error`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `state` = try object.required("state")
        `bots` = try object.required("bots")
        `newTeams` = try object.required("newTeams")
        `error` = try object.optional("error")
        additionalFields = object.remainder(excluding: ["state", "bots", "newTeams", "error"])
        explicitNulls = object.nullKeys.intersection(["state", "bots", "newTeams", "error"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("state", `state`)
        try object.put("bots", `bots`)
        try object.put("newTeams", `newTeams`)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum TeamSetupResultState: WireModel, Hashable, Sendable {
    case `applied`
    case `denied`
    case `cancelled`
    case `failed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "applied": self = .`applied`
        case "denied": self = .`denied`
        case "cancelled": self = .`cancelled`
        case "failed": self = .`failed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`applied`: return "applied"
        case .`denied`: return "denied"
        case .`cancelled`: return "cancelled"
        case .`failed`: return "failed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct TeamSetupResultBotsElement: WireModel {
    public var `id`: String
    public var `name`: String
    public var `action`: TeamSetupResultBotsElementAction
    public var `section`: String?
    public var `modelSelection`: ModelSelection?
    public var `chiefOfStaff`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `name`: String,
        `action`: TeamSetupResultBotsElementAction,
        `section`: String? = nil,
        `modelSelection`: ModelSelection? = nil,
        `chiefOfStaff`: Bool? = nil
    ) {
        self.`id` = `id`
        self.`name` = `name`
        self.`action` = `action`
        self.`section` = `section`
        self.`modelSelection` = `modelSelection`
        self.`chiefOfStaff` = `chiefOfStaff`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `action` = try object.required("action")
        `section` = try object.optional("section")
        `modelSelection` = try object.optional("modelSelection")
        `chiefOfStaff` = try object.optional("chiefOfStaff")
        additionalFields = object.remainder(excluding: ["id", "name", "action", "section", "modelSelection", "chiefOfStaff"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "action", "section", "modelSelection", "chiefOfStaff"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.put("action", `action`)
        try object.putOptional("section", `section`, nulls: explicitNulls)
        try object.putOptional("modelSelection", `modelSelection`, nulls: explicitNulls)
        try object.putOptional("chiefOfStaff", `chiefOfStaff`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum TeamSetupResultBotsElementAction: WireModel, Hashable, Sendable {
    case `created`
    case `updated`
    case `deleted`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "created": self = .`created`
        case "updated": self = .`updated`
        case "deleted": self = .`deleted`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`created`: return "created"
        case .`updated`: return "updated"
        case .`deleted`: return "deleted"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct TeamSetupUndo: WireModel {
    public var `created`: [String]
    public var `before`: [TeamSetupUndoBeforeElement]
    public var `revisions`: [String: String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`created`: [String], `before`: [TeamSetupUndoBeforeElement], `revisions`: [String: String]) {
        self.`created` = `created`
        self.`before` = `before`
        self.`revisions` = `revisions`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `created` = try object.required("created")
        `before` = try object.required("before")
        `revisions` = try object.required("revisions")
        additionalFields = object.remainder(excluding: ["created", "before", "revisions"])
        explicitNulls = object.nullKeys.intersection(["created", "before", "revisions"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("created", `created`)
        try object.put("before", `before`)
        try object.put("revisions", `revisions`)
        try object.encode(to: encoder)
    }
}

public struct TeamSetupUndoBeforeElement: WireModel {
    public var `botId`: String
    public var `fields`: TeamSetupFields
    public var `managedSections`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `fields`: TeamSetupFields, `managedSections`: [String]? = nil) {
        self.`botId` = `botId`
        self.`fields` = `fields`
        self.`managedSections` = `managedSections`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `fields` = try object.required("fields")
        `managedSections` = try object.optional("managedSections")
        additionalFields = object.remainder(excluding: ["botId", "fields", "managedSections"])
        explicitNulls = object.nullKeys.intersection(["botId", "fields", "managedSections"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("fields", `fields`)
        try object.putOptional("managedSections", `managedSections`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}
