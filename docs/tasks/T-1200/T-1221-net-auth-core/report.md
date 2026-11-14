# T-1221-03 网络与身份核心

## 第 1 轮（2026-11-14）

实现和测试源码已落盘；本轮没有 Swift 编译或测试通过的结论，没有 Actions 运行链接。当前镜像没有 `swift` / `swiftc`，指定目录 `/opt/swift/usr/bin` 也不存在。源码中有 21 个 CryNetLogicTests 测试方法、25 个 CryNetTests 测试方法；这是源码计数，实际执行数为 **0**。

没有安装依赖、修改其他任务的源码或执行 git 提交。工作区 `.git` 只读，创建 `T-1221-net-auth-core` 分支失败，当前仍是 `master`；需协调者收取工作区改动并建分支。

### 1. 文件变更

以下路径均相对于 `mobile/ios/Packages/CryKit/`：

| 文件 | 内容 |
|---|---|
| `Sources/CryNetLogic/SessionRecord.swift` | HTTPS 地址规范化、构建参数注入、SessionRecord v2、未知版本安全退出及未知登录方式保留。 |
| `Sources/CryNetLogic/SessionPolicy.swift` | 鉴权头、凭据字符校验、按方式判断过期、识别合并 Set-Cookie 并计算轮换过期时间。 |
| `Sources/CryNetLogic/ReconnectState.swift` | 可注入单调时钟的退避、40 秒无帧检测、重放 cursor 与快照完成后的 cursor 提交。 |
| `Sources/CryNetLogic/CallbackRouter.swift` | 精确回调路由、接力版本注册表、回调模式选择、参数解析及 Base64URL/JWT exp 读取。 |
| `Sources/CryNetLogic/PairingInvite.swift` | 解析服务端 HTTPS 配对二维码并拒绝重复参数、不支持的本地或加密桌面连接。 |
| `Sources/CryNet/SessionStore.swift` | 共享读者可用的同步存储协议、带锁内存实现和指定访问级别的 Keychain JSON 实现。 |
| `Sources/CryNet/CryNetError.swift` | 固定且不含凭据的错误描述与仅含状态码、布尔值的接力日志事件。 |
| `Sources/CryNet/HTTPClient.swift` | 无 cookie/凭据缓存且拒绝重定向的 URLSession、公开/鉴权请求、轮换、过期清凭据及 APIError 脱敏。 |
| `Sources/CryNet/LiveTransport.swift` | Transport 实现、SSE 与 watchdog、上传进度、临时文件下载和 Range 续传。 |
| `Sources/CryNet/LiveWebSocketChannel.swift` | 带相同鉴权头的 WSS 握手、文本/二进制通道、关闭和取消处理。 |
| `Sources/CryNet/Logins.swift` | 配对及邮箱登录，按真实接口从 JSON 或 cookie 取原始会话令牌。 |
| `Sources/CryNet/AppHandoff.swift` | P256/state 生成、v1 解密、CF cookie 换会话及 assertion 重试、启动注册两种回调入口。 |
| `Tests/CryNetLogicTests/SessionTests.swift` | 地址、记录版本/method、可选 CF 编码、请求头、轮换、过期及二维码行为测试。 |
| `Tests/CryNetLogicTests/ReconnectTests.swift` | 退避封顶、40 秒无帧、重放 cursor、快照成功/失败边界测试。 |
| `Tests/CryNetLogicTests/CallbackTests.swift` | 两种入口、精确路径/主机、未知版本、重复参数及四种回调模式测试。 |
| `Tests/CryNetTests/NetworkFixture.swift` | 不监听端口的 URLProtocol 假接口、请求体读取和通用头断言。 |
| `Tests/CryNetTests/HTTPClientTests.swift` | 公开请求、API 地址/实际请求头、轮换、重定向、过期、APIError 脱敏及旧响应竞态测试。 |
| `Tests/CryNetTests/LoginTests.swift` | 配对/邮箱请求体、二维码兑换、存储记录、缺 cookie 及配对码脱敏测试。 |
| `Tests/CryNetTests/HandoffTests.swift` | 用 CryptoKit 按服务端常量加密同一密文并走两个回调入口，以及重试、日志、篡改、过期和防重放测试。 |
| `Tests/CryNetTests/LiveTransportTests.swift` | SSE 重连/快照/过期/watchdog、上传字节/查询/进度、Range 下载及错误范围测试。 |
| `Tests/CryNetTests/KeychainStoreTests.swift` | 用独立临时 service 测试两个读者、JSON、访问级别、比较替换和清除。 |

删除上述四个目录中的 `Placeholder.swift`。另外新增本报告。临时自测脚本和输出位于已忽略的 `mobile/ios/.linux-cache/`，不交付为任务源码。

### 2. 本地命令与结果

开工运行 `crybot-link-deps`，返回已链接 73 个预装依赖条目。

Linux 自测脚本 `mobile/ios/.linux-cache/test-net-logic.sh`（在 worktree 根目录运行；用 `env HOME=...` 限定 Swift 子进程的缓存位置）：

