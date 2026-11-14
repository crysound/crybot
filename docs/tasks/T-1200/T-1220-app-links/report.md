# T-1220 手机登录回跳链接报告

## 1. 修改文件

| 文件 | 修改内容 |
| --- | --- |
| `server/app-links.ts` | 新增 origin 校验、启动警告、Apple/Android 验证文件和不回显参数的中英文回跳说明页，并承接原有语言选择函数供接力页复用。 |
| `server/app-links.test.ts` | 新增 36 项行为测试及 1 项真实 `index.ts` 隔离服务集成用例，覆盖配置清洗、具体 JSON、响应头、文案、无参数回显和 Access 前公开挂载。 |
| `server/app-handoff.ts` | 有效 origin 优先生成 HTTPS 回跳，无效或未配置时保留原 scheme 行为，协议 v1、人工确认、账号提示与安全响应头不变。 |
| `server/app-handoff.test.ts` | 保留原有 60 项测试，增加 5 项 HTTPS 回跳、自定义 scheme 被忽略及非法 origin 回落测试，继续用客户端私钥解密验证原 JWT。 |
| `server/index.ts` | 仅新增模块导入、初始化和 Access 检查前的挂载，并移除三个空行，行数相对 HEAD 净增为零。 |
| `mobile/ios/project.yml` | 新增默认空的链接主机和 entitlements 构建设置、Info.plist 主机键，并仅为手机 target 配置可选签名 entitlements。 |
| `mobile/ios/CryBot/CryBot-AppLinks.entitlements` | 新增由构建主机展开的 `applinks` 和 `webcredentials` 能力文件。 |
| `mobile/ios/CryBot/ViewController.swift` | 链接模式下按系统版本选 HTTPS 认证会话或 Safari，精确匹配回跳主机/路径后复用 state、解密和 Cookie 流程，并忽略旧 scheme。 |
| `mobile/ios/CryBot/AppDelegate.swift` | 新增 BrowsingWeb 用户活动入口，转交统一回调处理器。 |
| `mobile/android/app/build.gradle.kts` | 按现有 `configured(...)` 方式注入主机 BuildConfig 和 alias 占位配置，未配置时主机为 `invalid.invalid`、alias 禁用。 |
| `mobile/android/app/src/main/AndroidManifest.xml` | 为 MainActivity 增加独立、可禁用的 HTTPS App Links alias，精确限制回跳路径。 |
| `mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt` | 两个 Intent 入口共用 HTTPS/旧 scheme 模式判断与原解密流程，链接模式忽略旧 scheme，冷启动也不因此显示登录失败。 |
| `docs/self-hosting.md` | 补充推荐回跳链接、不同主机限制、四个服务端变量、Access 路径限制、两端签名配置及未启用时的残余风险。 |
| `docs/tasks/T-1200/T-1220-app-links/report.md` | 记录实现、验证结果、环境及基线阻碍、平台待验项和部署清单。 |

没有修改 `server/cf-access.ts`、加密协议 v1、`electron/`、`src/`、`.github/` 或依赖清单，没有 git 提交。新增测试和文档只使用公开占位域名、App ID、包名及重复字节证书摘要。未配置新变量时，两端保留旧 scheme 分支，服务端现有接力测试全部通过；真实手机行为尚未验证。

## 2. 验证命令和结果

工作树最初没有 `node_modules`，首条 Vitest 命令报 `Command "vitest" not found`；随后在工作树建立到仓库已有依赖目录的符号链接，没有联网或安装依赖。按要求逐个文件执行，未运行完整测试或项目 typecheck：

```sh
PATH=/opt/node24/bin:$PATH pnpm vitest run server/app-links.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm vitest run server/app-handoff.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm vitest run src/locales/vocabulary.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm exec oxlint --deny-warnings server/app-links.ts server/app-links.test.ts server/app-handoff.ts server/app-handoff.test.ts server/index.ts
git diff --check
```

