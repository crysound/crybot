import XCTest
@testable import CryCore

struct ContractRegistry {
    typealias RoundTrip = (JSONValue) throws -> (JSONValue, Set<String>)
    static let types: [String: RoundTrip] = [
        "WireMessage": roundTrip(WireMessage.self), "WireBot": roundTrip(WireBot.self),
        "WireGroup": roundTrip(WireGroup.self), "BotsSnapshot": roundTrip(BotsSnapshot.self),
        "ThreadPage": roundTrip(ThreadPage.self), "SendResponse": roundTrip(SendResponse.self),
        "ServerFrame": roundTrip(ServerFrame.self), "RuntimeEvent": roundTrip(RuntimeEvent.self),
        "WidgetNode": roundTrip(WidgetNode.self), "CryChartSpec": roundTrip(CryChartSpec.self),
        "OptionCardData": roundTrip(OptionCardData.self), "InboxPage": roundTrip(InboxPage.self),
        "InboxCount": roundTrip(InboxCount.self), "NotificationsPage": roundTrip(NotificationsPage.self),
        "ConfigResponse": roundTrip(ConfigResponse.self), "EnvironmentInfo": roundTrip(EnvironmentInfo.self),
        "AuthSession": roundTrip(AuthSession.self), "APIError": roundTrip(APIError.self)
    ]

    static func roundTrip<T: WireModel>(_ type: T.Type) -> RoundTrip {
        { value in
            let decoded = try value.decode(type)
            return (try JSONValue(encoding: decoded), ignoredPaths(in: decoded))
        }
    }
    private static func ignoredPaths(in value: Any, path: String = "") -> Set<String> {
        func joined(_ key: String) -> String { path.isEmpty ? key : path + "." + key }
        var paths: Set<String> = []
        if let model = value as? any WireModel {
            paths.formUnion(type(of: model).ignoredKeys.map(joined))
        }
        let mirror = Mirror(reflecting: value)
        switch mirror.displayStyle {
        case .optional, .enum:
            for child in mirror.children { paths.formUnion(ignoredPaths(in: child.value, path: path)) }
        case .collection:
            for (index, child) in mirror.children.enumerated() {
                paths.formUnion(ignoredPaths(in: child.value, path: path + "[\(index)]"))
            }
        case .dictionary:
            for child in mirror.children {
                let pair = Array(Mirror(reflecting: child.value).children)
                if pair.count == 2, let key = pair[0].value as? String {
                    paths.formUnion(ignoredPaths(in: pair[1].value, path: joined(key)))
                }
            }
        case .struct:
            for child in mirror.children {
                if let key = child.label { paths.formUnion(ignoredPaths(in: child.value, path: joined(key))) }
            }
        default: break
        }
        return paths
    }
    static func run(type: String, value: JSONValue) throws -> [String] {
        guard let transform = types[type] else { throw RegistryError.unregistered(type) }
        let (encoded, ignored) = try transform(value)
        return differences(value, encoded, ignored: ignored)
    }
    enum RegistryError: Error { case unregistered(String) }

    static func differences(_ expected: JSONValue, _ actual: JSONValue, ignored: Set<String> = [], path: String = "") -> [String] {
        if !path.isEmpty && ignored.contains(path) { return [] }
        switch (expected, actual) {
        case (.object(let left), .object(let right)):
            return Set(left.keys).union(right.keys).sorted().flatMap { key -> [String] in
                let next = path.isEmpty ? key : path + "." + key
                if ignored.contains(next) { return [] }
                guard let a = left[key], let b = right[key] else { return [next + ": missing or added key"] }
                return differences(a, b, ignored: ignored, path: next)
            }
        case (.array(let left), .array(let right)):
            guard left.count == right.count else { return [path + ": array length changed"] }
            return zip(left, right).enumerated().flatMap { offset, pair in
                differences(pair.0, pair.1, ignored: ignored, path: path + "[\(offset)]")
            }
        default: return expected == actual ? [] : [path + ": value changed"]
        }
    }
}

struct ManualCase: Decodable {
    var swiftType: String
    var name: String
    var value: JSONValue
}

func manualCases() throws -> [ManualCase] {
    let url = try XCTUnwrap(Bundle.module.url(forResource: "protocol", withExtension: "json", subdirectory: "Fixtures/manual"))
    return try JSONDecoder().decode([ManualCase].self, from: Data(contentsOf: url))
}

func fixture<T: Decodable>(_ type: T.Type, named name: String? = nil) throws -> T {
    let sample = try XCTUnwrap(manualCases().first { $0.swiftType == String(describing: type) && (name == nil || $0.name == name) })
    return try sample.value.decode(type)
}

func json(_ text: String) throws -> JSONValue { try JSONDecoder().decode(JSONValue.self, from: Data(text.utf8)) }
func frame(_ text: String) throws -> ServerFrame { try json(text).decode() }

