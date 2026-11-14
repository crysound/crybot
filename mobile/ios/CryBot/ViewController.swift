import Foundation
import UIKit
import WebKit

final class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private let preferences = UserDefaults.standard
    private var webView: WKWebView!
    private var serverURL = ""
    private var loginHosts = Set<String>()
    private var downloadLocations = [ObjectIdentifier: URL]()
    private var serverWasInjected = false

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

    private func showError() {
        removeWebView()
        let stack = panel()
        let label = UILabel()
        label.text = NSLocalizedString("LOAD_ERROR", comment: "")
        label.numberOfLines = 0
        label.font = .preferredFont(forTextStyle: .body)
        let retry = UIButton(type: .system)
        retry.setTitle(NSLocalizedString("RETRY", comment: ""), for: .normal)
        retry.addAction(UIAction { [weak self] _ in self?.showWebView() }, for: .touchUpInside)
        stack.addArrangedSubview(label)
        stack.addArrangedSubview(retry)
        if !serverWasInjected {
            let change = UIButton(type: .system)
            change.setTitle(NSLocalizedString("CHANGE_SERVER", comment: ""), for: .normal)
            change.addAction(UIAction { [weak self] _ in self?.showServerForm() }, for: .touchUpInside)
            stack.addArrangedSubview(change)
        }
    }

    private func showWebView() {
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
        webView.load(URLRequest(url: URL(string: serverURL)!))
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

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
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
        if isNetworkFailure(error) { showError() }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        webView.scrollView.refreshControl?.endRefreshing()
        if isNetworkFailure(error) { showError() }
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
