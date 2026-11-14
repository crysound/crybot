# T-1221-app-shell 交付报告

## 第 1 轮：2026-11-14（实现记录）

交付 SwiftUI 骨架、状态仓库、夹具传输、19 个功能占位、主题资源及 27 个 XCTest 方法；当时只有静态核对，没有 App 编译、XCTest 执行或截图结果。

### 文件改动

- `mobile/ios/CryBot/App/`：SwiftUI App 入口、RootView、Types、LaunchOptions、MessageBodyView、纯逻辑分发及 shell-basic / shell-signed-out 场景；`AppDelegate.swift` 保留必要代理行为，移除旧 `ViewController.swift` 网页壳。
- `mobile/ios/CryBot/Store/`：AppStore、FixtureTransport、连接策略及鉴权图片缓存。状态归并、独立帧订阅、历史分页、动作请求、导航、顺序退出处理器与夹具请求记录已接入。
- `mobile/ios/CryBot/Features/`：19 个允许目录的 Entry、Gallery 与空文案表；WebHost 只提供类型和占位入口，尚无网页容器实现。
- `mobile/ios/CryBot/Design/`、`Assets.xcassets/`：主题令牌、通用控件、AuthImage 及明暗 Color Set。
- `mobile/ios/CryBotTests/Shell/`：状态、连接、传输、启动参数与类型、消息分发及目录检查的隔离测试。

### 覆盖表对应项

- App 根导航、登录占位、通知入口、原生远程桌面入口，以及 `AppRoute.web` 的统一全屏入口已经接通。
- `MessageLayout` 为全部已知消息 kind 和 unknown 建立稳定分发；widget / app 对应 `WebMessageSummary`。这是分发与占位完成，不代表各消息正文功能或网页功能完成。
- `ServerFrame` 先交 LiveState 再分发给订阅者；无原生消费者的帧仍可订阅。夹具、退出清理、主题与启动参数作为功能任务的共用基础。
- 未修改 `server/testing/ios-contract/coverage.ts`；由协调者按实际功能进度登记，不应将 19 个功能占位或 48 的容器实现直接标为 done。

### 需要协调者处理

- `ConversationRef` 使用 `.bot(BotID, thread: ThreadID?, focus: MessageID? = nil)` / `.group(GroupID, thread: ThreadID?, focus: MessageID? = nil)`，把 focus 放进会话引用本身，保留不传 focus 的调用形式。08、22 接口核对时需共同沿用。
- `RespondAction` 选择 `thread: ThreadID` 与 `body: RespondBody`，直接复用 CryCore 的响应合同；相等性涵盖 body，哈希使用 thread 和 requestId。`DesktopTarget` 选择 `bot: BotID` 与可选的 `desktopID: String? = nil`，供 35 接入时确认桌面标识。
- `loadOlder(thread:)` 返回合并的 `ThreadPage`，通过 Store 的 historyPages 缓存旧页、按消息 ID 去重，再由 `page(thread:)` 合并实时消息。CryCore 的 LiveState 目前没有历史页归并入口，不能直接写其 private(set) threads；建议 01 / 协调者补专用历史 API 后统一归并位置，08 应通过 Store 读取分页，避免只读 state.threads 丢失旧页。
- `PersonRef(member:)` 暂收 `[String: JSONValue]`，转换 id、name/email、avatarUrl、color；CryCore 缺少可直接使用的成员列表强类型合同。需由协议层与头像/团队功能协调正式成员类型，再替换这一适配，不能把字典适配当作协议已补全。
- `LoginRouter.handle(url:)` 当前是返回 false 的占位。05 将其接到 03 的 CallbackRouter；App 的 Universal Links 和 scheme 回调都只经 LoginRouter，不在入口解析。
- 48 接续现有 `WebHostTarget`、三种 `WebEntryScope`、`WebMessageSummary` 和全屏 `WebHostScreen`，替换占位内容。网页会话注入、真实路由和容器生命周期仍归 48；05 注册身份/手表清理，48 另注册网页数据清理。
- 05 接入 LiveTransport 时可用 03 的连接状态机替换 Store 最小策略，保留取消、退避、续传行为，避免两层重连。

以上三节在第 4 轮按审核列出的缺失事项、brief 和当前代码补回；审核已对照 9d5d38f1 原文。协调者从该提交补回下列未覆盖的原文：

> 夹具的 `afterMs` 是从本次流连接开始计的绝对毫秒偏移，同一时间保持文件顺序；已知 cursor 恢复到该帧之后。socket 的字符串 data 是文本，`{"base64":"AQID"}` 是二进制，其他 JSON data 编码成文本。事件脚本结束后保持流打开，供超时/后台取消测试使用；socket 脚本结束则结束接收。请求先匹配带查询参数的响应，再匹配 `METHOD /path`，最后回退到 snapshot/threads；所有未登记请求报错，不回退联网。

