import Foundation
import AuthenticationServices
import CryptoKit
import Security
import UIKit
import WebKit

final class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, ASWebAuthenticationPresentationContextProviding {
    private let preferences = UserDefaults.standard
    private var webView: WKWebView!
    private var serverURL = ""
    private var loginHosts = Set<String>()
    private var downloadLocations = [ObjectIdentifier: URL]()
    private var serverWasInjected = false
    private var authenticationSession: ASWebAuthenticationSession?
    private var pendingLoginState: String?
    private var pendingLoginKey: P256.KeyAgreement.PrivateKey?
    private var completingLogin = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let configured = (Bundle.main.object(forInfoDictionaryKey: "CRYBOT_SERVER_URL") as? String ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        serverWasInjected = validServer(configured)
        serverURL = serverWasInjected ? configured : (preferences.string(forKey: "server") ?? "")
        WatchSync.shared.refresh(server: serverURL)
        loginHosts = Set((Bundle.main.object(forInfoDictionaryKey: "CRYBOT_LOGIN_HOSTS") as? String ?? "").split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }.filter { !$0.isEmpty })
        if validServer(serverURL) { showWebView() } else { showServerForm() }
    }

    private func showServerForm() {
        removeWebView()
        let stack = panel()
        let title = UILabel()
        title.text = NSLocalizedString("SERVER_ADDRESS_TITLE", comment: "")
        title.font = .preferredFont(forTextStyle: .title2)
        title.textColor = UIColor(red: 23 / 255, green: 0, blue: 87 / 255, alpha: 1)
        let input = UITextField()
        input.placeholder = NSLocalizedString("SERVER_ADDRESS_HINT", comment: "")
        input.text = serverURL
        input.borderStyle = .roundedRect
        input.keyboardType = .URL
        input.autocapitalizationType = .none
        input.autocorrectionType = .no
        let message = UILabel()
        message.textColor = .systemRed
        message.numberOfLines = 0
        let button = UIButton(type: .system)
        button.setTitle(NSLocalizedString("SERVER_ADDRESS_SAVE", comment: ""), for: .normal)
        button.addAction(UIAction { [weak self, weak input, weak message] _ in
            guard let self, let input else { return }
            let value = input.text?.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
            guard self.validServer(value) else {
                message?.text = NSLocalizedString("SERVER_ADDRESS_INVALID", comment: "")
                return
            }
            self.serverURL = value
            self.preferences.set(value, forKey: "server")
            self.showWebView()
        }, for: .touchUpInside)
        stack.addArrangedSubview(title)
        stack.addArrangedSubview(input)
        stack.addArrangedSubview(message)
        stack.addArrangedSubview(button)
        NSLayoutConstraint.activate([input.heightAnchor.constraint(equalToConstant: 44)])
    }

    private func showError(login: Bool = false) {
        removeWebView()
        let stack = panel()
        let label = UILabel()
        label.text = NSLocalizedString(login ? "LOGIN_ERROR" : "LOAD_ERROR", comment: "")
        label.numberOfLines = 0
        label.font = .preferredFont(forTextStyle: .body)
        let retry = UIButton(type: .system)
        retry.setTitle(NSLocalizedString(login ? "LOGIN" : "RETRY", comment: ""), for: .normal)
        retry.addAction(UIAction { [weak self] _ in
            if login { self?.startLogin() } else { self?.showWebView() }
        }, for: .touchUpInside)
        stack.addArrangedSubview(label)
        stack.addArrangedSubview(retry)
        if !serverWasInjected {
            let change = UIButton(type: .system)
            change.setTitle(NSLocalizedString("CHANGE_SERVER", comment: ""), for: .normal)
            change.addAction(UIAction { [weak self] _ in self?.showServerForm() }, for: .touchUpInside)
            stack.addArrangedSubview(change)
        }
    }

    private func showWebView(loadServer: Bool = true) {
        WatchSync.shared.refresh(server: serverURL)
        removeWebView()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1.0"
        configuration.applicationNameForUserAgent = "Mobile/15E148 CryBotApp/\(version) iOS"
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(refreshPage), for: .valueChanged)
        webView.scrollView.refreshControl = refresh
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        if loadServer { webView.load(URLRequest(url: URL(string: serverURL)!)) }
    }

    @objc private func refreshPage() { webView.reload() }

    private func panel() -> UIStackView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 14
        stack.alignment = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        return stack
    }

    private func removeWebView() {
        webView?.removeFromSuperview()
        view.subviews.filter { $0 is UIStackView }.forEach { $0.removeFromSuperview() }
    }

    private func validServer(_ value: String) -> Bool {
        guard let url = URL(string: value), url.scheme?.lowercased() == "https", url.host != nil else { return false }
        return true
    }

    private func allowed(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        if URL(string: serverURL)?.host?.lowercased() == host { return true }
        return loginHosts.contains(host)
    }

    private func isLoginURL(_ url: URL) -> Bool {
        guard ["http", "https"].contains(url.scheme?.lowercased()), let host = url.host?.lowercased() else { return false }
        return host != URL(string: serverURL)?.host?.lowercased() && loginHosts.contains(host)
    }

    private func startLogin() {
        guard pendingLoginState == nil, !completingLogin, !loginHosts.isEmpty else { return }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess,
              var url = URLComponents(string: serverURL), view.window != nil else {
            showError(login: true)
            return
        }
        let state = base64URL(Data(bytes))
        let privateKey = P256.KeyAgreement.PrivateKey()
        while url.percentEncodedPath.hasSuffix("/") { url.percentEncodedPath.removeLast() }
        url.percentEncodedPath += "/auth/app-handoff"
        url.queryItems = [URLQueryItem(name: "state", value: state), URLQueryItem(name: "pk", value: base64URL(privateKey.publicKey.x963Representation))]
        url.fragment = nil
        guard let handoffURL = url.url else { showError(login: true); return }
        pendingLoginState = state
        pendingLoginKey = privateKey
        let session = ASWebAuthenticationSession(url: handoffURL, callbackURLScheme: "crybot") { [weak self] callback, _ in
            DispatchQueue.main.async {
                guard let self, self.pendingLoginState == state else { return }
                if let callback, self.handleAuthCallback(callback) { return }
                self.failLogin()
            }
        }
        session.prefersEphemeralWebBrowserSession = false
        session.presentationContextProvider = self
        authenticationSession = session
        if !session.start() { failLogin() }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return view.window ?? ASPresentationAnchor()
    }

    private func failLogin() {
        pendingLoginState = nil
        pendingLoginKey = nil
        completingLogin = false
        let session = authenticationSession
        authenticationSession = nil
        session?.cancel()
        showError(login: true)
    }

    func handleAuthCallback(_ url: URL) -> Bool {
        guard url.scheme == "crybot", url.host == "auth",
              let state = pendingLoginState else { return false }
        guard let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
              items.filter({ $0.name == "state" }).count == 1,
              items.first(where: { $0.name == "state" })?.value == state else { return true }
        let privateKey = pendingLoginKey
        pendingLoginState = nil
        pendingLoginKey = nil
        completingLogin = true
        let session = authenticationSession
        authenticationSession = nil
        session?.cancel()
        guard let privateKey,
              let token = decryptHandoff(items, state: state, privateKey: privateKey),
              let expiry = tokenExpiry(token), let host = URL(string: serverURL)?.host,
              let cookie = HTTPCookie(properties: [
                .name: "CF_Authorization", .value: token, .domain: host, .path: "/",
                .secure: "TRUE", .expires: expiry, HTTPCookiePropertyKey("HttpOnly"): "TRUE"
              ]) else { failLogin(); return true }
        showWebView(loadServer: false)
        webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie) { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }
                self.completingLogin = false
                self.webView.load(URLRequest(url: URL(string: self.serverURL)!))
            }
        }
        return true
    }

    private func base64URL(_ data: Data) -> String {
        return data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }

    private func decodeBase64URL(_ value: String) -> Data? {
        guard !value.isEmpty, value.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) == value.startIndex..<value.endIndex else { return nil }
        var padded = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        padded += String(repeating: "=", count: (4 - padded.count % 4) % 4)
        guard let data = Data(base64Encoded: padded), base64URL(data) == value else { return nil }
        return data
    }

    private func decryptHandoff(_ items: [URLQueryItem], state: String, privateKey: P256.KeyAgreement.PrivateKey) -> String? {
        func parameter(_ name: String) -> String? {
            let matches = items.filter { $0.name == name }
            return matches.count == 1 ? matches.first?.value : nil
        }
        guard parameter("v") == "1",
              let epk = parameter("epk"), let publicBytes = decodeBase64URL(epk), publicBytes.count == 65, publicBytes.first == 4,
              let iv = parameter("iv"), let nonceBytes = decodeBase64URL(iv), nonceBytes.count == 12,
              let ct = parameter("ct"), let encrypted = decodeBase64URL(ct), encrypted.count > 16 else { return nil }
        do {
            let publicKey = try P256.KeyAgreement.PublicKey(x963Representation: publicBytes)
            let secret = try privateKey.sharedSecretFromKeyAgreement(with: publicKey)
            let stateBytes = Data(state.utf8)
            let key = secret.hkdfDerivedSymmetricKey(using: SHA256.self, salt: stateBytes, sharedInfo: Data("crybot-app-handoff-v1".utf8), outputByteCount: 32)
            let nonce = try AES.GCM.Nonce(data: nonceBytes)
            let box = try AES.GCM.SealedBox(nonce: nonce, ciphertext: encrypted.dropLast(16), tag: encrypted.suffix(16))
            let plaintext = try AES.GCM.open(box, using: key, authenticating: stateBytes)
            return String(data: plaintext, encoding: .utf8)
        } catch {
            return nil
        }
    }

    private func tokenExpiry(_ token: String) -> Date? {
        guard token.range(of: "^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$", options: .regularExpression) == token.startIndex..<token.endIndex else { return nil }
        var payload = String(token.split(separator: ".")[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        payload += String(repeating: "=", count: (4 - payload.count % 4) % 4)
        guard let data = Data(base64Encoded: payload),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let exp = json["exp"] as? Double, exp.isFinite, exp > Date().timeIntervalSince1970 else { return nil }
        return Date(timeIntervalSince1970: exp)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.targetFrame?.isMainFrame != false,
           let url = navigationAction.request.url, isLoginURL(url) {
            decisionHandler(.cancel)
            startLogin()
            return
        }
        guard let targetFrame = navigationAction.targetFrame else {
            decisionHandler(.allow)
            return
        }
        guard targetFrame.isMainFrame, let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if navigationAction.shouldPerformDownload {
            decisionHandler(.download)
            return
        }
        let scheme = url.scheme?.lowercased()
        if ["blob", "data", "about"].contains(scheme) {
            decisionHandler(.allow)
        } else if ["http", "https"].contains(scheme) {
            if allowed(url) { decisionHandler(.allow) } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        } else {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if isLoginURL(url) { startLogin(); return nil }
        if ["http", "https"].contains(url.scheme?.lowercased()) && allowed(url) {
            webView.load(URLRequest(url: url))
        } else if ["http", "https"].contains(url.scheme?.lowercased()) {
            UIApplication.shared.open(url)
        } else if !["blob", "data", "about"].contains(url.scheme?.lowercased()) {
            UIApplication.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        webView.scrollView.refreshControl?.endRefreshing()
        if pendingLoginState == nil && !completingLogin && isNetworkFailure(error) { showError() }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        webView.scrollView.refreshControl?.endRefreshing()
        if pendingLoginState == nil && !completingLogin && isNetworkFailure(error) { showError() }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.scrollView.refreshControl?.endRefreshing()
        WatchSync.shared.refresh(server: serverURL)
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.prompt)
    }

    private func isNetworkFailure(_ error: Error) -> Bool {
        let nsError = error as NSError
        return nsError.domain == NSURLErrorDomain && nsError.code != NSURLErrorCancelled
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disposition = (navigationResponse.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition")
        if !navigationResponse.canShowMIMEType || disposition?.localizedCaseInsensitiveContains("attachment") == true {
            decisionHandler(.download)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        } catch {
            completionHandler(nil)
            return
        }
        let destination = directory.appendingPathComponent(suggestedFilename)
        downloadLocations[ObjectIdentifier(download)] = destination
        completionHandler(destination)
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let url = downloadLocations.removeValue(forKey: ObjectIdentifier(download)) else { return }
        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        }
        present(controller, animated: true)
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadLocations.removeValue(forKey: ObjectIdentifier(download))
    }
}
