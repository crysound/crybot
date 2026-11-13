import Foundation

struct WatchCredentials: Codable, Equatable {
    let server: String
    let sessionToken: String
    let cfAuthorization: String
    let cfExpires: TimeInterval?

    var isReady: Bool {
        ServerAddress.url(server) != nil && sessionToken.hasPrefix("cry_sess_") && !cfAuthorization.isEmpty
    }

    var context: [String: Any] {
        var result: [String: Any] = [
            "server": server, "sessionToken": sessionToken,
            "cfAuthorization": cfAuthorization, "updatedAt": Date().timeIntervalSince1970
        ]
        if let cfExpires { result["cfExpires"] = cfExpires }
        return result
    }

    init(server: String, sessionToken: String, cfAuthorization: String, cfExpires: TimeInterval?) {
        self.server = server
        self.sessionToken = sessionToken
        self.cfAuthorization = cfAuthorization
        self.cfExpires = cfExpires
    }

    init?(context: [String: Any]) {
        guard let server = context["server"] as? String,
              ServerAddress.url(server) != nil,
              let sessionToken = context["sessionToken"] as? String,
              let cfAuthorization = context["cfAuthorization"] as? String else { return nil }
        self.init(server: server, sessionToken: sessionToken, cfAuthorization: cfAuthorization,
                  cfExpires: context["cfExpires"] as? TimeInterval)
    }
}

enum ServerAddress {
    static func url(_ value: String) -> URL? {
        guard let url = URL(string: value), url.scheme?.lowercased() == "https",
              let host = url.host, !host.isEmpty, url.user == nil, url.password == nil,
              url.query == nil, url.fragment == nil else { return nil }
        return url
    }

    static func matches(_ first: String, _ second: String) -> Bool {
        guard let a = url(first), let b = url(second) else { return false }
        return a.host?.lowercased() == b.host?.lowercased() && (a.port ?? 443) == (b.port ?? 443)
            && a.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            == b.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
}

enum LoginCookies {
    static func select(from cookies: [HTTPCookie], server: URL, now: Date = Date()) -> WatchCredentials {
        let host = server.host?.lowercased() ?? ""
        let path = server.path.isEmpty ? "/" : server.path
        let matching = cookies.filter { cookie in
            let domain = cookie.domain.lowercased()
            let bareDomain = domain.trimmingCharacters(in: CharacterSet(charactersIn: "."))
            let matchesDomain = host == bareDomain || (domain.hasPrefix(".") && host.hasSuffix("." + bareDomain))
            let matchesPath = path == cookie.path || path.hasPrefix(cookie.path.hasSuffix("/") ? cookie.path : cookie.path + "/")
            return matchesDomain && matchesPath && (cookie.expiresDate.map { $0 > now } ?? true)
        }.sorted { a, b in
            if a.domain.count != b.domain.count { return a.domain.count > b.domain.count }
            if a.path.count != b.path.count { return a.path.count > b.path.count }
            if a.expiresDate != b.expiresDate { return (a.expiresDate ?? .distantFuture) > (b.expiresDate ?? .distantFuture) }
            return a.name < b.name
        }
        let sessions = matching.filter { $0.name.hasPrefix("cry_session_") && $0.value.hasPrefix("cry_sess_") }
        let session = sessions.sorted {
            ($0.expiresDate ?? .distantFuture) > ($1.expiresDate ?? .distantFuture)
        }.first
        let access = matching.first { $0.name == "CF_Authorization" }
        return WatchCredentials(server: server.absoluteString, sessionToken: session?.value ?? "",
                                cfAuthorization: access?.value ?? "", cfExpires: access?.expiresDate?.timeIntervalSince1970)
    }
}

enum WatchAPIError: Error, Equatable {
    case loginExpired
    case cannotConnect
    case invalidResponse
    case rejected(Int)

    var localizationKey: String {
        switch self {
        case .loginExpired: return "LOGIN_EXPIRED"
        case .cannotConnect: return "CANNOT_CONNECT"
        case .invalidResponse: return "INVALID_RESPONSE"
        case .rejected: return "REQUEST_FAILED"
        }
    }
}

enum WatchRequest {
    static func headers(credentials: WatchCredentials) -> [String: String] {
        ["Authorization": "Bearer \(credentials.sessionToken)",
         "Cookie": "CF_Authorization=\(credentials.cfAuthorization)", "Accept": "application/json"]
    }

    static func validate(status: Int, body: Data = Data()) throws {
        if [302, 303, 307, 401].contains(status) { throw WatchAPIError.loginExpired }
        if status == 403 {
            let object = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any]
            guard object?["error"] != nil else { throw WatchAPIError.loginExpired }
        }
        guard (200...299).contains(status) else { throw WatchAPIError.rejected(status) }
    }
}

struct BotList: Decodable {
    let bots: [WatchBot]

    private enum CodingKeys: String, CodingKey { case bots }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        var entries = try container.nestedUnkeyedContainer(forKey: .bots)
        var decoded: [WatchBot] = []
        while !entries.isAtEnd {
            let entry = try entries.superDecoder()
            if let bot = try? WatchBot(from: entry),
               let threadId = bot.threadId, !threadId.isEmpty {
                decoded.append(bot)
            }
        }
        bots = decoded
    }
}

struct WatchBot: Decodable, Identifiable {
    let id: String
    let name: String
    let title: String?
    let threadId: String?
    let messages: [WatchMessage]?

    var displayName: String { name.isEmpty ? (title ?? id) : name }
    var latestReply: WatchMessage? {
        let replies = messages?.filter { $0.role == "bot" } ?? []
        return replies.filter { $0.kind == "text" }.max { $0.at < $1.at }
            ?? replies.max { $0.at < $1.at }
    }
}

struct MessagePage: Decodable {
    let messages: [WatchMessage]
    let hasMore: Bool?
    let activeLeafId: String?
}

struct WatchMessage: Decodable, Identifiable, Equatable {
    let id: String
    let role: String
    let kind: String
    let text: String?
    let at: Double
    let sendId: String?
    let requestMessageId: String?
    let attachments: [Attachment]?

    struct Attachment: Decodable, Equatable {
        let kind: String
    }

    var date: Date { Date(timeIntervalSince1970: at / 1000) }

    func displayText(localize: (String) -> String) -> String {
        if kind == "text", let text, !text.isEmpty { return text }
        if kind == "activity" { return localize("MESSAGE_TOOL") }
        if kind == "screen" || !(attachments ?? []).isEmpty { return localize("MESSAGE_ATTACHMENT") }
        return localize("MESSAGE_OTHER")
    }
}

struct SendMessage: Encodable, Equatable {
    let text: String
    let threadId: String
    let sendId: String

    init(text: String, threadId: String, sendId: String = UUID().uuidString) {
        self.text = text
        self.threadId = threadId
        self.sendId = sendId
    }
}

struct SendResult: Decodable {
    let ok: Bool
    let threadId: String
    let queued: Bool?
    let message: WatchMessage?
}