> **project.yml**：本任务无必须新增的行，现有递归 CryBot/CryBotTests sources 应收集新增 Swift、JSON、xcstrings 和 Color Set；请在首轮 Actions 确认两个 shell JSON 进入 App 包。工程的 PRODUCT_NAME 含空格，测试通过条件导入同时兼容 CryBot 与 Cry_Bot 模块。残留的 LiveKit、LiveKitWebRTC 仍由协调者另行删除，本任务没有导入它们。

> **入口细节**：固定 28 个功能签名均保留。规格未给出部分上下文的字段明细：本轮采用 `ConversationRef.bot/group(id, thread:, focus: = nil)`、`ComposerTarget(conversation, thread, replyTo)`、`RespondAction(thread, body: RespondBody)`、`WidgetAction(action, values)`、`DesktopTarget(bot, desktopID?)`、`CallRef(bot, callID?)` 和 `McpScope.global/bot`；请协调者在冻结前与 08、16、35、48 对表。 <!-- public-scan: allow domain -->

## 第 2 轮：2026-11-14（审核第 1 轮返工）

本轮在已有代码上修复，未创建提交、未推送。当前沙箱的 `git branch --show-current` 输出为 `master`，`git log -1 --format='%h %s'` 输出为 `<沙箱基线提交>`；上一轮文件已在 HEAD 中。本轮差异留在工作区，待协调者带回任务分支。

### 审核意见逐条处理

| 项 | 本轮结果与依据 |
|---|---|
| 1 续传游标 | `FrameCursor` 直接读取各帧 payload 的 `additionalFields["seq"]`，unknown 读取 raw 对象；使用 hello cursor 的 stream 前缀拼成 `STREAM:seq`。无 seq 的 ping 不改变游标，拒绝非整数、负数和超过 JS 安全整数范围的 seq。不再逐帧编码/解码。FixtureTransport 同步使用该规则定位续传位置。`shell-basic.json` 增加真实 hello，后续帧只带数字 seq。测试断言 hello 后 seq=42，第二次 `events` 的 since 为 `STREAM:42`；另测 ping、未知帧、stream 切换及夹具从 seq=7 后回放 seq=8。 |
| 2 图片 URL | `ImageDataCache.swift` 在读取缓存和 Transport 前检查 scheme、host 均为空，且没有 baseURL；绝对 URL 直接抛 `EndpointError.invalidPath`，AuthImage 现有失败分支显示占位。相对路径测试检查下载数据、query、缓存和退出清理；绝对 https/http、协议相对 URL、file URL 即使命中预填缓存也失败，并断言请求记录为空。 |
| 3 紧凑布局 | TabView 中对话与收件箱各自拥有 NavigationStack，分别绑定 `chatsPath` / `inboxPath`；push 发生在页签内。iPad 保留 NavigationSplitView，detail 使用当前页签路径。规格 §6 要求系统导航控件，没有相反的层级规定。测试覆盖切换页签后各自路径保留；页签栏、标题与 toolbar 的实际渲染待 Actions。 |
| 4 群聊引用 | `RouteDestination` 显式把 group、thread、focus 传给 GroupScreen。保留 `GroupScreen(group:)` 调用形式，新增带默认 nil 的 thread/focus 参数，在入口内构成完整 `ref`；不再读取 `store.path.last`。测试覆盖导航继续 push 后入口的 ref 不变。focus 保存给后续群聊实现使用，占位页没有新增消息定位功能。 |
| 5 未读数 | `refreshSnapshot()` 成功加载快照后刷新 inbox count；bot/group、删除、message/message.patch、thread、notify/notifications.read、snapshot 帧归并后也刷新。计数请求失败保留已有值，不使有效事件流反复重连（服务端无收件箱时可能返回 404，见 `server/routes/inbox.ts:27`）。测试通过普通 attach 分支（`isFixture == false`，底层仍为隔离测试传输）验证初始 0 → hello 快照后 3 → bot 5 → group 4 → 删除 2 → notifications.read 0，再手动快照刷新至 2。 | <!-- public-scan: allow domain -->
| 6 初次快照 | 删除连接前的预拉取；只有 hello.resumed=false 拉快照。快照失败时清除本连接的游标，让下次重新取得完整状态。测试断言 hello 前无快照请求，false 恰好一次，true 零次。 |
| 7 连接状态 | receive 中仅在当前状态不是 connected 时写 connected，普通连续帧不重复触发该属性更新。 |
| 8 deinit 隔离 | 删除 AppStore 的 deinit，将 Task 存放在非 actor 的私有 ConnectionTaskLifetime 中，由它的 deinit 取消自身 Task；不从 nonisolated deinit 访问 MainActor 属性，不加 unsafe 隔离绕过。Swift 6 编译验证仍受下述工具链缺失限制。 |
| 9 退避 | 连续连接至少 30 秒后的帧才清零失败数；重连开始重置稳定时间起点。新增只发 hello 随即断开的流测试，逐次等待 1/2/4/8 秒；原策略测试覆盖 30 秒上限、稳定后复位和 40 秒无帧超时。 |
| 10 消息布局 | 第二个测试对全部 15 个已知 kind 和 unknown 比较完整的 `[leadingExtras, 对应正文, attachments, trailingExtras]`，包含正文 part 断言。 |
| 11 Gallery | SidebarGallery 外层增加 NavigationStack。WebHostGallery 增加 menu/summary scene，默认 screen 保留；可以直接构造 `WebHostGallery(scene: .menu)` 或 `.summary` 供 App 内截图，或在 Gallery 页签选择。menu 含 global/bot/group，summary 含 widget/app。没有在本机生成截图。 |
| 12 外观参数 | `-CryAppearance` 值先 lowercased；新增 LIGHT、DaRk 测试，原有无效值/缺值测试保留。 |
| 13 设计令牌 | 增加六个 Color Set 及 Theme 属性，RGBA 逐通道对照 CSS。规格 §6（`docs/specs/2026-11-14-ios-native.md:318`、`:319`）要求系统控件、动态字体及 Accessibility L 不截断，没有要求间距按字体缩放；保留现有固定 Spacing 和系统动态 Font。实际大字体布局仍需截图验收。 |
| 14 报告 | 保留上轮实现摘要，追加本轮结果、协议行号、逐项验收及原始检查输出；更正提交状态。任务描述说本机有 swiftc，但本次实际检索没有找到，不能据此填写虚假的编译结果。 |