```bash
#!/usr/bin/env bash
set -eu
WS=$(pwd)/mobile/ios
C=$WS/.linux-cache
export PATH=/opt/swift/usr/bin:$PATH
export XDG_CACHE_HOME=$C/xdg TMPDIR=$C/tmp CLANG_MODULE_CACHE_PATH=$C/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$C/swiftpm-module-cache
mkdir -p "$C/home" "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
env HOME="$C/home" timeout 1200 swift test --jobs 2 --package-path "$WS/Packages/CryKit" --scratch-path "$WS/.linux-build" \
  --cache-path "$C/swiftpm" --config-path "$C/config" --security-path "$C/security" \
  --manifest-cache local --disable-sandbox --filter CryNetLogicTests
```

实际命令及完整原样输出（退出码 127）：

```text
$ bash mobile/ios/.linux-cache/test-net-logic.sh
timeout: failed to run command ‘swift’: No such file or directory
```

也尝试单独类型检查两个不依赖 CryCore 的逻辑文件：

```text
$ /opt/swift/usr/bin/swiftc -typecheck mobile/ios/Packages/CryKit/Sources/CryNetLogic/SessionRecord.swift mobile/ios/Packages/CryKit/Sources/CryNetLogic/SessionPolicy.swift
/bin/bash: line 10: /opt/swift/usr/bin/swiftc: No such file or directory
```

`command -v swift`、`command -v swiftc` 没有输出；同时搜索系统安装目录和用户目录（含隐藏目录）也未找到工具链。没有安装新的包。没有运行需要监听端口的 e2e，以 Actions 为准；本轮新增 URLProtocol 测试本身不监听端口，Keychain 测试使用独立随机 service，不接触用户会话。

纯逻辑 import 检查：

```text
$ grep -Rnh '^import ' mobile/ios/Packages/CryKit/Sources/CryNetLogic
1:import Foundation
1:import Foundation
1:import Foundation
1:import Foundation
1:import Foundation
2:import CryCore
```

对全部 21 个新增 Swift 文件逐一运行 `git diff --no-index --check /dev/null <文件>`，没有空白告警；静态脚本同时检查了占位令牌长度、JWT 字面量和保留类型名，输出：

```text
21 Swift files: whitespace, placeholder token length, JWT literal and reserved-name checks passed.
```

这些只是本地文本检查，不代表 Swift 编译、测试或 Actions 成功。条件编译边界覆盖 Apple 网络、Security、CryptoKit 实现及 CryNetTests；Linux 保留纯逻辑、内存存储和错误类型。

待协调者补运行链接与实际测试数：

| 验收 | 当前状态 | 运行链接 |
|---|---|---|
| Linux `swift test --filter CryNetLogicTests` | 工具链缺失，未执行 | 待补 |
| `Mobile builds` 的 CryKit `swift test` | macOS 编译及全部测试待执行 | 待补 |
| `iOS Linux` | 待 43 合并和工具链恢复 | 待补 |
| `Public scan` | Actions 待执行 | 待补 |

### 3. 契约覆盖表

当前检出不存在 `server/testing/ios-contract/coverage.ts`，无法逐行确认 00 登记的键，本轮未修改覆盖表。可交协调者映射的网络层项：

- ServerFrame 的 `hello` 帧：resumed=false 请求快照，成功后提交边界；resumed=true 不跳过重放。
- ServerFrame 的 `ping` 帧：更新帧活动时间并复位退避。
- 其余 ServerFrame：SSEParser 解码后的帧原样交给 Transport 消费者，并按对应 SSE id 更新重连 cursor；业务归并仍归 01/05，不据此标记页面或卡片完成。

### 4. 给 05、35、48 和 T-1222-06 的接入说明

以下 Swift 片段是接入示例，本机没有编译它们。常规 import 为 `Foundation`、`CryCore`、`CryNetLogic`、`CryNet`；浏览器示例由 05 另外 import `AuthenticationServices`。

#### 地址、记录与共享存储

```swift
let server = try CryServer(webURL: "https://example.com",
                           apiURL: "https://api.example.com",
                           loginHosts: "login.example.com")
let configured = try CryServer(buildSettings: [
    "CRYBOT_SERVER_URL": "https://example.com",
    "CRYBOT_API_URL": "https://api.example.com",
    "CRYBOT_LOGIN_HOSTS": "login.example.com"
])
let method = SessionRecord.Method(rawValue: "feishu")
let record = SessionRecord(server: server, method: method,
                           sessionToken: "cry_sess_example",
                           sessionExpires: Date().addingTimeInterval(3600))
let data = try JSONEncoder().encode(record)
let restored = try JSONDecoder().decode(SessionRecord.self, from: data)
let memory = MemorySessionStore(restored)
let store: any SessionStore = KeychainSessionStore(accessGroup: nil)
try store.write(record)
let current = try store.read()
_ = try store.replace(ifMatching: current, with: current?.signedOut())
try store.clear()
```

`CryServer` 还可直接用默认 API：`try CryServer(webURL: "https://example.com")`。地址可以有部署路径前缀，拒绝 http、内嵌用户名/密码、query、fragment 和路径穿越。`loginHosts` 是构建时运行配置；持久化 server 只编码 webURL/apiURL。

