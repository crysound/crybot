import Foundation

public struct BurstCardData: WireModel {
    public var `version`: Double
    public var `burstId`: String
    public var `botId`: String
    public var `task`: String
    public var `phase`: BurstPhase
    public var `total`: Double
    public var `requested`: Double
    public var `parallel`: Double
    public var `taskLimit`: Double?
    public var `smallPlan`: Bool?
    public var `modelName`: String
    public var `estimateMinutes`: Double
    public var `counts`: BurstCounts
    public var `sample`: [String]
    public var `failed`: [BurstFailure]?
    public var `failedMore`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `burstId`: String,
        `botId`: String,
        `task`: String,
        `phase`: BurstPhase,
        `total`: Double,
        `requested`: Double,
        `parallel`: Double,
        `modelName`: String,
        `estimateMinutes`: Double,
        `counts`: BurstCounts,
        `sample`: [String],
        `taskLimit`: Double? = nil,
        `smallPlan`: Bool? = nil,
        `failed`: [BurstFailure]? = nil,
        `failedMore`: Double? = nil
    ) {
        self.`version` = `version`
        self.`burstId` = `burstId`
        self.`botId` = `botId`
        self.`task` = `task`
        self.`phase` = `phase`
        self.`total` = `total`
        self.`requested` = `requested`
        self.`parallel` = `parallel`
        self.`taskLimit` = `taskLimit`
        self.`smallPlan` = `smallPlan`
        self.`modelName` = `modelName`
        self.`estimateMinutes` = `estimateMinutes`
        self.`counts` = `counts`
        self.`sample` = `sample`
        self.`failed` = `failed`
        self.`failedMore` = `failedMore`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `burstId` = try object.required("burstId")
        `botId` = try object.required("botId")
        `task` = try object.required("task")
        `phase` = try object.required("phase")
        `total` = try object.required("total")
        `requested` = try object.required("requested")
        `parallel` = try object.required("parallel")
        `taskLimit` = try object.optional("taskLimit")
        `smallPlan` = try object.optional("smallPlan")
        `modelName` = try object.required("modelName")
        `estimateMinutes` = try object.required("estimateMinutes")
        `counts` = try object.required("counts")
        `sample` = try object.required("sample")
        `failed` = try object.optional("failed")
        `failedMore` = try object.optional("failedMore")
        additionalFields = object.remainder(excluding: ["version", "burstId", "botId", "task", "phase", "total", "requested", "parallel", "taskLimit", "smallPlan", "modelName", "estimateMinutes", "counts", "sample", "failed", "failedMore"])
        explicitNulls = object.nullKeys.intersection(["version", "burstId", "botId", "task", "phase", "total", "requested", "parallel", "taskLimit", "smallPlan", "modelName", "estimateMinutes", "counts", "sample", "failed", "failedMore"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("burstId", `burstId`)
        try object.put("botId", `botId`)
        try object.put("task", `task`)
        try object.put("phase", `phase`)
        try object.put("total", `total`)
        try object.put("requested", `requested`)
        try object.put("parallel", `parallel`)
        try object.putOptional("taskLimit", `taskLimit`, nulls: explicitNulls)
        try object.putOptional("smallPlan", `smallPlan`, nulls: explicitNulls)
        try object.put("modelName", `modelName`)
        try object.put("estimateMinutes", `estimateMinutes`)
        try object.put("counts", `counts`)
        try object.put("sample", `sample`)
        try object.putOptional("failed", `failed`, nulls: explicitNulls)
        try object.putOptional("failedMore", `failedMore`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum BurstPhase: WireModel, Hashable, Sendable {
    case `preview`
    case `running`
    case `merging`
    case `done`
    case `cancelled`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "preview": self = .`preview`
        case "running": self = .`running`
        case "merging": self = .`merging`
        case "done": self = .`done`
        case "cancelled": self = .`cancelled`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`preview`: return "preview"
        case .`running`: return "running"
        case .`merging`: return "merging"
        case .`done`: return "done"
        case .`cancelled`: return "cancelled"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct BurstCounts: WireModel {
    public var `queued`: Double
    public var `running`: Double
    public var `done`: Double
    public var `failed`: Double
    public var `cancelled`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `queued`: Double,
        `running`: Double,
        `done`: Double,
        `failed`: Double,
        `cancelled`: Double
    ) {
        self.`queued` = `queued`
        self.`running` = `running`
        self.`done` = `done`
        self.`failed` = `failed`
        self.`cancelled` = `cancelled`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `queued` = try object.required("queued")
        `running` = try object.required("running")
        `done` = try object.required("done")
        `failed` = try object.required("failed")
        `cancelled` = try object.required("cancelled")
        additionalFields = object.remainder(excluding: ["queued", "running", "done", "failed", "cancelled"])
        explicitNulls = object.nullKeys.intersection(["queued", "running", "done", "failed", "cancelled"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("queued", `queued`)
        try object.put("running", `running`)
        try object.put("done", `done`)
        try object.put("failed", `failed`)
        try object.put("cancelled", `cancelled`)
        try object.encode(to: encoder)
    }
}

public struct BurstFailure: WireModel {
    public var `title`: String
    public var `reason`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`title`: String, `reason`: String) {
        self.`title` = `title`
        self.`reason` = `reason`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `title` = try object.required("title")
        `reason` = try object.required("reason")
        additionalFields = object.remainder(excluding: ["title", "reason"])
        explicitNulls = object.nullKeys.intersection(["title", "reason"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("title", `title`)
        try object.put("reason", `reason`)
        try object.encode(to: encoder)
    }
}
