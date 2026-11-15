## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1254 桌面端（Mac/Windows）登录全程留在应用内，扫码不跳浏览器

## 现象
用户在 Mac 版 Cry Bot 登录时被跳到系统浏览器，登录完回不到应用。用户希望在应用窗口里直接看到飞书二维码，扫码就登录。

## 已查到的原因
桌面端只允许 `CRYBOT_LOGIN_HOSTS` 名单里的主机在应用内导航，见 `electron/desktop-build-config.mjs` 的 `loginNavigationAllowed`。名单是**逐个主机名精确匹配**，名单外的导航都会被 `electron/main.mjs` 约 1880–1912 行的 `guardNavigation` / `setWindowOpenHandler` 交给 `shell.openExternal`，也就是系统浏览器。

线上真实登录链大致是：服务器 → 访问网关登录页 → 公司认证中心 → 飞书 passport → 飞书 accounts 登录页（这一页本身就带扫码二维码）。其中有一跳会经过飞书的另一个子域（`login.<飞书域>`），它不在名单里，于是整个登录被甩到浏览器。以后飞书再换子域还会出同样的问题。

## 要做
1. **名单支持后缀匹配。** 名单项以 `.` 开头时，按「该域本身及其所有子域」匹配，例如 `.example.test` 匹配 `example.test` 和 `a.b.example.test`。不以 `.` 开头的项仍然精确匹配。要防止拼接绕过（例如 `evilexample.test`、带用户名密码的地址、非 http/https 协议）。构建配置的校验和文档同步更新。
2. **登录过程中不把页面交给系统浏览器。** 仍在登录流程中（还没回到服务器源、处于名单页面或刚从名单页面跳出）时，如果要导航到名单外的地址，不要调用 `openExternal`。改为在应用内显示一条简短提示：「登录跳到了未允许的网址 <主机名>，请联系管理员」，同时记日志（只记主机名）。登录完成后，普通外链照旧用系统浏览器打开。
3. **安全边界。** 名单内的第三方登录页加载在主窗口里，主窗口带 preload。请确认 preload 暴露给页面的能力只对服务器源和渲染源生效，对第三方登录页不生效。如果现在不是这样，就让登录页面在不带 preload 的独立登录窗口（或 `BrowserView`）里走完，回到服务器源后关掉登录窗口、主窗口重新加载。二选一，取最小改动。
4. **扫码体验。** 飞书登录页在桌面尺寸下默认显示扫码。确保登录窗口尺寸足够（不小于 800×640）、不被弹窗拦截。用户用手机飞书扫码确认后，应用自动回到 Cry Bot 已登录的界面，不需要任何手动操作。
5. 公开仓库：代码、测试、文档里**不得出现任何内部域名、IP、人名**，测试一律用 example.com / example.test 之类的示例域。

## 验收
- 单元测试：后缀匹配（命中、子域、拼接绕过、非 http、带凭据）；登录流程中名单外导航不调用 `openExternal`、显示提示；登录完成后外链仍用系统浏览器。
- 端到端测试：用本地假服务模拟「服务器 → 网关 → 认证中心 → passport → login 子域 → accounts → 回调 → 服务器」整条跳转链，各段用不同的示例主机名（可用 hosts 映射或本地多端口加 Host 头），断言整个过程中零次 `openExternal`、最后停在服务器源。如果现有 Electron 测试框架能跑就用它，跑不了就在节点测试里对导航守卫做等价的集成测试，并在报告里说明。
- 改动涉及的 `electron/*.node-test.mjs` 和 `electron/desktop-build-config.test.mjs` 逐个跑过；改动过的文件跑 `oxlint --deny-warnings`；`scripts/testing/file-size-ratchet.test.ts` 跑过。
- 写 report.md（短）和 verification.txt。verification.txt 里不写 IP、地址、域名。
