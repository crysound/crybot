import Foundation

struct LaunchOptions: Equatable {
    enum Appearance: String { case light, dark }

    var fixtureScenario: String?
    var appearance: Appearance?
    var gallery: String?

    init(arguments: [String] = ProcessInfo.processInfo.arguments) {
        var index = 0
        while index < arguments.count {
            let flag = arguments[index]
            guard ["-CryFixtureScenario", "-CryAppearance", "-CryGallery"].contains(flag),
                  index + 1 < arguments.count, !arguments[index + 1].hasPrefix("-") else {
                index += 1
                continue
            }
            let value = arguments[index + 1]
            switch flag {
            case "-CryFixtureScenario": fixtureScenario = value
            case "-CryAppearance": appearance = Appearance(rawValue: value.lowercased())
            case "-CryGallery": gallery = value
            default: break
            }
            index += 2
        }
    }
}
