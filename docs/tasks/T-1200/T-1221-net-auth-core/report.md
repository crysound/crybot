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

`command -v swift`、`command -v swiftc` 没有输出；同时搜索 `/opt`、`/usr/local`、`/data/home`（含隐藏目录）也未找到工具链。没有安装新的包。没有运行需要监听端口的 e2e，以 Actions 为准；本轮新增 URLProtocol 测试本身不监听端口，Keychain 测试使用独立随机 service，不接触用户会话。

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
