# Linux 沙箱自测

需要 PATH 中已有 Linux Swift 6 工具链（包使用 Swift 5 语言模式）、Bash、Node 和 GNU find/sort；工具链由协调者提供。脚本不下载工具链或 Swift 包依赖，不需要 Xcode、网络或 systemd。

在仓库根目录运行：

```sh
swift --version
mobile/ios/scripts/linux-test.sh
mobile/ios/scripts/linux-check.sh
TMPDIR="$PWD/mobile/ios/.linux-cache/tmp" node --test mobile/ios/scripts/*.test.mjs
```

两个 shell 脚本也能从其他工作目录用绝对路径调用。若工具链不在 PATH，先把协调者提供的工具链 `bin` 目录加入 PATH。找不到 `swift` 时两个脚本打印说明并返回 2；`linux-check.sh` 找不到 `swiftc` 或 Node 时也返回 2。 <!-- public-scan: allow domain -->

`linux-test.sh` 运行整个 Linux CryKit 测试集：CryCoreTests、CryNetLogicTests、CryRFBTests，不过滤测试。Package.swift 只在 Linux 上移除 CryNet 产品及 CryNet、CryNetTests target。默认使用两个构建任务；内存充裕时可设置 `CRY_SWIFT_JOBS=4`。

所有 Swift 子进程共用以下工作区内的路径；不会改变调用者 shell 的 HOME：

| 设置 | 相对仓库根目录的路径 |
| --- | --- |
| HOME | mobile/ios/.linux-cache/home |
| XDG_CACHE_HOME | mobile/ios/.linux-cache/xdg |
| CLANG_MODULE_CACHE_PATH | mobile/ios/.linux-cache/clang |
| SWIFTPM_MODULECACHE_OVERRIDE | mobile/ios/.linux-cache/modules |
| TMPDIR | mobile/ios/.linux-cache/tmp |
| --scratch-path | mobile/ios/.linux-build |
| --cache-path | mobile/ios/.linux-cache/swiftpm |
| --config-path | mobile/ios/.linux-cache/config |
| --security-path | mobile/ios/.linux-cache/security |

`linux-check.sh` 依次执行： <!-- public-scan: allow domain -->

1. 每个 iOS Swift 源文件的 `swiftc -swift-version 5 -parse`，包括 App、Watch 和所有测试。排除构建产物目录 `.linux-build`、`.linux-cache`、`.build`、`DerivedData`、`SourcePackages`。
2. 用相同缓存执行 `swift build --target CryCore`，通过 `--show-bin-path` 找到 `Modules`。每个 `CryBot/Features/*/Logic/` 目录的 Swift 文件一起做 `swiftc -typecheck -I …/Modules`，支持同目录类型互相引用；不同功能目录分别检查。CryCore 构建失败时不使用旧模块。
3. 在 CryBot 和 CryKit/Sources 中扫描六种类型声明，拒绝规格第 1.5 节的名字，并拒绝同一文件 import Markdown 和 SwiftUI。识别反引号标识符、多行声明、嵌套注释和字符串，允许使用系统类型或 scoped import。
4. 执行 `gen-strings.mjs --check`。

某个文件或步骤失败后继续后续检查，最后汇总源文件数、Logic 目录和文件数、失败数，返回 1。没有 Logic 文件时明确显示 0；这不等于验证了 App 的业务类型。编译器和命名检查输出文件、行、列；命令级故障补充入口文件第 1 行的位置。语法检查不能替代 Apple 平台类型检查，App、Watch、UI 的实际构建仍由 macOS Actions 负责。

常见错误：

- `Permission denied` / `Operation not permitted`：确认工作区可写，并直接使用这两个脚本；裸跑 SwiftPM 可能使用用户目录缓存。切换 Swift 工具链后，可删除工作区内 `.linux-build` 和 `.linux-cache` 再跑。
- Logic 中 `no such module SwiftUI/Security/CryptoKit`：纯逻辑只能依赖 Foundation 和 CryCore，把平台代码留在平台层。不要从检查里排除失败文件。
- `Out of date`：用 `node mobile/ios/scripts/gen-strings.mjs` 更新生成文案，然后再跑检查。如果生成文件不在任务允许修改的范围，报告协调者处理。
- 禁用类型名或 Markdown/SwiftUI 混用：重命名自定义类型，或把 Markdown 解析和 SwiftUI 绘制拆成不同文件。
- Node 测试找不到 `yaml`：检查协调者提供的 node_modules。它是仓库已有开发依赖；沙箱不要自行联网安装。Actions 使用仓库锁文件安装 Node 依赖。
- 测试全被跳过：查看 Swift 日志里的 executed/skipped 数；退出 0 本身不证明占位实现已经完成。

只用隔离夹具验证这些脚本，不启动用户的服务或访问真实数据。交回前保留两个脚本的完整标准输出、标准错误和退出码，并对比原 HOME 下 `~/.cache`、`~/.swiftpm` 的运行前后目录清单和文件元数据。
