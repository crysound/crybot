import Foundation

public enum RoutineRunOn: WireModel, Hashable, Sendable {
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

public struct Routine: WireModel {
    public var `id`: String
    public var `name`: String
    public var `prompt`: String
    public var `target`: RoutineTarget
    public var `botId`: String
    public var `groupId`: String?
    public var `runOn`: RoutineRunOn
    public var `enabled`: Bool
    public var `schedule`: RoutineSchedule
    public var `durationMinutes`: Double
    public var `timeoutMinutes`: Double?
    public var `overlap`: RoutineOverlap?
    public var `continuity`: Bool?
    public var `modelSelection`: ModelSelection?
    public var `runOnStartup`: Bool?
    public var `checks`: [RoutineCheck]?
    public var `access`: RoutineAccess?
    public var `deliver`: RoutineDelivery?
    public var `checkedAt`: Double?
    public var `checkTrouble`: String?
    public var `checkTroubleCode`: String?
    public var `wakeAt`: Double?
    public var `skippedRuns`: Double?
    public var `lastSkippedAt`: Double?
    public var `failureStreak`: Double?
    public var `weekRuns`: RoutineWeekRuns?
    public var `warning`: String?
    public var `heldFor`: RoutineHoldCause?
    public var `attachments`: [RoutineContextAttachment]?
    public var `sourceThreadId`: String?
    public var `resultsThreadId`: String?
    public var `nextRunAt`: Double?
    public var `createdAt`: Double
    public var `updatedAt`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `name`: String,
        `prompt`: String,
        `target`: RoutineTarget,
        `botId`: String,
        `runOn`: RoutineRunOn,
        `enabled`: Bool,
        `schedule`: RoutineSchedule,
        `durationMinutes`: Double,
        `nextRunAt`: Double?,
        `createdAt`: Double,
        `updatedAt`: Double,
        `groupId`: String? = nil,
        `timeoutMinutes`: Double? = nil,
        `overlap`: RoutineOverlap? = nil,
        `continuity`: Bool? = nil,
        `modelSelection`: ModelSelection? = nil,
        `runOnStartup`: Bool? = nil,
        `checks`: [RoutineCheck]? = nil,
        `access`: RoutineAccess? = nil,
        `deliver`: RoutineDelivery? = nil,
        `checkedAt`: Double? = nil,
        `checkTrouble`: String? = nil,
        `checkTroubleCode`: String? = nil,
        `wakeAt`: Double? = nil,
        `skippedRuns`: Double? = nil,
        `lastSkippedAt`: Double? = nil,
        `failureStreak`: Double? = nil,
        `weekRuns`: RoutineWeekRuns? = nil,
        `warning`: String? = nil,
        `heldFor`: RoutineHoldCause? = nil,
        `attachments`: [RoutineContextAttachment]? = nil,
        `sourceThreadId`: String? = nil,
        `resultsThreadId`: String? = nil
    ) {
        self.`id` = `id`
        self.`name` = `name`
        self.`prompt` = `prompt`
        self.`target` = `target`
        self.`botId` = `botId`
        self.`groupId` = `groupId`
        self.`runOn` = `runOn`
        self.`enabled` = `enabled`
        self.`schedule` = `schedule`
        self.`durationMinutes` = `durationMinutes`
        self.`timeoutMinutes` = `timeoutMinutes`
        self.`overlap` = `overlap`
        self.`continuity` = `continuity`
        self.`modelSelection` = `modelSelection`
        self.`runOnStartup` = `runOnStartup`
        self.`checks` = `checks`
        self.`access` = `access`
        self.`deliver` = `deliver`
        self.`checkedAt` = `checkedAt`
        self.`checkTrouble` = `checkTrouble`
        self.`checkTroubleCode` = `checkTroubleCode`
        self.`wakeAt` = `wakeAt`
        self.`skippedRuns` = `skippedRuns`
        self.`lastSkippedAt` = `lastSkippedAt`
        self.`failureStreak` = `failureStreak`
        self.`weekRuns` = `weekRuns`
        self.`warning` = `warning`
        self.`heldFor` = `heldFor`
        self.`attachments` = `attachments`
        self.`sourceThreadId` = `sourceThreadId`
        self.`resultsThreadId` = `resultsThreadId`
        self.`nextRunAt` = `nextRunAt`
        self.`createdAt` = `createdAt`
        self.`updatedAt` = `updatedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `prompt` = try object.required("prompt")
        `target` = try object.required("target")
        `botId` = try object.required("botId")
        `groupId` = try object.optional("groupId")
        `runOn` = try object.required("runOn")
        `enabled` = try object.required("enabled")
        `schedule` = try object.required("schedule")
        `durationMinutes` = try object.required("durationMinutes")
        `timeoutMinutes` = try object.optional("timeoutMinutes")
        `overlap` = try object.optional("overlap")
        `continuity` = try object.optional("continuity")
        `modelSelection` = try object.optional("modelSelection")
        `runOnStartup` = try object.optional("runOnStartup")
        `checks` = try object.optional("checks")
        `access` = try object.optional("access")
        `deliver` = try object.optional("deliver")
        `checkedAt` = try object.optional("checkedAt")
        `checkTrouble` = try object.optional("checkTrouble")
        `checkTroubleCode` = try object.optional("checkTroubleCode")
        `wakeAt` = try object.optional("wakeAt")
        `skippedRuns` = try object.optional("skippedRuns")
        `lastSkippedAt` = try object.optional("lastSkippedAt")
        `failureStreak` = try object.optional("failureStreak")
        `weekRuns` = try object.optional("weekRuns")
        `warning` = try object.optional("warning")
        `heldFor` = try object.optional("heldFor")
        `attachments` = try object.optional("attachments")
        `sourceThreadId` = try object.optional("sourceThreadId")
        `resultsThreadId` = try object.optional("resultsThreadId")
        `nextRunAt` = try object.nullable("nextRunAt")
        `createdAt` = try object.required("createdAt")
        `updatedAt` = try object.required("updatedAt")
        additionalFields = object.remainder(excluding: ["id", "name", "prompt", "target", "botId", "groupId", "runOn", "enabled", "schedule", "durationMinutes", "timeoutMinutes", "overlap", "continuity", "modelSelection", "runOnStartup", "checks", "access", "deliver", "checkedAt", "checkTrouble", "checkTroubleCode", "wakeAt", "skippedRuns", "lastSkippedAt", "failureStreak", "weekRuns", "warning", "heldFor", "attachments", "sourceThreadId", "resultsThreadId", "nextRunAt", "createdAt", "updatedAt"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "prompt", "target", "botId", "groupId", "runOn", "enabled", "schedule", "durationMinutes", "timeoutMinutes", "overlap", "continuity", "modelSelection", "runOnStartup", "checks", "access", "deliver", "checkedAt", "checkTrouble", "checkTroubleCode", "wakeAt", "skippedRuns", "lastSkippedAt", "failureStreak", "weekRuns", "warning", "heldFor", "attachments", "sourceThreadId", "resultsThreadId", "nextRunAt", "createdAt", "updatedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.put("prompt", `prompt`)
        try object.put("target", `target`)
        try object.put("botId", `botId`)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.put("runOn", `runOn`)
        try object.put("enabled", `enabled`)
        try object.put("schedule", `schedule`)
        try object.put("durationMinutes", `durationMinutes`)
        try object.putOptional("timeoutMinutes", `timeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("overlap", `overlap`, nulls: explicitNulls)
        try object.putOptional("continuity", `continuity`, nulls: explicitNulls)
        try object.putOptional("modelSelection", `modelSelection`, nulls: explicitNulls)
        try object.putOptional("runOnStartup", `runOnStartup`, nulls: explicitNulls)
        try object.putOptional("checks", `checks`, nulls: explicitNulls)
        try object.putOptional("access", `access`, nulls: explicitNulls)
        try object.putOptional("deliver", `deliver`, nulls: explicitNulls)
        try object.putOptional("checkedAt", `checkedAt`, nulls: explicitNulls)
        try object.putOptional("checkTrouble", `checkTrouble`, nulls: explicitNulls)
        try object.putOptional("checkTroubleCode", `checkTroubleCode`, nulls: explicitNulls)
        try object.putOptional("wakeAt", `wakeAt`, nulls: explicitNulls)
        try object.putOptional("skippedRuns", `skippedRuns`, nulls: explicitNulls)
        try object.putOptional("lastSkippedAt", `lastSkippedAt`, nulls: explicitNulls)
        try object.putOptional("failureStreak", `failureStreak`, nulls: explicitNulls)
        try object.putOptional("weekRuns", `weekRuns`, nulls: explicitNulls)
        try object.putOptional("warning", `warning`, nulls: explicitNulls)
        try object.putOptional("heldFor", `heldFor`, nulls: explicitNulls)
        try object.putOptional("attachments", `attachments`, nulls: explicitNulls)
        try object.putOptional("sourceThreadId", `sourceThreadId`, nulls: explicitNulls)
        try object.putOptional("resultsThreadId", `resultsThreadId`, nulls: explicitNulls)
        try object.putNullable("nextRunAt", `nextRunAt`)
        try object.put("createdAt", `createdAt`)
        try object.put("updatedAt", `updatedAt`)
        try object.encode(to: encoder)
    }
}

