## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1221-04 截图流水线与文案生成器

> 规格以仓库里的 `docs/specs/2026-11-14-ios-native.md` 为准，开工前先通读一遍（2026-11-14 已缩小范围：常用部分原生，其余内嵌网页，共 25 个任务）。任务 01 已合并，CryCore 已在 main 上：`mobile/ios/Packages/CryKit/Sources/CryCore/` 里有线上模型（`WireModels.swift` 等）、`ServerTextModels.swift`（服务端文案行 `ServerTextLine`，码加参数）、`LiveState.swift`、`Endpoint.swift`、`Transport.swift`。工程和 CI 上 01 已经做好：`project.yml` 有 `CryBotTests`（unit-test，宿主为 CryBot，只依赖 CryBot）和 `CryBotUITests`（ui-testing，`TEST_TARGET_NAME: CryBot`），scheme `CryBot` 的测试包含 CryBotTests、CryBotWatchTests、CryBotUITests；`knownRegions` 和 `CFBundleLocalizations` 列了 16 种语言（en、de、es、fr、hi、it、ja、ko、pl、pt-BR、ru、tr、uk、vi、zh-Hans、zh-Hant）；`CryBotTests/Placeholder.swift`（链接 CryCore 的冒烟测试）和 `CryBotUITests/Placeholder.swift`（`testFixtureAppLaunch`，直接 `XCTSkip`）。`.github/workflows/mobile.yml` 已是 macos-26、Xcode 26，有 concurrency、SPM 缓存、`Package.resolved` 复制、「Select iPhone 16 simulator」（没有就 `simctl create`，写出 `CRYBOT_TEST_SIMULATOR`）、`build-for-testing` 一次，之后对 CryBotTests 和 CryBotWatchTests 循环 `test-without-building`，每次用一段内联 python 检查 xcresult 的 `totalTestCount` 不为 0，最后上传 `crybot-mobile-tests`。还没有截图和 XCUITest 步骤。

## 依赖
- after：01（已合并）
- 估计：2 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读第 1、2、8、11 节和第 1.4 节入口表，以及第 1.3、4.4、8.1–8.3、11 节。
- 分支名：`T-1221-test-harness`
- 和 02、03 并行开发，三者改的文件不重叠（见「范围」）。

## 目标
App 内截图（静态页面）和 XCUITest 交互流程两条流水线都能在 Actions 上跑：PR 上只跑改到的功能，每晚跑全量和三种机型。内嵌网页模块的截图规则（只截原生入口和容器外框）落实到基类和文档里。同时提供从网页文案生成 iOS 字符串表的工具。

## 背景
- 截图方式已定（第 8.3 节）：静态页面在 CryBotTests 里用 `UIHostingController` 挂到给定尺寸的 `UIWindow`，`drawHierarchy(in:afterScreenUpdates:)` 出图。不用 `ImageRenderer`，它画不出 List、ScrollView 和 UIKit 包装视图。XCUITest 只留交互流程。
- 并行的 02 会实现启动参数 `-CryFixtureScenario`、`-CryAppearance`、`-CryGallery` 和 `AppStore.fixture(scenario:)`。本任务只按第 4.4 节的约定传启动参数，不依赖 02 的代码；02 还没合并时，App 启动出来的是旧的网页壳画面，交互截图截到它也算流水线跑通。
- 内嵌网页模块（第 9 节做法为「内嵌网页」的行，由 48 负责）：截图只截原生入口（`WebEntryMenu` 展开后的菜单、`WebMessageSummary` 摘要行、卡片上的「在网页里处理」按钮）和网页容器外框（夹具模式下加载本地占位页），不截网页内容。场景名用 `webhost-<入口>`（第 8.3 节）。
- 范围缩小后，`Features/` 下只会有这 19 个功能目录：Login、Avatar、Sidebar、Chat、Composer、Activity、Markdown、Code、Math、Media、CardsApproval、CardsRequests、CardsConnect、Records、MessageExtras、Group、Inbox、Desktop、WebHost。选择脚本和文档里不要写死已删除的功能名（Widget、Charts、Settings、Call 等）。
- 网页文案在 `src/locales/*.json`：16 个语言文件（de、en、es、fr、hi、it、ja、ko、pl、pt-br、ru、tr、uk、vi、zh、zh-tw），另有一个 `source-hashes.json` 不是语言文件。规格里写的「17 种」是旧数字，以实际的 16 个文件为准。文件名对应 Apple 语言代码：`zh` → `zh-Hans`、`zh-tw` → `zh-Hant`、`pt-br` → `pt-BR`，其余相同，和 `project.yml` 的 `knownRegions` 一致。服务端下发的文案码（`summaryCode`、`heldCode`、`ServerTextLine`）定义在 `shared/server-text.ts` 和 `shared/wire.ts`，引用的是网页文案键。

