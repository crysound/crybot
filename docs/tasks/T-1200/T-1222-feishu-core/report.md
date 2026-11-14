# T-1222-01 服务端飞书登录核心

## 本轮

1. 改动文件：
   - `server/feishu-login.ts`：新增飞书配置解析、PKCE、授权 URL、form 编码 token 交换、用户信息、名单准入、作用域和 redirect 白名单。
   - `server/feishu-routes.ts`：新增 JSON-only `/api/auth/feishu/exchange`，处理 Origin、redirect、通用错误码和设备会话签发。
   - `server/sessions.ts`：增加 access/device 会话来源、设备会话上限与寿命封顶、租户信息、飞书名单重核和公开会话字段。
   - `server/environment.ts`：增加统一描述 helper、飞书能力和公开配置字段。
   - `server/index.ts`：接入配置、启动时飞书会话核对、exchange 路由和统一描述 helper；未增加文件行数。
   - `server/testing/fake-feishu.ts`：新增随机端口假飞书授权、v3 token form、user_info 夹具。
   - `server/feishu-login.test.ts`：覆盖 PKCE、授权参数、form 字段、名单/作用域和用户信息行为。

2. 验证：
   - `crybot-link-deps`：成功。
   - `timeout 600 npx tsc -p tsconfig.server.json --noEmit`：通过。
   - `timeout 600 npx vitest run --maxWorkers=2 server/feishu-login.test.ts server/sessions.test.ts`：72 项通过。
   - `timeout 600 npx vitest run --maxWorkers=2 server/request-auth.test.ts server/cf-access.test.ts server/account-signin.test.ts server/app-handoff.test.ts`：147 项通过。
   - `timeout 600 npx oxlint server/feishu-login.ts server/feishu-routes.ts server/testing/fake-feishu.ts server/environment.ts server/sessions.ts`：通过。
   - `server/environment.test.ts` 的并发子进程用例在本沙箱中返回空 stdout、未生成 environment-id；单独和合并运行均复现，需在沙箱外/ACTIONS 重跑。起 HTTP 服务的端到端 exchange 也受当前沙箱不能监听回环端口限制，未在此处宣称通过。
   - 飞书 token 请求使用的字段为 `grant_type`、`client_id`、`client_secret`、`code`、`code_verifier`、`redirect_uri`；用户信息读取 `union_id`、`tenant_key`、`name`、`avatar_url`。

3. `server/index.ts` 行数：15460 → 15460。

4. 需要协调者处理：
   - 在沙箱外运行 `feishu-routes`/假飞书 HTTP 集成测试及完整 environment 回归；当前检出没有 `docs/verification/README.md`，无法按该路径执行额外流程。
   - 合并后核对 CI 与真实飞书配置；本轮未联网、未安装依赖、未提交 git。

## 第 2 轮

1. 改动文件：
   - `server/feishu-login.ts`：区分 token/user_info 的不可用与 code 无效错误；超时覆盖响应体读取；补齐 Secret 缺失/文件读取警告，并通过 `allowedRedirectUris` 供环境描述复用。
   - `server/feishu-routes.ts`：未配置飞书时在认证前拦截所有飞书路径为 404；非 JSON、4xx 和坏响应返回 `feishu_code_invalid`，网络、超时和 5xx 返回 `feishu_unavailable`。
   - `server/sessions.ts`：飞书会话重核持久化失败时记录 error，内存吊销或降级继续生效。
   - `server/testing/fake-feishu.ts`：增加按端点延迟、状态码和授权 code challenge 记录，处理客户端断开及非法 redirect。
   - `server/environment.ts`：统一 helper 接收公共字段，appReturnUrl 直接取允许 redirect 集合，不再使用硬编码公开域名回退。
   - `server/index.ts`：正常展开飞书接入逻辑，将路由放在 Access 检查前，并让描述调用点只传差异字段；保留 `emailSignIn` 两处原有条件差异。
     其中 environment 探针仍使用 `!HOSTED_WORKSPACE && !CLOUD_HOME`，配对响应仍使用 `!CLOUD_HOME`，两处行为按 main 保持不统一。
   - `server/feishu-login.test.ts`：补 token 失败分类、超时、租户/名单、四种作用域、邮箱忽略、Secret 文件优先、托管模式和警告分支。
   - `server/sessions.test.ts`：补设备签发、两类会话独立计数、寿命封顶、旧记录兼容、飞书重核吊销/降级和 access 不受影响。
   - `server/feishu-routes.test.ts`：新增假飞书 HTTP 集成覆盖成功换会话、准入拒绝、code/PKCE/redirect/Origin 错误、不可用 502 及未配置 404。
   - `docs/tasks/T-1200/T-1222-feishu-core/report.md`：迁移并追加本轮报告；旧 `t1222-01-feishu-core` 报告路径已移除。

