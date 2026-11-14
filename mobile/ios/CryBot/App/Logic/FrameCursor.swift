import Foundation
import CryCore

enum FrameCursor {
    static func value(for frame: ServerFrame) -> String? {
        if case .hello(let hello) = frame { return hello.cursor }
        return (try? JSONValue(encoding: frame))?["cursor"]?.stringValue
    }
}
