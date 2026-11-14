## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1221-02 App 骨架与夹具模式

> 规格以仓库里的 `docs/specs/2026-11-14-ios-native.md` 为准，开工前先通读一遍（2026-11-14 已缩小范围：常用部分原生，其余内嵌网页，共 25 个任务）。任务 01 已合并，CryCore 已在 main 上：`mobile/ios/Packages/CryKit/Sources/CryCore/` 下有 `Transport.swift`（协议 `Transport`：`send`、`events(since:screens:)`、`upload`、`download`、`webSocket(path:)`；`WebSocketChannel`、`WebSocketPayload`）、`Endpoint.swift`（`Endpoint<Response>`、`HTTPMethod`、`CoreEndpoints`：snapshot、history、send、respond、interrupt、markRead、react、inbox、notifications、config、environment、authSession、pair、email、upload、attachment、messageFile）、`CoreTypes.swift`（`BotID`、`GroupID`、`ThreadID`、`MessageID`、`PhoneDeviceID`、`DataRow`，`RequestCardKind` 和 `classify`）、`WireModels.swift`（`WireMessage`、`WireAttachment`、`OptionCardData`、`WireBot`、`WireGroup`、`ServerFrame`）、`CoreAPIModels.swift`（`BotsSnapshot`、`ThreadPage`、`SendResponse`、`ChatSendBody`、`RespondBody`、`DataCardRef`、`PanelTarget`、`PanelPageID`、`SettingsPageID`、`BotSettingsSection`、`AuthSession`、`APIError` 等）、`LiveState.swift`（`load(snapshot:)`、`load(config:)`、`load(notifications:)`、`apply(_:)`）、`SSEParser.swift`、`JSONValue.swift`。工程上，`project.yml`（iOS 17，CryBot 链接 CryCore、CryNetLogic、CryNet、CryRFB，CryBotTests 宿主为 CryBot，CryBotUITests）、`mobile.yml`（macos-26，build-for-testing 一次）、两份 entitlements、`Package.resolved`、`CryBotTests/Placeholder.swift`、`CryBotUITests/Placeholder.swift` 都已就位。CryNetLogic、CryNet 目前只有占位文件，由并行的 03 来写。

## 依赖
- after：01（已合并）
- 估计：2.5 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读第 1、2、8、11 节和第 1.4 节入口表（含「状态」列），以及第 1.3–1.6、4、5、6、7.6、14 节。
- 分支名：`T-1221-app-shell`
- 和 03、04 并行开发，三者改的文件不重叠（见「范围」）。

## 目标
把 App 改成原生 SwiftUI 骨架：根导航、状态仓库（帧订阅、导航、退出登录）、夹具模式、主题令牌全部就位。第 1.4 节入口表里「状态」列为保留、改由 16、新增的每个入口都有占位实现，功能任务可以各自并行替换。内嵌网页的统一入口（`WebHostTarget`、`WebEntryMenu`、`WebHostScreen`、`WebMessageSummary`）先放占位，由 48 实现。

