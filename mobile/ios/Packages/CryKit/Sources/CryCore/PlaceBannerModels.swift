import Foundation

public struct BannerSummary: WireModel {
    public var `version`: String
    public var `width`: Double
    public var `height`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`version`: String, `width`: Double, `height`: Double) {
        self.`version` = `version`
        self.`width` = `width`
        self.`height` = `height`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `version` = try object.required("version")
        `width` = try object.required("width")
        `height` = try object.required("height")
        additionalFields = object.remainder(excluding: ["version", "width", "height"])
        explicitNulls = object.nullKeys.intersection(["version", "width", "height"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("version", `version`)
        try object.put("width", `width`)
        try object.put("height", `height`)
        try object.encode(to: encoder)
    }
}
