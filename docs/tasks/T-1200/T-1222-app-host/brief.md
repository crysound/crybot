# T-1222-02 App 通道收口与应用链接（并入 T-1220）

## 依赖
- after：00（与 01、07 并行）；合并顺序在 01 之后。与 T-1221-01 互不依赖，谁先合都行。
- 估计：2 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-unified-login.md`。先读「合同」全部（尤其约束 2 的行数基线），再读第 3.4 节 `/auth/app-return` 那一行，第 3.5、3.6、3.7 节、第 7 节。
- 建议分支名：`t1222-02-app-host`

## 目标
服务端能认出「App 通道类请求」——App 通道主机名，**或任何经过代理但没有有效 Access JWT 的请求**（包括历史遗留的无 Access 公网主机名）；对这类请求只开该开的路由、加限流和审计。同时完成 T-1220 的 Universal Links / App Links 服务端和安卓部分，并提供飞书登录的 app-return 兜底页。

## 背景
- T-1220 已在 `.worktrees/T-1220-app-links` 做了两轮但没合并（`server/app-links.ts` 等在 main 上**不存在**）。协调者会把这些改动以补丁形式放进你的分支起点；以你开始时的代码为准。
- **本任务只管 T-1220 的服务端和安卓部分，不碰 `mobile/ios`。** T-1220 的 iOS 改动（`project.yml`、entitlements、`ViewController.swift`）一律归 T-1221-01（旧 iOS 壳会被原生工程替换，接力回调行为由 T-1221-03 接手）。协调者给的补丁起点里不含 `mobile/ios`；如果你发现分支里有 `mobile/ios` 的改动，不要动它，在汇报里写明。
- 请求前置顺序（`server/index.ts`，00 合并后行号会略变）：公开探针（`/api/health`、`/api/brand`、`/.well-known/crybot/environment`、domain-check）→ `desktopUpdateFiles`（约 12608）→ `cfAccess` → `/auth/app-handoff`、`/api/health/hosted`、`HOSTED_WORKSPACE` 段、`remoteAccessPaths` → `MCP_OAUTH_CALLBACK_PATH`（约 12641）→ 静态资源 GET、环境描述 → `emailSignInRoute`（约 12660）→ `cloudSigned`、`chatApps.serveFile`（约 12662）→ `/api/auth/pair`、`/api/pair`（约 12698）→ `resolveRequestAuth`。WebSocket upgrade（约 15361，`upgrades.attach`）也经过 `handleRequest`。
- `server/cf-access.ts`：没带 `Cf-Access-Jwt-Assertion` 就交给普通认证；带了但无效会直接 401。
- `server/request-auth.ts`：`PROXY_HEADERS`（约 183）、`isProxied`（约 190）、`requestSource`（对端是本机时取 `X-Forwarded-For` 最后一跳）、`resolveRequestAuth`（约 622–712）。本机信任本来就要求 Host 是 loopback 且没经代理，**不需要改 request-auth**。
- `tunnelListener`（约 15453）和 `tailnetShare` 是独立监听入口，不受本任务影响。

## 要做的事
1. 新模块 `server/app-host.ts`：
   - `appHostConfig(env)`：读 `CRYBOT_APP_HOST`（只接受主机名，不带端口和路径）；兼容旧的 `CRYBOT_APP_LINK_ORIGIN`（有它没 `CRYBOT_APP_HOST` 时由它推导，并打一次弃用警告）。
   - 启用条件：`cfAccess` 存在或配了 `CRYBOT_APP_HOST`，且不是 `HOSTED_WORKSPACE` / `CLOUD_TEAM`。都不满足时所有函数退化为空操作。
   - `isAppChannelRequest(req, accessVerified)`：`Host`（去端口、小写）等于 `CRYBOT_APP_HOST`；或 `isProxied(req)` 且 `accessVerified` 为假。
   - 中间件挂在 `cfAccess` 之后、`/auth/app-handoff` 之前：App 通道类请求访问 `/auth/app-handoff`、`/api/auth/hosted/**` 返回 404。`/desktop-updates/**` **不拦**（`desktopUpdateFiles` 仍在最前面，保持原样）。
   - 在 `cfAccess` 之前加一个便宜的检查：Host 是 `CRYBOT_APP_HOST` 且带 `Cf-Access-Jwt-Assertion` 头 → 400。
2. `cfAccess` 打标记：在 `server/cf-access.ts` 里，对 JWT 验证通过的请求做一个标记（例如模块级 `WeakSet<IncomingMessage>` 和 `accessVerified(req)` 导出函数），**只加标记，不改判断逻辑**（任务 04 会改同一文件的身份部分，你的改动要小且集中）。确认并在汇报里写明：`cfAccess` 有没有在验证后删掉 `Cf-Access-Jwt-Assertion` 头（决定了能不能只靠头判断）。
3. 新模块 `server/auth-rate-limit.ts`：内存滑动窗口，来源 IP 用 `requestSource(req)`；`/api/auth/feishu/exchange`、`/auth/feishu/callback`、`/api/auth/pair`、**`/api/pair`**、`/api/auth/email/start`、`/api/auth/email/verify` 每 IP 每分钟 10 次，超出 429 `{error:"rate_limited"}` 加 `Retry-After`。只对 App 通道类请求生效。键数超过 10000 时淘汰最旧。
4. 审计：App 通道类请求上登录成功、失败、限流命中、会话吊销各写一行 `auth_audit` 结构化日志（时间、动作、平台、身份标签或「未知」、union_id（如有）、来源 IP、结果）。不写令牌、code、配对码。
5. 应用链接（接 T-1220）：AASA 的 `components` 增加 `/auth/feishu/app-return`；AASA、assetlinks 只在 `CRYBOT_APP_HOST` 上提供（其他 Host 404）。
6. `GET /auth/feishu/app-return`（放 `server/app-links.ts` 或新文件）：极小 HTML，自动跳 `<CRYBOT_APP_SCHEME>://feishu?code=…&state=…`（**host 是 `feishu`**，不要用 `auth`，安卓 `MainActivity` 已占 `crybot://auth`），并显示「回到 Cry Bot」按钮；`Cache-Control: no-store`、`Referrer-Policy: no-referrer`、严格 CSP（不允许外部脚本）；只透传 `code`、`state`、`error`，URL 编码。没配飞书时 404。
6a. 改造 T-1220 的 `GET /auth/app-return`（在 `server/app-links.ts`）：原来只显示一句错误提示，改成和第 6 条同一模式的兜底页，给 iOS 17.0–17.3（`ASWebAuthenticationSession` 用 `crybot` scheme，服务器配了应用链接时接力一律跳到这里）和安卓 App Links 没接住时用。自动跳 `<CRYBOT_APP_SCHEME>://auth?<原查询串>`，同时显示「回到 Cry Bot」按钮；跳转目标的 scheme、host 固定，查询串原样带过去（不解析、不增删、不改顺序），任何参数都改不了跳转目标；`Cache-Control: no-store`、`Referrer-Policy: no-referrer`、严格 CSP（不允许外部脚本）；HTML 和脚本里的地址正确转义。没配应用链接时仍然 404。客户端不带版本参数，`server/app-handoff.ts` 的回调地址选择不改（17.4 起的 https 回调在页面加载前就被系统截走）。
7. 「未登录面」端到端测试 `server/app-host.e2e.test.ts`：**照规格 3.5 的清单逐条写**（路由是内联 if，没有路由表可枚举，清单就写死在测试里），分两组跑：Host=App 通道；Host=另一个主机名但带 `X-Forwarded-For`（模拟遗留无 Access 主机名）。另加：带 Access JWT 且 Host=App 通道 → 400；主域名带有效（测试签发的）Access JWT 时 `/auth/app-handoff` 不被 404；`/desktop-updates/` 下文件在 App 通道上照常可取；没配 Access 也没配 `CRYBOT_APP_HOST` 时所有清单项行为和现在一致。测试文件头注明 `tunnelListener`、`tailnetShare` 不在范围。
8. 访问日志：确认 `/auth/feishu/*`、`/auth/feishu/app-return` 和 `/auth/app-return` 的日志不记查询串（如果现有日志会记，在这里处理）。

## 范围
- 可以改：`server/app-host.ts`、`server/auth-rate-limit.ts`、`server/app-links.ts`、`server/cf-access.ts`（**只加验证标记**）、`server/index.ts`（挂载行）、上述文件的测试；T-1220 带来的 `mobile/android/**`、`docs/self-hosting.md` 改动保持原样。
- 不要改：`mobile/ios/**`（归 T-1221-01）、`server/request-auth.ts`、`server/feishu-login.ts`、`server/feishu-routes.ts`、`server/sessions.ts`（任务 01）、`server/person-*.ts`（任务 04）、`src/**`、`electron/**`。

## 验收标准
- [ ] 规格「验收」第 3 条有端到端测试并通过，两组 Host 都覆盖。
- [ ] 限流：第 11 次请求 429，窗口过后恢复；非 App 通道类请求不受限；`/api/pair` 在列（单测）。
- [ ] app-return 页：跳 `crybot://feishu?...`；编码正确、无外部资源、响应头齐全；含 `<script>` 的 state 不会被执行（单测断言转义）。
- [ ] `/auth/app-return` 兜底页（单测）：页面里的跳转地址是 `crybot://auth?<原查询串>`，接力参数（`v`、`state`、`epk`、`iv`、`ct`）原样带过去；参数里带 `//evil.example.com`、`https://evil.example.com`、`javascript:`、引号和 `<script>` 时跳转目标仍是 `crybot://auth`、不会被执行（不做开放重定向）；响应头齐全、无外部资源；没配应用链接时 404。
- [ ] T-1220 原有服务端和安卓测试全部通过（原来断言错误提示页的用例按新页面改写）；没配 Access 也没配 `CRYBOT_APP_HOST` 时现有行为不变。
- [ ] 本任务的改动里没有 `mobile/ios/**` 下的文件（`git diff --stat` 证明）。
- [ ] `index.ts` 行数满足约束；棘轮测试通过。
- [ ] 协调者推分支、开草稿 PR 后 CI 全绿，运行链接由协调者补进报告。

## 约束
- 不要 git 提交，不联网，不安装依赖。需要新依赖时在汇报里列出包名和版本，不要自己装（唯一已批准的例外见规格约束 5）。
- 公开仓库：代码、测试、夹具、注释、文档里只用 `example.com`、`cli_example` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 飞书 App Secret、授权 code、code_verifier、`cry_sess_`、JWT 不进日志、错误信息和任何返回给客户端的内容（规格约束 3、4）。union_id 可以进服务端日志。
- `server/index.ts` 行数棘轮（`scripts/testing/file-size-ratchet.test.ts`，上限 15515，口径同 `wc -l`）：开工时先记下 `wc -l server/index.ts` 作为起点；新逻辑放新模块，完工时行数不超过起点且不超过 15515。汇报里写「起点 → 完工」两个数字。
- vitest 用 `--maxWorkers=2`；重命令用 `systemd-run --scope -q -p MemoryMax=2G` 包住。
- 并行开发：只改「可以改」里的路径。确实要改别的，写进汇报，由协调者安排。
- 只写必要的注释，只解释代码看不出来的原因。测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-1200/<分支名>/report.md`（用 `task-paths report <分支名>` 计算）；各轮追加到同一文件，保留前轮内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 Actions 或真机验证。
3. `index.ts` 行数：起点 → 完工。
4. 需要协调者处理的事：依赖、超出范围的改动、没解决的问题、触发的停止条件。

## 运行环境（InstaBox 云沙箱）
- 开工先在仓库根目录执行 `crybot-link-deps`，它把预装依赖链进 `node_modules`（不要 pnpm install，沙箱禁网）。
- 沙箱连本机回环端口也不能监听：起 HTTP 服务的测试会失败或卡住，照实写进汇报，由协调者在沙箱外补跑。每条测试命令前加 `timeout 600`。
- server tsc 约占 3.8G 内存，跑之前确认没有别的测试在跑。
