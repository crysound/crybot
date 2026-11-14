# 把 iOS App 重做成原生 SwiftUI 应用

## 合同

### 结果
iPhone 上的 Cry Bot 不再是套着网页的壳。打开后看到的每个页面都由 SwiftUI/UIKit 原生控件绘制，包括机器人和群聊列表、单聊和群聊、全部消息类型、卡片和消息上的附加信息、Markdown 和代码、表格、公式、图表、widget、收件箱、自动化、文件、团队地图、MCP 和插件、机器人设置和机器人面板、各个设置页、电脑画面和实时通话。登录方式不变：有 Cloudflare Access 的部署走 T-1218 接力登录，没有 Access 的部署用配对码或邮箱登录。手表继续可用，令牌改从原生存储取，没有 CF 令牌的部署上手表也能用。第 1 期全部做完后再发 TestFlight，中间不发网页形态的版本。

### 验收
1. `mobile/ios` 里不再有用网页视图加载 Cry Bot 网页界面的代码。用 `grep -rnE "import WebKit|WKWebView|WebView\(|WebPage" mobile/ios` 检查，每处命中只能属于四类：`app` 类 HTML 消息和 Web 面板（`Features/WebContent`）、mermaid 离屏渲染（`Features/Mermaid`）、旧版 cookie 迁移（`Features/Login/LegacyCookieMigration.swift`，只读写 cookie，不加载网页）。
2. GitHub Actions 全绿：
   - PR 上的 `Mobile builds`：CryKit 包测试、CryBotTests（含本次改动功能的 App 内截图）、CryBotWatchTests、本次改动功能的 XCUITest 交互流程（iPhone 16）。
   - main 上的 `iOS nightly`（每晚一次）：全部单元测试、全部 App 内截图（三种屏宽、深浅两色）、全部 XCUITest 交互流程在 iPhone SE（第 3 代）、iPhone 16、iPhone 16 Pro Max 上各跑一遍。
   - `iOS Linux`：CryCore、CryNetLogic、CryRFB 在 ubuntu 上 `swift test` 通过，文案表检查通过。
3. 截图产物覆盖第 9 节「页面清单」里的每一行。审核员逐张看过：没有截断、没有横向溢出、深色下文字可读。
4. `CI` 工作流的 `ios-contract` job 是绿的。故意改一个 `shared/wire.ts` 里 iOS 用到的字段，它必须变红；往 `WireMessage.kind` 加一个新值而不登记覆盖表，`check` job 的 tsc 必须报错（都在任务 00 的 PR 里演示一次并贴出运行链接）。
5. 第 9 节每一行都有对应的原生实现，最后由任务 42 逐行核对并附截图；第 12 节的覆盖表里没有「待做」项。
6. 真机自测（协调者或用户用 TestFlight 内部测试包）：三种登录方式都能进；手表在接力登录和配对码登录两种情况下都能拿到令牌；能收发消息、审批卡片能点、远程桌面能看能点、三种 provider 的通话都能接通。
7. 公开仓库：`Public scan` 工作流在每个 PR 上是绿的；新增的代码、测试、文档和夹具里没有内部域名、IP、邮箱、人名、密钥或真实实例 ID。夹具里的地址只用 `example.com`。

### 范围
做：
- iPhone App（target `CryBot`）整体改为原生。iPad 沿用同一套自适应布局，可以用，但第 1 期不出 iPad 截图，只在任务 42 抽查一次。
- 所有客户端能通过 HTTP、SSE 或 WebSocket 拿到的功能，按第 9 节清单逐项做。
- 新增本地 Swift 包 `CryKit`、两个测试 target、App 内截图和交互截图流水线、Linux 自测通道、服务端契约样本和覆盖表、公开仓库扫描。
- `WatchSync` 的令牌来源改成原生存储（任务 05）。`Shared/WatchContract.swift` 里的 `cfAuthorization` 改成可选由 T-1222-07 完成，它必须在 05 开工前合并；本规格的任务都不改 `Shared/`、`CryBotWatch/`、`CryBotWatchTests/`。
- 发版工作流适配新工程。
- 为 T-1222（飞书登录）预留接口：登录存储带版本号和登录方式、CF 字段可选、地址分网页入口和 API 入口、接力回调按 `v` 分发、回调注册点、登录页的首选登录方式插槽、工程里保留 T-1220 的 Associated Domains 设置并在两份 entitlements 里都写 Keychain 共享组（第 14 节；以 T-1222 规格第 5 节为准）。

不做：
- 系统推送（APNs）。放第 2 期。第 1 期只在 App 打开时显示 SSE `notify` 帧带来的 App 内提醒。
- 安卓。本期不改 `mobile/android`。
- 只在 Electron 桌面版里存在的功能，也就是依赖 `window.cry` 桥的部分：开机自启、本机电脑控制、本地 Ollama、桌面版更新、USB 主机端等。设置页里遇到这类条目时不显示，覆盖表里标「不做」并写原因。
- 除 daylight（浅色）和 midnight（深色）以外的 11 种皮肤。
- 同时登录多个服务器。第 1 期只有一个当前服务器，可以更换。
- 飞书登录本身（T-1222），本期只预留接口。

### 约束
- 原生的定义：每个页面都用 SwiftUI/UIKit 原生控件绘制。网页视图只允许出现在验收第 1 条列出的地方。
- 开发环境：Codex（Astra）在没有网络、没有 Xcode 的 Linux 沙箱里写 Swift。沙箱里可以用协调者装好的 Linux 版 Swift 工具链跑 CryCore、CryNetLogic、CryRFB 的 `swift test`，以及对其他 Swift 文件做语法检查（第 8.5 节）。App 和 UI 的编译和测试只能靠推分支、开草稿 PR，在 GitHub Actions 的 macOS runner 上跑。
- 每个任务都必须带能在 Actions 上跑的单元测试，至少覆盖解码夹具和状态逻辑。有页面的任务还要有 App 内截图测试；有交互流程的再加 XCUITest。
- 依赖：优先用系统框架，例如 AttributedString、Swift Charts、AVFoundation、PhotosUI、VisionKit、QuickLook、VideoToolbox、CommonCrypto、Compression。新的第三方 SPM 依赖只能是第 10 节表里列出的。要加别的依赖，先停下来问。
- 公开仓库：见验收第 7 条和第 13 节。
- 身份：保留 T-1218 接力协议 v1，不改服务端接力代码。令牌只放 Keychain。请求带 `Authorization: Bearer cry_sess_…`；只有存了 CF 令牌时才带 `Cookie: CF_Authorization=…`。
- 服务端接口没有版本号。iOS 通过任务 00 的契约样本和覆盖表感知接口变化，不靠人记（第 12 节）。
- 并行：同时进行的任务不改同一个文件。文件归谁见第 1.3 节。
- 只说已发生的事：报告里的「已验证」必须附 Actions 运行链接。

### 停止条件
遇到下面这些情况，停下来问协调者，由协调者再问用户：
- 需要新的第三方依赖，或者要换掉第 10 节已定的依赖。
- 需要改服务端接口、鉴权或接力协议。任务 00 加测试、样本和覆盖表不算。
- 需要 Apple 签名凭据、App Store Connect 操作、描述文件改动（例如打开 Associated Domains）或付费服务。
- 某个页面做不成原生，想退回网页。
- 要改「已定的决定」里任何一条。
- Actions 的 macOS 并发或分钟数不够用。