协议核对依据（只读，没有改服务端）：

- `server/index.ts:4749` 递增 seq；`:4751` 写 SSE `id: STREAM_ID:seq` 并把数字 seq 放进 data；`:4754` 的客户端投影也保持同样格式。
- `server/index.ts:14716` 从 Last-Event-ID / since 读取续传位置；`:14728`–`:14730` 的 hello 才有 cursor；`:14735` 跳过 seq 小于等于 since 的缓冲帧。`:14700` 附近的 heartbeat 不带 id。
- CryCore `WireModels.swift:6318` 的 hello 有 cursor，普通 payload 通过 additionalFields 保留 seq；Transport 目前只交付 ServerFrame，没有 SSE id 参数，因此在本任务允许范围内用 stream 前缀加 seq 解决。

### 本轮文件

路径以 `mobile/ios/` 为根；仅下列原允许路径及本报告有版本控制差异。

| 文件 | 改动 |
|---|---|
| `CryBot/App/Logic/FrameCursor.swift` | 直接提取 seq、保留 hello 前缀并处理未知帧。 |
| `CryBot/App/Fixtures/shell-basic.json` | 使用 hello cursor + 后续 seq 的服务端形状。 |
| `CryBot/App/RootView.swift` | 每页签独立导航栈并传递完整群聊参数。 |
| `CryBot/App/LaunchOptions.swift` | 外观取值忽略大小写。 |
| `CryBot/Store/AppStore.swift` | 修复快照时机、游标、未读数调用、导航路径及 Task 生命周期。 |
| `CryBot/Store/ConnectionPolicy.swift` | 增加 30 秒稳定阈值。 |
| `CryBot/Store/FixtureTransport.swift` | 以真实 seq 规则定位回放起点。 |
| `CryBot/Store/ImageDataCache.swift` | 在下载和缓存之前拒绝非相对 URL。 |
| `CryBot/Features/Group/GroupEntry.swift` | 显式接收 thread/focus，保留原入口调用。 |
| `CryBot/Features/Sidebar/SidebarEntry.swift` | Gallery 提供工具栏所需的导航容器。 |
| `CryBot/Features/WebHost/WebHostEntry.swift` | 增加可选的菜单和摘要 Gallery 场景。 |
| `CryBot/Design/Theme.swift` | 暴露六个新增语义色。 |
| `CryBotTests/Shell/AppStoreTests.swift` | 更新夹具，补图片拒绝、独立页签路径及群聊引用测试。 |
| `CryBotTests/Shell/ConnectionTests.swift` | 补最新游标、首个 hello、真实 attach 未读数及 hello-only 退避测试。 |
| `CryBotTests/Shell/FixtureTransportTests.swift` | 补按 seq 跳过已处理帧的回放测试。 |
| `CryBotTests/Shell/LaunchAndTypesTests.swift` | 补外观大小写测试。 |
| `CryBotTests/Shell/MessageLayoutTests.swift` | 加强带附件消息的正文断言。 |
| `CryBotTests/Shell/ShellTestSupport.swift` | 增加可主动发送/结束事件流、改变 inbox 计数的隔离传输。 |

六个资源各为 `CryBot/Assets.xcassets/<名称>.colorset/Contents.json`：

