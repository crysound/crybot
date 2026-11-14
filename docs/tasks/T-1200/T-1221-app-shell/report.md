# T-1221-app-shell 交付报告

## 第 1 轮：2026-11-14（实现记录摘要）

上轮交付 SwiftUI 骨架、状态仓库、夹具传输、19 个功能占位、主题资源及 27 个 XCTest 方法；当时只有静态核对，没有 App 编译、XCTest 执行或截图结果。上轮实现已包含在本次检出的已提交基线中，不能再描述为「等待创建分支、尚未提交的工作区代码」。与 brief 重复的入口表、任务要求和旧环境脚本已删去；本轮的实际状态如下。

## 第 2 轮：2026-11-14（审核第 1 轮返工）

本轮在已有代码上修复，未创建提交、未推送。当前沙箱的 `git branch --show-current` 输出为 `master`，`git log -1 --format='%h %s'` 输出为 `758b74a InstaBox task baseline`；上一轮文件已在 HEAD 中。本轮差异留在工作区，待协调者带回任务分支。

### 审核意见逐条处理

| 项 | 本轮结果与依据 |
|---|---|
| 1 续传游标 | `FrameCursor` 直接读取各帧 payload 的 `additionalFields["seq"]`，unknown 读取 raw 对象；使用 hello cursor 的 stream 前缀拼成 `STREAM:seq`。无 seq 的 ping 不改变游标，拒绝非整数、负数和超过 JS 安全整数范围的 seq。不再逐帧编码/解码。FixtureTransport 同步使用该规则定位续传位置。`shell-basic.json` 增加真实 hello，后续帧只带数字 seq。测试断言 hello 后 seq=42，第二次 `events` 的 since 为 `STREAM:42`；另测 ping、未知帧、stream 切换及夹具从 seq=7 后回放 seq=8。 |
| 2 图片 URL | `ImageDataCache.swift` 在读取缓存和 Transport 前检查 scheme、host 均为空，且没有 baseURL；绝对 URL 直接抛 `EndpointError.invalidPath`，AuthImage 现有失败分支显示占位。相对路径测试检查下载数据、query、缓存和退出清理；绝对 https/http、协议相对 URL、file URL 即使命中预填缓存也失败，并断言请求记录为空。 |
| 3 紧凑布局 | TabView 中对话与收件箱各自拥有 NavigationStack，分别绑定 `chatsPath` / `inboxPath`；push 发生在页签内。iPad 保留 NavigationSplitView，detail 使用当前页签路径。规格 §6 要求系统导航控件，没有相反的层级规定。测试覆盖切换页签后各自路径保留；页签栏、标题与 toolbar 的实际渲染待 Actions。 |
| 4 群聊引用 | `RouteDestination` 显式把 group、thread、focus 传给 GroupScreen。保留 `GroupScreen(group:)` 调用形式，新增带默认 nil 的 thread/focus 参数，在入口内构成完整 `ref`；不再读取 `store.path.last`。测试覆盖导航继续 push 后入口的 ref 不变。focus 保存给后续群聊实现使用，占位页没有新增消息定位功能。 |
| 5 未读数 | `refreshSnapshot()` 成功加载快照后刷新 inbox count；bot/group、删除、message/message.patch、thread、notify/notifications.read、snapshot 帧归并后也刷新。计数请求失败保留已有值，不使有效事件流反复重连（服务端无收件箱时可能返回 404，见 `server/routes/inbox.ts:27`）。测试通过普通 attach 分支（`isFixture == false`，底层仍为隔离测试传输）验证初始 0 → hello 快照后 3 → bot 5 → group 4 → 删除 2 → notifications.read 0，再手动快照刷新至 2。 |
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

开工执行 `crybot-link-deps`，退出码 0，原始输出：

```text
crybot-link-deps: linked 73 entries from /opt/crybot-deps/node_modules into /data/home/codex-t-1221-app-shell-39eca854c5bf/node_modules
```

`docs/verification/README.md` 在当前检出不存在。没有启动或修改用户 live app，也没有对真实服务器发请求。新增测试全部使用进程内的 FixtureTransport 或 ShellControlledTransport，不需要监听端口；由于没有 Swift 工具链，本机没有执行这些夹具测试。沙箱端口 e2e 未运行，以 Actions 为准；没有为此尝试启动服务。

`command -v swiftc` 无输出，`ls /opt/swift/usr/bin/swiftc` 原始输出：

```text
ls: cannot access '/opt/swift/usr/bin/swiftc': No such file or directory
```

`find / -name swiftc -o -name swift-frontend 2>/dev/null` 也无命中。没有 Xcode/macOS，也未自行安装工具链或依赖。`mobile/ios/scripts/linux-test.sh`、`linux-check.sh` 尚不存在（任务 43 未接入本检出）。

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
