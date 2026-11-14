import SwiftUI
import UIKit

struct AuthImage: View {
    let url: URL
    @Environment(AppStore.self) private var store
    @State private var image: UIImage?
    @State private var failed = false

    private struct RequestID: Hashable {
        var url: URL
        var session: UUID
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFit()
            } else if failed {
                Label(ShellText.value("imageUnavailable"), systemImage: "photo")
            } else {
                LoadingRow()
            }
        }
        .task(id: RequestID(url: url, session: store.sessionID)) {
            image = nil
            failed = false
            do {
                let data = try await store.imageData(url: url)
                try Task.checkCancellation()
                image = UIImage(data: data)
                failed = image == nil
            } catch is CancellationError {
            } catch { failed = true }
        }
    }
}
