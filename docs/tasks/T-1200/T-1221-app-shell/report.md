# T-1221-app-shell 交付报告

## 第 1 轮：2026-11-14

已在工作区写入 SwiftUI 骨架、夹具传输、19 个功能占位和 27 个 XCTest 方法；没有提交、推送或运行 App。本轮不作 App 编译或测试通过的结论。Actions 运行链接由协调者补充。

### 1. 文件改动

下表路径以 `mobile/ios/` 为根。

| 文件 | 改动 |
|---|---|
| `CryBot/AppDelegate.swift` | 移除 UIKit 窗口、旧控制器与回调转发，保留 UIApplicationDelegateAdaptor 所需的启动代理。 |
| `CryBot/ViewController.swift` | 删除旧网页壳控制器。 |
| `CryBot/App/CryBotApp.swift` | 提供 SwiftUI @main、两种 URL 回调、外观启动参数与前后台连接处理；真实模式前台继续刷新手表，夹具模式不实例化 WatchSync。 |
| `CryBot/App/RootView.swift` | 提供登录分支、对话/收件箱两页签、未读徽标、iPad 分栏、原生 push、提醒层和根级 fullScreenCover 网页占位。 |
| `CryBot/App/Types.swift` | 定义人员、会话、消息上下文、动作和所有原生/网页路由类型，导航与动作值支持 Hashable。 |
| `CryBot/App/LaunchOptions.swift` | 解析场景、外观和 Gallery 启动参数，忽略缺值与无效外观。 |
| `CryBot/App/GalleryDestination.swift` | 按名字选择 19 个 Gallery。 |
| `CryBot/App/MessageBodyView.swift` | 按纯逻辑的固定计划组合正文、附件及前后附加信息，widget/app 使用网页摘要。 |
| `CryBot/App/Logic/MessageLayout.swift` | 完整分发 15 种消息及 unknown，未知消息仍保留可解码的附件。 |
| `CryBot/App/Logic/FrameCursor.swift` | 统一提取 hello 与普通帧 JSON 中的 cursor。 |
| `CryBot/App/ShellText.swift` | 从独立 Shell 文案表读取骨架文案，不使用旧 Localizable 表。 |
| `CryBot/App/Shell.xcstrings` | 提供页签、菜单、关闭、加载、错误和摘要等英文/简体中文文案。 |
| `CryBot/App/Fixtures/shell-basic.json` | 提供两个机器人、一个群聊、文本/widget/app 消息、未读计数、定时帧和示例 socket 数据。 |
| `CryBot/App/Fixtures/shell-signed-out.json` | 提供无登录的隔离场景。 |
| `CryBot/Store/AppStore.swift` | 实现 Transport 接入、CoreEndpoints 动作、快照/翻页、帧订阅、导航、连接生命周期和顺序退出登录。 |
| `CryBot/Store/ConnectionPolicy.swift` | 实现可注入单调时钟、40 秒无帧判断和 1/2/4/8/16/30 秒退避。 |
| `CryBot/Store/FixtureTransport.swift` | 加载包内场景、匹配响应、记录请求并定时回放 SSE 与 WebSocket，缺响应直接报错。 |
| `CryBot/Store/ImageDataCache.swift` | 经当前 Transport 下载图片并使用有容量上限的会话内缓存，退出/换传输清除缓存。 |
| `CryBot/Design/Theme.swift` | 提供 daylight/midnight 语义颜色、品牌紫、动态字号、间距与圆角令牌。 |
| `CryBot/Design/Controls.swift` | 提供 CardContainer、SectionHeader、EmptyState、ErrorBanner 和 LoadingRow。 |
| `CryBot/Design/AuthImage.swift` | 将当前 Transport 下载的缓存图片显示为原生图片，并处理取消与失败。 |
| `CryBotTests/Shell/ShellTestSupport.swift` | 提供取消安全的手动时钟、异步条件等待与延迟响应传输。 |
| `CryBotTests/Shell/AppStoreTests.swift` | 用 11 个测试覆盖同步夹具、状态归并、订阅取消、导航、顺序/并发退出、旧响应隔离、动作、历史与图片缓存。 |
| `CryBotTests/Shell/ConnectionTests.swift` | 用 5 个测试覆盖退避、无帧超时、后台取消、游标恢复、ping 保活和 hello 快照刷新。 |
| `CryBotTests/Shell/FixtureTransportTests.swift` | 用 4 个测试覆盖响应匹配、请求记录、上传下载、socket 回放/关闭和无效场景。 |
| `CryBotTests/Shell/MessageLayoutTests.swift` | 用 3 个测试覆盖全部 kind、unknown、附件与附加信息顺序。 |
| `CryBotTests/Shell/LaunchAndTypesTests.swift` | 用 4 个测试覆盖启动参数、共用类型、Hashable 与禁止目录静态检查。 |