| 检查 | 结果 |
| --- | --- |
| `server/app-links.test.ts` | **36 通过、1 跳过**；跳过的是隔离真实服务集成用例，监听探测返回 `EPERM`，不能算集成验证通过。 |
| `server/app-handoff.test.ts` | **65/65 通过**，包括原有 60 项用例、协议固定向量、无明文 JWT 和新增 HTTPS 回跳断言。 |
| `scripts/testing/file-size-ratchet.test.ts` | **失败**：测试调用 `git ls-files` 时出现 `spawnSync git EPERM`；另做静态核对发现基线已有超限，见下表。 |
| `src/locales/vocabulary.test.ts` | **1 通过、5 失败**：既存规则把 `Cry Bot Cloud` 同时当作禁用词和推荐词；`CRY` 条目的正则实际匹配 `OMB`，导致自检失败；同时缺少 `apps/docs/content`。测试及相关既存文案未修改。 |
| oxlint | **通过**，修改的五个 TypeScript 文件无警告。 |
| `git diff --check` | **通过**。 |

行数使用 Python 读取当前文件换行数，并与 `git show HEAD:<文件>` 及棘轮表比对；以下超限全部在本任务修改前已存在，没有修改棘轮或清理其他任务代码：

| 文件 | HEAD | 工作树 | 上限 |
| --- | ---: | ---: | ---: |
| `server/index.ts` | 15562 | 15562 | 15515 |
| `server/store.ts` | 2295 | 2295 | 2291 |
| `src/components/ComputerPanel.tsx` | 1785 | 1785 | 1782 |
| `server/config.ts` | 1251 | 1251 | 1245 |
| `src/components/ChatView.tsx` | 1295 | 1295 | 1293 |
| `src/components/GroupView.tsx` | 1222 | 1222 | 1220 |
| `src/components/LocalComputerSection.tsx` | 1439 | 1439 | 1437 |

新增路由行为测试使用内存 HTTP fixture；接力测试沿用独立临时会话目录、测试签名密钥和假 JWKS。集成用例使用 `verificationServerEnvironment`、`verificationServerArgs` 启动隔离的 `index.ts`，配置测试 Access 参数和未知 fixture driver，不继承真实凭证；分别在不带令牌、带无效断言时要求三个路径均为 200、无重定向和无 Set-Cookie，并要求受保护接力路径对无效断言返回原有 401 JSON。仅当监听明确被 `EPERM`/`EACCES` 禁止时跳过，其余启动或断言错误会失败。本环境在监听探测阶段即受阻，未启动该子进程。

`AGENTS.md` 引用的 `docs/verification/README.md` 在当前工作树中不存在；已参考仓库现有 `server/verification-fixture.e2e.test.ts`、`server/index.test.ts` 和 `scripts/control-cry.ts`。还实际尝试了仓库标准隔离启动器：

```sh
/opt/node24/bin/node --input-type=module <<'JS'
import { launchVerificationServer } from './scripts/control-cry.ts';
try {
  const fixture = await launchVerificationServer({}, AbortSignal.timeout(20000));
  try {
    const response = await fetch(fixture.info.url + '/auth/app-return');
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
    console.log('Isolated unconfigured app return: 404');
  } finally { await fixture.close(); }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
JS
```

结果：启动器在分配端口时失败，`no free port block for offsets 0,1 in 19600..22600`。没有访问用户实时应用或数据，也没有完成真实监听服务、Cloudflare 边缘或手机端到端验证。

额外配置检查使用 Python 标准库 `xml.etree.ElementTree`、`plistlib` 和已有 Node `yaml` 包：成功解析 manifest、entitlements、project.yml，断言 alias 的全类名、enabled 占位、autoVerify、scheme/host/path，确认 MainActivity 本身没有 HTTPS filter，确认两条 Associated Domains、默认空设置、手机部署目标 16.0，以及 watch target 不含新增签名设置。逐行检查 Gradle 未配置分支输出 `invalid.invalid` / `false`。

**验收状态：功能行为测试与 lint 已通过，但全部指定测试通过、棘轮不超限、真实服务集成和两端编译/真机验证尚未满足。** 需在允许监听/子进程的环境补跑集成，并由对应维护者解决上述仓库基线问题；没有用跳过规则或提高行数上限掩盖这些失败。

## 3. Swift / Kotlin / Gradle 静态检查与不确定部分

本机无 `swift`、`kotlinc`、`gradle`、`xcodebuild` 或 `xcodegen`，没有编译、生成 Xcode 工程或运行模拟器/真机。