2. 验证：
   - 改前基线：`sessions.test.ts` 缺少飞书设备分支，`feishu-routes.test.ts` 尚不存在；`server/environment.test.ts` 并发 identity 用例在本沙箱已有失败，输出为 `expected "" to match UUID`。
   - `crybot-link-deps`：成功。
   - `timeout 600 npx vitest run --maxWorkers=2 server/feishu-login.test.ts`：13 项通过。
   - `timeout 600 npx vitest run --maxWorkers=2 server/sessions.test.ts`：71 项通过。
   - `timeout 600 npx vitest run --maxWorkers=2 server/request-auth.test.ts`：66 项通过；`cf-access.test.ts`：18 项通过；`account-signin.test.ts`：3 项通过；`app-handoff.test.ts`：65 项通过。
   - `timeout 600 npx vitest run --maxWorkers=2 server/environment.test.ts`：13 项通过，1 项并发 identity 用例因沙箱子进程返回空 stdout 失败，需沙箱外重跑。
   - `timeout 600 npx tsc -p tsconfig.server.json --noEmit`：通过。
   - `timeout 600 npx oxlint --deny-warnings server/index.ts server/environment.ts server/environment.test.ts server/feishu-login.ts server/feishu-login.test.ts server/feishu-routes.ts server/feishu-routes.test.ts server/sessions.ts server/sessions.test.ts server/testing/fake-feishu.ts`：通过。
   - `timeout 600 npx vitest run --maxWorkers=2 server/feishu-routes.test.ts`：本沙箱禁止回环监听，测试启动后无法绑定 HTTP 服务，已停止；协调者需在沙箱外运行。
   - 飞书夹具使用官方字段 `grant_type`、`client_id`、`client_secret`、`code`、`code_verifier`、`redirect_uri`，用户信息字段为 `union_id`、`tenant_key`、`name`、`avatar_url`。

3. `server/index.ts` 行数：15460 → 15484。

4. 需要协调者处理：
   - 在沙箱外运行 `server/feishu-routes.test.ts` 和完整 `environment.test.ts`；按 `docs/verification/README.md` 的隔离 fixture 流程复核 HTTP 变更，但该文件当前检出不存在。
   - 合并后运行 CI、真实飞书配置和真机验收；本轮未联网、未安装依赖、未提交 git。

## 第 3 轮

