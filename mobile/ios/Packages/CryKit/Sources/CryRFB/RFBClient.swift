import Foundation

public final class RFBClient {
    public private(set) var state: RFBConnectionState = .handshaking
    public private(set) var framebuffer: Framebuffer?
    public private(set) var serverInfo: RFBServerInfo?

    private enum Step {
        case version
        case security
        case challenge
        case securityResult
        case failureReason
        case serverInit
        case message
        case rectangleHeader(Int)
        case rectanglePayload(RFBRectangle, Int32, Int)
        case failed
    }

    private let inflater: any Inflater
    private let desEncryptor: (any DESEncryptor)?
    private let password: [UInt8]
    private let shared: Bool
    private var minorVersion = 8
    private var step = Step.version
    private var input = RFBByteReader(bytes: [])
    private var needsFullUpdate = false

    public init(inflater: any Inflater, desEncryptor: (any DESEncryptor)? = nil,
                password: String = "", shared: Bool = true) {
        self.inflater = inflater
        self.desEncryptor = desEncryptor
        self.password = Array(password.utf8.prefix(8))
        self.shared = shared
    }

    public func receive(_ data: Data) -> [RFBOutput] {
        guard state != .failed else { return [] }
        var output: [RFBOutput] = []
        do {
            guard data.count <= RFBLimits.bufferedBytes - input.remaining else { throw RFBError.limitExceeded }
            input.bytes.append(contentsOf: data)
            while true {
                var reader = input
                do {
                    try advance(&reader, output: &output)
                    input.offset = reader.offset
                } catch RFBReadError.incomplete {
                    break
                }
            }
        } catch {
            let failure = error as? RFBError ?? .invalidMessage("Invalid RFB data")
            state = .failed
            step = .failed
            input = RFBByteReader(bytes: [])
            output.append(.event(.failed(failure)))
        }
        if input.offset == input.bytes.count {
            input = RFBByteReader(bytes: [])
        } else if input.offset > 65536 {
            input = RFBByteReader(bytes: Array(input.bytes[input.offset...]))
        }
        return output
    }

    public func keyEvent(keysym: UInt32, down: Bool) throws -> Data {
        try requireConnected()
        return RFBMessages.key(keysym, down: down)
    }

    public func pointerEvent(x: UInt16, y: UInt16, buttons: UInt8) throws -> Data {
        try requireConnected()
        return RFBMessages.pointer(x: x, y: y, buttons: buttons)
    }

    public func clientCutText(_ text: String) throws -> Data {
        try requireConnected()
        return try RFBMessages.cutText(text)
    }

    public func framebufferUpdateRequest(incremental: Bool = true) throws -> Data {
        try requireConnected()
        return RFBMessages.updateRequest(fullRectangle, incremental: incremental)
    }

    private var fullRectangle: RFBRectangle {
        RFBRectangle(x: 0, y: 0, width: framebuffer?.width ?? 0, height: framebuffer?.height ?? 0)
    }

    private func requireConnected() throws {
        guard state == .connected else { throw RFBError.notConnected }
    }

