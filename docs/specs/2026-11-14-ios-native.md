# 把 iOS App 重做成原生 SwiftUI 应用（常用部分原生，其余内嵌网页）

## 合同

### 结果
iPhone 上的 Cry Bot 改成：每天常用的部分用 SwiftUI/UIKit 原生绘制，不常用的部分在 App 里内嵌网页打开。分界见第 9 节「做法」列。
- 原生：登录、实时连接、手表令牌同步；机器人和群聊列表；头像和吉祥物；单聊时间线（含引用回复和发送者）和群聊；输入框；活动与运行项；Markdown、表格、代码高亮、公式（mermaid 只显示源码加复制）；附件与媒体；审批与提问卡片；请求类卡片、连接器/密钥/登录卡片、运行记录行和其余消息附加信息里常见的几种（少见的显示一行摘要加「在网页里处理」按钮）；收件箱、通知、App 内提醒；远程桌面查看。
- 内嵌网页：各设置页、机器人设置和机器人面板（含资料库、电脑页、会话列表和分享）、新建机器人、自动化、文件、团队地图、MCP 与插件、widget 和图表/数据卡片消息（消息里显示摘要，点开内嵌网页）、`app` 类 HTML 消息和 Web 面板、浏览器和 USB 手机画面、电脑面板、实时语音通话。这些模块从原生界面的入口进入，在 App 内统一的网页容器（任务 48）里打开当前服务器的对应网页，登录状态由 App 带过去，不用再登录一次。实时通话在网页容器里跑网页版；做不成就先不提供通话入口。
- 第 1 期不做：聊天内查找。

登录方式不变：有 Cloudflare Access 的部署走 T-1218 接力登录，没有 Access 的部署用配对码或邮箱登录。手表继续可用，令牌改从原生存储取，没有 CF 令牌的部署上手表也能用。约 1 周半出可用版：2026-11-24 用当天已合并的部分出 TestFlight 内部测试包真机自测，11-25 前给用户发真机截图（没合并的项单独列出）；可用版全部合并后再出内部包，用户确认后再发外部测试。

### 验收
1. `mobile/ios` 里的网页视图只能出现在规定的地方。用 `grep -rnE "import WebKit|WKWebView|WebView\(|WebPage" mobile/ios` 检查，每处命中只能属于两类：内嵌网页容器 `Features/WebHost`（任务 48；`app` 类 HTML 消息、Web 面板和第 9 节所有「内嵌网页」模块都经它打开）、旧版 cookie 迁移（`Features/Login/LegacyCookieMigration.swift`，只读写 cookie，不加载网页）。功能任务不自己建网页视图。
2. GitHub Actions 全绿：
   - PR 上的 `Mobile builds`：CryKit 包测试、CryBotTests（含本次改动功能的 App 内截图）、CryBotWatchTests、本次改动功能的 XCUITest 交互流程（iPhone 16）。
   - main 上的 `iOS nightly`（每晚一次）：全部单元测试、全部 App 内截图（三种屏宽、深浅两色）、全部 XCUITest 交互流程在 iPhone SE（第 3 代）、iPhone 16、iPhone 16 Pro Max 上各跑一遍。
   - `iOS Linux`：CryCore、CryNetLogic、CryRFB 在 ubuntu 上 `swift test` 通过，文案表检查通过。
3. 截图产物覆盖第 9 节「页面清单」里做法为「原生」的每一行；做法为「内嵌网页」的行只截原生入口（菜单项、按钮、消息摘要行）和网页容器外框，不截网页内容（第 8.3 节）。审核员逐张看过：没有截断、没有横向溢出、深色下文字可读。
4. `CI` 工作流的 `ios-contract` job 是绿的。故意改一个 `shared/wire.ts` 里 iOS 用到的字段，它必须变红；往 `WireMessage.kind` 加一个新值而不登记覆盖表，`check` job 的 tsc 必须报错（都在任务 00 的 PR 里演示一次并贴出运行链接）。
5. 第 9 节每一行都按「做法」列落实：「原生」行有原生实现；「内嵌网页」行有原生入口，并能在网页容器里打开对应路由；「不做」行在覆盖表里写明原因。最后由任务 42 逐行核对并附截图；第 12 节的覆盖表里没有「待做」项。
6. 真机自测（协调者或用户用 TestFlight 内部测试包）：三种登录方式都能进；手表在接力登录和配对码登录两种情况下都能拿到令牌；能收发消息、审批卡片能点、远程桌面能看能点；第 9 节每个「内嵌网页」模块都能从入口打开，登录状态带得过去（接力登录和配对码登录两种情况下都不出现网页登录页）。
7. 公开仓库：`Public scan` 工作流在每个 PR 上是绿的；新增的代码、测试、文档和夹具里没有内部域名、IP、邮箱、人名、密钥或真实实例 ID。夹具里的地址只用 `example.com`。

### 范围
做：
- iPhone App（target `CryBot`）改为「常用部分原生、其余内嵌网页」。iPad 沿用同一套自适应布局，可以用，但第 1 期不出 iPad 截图，只在任务 42 抽查一次。
- 第 9 节清单逐项按「做法」列落实：「原生」行由各功能任务做；「内嵌网页」行由任务 48 提供统一网页容器、原生入口和打开的网页路由（网页缺可直达的路由时，48 可以在前端加路由，不算改服务端接口）。
- 新增本地 Swift 包 `CryKit`、两个测试 target、App 内截图和交互截图流水线、Linux 自测通道、服务端契约样本和覆盖表、公开仓库扫描。
- `WatchSync` 的令牌来源改成原生存储（任务 05）。`Shared/WatchContract.swift` 里的 `cfAuthorization` 改成可选由 T-1222-07 完成，它必须在 05 开工前合并；本规格的任务都不改 `Shared/`、`CryBotWatch/`、`CryBotWatchTests/`。
- 发版工作流适配新工程。
- 为 T-1222（飞书登录）预留接口：登录存储带版本号和登录方式、CF 字段可选、地址分网页入口和 API 入口、接力回调按 `v` 分发、回调注册点、登录页的首选登录方式插槽、工程里保留 T-1220 的 Associated Domains 设置并在两份 entitlements 里都写 Keychain 共享组（第 14 节；以 T-1222 规格第 5 节为准）。

不做：
- 系统推送（APNs）。放第 2 期。第 1 期只在 App 打开时显示 SSE `notify` 帧带来的 App 内提醒。
- 安卓。本期不改 `mobile/android`。
- 只在 Electron 桌面版里存在的功能，也就是依赖 `window.cry` 桥的部分：开机自启、本机电脑控制、本地 Ollama、桌面版更新、USB 主机端等。设置页改走内嵌网页后，这类条目由网页按「没有 `window.cry`」的现有逻辑处理，网页容器不注入这个桥；覆盖表里标「不做」并写原因。
- 第 9 节做法为「内嵌网页」的模块，第 1 期不做原生版本（设置、机器人设置和面板、新建机器人、自动化、文件、团队地图、MCP 与插件、widget、图表和数据卡片、`app` 类消息和 Web 面板、浏览器和 USB 手机画面、电脑面板、实时语音通话）。
- 聊天内查找。
- mermaid 图形渲染：只显示源码加复制。
- 除 daylight（浅色）和 midnight（深色）以外的 11 种皮肤。
- 同时登录多个服务器。第 1 期只有一个当前服务器，可以更换。
- 飞书登录本身（T-1222），本期只预留接口。

### 约束
- 原生的定义：第 9 节做法为「原生」的页面都用 SwiftUI/UIKit 原生控件绘制，不许用网页视图凑。网页视图只允许出现在验收第 1 条列出的地方；「内嵌网页」模块一律经任务 48 的 `Features/WebHost` 打开。
- 内嵌网页不改服务端鉴权：会话怎么带给网页按第 7.6 节。唯一的服务端改动是 48 在 `GET /api/auth/session` 的返回里加网页会话 cookie 的名字（只是名字，不新增凭证、不新增接口），范围见第 1.3 节。
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
- 需要改服务端接口、鉴权或接力协议。任务 00 加测试、样本和覆盖表不算；任务 48 在前端（`src/`）加可直达的路由、在 `GET /api/auth/session` 返回里加 cookie 名（第 1.3 节限定的那一处）也不算。
- 需要 Apple 签名凭据、App Store Connect 操作、描述文件改动（例如打开 Associated Domains）或付费服务。
- 原生清单（第 9 节做法为「原生」）里的某个页面做不成原生，想退回网页。
- 要改「已定的决定」里任何一条。
- Actions 的 macOS 并发或分钟数不够用。

