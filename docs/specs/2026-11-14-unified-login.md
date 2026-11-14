# T-1222 Cry Bot 五端统一登录（飞书直接登录，不再跳网页接力）

> 进仓库时放 `docs/specs/2026-11-14-unified-login.md`。本文只用占位名：主域名 `crybot.example.com`（在 Access 后面），App 通道 `crybot-app.example.com`（不在 Access 后面），飞书应用 ID 写成 `cli_example`。真实值只写在私有部署仓库和服务器环境变量里。
>
> 第 2 版（2026-11-14）：按审核 review-1 返工，改动见文末「合同变更」。

## 合同

### 结果
网页、macOS、Windows、安卓、iOS 五端（加手表）都能「在 App 里」用飞书账号登录：
- 手机：点「飞书登录」，直接拉起飞书客户端授权，授权完回到 Cry Bot 就是登录状态；不再先开浏览器走 Access 再接力。
- 桌面：窗口里点「飞书登录」，在窗口内完成飞书网页授权（扫码或账号密码），不弹系统浏览器。
- 网页：浏览器从主域名进来照旧走 Access，没有变化；App 通道和自托管实例的登录页多一个「飞书登录」按钮（服务端配了飞书才显示）。
- 同一个人从 Access 进来和从飞书直接登录进来，是同一个身份：同一个 personKey、同样的管理员权限，以前的个人数据（已读、欢迎提示等）还在。
- 没配飞书、没配 App 通道、没有 Access 的自托管实例，行为和现在完全一样（配对码、邮箱）。

### 验收
1. 服务端：配了飞书时，`POST /api/auth/feishu/exchange` 用（假飞书的）code + code_verifier 换到 `cry_sess_`；租户不在白名单、人不在名单、PKCE 不对、redirect_uri 不在允许集合时都拒绝，有测试。
2. 服务端：没配飞书时，environment 描述里没有 `feishu`，所有 `/auth/feishu/*`、`/api/auth/feishu/*` 返回 404；现有登录测试全部照旧通过。
3. 服务端：App 通道收口启用时，「App 通道类请求」（第 3.5 节定义，包括任何不经 Access 的公网主机名）访问 `/auth/app-handoff`、`/api/auth/hosted/**` 返回 404；第 3.5 节「未登录面清单」里的每一项都有端到端断言。
4. 身份对齐：带 `custom.union_id` 的 Access JWT 产生的会话，和同一 union_id 飞书直接登录产生的会话，`personKey` 相同、`hasMultipleSessionPeople` 为 false、作用域相同（都 admin+client，见第 3.3 节默认规则）；老 Access 会话改标签而不是被吊销；改标签前按旧 personKey 存的已读和欢迎提示，改标签后仍读得到（迁移测试）。
5. 会话上限：同一身份连续 5 次 Access 签发后，飞书设备会话仍然有效；连续签发 11 个设备会话后，Access 会话仍然有效（两类分开计数）。
6. 名单收紧：把人从 `CRYBOT_FEISHU_ALLOW` / `CRYBOT_FEISHU_TENANTS` 去掉或从 `CRYBOT_FEISHU_ADMINS` 去掉后重启，该人的飞书设备会话被吊销或降级（有测试）。
7. 网页：登录页在描述里有 `feishu` 时显示「飞书登录」，点了走 `/auth/feishu/start` → 飞书 → `/auth/feishu/callback` → 回到首页已登录（用假飞书的端到端测试）；`next` 开放重定向用例全部回到 `/`。
8. 安卓：真机上装了飞书时一键拉起飞书授权并回到 App 已登录；没装飞书时用系统浏览器完成；配对码登录仍可用。Actions 上 `assembleDebug`、`lintDebug`、`testDebugUnitTest` 绿。
9. iOS（T-1221 子任务）：同第 8 条；手表拿到的凭据不再要求 CF cookie。Actions 上 CryNetTests、App 构建绿。
10. 桌面：打包时指向 App 通道，窗口内飞书登录完成后进入主界面；自动更新照旧从主域名的 `/desktop-updates` 取。
11. 真机验收（协调者在预览环境做）：iOS 和安卓各一台，装/不装飞书两种情况都能登录；退出登录只吊销本设备；管理员在设备列表能吊销任一台。
12. `docs/self-hosting.md` 写清飞书登录和 App 通道的配置方法；自托管不配也能用。部署仓库的模板、Secret 落盘、回退步骤齐全（任务 10）。
13. 上线前旧的无 Access 公网主机名已收掉；合并后部署到线上并核对：主域名浏览器登录无变化，App 通道五端可登录。

### 范围
- 做：修 main 上 `index.ts` 行数棘轮（任务 00）、服务端飞书登录模块、App 通道收口、Access 身份对齐和 personKey 兼容、网页登录页按钮、安卓原生登录页、iOS 登录（作为 T-1221 子任务交付）、手表凭据合同、桌面指向 App 通道、文档、端到端测试、发版配置、部署仓库；并入 T-1220（App Links / Universal Links）未合并的改动。
- 不做：飞书内免登（`tt.requestAccess`）、网页内嵌扫码组件、桌面系统浏览器加本地回环登录、通讯录离职核对、令牌和设备绑定的密码学保护（见「后续项」）。
- 不碰：主域名的 Access 应用和策略、`/desktop-updates` 的 Bypass、工作伙伴（`HOSTED_WORKSPACE`）和云团队（`CLOUD_TEAM`）的登录逻辑、`tunnelListener` 和 `tailnetShare` 两个独立监听入口。

### 约束
1. 公开仓库：代码、测试、夹具、文档、注释里只出现 `example.com`、`cli_example`、虚构名字；不出现内部域名、IP、邮箱、人名、密钥、真实实例 ID。
2. `server/index.ts` 行数棘轮：`scripts/testing/file-size-ratchet.test.ts` 的上限是 **15515** 行（口径同 `wc -l`）；2026-11-14 main 上实际是 **15562** 行，超 47 行，所以测试本来就是红的。任务 00 先把它降到 ≤ 15515（拆模块，不调上限）。之后每个任务：新逻辑放新模块，`index.ts` 行数不超过分支起点的行数，且始终 ≤ 15515。
3. 飞书 App Secret 只在服务端（Secret 文件）；任何客户端、安装包、日志、错误信息、environment 描述都不出现 Secret。
4. 授权 code、code_verifier、`cry_sess_`、JWT 不进日志；`/auth/feishu/*` 的访问日志不记查询串。union_id 不是秘密，可以写进服务端日志（运维要靠它填名单）。
5. 不用已下线的飞书移动登录 SDK（LarkSSO）。iOS 只用系统框架。安卓只用系统框架，唯一例外是协调者已批准的单测依赖 `junit:junit:4.13.2`（只用于 `testImplementation`）。
6. 名单只认 union_id，不认邮箱（飞书官方说邮箱是管理员导入的、未经本人验证；我们也不申请邮箱权限）。
7. 浏览器从主域名进来的流程不改。
8. 跑测试：vitest 用 `--maxWorkers=2`；浏览器测试、端到端测试进仓库，以 Actions 为准。