19 个占位目录及固定入口如下；表中两个文件都位于 `CryBot/Features/<目录>/`，每个 Entry 文件同时包含 `<目录>Gallery()`。

| 目录 | Entry 文件与说明 | 固定入口签名 | 文案文件与说明 |
|---|---|---|---|
| Login | `LoginEntry.swift`：提供 LoginModel 与返回 false 的 LoginRouter 占位。 | `LoginFlowView(model: LoginModel)`、`LoginRouter.handle(url: URL) -> Bool` | `Login.xcstrings`：空字符串表，源语言 en。 |
| Avatar | `AvatarEntry.swift`：按固定签名显示入口名称和占位标识。 | `BotAvatar(bot: WireBot, size: CGFloat)`、`PersonAvatar(person: PersonRef, size: CGFloat)` | `Avatar.xcstrings`：空字符串表，源语言 en。 |
| Sidebar | `SidebarEntry.swift`：列出夹具会话，并在工具栏放 global 菜单。 | `ConversationListView()` | `Sidebar.xcstrings`：空字符串表，源语言 en。 |
| Chat | `ChatEntry.swift`：提供单聊页头 bot 菜单及调用冻结消息分发器的时间线占位。 | `ChatScreen(ref: ConversationRef)`、`ThreadTimelineView(thread: ThreadID, style: TimelineStyle)` | `Chat.xcstrings`：空字符串表，源语言 en。 |
| Composer | `ComposerEntry.swift`：按固定签名显示入口名称和占位标识。 | `ComposerView(target: ComposerTarget)` | `Composer.xcstrings`：空字符串表，源语言 en。 |
| Activity | `ActivityEntry.swift`：按固定签名显示入口名称和占位标识。 | `ActivityMessageView(message: WireMessage, context: MessageContext)`、`RuntimeItemsView(thread: ThreadID)` | `Activity.xcstrings`：空字符串表，源语言 en。 |
| Markdown | `MarkdownEntry.swift`：按固定签名显示入口名称和占位标识。 | `MarkdownView(source: String, streaming: Bool, context: MessageContext)` | `Markdown.xcstrings`：空字符串表，源语言 en。 |
| Code | `CodeEntry.swift`：按固定签名显示入口名称和占位标识。 | `CodeBlockView(code: String, language: String?)` | `Code.xcstrings`：空字符串表，源语言 en。 |
| Math | `MathEntry.swift`：按固定签名显示入口名称和占位标识。 | `MathView(latex: String, display: Bool)` | `Math.xcstrings`：空字符串表，源语言 en。 |
| Media | `MediaEntry.swift`：按固定签名显示入口名称和占位标识。 | `AttachmentsView(attachments: [WireAttachment], context: MessageContext)` | `Media.xcstrings`：空字符串表，源语言 en。 |
| CardsApproval | `CardsApprovalEntry.swift`：按固定签名显示入口名称和占位标识。 | `OptionsCardView(message: WireMessage, context: CardContext)` | `CardsApproval.xcstrings`：空字符串表，源语言 en。 |
| CardsRequests | `CardsRequestsEntry.swift`：按固定签名显示入口名称和占位标识。 | `RequestCardBody(card: OptionCardData, kind: RequestCardKind, context: CardContext)` | `CardsRequests.xcstrings`：空字符串表，源语言 en。 |
| CardsConnect | `CardsConnectEntry.swift`：按固定签名显示入口名称和占位标识。 | `ConnectCardView(message: WireMessage, context: CardContext)` | `CardsConnect.xcstrings`：空字符串表，源语言 en。 |
| Records | `RecordsEntry.swift`：按固定签名显示入口名称和占位标识。 | `RecordRowView(message: WireMessage, context: MessageContext)` | `Records.xcstrings`：空字符串表，源语言 en。 |
| MessageExtras | `MessageExtrasEntry.swift`：按固定签名显示入口名称和占位标识。 | `MessageLeadingExtras(message: WireMessage, context: MessageContext)`、`MessageTrailingExtras(message: WireMessage, context: MessageContext)` | `MessageExtras.xcstrings`：空字符串表，源语言 en。 |
| Group | `GroupEntry.swift`：提供群聊页头 group 菜单，并保留路由所带线程。 | `GroupScreen(group: GroupID)` | `Group.xcstrings`：空字符串表，源语言 en。 |
| Inbox | `InboxEntry.swift`：提供收件箱、通知与不拦截触摸的提醒层占位。 | `InboxScreen()`、`NotificationsScreen()`、`NotifyBannerHost()` | `Inbox.xcstrings`：空字符串表，源语言 en。 |
| Desktop | `DesktopEntry.swift`：按固定签名显示入口名称和占位标识。 | `DesktopViewer(target: DesktopTarget)` | `Desktop.xcstrings`：空字符串表，源语言 en。 |
| WebHost | `WebHostEntry.swift`：提供原生全屏容器占位、关闭按钮、菜单和消息打开按钮。 | `WebHostScreen(target: WebHostTarget)`、`WebEntryMenu(scope: WebEntryScope)`、`WebMessageSummary(message: WireMessage, context: MessageContext)` | `WebHost.xcstrings`：空字符串表，源语言 en。 |