| 名称 | daylight | midnight |
|---|---|---|
| ThemeAccentInk | #FFFFFF | #FFFFFF |
| ThemeDangerInk | #FFFFFF | #FFFFFF |
| ThemeSuccessInk | #FFFFFF | #072114 |
| ThemeAccentBorder | #1680F3 | #459FFE |
| ThemeEdge | #1C1C1C1F | #F5F5F50F |
| ThemeMenu | #FFFFFF | #1F1F1F |

对应源为 `src/styles.css:259` 的 midnight 和 `:750` 的 daylight 块，未修改网页文件。

### 检查命令与实际输出

开工执行 依赖准备脚本，退出码 0，原始输出：

```text
依赖准备脚本: linked 73 entries into <worktree>/node_modules
```

`docs/verification/README.md` 在当前检出不存在。没有启动或修改用户 live app，也没有对真实服务器发请求。新增测试全部使用进程内的 FixtureTransport 或 ShellControlledTransport，不需要监听端口；由于没有 Swift 工具链，本机没有执行这些夹具测试。沙箱端口 e2e 未运行，以 Actions 为准；没有为此尝试启动服务。

`command -v swiftc` 无输出，`ls /opt/swift/usr/bin/swiftc` 原始输出：

```text
ls: cannot access '/opt/swift/usr/bin/swiftc': No such file or directory
```

`find / -name swiftc -o -name swift-frontend 2>/dev/null` 也无命中。没有 Xcode/macOS，也未自行安装工具链或依赖。`mobile/ios/scripts/linux-test.sh`、`linux-check.sh` 尚不存在（任务 43 未接入本检出）。 <!-- public-scan: allow domain -->

在忽略目录中写入检查脚本，缓存全部指向 `.linux-cache`，没有使用 systemd，也没有覆盖 HOME。以下是本次调用和原始输出；两次均在编译器检查处退出 127，**不是 Swift 编译器的成功日志**。计划的 parse 输入是本轮改动的 17 个 Swift 文件；类型检查覆盖可在 Linux 使用 Foundation/Observation 的 App/Logic、Types、LaunchOptions、Store，SwiftUI 文件仍须由 Xcode 检查。

```bash
bash mobile/ios/.linux-build/shell-swift-check.sh parse
```

```text
swiftc -parse NOT RUN: swiftc is not on PATH and /opt/swift/usr/bin/swiftc does not exist.
```

```bash
bash mobile/ios/.linux-build/shell-swift-check.sh typecheck
```

```text
swiftc -typecheck NOT RUN: swiftc is not on PATH and /opt/swift/usr/bin/swiftc does not exist.
```

检查脚本内容（忽略目录不随提交传播，可在装有工具链的工作区重建）：

```bash
#!/usr/bin/env bash
set -euo pipefail
export XDG_CACHE_HOME="$PWD/mobile/ios/.linux-cache"
export CLANG_MODULE_CACHE_PATH="$XDG_CACHE_HOME/clang"
export SWIFTPM_MODULECACHE_OVERRIDE="$XDG_CACHE_HOME/modules"
mkdir -p "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
compiler=/opt/swift/usr/bin/swiftc
if [[ ! -x "$compiler" ]]; then compiler="$(command -v swiftc || true)"; fi
if [[ -z "$compiler" ]]; then
  echo "swiftc -$1 NOT RUN: swiftc is not on PATH and /opt/swift/usr/bin/swiftc does not exist."
  exit 127
fi
if [[ "$1" == parse ]]; then
  count=0
  while IFS= read -r file; do
    "$compiler" -parse -module-cache-path "$CLANG_MODULE_CACHE_PATH" "$file"
    count=$((count + 1))
  done < <(git diff --name-only -- '*.swift')
  echo "swiftc -parse: $count changed Swift files parsed."
else
  mapfile -t core < <(rg --files mobile/ios/Packages/CryKit/Sources/CryCore -g '*.swift')
  "$compiler" -swift-version 5 -emit-module -parse-as-library -module-name CryCore \
    -module-cache-path "$CLANG_MODULE_CACHE_PATH" -emit-module-path mobile/ios/.linux-build/CryCore.swiftmodule "${core[@]}"
  mapfile -t sources < <(rg --files mobile/ios/CryBot/App/Logic mobile/ios/CryBot/Store -g '*.swift')
  "$compiler" -swift-version 5 -typecheck -I mobile/ios/.linux-build \
    -module-cache-path "$CLANG_MODULE_CACHE_PATH" mobile/ios/CryBot/App/Types.swift \
    mobile/ios/CryBot/App/LaunchOptions.swift "${sources[@]}"
  echo 'swiftc -typecheck: Foundation/Observation shell sources checked; SwiftUI/XCTest app target requires Xcode.'
fi
```

