## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1221-03 网络与身份核心

> 规格以仓库里的 `docs/specs/2026-11-14-ios-native.md` 为准，开工前先通读一遍（2026-11-14 已缩小范围：常用部分原生，其余内嵌网页，共 25 个任务）。任务 01 已合并，CryCore 已在 main 上：`mobile/ios/Packages/CryKit/Package.swift` 里 CryNetLogic 依赖 CryCore，CryNet 依赖 CryCore 和 CryNetLogic，测试 target 有 CryNetLogicTests、CryNetTests；`Sources/CryNetLogic/`、`Sources/CryNet/`、`Tests/CryNetLogicTests/`、`Tests/CryNetTests/` 目前各只有一个 `Placeholder.swift`。CryCore 里能直接用的：`Transport.swift`（协议 `Transport`：`send<R>(_:)`、`events(since:screens:) -> AsyncThrowingStream<ServerFrame, Error>`、`upload(_:to: Endpoint<UploadResponse>)`、`download(_: Endpoint<Data>)`、`webSocket(path:) async throws -> any WebSocketChannel`；`WebSocketChannel`、`WebSocketPayload`）、`Endpoint.swift`（`Endpoint<Response>` 带 `request(baseURL:)` 和 `decode(_:)`；`CoreEndpoints.authSession`、`pair(code:label:attemptId:)`、`startEmail`、`verifyEmail`、`uploadImage(mime:uploadId:)`、`uploadFile(name:mime:uploadId:)`、`attachment(name:)`、`messageFile(...)`）、`SSEParser.swift`（`SSEParser` 增量 `feed(_:)`、`finish()`）、`CoreAPIModels.swift`（`AuthSession`、`APIError`、`PairResponse`、`EmailVerifyResponse`、`UploadResponse`、`EnvironmentInfo`）、`WireModels.swift`（`ServerFrame`，含 hello 帧）。用到 `URLRequest` 的 CryCore 文件已经带 `#if canImport(FoundationNetworking)`。

## 依赖
- after：01（已合并）
- 估计：2 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读第 1、2、8、11 节和第 1.4 节入口表，以及第 3、4.1、14 节；第 7.6 节只需要了解（48 用你的 `SessionRecord` 给网页容器带会话）。T-1222 规格 `docs/specs/2026-11-14-unified-login.md` 第 5 节和第 14 节冲突时以它为准。
- 分支名：`T-1221-net-auth-core`
- 和 02、04 并行开发，三者改的文件不重叠（见「范围」）。

## 目标
CryNetLogic 和 CryNet 能和真实服务器收发：鉴权头正确、会话令牌自动轮换、SSE 断线重连、上传下载和 WebSocket 都能用，能完成接力、配对码、邮箱三种登录。登录存储带版本号和登录方式，给 T-1222 留好扩展点。界面由 05 接入，网页容器（48）会读你存的 `SessionRecord`。

## 背景
规格第 3 节写了全部规则。可以参考的现有代码：
- 手表的请求方式：`mobile/ios/Shared/WatchContract.swift`（`cfAuthorization` 已经是可选的，T-1222-07 已合并）、`mobile/ios/CryBotWatch/APIClient.swift`（ephemeral 会话、拒绝重定向）、测试 `mobile/ios/CryBotWatchTests/APIClientTests.swift`（URLProtocol 假接口）。
- 接力和回调：main 上的 `mobile/ios/CryBot/ViewController.swift`（已含 T-1220 的改动）：`startLogin`（约 :171，17.4 起用 https `/auth/app-return`，否则用 `crybot` scheme）、`handleAuthCallback`（约 :232）、`base64URL`（约 :268）、`decodeBase64URL`（约 :272）、`decryptHandoff`（约 :280）、`tokenExpiry`（约 :303）。**并行的 02 会删掉这个文件**，开工时用 `git show origin/main:mobile/ios/CryBot/ViewController.swift` 读原文，照着在 CryNet 里重写，不要依赖它在工作区里还存在。
- 服务端：`server/cf-access.ts`（Set-Cookie 下发 `cry_session_<端口>_<环境>`）、`server/request-auth.ts`（认凭据的顺序、`sessionCookieName`）、`server/app-handoff.ts`、`shared/pairing-link.ts`（二维码格式）、`server/index.ts` 里的 `/api/auth/pair` 和 `/api/auth/session`。
- SSE 规则：`src/lib/live-events.ts`（`LIVE_EVENTS_STALE_MS = 40_000`；`hello` 带 `cursor`、`resumed`；`resumed:true` 之后是重放帧，重放没结束前不要把 cursor 前移到 hello 的 cursor；之后按每帧的 `id` 更新 cursor）。
- 两层的分工：CryNetLogic 只 import Foundation 和 CryCore（Linux 上能测）；CryNet 放 Apple 专有的部分，用 `#if canImport(Security)`、`#if canImport(CryptoKit)` 包住。服务器地址类型叫 `CryServer`（`ServerAddress` 被 `Shared/` 占用了）。
- T-1222（飞书登录）以后由它的任务 06 在本任务的基础上接飞书：服务器可能是不经 Cloudflare Access 的「App 通道」，那里只有 Bearer、没有 CF 令牌，令牌值也不轮换（服务端只延长有效期）。本任务要把 CF 相关的一切都做成可选，并留好回调注册点；飞书登录本身不做。
- 网页会话 cookie 名（`cookieName`，第 7.6 节）归 48：48 在 `GET /api/auth/session` 的返回里加这个字段，并在 `Features/WebHost` 里拼 cookie。本任务不处理 `cookieName`，也不往 `SessionRecord` 里加相关字段；只要保证 `sessionToken` 存的是原始的 `cry_sess_…` 值、`sessionExpires`、`cfAuthorization`、`cfExpires` 能直接读到，48 拿它们就够了。