空 `.xcstrings` 使用标准的 `sourceLanguage: en / strings: {} / version: 1.0`；空表没有语言条目可填写，工程现有 knownRegions 已含 en、zh-Hans。实际新增的骨架文案在 `Shell.xcstrings` 中逐项包含这两种语言。

新增以下 Color Set；路径为 `CryBot/Assets.xcassets/<名字>.colorset/Contents.json`，每个文件提供浅色默认值和深色覆盖，未改原有图标及 LaunchBackground。

| 名字 | 说明 |
|---|---|
| ThemeAccent | 提供浅色 `#126FD4`、深色 `#1084FE`。 |
| ThemeAccentText | 提供浅色 `#0B69CC`、深色 `#7FC0FF`。 |
| ThemeBackground | 提供浅色 `#FCFCFC`、深色 `#121212`。 |
| ThemeBrand | 提供浅色 `#5733E6`、深色 `#5733E6`。 |
| ThemeCard | 提供浅色 `#EFEFEF`、深色 `#1F1F1F`。 |
| ThemeComposer | 提供浅色 `#FFFFFF`、深色 `#1F1F1F`。 |
| ThemeControl | 提供浅色 `#E3E3E3`、深色 `#282828`。 |
| ThemeDanger | 提供浅色 `#CD2834`、深色 `#FF5667`。 |
| ThemeHairline | 提供浅色 `#1C1C1C3D`、深色 `#383838`。 |
| ThemeInk | 提供浅色 `#1C1C1C`、深色 `#F5F5F5`。 |
| ThemeInset | 提供浅色 `#E9E9E9`、深色 `#1B1B1B`。 |
| ThemePanel | 提供浅色 `#F5F5F5`、深色 `#0E0E0E`。 |
| ThemeRaised | 提供浅色 `#E4E4E4`、深色 `#202020`。 |
| ThemeSecondaryInk | 提供浅色 `#1C1C1CAD`、深色 `#F5F5F5A8`。 |
| ThemeSuccess | 提供浅色 `#007A44`、深色 `#38D591`。 |
| ThemeTertiaryInk | 提供浅色 `#1C1C1CA6`、深色 `#F5F5F591`。 |
| ThemeUserBubble | 提供浅色 `#1C1C1C`、深色 `#5A5A5A`。 |
| ThemeUserBubbleInk | 提供浅色 `#FCFCFC`、深色 `#F5F5F5`。 |
| ThemeWarning | 提供浅色 `#9C5B00`、深色 `#FF9800`。 |