### 已定的决定
- 2026-11-14，用户：iOS 全部原生重做，第 1 期全部做完再发；不要网页形态；APNs 放第 2 期。
- 2026-11-14，用户：本期不动安卓。
- 2026-11-14，协调者：网页视图只用于内容本身是网页的地方（`app` 类消息、Web 面板里浏览的网站）；远程桌面、实时通话和 mermaid 不默认降级成网页。
- 2026-11-14，协调者：全部开发交给 Astra。App 只在 Actions macOS runner 上编译和测试。每个任务带单元测试，页面带三种屏宽、深浅两色截图。
- 2026-11-14，协调者：保留 T-1218 接力登录，令牌放 Keychain；没有 Access 的部署要能用配对码登录；手表令牌改从原生存储取。
- 2026-11-14，协调者：服务端 CI 产出 API 样本，iOS 解码测试使用这些样本，接口一变 CI 变红。
- 2026-11-14，协调者：先做「协议层加骨架」的基础任务，其余任务以它为基础并行；每个任务是一轮 Astra（约 1 到 3 天），改动集中。
- 2026-11-14，协调者（审核返工）：
  1. 最低 iOS 版本从 16 提到 17。
  2. 远程桌面自己写 Swift 版 RFB 客户端（第 7.2 节）。
  3. mermaid 用离屏 WKWebView 只做渲染、原生显示（第 7.4 节）；做不成时退到只显示源码加复制。
  4. 实时通话用 LiveKit Swift SDK（含 WebRTC），openai、azure、fish 三种 provider 都在第 1 期做。
  5. 代码高亮用 HighlightSwift。
  6. 原生界面按 Apple HIG 加品牌令牌，不套 `@crysound/ui`（SwiftUI 用不了 React 组件库）。
  7. 皮肤只做浅色和深色两套，跟随系统；外观页提供「跟随系统、浅色、深色」三个选项。其他 11 种放第 2 期。
  8. 协调者在宿主机装 Linux 版 Swift 工具链，Astra 在沙箱里跑 `swift test`；缓存目录一律指到工作区里（第 8.5 节）。
  9. 统一用 macos-26 和 Xcode 26；`mobile.yml` 的 push 只在 main 触发，分支走 PR。
  10. App 自己的界面文案先做英文和简体中文；复用网页文案的，17 种语言由生成器自动带上。
  11. 手表：`WatchCredentials.cfAuthorization` 改成可选，没有 CF 令牌时手表请求不带 CF cookie。这项改动归 **T-1222-07**（`Shared/` 只对它开例外，只限 `WatchContract.swift`），必须在 05 开工前合并；任务 05 依赖 T-1222-07，`Shared/` 仍然不改，只消费结果。（2026-11-14 协调者改定，取代原来「05 可以改 `Shared/`」的写法。）
  12. 静态页面改在 App 内渲染截图（第 8.3 节）；main 上的全量截图每晚跑一次；XCUITest 只留交互流程。
  13. 加公开仓库扫描 job，只扫 PR 新增的行，内部名单用哈希比对（第 13 节）。
  14. 网页变化跟踪采用覆盖表、往返比较、每周差异清单三项（第 12 节）。
  15. 并行路数按 5 路排。
  16. T-1222 的接口按第 14 节预留；第 14 节与 T-1222 规格第 5 节「与 T-1221 的衔接」不一致时，以 T-1222 第 5 节为准（命名一律照 T-1222：`crybot://auth` 给接力、`crybot://feishu` 给飞书回跳，`CRYBOT_APP_LINK_HOST`、`CRYBOT_IOS_ENTITLEMENTS`、`CryBot-AppLinks.entitlements`）。

### 来源
- 台账项目：crybot。本任务 T-1221；登录接力 T-1218；飞书登录 T-1222；改名规格 T-1200 系列（`docs/specs/2026-11-13-crybot.md` 里「iOS 是 WebView 薄壳」的说法，对 iOS 来说被本规格取代）。
- 调研记录（不进仓库）：网页与接口调研、iOS 构建调研，2026-11-14；规格审核第 1 轮，2026-11-14。
- 网页基线提交：`0f44b8b6`（第 12.3 节的差异清单从这里算起，每次清单处理完后前移）。

---

## 1. 工程结构与文件归属

### 1.1 目录
```
mobile/ios/
  project.yml                      # 任务 01 写全；之后只能经第 1.3 节的变更通道改，最后由 41 收尾
  Package.resolved                 # 远程依赖的锁定结果；01 的 PR 里由协调者从 CI 产物提交（工程是 XcodeGen 生成的，不进仓库）
  .gitignore                       # 43 加 Linux 缓存目录
  Packages/CryKit/
    Package.swift                  # 任务 01 写全；43 只能加 Linux 条件
    Sources/CryCore/               # 纯 Foundation：模型、SSE 解析、状态归并、请求描述（01）
    Sources/CryNetLogic/           # 纯 Foundation：请求头、令牌轮换、过期判断、重连状态机、登录存储模型（03）
    Sources/CryNet/                # Apple 专有：URLSession、Keychain、CryptoKit、WebSocket（03）
    Sources/CryRFB/                # RFB（VNC）协议，纯 Foundation（34）
    Tests/CryCoreTests/            # 01；Fixtures/contract/ 归任务 00
    Tests/CryNetLogicTests/ Tests/CryNetTests/   # 03
    Tests/CryRFBTests/             # 34
  CryBot/
    App/                           # App 入口、根导航、消息分发、共用类型（02）
    Store/                         # AppStore、FixtureTransport、帧订阅、导航（02）
    Design/                        # 主题令牌、通用控件（02）
    Strings/                       # 生成的服务端文案表（04）
    Features/<名字>/               # 每个功能一个目录，归对应任务
      Logic/                       # 只 import Foundation 和 CryCore 的纯逻辑，Linux 上能类型检查
    WatchSync.swift                # 05
    CryBot.entitlements            # 01 新建，只有 keychain 组（第 14 节）
    CryBot-AppLinks.entitlements   # 沿用 T-1220 的内容，01 建并加 keychain 组（第 14 节）
  CryBotTests/Support/             # App 内截图基类 SnapshotCase（04）
  CryBotTests/<名字>/              # 单元测试和 <名字>SnapshotTests
  CryBotUITests/Support/           # 交互截图基类 ScreenshotCase（04）
  CryBotUITests/<名字>/            # <名字>FlowTests，只放交互流程
  scripts/                         # 04 和 43
  CryBotWatch/                     # 不动
  Shared/ CryBotWatchTests/        # 本规格的任务都不改；cfAuthorization 可选由 T-1222-07 改（05 开工前合并）
```

### 1.2 Swift 与平台
- iOS 最低 17.0，watchOS 保持 10.0。
- 统一用 macos-26 runner 和 Xcode 26。`project.yml` 里 `SWIFT_VERSION` 保持 5.0。`Package.swift` 用 `swift-tools-version:6.0` 并设 `swiftLanguageModes: [.v5]`，避免在没有编译器的情况下被严格并发检查卡住。
- 状态对象用 Observation（`@Observable`）。主线程上的状态标 `@MainActor`。

### 1.3 文件归属和 project.yml 变更通道
- `project.yml`、`Package.swift`、所有 SPM 依赖、Info.plist 里的权限说明和 entitlements，都由任务 01 一次写全。各功能任务不改它们。XcodeGen 按目录递归收文件，新文件放进自己的目录就会被编译。
- 变更通道：功能任务需要改 `project.yml` 时（加资源规则、权限说明、构建设置），在报告的「需要协调者处理的事」里写出要加的那几行。协调者攒齐后开一个只改 `project.yml` 的小 PR，合并后通知相关任务。功能任务自己不改。
- 任务 02 给第 1.4 节表里的每个入口建一个占位实现，签名固定。功能任务只改自己的 `Features/<名字>/`、`CryBotTests/<名字>/`、`CryBotUITests/<名字>/`，可以整体替换占位，但不能改入口签名。确实要改签名时，在报告里说明，由协调者安排一次 02 的小返工。
- 文案：每个功能目录有自己的字符串目录 `Features/<名字>/<名字>.xcstrings`，用 `String(localized: "key", table: "<名字>")` 读。不往别人的表里加键。
- 夹具场景：放在 `Features/<名字>/Fixtures/<名字小写>-<场景>.json`，名字全局唯一。
- 接口：CryCore 里有通用的 `Endpoint<Response>` 和核心接口。功能任务自己用到的接口和模型写在 `Features/<名字>/Logic/<名字>API.swift`。
- 图表数据变换、时间表计算、布局计算这类纯逻辑一律放 `Features/<名字>/Logic/`，不放进 CryCore（功能任务不能改 Packages）。

### 1.4 入口表（任务 02 建占位）
共用类型的完整定义见第 1.6 节。