## 要做的事
1. `CryBotTests/Support/SnapshotCase.swift`：基类，提供 `snapshot(_ view: some View, feature: String, scene: String, sizes: [SnapshotSize] = .all, dynamicType: DynamicTypeSize? = nil)`。
   - 三种尺寸：`se` 375×667（上安全区 20）、`16` 393×852（上 59、下 34）、`promax` 440×956（上 62、下 34）。
   - 每种尺寸各出浅色和深色（设置 `overrideUserInterfaceStyle`），等一个 runloop 让布局和异步图片占位完成后再 `drawHierarchy`。
   - 图片名 `<功能>-<场景>-<se|16|promax>-<light|dark>`，其中「功能」取 `feature` 的小写（所以 WebHost 的图就是规格要求的 `webhost-<入口>-…`），存成 keepAlways 附件。`dynamicType` 为 `.accessibility2` 时名字加后缀 `-axl`。
   - 文档注释里写清内嵌网页模块的规则：只截入口和容器外框，场景名 `<入口>`（例如 `menu-global`、`menu-bot`、`summary-widget`、`container`），不截网页内容。
2. 选择开关：`SnapshotCase` 读环境变量 `CRY_SNAPSHOT_FEATURES`（CI 用 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 传入，逗号分隔或 `all`），和 `feature` 比较时不区分大小写；不包含本功能时 `XCTSkip`；变量不存在时（本地运行）全部执行。
3. `CryBotTests/Support/HarnessSnapshotTests.swift`：截一个含 List、ScrollView 和一个 `UIViewRepresentable` 的测试视图（`harness-basic`），以及它在 `-axl` 下的样子，证明 drawHierarchy 能画出这几类视图。
4. `CryBotUITests/Support/ScreenshotCase.swift`：XCUITest 基类，提供 `launch(scenario:appearance:)` 和 `snap(_ name:)`（可以另加带默认值的 `gallery:`、`contentSize:` 参数），图片名 `<功能>-<场景>-<机型>-<light|dark>`。`CryBotUITests/Support/HarnessFlowTests.swift`：启动 App，截一张 `harness-launch`。可以删掉 `CryBotUITests/Placeholder.swift`（它只会 skip）。
5. 改动选择脚本 `mobile/ios/scripts/ui-test-selection.sh`：输入 PR 的改动文件列表，输出两行：
   - 给 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 的功能名列表：改到 `CryBot/Features/<名字>/`、`CryBotTests/<名字>/`、`CryBotUITests/<名字>/` 时选 `<名字>`（`Support`、`Shell` 不算功能名）；
   - `-only-testing:CryBotUITests/<名字>FlowTests` 参数：只包含 `CryBotUITests/<名字>/` 目录确实存在的功能。
   - 改到 `CryBot/App`、`CryBot/Store`、`CryBot/Design`、`CryBot/Strings`、`CryBotTests/Support`、`CryBotUITests/Support`、`project.yml`、`Packages`、`Package.resolved` 时选全部（`all`，XCUITest 不加 `-only-testing`）。
   - 只改了 `mobile/ios` 以外的文件，或者没选中任何功能时：功能列表为空，不跑 XCUITest。
   - 脚本要有用法说明和一个能在 Linux 上跑的 bash 自测（`mobile/ios/scripts/ui-test-selection.test.sh`），覆盖上面每种情况，包括「只改 `Features/Inbox`」。
6. 零测试保护 `mobile/ios/scripts/assert-tests-ran.sh`：读 `xcrun xcresulttool get test-results summary` 的结果，选中了测试但实际执行数为 0 时失败。替换掉 `mobile.yml` 里现有的那段内联 python，CryBotTests、CryBotWatchTests、截图、XCUITest 都用它。全部 skip（例如功能列表为空时的截图测试）不算失败；要求「必须有执行」的步骤，由调用方传参数决定。
7. `mobile.yml`：
   - 在 01 的 `build-for-testing` 之后，把 CryBotTests 的运行改为带 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES`（由选择脚本算出）；再加 XCUITest 交互流程（只在 iPhone 16，用现有的「Select iPhone 16 simulator」步骤选出的设备，带 `-only-testing`；没有选中的 FlowTests 时跳过这一步）。
   - 用 `xcrun xcresulttool export attachments` 导出 PNG，上传产物 `ios-screenshots`。
   - main 上的 push 只跑编译和单元测试：`TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 设为空，不跑 XCUITest。
   - 不要动 01 已有的触发条件、concurrency、缓存、`Package.resolved` 和手表测试步骤，只在原有结构上加。