## 要做的事
1. CryNetLogic `SessionRecord`（Codable）：`{ version: 2, server: { webURL, apiURL }, method, sessionToken, sessionExpires?, cfAuthorization?, cfExpires? }`。`method` 是带 `other(String)` 兜底的枚举：`cfHandoff`、`pairing`、`email`、`legacyCookie`、`feishu`（T-1222 任务 06 的飞书登录写这个值，编码为 `"feishu"`；本任务只定义它，不实现飞书登录）。解码时遇到不认识的值原样保留。`version` 不认识时当作未登录，但能取出服务器地址。`cfAuthorization`、`cfExpires` 都可选，没有时编码不写这两个键。
2. CryNetLogic `CryServer`：只接受 https，规范化地址；有 `webURL` 和 `apiURL`（缺省等于 `webURL`）；从构建时注入的 `CRYBOT_SERVER_URL`、可选的 `CRYBOT_API_URL`、`CRYBOT_LOGIN_HOSTS` 构造（通过参数传入，不读 Info.plist）。
3. CryNetLogic 纯逻辑：
   - 请求头拼装：Bearer、`Accept: application/json`；只有 `cfAuthorization` 有值时才加 `Cookie: CF_Authorization=…`；不带 Origin。
   - `Set-Cookie` 里 `cry_session_*` 的识别和轮换。
   - 登录过期判断（第 3 节）：共同规则是 302/303/307/401，或者 403 但响应不是带 `error` 字段的 JSON；再按 `method` 分开：`cfHandoff` 的 CF JWT 临期提示（exp 前 10 分钟内）只在 `cfExpires` 有值时出现；`pairing`、`email`、`feishu` 是服务端签发的 Bearer 会话，不做 JWT 检查，只看 `sessionExpires`。
   - 重连状态机：退避 1、2、4、8 秒，最长 30 秒；40 秒没有任何帧判为断开；时钟可以注入。跟踪 cursor 和 `hello.resumed`（规则照 `live-events.ts`）。
   - 接力回调参数解析，以及按 `v` 分发的注册表 `HandoffRegistry.register(version:handler:)`。
4. CryNetLogic 回调注册点 `CallbackRouter`（第 14 节）：
   - `register(host:handler:)` 接 `crybot://<host>?…`；`register(httpsPath:handler:)` 接 `https://<CRYBOT_APP_LINK_HOST><path>?…`（主机名通过参数传入，比较不区分大小写；主机名为空时不接任何 https 回调）；`handle(_ url: URL) -> Bool`，没注册的返回 false。
   - https 路径按整段精确匹配（`/auth/app-return` 和 `/auth/feishu/app-return` 互不接走）。
   - 本任务注册接力的两个入口，都交给 `HandoffRegistry` 按 `v` 分发：host `auth`（`crybot://auth?v=…`）和 https 路径 `/auth/app-return`。设了 `CRYBOT_APP_LINK_HOST` 时 `crybot://auth` 照样接（不像 T-1220 那样吞掉）。T-1222 任务 06 会注册 host `feishu` 和路径 `/auth/feishu/app-return`，本任务不实现它们。
   - 05 的 `LoginRouter.handle(url:)` 只会调 `CallbackRouter.handle`，所以 `CallbackRouter` 要能在 App 启动时注册好，并且有一个明确的取得方式（单例或由调用方持有，在报告里写清）。
