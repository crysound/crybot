# T-1222-02 app-host

## 本轮

### 1. 改动

- `server/app-host.ts`：新增 App 通道主机配置、旧变量兼容、代理请求判定、JWT 头部拒绝和收口路由判定。
- `server/auth-rate-limit.ts`：新增按来源 IP 的内存滑动窗口限流和 `auth_audit` 结构化日志辅助函数。
- `server/app-links.ts`：新增仅 App Host 提供的 AASA、assetlinks、飞书 app-return 和接力 app-return 页面，固定 scheme/host 并转义查询参数。
- `server/cf-access.ts`：JWT 验证成功后以 `WeakSet` 标记请求，导出 `accessVerified`；没有删除 `Cf-Access-Jwt-Assertion` 头。
- `server/index.ts`：按规格顺序挂载 App 通道收口、应用链接、限流以及配对/邮箱登录和吊销审计；`/desktop-updates` 仍在最前面。
- `server/app-host.test.ts`、`server/auth-rate-limit.test.ts`、`server/app-links.test.ts`：覆盖配置、两类 App 通道判定、限流窗口、回跳编码和响应安全头。
- `server/app-host.e2e.test.ts`：写死规格 3.5 未登录面清单，覆盖 App Host、遗留代理 Host、JWT+App Host、`/desktop-updates` 豁免和未配置回归判定；测试头注明独立监听入口不在范围。
- `mobile/android/app/src/main/kotlin/com/crysound/crybot/LoginActivity.kt`：新增飞书 PKCE 登录、App Link/custom scheme 回调、交换和 Keystore 加密保存。
- `mobile/android/app/src/main/AndroidManifest.xml`、`mobile/android/app/build.gradle.kts`：加入飞书/Lark 查询声明、`crybot://feishu` 与 HTTPS App Link、App Link Host 构建注入。

### 2. 验证

- `crybot-link-deps`：成功链接预装依赖。
- `timeout 600 pnpm exec vitest run server/app-host.test.ts server/app-host.e2e.test.ts server/auth-rate-limit.test.ts server/app-links.test.ts server/cf-access.test.ts server/app-handoff.test.ts --maxWorkers=2`：6 个文件、90 个测试通过。
- `timeout 600 pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false`：通过。
- `timeout 600 pnpm exec oxlint server/app-host.ts server/app-links.ts server/auth-rate-limit.ts server/app-host.test.ts server/app-links.test.ts server/auth-rate-limit.test.ts server/app-host.e2e.test.ts`：通过。
- `git diff --check`：通过；改动文件没有 `mobile/ios/**`。
- `scripts/testing/file-size-ratchet.test.ts` 在沙箱中因 `spawnSync git EPERM` 无法运行，需在 Actions/沙箱外复跑。
- Android Gradle/JVM 检查未运行：当前沙箱没有 `gradle`/wrapper；需由 Actions 执行 `assembleDebug lintDebug testDebugUnitTest`。需要的依赖未新增。
- 仓库规定的 `docs/verification/README.md` 在当前起点不存在，无法按该文件的 fixture 指引执行；完整服务 HTTP 监听型端到端回归需在沙箱外运行。

### 3. `index.ts` 行数

15460 → 15460（`wc -l`）。

### 4. 协调者事项

- 请在可监听 HTTP 的环境运行 `server/app-host.e2e.test.ts`、完整服务端回归和 Android Actions 检查。
- 请确认部署侧注入 `CRYBOT_IOS_TEAM_ID`/`CRYBOT_ANDROID_SHA256_CERT_FINGERPRINT`（或对应别名）以及 `CRYBOT_APP_LINK_HOST`；默认值仅用于开发 fixture。
- 未发现停止条件；没有改动 `mobile/ios`、`request-auth.ts`、飞书核心登录模块或会话模块。

## 第 2 轮

### 1. 改动

