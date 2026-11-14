import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import CryCore

public enum WebSocketRequest {
    public static func url(server: CryServer, path: String) throws -> URL {
        let request = try Endpoint<Data>(path: path, decode: { $0 }).request(baseURL: server.apiURL)
        guard let url = request.url, var components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.scheme == "https" else { throw EndpointError.invalidPath }
        components.scheme = "wss"
        guard let socketURL = components.url else { throw EndpointError.invalidPath }
        return socketURL
    }
}