### 已定的决定
- 2026-11-14，用户：iOS 全部原生重做，第 1 期全部做完再发；不要网页形态；APNs 放第 2 期。（「全部原生」「全部做完再发」「不要网页形态」已被本节「2026-11-14，用户（范围缩小）」那一条取代；APNs 放第 2 期仍有效。）
- 2026-11-14，用户：本期不动安卓。
- 2026-11-14，协调者：网页视图只用于内容本身是网页的地方（`app` 类消息、Web 面板里浏览的网站）；远程桌面、实时通话和 mermaid 不默认降级成网页。（已被范围缩小的决定部分取代：网页视图也用于第 9 节的「内嵌网页」模块，统一经任务 48 的容器；实时通话改在内嵌网页里跑网页版；mermaid 改为只显示源码。远程桌面仍原生。）
- 2026-11-14，协调者：全部开发交给 Astra。App 只在 Actions macOS runner 上编译和测试。每个任务带单元测试，页面带三种屏宽、深浅两色截图。
- 2026-11-14，协调者：保留 T-1218 接力登录，令牌放 Keychain；没有 Access 的部署要能用配对码登录；手表令牌改从原生存储取。
- 2026-11-14，协调者：服务端 CI 产出 API 样本，iOS 解码测试使用这些样本，接口一变 CI 变红。
- 2026-11-14，协调者：先做「协议层加骨架」的基础任务，其余任务以它为基础并行；每个任务是一轮 Astra（约 1 到 3 天），改动集中。
- 2026-11-14，协调者（审核返工）：
  1. 最低 iOS 版本从 16 提到 17。
  2. 远程桌面自己写 Swift 版 RFB 客户端（第 7.2 节）。
  3. mermaid 用离屏 WKWebView 只做渲染、原生显示（第 7.4 节）；做不成时退到只显示源码加复制。（已被范围缩小的决定取代：直接只显示源码加复制，不做离屏渲染，并入任务 11。）
  4. 实时通话用 LiveKit Swift SDK（含 WebRTC），openai、azure、fish 三种 provider 都在第 1 期做。（已被范围缩小的决定取代：不引入 LiveKit，通话在内嵌网页里跑网页版，做不成先不提供入口，见第 7.5 节。）
  5. 代码高亮用 HighlightSwift。
  6. 原生界面按 Apple HIG 加品牌令牌，不套 `@crysound/ui`（SwiftUI 用不了 React 组件库）。
  7. 皮肤只做浅色和深色两套，跟随系统；外观页提供「跟随系统、浅色、深色」三个选项。其他 11 种放第 2 期。（外观页部分已被范围缩小的决定取代：外观页改走内嵌网页，原生部分第 1 期只跟随系统深浅色；网页容器跟随 App 的深浅色，见第 7.6 节。）
  8. 协调者在宿主机装 Linux 版 Swift 工具链，Astra 在沙箱里跑 `swift test`；缓存目录一律指到工作区里（第 8.5 节）。
  9. 统一用 macos-26 和 Xcode 26；`mobile.yml` 的 push 只在 main 触发，分支走 PR。
  10. App 自己的界面文案先做英文和简体中文；复用网页文案的，17 种语言由生成器自动带上。
  11. 手表：`WatchCredentials.cfAuthorization` 改成可选，没有 CF 令牌时手表请求不带 CF cookie。这项改动归 **T-1222-07**（`Shared/` 只对它开例外，只限 `WatchContract.swift`），必须在 05 开工前合并；任务 05 依赖 T-1222-07，`Shared/` 仍然不改，只消费结果。（2026-11-14 协调者改定，取代原来「05 可以改 `Shared/`」的写法。）
  12. 静态页面改在 App 内渲染截图（第 8.3 节）；main 上的全量截图每晚跑一次；XCUITest 只留交互流程。
  13. 加公开仓库扫描 job，只扫 PR 新增的行，内部名单用哈希比对（第 13 节）。
  14. 网页变化跟踪采用覆盖表、往返比较、每周差异清单三项（第 12 节）。
  15. 并行路数按 5 路排。
  16. T-1222 的接口按第 14 节预留；第 14 节与 T-1222 规格第 5 节「与 T-1221 的衔接」不一致时，以 T-1222 第 5 节为准（命名一律照 T-1222：`crybot://auth` 给接力、`crybot://feishu` 给飞书回跳，`CRYBOT_APP_LINK_HOST`、`CRYBOT_IOS_ENTITLEMENTS`、`CryBot-AppLinks.entitlements`）。
- 2026-11-14，用户（范围缩小）：iOS 不用那么复杂，每天常用的部分做原生，不常用的部分在 App 里内嵌网页打开；约 1 周半出可用版，2026-11-25 前给用户发真机截图。协调者据此定的细节：
  1. 原生和内嵌网页的分界照第 9 节「做法」列。
  2. 新增任务 48「内嵌网页容器与入口」（第 7.6 节）；`app` 类 HTML 消息和 Web 面板并入 48。
  3. 请求类卡片里常见的原生、少见的显示一行摘要加「在网页里处理」按钮；连接器/密钥/登录卡片、运行记录消息行、其余消息附加信息并入任务 16，按同样规则处理（第 7.7 节）；引用回复和发送者并入任务 08。
  4. mermaid 只显示源码加复制，并入任务 11；不打包 mermaid.min.js。
  5. 实时语音通话在内嵌网页里跑网页版（WKWebView 自 iOS 14.3 起支持 getUserMedia）；做不成就先不提供通话入口，写进报告。不引入 LiveKit。
  6. 聊天内查找第 1 期不做。
  7. 删掉任务 13、17、18、19、20、21、24–33、36–40、44、46、47，保留的任务不重新编号。
  8. 先出 TestFlight 内部包，2026-11-25 前真机自测并给用户发真机截图；用户确认后再发外部测试。（日期细化见下一条第 2 项。）
  9. 覆盖表加 `{ ios: "web"; route: string }` 状态，算已覆盖（第 12 节）。

  本条取代上面与之冲突的旧条目，冲突处已在原条目后注明。
- 2026-11-14，协调者（范围缩小后的补充）：
  1. 只有 Bearer 的会话带进网页：由 48 做最小服务端改动，在 `GET /api/auth/session` 的返回里加上网页会话 cookie 的名字（只是名字，不新增凭证、不新增接口）；App 用已有的 `cry_sess_` 令牌按这个名字设 cookie（第 7.6 节）。可改范围见第 1.3 节。这件事不再是停止条件。
  2. 工期：2026-11-24 用当天已合并的部分出 TestFlight 内部包，11-25 前给用户发真机截图，没合并的项单独列出。派活按「能聊天」优先：05、07、08、09、15、06 先，其后 10、11、12、14、16、22、23、48，34、35 并行。里程碑日期：基础可用约 11-19（目标）、真机截图 11-25 前（已合并部分）、可用版全部合并约 11-28、可发版约 11-30。
  3. 请求类卡片的原生/摘要分法照第 7.7 节默认分法；入口统一用 `WebEntryMenu`；覆盖表的内嵌网页项先登记待做、48 合并后由协调者改成 `web`。
  4. 通话：接不通的 provider 隐藏入口，能用的照常显示（第 7.5 节）。