| 目录 | 任务 | 入口（签名固定） |
|---|---|---|
| Features/Login | 05 | `LoginFlowView(model: LoginModel)`、`LoginRouter.handle(url: URL) -> Bool` |
| Features/Avatar | 06 | `BotAvatar(bot: WireBot, size: CGFloat)`、`PersonAvatar(person: PersonRef, size: CGFloat)` |
| Features/Sidebar | 07 | `ConversationListView()` |
| Features/Chat | 08 | `ChatScreen(ref: ConversationRef)`、`ThreadTimelineView(thread: ThreadID, style: TimelineStyle)` |
| Features/ChatFind | 47 | `ChatFindBar(thread: ThreadID, onJump: (MessageID) -> Void)` |
| Features/Composer | 09 | `ComposerView(target: ComposerTarget)` |
| Features/Activity | 10 | `ActivityMessageView(message: WireMessage, context: MessageContext)`、`RuntimeItemsView(thread: ThreadID)` |
| Features/Markdown | 11 | `MarkdownView(source: String, streaming: Bool, context: MessageContext)` |
| Features/Code | 12 | `CodeBlockView(code: String, language: String?)` |
| Features/Math | 12 | `MathView(latex: String, display: Bool)` |
| Features/Mermaid | 13 | `MermaidView(source: String)` |
| Features/Media | 14 | `AttachmentsView(attachments: [WireAttachment], context: MessageContext)` |
| Features/CardsApproval | 15 | `OptionsCardView(message: WireMessage, context: CardContext)` |
| Features/CardsRequests | 16 | `RequestCardBody(card: OptionCardData, kind: RequestCardKind, context: CardContext)` |
| Features/CardsConnect | 17 | `ConnectCardView(message: WireMessage, context: CardContext)`（connector、secret、signin） |
| Features/Records | 18 | `RecordRowView(message: WireMessage, context: MessageContext)`（routine.run、goal.run、burst、digest、compaction、call、screen） |
| Features/Widget | 19 | `WidgetView(root: WidgetNode, context: WidgetContext)` |
| Features/Charts | 20 | `CryChartView(spec: CryChartSpec, rows: [DataRow])`、`WidgetChartView(node: WidgetNode)`、`DataCardView(card: DataCardRef)` |
| Features/WebContent | 21 | `AppMessageView(message: WireMessage, context: MessageContext)`、`WebPanelScreen()`、`PublishedAppsScreen()` |
| Features/Group | 22 | `GroupScreen(group: GroupID)` |
| Features/Inbox | 23 | `InboxScreen()`、`NotificationsScreen()`、`NotifyBannerHost()`（根视图上的 App 内提醒层） |
| Features/Automations | 24 | `AutomationsScreen()` |
| Features/Files | 25 | `FilesScreen()` |
| Features/TeamMap | 26 | `TeamMapScreen()` |
| Features/MCP | 27 | `McpScreen(scope: McpScope)`、`PluginsScreen()` |
| Features/BotSettings | 28 | `BotSettingsScreen(bot: BotID, section: BotSettingsSection?)` |
| Features/BotPanel | 29 | `BotPanelScreen(bot: BotID, target: PanelTarget?)` |
| Features/BotPanelMore | 46 | `BotLibraryTab(bot: BotID, page: PanelPageID?)`、`BotComputerTab(bot: BotID, page: PanelPageID?)`、`BotConversationsView(bot: BotID)` |
| Features/NewBot | 30 | `NewBotFlow()` |
| Features/Settings | 31 | `SettingsScreen()`；页面 overview、account、plan、app、general、appearance；按 `SettingsPageID` 分发到下面两个入口 |
| Features/SettingsAI | 32 | `SettingsAIPageView(id: SettingsPageID)`（ai、bots、vault、usage） |
| Features/SettingsAdmin | 33 | `SettingsAdminPageView(id: SettingsPageID)`（phone、desktops、transfer、data、people、installations） |
| Features/Desktop | 35 | `DesktopViewer(target: DesktopTarget)` |
| Features/ScreenStream | 36 | `BrowserStreamView(bot: BotID)`、`PhoneScreenView(device: PhoneDeviceID)`、`BotScreenFrameView(bot: BotID)` |
| Features/Computer | 37 | `ComputerPanel(bot: BotID)` |
| Features/Call | 38 | `CallScreen(call: CallRef)`、`protocol LiveCallTransport` |
| Features/CallOpenAI | 39 | `OpenAICallTransport`（实现 LiveCallTransport） |
| Features/CallFish | 40 | `FishCallTransport`（实现 LiveCallTransport） |
| Features/MessageExtras | 44 | `MessageLeadingExtras(message: WireMessage, context: MessageContext)`、`MessageTrailingExtras(message: WireMessage, context: MessageContext)` |

此外：
- 每个功能目录都有一个 `<名字>Gallery()` 占位视图。启动参数 `-CryGallery <名字>` 时根视图直接显示它；App 内截图也用它。
- 设计目录里由 02 提供 `AuthImage(url: URL)`，用当前 Transport 带鉴权加载图片，所有功能共用。
- `App/MessageBodyView.swift`（02 写好，之后不再改）对每条消息按固定顺序组合：`MessageLeadingExtras` → 按 `kind` 分发的正文 → 附件 `AttachmentsView` → `MessageTrailingExtras`。正文分发：`text` 走 MarkdownView，`options` 走 OptionsCardView，`connector|secret|signin` 走 ConnectCardView，记录类走 RecordRowView，`activity` 走 ActivityMessageView，`widget` 走 WidgetView，`app` 走 AppMessageView。kind 不认识时显示「需要更新 App」的原生提示行，不崩。分发写成可测的纯函数 `MessageLayout.plan(for:) -> [MessagePart]`。

### 1.5 命名规则（没有编译器时最容易出错的地方）
- 不许和系统或手表共享代码重名。App 和 CryKit 都不能定义这些名字：
  - SwiftUI：`TimelineView`、`Text`、`Image`、`Label`、`Link`、`Table`、`Section`、`Form`、`Group`、`List`、`Menu`、`Toggle`、`Picker`、`Grid`、`Canvas`、`Layout`、`Gauge`、`ProgressView`、`ShareLink`、`WebView`、`WebPage`、`Tab`。
  - Foundation 和 Swift：`Data`、`Date`、`URL`、`Error`、`Result`、`Task`、`Notification`、`Operation`、`Timer`、`Process`、`Thread`。
  - 编进 CryBot 的 `Shared/`：`LoginCookies`、`ServerAddress`、`WatchAPIError`、`WatchRequest`、`BotList`、`MessagePage`、`SendMessage`、`SendResult`、`WatchBot`、`WatchCredentials`、`WatchMessage`。
- 跟线上模型同名的类型用 TS 的名字（`WireMessage`、`WireBot` 等）；TS 名字撞上面的清单时加 `Wire` 前缀。发送接口的返回类型叫 `SendResponse`，服务器地址叫 `CryServer`。
- swift-markdown 的模块里也有 `Text`、`Image`、`Link`、`Table` 等类型：`import Markdown` 只能出现在不 import SwiftUI 的文件里（`Features/Markdown/Logic/`），先转成自己的块模型，再在另一个文件里画。
- 任务 43 的检查脚本会扫描新增的类型声明，命中上面清单就失败。

### 1.6 共用类型（01 在 CryCore 定义 ID 和数据，02 在 `App/Types.swift` 定义界面上下文）
- CryCore：`typealias BotID = String`、`GroupID`、`ThreadID`、`MessageID`、`PhoneDeviceID`；`WireAttachment`（image、file、audio 三种，字段照 `WireMessage.attachments`）；`DataRow = [String: JSONValue]`；`DataCardRef { botId, cardId }`；`PanelPageID`（照 `src/components/bot-panel/page-registry.ts` 的 `PageId`，带 `unknown` 兜底）；`PanelTarget { tab, page, anchor, editInstructions }`；`BotSettingsSection`；`SettingsPageID`；`RequestCardKind`（第 2 节）。
- `App/Types.swift`：
  - `PersonRef { id: String?, name: String, email: String?, imageURL: URL?, color: String? }`，由 `ResolvedSender`、成员列表、`relay` 等来源转换。
  - `ConversationRef`：`.bot(BotID, thread: ThreadID?)` 或 `.group(GroupID, thread: ThreadID?)`，可带 `focus: MessageID?`。
  - `MessageContext { conversation, thread, isStreaming, isGroup, respond: (RespondAction) async throws -> Void, openLink: (URL) -> Void, open: (AppRoute) -> Void }`。
  - `CardContext { message: MessageContext, isPending, respond }`；`WidgetContext { message: MessageContext, submit: (WidgetAction) async throws -> Void }`。
  - `TimelineStyle`（`.direct`、`.group`）、`ComposerTarget`、`DesktopTarget`、`CallRef`、`McpScope`、`AppRoute`（第 4.3 节）。

## 2. 协议层（CryCore）
- 照 `shared/wire.ts`、`shared/runtime-events.ts`、`shared/widget.ts`、`shared/data-surface.ts`、`shared/server-text.ts`，以及 `WireMessage` 和 `OptionCardData` 混入的字段所在文件（`shared/wait-request.ts`、`setup-card.ts`、`default-bot.ts`、`devs-report-status.ts`、`computer-ask.ts`、`bot-access.ts`、`outside-write.ts` 等）写 Codable 模型。字段名与 TS 一致。可选字段用可选类型。
- 判别字段：`ServerFrame` 和 `WireMessage` 用 `kind`，RuntimeEvent 和 widget 节点按各自 TS 定义。联合类型用带 `unknown(kind: String, raw: JSONValue)` 兜底的枚举，遇到新类型不报错。
- `OptionCardData` 不是带标签的联合，而是平铺的可选字段。CryCore 提供纯函数 `RequestCardKind.classify(_ card: OptionCardData) -> RequestCardKind`，按固定优先级判断这张卡是哪一种。优先级和每种的归属任务写成表放在代码注释里，并有测试：
  - 任务 15（外壳和提问类）：`questionRequest`、`commandAllowlist`、`fixedOptions`、`autoApplied`/`undone`、一般审批（`requestType == permission` 或都没有）；`expired`、`stopped`、`dismissed`、`answered` 是状态，由外壳统一处理。
  - 任务 16（请求类）：`routineRequest`、`webhookRequest`、`appTriggerRequest`、`profileRequest`、`modelRequest`、`teamSetupRequest`、`mcpRequest`、`skillRequest`、`quotaSwitch`、`lendingLift`、`outboundRequest`、`teamMemoryRequest`、`yourComputer`、`waitRequest`、`computerAsk`、`accessRequest`、`outsideWrite`。
