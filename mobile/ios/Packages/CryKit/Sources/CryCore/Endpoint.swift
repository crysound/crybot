import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public enum HTTPMethod: String, Codable, Sendable {
    case get = "GET", post = "POST", put = "PUT", patch = "PATCH", delete = "DELETE"
}

/// A request relative to the current API server. Paths contain percent-encoded segments, queries contain decoded values.
public struct Endpoint<Response: Decodable> {
    public var method: HTTPMethod
    public var path: String
    public var query: [URLQueryItem]
    public var body: Data?
    public var headers: [String: String]
    private let decodeBody: (Data) throws -> Response

    public init(method: HTTPMethod = .get, path: String, query: [URLQueryItem] = [], body: Data? = nil,
                headers: [String: String] = [:], decode: @escaping (Data) throws -> Response = { try JSONDecoder().decode(Response.self, from: $0) }) {
        self.method = method
        self.path = path
        self.query = query
        self.body = body
        self.headers = headers
        self.decodeBody = decode
    }

    public init<Body: Encodable>(method: HTTPMethod, path: String, query: [URLQueryItem] = [], json: Body) throws {
        self.init(method: method, path: path, query: query, body: try JSONEncoder().encode(json), headers: ["Content-Type": "application/json"])
    }

    /// Endpoints cannot change origin or traverse out of a configured server path; transports may attach credentials.
    public func request(baseURL: URL) throws -> URLRequest {
        guard path.hasPrefix("/"), !path.hasPrefix("//"), !path.contains("?"), !path.contains("#"),
              !path.contains("\\"), let decoded = path.removingPercentEncoding,
              !decoded.split(separator: "/").contains(where: { $0 == ".." || $0 == "." }),
              !decoded.contains("\\"),
              URLComponents(string: path)?.percentEncodedPath == path,
              var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false),
              ["https", "http"].contains(components.scheme), components.host != nil else { throw EndpointError.invalidPath }
        let prefix = components.percentEncodedPath.hasSuffix("/") ? String(components.percentEncodedPath.dropLast()) : components.percentEncodedPath
        components.percentEncodedPath = prefix + path
        components.queryItems = query.isEmpty ? nil : query
        components.fragment = nil
        guard let url = components.url else { throw EndpointError.invalidPath }
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
        return request
    }

    public func decode(_ body: Data) throws -> Response { try decodeBody(body) }
}

public enum EndpointError: Error, Equatable {
    case invalidPath, incompatibleHistoryCursors, invalidLimit
}

public enum CoreEndpoints {
    public static func snapshot(messages: Int? = nil) throws -> Endpoint<BotsSnapshot> {
        if let messages, messages < 0 { throw EndpointError.invalidLimit }
        return Endpoint(path: "/api/bots", query: messages.map { [.init(name: "messages", value: String($0))] } ?? [])
    }

    public static func history(thread: ThreadID, before: MessageID? = nil, around: MessageID? = nil, limit: Int? = nil) throws -> Endpoint<ThreadPage> {
        if before != nil && around != nil { throw EndpointError.incompatibleHistoryCursors }
        if let limit, limit < 0 { throw EndpointError.invalidLimit }
        return Endpoint(path: "/api/threads/\(segment(thread))/messages", query: query([
            ("before", before), ("around", around), ("limit", limit.map(String.init))
        ]))
    }