### 来源
- 台账项目：crybot。本任务 T-1221；登录接力 T-1218；飞书登录 T-1222；改名规格 T-1200 系列（`docs/specs/2026-11-13-crybot.md` 里「iOS 是 WebView 薄壳」的说法，对 iOS 来说被本规格取代：常用部分原生，其余经统一网页容器内嵌网页）。
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
- 前端路由：任务 48 为「内嵌网页」模块补可直达的网页路由时，只能新增 `src/` 下的直达入口文件，并在网页入口处加最少的接线；不改各模块本身。这些前端改动在 48 的报告里单独列出。其他 iOS 任务不改 `src/`。
- 服务端：48 只能改 `server/index.ts` 里 `GET /api/auth/session` 的返回，加一个字段 `cookieName`（值为现有常量 `SESSION_COOKIE`，加在 `kind: "session"` 的返回里），以及覆盖这一处的服务端测试和 00 的契约样本（样本归 00，48 在报告里写出要更新的样本，由协调者安排）。不新增凭证、不新增接口、不改鉴权逻辑和 cookie 属性。其他 iOS 任务不改 `server/`。

### 1.4 入口表（任务 02 建占位）
共用类型的完整定义见第 1.6 节。2026-11-14 范围缩小后，「状态」列为「删除」的行 02 不建占位、不建目录；「改由 16」的行目录保留，归任务 16。

| 目录 | 任务 | 入口（签名固定） | 状态 |
|---|---|---|---|
| Features/Login | 05 | `LoginFlowView(model: LoginModel)`、`LoginRouter.handle(url: URL) -> Bool` | 保留 |
| Features/Avatar | 06 | `BotAvatar(bot: WireBot, size: CGFloat)`、`PersonAvatar(person: PersonRef, size: CGFloat)` | 保留 |
| Features/Sidebar | 07 | `ConversationListView()` | 保留；工具栏放 `WebEntryMenu(scope: .global)` |
| Features/Chat | 08 | `ChatScreen(ref: ConversationRef)`、`ThreadTimelineView(thread: ThreadID, style: TimelineStyle)` | 保留；引用回复和发送者在时间线里画；单聊页头放 `WebEntryMenu(scope: .bot(id))` |
| Features/ChatFind | 47 | `ChatFindBar(thread: ThreadID, onJump: (MessageID) -> Void)` | 删除（第 1 期不做聊天内查找） |
| Features/Composer | 09 | `ComposerView(target: ComposerTarget)` | 保留 |
| Features/Activity | 10 | `ActivityMessageView(message: WireMessage, context: MessageContext)`、`RuntimeItemsView(thread: ThreadID)` | 保留 |
| Features/Markdown | 11 | `MarkdownView(source: String, streaming: Bool, context: MessageContext)` | 保留；mermaid 代码块在这里只显示源码加复制 |
| Features/Code | 12 | `CodeBlockView(code: String, language: String?)` | 保留 |
| Features/Math | 12 | `MathView(latex: String, display: Bool)` | 保留 |
| Features/Mermaid | 13 | `MermaidView(source: String)` | 删除（并入 11，只显示源码） |
| Features/Media | 14 | `AttachmentsView(attachments: [WireAttachment], context: MessageContext)` | 保留 |
| Features/CardsApproval | 15 | `OptionsCardView(message: WireMessage, context: CardContext)` | 保留 |
| Features/CardsRequests | 16 | `RequestCardBody(card: OptionCardData, kind: RequestCardKind, context: CardContext)` | 保留；常见的原生、少见的摘要加按钮（第 7.7 节） |
| Features/CardsConnect | 16（原 17） | `ConnectCardView(message: WireMessage, context: CardContext)`（connector、secret、signin） | 改由 16 |
| Features/Records | 16（原 18） | `RecordRowView(message: WireMessage, context: MessageContext)`（routine.run、goal.run、burst、digest、compaction、call、screen） | 改由 16 |
| Features/MessageExtras | 16（原 44） | `MessageLeadingExtras(message: WireMessage, context: MessageContext)`、`MessageTrailingExtras(message: WireMessage, context: MessageContext)` | 改由 16；不画引用回复和发送者（归 08） |
| Features/Widget | 19 | `WidgetView(root: WidgetNode, context: WidgetContext)` | 删除（widget 消息改由 48 的 `WebMessageSummary`） |
| Features/Charts | 20 | `CryChartView(spec: CryChartSpec, rows: [DataRow])`、`WidgetChartView(node: WidgetNode)`、`DataCardView(card: DataCardRef)` | 删除（随 widget 走内嵌网页） |
| Features/WebContent | 21 | `AppMessageView(message: WireMessage, context: MessageContext)`、`WebPanelScreen()`、`PublishedAppsScreen()` | 删除（改由 48：`app` 消息走 `WebMessageSummary`，Web 面板和已发布 App 走 `WebHostTarget`） |
| Features/Group | 22 | `GroupScreen(group: GroupID)` | 保留；群聊页头放 `WebEntryMenu(scope: .group(id))` |
| Features/Inbox | 23 | `InboxScreen()`、`NotificationsScreen()`、`NotifyBannerHost()`（根视图上的 App 内提醒层） | 保留 |
| Features/Automations | 24 | `AutomationsScreen()` | 删除（改由 48，`WebHostTarget.automations`） |
| Features/Files | 25 | `FilesScreen()` | 删除（改由 48，`.files`） |
| Features/TeamMap | 26 | `TeamMapScreen()` | 删除（改由 48，`.teamMap`） |
| Features/MCP | 27 | `McpScreen(scope: McpScope)`、`PluginsScreen()` | 删除（改由 48，`.mcp`、`.plugins`） |
| Features/BotSettings | 28 | `BotSettingsScreen(bot: BotID, section: BotSettingsSection?)` | 删除（改由 48，`.botSettings`） |
| Features/BotPanel | 29 | `BotPanelScreen(bot: BotID, target: PanelTarget?)` | 删除（改由 48，`.botPanel`） |
| Features/BotPanelMore | 46 | `BotLibraryTab(bot: BotID, page: PanelPageID?)`、`BotComputerTab(bot: BotID, page: PanelPageID?)`、`BotConversationsView(bot: BotID)` | 删除（改由 48，`.botPanel` 带 `PanelTarget`） |
| Features/NewBot | 30 | `NewBotFlow()` | 删除（改由 48，`.newBot`） |
| Features/Settings | 31 | `SettingsScreen()`；页面 overview、account、plan、app、general、appearance；按 `SettingsPageID` 分发到下面两个入口 | 删除（改由 48，`.settings`） |
| Features/SettingsAI | 32 | `SettingsAIPageView(id: SettingsPageID)`（ai、bots、vault、usage） | 删除（改由 48，`.settings`） |
| Features/SettingsAdmin | 33 | `SettingsAdminPageView(id: SettingsPageID)`（phone、desktops、transfer、data、people、installations） | 删除（改由 48，`.settings`） |
| Features/Desktop | 35 | `DesktopViewer(target: DesktopTarget)` | 保留 |
| Features/ScreenStream | 36 | `BrowserStreamView(bot: BotID)`、`PhoneScreenView(device: PhoneDeviceID)`、`BotScreenFrameView(bot: BotID)` | 删除（改由 48，`.browser`、`.phone`） |
| Features/Computer | 37 | `ComputerPanel(bot: BotID)` | 删除（改由 48，`.computer`） |
| Features/Call | 38 | `CallScreen(call: CallRef)`、`protocol LiveCallTransport` | 删除（改由 48，`.call`，做不成不提供入口） |
| Features/CallOpenAI | 39 | `OpenAICallTransport`（实现 LiveCallTransport） | 删除 |
| Features/CallFish | 40 | `FishCallTransport`（实现 LiveCallTransport） | 删除 |
| Features/WebHost | 48（新增） | `WebHostScreen(target: WebHostTarget)`、`WebEntryMenu(scope: WebEntryScope)`、`WebMessageSummary(message: WireMessage, context: MessageContext)` | 新增 |