- `server/app-links.ts`：增加飞书 AASA component、飞书 app-return 和接力 app-return 兜底页；应用链接公开路由按 `CRYBOT_APP_HOST` 主机限制，接力参数从原始查询串透传，页面使用 CSP sha256 脚本哈希并设置 no-store/referrer-policy。
- `server/app-links.test.ts`、`server/app-links.e2e.test.ts`：更新 T-1220 断言，覆盖 Host 收口、危险查询参数、飞书配置开关、固定跳转目标、响应头和脚本转义。
- `server/app-host.ts`：复用主机名解析处理大小写、末尾点、端口和 IPv6；提供 pre-Access JWT 400、App 通道 404 和限流挂载。
- `server/app-host.e2e.test.ts`：改为使用 `verificationServerArgs`、`verificationServerEnvironment` 和 `freePortBlock` 启动真实服务，逐条覆盖规格 3.5 清单、App Host、遗留代理 Host、更新文件、WebSocket 相关入口和未配置回归；文件头注明 `tunnelListener`、`tailnetShare` 不在范围。
- `server/cf-access.ts`：带 assertion 的请求先验签并标记，再执行原有 bearer、ticket、cookie 短路逻辑；没有删除 `Cf-Access-Jwt-Assertion` 头。
- `server/auth-rate-limit.ts`、`server/auth-rate-limit.test.ts`：超限键按插入顺序淘汰，移除高水位时的全表 prune；补 10000 键、最旧淘汰、429 窗口和 Retry-After 测试。
- `server/index.ts`：保留 `desktopUpdateFiles` 最前顺序，加入 App Host pre-Access 检查、应用链接、Access 后收口和限流调用；`/desktop-updates` 仍绕过收口。
- `docs/tasks/T-1200/T-1222-app-host/report.md`：保留第 1 轮原文并追加本轮记录；旧的 `t1222-02-app-host` 报告目录已删除。

### 2. 验证

- `crybot-link-deps`：成功。
- `timeout 600 pnpm exec vitest run server/app-links.test.ts --maxWorkers=2`：39 个测试通过。
- `timeout 600 pnpm exec vitest run server/app-handoff.test.ts --maxWorkers=2`：65 个测试通过。
- `timeout 600 pnpm exec vitest run server/app-host.test.ts --maxWorkers=2`：5 个测试通过。
- `timeout 600 pnpm exec vitest run server/auth-rate-limit.test.ts server/cf-access.test.ts --maxWorkers=2`：22 个测试通过。
- `timeout 600 pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false`：通过。
- `timeout 600 pnpm exec oxlint --deny-warnings ...`（所有改动的 server 文件）：通过。
- `git diff --check`：通过；`mobile/android/**` 和 `mobile/ios/**` 均无改动。
- `timeout 600 pnpm exec vitest run server/app-host.e2e.test.ts --maxWorkers=2`：沙箱不能监听本机端口，`freePortBlock` 无可用端口；需协调者在沙箱外运行真实 HTTP/upgrade e2e。
- 仓库要求的 `docs/verification/README.md` 在起点不存在，无法按该文件执行 fixture 指引。

### 3. `index.ts` 行数

15460 → 15460（`wc -l`）。

### 4. 验收逐条核对

- 规格 3.5 的 App Host 与遗留代理 Host 清单：真实服务 e2e 已写入，沙箱无法监听端口，待沙箱外执行。
- 限流第 11 次 429、窗口恢复、非 App 通道不限制、`/api/pair`：单测通过。
- app-return 与 feishu app-return：跳转 scheme/host 固定，原始或选定参数编码，危险输入不会改变目标，CSP/no-store/referrer-policy 齐全；单测通过。
- AASA/assetlinks：显式 `CRYBOT_APP_HOST` 时仅该 Host 提供，AASA 含两个 callback component；未配置变量时保留 T-1220 行为；单测通过。
- T-1220 `app-links`、`app-handoff`、`cf-access` 服务端测试：通过；监听型 app-links e2e 需沙箱外补跑。
- Access JWT 标记：有效 assertion 在 bearer、ticket、cookie 短路前标记；现有 cf-access 单测通过。
- WebSocket、更新文件真实下载：已写入真实服务 e2e；有效 JWT + cookie 的提前标记由 `cf-access.test.ts` 覆盖，主域名整链路需沙箱外补跑。
- server tsc、oxlint、index 行数：通过，行数未增加。
- `server/` 非测试代码未发现把 `req.url` 或查询串写入访问日志；本轮页面处理也未新增查询串日志。
- `mobile/**` diff：本轮无移动端文件改动；安卓入口保持 main 原样。

### 5. 协调者事项

- 在可监听端口的环境运行 `server/app-host.e2e.test.ts`、`server/app-links.e2e.test.ts` 和完整 CI。
- 按仓库环境补跑缺失的 `docs/verification/README.md` fixture 验证（当前文件不存在）。