5. 接手 T-1220 的 iOS 接力回调行为（第 14 节）：
   - CryNetLogic 纯函数 `HandoffCallbackMode.choose(linkHost: String, supportsHTTPSCallback: Bool)`，返回 `.https(host: linkHost, path: "/auth/app-return")` 或 `.scheme("crybot")`：主机名非空且系统是 iOS 17.4 及以上时用 https；否则（17.0–17.3，或主机名为空）用 `crybot` 自定义 scheme。
   - CryNet 的 `AppHandoff` 用 `#available(iOS 17.4, *)` 算出 `supportsHTTPSCallback` 并给出回调方式，05 照它创建 `ASWebAuthenticationSession`（17.4 起 `callback: .https(host:path:)`，否则 `callbackURLScheme: "crybot"`）。会话完成时拿到的回调 URL 也交给 `CallbackRouter.handle`，和系统从外部打开的 URL 走同一条路。
   - 不保留 T-1220 在 17.4 以下打开 Safari 等回跳的路径。17.0–17.3 靠 T-1222 任务 02 改造的 `/auth/app-return` 兜底页再跳 `crybot://auth?<原查询串>`；本任务不改服务端。
6. CryNet `SessionStore` 协议和两个实现：Keychain 版（`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`，存 `SessionRecord` 的 JSON；初始化参数 `accessGroup: String? = nil`，第 1 期调用方传 nil）和内存版（测试用）。要能被多个读者读取：05 的手表同步和 48 的网页容器都会读同一份记录。
7. CryNet `HTTPClient`：ephemeral URLSession，关掉 cookie 存储，拒绝重定向；请求发往 `apiURL`，头用 CryNetLogic 拼；每个响应交给轮换逻辑更新 SessionStore（响应里没有 `cry_session_*` 时什么都不做：只有 Bearer、令牌不变的服务器照常工作，轮换不是必经路径）；判为过期时抛 `CryNetError.loginExpired`；其他错误解析成 CryCore 的 `APIError`。
8. CryNet `LiveTransport`：实现 CryCore 的 `Transport`。
   - 事件流：`URLSession.bytes` 加 CryCore 的 `SSEParser`，请求 `GET /api/events?since=<cursor>&screens=off`（`screens` 参数照调用方传入）；重连用 CryNetLogic 的状态机，重连带 `since=<cursor>`；`hello.resumed=false` 时通过回调要求调用方重新拉快照。
   - 上传：图片是原始字节加正确的 content-type，文件带 `name` 和 `uploadId`，有进度回调。
   - 下载：写到临时文件，支持 Range 续传。
   - WebSocket：URLSessionWebSocketTask，带同样的头，包成 CryCore 的 `WebSocketChannel`（35 的远程桌面要用二进制帧）。
9. CryNet `AppHandoff`：生成 P256 密钥对和 state，拼出 `webURL` 下的 `/auth/app-handoff?state&pk`。回调（`crybot://auth?v=…` 或 `https://<CRYBOT_APP_LINK_HOST>/auth/app-return?v=…`，查询参数相同）先交给 `HandoffRegistry` 按 `v` 分发。本任务注册 `v=1`：解密（P256 ECDH；HKDF-SHA256，salt 为 state，info 为 `crybot-app-handoff-v1`；AES-GCM，AAD 为 state），从 JWT 读 exp；解密后只带 CF cookie 调一次 `GET /api/auth/session`，从 Set-Cookie 里取 `cry_sess_`；拿不到时带 `Cf-Access-Jwt-Assertion` 头再试一次，两次的结果都写进日志（不写令牌内容）。没有对应处理器的 `v` 返回 `HandoffError.unsupportedVersion`（05 据此提示「需要更新 App」）。成功后写入 `method: cfHandoff` 的 `SessionRecord`，`cfAuthorization` 和 `cfExpires` 都填上。
10. CryNet `PairingLogin`（`POST /api/auth/pair {code,label,attemptId}` 得到 `{token}`，并能解析 `shared/pairing-link.ts` 格式的二维码内容）和 `EmailLogin`（start、verify）。成功后写入对应 `method` 的 `SessionRecord`，不带 CF 字段；服务端返回了过期时间就填 `sessionExpires`。
11. CryNetLogicTests（Linux 上能跑）：
    - `SessionRecord` 各版本和未知 method 的解码；`feishu` 解码再编码还是 `"feishu"`；没有 CF 字段时编码不写这两个键；
    - `CryServer` 规范化（拒绝 http、`apiURL` 缺省）；
    - 有、无 CF 令牌时的请求头；
    - Set-Cookie 轮换；
    - 按 method 的过期判断（302、401、非 JSON 的 403、带 `error` 的 JSON 403 不算过期；cfHandoff 的 JWT 临期；pairing 没有 CF 令牌就不做 JWT 检查；`feishu` 只按 `sessionExpires` 判断）；
    - 重连状态机（退避序列、30 秒封顶、40 秒无帧、cursor 和 resumed 处理）；
    - `v` 分发；
    - `CallbackRouter`：`crybot://auth` 不会被别的 host 的处理器接走；未注册的 host 和路径返回 false；https 主机名大小写不敏感；主机名为空时 https 回调一律返回 false；`https://<主机>/auth/app-return?v=1…` 交给 `HandoffRegistry`；设了主机名时 `crybot://auth?v=1…` 仍交给 `HandoffRegistry` 并返回 true；`/auth/feishu/app-return` 不会被接力接走；
    - `HandoffCallbackMode.choose` 的四种组合（主机名有无 × 是否 17.4 及以上）。