public enum RoutineTarget: WireModel, Hashable, Sendable {
    case `bot`
    case `roomGoal`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "room-goal": self = .`roomGoal`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`roomGoal`: return "room-goal"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineScheduleCron: WireModel {
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

public struct RoutineScheduleLimitReset: WireModel {
    public var `engine`: String
    public var `repeat`: LimitResetRepeat
    public var `at`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`engine`: String, `repeat`: LimitResetRepeat, `at`: Double?) {
        self.`engine` = `engine`
        self.`repeat` = `repeat`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `engine` = try object.required("engine")
        `repeat` = try object.required("repeat")
        `at` = try object.nullable("at")
        additionalFields = object.remainder(excluding: ["engine", "repeat", "at"])
        explicitNulls = object.nullKeys.intersection(["engine", "repeat", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("engine", `engine`)
        try object.put("repeat", `repeat`)
        try object.putNullable("at", `at`)
        try object.encode(to: encoder)
    }
}

public struct RoutineScheduleOnce: WireModel {
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

public struct RoutineScheduleDaily: WireModel {
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

public struct RoutineScheduleInterval: WireModel {
    public var `everyMinutes`: Double
    public var `anchorAt`: Double
    public var `weekdays`: [Double]?
    public var `window`: RoutineIntervalWindow?
    public var `endsAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `everyMinutes`: Double,
        `anchorAt`: Double,
        `weekdays`: [Double]? = nil,
        `window`: RoutineIntervalWindow? = nil,
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
        `anchorAt` = try object.required("anchorAt")
        `weekdays` = try object.optional("weekdays")
        `window` = try object.optional("window")
        `endsAt` = try object.optional("endsAt")
        additionalFields = object.remainder(excluding: ["everyMinutes", "anchorAt", "weekdays", "window", "endsAt"])
        explicitNulls = object.nullKeys.intersection(["everyMinutes", "anchorAt", "weekdays", "window", "endsAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("everyMinutes", `everyMinutes`)
        try object.put("anchorAt", `anchorAt`)
        try object.putOptional("weekdays", `weekdays`, nulls: explicitNulls)
        try object.putOptional("window", `window`, nulls: explicitNulls)
        try object.putOptional("endsAt", `endsAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoutineIntervalWindow: WireModel {
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

public indirect enum RoutineSchedule: WireModel {
    case `cron`(RoutineScheduleCron)
    case `limitReset`(RoutineScheduleLimitReset)
    case `once`(RoutineScheduleOnce)
    case `daily`(RoutineScheduleDaily)
    case `interval`(RoutineScheduleInterval)
    case unknown(kind: String, raw: JSONValue)

    public var type: String {
        switch self {
        case .`cron`: return "cron"
        case .`limitReset`: return "limit_reset"
        case .`once`: return "once"
        case .`daily`: return "daily"
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
        case "cron": self = .`cron`(try payload.decode(RoutineScheduleCron.self))
        case "limit_reset": self = .`limitReset`(try payload.decode(RoutineScheduleLimitReset.self))
        case "once": self = .`once`(try payload.decode(RoutineScheduleOnce.self))
        case "daily": self = .`daily`(try payload.decode(RoutineScheduleDaily.self))
        case "interval": self = .`interval`(try payload.decode(RoutineScheduleInterval.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`cron`(let value): raw = try JSONValue(encoding: value)
        case .`limitReset`(let value): raw = try JSONValue(encoding: value)
        case .`once`(let value): raw = try JSONValue(encoding: value)
        case .`daily`(let value): raw = try JSONValue(encoding: value)
        case .`interval`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["type"] = .string(type)
        try raw.encode(to: encoder)
    }
}

public enum RoutineOverlap: WireModel, Hashable, Sendable {
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

public enum RoutineCheck: WireModel, Hashable, Sendable {
    case `calendar`
    case `mail`
    case `runs`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "calendar": self = .`calendar`
        case "mail": self = .`mail`
        case "runs": self = .`runs`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`calendar`: return "calendar"
        case .`mail`: return "mail"
        case .`runs`: return "runs"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RoutineAccess: WireModel, Hashable, Sendable {
    case `readAndDraft`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "read-and-draft": self = .`readAndDraft`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`readAndDraft`: return "read-and-draft"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RoutineDelivery: WireModel, Hashable, Sendable {
    case `brief`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "brief": self = .`brief`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`brief`: return "brief"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineWeekRuns: WireModel {
    public var `ok`: Double
    public var `total`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`ok`: Double, `total`: Double) {
        self.`ok` = `ok`
        self.`total` = `total`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `ok` = try object.required("ok")
        `total` = try object.required("total")
        additionalFields = object.remainder(excluding: ["ok", "total"])
        explicitNulls = object.nullKeys.intersection(["ok", "total"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("ok", `ok`)
        try object.put("total", `total`)
        try object.encode(to: encoder)
    }
}

public enum RoutineHoldCause: WireModel, Hashable, Sendable {
    case `planCancelled`
    case `noEngine`
    case `noConnections`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "plan_cancelled": self = .`planCancelled`
        case "no_engine": self = .`noEngine`
        case "no_connections": self = .`noConnections`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`planCancelled`: return "plan_cancelled"
        case .`noEngine`: return "no_engine"
        case .`noConnections`: return "no_connections"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineContextAttachment: WireModel {
    public var `id`: String
    public var `kind`: RoutineContextAttachmentKind
    public var `name`: String
    public var `path`: String
    public var `size`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `kind`: RoutineContextAttachmentKind,
        `name`: String,
        `path`: String,
        `size`: Double
    ) {
        self.`id` = `id`
        self.`kind` = `kind`
        self.`name` = `name`
        self.`path` = `path`
        self.`size` = `size`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `kind` = try object.required("kind")
        `name` = try object.required("name")
        `path` = try object.required("path")
        `size` = try object.required("size")
        additionalFields = object.remainder(excluding: ["id", "kind", "name", "path", "size"])
        explicitNulls = object.nullKeys.intersection(["id", "kind", "name", "path", "size"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("kind", `kind`)
        try object.put("name", `name`)
        try object.put("path", `path`)
        try object.put("size", `size`)
        try object.encode(to: encoder)
    }
}

public enum RoutineContextAttachmentKind: WireModel, Hashable, Sendable {
    case `file`
    case `image`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "file": self = .`file`
        case "image": self = .`image`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`file`: return "file"
        case .`image`: return "image"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineRun: WireModel {
    public var `id`: String
    public var `routineId`: String
    public var `routineName`: String
    public var `prompt`: String?
    public var `durationMinutes`: Double?
    public var `timeoutMinutes`: Double?
    public var `attachments`: [RoutineContextAttachment]?
    public var `target`: RoutineTarget
    public var `goalStatus`: RoutineGoalStatus?
    public var `botId`: String
    public var `groupId`: String?
    public var `runOn`: RoutineRunOn
    public var `scheduledFor`: Double
    public var `status`: RoutineRunStatus
    public var `manual`: Bool
    public var `triggerSource`: RoutineRunTrigger?
    public var `eventSource`: RoutineRunEventSource?
    public var `webhookId`: String?
    public var `deliveryId`: String?
    public var `executionThreadId`: String?
    public var `sourceThreadId`: String?
    public var `resultsThreadId`: String?
    public var `threadId`: String?
    public var `startedAt`: Double?
    public var `finishedAt`: Double?
    public var `output`: String?
    public var `outputCode`: String?
    public var `errorCode`: String?
    public var `errorParams`: ServerTextParams?
    public var `attentionCode`: String?
    public var `attentionParams`: ServerTextParams?
    public var `error`: String?
    public var `partial`: Bool?
    public var `retried`: RoutineRetryCause?
    public var `attention`: String?
    public var `cost`: Double?
    public var `denials`: [String]?
    public var `report`: RoutineRunReport?
    public var `access`: RoutineAccess?
    public var `deliver`: RoutineDelivery?
    public var `checkKey`: String?
    public var `createdAt`: Double
    public var `seenAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `routineId`: String,
        `routineName`: String,
        `target`: RoutineTarget,
        `botId`: String,
        `runOn`: RoutineRunOn,
        `scheduledFor`: Double,
        `status`: RoutineRunStatus,
        `manual`: Bool,
        `createdAt`: Double,
        `prompt`: String? = nil,
        `durationMinutes`: Double? = nil,
        `timeoutMinutes`: Double? = nil,
        `attachments`: [RoutineContextAttachment]? = nil,
        `goalStatus`: RoutineGoalStatus? = nil,
        `groupId`: String? = nil,
        `triggerSource`: RoutineRunTrigger? = nil,
        `eventSource`: RoutineRunEventSource? = nil,
        `webhookId`: String? = nil,
        `deliveryId`: String? = nil,
        `executionThreadId`: String? = nil,
        `sourceThreadId`: String? = nil,
        `resultsThreadId`: String? = nil,
        `threadId`: String? = nil,
        `startedAt`: Double? = nil,
        `finishedAt`: Double? = nil,
        `output`: String? = nil,
        `outputCode`: String? = nil,
        `errorCode`: String? = nil,
        `errorParams`: ServerTextParams? = nil,
        `attentionCode`: String? = nil,
        `attentionParams`: ServerTextParams? = nil,
        `error`: String? = nil,
        `partial`: Bool? = nil,
        `retried`: RoutineRetryCause? = nil,
        `attention`: String? = nil,
        `cost`: Double? = nil,
        `denials`: [String]? = nil,
        `report`: RoutineRunReport? = nil,
        `access`: RoutineAccess? = nil,
        `deliver`: RoutineDelivery? = nil,
        `checkKey`: String? = nil,
        `seenAt`: Double? = nil
    ) {
        self.`id` = `id`
        self.`routineId` = `routineId`
        self.`routineName` = `routineName`
        self.`prompt` = `prompt`
        self.`durationMinutes` = `durationMinutes`
        self.`timeoutMinutes` = `timeoutMinutes`
        self.`attachments` = `attachments`
        self.`target` = `target`
        self.`goalStatus` = `goalStatus`
        self.`botId` = `botId`
        self.`groupId` = `groupId`
        self.`runOn` = `runOn`
        self.`scheduledFor` = `scheduledFor`
        self.`status` = `status`
        self.`manual` = `manual`
        self.`triggerSource` = `triggerSource`
        self.`eventSource` = `eventSource`
        self.`webhookId` = `webhookId`
        self.`deliveryId` = `deliveryId`
        self.`executionThreadId` = `executionThreadId`
        self.`sourceThreadId` = `sourceThreadId`
        self.`resultsThreadId` = `resultsThreadId`
        self.`threadId` = `threadId`
        self.`startedAt` = `startedAt`
        self.`finishedAt` = `finishedAt`
        self.`output` = `output`
        self.`outputCode` = `outputCode`
        self.`errorCode` = `errorCode`
        self.`errorParams` = `errorParams`
        self.`attentionCode` = `attentionCode`
        self.`attentionParams` = `attentionParams`
        self.`error` = `error`
        self.`partial` = `partial`
        self.`retried` = `retried`
        self.`attention` = `attention`
        self.`cost` = `cost`
        self.`denials` = `denials`
        self.`report` = `report`
        self.`access` = `access`
        self.`deliver` = `deliver`
        self.`checkKey` = `checkKey`
        self.`createdAt` = `createdAt`
        self.`seenAt` = `seenAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `routineId` = try object.required("routineId")
        `routineName` = try object.required("routineName")
        `prompt` = try object.optional("prompt")
        `durationMinutes` = try object.optional("durationMinutes")
        `timeoutMinutes` = try object.optional("timeoutMinutes")
        `attachments` = try object.optional("attachments")
        `target` = try object.required("target")
        `goalStatus` = try object.optional("goalStatus")
        `botId` = try object.required("botId")
        `groupId` = try object.optional("groupId")
        `runOn` = try object.required("runOn")
        `scheduledFor` = try object.required("scheduledFor")
        `status` = try object.required("status")
        `manual` = try object.required("manual")
        `triggerSource` = try object.optional("triggerSource")
        `eventSource` = try object.optional("eventSource")
        `webhookId` = try object.optional("webhookId")
        `deliveryId` = try object.optional("deliveryId")
        `executionThreadId` = try object.optional("executionThreadId")
        `sourceThreadId` = try object.optional("sourceThreadId")
        `resultsThreadId` = try object.optional("resultsThreadId")
        `threadId` = try object.optional("threadId")
        `startedAt` = try object.optional("startedAt")
        `finishedAt` = try object.optional("finishedAt")
        `output` = try object.optional("output")
        `outputCode` = try object.optional("outputCode")
        `errorCode` = try object.optional("errorCode")
        `errorParams` = try object.optional("errorParams")
        `attentionCode` = try object.optional("attentionCode")
        `attentionParams` = try object.optional("attentionParams")
        `error` = try object.optional("error")
        `partial` = try object.optional("partial")
        `retried` = try object.optional("retried")
        `attention` = try object.optional("attention")
        `cost` = try object.optional("cost")
        `denials` = try object.optional("denials")
        `report` = try object.optional("report")
        `access` = try object.optional("access")
        `deliver` = try object.optional("deliver")
        `checkKey` = try object.optional("checkKey")
        `createdAt` = try object.required("createdAt")
        `seenAt` = try object.optional("seenAt")
        additionalFields = object.remainder(excluding: ["id", "routineId", "routineName", "prompt", "durationMinutes", "timeoutMinutes", "attachments", "target", "goalStatus", "botId", "groupId", "runOn", "scheduledFor", "status", "manual", "triggerSource", "eventSource", "webhookId", "deliveryId", "executionThreadId", "sourceThreadId", "resultsThreadId", "threadId", "startedAt", "finishedAt", "output", "outputCode", "errorCode", "errorParams", "attentionCode", "attentionParams", "error", "partial", "retried", "attention", "cost", "denials", "report", "access", "deliver", "checkKey", "createdAt", "seenAt"])
        explicitNulls = object.nullKeys.intersection(["id", "routineId", "routineName", "prompt", "durationMinutes", "timeoutMinutes", "attachments", "target", "goalStatus", "botId", "groupId", "runOn", "scheduledFor", "status", "manual", "triggerSource", "eventSource", "webhookId", "deliveryId", "executionThreadId", "sourceThreadId", "resultsThreadId", "threadId", "startedAt", "finishedAt", "output", "outputCode", "errorCode", "errorParams", "attentionCode", "attentionParams", "error", "partial", "retried", "attention", "cost", "denials", "report", "access", "deliver", "checkKey", "createdAt", "seenAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("routineId", `routineId`)
        try object.put("routineName", `routineName`)
        try object.putOptional("prompt", `prompt`, nulls: explicitNulls)
        try object.putOptional("durationMinutes", `durationMinutes`, nulls: explicitNulls)
        try object.putOptional("timeoutMinutes", `timeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("attachments", `attachments`, nulls: explicitNulls)
        try object.put("target", `target`)
        try object.putOptional("goalStatus", `goalStatus`, nulls: explicitNulls)
        try object.put("botId", `botId`)
        try object.putOptional("groupId", `groupId`, nulls: explicitNulls)
        try object.put("runOn", `runOn`)
        try object.put("scheduledFor", `scheduledFor`)
        try object.put("status", `status`)
        try object.put("manual", `manual`)
        try object.putOptional("triggerSource", `triggerSource`, nulls: explicitNulls)
        try object.putOptional("eventSource", `eventSource`, nulls: explicitNulls)
        try object.putOptional("webhookId", `webhookId`, nulls: explicitNulls)
        try object.putOptional("deliveryId", `deliveryId`, nulls: explicitNulls)
        try object.putOptional("executionThreadId", `executionThreadId`, nulls: explicitNulls)
        try object.putOptional("sourceThreadId", `sourceThreadId`, nulls: explicitNulls)
        try object.putOptional("resultsThreadId", `resultsThreadId`, nulls: explicitNulls)
        try object.putOptional("threadId", `threadId`, nulls: explicitNulls)
        try object.putOptional("startedAt", `startedAt`, nulls: explicitNulls)
        try object.putOptional("finishedAt", `finishedAt`, nulls: explicitNulls)
        try object.putOptional("output", `output`, nulls: explicitNulls)
        try object.putOptional("outputCode", `outputCode`, nulls: explicitNulls)
        try object.putOptional("errorCode", `errorCode`, nulls: explicitNulls)
        try object.putOptional("errorParams", `errorParams`, nulls: explicitNulls)
        try object.putOptional("attentionCode", `attentionCode`, nulls: explicitNulls)
        try object.putOptional("attentionParams", `attentionParams`, nulls: explicitNulls)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.putOptional("partial", `partial`, nulls: explicitNulls)
        try object.putOptional("retried", `retried`, nulls: explicitNulls)
        try object.putOptional("attention", `attention`, nulls: explicitNulls)
        try object.putOptional("cost", `cost`, nulls: explicitNulls)
        try object.putOptional("denials", `denials`, nulls: explicitNulls)
        try object.putOptional("report", `report`, nulls: explicitNulls)
        try object.putOptional("access", `access`, nulls: explicitNulls)
        try object.putOptional("deliver", `deliver`, nulls: explicitNulls)
        try object.putOptional("checkKey", `checkKey`, nulls: explicitNulls)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("seenAt", `seenAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RoutineGoalStatus: WireModel, Hashable, Sendable {
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

public enum RoutineRunStatus: WireModel, Hashable, Sendable {
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

public enum RoutineRunTrigger: WireModel, Hashable, Sendable {
    case `schedule`
    case `manual`
    case `webhook`
    case `startup`
    case `api`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "schedule": self = .`schedule`
        case "manual": self = .`manual`
        case "webhook": self = .`webhook`
        case "startup": self = .`startup`
        case "api": self = .`api`
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
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RoutineRunEventSource: WireModel, Hashable, Sendable {
    case `app`
    case `wait`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "app": self = .`app`
        case "wait": self = .`wait`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`app`: return "app"
        case .`wait`: return "wait"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum RoutineRetryCause: WireModel, Hashable, Sendable {
    case `stalled`
    case `restarted`
    case `rateLimited`
    case `provider`
    case `usageLimit`
    case `failed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "stalled": self = .`stalled`
        case "restarted": self = .`restarted`
        case "rate_limited": self = .`rateLimited`
        case "provider": self = .`provider`
        case "usage_limit": self = .`usageLimit`
        case "failed": self = .`failed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`stalled`: return "stalled"
        case .`restarted`: return "restarted"
        case .`rateLimited`: return "rate_limited"
        case .`provider`: return "provider"
        case .`usageLimit`: return "usage_limit"
        case .`failed`: return "failed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RoutineRunReportQuiet: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct RoutineRunReportPending: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct RoutineRunReportPosted: WireModel {
    public var `threadId`: String
    public var `messageId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `messageId`: String) {
        self.`threadId` = `threadId`
        self.`messageId` = `messageId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `messageId` = try object.required("messageId")
        additionalFields = object.remainder(excluding: ["threadId", "messageId"])
        explicitNulls = object.nullKeys.intersection(["threadId", "messageId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("messageId", `messageId`)
        try object.encode(to: encoder)
    }
}

public indirect enum RoutineRunReport: WireModel {
    case `quiet`(RoutineRunReportQuiet)
    case `pending`(RoutineRunReportPending)
    case `posted`(RoutineRunReportPosted)
    case unknown(kind: String, raw: JSONValue)

    public var state: String {
        switch self {
        case .`quiet`: return "quiet"
        case .`pending`: return "pending"
        case .`posted`: return "posted"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["state"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing state"))
        }
        var payload = raw
        payload["state"] = nil
        switch kind {
        case "quiet": self = .`quiet`(try payload.decode(RoutineRunReportQuiet.self))
        case "pending": self = .`pending`(try payload.decode(RoutineRunReportPending.self))
        case "posted": self = .`posted`(try payload.decode(RoutineRunReportPosted.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`quiet`(let value): raw = try JSONValue(encoding: value)
        case .`pending`(let value): raw = try JSONValue(encoding: value)
        case .`posted`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["state"] = .string(state)
        try raw.encode(to: encoder)
    }
}