### 停止条件（遇到就停手汇报，不要自己绕）
1. 飞书 v3 token 接口实测不接受 PKCE（`code_verifier`）且 v2 也不行。
2. 飞书客户端里的授权页跳到我们的 https 回跳地址时，iOS 或安卓都既不触发 Universal Link / App Link、也不肯打开 `crybot://` 回跳页按钮（意味着「拉起飞书」这条路走不通）。
3. 新建的飞书应用拿到的 union_id 和 Access 那边（统一认证）拿到的不一样。
4. 需要改主域名的 Access 应用或策略才能做下去。
5. `index.ts` 行数做不到满足约束 2。
6. 需要白名单之外的第三方依赖。
7. personKey 兼容方案在某个存储上做不到「读旧写新」（例如数据按 key 做了不可逆聚合）。

### 已定的决定
1. 用户已同意：飞书新建自建应用「Cry Bot」（计划 A，用户自己在后台建）。新应用必须建在和现有统一认证登录应用**同一个企业**下，这样 union_id 一致。后台有「移动应用登录」能力就开，没有就跳过（授权端点 + Applink 方案不依赖它）。
2. 用户已同意：开一条不经 Cloudflare Access 的 App 通道，由 Cry Bot 服务端自己校验 Bearer；用户已同意统一认证的 OIDC 声明加 `union_id`。
3. 手机端用飞书官方推荐的「OAuth 授权端点 + Applink 拉起飞书客户端 + PKCE」，不用旧 SDK；没装飞书时退回系统浏览器组件。
4. App 通道用**单独的一级子域名**（免费证书只覆盖一级子域名），不用「同一主机名按路径 Bypass」。
5. T-1220（App Links / Universal Links）的服务端和安卓改动并入本任务的任务 02，作为起点；iOS 部分（`mobile/ios` 的 `project.yml`、entitlements、`ViewController.swift`）一律归 T-1221-01，接力回调行为由 T-1221-03 接手，任务 02 不碰 `mobile/ios`。02 与 T-1221-01 互不依赖，谁先合都行（2026-11-14 协调者定）。
6. 主域名浏览器登录维持 Access 不变。
7. iOS 登录界面作为 T-1221 的子任务交付（本规格第 5 节写清 T-1221 要预留什么）。
8. 限流在服务端做（免费套餐唯一一条限流规则已被占用）。
9. 作用域：飞书身份用单独的 `feishuScopes(unionId, cfg)`，不复用按邮箱的 `allowedScopes`。没配 `CRYBOT_FEISHU_ADMINS` 时与 Access 一致：在 ALLOW 名单里即 admin+client。
10. personKey：采用「读取时别名兼容」——新 key 读不到时回落旧 key，写入一律用新 key；不做一次性迁移。
11. 旧的无 Access 公网主机名：**两条都做**——上线前收掉（任务 09、10 和部署清单），同时规则改成「经过代理且没有有效 Access JWT 的请求一律按 App 通道处理」。
12. 安卓单测依赖 `junit:junit:4.13.2` 已批准；`mobile.yml` 加 `testDebugUnitTest` 由任务 05 做。
13. 新增任务 10（部署仓库）和任务 00（修棘轮，排在所有任务之前）。
14. 会话按种类分开计数：Access 会话和设备会话互不吊销。
15. 飞书回跳的自定义 scheme 用 `crybot://feishu?...`（host 是 `feishu`），不和接力的 `crybot://auth` 共用 host，避免安卓 intent-filter 冲突。
16. 名单收紧后：启动时按当前配置重新核对飞书设备会话（吊销不在名单的，按当前配置重算作用域）。
17. 手表 `cfAuthorization` 可选归 **T-1222-07**（`Shared/` 只对它开例外，只限 `WatchContract.swift`），须在 T-1221-05 开工前合并；T-1221-05 依赖 07、不改 `Shared/`，只消费结果（2026-11-14 协调者定，原待确认第 7 条）。

### 来源
- 现有代码：`server/cf-access.ts`、`server/sessions.ts`（`issueAccess`、`renew`、`revalidateEmailSessions`、`MAX_ACCESS_SESSIONS_PER_IDENTITY`）、`server/request-auth.ts`（`resolveRequestAuth`、`isProxied`、`PROXY_HEADERS`、`requestSource`）、`server/app-handoff.ts`、`server/person-key.ts`、`server/person-name.ts`、`server/environment.ts`、`server/account-signin.ts`、`src/pair/PairPage.tsx`、`electron/desktop-build-config.mjs`、`mobile/android/.../MainActivity.kt`、`mobile/ios/Shared/WatchContract.swift`。
- 飞书开放平台：移动应用登录（Applink 接入）、获取授权码、获取 user_access_token（v3）、获取用户信息、重定向 URL 配置、用户身份（union_id）、自建应用发布。
- Cloudflare：Access 策略与应用路径、限流规则、连接限制（读超时 125 秒）、WebSockets、服务令牌。
- T-1221 规格第 1.1、1.3、3 节和任务 01、03、05；审核 review-1。

---

## 1. 现状（调研结论）

| 端 | 现在怎么登录 | 问题 |
|---|---|---|
| 网页 | 主域名在 Access 后面，身份源是统一认证（OIDC，sub=飞书 union_id）。Access 放行后 `cf-access.ts` 发 `cry_sess_` cookie。 | 无问题，保持。 |
| 桌面（mac/Win） | 窗口直接加载主域名，Access 登录在窗口内完成（`CRYBOT_LOGIN_HOSTS` 放行登录域名）。 | 能用；但依赖 Access 的 720 小时 cookie。 |
| 安卓 | WebView 壳。T-1218：开系统浏览器 → `/auth/app-handoff` → Access → 加密回传 CF JWT 到 `crybot://auth` → 塞进 WebView 的 cookie。 | 要跳到浏览器，用户不满意。 |
| iOS | 同安卓（T-1221 正在改原生，第 3 节沿用接力）。 | 同上。 |
| 手表 | `WatchCredentials{server, sessionToken, cfAuthorization, cfExpires}`，`isReady` 要求有 CF cookie。 | 不经 Access 时 CF cookie 为空，手表会认为没登录。 |

服务端要点：
- `cf-access.ts`：请求**没带** `Cf-Access-Jwt-Assertion` 就直接交给普通认证（Bearer、ticket、cookie）。所以任何不挂 Access 的主机名，配对过的会话已经能用，网页和配对接口也在公网上可达（现在就有一个这样的历史主机名）。
- 会话：`cry_sess_` 不透明令牌，盘上只存 sha256。默认 30 天，剩一半以内使用时**延长有效期（令牌值不变）**，最长 `SESSION_MAX_AGE_MS`（默认 180 天）。`issueAccess` 对同一身份复用内存里的令牌、按 `accessIdentity` 最多 5 个（`MAX_ACCESS_SESSIONS_PER_IDENTITY`），超出吊销最老的；服务重启后内存令牌丢失，浏览器再走 Access 会签新会话。
- `personKey`：有 `email` 用 `email:<email>`，否则 `session:<id>`。Access 会话没有 `email`，所以**每个 Access 会话各是一个 personKey**；按人分组（`person-name.ts`）用 `access:<accessIdentity>`。Access 会话的 `accessIdentity` 现在是 JWT 的 `sub`（Cloudflare 的用户 ID，不是 union_id）。
- 统一认证：sub=union_id，id_token 里总带 union_id；Access 的 OIDC 声明要显式透传才会出现在 JWT 的 `custom` 里（现在已透传 `name`）。
- Cookie：`cry_session_<端口>_<环境>`，`HttpOnly; SameSite=Lax`，cookie 请求要求同源；本机信任要求 Host 是 loopback 且没经代理。

