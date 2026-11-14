import Foundation

public enum CredentialRules {
    public static func isSessionToken(_ value: String) -> Bool {
        value.range(of: "^cry_sess_[A-Za-z0-9_-]+$", options: .regularExpression) == value.startIndex..<value.endIndex
    }
    public static func isCookieValue(_ value: String) -> Bool {
        !value.isEmpty && value.utf8.allSatisfy { $0 >= 0x21 && $0 <= 0x7e && ![34, 44, 59, 92].contains($0) }
    }
}

public enum SessionPolicy {
    public static func headers(for record: SessionRecord?) -> [String: String] {
        var result = ["Accept": "application/json"]
        guard let record, record.isAuthenticated else { return result }
        result["Authorization"] = "Bearer \(record.sessionToken)"
        if let cf = record.cfAuthorization, CredentialRules.isCookieValue(cf) {
            result["Cookie"] = "CF_Authorization=\(cf)"
        }
        return result
    }

    public static func responseExpiresLogin(status: Int, body: Data) -> Bool {
        if [302, 303, 307, 401].contains(status) { return true }
        guard status == 403 else { return false }
        let json = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any]
        return json?["error"] == nil
    }

    public enum LoginStatus: Equatable, Sendable {
        case ok, renewSoon, loginRequired
    }

    public static func needsLogin(_ record: SessionRecord, now: Date = Date()) -> LoginStatus {
        guard record.isAuthenticated else { return .loginRequired }
        if let expiry = record.sessionExpires, expiry <= now { return .loginRequired }
        if record.method == .cfHandoff, let expiry = record.cfExpires {
            if expiry <= now { return .loginRequired }
            if expiry.timeIntervalSince(now) <= 600 { return .renewSoon }
        }
        return .ok
    }

    public static func serverExpiry(milliseconds: Double?) -> Date? {
        guard let milliseconds, milliseconds.isFinite else { return nil }
        return Date(timeIntervalSince1970: milliseconds / 1000)
    }
}

public struct SessionCookie: Equatable, Sendable, CustomStringConvertible {
    public let token: String
    public let expires: Date?
    public var description: String { "SessionCookie(redacted)" }

    public static func parse(_ headers: [String: String], now: Date = Date()) -> Self? {
        guard let header = headers.first(where: { $0.key.lowercased() == "set-cookie" })?.value,
              let regex = try? NSRegularExpression(pattern: "(?:^|,|\\n)\\s*(cry_session_[A-Za-z0-9_]+)=([^;,\\s]+)([^\\n]*?)(?=,\\s*[A-Za-z0-9_\\-]+=|\\n|$)") else { return nil }
        for match in regex.matches(in: header, range: NSRange(header.startIndex..., in: header)).reversed() {
            guard let tokenRange = Range(match.range(at: 2), in: header),
                  let attributesRange = Range(match.range(at: 3), in: header) else { continue }
            let token = String(header[tokenRange])
            guard CredentialRules.isSessionToken(token) else { continue }
            var maxAge: TimeInterval?
            var expires: Date?
            for attribute in header[attributesRange].split(separator: ";") {
                let pair = attribute.split(separator: "=", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
                guard pair.count == 2 else { continue }
                if pair[0].lowercased() == "max-age", let seconds = TimeInterval(pair[1]), seconds.isFinite { maxAge = seconds }
                if pair[0].lowercased() == "expires" {
                    let formatter = DateFormatter()
                    formatter.locale = Locale(identifier: "en_US_POSIX")
                    formatter.timeZone = TimeZone(secondsFromGMT: 0)
                    formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
                    expires = formatter.date(from: pair[1])
                }
            }
            return Self(token: token, expires: maxAge.map { now.addingTimeInterval($0) } ?? expires)
        }
        return nil
    }

    public func applying(to record: SessionRecord) -> SessionRecord {
        var updated = record
        updated.sessionToken = token
        updated.sessionExpires = expires ?? record.sessionExpires
        return updated
    }
}