    public static func send(bot: BotID, body: ChatSendBody) throws -> Endpoint<SendResponse> {
        try Endpoint(method: .post, path: "/api/bots/\(segment(bot))/messages", json: body)
    }
    public static func send(group: GroupID, body: ChatSendBody) throws -> Endpoint<SendResponse> {
        try Endpoint(method: .post, path: "/api/groups/\(segment(group))/messages", json: body)
    }
    public static func respond(thread: ThreadID, body: RespondBody) throws -> Endpoint<ActionResponse> {
        try Endpoint(method: .post, path: "/api/threads/\(segment(thread))/respond", json: body)
    }
    public static func interrupt(bot: BotID, thread: ThreadID? = nil, turn: String? = nil) throws -> Endpoint<ActionResponse> {
        try Endpoint(method: .post, path: "/api/bots/\(segment(bot))/interrupt", json: object([("threadId", thread), ("turnId", turn)]))
    }
    public static func interrupt(group: GroupID, thread: ThreadID? = nil) throws -> Endpoint<ActionResponse> {
        try Endpoint(method: .post, path: "/api/groups/\(segment(group))/interrupt", json: object([("threadId", thread)]))
    }
    public static func markRead(bot: BotID, thread: ThreadID? = nil) throws -> Endpoint<ActionResponse> {
        try Endpoint(method: .post, path: "/api/bots/\(segment(bot))/read", json: object([("threadId", thread)]))
    }
    public static func markRead(group: GroupID, thread: ThreadID? = nil) throws -> Endpoint<ActionResponse> {
        try Endpoint(method: .post, path: "/api/groups/\(segment(group))/read", json: object([("threadId", thread)]))
    }
    public static func react(thread: ThreadID, message: MessageID, emoji: String, on: Bool? = nil) throws -> Endpoint<ActionResponse> {
        var body: [String: JSONValue] = ["emoji": .string(emoji)]
        if let on { body["on"] = .bool(on) }
        return try Endpoint(method: .post, path: "/api/threads/\(segment(thread))/messages/\(segment(message))/reactions", json: body)
    }
    public static var inbox: Endpoint<InboxPage> { Endpoint(path: "/api/inbox") }
    public static var inboxCount: Endpoint<InboxCount> { Endpoint(path: "/api/inbox/count") }
    public static func readInbox(_ id: String) -> Endpoint<InboxPage> { Endpoint(method: .post, path: "/api/inbox/\(segment(id))/read") }
    public static func finishInbox(_ id: String) -> Endpoint<InboxPage> { Endpoint(method: .post, path: "/api/inbox/\(segment(id))/done") }
    public static var notifications: Endpoint<NotificationsPage> { Endpoint(path: "/api/notifications") }
    public static func readNotification(_ id: String) -> Endpoint<ActionResponse> { Endpoint(method: .post, path: "/api/notifications/\(segment(id))/read") }
    public static var readAllNotifications: Endpoint<ActionResponse> { Endpoint(method: .post, path: "/api/notifications/read-all") }
    public static var config: Endpoint<ConfigResponse> { Endpoint(path: "/api/config") }
    public static func updateConfig(_ fields: [String: JSONValue]) throws -> Endpoint<ConfigResponse> {
        try Endpoint(method: .patch, path: "/api/config", json: fields)
    }
    public static var environment: Endpoint<EnvironmentInfo> { Endpoint(path: "/.well-known/crybot/environment") }
    public static var authSession: Endpoint<AuthSession> { Endpoint(path: "/api/auth/session") }
    public static func pair(code: String, label: String, attemptId: String) throws -> Endpoint<PairResponse> {
        try Endpoint(method: .post, path: "/api/auth/pair", json: ["code": code, "label": label, "attemptId": attemptId])
    }
    public static func startEmail(email: String) throws -> Endpoint<ActionResponse> {
        try Endpoint(method: .post, path: "/api/auth/email/start", json: ["email": email])
    }
    public static func verifyEmail(email: String, code: String, label: String) throws -> Endpoint<EmailVerifyResponse> {
        try Endpoint(method: .post, path: "/api/auth/email/verify", json: ["email": email, "code": code, "label": label])
    }
    public static func uploadImage(mime: String, uploadId: String? = nil) -> Endpoint<UploadResponse> {
        Endpoint(method: .post, path: "/api/attachments", query: query([("uploadId", uploadId)]), headers: ["Content-Type": mime])
    }
    public static func uploadFile(name: String, mime: String, uploadId: String? = nil) -> Endpoint<UploadResponse> {
        Endpoint(method: .post, path: "/api/files", query: query([("name", name), ("uploadId", uploadId)]), headers: ["Content-Type": mime])
    }
    public static func attachment(name: String) -> Endpoint<Data> {
        Endpoint(path: "/api/attachments/\(segment(name))", headers: ["Accept": "*/*"], decode: { $0 })
    }
    public static func messageFile(thread: ThreadID, message: MessageID, path: String, entry: String? = nil) throws -> Endpoint<Data> {
        Endpoint(method: .post, path: "/api/threads/\(segment(thread))/messages/\(segment(message))/file",
                 body: try JSONEncoder().encode(object([("path", path), ("entry", entry)])),
                 headers: ["Content-Type": "application/json", "Accept": "*/*"], decode: { $0 })
    }

    private static func segment(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~")) ?? ""
    }
    private static func query(_ values: [(String, String?)]) -> [URLQueryItem] {
        values.compactMap { key, value in value.map { URLQueryItem(name: key, value: $0) } }
    }
    private static func object(_ values: [(String, String?)]) -> [String: JSONValue] {
        Dictionary(uniqueKeysWithValues: values.compactMap { key, value in value.map { (key, .string($0)) } })
    }
}