## 2. 总体设计

```
                     ┌──────────── 主域名 crybot.example.com（Access）──────────┐
浏览器 ─────────────▶│ 网页 + /api + /auth/app-handoff + /desktop-updates(Bypass) │──┐
                     └───────────────────────────────────────────────────────────┘  │
                     ┌──────────── App 通道 crybot-app.example.com（无 Access）────┐  ├─▶ 同一个 Cry Bot 进程
iOS/安卓/桌面/手表 ─▶│ /api/**  /.well-known/**  /auth/feishu/**  网页静态        │──┘
                     └───────────────────────────────────────────────────────────┘
                                     │ 服务端用 App Secret 换 token
                                     ▼
                              飞书 accounts.feishu.cn
```

两种飞书登录流程：
- **F1 网页回调**（网页、桌面窗口、App 通道上的浏览器）：`GET /auth/feishu/start` → 302 飞书授权页 → `GET /auth/feishu/callback?code&state` → 服务端换 token、发会话 cookie → 302 `next`。
- **F2 原生交换**（iOS、安卓）：App 自己生成 state 和 PKCE，经 Applink 拉起飞书 → 飞书回跳 `https://crybot-app.example.com/auth/feishu/app-return?code&state`（Universal Link / App Link 直接回 App；没被系统接住时由这个页面再跳 `crybot://feishu?code&state`）→ App 校验 state → `POST /api/auth/feishu/exchange` → 拿到 `cry_sess_` 存进系统钥匙串。

## 3. 服务端

### 3.1 配置（环境变量）
| 变量 | 说明 |
|---|---|
| `CRYBOT_FEISHU_APP_ID` | 飞书应用 ID。没配 = 飞书登录整个关闭。 |
| `CRYBOT_FEISHU_APP_SECRET_FILE` | Secret 文件路径（推荐，部署见任务 10）。也接受 `CRYBOT_FEISHU_APP_SECRET`（直接值，自托管方便用），两者都有时文件优先。 |
| `CRYBOT_FEISHU_TENANTS` | 允许的 tenant_key，逗号分隔。配了飞书时**必填**，没填则飞书登录关闭并在启动日志报错。 |
| `CRYBOT_FEISHU_ALLOW` | 允许的人：**union_id**，逗号分隔；`*` = 白名单租户内任何人。默认空（谁都不放）。 |
| `CRYBOT_FEISHU_ADMINS` | 可选，union_id 或 `*`。见第 3.3 节作用域规则。 |
| `CRYBOT_FEISHU_SESSION_MAX_DAYS` | 飞书设备会话最长寿命，默认 90，且不超过 `CRYBOT_SESSION_MAX_DAYS`。 |
| `CRYBOT_FEISHU_TOKEN_ENDPOINT` | 默认 `https://accounts.feishu.cn/oauth/v3/token`；实测 v3 不认 PKCE 时可切 v2。 |
| `CRYBOT_APP_HOST` | App 通道主机名（如 `crybot-app.example.com`）。与 T-1220 的 `CRYBOT_APP_LINK_ORIGIN` 合并：后者改为由它推导，旧变量继续兼容一个版本。 |

`HOSTED_WORKSPACE` 和 `CLOUD_TEAM` 模式下飞书登录和 App 通道收口一律关闭。

### 3.2 新模块 `server/feishu-login.ts`
- `feishuLoginConfig(env)`：解析上面的变量，返回 `null` 表示关闭。
- `authorizeUrl({ redirectUri, state, codeChallenge })`：拼 `https://accounts.feishu.cn/open-apis/authen/v1/authorize?client_id&response_type=code&redirect_uri&state&code_challenge&code_challenge_method=S256&prompt=consent`（不要 `offline_access`，我们不保存飞书的 refresh_token）。
- `exchangeCode({ code, codeVerifier, redirectUri })`：按官方要求用 `application/x-www-form-urlencoded` POST token 接口（`grant_type=authorization_code, client_id, client_secret, code, code_verifier, redirect_uri`），超时 10 秒；再 GET `/open-apis/authen/v1/user_info` 取 `union_id, tenant_key, name, avatar_url`。飞书的 user_access_token 用完即丢，不落盘。
- `admitFeishuUser(info, config)`：校验 tenant_key 在白名单、union_id 在 ALLOW；返回 `{ identity: "feishu:<union_id>", unionId, tenantKey, displayName, scopes }` 或拒绝原因。拒绝时服务端日志记 `union_id`、`tenant_key` 和原因（便于运维填名单），客户端只拿到通用错误码。
- `feishuScopes(unionId, config)`：见 3.3。
- `allowedRedirectUris(config, publicOrigin)`：只允许本服务的 `<origin>/auth/feishu/callback`、`<origin>/auth/feishu/app-return`；有 `CRYBOT_APP_HOST` 时 origin 是 `https://<它>`，否则是实例的公开 origin。
- 飞书接口的 HTTP 调用通过可注入的 `fetch`，测试用假飞书 `server/testing/fake-feishu.ts`。

### 3.3 身份、作用域与会话
**作用域** `feishuScopes(unionId, cfg)`：
- 没配 `CRYBOT_FEISHU_ADMINS`：在 ALLOW 里（含 `*`）即 `admin+client`，与 Access 现状一致（Access 放行的人都是 owner）。ALLOW 为 `*` 且没配 ADMINS 时启动打一次警告。
- 配了 ADMINS：在 ADMINS 里（或 ADMINS 为 `*`）`admin+client`，否则 `client`。

**会话种类**：`SessionRecord` 新增 `source?: "access" | "device"`。旧记录没有该字段：有 `accessIdentity` 的视为 `access`，其余照旧（配对、邮箱、脚本令牌不受影响）。
- `issueAccess` 的 5 个上限只数 `source=access`（含旧记录）；
- 新增 `issueDevice(identity, label, { displayName, accessEmail?, scopes, maxAgeDays, platform, tenantKey })`：**每次都发新令牌**；`source=device`；上限 10 个只数 `source=device`，超出吊销 `lastSeenAt` 最早的；
- 两类会话互不吊销（验收 5）。

**寿命**：设备会话记 `maxAgeAt = createdAt + maxAgeDays`；`renew` 对有 `maxAgeAt` 的会话取 `min(现有规则, maxAgeAt)`，没有该字段的旧会话行为不变。

**邮箱字段**：飞书会话即使拿到邮箱也写进 `accessEmail`，不写 `email`，避免被 `revalidateEmailSessions`、`ownersDevice` 当成邮箱登录会话。

