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

更正：第 3 轮审核反馈确认，第 2 轮代码已经在审核方 Linux 环境执行 `swift test --filter CryNetLogicTests`，**24 个测试、0 失败**。因此不能再用「本机无 Swift 工具链、实际执行 0」概括第 2 轮验收。下方保留代理当时命令退出 127 的历史记录；它与审核方环境不同。审核完整原始日志未随返工说明提供，不补造输出。CryNetTests 当时源码计数为 32 个，macOS 完整 `swift test` 仍以协调者推送后的 Actions「Mobile builds」ios 作业为准。本轮沙箱的实际命令及输出见第 3 轮。

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
| Linux `swift test --filter CryNetLogicTests` 通过 | 审核方已执行：24 个测试、0 失败（第 3 轮反馈）；上方退出 127 是代理当时环境的历史输出。 |
| Actions Mobile builds 的全部 CryKit 测试通过 | 待协调者推送后的 ios 作业；重定向和 Keychain 两个已知失败点已修订测试，尚无本轮运行链接。 |
| CryNetLogic 无允许范围外 import | 本地文本检查通过，只有 Foundation/FoundationNetworking/CryCore。 |
| 无 CF 时无 Cookie，始终无 Origin、不跟随重定向 | HTTPClientTests/NetworkFixture 已有头断言，重定向夹具现会结束；运行结果待 Actions。 |
| 接力往返通过且算法和原 ViewController 一致 | 静态重核 P256 X9.63、HKDF-SHA256（32 字节、state salt、固定 info）、12 字节 nonce、16 字节 tag、state AAD 均一致；同密文双入口测试保留，运行结果待 Actions。 |
| 日志/错误不含 token、JWT、配对码 | HTTPClientTests/LoginTests/HandoffTests 补齐标识字段保留及秘密精确替换断言；运行结果待 Actions。 |
| 单测覆盖“要做的事”的逻辑 | 源码逐项映射见下；56 个测试方法为源码计数；审核方已执行其中 24 个 Linux 逻辑测试且无失败，Apple 测试以 Actions 为准。 |
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
11. Linux 纯逻辑测试覆盖上述逻辑；审核方已执行 24 个测试、0 失败（第 3 轮反馈更正）。
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

## 第 3 轮（2026-11-14）

本轮已修改实现和回归测试，未提交 git。保留协调者的 `scripts/public-scan/allow-domains.txt`，该文件与 HEAD 无差异。修改范围是 CryNetLogic、CryNet、对应测试和本报告；Package.swift、CryCore、App、Shared、工程、工作流、服务端与网页均未改动。

### 1. 本轮 7 项返工

路径相对于 `mobile/ios/Packages/CryKit/`。以下测试为已补充的断言；本轮没有可执行的 Swift 工具链，不能宣称它们已经运行通过。

| 项 | 实现与测试结果 |
|---|---|
| 1 畸形回调不打断 pending | `Sources/CryNetLogic/CallbackRouter.swift` 将初始 HandoffParameters 解析放到 completion 的错误处理之外：解析失败或 state 不匹配只调用 onIgnoredState。`CallbackTests.swift` 和 `HandoffTests.swift` 在 pending 期间依次发送空查询、仅 v、重复 state、缺 v 及错误 state，断言 completion 为 0，再发送有效回调并断言只完成一次。App 集成测试分别覆盖 scheme 和 https 入口，检查无提前网络请求且最终写入登录记录。 |
| 2 无 pending 的回调忽略 | `Sources/CryNet/AppHandoff.swift` 的 acceptsState 在无 pending 时返回 false。`HandoffTests.swift` 新增初始未登录尝试、主动 cancel 后两个场景，双入口和 v=1/v=99 都只写忽略日志，不触发 completion、不请求服务器、不改存储。 |
| 3 CAS 边界与上限 | `Sources/CryNet/SessionStore.swift` 最多调用 replace 三次，持续冲突抛 storage。冲突后当前 server 等于 previous.server 或新记录的 server 才重试，否则抛 serverChanged。新增 `SessionStoreTests.swift` 覆盖原服务器轮换/过期、目标服务器轮换/过期、第三个服务器、原服务器记录被清空、连续冲突三次及第三次成功；失败保留并发记录。 |
| 4 errorKey/code 保留 | `Sources/CryNet/HTTPClient.swift` 对标识字段仅校验完整 `^[A-Za-z0-9_.]+$`：符合时原样保留，不做秘密值或模式替换；不符合则返回 `[redacted]`。正文和 errorParams 继续脱敏。`LoginTests.swift` 新增配对码为 `code`、完整 errorKey、完整 code 三种情形，断言标识不变、正文和参数脱敏；已有含连字符的非法标识测试保留。 |
| 5 上传进度走产品路径 | `Sources/CryNet/LiveTransport.swift` 抽出内部 performUpload 闭包，默认调用 URLSession.upload，产品 upload 把 HTTPTaskDelegate(progress:) 传入该闭包。`UploadProgressTests.swift` 两个用例均调用产品 upload：无监听器的接缝测试覆盖默认和单次 progress 两个入口，检查收到产品 delegate 并驱动中间进度 4/10；真实回环上传测试把收到的同一 delegate 接给 URLSession，任务返回前检查非零进度及最后字节数，随后返回有效 UploadResponse JSON。移除 delegate 或去掉 progress 绑定将分别破坏 delegate 类型或中间进度断言；本机不能实际执行变异验证。 |
| 6 重定向组合路径 | `HTTPClientTests.swift` 在已有 session.data/accept 断言后恢复隔离存储的初始记录，再调用 send(CoreEndpoints.authSession)。断言 loginExpired、会话失效，总请求数从 1 变成 2，且每次只访问原 API 主机；覆盖 prepare → exchange → accept 的完整路径。 |
| 7 报告更正 | 已将第 2 轮总述和验收表更正为审核方 Linux 24 个测试、0 失败，保留当时代理环境的失败日志并明确来源。本轮真实命令输出如下，不把审核结果充作本轮结果。 |

