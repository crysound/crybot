import Foundation
import XCTest
import CryCore
#if canImport(CryBot)
@testable import CryBot
#else
@testable import Cry_Bot
#endif

final class ShellManualClock: @unchecked Sendable {
    private struct Sleeper {
        var deadline: TimeInterval
        var continuation: CheckedContinuation<Void, Error>
    }

    private let lock = NSLock()
    private var time: TimeInterval = 0
    private var sleepers: [UUID: Sleeper] = [:]

    var now: TimeInterval { lock.withLock { time } }
    var sleeperCount: Int { lock.withLock { sleepers.count } }

    var clock: ShellClock {
        ShellClock(now: { self.now }, sleep: { try await self.sleep($0) })
    }

    func advance(by interval: TimeInterval) {
        let ready: [Sleeper] = lock.withLock {
            time += interval
            let ready = sleepers.filter { $0.value.deadline <= time }
            for id in ready.keys { sleepers.removeValue(forKey: id) }
            return Array(ready.values)
        }
        for sleeper in ready { sleeper.continuation.resume() }
    }

    private func sleep(_ interval: TimeInterval) async throws {
        let id = UUID()
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                lock.withLock {
                    if Task.isCancelled { continuation.resume(throwing: CancellationError()) }
                    else if interval <= 0 { continuation.resume() }
                    else { sleepers[id] = Sleeper(deadline: time + interval, continuation: continuation) }
                }
            }
        } onCancel: {
            let sleeper = self.lock.withLock { self.sleepers.removeValue(forKey: id) }
            sleeper?.continuation.resume(throwing: CancellationError())
        }
    }
}

@MainActor
func shellEventually(file: StaticString = #filePath, line: UInt = #line,
                     _ predicate: () -> Bool) async throws {
    for _ in 0..<500 {
        if predicate() { return }
        try await Task.sleep(for: .milliseconds(2))
    }
    XCTFail("Expected asynchronous state was not reached", file: file, line: line)
    throw ShellTestFailure.timeout
}

enum ShellTestFailure: Error { case timeout }

func shellScenario(frames: [FixtureScenario.TimedFrame] = []) -> FixtureScenario {
    FixtureScenario(signedIn: true, snapshot: BotsSnapshot(bots: [], groups: [], sections: []), frames: frames)
}

func shellFrame(_ json: String) throws -> ServerFrame {
    try JSONDecoder().decode(ServerFrame.self, from: Data(json.utf8))
}

final class ShellDelayedTransport: Transport {
    let base: FixtureTransport
    let clock: ShellClock

    init(base: FixtureTransport, clock: ShellClock) {
        self.base = base
        self.clock = clock
    }

    func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R {
        try await clock.sleep(10)
        return try await base.send(endpoint)
    }

    func events(since: String?, screens: Bool) -> AsyncThrowingStream<ServerFrame, Error> {
        base.events(since: since, screens: screens)
    }

    func upload(_ data: Data, to endpoint: Endpoint<UploadResponse>) async throws -> UploadResponse {
        try await base.upload(data, to: endpoint)
    }

    func download(_ endpoint: Endpoint<Data>) async throws -> Data { try await base.download(endpoint) }
    func webSocket(path: String) async throws -> any WebSocketChannel { try await base.webSocket(path: path) }
}