此外：
- 每个功能目录都有一个 `<名字>Gallery()` 占位视图。启动参数 `-CryGallery <名字>` 时根视图直接显示它；App 内截图也用它。
- 设计目录里由 02 提供 `AuthImage(url: URL)`，用当前 Transport 带鉴权加载图片，所有功能共用。
- `App/MessageBodyView.swift`（02 写好，之后不再改）对每条消息按固定顺序组合：`MessageLeadingExtras` → 按 `kind` 分发的正文 → 附件 `AttachmentsView` → `MessageTrailingExtras`。正文分发：`text` 走 MarkdownView，`options` 走 OptionsCardView，`connector|secret|signin` 走 ConnectCardView，记录类走 RecordRowView，`activity` 走 ActivityMessageView，`widget` 和 `app` 走 `WebMessageSummary`（48）。kind 不认识时显示「需要更新 App」的原生提示行，不崩。分发写成可测的纯函数 `MessageLayout.plan(for:) -> [MessagePart]`。
- 「内嵌网页」模块的入口：07、08、22 只按上表在固定位置放 `WebEntryMenu`，菜单内容、每项打开的 `WebHostTarget` 由 48 决定；其他原生页面要跳到内嵌网页（例如 16 的「在网页里处理」按钮），一律调 `context.open(.web(WebHostTarget))`，不自己建网页视图。

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
  - `WebHostTarget`（要在网页容器里打开什么）：`.settings(SettingsPageID?)`、`.botSettings(BotID, BotSettingsSection?)`、`.botPanel(BotID, PanelTarget?)`、`.newBot`、`.automations(id: String?)`、`.files`、`.teamMap`、`.mcp(McpScope)`、`.plugins`、`.webPanel`、`.publishedApps`、`.browser(BotID)`、`.phone(PhoneDeviceID)`、`.computer(BotID)`、`.call(CallRef)`、`.message(ConversationRef, MessageID)`（widget、`app` 消息和少见卡片在网页里定位到这条消息）。
  - `WebEntryScope`：`.global`（会话列表工具栏）、`.bot(BotID)`（单聊页头）、`.group(GroupID)`（群聊页头）。

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
| `computer`、`computer-control`、`live.call` | LiveState 按机器人存最新状态（01）；第 1 期没有原生消费者（电脑面板和通话走内嵌网页，原 37、38 已删） |
| `screen` | LiveState 按机器人存最新一帧（01）；第 1 期没有原生消费者（画面走内嵌网页，原 36 已删；连接时仍带 `screens=off`） |
| `routine`、`routine.deleted`、`routine.run`、`webhook*`、`app-trigger*` | 帧订阅保留；第 1 期没有原生订阅者（自动化走内嵌网页，原 24 已删） |
| `mcp.changed` | 帧订阅保留；第 1 期没有原生订阅者（原 27 已删） |
| `device.job` | 帧订阅保留；第 1 期没有原生订阅者（原 37 已删） |
| 数据帧（`DataBroadcast`） | 帧订阅保留；第 1 期没有原生订阅者（原 20、29、46 已删） |
| 不认识的帧 | 不改状态，计数后写调试日志 |

规则照 `src/state/store.tsx` 和 `src/lib/live-events.ts` 的现有行为。

### 4.3 `AppStore`（02）
`@Observable @MainActor`，持有 `LiveState`，通过 CryCore 的 `Transport` 协议收发（请求、事件流、上传、下载、WebSocket）。`Transport` 有两个实现：真实的 `LiveTransport`（03 写、05 接入），以及夹具用的 `FixtureTransport`（02）。对功能任务开放的接口：
- 动作：`refreshSnapshot()`、`loadOlder(thread:)`、`send(...)`、`respond(...)`、`interrupt(...)`、`markRead(...)`、`react(...)`、`request<R>(_ endpoint: Endpoint<R>)`（功能自己的接口都走它）。
- 帧订阅：`frames(kinds: Set<String>) -> AsyncStream<ServerFrame>`，视图在 `.task` 里订阅，离开时自动取消。
- 导航：`navigate(to: AppRoute)`。`AppRoute` 包括原生页面（会话，可带要跳到的消息；收件箱；通知；远程桌面）和 `.web(WebHostTarget)`（机器人面板、机器人设置、设置页、自动化、文件、团队地图、Web 面板、电脑面板、通话等，都在 48 的网页容器里打开）。
- 退出登录：`signOut()`，由 05 注册实际处理（清 Keychain、通知手表、回登录页），48 另外注册清空网页容器的数据存储；没注册时只清内存状态。
- 屏幕帧开关：`setScreens(_ on: Bool)`（原给 36；第 1 期没有调用者，接口保留）。
- 夹具：`AppStore.fixture(scenario: String) -> AppStore`，App 内截图测试用它造带数据的仓库。

### 4.4 夹具模式
启动参数 `-CryFixtureScenario <名字>` 让 App 用打包进去的场景 JSON 跑，不联网、不登录。场景格式：`{signedIn, snapshot, threads: {id: page}, responses: {"GET /api/inbox": body}, frames: [{afterMs, frame}], sockets: {path: [{afterMs, data}]}}`。`signedIn: false` 时根视图显示登录页。`-CryAppearance light|dark` 强制深浅色。夹具模式下网页容器不联网，加载打包的本地占位页（48）。

## 5. 渲染
- Markdown：swift-markdown 在 `Features/Markdown/Logic/` 里解析成自己的块模型（见第 1.5 节），再用 SwiftUI 画。支持 GFM（表格、任务列表、删除线、自动链接）、@提及、线程链接和 GitHub 引用链接（规则照 `src/components/ChatMarkdown.tsx`）。流式输出时按块增量渲染，未闭合的代码块按代码块显示。表格可以横向滚动，单元格可以选中复制。语言为 `mermaid` 的代码块只显示源码加复制（用 12 的 `CodeBlockView`），不渲染图形（第 7.4 节）。
- 代码：HighlightSwift 高亮，可以复制，长代码可以横向滚动，主题跟深浅色走。
- 公式：SwiftMath 原生排版，行内 `$…$` 和块级 `$$…$$`，排版失败时显示原文。
- widget、图表和数据卡片（2026-11-14 改）：不做原生渲染。消息里由 48 的 `WebMessageSummary` 显示一行摘要（能取到标题就用标题，否则显示「交互卡片」「图表」之类的类别名）和「打开」按钮，点开在网页容器里定位到这条消息。原先的 Swift Charts 方案和 31 种 widget 节点原生方案取消，原 19、20 删除。
- `app` 类消息（2026-11-14 改）：同上，摘要加「打开」，在网页容器里按网页现有方式显示。原先「消息里直接用 WKWebView 显示 HTML」的做法取消，原 21 删除。

## 6. 设计
- 遵循 Apple HIG，用系统控件（List、NavigationStack/SplitView、sheet、Menu、Toolbar、SF Symbols）。品牌色和语义色取自 `src/styles.css` 里 `[data-skin="daylight"]`（浅色）和 `[data-skin="midnight"]`（深色）两块，以及 `brand/` 里的品牌紫。放在 `Design/Theme.swift` 和资源目录的 Color Set 里，跟随系统深浅色。
- 支持动态字体，聊天和列表在 Accessibility L（`DynamicTypeSize.accessibility2`）下不截断。
- 不套 `@crysound/ui`（已定的决定第 6 条）。

## 7. 单独定方案的几块（都已定）
### 7.1 最低 iOS 版本
17.0。原因：Observation、新的滚动定位 API，以及网页容器用的 `WKWebsiteDataStore(forIdentifier:)`（原先列的 Swift Charts SectorMark 随图表改走内嵌网页已不需要）。

### 7.2 远程桌面（noVNC 的 RFB）
自己写 Swift 版 RFB 客户端，不依赖第三方：
- CryRFB（纯 Foundation）：RFB 3.8 握手、VNC 认证（DES 用 CommonCrypto，放在 App 侧通过协议注入）、Raw、CopyRect、ZRLE 编码（zlib 用 Compression 框架，跳过 2 字节头后按原始 deflate 流解；同样注入）、指针和按键消息、剪贴板。
- App 侧：经 Transport 的 WebSocket 连 `/api/desktop-viewer/<target>/websockify`（二进制帧），密码来自 `GET /api/desktop-viewer/<target>`，`vps/` 目标先调 `POST /api/bots/<id>/computer/join`。用 CGImage 显示帧缓冲；支持双指缩放、拖动、点按、长按右键、软键盘，Unicode 按键用 0x01000000|码点。
- 工作量约 4 天（34 加 35）。