`SessionRecord` 的日期字段公开类型为 `Date?`；JSON 固定编码为 Unix **秒**，与 JSONEncoder 的日期策略无关。服务端 `expiresAt` 是 Unix 毫秒，登录实现已转换；CF JWT exp 是秒。`sessionToken` 保存原始 `cry_sess_…`，没有 `Bearer ` 前缀。没有 CF 值时 JSON 不写 CF 两键，未增加 cookieName。未知 version 解码后保留 version 和 server、清空凭据，`isAuthenticated == false`；未知 method 原样编码。

05 和 48 应持有同一个 `SessionStore` 实例；独立创建相同 service/account/accessGroup 的 KeychainSessionStore 也读取同一项。自定义存储除了 read/write/clear，还需实现原子 `replace(ifMatching:with:)`，避免迟到的响应覆盖新会话。登出若要保留服务器，写入 `record.signedOut()`；`clear()` 是删除整条记录。退出登录同时取消登录任务和事件消费任务。

48 从 `try store.read()` 取得当前记录，直接读取 sessionToken、sessionExpires、cfAuthorization、cfExpires；网页 cookie 名仍由 48 从 auth/session 获取，Cookie 拼装也归 48。

#### App 启动时持有路由和接力对象

`CallbackRouter` **没有单例**，由调用方持有，`CallbackRouter`、`HandoffRegistry`、`AppHandoff` 都在 MainActor。下面的对象应由 App 生命周期持有，在首次处理 onOpenURL/onContinueUserActivity 之前创建：

```swift
@MainActor
final class LoginServices {
    let router: CallbackRouter
    let registry: HandoffRegistry
    let handoff: AppHandoff
    let http: HTTPClient

    init(server: CryServer, store: any SessionStore, linkHost: String,
         completion: @escaping (Result<Void, Error>) -> Void) {
        router = CallbackRouter(linkHost: linkHost)
        registry = HandoffRegistry()
        http = HTTPClient(server: server, store: store)
        handoff = AppHandoff(client: http, router: router,
                             registry: registry, completion: completion)
    }

    func handle(url: URL) -> Bool { router.handle(url) }
}
```

`linkHost` 传入构建参数 CRYBOT_APP_LINK_HOST 的主机名，不读 Info.plist。AppHandoff 初始化时就注册 v=1、host auth、路径 /auth/app-return。完成闭包在 MainActor 调用；成功时 SessionStore 已写入记录，失败时可识别 `HandoffError.unsupportedVersion` 显示升级提示。必须保留 handoff 对象；其注册闭包使用弱引用，避免循环持有。

05 的 `LoginRouter.handle(url:)` 只转给同一个 `services.router.handle(url)`。ASWebAuthenticationSession completion 和系统外部打开 URL 都走这一个入口。设置 linkHost 后自定义 scheme 仍可登录。

```swift
let attempt: HandoffAttempt = try services.handoff.begin()
let completion: ASWebAuthenticationSession.CompletionHandler = { url, _ in
    Task { @MainActor in
        if let url { _ = services.router.handle(url) }
        else { services.handoff.cancel() }
    }
}
let browser: ASWebAuthenticationSession
if #available(iOS 17.4, *),
   case let .https(host, path) = attempt.callbackMode {
    browser = ASWebAuthenticationSession(url: attempt.url,
        callback: .https(host: host, path: path), completionHandler: completion)
} else {
    browser = ASWebAuthenticationSession(url: attempt.url,
        callbackURLScheme: "crybot", completionHandler: completion)
}
browser.prefersEphemeralWebBrowserSession = false
```

05 负责保存 browser、设置 presentationContextProvider、调用 start() 和处理取消；不打开 Safari 等待回跳。17.0–17.3 依赖 T-1222-02 的网页兜底。生产 begin() 每次使用随机 state 和新 P256 私钥，取消、超时、消费后的回调不能重复登录。

扩展点及独立纯逻辑类型的最小示例（MainActor）：

```swift
let mode = HandoffCallbackMode.choose(linkHost: "example.com",
                                      supportsHTTPSCallback: true)
let parameters = try HandoffParameters(url:
    URL(string: "crybot://auth?v=2&state=fixture")!)
let state = parameters.state
let registry = HandoffRegistry()
registry.register(version: 2) { parameters in
    _ = try parameters.parameter("state")
}
let router = CallbackRouter(linkHost: "example.com")
router.registerHandoff(registry) { _ in }
_ = router.handle(URL(string: "crybot://auth?v=2&state=fixture")!)
router.register(host: "feishu", handler: handleFeishuReturn)
router.register(httpsPath: "/auth/feishu/app-return", handler: handleFeishuReturn)
let encoded = HandoffEncoding.base64URL(Data("fixture".utf8))
let decoded = HandoffEncoding.decodeBase64URL(encoded)
```

