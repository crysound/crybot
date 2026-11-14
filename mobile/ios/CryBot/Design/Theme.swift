import SwiftUI

enum Theme {
    static let background = Color("ThemeBackground")
    static let panel = Color("ThemePanel")
    static let raised = Color("ThemeRaised")
    static let card = Color("ThemeCard")
    static let inset = Color("ThemeInset")
    static let control = Color("ThemeControl")
    static let hairline = Color("ThemeHairline")
    static let ink = Color("ThemeInk")
    static let secondaryInk = Color("ThemeSecondaryInk")
    static let tertiaryInk = Color("ThemeTertiaryInk")
    static let accent = Color("ThemeAccent")
    static let accentText = Color("ThemeAccentText")
    static let brand = Color("ThemeBrand")
    static let success = Color("ThemeSuccess")
    static let danger = Color("ThemeDanger")
    static let warning = Color("ThemeWarning")
    static let composer = Color("ThemeComposer")
    static let userBubble = Color("ThemeUserBubble")
    static let userBubbleInk = Color("ThemeUserBubbleInk")

    enum Fonts {
        static let title: Font = .title2
        static let headline: Font = .headline
        static let body: Font = .body
        static let caption: Font = .caption
        static let code: Font = .system(.body, design: .monospaced)
    }

    enum Spacing {
        static let tiny: CGFloat = 4
        static let small: CGFloat = 8
        static let medium: CGFloat = 16
        static let large: CGFloat = 24
        static let extraLarge: CGFloat = 32
    }

    enum Radius {
        static let small: CGFloat = 6
        static let control: CGFloat = 8
        static let card: CGFloat = 12
        static let dialog: CGFloat = 16
        static let bubble: CGFloat = 18
        static let composer: CGFloat = 22
    }
}