final class ContractTests: XCTestCase {
    func testMalformedMessagesDoNotDiscardThreadOrSnapshot() throws {
        let good = try json(#"{"kind":"text","id":"message-1","role":"bot","at":1,"text":"Hello"}"#)
        let bad = try json(#"{"kind":"options","id":"message-2","role":"bot","at":2,"card":false}"#)
        let missing = try json(#"{"id":"message-3","text":"Missing kind"}"#)
        let messages: JSONValue = .array([good, bad, missing, .null, good])
        let page = try JSONValue.object(["messages": messages, "activeLeafId": .null]).decode(ThreadPage.self)
        func check(_ values: [WireMessage]) throws {
            XCTAssertEqual(values.count, 5)
            XCTAssertEqual(values.first?.text, "Hello")
            XCTAssertEqual(values.last?.text, "Hello")
            guard case .unknown(let kind, let raw) = values[1] else { return XCTFail("Expected unknown malformed options") }
            XCTAssertEqual(kind, "options")
            XCTAssertEqual(raw, bad)
            XCTAssertEqual(try JSONValue(encoding: values), messages)
        }
        try check(page.messages)
        var snapshot = try JSONValue(encoding: fixture(BotsSnapshot.self))
        var bot = try JSONValue(encoding: fixture(WireBot.self))
        var group = try JSONValue(encoding: fixture(WireGroup.self))
        bot["messages"] = messages
        group["messages"] = messages
        snapshot["bots"] = .array([bot]); snapshot["groups"] = .array([group])
        let decoded = try snapshot.decode(BotsSnapshot.self)
        try check(XCTUnwrap(decoded.bots.first?.messages))
        try check(XCTUnwrap(decoded.groups.first?.messages))
    }

    func testNestedIgnoredKeysAreScopedToDeclaringModel() throws {
        let raw = try json(#"{"child":{"value":1,"omitted":2},"children":[{"value":3,"omitted":4}],"lookup":{"sample":{"value":5,"omitted":6}},"wrapped":{"value":8,"omitted":9},"omitted":7}"#)
        let (encoded, ignored) = try ContractRegistry.roundTrip(ContractParent.self)(raw)
        XCTAssertEqual(ContractRegistry.differences(raw, encoded, ignored: ignored), [])
        var changed = encoded
        changed["omitted"] = .number(8)
        XCTAssertEqual(ContractRegistry.differences(raw, changed, ignored: ignored), ["omitted: value changed"])
        changed = encoded
        changed["child"] = .object(["value": .number(9)])
        XCTAssertEqual(ContractRegistry.differences(raw, changed, ignored: ignored), ["child.value: value changed"])
    }

    func testServerContract() throws {
        guard let index = Bundle.module.url(forResource: "index", withExtension: "json", subdirectory: "Fixtures/contract") else {
            throw XCTSkip("Task 00 contract/index.json is not present")
        }
        let raw = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: index))
        let entries = try XCTUnwrap(raw.arrayValue ?? raw["fixtures"]?.arrayValue ?? raw["samples"]?.arrayValue ?? raw["entries"]?.arrayValue)
        XCTAssertFalse(entries.isEmpty, "A present contract index must contain samples")
        for entry in entries {
            let type = try XCTUnwrap(entry["swiftType"]?.stringValue)
            let file = try XCTUnwrap(entry["file"]?.stringValue ?? entry["path"]?.stringValue)
            let directory = index.deletingLastPathComponent()
            let url = directory.appendingPathComponent(file).standardizedFileURL
            XCTAssertTrue(url.path.hasPrefix(directory.path + "/"))
            let sample = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: url))
            XCTAssertEqual(try ContractRegistry.run(type: type, value: sample), [], "\(file) (\(type))")
        }
    }

    func testManualRoundTrips() throws {
        let samples = try manualCases()
        XCTAssertGreaterThan(samples.count, 100)
        for sample in samples {
            do {
                let differences = try ContractRegistry.run(type: sample.swiftType, value: sample.value)
                XCTAssertEqual(differences, [], "\(sample.swiftType)/\(sample.name)")
            }
            catch { XCTFail("\(sample.swiftType)/\(sample.name): \(error)") }
        }
    }

