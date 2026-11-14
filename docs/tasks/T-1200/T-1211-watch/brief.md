# T-1211 Cry Bot Apple Watch 版

## 目标
在 `mobile/ios` 里新增一个原生 SwiftUI 的 Apple Watch App，随 iOS App 一起安装：手表上能看机器人列表和每个机器人最近的回复，能用语音转文字（或快捷回复）给机器人发消息，App 开着时新回复会自动出现；手表本身不登录，登录状态由 iPhone App 自动同步过来。CI 能把 iOS App（内嵌手表 App）在模拟器上编译通过。

## 背景
- 执行规格：`docs/specs/2026-11-13-crybot.md`，先读第 2 节（包名）、第 5 节最后一条（公开仓库不能有内部域名、IP、邮箱、人名）、第 6 节（登录）、第 7 节（客户端）。
- 已有 iOS 壳：`mobile/ios/project.yml`（XcodeGen，一个 target `CryBot`，bundle id `com.crysound.crybot`，iOS 16.0，自动签名、DEVELOPMENT_TEAM 为空，服务器地址由构建设置 `CRYBOT_SERVER_URL`、`CRYBOT_LOGIN_HOSTS` 注入 Info.plist），`mobile/ios/CryBot/ViewController.swift`（全屏 WKWebView，地址来自 Info.plist 的 `CRYBOT_SERVER_URL`，没有就读 UserDefaults 的 `server`；cookie 用 `WKWebsiteDataStore.default()` 持久化）。CI 在 `.github/workflows/mobile.yml`（macos-15，`brew install xcodegen`、`xcodegen generate`、`xcodebuild ... -sdk iphonesimulator ... CODE_SIGNING_ALLOWED=NO`）。
- 登录链路：服务端前面是 Cloudflare Access。iPhone 的 WebView 登录完成后，服务端域名上有两个 cookie：
  - `CF_Authorization`：Cloudflare Access 的令牌，请求要先带它才能过 Cloudflare 边缘；有效期由 Access 应用决定（通常一天左右）。
  - `cry_session_<端口>_<12位环境ID>`（按名字前缀 `cry_session_` 找）：值形如 `cry_sess_…`，是 Cry Bot 服务端会话令牌，滑动 30 天。服务端也接受同一个令牌放在 `Authorization: Bearer cry_sess_…` 头里，Bearer 方式不做 Origin 检查，手表用 Bearer。
  - 手表每个请求都带：`Authorization: Bearer <cry_sess 值>` 和 `Cookie: CF_Authorization=<值>`。
  - 令牌失效时的表现：Cloudflare 边缘会返回 302/303 跳到 `*.cloudflareaccess.com` 或返回 401/403；服务端会话失效返回 401。手表上任何一种都当作「登录过期」处理（请求不要自动跟随跳转，`URLSessionTaskDelegate` 里拦掉重定向）。
- 服务端接口（本任务只调用，**不改服务端**）：
  - 列机器人：`GET /api/bots?messages=N`，返回 `{ bots: [...] }`，每个 bot 有 `id`、名字/显示名字段、`threadId`、最近 N 条 `messages`。字段名以 `server/routes/threads.ts`（约 104 行起）和 `shared/wire.ts` 为准，自己去读。
  - 取某会话消息：`GET /api/threads/:threadId/messages?limit=&before=`，消息结构见 `shared/wire.ts` 的 `WireMessage`（`id`、`role: "bot"|"user"`、`kind`、`text`…）。手表只显示 `kind == "text"` 的消息，其他种类显示成一行占位（如「[附件]」「[工具调用]」，中英文）。
  - 发消息：`POST /api/bots/:id/messages`，JSON 体 `{ text, threadId?, sendId }`，`sendId` 用新 UUID 做幂等；成功 202 `{ok, threadId, message}`，机器人忙时 200 `{ok, queued: true, threadId}`（显示「已排队」）。路由在 `server/routes/bot-messages.ts`。
  - 实时推送：`GET /api/events` 是 SSE，帧 `data: {json}`，新消息 `{kind:"message", threadId, message}`，流式修改 `{kind:"message.patch", ...}`，见 `server/index.ts` 的 broadcast 和 `shared/wire.ts`。手表上**不用 SSE**（watchOS 会挂起长连接），改为：会话页打开时每 3 秒轮询一次该会话最新消息，发完消息后到收到机器人回复前每 2 秒一次；列表页每 15 秒刷新；App 进入后台停止轮询。
  - 服务端没有 APNs/Web Push，本任务不做系统推送。
