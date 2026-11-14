# Cry Bot 自托管登录与桌面发行

服务监听 `127.0.0.1`，由 Cloudflare Tunnel 转发。先在 Cloudflare Access 创建应用和允许访问的策略，再给服务进程设置：

```sh
export CRYBOT_CF_ACCESS_TEAM_DOMAIN=example.cloudflareaccess.com
export CRYBOT_CF_ACCESS_AUD=application-aud,another-application-aud
export CRYBOT_CF_ACCESS_ALLOW='*'
```

三个变量必须一起设置；全部不设时保留原来的本机访问和配对方式。团队域名不带 `https://` 或路径，AUD 是 Access 应用的 audience tag。服务用团队域名的 HTTPS JWKS 验证 JWT 签名、issuer、audience 和有效期，复用密钥缓存。

`ALLOW=*` 接受所有已通过 Access 的身份，不要求邮箱。也可以设成 `owner@example.com,another@example.com`，按 JWT 的 `email` 忽略大小写匹配。通过后签发单用户 owner 会话（含管理权限）；签发时长、续期和上限与邮箱登录一致，由现有 `CRYBOT_SESSION_TTL_DAYS`（默认 30 天）和 `CRYBOT_SESSION_MAX_DAYS`（默认 180 天）控制。有效 Cry Bot 会话优先，不重复签发新会话。Access 策略仍应保护整个应用，撤销 Access 用户后不要允许其绕过 Access 直连服务。

反向代理需保留 `Cf-Access-Jwt-Assertion`、外部 Host，以及正确的 `X-Forwarded-Proto: https`，使浏览器收到 Secure、HttpOnly 会话 cookie。无效 JWT 返回 401，名单外身份返回 403；公开的健康检查等接口保持原行为。

## 手机 App 登录接力

iOS / 安卓构建配置了 `CRYBOT_LOGIN_HOSTS` 时，去往登录主机的导航会改用系统认证会话或系统浏览器访问服务器的 `/auth/app-handoff?state=...&pk=...`。服务器地址有子路径时，在子路径后追加 `/auth/app-handoff`（例如 `https://crybot.example/sub/` → `https://crybot.example/sub/auth/app-handoff`）。飞书等身份源授权完成后，接力页通过 `crybot://auth` 自动返回 App；浏览器阻止自动跳转时可点击「返回 Cry Bot」。App 校验一次性 state 并解密，将 Access JWT 写入内嵌网页的 Secure、HttpOnly Cookie 后重新加载服务器。未配置登录主机时保持原有行为。

接力路由只在 Cloudflare Access 已启用时可用，仍在整站 Access 保护后，不需要添加 Bypass 或无需登录的兑换接口。Access 层的拒绝保留原有 JSON 响应；通过后，接力处理器重新校验 JWT 签名、issuer、audience、身份允许名单，并要求至少剩余 60 秒有效期。服务端环境变量 `CRYBOT_APP_SCHEME` 默认 `crybot`，仅接受 `^[a-z][a-z0-9+.-]{1,30}$`，非法值回落默认；请求参数不能指定回跳地址。发行版两端注册的 scheme 均为 `crybot`；自定义 scheme 需要同时调整 App 的协议注册和回调处理后重新构建。

接力加密协议 **v1**（服务端、iOS、安卓一致）：