    private func advance(_ reader: inout RFBByteReader, output: inout [RFBOutput]) throws {
        switch step {
        case .version:
            try version(&reader, output: &output)
        case .security:
            try security(&reader, output: &output)
        case .challenge:
            let challenge = Data(try reader.take(16))
            guard let desEncryptor else { throw RFBError.unsupportedSecurity }
            let key = password.map(Self.reverseBits) + [UInt8](repeating: 0, count: 8 - password.count)
            let encrypted: Data
            do { encrypted = try desEncryptor.encrypt(challenge: challenge, key: Data(key)) }
            catch { throw RFBError.encryptionFailed }
            guard encrypted.count == 16 else { throw RFBError.encryptionFailed }
            output.append(.send(encrypted))
            step = .securityResult
        case .securityResult:
            let result = try reader.uint32()
            if result == 0 {
                clientInit(output: &output)
            } else if minorVersion >= 8 {
                step = .failureReason
            } else {
                throw RFBError.authenticationFailed("VNC authentication failed (\(result))")
            }
        case .failureReason:
            let length = try reader.length(maximum: RFBLimits.textBytes)
            let reason = String(decoding: try reader.take(length), as: UTF8.self)
            throw RFBError.authenticationFailed(reason)
        case .serverInit:
            try serverInit(&reader, output: &output)
        case .message:
            try message(&reader, output: &output)
        case .rectangleHeader(let count):
            let rect = RFBRectangle(x: try reader.uint16(), y: try reader.uint16(),
                                    width: try reader.uint16(), height: try reader.uint16())
            let encoding = Int32(bitPattern: try reader.uint32())
            if encoding == -223 {
                guard count == 1, rect.x == 0, rect.y == 0 else {
                    throw RFBError.invalidMessage("DesktopSize must be the final rectangle")
                }
                framebuffer = try Framebuffer(width: rect.width, height: rect.height)
                needsFullUpdate = true
                output.append(.event(.resized(width: rect.width, height: rect.height)))
                finishRectangle(remaining: count, output: &output)
            } else {
                if encoding != -239 { try framebuffer?.validate(rect) }
                guard [0, 1, 16, -239].contains(encoding) else {
                    throw RFBError.invalidMessage("Unsupported rectangle encoding: \(encoding)")
                }
                if encoding == -239 {
                    guard rect.width * rect.height <= RFBLimits.framebufferBytes / 4 else {
                        throw RFBError.limitExceeded
                    }
                    guard (rect.width == 0 || rect.x < rect.width),
                          (rect.height == 0 || rect.y < rect.height) else {
                        throw RFBError.invalidMessage("Cursor hotspot outside cursor")
                    }
                }
                step = .rectanglePayload(rect, encoding, count)
            }
        case .rectanglePayload(let rect, let encoding, let count):
            try rectangle(&reader, rect: rect, encoding: encoding, output: &output)
            finishRectangle(remaining: count, output: &output)
        case .failed:
            throw RFBReadError.incomplete
        }
    }

    private func version(_ reader: inout RFBByteReader, output: inout [RFBOutput]) throws {
        let bytes = try reader.take(12)
        guard Array(bytes[0..<4]) == Array("RFB ".utf8), bytes[7] == 46, bytes[11] == 10,
              bytes[4..<7].allSatisfy({ (48...57).contains($0) }),
              bytes[8..<11].allSatisfy({ (48...57).contains($0) }) else {
            throw RFBError.unsupportedVersion
        }
        let major = bytes[4..<7].reduce(0) { $0 * 10 + Int($1 - 48) }
        let minor = bytes[8..<11].reduce(0) { $0 * 10 + Int($1 - 48) }
        guard major == 3, minor >= 3 else { throw RFBError.unsupportedVersion }
        minorVersion = minor >= 8 ? 8 : (minor >= 7 ? 7 : 3)
        output.append(.send(Data("RFB 003.00\(minorVersion)\n".utf8)))
        step = .security
    }

    private func security(_ reader: inout RFBByteReader, output: inout [RFBOutput]) throws {
        let selected: UInt32
        if minorVersion == 3 {
            selected = try reader.uint32()
            if selected == 0 { step = .failureReason; return }
            guard selected == 1 || (selected == 2 && desEncryptor != nil) else {
                throw RFBError.unsupportedSecurity
            }
        } else {
            let count = Int(try reader.byte())
            if count == 0 { step = .failureReason; return }
            let offered = try reader.take(count)
            if offered.contains(2), desEncryptor != nil {
                selected = 2
            } else if offered.contains(1) {
                selected = 1
            } else {
                throw RFBError.unsupportedSecurity
            }
            output.append(.send(Data([UInt8(selected)])))
        }
        if selected == 2 {
            step = .challenge
        } else if minorVersion == 8 {
            step = .securityResult
        } else {
            // RFC 6143: None omits SecurityResult in RFB 3.3 and 3.7.
            clientInit(output: &output)
        }
    }

    private func clientInit(output: inout [RFBOutput]) {
        output.append(.send(Data([shared ? 1 : 0])))
        step = .serverInit
    }