示例的 handleFeishuReturn 是后续任务提供的 `(URL) -> Void` 处理器。飞书不注册 auth、不占用接力 v，不替换已有 HandoffRegistry；成功后写 `method: .feishu` 的 SessionRecord。接力默认日志通过 NSLog 输出 `NetworkLogEvent.description`，可在初始化时用 `log:` 注入应用自己的日志 sink；事件没有令牌字段。

#### HTTP、三种登录、Transport

```swift
let http = HTTPClient(server: server, store: store)
let environment = try await http.send(CoreEndpoints.environment, authenticated: false)
let session = try await http.send(CoreEndpoints.authSession)
let pairing = PairingLogin(client: http)
let attemptId = "00000000-0000-4000-8000-000000000000"
let paired = try await pairing.login(code: "123456", label: "Test Phone",
                                     attemptId: attemptId)
let qrToken = "cry_pair_" + String(repeating: "a", count: 43)
var inviteURL = URLComponents(string: "crybot://pair")!
inviteURL.queryItems = [.init(name: "address", value: "https://example.com"),
                        .init(name: "token", value: qrToken)]
let invite = try PairingInvite.parse(inviteURL.url!.absoluteString)
let scanned = try await pairing.login(invite: invite, label: "Test Phone",
                                      attemptId: attemptId)
let email = EmailLogin(client: http)
try await email.start(email: "person@example.com")
let verified = try await email.verify(email: "person@example.com",
                                      code: "12345678", label: "Test Phone")
```

示例中的各登录调用是不同入口，不应依次执行来覆盖会话。配对的一次登录尝试在网络重试时复用同一个 attemptId。二维码兑换使用高熵 token，不用旁边显示的六位 code；只支持本任务的 HTTPS 服务端登录，拒绝要求端到端桌面协议的 e2e/secretKey 描述，不能忽略后降级。手动更换服务器后创建对应 HTTPClient；invite 的地址不会静默替换当前服务器。

邮箱接口没有 JSON token，使用 Set-Cookie 中的原始会话值。接力先只发 CF cookie，缺少会话时增加 Cf-Access-Jwt-Assertion 重试一次；两次结果都进入日志。所有登录成功写入前检查任务取消以及原存储是否已被替换。

下面的 applySnapshot、consumeFrame、showLogin、updateProgress 分别是 05 提供的 MainActor 闭包，负责应用快照、分发帧、回登录页、显示进度；快照闭包必须真正应用状态后才返回。

```swift
let live = LiveTransport(server: server, store: store,
    onSnapshotRequired: {
        let snapshot = try await http.send(CoreEndpoints.snapshot())
        await applySnapshot(snapshot)
    },
    onLoginExpired: {
        Task { @MainActor in showLogin() }
    },
    uploadProgress: { sent, total in
        Task { @MainActor in updateProgress(sent, total) }
    })
let transport: any Transport = live
let eventTask = Task {
    for try await frame in transport.events(since: nil, screens: false) {
        await consumeFrame(frame)
    }
}
let uploaded = try await transport.upload(Data([0, 1, 2]),
    to: CoreEndpoints.uploadFile(name: "test.bin", mime: "application/octet-stream",
                                 uploadId: "fixture-upload"))
let bytes = try await transport.download(CoreEndpoints.attachment(name: "test.bin"))
let socket = try await transport.webSocket(path: "/api/desktop-viewer/fixture/websockify")
try await socket.send(.binary(Data([0, 1, 2])))
let payload = try await socket.receive()
await socket.close()
eventTask.cancel()
```

AppStore 只需 CryCore 的 Transport 方法。快照回调和登录过期通知通过初始化闭包提供；onSnapshotRequired 返回即代表快照已经应用，失败应抛错。其余网络回调不保证在 MainActor，UI 操作需要显式切换。每条 events 流内部断线重连持有 cursor，hello.resumed=true 不把 cursor 前移到 hello 的边界；只有 ping 复位退避。进入后台时取消消费任务，回前台重新订阅；如果没有能与已应用状态对应的 cursor，传 nil 并重新拉快照，不把尚未消费的流缓冲 cursor 带到新订阅。

需要文件分享/续传的调用方可选用具体 LiveTransport 的附加方法，不是 AppStore 必须调用的接口：

```swift
let partial = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
let file = try await live.downloadFile(CoreEndpoints.attachment(name: "test.bin"),
                                       resuming: partial, ifRange: "fixture-etag")
```

从第一次尝试就传入同一个临时路径，失败后保留已写部分；重试携带 Range，并可用 If-Range 绑定资源版本。206 必须匹配已有长度；服务端返回 200 时覆盖旧部分。调用方最终清理 file。协议要求的 download() 返回 Data，内部临时文件会自动清理。上传也可用 `live.upload(_:to:progress:)` 设置单次进度回调。

其余公开辅助类型/错误的最小用法：

