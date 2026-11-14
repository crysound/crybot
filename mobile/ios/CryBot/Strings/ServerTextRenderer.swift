import Foundation
import CryCore

/// Resolves server text codes through the generated ServerText catalog.
public struct ServerTextRenderer {
    private let bundle: Bundle

    public init(bundle: Bundle = .main) {
        self.bundle = bundle
    }

    public func render(_ line: ServerTextLine, fallback: String? = nil) -> String {
        guard let code = line.textCode, !code.isEmpty else { return fallback ?? "" }
        let template = bundle.localizedString(forKey: code, value: nil, table: "ServerText")
        let source = template == code ? fallback ?? line.additionalFields["text"]?.stringValue ?? line.additionalFields["message"]?.stringValue ?? code : template
        return substitute(source, params: line.textParams ?? [:])
    }

    private func substitute(_ template: String, params: ServerTextParams) -> String {
        let values = params.keys.sorted().compactMap { params[$0] }
        let regex = try? NSRegularExpression(pattern: "%([0-9]+\\$)?@")
        let range = NSRange(template.startIndex..<template.endIndex, in: template)
        var output = template
        let matches = regex?.matches(in: template, range: range) ?? []
        for (ordinal, match) in matches.reversed().enumerated() {
            let marker: String
            if match.range(at: 1).location == NSNotFound { marker = "" }
            else { marker = (template as NSString).substring(with: match.range(at: 1)) }
            let position = marker.isEmpty
                ? (values.count == 1 ? 0 : matches.count - 1 - ordinal)
                : (Int(marker.dropLast()) ?? 1) - 1
            guard values.indices.contains(position) else { continue }
            let value: String
            switch values[position] {
            case .string(let text): value = text
            case .number(let number): value = String(number)
            case .unknown(_, let raw): value = raw.stringValue ?? ""
            }
            if let swiftRange = Range(match.range, in: output) { output.replaceSubrange(swiftRange, with: value) }
        }
        return output
    }
}