### 2. 本轮验证命令与实际结果

开工先执行 `crybot-link-deps`，链接 73 个预装依赖条目。没有安装依赖，没有使用 systemd-run，没有并发执行多个测试文件。

当前环境 `command -v swift` / `command -v swiftc` 未找到命令；`/opt/swift/usr/bin` 不存在；在可读文件系统搜索 swift/swiftc 也没有结果。审核方有 Swift 并跑过 24 个测试，但当前沙箱没有挂入该工具链。

使用忽略目录中的 `mobile/ios/.linux-cache/test-net-logic-round3.sh`，内容如下（不改写 HOME，缓存显式放在工作区）：

```bash
#!/usr/bin/env bash
set -eu
net_workspace=$(pwd)/mobile/ios
net_cache=$net_workspace/.linux-cache
export PATH=/opt/swift/usr/bin:$PATH
export XDG_CACHE_HOME=$net_cache/xdg TMPDIR=$net_cache/tmp CLANG_MODULE_CACHE_PATH=$net_cache/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$net_cache/swiftpm-module-cache
mkdir -p "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
timeout 1200 swift test --jobs 2 --package-path "$net_workspace/Packages/CryKit" --scratch-path "$net_workspace/.linux-build" \
  --cache-path "$net_cache/swiftpm" --config-path "$net_cache/config" --security-path "$net_cache/security" \
  --manifest-cache local --disable-sandbox --filter CryNetLogicTests
```

命令与原样输出，退出码 **127**，本轮实际执行测试数 **0**：

```text
$ bash mobile/ios/.linux-cache/test-net-logic-round3.sh
timeout: failed to run command ‘swift’: No such file or directory
```

对本轮修改的四个 CryNet 源文件尝试语法检查，退出码 **127**，不是语法检查通过：

```text
$ swiftc -parse mobile/ios/Packages/CryKit/Sources/CryNet/AppHandoff.swift mobile/ios/Packages/CryKit/Sources/CryNet/HTTPClient.swift mobile/ios/Packages/CryKit/Sources/CryNet/LiveTransport.swift mobile/ios/Packages/CryKit/Sources/CryNet/SessionStore.swift
/bin/bash: line 1: swiftc: command not found
```

恢复工具链后需重跑上述两条命令，并对修改的 CallbackRouter 和测试文件执行 parse；macOS 完整 CryKit `swift test` 以协调者推分支后的 Actions「Mobile builds」ios 作业为准。上传真实进度用例需要监听回环随机端口，本沙箱禁止监听，因此未跑该用例和 e2e。URLProtocol、内存存储、随机 Keychain service、回环上传都为隔离夹具，没有使用用户 live app 或数据。当前检出仍缺 `docs/verification/README.md`、覆盖表和任务 43 的 Linux 脚本。

本地静态检查及工作区公开扫描结果：

```text
Tests/CryNetLogicTests test methods: 24
Tests/CryNetTests test methods: 39
CryNetLogic import allowlist passed.
git diff --check passed; coordinator allow-domains unchanged.

$ node mobile/ios/.linux-cache/scan-net-worktree-round3.mjs
denylist: skipped (no key)
Worktree Public scan: 25 files, 0 findings.
```

扫描调用仓库 scanDiff，读取四个目录的全部 Swift 文件和本报告，包含未跟踪的 SessionStoreTests，构造完整新增行 diff；没有黑名单密钥，所以未执行 HMAC 检查。该本地结果不代替 Actions Public scan。

### 3. 原说明验收逐条复核