12. CryNetTests（URLProtocol 假接口，只在 Actions 的 macOS 上跑）：
    - 每个请求实际发出的头和目标地址；不跟随重定向；
    - SSE 断线后带 cursor 重连，`resumed=false` 时触发重新拉快照；
    - 上传的请求体和查询参数；Range 下载；
    - 接力往返：测试里用 CryptoKit 按服务端的方法加密，再用 `AppHandoff` 解密；同一份密文分别以 `crybot://auth` 和 `https://<主机>/auth/app-return` 回调送进 `CallbackRouter`，都能登录成功；
    - 配对和邮箱登录的请求体，以及写入的 `SessionRecord`；
    - 「只有 Bearer」的会话（没有 CF 字段）：发出的请求只带 Bearer，不带 Cookie 头和 Origin 头；响应里没有 Set-Cookie 时会话令牌保持不变；
    - 日志和错误描述里不出现令牌、JWT 或配对码的内容。

## 范围
- 可以改：`mobile/ios/Packages/CryKit/Sources/CryNetLogic/**`、`mobile/ios/Packages/CryKit/Sources/CryNet/**`、`mobile/ios/Packages/CryKit/Tests/CryNetLogicTests/**`、`mobile/ios/Packages/CryKit/Tests/CryNetTests/**`（四个目录里的 `Placeholder.swift` 可以删掉或替换）
- 不要改：`Package.swift`（Linux 上去掉 CryNet 的条件归 43）、CryCore 及其测试和夹具、CryRFB、`CryBot/**`（包括 `ViewController.swift`，删它是 02 的事）、`project.yml`、`.github/**`、`Shared/**`、服务端和网页代码。确实需要改时，在报告里说明原因，不要自己改。CryCore 缺什么（例如某个接口或模型字段），写进报告交协调者安排 01 返工，不要在 CryNetLogic 里重复定义 CryCore 已有的类型。
- 和并行任务的边界（第 1.3 节）：02 只改 `CryBot/App`、`Store`、`Design`、`Features`、`AppDelegate.swift`、`Assets.xcassets` 和 `CryBotTests/Shell`；04 只改 `CryBotTests/Support`、`CryBotUITests`、`mobile/ios/scripts`、`CryBot/Strings` 和两个工作流文件。本任务只在 `Packages/CryKit` 的四个目录里，没有重叠。02 的 AppStore 里会有一份最小的重连状态机（因为看不到你的），05 接入时再统一，不用你管。

## 接口契约
以下名字和签名是 05、35、48 和 T-1222-06 会直接用的，写死不改：
- `SessionRecord`（字段名照第 3 节）、`SessionRecord.Method`（或同等命名的枚举，case `cfHandoff`、`pairing`、`email`、`legacyCookie`、`feishu`、`other(String)`）、`SessionStore` 协议（读、写、清除）、`CryServer`。
- `CallbackRouter.register(host:handler:)`、`register(httpsPath:handler:)`、`handle(_ url: URL) -> Bool`。
- `HandoffRegistry.register(version:handler:)`、`HandoffCallbackMode.choose(linkHost:supportsHTTPSCallback:)`、`HandoffError.unsupportedVersion`、`CryNetError.loginExpired`。
- `LiveTransport` 遵守 CryCore 的 `Transport`，不在协议外加 AppStore 必须调用的方法；`resumed=false` 的回调和登录过期的通知用初始化参数里的闭包传入。
- 各类型的公开初始化方法和用法，在报告里各写一个最小调用示例，给 05 照着接。