`report.md`：记录本轮实现、静态检查、执行限制及后续衔接事项。未修改工程、Packages、WatchSync、手表、Shared、工作流、服务端或网页代码；没有新增依赖。

冻结的调用关系：`AppRoute.web(target)` 设置 `AppStore.webTarget`，`RootView.fullScreenCover` 负责弹出 `WebHostScreen(target:)`，关闭使用 dismiss 回写绑定；48 只替换容器内容。单聊/群聊路由和远程桌面使用原生 NavigationStack。

夹具的 `afterMs` 是从本次流连接开始计的绝对毫秒偏移，同一时间保持文件顺序；已知 cursor 恢复到该帧之后。socket 的字符串 data 是文本，`{"base64":"AQID"}` 是二进制，其他 JSON data 编码成文本。事件脚本结束后保持流打开，供超时/后台取消测试使用；socket 脚本结束则结束接收。请求先匹配带查询参数的响应，再匹配 `METHOD /path`，最后回退到 snapshot/threads；所有未登记请求报错，不回退联网。

`AppStore.fixture(scenario:)` 同步加载 signedIn、snapshot、threads，以及 responses 中已有的 config/notifications/inbox count，尚不回放 frames；App 的 active 生命周期调用 `resumeRealtime()` 后才按时播放。截图调用方只构造 store 即可得到首帧之前的稳定状态。

### 2. 检查命令与实际结果

开工在仓库根目录执行 `crybot-link-deps`，返回：

```text
crybot-link-deps: linked 73 entries from /opt/crybot-deps/node_modules into node_modules
```

上行对工具输出中的绝对工作区路径作了省略。没有运行 Web/服务端测试；沙箱禁止监听端口，e2e 未执行，以 Actions 为准。`docs/verification/README.md` 在当前检出中不存在，没有操作任何线上实例。

任务 43 尚未提供 `mobile/ios/scripts/linux-test.sh` 和 `linux-check.sh`。本地创建忽略目录下的 `mobile/ios/.linux-build/shell-parse.sh`，运行：

```bash
bash mobile/ios/.linux-build/shell-parse.sh
```

退出码 127，原样输出：

```text
Swift syntax check NOT RUN: /opt/swift/usr/bin/swiftc is absent and swiftc is not on PATH.
```

脚本内容如下，协调者可在有工具链的环境重建；不覆盖 HOME，所有模块缓存都在指定忽略目录内，逐文件运行：

