# T-1208 执行报告

## 1. 修改文件

- `server/cf-access.ts`：读取三项 Access 配置，复用远程 JWKS，校验签名/issuer/audience/有效期和身份名单后签发 owner cookie，并把本次请求切换到该会话。
- `server/index.ts`：在静态页面与主认证闸门之前接入 Access 和公开下载，保留 GET 健康、品牌及公开描述接口的行为。
- `server/routes/desktop-update-files.ts`：提供公开只读下载，限制普通文件、路径与符号链接，设置类型和缓存，并支持 HEAD、单段 Range 及 416。
- `server/routes/upgrades.ts`：保存升级响应中的会话 cookie，提供写入 WebSocket 握手的公共函数。
- `server/routes/desktop-viewer.ts`：在桌面查看器代理的 101 握手中传回登录 cookie。
- `server/routes/phone-screen.ts`：在手机屏幕 WebSocket 握手中传回登录 cookie。
- `server/browser/viewers/stream-v2.ts`：在浏览器视频 WebSocket 握手中传回登录 cookie。
- `server/device-links.ts`：在设备链接 WebSocket 握手中传回登录 cookie。
- `server/cf-access.test.ts`：使用本地生成的 RSA 密钥、注入 fetch 的假 JWKS 和临时会话文件覆盖登录、拒绝、会话复用、SSE、WebSocket 及未配置行为。
- `server/routes/desktop-update-files.test.ts`：使用临时发行目录覆盖六种类型、缓存、HEAD/Range、目录、编码穿越、符号链接逃逸及未配置行为。
- `server/testing/memory-http.ts`：提供不监听端口的隔离 HTTP socket fixture，仍使用 Node 的 IncomingMessage/ServerResponse 和真实路由。
- `electron-builder.yml` → `electron-builder.base.yml`：保留打包资源和目标清单，将条件发布、公证和签名设置交给 JS 配置。
- `electron-builder.config.cjs`：按构建变量生成 generic 发布配置及资源，条件开启 Apple 公证，并以 `signExecutable: false` 关闭 Windows 签名且保留图标/元数据处理。
- `scripts/desktop-build-config.cjs`：校验构建时服务器、登录主机和更新源，生成不入 git 的 JSON。
- `electron/desktop-build-config.mjs`：读取打包资源，首次启动选择默认远程环境，并判断顶层登录导航白名单。
- `electron/main.mjs`：初始化并保存默认服务器，直接恢复已选远程服务器，在现有导航处理器中允许登录主机并把其他网页交给系统浏览器。
- `electron/saved-server.mjs`：主进程的远程可达性检查携带所属默认 Electron session 的 cookie。
- `electron/server-status.mjs`：远程环境描述检查同样携带 session cookie，以通过 Access。
- `electron/updater.mjs`：无构建更新源时完全停用更新器，有配置时显式指定 generic 源并使用逐段 Range 下载。
- `electron/desktop-build-config.test.mjs`：验证发布配置、公证开关、Windows 不签名、资源读写、首次默认环境和导航/IPC 边界。
- `electron/updater.test.mjs`：补充无更新源时不检查、不报错以及 generic 源固定行为的测试。
- `electron/environments.node-test.mjs`：修正回归测试里遗留的显示名称和连接服务器示例期望。
- `package.json`：所有桌面打包脚本显式指定新的 JS builder 配置。
- `scripts/prepare-duckdb.test.mjs`：资源清单测试改为读取新的基础 YAML 文件。
- `scripts/smoke-cua-win-lend.mjs`：Windows CUA 冒烟脚本改为读取新的基础 YAML 文件。
- `scripts/smoke-selfhost-login.mjs`：提供构建后隔离服务、假 JWKS 和 curl 验收脚本，输出命令与响应并自动清理。
- `docs/self-hosting.md`：说明服务端与构建时变量、Access Bypass、桌面登录、更新发布和验证方法。
- 本报告：记录实现、验证结果和剩余协调事项；未修改任务原有 `brief.md`。

未新增依赖，未执行安装，未 git 提交；未修改 mobile、brand、third_party、LICENSE 或 NOTICE。`build/entitlements.mac.plist` 已核对存在，无旧产品名，保持原有 JIT/麦克风等权限。

## 2. 验证命令和结果

本环境默认 Node 为 22，验证使用现成 Node 24：

```sh
export PATH=/opt/node24/bin:$PATH
```

