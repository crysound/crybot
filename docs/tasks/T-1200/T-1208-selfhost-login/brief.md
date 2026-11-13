# T-1208 Cloudflare Access 登录、桌面更新源、桌面默认连远程服务器

## 目标
1. 服务端放在 Cloudflare Access 后面时，用户在 Access 登录后打开网页直接进入 Cry Bot，不需要配对码、不需要再登录一次。
2. 服务端能把桌面安装包/更新文件放在 `/desktop-updates/` 下免登录下载。
3. 桌面版(Electron)构建时指定服务器地址后，安装打开就连这台服务器，登录页面在应用窗口内完成；自动更新只从我们自己的更新地址取，没配就关掉。

## 背景
- 执行规格 `docs/specs/2026-11-13-crybot.md`，先完整读。本任务是第 6 节全部、第 5 节「Desktop auto-update」段、第 7 节 Desktop 一条。改名已经做完(本分支基于改名分支 T-1207-rebrand 创建，它稍后会合并进 main)，名字一律按规格第 2 节。
- 认证现状(行号是改名前的，供参考，以实际代码为准)：`server/request-auth.ts` 里 `resolveRequestAuth`(同步)按顺序认会话(bearer `cry_sess_`、ticket、cookie)→ 本机回环 owner → 桌面 owner 头 → companion；带代理头且无会话时返回 403。会话签发的范例在 `server/routes/email-sign-in.ts`(`sessions.issue` + `serializeSessionCookie`)。主认证闸门在 `server/index.ts` 里(搜 `resolveRequestAuth`)，另外 `server/index.ts` 和 `server/routes/threads.ts` 还有调用点。`jose` 已经是依赖(6.2.10)。
- 线上形态：服务只听 127.0.0.1，前面是 Cloudflare 隧道 + Access。Access 放行的请求都带 `Cf-Access-Jwt-Assertion` 头(以及 `CF_Authorization` cookie)。Access 后面的身份源不一定给邮箱(可能为空或是 `xxx@feishu.invalid`)，所以 `CRYBOT_CF_ACCESS_ALLOW=*` 表示「Access 放进来的都认」，这时只靠 JWT 校验通过；配邮箱名单时按 JWT 的 `email` 匹配(大小写不敏感)。会话签发给 owner 身份(单用户自用产品)。
- 桌面端：`electron/main.mjs` 里远程环境用 `win.loadURL(remote.origin)`(搜 `activeRemote`)；远程环境现在通过配对(`desktop-remote:pair`)建立。`electron-builder.yml` 的 `publish` 目前还指向上游 GitHub，是高危项；`electron/updater.mjs` 是更新逻辑。

## 要做的事
### 服务端
1. 新增 `server/cf-access.ts`，按规格第 6 节实现：读 `CRYBOT_CF_ACCESS_TEAM_DOMAIN`、`CRYBOT_CF_ACCESS_AUD`(逗号分隔多个)、`CRYBOT_CF_ACCESS_ALLOW`；`createRemoteJWKSet(https://<team>/cdn-cgi/access/certs)` + `jwtVerify(issuer https://<team>, audience)`；JWKS 实例复用。
2. 在主认证闸门之前加一个异步步骤：请求没有有效 Cry Bot 会话、但带了 `Cf-Access-Jwt-Assertion` → 校验；通过且身份允许 → 签发 owner 会话 cookie(写进响应 `Set-Cookie`，并让本次请求后续的 `resolveRequestAuth` 看到这个会话，例如把 cookie 补进本次请求的 `headers.cookie`)；JWT 无效(签名错、aud/iss 错、过期) → 401，不再走其他信任路径；身份不在名单 → 403。WebSocket/SSE 升级请求同样处理(看闸门在哪些入口)。没配环境变量时行为完全不变。会话已有效时不重复签发。签发的会话有效期和 `email-sign-in` 一致。
3. `CRYBOT_DESKTOP_UPDATES_DIR` 设了就在 `/desktop-updates/` 只读提供该目录的文件，不需要登录：不列目录(目录请求 404)、防路径穿越(含编码后的 `..`、符号链接逃逸)、只认普通文件；content-type：`.yml` → `text/yaml`，`.zip` → `application/zip`，`.dmg` → `application/x-apple-diskimage`，`.exe` → `application/vnd.microsoft.portable-executable`，`.blockmap` → `application/octet-stream`，`.apk` → `application/vnd.android.package-archive`；`.yml` 不缓存，其他可缓存；支持 `HEAD` 和 `Range`(electron-updater 差分下载要用)。这个路由放在认证闸门之前。
4. 测试(vitest)：用 jose 本地生成密钥对、起一个假的 JWKS(注入 fetch 或注入 key set 的方式，别联网)，覆盖：有效 JWT 签发会话且后续请求凭 cookie 通过；无效签名/错 aud/过期 → 401；名单外邮箱 → 403；`*` 放行；未配置时原行为；`/desktop-updates/` 正常文件、目录、穿越、未配置。