### 7.3 其他画面（2026-11-14 改为内嵌网页）
机器人内置浏览器、USB 安卓手机画面、SSE 的 `screen` 帧（机器人屏幕帧）第 1 期都走内嵌网页，从机器人入口菜单打开（48，`WebHostTarget.browser`、`.phone`、`.computer`）。原 36 删除。原生方案留给以后参考：浏览器是 v2 流协议（`server/browser/viewers/stream-v2.ts`，JPEG 帧为二进制消息、其余是 JSON、收到帧要确认）；USB 手机是 `/api/usb-phones/<id>/stream` 转发的 scrcpy H.264，可用 VideoToolbox 解码。

### 7.4 mermaid（2026-11-14 改）
只显示源码加复制，由 11 在 `MarkdownView` 里处理（第 5 节）。不打包 mermaid.min.js，不做离屏 WKWebView 渲染。原 13 删除。

### 7.5 实时语音通话（2026-11-14 改为内嵌网页）
第 1 期在网页容器里跑网页版通话，由 48 负责，不做原生通话，不引入 LiveKit（原 38、39、40 删除）。依据：WKWebView 自 iOS 14.3 起支持 `getUserMedia`，App 最低 iOS 17。网页通话现有两种传输（`POST /api/live/session`）：openai 和 azure 走 WebRTC，fish 走 LiveKit 的网页 SDK，都在网页里运行，App 不碰。

48 要做的：
- 容器配置：`allowsInlineMediaPlayback = true`，`mediaTypesRequiringUserActionForPlayback = []`。
- 实现 `WKUIDelegate` 的 `webView(_:requestMediaCapturePermissionFor:initiatedByFrame:type:decisionHandler:)`：只对当前服务器的源放行麦克风，其他源和摄像头一律拒绝（网页通话确实要摄像头时再报告）。放行规则写成纯函数并有测试。
- Info.plist 的麦克风权限说明经第 1.3 节的变更通道由协调者加（01 原本已写的保留）。
- 入口：`WebEntryMenu(scope: .bot(id))` 里的「通话」项，打开 `WebHostTarget.call`。
- 模拟器采不到麦克风，Actions 上只测配置和放行规则；能不能接通靠内部包真机自测（41 出包后，协调者按 openai、azure、fish 各试一次）。
- 做不成（某种 provider 接不通，或者 WKWebView 里拿不到麦克风）：先不显示通话入口（按 provider 隐藏，能用的照常显示），在报告里写清 provider、现象和报错，由协调者再问用户。切到后台通话会断，按系统默认处理，写进报告。

### 7.6 内嵌网页容器（48）
统一的 `WebHostScreen(target:)`，所有「内嵌网页」模块都经它打开。

**会话带给网页（不改服务端鉴权，只在 session 返回里加 cookie 名）。** 规格修订时对 main 当前代码查到的现状（48 开工时再核对一遍）：
- 网页前端只靠 cookie 登录，不发 Bearer。会话 cookie 名是 `cry_session_<服务端端口>_<environmentId 的前 12 个字母数字>`（`server/request-auth.ts` 的 `sessionCookieName`），值就是 `cry_sess_…` 令牌本身，和 App 用的 Bearer 是同一种会话；属性为 `HttpOnly`、`SameSite=Lax`、`Path=/`，https 时加 `Secure`。用 cookie 访问时服务端要求同源，并在每次请求时续期、回写 cookie。
- 有 CF Access 的部署：请求里只要有有效的 `CF_Authorization`，服务端的 Access 中间件（`server/cf-access.ts`）就自己签发一个 cookie 会话并写回。现在的网页壳就是只设 CF cookie 登录的。
- `GET /api/auth/session` 返回 `environmentId`，但不返回端口；App 在代理后面看不到服务端端口，拼不出 cookie 名。

48 的做法（协调者已定，见「已定的决定」）：
1. 服务端（最小改动）：`GET /api/auth/session` 的返回加字段 `cookieName`，值为现有的网页会话 cookie 名。只是名字，不新增凭证、不新增接口、不改鉴权和 cookie 属性；可改范围见第 1.3 节，带服务端测试。
2. 存了 CF 令牌（接力登录）：往容器的数据存储写 `CF_Authorization`（domain 为 `webURL` 的主机、`Path=/`、`Secure`、`HttpOnly`，过期时间取 `cfExpires`），由服务端自己签发网页会话。
3. 只有 Bearer（配对码、邮箱、飞书）：打开网页容器前用 Bearer 调一次 `GET /api/auth/session` 取 `cookieName`，把已有的同一个 `cry_sess_` 令牌按这个名字写进容器的数据存储（domain 为 `webURL` 的主机、`Path=/`、`HttpOnly`、`SameSite=Lax`，https 时 `Secure`，过期时间取 `sessionExpires`）。同一个会话，不新建会话，退出登录一起失效。App 端的 cookie 拼装写成纯函数并有测试。
4. 服务器还是旧版、返回里没有 `cookieName` 时：只有 Bearer 的登录方式在容器里显示「服务器版本过旧，请更新后再打开」的原生提示，不猜 cookie 名。

**容器行为：**
- 数据存储：用固定标识的独立存储 `WKWebsiteDataStore(forIdentifier:)`（iOS 17），不和旧版 cookie 迁移用的默认存储混用。cookie 跨打开保留；退出登录和更换服务器时整个清空（在 `AppStore.signOut()` 上注册）。
- 只加载当前服务器：顶层导航只允许 `webURL` 同源的地址。其他 http(s) 链接（包括 `target=_blank` 和 `window.open`）交系统浏览器打开；其他 scheme 一律拦下。被重定向到 CF Access 登录页时不打开，改为提示登录过期，走 05 的重新接力。导航判定写成纯函数并有测试。
- 不向网页注入令牌、JS 桥或 `window.cry`。
- 深浅色：容器跟随 App 当前深浅色（`overrideUserInterfaceStyle`）。48 查清网页的皮肤是怎么选的：网页能跟随系统就交给 `prefers-color-scheme`；不能的话在打开地址上带前端参数（属于前端直达入口，见第 1.3 节）。
- 返回和关闭：导航栏左上「关闭」回到原生界面；网页能后退时显示「返回」，并允许边缘右滑后退。加载中和加载失败有原生的进度和重试提示。
- 路由：`WebRoutes.url(for: WebHostTarget, server: CryServer) -> URL`，放 `Features/WebHost/Logic/`，纯函数加测试。48 先列出每个模块在网页上现有的直达方式（路径、查询参数或 hash）。规格修订时看到的情况：网页基本没有按地址直达的路由，只有少数查询参数（例如 `desktop-settings`），预计要在前端加一个统一的直达参数；加法见第 1.3 节「前端路由」，路由不涉及服务端。
- 入口：`WebEntryMenu` 三种范围的菜单项。`.global`：设置、新建机器人、自动化、文件、团队地图、MCP 与插件、Web 面板、已发布 App。`.bot(id)`：机器人设置、机器人面板（资料库、电脑页、会话列表和分享）、电脑面板、浏览器画面、通话。`.group(id)`：群设置等网页里的群聊面板项（48 按网页现状列出）。USB 手机画面挂在电脑面板或设置的 phone 页下，48 按网页现状定。
- `WebMessageSummary`：widget 和 `app` 消息的一行摘要加「打开」（第 5 节）。
- 夹具和截图：夹具模式下加载打包的本地占位页 `Features/WebHost/Fixtures/webhost-placeholder.html`（只在夹具模式下允许这个本地地址），截图只截入口菜单、摘要行和容器外框（第 8.3 节）。
- 约 2.5 天。

### 7.7 卡片和消息附加信息：常见的原生、少见的摘要加按钮（16）
规则：只需要看说明再点一个或几个按钮（确认、拒绝、选一项）的做原生；要填表、编辑配置、走 OAuth 授权或多步设置的，显示一行摘要（卡片标题和状态）加「在网页里处理」按钮，点了调 `context.open(.web(.message(会话, 消息)))`。卡片被处理后（`answered`、`expired` 等状态）照常显示原生的结果行。