**名单收紧**（参照 `revalidateEmailSessions`）：新增 `revalidateFeishuSessions(config)`，启动时调用一次（配置只在重启时变）：`source=device` 且 identity 以 `feishu:` 开头的会话，tenant 或 union_id 不在当前名单的吊销；作用域按当前 `feishuScopes` 重算并持久化。`source=access` 的会话仍由 Access 管，不动。

**Access 身份对齐**（改 `cf-access.ts`）：JWT 的 `custom.union_id` 存在时 identity 取 `feishu:<union_id>`，否则沿用 `sub`。遇到 `accessIdentity === claims.sub` 的已有会话时，把同一 `accessIdentity` 的所有会话**改标签**为 `feishu:<union_id>`（不吊销），只改一次。

**personKey（读取时别名兼容）**：
- `personKey(session)`：`accessIdentity` 以 `feishu:` 开头时为 `hash("feishu:<union_id>")`，优先于 email；其他情况不变。写入一律用它。
- `SessionRecord` 新增 `formerPersonKeys?: string[]`（最多 20 个）：改标签时，把该身份所有会话的旧 key（`hash("session:<id>")`）合在一起写进每个会话；之后同一身份新签发的会话（Access 或设备）继承这份列表。
- `personKeys(session)` 返回 `[新 key, ...formerPersonKeys]`；`isPerson(session, key)` 判断 key 是否属于此人。
- 读取：按 personKey 取数据的地方先用新 key，取不到再依次用旧 key；比较「这条数据是不是这个人的」的地方改用 `isPerson`。
- 已知受影响（非团队模式也会走到的）：`server/host/room-reads.ts`（已读）、`server/routes/me.ts`（欢迎提示 `welcome.read`）、`server/index.ts` 约 1113 行（会话发起人判断）和约 4801/4806 行（SSE 按人过滤）、`server/host/mcp-sign-in-cards.ts`、`server/host/member-uploads.ts`、`server/host/bot-access-gate.ts`、`server/routes/shared-computers.ts`、`server/bot-api-host.ts`、`server/host/phones.ts`、`server/host/person-bot-order.ts`（非管理员分支）、`server/person-name.ts`（第 27 行起的名字查找、`hasMultipleSessionPeople` 分组）。任务 04 必须逐个核对全部 85 处调用，分成「写 / 读 / 比较 / 仅团队模式（按邮箱，不受影响）」四类，写进汇报。
- 已经被吊销或过期的旧 Access 会话下的数据，现在本来就找不回（每次重启后 Access 会签新会话、新 key），本期不追。

### 3.4 新接口
| 接口 | 谁用 | 说明 |
|---|---|---|
| `GET /.well-known/crybot/environment` | 全部 | 描述里新增 `capabilities.feishuSignIn: boolean` 和 `feishu: { appId, authorizeEndpoint, appReturnUrl, webStartPath }`（不含 Secret）。没配飞书时没有这两个字段。`index.ts` 里五处 `environmentDescriptor(...)` 调用改为一个统一 helper，避免漏字段（任务 01）。 |
| `POST /api/auth/feishu/exchange` | iOS、安卓 | 请求 `{ code, codeVerifier, redirectUri, platform: "ios"\|"android"\|"desktop", label }`；成功 `200 { token, session, cookieName }`；失败 `400 { error: "feishu_code_invalid" }`、`403 { error: "feishu_not_allowed" }`、`429 { error: "rate_limited" }`、`502 { error: "feishu_unavailable" }`。只接受 JSON；请求带 `Origin` 头时 403（原生客户端不带）。 |
| `GET /auth/feishu/start?next=/` | 网页、桌面 | 生成 state 和 PKCE，写 10 分钟有效的签名 cookie `cry_feishu_flow`（`HttpOnly; Secure; SameSite=Lax; Path=/auth/feishu`，内容 `{state, verifier, next}`），302 到飞书授权页。`next` 校验见下。 |
| `GET /auth/feishu/callback?code&state` | 网页、桌面 | 校验 cookie 签名和 state，换 token，`issueDevice(platform: "web")`，发会话 cookie（沿用 `sessionCookieName` 和现有属性），清临时 cookie，302 到 `next`；失败 302 `/pair?error=<错误码>`。 |
| `GET /auth/feishu/app-return?code&state` | iOS、安卓兜底 | 小页面：自动跳 `<CRYBOT_APP_SCHEME>://feishu?code&state`，同时显示「回到 Cry Bot」按钮；`Cache-Control: no-store`、`Referrer-Policy: no-referrer`、严格 CSP。 |
| `GET /auth/app-return?<接力参数>`（T-1220 已有，改造） | iOS 17.0–17.3、安卓 App Links 失败时兜底 | 小页面：自动跳 `<CRYBOT_APP_SCHEME>://auth?<原查询串>`，同时显示「回到 Cry Bot」按钮；跳转目标的 scheme、host 固定，查询串原样带过去（不解析、不增删），任何参数都改不了跳转目标（不做开放重定向）；`Cache-Control: no-store`、`Referrer-Policy: no-referrer`、严格 CSP，和 `/auth/feishu/app-return` 同一模式；访问日志不记查询串；没配应用链接时 404。 服务器配了应用链接时接力一律跳到这里：iOS 17.4 及以上的 https 回调会被 `ASWebAuthenticationSession` 在页面加载前截走，不受影响；客户端不带版本参数（任务 02）。 |

`next` 校验：`new URL(next, 本站 origin)` 解析，`origin` 不等于本站则用 `/`；只取 `pathname + search`。必须覆盖：`//evil.example.com`、`/\evil.example.com`、`/%5Cevil.example.com`、`/%2F%2Fevil.example.com`、带制表符和换行的写法、`https://evil.example.com`、`javascript:`。

### 3.5 App 通道收口（`server/app-host.ts`，并入 T-1220）
**启用条件**：配了 Access（`cfAccess` 存在）或配了 `CRYBOT_APP_HOST`，且不是 `HOSTED_WORKSPACE` / `CLOUD_TEAM`。都没配的自托管实例完全不变。

**App 通道类请求**的定义：
- `Host` 等于 `CRYBOT_APP_HOST`；或
- 经过代理（`isProxied(req)`，即带任一 `PROXY_HEADERS`）且**没有通过验证的 Access JWT**。

这样任何不经 Access 的公网主机名（包括历史遗留的那个）都自动受同样的限制，不依赖记得改名单。

**挂载位置**：`index.ts` 里 `desktopUpdateFiles`（约 12608 行）照旧最先执行（`/desktop-updates` 本来就是公开文件，经 Bypass，不带 JWT，不能被当成 App 通道拦掉）；收口中间件挂在 `cfAccess` 检查之后、`/auth/app-handoff` 之前。`cfAccess` 对验证通过的请求打一个标记（例如 WeakSet），收口中间件读这个标记判断「有效 Access JWT」。带 `Cf-Access-Jwt-Assertion` 头、但 Host 是 `CRYBOT_APP_HOST` 的请求，在 `cfAccess` 之前直接 400。

