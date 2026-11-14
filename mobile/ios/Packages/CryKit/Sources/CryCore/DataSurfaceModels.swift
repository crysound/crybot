import Foundation

public struct DataSheet: WireModel {
    public var `version`: Double
    public var `botId`: String
    public var `cards`: [DataCard]
    public var `sources`: [DataSource]
    public var `updatedAt`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `version`: Double,
        `botId`: String,
        `cards`: [DataCard],
        `sources`: [DataSource],
        `updatedAt`: String
    ) {
        self.`version` = `version`
        self.`botId` = `botId`
        self.`cards` = `cards`
        self.`sources` = `sources`
        self.`updatedAt` = `updatedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `botId` = try object.required("botId")
        `cards` = try object.required("cards")
        `sources` = try object.required("sources")
        `updatedAt` = try object.required("updatedAt")
        additionalFields = object.remainder(excluding: ["version", "botId", "cards", "sources", "updatedAt"])
        explicitNulls = object.nullKeys.intersection(["version", "botId", "cards", "sources", "updatedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("botId", `botId`)
        try object.put("cards", `cards`)
        try object.put("sources", `sources`)
        try object.put("updatedAt", `updatedAt`)
        try object.encode(to: encoder)
    }
}

public struct DataCard: WireModel {
    public var `id`: String
    public var `kind`: DataCardKind
    public var `title`: String
    public var `sql`: String?
    public var `result`: String?
    public var `columns`: [DataColumn]?
    public var `rowCount`: Double?
    public var `truncated`: Bool?
    public var `chart`: CryChartSpec?
    public var `vegaLite`: [String: JSONValue]?
    public var `reduction`: DataReduction?
    public var `text`: String?
    public var `status`: DataCardStatus
    public var `error`: DataError?
    public var `by`: DataCardBy
    public var `pinned`: Bool?
    public var `createdAt`: String
    public var `updatedAt`: String
    public var `elapsedMs`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `kind`: DataCardKind,
        `title`: String,
        `status`: DataCardStatus,
        `by`: DataCardBy,
        `createdAt`: String,
        `updatedAt`: String,
        `sql`: String? = nil,
        `result`: String? = nil,
        `columns`: [DataColumn]? = nil,
        `rowCount`: Double? = nil,
        `truncated`: Bool? = nil,
        `chart`: CryChartSpec? = nil,
        `vegaLite`: [String: JSONValue]? = nil,
        `reduction`: DataReduction? = nil,
        `text`: String? = nil,
        `error`: DataError? = nil,
        `pinned`: Bool? = nil,
        `elapsedMs`: Double? = nil
    ) {
        self.`id` = `id`
        self.`kind` = `kind`
        self.`title` = `title`
        self.`sql` = `sql`
        self.`result` = `result`
        self.`columns` = `columns`
        self.`rowCount` = `rowCount`
        self.`truncated` = `truncated`
        self.`chart` = `chart`
        self.`vegaLite` = `vegaLite`
        self.`reduction` = `reduction`
        self.`text` = `text`
        self.`status` = `status`
        self.`error` = `error`
        self.`by` = `by`
        self.`pinned` = `pinned`
        self.`createdAt` = `createdAt`
        self.`updatedAt` = `updatedAt`
        self.`elapsedMs` = `elapsedMs`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `kind` = try object.required("kind")
        `title` = try object.required("title")
        `sql` = try object.optional("sql")
        `result` = try object.optional("result")
        `columns` = try object.optional("columns")
        `rowCount` = try object.optional("rowCount")
        `truncated` = try object.optional("truncated")
        `chart` = try object.optional("chart")
        `vegaLite` = try object.optional("vegaLite")
        `reduction` = try object.optional("reduction")
        `text` = try object.optional("text")
        `status` = try object.required("status")
        `error` = try object.optional("error")
        `by` = try object.required("by")
        `pinned` = try object.optional("pinned")
        `createdAt` = try object.required("createdAt")
        `updatedAt` = try object.required("updatedAt")
        `elapsedMs` = try object.optional("elapsedMs")
        additionalFields = object.remainder(excluding: ["id", "kind", "title", "sql", "result", "columns", "rowCount", "truncated", "chart", "vegaLite", "reduction", "text", "status", "error", "by", "pinned", "createdAt", "updatedAt", "elapsedMs"])
        explicitNulls = object.nullKeys.intersection(["id", "kind", "title", "sql", "result", "columns", "rowCount", "truncated", "chart", "vegaLite", "reduction", "text", "status", "error", "by", "pinned", "createdAt", "updatedAt", "elapsedMs"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("kind", `kind`)
        try object.put("title", `title`)
        try object.putOptional("sql", `sql`, nulls: explicitNulls)
        try object.putOptional("result", `result`, nulls: explicitNulls)
        try object.putOptional("columns", `columns`, nulls: explicitNulls)
        try object.putOptional("rowCount", `rowCount`, nulls: explicitNulls)
        try object.putOptional("truncated", `truncated`, nulls: explicitNulls)
        try object.putOptional("chart", `chart`, nulls: explicitNulls)
        try object.putOptional("vegaLite", `vegaLite`, nulls: explicitNulls)
        try object.putOptional("reduction", `reduction`, nulls: explicitNulls)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.put("status", `status`)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.put("by", `by`)
        try object.putOptional("pinned", `pinned`, nulls: explicitNulls)
        try object.put("createdAt", `createdAt`)
        try object.put("updatedAt", `updatedAt`)
        try object.putOptional("elapsedMs", `elapsedMs`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum DataCardKind: WireModel, Hashable, Sendable {
    case `table`
    case `chart`
    case `text`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "table": self = .`table`
        case "chart": self = .`chart`
        case "text": self = .`text`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`table`: return "table"
        case .`chart`: return "chart"
        case .`text`: return "text"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataColumn: WireModel {
    public var `name`: String
    public var `type`: String
    public var `nullPct`: Double?
    public var `approxUnique`: Double?
    public var `min`: String?
    public var `max`: String?
    public var `sample`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `type`: String,
        `nullPct`: Double? = nil,
        `approxUnique`: Double? = nil,
        `min`: String? = nil,
        `max`: String? = nil,
        `sample`: [String]? = nil
    ) {
        self.`name` = `name`
        self.`type` = `type`
        self.`nullPct` = `nullPct`
        self.`approxUnique` = `approxUnique`
        self.`min` = `min`
        self.`max` = `max`
        self.`sample` = `sample`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `type` = try object.required("type")
        `nullPct` = try object.optional("nullPct")
        `approxUnique` = try object.optional("approxUnique")
        `min` = try object.optional("min")
        `max` = try object.optional("max")
        `sample` = try object.optional("sample")
        additionalFields = object.remainder(excluding: ["name", "type", "nullPct", "approxUnique", "min", "max", "sample"])
        explicitNulls = object.nullKeys.intersection(["name", "type", "nullPct", "approxUnique", "min", "max", "sample"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("type", `type`)
        try object.putOptional("nullPct", `nullPct`, nulls: explicitNulls)
        try object.putOptional("approxUnique", `approxUnique`, nulls: explicitNulls)
        try object.putOptional("min", `min`, nulls: explicitNulls)
        try object.putOptional("max", `max`, nulls: explicitNulls)
        try object.putOptional("sample", `sample`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct CryChartSpec: WireModel {
    public var `type`: CryChartSpecType
    public var `x`: String
    public var `y`: String?
    public var `color`: String?
    public var `agg`: CryChartSpecAgg?
    public var `sort`: CryChartSpecSort?
    public var `limit`: Double?
    public var `stack`: Bool?
    public var `timeUnit`: CryChartSpecTimeUnit?
    public var `bins`: Double?
    public var `size`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `type`: CryChartSpecType,
        `x`: String,
        `y`: String? = nil,
        `color`: String? = nil,
        `agg`: CryChartSpecAgg? = nil,
        `sort`: CryChartSpecSort? = nil,
        `limit`: Double? = nil,
        `stack`: Bool? = nil,
        `timeUnit`: CryChartSpecTimeUnit? = nil,
        `bins`: Double? = nil,
        `size`: String? = nil
    ) {
        self.`type` = `type`
        self.`x` = `x`
        self.`y` = `y`
        self.`color` = `color`
        self.`agg` = `agg`
        self.`sort` = `sort`
        self.`limit` = `limit`
        self.`stack` = `stack`
        self.`timeUnit` = `timeUnit`
        self.`bins` = `bins`
        self.`size` = `size`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `type` = try object.required("type")
        `x` = try object.required("x")
        `y` = try object.optional("y")
        `color` = try object.optional("color")
        `agg` = try object.optional("agg")
        `sort` = try object.optional("sort")
        `limit` = try object.optional("limit")
        `stack` = try object.optional("stack")
        `timeUnit` = try object.optional("timeUnit")
        `bins` = try object.optional("bins")
        `size` = try object.optional("size")
        additionalFields = object.remainder(excluding: ["type", "x", "y", "color", "agg", "sort", "limit", "stack", "timeUnit", "bins", "size"])
        explicitNulls = object.nullKeys.intersection(["type", "x", "y", "color", "agg", "sort", "limit", "stack", "timeUnit", "bins", "size"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("type", `type`)
        try object.put("x", `x`)
        try object.putOptional("y", `y`, nulls: explicitNulls)
        try object.putOptional("color", `color`, nulls: explicitNulls)
        try object.putOptional("agg", `agg`, nulls: explicitNulls)
        try object.putOptional("sort", `sort`, nulls: explicitNulls)
        try object.putOptional("limit", `limit`, nulls: explicitNulls)
        try object.putOptional("stack", `stack`, nulls: explicitNulls)
        try object.putOptional("timeUnit", `timeUnit`, nulls: explicitNulls)
        try object.putOptional("bins", `bins`, nulls: explicitNulls)
        try object.putOptional("size", `size`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum CryChartSpecType: WireModel, Hashable, Sendable {
    case `bar`
    case `line`
    case `area`
    case `scatter`
    case `histogram`
    case `pie`
    case `heatmap`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bar": self = .`bar`
        case "line": self = .`line`
        case "area": self = .`area`
        case "scatter": self = .`scatter`
        case "histogram": self = .`histogram`
        case "pie": self = .`pie`
        case "heatmap": self = .`heatmap`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bar`: return "bar"
        case .`line`: return "line"
        case .`area`: return "area"
        case .`scatter`: return "scatter"
        case .`histogram`: return "histogram"
        case .`pie`: return "pie"
        case .`heatmap`: return "heatmap"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum CryChartSpecAgg: WireModel, Hashable, Sendable {
    case `count`
    case `sum`
    case `avg`
    case `min`
    case `max`
    case `median`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "count": self = .`count`
        case "sum": self = .`sum`
        case "avg": self = .`avg`
        case "min": self = .`min`
        case "max": self = .`max`
        case "median": self = .`median`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`count`: return "count"
        case .`sum`: return "sum"
        case .`avg`: return "avg"
        case .`min`: return "min"
        case .`max`: return "max"
        case .`median`: return "median"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum CryChartSpecSort: WireModel, Hashable, Sendable {
    case `x`
    case `descendingX`
    case `y`
    case `descendingY`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "x": self = .`x`
        case "-x": self = .`descendingX`
        case "y": self = .`y`
        case "-y": self = .`descendingY`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`x`: return "x"
        case .`descendingX`: return "-x"
        case .`y`: return "y"
        case .`descendingY`: return "-y"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum CryChartSpecTimeUnit: WireModel, Hashable, Sendable {
    case `hour`
    case `day`
    case `week`
    case `month`
    case `quarter`
    case `year`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "hour": self = .`hour`
        case "day": self = .`day`
        case "week": self = .`week`
        case "month": self = .`month`
        case "quarter": self = .`quarter`
        case "year": self = .`year`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`hour`: return "hour"
        case .`day`: return "day"
        case .`week`: return "week"
        case .`month`: return "month"
        case .`quarter`: return "quarter"
        case .`year`: return "year"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataReduction: WireModel {
    public var `method`: DataReductionMethod
    public var `inputRows`: Double
    public var `outputRows`: Double
    public var `note`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`method`: DataReductionMethod, `inputRows`: Double, `outputRows`: Double, `note`: String? = nil) {
        self.`method` = `method`
        self.`inputRows` = `inputRows`
        self.`outputRows` = `outputRows`
        self.`note` = `note`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `method` = try object.required("method")
        `inputRows` = try object.required("inputRows")
        `outputRows` = try object.required("outputRows")
        `note` = try object.optional("note")
        additionalFields = object.remainder(excluding: ["method", "inputRows", "outputRows", "note"])
        explicitNulls = object.nullKeys.intersection(["method", "inputRows", "outputRows", "note"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("method", `method`)
        try object.put("inputRows", `inputRows`)
        try object.put("outputRows", `outputRows`)
        try object.putOptional("note", `note`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum DataReductionMethod: WireModel, Hashable, Sendable {
    case `group`
    case `bins`
    case `topN`
    case `timeBucket`
    case `m4`
    case `sample`
    case `none`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "group": self = .`group`
        case "bins": self = .`bins`
        case "topN": self = .`topN`
        case "timeBucket": self = .`timeBucket`
        case "m4": self = .`m4`
        case "sample": self = .`sample`
        case "none": self = .`none`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`group`: return "group"
        case .`bins`: return "bins"
        case .`topN`: return "topN"
        case .`timeBucket`: return "timeBucket"
        case .`m4`: return "m4"
        case .`sample`: return "sample"
        case .`none`: return "none"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum DataCardStatus: WireModel, Hashable, Sendable {
    case `running`
    case `ready`
    case `failed`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "running": self = .`running`
        case "ready": self = .`ready`
        case "failed": self = .`failed`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`running`: return "running"
        case .`ready`: return "ready"
        case .`failed`: return "failed"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataError: WireModel {
    public var `code`: DataErrorCode
    public var `message`: String
    public var `sql`: String?
    public var `line`: Double?
    public var `hint`: String?
    public var `retryable`: Bool?
    public var `candidates`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `code`: DataErrorCode,
        `message`: String,
        `sql`: String? = nil,
        `line`: Double? = nil,
        `hint`: String? = nil,
        `retryable`: Bool? = nil,
        `candidates`: [String]? = nil
    ) {
        self.`code` = `code`
        self.`message` = `message`
        self.`sql` = `sql`
        self.`line` = `line`
        self.`hint` = `hint`
        self.`retryable` = `retryable`
        self.`candidates` = `candidates`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `code` = try object.required("code")
        `message` = try object.required("message")
        `sql` = try object.optional("sql")
        `line` = try object.optional("line")
        `hint` = try object.optional("hint")
        `retryable` = try object.optional("retryable")
        `candidates` = try object.optional("candidates")
        additionalFields = object.remainder(excluding: ["code", "message", "sql", "line", "hint", "retryable", "candidates"])
        explicitNulls = object.nullKeys.intersection(["code", "message", "sql", "line", "hint", "retryable", "candidates"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("code", `code`)
        try object.put("message", `message`)
        try object.putOptional("sql", `sql`, nulls: explicitNulls)
        try object.putOptional("line", `line`, nulls: explicitNulls)
        try object.putOptional("hint", `hint`, nulls: explicitNulls)
        try object.putOptional("retryable", `retryable`, nulls: explicitNulls)
        try object.putOptional("candidates", `candidates`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum DataErrorCode: WireModel, Hashable, Sendable {
    case `invalidInput`
    case `sourceNotFound`
    case `sourceUnsupported`
    case `sqlError`
    case `writeRefused`
    case `tableNotFound`
    case `specInvalid`
    case `cardNotFound`
    case `outputTooLarge`
    case `timeout`
    case `cancelled`
    case `engineUnavailable`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "invalid_input": self = .`invalidInput`
        case "source_not_found": self = .`sourceNotFound`
        case "source_unsupported": self = .`sourceUnsupported`
        case "sql_error": self = .`sqlError`
        case "write_refused": self = .`writeRefused`
        case "table_not_found": self = .`tableNotFound`
        case "spec_invalid": self = .`specInvalid`
        case "card_not_found": self = .`cardNotFound`
        case "output_too_large": self = .`outputTooLarge`
        case "timeout": self = .`timeout`
        case "cancelled": self = .`cancelled`
        case "engine_unavailable": self = .`engineUnavailable`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`invalidInput`: return "invalid_input"
        case .`sourceNotFound`: return "source_not_found"
        case .`sourceUnsupported`: return "source_unsupported"
        case .`sqlError`: return "sql_error"
        case .`writeRefused`: return "write_refused"
        case .`tableNotFound`: return "table_not_found"
        case .`specInvalid`: return "spec_invalid"
        case .`cardNotFound`: return "card_not_found"
        case .`outputTooLarge`: return "output_too_large"
        case .`timeout`: return "timeout"
        case .`cancelled`: return "cancelled"
        case .`engineUnavailable`: return "engine_unavailable"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum DataCardBy: WireModel, Hashable, Sendable {
    case `bot`
    case `person`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "person": self = .`person`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`person`: return "person"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataSource: WireModel {
    public var `name`: String
    public var `sqlName`: String?
    public var `kind`: DataSourceKind
    public var `source`: String
    public var `options`: [String: DataSourceOptionsValue]?
    public var `rowCount`: Double
    public var `columns`: [DataColumn]
    public var `loadedAt`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `kind`: DataSourceKind,
        `source`: String,
        `rowCount`: Double,
        `columns`: [DataColumn],
        `loadedAt`: String,
        `sqlName`: String? = nil,
        `options`: [String: DataSourceOptionsValue]? = nil
    ) {
        self.`name` = `name`
        self.`sqlName` = `sqlName`
        self.`kind` = `kind`
        self.`source` = `source`
        self.`options` = `options`
        self.`rowCount` = `rowCount`
        self.`columns` = `columns`
        self.`loadedAt` = `loadedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `sqlName` = try object.optional("sqlName")
        `kind` = try object.required("kind")
        `source` = try object.required("source")
        `options` = try object.optional("options")
        `rowCount` = try object.required("rowCount")
        `columns` = try object.required("columns")
        `loadedAt` = try object.required("loadedAt")
        additionalFields = object.remainder(excluding: ["name", "sqlName", "kind", "source", "options", "rowCount", "columns", "loadedAt"])
        explicitNulls = object.nullKeys.intersection(["name", "sqlName", "kind", "source", "options", "rowCount", "columns", "loadedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("sqlName", `sqlName`, nulls: explicitNulls)
        try object.put("kind", `kind`)
        try object.put("source", `source`)
        try object.putOptional("options", `options`, nulls: explicitNulls)
        try object.put("rowCount", `rowCount`)
        try object.put("columns", `columns`)
        try object.put("loadedAt", `loadedAt`)
        try object.encode(to: encoder)
    }
}

public enum DataSourceKind: WireModel, Hashable, Sendable {
    case `csv`
    case `parquet`
    case `json`
    case `xlsx`
    case `folder`
    case `url`
    case `postgres`
    case `mysql`
    case `sqlite`
    case `gsheet`
    case `connector`
    case `sql`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "csv": self = .`csv`
        case "parquet": self = .`parquet`
        case "json": self = .`json`
        case "xlsx": self = .`xlsx`
        case "folder": self = .`folder`
        case "url": self = .`url`
        case "postgres": self = .`postgres`
        case "mysql": self = .`mysql`
        case "sqlite": self = .`sqlite`
        case "gsheet": self = .`gsheet`
        case "connector": self = .`connector`
        case "sql": self = .`sql`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`csv`: return "csv"
        case .`parquet`: return "parquet"
        case .`json`: return "json"
        case .`xlsx`: return "xlsx"
        case .`folder`: return "folder"
        case .`url`: return "url"
        case .`postgres`: return "postgres"
        case .`mysql`: return "mysql"
        case .`sqlite`: return "sqlite"
        case .`gsheet`: return "gsheet"
        case .`connector`: return "connector"
        case .`sql`: return "sql"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public indirect enum DataSourceOptionsValue: WireModel {
    case string(String)
    case number(Double)
    case bool(Bool)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(Bool.self) { self = .bool(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .number(let value): try value.encode(to: encoder)
        case .bool(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public enum DataToolName: WireModel, Hashable, Sendable {
    case `dataLoad`
    case `dataDescribe`
    case `dataSql`
    case `dataShow`
    case `dataExport`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "data_load": self = .`dataLoad`
        case "data_describe": self = .`dataDescribe`
        case "data_sql": self = .`dataSql`
        case "data_show": self = .`dataShow`
        case "data_export": self = .`dataExport`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`dataLoad`: return "data_load"
        case .`dataDescribe`: return "data_describe"
        case .`dataSql`: return "data_sql"
        case .`dataShow`: return "data_show"
        case .`dataExport`: return "data_export"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataTable: WireModel {
    public var `name`: String
    public var `sqlName`: String?
    public var `rowCount`: Double
    public var `columns`: [DataColumn]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `rowCount`: Double, `columns`: [DataColumn], `sqlName`: String? = nil) {
        self.`name` = `name`
        self.`sqlName` = `sqlName`
        self.`rowCount` = `rowCount`
        self.`columns` = `columns`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `sqlName` = try object.optional("sqlName")
        `rowCount` = try object.required("rowCount")
        `columns` = try object.required("columns")
        additionalFields = object.remainder(excluding: ["name", "sqlName", "rowCount", "columns"])
        explicitNulls = object.nullKeys.intersection(["name", "sqlName", "rowCount", "columns"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("sqlName", `sqlName`, nulls: explicitNulls)
        try object.put("rowCount", `rowCount`)
        try object.put("columns", `columns`)
        try object.encode(to: encoder)
    }
}

public struct DataBroadcast: WireModel {
    public var `kind`: String
    public var `botId`: String
    public var `sheet`: DataSheet
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`kind`: String, `botId`: String, `sheet`: DataSheet) {
        self.`kind` = `kind`
        self.`botId` = `botId`
        self.`sheet` = `sheet`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `botId` = try object.required("botId")
        `sheet` = try object.required("sheet")
        additionalFields = object.remainder(excluding: ["kind", "botId", "sheet"])
        explicitNulls = object.nullKeys.intersection(["kind", "botId", "sheet"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.put("botId", `botId`)
        try object.put("sheet", `sheet`)
        try object.encode(to: encoder)
    }
}

public struct DataPageRequest: WireModel {
    public var `table`: String?
    public var `cardId`: String?
    public var `offset`: Double
    public var `limit`: Double
    public var `sort`: DataPageRequestSort?
    public var `filter`: String?
    public var `filterColumn`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `offset`: Double,
        `limit`: Double,
        `table`: String? = nil,
        `cardId`: String? = nil,
        `sort`: DataPageRequestSort? = nil,
        `filter`: String? = nil,
        `filterColumn`: String? = nil
    ) {
        self.`table` = `table`
        self.`cardId` = `cardId`
        self.`offset` = `offset`
        self.`limit` = `limit`
        self.`sort` = `sort`
        self.`filter` = `filter`
        self.`filterColumn` = `filterColumn`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `table` = try object.optional("table")
        `cardId` = try object.optional("cardId")
        `offset` = try object.required("offset")
        `limit` = try object.required("limit")
        `sort` = try object.optional("sort")
        `filter` = try object.optional("filter")
        `filterColumn` = try object.optional("filterColumn")
        additionalFields = object.remainder(excluding: ["table", "cardId", "offset", "limit", "sort", "filter", "filterColumn"])
        explicitNulls = object.nullKeys.intersection(["table", "cardId", "offset", "limit", "sort", "filter", "filterColumn"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("table", `table`, nulls: explicitNulls)
        try object.putOptional("cardId", `cardId`, nulls: explicitNulls)
        try object.put("offset", `offset`)
        try object.put("limit", `limit`)
        try object.putOptional("sort", `sort`, nulls: explicitNulls)
        try object.putOptional("filter", `filter`, nulls: explicitNulls)
        try object.putOptional("filterColumn", `filterColumn`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct DataPageRequestSort: WireModel {
    public var `column`: String
    public var `direction`: DataPageRequestSortDirection
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`column`: String, `direction`: DataPageRequestSortDirection) {
        self.`column` = `column`
        self.`direction` = `direction`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `column` = try object.required("column")
        `direction` = try object.required("direction")
        additionalFields = object.remainder(excluding: ["column", "direction"])
        explicitNulls = object.nullKeys.intersection(["column", "direction"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("column", `column`)
        try object.put("direction", `direction`)
        try object.encode(to: encoder)
    }
}

public enum DataPageRequestSortDirection: WireModel, Hashable, Sendable {
    case `asc`
    case `desc`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "asc": self = .`asc`
        case "desc": self = .`desc`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`asc`: return "asc"
        case .`desc`: return "desc"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataPage: WireModel {
    public var `columns`: [DataColumn]
    public var `rows`: [[DataPageRowsElementElement?]]
    public var `rowCount`: Double
    public var `offset`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`columns`: [DataColumn], `rows`: [[DataPageRowsElementElement?]], `rowCount`: Double, `offset`: Double) {
        self.`columns` = `columns`
        self.`rows` = `rows`
        self.`rowCount` = `rowCount`
        self.`offset` = `offset`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `columns` = try object.required("columns")
        `rows` = try object.required("rows")
        `rowCount` = try object.required("rowCount")
        `offset` = try object.required("offset")
        additionalFields = object.remainder(excluding: ["columns", "rows", "rowCount", "offset"])
        explicitNulls = object.nullKeys.intersection(["columns", "rows", "rowCount", "offset"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("columns", `columns`)
        try object.put("rows", `rows`)
        try object.put("rowCount", `rowCount`)
        try object.put("offset", `offset`)
        try object.encode(to: encoder)
    }
}

public indirect enum DataPageRowsElementElement: WireModel {
    case string(String)
    case number(Double)
    case bool(Bool)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(Bool.self) { self = .bool(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .number(let value): try value.encode(to: encoder)
        case .bool(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct DataRunRequest: WireModel {
    public var `sql`: String
    public var `cardId`: String?
    public var `title`: String?
    public var `chart`: CryChartSpec?
    public var `vegaLite`: [String: JSONValue]?
    public var `live`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `sql`: String,
        `cardId`: String? = nil,
        `title`: String? = nil,
        `chart`: CryChartSpec? = nil,
        `vegaLite`: [String: JSONValue]? = nil,
        `live`: Bool? = nil
    ) {
        self.`sql` = `sql`
        self.`cardId` = `cardId`
        self.`title` = `title`
        self.`chart` = `chart`
        self.`vegaLite` = `vegaLite`
        self.`live` = `live`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `sql` = try object.required("sql")
        `cardId` = try object.optional("cardId")
        `title` = try object.optional("title")
        `chart` = try object.optional("chart")
        `vegaLite` = try object.optional("vegaLite")
        `live` = try object.optional("live")
        additionalFields = object.remainder(excluding: ["sql", "cardId", "title", "chart", "vegaLite", "live"])
        explicitNulls = object.nullKeys.intersection(["sql", "cardId", "title", "chart", "vegaLite", "live"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("sql", `sql`)
        try object.putOptional("cardId", `cardId`, nulls: explicitNulls)
        try object.putOptional("title", `title`, nulls: explicitNulls)
        try object.putOptional("chart", `chart`, nulls: explicitNulls)
        try object.putOptional("vegaLite", `vegaLite`, nulls: explicitNulls)
        try object.putOptional("live", `live`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct DataColumnStats: WireModel {
    public var `table`: String
    public var `rowCount`: Double
    public var `columns`: [DataColumn]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`table`: String, `rowCount`: Double, `columns`: [DataColumn]) {
        self.`table` = `table`
        self.`rowCount` = `rowCount`
        self.`columns` = `columns`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `table` = try object.required("table")
        `rowCount` = try object.required("rowCount")
        `columns` = try object.required("columns")
        additionalFields = object.remainder(excluding: ["table", "rowCount", "columns"])
        explicitNulls = object.nullKeys.intersection(["table", "rowCount", "columns"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("table", `table`)
        try object.put("rowCount", `rowCount`)
        try object.put("columns", `columns`)
        try object.encode(to: encoder)
    }
}

public struct DataHistogram: WireModel {
    public var `table`: String
    public var `column`: String
    public var `bins`: [DataHistogramBinsElement]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`table`: String, `column`: String, `bins`: [DataHistogramBinsElement]) {
        self.`table` = `table`
        self.`column` = `column`
        self.`bins` = `bins`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `table` = try object.required("table")
        `column` = try object.required("column")
        `bins` = try object.required("bins")
        additionalFields = object.remainder(excluding: ["table", "column", "bins"])
        explicitNulls = object.nullKeys.intersection(["table", "column", "bins"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("table", `table`)
        try object.put("column", `column`)
        try object.put("bins", `bins`)
        try object.encode(to: encoder)
    }
}

public struct DataHistogramBinsElement: WireModel {
    public var `label`: String
    public var `count`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`label`: String, `count`: Double) {
        self.`label` = `label`
        self.`count` = `count`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `label` = try object.required("label")
        `count` = try object.required("count")
        additionalFields = object.remainder(excluding: ["label", "count"])
        explicitNulls = object.nullKeys.intersection(["label", "count"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("label", `label`)
        try object.put("count", `count`)
        try object.encode(to: encoder)
    }
}

public enum DataExportFormat: WireModel, Hashable, Sendable {
    case `csv`
    case `parquet`
    case `xlsx`
    case `png`
    case `svg`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "csv": self = .`csv`
        case "parquet": self = .`parquet`
        case "xlsx": self = .`xlsx`
        case "png": self = .`png`
        case "svg": self = .`svg`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`csv`: return "csv"
        case .`parquet`: return "parquet"
        case .`xlsx`: return "xlsx"
        case .`png`: return "png"
        case .`svg`: return "svg"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataExportRequest: WireModel {
    public var `cardId`: String?
    public var `table`: String?
    public var `format`: DataExportFormat
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`format`: DataExportFormat, `cardId`: String? = nil, `table`: String? = nil) {
        self.`cardId` = `cardId`
        self.`table` = `table`
        self.`format` = `format`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `cardId` = try object.optional("cardId")
        `table` = try object.optional("table")
        `format` = try object.required("format")
        additionalFields = object.remainder(excluding: ["cardId", "table", "format"])
        explicitNulls = object.nullKeys.intersection(["cardId", "table", "format"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("cardId", `cardId`, nulls: explicitNulls)
        try object.putOptional("table", `table`, nulls: explicitNulls)
        try object.put("format", `format`)
        try object.encode(to: encoder)
    }
}
