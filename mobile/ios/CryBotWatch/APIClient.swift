import Foundation

final class RedirectBlocker: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

final class APIClient {
    private let session: URLSession

    init(configuration: URLSessionConfiguration = .ephemeral) {
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCredentialStorage = nil
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 15
        session = URLSession(configuration: configuration, delegate: RedirectBlocker(), delegateQueue: nil)
    }

    deinit { session.invalidateAndCancel() }

    func bots(credentials: WatchCredentials) async throws -> [WatchBot] {
        let result: BotList = try await request(credentials, path: ["api", "bots"],
                                               query: [URLQueryItem(name: "messages", value: "20")])
        return result.bots
    }

    func messages(threadId: String, credentials: WatchCredentials) async throws -> [WatchMessage] {
        let page: MessagePage = try await request(credentials, path: ["api", "threads", threadId, "messages"],
                                                 query: [URLQueryItem(name: "limit", value: "20")])
        return page.messages
    }

    func send(botId: String, message: SendMessage, credentials: WatchCredentials) async throws -> SendResult {
        let result: SendResult = try await request(credentials, path: ["api", "bots", botId, "messages"],
                                                   body: JSONEncoder().encode(message))
        guard result.ok else { throw WatchAPIError.invalidResponse }
        return result
    }

    private func request<Response: Decodable>(_ credentials: WatchCredentials, path: [String],
                                             query: [URLQueryItem] = [], body: Data? = nil) async throws -> Response {
        guard credentials.isReady, let base = ServerAddress.url(credentials.server) else { throw WatchAPIError.loginExpired }
        let url = path.reduce(base) { $0.appendingPathComponent($1) }
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { throw WatchAPIError.invalidResponse }
        components.queryItems = query.isEmpty ? nil : query
        guard let endpoint = components.url else { throw WatchAPIError.invalidResponse }
        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.allHTTPHeaderFields = WatchRequest.headers(credentials: credentials)
        request.httpMethod = body == nil ? "GET" : "POST"
        request.httpBody = body
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        do {
            let (data, response) = try await session.data(for: request)
            try Task.checkCancellation()
            guard let http = response as? HTTPURLResponse else { throw WatchAPIError.invalidResponse }
            try WatchRequest.validate(status: http.statusCode)
            do { return try JSONDecoder().decode(Response.self, from: data) }
            catch { throw WatchAPIError.invalidResponse }
        } catch is CancellationError {
            throw CancellationError()
        } catch let error as WatchAPIError {
            throw error
        } catch {
            if Task.isCancelled { throw CancellationError() }
            throw WatchAPIError.cannotConnect
        }
    }
}