**App 通道类请求上的规则**：
- 404：`/auth/app-handoff`、`/api/auth/hosted/**`。
- 允许：网页静态资源（开源代码，安卓 WebView 和桌面要用）、`/desktop-updates/**`、`/api/**`（照常鉴权）、`/.well-known/**`、`/auth/feishu/**`、`/auth/app-return`。
- 认证：沿用 `resolveRequestAuth`（Bearer → ticket → cookie，cookie 要同源）。本机信任本来就要求 Host 是 loopback 且没经代理，不用改。
- 限流（新 `server/auth-rate-limit.ts`，内存计数，来源 IP 统一用 `requestSource(req)`，与现有代码一致：对端是本机时取 `X-Forwarded-For` 最后一跳，经隧道时就是访问者 IP）：`/api/auth/feishu/exchange`、`/auth/feishu/callback`、`/api/auth/pair`、**`/api/pair`**、`/api/auth/email/start`、`/api/auth/email/verify` 每 IP 每分钟 10 次；超出 429 加 `Retry-After`。键数上限 10000。非 App 通道类请求不限。
- 审计：登录成功、失败、限流命中、会话吊销各写一行 `auth_audit` 结构化日志（时间、动作、平台、身份标签或「未知」、union_id（如有）、来源 IP、结果），不写令牌、code、配对码。

**未登录面清单**（`index.ts` 路由是内联 if，没有路由表可枚举，所以以下清单写死在测试里，并随路由改动维护）。端到端测试以 App 通道 Host、不带凭据逐条请求并断言：
| 路径 | 期望 |
|---|---|
| `/api/health`、`/api/brand`、`/.well-known/crybot/environment`、domain-check | 200（或 domain-check 无挑战时 404） |
| `/api/health/hosted` | 503（非 hosted 部署） |
| `/auth/app-handoff` | 404 |
| `/api/auth/hosted/` 下任意路径 | 404 |
| `/mcp-oauth/callback`（`MCP_OAUTH_CALLBACK_PATH`） | 不泄露数据（无有效 state 时 4xx） |
| 静态资源和 SPA 入口 `/`、`/pair` | 200（公开代码） |
| 邮箱登录 start/verify（`emailSignInRoute`） | 没开邮箱登录时 404；开了时错误码 4xx |
| `cloudSigned`、`chatApps.serveFile` 的路径 | 无签名时 4xx |
| `POST /api/auth/pair`、`POST /api/pair` | 错误码 4xx，第 11 次 429 |
| `/auth/feishu/start`、`/auth/feishu/callback`、`/auth/feishu/app-return`、`POST /api/auth/feishu/exchange` | 无效参数 4xx |
| `resolveRequestAuth` 之后的代表性接口：`/api/bots`、`/api/events`、`/api/config`、`/api/inbox`、`/api/auth/sessions`、`/api/auth/pairing`、上传、下载 | 401/403 |
| WebSocket upgrade（`upgrades.attach` 也经过 `handleRequest`） | 401/403 |
| 带 `Cf-Access-Jwt-Assertion` 且 Host 为 App 通道 | 400 |

`tunnelListener` 和 `tailnetShare` 是独立监听入口，不经这个收口，行为不变（测试里注明）。

**应用链接**（来自 T-1220）：AASA 的 `components` 加 `/auth/feishu/app-return`；assetlinks 不变；两份文件只在 App 通道（`CRYBOT_APP_HOST`）上提供。

**长连接**：经隧道，Cloudflare 读超时 125 秒，现有 SSE 15 秒心跳够用；客户端已有断线重连。

### 3.6 自托管兼容
- 不配 `CRYBOT_FEISHU_APP_ID`：没有任何新路由、描述里没有新字段、登录页没有按钮。
- 没配 Access 也没配 `CRYBOT_APP_HOST`：没有收口、没有新限流。
- 没 Access 也能单独用飞书登录（F1/F2 都不依赖 Access）。

### 3.7 威胁模型与已知取舍
- **令牌落地**：安卓的 `cry_sess_` 一份用 Keystore 加密存 SharedPreferences，另一份写进 WebView 的 cookie 库（应用沙箱内明文）。所以 Keystore 只防「备份导出 / 简单取文件」，不防已 root 或沙箱被攻破的设备。iOS 存 Keychain（`ThisDeviceOnly`）。桌面在 Electron 的会话 cookie 里（用户目录内明文）。这和现在 Access cookie 的保护程度相同，不比现状差。
- **网页流程的 code_verifier**：只签名不加密，放在 HttpOnly、10 分钟、限定 `/auth/feishu` 路径的 cookie 里。能读到浏览器 cookie 库的人本来也能读到会话 cookie，所以本期接受；后续项可改为加密或存服务端。
- **自定义 scheme 被劫持**：别的 App 注册 `crybot://` 也只能拿到 code，没有 code_verifier 换不了 token（PKCE）。iOS 17.4+ 优先用 https 回调进一步降低风险。
- **Access 名单 ≠ App 名单**：从 Access 名单删人不会让 App 设备下线；App 侧以 `CRYBOT_FEISHU_ALLOW` 为准，重启时核对（3.3），并可在设备列表手动吊销。文档写明。
- **公网暴露面**：App 通道公网可达，依赖未登录面清单测试、服务端限流、配对失败锁定、飞书准入。

## 4. 各端设计

### 4.1 网页（`src/pair/PairPage.tsx`）
- 描述里 `capabilities.feishuSignIn` 为真时，登录页顶部加「飞书登录」主按钮，点了跳 `/auth/feishu/start?next=<当前路径>`；配对码和邮箱留在下面。
- 回调失败回到 `/pair?error=...`，登录页显示中文提示。
- 主域名有 Access 时浏览器根本到不了登录页，所以对主域名没有影响。

### 4.2 桌面（Electron，mac 和 Windows）
- 发版配置 `defaultServerUrl` 改为 App 通道地址；`updateFeedUrl` 仍指主域名的 `/desktop-updates`。
- 放行导航的登录域名（`CRYBOT_LOGIN_HOSTS`，仓库密钥，协调者改值）：`accounts.feishu.cn`（已核实：授权页本身在这个域名直接返回 200，不重定向；页面资源来自 `feishucdn.com` 和 `feishu.cn` 子域名，属于子资源，不受导航放行影响）、`passport.feishu.cn`（扫码/旧版登录用到的域名，**是否出现在新授权页导航链里未核实**，预先放行）。兜底：任务 08 加一个「被拒导航」日志开关，协调者真机实测时打开，缺哪个域名就加进密钥，不用改代码。
- 窗口打开 App 通道 → 没登录显示 Cry Bot 登录页 → 「飞书登录」走 F1，全程在窗口内 → 回到主界面。
- 已经装了老版本、登录在主域名的用户：升级后指向新地址，需要重新登录一次（发版说明写清）。

