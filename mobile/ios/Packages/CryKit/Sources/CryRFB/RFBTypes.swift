import Foundation

/// Encrypt the 16-byte challenge with DES ECB, without padding. The 8-byte key
/// already has each password byte's bits reversed as required by RFB 3.x.
public protocol DESEncryptor {
    func encrypt(challenge: Data, key: Data) throws -> Data
}

/// One instance belongs to one connection. Input includes the zlib header on
/// the first call only; subsequent rectangles continue the same deflate stream.
/// Return all output through the rectangle's sync-flush boundary, or throw if
/// output would exceed maximumOutputSize. Do not reset the stream between calls.
public protocol Inflater: AnyObject {
    func inflate(_ compressed: Data, maximumOutputSize: Int) throws -> Data
}

public struct RFBRectangle: Equatable, Sendable {
    public let x: Int
    public let y: Int
    public let width: Int
    public let height: Int

    public init(x: Int, y: Int, width: Int, height: Int) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }
}

public struct RFBServerInfo: Equatable, Sendable {
    public let width: Int
    public let height: Int
    public let name: String
}

public struct RFBCursor: Equatable, Sendable {
    public let hotspotX: Int
    public let hotspotY: Int
    public let width: Int
    public let height: Int
    public let pixels: [UInt8]
}

public enum RFBConnectionState: Equatable, Sendable {
    case handshaking
    case connected
    case failed
}

public enum RFBError: Error, Equatable, Sendable {
    case unsupportedVersion
    case unsupportedSecurity
    case authenticationFailed(String)
    case invalidMessage(String)
    case limitExceeded
    case encryptionFailed
    case inflationFailed
    case notConnected
    case textNotLatin1
}

public enum RFBEvent: Equatable, Sendable {
    case connected(RFBServerInfo)
    case framebufferUpdated([RFBRectangle])
    case resized(width: Int, height: Int)
    case cursor(RFBCursor)
    case bell
    case clipboard(String)
    case failed(RFBError)
}

public enum RFBOutput: Equatable, Sendable {
    case send(Data)
    case event(RFBEvent)
}

// Bound peer-controlled allocations before buffering, decompressing or rendering.
enum RFBLimits {
    static let framebufferBytes = 64 * 1024 * 1024
    static let textBytes = 16 * 1024 * 1024
    static let nameBytes = 1024 * 1024
    static let compressedBytes = 64 * 1024 * 1024
    static let bufferedBytes = 128 * 1024 * 1024
}
