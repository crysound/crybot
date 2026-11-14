import Foundation
import XCTest

final class APIClientTests: XCTestCase {
    override func tearDown() {
        FixtureProtocol.setHandler(nil)
        super.tearDown()
    }

    private func client() -> APIClient {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [FixtureProtocol.self]
        return APIClient(configuration: configuration)
    }

    func testListsBotsWithAuthenticatedRequest() async throws {
        FixtureProtocol.setHandler { request in
            XCTAssertEqual(request.url?.path, "/api/bots")
            XCTAssertEqual(request.url?.query, "messages=5")
            XCTAssertEqual(request.httpMethod, "GET")
            XCTAssertEqual(request.timeoutInterval, 15)
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer cry_sess_fixture")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Cookie"), "CF_Authorization=fixture-access")
            return (200, WatchFixtures.bots)
        }
        let bots = try await client().bots(credentials: WatchFixtures.credentials)
        XCTAssertEqual(bots.first?.name, "Assistant")
    }

    func testListsBotsWithBearerOnlyAndNoCookieOrOrigin() async throws {
        let credentials = WatchCredentials(server: "https://bot.example.com", sessionToken: "fixture-session",
                                           cfAuthorization: nil, cfExpires: nil)
        FixtureProtocol.setHandler { request in
            XCTAssertEqual(request.url?.absoluteString, "https://bot.example.com/api/bots?messages=5")
            XCTAssertEqual(request.httpMethod, "GET")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer fixture-session")
            XCTAssertNil(request.value(forHTTPHeaderField: "Cookie"))
            XCTAssertNil(request.value(forHTTPHeaderField: "Origin"))
            XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
            return (200, WatchFixtures.bots)
        }
        let bots = try await client().bots(credentials: credentials)
        XCTAssertEqual(bots.map(\.id), ["bot-1", "bot-2"])
    }

    func testFetchesLatestTwentyMessages() async throws {
        FixtureProtocol.setHandler { request in
            XCTAssertEqual(request.url?.path, "/api/threads/thread-1/messages")
            XCTAssertEqual(request.url?.query, "limit=20")
            return (200, WatchFixtures.messages)
        }
        let messages = try await client().messages(threadId: "thread-1", credentials: WatchFixtures.credentials)
        XCTAssertEqual(messages.last?.id, "m4")
    }

    func testRetryReusesSendIdentityAndReturnsQueuedResult() async throws {
        let message = SendMessage(text: "Hi", threadId: "thread-1")
        XCTAssertNotNil(UUID(uuidString: message.sendId))
        let inspect: (URLRequest) throws -> Void = { request in
            XCTAssertEqual(request.url?.path, "/api/bots/bot-1/messages")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
            let data = try Self.body(request)
            let body = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: String])
            XCTAssertEqual(body["text"], "Hi")
            XCTAssertEqual(body["threadId"], "thread-1")
            XCTAssertEqual(body["sendId"], message.sendId)
        }
        let api = client()
        FixtureProtocol.setHandler { request in
            try inspect(request)
            throw URLError(.networkConnectionLost)
        }
        do {
            _ = try await api.send(botId: "bot-1", message: message, credentials: WatchFixtures.credentials)
            XCTFail("Expected interrupted send")
        } catch {
            XCTAssertEqual(error as? WatchAPIError, .cannotConnect)
        }
        FixtureProtocol.setHandler { request in
            try inspect(request)
            return (200, WatchFixtures.queued)
        }
        let result = try await api.send(botId: "bot-1", message: message, credentials: WatchFixtures.credentials)
        XCTAssertEqual(result.queued, true)
    }

    func testRedirectAndUnauthorizedResponsesBecomeExpiredLogin() async {
        for status in [302, 303, 307, 401, 403] {
            FixtureProtocol.setHandler { _ in (status, "Access login") }
            do {
                _ = try await client().bots(credentials: WatchFixtures.credentials)
                XCTFail("Expected expired login")
            } catch {
                XCTAssertEqual(error as? WatchAPIError, .loginExpired)
            }
        }
    }

    func testServerForbiddenShowsRequestFailureAndAllowsSubsequentRequests() async throws {
        let api = client()
        FixtureProtocol.setHandler { _ in (403, #"{"error":"Insufficient scope"}"#) }
        do {
            _ = try await api.send(botId: "bot-1", message: SendMessage(text: "Hi", threadId: "thread-1"),
                                   credentials: WatchFixtures.credentials)
            XCTFail("Expected request failure")
        } catch {
            XCTAssertEqual(error as? WatchAPIError, .rejected(403))
            XCTAssertEqual((error as? WatchAPIError)?.localizationKey, "REQUEST_FAILED")
        }
        FixtureProtocol.setHandler { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer cry_sess_fixture")
            return (200, WatchFixtures.messages)
        }
        let messages = try await api.messages(threadId: "thread-1", credentials: WatchFixtures.credentials)
        XCTAssertEqual(messages.last?.id, "m4")
    }

    func testEdgeForbiddenWithoutServerErrorBecomesExpiredLogin() async {
        for body in ["<html>Cloudflare Access denied</html>", #"{"message":"Access denied"}"#] {
            FixtureProtocol.setHandler { _ in (403, body) }
            do {
                _ = try await client().bots(credentials: WatchFixtures.credentials)
                XCTFail("Expected expired login")
            } catch {
                XCTAssertEqual(error as? WatchAPIError, .loginExpired)
                XCTAssertEqual((error as? WatchAPIError)?.localizationKey, "LOGIN_EXPIRED")
            }
        }
    }

    func testRedirectDelegateNeverForwardsCredentials() {
        let session = URLSession(configuration: .ephemeral)
        defer { session.invalidateAndCancel() }
        let original = URL(string: "https://bot.example.com/api/bots")!
        let redirect = URLRequest(url: URL(string: "https://example.cloudflareaccess.com/login")!)
        let response = HTTPURLResponse(url: original, statusCode: 302, httpVersion: nil,
                                       headerFields: ["Location": redirect.url!.absoluteString])!
        let task = session.dataTask(with: original)
        let completed = expectation(description: "Redirect refused")
        RedirectBlocker().urlSession(session, task: task, willPerformHTTPRedirection: response, newRequest: redirect) { request in
            XCTAssertNil(request)
            completed.fulfill()
        }
        wait(for: [completed], timeout: 1)
    }

    func testOfflineBecomesCannotConnect() async {
        FixtureProtocol.setHandler { _ in throw URLError(.notConnectedToInternet) }
        do {
            _ = try await client().bots(credentials: WatchFixtures.credentials)
            XCTFail("Expected network failure")
        } catch {
            XCTAssertEqual(error as? WatchAPIError, .cannotConnect)
        }
    }

    private static func body(_ request: URLRequest) throws -> Data {
        if let body = request.httpBody { return body }
        let stream = try XCTUnwrap(request.httpBodyStream)
        stream.open()
        defer { stream.close() }
        var result = Data()
        var buffer = [UInt8](repeating: 0, count: 1024)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }
            result.append(contentsOf: buffer.prefix(count))
        }
        return result
    }
}

private final class FixtureProtocol: URLProtocol {
    private static let lock = NSLock()
    private static var handler: ((URLRequest) throws -> (Int, String))?

    static func setHandler(_ newHandler: ((URLRequest) throws -> (Int, String))?) {
        lock.lock()
        defer { lock.unlock() }
        handler = newHandler
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.lock.lock()
        let handler = Self.handler
        Self.lock.unlock()
        do {
            let responder = try XCTUnwrap(handler)
            let (status, body) = try responder(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil,
                                           headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data(body.utf8))
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
