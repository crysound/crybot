import XCTest
import CryCore

final class Placeholder: XCTestCase {
    func testCryCoreIsLinkedInHostedTests() throws {
        let body = Data(#"{"count":3}"#.utf8)
        XCTAssertEqual(try CoreEndpoints.inboxCount.decode(body).count, 3)
    }
}