    private func serverInit(_ reader: inout RFBByteReader, output: inout [RFBOutput]) throws {
        let width = try reader.uint16()
        let height = try reader.uint16()
        try reader.skip(16)
        let length = try reader.length(maximum: RFBLimits.nameBytes)
        let name = String(decoding: try reader.take(length), as: UTF8.self)
        framebuffer = try Framebuffer(width: width, height: height)
        let info = RFBServerInfo(width: width, height: height, name: name)
        serverInfo = info
        state = .connected
        step = .message
        output.append(.event(.connected(info)))
        output.append(.send(RFBMessages.setPixelFormat))
        output.append(.send(RFBMessages.setEncodings))
        output.append(.send(RFBMessages.updateRequest(fullRectangle, incremental: false)))
    }

    private func message(_ reader: inout RFBByteReader, output: inout [RFBOutput]) throws {
        switch try reader.byte() {
        case 0:
            try reader.skip(1)
            let count = try reader.uint16()
            framebuffer?.beginUpdate()
            if count == 0 { finishUpdate(output: &output) }
            else { step = .rectangleHeader(count) }
        case 1:
            try reader.skip(1)
            _ = try reader.uint16()
            let count = try reader.uint16()
            try reader.skip(count * 6)
        case 2:
            output.append(.event(.bell))
        case 3:
            try reader.skip(3)
            let length = try reader.length(maximum: RFBLimits.textBytes)
            let bytes = try reader.take(length)
            let text = String(String.UnicodeScalarView(bytes.map { UnicodeScalar(Int($0))! }))
            output.append(.event(.clipboard(text)))
        default:
            throw RFBError.invalidMessage("Unsupported server message")
        }
    }

    private func rectangle(_ reader: inout RFBByteReader, rect: RFBRectangle,
                           encoding: Int32, output: inout [RFBOutput]) throws {
        switch encoding {
        case 0:
            var pixels = try reader.take(rect.width * rect.height * 4)
            Self.makeOpaque(&pixels)
            try framebuffer?.write(pixels, to: rect)
        case 1:
            let x = try reader.uint16()
            let y = try reader.uint16()
            try framebuffer?.copy(fromX: x, fromY: y, to: rect)
        case 16:
            let length = try reader.length(maximum: RFBLimits.compressedBytes)
            let compressed = Data(try reader.take(length))
            let maximum = ZRLEDecoder.maximumInflatedSize(width: rect.width, height: rect.height)
            let inflated: Data
            do { inflated = try inflater.inflate(compressed, maximumOutputSize: maximum) }
            catch { throw RFBError.inflationFailed }
            guard inflated.count <= maximum else { throw RFBError.limitExceeded }
            let pixels = try ZRLEDecoder.decode(inflated, width: rect.width, height: rect.height)
            try framebuffer?.write(pixels, to: rect)
        case -239:
            let rowBytes = (rect.width + 7) / 8
            guard reader.remaining >= rect.width * rect.height * 4 + rowBytes * rect.height else {
                throw RFBReadError.incomplete
            }
            var pixels = try reader.take(rect.width * rect.height * 4)
            let mask = try reader.take(rowBytes * rect.height)
            for y in 0..<rect.height {
                for x in 0..<rect.width {
                    let visible = mask[y * rowBytes + x / 8] & (128 >> (x % 8)) != 0
                    pixels[(y * rect.width + x) * 4 + 3] = visible ? 255 : 0
                }
            }
            output.append(.event(.cursor(RFBCursor(hotspotX: rect.x, hotspotY: rect.y,
                                                  width: rect.width, height: rect.height, pixels: pixels))))
        default:
            throw RFBError.invalidMessage("Unsupported rectangle encoding")
        }
    }

    private func finishRectangle(remaining: Int, output: inout [RFBOutput]) {
        if remaining == 1 { finishUpdate(output: &output) }
        else { step = .rectangleHeader(remaining - 1) }
    }

    private func finishUpdate(output: inout [RFBOutput]) {
        output.append(.event(.framebufferUpdated(framebuffer?.dirtyRectangles ?? [])))
        output.append(.send(RFBMessages.updateRequest(fullRectangle, incremental: !needsFullUpdate)))
        needsFullUpdate = false
        step = .message
    }

    private static func makeOpaque(_ pixels: inout [UInt8]) {
        for index in stride(from: 3, to: pixels.count, by: 4) { pixels[index] = 255 }
    }

    private static func reverseBits(_ byte: UInt8) -> UInt8 {
        var result: UInt8 = 0
        for bit in 0..<8 { result = (result << 1) | ((byte >> bit) & 1) }
        return result
    }
}
