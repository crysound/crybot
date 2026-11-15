import Foundation

enum RFBReadError: Error {
    case incomplete
}

struct RFBByteReader {
    var bytes: [UInt8]
    var offset = 0
    var remaining: Int { bytes.count - offset }

    mutating func byte() throws -> UInt8 {
        guard remaining >= 1 else { throw RFBReadError.incomplete }
        defer { offset += 1 }
        return bytes[offset]
    }

    mutating func uint16() throws -> Int {
        let high = try byte()
        return (Int(high) << 8) | Int(try byte())
    }

    mutating func uint32() throws -> UInt32 {
        let high = try uint16()
        return (UInt32(high) << 16) | UInt32(try uint16())
    }

    mutating func take(_ count: Int) throws -> [UInt8] {
        guard count >= 0, remaining >= count else { throw RFBReadError.incomplete }
        defer { offset += count }
        return Array(bytes[offset..<(offset + count)])
    }

    mutating func skip(_ count: Int) throws {
        guard count >= 0, remaining >= count else { throw RFBReadError.incomplete }
        offset += count
    }

    mutating func length(maximum: Int) throws -> Int {
        let value = Int(try uint32())
        guard value <= maximum else { throw RFBError.limitExceeded }
        return value
    }
}

extension Array where Element == UInt8 {
    mutating func appendUInt16(_ value: Int) {
        append(UInt8(truncatingIfNeeded: value >> 8))
        append(UInt8(truncatingIfNeeded: value))
    }

    mutating func appendUInt32(_ value: UInt32) {
        append(UInt8(truncatingIfNeeded: value >> 24))
        append(UInt8(truncatingIfNeeded: value >> 16))
        append(UInt8(truncatingIfNeeded: value >> 8))
        append(UInt8(truncatingIfNeeded: value))
    }
}
