import Foundation

public struct QuestionRequestCardData: WireModel {
    public var `version`: Double
    public var `questions`: [AskQuestion]
    public var `origin`: QuestionRequestCardDataOrigin?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`version`: Double, `questions`: [AskQuestion], `origin`: QuestionRequestCardDataOrigin? = nil) {
        self.`version` = `version`
        self.`questions` = `questions`
        self.`origin` = `origin`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `questions` = try object.required("questions")
        `origin` = try object.optional("origin")
        additionalFields = object.remainder(excluding: ["version", "questions", "origin"])
        explicitNulls = object.nullKeys.intersection(["version", "questions", "origin"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("questions", `questions`)
        try object.putOptional("origin", `origin`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AskQuestion: WireModel {
    public var `question`: String
    public var `header`: String?
    public var `multiSelect`: Bool?
    public var `options`: [AskQuestionOption]
    public var `custom`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `question`: String,
        `options`: [AskQuestionOption],
        `header`: String? = nil,
        `multiSelect`: Bool? = nil,
        `custom`: Bool? = nil
    ) {
        self.`question` = `question`
        self.`header` = `header`
        self.`multiSelect` = `multiSelect`
        self.`options` = `options`
        self.`custom` = `custom`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `question` = try object.required("question")
        `header` = try object.optional("header")
        `multiSelect` = try object.optional("multiSelect")
        `options` = try object.required("options")
        `custom` = try object.optional("custom")
        additionalFields = object.remainder(excluding: ["question", "header", "multiSelect", "options", "custom"])
        explicitNulls = object.nullKeys.intersection(["question", "header", "multiSelect", "options", "custom"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("question", `question`)
        try object.putOptional("header", `header`, nulls: explicitNulls)
        try object.putOptional("multiSelect", `multiSelect`, nulls: explicitNulls)
        try object.put("options", `options`)
        try object.putOptional("custom", `custom`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct AskQuestionOption: WireModel {
    public var `label`: String
    public var `description`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`label`: String, `description`: String? = nil) {
        self.`label` = `label`
        self.`description` = `description`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `label` = try object.required("label")
        `description` = try object.optional("description")
        additionalFields = object.remainder(excluding: ["label", "description"])
        explicitNulls = object.nullKeys.intersection(["label", "description"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("label", `label`)
        try object.putOptional("description", `description`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum QuestionRequestCardDataOrigin: WireModel, Hashable, Sendable {
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