- `JSONValue` 通用类型，用来保存原样数据。
- 往返比较：每个模型都能「解码再编码」。契约测试对每个样本做往返，结果和原 JSON 逐键比较，有字段丢失就失败。确实不需要的字段写进该类型的 `ignoredKeys` 清单，清单要过审核。
- SSE 解析器：按行解析 `event:`、`data:`、`id:`，输出 `ServerFrame`。
- `Endpoint<Response>`：方法、路径、查询参数、请求体、解码类型。核心接口在 CryCore 里定义：快照、历史、发送、回答、停止、已读、表情、收件箱、通知、配置、environment、上传、下载、登录相关。
- CryCore 只 import Foundation。用到 `URLRequest` 的文件加 `#if canImport(FoundationNetworking) import FoundationNetworking #endif`，保证 Linux 上能 `swift test`。

## 3. 身份与网络（CryNetLogic 加 CryNet）
- 拆两层：
  - `CryNetLogic`（纯 Foundation，Linux 能测）：登录存储模型和迁移、请求头拼装、`Set-Cookie` 里 `cry_session_*` 的识别和轮换、登录过期判断、重连退避和 40 秒无帧判断的状态机、地址规范化、接力回调参数解析和按 `v` 分发、回调注册点 `CallbackRouter`（第 14 节）。
  - `CryNet`（Apple 专有，用 `#if canImport(Security)`、`#if canImport(CryptoKit)` 包住）：Keychain、URLSession、`URLSession.bytes`、URLSessionWebSocketTask、P256 和 AES-GCM 解密。
- 登录存储 `SessionRecord`（Keychain 里存 JSON，访问级别 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`）：
  ```
  { version: 2,
    server: { webURL, apiURL },            // apiURL 默认等于 webURL
    method: "cfHandoff" | "pairing" | "email" | "legacyCookie" | "feishu",   // feishu 给 T-1222；解码时遇到不认识的值保留原样，不报错
    sessionToken, sessionExpires?,
    cfAuthorization?, cfExpires? }
  ```
  `version` 不认识时当作未登录，保留服务器地址。`SessionStore` 的初始化可以带 Keychain 共享组参数，第 1 期传 nil（第 14 节）。
- URLSession 用 ephemeral 配置，关掉 cookie 存储，拒绝重定向。每个请求发往 `apiURL`，带 Bearer 和 `Accept: application/json`；有 `cfAuthorization` 时才带 CF cookie；不带 Origin。
- 每个响应都检查 `Set-Cookie` 里的 `cry_session_*`。有就用新值替换存储的会话令牌，这对应 `server/cf-access.ts` 的轮换行为。轮换不是必经路径：T-1222 的 App 通道上只有 Bearer，令牌值不变（服务端只延长有效期），响应里没有 Set-Cookie 时一切照常。
- 接力登录：ASWebAuthenticationSession 打开 `webURL` 下的 `/auth/app-handoff?state&pk`。回调方式接手 T-1220：iOS 17.4 及以上且有 `CRYBOT_APP_LINK_HOST` 时用 `https://<CRYBOT_APP_LINK_HOST>/auth/app-return`，17.0–17.3 或主机名为空时用 `crybot://auth`（第 14 节）。两种回调 `?v=…` 都先按 `v` 分发：`v=1` 的解密方法和现在的 `ViewController.swift` 完全一致（P256 ECDH，HKDF-SHA256，salt 为 state，info 为 `crybot-app-handoff-v1`，AES-GCM，AAD 为 state）；其他 `v` 交给注册的处理器（留给以后的接力版本；T-1222 的飞书回跳不走 `v`，走 `crybot://feishu`，见第 14 节），没有处理器时提示「需要更新 App」。拿到 CF JWT 后，只带 CF cookie 调一次 `GET /api/auth/session`，从 Set-Cookie 里取 `cry_sess_`。
- 配对码登录：`POST /api/auth/pair {code,label,attemptId}` 返回 `{token}`。可以手动输入，也可以用 VisionKit 扫二维码，二维码格式见 `shared/pairing-link.ts`。邮箱登录用 `/api/auth/email/start` 和 `/api/auth/email/verify`。
- 登录过期，按登录方式分开：
  - 共同：302/303/307/401，或者 403 但响应不是带 `error` 字段的 JSON，判为过期。过期后清掉会话，回到登录页，保留服务器地址。
  - `cfHandoff`：CF JWT 在 exp 前 10 分钟内时，下一次回到前台提示重新接力。这条提示只在 `cfExpires` 有值时出现。
  - `pairing`、`email`、`feishu`：都是服务端签发的 Bearer 会话，没有 CF 令牌，不做 JWT 检查；以服务端返回的过期时间 `sessionExpires` 为准，有值时按它提示。
- WebSocket：用 URLSessionWebSocketTask，带同样的头。
- 构建时可以注入 `CRYBOT_SERVER_URL`（网页入口）、`CRYBOT_API_URL`（可选，API 入口）、`CRYBOT_LOGIN_HOSTS` 和 `CRYBOT_APP_LINK_HOST`（Universal Link 主机，T-1220；都沿用现有 Info.plist 键）。没有注入时首次启动让用户填地址，只接受 https。

## 4. 实时与状态
### 4.1 连接
连接 `GET /api/events?since=<cursor>&screens=off`。收到 `hello` 时，如果 `resumed=false` 就重新拉快照。40 秒收不到任何帧就判定断开，按 1、2、4、8 秒退避重连，最长 30 秒。进入后台时断开，回到前台时续上。

### 4.2 `LiveState` 归并和帧订阅
`ServerFrame` 的每种 `kind` 都有去处，不许落空：

| 帧 | 去处 |
|---|---|
| 快照、`sections`、`bot`、`bot.deleted`、`bots.order`、`group`、`group.deleted`、`groups.order`、`presence`、`config` | LiveState 归并（01） |
| `message`、`message.patch`、`thread`、`bot.queued`、`runtime`（流式文本累加、运行项、`request.opened/resolved`） | LiveState 归并（01） |
| `notify`、`notifications.read` | LiveState 归并未读数（01），提醒层另外订阅（23） |
| `computer`、`computer-control`、`live.call` | LiveState 按机器人存最新状态（01），37、38 读取 |
| `screen` | LiveState 按机器人存最新一帧（01），36 读取 |
| `routine`、`routine.deleted`、`routine.run`、`webhook*`、`app-trigger*` | 帧订阅，24 消费 |
| `mcp.changed` | 帧订阅，27 消费 |
| `device.job` | 帧订阅，37 消费 |
| 数据帧（`DataBroadcast`） | 帧订阅，20、29、46 消费 |
| 不认识的帧 | 不改状态，计数后写调试日志 |

规则照 `src/state/store.tsx` 和 `src/lib/live-events.ts` 的现有行为。

### 4.3 `AppStore`（02）
`@Observable @MainActor`，持有 `LiveState`，通过 CryCore 的 `Transport` 协议收发（请求、事件流、上传、下载、WebSocket）。`Transport` 有两个实现：真实的 `LiveTransport`（03 写、05 接入），以及夹具用的 `FixtureTransport`（02）。对功能任务开放的接口：
- 动作：`refreshSnapshot()`、`loadOlder(thread:)`、`send(...)`、`respond(...)`、`interrupt(...)`、`markRead(...)`、`react(...)`、`request<R>(_ endpoint: Endpoint<R>)`（功能自己的接口都走它）。
- 帧订阅：`frames(kinds: Set<String>) -> AsyncStream<ServerFrame>`，视图在 `.task` 里订阅，离开时自动取消。
- 导航：`navigate(to: AppRoute)`。`AppRoute` 包括会话（可带要跳到的消息）、机器人面板（`PanelTarget`）、机器人设置（`BotSettingsSection`）、设置页、自动化详情、文件、团队地图、Web 面板、电脑面板、通话。
- 退出登录：`signOut()`，由 05 注册实际处理（清 Keychain、通知手表、回登录页）；没注册时只清内存状态。
- 屏幕帧开关：`setScreens(_ on: Bool)`（36 用）。
- 夹具：`AppStore.fixture(scenario: String) -> AppStore`，App 内截图测试用它造带数据的仓库。

### 4.4 夹具模式
启动参数 `-CryFixtureScenario <名字>` 让 App 用打包进去的场景 JSON 跑，不联网、不登录。场景格式：`{signedIn, snapshot, threads: {id: page}, responses: {"GET /api/inbox": body}, frames: [{afterMs, frame}], sockets: {path: [{afterMs, data}]}}`。`signedIn: false` 时根视图显示登录页。`-CryAppearance light|dark` 强制深浅色。

