import Foundation

/// Incremental UTF-8 SSE parser. A blank line dispatches an event; EOF discards an unfinished event.
/// `lastEventID` persists across events, including ID-only blocks, as required by the SSE protocol.
public struct SSEParser {
    public private(set) var lastEventID: String?
    public private(set) var lastEventName: String?
    private var line: [UInt8] = []
    private var dataLines: [String] = []
    private var eventName = ""
    private var afterCR = false
    private var firstLine = true
    private var eventBytes = 0
    private let maximumEventBytes: Int

    public init(maximumEventBytes: Int = 16 * 1024 * 1024) {
        self.maximumEventBytes = maximumEventBytes
    }

    public mutating func feed(_ bytes: Data) throws -> [ServerFrame] {
        var frames: [ServerFrame] = []
        for byte in bytes {
            if afterCR {
                afterCR = false
                if byte == 10 { continue }
            }
            if byte == 10 || byte == 13 {
                if let frame = try consumeLine() { frames.append(frame) }
                afterCR = byte == 13
            } else {
                guard line.count + eventBytes < maximumEventBytes else { throw SSEParserError.eventTooLarge }
                line.append(byte)
            }
        }
        return frames
    }

    public mutating func finish() {
        line.removeAll(keepingCapacity: true)
        dataLines.removeAll(keepingCapacity: true)
        eventName = ""
        eventBytes = 0
        afterCR = false
    }

    private mutating func consumeLine() throws -> ServerFrame? {
        defer { line.removeAll(keepingCapacity: true) }
        guard var text = String(bytes: line, encoding: .utf8) else { throw SSEParserError.invalidUTF8 }
        if firstLine {
            firstLine = false
            if text.first == "\u{FEFF}" { text.removeFirst() }
        }
        if text.isEmpty {
            defer { dataLines.removeAll(keepingCapacity: true); eventName = ""; eventBytes = 0 }
            guard !dataLines.isEmpty else { return nil }
            let data = dataLines.joined(separator: "\n")
            guard !data.isEmpty else { return nil }
            lastEventName = eventName.isEmpty ? "message" : eventName
            var raw = try JSONDecoder().decode(JSONValue.self, from: Data(data.utf8))
            if raw["kind"] == nil, !eventName.isEmpty { raw["kind"] = .string(eventName) }
            return try raw.decode(ServerFrame.self)
        }
        if text.first == ":" { return nil }
        let parts = text.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
        let field = String(parts[0])
        var value = parts.count > 1 ? String(parts[1]) : ""
        if value.first == " " { value.removeFirst() }
        switch field {
        case "event": eventName = value
        case "id": if !value.contains("\0") { lastEventID = value }
        case "data":
            eventBytes += value.utf8.count + 1
            guard eventBytes <= maximumEventBytes else { throw SSEParserError.eventTooLarge }
            dataLines.append(value)
        default: break
        }
        return nil
    }
}

public enum SSEParserError: Error, Equatable {
    case invalidUTF8, eventTooLarge
}