执行 `python3 mobile/ios/.linux-build/shell-static-check.py`，退出码 0，原始输出：

```text
Feature audit: 19 allowed directories, entry files, galleries and empty catalogs; removed directories absent.
Route audit: 16 WebHostTarget cases and 3 WebEntryScope cases.
Cursor audit: exhaustive direct payload access for all 38 known frame kinds plus unknown; no encode/decode.
Fixture audit: hello cursor, numeric seq on subsequent frames, two bots, one group and signed-out scenario.
Color audit: all six new Color Sets match daylight/midnight RGBA values in src/styles.css.
Web embedding audit: only WatchSync.swift matches.
Removed entry audit: no removed entry names in CryBot Swift sources (documents excluded).
XCTest source inventory: 35 test methods; execution NOT performed.
git diff --check: passed.
Static audits do not compile Swift, execute XCTest or render the app.
```

单独执行 `git diff --check` 退出码 0，无输出。执行 `rg -n 'import WebKit|WKWebView|WebView\(|WebPage' mobile/ios/CryBot`，退出码 0，原始输出：

```text
mobile/ios/CryBot/WatchSync.swift:3:import WebKit
```

本轮新增 8 个 XCTest 方法，总计 35 个；这里是源码数量，实际执行数为 0，等待 Mobile builds。没有用无关的 Web/服务端测试替代 Swift 验证。

### 原 brief 验收逐项复核

| 验收项（按原顺序） | 本轮结果 |
|---|---|
| 1 Actions App 编译、CryBotTests | 待协调者推任务分支后运行 Mobile builds；当前没有运行链接，不能判通过。 |
| 2 WebKit 扫描 | 静态检查符合，仅命中 WatchSync.swift:3。 |
| 3 保留入口及删除项 | 静态检查 19 个目录/Entry/Gallery/空表齐全；逐一对照原 28 个入口名称及参数，保留调用形式。GroupScreen(group:) 兼容并增加可选参数。删除目录和 CryBot Swift 源码中的删除入口名均无命中；原文所谓「全仓 grep 不到」在规格/任务文档仍有引用，不能据此称全仓零命中。 |
| 4 共用枚举及 widget/app 分发 | Types 保持 16 个 WebHostTarget / 3 个 WebEntryScope；MessageLayout 两类均为 webSummary，MessageBodyView 对应 WebMessageSummary。源码复核符合，布局测试执行待 Actions。 |
| 5 shell-basic 直接进入对话、不联网 | 夹具源路径与同步构造保持离线，两个机器人/一个群聊和 widget/app 消息齐全；启动及渲染待 04 的截图确认。启动参数见下。 |
| 6 逻辑单元测试覆盖并通过 | 35 个测试方法覆盖原要求及本轮回归；未执行，不能判通过。 |
| 7 Linux 脚本/语法检查 | 43 脚本缺失，按 brief 准备 parse/typecheck 脚本；实际缺少 swiftc，退出 127，原文输出见上。 |
| 8 三类 Actions 绿灯且测试数大于 0 | Mobile builds / Public scan 链接待协调者补；iOS Linux 待 43 合并。当前无通过证据。 |

供协调者/04 运行的入口：

```text
-CryFixtureScenario shell-basic -CryAppearance light
-CryFixtureScenario shell-basic -CryAppearance dark
-CryFixtureScenario shell-signed-out
-CryFixtureScenario shell-basic -CryGallery Sidebar -CryAppearance light
-CryFixtureScenario shell-basic -CryGallery WebHost -CryAppearance dark

```

App 内截图可分别使用 `WebHostGallery(scene: .screen/.menu/.summary)`，注入隔离的 `AppStore.fixture(scenario: "shell-basic")`。本任务只提供 Gallery，不修改 04 的截图 Support 或 UITests；菜单展开后的截图、三屏宽深浅色及 Accessibility L 均待 Actions。

### 覆盖与后续衔接

本轮覆盖的是帧游标/续传、hello 快照时机、相关帧后的收件箱计数、消息布局断言及原生导航/网页入口骨架；没有把占位内容标记为完整功能。未修改覆盖表，当前检出仍无 `server/testing/ios-contract/coverage.ts`。

不需要改 project.yml、Packages、服务端、网页、WatchSync、手表、Shared 或工作流，也没有新增第三方依赖。05 接入 LiveTransport 时可以将 Store 中最小连接策略替换为 03 的状态机，保留本轮退避、无帧超时和 since 行为测试，避免双重重连。Group 的 thread/focus 参数和三个 WebHost Gallery scene 供 22/04 接续；48 继续替换现有全屏 WebHostScreen 内容。

尚未完成的验收只有运行验证：需要协调者提供 Swift 工具链或由 Actions 做语法/类型检查、App 编译、35 个测试实际执行及截图检查，并补 Mobile builds / Public scan 的真实链接。本机没有可附的 Swift 或 Xcode 成功结果。