### 4.3 安卓（`mobile/android`）
- 新增原生 `LoginActivity`（Kotlin，系统控件），在 WebView 之前：
  1. 读 environment 描述，按能力显示「飞书登录」「配对码登录」（和邮箱，如果开了）。
  2. 飞书：生成 state（32 字节随机）和 PKCE（S256），拼授权地址，`redirect_uri = https://<App 通道>/auth/feishu/app-return`；包成 `https://applink.feishu.cn/client/web_url/open?mode=window&url=<encode>`。
  3. 拉起飞书：Manifest 加 `<queries>` 声明 `com.ss.android.lark`（飞书）和 `com.larksuite.suite`（Lark 国际版）——这两个包名已在应用商店核实；企业定制版飞书可能用别的包名，未覆盖。装了任一个就 `setPackage` 打开 Applink，`startActivity` 抛 `ActivityNotFoundException` 时退回浏览器；都没装时用 `ACTION_VIEW` + `CATEGORY_BROWSABLE` 直接打开授权地址。
  4. 回跳：App Link（`autoVerify`，路径 `/auth/feishu/app-return`）和 `crybot://feishu` 两个入口都给 `LoginActivity`；现有 `MainActivity` 的 `crybot://auth` 不变（host 不同，不冲突）。
  5. 交换后：令牌用 Keystore 的 AES-GCM 密钥加密存 SharedPreferences；按返回的 `cookieName` 把会话写进 `CookieManager`（只对 App 通道主机，`Secure; HttpOnly; SameSite=Lax; Path=/`）；进 `MainActivity`，WebView 加载 App 通道。
- WebView 里登录过期时回到 `LoginActivity`；退出登录调 `/api/auth/logout`（只吊销本设备）后清本地。
- 保留配对码登录。
- 接力回跳：App Links 没接住 `https://<App 通道>/auth/app-return` 时，由这个页面再跳 `crybot://auth?<原查询串>` 兜底（第 3.4 节，任务 02），`MainActivity` 照常接。
- 旧的接力入口：描述里有 `feishu` 时不显示；没有时保留（服务端没配飞书的实例仍可用接力；此时服务器地址就是那台实例本身，不涉及 App 通道）。
- 单测：`testImplementation("junit:junit:4.13.2")`，`mobile.yml` 的 Android 步骤加 `testDebugUnitTest`（任务 05）。

### 4.4 iOS（T-1221 子任务，见第 5 节衔接）
- CryNet 新增 `FeishuLogin`：`begin(feishu:) -> FeishuAttempt`、`parseReturn(_:expecting:)`、`exchange(code:attempt:label:)`。
- 登录流程：`UIApplication.shared.open(applink, options: [.universalLinksOnly: true])`；返回 false（没装飞书）时退回 `ASWebAuthenticationSession`：iOS 17.4+ 用 `.https(host: <App 通道>, path: "/auth/feishu/app-return")` 回调，更低版本用 `callbackURLScheme: "crybot"`（app-return 页再跳 `crybot://feishu`）。
- `LoginRouter.handle(url:)` 接 `https://<App 通道>/auth/feishu/app-return`（Universal Link）和 `crybot://feishu`。
- 接力（T-1221-03 接手 T-1220）：iOS 17.4 及以上用 https 回调 `/auth/app-return`；17.0–17.3 用 `callbackURLScheme: "crybot"`，靠任务 02 的 `/auth/app-return` 兜底页再跳 `crybot://auth?<原查询串>`（第 3.4 节）。
- 服务器是 App 通道时请求只带 Bearer，不带 CF cookie。不引入新依赖。

### 4.5 手表
- `WatchCredentials.cfAuthorization`、`cfExpires` 改为可选；`isReady` 只要求 `server` 和 `sessionToken`；请求头只在有 CF cookie 时才带。
- 手机同步给手表的 `server` 是 App 通道地址。

## 5. 与 T-1221 的衔接（转给 T-1221 规格负责人）
T-1221 尚未开工，以下改动请直接写进 T-1221 的规格和任务说明，避免返工（2026-11-14 已落进 T-1221 规格第 1.1、3、14 节和任务 01、03、05、41；T-1221 第 14 节与本节不一致时以本节为准）：
1. **T-1221-01（工程）**
   - `project.yml` 一次写全时**保留 T-1220 的设置**：构建参数 `CRYBOT_APP_LINK_HOST`、`CRYBOT_IOS_ENTITLEMENTS`，目标里的 `CODE_SIGN_ENTITLEMENTS: $(CRYBOT_IOS_ENTITLEMENTS)`，Info.plist 的 `CRYBOT_APP_LINK_HOST` 键。
   - T-1221 规格里计划的 `CryBot.links.entitlements` / `CRYBOT_LINK_DOMAIN` 改为沿用 T-1220 的 `CryBot-AppLinks.entitlements` / `CRYBOT_APP_LINK_HOST`（一个名字）。因为一个 target 只有一个 entitlements 文件，keychain 共享组要同时写进两份：`CryBot.entitlements`（只有 keychain 组）和 `CryBot-AppLinks.entitlements`（keychain 组 + `applinks:` + `webcredentials:`），由 `CRYBOT_IOS_ENTITLEMENTS` 选择。
   - `CRYBOT_IOS_ENTITLEMENTS` 默认值 `CryBot/CryBot.entitlements`（照 T-1221，不用 T-1220 的空值）。
   - T-1220 的 iOS 部分（`project.yml`、entitlements、`ViewController.swift`）全归 T-1221-01；本规格任务 02 不碰 `mobile/ios`，两者互不依赖。`ViewController.swift` 的改动不搬（T-1221-02 删掉这个文件），其接力回调行为由 T-1221-03 接手。
   - 启用 Associated Domains 需要在 Apple 开发者后台给 App ID 打开该能力并重新生成描述文件——由 T-1222 任务 09 列为协调者步骤，T-1221-41 发版前核对。
2. **T-1221-03（CryNet）**
   - `SessionStore` 存 `SessionRecord` v2：`{ version: 2, server: { webURL, apiURL }, method, sessionToken, sessionExpires?, cfAuthorization?, cfExpires? }`（CF 两项可选，没有时不写），结构和登录方式见本节第 5 条；`version` 不认识时当作未登录、保留服务器地址。
   - `HTTPClient` 只有在 `cfAuthorization` 有值时才带 `Cookie: CF_Authorization=…`；只有 Bearer 时照常工作。Set-Cookie 轮换保留，但不是必经路径（App 通道上令牌值不变，服务端只延长有效期）。
   - 「登录过期」判断不变；CF JWT 快过期的提示只在有 `cfExpires` 时出现。
   - 回调分发：`crybot://auth`（接力，按 `v` 分发）之外，预留 `crybot://feishu` 和 `https://<App 通道>/auth/feishu/app-return` 两个入口的注册点（T-1221-03 定名为 CryNetLogic 的 `CallbackRouter.register(host:handler:)` / `register(httpsPath:handler:)`，https 主机取 `CRYBOT_APP_LINK_HOST`，比较不区分大小写），由 T-1222-06 填实现。T-1221-03 自己注册接力的 host `auth` 和 https 路径 `/auth/app-return`（接手 T-1220：17.4 起且有主机名用 https 回调，17.0–17.3 或主机名为空用 `crybot://auth`；设了主机名时 `crybot://auth` 照样接；两种都交给 `HandoffRegistry` 按 `v` 分发；17.0–17.3 依赖本规格任务 02 的 `/auth/app-return` 兜底页再跳 `crybot://auth`，见第 3.4 节）。https 路径整段精确匹配，`/auth/app-return` 和 `/auth/feishu/app-return` 互不接走。
   - 测试补「只有 Bearer」时的请求头断言（不带 CF cookie、不带 Origin）。