- Swift 核对 `ASWebAuthenticationSession.CompletionHandler` 和两种初始化签名；HTTPS 分支使用 `ASWebAuthenticationSession(url:callback:completionHandler:)`、`.https(host:path:)`，严格放在 `if #available(iOS 17.4, *)` 内。低版本链接模式只调用 `UIApplication.shared.open(_:options:completionHandler:)`，不创建认证会话；打开失败时在主线程按现有失败流程处理。
- 核对 `application(_:continue:restorationHandler:)` 的 `NSUserActivity` 和 `@escaping ([UIUserActivityRestoring]?) -> Void` 签名；只接受 BrowsingWeb 和 HTTPS，再由共享处理器精确校验配置主机和 `/auth/app-return`。非链接模式继续只认旧 scheme。
- iOS 链接模式收到 `crybot://auth` 立即忽略，返回已处理，不动 state/私钥，也不让 completion 落入失败兜底；合法 HTTPS 回调沿用原有唯一 state 校验、先消费后取消认证会话、CryptoKit 解密和 Cookie 写入，不复制解密逻辑。
- 检查 iOS 默认 `CRYBOT_IOS_ENTITLEMENTS` 为空，`CODE_SIGN_ENTITLEMENTS` 只在手机 target 引用它；能力文件需部署方显式选择，未改变 watch target 或 iOS 16.0 部署目标。
- Kotlin 核对 `onCreate` / `onNewIntent` 仍调用同一 `consumeAuthIntent()`，并在 finally 清掉 Intent；回跳入口按 BuildConfig 是否非空选择 HTTPS 或旧 scheme，HTTPS 精确校验 host/path 后才读取和消费 state/私钥。旧 scheme 在链接模式不进入解密或失败分支，冷启动的普通页面选择也避免因它显示登录失败。
- Gradle 沿用配置读取和 Java 字符串转义方式，BuildConfig 与 manifestPlaceholders 共用同一主机值；alias 在 MainActivity 声明后，`targetActivity` 为完整类名，只有 alias 的 filter 有 HTTPS 和 autoVerify，未增加依赖。

仍需平台工具确认：Xcode SDK 对新 Callback API 的实际编译及 XcodeGen 展开/签名后的 entitlements；未开能力的原描述文件是否能正常签名；iOS 17.4+ 认证会话与 Universal Link 双入口/取消时序、iOS 16.0–17.3 Safari 路由；安卓 manifest 合并、disabled alias 是否保持旧路由、不同系统的域名验证与 alias/singleTask 冷热启动行为；错误 state 或旧 scheme 后再收到合法回跳的完整流程、两端 Cookie 注入。静态检查不能替代这些结果。

## 4. 部署方清单

- [ ] 为回跳配置不同于接力主机的域名，例如接力主机 `crybot.example`、回跳主机 `crybot-app.example`；将它们指向同一服务进程，回跳主机配置有效 HTTPS 证书，不能只换端口或路径。
- [ ] 回跳主机置于 Access 之外，并在反向代理/隧道只放行 `/.well-known/apple-app-site-association`、`/.well-known/assetlinks.json`、`/auth/app-return`；拒绝其他路径，保持原接力主机与 `/auth/app-handoff` 的 Access 保护。
- [ ] 服务端配置 `CRYBOT_APP_LINK_ORIGIN=https://crybot-app.example`，以及实际的 `CRYBOT_APPLE_APP_IDS`、`CRYBOT_ANDROID_PACKAGE`、`CRYBOT_ANDROID_CERT_SHA256`；测试示例身份不能用于真实发行。
- [ ] iOS 设置 `CRYBOT_APP_LINK_HOST=crybot-app.example`、`CRYBOT_IOS_ENTITLEMENTS=CryBot/CryBot-AppLinks.entitlements`，在 Apple Developer 开启实际 App ID 的 Associated Domains 并更新描述文件；核对签名中的 applinks/webcredentials 域名与 AASA 身份一致。
- [ ] 安卓用 Gradle 属性或环境变量配置同一 `CRYBOT_APP_LINK_HOST`，使用 `keytool -list -v -keystore <签名库> -alias <签名别名>` 或 `apksigner verify --print-certs <发行包.apk>` 获取实际安装包签名证书 SHA-256；商店代签使用 App signing 证书，轮换时可配置多个指纹。
- [ ] 不带 Access 身份访问两个验证文件，检查 200、`application/json`、无重定向及真实签名身份；访问回跳路径确认说明页不回显参数。
- [ ] 服务端与两端 App 同步启用，在签名真机验证跨主机回跳、未安装/关联失败说明页、旧版 iOS Safari、安卓冷启动/热启动、错误 state、旧 scheme 忽略与后续合法回跳。
- [ ] 未启用链接模式时保留人工确认，明确仍有同机恶意 App 主动发起接力的残余风险；只有正确配置并完成系统域名验证的链接模式才消除该攻击的令牌交付路径。