## 第 3 轮：记录归档说明

本次检出的上一轮详细结果保留在上方「第 2 轮」原章节中，涵盖 r3.md 所列图片 URL、独立导航栈、GroupScreen 参数、connectionStatus、deinit、退避、MessageLayout、Gallery、外观参数和 Color Set。为保留已有记录，本轮不重编号或重写这些历史结果；其中游标、未读数和报告恢复的后续修正以下方第 4 轮为准。

## 第 4 轮：2026-11-14

本轮只改审核指定范围，不提交 git。开工已在 worktree 根目录运行 依赖准备脚本，链接 73 项预装依赖；未安装新依赖。

### 修复与回归测试

1. `FrameCursor` 已按 `JSONValue.number(Decimal)` 的真实关联类型改为 `Int64("\(raw)")`，只接受 0…9_007_199_254_740_991。测试补上下边界和 Int64 溢出值，保留负数、小数、非数字、ping、未知帧等覆盖。
2. 非续传 hello 到来时立即把 cursor 置 nil（需要快照），仅快照成功并确认连接仍有效后采用 hello.cursor；失败或取消路径不再受 connectionID 判断限制。续传 hello 保留旧 cursor，只随随后已处理帧的 seq 前进。新增挂起快照期间 pause → resume 后 since 为 nil、重新拉取并成功提交游标，以及快照失败后重新拉取的测试；另测 STREAM:5 → resumed hello STREAM:20 → 重放前断线仍以 STREAM:5 续传，再处理 seq=6 后以 STREAM:6 续传。协议依据为 `server/index.ts:14716`–`:14735`：hello 给出 lastSeq，重放在 hello 之后才发送。
3. 快照和相关帧只调度未读数刷新，不在帧循环等待计数接口。刷新任务复用一个在途请求，期间有变化则在结束后补一次；message.patch 不触发。显式 refreshInboxCount 也复用此任务；detach / signOut 取消任务并阻止旧会话写回。原逐帧请求次数断言改为上限；新增 60 秒计数请求挂起时 10 个 patch 继续归并、持续帧不被误判超时、20 个相关帧只补一次、最大并发为 1、纯 patch 批次不补请求及退出取消测试。
4. 补回第 1 轮「文件改动」「覆盖表对应项」「需要协调者处理」，保留已有返工记录并追加本节。审核已对照 9d5d38f1，未覆盖段落由协调者从原文补回，见第 1 轮末尾。
5. 旧输出中的沙箱绝对工作区路径已替换为 `<worktree>`。
6. 图片校验在缓存读取之前执行。仅允许前导 `/` 的已知接口：`/api/attachments/<文件名>`（附件、机器人及个人头像），以及 `/api/team/people/p_<22 位标识>/picture`（团队成员头像）。路由依据：`server/routes/threads.ts:452`、`shared/bot-avatar.ts:55`、`server/routes/team-owners.ts:27`、`:63`、`:99`。拒绝路径中任何 `..`、反斜线、解码后残留百分号、无前导 `/`、未知前缀及不符合路由形状的路径；覆盖编码/双重编码穿越、缓存预填绕过、未知路径及团队头像合法下载和 query 保留。
7. 删除重复的 screen.ref 断言，改为检查继续导航后 chatsPath 的实际路由结果，仍保留一次 GroupScreen 完整引用断言。

### 改动文件（逐个列出）

以下 6 个 Swift 文件均需协调者检查；前三个可纳入 Foundation / Observation 的 Swift 6 类型检查，后三个需编译 CryBotTests（其中 AppStoreTests 引用 SwiftUI 功能入口）。

- `mobile/ios/CryBot/App/Logic/FrameCursor.swift`
- `mobile/ios/CryBot/Store/AppStore.swift`
- `mobile/ios/CryBot/Store/ImageDataCache.swift`
- `mobile/ios/CryBotTests/Shell/ConnectionTests.swift`
- `mobile/ios/CryBotTests/Shell/AppStoreTests.swift`
- `mobile/ios/CryBotTests/Shell/ShellTestSupport.swift`
- 文档：`docs/tasks/T-1200/T-1221-app-shell/report.md`

### 验证与待验收

**未在沙箱编译**。本沙箱没有 swiftc / Xcode，不能运行 Swift 6 类型检查、App 编译或 XCTest。新增测试全部使用隔离的 FixtureTransport / ShellControlledTransport 和注入时钟，不连接 live app、不读写用户数据。`docs/verification/README.md` 在本检出缺失；没有据此声称运行验收通过。端口监听受限的 e2e 未运行，以 Actions 为准。

协调者需在 Swift 6.3 环境对 Types、LaunchOptions、App/Logic、Store 及测试做类型检查，并推分支运行 Actions「Mobile builds」ios 作业，确认 App 编译与 CryBotTests 全绿且实际测试数大于 0。本轮没有 Actions 运行链接，也没有截图结果。

