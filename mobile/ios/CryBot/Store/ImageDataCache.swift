import Foundation
import CryCore

@MainActor
final class ImageDataCache {
    private let cache = NSCache<NSURL, NSData>()

    init() { cache.totalCostLimit = 32 * 1_024 * 1_024 }

    func data(for url: URL) -> Data? { cache.object(forKey: url as NSURL).map { $0 as Data } }
    func insert(_ data: Data, for url: URL) { cache.setObject(data as NSData, forKey: url as NSURL, cost: data.count) }
    func clear() { cache.removeAllObjects() }
}

extension AppStore {
    func imageData(url: URL) async throws -> Data {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.scheme == nil, components.host == nil, url.baseURL == nil else {
            throw EndpointError.invalidPath
        }
        guard let transport else { throw StoreError.detached }
        if let cached = imageCache.data(for: url) { return cached }
        let session = sessionID
        let endpoint = Endpoint<Data>(path: components.percentEncodedPath,
                                      query: components.queryItems ?? [], headers: ["Accept": "image/*"], decode: { $0 })
        let data = try await transport.download(endpoint)
        try Task.checkCancellation()
        guard session == sessionID else { throw CancellationError() }
        imageCache.insert(data, for: url)
        return data
    }
}