```bash
#!/usr/bin/env bash
set -euo pipefail
export XDG_CACHE_HOME="$PWD/mobile/ios/.linux-cache"
export CLANG_MODULE_CACHE_PATH="$XDG_CACHE_HOME/clang"
export SWIFTPM_MODULECACHE_OVERRIDE="$XDG_CACHE_HOME/modules"
mkdir -p "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
compiler=/opt/swift/usr/bin/swiftc
if [[ ! -x "$compiler" ]]; then
  compiler="$(command -v swiftc || true)"
fi
if [[ -z "$compiler" || ! -x "$compiler" ]]; then
  echo 'Swift syntax check NOT RUN: /opt/swift/usr/bin/swiftc is absent and swiftc is not on PATH.'
  exit 127
fi
count=0
while IFS= read -r file; do
  "$compiler" -parse -module-cache-path "$CLANG_MODULE_CACHE_PATH" "$file"
  count=$((count + 1))
done < <(rg --files mobile/ios/CryBot/App mobile/ios/CryBot/Store mobile/ios/CryBot/Design mobile/ios/CryBot/Features mobile/ios/CryBotTests/Shell -g '*.swift'; echo mobile/ios/CryBot/AppDelegate.swift)
echo "Swift syntax check: $count files parsed."
```

执行静态源文件/资源核对脚本（临时文件保存在忽略目录中）：

```bash
python3 mobile/ios/.linux-build/shell-static-check.py
```

退出码 0，原样输出：

```text
Entry source audit: 19 feature directories, 28 fixed signatures, 19 galleries, 19 empty catalogs.
Route source audit: 16 WebHostTarget cases, 3 WebEntryScope cases.
Web embedding source audit: only WatchSync.swift matches the requested pattern.
Removed entry source audit: no matches in CryBot Swift sources.
App/Logic imports: Foundation and CryCore only.
Resource JSON audit: 22 files parsed; fixture shape and shell locales checked.
XCTest source inventory: 27 methods in 6 Swift files; execution NOT performed.
Static source audits do not compile Swift or run the app.
```

另用 Python 对照 CryCore 解码器的 required/nullable 字段检查 shell-basic 的 bot/group 对象，并扫描 Swift 声明的禁用名字，最终输出：

```text
Fixture required-field audit: shell-basic bots and groups include all CryCore required/nullable keys.
Type-name audit: no declarations collide with the specification blacklist.
```

`git diff --check` 退出码 0，无输出。运行 `rg -n 'import WebKit|WKWebView|WebView\(|WebPage' mobile/ios/CryBot`，仅输出：

```text
mobile/ios/CryBot/WatchSync.swift:3:import WebKit
```

已删除入口名的无命中范围是 CryBot Swift 源码；规格、旧任务说明以及网页源码仍可能含这些名字，不在本任务范围内删除。

交给 04/协调者的启动参数：

```text
-CryFixtureScenario shell-basic -CryAppearance light
-CryFixtureScenario shell-basic -CryAppearance dark
-CryFixtureScenario shell-signed-out
-CryFixtureScenario shell-basic -CryGallery WebHost -CryAppearance dark
```

没有执行 Swift 语法检查、类型检查、XCTest、模拟器启动或截图；上面的静态核对不能代替它们。共写入 27 个 XCTest 方法，实际执行数须由 Actions 日志确认。本任务没有截图测试，也没有占用 04 的 Support 文件或测试后缀。

待协调者填写：Mobile builds 运行链接与实际测试数；Public scan 运行链接；43 合并后 iOS Linux 运行链接。当前没有可附的 Actions 运行链接。

### 3. 覆盖表对应项

当前检出没有 `server/testing/ios-contract/coverage.ts`，未修改或猜测它的具体键名。完成的是以下基础接线；原生功能正文和网页内容仍是占位，不能据此把功能行标成 done 或 web：

- WireMessage kind 的分发：text、options、activity、screen、connector、secret、signin、routine.run、goal.run、burst、digest、compaction、call、widget、app；另有 unknown 提示与可解码附件兜底。
- WireMessage attachments 与前后附加信息的固定组合入口。
- ServerFrame 所有 kind 的 LiveState 先归并、再按 kinds 订阅分发，包括当前无原生消费者的 routine/webhook/app-trigger/mcp.changed/device.job/data 等帧。
- hello.resumed=false 重新拉快照、screens=false、40 秒无帧断开、退避与前后台恢复的仓库接线。
- 原生会话/收件箱/通知/远程桌面导航，以及 16 个 WebHostTarget 的统一弹出入口。