## 第 3 轮

### 1. 按返工项修改

1. **真实 Host 与夹具（必改 1）**：`server/app-host.e2e.test.ts` 的 HTTP 请求改用 `node:http.request`，连接地址固定回环、请求头显式发送 Host；AASA 自检分别要求 App Host 200、legacy Host 404。隔离临时目录新增 `static/index.html` 并设置 `CRYBOT_STATIC_DIR`，清单要求 `/`、`/pair` 均为 200。飞书 GET start/callback 按当前基线的 SPA 回退断言 200，并注明任务 01 路由尚未存在。邮箱 start/verify 明确用 POST、JSON body，未启用邮箱时断言 404。限流使用未使用过的 `203.0.113.77`，POST email/start 前 10 次检查业务响应不是 `rate_limited`，第 11 次检查 429、完整 JSON 和正数 Retry-After，不以“非 429”判断前 10 次。
2. **整链路补测（必改 2）**：新增本地 JWKS HTTP 服务，测试私钥签 RS256 JWT；子服务通过 `--import` preload 只把虚构团队 `example.cloudflareaccess.com` 的 certs 请求转到夹具，其余非回环 fetch 拒绝。主域名带有效 JWT、有效 JWT 加实际配对获得的 cookie 均要求 `/auth/app-handoff` 为 400（缺少 handoff 参数，明确不是 404）；没有 cookie 的无效 JWT 要求 401 和准确错误体。已配置和未配置组共享同一份完整 HTTP 清单，两组都使用真实 App/legacy Host；增加全部 cloudSigned 路径、无 token 的 `/api/page-files/unsigned/index.html`、POST `/api/attachments` 和 POST `/api/files`，下载使用实际 `/api/attachments/example` 路径。此夹具为非 Cloud 部署，cloudSigned 路径验证的是未登录请求被普通认证拒绝，不声称覆盖 Cloud 模式内部验签。原始 socket 的 WebSocket upgrade 用例保留。
3. **index 写法（必改 3）**：`server/app-host.ts` 提供 `auditLogin` 和 `auditSessionRevoke`，配对结果和吊销结果只经一次 helper；`index.ts` 的六处内联审计移除。pre-Access gate 与已有 desktop/app-links 判断按原顺序合并为单个条件，post-Access gate 单独占行；恢复独立的原注释 `// The shape the companion apps decode: token, device and serverName are required.`。未删无关空行，未增加一行多条语句。
4. **淘汰测试（必改 4）**：`server/auth-rate-limit.test.ts` 改用 `maxKeys: 3`，先将 key0 打满并确认被限，再插入四个其他来源，确认 key0 重新放行及内部键数等于 3。`server/auth-rate-limit.ts` 新增只读 `size` getter 供检查。临时删除淘汰循环后的红灯和恢复后的绿灯见下节。
5. **origin（建议 5）**：`server/app-links.ts` 在未提供旧 origin 时从 `CRYBOT_APP_HOST` 推导 HTTPS origin；现有 handoff 同样通过该 helper 获得回跳地址。显式旧 origin 仍优先，两者主机不一致时仅在 `createAppLinks` 初始化告警一次，文案不包含配置值或密钥。`app-host.ts` 的弃用提示明确针对“从旧 origin 推导 App Host”。`app-links.test.ts` 和 `app-handoff.test.ts` 都覆盖仅 Host、仅旧 origin、两者同时配置且不一致三种组合。
6. **回跳目标（建议 6）**：`server/app-links.test.ts` 提取并解码 href、解析 `location.replace` 的 JSON 字符串，与完整预期目标全等比较；接力查询串包含 `v/state/epk/iv/ct` 和危险参数，要求 `<script` 只有页面自己的 1 次。飞书同样比较完整、编码后的白名单参数目标，验证额外参数被丢弃；删除空洞的 `<script>alert` 否定断言，并修正本地化兜底页测试名。
7. **审计（建议 7）**：`server/routes/email-sign-in.ts` 只增加 helper import 和两处审计调用，verify 失败和成功分别记录 login，成功身份取会话 label；start 不记 login。DELETE 会话路径传入操作者的 `auth.session.label`；logout 同样保留身份标签。结构化日志增加 `event: "auth_audit"` 标识。`app-host.test.ts` 用独立临时 SessionRegistry 和 memoryHttp 验证邮箱成功/失败、start 不审计、配对与吊销身份及日志不包含验证码或令牌。
8. **gate 响应（建议 8）**：`app-host.test.ts` 通过 memoryHttp 完整写出响应，固定时钟，断言第 11 次为 429、JSON 精确等于 `{ "error": "rate_limited" }`、Retry-After 精确为数字字符串 `"60"`。
9. **报告（建议 9）**：保留前两轮记录，本轮仅将确实运行通过的测试写为通过；两个监听型 E2E 和棘轮测试的环境阻塞单独列出。未改 `mobile/**`，没有提交 Git，没有安装依赖或联网。

