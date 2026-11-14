# T-1220 手机登录回跳改用 Universal Links / App Links（关掉同机恶意 App 主动接力）

前置任务 T-1218 已合入 main（说明和报告在 `docs/tasks/T-1200/T-1218-mobile-login-handoff/`，先读 `brief.md`、`r2.md`、`r3.md`、`report.md`）。现状：`server/app-handoff.ts` 的接力页让用户亲手点按钮，回跳到 `crybot://auth?v=1&state&epk&iv&ct`（ECDH P-256 + AES-GCM 加密，协议 v1 不改）。残余风险（安全审查「中」）：同机恶意 App 注册 `crybot://`，自带公钥主动打开接力页，用户一点按钮，恶意 App 就拿到加密给它自己的 JWT。

本任务的思路：回跳改成只有我们签名的 App 才能接的 **https 链接**（iOS Universal Links、安卓 App Links，系统按域名上的验证文件把链接只交给指定团队 ID / 签名证书的 App）。启用后服务端**不再输出任何自定义 scheme 回跳**，恶意 App 主动发起也只会把密文送到我们的 App，被 state 校验丢弃。

关键限制（必须遵守）：iOS Safari 里点「同一域名」的 Universal Link 不会唤起 App。接力页在服务器主机上，所以回跳必须用**另一个主机名**（下称「回跳主机」，例如服务器是 `crybot.example`，回跳主机是 `crybot-app.example`），由部署方把它指到同一个服务进程。该主机不在 Cloudflare Access 后面，所以它上面要用到的路由必须在 Access 检查之前处理。

本仓库是公开仓库：代码、测试、文档不能出现内部域名、IP、邮箱、人名、团队 ID、证书指纹、真实实例 id；测试用 `crybot.example`、`crybot-app.example`、`ABCDE12345.com.example.app`、全 `AA:` 这种占位。

## 要做的事

### 1. 服务端（新逻辑尽量放新文件 `server/app-links.ts`，`server/index.ts` 只加挂载几行；index.ts 受文件行数棘轮约束，尽量不净增行）
新环境变量（全部可选，不配时行为与现在**完全一样**）：
- `CRYBOT_APP_LINK_ORIGIN`：回跳主机的 origin，必须是 `https://<host>`（可带端口，不带路径/查询/片段，用 `new URL` 解析后比较 `origin` 等于原值去掉末尾 `/`），不合法视为未配置并在启动时打一条警告日志。
- `CRYBOT_APPLE_APP_IDS`：逗号分隔的 `<团队ID>.<bundle id>`，每项匹配 `^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$`，不合法项丢弃。
- `CRYBOT_ANDROID_PACKAGE`：安卓包名，匹配 `^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$`。
- `CRYBOT_ANDROID_CERT_SHA256`：逗号分隔的签名证书 SHA-256 指纹，每项规范化为大写冒号格式并匹配 `^([0-9A-F]{2}:){31}[0-9A-F]{2}$`，不合法项丢弃。

路由（GET，都放进 `index.ts` 现有 `publicProbe` 判断里，或在 Access 检查之前单独处理；不要改 `cf-access.ts`）：
- `GET /.well-known/apple-app-site-association`：`CRYBOT_APPLE_APP_IDS` 有有效项时返回 200、`content-type: application/json`、不重定向，内容：
  `{"applinks":{"details":[{"appIDs":[...],"components":[{"/":"/auth/app-return","comment":"Cry Bot login return"}]}]},"webcredentials":{"apps":[...]}}`；否则 404。
- `GET /.well-known/assetlinks.json`：包名和至少一个指纹都有效时返回 200、JSON：
  `[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"...","sha256_cert_fingerprints":[...]}}]`；否则 404。
- `GET /auth/app-return`：App 没装或链接验证失败时用户会落到这里。返回 200 的小 HTML 说明页（中英文按 `Accept-Language`，沿用 `app-handoff.ts` 的 `prefersChinese` 写法，可导出复用）：中文「没能自动回到 Cry Bot App。请确认手机上已安装最新版 Cry Bot App，回到 App 重新点登录。」英文对应。**不回显任何查询参数**，无内联脚本，响应头 `cache-control: no-store`、`referrer-policy: no-referrer`、`x-frame-options: DENY`。未配置 `CRYBOT_APP_LINK_ORIGIN` 时 404。
- 这三个路由不需要 Access 身份，也不读写会话。

