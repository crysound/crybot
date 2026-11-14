import XCTest
@testable import CryCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

final class EndpointTests: XCTestCase {
    private let base = URL(string: "https://example.com/prefix/")!
    private func body<R>(_ endpoint: Endpoint<R>) throws -> JSONValue {
        try JSONDecoder().decode(JSONValue.self, from: XCTUnwrap(endpoint.request(baseURL: base).httpBody))
    }


    func testQueryEncodingMatchesURIComponent() throws {
        let file = CoreEndpoints.uploadFile(name: "C++ notes&x=1.txt", mime: "text/plain", uploadId: "a+b")
        XCTAssertEqual(try file.request(baseURL: base).url?.query, "name=C%2B%2B%20notes%26x%3D1.txt&uploadId=a%2Bb")
        XCTAssertEqual(try CoreEndpoints.history(thread: "thread-1", before: "a+b/?#").request(baseURL: base).url?.query, "before=a%2Bb%2F%3F%23")
        let endpoint = Endpoint<JSONValue>(path: "/api/test", query: [.init(name: "key+&", value: "中文 !'()*-._~%"), .init(name: "flag", value: nil)])
        XCTAssertEqual(try endpoint.request(baseURL: base).url?.query, "key%2B%26=%E4%B8%AD%E6%96%87%20!'()*-._~%25&flag")
    }

