import Foundation

public struct CryServer: Codable, Equatable, Sendable {
    public let webURL: URL
    public let apiURL: URL
    public let loginHosts: Set<String>

    public init(webURL: String, apiURL: String? = nil, loginHosts: String = "") throws {
        self.webURL = try Self.normalize(webURL)
        let api = apiURL?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        self.apiURL = try Self.normalize(api.isEmpty ? webURL : api)
        self.loginHosts = Set(loginHosts.split(whereSeparator: { $0 == "," || $0.isWhitespace }).map { $0.lowercased() })
    }

    public init(buildSettings: [String: String]) throws {
        try self.init(webURL: buildSettings["CRYBOT_SERVER_URL"] ?? "",
                      apiURL: buildSettings["CRYBOT_API_URL"], loginHosts: buildSettings["CRYBOT_LOGIN_HOSTS"] ?? "")
    }

    private enum CodingKeys: String, CodingKey { case webURL, apiURL }
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        try self.init(webURL: values.decode(String.self, forKey: .webURL),
                      apiURL: values.decodeIfPresent(String.self, forKey: .apiURL))
    }
    public func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(webURL.absoluteString, forKey: .webURL)
        try values.encode(apiURL.absoluteString, forKey: .apiURL)
    }
    public static func == (lhs: Self, rhs: Self) -> Bool { lhs.webURL == rhs.webURL && lhs.apiURL == rhs.apiURL }

    private static func normalize(_ value: String) throws -> URL {
        guard var parts = URLComponents(string: value.trimmingCharacters(in: .whitespacesAndNewlines)),
              parts.scheme?.lowercased() == "https", let host = parts.host, !host.isEmpty,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
              parts.port.map({ (1...65535).contains($0) }) ?? true,
              let decoded = parts.percentEncodedPath.removingPercentEncoding,
              !decoded.contains("\\"), !decoded.split(separator: "/").contains(where: { $0 == "." || $0 == ".." }) else {
            throw ServerConfigurationError.invalidURL
        }
        parts.scheme = "https"
        parts.host = host.lowercased()
        if parts.port == 443 { parts.port = nil }
        while parts.percentEncodedPath.hasSuffix("/") { parts.percentEncodedPath.removeLast() }
        guard let url = parts.url else { throw ServerConfigurationError.invalidURL }
        return url
    }
}

public enum ServerConfigurationError: Error { case invalidURL }

public struct SessionRecord: Codable, Equatable, Sendable, CustomStringConvertible, CustomDebugStringConvertible {
    public enum Method: Codable, Equatable, Sendable {
        case cfHandoff, pairing, email, legacyCookie, feishu, other(String)
        public init(rawValue: String) {
            switch rawValue {
            case "cfHandoff": self = .cfHandoff
            case "pairing": self = .pairing
            case "email": self = .email
            case "legacyCookie": self = .legacyCookie
            case "feishu": self = .feishu
            default: self = .other(rawValue)
            }
        }
        public var rawValue: String {
            switch self {
            case .cfHandoff: return "cfHandoff"
            case .pairing: return "pairing"
            case .email: return "email"
            case .legacyCookie: return "legacyCookie"
            case .feishu: return "feishu"
            case .other(let value): return value
            }
        }
        public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
        public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
    }

    public private(set) var version: Int = 2
    public let server: CryServer
    public let method: Method
    public var sessionToken: String
    public var sessionExpires: Date?
    public var cfAuthorization: String?
    public var cfExpires: Date?
    public var isAuthenticated: Bool { version == 2 && CredentialRules.isSessionToken(sessionToken) }
    public var description: String { "SessionRecord(authenticated: \(isAuthenticated))" }
    public var debugDescription: String { description }

    public init(server: CryServer, method: Method, sessionToken: String, sessionExpires: Date? = nil,
                cfAuthorization: String? = nil, cfExpires: Date? = nil) {
        self.server = server
        self.method = method
        self.sessionToken = sessionToken
        self.sessionExpires = sessionExpires
        self.cfAuthorization = cfAuthorization
        self.cfExpires = cfExpires
    }

    public func signedOut() -> Self { Self(server: server, method: method, sessionToken: "") }

    private enum CodingKeys: String, CodingKey {
        case version, server, method, sessionToken, sessionExpires, cfAuthorization, cfExpires
    }
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        version = try values.decode(Int.self, forKey: .version)
        server = try values.decode(CryServer.self, forKey: .server)
        guard version == 2 else {
            method = .other("unsupportedVersion")
            sessionToken = ""
            return
        }
        method = try values.decode(Method.self, forKey: .method)
        sessionToken = try values.decode(String.self, forKey: .sessionToken)
        sessionExpires = try values.decodeIfPresent(Double.self, forKey: .sessionExpires).map(Date.init(timeIntervalSince1970:))
        cfAuthorization = try values.decodeIfPresent(String.self, forKey: .cfAuthorization)
        cfExpires = try values.decodeIfPresent(Double.self, forKey: .cfExpires).map(Date.init(timeIntervalSince1970:))
    }
    public func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(version, forKey: .version)
        try values.encode(server, forKey: .server)
        try values.encode(method, forKey: .method)
        try values.encode(sessionToken, forKey: .sessionToken)
        try values.encodeIfPresent(sessionExpires?.timeIntervalSince1970, forKey: .sessionExpires)
        try values.encodeIfPresent(cfAuthorization, forKey: .cfAuthorization)
        try values.encodeIfPresent(cfExpires?.timeIntervalSince1970, forKey: .cfExpires)
    }
}
