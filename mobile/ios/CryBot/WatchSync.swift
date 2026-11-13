import UIKit
import WatchConnectivity
import WebKit

final class WatchSync: NSObject, WCSessionDelegate {
    static let shared = WatchSync()
    private var server = ""
    private var lastSent: WatchCredentials?

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func refresh(server: String? = nil, reply: (([String: Any]) -> Void)? = nil) {
        if let server { self.server = server }
        guard WCSession.isSupported(), WCSession.default.activationState == .activated,
              WCSession.default.isPaired, WCSession.default.isWatchAppInstalled,
              let url = ServerAddress.url(self.server) else {
            reply?(["status": "openPhone"])
            return
        }
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            DispatchQueue.main.async {
                guard self.server == url.absoluteString else {
                    reply?(["status": "openPhone"])
                    return
                }
                let credentials = LoginCookies.select(from: cookies, server: url)
                if credentials != self.lastSent {
                    do {
                        try WCSession.default.updateApplicationContext(credentials.context)
                        self.lastSent = credentials
                    } catch {
                        reply?(["status": "openPhone"])
                        return
                    }
                }
                reply?(credentials.context)
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.refresh() }
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.lastSent = nil
            self.refresh()
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async {
            guard message["request"] as? String == "refresh",
                  UIApplication.shared.applicationState == .active else {
                replyHandler(["status": "openPhone"])
                return
            }
            self.refresh(reply: replyHandler)
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        DispatchQueue.main.async {
            self.lastSent = nil
            session.activate()
        }
    }
}