## 第 2 轮

### 修改内容

| 审核项 | 文件:行号 | 本轮修改 |
| --- | --- | --- |
| Safari 放弃后允许重新登录 | `mobile/ios/CryBot/ViewController.swift:155`、`:171`、`:203` | 链接模式且 `authenticationSession == nil` 时，`startLogin()` 允许替换挂起登录，先清掉旧 state、私钥和时间，再生成新的随机 state/密钥。Safari 分支记录 `browserLoginStartedAt`，打开浏览器前显示带「登录」按钮的错误面板，返回 App 即可重试。旧打开结果和旧回跳仍受 state 匹配保护。 |
| Safari state 过期和网络错误面板 | `mobile/ios/CryBot/ViewController.swift:159`、`:165`、`:239`、`:359`、`:365` | 统一清理三个挂起字段；参照安卓在重试、合法主机/路径的回跳处理、两个网络失败入口按需检查有效期，满 10 分钟或时钟回拨即清除。网络失败不再被无认证会话的链接登录压住；未过期挂起登录显示「登录」，已过期显示普通加载「重试」。成功消费和失败也清掉开始时间。 |
| 主机名大小写 | `mobile/ios/CryBot/ViewController.swift:237`；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:411` | iOS 的 URL host 和配置 host 均 `lowercased()`；安卓均 `lowercase(Locale.US)` 后比较，scheme/path 和 state 校验保持原限制。 |
| 443 端口部署要求 | `docs/self-hosting.md:37`、`:43`；`server/app-links.ts:26`；`server/app-links.test.ts:106`、`:112` | 文档要求回跳主机用默认 HTTPS 443，origin 不带端口。有效但带非 443 端口的 origin 在初始化时警告一次；不改 origin 校验、保留非标准端口地址和已有回落行为。测试核对默认端口无警告、非 443 警告一次、原 origin 保留且说明页仍为 200。 |
| 集成测试分组和失败行为 | `server/app-links.test.ts:1`；`server/app-links.e2e.test.ts:30` | 将原完整 `index.ts` 子进程用例及所需导入/fixture 常量迁到独立 e2e 文件，单元文件只留内存 HTTP 用例。监听探测直接 reject，删除 EPERM/EACCES 自动跳过分支。仍用隔离临时目录、`verificationServerEnvironment({}, ...)` 和 `verificationServerArgs(...)`，保留无 Access 令牌/无效令牌下公开路由及受保护路由的断言和清理。 |

已核对 `vite.config.ts:57`、`scripts/testing/host-e2e.ts` 和 `.github/workflows/ci.yml:24`：新增文件由现有 include 自动发现，按 `.e2e.test.ts` 规则进入 Linux portable e2e 分组；host-only 分组不运行此类测试。没有修改 CI、构建或分组配置，也没有新增 skip/only/todo。

复用 `T-1220-app-links` 分支及第 1 轮未提交改动，本轮未改 `server/index.ts`；相对 HEAD 仍是 3 行增加、3 行删除，15562 → 15562，净增 **0 行**。未提交、未安装依赖、未运行完整 `pnpm test`。

### 验证命令和结果

以下三条验收原命令按文件顺序串行执行；每条遇到相同配置加载限制后，先用下方对应的 runner 命令补跑，再继续下一个文件：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run server/app-links.test.ts --maxWorkers=1
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run server/app-links.e2e.test.ts --maxWorkers=1
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run server/app-handoff.test.ts --maxWorkers=1
```

