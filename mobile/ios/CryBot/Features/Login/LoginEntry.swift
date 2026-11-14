import SwiftUI
import Observation
import CryCore

@Observable @MainActor
final class LoginModel {}

enum LoginRouter {
    static func handle(url: URL) -> Bool { false }
}

struct LoginFlowView: View {
    let model: LoginModel

    var body: some View {
        Text("LoginFlowView")
            .accessibilityIdentifier("Login.placeholder")
    }
}

struct LoginGallery: View {
    var body: some View {
        Text("LoginGallery")
            .accessibilityIdentifier("Login.placeholder")
    }
}
