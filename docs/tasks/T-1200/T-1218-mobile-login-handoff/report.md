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
