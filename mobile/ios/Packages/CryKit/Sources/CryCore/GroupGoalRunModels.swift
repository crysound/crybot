import Foundation

public struct GroupGoalRunCardData: WireModel {
    public var `runId`: String
    public var `goal`: String
    public var `status`: GroupGoalRunStatus
    public var `coordinatorBotId`: String
    public var `coordinatorName`: String
    public var `turnCount`: Double
    public var `maxTurns`: Double
    public var `detail`: String?
    public var `detailCode`: String?
    public var `detailParams`: ServerTextParams?
    public var `startedAt`: Double
    public var `finishedAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `runId`: String,
        `goal`: String,
        `status`: GroupGoalRunStatus,
        `coordinatorBotId`: String,
        `coordinatorName`: String,
        `turnCount`: Double,
        `maxTurns`: Double,
        `startedAt`: Double,
        `detail`: String? = nil,
        `detailCode`: String? = nil,
        `detailParams`: ServerTextParams? = nil,
        `finishedAt`: Double? = nil
    ) {
        self.`runId` = `runId`
        self.`goal` = `goal`
        self.`status` = `status`
        self.`coordinatorBotId` = `coordinatorBotId`
        self.`coordinatorName` = `coordinatorName`
        self.`turnCount` = `turnCount`
        self.`maxTurns` = `maxTurns`
        self.`detail` = `detail`
        self.`detailCode` = `detailCode`
        self.`detailParams` = `detailParams`
        self.`startedAt` = `startedAt`
        self.`finishedAt` = `finishedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `runId` = try object.required("runId")
        `goal` = try object.required("goal")
        `status` = try object.required("status")
        `coordinatorBotId` = try object.required("coordinatorBotId")
        `coordinatorName` = try object.required("coordinatorName")
        `turnCount` = try object.required("turnCount")
        `maxTurns` = try object.required("maxTurns")
        `detail` = try object.optional("detail")
        `detailCode` = try object.optional("detailCode")
        `detailParams` = try object.optional("detailParams")
        `startedAt` = try object.required("startedAt")
        `finishedAt` = try object.optional("finishedAt")
        additionalFields = object.remainder(excluding: ["runId", "goal", "status", "coordinatorBotId", "coordinatorName", "turnCount", "maxTurns", "detail", "detailCode", "detailParams", "startedAt", "finishedAt"])
        explicitNulls = object.nullKeys.intersection(["runId", "goal", "status", "coordinatorBotId", "coordinatorName", "turnCount", "maxTurns", "detail", "detailCode", "detailParams", "startedAt", "finishedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("runId", `runId`)
        try object.put("goal", `goal`)
        try object.put("status", `status`)
        try object.put("coordinatorBotId", `coordinatorBotId`)
        try object.put("coordinatorName", `coordinatorName`)
        try object.put("turnCount", `turnCount`)
        try object.put("maxTurns", `maxTurns`)
        try object.putOptional("detail", `detail`, nulls: explicitNulls)
        try object.putOptional("detailCode", `detailCode`, nulls: explicitNulls)
        try object.putOptional("detailParams", `detailParams`, nulls: explicitNulls)
        try object.put("startedAt", `startedAt`)
        try object.putOptional("finishedAt", `finishedAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum GroupGoalRunStatus: WireModel, Hashable, Sendable {
    case `working`
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
        case "working": self = .`working`
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
        case .`working`: return "working"
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