```swift
let headers = SessionPolicy.headers(for: record)
let needsLogin = SessionPolicy.needsLogin(record, now: Date())
let rejected = SessionPolicy.responseExpiresLogin(status: 401, body: Data())
let expiry = SessionPolicy.serverExpiry(milliseconds: 4102444800000)
let validToken = CredentialRules.isSessionToken("cry_sess_example")
let validCookie = CredentialRules.isCookieValue("fixture")
if let cookie = SessionCookie.parse(["Set-Cookie": "cry_session_fixture=cry_sess_new; Max-Age=60"]) {
    let rotated = cookie.applying(to: record)
    _ = rotated
}
var reconnect = ReconnectState(since: "10", clock: { 100 })
reconnect.connected()
reconnect.receive(.hello(.init(resumed: false, cursor: "20")), eventID: nil)
reconnect.snapshotLoaded()
let delay = reconnect.disconnected()
let stale = reconnect.isStale
let invalidAddress: Error = ServerConfigurationError.invalidURL
let invalidInvite: Error = PairingInviteError.invalidLink
let upgrade: Error = HandoffError.unsupportedVersion
let expired: Error = CryNetError.loginExpired
let diagnostic = NetworkLogEvent.handoffExchange(assertion: false, status: 200,
                                                  receivedSession: true)
```

在前台调用 SessionPolicy.needsLogin：cfHandoff 只在 cfExpires 存在时做 10 分钟临期提示；pairing/email/feishu 只按 sessionExpires 判断，不尝试解析 Bearer 为 JWT。API 拒绝可匹配 `CryNetError.api(let api)`，使用 CryCore APIError 的 errorKey/errorParams 展示；网络错误的 description/debugDescription/localizedDescription 不包含响应体或凭据。

### 5. 需要协调者处理

1. 恢复 Swift 工具链后先跑本报告中的 Linux 命令，再在 macOS `Mobile builds` 编译并执行全部 CryKit 测试。特别检查 URLProtocol 的真实 redirect 回调、AsyncBytes 的超时取消、Keychain 访问级别及 CryptoKit 往返；本轮没有这些结果。
2. 创建 `T-1221-net-auth-core` 分支、收取文件、推送并开草稿 PR，补齐 Mobile builds、iOS Linux、Public scan 链接，核对本任务测试实际执行数大于 0。当前 .git 只读，没有创建分支或提交。
3. 当前没有 origin/main。已尝试指定 git show，返回 `fatal: invalid object name 'origin/main'.`；算法核对采用当前提交保留的 `CryBot/ViewController.swift` 和 `server/app-handoff.ts`。没有改动它们，P256 X9.63 公钥、12 字节 nonce、末尾 16 字节 tag、HKDF info/salt 和 AES-GCM AAD 均照现有协议。
4. 当前缺 `docs/verification/README.md` 和覆盖表，请协调者补齐参考文件并映射第 3 节的覆盖项。本轮没有真实服务器或用户会话的修改验证。
5. CryCore 现有 Endpoint、APIError、AuthSession、PairResponse、EmailVerifyResponse、SSEParser、Transport 接口足够完成本次实现，没有重复定义这些类型，也没有请求 01 增加字段。Transport 的 download 方法要求的 Data 返回值通过内部临时文件实现，额外文件方法留给需要续传的调用方。
6. Package.swift 没有改动；43 仍按计划添加 Linux 下排除 CryNet/CryNetTests 的条件。当前 Apple 代码已经用 canImport 条件隔离，但由于缺工具链，不能据此宣称 Linux 编译成立。
7. 本轮没有新增第三方依赖。实现仅使用 Foundation、Security、CryptoKit；ASWebAuthenticationSession 的创建与界面归 05。没有修改 App、Shared、工程、工作流、服务端或网页。
8. 真正的 TLS/WebSocket 服务端往返没有在本机运行，也没有为它搭建监听端口的夹具；URLSessionWebSocketTask 的二进制收发与握手需要 macOS/后续 35 的隔离集成验证。其失败握手不提供可读取的 HTTP 响应体，403 按没有 error JSON 的响应处理；普通 HTTP/SSE/下载的 403 会读取并判别 JSON。这是当前 WebSocket 错误分类的限制。
9. 05 需落实后台取消、前台重新订阅、快照实际应用、错误 UI 与手表同步；48 仍负责 cookieName 和网页 cookie 拼装；T-1222-02 的 17.0–17.3 回跳兜底页不在本任务修改范围内。

### 本轮补充：工作区 Public scan

调用仓库扫描器导出的 scanDiff，对四个目录内的全部 Swift 文件和本报告构造新增行 diff，读取工作区实际文件内容；因此也扫描了尚未 git add 的文件。临时脚本在已忽略的缓存目录内，命令和结果如下：

```text
$ node mobile/ios/.linux-cache/scan-net-worktree.mjs
denylist: skipped (no key)
Worktree Public scan: 22 files, 0 findings.
```

未注入黑名单密钥，所以没有执行 HMAC 黑名单检查。这个本地结果不代替 PR 上的 Public scan，也不代替 Swift 测试。


## 第 2 轮（2026-11-14）

13 项返工已落到实现、测试与接口说明；本轮没有 git 提交。保留协调者已加入的 `scripts/public-scan/allow-domains.txt` 末尾内容，该文件没有工作区差异。没有改 Package.swift、CryCore、工程、工作流、App、Shared、服务端或网页。

