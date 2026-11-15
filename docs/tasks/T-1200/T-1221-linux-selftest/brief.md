## 运行环境（本机 Linux 沙箱，必读）
- 禁网、只能写工作区、没有 Xcode/macOS、不能用 systemd-run。PATH 上已有 Swift 6.3.3 Linux 工具链（先 `swift --version` 自查），本任务的两个脚本要在这里真实跑通，输出原样贴进报告。
- worktree 的 node_modules 已由协调者链好，`node --test` 可直接用（workflows.test.mjs 要 yaml 包）。
- 规格以 main 上的 `docs/specs/2026-11-14-ios-native.md` 为准（2026-11-14 已缩小范围，本任务内容和依赖没有变）。
- 分支名用 `T-1221-linux-selftest`（下文「建议分支名」作废）；报告路径用 `task-paths report T-1221-linux-selftest` 计算。
- 并行：任务 34（T-1221-rfb-core，只改 Sources/CryRFB 和 Tests/CryRFBTests）同时在把 CryRFB 从占位写成完整实现，不改它的文件；ios-linux.yml 照常跑全部三个测试 target，不为它特殊处理。
- `mobile/ios/.gitignore` 里 `.linux-build/`、`.linux-cache/` 已经有了，第 5 条核对即可，不用重复加。

# T-1221-43 Linux 自测通道

## 依赖
- after：01、04
- 估计：1.5 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读第 1、2、8、11 节和第 1.4 节入口表，以及第 1.5、8.1、8.5 节。
- 建议分支名：`t1221-43-linux-selftest`

## 目标
Astra 在没有 Xcode 的 Linux 沙箱里就能跑 CryCore、CryNetLogic、CryRFB 的 `swift test`，并对全部 Swift 文件做语法检查、对纯逻辑目录做类型检查、扫禁用类型名；同样的检查在 ubuntu runner 上每个 PR 跑一遍。

## 背景
开发环境（规格合同的约束）：Astra 的沙箱没有网络和 Xcode，只能写工作区；协调者在宿主机装好 Linux 版 Swift 工具链，派活时放进 PATH。SwiftPM 和 clang 默认把缓存写到 `~/.cache`、`~/.swiftpm` 等工作区外的位置，在沙箱里会失败，所以所有缓存目录都要指到工作区里（规格第 8.5 节）。
任务 01 建好了 `Packages/CryKit/Package.swift`（CryCore、CryNetLogic、CryNet、CryRFB 和四个测试 target）。CryNet 和 CryNetTests 依赖 Security、CryptoKit，在 Linux 上编不过，要用 `#if os(Linux)` 去掉。任务 04 建了 `mobile/ios/scripts/`（`gen-strings.mjs` 等），本任务只加 `linux-*.sh` 和命名检查脚本。ubuntu runner 自带 Swift，`ios-linux.yml` 直接用。

## 要做的事
1. `Package.swift`：只做一处修改，用 `#if os(Linux)` 在 Linux 上去掉 CryNet 和 CryNetTests 两个 target 及其产品，其余不变。
2. `mobile/ios/scripts/linux-test.sh`：设置 `HOME`、`XDG_CACHE_HOME`、`CLANG_MODULE_CACHE_PATH`、`SWIFTPM_MODULECACHE_OVERRIDE` 指到 `mobile/ios/.linux-cache/` 下，运行 `swift test --package-path mobile/ios/Packages/CryKit --scratch-path mobile/ios/.linux-build --cache-path mobile/ios/.linux-cache/swiftpm --config-path mobile/ios/.linux-cache/config --security-path mobile/ios/.linux-cache/security`，`--disable-sandbox` 视需要加。PATH 上没有 `swift` 时打印说明并退出码 2。
3. `mobile/ios/scripts/linux-check.sh`：(1) 对 `mobile/ios` 下全部 `.swift` 文件跑 `swiftc -parse`；(2) 先用 linux-test 的缓存编出 CryCore 的模块，再把每个 `CryBot/Features/*/Logic/*.swift` 连同 CryCore 一起 `swiftc -typecheck`（`-I` 指向编出的模块目录）；(3) 运行命名检查；(4) 运行 `node mobile/ios/scripts/gen-strings.mjs --check`。每一步失败都打印文件和行号，最后汇总。
4. 命名检查 `mobile/ios/scripts/check-type-names.mjs`（Node，无依赖）：扫 `mobile/ios/CryBot` 和 `Packages/CryKit/Sources` 下的 `struct|enum|class|actor|protocol|typealias` 声明，名字在规格第 1.5 节禁用名单里就失败；另检查 `import Markdown` 和 `import SwiftUI` 不在同一个文件里。名单写在脚本里，附 `node --test` 测试。
5. `mobile/ios/.gitignore` 加 `.linux-build/`、`.linux-cache/`。
6. `.github/workflows/ios-linux.yml`（新建，ubuntu）：PR 改到 `mobile/ios/**`、`shared/**`、`src/locales/**` 时触发；`swift --version`；`linux-test.sh`；`linux-check.sh`；`node --test` 跑本任务和 04 的 Node 测试。 <!-- public-scan: allow domain -->
7. 在 `mobile/ios/README.md` 里不写；把沙箱用法（PATH、两个脚本、常见错误）写进 `mobile/ios/scripts/README-linux.md`。