1. App 每次登录生成新的 P-256 密钥对及随机 32 字节的 state。state 为无填充 base64url，服务端接受 `^[A-Za-z0-9_-]{32,128}$`。公钥 `pk` 为 X9.63 未压缩点：`0x04 || X || Y`，X、Y 均为 32 字节大端无符号整数（不足补前导零），共 65 字节，再编码为无填充 base64url。请求为 `GET /auth/app-handoff?state=<state>&pk=<pk>`；state、pk 缺失或重复、格式不合法、pk 不在 P-256 曲线上均返回 400。
2. 服务端为每次响应生成新的临时 P-256 密钥对，与 pk 做 ECDH，得到 32 字节共享密钥（共享点的 X 坐标，大端补齐）。执行 `HKDF-SHA256(ikm=共享密钥, salt=UTF8(state), info=UTF8("crybot-app-handoff-v1"), L=32)` 得到 AES-256 密钥。salt 是 state 字符串的 UTF-8 字节，**不是** state 的 base64url 解码结果。
3. 服务端生成随机 12 字节 nonce，用 AES-256-GCM 加密 JWT 的 UTF-8 字节，AAD 为 `UTF8(state)`，tag 长度为 16 字节。回跳地址固定为 `<scheme>://auth?v=1&state=<state>&epk=<epk>&iv=<iv>&ct=<ct>`。epk 使用与 pk 相同的 X9.63 编码；iv 是 nonce；ct 是 `密文 || tag`。这三个字段均为无填充 base64url。URL、HTML 和日志不得包含明文 JWT，HTML 中的 `&` 转义为 `&amp;`。
4. App 只处理当前挂起 state 对应的回调；各参数必须唯一，v 必须为 `1`。App 用自己的私钥和 epk 重算共享密钥与 HKDF，以同一 state 作 AAD 解密。字段缺失、重复、编码非法、版本不支持或认证解密失败均显示登录错误面板及「登录」重试按钮，不写 Cookie。回调消费后 state 和私钥立即失效；同一回调不能重复使用。
5. iOS 私钥仅存内存，使用 CryptoKit 的 `P256.KeyAgreement`、`sharedSecret.hkdfDerivedSymmetricKey(using: SHA256.self, salt:sharedInfo:outputByteCount:)`、`AES.GCM.SealedBox(nonce:ciphertext:tag:)` 和 `AES.GCM.open`。安卓只用平台的 `KeyPairGenerator("EC")` / `ECGenParameterSpec("secp256r1")`、`KeyAgreement("ECDH")`、`Mac("HmacSHA256")`、`Cipher("AES/GCM/NoPadding")`；HKDF 为 HMAC extract 后接一个 expand 块 `HMAC(PRK, UTF8(info) || 0x01)`。安卓为冷启动恢复在私有 SharedPreferences 暂存 PKCS#8 私钥、state、服务器地址和开始时间；消费、失败或重试时删除，超过 10 分钟（或时钟回拨）也清除，冷启动正常加载网页。Activity 在两个 Intent 入口处理后均清掉回调 URL。

固定已知答案见 [`server/app-handoff.test.ts`](../server/app-handoff.test.ts) 的 `protocolVector`：包含 App 私钥标量 `1`、服务端临时私钥标量 `2`（均为 32 字节大端）、nonce `000102030405060708090a0b`、完整测试 JWT 字节串、state、pk、epk、共享密钥、HKDF 输出及 ct。该 JWT 是无有效签名的公开测试材料；固定密钥和 nonce 仅用于向量，不能用于真实登录。测试通过可注入私钥和 nonce 的纯加密函数比对全部回跳字段，并独立使用 WebCrypto 导入密钥、派生密钥和解密，便于两端对照。CryptoKit 可用 `PrivateKey(rawRepresentation:)` 导入标量；安卓可用 `ECPrivateKeySpec(BigInteger(1, 标量字节), P-256 参数)` 导入后取得 PKCS#8 编码。

## 安装包与更新文件

```sh
export CRYBOT_DESKTOP_UPDATES_DIR=/srv/crybot/desktop-updates
```

把发行文件和 electron-builder 生成的 `latest.yml`、`latest-mac.yml`、blockmap 等文件放进这个目录。下载地址例如 `https://example.com/desktop-updates/latest.yml`。在 Access 中为 `/desktop-updates/*` 配置 Bypass，使安装器和自动更新器不需要交互登录。

下载路由只接受 GET/HEAD，支持单个字节 Range；桌面 generic 源关闭多段 Range 合并，差分更新逐段下载。不列目录；目录、缺失文件、路径穿越和逃逸目录的符号链接返回 404。YAML 元数据不缓存，安装包可以缓存一小时。更新目录只能放公开发行文件，并应由可信发行进程管理。发布时最后替换元数据，避免客户端读到尚未上传的安装包。

## 桌面构建

在打包进程中设置（不是服务端运行时配置）：

```sh
export CRYBOT_DEFAULT_SERVER_URL=https://example.com
export CRYBOT_LOGIN_HOSTS=example.cloudflareaccess.com,login.example.com
export CRYBOT_UPDATE_FEED_URL=https://example.com/desktop-updates/
pnpm package:mac
# 或 pnpm package:win
```