8. `ios-nightly.yml`（新建）：
   - 北京时间每天 03:17（cron 写 UTC：`17 19 * * *`）和手动触发；
   - 全部单元测试和全部 App 内截图（`all`）；
   - XCUITest 交互流程在 iPhone SE（第 3 代）、iPhone 16、iPhone 16 Pro Max 三个 destination 上各跑一遍（机型缺失时 `simctl create`；没有 SE 时退到 iPhone 16e，并在日志里打印出来）；
   - 每周一（北京时间）另跑一个 job：`xcodebuild -downloadPlatform iOS -buildVersion 18.x` 后在 iOS 18 模拟器上跑 CryBotTests，失败只标黄不阻塞（`continue-on-error`）。周一的判断写清楚（例如单独一条 `17 19 * * 0` 的 schedule，job 里按 `github.event.schedule` 区分）。
   - 产物同样叫 `ios-screenshots`；目标 90 分钟内跑完。
9. 文案生成器 `mobile/ios/scripts/gen-strings.mjs`（Node，不用第三方依赖）：
   - 扫描 `CryBot/Features/*/web-keys.json`（键名数组），从 `src/locales/*.json` 取出这些键的 16 种语言，写成同目录下的 `Web<名字>.xcstrings`；
   - 另外按 `shared/server-text.ts` 用到的文案命名空间生成 `CryBot/Strings/ServerText.xcstrings`；
   - 网页文案里的插值语法（`{{name}}` 之类）转成 iOS 的 `%@` 格式，并保留参数顺序（必要时用 `%1$@` 这种带位置的写法）；
   - 语言代码按「背景」里的对照表转换，跳过 `source-hashes.json`；
   - `--check` 模式只比对，不一致时退出码非 0，并打印该怎么更新。
   本任务不建任何功能目录的 `web-keys.json`（功能目录归各功能任务）；测试用临时目录里的假数据。
10. `CryBot/Strings/ServerTextRenderer.swift`：把 CryCore 的 `ServerTextLine`（码加参数）渲染成本地化字符串，读 `ServerText` 表；找不到键时退回服务端给的原文或码本身，不崩。
11. 为生成器写 Node 测试 `mobile/ios/scripts/gen-strings.test.mjs`（`node --test`），覆盖键缺失、插值转换和参数顺序、语言代码映射、`--check` 失败。
12. 在 `CryBotTests/Support/` 里给 `ServerTextRenderer` 写单元测试（这个测试类名不要以 `SnapshotTests` 结尾）。

## 范围
- 可以改：`mobile/ios/CryBotTests/Support/**`（新建）、`mobile/ios/CryBotUITests/Support/**`（新建）、`mobile/ios/CryBotUITests/Placeholder.swift`（可删除）、`mobile/ios/scripts/**`（新建；`linux-*.sh` 归任务 43，不要建）、`mobile/ios/CryBot/Strings/**`（新建）、`.github/workflows/mobile.yml`、`.github/workflows/ios-nightly.yml`（新建）
- 不要改：`project.yml`、`Packages/**`、`CryBot/App`、`Store`、`Design`、`Features`、`AppDelegate.swift`、`ViewController.swift`、`WatchSync.swift`、`CryBotTests/Placeholder.swift`、`CryBotTests/Shell/**`、其他工作流文件（`ci.yml` 归 00，`ios-linux.yml` 归 43，`public-scan.yml`、`release.yml` 不动）、网页和服务端代码。确实需要改时，在报告里说明原因，不要自己改。
- 和并行任务的边界（第 1.3 节）：02 改 `CryBot/App`、`Store`、`Design`、`Features`、`AppDelegate.swift`、`Assets.xcassets` 和 `CryBotTests/Shell`；03 只改 `Packages/CryKit` 里 CryNetLogic、CryNet 的源码和测试。本任务的路径和它们没有重叠。`mobile.yml` 在这一批里只有本任务改。