    func testSnapshotAndHistoryURLQueries() throws {
        XCTAssertEqual(try CoreEndpoints.snapshot(messages: 0).request(baseURL: base).url?.absoluteString, "https://example.com/prefix/api/bots?messages=0")
        let request = try CoreEndpoints.history(thread: "thread /?", before: "older &?#", limit: 40).request(baseURL: base)
        let components = try XCTUnwrap(URLComponents(url: XCTUnwrap(request.url), resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.percentEncodedPath, "/prefix/api/threads/thread%20%2F%3F/messages")
        XCTAssertEqual(components.queryItems, [.init(name: "before", value: "older &?#"), .init(name: "limit", value: "40")])
        XCTAssertEqual(try CoreEndpoints.history(thread: "thread-1", around: "message-1").query.first?.name, "around")
        XCTAssertThrowsError(try CoreEndpoints.history(thread: "thread-1", before: "a", around: "b"))
        XCTAssertThrowsError(try CoreEndpoints.history(thread: "thread-1", limit: -1))
        XCTAssertThrowsError(try CoreEndpoints.snapshot(messages: -1))
    }

    func testSingleAndGroupSendsAndAllResponses() throws {
        let send = ChatSendBody(text: "Hello", threadId: "thread-1", sendId: "send-1", replyToId: "message-0", channelMode: .goal)
        let endpoints = [try CoreEndpoints.send(bot: "bot-1", body: send), try CoreEndpoints.send(group: "group-1", body: send)]
        XCTAssertEqual(endpoints.map(\.path), ["/api/bots/bot-1/messages", "/api/groups/group-1/messages"])
        for endpoint in endpoints {
            XCTAssertEqual(try body(endpoint), try json(#"{"text":"Hello","threadId":"thread-1","sendId":"send-1","replyToId":"message-0","channelMode":"goal"}"#))
            XCTAssertEqual(try endpoint.request(baseURL: base).value(forHTTPHeaderField: "Content-Type"), "application/json")
            XCTAssertEqual(endpoint.method, .post)
        }
        for behavior in [RespondBodyBehavior.allow, .deny, .answer] {
            let endpoint = try CoreEndpoints.respond(thread: "thread-1", body: .init(requestId: "request-1", behavior: behavior, message: "Choice", always: true))
            XCTAssertEqual(endpoint.path, "/api/threads/thread-1/respond")
            XCTAssertEqual(try body(endpoint)["behavior"], .string(behavior.rawValue))
            XCTAssertEqual(try body(endpoint)["message"], .string("Choice"))
            XCTAssertEqual(try body(endpoint)["always"], .bool(true))
        }
    }

    func testInterruptReadAndReactionBodies() throws {
        let stop = try CoreEndpoints.interrupt(bot: "bot-1", thread: "thread-1", turn: "turn-1")
        XCTAssertEqual(stop.path, "/api/bots/bot-1/interrupt")
        XCTAssertEqual(try body(stop), try json(#"{"threadId":"thread-1","turnId":"turn-1"}"#))
        XCTAssertEqual(try CoreEndpoints.interrupt(group: "group-1").path, "/api/groups/group-1/interrupt")
        XCTAssertEqual(try body(CoreEndpoints.markRead(bot: "bot-1", thread: "thread-1"))["threadId"], .string("thread-1"))
        XCTAssertEqual(try CoreEndpoints.markRead(group: "group-1").path, "/api/groups/group-1/read")
        let reaction = try CoreEndpoints.react(thread: "thread-1", message: "message-1", emoji: "👍", on: false)
        XCTAssertEqual(reaction.path, "/api/threads/thread-1/messages/message-1/reactions")
        XCTAssertEqual(try body(reaction), try json(#"{"emoji":"👍","on":false}"#))
    }

    func testInboxNotificationsConfigAndIdentityPaths() throws {
        XCTAssertEqual(CoreEndpoints.inbox.path, "/api/inbox")
        XCTAssertEqual(CoreEndpoints.inboxCount.path, "/api/inbox/count")
        XCTAssertEqual(CoreEndpoints.readInbox("line-1").path, "/api/inbox/line-1/read")
        XCTAssertEqual(CoreEndpoints.finishInbox("line-1").path, "/api/inbox/line-1/done")
        XCTAssertEqual(CoreEndpoints.notifications.path, "/api/notifications")
        XCTAssertEqual(CoreEndpoints.readNotification("notification-1").path, "/api/notifications/notification-1/read")
        XCTAssertEqual(CoreEndpoints.readAllNotifications.path, "/api/notifications/read-all")
        XCTAssertEqual(CoreEndpoints.config.path, "/api/config")
        XCTAssertEqual(try CoreEndpoints.updateConfig(["future": .null]).method, .patch)
        XCTAssertEqual(try body(CoreEndpoints.updateConfig(["future": .null])), .object(["future": .null]))
        XCTAssertEqual(CoreEndpoints.environment.path, "/.well-known/crybot/environment")
        XCTAssertEqual(CoreEndpoints.authSession.path, "/api/auth/session")
        let pair = try CoreEndpoints.pair(code: "sample-code", label: "Phone", attemptId: "attempt-1")
        XCTAssertEqual(pair.path, "/api/auth/pair")
        XCTAssertEqual(try body(pair), try json(#"{"code":"sample-code","label":"Phone","attemptId":"attempt-1"}"#))
        let start = try CoreEndpoints.startEmail(email: "person@example.com")
        let verify = try CoreEndpoints.verifyEmail(email: "person@example.com", code: "sample-code", label: "Phone")
        XCTAssertEqual(start.path, "/api/auth/email/start")
        XCTAssertEqual(verify.path, "/api/auth/email/verify")
        XCTAssertEqual(try body(verify)["email"], .string("person@example.com"))
        XCTAssertEqual(try body(start)["email"], .string("person@example.com"))
    }

    func testUploadAndDownloadsUseRawBytesAndScopedFilePOST() throws {
        let image = CoreEndpoints.uploadImage(mime: "image/png", uploadId: "upload-1")
        XCTAssertEqual(image.path, "/api/attachments")
        XCTAssertEqual(image.headers["Content-Type"], "image/png")
        XCTAssertNil(image.body)
        let file = CoreEndpoints.uploadFile(name: "note & sketch.txt", mime: "text/plain", uploadId: "upload-2")
        XCTAssertEqual(file.path, "/api/files")
        XCTAssertEqual(file.query, [.init(name: "name", value: "note & sketch.txt"), .init(name: "uploadId", value: "upload-2")])
        let download = CoreEndpoints.attachment(name: "image #1.png")
        XCTAssertEqual(try download.request(baseURL: base).url?.absoluteString, "https://example.com/prefix/api/attachments/image%20%231.png")
        let bytes = Data([0, 1, 2, 255])
        XCTAssertEqual(try download.decode(bytes), bytes)
        let scoped = try CoreEndpoints.messageFile(thread: "thread-1", message: "message-1", path: "notes/file.txt", entry: "part.txt")
        XCTAssertEqual(scoped.path, "/api/threads/thread-1/messages/message-1/file")
        XCTAssertEqual(scoped.method, .post)
        XCTAssertEqual(try body(scoped), try json(#"{"path":"notes/file.txt","entry":"part.txt"}"#))
        XCTAssertEqual(try scoped.decode(bytes), bytes)
    }

    func testOriginCannotBeReplacedByEndpoint() throws {
        for path in ["https://example.com", "//example.com/path", "/../secret", "/%2e%2e/secret", "/api?q=x", "/api#part", "/api\\other", "/api space", "/api/%zz", "/api/你好"] {
            XCTAssertThrowsError(try Endpoint<JSONValue>(path: path).request(baseURL: base), path)
        }
        let endpoint = CoreEndpoints.authSession
        XCTAssertEqual(try endpoint.request(baseURL: base).url?.host, "example.com")
        XCTAssertEqual(try endpoint.request(baseURL: base).value(forHTTPHeaderField: "Accept"), "application/json")
    }
}
