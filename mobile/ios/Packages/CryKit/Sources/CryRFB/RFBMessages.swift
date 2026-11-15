import Foundation

enum RFBMessages {
    // RFC 6143: little-endian 32-bit pixels, depth 24, RGB shifts 16/8/0.
    static let pixelFormat: [UInt8] = [32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 16, 8, 0, 0, 0, 0]
    static let setPixelFormat = Data([0, 0, 0, 0] + pixelFormat)

    static var setEncodings: Data {
        let encodings: [Int32] = [0, 1, 16, -223, -239]
        var bytes: [UInt8] = [2, 0]
        bytes.appendUInt16(encodings.count)
        for encoding in encodings { bytes.appendUInt32(UInt32(bitPattern: encoding)) }
        return Data(bytes)
    }

    static func updateRequest(_ rect: RFBRectangle, incremental: Bool) -> Data {
        var bytes: [UInt8] = [3, incremental ? 1 : 0]
        bytes.appendUInt16(rect.x)
        bytes.appendUInt16(rect.y)
        bytes.appendUInt16(rect.width)
        bytes.appendUInt16(rect.height)
        return Data(bytes)
    }

    static func key(_ keysym: UInt32, down: Bool) -> Data {
        var bytes: [UInt8] = [4, down ? 1 : 0, 0, 0]
        bytes.appendUInt32(keysym)
        return Data(bytes)
    }

    static func pointer(x: UInt16, y: UInt16, buttons: UInt8) -> Data {
        var bytes: [UInt8] = [5, buttons]
        bytes.appendUInt16(Int(x))
        bytes.appendUInt16(Int(y))
        return Data(bytes)
    }

    static func cutText(_ text: String) throws -> Data {
        guard let payload = text.data(using: .isoLatin1) else { throw RFBError.textNotLatin1 }
        guard payload.count <= RFBLimits.textBytes else { throw RFBError.limitExceeded }
        var bytes: [UInt8] = [6, 0, 0, 0]
        bytes.appendUInt32(UInt32(payload.count))
        bytes.append(contentsOf: payload)
        return Data(bytes)
    }
}
