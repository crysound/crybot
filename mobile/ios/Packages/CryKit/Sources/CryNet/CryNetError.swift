import Foundation
import CryCore

public enum CryNetError: Error, LocalizedError, CustomStringConvertible, CustomDebugStringConvertible {
    case loginExpired, invalidResponse, cannotConnect, storage, invalidRange, connectionClosed, serverChanged
    case api(APIError)
    public var description: String {
        switch self {
        case .loginExpired: return "Login has expired."
        case .invalidResponse: return "Invalid server response."
        case .cannotConnect: return "Cannot connect to the server."
        case .serverChanged: return "The server changed during login. Please try again."
        case .storage: return "Cannot access the session store."
        case .invalidRange: return "Invalid download range."
        case .connectionClosed: return "The connection was closed."
        case .api: return "The server refused the request."
        }
    }
    public var debugDescription: String { description }
    public var errorDescription: String? { description }
}

public enum NetworkLogEvent: CustomStringConvertible {
    case ignoredHandoffState
    case handoffExchange(assertion: Bool, status: Int?, receivedSession: Bool)
    public var description: String {
        switch self {
        case .ignoredHandoffState: return "Ignored handoff callback with mismatched state."
        case let .handoffExchange(assertion, status, receivedSession):
            return "handoff exchange assertion=\(assertion) status=\(status.map(String.init) ?? "unavailable") session=\(receivedSession)"
        }
    }
}
