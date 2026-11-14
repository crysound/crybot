import Foundation

public struct RoutineRunCardData: WireModel {
    public var `runId`: String
    public var `routineId`: String
    public var `routineName`: String
    public var `scheduledFor`: Double?
    public var `status`: RoutineRunCardDataStatus
    public var `deferredAt`: Double?
    public var `goalStatus`: RoutineRunCardDataGoalStatus?
    public var `executionThreadId`: String?
    public var `summary`: String?
    public var `error`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `runId`: String,
        `routineId`: String,
        `routineName`: String,
        `status`: RoutineRunCardDataStatus,
        `scheduledFor`: Double? = nil,
        `deferredAt`: Double? = nil,
        `goalStatus`: RoutineRunCardDataGoalStatus? = nil,
        `executionThreadId`: String? = nil,
        `summary`: String? = nil,
        `error`: String? = nil
    ) {
        self.`runId` = `runId`
        self.`routineId` = `routineId`
        self.`routineName` = `routineName`
        self.`scheduledFor` = `scheduledFor`
        self.`status` = `status`
        self.`deferredAt` = `deferredAt`
        self.`goalStatus` = `goalStatus`
        self.`executionThreadId` = `executionThreadId`
        self.`summary` = `summary`
        self.`error` = `error`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `runId` = try object.required("runId")
        `routineId` = try object.required("routineId")
        `routineName` = try object.required("routineName")
        `scheduledFor` = try object.optional("scheduledFor")
        `status` = try object.required("status")
        `deferredAt` = try object.optional("deferredAt")
        `goalStatus` = try object.optional("goalStatus")
        `executionThreadId` = try object.optional("executionThreadId")
        `summary` = try object.optional("summary")
        `error` = try object.optional("error")
        additionalFields = object.remainder(excluding: ["runId", "routineId", "routineName", "scheduledFor", "status", "deferredAt", "goalStatus", "executionThreadId", "summary", "error"])
        explicitNulls = object.nullKeys.intersection(["runId", "routineId", "routineName", "scheduledFor", "status", "deferredAt", "goalStatus", "executionThreadId", "summary", "error"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("runId", `runId`)
        try object.put("routineId", `routineId`)
        try object.put("routineName", `routineName`)
        try object.putOptional("scheduledFor", `scheduledFor`, nulls: explicitNulls)
        try object.put("status", `status`)
        try object.putOptional("deferredAt", `deferredAt`, nulls: explicitNulls)
        try object.putOptional("goalStatus", `goalStatus`, nulls: explicitNulls)
        try object.putOptional("executionThreadId", `executionThreadId`, nulls: explicitNulls)
        try object.putOptional("summary", `summary`, nulls: explicitNulls)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RoutineRunCardDataStatus: WireModel, Hashable, Sendable {
    case `queued`
    case `running`
    case `waiting`
    case `completed`
    case `failed`
    case `cancelled`
    case `missed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "queued": self = .`queued`
        case "running": self = .`running`
        case "waiting": self = .`waiting`
        case "completed": self = .`completed`
        case "failed": self = .`failed`
        case "cancelled": self = .`cancelled`
        case "missed": self = .`missed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`queued`: return "queued"
        case .`running`: return "running"
        case .`waiting`: return "waiting"
        case .`completed`: return "completed"
        case .`failed`: return "failed"
        case .`cancelled`: return "cancelled"
        case .`missed`: return "missed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RoutineRunCardDataGoalStatus: WireModel, Hashable, Sendable {
    case `completed`
    case `needsInput`
    case `blocked`
    case `limitReached`
    case `paused`
    case `stopped`
    case `failed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "completed": self = .`completed`
        case "needs-input": self = .`needsInput`
        case "blocked": self = .`blocked`
        case "limit-reached": self = .`limitReached`
        case "paused": self = .`paused`
        case "stopped": self = .`stopped`
        case "failed": self = .`failed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`completed`: return "completed"
        case .`needsInput`: return "needs-input"
        case .`blocked`: return "blocked"
        case .`limitReached`: return "limit-reached"
        case .`paused`: return "paused"
        case .`stopped`: return "stopped"
        case .`failed`: return "failed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AutomationLine: WireModel {
    public var `routineId`: String
    public var `runId`: String
    public var `name`: String
    public var `trigger`: AutomationLineTrigger
    public var `executionThreadId`: String
    public var `scheduledFor`: Double
    public var `needsYou`: Bool?
    public var `failed`: Bool?
    public var `partial`: Bool?
    public var `recovered`: Bool?
    public var `copyOf`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `routineId`: String,
        `runId`: String,
        `name`: String,
        `trigger`: AutomationLineTrigger,
        `executionThreadId`: String,
        `scheduledFor`: Double,
        `needsYou`: Bool? = nil,
        `failed`: Bool? = nil,
        `partial`: Bool? = nil,
        `recovered`: Bool? = nil,
        `copyOf`: String? = nil
    ) {
        self.`routineId` = `routineId`
        self.`runId` = `runId`
        self.`name` = `name`
        self.`trigger` = `trigger`
        self.`executionThreadId` = `executionThreadId`
        self.`scheduledFor` = `scheduledFor`
        self.`needsYou` = `needsYou`
        self.`failed` = `failed`
        self.`partial` = `partial`
        self.`recovered` = `recovered`
        self.`copyOf` = `copyOf`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        `runId` = try object.required("runId")
        `name` = try object.required("name")
        `trigger` = try object.required("trigger")
        `executionThreadId` = try object.required("executionThreadId")
        `scheduledFor` = try object.required("scheduledFor")
        `needsYou` = try object.optional("needsYou")
        `failed` = try object.optional("failed")
        `partial` = try object.optional("partial")
        `recovered` = try object.optional("recovered")
        `copyOf` = try object.optional("copyOf")
        additionalFields = object.remainder(excluding: ["routineId", "runId", "name", "trigger", "executionThreadId", "scheduledFor", "needsYou", "failed", "partial", "recovered", "copyOf"])
        explicitNulls = object.nullKeys.intersection(["routineId", "runId", "name", "trigger", "executionThreadId", "scheduledFor", "needsYou", "failed", "partial", "recovered", "copyOf"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.put("runId", `runId`)
        try object.put("name", `name`)
        try object.put("trigger", `trigger`)
        try object.put("executionThreadId", `executionThreadId`)
        try object.put("scheduledFor", `scheduledFor`)
        try object.putOptional("needsYou", `needsYou`, nulls: explicitNulls)
        try object.putOptional("failed", `failed`, nulls: explicitNulls)
        try object.putOptional("partial", `partial`, nulls: explicitNulls)
        try object.putOptional("recovered", `recovered`, nulls: explicitNulls)
        try object.putOptional("copyOf", `copyOf`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum AutomationLineTrigger: WireModel, Hashable, Sendable {
    case `schedule`
    case `manual`
    case `webhook`
    case `startup`
    case `api`
    case `app`
    case `wait`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "schedule": self = .`schedule`
        case "manual": self = .`manual`
        case "webhook": self = .`webhook`
        case "startup": self = .`startup`
        case "api": self = .`api`
        case "app": self = .`app`
        case "wait": self = .`wait`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`schedule`: return "schedule"
        case .`manual`: return "manual"
        case .`webhook`: return "webhook"
        case .`startup`: return "startup"
        case .`api`: return "api"
        case .`app`: return "app"
        case .`wait`: return "wait"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