- 本仓库其他部分正被另一个任务（T-1207）大规模改名和删代码。本任务只改 `mobile/ios/` 和 `.github/workflows/mobile.yml`，不碰其他文件，避免冲突。

## 要做的事
1. **手表 target**：在 `mobile/ios/project.yml` 加一个 watchOS 单 target 手表 App（Xcode 14 起的现代结构，不要老式 WatchKit Extension 双 target）：target 名 `CryBotWatch`，源码目录 `mobile/ios/CryBotWatch/`，bundle id `com.crysound.crybot.watchkitapp`，显示名 `Cry Bot`，watchOS 10.0，SwiftUI App 生命周期，Info.plist 带 `WKCompanionAppBundleIdentifier = com.crysound.crybot`、`WKRunsIndependentlyOfCompanionApp = false`。iOS target `CryBot` 依赖并内嵌它（XcodeGen 对 watchOS app 的 `embed` 写法自己查准；放进 iOS app 的 `Watch` 目录）。同样从构建设置注入 `CRYBOT_SERVER_URL` 到手表 Info.plist（没给时用 iPhone 同步过来的地址）。签名设置跟 iOS target 一致（自动签名、团队为空）。
2. **手表图标**：`CryBotWatch/Assets.xcassets/AppIcon.appiconset` 用单张 1024（从 `brand/icon-ios-1024.png` 复制，watchOS 会裁圆），Contents.json 用 watchOS 单尺寸写法。
3. **iPhone 端同步登录**（改 `mobile/ios/CryBot/` 下的代码，新文件 `WatchSync.swift`）：
   - 用 `WatchConnectivity`。App 启动、回到前台、WebView 每次主框架加载完成时，从 `WKWebsiteDataStore.default().httpCookieStore.getAllCookies` 读服务端域名下的 `CF_Authorization` 和名字以 `cry_session_` 开头的 cookie，连同当前服务器地址，用 `updateApplicationContext` 发给手表：`{server, sessionToken, cfAuthorization, cfExpires(秒级时间戳，可空), updatedAt}`。值没变不重复发。WCSession 不支持或没配对手表时静默跳过。
   - 手表通过 `sendMessage` 发来 `{"request":"refresh"}` 时，iPhone 若在前台就立即重新读取并回发；不在前台就忽略（手表侧提示用户打开 iPhone App）。
   - 不在日志里打印令牌值。
4. **手表端**（`mobile/ios/CryBotWatch/`）：
   - `Session`：接收 `applicationContext`，把 `server`、`sessionToken`、`cfAuthorization` 存进 Keychain（`kSecAttrAccessibleAfterFirstUnlock`），地址等非机密存 UserDefaults。启动时读出。
   - `APIClient`：`URLSession`（ephemeral 配置，不用系统 cookie 存储），每个请求带上述两个头，拒绝跟随重定向，超时 15 秒；解析上面三个接口（JSON 解码对未知字段宽容，可选字段都用 Optional）。302/303/401/403 抛「登录过期」，网络错误抛「连不上」。
   - 界面（SwiftUI，`NavigationStack`）：
     - 未同步登录：一屏说明「请在 iPhone 上打开 Cry Bot 并登录」+「重试」按钮（触发 `sendMessage` refresh）。
     - 机器人列表：每行名字 + 最近一条机器人回复的前两行 + 相对时间；下拉/按钮刷新。
     - 会话页：最近 20 条消息气泡（机器人左、我右），底部一个 `TextField`（watchOS 自带语音输入/随手写）+「快捷回复」按钮，快捷回复给 4 条固定文本（中文：好的 / 继续 / 停一下 / 详细说说；英文对应）。发送中显示转圈，`queued` 显示「已排队」，失败可重发（复用同一个 sendId）。
     - 登录过期：顶部提示「登录已过期，请在 iPhone 上打开 Cry Bot」，保留已加载内容。
     - 中英文：用 `Localizable.strings`（`en.lproj`、`zh-Hans.lproj`），跟 iOS 壳一致。
   - 无障碍：按钮有可读的 label；字体用系统动态字体。
