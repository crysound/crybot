import XCTest

final class HarnessFlowTests: ScreenshotCase {
    func testHarnessLaunch() {
        launch(scenario: "harness", appearance: "light")
        snap("harness-launch")
    }
}