## 5. 渲染
- Markdown：swift-markdown 在 `Features/Markdown/Logic/` 里解析成自己的块模型（见第 1.5 节），再用 SwiftUI 画。支持 GFM（表格、任务列表、删除线、自动链接）、@提及、线程链接和 GitHub 引用链接（规则照 `src/components/ChatMarkdown.tsx`）。流式输出时按块增量渲染，未闭合的代码块按代码块显示。表格可以横向滚动，单元格可以选中复制。
- 代码：HighlightSwift 高亮，可以复制，长代码可以横向滚动，主题跟深浅色走。
- 公式：SwiftMath 原生排版，行内 `$…$` 和块级 `$$…$$`，排版失败时显示原文。
- 图表：widget 的 Chart 节点和数据卡片都用 Swift Charts。`CryChartSpec` 的 bar、line、area、scatter、histogram、pie、heatmap 全部支持（pie 用 SectorMark）。聚合、排序、限量、堆叠、时间单位和分箱放在 `Features/Charts/Logic/`，用纯函数实现，对照 `shared/data-surface.ts` 和 `shared/widget-chart.ts` 写单元测试。
- widget：31 种节点全部原生（见 `shared/widget.ts` 的 SPECS）。表单控件的值和动作回传规则照网页的 widget 实现。
- `app` 类消息：WKWebView 显示 HTML，非持久数据存储，禁止导航到其他源（外链交给系统浏览器），不注入 Cry Bot 令牌。

## 6. 设计
- 遵循 Apple HIG，用系统控件（List、NavigationStack/SplitView、sheet、Menu、Toolbar、SF Symbols）。品牌色和语义色取自 `src/styles.css` 里 `[data-skin="daylight"]`（浅色）和 `[data-skin="midnight"]`（深色）两块，以及 `brand/` 里的品牌紫。放在 `Design/Theme.swift` 和资源目录的 Color Set 里，跟随系统深浅色。
- 支持动态字体，聊天和列表在 Accessibility L（`DynamicTypeSize.accessibility2`）下不截断。
- 不套 `@crysound/ui`（已定的决定第 6 条）。

## 7. 单独定方案的几块（都已定）
### 7.1 最低 iOS 版本
17.0。原因：Observation、Swift Charts 的 SectorMark、新的滚动定位 API。

### 7.2 远程桌面（noVNC 的 RFB）
自己写 Swift 版 RFB 客户端，不依赖第三方：
- CryRFB（纯 Foundation）：RFB 3.8 握手、VNC 认证（DES 用 CommonCrypto，放在 App 侧通过协议注入）、Raw、CopyRect、ZRLE 编码（zlib 用 Compression 框架，跳过 2 字节头后按原始 deflate 流解；同样注入）、指针和按键消息、剪贴板。
- App 侧：经 Transport 的 WebSocket 连 `/api/desktop-viewer/<target>/websockify`（二进制帧），密码来自 `GET /api/desktop-viewer/<target>`，`vps/` 目标先调 `POST /api/bots/<id>/computer/join`。用 CGImage 显示帧缓冲；支持双指缩放、拖动、点按、长按右键、软键盘，Unicode 按键用 0x01000000|码点。
- 工作量约 4 天（34 加 35）。

### 7.3 其他画面
- 机器人内置浏览器：v2 流协议（`server/browser/viewers/stream-v2.ts`），每个 JPEG 帧是一条二进制消息，其余是 JSON，客户端收到帧要确认。原生解 JPEG、回传输入。
- USB 安卓手机画面：`/api/usb-phones/<id>/stream`，服务器转发 scrcpy 的 H.264（带 config、key、delta 标记）。原生用 VideoToolbox 和 AVSampleBufferDisplayLayer 解码显示。
- SSE 的 `screen` 帧（PNG base64）原生直接显示。
- 合计约 2 天（36）。

### 7.4 mermaid
App 打包 mermaid.min.js（MIT），用一个不显示的 WKWebView 只做渲染，导出 PDF，再用原生视图显示（支持缩放、保存、看源码）。WKWebView 只当渲染引擎，不加载任何网址。约 1.5 天（13）。做不成时退到只显示源码加复制。

### 7.5 实时语音通话
`POST /api/live/session` 返回两种传输方式：
- openai 和 azure 返回 `{type:"webrtc", sdp}`：客户端建 PeerConnection、发 offer，服务器代为交换 SDP；
- fish 返回 `{type:"fish", session:{token, livekit_url,…}, relayToken}`：客户端用 LiveKit 连接，再通过 `/api/live/relay` 收发命令。

用 LiveKit 官方 Swift SDK（client-sdk-swift，Apache-2.0）。它自带 LiveKitWebRTC（BSD），openai 和 azure 也直接用这份 WebRTC 建 PeerConnection，整个 App 只带一份 WebRTC。`project.yml` 里 CryBot 显式依赖 `LiveKit` 和 `LiveKitWebRTC` 两个产品（39 要直接 `import LiveKitWebRTC`）。App 体积会增加约 20 到 30 MB。工作量：通话界面和状态 2 天（38）、openai 2 天（39）、fish 2 天（40）。

## 8. 测试与 CI
### 8.1 工作流一览
| 工作流 | 运行环境 | 触发 | 内容 | 归属 |
|---|---|---|---|---|
| `Mobile builds`（`mobile.yml`） | macos-26 | PR 改到 `mobile/ios/**`；push 只在 main | 编译一次，CryKit 测试、CryBotTests（含选中功能的 App 内截图）、CryBotWatchTests、选中功能的 XCUITest（iPhone 16） | 01 建，04 加截图 |
| `iOS nightly`（`ios-nightly.yml`） | macos-26 | 每晚一次（北京时间 03:17）和手动 | 全部单元测试和 App 内截图；XCUITest 交互流程在三种机型上各跑一遍；每周一下载 iOS 18 运行时再跑一遍 CryBotTests | 04 |
| `iOS Linux`（`ios-linux.yml`） | ubuntu | PR 改到 `mobile/ios/**`、`shared/**`、`src/locales/**` | CryCore、CryNetLogic、CryRFB 的 `swift test`；`gen-strings --check`；命名检查；全部 Swift 文件语法检查 | 43 |
| `CI` 的 `ios-contract` job（`ci.yml`） | ubuntu | 照 `ci.yml` 现有触发 | 契约样本比对 | 00 |
| `Public scan`（`public-scan.yml`） | ubuntu | 每个 PR | 只扫 PR 新增的行（第 13 节） | 45 |

- `shared/**` 和 `src/locales/**` 不再触发 macOS job，只跑 ubuntu 上的检查。
- 三个新工作流放独立文件，避免几个任务同时改 `ci.yml`。

### 8.2 `Mobile builds` 的写法（01 和 04）
- 显式选 Xcode 26；`concurrency: { group: mobile-${{ github.ref }}, cancel-in-progress: true }`，同一分支有新推送时取消旧运行。
- 缓存 SPM（`~/Library/Caches/org.swift.swiftpm` 和 `SourcePackages`），键用 `Package.resolved` 的哈希。
- 提交 `Package.resolved`：`.xcodeproj` 由 XcodeGen 生成、不进仓库，所以锁定文件放 `mobile/ios/Package.resolved`。01 的 PR 第一次运行时把 `CryBot.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` 上传为产物，协调者提交进 PR；之后每次 `xcodegen generate` 后先把它复制回这个位置，`xcodebuild` 加 `-disableAutomaticPackageResolution` 和 `-clonedSourcePackagesDirPath SourcePackages`，LiveKit 的间接依赖每次都一样。
- 编译一次：`xcodebuild build-for-testing` 用同一个 DerivedData，之后各测试都用 `test-without-building`。
- 截图测试的选择（04 的 `ui-test-selection.sh`）：按改动路径算出功能名列表；改到 `App`、`Store`、`Design`、`project.yml`、`Packages` 时选全部。功能名通过环境变量 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 传给 App 内截图（xcodebuild 会去掉 `TEST_RUNNER_` 前缀，测试里读 `CRY_SNAPSHOT_FEATURES`）；XCUITest 用 `-only-testing:CryBotUITests/<名字>FlowTests`。跑完检查 xcresult 里实际执行的测试数：选中了却是 0 个，job 失败。

### 8.3 截图
- App 内截图（静态页面，大部分截图走这里）：`CryBotTests/Support/SnapshotCase.swift`（04）。把视图放进 `UIHostingController`，挂到给定尺寸的 `UIWindow`，设置深浅色和安全区，用 `drawHierarchy(in:afterScreenUpdates:)` 出图。不用 `ImageRenderer`，因为它画不出 List、ScrollView 和 UIKit 包装视图。三种屏宽：
  - `se`：375×667，上安全区 20；
  - `16`：393×852，上 59、下 34；
  - `promax`：440×956，上 62、下 34。
  每个场景出 6 张：3 种屏宽 × 深浅。名字 `<功能>-<场景>-<se|16|promax>-<light|dark>`，存成 keepAlways 附件。`CRY_SNAPSHOT_FEATURES` 不含本功能（也不是 `all`）时 `XCTSkip`；没设这个变量时（本地运行）全部执行。测试类命名 `<名字>SnapshotTests`。
- XCUITest（只留交互流程：点按、输入、键盘、滚动定位、流式跟随）：`CryBotUITests/Support/ScreenshotCase.swift`（04），提供 `launch(scenario:appearance:)` 和 `snap(_:)`。测试类命名 `<名字>FlowTests`，放 `CryBotUITests/<名字>/`。PR 上只在 iPhone 16 跑，每晚在三种机型上跑。机型缺失时 `simctl create` 补建；没有 iPhone SE（第 3 代）时退到 iPhone 16e，并在日志里打印出来。
- 导出：`xcrun xcresulttool export attachments` 导出 PNG，上传产物 `ios-screenshots`。
- 时间目标：PR 上的 `Mobile builds` 30 分钟内；每晚全量 90 分钟内。

