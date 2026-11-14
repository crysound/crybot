#if canImport(Security)
import Foundation
import XCTest
import CryCore
import CryNetLogic
@testable import CryNet

struct FixtureReply {
    var status = 200
    var headers: [String: String] = ["Content-Type": "application/json"]
    var body = Data()
    var keepOpen = false
    var redirect: URL?
    var stopped: (() -> Void)?
    init(status: Int = 200, headers: [String: String] = ["Content-Type": "application/json"], body: String = "{}",
         keepOpen: Bool = false, redirect: URL? = nil, stopped: (() -> Void)? = nil) {
        self.status = status
        self.headers = headers
        self.body = Data(body.utf8)
        self.keepOpen = keepOpen
        self.redirect = redirect
        self.stopped = stopped
    }
}

final class NetworkFixture: URLProtocol, @unchecked Sendable {
    private static let lock = NSLock()
    private static var handler: ((URLRequest) throws -> FixtureReply)?
    private var stopped: (() -> Void)?
    static func install(_ handler: ((URLRequest) throws -> FixtureReply)?) { lock.withLock { self.handler = handler } }
    static func configuration() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [NetworkFixture.self]
        return configuration
    }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            guard let handler = Self.lock.withLock({ Self.handler }) else { throw URLError(.unsupportedURL) }
            let reply = try handler(request)
            stopped = reply.stopped
            let response = HTTPURLResponse(url: try XCTUnwrap(request.url), statusCode: reply.status, httpVersion: "HTTP/1.1", headerFields: reply.headers)!
            if let redirect = reply.redirect {
                client?.urlProtocol(self, wasRedirectedTo: URLRequest(url: redirect), redirectResponse: response)
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocolDidFinishLoading(self)
            } else {
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                if !reply.body.isEmpty { client?.urlProtocol(self, didLoad: reply.body) }
                if !reply.keepOpen { client?.urlProtocolDidFinishLoading(self) }
            }
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() { stopped?(); stopped = nil }
    static func body(_ request: URLRequest) throws -> Data {
        if let body = request.httpBody { return body }
        guard let stream = request.httpBodyStream else { return Data() }
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while true {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count < 0 { throw URLError(.cannotDecodeRawData) }
            if count == 0 { return data }
            data.append(contentsOf: buffer.prefix(count))
        }
    }
}

class NetworkTestCase: XCTestCase {
    override func tearDown() { NetworkFixture.install(nil); super.tearDown() }
    func server() throws -> CryServer { try CryServer(webURL: "https://example.com/web", apiURL: "https://api.example.com/root") }
    func store(cf: String? = nil) throws -> MemorySessionStore {
        MemorySessionStore(SessionRecord(server: try server(), method: cf == nil ? .feishu : .cfHandoff,
                                         sessionToken: "cry_sess_fixture", cfAuthorization: cf))
    }
    func client(_ store: MemorySessionStore, expired: @escaping () -> Void = {}) throws -> HTTPClient {
        HTTPClient(server: try server(), store: store, configuration: NetworkFixture.configuration(), onLoginExpired: expired)
    }
    func assertHeaders(_ request: URLRequest, token: String? = "cry_sess_fixture", cf: String? = nil, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), token.map { "Bearer \($0)" }, file: file, line: line)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Cookie"), cf.map { "CF_Authorization=\($0)" }, file: file, line: line)
        XCTAssertNil(request.value(forHTTPHeaderField: "Origin"), file: file, line: line)
        XCTAssertEqual(request.url?.host, "api.example.com", file: file, line: line)
        XCTAssertFalse(request.httpShouldHandleCookies, file: file, line: line)
    }
    let sessionBody = #"{"kind":"session","scopes":["client"],"environmentId":"fixture","expiresAt":4102444800000}"#
    let publicSessionBody = #"{"id":"fixture","label":"Phone","scopes":["client"],"createdAt":1000,"lastSeenAt":1000,"expiresAt":4102444800000}"#
    let environmentBody = #"{"environmentId":"fixture","label":"Test","platform":"linux","version":"test","capabilities":{"remoteSessions":false,"selfUpdate":"none","jobs":false}}"#
}
#endif