## 接口契约
功能任务和 48 会直接照这些写测试，名字写死：
- `SnapshotCase.snapshot(_:feature:scene:sizes:dynamicType:)`、`SnapshotSize`（`.se`、`.iPhone16` 或同等命名、`.proMax`，`[SnapshotSize].all`），测试类命名 `<名字>SnapshotTests`。
- `ScreenshotCase.launch(scenario:appearance:)`、`snap(_:)`，测试类命名 `<名字>FlowTests`，放 `CryBotUITests/<名字>/`。
- 环境变量 `CRY_SNAPSHOT_FEATURES`（CI 用 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 传入），产物名 `ios-screenshots`。
- `web-keys.json` 的格式（字符串数组）和生成的表名 `Web<名字>`；`ServerTextRenderer` 的公开方法。
- 在 `mobile/ios/scripts/README.md` 里写一页用法：怎么写截图测试、内嵌网页模块截什么、怎么用文案生成器。

## 验收标准
- [ ] Actions 上产物 `ios-screenshots` 里有 `harness-basic` 三种屏宽、深浅两色共 6 张，加 `-axl` 6 张，List 和 ScrollView 的内容都画出来了。
- [ ] PR 上 `Mobile builds` 30 分钟内跑完；协调者手动触发一次 `iOS nightly`，90 分钟内跑完，三种机型的 `harness-launch` 都在产物里。
- [ ] `node --test mobile/ios/scripts/gen-strings.test.mjs` 在沙箱里通过；`node mobile/ios/scripts/gen-strings.mjs --check` 在沙箱里退出码为 0（接进 `iOS Linux` 是 43 的事，在报告里写明命令给 43 用）。
- [ ] 选择脚本的 bash 自测在沙箱里通过，其中「只改 `Features/Inbox`」输出 `Inbox`、没有 XCUITest 被选中；本 PR 的日志显示选择结果为 `all`（因为改到了 `Support`）。
- [ ] 零测试保护有一次演示：选中一个不存在的 FlowTests 类时 job 失败（协调者在 PR 上临时演示，运行链接写进报告）。
- [ ] 单元测试覆盖「要做的事」里列出的逻辑，并在 Actions 上通过。
- [ ] 协调者推分支、开草稿 PR 后，`Mobile builds`、`iOS Linux`（43 合并后才有）和 `Public scan` 都是绿的；日志里本任务选中的测试数大于 0。运行链接由协调者补进报告。

## 约束
- 不要 git 提交。沙箱禁网，没有 Xcode：不要声称 Swift 代码「编译通过」或「测试通过」，截图和 XCUITest 以 GitHub Actions 的 `Mobile builds` 和 `iOS nightly` 为准。工作流文件也只能等 Actions 验证；可以在沙箱里用 Node 或 Python 解析一遍 YAML，确认格式没错。
- Linux 自查：`ServerTextRenderer` 以外的 Swift 文件都依赖 UIKit 和 XCTest，只能用 `/opt/swift/usr/bin/swiftc -parse` 查语法。缓存指到 `mobile/ios/.linux-cache/`（已在 `.gitignore`），命令写成脚本再调用，输出原样贴进报告。
- 需要新的依赖时，在报告里列出包名和版本，不要自己安装。只能用规格第 10 节列出的第三方依赖，其余一律用系统框架；Node 脚本不用第三方包。
- 公开仓库：代码、测试、夹具、注释和报告里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 并行开发：只改「可以改」里的路径；不改入口签名（规格第 1.4 节）；不改 `project.yml`，要加的行（例如字符串表的资源规则）写进报告（规格第 1.3 节的变更通道）。
- 类型命名遵守规格第 1.5 节：不和 SwiftUI、Foundation、`Shared/` 里的类型重名（例如不能叫 `TimelineView`、`Image`、`Data`、`ServerAddress`）。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。
- 只说已发生的事：报告里写「已验证」的，必须附 Actions 运行链接（由协调者补）。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1221-test-harness/report.md`（等于 `task-paths report T-1221-test-harness` 算出的路径）；各轮追加到同一个文件，保留前几轮的内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 Actions 验证。
3. 本任务完成了覆盖表（`server/testing/ios-contract/coverage.ts`）里的哪些项（只列出，不改那个文件）。
4. 需要协调者处理的事：`project.yml` 要加的行、给 43 的 `gen-strings --check` 命令、超出范围的改动、没解决的问题。