默认分法（16 可以按实际交互改，改了在报告里列出，由协调者审）：
- 请求类卡片原生：`waitRequest`、`computerAsk`、`accessRequest`、`outsideWrite`、`quotaSwitch`、`lendingLift`、`outboundRequest`、`yourComputer`、`modelRequest`、`mcpRequest`、`skillRequest`。
- 请求类卡片摘要加按钮：`routineRequest`、`webhookRequest`、`appTriggerRequest`、`profileRequest`、`teamSetupRequest`、`teamMemoryRequest`。
- 连接器、密钥、登录卡片：`secret` 原生（系统安全输入框加提交）；`connector` 和 `signin` 涉及授权跳转，摘要加按钮。
- 运行记录行（routine.run、goal.run、burst、digest、compaction、call、screen）：一律原生一行（图标、标题、状态、时间），详情点开走网页。
- 其余消息附加信息：各种小标签、等待行、问题报告状态、「来自 App」做原生；设置建议卡、助手介绍做摘要加按钮。引用回复和发送者归 08。

分法写成纯函数 `CardPresentation.decide(_:) -> .native | .webSummary`，放 `Features/CardsRequests/Logic/`，有测试；遇到 `RequestCardKind.unknown` 一律摘要加按钮。

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
- 提交 `Package.resolved`：`.xcodeproj` 由 XcodeGen 生成、不进仓库，所以锁定文件放 `mobile/ios/Package.resolved`。01 的 PR 第一次运行时把 `CryBot.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` 上传为产物，协调者提交进 PR；之后每次 `xcodegen generate` 后先把它复制回这个位置，`xcodebuild` 加 `-disableAutomaticPackageResolution` 和 `-clonedSourcePackagesDirPath SourcePackages`，远程依赖（含间接依赖）每次都一样。
- 编译一次：`xcodebuild build-for-testing` 用同一个 DerivedData，之后各测试都用 `test-without-building`。
- 截图测试的选择（04 的 `ui-test-selection.sh`）：按改动路径算出功能名列表；改到 `App`、`Store`、`Design`、`project.yml`、`Packages` 时选全部。功能名通过环境变量 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 传给 App 内截图（xcodebuild 会去掉 `TEST_RUNNER_` 前缀，测试里读 `CRY_SNAPSHOT_FEATURES`）；XCUITest 用 `-only-testing:CryBotUITests/<名字>FlowTests`。跑完检查 xcresult 里实际执行的测试数：选中了却是 0 个，job 失败。

### 8.3 截图
- App 内截图（静态页面，大部分截图走这里）：`CryBotTests/Support/SnapshotCase.swift`（04）。把视图放进 `UIHostingController`，挂到给定尺寸的 `UIWindow`，设置深浅色和安全区，用 `drawHierarchy(in:afterScreenUpdates:)` 出图。不用 `ImageRenderer`，因为它画不出 List、ScrollView 和 UIKit 包装视图。三种屏宽：
  - `se`：375×667，上安全区 20；
  - `16`：393×852，上 59、下 34；
  - `promax`：440×956，上 62、下 34。
  每个场景出 6 张：3 种屏宽 × 深浅。名字 `<功能>-<场景>-<se|16|promax>-<light|dark>`，存成 keepAlways 附件。`CRY_SNAPSHOT_FEATURES` 不含本功能（也不是 `all`）时 `XCTSkip`；没设这个变量时（本地运行）全部执行。测试类命名 `<名字>SnapshotTests`。
- XCUITest（只留交互流程：点按、输入、键盘、滚动定位、流式跟随）：`CryBotUITests/Support/ScreenshotCase.swift`（04），提供 `launch(scenario:appearance:)` 和 `snap(_:)`。测试类命名 `<名字>FlowTests`，放 `CryBotUITests/<名字>/`。PR 上只在 iPhone 16 跑，每晚在三种机型上跑。机型缺失时 `simctl create` 补建；没有 iPhone SE（第 3 代）时退到 iPhone 16e，并在日志里打印出来。
- 内嵌网页模块：只截原生入口（`WebEntryMenu` 展开后的菜单、`WebMessageSummary` 摘要行、卡片的「在网页里处理」按钮）和网页容器外框（夹具模式下加载本地占位页），不截网页内容。网页本身的样子由网页自己的测试负责。场景名用 `webhost-<入口>`。
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
「做法」列：原生 = SwiftUI/UIKit 原生绘制；内嵌网页 = 原生入口加 48 的网页容器（验收只看入口和容器能打开、登录状态带得过去）；不做 = 第 1 期不提供，覆盖表写原因。「任务」列是 2026-11-14 范围缩小后的编号。

| # | 页面或能力 | 网页对应 | 做法 | 任务 |
|---|---|---|---|---|
| 1 | 首次启动：服务器地址、接力登录、配对码（含扫码）、邮箱登录、退出登录 | /pair、登录页 | 原生 | 05 |
| 2 | 机器人和群聊列表：分组、排序、未读、搜索、置顶，进入聊天 | Sidebar | 原生 | 07 |
| 3 | 机器人头像和吉祥物（表情、身体、脸色、自定义图片和裁剪），人员头像 | Avatar、AnimatedMascot、CarvedAvatar | 原生 | 06 |
| 4 | 单聊：时间线、翻页、跳转、流式输出、停止、排队和引导、表情、编辑和分支、已读、引用回复、发送者 | ChatView | 原生 | 08 |
| 5 | 聊天内查找 | ChatFindBar | 不做（第 1 期） | — |
| 6 | 输入框：文字、@提及、斜杠命令、图片、文件、拍照、语音录制和转写 | Composer | 原生 | 09 |
| 7 | 工具调用、活动、审批中的运行项 | activity、runtime | 原生 | 10 |
| 8 | Markdown、表格、链接、提及 | ChatMarkdown | 原生 | 11 |
| 9 | 代码高亮、数学公式 | shiki、katex | 原生 | 12 |
| 10 | mermaid 图 | mermaid | 原生（只显示源码加复制，不渲染图形） | 11 |
| 11 | 图片、文件、语音附件，大图查看，下载和分享，朗读回复 | 附件组件、tts | 原生 | 14 |
| 12 | 审批、提问、选择类卡片 | ApprovalCard、AskCard、QuestionCard、OptionCard | 原生 | 15 |
| 13 | 请求类卡片（17 种，见第 2 节） | OptionCard 子类型、wait、computer-ask、bot-access、outside-write | 常见的原生，少见的摘要加「在网页里处理」（第 7.7 节） | 16 |
| 14 | 连接器、密钥、登录卡片 | ConnectorCard、SecretRequestCard、SignInRequestCard | 同上（第 7.7 节） | 16 |
| 15 | 运行记录类消息行 | routine.run 等 | 原生一行，详情走网页（第 7.7 节） | 16 |
| 16 | 消息附加信息：设置建议卡、助手介绍、等待行、问题报告状态、各种小标签、来自 App（引用回复、发送者归第 4 行） | wire.ts:459-614 的字段 | 常见的原生，少见的摘要加按钮（第 7.7 节） | 16 |
| 17 | widget 全部节点 | widget/ | 内嵌网页（消息里显示摘要，点开内嵌网页） | 48 |
| 18 | 图表和数据卡片 | data/、widget-chart | 内嵌网页（同上） | 48 |
| 19 | `app` 类 HTML 消息、Web 面板、已发布 App | app/、WebPanelPage、published-apps | 内嵌网页 | 48 |
| 20 | 群聊和房间面板 | GroupView、room-panel | 原生（房间面板里属于设置的项走 `WebEntryMenu`） | 22 |
| 21 | 收件箱、通知、App 内提醒 | inbox/、NotificationsPanel | 原生 | 23 |
| 22 | 自动化：日历、列表、运行记录、Webhook、App 触发器 | RoutineCalendarPage、automations/、routines/ | 内嵌网页 | 48 |
| 23 | 文件 | FilesView | 内嵌网页 | 48 |
| 24 | 团队地图 | TeamMapPage | 内嵌网页 | 48 |
| 25 | MCP 服务器和插件 | McpServersPanel、McpServerEditor、PluginsPanel | 内嵌网页 | 48 |
| 26 | 机器人设置，以及面板里的高级分区（setup、model、instructions、approvals、always、voice、blurb、team、chiefteams、mcp、tools、webhooks、slack、overview、prompt、history） | bot-settings/、keys/、bot-access/ | 内嵌网页 | 48 |
| 27 | 机器人面板外壳和详情页（settings、apps、routines、visibility，以及详情页上的其他行） | bot-panel/ 的 PanelShell、DetailsTab、SettingsPage | 内嵌网页 | 48 |
| 28 | 机器人面板资料库和电脑页（memory、skills、folder、browser、where、android），会话列表和分享 | LibraryTab、ComputerTab、Conversations、conversation-share/ | 内嵌网页 | 48 |
| 29 | 新建机器人和团队设置 | 新建流程 | 内嵌网页 | 48 |
| 30 | 设置：overview、account、plan、app、general、appearance | settings/pages | 内嵌网页 | 48 |
| 31 | 设置：ai、bots、vault、usage | settings/pages、usage/ | 内嵌网页 | 48 |
| 32 | 设置：phone、desktops、transfer、data、people、installations | settings/pages | 内嵌网页 | 48 |
| 33 | 远程桌面 | DesktopViewer、LiveDesktop | 原生 | 34、35 |
| 34 | 内置浏览器画面、USB 手机画面、机器人屏幕帧 | BrowserPanel、phone-screen | 内嵌网页 | 48 |
| 35 | 电脑面板 | ComputerPanel | 内嵌网页 | 48 |
| 36 | 实时语音通话 | CallView | 内嵌网页（做不成就不提供入口，第 7.5 节） | 48 |
| 37 | 手表令牌同步 | WatchSync | 原生 | 05 |
| 38 | 内嵌网页容器：登录状态带入、返回和关闭、外链交系统浏览器、深浅色、只加载当前服务器 | — | 原生（容器本身） | 48 |

