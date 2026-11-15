import Foundation

public struct Framebuffer: Equatable, Sendable {
    public private(set) var width: Int
    public private(set) var height: Int
    public private(set) var pixels: [UInt8]
    public private(set) var dirtyRectangles: [RFBRectangle] = []

    init(width: Int, height: Int) throws {
        guard width > 0, height > 0,
              width <= 65535, height <= 65535,
              width * height <= RFBLimits.framebufferBytes / 4 else {
            throw RFBError.limitExceeded
        }
        self.width = width
        self.height = height
        pixels = [UInt8](repeating: 0, count: width * height * 4)
        for offset in stride(from: 3, to: pixels.count, by: 4) { pixels[offset] = 255 }
    }

    func validate(_ rect: RFBRectangle) throws {
        guard rect.x >= 0, rect.y >= 0, rect.width > 0, rect.height > 0,
              rect.x <= width, rect.y <= height,
              rect.width <= width - rect.x, rect.height <= height - rect.y else {
            throw RFBError.invalidMessage("Rectangle outside framebuffer")
        }
    }

    mutating func beginUpdate() {
        dirtyRectangles.removeAll(keepingCapacity: true)
    }

    mutating func write(_ source: [UInt8], to rect: RFBRectangle) throws {
        try validate(rect)
        guard source.count == rect.width * rect.height * 4 else {
            throw RFBError.invalidMessage("Invalid pixel count")
        }
        let rowBytes = rect.width * 4
        for row in 0..<rect.height {
            let destination = ((rect.y + row) * width + rect.x) * 4
            let start = row * rowBytes
            pixels.replaceSubrange(destination..<(destination + rowBytes), with: source[start..<(start + rowBytes)])
        }
        dirtyRectangles.append(rect)
    }

    mutating func copy(fromX: Int, fromY: Int, to rect: RFBRectangle) throws {
        try validate(rect)
        try validate(RFBRectangle(x: fromX, y: fromY, width: rect.width, height: rect.height))
        let rowBytes = rect.width * 4
        var source: [UInt8] = []
        source.reserveCapacity(rowBytes * rect.height)
        for row in 0..<rect.height {
            let start = ((fromY + row) * width + fromX) * 4
            source.append(contentsOf: pixels[start..<(start + rowBytes)])
        }
        try write(source, to: rect)
    }
}
