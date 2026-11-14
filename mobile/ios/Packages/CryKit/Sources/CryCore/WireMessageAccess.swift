import Foundation

public extension WireMessage {
    var id: MessageID? {
        if case .unknown(_, let raw) = self { return raw["id"]?.stringValue }
        return fields?.id
    }
    var parentId: MessageID? {
        if case .unknown(_, let raw) = self { return raw["parentId"]?.stringValue }
        return fields?.parentId
    }
}