## 背景
- 现在 App 的入口是 UIKit：`mobile/ios/CryBot/AppDelegate.swift`（`@main`，`applicationDidBecomeActive` 里调 `WatchSync.shared.refresh()`，打开 URL 和 `continue userActivity` 时交给 `ViewController.handleAuthCallback`），以及装 WKWebView 的 `ViewController.swift`（428 行，已含 T-1220 的改动）。登录接力的解密和回调由并行的 03 在 CryNet 里重写，本任务直接删掉 `ViewController.swift`；03 会从 main 上读原文件，不需要你保留。
- `CryBot/WatchSync.swift` 归任务 05。它现在还 `import WebKit`、读 `WKWebsiteDataStore` 的 cookie，05 会改成从原生存储读。本任务不改它，只在 App 回到前台时继续调它的 `refresh()`。
- `CryBot/en.lproj`、`zh-Hans.lproj` 下旧的 `Localizable.strings` 是网页壳时代的文案，不用删，新代码也不要用它。
- 主题令牌取自 `src/styles.css` 的 `[data-skin="daylight"]`（浅色）和 `[data-skin="midnight"]`（深色），品牌紫看 `brand/`。外观第 1 期只跟随系统深浅色，外观设置页改走内嵌网页（「已定的决定」第 7 条的补注）。
- 内嵌网页（第 7.6 节，任务 48）：设置、机器人设置和面板、新建机器人、自动化、文件、团队地图、MCP 与插件、Web 面板、已发布 App、浏览器和手机画面、电脑面板、通话，以及 widget 和 `app` 消息，都由 48 的网页容器打开。原生界面上只有两种入口：07、08、22 在固定位置放 `WebEntryMenu`，其他页面调 `context.open(.web(WebHostTarget))`。本任务把这条路接通：类型、路由、弹出方式和占位都要有，网页容器本身不做。
- 本任务合并后，协调者会停半天，拿 08、16、48 的任务说明对照入口签名，所以签名要严格照第 1.4 节写。

## 要做的事
1. SwiftUI 入口 `CryBot/App/CryBotApp.swift`（`@main`），用 `UIApplicationDelegateAdaptor` 保留必要的 AppDelegate 行为（`AppDelegate.swift` 去掉 `@main` 和对 `ViewController` 的引用）；删掉 `ViewController.swift`。外部回调两个入口（第 14 节）：Universal Links 用 `onContinueUserActivity(NSUserActivityTypeBrowsingWeb)` 取 `webpageURL`，自定义 scheme 用 `onOpenURL`，两者都只把 URL 交给 `LoginRouter.handle(url:)`，入口里不解析 URL。`LoginRouter.handle` 由 05 实现成调用 03 的 `CallbackRouter.handle`；本任务和 03 并行，看不到 `CallbackRouter`，所以入口里不要直接引用它，占位版返回 false。scenePhase 变成 active 时调 `WatchSync.shared.refresh()`，并通知 AppStore 恢复实时连接；进入后台时通知 AppStore 断开（第 4.1 节）。
2. 根视图（放 `App/` 下）：
   - 未登录时显示 `LoginFlowView`。
   - 已登录时显示 TabView，两个页签：「对话」（`ConversationListView`，进入 `ChatScreen` 或 `GroupScreen`）和「收件箱」（`InboxScreen`，带未读数）。旧说明里的「自动化」「更多」页签取消：这些模块都在内嵌网页里，从 07 放在会话列表工具栏的 `WebEntryMenu(scope: .global)` 进入。通知页经 `navigate(to: .notifications)` 打开，入口位置由 23 定。
   - iPad 上用 NavigationSplitView 的自适应布局。
   - 根视图上叠一层 `NotifyBannerHost()`。
   - `AppRoute.web(target)`：在根视图上以全屏 sheet 弹出 `WebHostScreen(target:)`（占位）。网页容器怎么弹出由本任务定死，48 只替换 `WebHostScreen` 的内容。
   - `AppRoute` 的远程桌面：push 或弹出 `DesktopViewer(target:)`。
   - 不做任何聊天内查找入口。
