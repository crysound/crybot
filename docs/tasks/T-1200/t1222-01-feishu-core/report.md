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