worktree 原本没有 `node_modules`；仅在被 git 忽略的本地目录中链接到已安装依赖，为 Vite 缓存保留本地可写目录。未联网或安装依赖。全部 tsc、vitest、build 均串行执行。

### Vitest

```sh
pnpm vitest run server/cf-access.test.ts server/routes/desktop-update-files.test.ts server/request-auth.test.ts electron/desktop-build-config.test.mjs electron/updater.test.mjs scripts/prepare-duckdb.test.mjs --maxWorkers=2
```

结果：**6 个文件通过，111 项通过、4 项原有测试跳过**。

覆盖结果包括：

- 有效 JWT 返回 200、签发 HttpOnly/Secure owner cookie，cookie 后续可用，已有有效 cookie/bearer/ticket 不再签发新会话，JWKS 缓存复用。
- 错签名、错 aud、错 issuer、过期返回 401，不落入本机信任；名单外/无邮箱返回 403；`*` 接受无邮箱、空邮箱和其他邮箱，但仍拒绝伪造 JWT。
- 无配置时保持本机访问与代理拒绝；无 JWT 带代理头返回原来的 403；过期凭据可由有效 Access JWT 换成 cookie。
- SSE 和真实 WebSocketServer 握手代码经内存 socket 验证，101 响应携带会话 cookie，无效 JWT 升级返回 401。
- 下载文件返回 200，类型和缓存正确；HEAD 无响应体；Range 返回 206/Content-Range，越界返回 416；目录、编码穿越、符号链接逃逸、未配置返回 404。
- 未配置更新源时无 publish，运行两小时的模拟时钟也不会调用检查，状态保持 idle；有源时为 generic，`useMultipleRangeRequest: false` 与服务端单段 Range 对齐。
- 首次选择默认远程服务器，持久化后尊重用户切回本机的选择；登录主机允许窗口导航，但没有因此获得服务器页面的 IPC 权限。

### 桌面回归

```sh
node --test electron/environments.node-test.mjs electron/environment-switch.node-test.mjs electron/main-navigation.node-test.mjs electron/saved-server.node-test.mjs electron/server-status.node-test.mjs
```

结果：**5 个测试文件通过**。首轮发现环境测试中旧的 `CryBot` 显示名及旧示例地址断言，按规格修正后通过。

### 类型、lint、构建

```sh
pnpm exec tsc -b
pnpm exec tsc -p tsconfig.server.json
pnpm lint
pnpm build:server
```

结果：**全部退出码 0**。服务端 tsc 与 esbuild 完成，生成 `dist-server/index.js` 等构建产物。

```sh
node scripts/check-brand-residue.mjs
git grep -nE 'provider: *github|milind-soni' -- 'electron-builder.*' electron/
git diff --check
```

结果：品牌检查 **0 forbidden references**；指定 Git grep **无命中**（grep 退出码 1 表示无匹配）；diff 检查无空白问题。新建、尚未被 git 跟踪的 builder 文件也检查为无对应匹配。

### Builder 配置

除 Vitest 的条件分支测试外，调用已安装 electron-builder 26.15.3 的 `validateConfiguration` 校验配置 schema，结果通过。两种环境的实际输出：

```json
{"publishPresent":false,"hardenedRuntime":true,"notarize":false,"signExecutable":false}
{"publishPresent":true,"publish":{"provider":"generic","url":"https://example.com/desktop-updates/","useMultipleRangeRequest":false},"hardenedRuntime":true,"notarize":false,"signExecutable":false}
```

未执行真实桌面打包、签名或 Apple 公证。

### 构建服务端 curl 冒烟：受沙箱阻塞

```sh
node scripts/smoke-selfhost-login.mjs
```

实际结果：**退出码 1**，沙箱禁止本机 TCP 监听，假 JWKS 无法绑定临时端口：

```text
Error: listen EPERM: operation not permitted 127.0.0.1
  code: 'EPERM'
  syscall: 'listen'
  address: '127.0.0.1'
```

最初使用真实端口的单元 fixture 也遭遇同一限制，因此单元测试改用临时数据目录和内存 socket；没有将该结果计作真实 HTTP 服务启动成功，也没有使用用户正在运行的服务或数据。

可重复的 curl 脚本已经就绪：临时数据目录、临时 RSA 密钥、随机回环端口、假 JWKS、假引擎、child-only fetch 映射和清理都由脚本管理；生产代码没有测试用 JWKS 绕过开关。在允许本机监听的环境执行上面的命令，脚本会逐条打印 curl 命令及响应并断言：

