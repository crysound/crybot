// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "CryKit",
    platforms: [.iOS(.v17), .macOS(.v14), .watchOS(.v10)],
    products: [
        .library(name: "CryCore", targets: ["CryCore"]),
        .library(name: "CryNetLogic", targets: ["CryNetLogic"]),
        .library(name: "CryNet", targets: ["CryNet"]),
        .library(name: "CryRFB", targets: ["CryRFB"])
    ],
    targets: [
        .target(name: "CryCore"),
        .target(name: "CryNetLogic", dependencies: ["CryCore"]),
        .target(name: "CryNet", dependencies: ["CryCore", "CryNetLogic"]),
        .target(name: "CryRFB"),
        .testTarget(name: "CryCoreTests", dependencies: ["CryCore"], resources: [.copy("Fixtures")]),
        .testTarget(name: "CryNetLogicTests", dependencies: ["CryNetLogic"]),
        .testTarget(name: "CryNetTests", dependencies: ["CryNet"]),
        .testTarget(name: "CryRFBTests", dependencies: ["CryRFB"])
    ],
    swiftLanguageModes: [.v5]
)

#if os(Linux)
package.products.removeAll { $0.name == "CryNet" }
package.targets.removeAll { $0.name == "CryNet" || $0.name == "CryNetTests" }
#endif