`/auth/app-handoff` 改动：
- 配了有效 `CRYBOT_APP_LINK_ORIGIN` 时，按钮链接改为 `<origin>/auth/app-return?<同样的加密参数>`，**此时不输出 `crybot://` 或 `CRYBOT_APP_SCHEME` 的任何回跳**。
- 未配置时完全保持现状（`crybot://auth?...`）。
- 其他（亲手确认、账号显示、提示文案、三个响应头、不出现明文 JWT）不变。

`docs/self-hosting.md`：在手机登录接力一节补「回跳链接（推荐）」：为什么要单独的回跳主机、四个环境变量、回跳主机需要在 Access 之外可直接访问且只放这三个路径（建议在反向代理/隧道上只放行 `/.well-known/apple-app-site-association`、`/.well-known/assetlinks.json`、`/auth/app-return`）、iOS 需要 Associated Domains 能力、安卓签名指纹怎么取（`keytool -list -v` / `apksigner verify --print-certs`）、启用后同机恶意 App 主动发起的风险被消除；未启用时仍是 r3 写的残余风险。

### 2. iOS（`mobile/ios`）
- `project.yml`：新增构建设置 `CRYBOT_APP_LINK_HOST`（默认 `""`），注入 Info.plist 同名键；新增 `CODE_SIGN_ENTITLEMENTS: $(CRYBOT_IOS_ENTITLEMENTS)`（默认空，不配时不带任何新能力，保证没开 Associated Domains 的描述文件仍能签名）。新增文件 `CryBot/CryBot-AppLinks.entitlements`，`com.apple.developer.associated-domains` = [`applinks:$(CRYBOT_APP_LINK_HOST)`, `webcredentials:$(CRYBOT_APP_LINK_HOST)`]，由部署方设 `CRYBOT_IOS_ENTITLEMENTS=CryBot/CryBot-AppLinks.entitlements` 启用。
- 运行时「回跳链接模式」= Info.plist 的 `CRYBOT_APP_LINK_HOST` 非空。此模式下：
  - iOS 17.4 及以上：`ASWebAuthenticationSession(url:callback: .https(host: linkHost, path: "/auth/app-return"), completionHandler:)`。
  - 低于 17.4：不用认证会话，`UIApplication.shared.open(handoffURL)` 交给 Safari，回跳经 Universal Link 回到 App。
  - `AppDelegate` 增加 `application(_:continue:restorationHandler:)`，只处理 `NSUserActivityTypeBrowsingWeb`，URL 必须 `scheme == "https"`、`host == linkHost`、`path == "/auth/app-return"`，然后走现有的 state 校验 + 解密 + 写 Cookie 流程（复用现有代码，不复制）。
  - 此模式下收到 `crybot://auth` 一律忽略（不清挂起状态、不报错）。
- 非回跳链接模式：行为与现在完全一样。
- 部署目标保持 iOS 16.0。新 API 用 `if #available(iOS 17.4, *)`。

### 3. 安卓（`mobile/android`）
- Gradle 读 `CRYBOT_APP_LINK_HOST`（同其他 `configured(...)` 写法），写进 `BuildConfig.CRYBOT_APP_LINK_HOST`，并设 `manifestPlaceholders`：`crybotAppLinkHost`（未配置时用 `invalid.invalid`）、`crybotAppLinksEnabled`（`"true"`/`"false"`）。
- `AndroidManifest.xml` 加一个指向 `MainActivity` 的 `activity-alias`，`android:enabled="${crybotAppLinksEnabled}"`、`android:exported="true"`，带 `android:autoVerify="true"` 的 intent-filter：VIEW、DEFAULT、BROWSABLE，`scheme="https"`、`host="${crybotAppLinkHost}"`、`path="/auth/app-return"`。不要给 `MainActivity` 本身加 https 过滤器。
- `MainActivity` 收到 https 回跳（`onCreate`/`onNewIntent`）：host、path 精确匹配后走现有 state 校验 + 解密 + 写 Cookie 流程。回跳链接模式（`BuildConfig.CRYBOT_APP_LINK_HOST` 非空）下忽略 `crybot://auth`；非该模式行为不变。
- 不引入新依赖。

