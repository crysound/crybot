import XCTest
import Foundation
@testable import CryNetLogic

final class CallbackTests: XCTestCase {
    func testCallbackModeFourCombinations() {
        XCTAssertEqual(HandoffCallbackMode.choose(linkHost: "example.com", supportsHTTPSCallback: true), .https(host: "example.com", path: "/auth/app-return"))
        XCTAssertEqual(HandoffCallbackMode.choose(linkHost: "example.com", supportsHTTPSCallback: false), .scheme("crybot"))
        XCTAssertEqual(HandoffCallbackMode.choose(linkHost: "", supportsHTTPSCallback: true), .scheme("crybot"))
        XCTAssertEqual(HandoffCallbackMode.choose(linkHost: "", supportsHTTPSCallback: false), .scheme("crybot"))
    }
    @MainActor func testRouterMatchesHostAndExactEncodedPath() async {
        let router = CallbackRouter(linkHost: "EXAMPLE.COM")
        var auth = 0
        var feishu = 0
        router.register(host: "auth") { _ in auth += 1 }
        router.register(host: "feishu") { _ in feishu += 1 }
        router.register(httpsPath: "/auth/app-return") { _ in auth += 1 }
        XCTAssertTrue(router.handle(URL(string: "crybot://auth?v=1")!))
        XCTAssertEqual(auth, 1)
        XCTAssertEqual(feishu, 0)
        XCTAssertTrue(router.handle(URL(string: "https://ExAmPlE.com/auth/app-return?v=1")!))
        XCTAssertEqual(auth, 2)
        for url in ["crybot://unknown?v=1", "https://example.com/auth/feishu/app-return?v=1", "https://example.com/auth/app-return/", "https://example.com/auth/app-return-extra", "https://example.com/auth/%61pp-return", "https://other.example.com/auth/app-return", "http://example.com/auth/app-return", "https://user@example.com/auth/app-return", "crybot://auth/other?v=1"] {
            XCTAssertFalse(router.handle(URL(string: url)!))
        }
        let empty = CallbackRouter()
        empty.register(httpsPath: "/auth/app-return") { _ in XCTFail("Unexpected https callback") }
        XCTAssertFalse(empty.handle(URL(string: "https://example.com/auth/app-return?v=1")!))
    }
    @MainActor func testBothHandoffEntrancesDispatchThroughRegistry() async throws {
        let router = CallbackRouter(linkHost: "example.com")
        let registry = HandoffRegistry()
        let completed = expectation(description: "two callbacks")
        completed.expectedFulfillmentCount = 2
        var states: [String] = []
        registry.register(version: 1) { parameters in states.append(parameters.state) }
        router.registerHandoff(registry) { result in
            if case .failure = result { XCTFail("Unexpected registry failure") }
            completed.fulfill()
        }
        XCTAssertTrue(router.handle(URL(string: "crybot://auth?v=1&state=scheme")!))
        XCTAssertTrue(router.handle(URL(string: "https://example.com/auth/app-return?v=1&state=https")!))
        await fulfillment(of: [completed], timeout: 2)
        XCTAssertEqual(Set(states), ["scheme", "https"])
    }
    @MainActor func testMismatchedStateIsIgnoredBeforeVersionDispatch() async {
        let router = CallbackRouter()
        let registry = HandoffRegistry()
        let ignored = expectation(description: "ignored callback")
        ignored.expectedFulfillmentCount = 5
        let completed = expectation(description: "matching callback")
        var handled = 0
        var completions = 0
        registry.register(version: 1) { _ in handled += 1 }
        router.registerHandoff(registry, acceptsState: { $0 == "pending" }, onIgnoredState: { ignored.fulfill() }) { result in
            completions += 1
            if case .failure = result { XCTFail("Unexpected failure") }
            completed.fulfill()
        }
        for url in ["crybot://auth?v=99&state=wrong", "crybot://auth", "crybot://auth?v=1",
                    "crybot://auth?v=1&state=a&state=b", "crybot://auth?state=pending"] {
            XCTAssertTrue(router.handle(URL(string: url)!))
        }
        await fulfillment(of: [ignored], timeout: 2)
        XCTAssertEqual(handled, 0)
        XCTAssertEqual(completions, 0)
        XCTAssertTrue(router.handle(URL(string: "crybot://auth?v=1&state=pending")!))
        await fulfillment(of: [completed], timeout: 2)
        XCTAssertEqual(handled, 1)
        XCTAssertEqual(completions, 1)
    }
    @MainActor func testVersionDispatchAndUnknownVersionError() async throws {
        let registry = HandoffRegistry()
        var seen = 0
        registry.register(version: 2) { value in seen = value.version }
        try await registry.handle(URL(string: "crybot://auth?v=2&state=test")!)
        XCTAssertEqual(seen, 2)
        do { try await registry.handle(URL(string: "crybot://auth?v=3&state=test")!); XCTFail("Expected unsupported version") }
        catch { XCTAssertEqual(error as? HandoffError, .unsupportedVersion) }
    }
    func testParametersRejectDuplicatesAndNeverDescribePayload() throws {
        for query in ["v=1&v=1&state=a", "v=1&state=a&state=b", "v=1&state=a&ct=x&ct=y", "v=no&state=a", "v=1"] {
            XCTAssertThrowsError(try HandoffParameters(url: URL(string: "crybot://auth?\(query)")!))
        }
        let parameters = try HandoffParameters(url: URL(string: "crybot://auth?v=1&state=secret&ct=ciphertext")!)
        XCTAssertEqual(try parameters.parameter("ct"), "ciphertext")
        XCTAssertFalse(String(reflecting: parameters).contains("ciphertext"))
        XCTAssertThrowsError(try parameters.parameter("iv"))
    }
    func testBase64AndJWTExpiry() throws {
        let token = [HandoffEncoding.base64URL(Data(#"{"alg":"test"}"#.utf8)),
                     HandoffEncoding.base64URL(Data(#"{"exp":2000}"#.utf8)), HandoffEncoding.base64URL(Data("signature".utf8))].joined(separator: ".")
        XCTAssertEqual(HandoffEncoding.tokenExpiry(token), Date(timeIntervalSince1970: 2000))
        XCTAssertNil(HandoffEncoding.tokenExpiry("not-a-jwt"))
        XCTAssertNil(HandoffEncoding.decodeBase64URL("YQ="))
        XCTAssertNil(HandoffEncoding.decodeBase64URL("YQ\n"))
        XCTAssertEqual(HandoffEncoding.decodeBase64URL("YQ"), Data("a".utf8))
    }
}
