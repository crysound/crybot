import Foundation

public struct CommandAllowlistCandidate: WireModel {
    public var `command`: String
    public var `cwd`: String
    public var `providerInstanceId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`command`: String, `cwd`: String, `providerInstanceId`: String) {
        self.`command` = `command`
        self.`cwd` = `cwd`
        self.`providerInstanceId` = `providerInstanceId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `command` = try object.required("command")
        `cwd` = try object.required("cwd")
        `providerInstanceId` = try object.required("providerInstanceId")
        additionalFields = object.remainder(excluding: ["command", "cwd", "providerInstanceId"])
        explicitNulls = object.nullKeys.intersection(["command", "cwd", "providerInstanceId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("command", `command`)
        try object.put("cwd", `cwd`)
        try object.put("providerInstanceId", `providerInstanceId`)
        try object.encode(to: encoder)
    }
}