### 8.4 单元测试
解码测试优先用契约样本，状态逻辑像调用方那样调用，断言具体值。纯逻辑放 `Logic/` 目录，方便在 Linux 上先查一遍。

### 8.5 Linux 自测（43）
- 工具链由协调者装在宿主机，派活时放进 PATH。沙箱里 Astra 只能写工作区，所以所有缓存都指到工作区里，脚本 `mobile/ios/scripts/linux-test.sh` 统一设置：
  - `swift test --package-path mobile/ios/Packages/CryKit --scratch-path mobile/ios/.linux-build --cache-path mobile/ios/.linux-cache/swiftpm --config-path mobile/ios/.linux-cache/config --security-path mobile/ios/.linux-cache/security`
  - `XDG_CACHE_HOME`、`CLANG_MODULE_CACHE_PATH`、`SWIFTPM_MODULECACHE_OVERRIDE`、`HOME` 指到 `mobile/ios/.linux-cache/` 下。
  - 这几个目录加进 `.gitignore`。
- 在 Linux 上只编 CryCore、CryNetLogic、CryRFB 和它们的测试：`Package.swift` 里用 `#if os(Linux)` 去掉 CryNet 和 CryNetTests。
- `mobile/ios/scripts/linux-check.sh`：对 `mobile/ios` 下全部 Swift 文件跑 `swiftc -parse`（只查语法）；把每个 `Features/*/Logic/` 和 CryCore 一起 `swiftc -typecheck`；扫描新增类型声明，命中第 1.5 节的禁用名单就失败。
- 每个任务的派活说明里都写：交回前先跑 `linux-test.sh` 和 `linux-check.sh`，把输出贴进报告。

## 9. 页面清单（逐行验收）
| # | 页面或能力 | 网页对应 | 任务 |
|---|---|---|---|
| 1 | 首次启动：服务器地址、接力登录、配对码（含扫码）、邮箱登录、退出登录 | /pair、登录页 | 05 |
| 2 | 机器人和群聊列表：分组、排序、未读、搜索、置顶，进入聊天 | Sidebar | 07 |
| 3 | 机器人头像和吉祥物（表情、身体、脸色、自定义图片和裁剪），人员头像 | Avatar、AnimatedMascot、CarvedAvatar | 06 |
| 4 | 单聊：时间线、翻页、跳转、流式输出、停止、排队和引导、表情、编辑和分支、已读 | ChatView | 08 |
| 5 | 聊天内查找 | ChatFindBar | 47 |
| 6 | 输入框：文字、@提及、斜杠命令、图片、文件、拍照、语音录制和转写 | Composer | 09 |
| 7 | 工具调用、活动、审批中的运行项 | activity、runtime | 10 |
| 8 | Markdown、表格、链接、提及 | ChatMarkdown | 11 |
| 9 | 代码高亮、数学公式 | shiki、katex | 12 |
| 10 | mermaid 图 | mermaid | 13 |
| 11 | 图片、文件、语音附件，大图查看，下载和分享，朗读回复 | 附件组件、tts | 14 |
| 12 | 审批、提问、选择类卡片 | ApprovalCard、AskCard、QuestionCard、OptionCard | 15 |
| 13 | 请求类卡片（17 种，见第 2 节） | OptionCard 子类型、wait、computer-ask、bot-access、outside-write | 16 |
| 14 | 连接器、密钥、登录卡片 | ConnectorCard、SecretRequestCard、SignInRequestCard | 17 |
| 15 | 运行记录类消息行 | routine.run 等 | 18 |
| 16 | 消息附加信息：设置建议卡、助手介绍、等待行、问题报告状态、各种小标签、引用回复、来自 App、发送者 | wire.ts:459-614 的字段 | 44 |
| 17 | widget 全部节点 | widget/ | 19 |
| 18 | 图表和数据卡片 | data/、widget-chart | 20 |
| 19 | `app` 类 HTML 消息、Web 面板、已发布 App | app/、WebPanelPage、published-apps | 21 |
| 20 | 群聊和房间面板 | GroupView、room-panel | 22 |
| 21 | 收件箱、通知、App 内提醒 | inbox/、NotificationsPanel | 23 |
| 22 | 自动化：日历、列表、运行记录、Webhook、App 触发器 | RoutineCalendarPage、automations/、routines/ | 24 |
| 23 | 文件 | FilesView | 25 |
| 24 | 团队地图 | TeamMapPage | 26 |
| 25 | MCP 服务器和插件 | McpServersPanel、McpServerEditor、PluginsPanel | 27 |
| 26 | 机器人设置，以及面板里的高级分区（setup、model、instructions、approvals、always、voice、blurb、team、chiefteams、mcp、tools、webhooks、slack、overview、prompt、history） | bot-settings/、keys/、bot-access/ | 28 |
| 27 | 机器人面板外壳和详情页（settings、apps、routines、visibility，以及详情页上的其他行） | bot-panel/ 的 PanelShell、DetailsTab、SettingsPage | 29 |
| 28 | 机器人面板资料库和电脑页（memory、skills、folder、browser、where、android），会话列表和分享 | LibraryTab、ComputerTab、Conversations、conversation-share/ | 46 |
| 29 | 新建机器人和团队设置 | 新建流程 | 30 |
| 30 | 设置：overview、account、plan、app、general、appearance | settings/pages | 31 |
| 31 | 设置：ai、bots、vault、usage | settings/pages、usage/ | 32 |
| 32 | 设置：phone、desktops、transfer、data、people、installations | settings/pages | 33 |
| 33 | 远程桌面 | DesktopViewer、LiveDesktop | 34、35 |
| 34 | 内置浏览器画面、USB 手机画面、机器人屏幕帧 | BrowserPanel、phone-screen | 36 |
| 35 | 电脑面板 | ComputerPanel | 37 |
| 36 | 实时语音通话 | CallView | 38、39、40 |
| 37 | 手表令牌同步 | WatchSync | 05 |

`page-registry.ts` 的 26 个 `PageId` 每个都在第 26 到 28 行里有归属；第 12 节的覆盖表按 `PageId` 逐个登记。

## 10. 新增第三方依赖（只限本表）
| 依赖 | 许可 | 用途 | 为什么不用系统框架 |
|---|---|---|---|
| apple/swift-markdown（含 swift-cmark） | Apache-2.0 | 解析 GFM | 系统 AttributedString 的 Markdown 不支持表格、块结构和流式 |
| SwiftMath | MIT | 原生排版 LaTeX 公式 | 系统没有公式排版 |
| HighlightSwift | MIT | 代码高亮（JavaScriptCore 里跑 highlight.js，不是网页视图） | 系统没有语法高亮 |
| livekit/client-sdk-swift（含 LiveKitWebRTC） | Apache-2.0 / BSD | fish 通话用 LiveKit；openai 和 azure 通话复用其中的 WebRTC | 系统没有 WebRTC |
| mermaid.min.js（打包成资源，不是 SPM） | MIT | 离屏渲染 mermaid | 没有原生实现 |

所有依赖锁定版本（`Package.resolved` 提交进仓库），许可文本放进 `third_party/`，并在 App 的「关于」页列出。

## 11. 给开发的通用规则（每个任务说明都会引用）
1. 先读本规格第 1、2、8、11 节和第 1.4 节的入口表，只改自己任务说明里「可以改」的路径。
2. 没有 Xcode：写完后不要声称「编译通过」。交回前跑 `mobile/ios/scripts/linux-test.sh` 和 `linux-check.sh`（43 合并后才有），把输出贴进报告；App 的编译由协调者推分支跑 Actions，失败日志会作为返工意见发回。
3. 每个新类型、新状态逻辑都要有单元测试；纯逻辑放 `Features/<名字>/Logic/`，只 import Foundation 和 CryCore。每个页面都要有 App 内截图（`<名字>SnapshotTests`）；有交互流程的再加 `<名字>FlowTests`。
4. 类型命名遵守第 1.5 节。
5. 界面里的每个可操作元素都加 `accessibilityIdentifier`，命名为 `<功能>.<元素>`，UI 测试按它定位。
6. 文案用自己功能目录的 `.xcstrings`，英文和简体中文都要有。能用网页已有文案的，用任务 04 的生成器从 `src/locales` 引入，不手抄。
7. 夹具只用 `example.com` 和虚构名字。
8. 不 git 提交；不装依赖；需要新依赖或要改 `project.yml` 时写进报告。