3. **T-1221-05（登录界面、手表同步）**
   - `LoginFlowView` 预留「首选登录方式」插槽（T-1221-05 在 `LoginModel` 上提供注册接口，例如 `registerPreferredMethod(_:)`，带显示条件、按钮和启动动作）：描述里有 `feishu` 时放 T-1222-06 的飞书按钮在第一位，旧接力只在没有飞书时显示。
   - `LoginRouter.handle(url:)` 走 03 的回调注册点，不写死只认 `crybot://auth`。
   - 手表：`Shared/WatchContract.swift` 的 `cfAuthorization` 可选由 **T-1222-07** 完成（已定的决定第 17 条）：07 在 T-1221-05 开工前合并，作为「Shared 本期不动」的唯一例外；T-1221-05 的依赖里写 T-1222-07，只消费结果，`Shared/` 仍禁改。
4. **T-1221-41（发版）**：发版前确认描述文件含 Associated Domains；`CRYBOT_SERVER_URL` 指 App 通道（见第 6 节发版顺序）；`CRYBOT_APP_LINK_HOST` 取公开仓库的 Actions 仓库变量 `vars.CRYBOT_APP_LINK_HOST`（variables 不是 secrets，值是公开的 App 通道主机名，协调者在第 6 节发版顺序第 4 步设置），为空就停手汇报。
5. **T-1221 已有、T-1222-06 要遵守的约定**（来自 T-1221 规格第 3、14 节）：
   - 会话记录：CryNetLogic 的 `SessionRecord` 是 `{ version: 2, server: { webURL, apiURL }, method, sessionToken, sessionExpires?, cfAuthorization?, cfExpires? }`，存 Keychain（`AfterFirstUnlockThisDeviceOnly`）。`method` 是带 `other(String)` 兜底的枚举（`cfHandoff`、`pairing`、`email`、`legacyCookie`、`feishu`），解码遇到新值原样保留。`.feishu` 由 T-1221-03 定义（编码为 `"feishu"`），06 直接用，不用 `other("feishu")`、不改 CryNetLogic 的枚举。飞书登录写入 `version: 2`、`method: .feishu`、不带 CF 字段，`sessionExpires` 取 exchange 返回的会话过期时间（有就写）；过期规则和 `pairing`、`email` 这些服务端签发的 Bearer 会话相同，以服务端返回的过期时间为准。
   - 网页入口和 API 入口拆分：`CryServer` 有 `webURL` 和 `apiURL`（缺省等于 `webURL`；服务器地址类型叫 `CryServer`，`ServerAddress` 已被 `Shared/` 占用）。描述（`/.well-known/crybot/environment`）和 `POST /api/auth/feishu/exchange` 都发往 `apiURL`；授权地址里的 `redirect_uri` 用描述里的 `feishu.appReturnUrl`，不自己拼。飞书登录不改 `server`，沿用当前的 `webURL`/`apiURL`。
   - 接力回调按 `v` 分发：`crybot://auth?v=…` 归接力（`HandoffRegistry.register(version:handler:)`），飞书回跳不占 `v`、不注册 `auth`；飞书只在 `CallbackRouter` 上注册 host `feishu` 和 https 路径 `/auth/feishu/app-return`。
   - Universal Link：https 回调只认 `CRYBOT_APP_LINK_HOST`（构建时注入）；它必须等于 App 通道主机名（部署和发版时由协调者保证）。为空时（开发包、自托管）https 回调一律不接，只能靠 app-return 页跳 `crybot://feishu`。

## 6. Cloudflare 与部署变更（只写计划；协调者执行，用户已同意新主机名和 OIDC 声明）
1. 隧道（规则在后台托管）加 ingress：`crybot-app.example.com` → `http://127.0.0.1:<Cry Bot 端口>`，放在通配规则之前。先导出当前规则备份。
2. DNS：`crybot-app` 开代理的 CNAME 指向隧道（一级子域名）。
3. Access：**不建**应用。核对没有通配主机名的 Access 应用会盖到它；以后如果加了通配应用，必须给这个主机名加 Everyone + Bypass。
4. 统一认证（OIDC 身份源）的「OIDC 声明」里加 `union_id`。改完后用户在浏览器重新登录一次 Access。
5. 限流：不加 CF 规则，全部靠服务端。
6. **上线前收掉旧的无 Access 公网主机名**（隧道规则 + DNS，以及对应的残留 Access 应用），步骤写进部署仓库（任务 10），协调者在发版前执行。服务端规则（3.5）同时兜底。
7. 服务器环境变量和 Secret 文件：见任务 10。
8. 回退：删 App 通道的 ingress 和 DNS、去掉飞书变量后重启；主域名不受影响。

**发版顺序**（`CRYBOT_SERVER_URL` 是桌面、安卓、iOS 共用的仓库密钥）：
1. 服务端带收口和飞书登录部署上线，主域名行为不变，旧客户端（指主域名、用接力）继续可用。
2. 开 App 通道主机名，线上核对未登录面。
3. 收掉旧的无 Access 主机名。
4. 协调者把 `CRYBOT_SERVER_URL` 改为 App 通道、`CRYBOT_LOGIN_HOSTS` 加飞书域名，并在公开仓库设 Actions 仓库变量（variables，不是 secrets）`CRYBOT_APP_LINK_HOST=<App 通道主机名>`，然后桌面和安卓一起发新版；iOS 跟 T-1221 发版（T-1221-41 读这个变量，为空就停）。
5. 主域名上的 `/auth/app-handoff` 保留，供还没升级的旧客户端使用；下一个大版本再评估去掉。

## 7. 测试与 CI
- 单元（vitest，`--maxWorkers=2`）：`feishu-login.test.ts`（授权地址、PKCE、form 编码、换 token 成功/各种失败、超时、租户和名单、`feishuScopes` 各分支、redirect 白名单、Secret 不出现在任何返回值和日志里）、`sessions`（`issueDevice` 每次新令牌、上限 10、种类分开计数、`maxAgeAt`、`revalidateFeishuSessions`）、`cf-access`（union_id 对齐、改标签、`formerPersonKeys`）、`person-key`（新 key、别名读取）、`app-host.test.ts`（App 通道类判定、404 清单、JWT+App Host 400、Bypass 路径不受影响）、`auth-rate-limit.test.ts`。
- 端到端（进仓库，Actions 跑）：假飞书（本地 HTTP，实现 authorize 302、v3 token、user_info）；F1 全流程、F2 交换；第 3.5 节未登录面清单；「没配飞书、没配 App 通道」回归。
- 安卓：JVM 单测（junit 4.13.2）；`mobile.yml` 跑 `assembleDebug lintDebug testDebugUnitTest`。
- iOS：随 T-1221 的 CryNetTests。手表测试在 `mobile.yml` 现有手表构建里跑。
- 桌面：`desktop-build-config`、导航放行测试补飞书域名用例。

