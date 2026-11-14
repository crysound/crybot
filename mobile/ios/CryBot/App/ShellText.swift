import Foundation

enum ShellText {
    static func value(_ key: String) -> String {
        NSLocalizedString(key, tableName: "Shell", bundle: .main, comment: "")
    }
}