| 原验收项 | 本轮结果 |
|---|---|
| Linux CryNetLogicTests 通过并贴输出 | 本轮未完成：命令退出 127，输出见上；第 2 轮审核已过 24 项，不代表修改后通过。 |
| Actions Mobile builds 全部 CryKit 测试通过 | 待协调者推送后的 ios 作业，尚无本轮运行链接。 |
| CryNetLogic import 限制 | `rg -n '^import ' mobile/ios/Packages/CryKit/Sources/CryNetLogic` 结果只有 Foundation、FoundationNetworking、CryCore；FoundationNetworking 有 canImport 防护。 |
| 无 CF 时无 Cookie，始终无 Origin，不跟随重定向 | SessionTests/HTTPClientTests 现有头断言保留；本轮新增 send 的真实重定向组合断言，待 Actions 运行。 |
| 接力往返及算法一致 | 静态核对当前 ViewController 的 P256 X9.63、HKDF-SHA256（32 字节，state salt，固定 info）、12 字节 nonce、16 字节 tag、state AAD 一致。HandoffTests 用常量现场加密，同密文双入口登录断言保留；执行待 Actions。 |
| 日志/错误无凭据 | 正文、errorParams、description/debugDescription/localizedDescription 和接力日志的脱敏测试保留。按本轮要求，合法 errorKey/code 是原样保留的标识符，即使与用户输入相同也不替换；短码回归测试覆盖此例外。执行待 Actions。 |
| 单元测试覆盖全部逻辑 | 下表逐项映射；当前源码计数 CryNetLogicTests 24 个、CryNetTests 39 个方法，共 63 个。源码计数不等于执行结果。 |
| Mobile builds、iOS Linux、Public scan 全绿且实际执行数大于 0 | 待协调者推分支后核对和补运行链接；本轮没有 Actions 结果。 |

原说明“要做的事”12 项源码复核：

| 项 | 实现及测试 |
|---|---|
| 1 SessionRecord | v2、未知版本保留 server、未知 method、feishu、CF 可选编码均在 SessionTests。 |
| 2 CryServer | HTTPS、地址规范化、API 默认值、构建参数在 SessionTests。 |
| 3 纯逻辑 | 头、cookie/期限、响应过期与按 method 判断在 SessionTests；退避、40 秒、cursor/resumed 在 ReconnectTests；参数与版本在 CallbackTests。 |
| 4 CallbackRouter | host、精确路径、主机大小写、空主机、双入口、未注册入口在 CallbackTests；本轮扩展畸形回调保护。 |
| 5 接手回调模式 | CallbackTests 四组合；AppHandoff 保留系统可用性判断；05 创建浏览器会话的契约不变。 |
| 6 SessionStore | 内存读写/CAS 在 HTTPClientTests，Keychain 属性字典和隔离读写在 KeychainStoreTests；本轮新增 SessionStoreTests 的登录竞争边界。 |
| 7 HTTPClient | API 地址、头、轮换、公开/鉴权错误、Accept、迟到响应在 HTTPClientTests/LoginTests；本轮补 send 重定向与短码标识。 |
| 8 LiveTransport | SSE、重连/快照、watchdog、上传字节/query、Range 在 LiveTransportTests；WSS URL 在 SessionTests；上传进度两个测试均接产品路径。真实 TLS/WebSocket 二进制往返仍待 macOS 隔离集成。 |
| 9 AppHandoff | HandoffTests 覆盖双入口、CF/assertion 回退、安全日志、过期、取消、篡改、防重放、CAS；本轮增加畸形回调与无 pending 忽略。 |
| 10 配对/邮箱 | LoginTests 覆盖请求体、二维码、存储 method/期限、无 CF、缺 cookie、错误与 CAS。 |
| 11 Linux 逻辑测试 | 三个测试文件共 24 个方法；本轮命令未能启动。 |
| 12 Apple 集成测试 | 七个测试文件共 39 个方法；待 Actions，不能用 Linux 纯逻辑结果代替。 |

### 4. r2 的 13 项逐条复核