本轮本地静态检查输出（不替代 Swift / XCTest）：

```text
Swift compiler: not found on PATH
/opt/swift/usr/bin/swiftc exists: False
Verification README exists: False
Shell XCTest source methods: 42
Swift compilation and XCTest execution: NOT RUN
Report sandbox path audit: passed
```

Shell 测试源码由 35 增至 42 个方法，新增 7 个；本沙箱实际执行数为 0。`git diff --check` 退出 0，无输出。通过 shell 导出工作区 diff，再调用仓库 `scripts/public-scan/scan.mjs` 的 `scanDiff` 检查该 diff，退出 0：

```text
Working-tree public scan: 0 finding(s).
denylist: skipped (no key)
```

首次从 Node 内启动 git 的方式被沙箱以 `spawnSync git EPERM` 拒绝；改为 shell 导出 diff 后完成扫描，无需修改权限。此结果只覆盖工作区新增行的可用规则，HMAC 名单无密钥未执行，Actions Public scan 仍待协调者推分支后验收。

## 第 5 轮：2026-11-14（iOS 协作线程栈溢出修复）

本轮针对 Mobile builds 中 7 个测试在协作线程崩溃的问题修改 CryKit。`WireMessage`、`WireAttachment`、`ServerFrame` 及同文件的其他间接联合类型继续使用堆间接存储，并把已知 case 的编码从「先将整份 payload 交给 JSONEncoder，再转成 JSONValue、补 kind」改为在当前 Encoder 的 keyed container 写入 discriminator 后直接调用 payload 的 `encode(to:)`。未知 kind 仍直接编码保存的原始 JSONValue，因此 kind 字段、额外字段、未知消息原样往返的 JSON 形状保持不变；ServerFrame 的 SSE frame 编码也走同一条路径。

新增 `CryCoreTests/WireMessageStackTests.swift`：在 `Task.detached` 协作线程中编码并解码 500 条轮换 kind 的消息数组、ThreadPage，以及把同一批消息放入快照机器人的 BotsSnapshot，断言三者往返相等。该测试覆盖了原崩溃发生的异步编码上下文。

本沙箱没有 Swift/Xcode（`swift`、`swiftc` 和 `/opt/swift/usr/bin/swiftc` 均不存在），**未在沙箱编译，也未执行 Swift XCTest**；Mobile builds 的编译和测试结果需以 Actions 为准。未改 TS 或契约样本，因此没有运行 vitest。依赖准备已执行：依赖准备脚本 成功链接 73 项依赖。沙箱禁止监听端口，端口 e2e 未运行。

本轮改动文件：

- `mobile/ios/Packages/CryKit/Sources/CryCore/JSONValue.swift`：增加直接写入 discriminator 的 tagged payload 编码辅助函数。
- `mobile/ios/Packages/CryKit/Sources/CryCore/WireModels.swift`：移除 WireAttachment、OptionCardDataOutsideWrite、CardAnswerer、WireMessage、GroupDefaultResponder、ServerFrame 编码中的整 payload `JSONValue(encoding:)` 递归。
- `mobile/ios/Packages/CryKit/Tests/CryCoreTests/WireMessageStackTests.swift`：新增 500 消息数组、线程页和快照的 detached 往返回归测试。

`git diff --stat`（未包含未跟踪的新测试文件）输出：

```text
 .../CryKit/Sources/CryCore/JSONValue.swift         |   6 +
 .../CryKit/Sources/CryCore/WireModels.swift        | 164 +++++++++------------
 2 files changed, 78 insertions(+), 92 deletions(-)
```

## 第 6 轮：2026-11-14（回归测试夹具修复）

本轮只修改 `mobile/ios/Packages/CryKit/Tests/CryCoreTests/WireMessageStackTests.swift` 并追加本报告。核对 `ContractTests.swift` 的 `fixture(_:named:)` 实现后确认，它从 `Fixtures/manual/protocol.json` 选择样本，其中唯一的 BotsSnapshot 样本 `bots` 为空。测试现在基于默认快照加载现有 WireBot 夹具，为机器人设置 500 条消息，再放入快照；移除 `snapshot.bots[0]` 下标访问，解码后的首个机器人用 `XCTUnwrap` 获取，缺失时报告断言失败而不会越界崩溃。

保留 500 条轮换 kind 消息在 `Task.detached` 内编码、解码的路径，以及消息数组、ThreadPage 和快照内消息的往返相等断言；补充完整 BotsSnapshot 的相等断言。

本地执行 依赖准备脚本，成功链接 73 项依赖；用 Python 读取 JSON 确认默认 BotsSnapshot 的机器人数量为 0，且 WireBot 夹具存在。`git diff --check` 通过。这些仅为静态检查，**未在沙箱编译**，未执行 Swift XCTest；协调者需在 Linux Swift 和 Actions「Mobile builds」实跑验收。沙箱不能监听 TCP 端口，端口 e2e 未运行，以 Actions 为准。未提交 git。