1. 改动文件：
   - `server/sessions.test.ts`：把两类会话上限测试改为同一 `feishu:union_example` 身份，覆盖不同令牌、最早 `lastSeenAt` 吊销、`maxAgeAt` 的 renew 封顶、重开 registry 后的重核持久化和持久化失败降级。
   - `server/feishu-routes.test.ts`：兜底改为 418 `fallthrough`，补成功会话认证、cookieName、授权 302/state、真实 S256、redirect 不一致、客户端断开、权限/未知错误映射、未配置路径全量 404 和 Secret 响应/日志断言；超时用假飞书 token 端点延迟触发。
   - `server/testing/fake-feishu.ts`：按端点延迟并校验 form content type、client_secret、grant_type、authorize 一致的 redirect_uri、S256 challenge 和 user_info Bearer，处理断开响应。
   - `server/feishu-routes.ts`：设备签发的权限错误返回 403 `feishu_forbidden`，未知错误记一行不含敏感值的 error 后返回 502。
   - `server/feishu-login.ts`、`server/feishu-login.test.ts`：增加测试警告集合重置入口，测试 afterEach 恢复 warn spy，并断言 user_info 的 Bearer。
   - `server/environment.test.ts`：断言未配置时无 `feishuSignIn` 且描述不含 Secret，配置时能力字段存在且描述不含 Secret。
   - `server/index.ts`：把 exchange 挂载移到 cfAccess 之后、app-handoff 之前；将 `HOSTED_WORKSPACE` 单独换行。

2. 先红后绿证据：
   - 必改 1：临时把 `issueAccess` 过滤改为只按 `accessIdentity`，`timeout 600 npx vitest run server/sessions.test.ts --maxWorkers=2 -t 'issues device sessions'` 失败：`expected null not to be null`（设备会话被误吊销）；恢复过滤条件后同命令通过。
   - 必改 2：临时删除 `record.maxAgeAt ?? Infinity`，`timeout 600 npx vitest run server/sessions.test.ts --maxWorkers=2 -t 'caps renewal'` 失败：实际 `expiresAt=1703456000000`、期望 `1701728000000`；恢复后通过。
   - 必改 4：临时让 `revalidateFeishuSessions` 的 persist 异常外抛，`timeout 600 npx vitest run server/sessions.test.ts --maxWorkers=2 -t 'keeps Feishu revocation'` 失败：`Error: EIO`；恢复捕获后通过。

3. 验证命令和结果：
   - `crybot-link-deps`：成功。
   - `timeout 600 npx vitest run server/sessions.test.ts --maxWorkers=2`：73/73 通过。
   - `timeout 600 npx vitest run server/feishu-login.test.ts --maxWorkers=2`：13/13 通过。
   - `timeout 600 npx vitest run server/request-auth.test.ts --maxWorkers=2`：66/66；`cf-access.test.ts`：18/18；`account-signin.test.ts`：3/3；`app-handoff.test.ts`：65/65 通过。
   - `timeout 600 npx tsc -p tsconfig.server.json --noEmit`：通过。
   - `timeout 600 npx oxlint --deny-warnings server/feishu-login.ts server/feishu-login.test.ts server/feishu-routes.ts server/feishu-routes.test.ts server/sessions.test.ts server/testing/fake-feishu.ts server/environment.test.ts server/index.ts`：通过。
   - `timeout 600 npx vitest run server/feishu-routes.test.ts --maxWorkers=2`：本沙箱禁止回环监听，测试在启动 HTTP fixture 阶段卡住，已停止；需协调者在沙箱外运行。
   - `timeout 600 npx vitest run server/environment.test.ts --maxWorkers=2`：14 个测试中 13 个通过；并发子进程 identity 用例复现既有空 stdout/空 UUID 失败，需沙箱外或 Actions 重跑。
   - 假飞书 token 字段按官方合同覆盖 `grant_type`、`client_id`、`client_secret`、`code`、`code_verifier`、`redirect_uri`；user_info 覆盖 `Bearer user_access_token_example`、`union_id`、`tenant_key`、`name`、`avatar_url`。

4. `server/index.ts` 行数：15484 → 15485。

5. 需要协调者处理：在沙箱外按隔离 fixture 运行 `feishu-routes.test.ts` 和完整 environment 回归（当前检出仍没有 `docs/verification/README.md`）；合并后运行 CI、真实飞书和真机验收。本轮未联网、未安装依赖、未提交 git。

## 第 4 轮

