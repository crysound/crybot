# T-1221-01 协议层与工程基础

## 依赖
- after：无
- 估计：3 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读第 1、2、8、11 节和第 1.4 节入口表，以及第 1、2、3、4.2、10、14 节。
- 建议分支名：`t1221-01-core-protocol`

## 目标
新增本地 Swift 包 CryKit：CryCore 里有完整的线上模型（能往返编码）、共用 ID 和枚举、SSE 解析、状态归并和请求描述；工程文件、依赖、entitlements 和 CI 一次配齐，后面所有任务都在它上面并行。

## 背景
现在的 iOS App（`mobile/ios`）是 WKWebView 壳，由 XcodeGen 的 `project.yml` 生成工程（`.xcodeproj` 不进仓库，见 `mobile/ios/.gitignore`），有 CryBot、CryBotWatch、CryBotWatchTests 三个 target，bundle id `com.crysound.crybot`，URL scheme `crybot`。手表已经用原生方式调接口，可以参考：`mobile/ios/Shared/WatchContract.swift`、`mobile/ios/CryBotWatch/APIClient.swift`、`mobile/ios/CryBotWatchTests/*`（用 URLProtocol 做假接口）。注意 `Shared/` 会编进 CryBot，里面已有 `LoginCookies`、`ServerAddress`、`WatchAPIError`、`WatchRequest`、`BotList`、`MessagePage`、`SendMessage`、`SendResult`、`WatchBot`、`WatchCredentials`、`WatchMessage`，CryKit 不能用这些名字（规格第 1.5 节）。
TS 端的模型：`shared/wire.ts`（`WireMessage` 在 :455 附近，`OptionCardData` 在 :645 附近，`ServerFrame` 联合在 :958-1000，判别字段都是 `kind`）、`shared/runtime-events.ts`、`shared/widget.ts`、`shared/data-surface.ts`、`shared/server-text.ts`，以及 `wire.ts` import 进来的混入类型文件。机器人面板页 id 在 `src/components/bot-panel/page-registry.ts`。状态归并规则参考 `src/state/store.tsx` 和 `src/lib/live-events.ts`。
CI：`.github/workflows/mobile.yml` 目前用 macos-15 和默认 Xcode；`release.yml` 的 ios job 用 macos-26 和 Xcode 26，要统一成后者。
任务 00 会往 `Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/` 写服务端生成的样本和 `index.json`，本任务不要往这个目录写文件。

