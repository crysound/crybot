# Report

改动文件：

- `docs/self-hosting.md`
- `docs/specs/2026-11-13-crybot.md`
- `electron/desktop-build-config.mjs`
- `electron/desktop-build-config.test.mjs`
- `electron/login-navigation.mjs`
- `electron/login-navigation.node-test.mjs`
- `electron/main-navigation.node-test.mjs`
- `electron/main.mjs`
- `scripts/desktop-build-config.cjs`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/report.md`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/verification.txt`

构建名单支持点号前缀的域名后缀匹配，并拒绝凭据、非网页协议和拼接绕过。登录跳转改用无 preload、尺寸足够的独立窗口；登录期间的未允许跳转留在应用内提示并记录主机名，回调后关闭登录窗口并恢复主窗口，普通外链继续使用系统浏览器。测试覆盖后缀边界、登录状态、完整多主机跳转链和 preload 隔离。

测试命令与结果见 `verification.txt`。

## 第 2 轮

改动文件（与本轮 git status 一致）：

- `electron/main.mjs`
- `electron/login-navigation.mjs`
- `electron/login-navigation.node-test.mjs`
- `electron/main-navigation.node-test.mjs`
- `electron/app-permissions.node-test.mjs`
- `electron/login-navigation.electron.test.mjs`
- `electron/fixtures/login-navigation.mjs`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/report.md`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/verification.txt`

统一管理全部登录窗口及子弹窗，保留无 preload 和最小尺寸；POST 回调照常提交，服务器页面主框架加载完成后关闭登录窗口并刷新主窗口；子框架导航和重定向不结束登录、不弹顶层提示。补真实 Electron、本地隔离服务整链测试，并纠正第 1 轮“同等覆盖”的表述。

测试命令与结果：`node --test` 逐个运行 login-navigation、main-navigation、preload、preload-contract、home-navigation、remote-only、app-permissions，共 70 项通过；`pnpm exec vitest run electron/desktop-build-config.test.mjs` 14 项通过；`pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts` 通过。`pnpm exec vitest run electron/login-navigation.electron.test.mjs` 最终版本连续 3 次通过（POST 请求体、子框架、子弹窗守卫、最小尺寸、会话共享、全部登录窗口关闭及零外部跳转）；7 个改动代码文件均通过 `pnpm exec oxlint --deny-warnings`。完整输出见 `verification.txt`，未提交 git。引用的 `docs/verification/README.md` 在仓库中缺失；测试使用独立临时目录与本地假服务。

## 第 3 轮

改动文件（与本轮 git status 一致）：

- `docs/self-hosting.md`
- `docs/specs/2026-11-13-crybot.md`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/report.md`

同步桌面登录说明，补齐主机后缀匹配、协议与凭据限制、登录期间的应用内提示、独立无 preload 登录窗口及回服务器后的刷新行为。README 未发现相关旧说明。

测试命令与结果：`git diff --check` 通过；grep 检查相关文档的示例主机均为 `example.com`/`example.test`，未发现内部域名。

## 第 4 轮

改动文件（与本轮 git status 一致）：

- `electron/login-navigation.mjs`
- `electron/login-navigation.node-test.mjs`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/report.md`
- `docs/tasks/T-1200/T-1254-desktop-login-inapp/verification.txt`

导航分类先拒绝非 http/https 或带用户名、密码的地址；补测主窗口、登录窗口和弹窗均不加载、不打开外部，并确认日志只记主机名。

测试命令与结果见 `verification.txt`。