本机仍无 Swift 工具链，没有执行 Swift 测试，实际执行数为 **0**；源码计数为 CryNetLogicTests **24** 个、CryNetTests **32** 个测试方法。不能据此宣称编译或测试通过。macOS `swift test` 是否全绿，以协调者推送后的 Actions「Mobile builds」ios 作业为准，运行链接待协调者补充。

### 1. 返工逐项结果与文件

下表源码路径相对于 `mobile/ios/Packages/CryKit/`；“测试”均表示已写入的回归断言，执行状态见下一节。

| 项 | 文件与结果 | 回归覆盖 |
|---|---|---|
| 1 | `Sources/CryNet/HTTPClient.swift` 仅在 usesSession 为 true 时判响应过期；公开请求按 APIError 解码，沿用 `CryNetError.api(APIError)` 契约。 | `LoginTests.swift` 分别让配对、邮箱返回 401 与 errorKey，断言 key/code 保留、验证码脱敏、已有会话及过期通知不受影响。 |
| 2 | 同文件的 errorKey/code 不做模式替换，仍精确替换已知秘密值；JWT 必须有 JSON 头前缀，三段长度至少 12/12/16 字符。 | `HTTPClientTests.swift` 保留 errorKey 和普通三段文本、打码现场生成的 JWT；`LoginTests.swift` 同时覆盖已知秘密出现在 code/errorKey 中。 |
| 3 | `Tests/CryNetTests/NetworkFixture.swift` 在重定向通知后补发响应与 finish。 | `HTTPClientTests.swift` 使用真实 URLSession 重定向委托，断言返回原 302、原 URL、只有一次请求；产品 accept 将该鉴权响应映射成 loginExpired 并清凭据。 |
| 4 | `Sources/CryNet/SessionStore.swift` 提取纯函数 `writeAttributes(data:)`，由 SecItemUpdate 和 SecItemAdd 共用。iOS 的访问属性没有改变。 | `KeychainStoreTests.swift` 对实际写入的属性字典断言 AfterFirstUnlockThisDeviceOnly；仍用独立随机 service 测试系统 JSON 存取、共享读者及 CAS，不再断言 macOS 系统读回可访问属性。选择纯函数方案，未添加 kSecUseDataProtectionKeychain。 |
| 5 | `LiveTransportTests.swift` 中 watchdog 的 opened/stopped 设置 assertForOverFulfill=false。 | 允许取消前额外重连触发相同 expectation，仍检查无帧超时导致停止。 |
| 6 | `Sources/CryNet/SessionStore.swift` 集中登录 CAS 重试；`Logins.swift`、`AppHandoff.swift` 使用它；`CryNetError.swift` 新增 serverChanged。 | `LoginTests.swift`、`HandoffTests.swift` 分别覆盖三种登录遇到同服务器轮换、同服务器过期以及切换服务器。前两者写入新会话，后者抛 serverChanged 并保留另一服务器记录。 |
| 7 | `HTTPClient.swift` 保留端点已有 Accept，身份头的保护继续生效。 | `HTTPClientTests.swift` 对 attachment、messageFile 实际请求断言 `*/*`；已有测试仍断言 JSON 和 SSE 的 Accept。 |
| 8 | 保留 SessionStore 的原子 replace 要求。 | 下方“给后续任务的接口”明确 05/T-1222-06 自定义存储的实现义务。 |
| 9 | `Sources/CryNetLogic/SessionPolicy.swift` 的 needsLogin 返回 LoginStatus：ok、renewSoon、loginRequired。 | `SessionTests.swift` 更新全部布尔调用，覆盖无 CF、601/600 秒边界、CF 已过期、会话到期优先、未登录，以及 pairing/email/feishu 不检查 CF。 |
| 10 | 新增 `Sources/CryNetLogic/WebSocketRequest.swift`，由 `LiveTransport.swift` 调用纯函数构造 WSS URL。 | `SessionTests.swift` 覆盖 API 主机、端口、部署前缀、编码路径、默认 API 地址与恶意路径拒绝。新增 `UploadProgressTests.swift` 用 URLSession 真上传触发 HTTPTaskDelegate.didSendBodyData，断言收到非零进度和最终字节数；原上传端点、请求体测试保留。 |
| 11 | `Sources/CryNetLogic/CallbackRouter.swift` 在版本分发前校验 state，错误 state 只记录日志、不调 completion；`AppHandoff.swift` 提供当前 pending state；`CryNetError.swift` 新增无敏感值的日志事件。 | `CallbackTests.swift` 覆盖错误 state 配未知版本仍被忽略；`HandoffTests.swift` 对 scheme/https 两入口先发错 state、再发有效密文，断言无提前完成、无请求、pending 可继续登录。 |
| 12 | `SessionPolicy.swift` 的 SessionCookie.applying 在没有 cookie 期限时保留原 sessionExpires。 | `SessionTests.swift` 断言只轮换 token、保留期限；显式 Max-Age=0 仍更新期限。 |
| 13 | 本报告第 1 轮第 72 行改成通用目录描述。 | 报告不含具体沙箱目录。 |

