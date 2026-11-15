import Foundation
import CryRFB

enum FixtureError: Error {
    case malformed
}

final class StoredBlockInflater: Inflater {
    private var hasHeader = false
    private(set) var calls: [Data] = []
    private(set) var outputLimits: [Int] = []

    func inflate(_ compressed: Data, maximumOutputSize: Int) throws -> Data {
        calls.append(compressed)
        outputLimits.append(maximumOutputSize)
        let bytes = Array(compressed)
        var offset = 0
        if !hasHeader {
            guard bytes.count >= 2, bytes[0] == 0x78, bytes[1] == 0x01 else { throw FixtureError.malformed }
            offset = 2
            hasHeader = true
        }
        var output: [UInt8] = []
        while offset < bytes.count {
            guard offset + 5 <= bytes.count, bytes[offset] == 0 else { throw FixtureError.malformed }
            let length = Int(bytes[offset + 1]) | (Int(bytes[offset + 2]) << 8)
            let inverse = Int(bytes[offset + 3]) | (Int(bytes[offset + 4]) << 8)
            offset += 5
            guard length ^ inverse == 65535, offset + length <= bytes.count,
                  output.count + length <= maximumOutputSize else { throw FixtureError.malformed }
            output.append(contentsOf: bytes[offset..<(offset + length)])
            offset += length
        }
        return Data(output)
    }
}

final class RecordingDES: DESEncryptor {
    private(set) var challenges: [Data] = []
    private(set) var keys: [Data] = []
    var response = Data(repeating: 0xa5, count: 16)
    var shouldThrow = false

    func encrypt(challenge: Data, key: Data) throws -> Data {
        challenges.append(challenge)
        keys.append(key)
        if shouldThrow { throw FixtureError.malformed }
        return response
    }
}

enum RFBFixture {
    static let format: [UInt8] = [32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 16, 8, 0, 0, 0, 0]
    static let red: [UInt8] = [0, 0, 255, 255]
    static let green: [UInt8] = [0, 255, 0, 255]
    static let blue: [UInt8] = [255, 0, 0, 255]

    static func u16(_ value: Int) -> [UInt8] {
        [UInt8(truncatingIfNeeded: value >> 8), UInt8(truncatingIfNeeded: value)]
    }

    static func u32(_ value: UInt32) -> [UInt8] {
        [UInt8(truncatingIfNeeded: value >> 24), UInt8(truncatingIfNeeded: value >> 16),
         UInt8(truncatingIfNeeded: value >> 8), UInt8(truncatingIfNeeded: value)]
    }

    static func serverInit(width: Int = 3, height: Int = 2, name: String = "Example Desktop") -> [UInt8] {
        u16(width) + u16(height) + format + u32(UInt32(name.utf8.count)) + Array(name.utf8)
    }

    static func handshake(version: Int = 8, width: Int = 3, height: Int = 2) -> [UInt8] {
        let banner = Array("RFB 003.00\(version)\n".utf8)
        let security: [UInt8] = version == 3 ? [0, 0, 0, 1] : [1, 1]
        let result: [UInt8] = version == 8 ? [0, 0, 0, 0] : []
        return banner + security + result + serverInit(width: width, height: height)
    }

    static func connected(width: Int = 3, height: Int = 2, inflater: StoredBlockInflater = StoredBlockInflater()) -> RFBClient {
        let client = RFBClient(inflater: inflater)
        _ = client.receive(Data(handshake(width: width, height: height)))
        return client
    }

    static func rectangle(x: Int = 0, y: Int = 0, width: Int, height: Int,
                          encoding: Int32, payload: [UInt8]) -> [UInt8] {
        u16(x) + u16(y) + u16(width) + u16(height) + u32(UInt32(bitPattern: encoding)) + payload
    }

    static func update(_ rectangles: [[UInt8]]) -> [UInt8] {
        [0, 0] + u16(rectangles.count) + rectangles.flatMap { $0 }
    }

    static func stored(_ payload: [UInt8], first: Bool = true) -> [UInt8] {
        precondition(payload.count <= 65535)
        let size = UInt16(payload.count)
        let inverse = ~size
        let block: [UInt8] = [0, UInt8(truncatingIfNeeded: size), UInt8(size >> 8),
                             UInt8(truncatingIfNeeded: inverse), UInt8(inverse >> 8)]
        return (first ? [0x78, 0x01] : []) + block + payload + [0, 0, 0, 255, 255]
    }

    static func zrle(_ payload: [UInt8], width: Int, height: Int, first: Bool = true) -> [UInt8] {
        let compressed = stored(payload, first: first)
        return rectangle(width: width, height: height, encoding: 16,
                         payload: u32(UInt32(compressed.count)) + compressed)
    }

    static func feed(_ bytes: [UInt8], to client: RFBClient, bytewise: Bool) -> [RFBOutput] {
        if bytewise { return bytes.flatMap { client.receive(Data([$0])) } }
        return client.receive(Data(bytes))
    }

    static func sent(_ output: [RFBOutput]) -> [Data] {
        output.compactMap { if case .send(let bytes) = $0 { return bytes }; return nil }
    }

    static func events(_ output: [RFBOutput]) -> [RFBEvent] {
        output.compactMap { if case .event(let event) = $0 { return event }; return nil }
    }
}
