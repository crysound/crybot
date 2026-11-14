# T-1218 手机端登录接力：飞书授权后自动回到 App（iOS / 安卓）

## 目标
手机 App（iOS、安卓）在需要登录时，不再在 App 内嵌网页里走身份源登录，而是交给系统认证会话 / 系统浏览器完成，登录完成后由服务端「接力页」把登录凭证通过 `crybot://auth` 交回 App，App 写入内嵌网页的 Cookie 后重新打开服务器地址。用户全程不需要手动切回 App。

## 背景
- 本仓库是公开仓库。代码、测试、文案里不能出现任何内部域名、IP、邮箱、人名、密钥或真实实例 id；测试用 `https://crybot.example`、`team.cloudflareaccess.example` 这类占位。
- 服务器前面有 Cloudflare Access。Access 在 App 域名上种 `CF_Authorization` Cookie（JWT），没有它的请求在边缘就被拦到 Access 登录页。服务端 `server/cf-access.ts` 用 `Cf-Access-Jwt-Assertion` 头校验身份。
- 现状：iOS `mobile/ios/CryBot/ViewController.swift` 和安卓 `mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt` 用构建时注入的 `CRYBOT_LOGIN_HOSTS` 名单放行登录页，名单外一律交给系统浏览器。身份源登录页在手机上会唤起身份源自己的 App 授权，授权后它只会把回调交给系统浏览器（Safari / Chrome），登录状态落在浏览器里，回不到 App。这是要修的问题。

## 要做的事
1. **服务端接力路由**（新文件 `server/app-handoff.ts`，在 `server/index.ts` 的 `cfAccess` 检查之后挂载 `GET /auth/app-handoff`）：
   - 只在 Cloudflare Access 已启用（`cfAccess` 非空）时生效，否则 404。
   - 参数 `state`：必须匹配 `^[A-Za-z0-9_-]{32,128}$`，否则 400。
   - 取本次请求的 Access 令牌（优先 `Cf-Access-Jwt-Assertion` 头，没有再取 `CF_Authorization` Cookie），**用与 `cf-access.ts` 相同的校验逻辑重新校验一次**（签名、aud、身份允许名单），并要求剩余有效期 ≥ 60 秒；不通过返回 401。如需复用 `cf-access.ts` 的校验，只在该文件末尾新增一个最小的导出函数，不改已有逻辑（另一个任务正在改这个文件，要尽量少碰）。
   - 回跳地址固定为 `<scheme>://auth?state=<state>&token=<JWT>`，`scheme` 来自环境变量 `CRYBOT_APP_SCHEME`，默认 `crybot`，只允许 `^[a-z][a-z0-9+.-]{1,30}$`，不接受请求参数里传回跳地址（防开放重定向）。
   - 返回 200 的小 HTML 页（不用 302，部分浏览器拦截无用户手势的自定义协议跳转）：`<meta http-equiv="refresh">` 自动跳到回跳地址，同时显示一个「返回 Cry Bot / Return to Cry Bot」按钮（链接同一地址），中英文按 `Accept-Language` 选择。不能用内联脚本（注意服务端 CSP）。响应头：`cache-control: no-store`、`referrer-policy: no-referrer`、`x-frame-options: DENY`。HTML 里的值都要转义。
   - 补 `docs/self-hosting.md` 一小段：手机 App 登录接力是什么、`CRYBOT_APP_SCHEME`。