打包脚本明确使用 `electron-builder.config.cjs`。构建钩子生成被 git 忽略的 `dist-electron/desktop-config.json`，并复制到安装包 Resources 中。不要提交带部署值的生成文件。

首次启动且没有 `environments.json` 时，默认服务器作为当前远程环境保存，主窗口直接加载该地址，由 Access 在窗口内完成登录。之后保存的环境选择优先；仍可从服务器设置切回本机或其他服务器。远程接口请求使用窗口的默认 Electron session cookie，不需要配对令牌。

`LOGIN_HOSTS` 为逗号分隔的精确主机名，不带协议、端口、路径或通配符。填写 Access 域名及身份提供方在登录过程中实际跳转的主机。服务器主机自动允许；名单外 HTTP(S) 链接交给系统浏览器。登录主机不会因此获得 Cry Bot 页面专属的本机 IPC 权限。

更新源只使用指定的 generic HTTP(S) 地址。没有 `UPDATE_FEED_URL` 时不产生 publish 配置，运行时不加载更新器、不轮询，也不显示更新错误。更改更新源需要重新构建应用。

macOS 构建保持 hardened runtime，包含 dmg 和自动更新需要的 zip，并使用 `build/entitlements.mac.plist`。CI 提供 Developer ID 签名配置；同时提供 `APPLE_API_KEY`（密钥文件路径）、`APPLE_API_KEY_ID` 和 `APPLE_API_ISSUER` 才开启公证。缺少其中任一变量时关闭公证。本地无证书构建可设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`。Windows NSIS 不签名。

## 离线验证

```sh
pnpm vitest run server/cf-access.test.ts server/routes/desktop-update-files.test.ts electron/desktop-build-config.test.mjs electron/updater.test.mjs --maxWorkers=2
pnpm build:server
node scripts/smoke-selfhost-login.mjs
```

冒烟脚本要求 Node 24、curl 和监听本机临时端口的权限。脚本生成临时密钥、启动本机假 JWKS，将构建服务端的 JWKS fetch 映射到该服务，使用临时数据目录及假引擎，并阻断其他外部 fetch；生产代码没有跳过 JWT 校验或替换 JWKS 地址的环境开关。脚本打印 curl 命令及响应，验证 JWT、cookie、健康接口和公开下载后清理 fixture。

### Lock AI providers to Cry Bot

Set `CRYBOT_PROVIDER_LOCK=1` on the server and restart to show only configured Claude custom endpoints, all named **Cry Bot**. Built-in providers, additional provider controls, hidden providers, and the AI key section are omitted; other service settings remain available. Endpoints without a custom icon use the Cry Bot mark. Only the owner or an admin can see endpoint addresses in `/api/instances`.

Configure a Claude endpoint with the existing settings form (for example, `https://gateway.example`). If none exists, the locked provider list is empty and Settings → AI shows that form. On startup, references to missing providers in bots, tasks, routines, defaults, and backup models move to the first endpoint; no migration runs without an endpoint. Model IDs are preserved, so configure models supported by the endpoint. Existing provider configurations are retained: unset the variable or use `0` and restart to restore the normal provider list; migrated references are not rolled back.

For desktop builds, set the same variable to `1` when building. The generated `desktop-config.json` contains `"providerLock": true`, which makes local mode start its server with the lock enabled. The release workflow reads the repository variable `CRYBOT_PROVIDER_LOCK`. A desktop connected to a remote server follows that server's setting.

### Desktop builds that only connect to your server

Set `CRYBOT_DESKTOP_REMOTE_ONLY=1` together with `CRYBOT_DEFAULT_SERVER_URL=https://gateway.example` when building the desktop app. The generated `desktop-config.json` enables `remoteOnly` only when a valid default server URL is present. The release workflow reads the repository variable `CRYBOT_DESKTOP_REMOTE_ONLY`. It is off by default; without it, existing desktop environment choices and startup behavior are unchanged.

With `remoteOnly` enabled, every launch selects the default server, including installations with an existing `environments.json`. Saved environments are retained, but environment switching, local mode, and adding other servers are hidden. Failed connections show a retry page; retry and Reload open the configured server without selecting local mode. Set `CRYBOT_LOGIN_HOSTS` to the exact login hostnames that must open within the window; their login pages do not receive local IPC privileges. The local background service still runs for desktop computer control, IPC, and updater idle checks, but its interface is never shown in the main window.
