# T-1222-01 服务端飞书登录核心

## 依赖
- after：00（与 02、07 并行）
- 估计：2.5 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-unified-login.md`。先读「合同」全部（尤其约束 2 的行数基线），再读第 3.1–3.4 节、第 3.7 节、第 7 节。
- 建议分支名：`t1222-01-feishu-core`

## 目标
服务端配了飞书时，原生 App 能用「授权 code + code_verifier」换到 Cry Bot 设备会话；设备会话和 Access 会话分开计数、互不吊销；名单收紧后重启即生效；没配飞书时什么都不变。

## 背景
- 会话：`server/sessions.ts`（`issueAccess` 约 579 行，复用内存令牌 `accessTokens`、按 `accessIdentity` 最多 `MAX_ACCESS_SESSIONS_PER_IDENTITY`=5 个，超出吊销最老的；`renew` 约 735 行只延长有效期不换令牌；`revalidateEmailSessions` 约 686 行是「按当前名单核对会话」的现成样板；`SESSION_MAX_AGE_MS`）。
- 准入参考：`server/account-signin.ts`（`parseAllowList`）、`server/access-claims.ts`（`cleanIdentityClaim`）。**不要复用 `allowedScopes`**：它要求参数含「@」，套不上 union_id。
- 环境描述：`server/environment.ts` 的 `environmentDescriptor` 和 `capabilities`（参考 `emailSignIn`）。`index.ts` 里有五处 `environmentDescriptor(...)` 调用（约 12652、12661、12687、12721、12834 行），参数各不相同。
- 路由挂载：`server/index.ts` 约 12592–12840 行（公开探针 → `desktopUpdateFiles` → cfAccess → app-handoff → … → `/api/auth/pair`、`/api/pair` → `resolveRequestAuth`）。exchange 挂在 `resolveRequestAuth` 之前。
- 飞书接口（协调者已按官方文档核对）：
  - 授权 `https://accounts.feishu.cn/open-apis/authen/v1/authorize`；
  - 换 token `POST https://accounts.feishu.cn/oauth/v3/token`，**`Content-Type: application/x-www-form-urlencoded`**，字段 `grant_type=authorization_code`、`client_id`、`client_secret`（自建应用必填）、`code`、`code_verifier`、`redirect_uri`（授权时传了就必须一致，否则 20071）；
  - 用户信息 `GET https://open.feishu.cn/open-apis/authen/v1/user_info`（Bearer user_access_token；`union_id`、`tenant_key`、`name`、`avatar_url` 不需要额外权限）。
  - 假飞书照这些写；汇报里列出你依据的字段名。

## 要做的事
1. 新模块 `server/feishu-login.ts`：
   - `feishuLoginConfig(env)`：解析规格 3.1 的变量；`CRYBOT_FEISHU_APP_SECRET_FILE` 优先于 `CRYBOT_FEISHU_APP_SECRET`；配了 APP_ID 但没 TENANTS 时返回 `null` 并 `console.warn` 一次；`HOSTED_WORKSPACE`、`CLOUD_TEAM` 时返回 `null`。`CRYBOT_FEISHU_ALLOW`、`CRYBOT_FEISHU_ADMINS` 只接受 union_id 和 `*`；含「@」的项忽略并警告一次。
   - `createPkce()`、`authorizeUrl(...)`、`exchangeCode(...)`（form 编码）、`fetchUserInfo(...)`；HTTP 通过注入的 `fetch`，10 秒超时；`CRYBOT_FEISHU_TOKEN_ENDPOINT` 可覆盖。
   - `feishuScopes(unionId, config)`：没配 ADMINS 时，在 ALLOW（含 `*`）里即 `["admin","client"]`（与 Access 一致）；配了 ADMINS 时，在 ADMINS 里（或为 `*`）`["admin","client"]`，否则 `["client"]`。ALLOW 为 `*` 且没配 ADMINS 时启动警告一次。
   - `admitFeishuUser(info, config)`：租户白名单、ALLOW；返回 `{identity: "feishu:<union_id>", unionId, tenantKey, displayName, accessEmail?, scopes}` 或 `{denied: 原因}`。**拒绝时 `console.warn` 一行带 `union_id`、`tenant_key`、原因**（运维靠它填名单），返回给客户端的只有通用错误码。
   - `allowedRedirectUris(config, publicOrigin)`：只允许 `<origin>/auth/feishu/callback`、`<origin>/auth/feishu/app-return`。