## 范围
- 可以改：`mobile/ios/Packages/CryKit/Package.swift`（只加 Linux 条件）、`mobile/ios/scripts/linux-test.sh`、`linux-check.sh`、`check-type-names.mjs`、`check-type-names.test.mjs`、`README-linux.md`（新建）、`mobile/ios/.gitignore`、`.github/workflows/ios-linux.yml`（新建） <!-- public-scan: allow domain -->
- 不要改：`mobile/ios/Packages/CryKit/Sources/**`、`Tests/**`、`project.yml`、`mobile.yml`、`ci.yml`、`CryBot/**`、服务端和网页代码。确实需要改时，在汇报里说明原因，不要自己改。

## 验收标准
- [ ] `iOS Linux` 工作流在 PR 上是绿的：CryCoreTests、CryNetLogicTests、CryRFBTests 都在 Linux 上执行（日志里有测试数），语法检查、类型检查、命名检查和 `gen-strings --check` 都通过。
- [ ] 协调者在本机沙箱里（禁网、只写工作区）跑一次 `linux-test.sh` 和 `linux-check.sh`，通过，且工作区外没有新写入的缓存文件（运行前后对比 `~/.cache`、`~/.swiftpm`）。 <!-- public-scan: allow domain -->
- [ ] 命名检查的测试覆盖：声明 `struct TimelineView` 失败；同时 import Markdown 和 SwiftUI 失败。
- [ ] `Mobile builds` 仍然是绿的（Package.swift 的改动不影响 macOS）。
- [ ] 单元测试覆盖「要做的事」里列出的逻辑，并在 Actions 上通过。
- [ ] 协调者推分支、开草稿 PR 后，`Mobile builds`、`iOS Linux`（43 合并后才有）和 `Public scan`（45 合并后才有）都是绿的；日志里本任务选中的测试数大于 0。运行链接由协调者补进报告。

## 约束
- 不要 git 提交。沙箱禁网，没有 Xcode：不要声称「编译通过」或「测试通过」。如果 PATH 上有 `swift`，按规格第 8.5 节的参数跑 `swift test`（`--scratch-path`、`--cache-path`、`--config-path`、`--security-path` 和 `XDG_CACHE_HOME`、`CLANG_MODULE_CACHE_PATH`、`HOME` 都指到 `mobile/ios/.linux-cache/` 或 `.linux-build/` 下），把输出原样贴进汇报；没有就写明只能等 Actions。
- 需要新的依赖时，在汇报里列出包名和版本，不要自己安装。只能用规格第 10 节列出的第三方依赖，其余一律用系统框架。
- 公开仓库：代码、测试、夹具、注释里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 并行开发：只改「可以改」里的路径；不改入口签名（规格第 1.4 节）；不改 `project.yml`，要加的行写进汇报（规格第 1.3 节的变更通道）。
- 类型命名遵守规格第 1.5 节：不和 SwiftUI、Foundation、`Shared/` 里的类型重名（例如不能叫 `TimelineView`、`ServerAddress`、`SendResult`）。
- SwiftUI 代码拆成小视图，少用复杂的泛型和长链式表达式，降低在没有编译器的情况下出错的概率。纯逻辑放 `Features/<名字>/Logic/`，只 import Foundation 和 CryCore，这样能在 Linux 上先做类型检查。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-<桶>/<分支名>/report.md`（用 `task-paths report <分支名>` 计算）；各轮追加到同一文件，保留前轮内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 Actions 验证。
3. 本任务完成了覆盖表（`server/testing/ios-contract/coverage.ts`）里的哪些项（只列出，不改那个文件）。
4. 需要协调者处理的事：依赖、`project.yml` 要加的行、超出范围的改动、入口签名修改、没解决的问题。
