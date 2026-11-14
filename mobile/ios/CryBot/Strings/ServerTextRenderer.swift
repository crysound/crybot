import Foundation
import CryCore

public struct ServerTextRenderer {
    private let bundle: Bundle
    private let locale: Locale

    public init(bundle: Bundle = .main, locale: Locale? = nil) {
        self.bundle = bundle
        self.locale = locale ?? Locale(identifier: bundle.preferredLocalizations.first ?? "en")
    }

    public func render(_ line: ServerTextLine, fallback: String? = nil) -> String {
        let original = fallback ?? line.additionalFields["text"]?.stringValue ?? line.additionalFields["message"]?.stringValue
        guard let code = line.textCode, !code.isEmpty else { return original ?? "" }
        let params = line.textParams ?? [:]
        if let template = template(code, in: bundle),
           let values = wordedParams(params, in: bundle),
           let rendered = substitute(template, values: values) {
            return rendered
        }
        if let original { return original }
        let root = bundle.bundleURL.pathExtension == "lproj" ? bundle.bundleURL.deletingLastPathComponent() : bundle.bundleURL
        if let english = Bundle(url: root.appendingPathComponent("en.lproj")),
           let template = template(code, in: english),
           let values = wordedParams(params, in: english),
           let rendered = substitute(template, values: values) {
            return rendered
        }
        return code
    }

    private func template(_ key: String, in bundle: Bundle) -> String? {
        let value = bundle.localizedString(forKey: key, value: nil, table: "ServerText")
        return value == key ? nil : value
    }

    private func wordedParams(_ params: ServerTextParams, in bundle: Bundle) -> [String: String]? {
        var values: [String: String] = [:]
        for (name, value) in params {
            switch value {
            case .string(let text):
                if ["limit", "meanwhile", "why"].contains(name),
                   text.range(of: #"^(?:chat\.notice|routines\.server)\.part\.\w+$"#, options: .regularExpression) != nil {
                    guard let part = template(text, in: bundle) else { return nil }
                    values[name] = part
                } else {
                    values[name] = text
                }
            case .number(let number):
                values[name] = number == 0 ? "0" : number.isFinite && number.rounded() == number
                    ? String(format: "%.0f", locale: Locale(identifier: "en_US_POSIX"), number)
                    : String(number)
            case .unknown(_, let raw):
                values[name] = raw.stringValue
            }
        }
        if case .number(let milliseconds) = params["resetsAt"],
           case .string(let zone) = params["timeZone"] {
            guard milliseconds.isFinite, let timeZone = TimeZone(identifier: zone) else { return nil }
            let format = Date.FormatStyle(locale: locale, timeZone: timeZone)
                .month(.abbreviated).day().hour(.twoDigits(amPM: .abbreviated)).minute(.twoDigits)
            values["resets"] = "\(Date(timeIntervalSince1970: milliseconds / 1000).formatted(format)) (\(zone))"
        }
        return values
    }

    private func substitute(_ template: String, values: [String: String]) -> String? {
        guard let regex = try? NSRegularExpression(pattern: #"\{([A-Za-z0-9_.-]+)\}"#) else { return nil }
        let matches = regex.matches(in: template, range: NSRange(template.startIndex..., in: template))
        var output = template
        for match in matches.reversed() {
            let name = (template as NSString).substring(with: match.range(at: 1))
            guard let value = values[name], let range = Range(match.range, in: output) else { return nil }
            output.replaceSubrange(range, with: value)
        }
        return output
    }
}