### 2. 淘汰测试先红后绿证据

先完成新的测试和只读 size getter，再临时删除 `createAuthRateLimiter` 中的整个 `while (windows.size > maxKeys)` 淘汰循环，运行：

```sh
timeout 600 pnpm exec vitest run server/auth-rate-limit.test.ts --maxWorkers=2
```

红灯原始输出摘录（退出码 1）：

```text
❯ server/auth-rate-limit.test.ts (4 tests | 1 failed) 10ms
  × evicts the oldest saturated key and bounds the stored source count 4ms

FAIL server/auth-rate-limit.test.ts > app auth rate limit > evicts the oldest saturated key and bounds the stored source count
AssertionError: expected true to be false // Object.is equality
- Expected
+ Received
- false
+ true
❯ server/auth-rate-limit.test.ts:33:60
  33| expect(limiter.check(key0, "/api/pair", true).limited).toBe(false);
  34| expect(limiter.size).toBe(3);
Test Files  1 failed (1)
     Tests  1 failed | 3 passed (4)
```

恢复原淘汰循环，运行同一命令（退出码 0）：

```text
Test Files  1 passed (1)
     Tests  4 passed (4)
```

最终代码保留淘汰循环；未留下变异实现。

### 3. 命令与实际结果

开工执行 `crybot-link-deps`：`linked 73 entries`。所有 Vitest 命令均单文件、`--maxWorkers=2`，测试命令加 `timeout 600`。

| 命令 | 实际结果 |
|---|---|
| `timeout 600 pnpm exec vitest run server/app-links.test.ts --maxWorkers=2` | 42 passed |
| `timeout 600 pnpm exec vitest run server/app-host.test.ts --maxWorkers=2` | 8 passed |
| `timeout 600 pnpm exec vitest run server/auth-rate-limit.test.ts --maxWorkers=2` | 4 passed；另有上述故意删淘汰逻辑的红灯 |
| `timeout 600 pnpm exec vitest run server/cf-access.test.ts --maxWorkers=2` | 19 passed |
| `timeout 600 pnpm exec vitest run server/app-handoff.test.ts --maxWorkers=2` | 68 passed |
| `timeout 600 pnpm exec vitest run server/app-host.e2e.test.ts --maxWorkers=2` | 3 failed，均在夹具监听前提处被沙箱阻塞，未执行路由断言 |
| `timeout 600 pnpm exec vitest run server/app-links.e2e.test.ts --maxWorkers=2` | 1 failed，初始监听探针报 EPERM，未执行路由断言 |
| `timeout 600 pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=2` | 1 failed，`spawnSync git EPERM`，未完成棘轮检查 |

App Host E2E 原始错误：

```text
runs the unauthenticated surface against a real server for app and legacy proxy hosts
Error: no free port block for offsets 0,1 in 19600..22600
keeps an unconfigured instance's complete public surface unchanged
Error: no free port block for offsets 0,1 in 19600..22600
verifies Access JWTs before the paired cookie shortcut on the main host
Error: listen EPERM: operation not permitted 127.0.0.1
Test Files  1 failed (1)
     Tests  3 failed (3)
```

App Links E2E 原始错误：

```text
Error: listen EPERM: operation not permitted 127.0.0.1
Test Files  1 failed (1)
     Tests  1 failed (1)
```

开发过程中邮箱内存 HTTP 夹具最初超时：构造完整 request body 后补 `req.complete = true`，修正 IncomingMessage 生命周期，最终 8 条通过。tsc 首次发现测试夹具缺 `UserError.errorKey` 和配置联合类型访问错误，均已修正。

最终静态检查：