## 12. 跟上网页的变化
网页在开发期间还会继续加功能。三道关：
1. 覆盖表（00）：`server/testing/ios-contract/coverage.ts` 用 TS 的 `Record<联合类型, IosStatus>` 列全：`WireMessage["kind"]`、`ServerFrame["kind"]`、`keyof WireMessage`、`keyof OptionCardData`、widget `SPECS` 的键、设置页 id、机器人面板 `PageId`、RuntimeEvent 类型。`IosStatus` 是 `{ ios: "done" } | { ios: "todo"; task: string } | { ios: "skip"; reason: string }`。网页一加新成员，网页自己的 PR 里 `check` job 的 tsc 就报错，开发者必须登记。登记「待做」的项，协调者决定挂到哪个任务或追加新任务。iOS 任务自己不改覆盖表（避免并行任务改同一个文件），只在报告里列出本任务完成了哪些项；协调者合并后把这些项改成「完成」，攒在每周差异清单那次一起提交。
2. 往返比较（01）：见第 2 节。光比对样本文件，跑一下 `--update` 就绿了，管不住字段漏读；往返比较能管住。
3. 每周差异清单（00 提供脚本，协调者每周一跑）：`node scripts/ios-web-drift.mjs --since <基线>` 列出基线到 main 之间 `shared/` 和 `src/components/` 的改动（文件、增删行数、新增的导出和类型成员），协调者决定要不要加任务，处理完把「来源」里的基线前移。

## 13. 公开仓库扫描（45）
- `public-scan.yml`（ubuntu，每个 PR）运行 `scripts/public-scan/scan.mjs`，只看 `git diff` 里 PR 新增的行，覆盖整个仓库（含 `docs/tasks`、`docs/specs`、`server/testing`、`third_party`）。
- 规则：
  - 域名只放行 `example.com`、`*.example.com`、`*.invalid`，以及 `scripts/public-scan/allow-domains.txt` 里的公共域名（初始只放开源许可和官方文档要用的几个，增删由协调者审）；
  - IP 只放行 `127.0.0.1`、`::1` 和文档专用网段（192.0.2.0/24、198.51.100.0/24、203.0.113.0/24），内网网段也拦；
  - 拦 JWT（`eyJ` 开头的三段式）、`cry_sess_` 和 `cry_session_` 后面跟真实值的令牌、不是占位值的 UUID（占位值指全零或 `00000000-0000-4000-8000-` 开头）；
  - 邮箱只放行 `@example.com`；
  - 内部域名、人名和实例 ID 用 SHA-256 哈希黑名单比对：把新增行切成词（域名、标识符、中文人名按 2 到 4 字滑窗），小写后算哈希，命中就失败并报行号，不打印命中的原文。名单文件 `scripts/public-scan/denylist.sha256` 只存哈希，由协调者在本机生成和更新。
- 另请管理员在 GitHub 上打开 secret scanning 和推送拦截（公开仓库免费）。真机截图不放进 PR。

## 14. T-1222 接口预留
本节按 T-1222 规格（`docs/specs/2026-11-14-unified-login.md`）第 5 节「与 T-1221 的衔接」写；两边不一致时以 T-1222 第 5 节为准。

- 登录存储（03）：`SessionRecord` 带 `version` 和 `method`，地址分 `webURL` 和 `apiURL`，`cfAuthorization`、`cfExpires` 可选，过期规则按登录方式分开（第 3 节）。`method` 枚举里有 `.feishu`（编码为 `"feishu"`），T-1222 的飞书登录写它、不用 `other("feishu")`，记录不带 CF 字段，过期规则和 `pairing`、`email` 相同，以服务端返回的过期时间为准。
- 网络（03）：`HTTPClient` 只在 `cfAuthorization` 有值时才带 `Cookie: CF_Authorization=…`，只有 Bearer 时照常工作；`Set-Cookie` 轮换保留但不是必经路径；CF JWT 临期提示只在有 `cfExpires` 时出现。测试要断言「只有 Bearer」时的请求头：不带 CF cookie、不带 Origin。
- 回调（03）：
  - URL scheme 保持 `crybot`，按 host 区分用途：`crybot://auth` 给接力回调，`crybot://feishu` 给 T-1222 的飞书回跳（host 不同，互不接走）。
  - 接力回调 `crybot://auth` 按 `v` 分发，`HandoffRegistry.register(version:handler:)`。
  - 回调注册点 `CallbackRouter`：`register(host:handler:)` 接 `crybot://<host>`，`register(httpsPath:handler:)` 接 `https://<CRYBOT_APP_LINK_HOST><path>`（Universal Link，主机名比较不区分大小写，路径整段精确匹配）。03 注册接力的 host `auth` 和路径 `/auth/app-return`；T-1222-06 注册 `feishu` 和 `/auth/feishu/app-return`。
  - **T-1220 的 iOS 行为由 03 接手**（T-1220 的 `ViewController.swift` 不搬，02 删掉它）：最低 iOS 17；17.4 及以上且有 `CRYBOT_APP_LINK_HOST` 时接力用 https 回调 `/auth/app-return`，17.0–17.3 或主机名为空时用 `crybot://auth` 自定义 scheme；设了主机名时 `crybot://auth` 仍可用、不吞掉；两种都交给 `HandoffRegistry` 按 `v` 分发。回调方式由 CryNetLogic 的 `HandoffCallbackMode.choose` 决定，05 照它建 `ASWebAuthenticationSession`。不保留 T-1220 在 17.4 以下打开 Safari 等回跳的路径。17.0–17.3 依赖 T-1222 任务 02 改造的 `/auth/app-return` 兜底页：服务器配了应用链接时接力一律跳到 https 的 `/auth/app-return`，`crybot` scheme 的会话截不到它，要靠这个页面再跳 `crybot://auth?<原查询串>`（T-1222 规格第 3.4 节）；17.4 起的 https 回调在页面加载前就被截走，不受影响。
  - App 入口（02）：Universal Links 用 `onContinueUserActivity(NSUserActivityTypeBrowsingWeb)`，自定义 scheme 用 `onOpenURL`，两者和 `ASWebAuthenticationSession` 完成时拿到的 URL 都只经 `LoginRouter.handle(url:)` 交给 `CallbackRouter.handle`，入口里不解析 URL。
- 登录界面（05）：
  - `LoginFlowView` 预留「首选登录方式」插槽：T-1222-06 在描述里有 `feishu` 时把飞书按钮放进去、排第一位；旧接力只在没有首选方式时显示。
  - `LoginRouter.handle(url:)` 走 03 的 `CallbackRouter`，不写死只认 `crybot://auth`。
  - 手表凭据合同（`cfAuthorization` 可选）由 T-1222-07 完成，05 依赖它，`Shared/` 仍禁改。
- 工程（01）：
  - T-1220 的 iOS 部分（`project.yml`、entitlements、`ViewController.swift`）一律归 01；T-1222-02 只并 T-1220 的服务端和安卓改动，不碰 `mobile/ios`。两个任务互不依赖，谁先合都行。
  - 保留 T-1220 的设置：构建参数 `CRYBOT_APP_LINK_HOST`、`CRYBOT_IOS_ENTITLEMENTS`（默认值 `CryBot/CryBot.entitlements`，不用 T-1220 的空值），CryBot target 的 `CODE_SIGN_ENTITLEMENTS: $(CRYBOT_IOS_ENTITLEMENTS)`，Info.plist 的 `CRYBOT_APP_LINK_HOST` 键。不再用本规格原先计划的 `CRYBOT_LINK_DOMAIN`、`CryBot.links.entitlements`、`CRYBOT_ENTITLEMENTS_FILE`。
  - 一个 target 只能用一个 entitlements 文件，所以 keychain 共享组 `keychain-access-groups: $(AppIdentifierPrefix)com.crysound.crybot.shared` 两份都写：`CryBot/CryBot.entitlements`（只有 keychain 组，`CRYBOT_IOS_ENTITLEMENTS` 的默认值）和 T-1220 的 `CryBot/CryBot-AppLinks.entitlements`（keychain 组 + `applinks:$(CRYBOT_APP_LINK_HOST)` + `webcredentials:$(CRYBOT_APP_LINK_HOST)`），由 `CRYBOT_IOS_ENTITLEMENTS` 选择。
  - 第 1 期 `SessionStore` 不传共享组（模拟器无签名构建下指定共享组会报缺少 entitlement）。
  - 启用 Associated Domains 要在 Apple 开发者后台给 App ID 打开该能力并重新生成描述文件，属于停止条件，由 T-1222 任务 09 列为协调者步骤；开发阶段默认用只有 keychain 组的那份。
- 发版（41）：发版前核对描述文件里有 Associated Domains，有就用 AppLinks 那份 entitlements 构建，`CRYBOT_APP_LINK_HOST` 取公开仓库的 Actions 仓库变量 `vars.CRYBOT_APP_LINK_HOST`（variables 不是 secrets，值是公开的 App 通道主机名，由协调者按 T-1222 规格第 6 节发版顺序设置），为空就停手汇报；核对带 keychain 组的 entitlements 能用描述文件签名，不能的话先去掉这一项并报告；仓库密钥 `CRYBOT_SERVER_URL` 指向 App 通道由协调者按 T-1222 规格第 6 节的发版顺序改，41 只核对。