## 第 7 轮：2026-11-14（512 KiB 栈回归与公开扫描误报）

本轮未提交 git。第 5 轮的 `indirect WireMessage` 已减少枚举存储，但复现报告仍显示 `WireMessage.encode(to:)` 在 `case .text(let value)` 等模式匹配处整份复制 `WireMessageFields`；该结构包含约 80 个字段，Debug 编码再经过数组、`ThreadPage` 和 `BotsSnapshot` 的嵌套会在 Apple 协作线程的 512 KiB 栈上继续放大。为从复制源头降低单帧栈占用，`WireMessageFields` 现在是保持原字段和初始化器的值语义包装：字段放进私有 `Storage` 引用，包装层提供写时复制访问器，编码/解码、额外字段和显式 null 集合仍使用原来的键和值；编解码入口标为 `@inline(never)`，避免大初始化帧被调用方内联。显式 `Equatable` 比较所有公开字段、额外字段和显式 null 状态；`Storage` 标记为 unchecked `Sendable`，包装本身继续满足 `WireModel`。JSON 线格式没有增加或删除键，`WireMessage` 的 kind 标记和未知 kind 原样路径不变。修改文件为： <!-- public-scan: allow domain -->

- `mobile/ios/Packages/CryKit/Sources/CryCore/WireModels.swift`：把大 `WireMessageFields` 的载荷移到堆上并保留写时复制，消除消息枚举编码时的大值拷贝。
- `mobile/ios/Packages/CryKit/Tests/CryCoreTests/WireMessageStackTests.swift`：保留 `Task.detached` 用例，抽出 500 条轮换 kind 的数组、`ThreadPage` 和 `BotsSnapshot` 夹具，并新增显式 `Thread` 用例；线程设置为 `stackSize = 512 * 1024`，用 XCTest expectation 等待编码解码完成，三种结果继续逐项相等断言。
- `mobile/ios/CryBot/App/MessageBodyView.swift`：SF Symbol `arrow.down.app` 保持线上名称并在行尾加入公开扫描豁免。 <!-- public-scan: allow domain -->
- `mobile/ios/CryBot/Features/WebHost/WebHostEntry.swift`：SF Symbol `ellipsis.circle` 和既有 Gallery accessibility identifier 保持值并在行尾加入公开扫描豁免。 <!-- public-scan: allow domain -->
- `mobile/ios/CryBotTests/Shell/MessageLayoutTests.swift`：`routine.run`、`goal.run` 线协议 kind 保持不变并在两组测试行尾加入公开扫描豁免。 <!-- public-scan: allow domain -->

静态检查结果：已运行 依赖准备脚本（73 项依赖链接成功）、`git diff --check`（无输出，退出 0）和工作区新增行的 Public scan（`Working-tree public scan: 0 finding(s).`）。本沙箱没有 Swift/Xcode，**未在沙箱运行 Swift 编译或 XCTest**；Linux Swift 6.3.3 的 CryKit 全包测试（含 512 KiB Thread 用例）和 Actions macOS 测试由协调者执行。沙箱不能监听 TCP 端口，端口 e2e 未运行，以 Actions 为准。

公开扫描命中复核（豁免均位于命中行末尾）：

```text
mobile/ios/CryBot/App/MessageBodyView.swift:30: ... "arrow.down.app" ... // public-scan: allow domain
mobile/ios/CryBot/Features/WebHost/WebHostEntry.swift:47: ... "ellipsis.circle" ... // public-scan: allow domain
mobile/ios/CryBot/Features/WebHost/WebHostEntry.swift:97: ... "WebHostGallery.menu" ... // public-scan: allow domain
mobile/ios/CryBotTests/Shell/MessageLayoutTests.swift:14: ... "routine.run" ... // public-scan: allow domain
mobile/ios/CryBotTests/Shell/MessageLayoutTests.swift:15: ... "goal.run" ... // public-scan: allow domain
mobile/ios/CryBotTests/Shell/MessageLayoutTests.swift:32: ... "routine.run" ... // public-scan: allow domain
mobile/ios/CryBotTests/Shell/MessageLayoutTests.swift:33: ... "goal.run" ... // public-scan: allow domain
```

`WireModels.swift` 中的 `routine.run`、`goal.run` 是既有线协议 discriminator，CryKit fixtures 中对应 JSON kind 也是既有契约样本；本轮未改这些值或样本，避免改变协议和逐字节 fixture 语义。协调者仍需在有 Swift 工具链的环境执行类型检查、CryKit 全部 XCTest、Mobile builds 及 Public scan，并把运行链接补入报告。 <!-- public-scan: allow domain -->
