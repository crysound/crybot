import Foundation

public enum HandoffError: Error, Equatable, LocalizedError {
    case unsupportedVersion, invalidCallback, invalidState, expiredAttempt, invalidPayload, missingSession
    public var errorDescription: String? {
        switch self {
        case .unsupportedVersion: return "This handoff requires an updated app."
        case .invalidCallback: return "Invalid login callback."
        case .invalidState: return "Login callback does not match this attempt."
        case .expiredAttempt: return "Login attempt has expired."
        case .invalidPayload: return "Unable to decrypt login response."
        case .missingSession: return "The server did not issue a session."
        }
    }
}

public enum HandoffCallbackMode: Equatable, Sendable {
    case https(host: String, path: String)
    case scheme(String)
    public static func choose(linkHost: String, supportsHTTPSCallback: Bool) -> Self {
        let host = linkHost.trimmingCharacters(in: .whitespacesAndNewlines)
        return !host.isEmpty && supportsHTTPSCallback ? .https(host: host, path: "/auth/app-return") : .scheme("crybot")
    }
}

public struct HandoffParameters: CustomStringConvertible, CustomDebugStringConvertible {
    public let version: Int
    public let state: String
    private let values: [String: String]
    public var description: String { "HandoffParameters(redacted)" }
    public var debugDescription: String { description }
    public init(url: URL) throws {
        guard let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems else { throw HandoffError.invalidCallback }
        var values: [String: String] = [:]
        for item in items {
            guard values[item.name] == nil, let value = item.value else { throw HandoffError.invalidCallback }
            values[item.name] = value
        }
        guard let rawVersion = values["v"], let version = Int(rawVersion), version > 0,
              let state = values["state"], !state.isEmpty else { throw HandoffError.invalidCallback }
        self.version = version
        self.state = state
        self.values = values
    }
    public func parameter(_ name: String) throws -> String {
        guard let value = values[name], !value.isEmpty else { throw HandoffError.invalidCallback }
        return value
    }
}

@MainActor public final class HandoffRegistry {
    public typealias Handler = (HandoffParameters) async throws -> Void
    private var handlers: [Int: Handler] = [:]
    public init() {}
    public func register(version: Int, handler: @escaping Handler) { handlers[version] = handler }
    public func handle(_ url: URL) async throws {
        let parameters = try HandoffParameters(url: url)
        guard let handler = handlers[parameters.version] else { throw HandoffError.unsupportedVersion }
        try await handler(parameters)
    }
}

@MainActor public final class CallbackRouter {
    public typealias Handler = (URL) -> Void
    public let linkHost: String
    private var hosts: [String: Handler] = [:]
    private var paths: [String: Handler] = [:]
    public init(linkHost: String = "") { self.linkHost = linkHost.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
    public func register(host: String, handler: @escaping Handler) { hosts[host.lowercased()] = handler }
    public func register(httpsPath: String, handler: @escaping Handler) { paths[httpsPath] = handler }
    @discardableResult public func handle(_ url: URL) -> Bool {
        guard url.user == nil, url.password == nil, url.fragment == nil else { return false }
        let handler: Handler?
        if url.scheme?.lowercased() == "crybot", url.port == nil, url.path.isEmpty || url.path == "/" {
            handler = hosts[url.host?.lowercased() ?? ""]
        } else if url.scheme?.lowercased() == "https", !linkHost.isEmpty,
                  url.host?.lowercased() == linkHost, url.port == nil || url.port == 443 {
            handler = paths[URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedPath ?? ""]
        } else { return false }
        guard let handler else { return false }
        handler(url)
        return true
    }
    public func registerHandoff(_ registry: HandoffRegistry,
                                acceptsState: @escaping (String) -> Bool = { _ in true },
                                onIgnoredState: @escaping () -> Void = { NSLog("Ignored handoff callback with mismatched state.") },
                                completion: @escaping (Result<Void, Error>) -> Void) {
        let handler: Handler = { url in
            Task { @MainActor in
                do {
                    let parameters = try HandoffParameters(url: url)
                    guard acceptsState(parameters.state) else { onIgnoredState(); return }
                    try await registry.handle(url)
                    completion(.success(()))
                } catch HandoffError.invalidState { onIgnoredState() }
                catch { completion(.failure(error)) }
            }
        }
        register(host: "auth", handler: handler)
        register(httpsPath: "/auth/app-return", handler: handler)
    }
}

public enum HandoffEncoding {
    public static func base64URL(_ bytes: Data) -> String {
        bytes.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    public static func decodeBase64URL(_ value: String) -> Data? {
        guard !value.isEmpty, value.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) == value.startIndex..<value.endIndex else { return nil }
        let padded = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/") + String(repeating: "=", count: (4 - value.count % 4) % 4)
        guard let data = Data(base64Encoded: padded), base64URL(data) == value else { return nil }
        return data
    }
    public static func tokenExpiry(_ token: String) -> Date? {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 3, parts.allSatisfy({ decodeBase64URL(String($0)) != nil }),
              let data = decodeBase64URL(String(parts[1])),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let exp = json["exp"] as? Double, exp.isFinite else { return nil }
        return Date(timeIntervalSince1970: exp)
    }
}
