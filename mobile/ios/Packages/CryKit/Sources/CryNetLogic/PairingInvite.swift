import Foundation

public struct PairingInvite: CustomStringConvertible, CustomDebugStringConvertible {
    public let server: CryServer
    public let token: String
    public let name: String?
    public var description: String { "PairingInvite(redacted)" }
    public var debugDescription: String { description }

    public static func parse(_ text: String) throws -> Self {
        guard let url = URL(string: text), url.scheme?.lowercased() == "crybot", url.host?.lowercased() == "pair",
              url.user == nil, url.password == nil, url.port == nil, url.path.isEmpty, url.fragment == nil,
              let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems else { throw PairingInviteError.invalidLink }
        var values: [String: String] = [:]
        for item in items {
            guard let value = item.value, values[item.name] == nil else { throw PairingInviteError.invalidLink }
            values[item.name] = value
        }
        guard let address = values["address"], let token = values["token"],
              token.range(of: "^cry_pair_[A-Za-z0-9_-]{43}$", options: .regularExpression) == token.startIndex..<token.endIndex,
              values["e2e"] == nil, values["secretKey"] == nil,
              let server = try? CryServer(webURL: address), server.webURL.path.isEmpty || server.webURL.path == "/" else {
            throw PairingInviteError.invalidLink
        }
        if let code = values["code"], code.range(of: "^[0-9]{6}$", options: .regularExpression) != code.startIndex..<code.endIndex {
            throw PairingInviteError.invalidLink
        }
        return Self(server: server, token: token, name: values["name"])
    }
}

public enum PairingInviteError: Error, LocalizedError {
    case invalidLink, differentServer
    public var errorDescription: String? { "This pairing link is not valid for this server." }
}
