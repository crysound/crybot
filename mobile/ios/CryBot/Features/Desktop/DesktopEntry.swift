import SwiftUI
import CryCore

struct DesktopViewer: View {
    let target: DesktopTarget

    var body: some View {
        Text("DesktopViewer")
            .accessibilityIdentifier("Desktop.placeholder")
    }
}

struct DesktopGallery: View {
    var body: some View {
        Text("DesktopGallery")
            .accessibilityIdentifier("Desktop.placeholder")
    }
}