## 要做的事
1. `mobile/ios/Packages/CryKit/Package.swift`：`swift-tools-version:6.0`，`swiftLanguageModes: [.v5]`，平台 iOS 17、macOS 14、watchOS 10。四个库 target：CryCore；CryNetLogic（依赖 CryCore，纯 Foundation，先放占位文件）；CryNet（依赖 CryCore、CryNetLogic，先放占位文件）；CryRFB（纯 Foundation，先放占位文件）。四个测试 target：CryCoreTests（`resources: [.copy("Fixtures")]`）、CryNetLogicTests、CryNetTests、CryRFBTests。CryKit 自己不依赖任何远程包。
2. CryCore 只 import Foundation；用到 `URLRequest`、`URLSession` 类型的文件加 `#if canImport(FoundationNetworking)\nimport FoundationNetworking\n#endif`，保证以后能在 Linux 上 `swift test`。
3. CryCore 模型：照规格第 2 节写 Codable 模型，覆盖 `shared/wire.ts`（含 `WireMessage` 的全部可选字段和 `OptionCardData` 的全部可选字段及混入）、`runtime-events.ts`、`widget.ts`（31 种节点）、`data-surface.ts`、`server-text.ts`。字段名与 TS 一致。`ServerFrame`、`WireMessage` 按 `kind` 判别，联合类型用带 `unknown(kind: String, raw: JSONValue)` 兜底的枚举。另写通用的 `JSONValue`。
4. 规格第 1.6 节列给 CryCore 的共用类型：`BotID`、`GroupID`、`ThreadID`、`MessageID`、`PhoneDeviceID` 类型别名，`WireAttachment`、`DataRow`、`DataCardRef`、`PanelPageID`（照 `page-registry.ts` 的 26 个 `PageId`，带 `unknown` 兜底）、`PanelTarget`、`BotSettingsSection`、`SettingsPageID`、`RequestCardKind`。
5. `RequestCardKind.classify(_ card: OptionCardData) -> RequestCardKind`：按规格第 2 节的优先级判断卡片种类，优先级和归属任务（15 或 16）写成表放在代码注释里。
6. 在 CryCore 里写 `index.json` 用到的全部类型名：`WireMessage`、`WireBot`、`WireGroup`、`BotsSnapshot`、`ThreadPage`、`SendResponse`、`ServerFrame`、`RuntimeEvent`、`WidgetNode`、`CryChartSpec`、`OptionCardData`、`InboxPage`、`InboxCount`、`NotificationsPage`、`ConfigResponse`、`EnvironmentInfo`、`AuthSession`、`APIError`。
7. 往返：每个模型都能解码再编码。每个类型可以声明 `static let ignoredKeys: Set<String>`（默认空），写进去的键要在代码注释里说明为什么不需要。
8. SSE 解析器 `SSEParser`：可以增量喂入字节，按行解析 `event:`、`data:`、`id:` 和多行 data，输出 `ServerFrame`。
9. 状态归并 `LiveState`：`mutating func apply(_ frame: ServerFrame)` 和 `load(snapshot:)`。按规格第 4.2 节的表，凡是标「LiveState 归并」的帧都要处理：快照、`sections`、`bot`、`bot.deleted`、`bots.order`、`group`、`group.deleted`、`groups.order`、`presence`、`config`、`message`、`message.patch`、`thread`、`bot.queued`、`runtime`（`content.delta` 累加成流式文本、`item.*` 更新运行项、`request.opened/resolved`）、`notify`、`notifications.read`、`computer`、`computer-control`、`live.call`、`screen`（按机器人存最新一帧）。其余帧不改状态，计数。
10. `Endpoint<Response>` 和核心接口：快照、历史（before/around/limit）、单聊和群聊发送、respond（allow/deny/answer）、interrupt、已读、表情、收件箱、通知、配置、environment、`auth/session`、`auth/pair`、`auth/email/start|verify`、上传图片和文件、下载附件和消息文件。
11. `Transport` 协议（CryCore）：`send<R>(_ endpoint: Endpoint<R>) async throws -> R`、`events(since: String?, screens: Bool) -> AsyncThrowingStream<ServerFrame, Error>`、`upload(...)`、`download(...)`、`webSocket(path:) async throws -> WebSocketChannel`。另定义 `WebSocketChannel` 协议。只写协议，实现由 02 和 03 写。
12. CryCoreTests：手写夹具放 `Tests/CryCoreTests/Fixtures/manual/`（可以照搬手表测试里的样例，地址改成 example.com）。契约测试读 `Fixtures/contract/index.json`；文件不存在时 `XCTSkip`；存在时按 `swiftType` 查注册表逐个解码，遇到注册表里没有的 swiftType 要失败；每个样本再编码一次，和原 JSON 逐键比较，除 `ignoredKeys` 外有键丢失或值不同就失败（往返比较）。另测 SSE 解析（分包、多行、注释行）、LiveState 归并（第 4.2 节表里每类帧至少一个用例）、`RequestCardKind.classify`（每种至少一个用例）和 Endpoint 拼出的 URL 与请求体。
13. `project.yml`（之后只经规格第 1.3 节的变更通道改，所以这次写全）：iOS 最低 17.0；加 CryKit 本地包和规格第 10 节的远程包（swift-markdown、SwiftMath、HighlightSwift、LiveKit client-sdk-swift，各锁一个具体版本，版本号写进汇报由协调者核对）；CryBot 依赖 CryCore、CryNetLogic、CryNet、CryRFB 和这些包的产品，其中 LiveKit 显式列 `LiveKit` 和 `LiveKitWebRTC` 两个产品；新增 `CryBotTests`（unit-test，宿主为 CryBot）和 `CryBotUITests`（ui-testing），各放一个占位测试；Info.plist 加相机、麦克风、相册读取、相册写入说明、`UIBackgroundModes: [audio]`、可选的 `CRYBOT_API_URL` 键；保留现有 `CRYBOT_SERVER_URL`、`CRYBOT_LOGIN_HOSTS`、`crybot` URL scheme 和手表配置。
14. 保留 T-1220（App Links / Universal Links）的工程设置，一个都不能丢（规格第 14 节）：全局构建参数 `CRYBOT_APP_LINK_HOST: ""` 和 `CRYBOT_IOS_ENTITLEMENTS: CryBot/CryBot.entitlements`（默认值照本规格，不用 T-1220 的空值）；CryBot target 的 `CODE_SIGN_ENTITLEMENTS: $(CRYBOT_IOS_ENTITLEMENTS)`；Info.plist 的 `CRYBOT_APP_LINK_HOST: $(CRYBOT_APP_LINK_HOST)` 键。T-1220 的 iOS 部分（`project.yml`、entitlements、`ViewController.swift`）一律归本任务：T-1222 任务 02 只并 T-1220 的服务端和安卓改动、不碰 `mobile/ios`，两个任务互不依赖、谁先合都行。所以 main 上一般没有这几项，照这里的写法加上（已有就保留），并在汇报里写明。T-1220 对 `ViewController.swift` 的改动不搬：任务 02 会删掉这个文件，它的接力回调行为由任务 03 在 CryNet 里接手。不要另起 `CRYBOT_LINK_DOMAIN`、`CRYBOT_ENTITLEMENTS_FILE` 之类的新名字。
15. 本地化：`options.developmentLanguage: en`，工程的 `knownRegions` 和 Info.plist 的 `CFBundleLocalizations` 显式列出 `src/locales/*.json` 对应的 17 种语言（文件名到 Apple 语言代码的对照写进汇报）。
16. entitlements（规格第 14 节）：一个 target 只能用一个 entitlements 文件，所以 keychain 共享组两份都要写。`CryBot/CryBot.entitlements`（新建）只写 `keychain-access-groups: [$(AppIdentifierPrefix)com.crysound.crybot.shared]`；`CryBot/CryBot-AppLinks.entitlements` 沿用 T-1220 的文件名和内容 `com.apple.developer.associated-domains: [applinks:$(CRYBOT_APP_LINK_HOST), webcredentials:$(CRYBOT_APP_LINK_HOST)]`，再加同样的 `keychain-access-groups`（main 上没有这个文件时由本任务新建）。由 `CRYBOT_IOS_ENTITLEMENTS` 选用哪一份，默认值 `CryBot/CryBot.entitlements`；AppLinks 那份只在发版时、描述文件打开 Associated Domains 后由协调者选用（T-1222 任务 09 和本规格任务 41），本任务不启用。
17. `mobile.yml`（规格第 8.1、8.2 节）：macos-26，显式选 Xcode 26；push 只在 main 上触发，pull_request 只看 `mobile/ios/**` 和 `.github/workflows/mobile.yml`（`shared/**`、`src/locales/**` 不再触发）；`concurrency: { group: mobile-${{ github.ref }}, cancel-in-progress: true }`；`xcodegen generate` 后如果有 `mobile/ios/Package.resolved` 就复制到 `CryBot.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/`，有它时加 `-disableAutomaticPackageResolution`，没有时把解析结果上传为产物 `package-resolved`；`-clonedSourcePackagesDirPath SourcePackages` 并按 `Package.resolved` 哈希缓存 `SourcePackages`；先 `swift test --package-path mobile/ios/Packages/CryKit`，再 `xcodebuild build-for-testing` 一次，之后 CryBotTests、CryBotWatchTests 都用 `test-without-building`。截图和 XCUITest 步骤留给任务 04。
18. 保持现有 App 能编译：本任务不改 `CryBot/` 下的 Swift 文件。