## 任务拆分
| 编号 | 名称 | 依赖 | 估计 |
|---|---|---|---|
| 00 | 修 main 上 `index.ts` 行数棘轮（拆模块到 ≤ 15515，不调上限） | 无，排最前 | 0.5 天 |
| 01 | 服务端飞书登录核心（配置、飞书客户端、准入和作用域、`issueDevice` 与种类计数、名单核对、exchange、描述 helper） | 00 | 2.5 天 |
| 02 | App 通道收口 + 应用链接（并入 T-1220 的服务端和安卓部分、app-return 页、限流、审计、未登录面测试；不碰 `mobile/ios`） | 00 | 2 天 |
| 03 | 网页 F1 流程 + 登录页飞书按钮 + 假飞书端到端 | 01（合并在 02 之后） | 1.5 天 |
| 04 | Access 身份对齐 + personKey 别名兼容 | 01 | 2 天 |
| 05 | 安卓原生登录页（含 junit 和 `mobile.yml` 单测） | 01、02 | 3 天 |
| 06 | iOS 飞书登录（T-1221 子任务） | 01、02、T-1221-03、T-1221-05 | 1.5 天 |
| 07 | 手表凭据合同（CF cookie 可选） | 无；须在 T-1221-05 开工前合并 | 0.5 天 |
| 08 | 桌面指向 App 通道 + 飞书登录域名 + 被拒导航日志 | 03 | 1 天 |
| 09 | 文档、发版配置与顺序、整体回归 | 01–05、07、08、10 | 1.5 天 |
| 10 | 部署仓库（模板、Secret 落盘、隧道/DNS 步骤、旧主机名下线、回退） | 01、02（变量名定稿） | 1 天 |

并行：00 先行；然后 01、02、07 一批；03、04、05、10 第二批；08 第三批；09 收尾。06 跟 T-1221 走。
`index.ts` 冲突：00 → 01 → 02 → 03 → 04 的顺序合并，后合的变基；每个任务自己满足约束 2。
关键路径：00（0.5）→ 01（2.5）→ 05（3）→ 09（1.5）＝ **7.5 个工作日**；算上审核返工约 **9 天**。iOS 取决于 T-1221 进度。

## 待确认（定了以后搬进「已定的决定」）
1. App 通道上要不要提供网页：**建议提供**。安卓 WebView 和桌面都要加载网页；浏览器访问主域名仍走 Access。代价是公网能看到登录页（与自托管一样），靠飞书准入、配对锁定、服务端限流兜底。
2. App 通道上开不开配对码和邮箱登录：**建议配对码开、邮箱按现有开关**。
3. 飞书设备会话最长寿命：**建议 90 天**。
4. 要不要申请企业邮箱权限：**建议不申请**（名单只认 union_id）。
5. 离职核对：**建议本期不做通讯录每日核对**，靠租户校验、重启时名单核对、90 天封顶、设备列表吊销。
6. 桌面要不要也改走 App 通道：**建议改**。

## 后续项（二期）
- 飞书内免登（`tt.requestAccess`）、网页嵌入扫码、桌面系统浏览器 + 本地回环回调。
- 网页流程的 code_verifier 改为加密或存服务端（3.7）。
- 令牌和设备绑定的密码学保护；安卓去掉 WebView cookie 里的明文令牌（改为每次请求注入）（3.7）。
- 通讯录离职核对（需要额外权限）。

## 里程碑
- M0（第 0.5 天）：00 合并，main 上 CI 恢复全绿。
- M1（第 3 天）：01、02、07 合并；假飞书下 exchange 和 App 通道收口在 Actions 上绿。
- M2（第 6 天）：03、04、05、10 合并；用户的飞书应用已发版、App 通道主机名已开；预览环境里网页和安卓真机用真实飞书登录通过。
- M3（第 7.5 天）：08、09 合并；按第 6 节顺序上线；主域名无变化核对；旧主机名已收；桌面和安卓发新版。
- M4（随 T-1221）：iOS 和手表上线。

## 进度
### 已完成
- 调研、规格第 1 版、风险预演；审核 review-1 后的第 2 版。
### 下一步
- 协调者派 00；00 合并后派 01、02、07；把第 5 节转给 T-1221 规格负责人。
### 阻塞
- 真机验收依赖用户建好飞书应用并发版（开发不阻塞，全部先用假飞书）。

## 合同变更
- 2026-11-14 第 2 版（review-1）：
  - 新增任务 00（棘轮）、10（部署仓库）；01 加作用域规则、种类计数、名单核对、描述 helper；04 扩为 personKey 别名兼容；05 加 junit 和 CI；验收新增第 5、6 条，原第 3、4 条改写。
  - App 通道类请求改为「Host 是 App 通道，或经代理且无有效 Access JWT」；`/desktop-updates` 不再拦；限流加 `/api/pair`；来源 IP 统一用 `requestSource`。
  - 名单只认 union_id；飞书会话邮箱写 `accessEmail`；token 请求用 form 编码。
  - 自定义 scheme 回跳改为 `crybot://feishu`；iOS 17.4+ 优先 https 回调。
  - 新增第 3.7 节威胁模型、第 5 节与 T-1221 的衔接、发版顺序、后续项。
- 2026-11-14，与 T-1221 对齐（协调者定）：
  - 手表 `cfAuthorization` 可选定归任务 07（已定的决定第 17 条，原待确认第 7 条删去）；T-1221-05 依赖 07。
  - 第 5 节的要求已落进 T-1221 规格和任务 01、03、05、41；第 5 节新增第 5 条「T-1221 已有、T-1222-06 要遵守的约定」（会话记录版本和登录方式字段、网页入口和 API 入口拆分、接力回调按 `v` 分发、Universal Link 主机），任务 06 同步修改。
- 2026-11-14，与 T-1221 对齐第 2 轮（协调者定）：
  - T-1220 的服务端和安卓部分归任务 02，iOS 部分全归 T-1221-01（接力回调行为由 T-1221-03 接手），02 不碰 `mobile/ios`、与 T-1221-01 互不依赖（已定的决定第 5 条、第 5 节第 1、2 条、任务表、任务 02）。
  - `CRYBOT_IOS_ENTITLEMENTS` 默认 `CryBot/CryBot.entitlements`（第 5 节第 1 条）。
  - 登录方式用 T-1221-03 新加的 `.feishu`，不用 `other("feishu")`；过期规则同服务端签发的 Bearer 会话（第 5 节第 5 条、任务 06）。
  - `CRYBOT_APP_LINK_HOST` 发版时取公开仓库的 Actions 仓库变量，协调者在发版顺序第 4 步设置（第 5 节第 4 条、第 6 节、任务 09、10）。
- 2026-11-14，与 T-1221 对齐第 3 轮（协调者定）：
  - `/auth/app-return` 改为兜底页，再跳 `crybot://auth?<原查询串>`，给 iOS 17.0–17.3 和安卓 App Links 失败时用，归任务 02（第 3.4、4.3、4.4 节，第 5 节第 2 条，任务 02）。
  - 第 5 节第 2 条的存储结构改为和第 5 条一致的 `SessionRecord` v2。
  - 任务 09 上线清单编号与第 6 节发版顺序对齐。