3. `Store/AppStore.swift`（`@Observable @MainActor`），接口照第 4.3 节：
   - 持有 `LiveState`、当前 `Transport`、登录状态和导航状态；`attach(transport:)`、`detach()`。
   - 动作：`refreshSnapshot()`、`loadOlder(thread:)`、`send(...)`、`respond(...)`、`interrupt(...)`、`markRead(...)`、`react(...)`、`request<R>(_ endpoint: Endpoint<R>)`，用 CryCore 的 `CoreEndpoints` 和 `Endpoint`，不要重新定义接口。
   - 事件流：`events(since:screens:)` 固定传 `screens: false`；收到 `hello` 且 `resumed == false` 时重新拉快照；40 秒没有任何帧算断开，按 1、2、4、8 秒退避，最长 30 秒（第 4.1 节）。03 会在 CryNetLogic 里写同样的状态机，本任务看不到它：在 `Store/` 里写一个最小实现，时钟可以注入、有测试，并在报告里注明「05 接入 LiveTransport 时可以换成 03 的状态机」。
   - 帧订阅：`frames(kinds: Set<String>) -> AsyncStream<ServerFrame>`，每个订阅者一条流，取消时自动移除。所有帧先交 `LiveState.apply`，再分发给订阅者；第 4.2 节写着「帧订阅保留、第 1 期没有原生订阅者」的帧照样能订到。
   - 导航：`navigate(to: AppRoute)`。
   - 退出登录：`registerSignOut(_ handler: @escaping @MainActor () async -> Void)` 可以注册多个，`signOut()` 按注册顺序逐个调用，然后清内存状态、回到登录页。05 注册「清 Keychain、通知手表」，48 另外注册「清空网页容器的数据存储」。一个都没注册时只清内存状态。更换服务器也走 `signOut()`。
   - 屏幕帧开关 `setScreens(_ on: Bool)`：接口保留，第 1 期没有调用者，只记个状态。
4. `AppStore.fixture(scenario: String) -> AppStore`：用 FixtureTransport 加载场景，同步回放到第一帧之前的状态，给 App 内截图测试用。
5. `Store/FixtureTransport.swift`：实现 CryCore 的 `Transport`。按第 4.4 节的场景格式 `{signedIn, snapshot, threads, responses, frames: [{afterMs, frame}], sockets}` 回答请求、按时间推送帧、回放 WebSocket 数据，并记录收到的请求供测试断言。场景按名字从 App 包里加载（`App/Fixtures/` 和各 `Features/<名字>/Fixtures/`）。启动参数 `-CryFixtureScenario`、`-CryAppearance light|dark`、`-CryGallery <名字>` 的解析放在 `App/LaunchOptions.swift`。夹具模式下不联网、不登录（`signedIn: false` 时显示登录页）。
6. 共用类型 `App/Types.swift`，照第 1.6 节逐个写，名字和 case 一字不差：
   - `PersonRef { id: String?, name: String, email: String?, imageURL: URL?, color: String? }`，以及从 `ResolvedSender`、成员列表、`relay` 转换的构造函数（来源类型以 CryCore 里的实际定义为准）。
   - `ConversationRef`：`.bot(BotID, thread: ThreadID?)`、`.group(GroupID, thread: ThreadID?)`，可带 `focus: MessageID?`。
   - `ComposerTarget`（会话、线程、`replyTo: MessageID?`）、`MessageContext { conversation, thread, isStreaming, isGroup, respond, openLink, open: (AppRoute) -> Void }`、`CardContext { message, isPending, respond }`、`WidgetContext`、`RespondAction`、`WidgetAction`、`TimelineStyle`（`.direct`、`.group`）、`DesktopTarget`、`CallRef`、`McpScope`。`WidgetContext` 和 `WidgetAction` 第 1.6 节仍然列着，照写，但第 1 期没有使用者。
   - `AppRoute`：原生页面（会话，可带要跳到的消息；收件箱；通知；远程桌面）加 `.web(WebHostTarget)`。不要给已删除的原生页面（自动化、文件、团队地图、MCP、设置、机器人设置和面板、新建机器人、画面、电脑面板、通话）建原生 case，它们一律是 `.web(...)`。
   - `WebHostTarget`：`.settings(SettingsPageID?)`、`.botSettings(BotID, BotSettingsSection?)`、`.botPanel(BotID, PanelTarget?)`、`.newBot`、`.automations(id: String?)`、`.files`、`.teamMap`、`.mcp(McpScope)`、`.plugins`、`.webPanel`、`.publishedApps`、`.browser(BotID)`、`.phone(PhoneDeviceID)`、`.computer(BotID)`、`.call(CallRef)`、`.message(ConversationRef, MessageID)`。`SettingsPageID`、`BotSettingsSection`、`PanelTarget` 直接用 CryCore 的。
   - `WebEntryScope`：`.global`、`.bot(BotID)`、`.group(GroupID)`。
   - 这些类型都要 `Hashable`（导航要用），闭包字段除外。