| 请求 | 脚本要求的结果（此沙箱尚未实测） |
|---|---|
| `/api/auth/session`，代理头、无 JWT | 403 |
| 同接口，伪造 JWT | 401 |
| 同接口，有效 JWT | 200 且 Set-Cookie |
| `/api/bots`，仅复用上述 cookie 与代理头 | 200 |
| `/api/health`，代理头、无 JWT | 200 |
| `/desktop-updates/latest.yml`，无登录 | 200 |
| `/desktop-updates/` | 404 |
| `/desktop-updates/..%2fpackage.json`，curl `--path-as-is` | 404 |

## 3. 需要协调者处理的事项与未确认项

1. **必须补跑真实端口验收**：在允许监听 `127.0.0.1` 的隔离环境执行 `pnpm build:server && node scripts/smoke-selfhost-login.mjs`，保存脚本打印的 curl 响应；目前不能宣称这一项已验收。
2. 当前分支缺失 AGENTS.md 引用的 `docs/verification/README.md`（仓库 docs 下只有 specs/tasks）；本次遵循已有 fixture 的临时 HOME/数据目录、假引擎和禁止连接真实服务的隔离方式，请协调者补齐该文档。
3. 部署仓库需提供真实 Access team/AUD/ALLOW，配置 `/desktop-updates/*` Access Bypass，设置构建时服务器/登录主机/更新源及 macOS 签名、公证 secrets。
4. 仍需在真实 macOS/Windows 安装包中验证 Access/身份提供方的窗口内跳转、安装包签名公证及实际差分更新；本次只验证构建配置、运行逻辑及离线 fixture，未进行真实打包。
5. Access 默认不要求邮箱；邮箱名单只影响新的 Access 会话签发。现有会话沿用正常会话寿命和撤销机制，Access 本身应始终保护业务路由。

## 第 2 轮

### 修改记录

1. **已改：Access 按身份复用及撤销不匹配 cookie。**
   - `server/cf-access.ts:23`：保留有效 bearer/ticket 的认证顺序；Access cookie 请求校验有效 JWT 的身份，以 `sub` 优先、缺失时用规范化 email；身份变化撤销旧会话，再复用或签发目标身份的会话。过期 bearer/ticket 仍会清理，避免遮蔽可用 cookie。
   - `server/sessions.ts:58`、`server/sessions.ts:71`、`server/sessions.ts:550`：记录 `accessIdentity`，缓存可复用 token，每身份最多 5 个 Access 会话，签发前淘汰最旧记录；撤销时清理 token 缓存和关联 stream ticket（`server/sessions.ts:346`）。
   - `server/cf-access.test.ts:88`：同一 sub、不同 email 的连续 5 个无 cookie 请求只保留 1 个会话且返回同一 cookie；覆盖身份切换时撤销旧会话、复用已有目标身份或新签发、email 回退、缺失身份拒绝，以及过期 bearer/ticket 的恢复。
   - `server/sessions.test.ts:832`：覆盖重启后身份持久化、每身份上限、淘汰顺序、其他身份和普通会话不受影响、撤销/过期后不复用，以及明文 token 不落盘。
   - `scripts/smoke-selfhost-login.mjs:57`：隔离 fixture JWT 补入 `sub`。

   **复用边界：**现有存储的安全约束是只持久化 token 哈希，因此相同 token 的无 cookie 复用限于当前 SessionRegistry 生命周期。重启后无法从哈希恢复旧 cookie，会签发新 token；旧 cookie 仍有效，持久化记录按身份最多 5 个。JWT 同时缺失 sub 和非空 email 时返回 401，避免把无身份请求归为同一 owner 会话。

2. **已改：服务器弹窗交给系统浏览器，拦截外链两秒去抖。**
   - `electron/desktop-build-config.mjs:34`：弹窗只认可登录主机名单；顶层导航仍认可服务器主机和登录主机。
   - `electron/main.mjs:2014`：服务器 `window.open` / `target=_blank` 恢复外部打开；弹窗和被拦截导航共用按 URL 的 2 秒去重，其他 URL 独立处理。
   - `electron/main-navigation.node-test.mjs:25`：实际执行导航 handler，覆盖服务器弹窗、登录弹窗、顶层放行、重复 will-navigate/will-redirect、1999/2000ms 边界、不同 URL 和非法协议。
   - `electron/app-permissions.node-test.mjs:99`：外链策略断言适配去抖函数内先校验后打开的调用方式。