1. 本轮只修改 `server/feishu-routes.test.ts` 的两个失败用例，并追加本报告：
   - 客户端断开：同时监听 `error` 和 `close`，只吞掉预期的 `ECONNRESET` / `ABORT_ERR`，其他错误使测试失败；等待增加独立的 1 秒超时，完成时清理计时器。保留延迟 exchange 后 `app.listening === true` 的断言，并在断开后再次正常 exchange，断言 200，验证应用与假飞书仍可用。
   - 权限映射：`requireAdmin` 只拒绝不含 admin 的作用域；当前配置默认授予 admin，因此旧用例并未触发拒绝。改为 `vi.spyOn(activeSessions, "issueDevice").mockImplementationOnce`，抛出与 `SessionRegistry.refusePersonal` 同形的错误（`status: 403`、`code: "cloud_personal"` 和 `userError` 字段），断言 403 `feishu_forbidden`。第二次使用一次性未知错误，保留 502、`console.error` 恰好一次且不含 `secret_example` 的断言。

2. 红灯证据与验证边界：
   - 协调者提供的改前 HTTP 实跑结果：断开用例 `Test timed out in 20000ms`；权限用例 `expected { status: 200, body: {cookieName, session, token} } to match object { status: 403, body: { error: "feishu_forbidden" } }`。这些不是本沙箱运行结果。
   - 修改正式用例前，先建立临时、不监听端口的隔离探针：使用临时目录中的真实 `SessionRegistry`、真实路由、注入的 token/user_info 响应，以及与本轮用例一致的一次性签发错误和响应/日志断言。临时路由副本仅删除权限映射分支，未修改正式路由。
   - 红灯命令：`R4_MUTANT=1 timeout 600 node_modules/.bin/vitest run server/feishu-routes.r4-probe.test.ts --maxWorkers=2`，1 项失败，输出：

     ```text
     AssertionError: expected { status: 502, …(1) } to match object { status: 403, …(1) }
     - "error": "feishu_forbidden"
     + "error": "feishu_unavailable"
     - "status": 403
     + "status": 502
     ```

   - 绿灯命令：`timeout 600 node_modules/.bin/vitest run server/feishu-routes.r4-probe.test.ts --maxWorkers=2`，改用正式路由，1/1 通过，包括未知错误的日志断言。探针与变异副本均已删除。此结果只证明权限映射断言能检出回归，不代表完整 HTTP 集成用例通过。

3. 静态检查与环境：
   - `crybot-link-deps`：成功，使用预装依赖。
   - `timeout 600 node_modules/.bin/tsc -p tsconfig.server.json --noEmit`：通过，涵盖改动测试文件；运行前确认无其他测试进程。
   - `timeout 600 node_modules/.bin/oxlint --deny-warnings server/feishu-routes.test.ts`：通过。
   - `git diff --check`：通过。
   - `systemd-run --scope -q -p MemoryMax=2G true` 返回 `Failed to connect to system scope bus via local transport: Operation not permitted`；因此本轮检查直接用 `timeout 600` 运行。
   - 按本轮已知限制，未在沙箱重跑需要监听端口的 `server/feishu-routes.test.ts`。`docs/verification/README.md` 当前检出仍不存在；未访问用户 live app 或数据。

4. `server/index.ts` 行数：15485 → 15485。

5. 需要协调者处理：在沙箱外用隔离 HTTP fixture 重跑 `timeout 600 node_modules/.bin/vitest run server/feishu-routes.test.ts --maxWorkers=2`，确认全部 12 项通过，尤其断开后正常 exchange 返回 200。本轮未改生产实现、未联网、未安装依赖、未提交 git。

## 第 5 轮

