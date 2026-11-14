import Foundation

struct ConnectionPolicy {
    static let inactivityTimeout: TimeInterval = 40
    static let stabilityInterval: TimeInterval = 30
    private var connectedAt: TimeInterval
    private(set) var failures = 0
    private(set) var lastFrameAt: TimeInterval

    init(now: TimeInterval) {
        lastFrameAt = now
        connectedAt = now
    }

    mutating func connected(at now: TimeInterval) {
        lastFrameAt = now
        connectedAt = now
    }

    mutating func receivedFrame(at now: TimeInterval) {
        lastFrameAt = now
        if now - connectedAt >= Self.stabilityInterval { failures = 0 }
    }

    func isTimedOut(at now: TimeInterval) -> Bool {
        now - lastFrameAt >= Self.inactivityTimeout
    }

    mutating func retryDelay() -> TimeInterval {
        let delay = min(pow(2, Double(min(failures, 5))), 30)
        failures += 1
        return delay
    }
}

struct ShellClock {
    var now: @Sendable () -> TimeInterval
    var sleep: @Sendable (TimeInterval) async throws -> Void

    static let continuous = ShellClock(
        now: { ProcessInfo.processInfo.systemUptime },
        sleep: { seconds in try await Task.sleep(for: .seconds(seconds)) }
    )
}
