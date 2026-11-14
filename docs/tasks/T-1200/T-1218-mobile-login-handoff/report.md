# T-1218 手机端登录接力报告

## 1. 修改文件

| 文件 | 修改内容 |
| --- | --- |
| `server/app-handoff.ts` | 新增接力处理器，校验 Access 开关、state、JWT 和剩余有效期，以固定 scheme 输出无脚本的中英文回跳页及安全响应头。 |
| `server/app-handoff.test.ts` | 新增 41 项行为测试，使用临时会话目录、临时签名密钥、假 JWKS 和内存 HTTP fixture。 |
| `server/cf-access.ts` | 仅在文件末尾追加独立 JWT 校验器导出，保持原有认证和会话逻辑不变。 |
| `server/index.ts` | 增加处理器初始化和 Access 检查后的 GET 挂载，Access 拒绝的接力请求也交由处理器复验并返回规定状态。 |
| `mobile/ios/project.yml` | 为 CryBot 注册 `crybot` URL scheme。 |
| `mobile/ios/CryBot/ViewController.swift` | 登录主机导航和弹窗改走系统认证会话，统一处理一次性 state、JWT Cookie 写入、取消及重试。 |
| `mobile/ios/CryBot/AppDelegate.swift` | 将系统打开的认证回跳 URL 转交给 ViewController。 |
| `mobile/ios/CryBot/en.lproj/Localizable.strings` | 补充英文登录按钮及登录失败文案。 |
| `mobile/ios/CryBot/zh-Hans.lproj/Localizable.strings` | 补充中文登录按钮及登录失败文案。 |
| `mobile/android/app/src/main/AndroidManifest.xml` | 设置 singleTask 并注册 `crybot://auth` 的可浏览 VIEW intent-filter。 |
| `mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt` | 用系统浏览器接力登录，持久化 state 和服务器绑定，在两个 Intent 入口消费回调并写 Cookie，补充弹窗拦截及登录重试。 |
| `mobile/android/app/src/main/res/values/strings.xml` | 补充英文登录按钮及登录未完成文案。 |
| `mobile/android/app/src/main/res/values-zh/strings.xml` | 补充中文登录按钮及登录未完成文案。 |
| `docs/self-hosting.md` | 说明手机登录接力、自动跳转的手动兜底及 `CRYBOT_APP_SCHEME` 配置。 |
| `docs/tasks/T-1200/T-1218-mobile-login-handoff/report.md` | 记录修改、验证结果和待协调事项。 |

没有新增依赖，没有执行 git 提交，没有修改禁止范围内的文件；原有任务 brief 未改动。

## 2. 验证命令和结果

按文件分别执行，均为单 worker：

```sh
PATH=/opt/node24/bin:$PATH pnpm vitest run server/app-handoff.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm vitest run server/cf-access.test.ts --maxWorkers=1 --configLoader runner
```

结果：接力测试 **41/41 通过**；原有 Access 测试 **16/16 通过**。未执行完整 `pnpm test` 或其他测试文件。

覆盖 Access 未启用 404，非法、重复、带换行及长度边界 state，缺失/错误令牌，签名、issuer、audience、身份名单、缺失/过期 exp，剩余 59 秒拒绝和 60 秒接受，断言头优先及 Cookie 回退，已有本地/Access 会话不能跳过复验，HTML 中完整转义的回跳地址和同地址按钮，三个指定响应头、无内联脚本、无 302，中英文权重选择，以及 scheme 配置回退和请求参数无法覆盖。

默认命令 `pnpm vitest run server/app-handoff.test.ts --maxWorkers=1` 首次启动失败：默认 Node 为 22，且 Vite 尝试写入只读 `node_modules/.vite-temp`，报 `EROFS`。改用已有 Node 24 和 `--configLoader runner` 后正常运行，未安装任何依赖。

```sh
PATH=/opt/node24/bin:$PATH pnpm exec tsc --ignoreConfig --noEmit --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --skipLibCheck --types node server/app-handoff.ts server/app-handoff.test.ts
PATH=/opt/node24/bin:$PATH pnpm exec oxlint --deny-warnings server/app-handoff.ts server/app-handoff.test.ts server/cf-access.ts
git diff --check
```