1. 本轮只处理空配置吊销和客户端断开后的设备会话问题：
   - `server/index.ts`：启动时无条件调用飞书设备会话核对函数。
   - `server/feishu-login.ts`：提取 `revalidateFeishuDeviceSessions`，配置为 null 时拒绝全部飞书设备会话；配置正常时沿用租户、用户和作用域规则；固定日志为 `Feishu device session revalidation: revoked N.`，变量只有数量。
   - `server/sessions.ts`：核对方法返回实际吊销数，继续只处理 device 类且身份以 `feishu:` 开头的会话，保留持久化失败时的内存吊销行为。
   - `server/feishu-routes.ts`：飞书结果返回后、签发前检查 socket、请求中断和响应状态；响应写入同步抛错、异步 error 或未完成就 close 时吊销本次新会话；正常 finish 后移除监听，保留已交付会话。
   - `server/sessions.test.ts`：新增空配置启动核对及正常配置核对，覆盖 admin 设备吊销、Access/非飞书设备/配对会话保留、名单拒绝与降权、重开 registry 后持久化结果，以及只含数量的日志。
   - `server/feishu-routes.unit.test.ts`：新增 8 项无需端口的测试，使用隔离临时目录、真实 SessionRegistry 和 Node 请求/响应对象，注入飞书响应与写入失败；覆盖四种断开状态、三种写入失败及正常 finish，检查已有设备不被挤占、新会话撤销落盘。
   - `server/testing/fake-feishu.ts`：增加 token 请求体读取完成后的异步测试钩子，供断开用例精确控制回复时机。
   - `server/feishu-routes.test.ts`：等假飞书收到 token 请求后才断开，等服务端观察到 close 后放行飞书结果，再等路由处理完毕；断言已有 10 个同身份设备及 Access 会话不变，断开后正常交换仍返回 200。移除原有固定 10ms/150ms 时序等待，保留断开等待超时兜底。

2. 已执行验证（vitest 均逐文件运行，使用隔离临时目录，未访问 live app 或真实数据）：
   - `crybot-link-deps`：成功；未安装依赖。
   - `timeout 600 node_modules/.bin/vitest run <文件> --maxWorkers=2`：`server/sessions.test.ts` 75/75、`server/feishu-routes.unit.test.ts` 8/8、`server/feishu-login.test.ts` 13/13、`server/request-auth.test.ts` 66/66、`server/cf-access.test.ts` 18/18、`server/account-signin.test.ts` 3/3、`server/app-handoff.test.ts` 65/65，合计 248 项通过。
   - `timeout 600 node_modules/.bin/tsc -p tsconfig.server.json --noEmit`：通过；运行时没有其他测试进程。
   - `timeout 600 node_modules/.bin/oxlint --deny-warnings server/index.ts server/sessions.ts server/sessions.test.ts server/feishu-login.ts server/feishu-routes.ts server/feishu-routes.test.ts server/feishu-routes.unit.test.ts server/testing/fake-feishu.ts`：通过。
   - `git diff --check`：通过。
   - `systemd-run --scope -q -p MemoryMax=2G true`：沙箱返回 `Failed to connect to system scope bus via local transport: Operation not permitted`，检查直接由 `timeout 600` 包裹执行。

3. 棘轮结果与边界：
   - `server/index.ts` 行数：15485 → 15479，低于起点和 15515 上限。
   - `timeout 600 node_modules/.bin/vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=2`：被 `spawnSync git EPERM` 阻断。改用 shell 的 `git ls-files -z server shared src scripts evals electron companion` 列出文件，再用 Python 按测试原有过滤条件、换行计数和上限核对 3182 个源码文件；index 合规，但以下 6 个未修改文件已有超限：`server/config.ts` 1251/1245、`server/store.ts` 2295/2291、`src/components/ChatView.tsx` 1295/1293、`src/components/ComputerPanel.tsx` 1785/1782、`src/components/GroupView.tsx` 1222/1220、`src/components/LocalComputerSection.tsx` 1439/1437（实际/上限）。已用 `git diff --exit-code HEAD -- <上述六文件>` 确认与 HEAD 相同。
   - `timeout 600 node_modules/.bin/vitest run scripts/testing/index-route-ratchet.test.ts --maxWorkers=2`：既有失败，`path === "/` 为 88/84，`.test(path)` 为 1/0。读取 `git show HEAD:server/index.ts` 对照，HEAD 和本轮工作区分别均为 88、1，未新增路径判断。本轮不修改这些范围外基线问题。