## 范围
- 可以改：`mobile/ios/Packages/CryKit/**`（`Tests/CryCoreTests/Fixtures/contract/` 除外）、`mobile/ios/project.yml`、`mobile/ios/CryBot/CryBot.entitlements`（新建）、`mobile/ios/CryBot/CryBot-AppLinks.entitlements`（沿用 T-1220 的内容加 keychain 组，没有就新建）、`mobile/ios/CryBotTests/Placeholder.swift`、`mobile/ios/CryBotUITests/Placeholder.swift`（新建）、`.github/workflows/mobile.yml`、`mobile/ios/.gitignore`（只加 `.linux-cache/`、`.linux-build/` 两行）
- 不要改：`mobile/ios/CryBot/` 下的 Swift 文件、`CryBotWatch/**`、`Shared/**`、服务端和网页代码。确实需要改时，在汇报里说明原因，不要自己改。

## 验收标准
- [ ] Actions 上 CryKit 的 `swift test` 通过，CryCoreTests 里第 4.2 节每类帧、每种 kind 至少有一个解码用例。
- [ ] 如果 00 已合并：契约样本全部解码成功，往返比较通过；否则契约测试显示为跳过。
- [ ] App、手表、CryBotTests、CryBotWatchTests 在 Actions 上编译和测试通过；日志显示只编译了一次（`build-for-testing`），后面都是 `test-without-building`。
- [ ] CryCore、CryNetLogic、CryRFB 的源码里没有 Foundation 和 FoundationNetworking 以外的 import（用 grep 检查）。
- [ ] CryKit 里没有规格第 1.5 节禁用的类型名（用 grep 检查 `struct|enum|class|protocol|typealias` 声明）。
- [ ] `mobile.yml` 用的是 macos-26 和 Xcode 26，push 只在 main 上触发，有 concurrency 设置；第一次运行的产物 `package-resolved` 由协调者提交为 `mobile/ios/Package.resolved`，提交后的运行走 `-disableAutomaticPackageResolution`。
- [ ] `project.yml` 里能 grep 到 `CRYBOT_APP_LINK_HOST`（构建参数和 Info.plist 键）、`CRYBOT_IOS_ENTITLEMENTS: CryBot/CryBot.entitlements`、`CODE_SIGN_ENTITLEMENTS: $(CRYBOT_IOS_ENTITLEMENTS)`；整个 `mobile/ios` 里 grep 不到 `CRYBOT_LINK_DOMAIN`、`links.entitlements`；两份 entitlements 都有 `keychain-access-groups`。
- [ ] 单元测试覆盖「要做的事」里列出的逻辑，并在 Actions 上通过。
- [ ] 协调者推分支、开草稿 PR 后，`Mobile builds`、`iOS Linux`（43 合并后才有）和 `Public scan`（45 合并后才有）都是绿的；日志里本任务选中的测试数大于 0。运行链接由协调者补进报告。

## 约束
- 不要 git 提交。沙箱禁网，没有 Xcode：不要声称 App「编译通过」。本机装了 Linux 版 Swift 6.3.3（`/opt/swift/usr/bin`），CryKit 必须在沙箱里实跑 `swift test`，把命令和输出原样贴进汇报。写成脚本再调用（直接在命令行写 `${...}` 可能被替换），缓存全部放工作区：
  ```bash
  WS=$(pwd)/mobile/ios; C=$WS/.linux-cache
  export PATH=/opt/swift/usr/bin:$PATH HOME=$C/home XDG_CACHE_HOME=$C/xdg TMPDIR=$C/tmp \
         CLANG_MODULE_CACHE_PATH=$C/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$C/swiftpm-module-cache
  mkdir -p "$HOME" "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
  swift test --package-path $WS/Packages/CryKit --scratch-path $WS/.linux-build \
    --cache-path $C/swiftpm --config-path $C/config --security-path $C/security \
    --manifest-cache local --disable-sandbox
  ```
  `.linux-cache/`、`.linux-build/` 要写进 `mobile/ios/.gitignore`。CryKit 不依赖远程包，所以断网也能跑；Linux 上没有 SwiftUI，只有 Foundation 的部分能编。
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
