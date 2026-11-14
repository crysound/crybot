import Foundation

/// Incremental UTF-8 SSE parser. A blank line commits the ID and dispatches an event; EOF discards an unfinished event.
/// Invalid events are skipped and counted independently. ID-only blocks also commit their ID, per the SSE protocol.
public struct SSEParser {
    public private(set) var lastEventID: String?
    public private(set) var lastEventName: String?
    public private(set) var invalidEventCount = 0
    private var pendingEventID: String?
    private var line: [UInt8] = []
    private var dataLines: [String] = []
    private var eventName = ""
    private var afterCR = false
    private var firstLine = true
    private var eventBytes = 0
    private var discardingEvent = false
    private var lineHasBytes = false
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
                if let frame = consumeLine() { frames.append(frame) }
                afterCR = byte == 13
            } else {
                lineHasBytes = true
                if line.count + eventBytes >= maximumEventBytes { discardingEvent = true }
                if !discardingEvent { line.append(byte) }
            }
        }
        return frames
    }

    public mutating func finish() {
        resetEvent()
        line.removeAll(keepingCapacity: true)
        lineHasBytes = false
        afterCR = false
    }

    private mutating func resetEvent() {
        dataLines.removeAll(keepingCapacity: true)
        eventName = ""
        pendingEventID = nil
        eventBytes = 0
        discardingEvent = false
    }

    private mutating func consumeLine() -> ServerFrame? {
        defer { line.removeAll(keepingCapacity: true); lineHasBytes = false }
        let isFirstLine = firstLine
        firstLine = false
        if discardingEvent {
            if !lineHasBytes {
                if let pendingEventID { lastEventID = pendingEventID }
                invalidEventCount += 1
                resetEvent()
            }
            return nil
        }
        guard var text = String(bytes: line, encoding: .utf8) else {
            discardingEvent = true
            return nil
        }
        if isFirstLine, text.first == "\u{FEFF}" { text.removeFirst() }
        if text.isEmpty {
            defer { resetEvent() }
            if let pendingEventID { lastEventID = pendingEventID }
            guard !dataLines.isEmpty else { return nil }
            let data = dataLines.joined(separator: "\n")
            guard !data.isEmpty else { return nil }
            do {
                var raw = try JSONDecoder().decode(JSONValue.self, from: Data(data.utf8))
                if raw["kind"] == nil, !eventName.isEmpty { raw["kind"] = .string(eventName) }
                let frame = try raw.decode(ServerFrame.self)
                lastEventName = eventName.isEmpty ? "message" : eventName
                return frame
            } catch {
                invalidEventCount += 1
                return nil
            }
        }
        if text.first == ":" { return nil }
        let parts = text.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
        let field = String(parts[0])
        var value = parts.count > 1 ? String(parts[1]) : ""
        if value.first == " " { value.removeFirst() }
        switch field {
        case "event": eventName = value
        case "id": if !value.contains("\0") { pendingEventID = value }
        case "data":
            eventBytes += value.utf8.count + 1
            if eventBytes > maximumEventBytes { discardingEvent = true }
            else { dataLines.append(value) }
        default: break
        }
        return nil
    }
}

public enum SSEParserError: Error, Equatable {
    case invalidUTF8, eventTooLarge
}