### 桌面
5. 自动更新：`publish` 改成 generic provider，URL 取构建时环境变量 `CRYBOT_UPDATE_FEED_URL`；没设就不生成 publish 配置，且运行时更新器完全关闭(不检查、不报错弹窗)。如果 YAML 配置做不到「没设就去掉」，改成 `electron-builder.config.cjs`(或 .mjs)并更新 package.json 的打包脚本。保证任何情况下都不会去 GitHub 拿更新。
6. mac 签名公证：hardened runtime 开，`notarize` 在有 `APPLE_API_KEY`/`APPLE_API_KEY_ID`/`APPLE_API_ISSUER` 时开启、没有时关闭(本地无签名构建也能出包)；mac 目标包含 `dmg` 和 `zip`(自动更新要 zip)；Windows NSIS 不签名。核对 entitlements 文件还在且名字已改。
7. 默认服务器：构建时设了 `CRYBOT_DEFAULT_SERVER_URL`，就把它(和 `CRYBOT_LOGIN_HOSTS`)写进打包资源里的一个 JSON(构建脚本生成，不进 git)；首次启动(没有已保存的环境配置)时自动创建一个远程环境指向它并设为当前环境，不走配对，直接在主窗口加载。主进程如需自己调这台服务器的接口，用该窗口所属 Electron session 的 cookie(`net.request` 的 `useSessionCookies: true` 或 `session.fetch`)，不要求配对令牌。用户之后仍可在设置里切回本地或别的服务器。
8. 窗口内导航：主窗口顶层导航到服务器主机或 `CRYBOT_LOGIN_HOSTS` 里的主机时留在窗口内；其他 http/https 链接用系统浏览器打开(已有外链处理逻辑就在其上加白名单，不要另起一套)。Access 登录跳回后页面正常加载。
9. `/api/health` 之类公开接口不变。

## 范围
- 可以改：`server/`、`electron/`、`shared/`、`src/`(只限设置界面里与远程服务器/更新相关的必要改动)、`electron-builder.*`、`package.json` 的脚本、`scripts/` 里打包相关脚本、相应测试、`docs/`(新增一篇 `docs/self-hosting.md` 讲这几个环境变量，用 example.com 举例)。
- 不要动：`mobile/`、`brand/`、`third_party/`、`LICENSE`/`NOTICE`。不加新依赖。
- 公开仓库：不能出现内部域名、IP、邮箱、人名，示例一律 `example.com` / `example.cloudflareaccess.com`。

## 验收标准
- [ ] 第 4 条的测试全部通过：`pnpm vitest run <新测试和改动的测试路径> --maxWorkers=2`。
- [ ] `pnpm exec tsc -b`，结束后再 `pnpm exec tsc -p tsconfig.server.json`，都通过；`pnpm lint` 通过。
- [ ] `node scripts/check-brand-residue.mjs` 通过。
- [ ] `pnpm build:server` 通过；构建出的服务端用临时数据目录在 127.0.0.1 随机端口启动，配上 `CRYBOT_CF_ACCESS_*`(JWKS 用本地假服务)，用 curl 演示：无 JWT 带代理头 → 原行为；伪造 JWT → 401；有效 JWT → 200 且返回 `Set-Cookie`，再用该 cookie 访问 `/api/...` 成功；`/desktop-updates/latest.yml` 200、`/desktop-updates/` 404、`/desktop-updates/..%2fpackage.json` 404。把命令和输出写进汇报(写成可重复跑的脚本放 `scripts/` 或测试里更好)。
- [ ] 不设 `CRYBOT_UPDATE_FEED_URL` 时生成的 electron-builder 配置里没有 publish；设了时是 generic 且 URL 正确(写个小脚本或测试证明，不需要真打包)。
- [ ] `git grep -nE 'provider: *github|milind-soni'` 在 electron-builder 配置和 `electron/` 下无命中。

## 约束
- 不要 git 提交。沙箱禁网，`node_modules` 已就绪，不要装依赖。
- 一次只跑一个 tsc / vitest / build 进程，绝不并行(内存上限 7G，两个 tsc 并行会被杀)。
- 只写必要的注释；测试测行为。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1208-selfhost-login/report.md`。用中文：
1. 改了哪些文件，每个一句话。
2. 怎么验证的，命令和结果。
3. 需要协调者处理的事、拿不准的地方。