`page-registry.ts` 的 26 个 `PageId` 都归第 26 到 28 行（内嵌网页）；第 12 节的覆盖表按 `PageId` 逐个登记，48 合并后由协调者登记为 `{ ios: "web"; route }`。

## 10. 新增第三方依赖（只限本表）
| 依赖 | 许可 | 用途 | 为什么不用系统框架 |
|---|---|---|---|
| apple/swift-markdown（含 swift-cmark） | Apache-2.0 | 解析 GFM | 系统 AttributedString 的 Markdown 不支持表格、块结构和流式 |
| SwiftMath | MIT | 原生排版 LaTeX 公式 | 系统没有公式排版 |
| HighlightSwift | MIT | 代码高亮（JavaScriptCore 里跑 highlight.js，不是网页视图） | 系统没有语法高亮 |

2026-11-14 范围缩小后去掉了两项：LiveKit Swift SDK（通话改在内嵌网页里跑网页版）和打包的 mermaid.min.js（mermaid 只显示源码）。

所有依赖锁定版本（`Package.resolved` 提交进仓库），许可文本放进 `third_party/`，并在 App 的「关于」页列出。

## 11. 给开发的通用规则（每个任务说明都会引用）
1. 先读本规格第 1、2、8、11 节和第 1.4 节的入口表，只改自己任务说明里「可以改」的路径。
2. 没有 Xcode：写完后不要声称「编译通过」。交回前跑 `mobile/ios/scripts/linux-test.sh` 和 `linux-check.sh`（43 合并后才有），把输出贴进报告；App 的编译由协调者推分支跑 Actions，失败日志会作为返工意见发回。
3. 每个新类型、新状态逻辑都要有单元测试；纯逻辑放 `Features/<名字>/Logic/`，只 import Foundation 和 CryCore。每个原生页面都要有 App 内截图（`<名字>SnapshotTests`），内嵌网页模块只截入口和容器（第 8.3 节）；有交互流程的再加 `<名字>FlowTests`。
4. 类型命名遵守第 1.5 节。
5. 界面里的每个可操作元素都加 `accessibilityIdentifier`，命名为 `<功能>.<元素>`，UI 测试按它定位。
6. 文案用自己功能目录的 `.xcstrings`，英文和简体中文都要有。能用网页已有文案的，用任务 04 的生成器从 `src/locales` 引入，不手抄。
7. 夹具只用 `example.com` 和虚构名字。
8. 不 git 提交；不装依赖；需要新依赖或要改 `project.yml` 时写进报告。

## 12. 跟上网页的变化
网页在开发期间还会继续加功能。三道关：
1. 覆盖表（00）：`server/testing/ios-contract/coverage.ts` 用 TS 的 `Record<联合类型, IosStatus>` 列全：`WireMessage["kind"]`、`ServerFrame["kind"]`、`keyof WireMessage`、`keyof OptionCardData`、widget `SPECS` 的键、设置页 id、机器人面板 `PageId`、RuntimeEvent 类型。`IosStatus` 是 `{ ios: "done" } | { ios: "web"; route: string } | { ios: "todo"; task: string } | { ios: "skip"; reason: string }`。`web` 表示这项在 App 里经 48 的网页容器打开，`route` 写容器打开的网页路由，算已覆盖。00 先把第 9 节「内嵌网页」行对应的项登记成 `{ ios: "todo"; task: "48" }`，48 合并后由协调者改成 `web` 并填路由；「不做」行登记成 `skip`。网页一加新成员，网页自己的 PR 里 `check` job 的 tsc 就报错，开发者必须登记。登记「待做」的项，协调者决定挂到哪个任务（原生或内嵌网页）或追加新任务。iOS 任务自己不改覆盖表（避免并行任务改同一个文件），只在报告里列出本任务完成了哪些项；协调者合并后把这些项改成「完成」，攒在每周差异清单那次一起提交。
2. 往返比较（01）：见第 2 节。光比对样本文件，跑一下 `--update` 就绿了，管不住字段漏读；往返比较能管住。
3. 每周差异清单（00 提供脚本，协调者每周一跑）：`node scripts/ios-web-drift.mjs --since <基线>` 列出基线到 main 之间 `shared/` 和 `src/components/` 的改动（文件、增删行数、新增的导出和类型成员），协调者决定要不要加任务，处理完把「来源」里的基线前移。

## 13. 公开仓库扫描（45）
- `public-scan.yml`（ubuntu，每个 PR）运行 `scripts/public-scan/scan.mjs`，只看 `git diff` 里 PR 新增的行，覆盖整个仓库（含 `docs/tasks`、`docs/specs`、`server/testing`、`third_party`）。
- 规则：
  - 域名放行 RFC 2606 / 6761 保留的 `example.com`、`example.net`、`example.org` 及其子域名，以及 TLD `.example`、`.test`、`.invalid`、`.localhost`；`localhost`、`127.0.0.1`、`::1` 也放行；另放行 `scripts/public-scan/allow-domains.txt` 里的公共域名（初始只放开源许可和官方文档要用的几个，增删由协调者审）；
  - IP 只放行 `127.0.0.1`、`::1` 和文档专用网段（192.0.2.0/24、198.51.100.0/24、203.0.113.0/24），内网网段也拦；
  - 拦 JWT（`eyJ` 开头的三段式）、`cry_sess_` 和 `cry_session_` 后面跟真实值的令牌、不是占位值的 UUID（占位值指全零或 `00000000-0000-4000-8000-` 开头）；
  - 邮箱的域名部分属于 RFC 2606 / 6761 保留的 `example.com`、`example.net`、`example.org` 及其子域名，或 TLD `.example`、`.test`、`.invalid`、`.localhost` 时放行；
  - 内部域名、人名和实例 ID 用 HMAC-SHA256 黑名单比对：把新增行切成词（域名、标识符、中文人名按 2 到 4 字滑窗），小写后用密钥算 HMAC，命中就失败并报行号，不打印命中的原文。名单文件 `scripts/public-scan/denylist.hmac` 只存 HMAC，由协调者在本机用 `hmac-word.mjs` 生成和更新；密钥放在 Actions secret `PUBLIC_SCAN_DENYLIST_KEY`，没有密钥时（如 fork PR）跳过这一项。
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
2026-11-14 范围缩小后保留的任务如下，保留原编号、不重新编号。已删除：13（mermaid，并入 11 只显示源码）、17、18、44（并入 16）、47（聊天内查找，第 1 期不做）、19、20、21、24–33、36–40、46（改为内嵌网页，由 48 负责）。