3. **已改：更新源和默认服务器强制 HTTPS，仅指定回环主机允许 HTTP。**
   - `scripts/desktop-build-config.cjs:4`：构建时拒绝公网 HTTP；仅 localhost、127.0.0.1、[::1] 允许 HTTP，保留原有凭据/query/fragment 和服务器 origin 限制。
   - `electron/desktop-build-config.mjs:5`：资源读取时执行相同协议和回环主机检查，不接受不安全地址。
   - `electron/desktop-build-config.test.mjs:65`：两项变量分别验证 HTTPS、三类回环 HTTP、非回环 HTTP、伪装 localhost、非法协议/凭据/地址；验证 builder 抛错及运行时读取拒绝。

4. **已改：Windows CI 路径与旧配置文件名。**
   - `scripts/ci-scope.mjs:222`、`scripts/ci-scope.mjs:268`：desktop 分类与 Windows 路径均加入 `electron-builder.base.yml`、`electron-builder.config.cjs`、`scripts/desktop-build-config.cjs`。
   - `scripts/ci-scope.node-test.mjs:5`：三种文件分别单独变更时均选择 desktop 分类和 Windows 检查。
   - `scripts/mac-thin.mjs:1`、`scripts/prepare-duckdb.mjs:113`、`build/dmg/README.md:1`：旧 YAML 文件名更新为 `electron-builder.base.yml`。

### 验证命令和结果

均使用现成 Node 24，未安装依赖；tsc / vitest 未并行执行。

```sh
export PATH=/opt/node24/bin:$PATH
systemd-run --scope -q -p MemoryMax=4G -- pnpm vitest run server/cf-access.test.ts server/sessions.test.ts server/request-auth.test.ts electron/desktop-build-config.test.mjs electron/updater.test.mjs scripts/prepare-duckdb.test.mjs --maxWorkers=2
```

**受阻，退出码 1，测试未启动：** `Failed to connect to system scope bus via local transport: Operation not permitted`。当前沙箱不能连接 systemd 总线，不能声称已满足指定 scope 的验收条件。

改用以下命令完成测试；Node 堆限制不等同于 systemd 的整个 scope 内存限制：

```sh
NODE_OPTIONS=--max-old-space-size=4096 pnpm vitest run server/cf-access.test.ts server/sessions.test.ts server/request-auth.test.ts electron/desktop-build-config.test.mjs electron/updater.test.mjs scripts/prepare-duckdb.test.mjs --maxWorkers=2
```

**通过：6 个文件，176 项通过、4 项原有跳过。** Access fixture 使用临时会话目录、本地生成密钥、假 JWKS fetch、内存 HTTP socket；未访问用户真实服务或数据。

```sh
node --test electron/main-navigation.node-test.mjs scripts/ci-scope.node-test.mjs
node --test --test-name-pattern='both external-link entry points' electron/app-permissions.node-test.mjs
pnpm exec tsc -b
pnpm exec tsc -p tsconfig.server.json
pnpm lint
node scripts/check-brand-residue.mjs
git diff --check
```

**全部通过，退出码 0。** 导航与 CI 范围测试共 5 项，外链策略定向测试通过；品牌残留检查 0 forbidden references。

另外运行了完整 `electron/app-permissions.node-test.mjs`：33 项通过，1 项原有 Cloud 初始化源码断言失败（`electron/app-permissions.node-test.mjs:273`，要求 `cloudAccountRestoring = true` 及旧初始化链）。已将同一断言应用到 `git show HEAD:electron/main.mjs` 的内容，确认修改前也失败；按本轮范围限制保留该断言和相应业务代码。

```sh
node scripts/smoke-selfhost-login.mjs
```

**受阻，退出码 1：**隔离假 JWKS 启动时收到 `listen EPERM: operation not permitted 127.0.0.1`，未进入真实服务端 curl 阶段。`docs/verification/README.md` 仍缺失；没有以用户真实服务代替隔离 fixture。

### 待协调事项

- 在允许 systemd scope 的环境补跑上述指定 Vitest 命令。
- 在允许本机监听的隔离环境重新构建服务端并运行 curl 冒烟脚本；当前结果不构成真实端口验收。
- 原有 Cloud 初始化测试失败与缺失的验证文档留待所属任务处理。

本轮未 git 提交；保留原有 `r2.md`，未修改其内容。
