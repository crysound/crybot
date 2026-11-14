import Foundation

public struct RuntimeEventSessionStarted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventSessionStartedRaw?
    public var `synthetic`: Bool?
    public var `sessionId`: String?
    public var `model`: String?
    public var `rebuilt`: Bool?
    public var `mcpFailed`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `sessionId`: String?,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventSessionStartedRaw? = nil,
        `synthetic`: Bool? = nil,
        `model`: String? = nil,
        `rebuilt`: Bool? = nil,
        `mcpFailed`: [String]? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`sessionId` = `sessionId`
        self.`model` = `model`
        self.`rebuilt` = `rebuilt`
        self.`mcpFailed` = `mcpFailed`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `sessionId` = try object.nullable("sessionId")
        `model` = try object.optional("model")
        `rebuilt` = try object.optional("rebuilt")
        `mcpFailed` = try object.optional("mcpFailed")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "sessionId", "model", "rebuilt", "mcpFailed"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "sessionId", "model", "rebuilt", "mcpFailed"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.putNullable("sessionId", `sessionId`)
        try object.putOptional("model", `model`, nulls: explicitNulls)
        try object.putOptional("rebuilt", `rebuilt`, nulls: explicitNulls)
        try object.putOptional("mcpFailed", `mcpFailed`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public typealias DriverKind = String

public typealias InstanceId = String

public typealias ThreadId = String

public typealias TurnId = String

public struct RuntimeEventSessionStartedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventSessionModelVariants: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventSessionModelVariantsRaw?
    public var `synthetic`: Bool?
    public var `model`: String
    public var `variants`: ModelVariantState
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `model`: String,
        `variants`: ModelVariantState,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventSessionModelVariantsRaw? = nil,
        `synthetic`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`model` = `model`
        self.`variants` = `variants`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `model` = try object.required("model")
        `variants` = try object.required("variants")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "model", "variants"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "model", "variants"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("model", `model`)
        try object.put("variants", `variants`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventSessionModelVariantsRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct ModelVariantState: WireModel {
    public var `options`: [ModelVariantOption]
    public var `currentValue`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`options`: [ModelVariantOption], `currentValue`: String? = nil) {
        self.`options` = `options`
        self.`currentValue` = `currentValue`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `options` = try object.required("options")
        `currentValue` = try object.optional("currentValue")
        additionalFields = object.remainder(excluding: ["options", "currentValue"])
        explicitNulls = object.nullKeys.intersection(["options", "currentValue"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("options", `options`)
        try object.putOptional("currentValue", `currentValue`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ModelVariantOption: WireModel {
    public var `id`: String
    public var `label`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `label`: String) {
        self.`id` = `id`
        self.`label` = `label`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `label` = try object.required("label")
        additionalFields = object.remainder(excluding: ["id", "label"])
        explicitNulls = object.nullKeys.intersection(["id", "label"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("label", `label`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventSessionExited: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventSessionExitedRaw?
    public var `synthetic`: Bool?
    public var `reason`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventSessionExitedRaw? = nil,
        `synthetic`: Bool? = nil,
        `reason`: String? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`reason` = `reason`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `reason` = try object.optional("reason")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "reason"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "reason"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventSessionExitedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnStarted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventTurnStartedRaw?
    public var `synthetic`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventTurnStartedRaw? = nil,
        `synthetic`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnStartedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnRetrying: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventTurnRetryingRaw?
    public var `synthetic`: Bool?
    public var `attempt`: Double
    public var `delayMs`: Double
    public var `reason`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `attempt`: Double,
        `delayMs`: Double,
        `reason`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventTurnRetryingRaw? = nil,
        `synthetic`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`attempt` = `attempt`
        self.`delayMs` = `delayMs`
        self.`reason` = `reason`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `attempt` = try object.required("attempt")
        `delayMs` = try object.required("delayMs")
        `reason` = try object.required("reason")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "attempt", "delayMs", "reason"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "attempt", "delayMs", "reason"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("attempt", `attempt`)
        try object.put("delayMs", `delayMs`)
        try object.put("reason", `reason`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnRetryingRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnCompleted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventTurnCompletedRaw?
    public var `synthetic`: Bool?
    public var `ok`: Bool
    public var `stopReason`: String?
    public var `cost`: Double?
    public var `denials`: [String]?
    public var `usage`: RuntimeEventTurnCompletedUsage?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `ok`: Bool,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventTurnCompletedRaw? = nil,
        `synthetic`: Bool? = nil,
        `stopReason`: String? = nil,
        `cost`: Double? = nil,
        `denials`: [String]? = nil,
        `usage`: RuntimeEventTurnCompletedUsage? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`ok` = `ok`
        self.`stopReason` = `stopReason`
        self.`cost` = `cost`
        self.`denials` = `denials`
        self.`usage` = `usage`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `ok` = try object.required("ok")
        `stopReason` = try object.optional("stopReason")
        `cost` = try object.optional("cost")
        `denials` = try object.optional("denials")
        `usage` = try object.optional("usage")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "ok", "stopReason", "cost", "denials", "usage"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "ok", "stopReason", "cost", "denials", "usage"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("ok", `ok`)
        try object.putOptional("stopReason", `stopReason`, nulls: explicitNulls)
        try object.putOptional("cost", `cost`, nulls: explicitNulls)
        try object.putOptional("denials", `denials`, nulls: explicitNulls)
        try object.putOptional("usage", `usage`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnCompletedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnCompletedUsage: WireModel {
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`input`: Double, `output`: Double, `cachedInput`: Double? = nil) {
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        additionalFields = object.remainder(excluding: ["input", "output", "cachedInput"])
        explicitNulls = object.nullKeys.intersection(["input", "output", "cachedInput"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventCapExhausted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventCapExhaustedRaw?
    public var `synthetic`: Bool?
    public var `handoffPath`: String
    public var `reason`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `handoffPath`: String,
        `reason`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventCapExhaustedRaw? = nil,
        `synthetic`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`handoffPath` = `handoffPath`
        self.`reason` = `reason`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `handoffPath` = try object.required("handoffPath")
        `reason` = try object.required("reason")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "handoffPath", "reason"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "handoffPath", "reason"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("handoffPath", `handoffPath`)
        try object.put("reason", `reason`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventCapExhaustedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnWaitStarted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventTurnWaitStartedRaw?
    public var `synthetic`: Bool?
    public var `resource`: String
    public var `position`: Double?
    public var `holder`: RuntimeEventTurnWaitStartedHolder?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `resource`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventTurnWaitStartedRaw? = nil,
        `synthetic`: Bool? = nil,
        `position`: Double? = nil,
        `holder`: RuntimeEventTurnWaitStartedHolder? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`resource` = `resource`
        self.`position` = `position`
        self.`holder` = `holder`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `resource` = try object.required("resource")
        `position` = try object.optional("position")
        `holder` = try object.optional("holder")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "resource", "position", "holder"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "resource", "position", "holder"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("resource", `resource`)
        try object.putOptional("position", `position`, nulls: explicitNulls)
        try object.putOptional("holder", `holder`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnWaitStartedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnWaitStartedHolder: WireModel {
    public var `name`: String
    public var `task`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `task`: String? = nil) {
        self.`name` = `name`
        self.`task` = `task`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `task` = try object.optional("task")
        additionalFields = object.remainder(excluding: ["name", "task"])
        explicitNulls = object.nullKeys.intersection(["name", "task"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("task", `task`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnWaitEnded: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventTurnWaitEndedRaw?
    public var `synthetic`: Bool?
    public var `resource`: String
    public var `holder`: RuntimeEventTurnWaitEndedHolder?
    public var `waitedMs`: Double
    public var `outcome`: RuntimeEventTurnWaitEndedOutcome
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `resource`: String,
        `waitedMs`: Double,
        `outcome`: RuntimeEventTurnWaitEndedOutcome,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventTurnWaitEndedRaw? = nil,
        `synthetic`: Bool? = nil,
        `holder`: RuntimeEventTurnWaitEndedHolder? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`resource` = `resource`
        self.`holder` = `holder`
        self.`waitedMs` = `waitedMs`
        self.`outcome` = `outcome`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `resource` = try object.required("resource")
        `holder` = try object.optional("holder")
        `waitedMs` = try object.required("waitedMs")
        `outcome` = try object.required("outcome")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "resource", "holder", "waitedMs", "outcome"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "resource", "holder", "waitedMs", "outcome"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("resource", `resource`)
        try object.putOptional("holder", `holder`, nulls: explicitNulls)
        try object.put("waitedMs", `waitedMs`)
        try object.put("outcome", `outcome`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnWaitEndedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnWaitEndedHolder: WireModel {
    public var `name`: String
    public var `task`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `task`: String? = nil) {
        self.`name` = `name`
        self.`task` = `task`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `task` = try object.optional("task")
        additionalFields = object.remainder(excluding: ["name", "task"])
        explicitNulls = object.nullKeys.intersection(["name", "task"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("task", `task`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventTurnWaitEndedOutcome: WireModel, Hashable, Sendable {
    case `acquired`
    case `gaveUp`
    case `parked`
    case `stopped`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "acquired": self = .`acquired`
        case "gave_up": self = .`gaveUp`
        case "parked": self = .`parked`
        case "stopped": self = .`stopped`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`acquired`: return "acquired"
        case .`gaveUp`: return "gave_up"
        case .`parked`: return "parked"
        case .`stopped`: return "stopped"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventItemStarted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventItemStartedRaw?
    public var `synthetic`: Bool?
    public var `itemType`: RuntimeEventItemStartedItemType
    public var `title`: String?
    public var `summary`: String?
    public var `input`: String?
    public var `step`: LiveStep?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `itemType`: RuntimeEventItemStartedItemType,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventItemStartedRaw? = nil,
        `synthetic`: Bool? = nil,
        `title`: String? = nil,
        `summary`: String? = nil,
        `input`: String? = nil,
        `step`: LiveStep? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`itemType` = `itemType`
        self.`title` = `title`
        self.`summary` = `summary`
        self.`input` = `input`
        self.`step` = `step`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `itemType` = try object.required("itemType")
        `title` = try object.optional("title")
        `summary` = try object.optional("summary")
        `input` = try object.optional("input")
        `step` = try object.optional("step")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "title", "summary", "input", "step"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "title", "summary", "input", "step"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("itemType", `itemType`)
        try object.putOptional("title", `title`, nulls: explicitNulls)
        try object.putOptional("summary", `summary`, nulls: explicitNulls)
        try object.putOptional("input", `input`, nulls: explicitNulls)
        try object.putOptional("step", `step`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventItemStartedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventItemStartedItemType: WireModel, Hashable, Sendable {
    case `tool`
    case `reasoning`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "tool": self = .`tool`
        case "reasoning": self = .`reasoning`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`tool`: return "tool"
        case .`reasoning`: return "reasoning"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventItemUpdated: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventItemUpdatedRaw?
    public var `synthetic`: Bool?
    public var `itemType`: RuntimeEventItemUpdatedItemType
    public var `tokens`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `itemType`: RuntimeEventItemUpdatedItemType,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventItemUpdatedRaw? = nil,
        `synthetic`: Bool? = nil,
        `tokens`: Double? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`itemType` = `itemType`
        self.`tokens` = `tokens`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `itemType` = try object.required("itemType")
        `tokens` = try object.optional("tokens")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "tokens"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "tokens"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("itemType", `itemType`)
        try object.putOptional("tokens", `tokens`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventItemUpdatedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventItemUpdatedItemType: WireModel, Hashable, Sendable {
    case `tool`
    case `reasoning`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "tool": self = .`tool`
        case "reasoning": self = .`reasoning`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`tool`: return "tool"
        case .`reasoning`: return "reasoning"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventItemOutput: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventItemOutputRaw?
    public var `synthetic`: Bool?
    public var `itemType`: String
    public var `text`: String
    public var `whole`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `itemType`: String,
        `text`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventItemOutputRaw? = nil,
        `synthetic`: Bool? = nil,
        `whole`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`itemType` = `itemType`
        self.`text` = `text`
        self.`whole` = `whole`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `itemType` = try object.required("itemType")
        `text` = try object.required("text")
        `whole` = try object.optional("whole")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "text", "whole"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "text", "whole"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("itemType", `itemType`)
        try object.put("text", `text`)
        try object.putOptional("whole", `whole`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventItemOutputRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnProgress: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventTurnProgressRaw?
    public var `synthetic`: Bool?
    public var `activity`: TurnProgressActivity
    public var `tool`: String?
    public var `file`: String?
    public var `bytes`: Double?
    public var `target`: String?
    public var `detail`: String?
    public var `quiet`: StepQuiet?
    public var `tail`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `activity`: TurnProgressActivity,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventTurnProgressRaw? = nil,
        `synthetic`: Bool? = nil,
        `tool`: String? = nil,
        `file`: String? = nil,
        `bytes`: Double? = nil,
        `target`: String? = nil,
        `detail`: String? = nil,
        `quiet`: StepQuiet? = nil,
        `tail`: [String]? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`activity` = `activity`
        self.`tool` = `tool`
        self.`file` = `file`
        self.`bytes` = `bytes`
        self.`target` = `target`
        self.`detail` = `detail`
        self.`quiet` = `quiet`
        self.`tail` = `tail`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `activity` = try object.required("activity")
        `tool` = try object.optional("tool")
        `file` = try object.optional("file")
        `bytes` = try object.optional("bytes")
        `target` = try object.optional("target")
        `detail` = try object.optional("detail")
        `quiet` = try object.optional("quiet")
        `tail` = try object.optional("tail")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "activity", "tool", "file", "bytes", "target", "detail", "quiet", "tail"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "activity", "tool", "file", "bytes", "target", "detail", "quiet", "tail"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("activity", `activity`)
        try object.putOptional("tool", `tool`, nulls: explicitNulls)
        try object.putOptional("file", `file`, nulls: explicitNulls)
        try object.putOptional("bytes", `bytes`, nulls: explicitNulls)
        try object.putOptional("target", `target`, nulls: explicitNulls)
        try object.putOptional("detail", `detail`, nulls: explicitNulls)
        try object.putOptional("quiet", `quiet`, nulls: explicitNulls)
        try object.putOptional("tail", `tail`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventTurnProgressRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventItemCompleted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventItemCompletedRaw?
    public var `synthetic`: Bool?
    public var `itemType`: RuntimeEventItemCompletedItemType
    public var `ok`: Bool?
    public var `output`: String?
    public var `text`: String?
    public var `data`: String?
    public var `alt`: String?
    public var `fromTool`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `itemType`: RuntimeEventItemCompletedItemType,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventItemCompletedRaw? = nil,
        `synthetic`: Bool? = nil,
        `ok`: Bool? = nil,
        `output`: String? = nil,
        `text`: String? = nil,
        `data`: String? = nil,
        `alt`: String? = nil,
        `fromTool`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`itemType` = `itemType`
        self.`ok` = `ok`
        self.`output` = `output`
        self.`text` = `text`
        self.`data` = `data`
        self.`alt` = `alt`
        self.`fromTool` = `fromTool`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `itemType` = try object.required("itemType")
        `ok` = try object.optional("ok")
        `output` = try object.optional("output")
        `text` = try object.optional("text")
        `data` = try object.optional("data")
        `alt` = try object.optional("alt")
        `fromTool` = try object.optional("fromTool")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "ok", "output", "text", "data", "alt", "fromTool"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "itemType", "ok", "output", "text", "data", "alt", "fromTool"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("itemType", `itemType`)
        try object.putOptional("ok", `ok`, nulls: explicitNulls)
        try object.putOptional("output", `output`, nulls: explicitNulls)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.putOptional("data", `data`, nulls: explicitNulls)
        try object.putOptional("alt", `alt`, nulls: explicitNulls)
        try object.putOptional("fromTool", `fromTool`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventItemCompletedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventItemCompletedItemType: WireModel, Hashable, Sendable {
    case `tool`
    case `assistantText`
    case `assistantImage`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "tool": self = .`tool`
        case "assistant_text": self = .`assistantText`
        case "assistant_image": self = .`assistantImage`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`tool`: return "tool"
        case .`assistantText`: return "assistant_text"
        case .`assistantImage`: return "assistant_image"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventContentDelta: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventContentDeltaRaw?
    public var `synthetic`: Bool?
    public var `streamKind`: RuntimeEventContentDeltaStreamKind
    public var `delta`: String
    public var `botId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `streamKind`: RuntimeEventContentDeltaStreamKind,
        `delta`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventContentDeltaRaw? = nil,
        `synthetic`: Bool? = nil,
        `botId`: String? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`streamKind` = `streamKind`
        self.`delta` = `delta`
        self.`botId` = `botId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `streamKind` = try object.required("streamKind")
        `delta` = try object.required("delta")
        `botId` = try object.optional("botId")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "streamKind", "delta", "botId"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "streamKind", "delta", "botId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("streamKind", `streamKind`)
        try object.put("delta", `delta`)
        try object.putOptional("botId", `botId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventContentDeltaRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventContentDeltaStreamKind: WireModel, Hashable, Sendable {
    case `assistantText`
    case `reasoningText`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "assistant_text": self = .`assistantText`
        case "reasoning_text": self = .`reasoningText`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`assistantText`: return "assistant_text"
        case .`reasoningText`: return "reasoning_text"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventRequestOpened: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventRequestOpenedRaw?
    public var `synthetic`: Bool?
    public var `requestType`: RuntimeEventRequestOpenedRequestType
    public var `tool`: String
    public var `summary`: String
    public var `summaryCode`: String?
    public var `summaryParams`: ServerTextParams?
    public var `command`: RuntimeEventRequestOpenedCommand?
    public var `commandLine`: String?
    public var `reads`: [String]?
    public var `choices`: [String]?
    public var `questions`: [AskQuestion]?
    public var `origin`: RuntimeEventRequestOpenedOrigin?
    public var `approvalScope`: String?
    public var `requiresExplicitApproval`: Bool?
    public var `nativeReview`: RuntimeEventRequestOpenedNativeReview?
    public var `allowSession`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `requestType`: RuntimeEventRequestOpenedRequestType,
        `tool`: String,
        `summary`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventRequestOpenedRaw? = nil,
        `synthetic`: Bool? = nil,
        `summaryCode`: String? = nil,
        `summaryParams`: ServerTextParams? = nil,
        `command`: RuntimeEventRequestOpenedCommand? = nil,
        `commandLine`: String? = nil,
        `reads`: [String]? = nil,
        `choices`: [String]? = nil,
        `questions`: [AskQuestion]? = nil,
        `origin`: RuntimeEventRequestOpenedOrigin? = nil,
        `approvalScope`: String? = nil,
        `requiresExplicitApproval`: Bool? = nil,
        `nativeReview`: RuntimeEventRequestOpenedNativeReview? = nil,
        `allowSession`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`requestType` = `requestType`
        self.`tool` = `tool`
        self.`summary` = `summary`
        self.`summaryCode` = `summaryCode`
        self.`summaryParams` = `summaryParams`
        self.`command` = `command`
        self.`commandLine` = `commandLine`
        self.`reads` = `reads`
        self.`choices` = `choices`
        self.`questions` = `questions`
        self.`origin` = `origin`
        self.`approvalScope` = `approvalScope`
        self.`requiresExplicitApproval` = `requiresExplicitApproval`
        self.`nativeReview` = `nativeReview`
        self.`allowSession` = `allowSession`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `requestType` = try object.required("requestType")
        `tool` = try object.required("tool")
        `summary` = try object.required("summary")
        `summaryCode` = try object.optional("summaryCode")
        `summaryParams` = try object.optional("summaryParams")
        `command` = try object.optional("command")
        `commandLine` = try object.optional("commandLine")
        `reads` = try object.optional("reads")
        `choices` = try object.optional("choices")
        `questions` = try object.optional("questions")
        `origin` = try object.optional("origin")
        `approvalScope` = try object.optional("approvalScope")
        `requiresExplicitApproval` = try object.optional("requiresExplicitApproval")
        `nativeReview` = try object.optional("nativeReview")
        `allowSession` = try object.optional("allowSession")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "requestType", "tool", "summary", "summaryCode", "summaryParams", "command", "commandLine", "reads", "choices", "questions", "origin", "approvalScope", "requiresExplicitApproval", "nativeReview", "allowSession"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "requestType", "tool", "summary", "summaryCode", "summaryParams", "command", "commandLine", "reads", "choices", "questions", "origin", "approvalScope", "requiresExplicitApproval", "nativeReview", "allowSession"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("requestType", `requestType`)
        try object.put("tool", `tool`)
        try object.put("summary", `summary`)
        try object.putOptional("summaryCode", `summaryCode`, nulls: explicitNulls)
        try object.putOptional("summaryParams", `summaryParams`, nulls: explicitNulls)
        try object.putOptional("command", `command`, nulls: explicitNulls)
        try object.putOptional("commandLine", `commandLine`, nulls: explicitNulls)
        try object.putOptional("reads", `reads`, nulls: explicitNulls)
        try object.putOptional("choices", `choices`, nulls: explicitNulls)
        try object.putOptional("questions", `questions`, nulls: explicitNulls)
        try object.putOptional("origin", `origin`, nulls: explicitNulls)
        try object.putOptional("approvalScope", `approvalScope`, nulls: explicitNulls)
        try object.putOptional("requiresExplicitApproval", `requiresExplicitApproval`, nulls: explicitNulls)
        try object.putOptional("nativeReview", `nativeReview`, nulls: explicitNulls)
        try object.putOptional("allowSession", `allowSession`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventRequestOpenedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventRequestOpenedRequestType: WireModel, Hashable, Sendable {
    case `permission`
    case `question`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "permission": self = .`permission`
        case "question": self = .`question`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`permission`: return "permission"
        case .`question`: return "question"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventRequestOpenedCommand: WireModel {
    public var `command`: String
    public var `cwd`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`command`: String, `cwd`: String) {
        self.`command` = `command`
        self.`cwd` = `cwd`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `command` = try object.required("command")
        `cwd` = try object.required("cwd")
        additionalFields = object.remainder(excluding: ["command", "cwd"])
        explicitNulls = object.nullKeys.intersection(["command", "cwd"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("command", `command`)
        try object.put("cwd", `cwd`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventRequestOpenedOrigin: WireModel, Hashable, Sendable {
    case `tool`
    case `output`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "tool": self = .`tool`
        case "output": self = .`output`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`tool`: return "tool"
        case .`output`: return "output"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RuntimeEventRequestOpenedNativeReview: WireModel, Hashable, Sendable {
    case `active`
    case `inactive`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "active": self = .`active`
        case "inactive": self = .`inactive`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`active`: return "active"
        case .`inactive`: return "inactive"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventRequestResolved: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventRequestResolvedRaw?
    public var `synthetic`: Bool?
    public var `behavior`: RuntimeEventRequestResolvedBehavior
    public var `source`: RuntimeEventRequestResolvedSource
    public var `approvalScope`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `behavior`: RuntimeEventRequestResolvedBehavior,
        `source`: RuntimeEventRequestResolvedSource,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventRequestResolvedRaw? = nil,
        `synthetic`: Bool? = nil,
        `approvalScope`: String? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`behavior` = `behavior`
        self.`source` = `source`
        self.`approvalScope` = `approvalScope`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `behavior` = try object.required("behavior")
        `source` = try object.required("source")
        `approvalScope` = try object.optional("approvalScope")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "behavior", "source", "approvalScope"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "behavior", "source", "approvalScope"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("behavior", `behavior`)
        try object.put("source", `source`)
        try object.putOptional("approvalScope", `approvalScope`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventRequestResolvedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventRequestResolvedBehavior: WireModel, Hashable, Sendable {
    case `allow`
    case `deny`
    case `answer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "allow": self = .`allow`
        case "deny": self = .`deny`
        case "answer": self = .`answer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`allow`: return "allow"
        case .`deny`: return "deny"
        case .`answer`: return "answer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RuntimeEventRequestResolvedSource: WireModel, Hashable, Sendable {
    case `user`
    case `auto`
    case `timeout`
    case `system`
    case `unavailable`
    case `peer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "user": self = .`user`
        case "auto": self = .`auto`
        case "timeout": self = .`timeout`
        case "system": self = .`system`
        case "unavailable": self = .`unavailable`
        case "peer": self = .`peer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`user`: return "user"
        case .`auto`: return "auto"
        case .`timeout`: return "timeout"
        case .`system`: return "system"
        case .`unavailable`: return "unavailable"
        case .`peer`: return "peer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventThreadTokenUsageUpdated: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventThreadTokenUsageUpdatedRaw?
    public var `synthetic`: Bool?
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var `contextTokens`: Double?
    public var `contextWindow`: Double?
    public var `reasoning`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `input`: Double,
        `output`: Double,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventThreadTokenUsageUpdatedRaw? = nil,
        `synthetic`: Bool? = nil,
        `cachedInput`: Double? = nil,
        `contextTokens`: Double? = nil,
        `contextWindow`: Double? = nil,
        `reasoning`: Double? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
        self.`contextTokens` = `contextTokens`
        self.`contextWindow` = `contextWindow`
        self.`reasoning` = `reasoning`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        `contextTokens` = try object.optional("contextTokens")
        `contextWindow` = try object.optional("contextWindow")
        `reasoning` = try object.optional("reasoning")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "input", "output", "cachedInput", "contextTokens", "contextWindow", "reasoning"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "input", "output", "cachedInput", "contextTokens", "contextWindow", "reasoning"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.putOptional("contextTokens", `contextTokens`, nulls: explicitNulls)
        try object.putOptional("contextWindow", `contextWindow`, nulls: explicitNulls)
        try object.putOptional("reasoning", `reasoning`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventThreadTokenUsageUpdatedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventRuntimeError: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventRuntimeErrorRaw?
    public var `synthetic`: Bool?
    public var `message`: String
    public var `partial`: Bool?
    public var `setup`: Bool?
    public var `terminal`: Bool?
    public var `claudeUpdate`: Bool?
    public var `trialCredit`: RuntimeEventRuntimeErrorTrialCredit?
    public var `stalled`: Bool?
    public var `limitResetsAt`: Double?
    public var `limit`: RuntimeEventRuntimeErrorLimit?
    public var `limitModels`: [String]?
    public var `text`: ServerText?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `message`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventRuntimeErrorRaw? = nil,
        `synthetic`: Bool? = nil,
        `partial`: Bool? = nil,
        `setup`: Bool? = nil,
        `terminal`: Bool? = nil,
        `claudeUpdate`: Bool? = nil,
        `trialCredit`: RuntimeEventRuntimeErrorTrialCredit? = nil,
        `stalled`: Bool? = nil,
        `limitResetsAt`: Double? = nil,
        `limit`: RuntimeEventRuntimeErrorLimit? = nil,
        `limitModels`: [String]? = nil,
        `text`: ServerText? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`message` = `message`
        self.`partial` = `partial`
        self.`setup` = `setup`
        self.`terminal` = `terminal`
        self.`claudeUpdate` = `claudeUpdate`
        self.`trialCredit` = `trialCredit`
        self.`stalled` = `stalled`
        self.`limitResetsAt` = `limitResetsAt`
        self.`limit` = `limit`
        self.`limitModels` = `limitModels`
        self.`text` = `text`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `message` = try object.required("message")
        `partial` = try object.optional("partial")
        `setup` = try object.optional("setup")
        `terminal` = try object.optional("terminal")
        `claudeUpdate` = try object.optional("claudeUpdate")
        `trialCredit` = try object.optional("trialCredit")
        `stalled` = try object.optional("stalled")
        `limitResetsAt` = try object.optional("limitResetsAt")
        `limit` = try object.optional("limit")
        `limitModels` = try object.optional("limitModels")
        `text` = try object.optional("text")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "message", "partial", "setup", "terminal", "claudeUpdate", "trialCredit", "stalled", "limitResetsAt", "limit", "limitModels", "text"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "message", "partial", "setup", "terminal", "claudeUpdate", "trialCredit", "stalled", "limitResetsAt", "limit", "limitModels", "text"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("message", `message`)
        try object.putOptional("partial", `partial`, nulls: explicitNulls)
        try object.putOptional("setup", `setup`, nulls: explicitNulls)
        try object.putOptional("terminal", `terminal`, nulls: explicitNulls)
        try object.putOptional("claudeUpdate", `claudeUpdate`, nulls: explicitNulls)
        try object.putOptional("trialCredit", `trialCredit`, nulls: explicitNulls)
        try object.putOptional("stalled", `stalled`, nulls: explicitNulls)
        try object.putOptional("limitResetsAt", `limitResetsAt`, nulls: explicitNulls)
        try object.putOptional("limit", `limit`, nulls: explicitNulls)
        try object.putOptional("limitModels", `limitModels`, nulls: explicitNulls)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventRuntimeErrorRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public enum RuntimeEventRuntimeErrorTrialCredit: WireModel, Hashable, Sendable {
    case `usedUp`
    case `ended`
    case `paused`
    case `tooLow`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "used_up": self = .`usedUp`
        case "ended": self = .`ended`
        case "paused": self = .`paused`
        case "too_low": self = .`tooLow`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`usedUp`: return "used_up"
        case .`ended`: return "ended"
        case .`paused`: return "paused"
        case .`tooLow`: return "too_low"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RuntimeEventRuntimeErrorLimit: WireModel, Hashable, Sendable {
    case `engine`
    case `model`
    case `credits`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "engine": self = .`engine`
        case "model": self = .`model`
        case "credits": self = .`credits`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`engine`: return "engine"
        case .`model`: return "model"
        case .`credits`: return "credits"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RuntimeEventRuntimeNotice: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventRuntimeNoticeRaw?
    public var `synthetic`: Bool?
    public var `message`: String
    public var `text`: ServerText?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `message`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventRuntimeNoticeRaw? = nil,
        `synthetic`: Bool? = nil,
        `text`: ServerText? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
        self.`message` = `message`
        self.`text` = `text`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        `message` = try object.required("message")
        `text` = try object.optional("text")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "message", "text"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic", "message", "text"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.put("message", `message`)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventRuntimeNoticeRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventContextCompacted: WireModel {
    public var `eventId`: String
    public var `provider`: DriverKind
    public var `providerInstanceId`: InstanceId?
    public var `threadId`: ThreadId
    public var `createdAt`: String
    public var `turnId`: TurnId?
    public var `itemId`: String?
    public var `requestId`: String?
    public var `raw`: RuntimeEventContextCompactedRaw?
    public var `synthetic`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `eventId`: String,
        `provider`: DriverKind,
        `threadId`: ThreadId,
        `createdAt`: String,
        `providerInstanceId`: InstanceId? = nil,
        `turnId`: TurnId? = nil,
        `itemId`: String? = nil,
        `requestId`: String? = nil,
        `raw`: RuntimeEventContextCompactedRaw? = nil,
        `synthetic`: Bool? = nil
    ) {
        self.`eventId` = `eventId`
        self.`provider` = `provider`
        self.`providerInstanceId` = `providerInstanceId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`turnId` = `turnId`
        self.`itemId` = `itemId`
        self.`requestId` = `requestId`
        self.`raw` = `raw`
        self.`synthetic` = `synthetic`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `eventId` = try object.required("eventId")
        `provider` = try object.required("provider")
        `providerInstanceId` = try object.optional("providerInstanceId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `turnId` = try object.optional("turnId")
        `itemId` = try object.optional("itemId")
        `requestId` = try object.optional("requestId")
        `raw` = try object.optional("raw")
        `synthetic` = try object.optional("synthetic")
        additionalFields = object.remainder(excluding: ["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic"])
        explicitNulls = object.nullKeys.intersection(["eventId", "provider", "providerInstanceId", "threadId", "createdAt", "turnId", "itemId", "requestId", "raw", "synthetic"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("eventId", `eventId`)
        try object.put("provider", `provider`)
        try object.putOptional("providerInstanceId", `providerInstanceId`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("raw", `raw`, nulls: explicitNulls)
        try object.putOptional("synthetic", `synthetic`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RuntimeEventContextCompactedRaw: WireModel {
    public var `source`: String
    public var `payload`: JSONValue
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`source`: String, `payload`: JSONValue) {
        self.`source` = `source`
        self.`payload` = `payload`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `source` = try object.required("source")
        `payload` = try object.required("payload")
        additionalFields = object.remainder(excluding: ["source", "payload"])
        explicitNulls = object.nullKeys.intersection(["source", "payload"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("source", `source`)
        try object.put("payload", `payload`)
        try object.encode(to: encoder)
    }
}

public indirect enum RuntimeEvent: WireModel {
    case `sessionStarted`(RuntimeEventSessionStarted)
    case `sessionModelVariants`(RuntimeEventSessionModelVariants)
    case `sessionExited`(RuntimeEventSessionExited)
    case `turnStarted`(RuntimeEventTurnStarted)
    case `turnRetrying`(RuntimeEventTurnRetrying)
    case `turnCompleted`(RuntimeEventTurnCompleted)
    case `capExhausted`(RuntimeEventCapExhausted)
    case `turnWaitStarted`(RuntimeEventTurnWaitStarted)
    case `turnWaitEnded`(RuntimeEventTurnWaitEnded)
    case `itemStarted`(RuntimeEventItemStarted)
    case `itemUpdated`(RuntimeEventItemUpdated)
    case `itemOutput`(RuntimeEventItemOutput)
    case `turnProgress`(RuntimeEventTurnProgress)
    case `itemCompleted`(RuntimeEventItemCompleted)
    case `contentDelta`(RuntimeEventContentDelta)
    case `requestOpened`(RuntimeEventRequestOpened)
    case `requestResolved`(RuntimeEventRequestResolved)
    case `threadTokenUsageUpdated`(RuntimeEventThreadTokenUsageUpdated)
    case `runtimeError`(RuntimeEventRuntimeError)
    case `runtimeNotice`(RuntimeEventRuntimeNotice)
    case `contextCompacted`(RuntimeEventContextCompacted)
    case unknown(kind: String, raw: JSONValue)

    public var type: String {
        switch self {
        case .`sessionStarted`: return "session.started"
        case .`sessionModelVariants`: return "session.model-variants"
        case .`sessionExited`: return "session.exited"
        case .`turnStarted`: return "turn.started"
        case .`turnRetrying`: return "turn.retrying"
        case .`turnCompleted`: return "turn.completed"
        case .`capExhausted`: return "cap.exhausted"
        case .`turnWaitStarted`: return "turn.wait_started"
        case .`turnWaitEnded`: return "turn.wait_ended"
        case .`itemStarted`: return "item.started"
        case .`itemUpdated`: return "item.updated"
        case .`itemOutput`: return "item.output"
        case .`turnProgress`: return "turn.progress"
        case .`itemCompleted`: return "item.completed"
        case .`contentDelta`: return "content.delta"
        case .`requestOpened`: return "request.opened"
        case .`requestResolved`: return "request.resolved"
        case .`threadTokenUsageUpdated`: return "thread.token-usage.updated"
        case .`runtimeError`: return "runtime.error"
        case .`runtimeNotice`: return "runtime.notice"
        case .`contextCompacted`: return "context.compacted"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["type"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing type"))
        }
        var payload = raw
        payload["type"] = nil
        switch kind {
        case "session.started": self = .`sessionStarted`(try payload.decode(RuntimeEventSessionStarted.self))
        case "session.model-variants": self = .`sessionModelVariants`(try payload.decode(RuntimeEventSessionModelVariants.self))
        case "session.exited": self = .`sessionExited`(try payload.decode(RuntimeEventSessionExited.self))
        case "turn.started": self = .`turnStarted`(try payload.decode(RuntimeEventTurnStarted.self))
        case "turn.retrying": self = .`turnRetrying`(try payload.decode(RuntimeEventTurnRetrying.self))
        case "turn.completed": self = .`turnCompleted`(try payload.decode(RuntimeEventTurnCompleted.self))
        case "cap.exhausted": self = .`capExhausted`(try payload.decode(RuntimeEventCapExhausted.self))
        case "turn.wait_started": self = .`turnWaitStarted`(try payload.decode(RuntimeEventTurnWaitStarted.self))
        case "turn.wait_ended": self = .`turnWaitEnded`(try payload.decode(RuntimeEventTurnWaitEnded.self))
        case "item.started": self = .`itemStarted`(try payload.decode(RuntimeEventItemStarted.self))
        case "item.updated": self = .`itemUpdated`(try payload.decode(RuntimeEventItemUpdated.self))
        case "item.output": self = .`itemOutput`(try payload.decode(RuntimeEventItemOutput.self))
        case "turn.progress": self = .`turnProgress`(try payload.decode(RuntimeEventTurnProgress.self))
        case "item.completed": self = .`itemCompleted`(try payload.decode(RuntimeEventItemCompleted.self))
        case "content.delta": self = .`contentDelta`(try payload.decode(RuntimeEventContentDelta.self))
        case "request.opened": self = .`requestOpened`(try payload.decode(RuntimeEventRequestOpened.self))
        case "request.resolved": self = .`requestResolved`(try payload.decode(RuntimeEventRequestResolved.self))
        case "thread.token-usage.updated": self = .`threadTokenUsageUpdated`(try payload.decode(RuntimeEventThreadTokenUsageUpdated.self))
        case "runtime.error": self = .`runtimeError`(try payload.decode(RuntimeEventRuntimeError.self))
        case "runtime.notice": self = .`runtimeNotice`(try payload.decode(RuntimeEventRuntimeNotice.self))
        case "context.compacted": self = .`contextCompacted`(try payload.decode(RuntimeEventContextCompacted.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`sessionStarted`(let value): raw = try JSONValue(encoding: value)
        case .`sessionModelVariants`(let value): raw = try JSONValue(encoding: value)
        case .`sessionExited`(let value): raw = try JSONValue(encoding: value)
        case .`turnStarted`(let value): raw = try JSONValue(encoding: value)
        case .`turnRetrying`(let value): raw = try JSONValue(encoding: value)
        case .`turnCompleted`(let value): raw = try JSONValue(encoding: value)
        case .`capExhausted`(let value): raw = try JSONValue(encoding: value)
        case .`turnWaitStarted`(let value): raw = try JSONValue(encoding: value)
        case .`turnWaitEnded`(let value): raw = try JSONValue(encoding: value)
        case .`itemStarted`(let value): raw = try JSONValue(encoding: value)
        case .`itemUpdated`(let value): raw = try JSONValue(encoding: value)
        case .`itemOutput`(let value): raw = try JSONValue(encoding: value)
        case .`turnProgress`(let value): raw = try JSONValue(encoding: value)
        case .`itemCompleted`(let value): raw = try JSONValue(encoding: value)
        case .`contentDelta`(let value): raw = try JSONValue(encoding: value)
        case .`requestOpened`(let value): raw = try JSONValue(encoding: value)
        case .`requestResolved`(let value): raw = try JSONValue(encoding: value)
        case .`threadTokenUsageUpdated`(let value): raw = try JSONValue(encoding: value)
        case .`runtimeError`(let value): raw = try JSONValue(encoding: value)
        case .`runtimeNotice`(let value): raw = try JSONValue(encoding: value)
        case .`contextCompacted`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["type"] = .string(type)
        try raw.encode(to: encoder)
    }
}
