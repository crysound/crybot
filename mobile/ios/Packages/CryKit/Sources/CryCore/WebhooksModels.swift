import Foundation

public struct WebhookTrigger: WireModel {
    public var `id`: String
    public var `endpointId`: String
    public var `name`: String
    public var `prompt`: String
    public var `botId`: String
    public var `runOn`: RoutineRunOn
    public var `enabled`: Bool
    public var `createdAt`: Double
    public var `updatedAt`: Double
    public var `lastReceivedAt`: Double?
    public var `lastRunId`: String?
    public var `resultsThreadId`: String?
    public var `groupId`: String?
    public var `deliveryCount`: Double
    public var `verificationPending`: Bool?
    public var `verifiedAt`: Double?
    public var `verificationSample`: WebhookVerificationSample?
    public var `eventTypes`: [String]?
    public var `payloadFilter`: [String: String]?
    public var `maxPendingRuns`: Double?
    public var `sameConversation`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `endpointId`: String,
        `name`: String,
        `prompt`: String,
        `botId`: String,
        `runOn`: RoutineRunOn,
        `enabled`: Bool,
        `createdAt`: Double,
        `updatedAt`: Double,
        `deliveryCount`: Double,
        `lastReceivedAt`: Double? = nil,
        `lastRunId`: String? = nil,
        `resultsThreadId`: String? = nil,
        `groupId`: String? = nil,
        `verificationPending`: Bool? = nil,
        `verifiedAt`: Double? = nil,
        `verificationSample`: WebhookVerificationSample? = nil,
        `eventTypes`: [String]? = nil,
        `payloadFilter`: [String: String]? = nil,
        `maxPendingRuns`: Double? = nil,
        `sameConversation`: Bool? = nil
    ) {
        self.`id` = `id`
        self.`endpointId` = `endpointId`
        self.`name` = `name`
        self.`prompt` = `prompt`
        self.`botId` = `botId`
        self.`runOn` = `runOn`
        self.`enabled` = `enabled`
        self.`createdAt` = `createdAt`
        self.`updatedAt` = `updatedAt`
        self.`lastReceivedAt` = `lastReceivedAt`
        self.`lastRunId` = `lastRunId`
        self.`resultsThreadId` = `resultsThreadId`
        self.`groupId` = `groupId`
        self.`deliveryCount` = `deliveryCount`
        self.`verificationPending` = `verificationPending`
        self.`verifiedAt` = `verifiedAt`
        self.`verificationSample` = `verificationSample`
        self.`eventTypes` = `eventTypes`
        self.`payloadFilter` = `payloadFilter`
        self.`maxPendingRuns` = `maxPendingRuns`
        self.`sameConversation` = `sameConversation`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `endpointId` = try object.required("endpointId")
        `name` = try object.required("name")
        `prompt` = try object.required("prompt")
        `botId` = try object.required("botId")
        `runOn` = try object.required("runOn")
        `enabled` = try object.required("enabled")
        `createdAt` = try object.required("createdAt")
        `updatedAt` = try object.required("updatedAt")
        `lastReceivedAt` = try object.optional("lastReceivedAt")
        `lastRunId` = try object.optional("lastRunId")
        `resultsThreadId` = try object.optional("resultsThreadId")
        `groupId` = try object.optional("groupId")
        `deliveryCount` = try object.required("deliveryCount")
        `verificationPending` = try object.optional("verificationPending")
        `verifiedAt` = try object.optional("verifiedAt")
        `verificationSample` = try object.optional("verificationSample")
        `eventTypes` = try object.optional("eventTypes")
        `payloadFilter` = try object.optional("payloadFilter")
        `maxPendingRuns` = try object.optional("maxPendingRuns")
        `sameConversation` = try object.optional("sameConversation")
        additionalFields = object.remainder(excluding: ["id", "endpointId", "name", "prompt", "botId", "runOn", "enabled", "createdAt", "updatedAt", "lastReceivedAt", "lastRunId", "resultsThreadId", "groupId", "deliveryCount", "verificationPending", "verifiedAt", "verificationSample", "eventTypes", "payloadFilter", "maxPendingRuns", "sameConversation"])
        explicitNulls = object.nullKeys.intersection(["id", "endpointId", "name", "prompt", "botId", "runOn", "enabled", "createdAt", "updatedAt", "lastReceivedAt", "lastRunId", "resultsThreadId", "groupId", "deliveryCount", "verificationPending", "verifiedAt", "verificationSample", "eventTypes", "payloadFilter", "maxPendingRuns", "sameConversation"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("endpointId", `endpointId`)
        try object.put("name", `name`)
        try object.put("prompt", `prompt`)
        try object.put("botId", `botId`)
        try object.put("runOn", `runOn`)
        try object.put("enabled", `enabled`)
        try object.put("createdAt", `createdAt`)
        try object.put("updatedAt", `updatedAt`)
        try object.putOptional("lastReceivedAt", `lastReceivedAt`, nulls: explicitNulls)
        try object.putOptional("lastRunId", `lastRunId`, nulls: explicitNulls)
        try object.putOptional("resultsThreadId", `resultsThreadId`, nulls: explicitNulls)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.put("deliveryCount", `deliveryCount`)
        try object.putOptional("verificationPending", `verificationPending`, nulls: explicitNulls)
        try object.putOptional("verifiedAt", `verifiedAt`, nulls: explicitNulls)
        try object.putOptional("verificationSample", `verificationSample`, nulls: explicitNulls)
        try object.putOptional("eventTypes", `eventTypes`, nulls: explicitNulls)
        try object.putOptional("payloadFilter", `payloadFilter`, nulls: explicitNulls)
        try object.putOptional("maxPendingRuns", `maxPendingRuns`, nulls: explicitNulls)
        try object.putOptional("sameConversation", `sameConversation`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WebhookVerificationSample: WireModel {
    public var `receivedAt`: Double
    public var `eventName`: String?
    public var `contentType`: String?
    public var `preview`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`receivedAt`: Double, `preview`: String, `eventName`: String? = nil, `contentType`: String? = nil) {
        self.`receivedAt` = `receivedAt`
        self.`eventName` = `eventName`
        self.`contentType` = `contentType`
        self.`preview` = `preview`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `receivedAt` = try object.required("receivedAt")
        `eventName` = try object.optional("eventName")
        `contentType` = try object.optional("contentType")
        `preview` = try object.required("preview")
        additionalFields = object.remainder(excluding: ["receivedAt", "eventName", "contentType", "preview"])
        explicitNulls = object.nullKeys.intersection(["receivedAt", "eventName", "contentType", "preview"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("receivedAt", `receivedAt`)
        try object.putOptional("eventName", `eventName`, nulls: explicitNulls)
        try object.putOptional("contentType", `contentType`, nulls: explicitNulls)
        try object.put("preview", `preview`)
        try object.encode(to: encoder)
    }
}

public struct WebhookAttempt: WireModel {
    public var `id`: String
    public var `webhookId`: String
    public var `receivedAt`: Double
    public var `outcome`: WebhookAttemptOutcome
    public var `statusCode`: Double
    public var `eventName`: String?
    public var `preview`: String?
    public var `deliveryId`: String?
    public var `runId`: String?
    public var `threadId`: String?
    public var `reason`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `webhookId`: String,
        `receivedAt`: Double,
        `outcome`: WebhookAttemptOutcome,
        `statusCode`: Double,
        `eventName`: String? = nil,
        `preview`: String? = nil,
        `deliveryId`: String? = nil,
        `runId`: String? = nil,
        `threadId`: String? = nil,
        `reason`: String? = nil
    ) {
        self.`id` = `id`
        self.`webhookId` = `webhookId`
        self.`receivedAt` = `receivedAt`
        self.`outcome` = `outcome`
        self.`statusCode` = `statusCode`
        self.`eventName` = `eventName`
        self.`preview` = `preview`
        self.`deliveryId` = `deliveryId`
        self.`runId` = `runId`
        self.`threadId` = `threadId`
        self.`reason` = `reason`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `webhookId` = try object.required("webhookId")
        `receivedAt` = try object.required("receivedAt")
        `outcome` = try object.required("outcome")
        `statusCode` = try object.required("statusCode")
        `eventName` = try object.optional("eventName")
        `preview` = try object.optional("preview")
        `deliveryId` = try object.optional("deliveryId")
        `runId` = try object.optional("runId")
        `threadId` = try object.optional("threadId")
        `reason` = try object.optional("reason")
        additionalFields = object.remainder(excluding: ["id", "webhookId", "receivedAt", "outcome", "statusCode", "eventName", "preview", "deliveryId", "runId", "threadId", "reason"])
        explicitNulls = object.nullKeys.intersection(["id", "webhookId", "receivedAt", "outcome", "statusCode", "eventName", "preview", "deliveryId", "runId", "threadId", "reason"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("webhookId", `webhookId`)
        try object.put("receivedAt", `receivedAt`)
        try object.put("outcome", `outcome`)
        try object.put("statusCode", `statusCode`)
        try object.putOptional("eventName", `eventName`, nulls: explicitNulls)
        try object.putOptional("preview", `preview`, nulls: explicitNulls)
        try object.putOptional("deliveryId", `deliveryId`, nulls: explicitNulls)
        try object.putOptional("runId", `runId`, nulls: explicitNulls)
        try object.putOptional("threadId", `threadId`, nulls: explicitNulls)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WebhookAttemptOutcome: WireModel, Hashable, Sendable {
    case `accepted`
    case `captured`
    case `duplicate`
    case `ignored`
    case `rejected`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "accepted": self = .`accepted`
        case "captured": self = .`captured`
        case "duplicate": self = .`duplicate`
        case "ignored": self = .`ignored`
        case "rejected": self = .`rejected`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`accepted`: return "accepted"
        case .`captured`: return "captured"
        case .`duplicate`: return "duplicate"
        case .`ignored`: return "ignored"
        case .`rejected`: return "rejected"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