```sh
timeout 600 pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false
timeout 600 pnpm exec oxlint --deny-warnings server/app-host.ts server/app-host.test.ts server/app-host.e2e.test.ts server/app-links.ts server/app-links.test.ts server/app-handoff.test.ts server/auth-rate-limit.ts server/auth-rate-limit.test.ts server/index.ts server/routes/email-sign-in.ts
git diff --check
```

三条命令均退出码 0、无错误输出。启动 tsc 前通过进程列表确认没有 Vitest 或其他 tsc 运行；最终五个指定单测文件共 **141 passed**。

### 4. 行数、范围与协调者事项

- `wc -l server/index.ts`：**15460 → 15460**，满足本分支 15460 上限；index diff 为 12 行新增、12 行删除，所有新增行均无追加第二条语句，未通过删无关空行凑数。
- `git diff --name-only -- mobile` 无输出；当前工作区只有本报告和范围内的 server 文件改动。
- 本地没有 `origin/main` 引用（`git diff --name-only origin/main -- mobile` 报 `fatal: bad revision 'origin/main'`），未联网补取；这里的范围确认相对于工作区起点 HEAD。请协调者在完整仓库补查相对 main 的 diff。
- 仓库中的 `docs/verification/README.md` 仍不存在。HTTP E2E 使用 `verificationServerEnvironment`、`verificationServerArgs`、临时 HOME/数据目录/静态目录；邮箱单测使用临时 SessionRegistry，未对真实应用或用户数据执行验证。
- 请协调者在可监听回环端口的环境按上表补跑两个 E2E 文件、文件大小棘轮和 CI。有效 JWT + 配对 cookie 的整链路**用例已写入，但本沙箱未跑通**，不以单测绿灯代替这项验收。

## 第 4 轮：修正 WebSocket 升级用例

### 1. 结论与依据

选择情况 **1：用例路径写错**，不改服务端实现。

- `server/index.ts:15259` 通过 `upgrades.attach(server, handleRequest)` 接入升级处理；`server/routes/upgrades.ts:55` 对未注册的升级路径直接返回 404，尚未进入 `handleRequest`，与 App 主机收口无关。
- `/api/events` 是 SSE：`server/index.ts:14753` 创建 `SseClient`，`:14775` 返回 `text/event-stream`，不是 WebSocket 升级入口。
- 本次采用真实入口 `/api/bots/fixture/browser/stream`：`server/routes/browser-viewers.ts:23` 定义路径匹配，`:103` 无条件注册升级路径；`server/index.ts:12471` 创建该路由并传入共享 `upgrades`。路径中的 `fixture` 无需对应真实 bot，因为未认证请求会先被认证门拒绝。
- 规格 `docs/specs/2026-11-14-unified-login.md:193` 仅要求指定登录路由返回 404，`:194` 要求 `/api/**` 照常鉴权，`:213` 明确要求未认证 WebSocket upgrade 返回 **401/403**，并非白名单之外一律 404。`server/app-host.ts:69` 的拒绝范围与此一致。
- 此夹具没有凭据：App Host 由 `server/request-auth.ts:709` 的非 loopback Host 检查返回 **403**；旧代理 Host 带 `X-Forwarded-For`，由同文件 `:706` 的代理检查返回 **403**；`server/index.ts:12755` 输出认证拒绝。因此两组均固定断言 403。

### 2. 本轮改动

- `server/app-host.e2e.test.ts:170`：将升级请求改为 `/api/bots/fixture/browser/stream`，分别请求 App Host 和旧代理 Host（后者带 `X-Forwarded-For: 203.0.113.44`）；两组都显式断言响应不是 101，且为 403，补齐旧代理主机同一请求的行为对照。
- `docs/tasks/T-1200/T-1222-app-host/report.md`：追加本轮结论、代码依据和验证结果。

### 3. 验证

先执行 `crybot-link-deps`，成功链接预装依赖。尝试按 brief 使用资源限制：

```sh
timeout 600 systemd-run --scope -q -p MemoryMax=2G pnpm exec vitest run server/app-host.test.ts --maxWorkers=2
```

该命令退出 1，错误为 `Failed to connect to system scope bus via local transport: Operation not permitted`，未启动测试。随后不用不可用的 systemd 包装，逐个运行测试；确认没有其他测试或 tsc 进程后运行类型检查。

