import XCTest
import SwiftUI
import UIKit

final class HarnessSnapshotTests: SnapshotCase {
    func testHarnessBasic() throws {
        try snapshot(HarnessView(), feature: "Harness", scene: "basic")
    }

    func testHarnessAccessibility() throws {
        try snapshot(HarnessView(), feature: "Harness", scene: "basic", dynamicType: .accessibility2)
    }
}

private struct HarnessView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Harness snapshot")
                .font(.headline)
            ScrollView(.horizontal) {
                HStack { ForEach(0..<4, id: \.self) { Text("Scroll \($0)").padding(8).background(.blue.opacity(0.2)) } }
            }
            .frame(height: 48)
            List { Text("List row one"); Text("List row two") }
                .frame(height: 120)
            UIKitLabelRepresentable(text: "UIKit wrapper")
                .frame(height: 32)
        }
        .padding()
    }
}

private struct UIKitLabelRepresentable: UIViewRepresentable {
    let text: String
    func makeUIView(context: Context) -> UILabel { UILabel() }
    func updateUIView(_ view: UILabel, context: Context) { view.text = text; view.textAlignment = .center }
}