7. `App/MessageBodyView.swift` 和纯函数 `MessageLayout.plan(for: WireMessage) -> [MessagePart]`：固定顺序为 `MessageLeadingExtras` → 按 `kind` 分发的正文 → `AttachmentsView`（有附件时）→ `MessageTrailingExtras`。正文分发：`text` → `MarkdownView`；`options` → `OptionsCardView`；`connector`、`secret`、`signin` → `ConnectCardView`；`routine.run`、`goal.run`、`burst`、`digest`、`compaction`、`call`、`screen` → `RecordRowView`；`activity` → `ActivityMessageView`；`widget`、`app` → `WebMessageSummary`；`unknown` → 原生的「需要更新 App」提示行，不能崩。`MessagePart` 和 `plan` 放进 `App/Logic/`（只 import Foundation 和 CryCore）。这个文件之后不会再改，所以分发要写全。
8. 按第 1.4 节入口表建占位：只给「状态」列为**保留、改由 16、新增**的行建，共 19 个目录：Login、Avatar、Sidebar、Chat、Composer、Activity、Markdown、Code、Math、Media、CardsApproval、CardsRequests、CardsConnect、Records、MessageExtras、Group、Inbox、Desktop、WebHost。「删除」的行（ChatFind、Mermaid、Widget、Charts、WebContent、Automations、Files、TeamMap、MCP、BotSettings、BotPanel、BotPanelMore、NewBot、Settings、SettingsAI、SettingsAdmin、ScreenStream、Computer、Call、CallOpenAI、CallFish）**不建目录、不建占位、不在任何地方引用**。每个目录里：
   - `Features/<名字>/<名字>Entry.swift`：入口签名逐字照表，显示名字，并加 `accessibilityIdentifier("<名字>.placeholder")`。`LoginRouter` 是带静态方法 `handle(url: URL) -> Bool` 的类型；`LoginFlowView(model: LoginModel)` 需要的 `LoginModel` 在 Login 目录里放一个最小占位类型（05 会替换）。
   - `<名字>Gallery()` 占位视图。`-CryGallery <名字>` 时根视图直接显示对应的 Gallery。
   - 一个空的 `<名字>.xcstrings`（只含英文和简体中文两种语言的空表）。
   - 07、08、22 的占位页面按表放 `WebEntryMenu`：`ConversationListView` 工具栏放 `WebEntryMenu(scope: .global)`，`ChatScreen` 单聊页头放 `WebEntryMenu(scope: .bot(id))`，`GroupScreen` 页头放 `WebEntryMenu(scope: .group(id))`。功能任务替换占位时要保留这三处。
   - WebHost 目录：`WebHostScreen(target: WebHostTarget)` 占位显示 target 的描述和「关闭」按钮；`WebEntryMenu(scope: WebEntryScope)` 占位是一个 SwiftUI `Menu`，每个范围先放一两个示例项，每项调 `navigate(to: .web(...))`（菜单内容由 48 定）；`WebMessageSummary(message: WireMessage, context: MessageContext)` 占位显示一行类别名和「打开」按钮，点了调 `context.open(.web(.message(...)))`。WebHost 目录里**不能出现**任何网页视图，占位不加载网页。