三条均在加载 Vite 配置时遇到 `EROFS: read-only file system`：现有 `node_modules` 指向工作树外的共享依赖目录，默认配置加载器无法写入 `node_modules/.vite-temp/`。没有改依赖或构建配置，补跑仅增加原 brief 已使用的 `--configLoader runner`：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run server/app-links.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run server/app-links.e2e.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run server/app-handoff.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec oxlint --deny-warnings server/app-links.ts server/app-links.test.ts server/app-links.e2e.test.ts server/app-handoff.ts server/app-handoff.test.ts server/index.ts
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec tsc -p tsconfig.server.json
git diff --check
```

| 检查 | 结果 |
| --- | --- |
| `server/app-links.test.ts`（runner） | **36/36 通过**，纯单元；默认端口与非标准端口行为断言通过。 |
| `server/app-links.e2e.test.ts`（runner） | **1 失败、0 跳过**；隔离监听探测明确报 `listen EPERM: operation not permitted 127.0.0.1`，尚未启动 `index.ts` 子进程，不能算集成通过。需在允许监听的环境补跑。 |
| `server/app-handoff.test.ts`（runner） | **65/65 通过**。 |
| oxlint（上述六个 TS 文件，含第 1 轮文件） | **通过**，退出码 0，无警告。 |
| `tsc -p tsconfig.server.json` | **通过**，退出码 0。 |
| `git diff --check` | **通过**。 |
| index 行数及测试跳过检查 | Python 比较 `git show HEAD:server/index.ts` 与当前文件换行数，均为 15562；两个 app-links 测试文件均无 `.skip`、`.only`、`.todo`。 |

`AGENTS.md` 引用的 `docs/verification/README.md` 本轮仍不存在，已参考现有 `server/verification-fixture.e2e.test.ts`、`server/boot-readiness.e2e.test.ts` 和隔离启动器实现。所有服务验证均使用内存 fixture 或隔离服务测试入口，没有访问用户实时应用、数据或真实凭证。本轮集成受阻如实记为失败，不通过跳过掩盖。

### 静态核对与真机验证项

本机仍无 Swift/Xcode、Kotlin/Gradle 工具链，仅逐行核对移动端代码；未声称编译或真机通过。

**Safari 取消 → 回 App 重新登录 → 合法回跳** 的代码路径：iOS 16.0–17.3 链接模式在 `ViewController.swift:203` 记录时间、调用 `showError(login: true)` 并打开 Safari；用户放弃 Safari、Access 失败或落到 `/auth/app-return` 说明页后返回 App，现有面板「登录」按钮（`:79`）调用 `startLogin()`（`:171`），无认证会话允许替换旧 state/私钥；WebView 导航到登录主机的入口（`:315`、`:348`）同样调用此方法。第二次请求生成新 state/公钥；旧回跳在 `:241` 的唯一 state 比较处被忽略且不消费新私钥。新合法 Universal Link 经 `AppDelegate.swift:25` 进入 `handleAuthCallback()`（`:232`），校验主机/路径、10 分钟有效期及 state 后消费挂起字段，沿用原解密、JWT 到期校验和 Cookie 注入（`:245`、`:258`），最后加载服务器页面。

需在签名真机上逐项验证：

- [ ] iOS 16.0–17.3：分别模拟 Safari 主动放弃、Access 登录失败、关联验证失败落说明页；回 App 后可直接点「登录」再次打开 Safari。修复关联后完成一次合法回跳，确认无需杀 App 即可登录。
- [ ] 重试后先投递旧 state 回跳，再投递新 state 合法回跳：旧回跳不清掉新登录，新回跳正常写 Cookie；重复新回跳不重复消费。
- [ ] Safari 挂起超过 10 分钟后回跳不能写 Cookie；点击登录产生新 state/私钥并能完成。另核对两个 WebView 网络失败入口均能显示错误面板、重试后进入正常登录。
- [ ] iOS 17.4+ HTTPS 认证会话以及非链接模式：认证期间仍拦截重复登录，取消/失败回到原错误面板，合法回跳保持原完成流程。静态核对确认只有 Safari 分支写入开始时间，认证会话分支不受新增过期处理影响。
- [ ] iOS/安卓：配置主机或回跳 host 混合大小写时正常匹配；不同主机、错误路径、错误 state 仍拒绝或忽略；安卓冷/热启动均覆盖。

部署时仍需以不带端口的 `https://crybot-app.example` 作为回跳 origin，并确认默认 443 上的公开关联文件可访问。