2. `server/sessions.ts`：
   - `SessionRecord` 加 `source?: "access" | "device"`、`maxAgeAt?`、`platform?`、`tenantKey?`。`issueAccess` 新签的记 `source: "access"`；判断时旧记录有 `accessIdentity` 且没 `source` 的视为 `access`。
   - `issueAccess` 的 5 个上限只数 `access` 类。
   - 新增 `issueDevice(identity, label, {displayName, accessEmail?, scopes, maxAgeDays, platform, tenantKey})`：每次发新令牌；`source: "device"`；同一身份 `device` 类最多 10 个，超出吊销 `lastSeenAt` 最早的；不碰 `access` 类。飞书拿到的邮箱写 `accessEmail`，**不写 `email`**。
   - `renew`：有 `maxAgeAt` 时有效期取 `min(现有规则, maxAgeAt)`；没有该字段的旧记录行为不变。
   - 新增 `revalidateFeishuSessions(check)`（照 `revalidateEmailSessions` 写）：遍历 `source=device` 且 `accessIdentity` 以 `feishu:` 开头的会话，`check` 返回 `null`（租户或人不在名单）就吊销，否则把作用域更新为返回值并持久化。`source=access` 的不动。
   - `/api/auth/sessions` 返回里带出 `platform`、`source`。
3. 启动时（`index.ts` 创建 SessionRegistry 之后、开始监听之前）配了飞书就调一次 `revalidateFeishuSessions`，`check` 用当前 config（tenantKey 不在 TENANTS 或 union_id 不在 ALLOW → null，否则 `feishuScopes`）。
4. 新模块 `server/feishu-routes.ts`：`POST /api/auth/feishu/exchange`（规格 3.4 的请求、响应、错误码；只收 `application/json`；带 `Origin` 头 403；`redirectUri` 不在允许集合 400）。导出一个挂载函数，`index.ts` 只加一行调用。
5. 环境描述：在 `server/environment.ts`（或新的小模块）加一个统一 helper，把 `index.ts` 五处 `environmentDescriptor(...)` 调用都换成它（顺带减行）；描述加 `capabilities.feishuSignIn` 和 `feishu: {appId, authorizeEndpoint, appReturnUrl, webStartPath}`（`webStartPath` 固定 `/auth/feishu/start`，路由由任务 03 实现）。没配飞书时两个字段都不出现。
6. 测试：
   - `server/feishu-login.test.ts`：授权地址、PKCE、token 请求是 form 编码且带 `client_secret`、各种失败、超时；租户和名单；`feishuScopes` 四个分支（无 ADMINS+在 ALLOW、无 ADMINS+ALLOW=`*`、有 ADMINS 且在、有 ADMINS 不在）；ALLOW 里的邮箱被忽略；拒绝日志含 union_id 且不含 code/Secret。
   - `server/sessions.test.ts`：`issueDevice` 每次新令牌、上限 10、`maxAgeAt` 封顶；**同一身份 5 次 `issueAccess` 后设备会话仍有效**；**11 次 `issueDevice` 后 Access 会话仍有效**；旧记录（无 `source`）按 access 计；`revalidateFeishuSessions` 吊销、降级、不碰 access 类。
   - `server/feishu-routes.test.ts`（起服务 + 假飞书）：成功换会话；租户不对、人不在名单、code 无效、飞书超时、redirect 不在集合、带 Origin 各一条；没配飞书时路由 404、描述无字段；Secret 字符串不出现在任何响应体和捕获的日志里。
   - 五处描述调用改 helper 后，现有 environment 相关测试全部照旧通过。

## 范围
- 可以改：`server/feishu-login.ts`、`server/feishu-routes.ts`、`server/sessions.ts`、`server/environment.ts`、`server/index.ts`（挂载行、启动核对一行、五处描述调用）、上述文件的测试、`server/testing/fake-feishu.ts`（新，假飞书，任务 03、09 复用）。
- 不要改：`server/cf-access.ts`、`server/person-key.ts`、`server/person-name.ts`（任务 04）、`server/app-host.ts`、`server/app-links.ts`、`server/auth-rate-limit.ts`（任务 02）、`src/**`、`mobile/**`、`electron/**`、文档。

## 验收标准
- [ ] 规格「验收」第 1、2、5、6 条在单元和集成测试里覆盖并通过。
- [ ] 现有登录相关测试（`sessions`、`request-auth`、`cf-access`、`account-signin`、`app-handoff`、`environment`）全部通过。
- [ ] 假飞书 `server/testing/fake-feishu.ts` 可以独立起在随机端口，支持授权 302、v3 token（form 编码）、user_info，并能配置返回错误。
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