| 编号 | 名称 | 依赖 | 估计（天） |
|---|---|---|---|
| 00 | 服务端契约样本、覆盖表和差异清单（覆盖表加 `web` 状态） | — | 2 |
| 01 | 协议层与工程基础 | — | 3 |
| 02 | App 骨架与夹具模式（入口表按第 1.4 节「状态」列建占位，含 `WebHostTarget`、`WebEntryMenu` 占位） | 01 | 2.5 |
| 03 | 网络与身份核心 | 01 | 2 |
| 04 | 截图流水线与文案生成器 | 01 | 2 |
| 05 | 登录、实时连接与手表同步 | 02、03、04、T-1222-07 | 2.5 |
| 06 | 头像与吉祥物 | 02、04 | 1.5 |
| 07 | 会话列表（放 `WebEntryMenu(.global)`） | 02、04 | 2 |
| 08 | 单聊时间线（含引用回复、发送者；放 `WebEntryMenu(.bot)`） | 02、04 | 2 |
| 09 | 输入框 | 02、04 | 2 |
| 10 | 活动与运行项 | 02、04 | 1.5 |
| 11 | Markdown（含 mermaid 源码显示） | 02、04 | 2 |
| 12 | 代码高亮与公式 | 02、04 | 1.5 |
| 14 | 附件与媒体 | 02、04 | 2 |
| 15 | 审批与提问卡片 | 02、04 | 2 |
| 16 | 请求类卡片、连接器/密钥/登录卡片、运行记录行和消息附加信息（常见的原生、少见的摘要加按钮，第 7.7 节） | 02、04 | 2 |
| 22 | 群聊（放 `WebEntryMenu(.group)`） | 08 | 2 |
| 23 | 收件箱与通知 | 02、04 | 1.5 |
| 34 | RFB 协议核心 | 01 | 2 |
| 35 | 远程桌面查看器 | 34、02、03、04 | 2 |
| 41 | 发版：先适配到能出 TestFlight 内部包，再收尾 | 内部包：01、05；收尾：其余保留任务（42 除外） | 1 |
| 42 | 对照验收 | 全部保留任务（含 41） | 1.5 |
| 43 | Linux 自测通道 | 01、04 | 1.5 |
| 45 | 公开仓库扫描 | — | 1 |
| 48 | 内嵌网页容器与入口（含 `GET /api/auth/session` 返回 cookie 名的最小服务端改动；第 7.5、7.6 节） | 02、03、04 | 2.5 |

合计 25 个任务，约 47.5 天工作量（范围缩小前是 48 个任务、93 天）。依赖链最长的是 01 → 02 → 08 → 22 → 41 → 42，约 12 天（3 + 2.5 + 2 + 2 + 1 + 1.5）。前 3 天只有 00、01、45 能做，路数用不满；02 合并后的功能任务互不依赖，瓶颈是审核返工速度和 macOS runner，再加路数也只能提前约半天。

派活顺序（按 5 路，「能聊天」优先）：
1. 先并行派 00、01、45；01 合并后派 02、03、04、34（34 不依赖 02，尽早开）。
2. 02 合并后先派 05、07、08、09、15、06。
3. 其后按空出的路派 10、11、12、14、16、22、23、48；35 在 34、02、03、04 合并后与它们并行。43 在 01、04 合并后穿插派。
4. 41 在 05 合并后先适配到能出内部包，收尾放在可用版全部合并之后。

## 里程碑（按 5 路；日期是北京时间）
- [ ] 基础可用（目标约 11-19）：00–04、43、45 合并，34 在做；PR 上 `Mobile builds`、`iOS Linux`、`Public scan` 和 `ios-contract` 都是绿的，夹具模式能出空壳截图。02 合并后先停半天：协调者拿 08、16、48 三个任务对照入口签名，确认够用再派满 5 路。
- [ ] 真机截图（11-25 前）：11-24 用当天已合并的部分由 41 出 TestFlight 内部包，协调者真机自测（已合并部分里的登录方式、手表、收发消息、键盘、滚动、流式、审批卡片等），11-25 前给用户发真机截图；没合并的项在截图说明里单独列出。
- [ ] 可用版（全部合并约 11-28）：05–12、14–16、22、23、34、35、48 合并；再出一次内部包，真机自测补齐（三种登录方式、手表、远程桌面、每个内嵌网页入口和登录状态带入、通话按第 7.5 节）。
- [ ] 可发版（约 11-30）：41 收尾、42 对照验收完成；用户确认后再发外部测试。

## 进度
状态：未开始
更新：2026-11-14
当前里程碑：基础可用

### 已完成
- 规格第 1 轮审核意见已全部处理（见「合同变更」）。
- 2026-11-14 按用户决定缩小范围：常用部分原生、其余内嵌网页，任务从 48 个减到 25 个（见「合同变更」）。
### 下一步
协调者在宿主机装 Linux 版 Swift 工具链并试跑一次（swift.org 有没有 Ubuntu 26.04 的包、24.04 的包能不能用，都要实测）；先并行派 00、01、45（这三个没有依赖）；01 合并后派 02、03、04、34；之后按「任务拆分」里的派活顺序。
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
- 2026-11-14，范围缩小（用户定方向，协调者定细节；见已定的决定「用户（范围缩小）」一条）：
  - 结果和验收改为「常用部分原生、其余内嵌网页」：验收第 1 条网页视图只允许在 `Features/WebHost` 和旧版 cookie 迁移里；第 3 条内嵌网页模块只截入口和容器；第 5 条按第 9 节「做法」列验收；第 6 条去掉三种通话接通，改为内嵌网页模块能打开、登录状态带得过去。
  - 新增任务 48「内嵌网页容器与入口」（第 7.5、7.6 节）：统一 WKWebView 容器、会话带给网页（不改服务端鉴权）、CF cookie、深浅色、返回和关闭、外链交系统浏览器、只加载当前服务器；各内嵌网页模块的入口和路由，缺路由时可在前端加。
  - 删除任务 13、17、18、19、20、21、24–33、36–40、44、46、47；17、18、44 并入 16（第 7.7 节的原生/摘要分法），引用回复和发送者并入 08，mermaid 并入 11 只显示源码。估计调整：00 降到 2 天，06 降到 1.5 天，16 降到 2 天，42 降到 1.5 天，48 为 2.5 天。
  - 第 1.4 节入口表加「状态」列；第 4.2 节没有原生消费者的帧注明；第 5、7 节改写 widget、图表、`app` 消息、其他画面、mermaid、通话的做法；第 8.3 节加内嵌网页截图规则；第 9 节加「做法」列和第 38 行；第 10 节去掉 LiveKit 和 mermaid.min.js；第 12 节 `IosStatus` 加 `web`。
  - 工期：48 个任务 93 天、5 路约 28 天，改为 25 个任务 47.5 天、关键路径约 12 天；里程碑改为基础可用、可用版、可发版（41 收尾、42 验收后，用户确认再发外部测试）。
- 2026-11-14，范围缩小后的补充（协调者定；见已定的决定「协调者（范围缩小后的补充）」一条）：
  - 只有 Bearer 的会话带进网页：48 在 `GET /api/auth/session` 返回里加 `cookieName`（只加名字，不新增凭证和接口），App 用已有令牌按这个名字设 cookie。从停止条件移出；第 1.3 节加 48 的服务端可改范围（只限这一处及其测试）；第 7.6 节、约束、任务 48 同步改。
  - 里程碑和日期统一为一套：基础可用约 11-19（目标）、11-24 用已合并部分出内部包、11-25 前发真机截图（没合并的项单独列出）、可用版全部合并约 11-28、可发版约 11-30；删掉按估计推算的另一套日期。任务拆分加派活顺序（「能聊天」优先：05、07、08、09、15、06 先，其后 10、11、12、14、16、22、23、48，34、35 并行）。
  - 第 7.7 节卡片默认分法、`WebEntryMenu` 入口、覆盖表先登记待做的做法、通话按 provider 隐藏，都按原写法确认。