### 4. 测试
- 新增 `server/app-links.test.ts`（行为测试，断言具体值）：三个路由未配置时 404；AASA/assetlinks 的 JSON 内容和 `content-type`；非法 App ID/包名/指纹被丢弃、小写或无冒号指纹被规范化；`/auth/app-return` 不回显查询参数（用含 `<script>` 的参数断言输出里没有）、三个响应头、中英文案；`CRYBOT_APP_LINK_ORIGIN` 非法值（http、带路径、带查询）视为未配置。
- `server/app-handoff.test.ts` 补：配置回跳主机时按钮指向 `https://crybot-app.example/auth/app-return?v=1&state=...`，HTML 里不出现 `crybot://`，即便同时设了 `CRYBOT_APP_SCHEME`；未配置时原有断言照旧通过。
- 一条集成用例：Access 启用时，这三个路由不带 Access 令牌也能拿到 200（找现有测试里起服务/调 `index.ts` 路由的写法，例如 `server/index.test.ts` 或 publicProbe 相关测试；找不到合适的就在报告里说明）。
- 逐个文件跑：`PATH=/opt/node24/bin:$PATH pnpm vitest run <文件> --maxWorkers=1 --configLoader runner`，跑 `server/app-links.test.ts`、`server/app-handoff.test.ts`、`scripts/testing/file-size-ratchet.test.ts`、`src/locales/vocabulary.test.ts`（若改到 index.ts 或文案）；再跑 `pnpm exec oxlint --deny-warnings <改过的 ts 文件>` 和 `git diff --check`。
- Swift / Kotlin / Gradle 本机无法编译：写完逐行核对语法和 API 签名（`ASWebAuthenticationSession.Callback.https(host:path:)` 是 iOS 17.4 API；`activity-alias` 的 `targetActivity` 写全类名），在报告里说明哪里没把握。

## 范围
- 可以改：`server/app-links.ts`（新）、`server/app-links.test.ts`（新）、`server/app-handoff.ts`、`server/app-handoff.test.ts`、`server/index.ts`（只加挂载/公开路径判断）、`mobile/ios/project.yml`、`mobile/ios/CryBot/*`（含新 entitlements 文件）、`mobile/android/app/build.gradle.kts`（或现有 gradle 文件）、`mobile/android/app/src/main/**`、`docs/self-hosting.md`。
- 不要改：`server/cf-access.ts`、`electron/`、`src/`（文案测试除外不改）、`.github/`、加密协议 v1。

## 验收标准
- [ ] 不配任何新环境变量时，服务端和两端 App 行为与 main 完全一致（现有 app-handoff 测试原样通过）。
- [ ] 配了 `CRYBOT_APP_LINK_ORIGIN` 后接力页只输出 https 回跳，任何情况下不出现自定义 scheme。
- [ ] 两个验证文件内容符合 Apple / Google 规定格式，且在 Access 启用时无需登录即可获取，不重定向。
- [ ] `/auth/app-return` 不回显参数。
- [ ] iOS 未设 `CRYBOT_IOS_ENTITLEMENTS` 时不带新能力；安卓未配置时 alias 为 disabled。
- [ ] 列出的测试文件全部通过，oxlint 无警告，文件行数棘轮不超。
- [ ] 公开仓库无内部信息。

## 约束
- 不要 git 提交。沙箱禁网；不加任何新依赖。
- 不要跑完整 `pnpm test`，只跑上面列的文件。
- 只写必要的注释。测试测行为，断言具体期望值。

## 汇报格式
报告写到本任务文件夹的 `report.md`（`docs/tasks/T-1200/T-1220-app-links/report.md`）。用中文：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果。
3. Swift / Kotlin 没法编译的部分你检查了什么、哪里没把握。
4. 部署方要做的事（回跳主机、Access、Apple 能力、环境变量），给出清单。