结果：相关 TypeScript 文件及其导入通过类型检查，lint 和差异空白检查通过。类型检查曾指出测试构造器将 `null` 写入 `sub`，已改为省略该 claim 后重跑通过。

另用 `python3` 的 `xml.etree.ElementTree.parse` 解析 AndroidManifest 和两个语言的 strings.xml，并检查 iOS 两个 Localizable.strings 的键集合相同且无重复；用已有 `yaml` 包解析 project.yml，确认 CryBot 注册 `crybot` 且部署目标为 iOS 16.0，均通过。人工检查新增域名、邮箱、身份和令牌来源，只使用公开占位及运行时生成的测试材料。

隔离服务启动尝试：

```sh
/opt/node24/bin/node --input-type=module -e 'import { launchVerificationServer } from "./scripts/control-cry.ts"; const fixture = await launchVerificationServer({}); try { const response = await fetch(fixture.info.url + "/auth/app-handoff?state=" + "x".repeat(32)); if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`); console.log("isolated server: Access disabled handoff returns 404"); } finally { await fixture.close(); }'
```

结果：未能启动，端口分配报 `no free port block`；单独尝试监听临时回环端口得到 `EPERM`，确认是沙箱监听限制。`AGENTS.md` 引用的 `docs/verification/README.md` 在当前工作树中不存在。已运行的行为测试采用独立临时目录和内存 HTTP fixture、假 JWKS，不访问网络或用户真实应用及数据；**未完成真实监听服务的集成验证，也未验证真实身份源授权链路**。

## 3. Swift / Kotlin 静态检查和不确定部分

当前环境未编译 Swift/Kotlin，也未运行 iOS/安卓模拟器或真机。已逐行检查新增逻辑及调用位置：

- iOS 部署目标为 16.0；核对 ASWebAuthenticationSession 初始化、非临时浏览会话设置、presentationContextProvider 和 presentationAnchor 签名，AppDelegate URL 入口以及 WKHTTPCookieStore.setCookie completion 调用方式。
- iOS 用安全随机源生成 32 字节 base64url state，内存中同一时间只挂起一项；两个入口统一校验 scheme、host、唯一 state，先消费 state 再取消认证会话，避免重复回调和取消回调覆盖成功结果。
- iOS 校验 JWT 字符形状后仅解码 payload.exp，补齐 base64url padding，设置服务器域、Path、Secure、HttpOnly 和到期时间；先创建未加载服务器的 WebView，Cookie 写入完成后在主线程加载服务器。
- Android minSdk 为 26；核对 onCreate/onNewIntent、WebChromeClient.onCreateWindow/WebViewTransport、Uri 查询参数、SharedPreferences.commit、CookieManager.setCookie 回调及 flush 的 API 用法，没有引入浏览器依赖。
- Android 在打开浏览器前同步保存 state 和服务器地址，回调只接受当前服务器绑定及唯一匹配 state，消费后再写 Cookie；冷启动先处理回调，避免 Cookie 写入前加载服务器，失败页面可重新发起登录。
- 两端排除服务器自身主机，只接管登录主机的主框架和弹窗；空 loginHosts 不触发接力，安卓新增的多窗口设置也只在非空名单时启用，其余外链保留系统处理路径。
- 检查了空/重复 token、非法 JWT 字符、缺失/过期 exp、重复回调、错误 state、用户取消，以及 Cookie 写入期间的重复导航保护。

仍需真机确认：飞书 App → Safari/Chrome → 自定义协议的系统路由、iOS 两种回调到达时序与取消行为、WKWebView 对 HttpOnly Cookie 的实际存储、安卓不同 WebView 版本的弹窗导航回调、浏览器自动跳转限制及手动按钮兜底、安卓进程回收后恢复。以上不能仅凭静态检查保证。

## 4. 需要协调者处理

1. 在具备回环监听权限的环境补跑隔离服务集成验证，并补齐或确认缺失的验证 README；不要对真实用户数据执行验证。
2. 在 Xcode 和 Android SDK 环境编译，两端真机走完整飞书授权链路，并覆盖取消重试、错误 state、重复回跳、空 loginHosts 和安卓进程回收。
3. 合并另一个修改 `cf-access.ts` 的任务时保留本次末尾导出，并确认新的身份校验规则与接力复验一致；本次没有重构已有校验逻辑。
4. 默认发行使用 `crybot`；若部署改设 `CRYBOT_APP_SCHEME`，需同步调整两端协议注册和回调匹配并重新构建。

## 第 2 轮

### 1. 逐项处理结果与文件

- **高风险：回跳明文 JWT。** 两端每次登录都生成新的 P-256 密钥对，把 65 字节 X9.63 未压缩公钥作为无填充 base64url `pk` 发给现有接力路由。服务端严格检查唯一 pk、编码和曲线点，使用每次响应独立的临时密钥、ECDH、HKDF-SHA256 和 AES-256-GCM；salt、AAD 均是 state 的 UTF-8 字节，info 固定为 `crybot-app-handoff-v1`。回跳只输出 `v=1&state=...&epk=...&iv=...&ct=...`，ct 末尾附 16 字节 tag。没有新增接口或依赖，也没有为 Access 增加例外路径。检查了接力生成、校验、解密代码，没有输出 JWT 的日志语句；成功页和回跳 URL 的明文缺失由测试断言。
- **两端解密及一次性消费。** iOS 私钥仅保存在内存，使用 CryptoKit；安卓使用平台 JCA/JCE，自己转换 P-256 点并给坐标补齐到 32 字节，HKDF 手写 extract 和单块 expand。安卓为冷启动恢复在私有 SharedPreferences 保存 PKCS#8 私钥，沿用 manifest 的 `allowBackup=false`。回调先消费 state 并清除保存的私钥，再解密和写 Cookie；重复字段、缺失字段、错误版本或解密失败均进入已有中英文错误面板，保留「登录」重试按钮。没有明文 token 参数兼容分支。
- **低风险：Activity 持有 URL。** `onCreate`、`onNewIntent` 共用 `consumeAuthIntent()`，无论成功、失败还是不接受的回调，都在 `finally` 中执行 `setIntent(Intent())`。
- **审核建议 1：Access 拒绝。** 删除 `server/index.ts` 中 refusal 非空时仍转交接力处理器的特例，保留原有 401/403 JSON 返回。处理器测试改为直接调用处理器，认证会话准备单独进行，不再用忽略 Access refusal 的 fixture 模拟路由挂载。
- **审核建议 2：服务器子路径。** iOS 使用 `percentEncodedPath`，安卓使用 `encodedPath`，去掉原路径末尾的斜杠后追加 `/auth/app-handoff`，保留已有子路径和百分号编码，重建接力查询参数并清除 fragment。
- **审核建议 3：安卓过期状态。** 保存 `login_started_at`，10 分钟到期、时钟回拨、缺失旧格式字段或服务器不匹配时，一起删除 state、服务器绑定、开始时间及私钥。冷启动先清理再决定展示内容；`onNewIntent`、重新发起登录和 `onResume` 也检查过期，过期后恢复正常加载网页。
- **审核建议 4：安卓弹窗。** 记录唯一 popup WebView，有弹窗时拒绝再次创建；导航、`onCloseWindow` 和 Activity 销毁时清理。销毁任务投递到已挂载的 container，避免未挂载的 popup 自身 `post` 等待挂载而不执行。身份源授权取消、冷启动和真实 WebView 事件仍需真机核验。

| 文件 | 本轮修改 |
| --- | --- |
| `server/app-handoff.ts` | 增加合法 P-256 公钥解析和可注入临时私钥、nonce 的纯加密函数，输出加密回跳。 |
| `server/app-handoff.test.ts` | 更新全部成功页断言，增加公钥错误、解密、认证篡改、随机性及固定 v1 向量验证，共 59 项测试。 |
| `server/index.ts` | 仅删除 Access refusal 的接力特例一行。 |
| `mobile/ios/CryBot/ViewController.swift` | 生成和消费内存私钥、发送 pk、CryptoKit 解密、拒绝不合法回调并保留子路径。 |
| `mobile/android/app/src/main/kotlin/com/crysound/crybot/AppHandoffCrypto.kt` | 新增仅依赖平台 API 的 EC 点编码/校验、密钥生成和恢复、HKDF 与 GCM 解密。 |
| `mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt` | 接入加密协议、限时保存和删除私钥、清除 Intent、修复子路径及弹窗生命周期。 |
| `docs/self-hosting.md` | 写明完整 v1 协议、字段字节格式、生命周期和两端 API，链接固定向量及标量导入方法。 |
| `docs/tasks/T-1200/T-1218-mobile-login-handoff/report.md` | 在原报告末尾追加本轮结果和限制。 |

`cf-access.ts` 本轮没有改动；继续复用上一轮的末尾导出。中英文错误面板和登录按钮复用上一轮文案。未修改 brief、用户提供的 r2/review 文件及禁止范围；没有 git 提交。

### 2. 验证命令与结果

按要求一次一个测试文件，使用已有 Node 24：

```sh
PATH=/opt/node24/bin:$PATH pnpm vitest run server/app-handoff.test.ts --maxWorkers=1 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm vitest run server/cf-access.test.ts --maxWorkers=1 --configLoader runner
```

结果：接力 **59/59 通过**，Access **16/16 通过**。调整非法 state 用例使其携带合法 pk、避免错误被其他校验掩盖后，单独重跑接力测试仍为 **59/59 通过**。没有运行 `pnpm typecheck`、完整 `pnpm test` 或其他测试文件。

新增覆盖：pk 缺失、空值、重复、填充、换行、错误长度、压缩点、错误点前缀、零坐标和越界坐标均为 400；成功 HTML 的自动跳转与按钮指向同一已转义 URL，二者均无明文 JWT；对应私钥能解出原始 JWT，另一把私钥不能；单独改变 AAD（HKDF salt 保持原值）不能解密，改变回跳 state 也不能；篡改 epk、iv、ct 均失败；重复请求使用不同临时公钥、nonce、密文。原有 Access 开关、JWT 校验、有效期、头/Cookie 优先级、scheme、语言及响应头测试保留。

`protocolVector` 固定 App 标量 1、服务端标量 2、nonce `000102030405060708090a0b`，记录完整输入、两端公钥、ECDH 共享密钥、AES 密钥及密文/tag；纯加密函数输出与固定答案严格比对。另用 WebCrypto 的 JWK/raw 密钥导入、ECDH、HKDF 和 AES-GCM 独立验证中间值及原始明文，不调用生产加密函数进行解密。向量 JWT 是公开、无有效签名的测试材料，所有身份和域名均为占位。

```sh
PATH=/opt/node24/bin:$PATH pnpm exec oxlint --deny-warnings server/app-handoff.ts server/app-handoff.test.ts
git diff --check
```

结果：lint 和差异空白检查通过。人工检查两端空 loginHosts 的分支、登录错误文案、所有新 API 调用、私钥和 Intent 清理路径、子路径拼接及弹窗销毁。

再次尝试启动仓库提供的隔离服务：

```sh
/opt/node24/bin/node --input-type=module <<'JS'
import { launchVerificationServer } from './scripts/control-cry.ts';
const fixture = await launchVerificationServer({}, AbortSignal.timeout(20000));
try {
  const response = await fetch(fixture.info.url + '/auth/app-handoff?state=' + 'x'.repeat(32));
  if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
  console.log('isolated server: Access disabled handoff returns 404');
} finally {
  await fixture.close();
}
JS
```

结果：启动前分配端口失败，`no free port block for offsets 0,1 in 19600..22600`；随后单独监听系统分配的回环临时端口，返回 `EPERM`。当前工作树仍无 `AGENTS.md` 引用的 `docs/verification/README.md`。因此**没有完成真实监听服务集成验证或真实登录链路验证**。已通过的行为测试使用独立临时会话目录、测试签名密钥、假 JWKS 和内存 HTTP fixture；没有访问网络、用户实时服务或真实数据。

### 3. Swift / Kotlin 静态检查与没把握之处

本机没有可用的 Swift/Kotlin 编译工具及平台 SDK，未编译或运行两端。逐行按 API 签名检查：

- iOS 部署目标 16.0 满足 CryptoKit 可用版本；检查 `P256.KeyAgreement.PrivateKey()`、公钥 `x963Representation`、`PublicKey(x963Representation:)`、`sharedSecretFromKeyAgreement(with:)`、`hkdfDerivedSymmetricKey(using:salt:sharedInfo:outputByteCount:)`、`AES.GCM.Nonce(data:)`、`SealedBox(nonce:ciphertext:tag:)`、`AES.GCM.open(_:using:authenticating:)` 的参数和 throwing 调用。ciphertext 排除最后 16 字节，tag 取最后 16 字节；所有二进制字段执行无填充 base64url 往返校验。
- iOS 两个回调入口仍共用一次性状态；先清除 state/私钥引用再 cancel 会话，completion 中的 state 检查避免取消事件覆盖成功。未知版本、缺失/重复字段、非法公钥和 GCM 认证失败均不进入 Cookie 写入。
- 安卓 minSdk 26 可使用 `java.util.Base64`；检查 `KeyPairGenerator.initialize(ECGenParameterSpec)`、`AlgorithmParameters.getParameterSpec`、`ECPoint`/`ECPublicKeySpec`/`PKCS8EncodedKeySpec`、`KeyFactory`、`KeyAgreement.init/doPhase/generateSecret`、`Mac.init/doFinal`、`Cipher.init/updateAAD/doFinal`。`GCMParameterSpec(128, nonce)` 的 128 是 tag 位数，nonce 为 12 字节；JCE 输入直接使用密文拼接 tag。
- 安卓点坐标以正号 BigInteger 读取，显式检查坐标范围和曲线方程；输出时去除符号补位并左补零至 32 字节。HKDF 使用 state UTF-8 作 extract 的 HMAC key，expand 的输入为 info UTF-8 后附单字节 0x01，输出 32 字节。
- 安卓检查了同步持久化/删除、过期后加载分支、两个 Intent 入口的 finally 清理、`onCloseWindow(WebView)` 签名及唯一 popup 的销毁防重入。失败分支不记录私钥、密文或 JWT。

仍没把握、需要平台工具确认：Swift 编译器对 CryptoKit 的 Data/DataProtocol 泛型推导和 Foundation 可写路径属性的实际编译结果；安卓各系统 provider 的 EC 参数解析、PKCS#8 导入、ECDH 输出及 GCM 组合是否与向量完全一致；iOS 系统认证会话取消/双回调的真实时序；安卓回收进程后 SharedPreferences 恢复及立即删除的表现、未挂载弹窗的 close 回调；两端真实 Cookie 注入和授权 App → 系统浏览器 → 自定义协议的路由。静态检查和 WebCrypto 向量不能代替这些验证。

### 4. 需要协调者处理

1. 在具备回环监听权限的环境补做隔离服务集成验证，核对 Access 拒绝仍为原有 JSON、允许后进入加密接力；确认或补齐缺失的验证 README。挂载顺序的外部验证沿用 review-1 的分工。
2. 在 Xcode / Android SDK 环境编译并用同一 `protocolVector` 验证两端解密；真机覆盖完整授权链路、错误版本/参数/密文、取消重试、重复回调、子路径、空 loginHosts、安卓十分钟过期/冷启动和空弹窗关闭。
3. 部署时同步更新服务端和手机 App；v1 要求 pk 且不接受明文 token 回跳，旧 App 无法与新接力协议互通。
4. `cf-access.ts` 校验逻辑收拢及 `CF_Binding` Cookie 核对仍由协调者按 review-1 处理，本轮未扩展这些范围。