### 2. 本地验证与限制

开工已执行 `crybot-link-deps`：链接 73 个预装依赖条目。未安装其他依赖。没有 systemd，运行命令未加 systemd-run。

Linux 自测脚本位于忽略目录 `mobile/ios/.linux-cache/test-net-logic-round2.sh`，内容如下（没有改写 HOME，显式缓存路径均在工作区）：

```bash
#!/usr/bin/env bash
set -eu
net_workspace=$(pwd)/mobile/ios
net_cache=$net_workspace/.linux-cache
export PATH=/opt/swift/usr/bin:$PATH
export XDG_CACHE_HOME=$net_cache/xdg TMPDIR=$net_cache/tmp CLANG_MODULE_CACHE_PATH=$net_cache/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$net_cache/swiftpm-module-cache
mkdir -p "$net_cache/home" "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
timeout 1200 swift test --jobs 2 --package-path "$net_workspace/Packages/CryKit" --scratch-path "$net_workspace/.linux-build" \
  --cache-path "$net_cache/swiftpm" --config-path "$net_cache/config" --security-path "$net_cache/security" \
  --manifest-cache local --disable-sandbox --filter CryNetLogicTests
```

命令及原样输出，退出码 127：

```text
$ bash mobile/ios/.linux-cache/test-net-logic-round2.sh
timeout: failed to run command ‘swift’: No such file or directory
```

`command -v swift` 未找到命令，搜索系统安装目录和用户目录也未找到 swift/swiftc。没有执行任何 Swift 测试或类型检查，也没有同时运行多个测试文件。工具链恢复后可逐一过滤 SessionTests、CallbackTests、ReconnectTests 执行，避免并发跑多个测试文件。

CryNetLogic 源码 import 检查命令：

```bash
rg -n '^import ' mobile/ios/Packages/CryKit/Sources/CryNetLogic
```

结果仅有 Foundation、FoundationNetworking、CryCore；FoundationNetworking 在 canImport 条件内。`git diff --check` 无输出，退出码 0。

对四个目录的 23 个 Swift 文件检查尾随空白、占位令牌长度、JWT 字面量，并核对协调者白名单没有差异，结果：

```text
23 Swift files: whitespace, placeholder length, JWT literal checks passed; CryNetLogic import allowlist passed; coordinator allow-domains unchanged.
```

使用仓库 scanDiff 对 23 个 Swift 文件和本报告构造完整新增行 diff，包含两个尚未跟踪的新文件；本地工作区公开扫描命令与输出：

```text
$ node mobile/ios/.linux-cache/scan-net-worktree.mjs
denylist: skipped (no key)
Worktree Public scan: 24 files, 0 findings.
```

未注入黑名单密钥，HMAC 黑名单检查未执行；该结果不等于 Actions Public scan 通过。

网络测试只用隔离夹具：现有 HTTP/SSE/登录测试用 URLProtocol，Keychain 用独立随机 service；上传真实回调测试用系统 Network 框架建立仅绑定回环地址、随机端口的临时 HTTP 接收器，测试结束取消连接及 listener，直接测试 URLSession 与产品 HTTPTaskDelegate，不放宽产品 CryServer 的 HTTPS 限制。Network 只用于测试，未安装包或修改 Package.swift。该测试不能用 URLProtocol 的收包或产品手动发出的首尾进度代替真实 didSendBodyData。沙箱禁止监听端口，且缺少 Apple 框架/Swift，本机未运行该测试或 e2e；以 Actions macOS 为准。

当前检出仍缺 `docs/verification/README.md` 和 `mobile/ios/scripts/linux-test.sh`、`mobile/ios/scripts/linux-check.sh`，没有对用户 live app 或数据执行验证，没有声称服务端改动已验证。

### 3. 原任务验收逐条重核

| 原验收项 | 本轮结果 |
|---|---|
| Linux `swift test --filter CryNetLogicTests` 通过 | 未通过验收：工具链缺失，命令退出 127，原样输出见上。 |
| Actions Mobile builds 的全部 CryKit 测试通过 | 待协调者推送后的 ios 作业；重定向和 Keychain 两个已知失败点已修订测试，尚无本轮运行链接。 |
| CryNetLogic 无允许范围外 import | 本地文本检查通过，只有 Foundation/FoundationNetworking/CryCore。 |
| 无 CF 时无 Cookie，始终无 Origin、不跟随重定向 | HTTPClientTests/NetworkFixture 已有头断言，重定向夹具现会结束；运行结果待 Actions。 |
| 接力往返通过且算法和原 ViewController 一致 | 静态重核 P256 X9.63、HKDF-SHA256（32 字节、state salt、固定 info）、12 字节 nonce、16 字节 tag、state AAD 均一致；同密文双入口测试保留，运行结果待 Actions。 |
| 日志/错误不含 token、JWT、配对码 | HTTPClientTests/LoginTests/HandoffTests 补齐标识字段保留及秘密精确替换断言；运行结果待 Actions。 |
| 单测覆盖“要做的事”的逻辑 | 源码逐项映射见下；56 个测试方法仅为源码计数，实际执行 0。 |
| Mobile builds、iOS Linux、Public scan 全绿且测试数大于 0 | 待协调者推分支、开 PR 和补链接；iOS Linux 仍需任务 43。工作区公开扫描不代替 Actions 或密钥黑名单检查。 |