    func testComparatorDetectsDroppedChangedAndAddedValues() throws {
        let a = try json(#"{"a":{"b":null},"items":[1,2],"ignored":1}"#)
        let b = try json(#"{"a":{},"items":[1,3],"ignored":2,"extra":true}"#)
        XCTAssertEqual(ContractRegistry.differences(a, b, ignored: ["ignored"]), ["a.b: missing or added key", "extra: missing or added key", "items[1]: value changed"])
        XCTAssertThrowsError(try ContractRegistry.run(type: "FutureModel", value: a))
    }

    func testEveryKnownUnionCaseUsesTypedDecoding() throws {
        let samples = try manualCases()
        var names: [String: Set<String>] = [:]
        for sample in samples {
            switch sample.swiftType {
            case "WireMessage":
                let value = try sample.value.decode(WireMessage.self)
                if case .unknown = value { XCTFail(sample.name) }
                XCTAssertEqual(value.kind, sample.name)
            case "ServerFrame":
                let value = try sample.value.decode(ServerFrame.self)
                if case .unknown = value { XCTFail(sample.name) }
                XCTAssertEqual(value.kind, sample.name)
            case "RuntimeEvent":
                let value = try sample.value.decode(RuntimeEvent.self)
                if case .unknown = value { XCTFail(sample.name) }
                XCTAssertEqual(value.type, sample.name)
            case "WidgetNode":
                let value = try sample.value.decode(WidgetNode.self)
                if case .unknown = value { XCTFail(sample.name) }
                XCTAssertEqual(value.type, sample.name)
            default: continue
            }
            names[sample.swiftType, default: []].insert(sample.name)
        }
        XCTAssertEqual(names["WireMessage"]?.count, 15)
        XCTAssertEqual(names["ServerFrame"]?.count, 38)
        XCTAssertEqual(names["RuntimeEvent"]?.count, 21)
        XCTAssertEqual(names["WidgetNode"]?.count, 32)
    }

    func testUnknownKindsAndFieldsSurvive() throws {
        for (type, key) in [("WireMessage", "kind"), ("ServerFrame", "kind"), ("RuntimeEvent", "type"), ("WidgetNode", "type")] {
            let raw: JSONValue = .object([key: .string("future"), "nested": .array([.null, .bool(false), .number(42)])])
            XCTAssertEqual(try ContractRegistry.run(type: type, value: raw), [])
        }
        let raw = try json(#"{"kind":"text","id":"message-1","role":"bot","at":1,"text":null,"parentId":null,"extra":{"future":true}}"#)
        XCTAssertEqual(try ContractRegistry.run(type: "WireMessage", value: raw), [])
        var value = try raw.decode(WireMessage.self).fields!
        value.text = "Changed"
        let encoded = try JSONValue(encoding: WireMessage.text(value))
        XCTAssertEqual(encoded["text"], .string("Changed"))
        XCTAssertEqual(encoded["parentId"], .null)
        XCTAssertEqual(encoded["extra"], raw["extra"])
    }

    func testRequiredFieldsAndKnownFieldTypesAreChecked() throws {
        let malformed = try json(#"{"kind":"text","role":"bot","at":1}"#).decode(WireMessage.self)
        guard case .unknown(let kind, _) = malformed else { return XCTFail("Expected malformed message fallback") }
        XCTAssertEqual(kind, "text")
        XCTAssertThrowsError(try json(#"{"kind":"sections","sections":"wrong"}"#).decode(ServerFrame.self))
        XCTAssertThrowsError(try json(#"{"title":"Choose","subtitle":"One","options":5}"#).decode(OptionCardData.self))
    }

    func testJSONNumbersRetainLargeIntegersAndDecimals() throws {
        let data = Data(#"{"integer":9007199254740993,"decimal":1234567890.123456789,"bool":true,"null":null}"#.utf8)
        let value = try JSONDecoder().decode(JSONValue.self, from: data)
        XCTAssertEqual(value["integer"], .number(Decimal(string: "9007199254740993")!))
        XCTAssertEqual(try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(value)), value)
    }

    func testTypedConstructorsMatchDecodedValuesAndExposeOptionalFields() throws {
        XCTAssertEqual(try frame(#"{"kind":"sections","sections":["One"]}"#), .sections(.init(sections: ["One"])))
        let value = WireMessage.text(.init(id: "message-1", role: .bot, at: 1, text: "Hello"))
        let text: String? = value.text
        XCTAssertEqual(text, "Hello")
        XCTAssertEqual(try JSONValue(encoding: value).decode(WireMessage.self), value)
        let node = try json(#"{"type":"Chart","id":"node-1","xAxis":{"dataKey":"day"},"showLegend":false}"#).decode(WidgetNode.self)
        XCTAssertEqual(node.fields?.xAxis?.dataKey, "day")
        XCTAssertEqual(node.fields?.showLegend, false)
        let extreme = try json("1e300")
        XCTAssertEqual(extreme.doubleValue, 1e300)
        XCTAssertEqual(try JSONValue(encoding: extreme), extreme)
    }

    func testPanelAndSettingsUnknownValues() throws {
        let page = try json(#""future-page""#).decode(PanelPageID.self)
        XCTAssertEqual(page, .unknown("future-page"))
        XCTAssertEqual(try JSONValue(encoding: page), .string("future-page"))
        XCTAssertEqual(PanelTarget(tab: .library, page: .skills).page, .skills)
        XCTAssertEqual(SettingsPageID(rawValue: "appearance"), .appearance)
        XCTAssertEqual(BotSettingsSection(rawValue: "permissions"), .permissions)
    }
}

private struct ContractChild: WireModel {
    /// This fixture models a field explicitly excluded by a nested wire contract.
    static let ignoredKeys: Set<String> = ["omitted"]
    var value: Int
}

private struct ContractParent: WireModel {
    var child: ContractChild?
    var children: [ContractChild]
    var lookup: [String: ContractChild]
    var wrapped: ContractEnvelope
    var omitted: Int
}

private enum ContractEnvelope: WireModel {
    case child(ContractChild)

    init(from decoder: Decoder) throws { self = .child(try ContractChild(from: decoder)) }
    func encode(to encoder: Encoder) throws {
        switch self {
        case .child(let child): try child.encode(to: encoder)
        }
    }
}