### 4. 需要协调者处理

- **分支与 CI**：尝试 `git switch -c T-1221-app-shell` 失败，原因是 `.git` 所在文件系统只读（不能创建 refs 锁文件）；当前仍在 master，改动留在工作区，没有提交。请协调者创建指定分支、提交、推送并开草稿 PR，检查 Mobile builds 与 Public scan；实际 XCTest 数须大于 0。
- **工具链**：当前环境既没有 Xcode，也没有说明指定的 Swift 编译器；需要在有工具链的环境执行报告中的语法脚本，再由 Mobile builds 编译和执行测试。没有自行安装依赖。
- **project.yml**：本任务无必须新增的行，现有递归 CryBot/CryBotTests sources 应收集新增 Swift、JSON、xcstrings 和 Color Set；请在首轮 Actions 确认两个 shell JSON 进入 App 包。工程的 PRODUCT_NAME 含空格，测试通过条件导入同时兼容 CryBot 与 Cry_Bot 模块。残留的 LiveKit、LiveKitWebRTC 仍由协调者另行删除，本任务没有导入它们。
- **状态机衔接**：Store 中是最小可注入时钟版本；05 接入 LiveTransport 时可以换成 03 的状态机，保留目前的行为测试，避免两层同时重连。AppStore 负责前后台开关、订阅和顺序退出；03 负责网络和身份细节。
- **游标衔接**：当前 Transport 只交付 ServerFrame，没有单独交付 SSE id；CryCore SSEParser 的 lastEventID 也未混入帧。仓库使用 hello.cursor 和帧原始 JSON 的 cursor。05/03 接入时应核对 LiveTransport 是否内部保存最新 SSE id，或按现有保留字段交付游标，避免重连只使用 hello 的旧游标；本任务未修改 Packages 协议。
- **历史读取**：CryCore LiveState 没有公开历史页载入方法；`loadOlder(thread:)` 在 AppStore 保存历史并由 `page(thread:)` 与实时页合并。08/22 请通过该入口读取翻页结果；若希望历史直接进入 LiveState，建议由协调者安排 01 增加公开 load(history:) API，本任务未越界修改。
- **入口细节**：固定 28 个功能签名均保留。规格未给出部分上下文的字段明细：本轮采用 `ConversationRef.bot/group(id, thread:, focus: = nil)`、`ComposerTarget(conversation, thread, replyTo)`、`RespondAction(thread, body: RespondBody)`、`WidgetAction(action, values)`、`DesktopTarget(bot, desktopID?)`、`CallRef(bot, callID?)` 和 `McpScope.global/bot`；请协调者在冻结前与 08、16、35、48 对表。
- **人员列表转换**：CryCore 当前只有 ResolvedSender 和 WireMessageFieldsRelay，没有人员列表元素模型，因此 `PersonRef(member:)` 接 `[String: JSONValue]`，读取 id/name/email/avatarUrl/color；建议提供明确成员模型后增加有类型的构造入口。
- **图片 URL**：AuthImage 只经当前 Transport 使用 URL 的路径与查询，不创建外部网络会话；05 接入具有 API/web 不同前缀的服务器时，请与 03 核对资源路径归一化，当前 Transport 协议不暴露服务器基址。
- **退出与网页登录**：05 与 48 分别注册清身份/通知手表和清网页存储的 handler，仓库按注册顺序 await，完成后清内存；更换服务器也先 signOut。LoginRouter 当前返回 false，05 替换成调用 03 CallbackRouter；WebHost 当前只有原生占位，48 替换内容而不改变根级 fullScreenCover 方式。
- **范围与未解决项**：除指定报告外，未改允许范围之外的文件。剩余验收缺口是工具链/Actions 的实际编译、测试及截图证据；没有声称登录、网页容器或其他功能占位已经实现业务功能。