9. `Design/`：`Theme.swift`（颜色、字号、间距、圆角），以及 `Assets.xcassets` 里的 Color Set（浅深两套）；通用控件 `CardContainer`、`SectionHeader`、`EmptyState`、`ErrorBanner`、`LoadingRow`、`AuthImage(url: URL)`（用当前 Transport 下载并缓存图片）。深浅色跟随系统，`-CryAppearance` 启动参数可以强制指定；不做 App 内的三档外观设置（旧说明里的 `@AppStorage("appearance")` 取消）。
10. 夹具场景：`CryBot/App/Fixtures/shell-basic.json`（两个机器人、一个群聊、几条文本消息，再加一条 `widget` 和一条 `app` 消息，用来验证摘要行分发）和 `shell-signed-out.json`。地址只用 `example.com`，UUID 只用占位格式。
11. 单元测试放 `CryBotTests/Shell/`：
    - FixtureTransport 回放帧后 AppStore 的状态；
    - `frames(kinds:)` 只收到订阅的 kind，取消后不再收到；
    - `navigate(to:)` 改变导航状态，`.web(target)` 让根视图进入弹出网页容器的状态；
    - `signOut()` 按注册顺序调用多个处理器，没注册时只清内存状态；
    - 退避和 40 秒无帧判断（注入时钟）；`hello` 的 `resumed=false` 触发重新拉快照；
    - `MessageLayout.plan` 对 15 种 kind 加 unknown、带附件、带附加信息的消息都给出正确的顺序和分发；
    - 启动参数解析；`AppStore.fixture(scenario:)` 加载出的状态；
    - 一个静态检查测试：`Features/` 下不存在「删除」行的目录名。
    测试类名不要用 `<名字>SnapshotTests`、`<名字>FlowTests` 这两种后缀（那是 04 选择截图测试用的）。本任务不写截图测试。

## 范围
- 可以改：`mobile/ios/CryBot/App/**`（新建）、`mobile/ios/CryBot/Store/**`（新建）、`mobile/ios/CryBot/Design/**`（新建）、`mobile/ios/CryBot/Features/<上面 19 个名字>/**`（新建的占位）、`mobile/ios/CryBot/AppDelegate.swift`、删除 `mobile/ios/CryBot/ViewController.swift`、`mobile/ios/CryBot/Assets.xcassets`（只加 Color Set）、`mobile/ios/CryBotTests/Shell/**`（新建）
- 不要改：`project.yml`、`Packages/**`、`WatchSync.swift`（归 05）、`CryBot/Strings/**`（归 04）、`CryBot/*.entitlements`、`CryBot/*.lproj`、`CryBotTests/Placeholder.swift`、`CryBotTests/Support/**`、`CryBotUITests/**`（归 04）、`mobile/ios/scripts/**`、`CryBotWatch/**`、`Shared/**`、`.github/**`、服务端和网页代码。确实需要改时，在报告里说明原因，不要自己改。
- 和并行任务的边界（第 1.3 节）：03 只改 `Packages/CryKit` 的 CryNetLogic、CryNet 源码和测试；04 只改 `CryBotTests/Support`、`CryBotUITests`、`mobile/ios/scripts`、`CryBot/Strings` 和两个工作流文件。三者没有重叠。本任务要用 04 的东西时（截图基类、文案生成器），只按规格写好的约定用，不要建同名文件。

## 接口契约
- 第 1.4 节入口签名、第 1.6 节共用类型、第 4.3 节 AppStore 接口：一字不差，功能任务和 48 直接照着写。确实觉得签名不够用的，照写不误，在报告里写出建议，由协调者决定。
- `MessageLayout.plan(for:)` 的分发表（第 7 条）和弹出网页容器的方式（第 2 条）合并后冻结。
- 夹具场景 JSON 格式照第 4.4 节，04 和功能任务的场景文件都按它写。
- `accessibilityIdentifier`：占位统一 `<名字>.placeholder`；根视图的两个页签 `Root.tab.chats`、`Root.tab.inbox`；网页容器占位的关闭按钮 `WebHost.close`。

