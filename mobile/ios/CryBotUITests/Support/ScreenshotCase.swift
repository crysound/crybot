import XCTest

@MainActor
open class ScreenshotCase: XCTestCase {
    public let app = XCUIApplication()
    private var currentAppearance = "light"

    public func launch(scenario: String, appearance: String = "light", gallery: String? = nil) {
        currentAppearance = appearance.lowercased()
        app.launchArguments += ["-CryFixtureScenario", scenario, "-CryAppearance", appearance]
        if let gallery { app.launchArguments += ["-CryGallery", gallery] }
        app.launch()
    }

    public func snap(_ name: String) {
        let device = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "simulator"
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "\(name)-\(device.replacingOccurrences(of: " ", with: "-"))-\(currentAppearance)"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