| 命令 | 结果 |
|---|---|
| `timeout 600 pnpm exec vitest run server/app-host.test.ts --maxWorkers=2` | 8 passed |
| `timeout 600 pnpm exec vitest run server/request-auth.test.ts --maxWorkers=2` | 66 passed |
| `timeout 600 pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false` | 退出 0 |
| `timeout 600 pnpm exec oxlint --deny-warnings server/app-host.e2e.test.ts` | 退出 0 |
| `git diff --check` | 退出 0 |

沙箱不能监听端口，本轮**未运行 E2E，不宣称端到端通过**。`docs/verification/README.md` 仍不存在；用例保留原有 `verificationServerEnvironment` / `verificationServerArgs` 和临时 HOME、数据、静态目录的隔离夹具，未对用户真实应用或数据验证。请协调者在沙箱外运行：

```sh
timeout 600 pnpm exec vitest run server/app-host.e2e.test.ts --maxWorkers=2
```

### 4. 范围

`server/index.ts` 行数 **15460 → 15460**，本轮未修改实现、其他测试或 mobile 文件，未提交。文件大小棘轮按本轮要求不处理、不重跑，由协调者合 main 后处理；没有新增依赖。

## 第 5 轮：解决合入最新 main 的冲突

### 1. 逐处合并说明

本轮只修改三个冲突文件及本报告。已通过 `git log -p origin/main -- server/cf-access.ts server/cf-access.test.ts server/index.ts server/app-handoff.ts` 核对 main 的意图：T-1215 提取公开探针判断和 Access/接力页组合门，目的是满足文件大小棘轮，原鉴权顺序与公开探针列表不变。

| 冲突 | 合并结果 |
|---|---|
| `server/cf-access.ts` 文件开头 | 同时保留本分支的 `verifiedRequests` / `accessVerified` 和 main 的 `CF_ACCESS_DOMAIN_CHECK_PATH` / `isCfAccessPublicProbe`；main 的 `cfAccessRefusal` 保留。本分支在 JWT 验证成功后、已有会话短路前打标记的逻辑不变。 |
| `server/cf-access.test.ts` import | 合并为导入 `accessVerified`、`createCfAccess`、`isCfAccessPublicProbe`；保留双方全部测试，包括有效 JWT + cookie 会话的标记断言和 main 的 GET 公开探针边界测试。 |
| `server/index.ts` import | 保留 App 门、登录/吊销审计、应用链接和接力页导入，并加入 main 的 `cfAccessRefusal`。此入口使用分开的 Access/接力处理，才能在中间执行 App 门；未删除或修改 main 在 `app-handoff.ts` 导出的 `createAppHandoffGate`。 |
| `server/index.ts` 初始化 | 保留单个 `cfAccess`、`appLinks`、`appHandoff` 实例；接力页仍以 Access 是否配置决定启用。没有再实例化组合门，避免重复验证或让接力处理抢在 App 门之前返回。 |
| `server/index.ts` 请求前置处理 | 顺序为桌面更新文件 → App Host 携带 Access JWT 的廉价检查 → 应用链接/回跳页 → main 的 `cfAccessRefusal`（包含公开探针豁免）→ `appGate(accessVerified(req))`（主机限制/限流）→ 接力页。保留 401/403 的原响应内容，复用 main 的探针判断，去掉分支中重复的内联探针列表。 |

`cfAccess` 仍不删除 `Cf-Access-Jwt-Assertion` 请求头；App 通道判断依据验签标记，不能以是否有头代替。自动合并进来的 T-1212、T-1224、T-1221-01、T-1215 其他文件均未修改；本分支的限流、回跳页、审计逻辑保持原样。

### 2. 单测与静态检查

环境使用预装依赖，未安装任何依赖。`crybot-link-deps` 不存在（退出 127）；`systemd-run --scope -q -p MemoryMax=2G` 被沙箱拒绝（`Operation not permitted`，未启动测试）。后续使用 `PATH=/opt/node24/bin:$PATH`，Vitest/Node/oxlint 设置 `NODE_OPTIONS=--max-old-space-size=2048`，tsc 设置 4096；所有测试串行执行，tsc 前检查无其他 Vitest、Node 测试或 tsc 进程。

下表每个 Vitest 文件均单独执行：`timeout 600 pnpm exec vitest run <文件> --maxWorkers=2 --configLoader runner`。