| 项 | 本轮复核结果 |
|---|---|
| 1 公开 401 | HTTPClient.accept 仍只在 usesSession 时判过期；配对/邮箱 401 保留 APIError、存储和通知的断言保留。 |
| 2 标识字段与 JWT 脱敏 | JWT 长度/JSON 前缀规则保留；标识字段按本轮要求改为完整格式校验，不再精确替换秘密。 |
| 3 重定向夹具 | NetworkFixture 仍在 wasRedirectedTo 后发送原响应和 finish；新增 send 组合路径断言。 |
| 4 Keychain 属性 | 写入字典纯函数仍同时供 add/update 使用，测试断言 AfterFirstUnlockThisDeviceOnly；未要求 macOS 读回该属性。 |
| 5 watchdog | opened/stopped 仍关闭 over-fulfill 断言，超时取消断言保留。 |
| 6 登录 CAS | 三种登录均调用 storeLogin；同服务器轮换/过期继续写；本轮扩大到 previous 或目标服务器，增加次数上限与专用测试。 |
| 7 Accept | HTTPClient.prepare 仍保留端点 Accept；attachment/messageFile 的 `*/*` 测试保留。 |
| 8 SessionStore 扩展契约 | replace(ifMatching:with:) 保持原子实现要求；第 2 轮接口说明仍适用，下面补充重试边界。 |
| 9 登录三态 | LoginStatus 仍为 ok/renewSoon/loginRequired；600/601 秒边界、CF 已过期及会话期限优先的测试保留。 |
| 10 上传/WebSocket | WSS 纯函数及端口/前缀/编码路径测试保留；上传进度测试现在经过产品上传路径。 |
| 11 错 state 忽略 | 原行为保留，新增初始参数解析失败和无 pending 时同样忽略。 |
| 12 cookie 无期限 | applying 仍以 expires ?? record.sessionExpires 保留旧期限；Max-Age=0 回归保留。 |
| 13 报告路径 | 仍使用仓库相对路径，不写具体沙箱目录。 |

r2 验收：原说明已按上表逐项复核；Linux 命令已尝试并贴实际失败输出；Actions ios 作业待协调者推送；报告已追加本节且没有 git 提交。

### 5. 接口和协调事项

公开初始化签名、CallbackRouter 由 App 生命周期持有的取得方式、05/35/48 的示例沿用前两轮。无新增公开类型或第三方依赖，performUpload 是仅供模块内部注入的接缝。自定义 SessionStore 仍须实现原子 replace；登录写入最多三次尝试，竞争中的当前服务器必须等于登录开始时的服务器或目标服务器，第三个服务器抛 serverChanged，持续竞争抛 storage。原记录非空而并发被 clear 时也抛 serverChanged，防止重新写回；原记录本来为空时，空值与 previous 相同可以继续。此说明取代第 2 轮“清空后总是重试”的描述。取消登录仍由调用方调用 cancel。

CallbackRouter 对畸形参数、错误 state 及 AppHandoff 无 pending 的回调只记录忽略事件；05 不应以此关闭登录界面。合法且匹配 state 的未知版本仍通过 completion 报 unsupportedVersion。直接调用 registry 不经过入口过滤，原有防重放/取消测试仍可得到 expiredAttempt。

覆盖表交付范围没有新增：网络层消费 hello 的 resumed/cursor、ping 的活动时间与退避复位，其余 ServerFrame 按 SSE id 更新 cursor 后透传；不登记 UI/业务归并完成，不改覆盖表。未发现 CryCore 缺口或需要越界修改 Package.swift 的事项。

协调者需提供可用 Swift 工具链后复跑本轮 Linux 测试与 parse，并推分支核对 Mobile builds ios 作业的完整 swift test（包括 SessionStoreTests 和两条上传进度测试）。补齐 Actions 链接、实际执行数和 Public scan 结果；上传端口测试、Apple 框架集成以及真实 TLS/WebSocket 往返不能在当前沙箱完成。

## 第 4 轮（2026-11-14）

本轮修复 `HTTPClient` 错误标识脱敏的回退：合法服务端 code/errorKey 现在接受短横线；以 `cry_sess_`、`cry_pair_`、`cry_tick_` 开头的值、`eyJ` 开头且含两个点的 JWT 形状、6–8 位纯数字，以及当前会话或 CF 凭据会替换为 `[redacted]`。请求体里的用户输入没有参与标识字段的整值比较，因此 `changed-since` 和 `auth.code.wrong` 保持原样。配对错误测试改用真实的 6 位配对码，并增加合法标识、会话令牌和 JWT 形状的回归覆盖；第 3 轮短配对码用例继续保留。

本轮改动的 Swift 文件（逐个列出）：

- `mobile/ios/Packages/CryKit/Sources/CryNet/HTTPClient.swift`
- `mobile/ios/Packages/CryKit/Tests/CryNetTests/LoginTests.swift`

验证记录：开工已运行 `crybot-link-deps`，链接 73 个预装依赖条目；`git diff --check` 通过。按任务要求尝试 Linux 测试，当前沙箱没有 Swift 工具链，未在沙箱编译：

```text
$ timeout 1200 swift test --jobs 2 --package-path mobile/ios/Packages/CryKit --filter CryNetLogicTests
timeout: failed to run command ‘swift’: No such file or directory
```

因此本轮 Swift 测试实际执行数为 0；Swift 文件需由协调者在有 Swift 6.3 的机器上运行 `swift test --filter CryNetLogicTests` 和 `swiftc -parse`，完整 CryKit 测试以 Actions「Mobile builds」为准。沙箱禁止监听端口，未运行需要监听端口的 e2e。未提交 git。
