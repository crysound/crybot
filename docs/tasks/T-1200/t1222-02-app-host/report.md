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