“要做的事”12 项源码映射：

1. SessionRecord v2、未知版本/method、feishu 和 CF 可选编码：SessionTests。
2. CryServer HTTPS 规范化、API 默认地址和构建参数：SessionTests。
3. 请求头、轮换/期限保留、响应过期、三态登录判断：SessionTests；重连退避/40 秒/cursor/resumed：ReconnectTests；参数与版本分发：CallbackTests。
4. CallbackRouter 主机/整段路径匹配、双入口、未知入口、注册扩展点：CallbackTests；错误 state 的忽略及 pending 保留追加到 HandoffTests。
5. 回调模式四种组合：CallbackTests；AppHandoff 的系统可用性判断保留，浏览器接入仍由 05 完成。
6. SessionStore 内存 CAS：HTTPClientTests；Keychain JSON/共享读取/CAS/清除和写入访问属性：KeychainStoreTests。
7. HTTPClient 实际头/API 地址、公开与鉴权错误、轮换、拒绝重定向、迟到响应、Accept：HTTPClientTests/LoginTests。
8. LiveTransport SSE/快照/watchdog、上传字节/query、Range 下载：LiveTransportTests；真实进度：UploadProgressTests；WSS URL 纯函数：SessionTests。真实 TLS/WebSocket 二进制往返仍需 macOS 隔离集成，不能把 URL 断言当成网络往返通过。
9. 接力密文双入口、CF cookie 与 assertion 回退、日志、过期、取消、篡改、防重放、CAS：HandoffTests。
10. 配对请求/二维码、邮箱 start/verify、写入方式和期限、缺 cookie、401/errorKey、CAS：LoginTests。
11. Linux 纯逻辑测试覆盖上述逻辑；本机无工具链，未执行。
12. Apple 网络/Keychain/CryptoKit 测试覆盖上述集成；全部待 Actions 实际执行。

覆盖表未改；网络层交付项仍为 hello 的 resumed/cursor 与重新拉快照、ping 的活动时间及退避复位、其他 ServerFrame 按 SSE id 更新 cursor 后透传。没有据此登记 UI、页面或业务归并完成。

### 4. 给后续任务的接口

05 和 T-1222-06 的自定义 SessionStore **除 read/write/clear 外必须实现**：

```swift
@discardableResult
func replace(ifMatching expected: SessionRecord?, with record: SessionRecord?) throws -> Bool
```

比较与写入必须原子执行；当前值与 expected 不相等时返回 false，保持当前值。MemorySessionStore 和 KeychainSessionStore 已提供实现。普通迟到响应仍只尝试一次 CAS；登录成功写入遇到冲突时重新读取，同一服务器继续 CAS，服务器不同抛 `CryNetError.serverChanged`。清空记录后没有其他服务器地址时允许重试；主动登出仍应取消正在进行的登录任务。05/T-1222-06 可将 serverChanged 显示为重新发起登录，不应当作静默取消。

needsLogin 的返回值改为 `SessionPolicy.LoginStatus`，调用方必须按三个状态处理；renewSoon 只是提示重新接力，不应清除当前会话。最小示例（UI 函数由 05 提供）：

```swift
switch SessionPolicy.needsLogin(record, now: Date()) {
case .ok: break
case .renewSoon: showHandoffRenewalPrompt()
case .loginRequired: showLogin()
}
let socketURL = try WebSocketRequest.url(server: server,
    path: "/api/desktop-viewer/fixture/websockify")
```

CF 或会话已到期、记录未登录返回 loginRequired；只有 cfHandoff 且 CF 尚有效、剩余不超过 600 秒返回 renewSoon；pairing/email/feishu 不检查 CF 期限。

CallbackRouter 仍由 App 生命周期持有，无单例；原第 1 轮初始化与两个入口的调用示例继续适用。registerHandoff 增加带默认值的 acceptsState/onIgnoredState 参数，AppHandoff 自动传入 pending 校验和安全日志；原 `router.registerHandoff(registry) { result in ... }` 仍可用。错误 state 不触发 completion，调用方不能据此关闭当前登录流程。HTTP/API 错误仍用 `CryNetError.api(let api)` 读取 errorKey/errorParams。其余公开类型、初始化方法和 35/48 的示例沿用第 1 轮。

### 5. 协调者后续

- 推送后检查 Actions「Mobile builds」ios 作业完整 `swift test`：尤其重定向、Keychain、watchdog 和真实上传进度测试；补运行链接和实际执行数。
- 本轮没有 CryCore 字段缺口，没有请求变更 Package.swift。Network 为仅测试使用的系统框架，无第三方包；任务 43 的 Linux 条件隔离继续按原安排。
- 补齐验证指南与覆盖表；TLS/WebSocket 真网络往返保留为隔离集成验收项。