## 验收标准
- [ ] 在 Linux 沙箱里 `swift test --filter CryNetLogicTests` 通过（命令和输出原样贴进报告）。
- [ ] Actions 上 `Mobile builds` 的 CryKit `swift test`（含 CryNetLogicTests 和 CryNetTests）全部通过。
- [ ] CryNetLogic 的源码里没有 Foundation、FoundationNetworking、CryCore 以外的 import（用 grep 检查）。
- [ ] 测试里断言：没有 CF 令牌时请求不带 Cookie 头；任何情况下都不带 `Origin` 头、不跟随重定向。
- [ ] 接力往返测试通过，算法与 main 上 `ViewController.swift` 的 `decryptHandoff` 一致（参数在测试里写成常量）。
- [ ] 日志和错误信息里不出现令牌、JWT 或配对码的内容（有测试检查）。
- [ ] 单元测试覆盖「要做的事」里列出的逻辑。
- [ ] 协调者推分支、开草稿 PR 后，`Mobile builds`、`iOS Linux`（43 合并后才有）和 `Public scan` 都是绿的；日志里本任务的测试实际执行数大于 0。运行链接由协调者补进报告。

## 约束
- 不要 git 提交。沙箱禁网，没有 Xcode：CryNet 和 CryNetTests 依赖 Apple 框架，在 Linux 上编不了，不要声称它们「编译通过」或「测试通过」，以 Actions 的 `Mobile builds` 为准。
- Linux 自测：规格第 8.5 节的 `linux-test.sh` 归 43，还没合并，先用下面的写法。写成脚本再调用（直接在命令行写 `${...}` 可能被替换），缓存全部放工作区（`.linux-cache/`、`.linux-build/` 已在 `.gitignore`）：
  ```bash
  WS=$(pwd)/mobile/ios; C=$WS/.linux-cache
  export PATH=/opt/swift/usr/bin:$PATH HOME=$C/home XDG_CACHE_HOME=$C/xdg TMPDIR=$C/tmp \
         CLANG_MODULE_CACHE_PATH=$C/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$C/swiftpm-module-cache
  mkdir -p "$HOME" "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
  timeout 1200 swift test --jobs 2 --package-path $WS/Packages/CryKit --scratch-path $WS/.linux-build \
    --cache-path $C/swiftpm --config-path $C/config --security-path $C/security \
    --manifest-cache local --disable-sandbox --filter CryNetLogicTests
  ```
  `Package.swift` 还没有 Linux 条件，`swift test` 会连带编译 CryNet。所以 CryNet 里凡是用到 Security、CryptoKit、`URLSession.bytes`、`URLSessionWebSocketTask`、`ASWebAuthenticationSession` 的代码，整段用 `#if canImport(...)` 包住，保证在 Linux 上至少能编成空模块；CryNetTests 同样处理。实在编不过时，把错误原样贴进报告，并对 CryNetLogic 的文件单独做类型检查。
- 需要新的依赖时，在报告里列出包名和版本，不要自己安装。本任务只用系统框架（Foundation、Security、CryptoKit、AuthenticationServices）。
- 公开仓库：代码、测试、注释和报告里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。测试里的令牌用短占位（`cry_sess_` 后面不超过 19 个字符），JWT 在测试里现场拼出来，不要写成 `eyJ` 开头的字面量（公开扫描会拦）；UUID 只用全零或 `00000000-0000-4000-8000-` 开头的占位。
- 类型命名遵守规格第 1.5 节：不和 SwiftUI、Foundation、`Shared/` 里的类型重名（例如不能叫 `ServerAddress`、`WatchCredentials`、`LoginCookies`、`Data`、`Task`）。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。
- 只说已发生的事：报告里写「已验证」的，必须附 Actions 运行链接（由协调者补）。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1221-net-auth-core/report.md`（等于 `task-paths report T-1221-net-auth-core` 算出的路径）；各轮追加到同一个文件，保留前几轮的内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果（含 Linux `swift test` 的原样输出）；哪些只能等 Actions 验证。
3. 本任务完成了覆盖表（`server/testing/ios-contract/coverage.ts`）里的哪些项（只列出，不改那个文件）。
4. 给 05 和 48 的接入说明：每个公开类型的最小调用示例，`CallbackRouter` 怎么取得和注册。
5. 需要协调者处理的事：CryCore 缺的东西、`Package.swift` 要改的地方（交 43）、超出范围的改动、没解决的问题。