| 文件 | 结果 |
|---|---|
| `server/cf-access.test.ts` | 20 passed |
| `server/app-host.test.ts` | 8 passed |
| `server/app-links.test.ts` | 42 passed |
| `server/app-handoff.test.ts` | 68 passed |
| `server/auth-rate-limit.test.ts` | 4 passed |
| `scripts/testing/file-size-ratchet.test.ts` | 1 passed |
| `src/lib/cloud-status.test.ts` | 21 passed |
| `src/components/CloudRoomCard.dom.test.ts` | 5 passed |
| `src/components/CloudTrialNotice.test.ts` | 5 passed |
| `src/components/CloudUsageMeter.test.ts` | 8 passed |
| `src/components/ProIntroduction.test.ts` | 6 passed |
| `src/components/SettingsModal.cloudPlan.test.ts` | 4 passed |
| `src/components/SidebarProfileMenu.cloud.test.ts` | 2 passed |

指定服务端五文件共 **142 passed**；T-1212 前端七文件共 **51 passed**。

T-1212 Electron 测试执行：

```sh
timeout 600 node --test --test-concurrency=1 \
  electron/account-service.node-test.mjs \
  electron/accounts-main.node-test.mjs \
  electron/cloud-disabled.node-test.mjs \
  electron/cloud-home.node-test.mjs \
  electron/cloud-signin.node-test.mjs \
  electron/cloud-sync-preload.node-test.mjs \
  electron/home-window.node-test.mjs \
  electron/hosted-disabled.node-test.mjs \
  electron/native-language.node-test.mjs
```

**8 文件通过，1 文件失败**（Node 的进程隔离摘要按文件计数）。signOut 清凭据、禁用环境去重相关文件均通过。为展开失败详情，单独运行：

```sh
timeout 600 node --test --test-isolation=none --test-reporter=tap electron/cloud-home.node-test.mjs
```

该文件 **22 passed / 1 failed**：`electron/cloud-home.node-test.mjs:322` 的 Server menu 用例在 `:343` 调用从 main 提取的 `switchEnvironment`，遇到 `ReferenceError: workspaceActionsAllowed is not defined`。`electron/main.mjs:1538` 使用该函数，但此 VM 夹具未注入。`git diff origin/main -- electron/cloud-home.node-test.mjs electron/main.mjs electron/cloud-home.mjs` 无输出，确认这些文件与 main 一致；本轮不扩大范围修复此现有失败，交协调者处理。

| 检查命令 | 结果 |
|---|---|
| `timeout 600 pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false` | 退出 0 |
| `timeout 600 pnpm exec oxlint --deny-warnings server/cf-access.ts server/cf-access.test.ts server/index.ts` | 退出 0 |
| `git diff --check` | 退出 0 |
| 全工作区检索行首 Git 冲突标记（排除 `.git`、`node_modules`） | 无匹配 |

### 3. 隔离验证与待补跑

`docs/verification/README.md` 仍不存在。本轮单测使用各自新建的内存 HTTP、临时 SessionRegistry、VM 或 DOM 夹具，没有访问用户 live app 或数据。本沙箱不支持监听端口，按本轮要求未启动端口 E2E，也不宣称端到端验证通过。请协调者在沙箱外用隔离 fixture 补跑：

```sh
timeout 600 pnpm exec vitest run server/app-host.e2e.test.ts --maxWorkers=2 --configLoader runner
timeout 600 pnpm exec vitest run server/app-links.e2e.test.ts --maxWorkers=2 --configLoader runner
timeout 600 pnpm exec vitest run server/index.test.ts --maxWorkers=2 --configLoader runner
```

前两项验证本分支主机/限流/回跳行为及有效 JWT + cookie 接力；`server/index.test.ts` 虽名为 test，也是启动真实服务的集成测试，作为合并后入口回归交协调者补跑。

### 4. 行数与交付状态

- `wc -l server/index.ts`：本轮起点（含冲突标记和双方片段）**15436 → 15416**，低于 **15515**，文件大小棘轮通过；没有通过挤语句或删除无关空行凑数。
- 只修改 `server/cf-access.ts`、`server/cf-access.test.ts`、`server/index.ts` 和本报告；未新增依赖、未修改 mobile 或 Electron 文件。
- 未执行 `git add`、`git commit` 或 `git merge --abort`。三个文件的文本冲突已解决，索引按要求仍保留 unmerged 状态（`UU`），由协调者检查、暂存并完成合并提交。