## 验收标准
- [ ] Actions 上 App 编译通过，CryBotTests 通过（`Mobile builds`）。
- [ ] `grep -rnE "import WebKit|WKWebView|WebView\(|WebPage" mobile/ios/CryBot` 只命中 `CryBot/WatchSync.swift`（归 05，05 改完后就没有了），本任务新增和改动的文件一处都没有。
- [ ] 第 1.4 节「保留、改由 16、新增」的每个入口都能在 `Features/` 下找到占位，签名逐字一致（协调者对表检查）；「删除」行的目录一个都不存在，全仓 grep 不到 `ChatFindBar`、`MermaidView`、`WidgetView`、`AutomationsScreen`、`SettingsScreen`、`BotPanelScreen`、`CallScreen`、`LiveCallTransport` 等已删除的入口名。
- [ ] `App/Types.swift` 里 `WebHostTarget` 的 16 个 case、`WebEntryScope` 的 3 个 case 与第 1.6 节一致；`MessageLayout.plan` 把 `widget`、`app` 分发给 `WebMessageSummary`。
- [ ] 用 `-CryFixtureScenario shell-basic` 启动时不联网、不登录，直接进入「对话」页签（由 04 的截图验证；本任务在报告里写明启动参数）。
- [ ] 单元测试覆盖「要做的事」里列出的逻辑，并在 Actions 上通过。
- [ ] 如果 43 已合并，`linux-test.sh` 和 `linux-check.sh` 的输出贴进报告（`App/Logic/` 的纯逻辑在 Linux 上能类型检查）；没合并就用「约束」里的写法做语法检查。
- [ ] 协调者推分支、开草稿 PR 后，`Mobile builds`、`iOS Linux`（43 合并后才有）和 `Public scan` 都是绿的；日志里 CryBotTests 实际执行的测试数大于 0。运行链接由协调者补进报告。

## 约束
- 不要 git 提交。沙箱禁网，没有 Xcode：不要声称 App「编译通过」或「测试通过」，App 的编译和测试以 GitHub Actions 的 `Mobile builds` 为准。
- 43 合并前的 Linux 自查：`App/Logic/` 只 import Foundation 和 CryCore，可以用 `/opt/swift/usr/bin/swiftc -parse` 对你写的每个 Swift 文件做语法检查（SwiftUI 文件在 Linux 上只能查语法）。所有缓存指到 `mobile/ios/.linux-cache/`、`.linux-build/`（已在 `.gitignore`），命令写成脚本再调用，输出原样贴进报告。
- 需要新的依赖时，在报告里列出包名和版本，不要自己安装。只能用规格第 10 节列出的第三方依赖，其余一律用系统框架。
- 公开仓库：代码、测试、夹具、注释和报告里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 并行开发：只改「可以改」里的路径；不改 `project.yml`，要加的行写进报告（规格第 1.3 节的变更通道）。
- 类型命名遵守规格第 1.5 节：不和 SwiftUI、Foundation、`Shared/` 里的类型重名（例如不能叫 `TimelineView`、`WebView`、`Tab`、`ServerAddress`、`SendResult`）。
- SwiftUI 代码拆成小视图，少用复杂的泛型和长链式表达式，降低在没有编译器的情况下出错的概率。
- 每个可操作元素都加 `accessibilityIdentifier`，命名为 `<功能>.<元素>`。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。
- 只说已发生的事：报告里写「已验证」的，必须附 Actions 运行链接（由协调者补）。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1221-app-shell/report.md`（等于 `task-paths report T-1221-app-shell` 算出的路径）；各轮追加到同一个文件，保留前几轮的内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话；单独列出 19 个占位目录和每个目录里的入口签名。
2. 怎么验证的，命令和结果；哪些只能等 Actions 验证。
3. 本任务完成了覆盖表（`server/testing/ios-contract/coverage.ts`）里的哪些项（只列出，不改那个文件）。
4. 需要协调者处理的事：`project.yml` 要加的行、超出范围的改动、对入口签名的建议、事件流状态机和 03 的重复（05 接入时怎么合）、没解决的问题。

## 协调者追加
- `project.yml` 里残留的 `LiveKit`、`LiveKitWebRTC` 两个包（规格第 10 节已去掉）不归你删，协调者另行处理；你写的代码不要 import 这两个库。
