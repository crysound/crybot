import Foundation

enum ZRLEDecoder {
    static func maximumInflatedSize(width: Int, height: Int) -> Int {
        let tiles = ((width + 63) / 64) * ((height + 63) / 64)
        return width * height * 4 + tiles * 382
    }

    static func decode(_ data: Data, width: Int, height: Int) throws -> [UInt8] {
        var reader = RFBByteReader(bytes: Array(data))
        var pixels = [UInt8](repeating: 0, count: width * height * 4)
        do {
            for y in stride(from: 0, to: height, by: 64) {
                for x in stride(from: 0, to: width, by: 64) {
                    let tileWidth = min(64, width - x)
                    let tileHeight = min(64, height - y)
                    let tile = try decodeTile(&reader, width: tileWidth, height: tileHeight)
                    for row in 0..<tileHeight {
                        let source = row * tileWidth * 4
                        let destination = ((y + row) * width + x) * 4
                        pixels.replaceSubrange(destination..<(destination + tileWidth * 4),
                                               with: tile[source..<(source + tileWidth * 4)])
                    }
                }
            }
            guard reader.remaining == 0 else { throw RFBError.invalidMessage("Trailing ZRLE bytes") }
            return pixels
        } catch RFBReadError.incomplete {
            throw RFBError.invalidMessage("Truncated ZRLE tile")
        }
    }

    private static func pixel(_ reader: inout RFBByteReader) throws -> [UInt8] {
        // RFC 6143 CPIXEL omits the unused high byte of the negotiated 24-bit colour.
        try reader.take(3) + [255]
    }

    private static func decodeTile(_ reader: inout RFBByteReader, width: Int, height: Int) throws -> [UInt8] {
        let mode = Int(try reader.byte())
        let count = width * height
        var pixels: [UInt8] = []
        pixels.reserveCapacity(count * 4)
        switch mode {
        case 0:
            for _ in 0..<count { pixels.append(contentsOf: try pixel(&reader)) }
        case 1:
            let colour = try pixel(&reader)
            for _ in 0..<count { pixels.append(contentsOf: colour) }
        case 2...16:
            let palette = try readPalette(&reader, count: mode)
            let bits = mode == 2 ? 1 : (mode <= 4 ? 2 : 4)
            let mask = (1 << bits) - 1
            for _ in 0..<height {
                var packed = 0
                for x in 0..<width {
                    if x % (8 / bits) == 0 { packed = Int(try reader.byte()) }
                    let shift = 8 - bits - (x % (8 / bits)) * bits
                    let index = (packed >> shift) & mask
                    guard index < palette.count else { throw RFBError.invalidMessage("Invalid ZRLE palette index") }
                    pixels.append(contentsOf: palette[index])
                }
            }
        case 128:
            while pixels.count / 4 < count {
                let colour = try pixel(&reader)
                let run = try runLength(&reader, remaining: count - pixels.count / 4)
                for _ in 0..<run { pixels.append(contentsOf: colour) }
            }
        case 130...255:
            let palette = try readPalette(&reader, count: mode - 128)
            while pixels.count / 4 < count {
                let code = Int(try reader.byte())
                let index = code & 127
                guard index < palette.count else { throw RFBError.invalidMessage("Invalid ZRLE palette index") }
                let run = code & 128 == 0 ? 1 : try runLength(&reader, remaining: count - pixels.count / 4)
                for _ in 0..<run { pixels.append(contentsOf: palette[index]) }
            }
        default:
            throw RFBError.invalidMessage("Invalid ZRLE subencoding")
        }
        return pixels
    }

    private static func readPalette(_ reader: inout RFBByteReader, count: Int) throws -> [[UInt8]] {
        try (0..<count).map { _ in try pixel(&reader) }
    }

    private static func runLength(_ reader: inout RFBByteReader, remaining: Int) throws -> Int {
        var length = 1
        while true {
            let next = Int(try reader.byte())
            length += next
            guard length <= remaining else { throw RFBError.invalidMessage("ZRLE run exceeds tile") }
            if next != 255 { return length }
        }
    }
}
