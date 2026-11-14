import Foundation

public struct RoutineRequestCardData: WireModel {
    public var `version`: Double
    public var `requestId`: String
    public var `botId`: String
    public var `threadId`: String
    public var `createdAt`: Double
    public var `operation`: RoutineRequestOperation
    public var `appliedAt`: Double?
    public var `resultId`: String?
    public var `undo`: RoutineRequestUndo?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `requestId`: String,
        `botId`: String,
        `threadId`: String,
        `createdAt`: Double,
        `operation`: RoutineRequestOperation,
        `appliedAt`: Double? = nil,
        `resultId`: String? = nil,
        `undo`: RoutineRequestUndo? = nil
    ) {
        self.`version` = `version`
        self.`requestId` = `requestId`
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`createdAt` = `createdAt`
        self.`operation` = `operation`
        self.`appliedAt` = `appliedAt`
        self.`resultId` = `resultId`
        self.`undo` = `undo`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `requestId` = try object.required("requestId")
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `createdAt` = try object.required("createdAt")
        `operation` = try object.required("operation")
        `appliedAt` = try object.optional("appliedAt")
        `resultId` = try object.optional("resultId")
        `undo` = try object.optional("undo")
        additionalFields = object.remainder(excluding: ["version", "requestId", "botId", "threadId", "createdAt", "operation", "appliedAt", "resultId", "undo"])
        explicitNulls = object.nullKeys.intersection(["version", "requestId", "botId", "threadId", "createdAt", "operation", "appliedAt", "resultId", "undo"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("requestId", `requestId`)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("createdAt", `createdAt`)
        try object.put("operation", `operation`)
        try object.putOptional("appliedAt", `appliedAt`, nulls: explicitNulls)
        try object.putOptional("resultId", `resultId`, nulls: explicitNulls)
        try object.putOptional("undo", `undo`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestOperationCreate: WireModel {
    public var `routine`: RoutineRequestDefinition
    public var `forBot`: RoutineRequestTargetBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routine`: RoutineRequestDefinition, `forBot`: RoutineRequestTargetBot? = nil) {
        self.`routine` = `routine`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routine` = try object.required("routine")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["routine", "forBot"])
        explicitNulls = object.nullKeys.intersection(["routine", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routine", `routine`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestDefinition: WireModel {
    public var `name`: String
    public var `instructions`: String
    public var `schedule`: RoutineRequestSchedule
    public var `runOn`: RoutineRequestRunOn
    public var `durationMinutes`: Double
    public var `timeoutMinutes`: Double?
    public var `continuity`: Bool?
    public var `overlap`: RoutineRequestDefinitionOverlap?
    public var `runOnStartup`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `instructions`: String,
        `schedule`: RoutineRequestSchedule,
        `runOn`: RoutineRequestRunOn,
        `durationMinutes`: Double,
        `timeoutMinutes`: Double? = nil,
        `continuity`: Bool? = nil,
        `overlap`: RoutineRequestDefinitionOverlap? = nil,
        `runOnStartup`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`schedule` = `schedule`
        self.`runOn` = `runOn`
        self.`durationMinutes` = `durationMinutes`
        self.`timeoutMinutes` = `timeoutMinutes`
        self.`continuity` = `continuity`
        self.`overlap` = `overlap`
        self.`runOnStartup` = `runOnStartup`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `instructions` = try object.required("instructions")
        `schedule` = try object.required("schedule")
        `runOn` = try object.required("runOn")
        `durationMinutes` = try object.required("durationMinutes")
        `timeoutMinutes` = try object.optional("timeoutMinutes")
        `continuity` = try object.optional("continuity")
        `overlap` = try object.optional("overlap")
        `runOnStartup` = try object.optional("runOnStartup")
        additionalFields = object.remainder(excluding: ["name", "instructions", "schedule", "runOn", "durationMinutes", "timeoutMinutes", "continuity", "overlap", "runOnStartup"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "schedule", "runOn", "durationMinutes", "timeoutMinutes", "continuity", "overlap", "runOnStartup"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("instructions", `instructions`)
        try object.put("schedule", `schedule`)
        try object.put("runOn", `runOn`)
        try object.put("durationMinutes", `durationMinutes`)
        try object.putOptional("timeoutMinutes", `timeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("continuity", `continuity`, nulls: explicitNulls)
        try object.putOptional("overlap", `overlap`, nulls: explicitNulls)
        try object.putOptional("runOnStartup", `runOnStartup`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleOnce: WireModel {
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`at`: Double) {
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["at"])
        explicitNulls = object.nullKeys.intersection(["at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleLimitReset: WireModel {
    public var `engine`: String
    public var `repeat`: LimitResetRepeat
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`engine`: String, `repeat`: LimitResetRepeat) {
        self.`engine` = `engine`
        self.`repeat` = `repeat`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `engine` = try object.required("engine")
        `repeat` = try object.required("repeat")
        additionalFields = object.remainder(excluding: ["engine", "repeat"])
        explicitNulls = object.nullKeys.intersection(["engine", "repeat"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("engine", `engine`)
        try object.put("repeat", `repeat`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleDaily: WireModel {
    public var `time`: String
    public var `weekdays`: [Double]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`time`: String, `weekdays`: [Double]) {
        self.`time` = `time`
        self.`weekdays` = `weekdays`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `time` = try object.required("time")
        `weekdays` = try object.required("weekdays")
        additionalFields = object.remainder(excluding: ["time", "weekdays"])
        explicitNulls = object.nullKeys.intersection(["time", "weekdays"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("time", `time`)
        try object.put("weekdays", `weekdays`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleCron: WireModel {
    public var `expression`: String
    public var `timeZone`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`expression`: String, `timeZone`: String) {
        self.`expression` = `expression`
        self.`timeZone` = `timeZone`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `expression` = try object.required("expression")
        `timeZone` = try object.required("timeZone")
        additionalFields = object.remainder(excluding: ["expression", "timeZone"])
        explicitNulls = object.nullKeys.intersection(["expression", "timeZone"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("expression", `expression`)
        try object.put("timeZone", `timeZone`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleInterval: WireModel {
    public var `everyMinutes`: Double
    public var `anchorAt`: Double?
    public var `weekdays`: [Double]?
    public var `window`: RoutineRequestIntervalWindow?
    public var `endsAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `everyMinutes`: Double,
        `anchorAt`: Double? = nil,
        `weekdays`: [Double]? = nil,
        `window`: RoutineRequestIntervalWindow? = nil,
        `endsAt`: Double? = nil
    ) {
        self.`everyMinutes` = `everyMinutes`
        self.`anchorAt` = `anchorAt`
        self.`weekdays` = `weekdays`
        self.`window` = `window`
        self.`endsAt` = `endsAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `everyMinutes` = try object.required("everyMinutes")
        `anchorAt` = try object.optional("anchorAt")
        `weekdays` = try object.optional("weekdays")
        `window` = try object.optional("window")
        `endsAt` = try object.optional("endsAt")
        additionalFields = object.remainder(excluding: ["everyMinutes", "anchorAt", "weekdays", "window", "endsAt"])
        explicitNulls = object.nullKeys.intersection(["everyMinutes", "anchorAt", "weekdays", "window", "endsAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("everyMinutes", `everyMinutes`)
        try object.putOptional("anchorAt", `anchorAt`, nulls: explicitNulls)
        try object.putOptional("weekdays", `weekdays`, nulls: explicitNulls)
        try object.putOptional("window", `window`, nulls: explicitNulls)
        try object.putOptional("endsAt", `endsAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestIntervalWindow: WireModel {
    public var `start`: String
    public var `end`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`start`: String, `end`: String) {
        self.`start` = `start`
        self.`end` = `end`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `start` = try object.required("start")
        `end` = try object.required("end")
        additionalFields = object.remainder(excluding: ["start", "end"])
        explicitNulls = object.nullKeys.intersection(["start", "end"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("start", `start`)
        try object.put("end", `end`)
        try object.encode(to: encoder)
    }
}

public indirect enum RoutineRequestSchedule: WireModel {
    case `once`(RoutineRequestScheduleOnce)
    case `limitReset`(RoutineRequestScheduleLimitReset)
    case `daily`(RoutineRequestScheduleDaily)
    case `cron`(RoutineRequestScheduleCron)
    case `interval`(RoutineRequestScheduleInterval)
    case unknown(kind: String, raw: JSONValue)

    public var type: String {
        switch self {
        case .`once`: return "once"
        case .`limitReset`: return "limit_reset"
        case .`daily`: return "daily"
        case .`cron`: return "cron"
        case .`interval`: return "interval"
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
        case "once": self = .`once`(try payload.decode(RoutineRequestScheduleOnce.self))
        case "limit_reset": self = .`limitReset`(try payload.decode(RoutineRequestScheduleLimitReset.self))
        case "daily": self = .`daily`(try payload.decode(RoutineRequestScheduleDaily.self))
        case "cron": self = .`cron`(try payload.decode(RoutineRequestScheduleCron.self))
        case "interval": self = .`interval`(try payload.decode(RoutineRequestScheduleInterval.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`once`(let value): raw = try JSONValue(encoding: value)
        case .`limitReset`(let value): raw = try JSONValue(encoding: value)
        case .`daily`(let value): raw = try JSONValue(encoding: value)
        case .`cron`(let value): raw = try JSONValue(encoding: value)
        case .`interval`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["type"] = .string(type)
        try raw.encode(to: encoder)
    }
}

public enum RoutineRequestRunOn: WireModel, Hashable, Sendable {
    case `bot`
    case `cloud`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "cloud": self = .`cloud`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`cloud`: return "cloud"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RoutineRequestDefinitionOverlap: WireModel, Hashable, Sendable {
    case `skip`
    case `queue`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "skip": self = .`skip`
        case "queue": self = .`queue`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`skip`: return "skip"
        case .`queue`: return "queue"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineRequestTargetBot: WireModel {
    public var `botId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestOperationUpdate: WireModel {
    public var `routineId`: String
    public var `expectedUpdatedAt`: Double
    public var `changes`: RoutineRequestChanges
    public var `forBot`: RoutineRequestTargetBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routineId`: String, `expectedUpdatedAt`: Double, `changes`: RoutineRequestChanges, `forBot`: RoutineRequestTargetBot? = nil) {
        self.`routineId` = `routineId`
        self.`expectedUpdatedAt` = `expectedUpdatedAt`
        self.`changes` = `changes`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        `expectedUpdatedAt` = try object.required("expectedUpdatedAt")
        `changes` = try object.required("changes")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["routineId", "expectedUpdatedAt", "changes", "forBot"])
        explicitNulls = object.nullKeys.intersection(["routineId", "expectedUpdatedAt", "changes", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.put("expectedUpdatedAt", `expectedUpdatedAt`)
        try object.put("changes", `changes`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestChanges: WireModel {
    public var `name`: String?
    public var `instructions`: String?
    public var `runOn`: RoutineRequestRunOn?
    public var `durationMinutes`: Double?
    public var `continuity`: Bool?
    public var `overlap`: RoutineRequestChangesOverlap?
    public var `runOnStartup`: Bool?
    public var `schedule`: RoutineRequestScheduleChanges?
    public var `timeoutMinutes`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String? = nil,
        `instructions`: String? = nil,
        `runOn`: RoutineRequestRunOn? = nil,
        `durationMinutes`: Double? = nil,
        `continuity`: Bool? = nil,
        `overlap`: RoutineRequestChangesOverlap? = nil,
        `runOnStartup`: Bool? = nil,
        `schedule`: RoutineRequestScheduleChanges? = nil,
        `timeoutMinutes`: Double? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`runOn` = `runOn`
        self.`durationMinutes` = `durationMinutes`
        self.`continuity` = `continuity`
        self.`overlap` = `overlap`
        self.`runOnStartup` = `runOnStartup`
        self.`schedule` = `schedule`
        self.`timeoutMinutes` = `timeoutMinutes`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.optional("name")
        `instructions` = try object.optional("instructions")
        `runOn` = try object.optional("runOn")
        `durationMinutes` = try object.optional("durationMinutes")
        `continuity` = try object.optional("continuity")
        `overlap` = try object.optional("overlap")
        `runOnStartup` = try object.optional("runOnStartup")
        `schedule` = try object.optional("schedule")
        `timeoutMinutes` = try object.optional("timeoutMinutes")
        additionalFields = object.remainder(excluding: ["name", "instructions", "runOn", "durationMinutes", "continuity", "overlap", "runOnStartup", "schedule", "timeoutMinutes"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "runOn", "durationMinutes", "continuity", "overlap", "runOnStartup", "schedule", "timeoutMinutes"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("instructions", `instructions`, nulls: explicitNulls)
        try object.putOptional("runOn", `runOn`, nulls: explicitNulls)
        try object.putOptional("durationMinutes", `durationMinutes`, nulls: explicitNulls)
        try object.putOptional("continuity", `continuity`, nulls: explicitNulls)
        try object.putOptional("overlap", `overlap`, nulls: explicitNulls)
        try object.putOptional("runOnStartup", `runOnStartup`, nulls: explicitNulls)
        try object.putOptional("schedule", `schedule`, nulls: explicitNulls)
        try object.putOptional("timeoutMinutes", `timeoutMinutes`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RoutineRequestChangesOverlap: WireModel, Hashable, Sendable {
    case `skip`
    case `queue`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "skip": self = .`skip`
        case "queue": self = .`queue`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`skip`: return "skip"
        case .`queue`: return "queue"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineRequestScheduleChangesOnce: WireModel {
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`at`: Double) {
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["at"])
        explicitNulls = object.nullKeys.intersection(["at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleChangesLimitReset: WireModel {
    public var `engine`: String
    public var `repeat`: LimitResetRepeat
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`engine`: String, `repeat`: LimitResetRepeat) {
        self.`engine` = `engine`
        self.`repeat` = `repeat`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `engine` = try object.required("engine")
        `repeat` = try object.required("repeat")
        additionalFields = object.remainder(excluding: ["engine", "repeat"])
        explicitNulls = object.nullKeys.intersection(["engine", "repeat"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("engine", `engine`)
        try object.put("repeat", `repeat`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleChangesDaily: WireModel {
    public var `time`: String
    public var `weekdays`: [Double]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`time`: String, `weekdays`: [Double]) {
        self.`time` = `time`
        self.`weekdays` = `weekdays`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `time` = try object.required("time")
        `weekdays` = try object.required("weekdays")
        additionalFields = object.remainder(excluding: ["time", "weekdays"])
        explicitNulls = object.nullKeys.intersection(["time", "weekdays"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("time", `time`)
        try object.put("weekdays", `weekdays`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleChangesCron: WireModel {
    public var `expression`: String
    public var `timeZone`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`expression`: String, `timeZone`: String) {
        self.`expression` = `expression`
        self.`timeZone` = `timeZone`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `expression` = try object.required("expression")
        `timeZone` = try object.required("timeZone")
        additionalFields = object.remainder(excluding: ["expression", "timeZone"])
        explicitNulls = object.nullKeys.intersection(["expression", "timeZone"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("expression", `expression`)
        try object.put("timeZone", `timeZone`)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestScheduleChangesInterval: WireModel {
    public var `everyMinutes`: Double
    public var `anchorAt`: Double?
    public var `weekdays`: [Double]?
    public var `window`: RoutineRequestIntervalWindow?
    public var `endsAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `everyMinutes`: Double,
        `anchorAt`: Double? = nil,
        `weekdays`: [Double]? = nil,
        `window`: RoutineRequestIntervalWindow? = nil,
        `endsAt`: Double? = nil
    ) {
        self.`everyMinutes` = `everyMinutes`
        self.`anchorAt` = `anchorAt`
        self.`weekdays` = `weekdays`
        self.`window` = `window`
        self.`endsAt` = `endsAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `everyMinutes` = try object.required("everyMinutes")
        `anchorAt` = try object.optional("anchorAt")
        `weekdays` = try object.optional("weekdays")
        `window` = try object.optional("window")
        `endsAt` = try object.optional("endsAt")
        additionalFields = object.remainder(excluding: ["everyMinutes", "anchorAt", "weekdays", "window", "endsAt"])
        explicitNulls = object.nullKeys.intersection(["everyMinutes", "anchorAt", "weekdays", "window", "endsAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("everyMinutes", `everyMinutes`)
        try object.putOptional("anchorAt", `anchorAt`, nulls: explicitNulls)
        try object.putOptional("weekdays", `weekdays`, nulls: explicitNulls)
        try object.putOptional("window", `window`, nulls: explicitNulls)
        try object.putOptional("endsAt", `endsAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum RoutineRequestScheduleChanges: WireModel {
    case `once`(RoutineRequestScheduleChangesOnce)
    case `limitReset`(RoutineRequestScheduleChangesLimitReset)
    case `daily`(RoutineRequestScheduleChangesDaily)
    case `cron`(RoutineRequestScheduleChangesCron)
    case `interval`(RoutineRequestScheduleChangesInterval)
    case unknown(kind: String, raw: JSONValue)

    public var type: String {
        switch self {
        case .`once`: return "once"
        case .`limitReset`: return "limit_reset"
        case .`daily`: return "daily"
        case .`cron`: return "cron"
        case .`interval`: return "interval"
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
        case "once": self = .`once`(try payload.decode(RoutineRequestScheduleChangesOnce.self))
        case "limit_reset": self = .`limitReset`(try payload.decode(RoutineRequestScheduleChangesLimitReset.self))
        case "daily": self = .`daily`(try payload.decode(RoutineRequestScheduleChangesDaily.self))
        case "cron": self = .`cron`(try payload.decode(RoutineRequestScheduleChangesCron.self))
        case "interval": self = .`interval`(try payload.decode(RoutineRequestScheduleChangesInterval.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`once`(let value): raw = try JSONValue(encoding: value)
        case .`limitReset`(let value): raw = try JSONValue(encoding: value)
        case .`daily`(let value): raw = try JSONValue(encoding: value)
        case .`cron`(let value): raw = try JSONValue(encoding: value)
        case .`interval`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["type"] = .string(type)
        try raw.encode(to: encoder)
    }
}

public struct RoutineRequestOperationPause: WireModel {
    public var `routineId`: String
    public var `expectedUpdatedAt`: Double
    public var `forBot`: RoutineRequestTargetBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routineId`: String, `expectedUpdatedAt`: Double, `forBot`: RoutineRequestTargetBot? = nil) {
        self.`routineId` = `routineId`
        self.`expectedUpdatedAt` = `expectedUpdatedAt`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        `expectedUpdatedAt` = try object.required("expectedUpdatedAt")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["routineId", "expectedUpdatedAt", "forBot"])
        explicitNulls = object.nullKeys.intersection(["routineId", "expectedUpdatedAt", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.put("expectedUpdatedAt", `expectedUpdatedAt`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestOperationResume: WireModel {
    public var `routineId`: String
    public var `expectedUpdatedAt`: Double
    public var `forBot`: RoutineRequestTargetBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routineId`: String, `expectedUpdatedAt`: Double, `forBot`: RoutineRequestTargetBot? = nil) {
        self.`routineId` = `routineId`
        self.`expectedUpdatedAt` = `expectedUpdatedAt`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        `expectedUpdatedAt` = try object.required("expectedUpdatedAt")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["routineId", "expectedUpdatedAt", "forBot"])
        explicitNulls = object.nullKeys.intersection(["routineId", "expectedUpdatedAt", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.put("expectedUpdatedAt", `expectedUpdatedAt`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestOperationRunNow: WireModel {
    public var `routineId`: String
    public var `expectedUpdatedAt`: Double
    public var `forBot`: RoutineRequestTargetBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routineId`: String, `expectedUpdatedAt`: Double, `forBot`: RoutineRequestTargetBot? = nil) {
        self.`routineId` = `routineId`
        self.`expectedUpdatedAt` = `expectedUpdatedAt`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        `expectedUpdatedAt` = try object.required("expectedUpdatedAt")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["routineId", "expectedUpdatedAt", "forBot"])
        explicitNulls = object.nullKeys.intersection(["routineId", "expectedUpdatedAt", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.put("expectedUpdatedAt", `expectedUpdatedAt`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestOperationDelete: WireModel {
    public var `routineId`: String
    public var `expectedUpdatedAt`: Double
    public var `forBot`: RoutineRequestTargetBot?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routineId`: String, `expectedUpdatedAt`: Double, `forBot`: RoutineRequestTargetBot? = nil) {
        self.`routineId` = `routineId`
        self.`expectedUpdatedAt` = `expectedUpdatedAt`
        self.`forBot` = `forBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        `expectedUpdatedAt` = try object.required("expectedUpdatedAt")
        `forBot` = try object.optional("forBot")
        additionalFields = object.remainder(excluding: ["routineId", "expectedUpdatedAt", "forBot"])
        explicitNulls = object.nullKeys.intersection(["routineId", "expectedUpdatedAt", "forBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.put("expectedUpdatedAt", `expectedUpdatedAt`)
        try object.putOptional("forBot", `forBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum RoutineRequestOperation: WireModel {
    case `create`(RoutineRequestOperationCreate)
    case `update`(RoutineRequestOperationUpdate)
    case `pause`(RoutineRequestOperationPause)
    case `resume`(RoutineRequestOperationResume)
    case `runNow`(RoutineRequestOperationRunNow)
    case `delete`(RoutineRequestOperationDelete)
    case unknown(kind: String, raw: JSONValue)

    public var action: String {
        switch self {
        case .`create`: return "create"
        case .`update`: return "update"
        case .`pause`: return "pause"
        case .`resume`: return "resume"
        case .`runNow`: return "run_now"
        case .`delete`: return "delete"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["action"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing action"))
        }
        var payload = raw
        payload["action"] = nil
        switch kind {
        case "create": self = .`create`(try payload.decode(RoutineRequestOperationCreate.self))
        case "update": self = .`update`(try payload.decode(RoutineRequestOperationUpdate.self))
        case "pause": self = .`pause`(try payload.decode(RoutineRequestOperationPause.self))
        case "resume": self = .`resume`(try payload.decode(RoutineRequestOperationResume.self))
        case "run_now": self = .`runNow`(try payload.decode(RoutineRequestOperationRunNow.self))
        case "delete": self = .`delete`(try payload.decode(RoutineRequestOperationDelete.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`create`(let value): raw = try JSONValue(encoding: value)
        case .`update`(let value): raw = try JSONValue(encoding: value)
        case .`pause`(let value): raw = try JSONValue(encoding: value)
        case .`resume`(let value): raw = try JSONValue(encoding: value)
        case .`runNow`(let value): raw = try JSONValue(encoding: value)
        case .`delete`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["action"] = .string(action)
        try raw.encode(to: encoder)
    }
}

public struct RoutineRequestUndo: WireModel {
    public var `name`: String
    public var `schedule`: RoutineRequestSchedule?
    public var `appliedUpdatedAt`: Double?
    public var `before`: RoutineRequestSnapshot?
    public var `ownersBefore`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `schedule`: RoutineRequestSchedule? = nil,
        `appliedUpdatedAt`: Double? = nil,
        `before`: RoutineRequestSnapshot? = nil,
        `ownersBefore`: Bool? = nil
    ) {
        self.`name` = `name`
        self.`schedule` = `schedule`
        self.`appliedUpdatedAt` = `appliedUpdatedAt`
        self.`before` = `before`
        self.`ownersBefore` = `ownersBefore`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `schedule` = try object.optional("schedule")
        `appliedUpdatedAt` = try object.optional("appliedUpdatedAt")
        `before` = try object.optional("before")
        `ownersBefore` = try object.optional("ownersBefore")
        additionalFields = object.remainder(excluding: ["name", "schedule", "appliedUpdatedAt", "before", "ownersBefore"])
        explicitNulls = object.nullKeys.intersection(["name", "schedule", "appliedUpdatedAt", "before", "ownersBefore"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("schedule", `schedule`, nulls: explicitNulls)
        try object.putOptional("appliedUpdatedAt", `appliedUpdatedAt`, nulls: explicitNulls)
        try object.putOptional("before", `before`, nulls: explicitNulls)
        try object.putOptional("ownersBefore", `ownersBefore`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineRequestSnapshot: WireModel {
    public var `name`: String
    public var `instructions`: String
    public var `schedule`: RoutineRequestSchedule
    public var `runOn`: RoutineRequestRunOn
    public var `durationMinutes`: Double
    public var `timeoutMinutes`: Double?
    public var `continuity`: Bool?
    public var `overlap`: RoutineRequestSnapshotOverlap?
    public var `runOnStartup`: Bool?
    public var `enabled`: Bool
    public var `target`: String?
    public var `groupId`: String?
    public var `resultsThreadId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `instructions`: String,
        `schedule`: RoutineRequestSchedule,
        `runOn`: RoutineRequestRunOn,
        `durationMinutes`: Double,
        `enabled`: Bool,
        `timeoutMinutes`: Double? = nil,
        `continuity`: Bool? = nil,
        `overlap`: RoutineRequestSnapshotOverlap? = nil,
        `runOnStartup`: Bool? = nil,
        `target`: String? = nil,
        `groupId`: String? = nil,
        `resultsThreadId`: String? = nil
    ) {
        self.`name` = `name`
        self.`instructions` = `instructions`
        self.`schedule` = `schedule`
        self.`runOn` = `runOn`
        self.`durationMinutes` = `durationMinutes`
        self.`timeoutMinutes` = `timeoutMinutes`
        self.`continuity` = `continuity`
        self.`overlap` = `overlap`
        self.`runOnStartup` = `runOnStartup`
        self.`enabled` = `enabled`
        self.`target` = `target`
        self.`groupId` = `groupId`
        self.`resultsThreadId` = `resultsThreadId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `instructions` = try object.required("instructions")
        `schedule` = try object.required("schedule")
        `runOn` = try object.required("runOn")
        `durationMinutes` = try object.required("durationMinutes")
        `timeoutMinutes` = try object.optional("timeoutMinutes")
        `continuity` = try object.optional("continuity")
        `overlap` = try object.optional("overlap")
        `runOnStartup` = try object.optional("runOnStartup")
        `enabled` = try object.required("enabled")
        `target` = try object.optional("target")
        `groupId` = try object.optional("groupId")
        `resultsThreadId` = try object.optional("resultsThreadId")
        additionalFields = object.remainder(excluding: ["name", "instructions", "schedule", "runOn", "durationMinutes", "timeoutMinutes", "continuity", "overlap", "runOnStartup", "enabled", "target", "groupId", "resultsThreadId"])
        explicitNulls = object.nullKeys.intersection(["name", "instructions", "schedule", "runOn", "durationMinutes", "timeoutMinutes", "continuity", "overlap", "runOnStartup", "enabled", "target", "groupId", "resultsThreadId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("instructions", `instructions`)
        try object.put("schedule", `schedule`)
        try object.put("runOn", `runOn`)
        try object.put("durationMinutes", `durationMinutes`)
        try object.putOptional("timeoutMinutes", `timeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("continuity", `continuity`, nulls: explicitNulls)
        try object.putOptional("overlap", `overlap`, nulls: explicitNulls)
        try object.putOptional("runOnStartup", `runOnStartup`, nulls: explicitNulls)
        try object.put("enabled", `enabled`)
        try object.putOptional("target", `target`, nulls: explicitNulls)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.putOptional("resultsThreadId", `resultsThreadId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RoutineRequestSnapshotOverlap: WireModel, Hashable, Sendable {
    case `skip`
    case `queue`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "skip": self = .`skip`
        case "queue": self = .`queue`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`skip`: return "skip"
        case .`queue`: return "queue"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
