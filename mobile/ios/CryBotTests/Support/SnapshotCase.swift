import XCTest
import SwiftUI
import UIKit

/// Fixed render sizes used by App-internal snapshots.
public enum SnapshotSize: CaseIterable {
    case se
    case iPhone16
    case proMax

    public static var all: [SnapshotSize] { Array(allCases) }

    var canvas: CGSize {
        switch self { case .se: return CGSize(width: 375, height: 667); case .iPhone16: return CGSize(width: 393, height: 852); case .proMax: return CGSize(width: 440, height: 956) }
    }
    var insets: UIEdgeInsets {
        switch self { case .se: return UIEdgeInsets(top: 20, left: 0, bottom: 0, right: 0); case .iPhone16: return UIEdgeInsets(top: 59, left: 0, bottom: 34, right: 0); case .proMax: return UIEdgeInsets(top: 62, left: 0, bottom: 34, right: 0) }
    }
    var label: String { switch self { case .se: return "se"; case .iPhone16: return "16"; case .proMax: return "promax" } }
}

extension Array where Element == SnapshotSize {
    public static var all: [SnapshotSize] { SnapshotSize.all }
}

@MainActor
open class SnapshotCase: XCTestCase {
    /// For embedded web snapshots pass feature "WebHost" and an entry scene:
    /// "menu-global", "menu-bot", "summary-widget" or "container".
    /// Capture only native entries and container frames, not web page content.
    public func snapshot(_ view: some View, feature: String, scene: String, sizes: [SnapshotSize] = .all, dynamicType: DynamicTypeSize? = nil) throws {
        try requireFeature(feature)
        for size in sizes {
            for appearance in [UIUserInterfaceStyle.light, .dark] {
                let root = dynamicType.map { AnyView(view.environment(\.dynamicTypeSize, $0)) } ?? AnyView(view)
                let hosted = UIHostingController(rootView: root)
                let window = UIWindow(frame: CGRect(origin: .zero, size: size.canvas))
                window.overrideUserInterfaceStyle = appearance
                hosted.view.frame = window.bounds
                hosted.additionalSafeAreaInsets = size.insets
                window.rootViewController = hosted
                window.makeKeyAndVisible()
                hosted.view.setNeedsLayout()
                hosted.view.layoutIfNeeded()
                RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.05))
                let renderer = UIGraphicsImageRenderer(size: size.canvas)
                let image = renderer.image { _ in
                    XCTAssertTrue(hosted.view.drawHierarchy(in: hosted.view.bounds, afterScreenUpdates: true))
                }
                XCTAssertTrue(hasVisibleContent(image), "Snapshot must contain nonuniform, visible pixels")
                let suffix = dynamicType == .accessibility2 ? "-axl" : ""
                let mode = appearance == .dark ? "dark" : "light"
                let attachment = XCTAttachment(image: image)
                attachment.name = "\(feature.lowercased())-\(scene)-\(size.label)-\(mode)\(suffix)"
                attachment.lifetime = .keepAlways
                add(attachment)
                window.isHidden = true
            }
        }
    }

    private func hasVisibleContent(_ image: UIImage) -> Bool {
        guard let cgImage = image.cgImage else { return false }
        let side = 64
        var pixels = [UInt8](repeating: 0, count: side * side * 4)
        let rendered = pixels.withUnsafeMutableBytes { bytes -> Bool in
            guard let context = CGContext(data: bytes.baseAddress, width: side, height: side,
                                          bitsPerComponent: 8, bytesPerRow: side * 4,
                                          space: CGColorSpaceCreateDeviceRGB(),
                                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: CGFloat(side), height: CGFloat(side)))
            return true
        }
        guard rendered else { return false }
        let visible = stride(from: 0, to: pixels.count, by: 4).filter { pixels[$0 + 3] > 0 }
        guard let first = visible.first else { return false }
        return visible.contains { index in
            (0..<3).contains { channel in abs(Int(pixels[index + channel]) - Int(pixels[first + channel])) > 8 }
        }
    }

    private func requireFeature(_ feature: String) throws {
        guard let raw = ProcessInfo.processInfo.environment["CRY_SNAPSHOT_FEATURES"] else { return }
        if raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "none" {
            throw XCTSkip("Snapshots disabled")
        }
        let selected = raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        guard selected.contains("all") || selected.contains(feature.lowercased()) else {
            throw XCTSkip("Snapshot feature \(feature) is not selected")
        }
    }
}