## 任务拆分
| 编号 | 名称 | 依赖 | 估计（天） |
|---|---|---|---|
| 00 | 服务端契约样本、覆盖表和差异清单 | — | 3 |
| 01 | 协议层与工程基础 | — | 3 |
| 02 | App 骨架与夹具模式 | 01 | 2.5 |
| 03 | 网络与身份核心 | 01 | 2 |
| 04 | 截图流水线与文案生成器 | 01 | 2 |
| 05 | 登录、实时连接与手表同步 | 02、03、04、T-1222-07 | 2.5 |
| 06 | 头像与吉祥物 | 02、04 | 2 |
| 07 | 会话列表 | 02、04 | 2 |
| 08 | 单聊时间线 | 02、04 | 2 |
| 09 | 输入框 | 02、04 | 2 |
| 10 | 活动与运行项 | 02、04 | 1.5 |
| 11 | Markdown | 02、04 | 2 |
| 12 | 代码高亮与公式 | 02、04 | 1.5 |
| 13 | mermaid | 02、04 | 1.5 |
| 14 | 附件与媒体 | 02、04 | 2 |
| 15 | 审批与提问卡片 | 02、04 | 2 |
| 16 | 请求类卡片 | 02、04 | 2.5 |
| 17 | 连接器、密钥与登录卡片 | 02、04 | 1.5 |
| 18 | 运行记录消息行 | 02、04 | 1.5 |
| 19 | widget 渲染 | 02、04 | 2 |
| 20 | 图表与数据卡片 | 02、04 | 2 |
| 21 | 网页内容（app 消息、Web 面板、已发布 App） | 02、04 | 2 |
| 22 | 群聊 | 08 | 2 |
| 23 | 收件箱与通知 | 02、04 | 1.5 |
| 24 | 自动化 | 02、04 | 3 |
| 25 | 文件 | 02、04 | 1.5 |
| 26 | 团队地图 | 02、04 | 1.5 |
| 27 | MCP 与插件 | 02、04 | 2 |
| 28 | 机器人设置（含面板高级分区） | 02、04 | 2.5 |
| 29 | 机器人面板：外壳与详情页 | 02、04 | 2.5 |
| 30 | 新建机器人 | 02、04 | 1.5 |
| 31 | 设置（基础） | 02、04 | 1.5 |
| 32 | 设置（AI、机器人默认值、密钥库、用量） | 02、04 | 2 |
| 33 | 设置（管理） | 02、04 | 2 |
| 34 | RFB 协议核心 | 01 | 2 |
| 35 | 远程桌面查看器 | 34、02、03、04 | 2 |
| 36 | 浏览器与手机画面 | 02、03、04 | 2 |
| 37 | 电脑面板 | 02、04 | 2 |
| 38 | 通话界面与状态 | 02、04 | 2 |
| 39 | openai 和 azure 通话传输 | 38、03 | 2 |
| 40 | fish 通话传输 | 38、03 | 2 |
| 41 | 发版与收尾 | 00、05–40、43–47 | 1 |
| 42 | 对照验收 | 00–41、43–47 | 2 |
| 43 | Linux 自测通道 | 01、04 | 1.5 |
| 44 | 消息附加信息 | 02、04 | 2 |
| 45 | 公开仓库扫描 | — | 1 |
| 46 | 机器人面板：资料库、电脑页与会话列表 | 02、04 | 2 |
| 47 | 聊天内查找 | 02、04 | 1 |

合计 48 个任务，约 93 天工作量（第 1 轮是 43 个、80 天；补漏的功能按审核估计加了 7.5 天，风险措施加了 5.5 天）。依赖链最长的是 01 → 02 → 08 → 22 → 41 → 42，约 12.5 天。按 5 路并行排（基础任务优先，其次「能聊天」那批），纯工期约 24 天；加上审核、返工和 Actions 排队，约 28 天。工期不能再靠加路数压：02 合并后的功能任务本身不互相依赖，瓶颈是审核返工速度和 macOS runner。

## 里程碑（按 5 路，纯工期 / 含审核返工）
- [ ] 基础可用（第 6.5 天 / 第 8 天）：00–04、43、45 合并，34 在做；PR 上 `Mobile builds`、`iOS Linux`、`Public scan` 和 `ios-contract` 都是绿的，夹具模式能出空壳截图。02 合并后先停半天：协调者拿 08、15、44 三个任务对照入口签名，确认够用再派满 5 路。
- [ ] 能聊天（第 12.5 天 / 第 15 天）：05–18、22、44、47 合并；TestFlight 内部包真机试用一次（登录三种方式、手表、键盘、滚动、流式），给用户发真机截图。
- [ ] 功能齐（第 21 天 / 第 25 天）：19–40、46 合并；第 9 节每一行都有原生实现和截图，覆盖表里没有「待做」。
- [ ] 可发版（第 24 天 / 第 28 天）：41、42 完成；TestFlight 内部包通过真机自测，用户确认后再发外部测试。

## 进度
状态：未开始
更新：2026-11-14
当前里程碑：基础可用

### 已完成
- 规格第 1 轮审核意见已全部处理（见「合同变更」）。
### 下一步
协调者在宿主机装 Linux 版 Swift 工具链并试跑一次（swift.org 有没有 Ubuntu 26.04 的包、24.04 的包能不能用，都要实测）；并行派 00、01、45。
### 阻塞

## 合同变更
- 2026-11-14，规格审核第 1 轮返工：
  - 入口改名和拆分：`TimelineView` 改 `ThreadTimelineView`；设置页拆成 `SettingsAIPageView`、`SettingsAdminPageView`；CryKit 避开 `ServerAddress`、`SendResult` 等与手表共享代码同名的类型（第 1.5 节）。
  - 补漏：消息附加信息（44）、聊天内查找（47）、机器人面板资料库和电脑页及会话列表（46）；请求类卡片加上 wait、computer-ask、access、outside-write 四种；全部 `ServerFrame` 都有去处；AppStore 加帧订阅、导航和退出登录接口；共用类型写全（第 1.6 节）。
  - 手表：`cfAuthorization` 改成可选，05 可以改 `Shared/`。
  - CI：截图测试类命名规则和「选中 0 个就失败」；`Mobile builds` 只编译一次、加 concurrency、提交 `Package.resolved`、缓存 SPM；`shared/**` 和 `src/locales/**` 改走 ubuntu；静态页面改 App 内截图，全量截图改每晚；00 的验收只要求 `check` 和 `ios-contract` 两个 job 绿。
  - 新增 Linux 自测（43）、公开仓库扫描（45）、覆盖表和往返比较和每周差异清单（第 12 节）、T-1222 预留（第 14 节）。
  - 10 条待确认项按建议定下，搬进「已定的决定」。
  - 工期：43 个任务 80 天、4 路约 29 天，改为 48 个任务 93 天、5 路约 28 天。
- 2026-11-14，与 T-1222 对齐（协调者定）：
  - 手表 `cfAuthorization` 可选改归 T-1222-07，05 依赖 T-1222-07、不改 `Shared/`（已定的决定第 11 条、第 1.1 节、范围、任务 05）。
  - 第 14 节按 T-1222 规格第 5 节重写：沿用 T-1220 的 `CRYBOT_APP_LINK_HOST`、`CRYBOT_IOS_ENTITLEMENTS`、`CryBot-AppLinks.entitlements`，弃用 `CRYBOT_LINK_DOMAIN`、`CryBot.links.entitlements`；两份 entitlements 都带 keychain 组；回调按 host 分 `crybot://auth`（接力）和 `crybot://feishu`（飞书），加回调注册点 `CallbackRouter`；登录页加首选登录方式插槽；41 发版前核对 Associated Domains。任务 01、03、05、41 同步修改。
- 2026-11-14，与 T-1222 对齐第 2 轮（协调者定）：
  - T-1220 的 iOS 接力回调行为由 03 接手：注册 `/auth/app-return`，17.4 起用 https 回调、17.0–17.3 用 `crybot://auth`，设了主机名也不吞掉 `crybot://auth`（第 3、14 节，任务 03、05）。
  - T-1220 的 iOS 部分全归 01，T-1222-02 不碰 `mobile/ios`，两者互不依赖；`CRYBOT_IOS_ENTITLEMENTS` 默认 `CryBot/CryBot.entitlements`（第 14 节，任务 01）。
  - 登录方式枚举加 `.feishu`，过期规则同服务端签发的 Bearer 会话（第 3、14 节，任务 03、05）。
  - 41 的 `CRYBOT_APP_LINK_HOST` 取仓库变量 `vars.CRYBOT_APP_LINK_HOST`，为空停手（第 14 节，任务 41）。
  - 02 的回调入口：Universal Links 用 `onContinueUserActivity`，自定义 scheme 用 `onOpenURL`，都只经 `LoginRouter` 交给 `CallbackRouter`（第 14 节，任务 02）。
- 2026-11-14，与 T-1222 对齐第 3 轮（协调者定）：iOS 17.0–17.3 的接力回调依赖 T-1222-02 的 `/auth/app-return` 兜底页再跳 `crybot://auth`（第 14 节，任务 03、05）。