5. **可测的逻辑拆出来并写单元测试**：把 cookie 挑选（从 cookie 列表按域名和名字挑出两个值）、请求头构造、消息过滤与占位文本、`/api/bots` 和消息接口的 JSON 解码，放进一个两端共用的纯 Swift 文件夹 `mobile/ios/Shared/`（两个 target 都编译它），加一个 XCTest target `CryBotWatchTests`（watchOS 单元测试，或放在 iOS 测试 target 里都行，选在 CI 上最容易跑的那种），用固定 JSON 样例（照 `shared/wire.ts` 的真实字段写）断言具体值。
6. **CI**：`.github/workflows/mobile.yml` 的 ios job 在现有编译后加：
   - 编译手表 App：`xcodebuild -scheme CryBotWatch -sdk watchsimulator -configuration Debug -destination 'generic/platform=watchOS Simulator' build CODE_SIGNING_ALLOWED=NO`；
   - 跑单元测试（选一个 runner 自带的模拟器，`xcrun simctl list` 先打印出来，用名字匹配，别写死不存在的设备）。
   - 确认 iOS 那一步编译出的 `.app` 里包含 `Watch/CryBotWatch.app`（`test -d` 检查），不在就失败。
7. `mobile/ios/README.md` 补一节「Apple Watch」：功能、登录同步原理、限制（不支持系统推送、Access 令牌过期后要打开一次 iPhone App）、签名上架时还需要在开发者后台注册 `com.crysound.crybot.watchkitapp` 的 App ID 和描述文件（由协调者做）。

## 范围
- 可以改：`mobile/ios/**`、`.github/workflows/mobile.yml`。
- 不要改：其他所有文件（服务端、前端、`brand/` 只读）。确实需要改时在汇报里说明，不要自己改。

## 验收标准
- [ ] `xcodegen generate` 后 `CryBot` 和 `CryBotWatch` 两个 scheme 在 CI（macos-15）上都编译通过，单元测试通过，iOS 产物里有 `Watch/CryBotWatch.app`。本机沙箱没有 Xcode，编译和测试以协调者推送后的 GitHub Actions 结果为准；你这边要做到：Swift 语法自查、project.yml 字段对照 XcodeGen 文档逐项核对、JSON 样例与 `shared/wire.ts` 字段一致。
- [ ] 单元测试覆盖：cookie 挑选（有/无 `CF_Authorization`、多个 `cry_session_*` 取服务端域名那个、其他域名的忽略）、请求头、302/401 判为登录过期、bots 和消息 JSON 解码（含未知字段、缺可选字段）、非 text 消息的占位。
- [ ] 令牌只存 Keychain，代码里没有任何打印令牌的语句（`grep -rn "print\|os_log\|Logger" mobile/ios` 结果里不出现 token/cookie 值）。
- [ ] 仓库里不出现内部域名、IP、邮箱、人名；不出现上游品牌词（`grep -rniE "maus|omb_" mobile/ .github/workflows/mobile.yml` 为空）。
- [ ] 中英文文案齐全，两个 `Localizable.strings` 键一致。

## 约束
- 不要 git 提交。沙箱禁网，不能装 Xcode/XcodeGen，也不要引入任何第三方 Swift 包（只用系统框架：SwiftUI、WatchConnectivity、Security、Foundation、WebKit）。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1211-watch/report.md`（追加，保留前轮内容）。用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 CI 验证。
3. 需要协调者处理的事：开发者后台注册手表 App ID 和描述文件、TestFlight 打包流程需要怎么改、没解决的问题。
