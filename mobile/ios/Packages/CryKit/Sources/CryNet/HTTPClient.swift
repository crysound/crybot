#if canImport(Security)
import Foundation
import CryCore
import CryNetLogic

class HTTPTaskDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    let progress: ((Int64, Int64) -> Void)?
    init(progress: ((Int64, Int64) -> Void)? = nil) { self.progress = progress }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64,
                    totalBytesSent: Int64, totalBytesExpectedToSend: Int64) { progress?(totalBytesSent, totalBytesExpectedToSend) }
}

struct PreparedRequest {
    var request: URLRequest
    let record: SessionRecord?
    let usesSession: Bool
}
struct HTTPReply<R> {
    let value: R
    let cookie: SessionCookie?
}

public final class HTTPClient {
    public let server: CryServer
    public let store: any SessionStore
    let session: URLSession
    let now: () -> Date
    let onLoginExpired: () -> Void

    public init(server: CryServer, store: any SessionStore, configuration: URLSessionConfiguration = .ephemeral,
                now: @escaping () -> Date = Date.init, onLoginExpired: @escaping () -> Void = {}) {
        self.server = server
        self.store = store
        self.now = now
        self.onLoginExpired = onLoginExpired
        let configuration = configuration.copy() as! URLSessionConfiguration
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCredentialStorage = nil
        configuration.urlCache = nil
        configuration.httpAdditionalHeaders = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 40
        configuration.timeoutIntervalForResource = 7 * 24 * 3600
        session = URLSession(configuration: configuration, delegate: HTTPTaskDelegate(), delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }

    public func send<R: Decodable>(_ endpoint: Endpoint<R>, authenticated: Bool = true) async throws -> R {
        try await exchange(endpoint, usesSession: authenticated).value
    }

    func prepare<R: Decodable>(_ endpoint: Endpoint<R>, usesSession: Bool = true, cfToken: String? = nil, assertion: Bool = false) throws -> PreparedRequest {
        var request: URLRequest
        do { request = try endpoint.request(baseURL: server.apiURL) } catch { throw CryNetError.invalidResponse }
        let record = usesSession ? try store.read() : nil
        if usesSession {
            guard let record, record.server == server, record.isAuthenticated else { throw CryNetError.loginExpired }
            if let expiry = record.sessionExpires, expiry <= now() { try expire(record); throw CryNetError.loginExpired }
        }
        // Endpoint headers cannot override identity or reintroduce browser-origin credentials.
        for name in ["Authorization", "Cookie", "Origin", "Cf-Access-Jwt-Assertion"] { request.setValue(nil, forHTTPHeaderField: name) }
        for (key, value) in SessionPolicy.headers(for: record) { request.setValue(value, forHTTPHeaderField: key) }
        if let cfToken {
            guard CredentialRules.isCookieValue(cfToken) else { throw HandoffError.invalidPayload }
            request.setValue("CF_Authorization=\(cfToken)", forHTTPHeaderField: "Cookie")
            if assertion { request.setValue(cfToken, forHTTPHeaderField: "Cf-Access-Jwt-Assertion") }
        }
        request.httpShouldHandleCookies = false
        return PreparedRequest(request: request, record: record, usesSession: usesSession)
    }

    func exchange<R: Decodable>(_ endpoint: Endpoint<R>, usesSession: Bool = true) async throws -> HTTPReply<R> {
        let prepared = try prepare(endpoint, usesSession: usesSession)
        do {
            let (data, response) = try await session.data(for: prepared.request)
            try Task.checkCancellation()
            let cookie = try accept(response, body: data, prepared: prepared)
            let value: R
            do { value = try endpoint.decode(data) } catch { throw CryNetError.invalidResponse }
            return HTTPReply(value: value, cookie: cookie)
        } catch { throw safeError(error) }
    }

    @MainActor func handoffSession(token: String, assertion: Bool, log: (NetworkLogEvent) -> Void) async throws -> HTTPReply<AuthSession> {
        let prepared = try prepare(CoreEndpoints.authSession, usesSession: false, cfToken: token, assertion: assertion)
        var status: Int?
        var received = false
        defer { log(.handoffExchange(assertion: assertion, status: status, receivedSession: received)) }
        do {
            let (data, response) = try await session.data(for: prepared.request)
            try Task.checkCancellation()
            status = (response as? HTTPURLResponse)?.statusCode
            let cookie = try accept(response, body: data, prepared: prepared)
            received = cookie != nil
            let value: AuthSession
            do { value = try CoreEndpoints.authSession.decode(data) } catch { throw CryNetError.invalidResponse }
            return HTTPReply(value: value, cookie: cookie)
        } catch { throw safeError(error) }
    }

    @discardableResult func accept(_ response: URLResponse, body: Data, prepared: PreparedRequest) throws -> SessionCookie? {
        guard let http = response as? HTTPURLResponse else { throw CryNetError.invalidResponse }
        let headers = http.allHeaderFields.reduce(into: [String: String]()) { result, pair in
            result[String(describing: pair.key)] = String(describing: pair.value)
        }
        let cookie = SessionCookie.parse(headers, now: now())
        if SessionPolicy.responseExpiresLogin(status: http.statusCode, body: body) {
            if prepared.usesSession, let record = prepared.record { try expire(record) }
            throw CryNetError.loginExpired
        }
        if let cookie, let record = prepared.record {
            try store.replace(ifMatching: record, with: cookie.applying(to: record))
        }
        guard (200..<300).contains(http.statusCode) || http.statusCode == 101 else {
            if let error = try? JSONDecoder().decode(APIError.self, from: body) {
                throw CryNetError.api(redact(error, prepared: prepared))
            }
            throw CryNetError.invalidResponse
        }
        return cookie
    }

    private func expire(_ record: SessionRecord) throws {
        if try store.replace(ifMatching: record, with: record.signedOut()) { onLoginExpired() }
    }

    func safeError(_ error: Error) -> Error {
        if Task.isCancelled || error is CancellationError || (error as? URLError)?.code == .cancelled { return CancellationError() }
        if error is CryNetError || error is HandoffError { return error }
        return CryNetError.cannotConnect
    }

    private func redact(_ error: APIError, prepared: PreparedRequest) -> APIError {
        var secrets = [prepared.record?.sessionToken, prepared.record?.cfAuthorization].compactMap { $0 }
        for name in ["Cookie", "Authorization", "Cf-Access-Jwt-Assertion"] {
            if let value = prepared.request.value(forHTTPHeaderField: name) {
                secrets.append(value)
                if name == "Cookie" { secrets.append(String(value.dropFirst("CF_Authorization=".count))) }
            }
        }
        if let body = prepared.request.httpBody, let json = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any] {
            for key in ["code", "token", "attemptId"] { if let value = json[key] as? String { secrets.append(value) } }
        }
        func scrub(_ value: String?) -> String? {
            guard var value else { return nil }
            for secret in secrets where !secret.isEmpty { value = value.replacingOccurrences(of: secret, with: "[redacted]") }
            for pattern in ["cry_(?:sess|pair)_[A-Za-z0-9_-]+", "[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+", "\\b[0-9]{6,8}\\b"] {
                value = value.replacingOccurrences(of: pattern, with: "[redacted]", options: .regularExpression)
            }
            return value
        }
        let params = error.errorParams?.reduce(into: ServerTextParams()) { result, pair in
            switch pair.value {
            case .string(let value): result[pair.key] = .string(scrub(value) ?? "[redacted]")
            case .number(let value):
                result[pair.key] = scrub(String(value)) == String(value) ? .number(value) : .string("[redacted]")
            case .unknown: break
            }
        }
        return APIError(error: scrub(error.error) ?? "Request refused", code: scrub(error.code), errorKey: scrub(error.errorKey), errorParams: params)
    }
}
#endif