4. 待协调者在沙箱外补跑：
   - `timeout 600 node_modules/.bin/vitest run server/feishu-routes.test.ts --maxWorkers=2`，使用测试自建的隔离 HTTP fixture，重点复核收到 token 请求后断开不签发、不挤掉旧设备，以及随后正常交换返回 200。本沙箱按约束未运行需要监听端口的用例，不能据无端口测试宣称 HTTP 集成已通过。
   - 补跑两项棘轮测试，并协调处理上述已有基线超限。
   - 当前检出仍缺少 `docs/verification/README.md`，未能执行其指定流程；服务启动/HTTP 验收需协调者在具备该流程的环境补齐。本轮未联网、未加依赖、未提交 git。

## 第 6 轮

1. 本轮仅解决合入冲突并追加本报告：
   - `server/index.ts`：保留 main 的 `appHandoffGate(...)`，删除冲突标记及重复的 cfAccess / app-handoff 代码；紧接 gate 调用保留原有 `feishuExchangeRoute({...})`，参数不变，仍在 Access 校验之后执行。
   - 已核对 `createAppHandoffGate` → `cfAccessRefusal` → `isCfAccessPublicProbe`：只放行 GET 的 `/api/health`、`/api/brand`、`/.well-known/crybot/environment` 和末段为 64 位小写十六进制的 domain-check 路径，与本分支原有判断一致，无需修改 gate 或 cf-access。
   - 飞书交换路由实现及第 5 轮设备会话逻辑未改动。

2. 验证命令和结果：
   - `timeout 600 pnpm exec tsc -p tsconfig.server.json --noEmit`：通过；运行时无其他测试进程。
   - `timeout 600 pnpm exec oxlint --deny-warnings server/index.ts`：通过。
   - `timeout 600 pnpm exec vitest run server/feishu-routes.unit.test.ts server/feishu-login.test.ts server/sessions.test.ts server/app-handoff.test.ts server/cf-access.test.ts scripts/testing/file-size-ratchet.test.ts --maxWorkers=2`：6 个文件、181 项全部通过。测试使用隔离临时目录和内存 HTTP fixture，未访问 live app 或真实数据。
   - 搜索全部测试未发现直接引用 `createAppHandoffGate` 的用例；已执行其相关 app-handoff 和 cf-access 单测，后者包含 main 新增的 GET 探针及非 GET / 非法路径不放行断言。
   - `git diff --check`：通过；`server/index.ts` 无冲突标记，`git ls-files -u server/index.ts` 仍保留原有三个 stage，状态为 UU。
   - `crybot-link-deps` 在当前环境不存在；现有依赖可直接运行上述 pnpm 命令，未安装依赖。`systemd-run --scope -q -p MemoryMax=2G true` 返回 `Operation not permitted`，检查改由 `timeout 600` 包裹执行。

3. `server/index.ts` 行数：15441（含冲突标记）→ 15432；低于当前棘轮上限 15515，完整文件行数棘轮测试通过。

4. 待协调者处理：
   - 按沙箱不能监听端口的约束，本轮未运行 `server/feishu-routes.test.ts`、app-host / app-links e2e、`server/index.test.ts`；请在沙箱外使用隔离 fixture 补跑，不能据单测结果宣称 HTTP 集成已通过。
   - 当前检出仍缺少 `docs/verification/README.md`，其指定验证流程需在具备该文件的环境补齐。
   - 未执行 git add、commit 或 merge --abort，索引保留 UU，由协调者检查并提交。本轮未联网，未改其他文件。
