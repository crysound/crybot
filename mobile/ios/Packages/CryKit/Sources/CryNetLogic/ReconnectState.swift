import Foundation
import CryCore

public struct ReconnectState {
    public private(set) var cursor: String?
    public private(set) var snapshotRequired = false
    private var snapshotCursor: String?
    private var snapshotFrameCursor: String?
    private var attempt = 0
    private var lastFrame: TimeInterval
    private let clock: () -> TimeInterval

    public init(since: String? = nil, clock: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }) {
        cursor = since
        self.clock = clock
        lastFrame = clock()
    }
    public var isStale: Bool { clock() - lastFrame >= 40 }
    public mutating func connected() { lastFrame = clock() }
    public mutating func disconnected() -> TimeInterval {
        snapshotRequired = false
        snapshotCursor = nil
        snapshotFrameCursor = nil
        let delay = min(pow(2, Double(attempt)), 30)
        attempt = min(attempt + 1, 5)
        return delay
    }
    public mutating func receive(_ frame: ServerFrame, eventID: String?) {
        lastFrame = clock()
        switch frame {
        case .ping: attempt = 0
        case .hello(let hello):
            if !hello.resumed {
                snapshotRequired = true
                snapshotCursor = hello.cursor
                snapshotFrameCursor = nil
            }
        default:
            if let eventID, !eventID.isEmpty {
                if snapshotRequired { snapshotFrameCursor = eventID }
                else { cursor = eventID }
            }
        }
    }
    public mutating func snapshotLoaded() {
        guard snapshotRequired else { return }
        cursor = snapshotFrameCursor ?? snapshotCursor
        snapshotRequired = false
        snapshotCursor = nil
        snapshotFrameCursor = nil
    }
}