2. **iOS**：
   - `mobile/ios/project.yml` 的 CryBot info 里加 `CFBundleURLTypes`，scheme 为 `crybot`。
   - 主框架或弹窗要去往「登录主机」（`loginHosts` 内且不是服务器主机）时：取消这次内嵌导航，改为启动 `ASWebAuthenticationSession`（`callbackURLScheme: "crybot"`，`prefersEphemeralWebBrowserSession = false`，提供 presentationContextProvider），打开 `<服务器>/auth/app-handoff?state=<随机 32 字节 base64url>`。同一时间只开一个会话。
   - 回调两条路都要收：认证会话的 completionHandler，以及 `AppDelegate` 的 `application(_:open:options:)`（身份源 App 授权后落在 Safari，Safari 打开 `crybot://auth` 时走这条）。两条路都只接受 `host == "auth"` 且 `state` 等于当前挂起的 state（state 用一次即作废，挂起的 state 存内存即可，App 被杀后重来一次登录可接受）；收到有效回调后若认证会话还开着就 cancel 掉。
   - 把 `token` 写进 `webView.configuration.websiteDataStore.httpCookieStore`：名 `CF_Authorization`，域为服务器主机，Path `/`，Secure，HttpOnly，过期时间取 JWT payload 的 `exp`（只做 base64url 解码取 exp，不校验签名）；写完后加载服务器地址。
   - 用户取消或失败：显示现有错误面板，并有「登录」按钮可重试。新文案中英文（`en.lproj`、`zh-Hans.lproj`）都补。
   - `loginHosts` 为空（自托管没配）时行为与现在完全一样。其余外链仍交给系统浏览器。
3. **安卓**：
   - `AndroidManifest.xml`：`MainActivity` 设 `android:launchMode="singleTask"`，加 `VIEW` + `DEFAULT` + `BROWSABLE`、`scheme="crybot" host="auth"` 的 intent-filter。
   - 与 iOS 同样的触发条件：去往登录主机时取消内嵌导航，用系统浏览器（`Intent.ACTION_VIEW` + `CATEGORY_BROWSABLE`，**不要引入 androidx.browser 等新依赖**）打开接力地址；挂起的 state 存 SharedPreferences（App 被系统回收后也能接上），用一次作废。
   - `onCreate` / `onNewIntent` 收 `crybot://auth`，校验 state，用 `CookieManager` 给服务器地址写 `CF_Authorization`（Path=/; Secure; HttpOnly; Max-Age 按 exp 计算），`flush()` 后加载服务器地址。
   - 新文案中英文都补（values 和 values-zh 或现有中文目录）。
4. **测试**：
   - 新增 `server/app-handoff.test.ts`（行为测试）：Access 未启用 404；state 非法 400；令牌缺失/无效/快过期 401；正常时 200、HTML 里回跳地址是 `crybot://auth?state=...&token=...` 且已转义、三个响应头齐全；`CRYBOT_APP_SCHEME` 非法时回落默认；请求参数无法改变回跳 scheme。
   - 若改了 `cf-access.ts`，跑一遍它现有测试。
   - Swift / Kotlin 本机无法编译，写完自己逐行检查一遍语法和 API 签名（iOS 部署目标看 project.yml），在汇报里说明。

## 范围
- 可以改：`server/app-handoff.ts`（新）、`server/app-handoff.test.ts`（新）、`server/index.ts`（只加挂载几行）、`server/cf-access.ts`（只在末尾加导出，可选）、`mobile/ios/project.yml`、`mobile/ios/CryBot/*.swift`、`mobile/ios/CryBot/*.lproj/*`、`mobile/android/app/src/main/**`、`docs/self-hosting.md`。
- 不要改：`electron/`、`src/`、`.github/`、`server/routes/instances.ts`（其他任务在改）。

## 验收标准
- [ ] `server/app-handoff.test.ts` 通过；改了 `cf-access.ts` 时其测试也通过（逐个文件跑，`--maxWorkers=1`）。
- [ ] `loginHosts` 为空时两端行为不变。
- [ ] 回跳 scheme 不受请求参数影响；state 校验在服务端格式校验 + App 端等值校验两层都有。
- [ ] 代码、测试、文档里没有内部域名、IP、邮箱、人名、真实实例 id。

## 约束
- 不要 git 提交。沙箱禁网；不加任何新依赖。
- 不要跑完整 `pnpm test`，只跑上面列的测试文件。
- 只写必要的注释。测试测行为，断言具体期望值。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1218-mobile-login-handoff/report.md`。用中文：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果。
3. Swift / Kotlin 没法编译的部分你检查了什么、哪里没把握。
4. 需要协调者处理的事。
