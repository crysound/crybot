改了什么：新增申请屏幕接口，复用原队列与闲置回收；两个桌面入口增加中英文按钮，排队后自动打开。文件清单：

- `docs/tasks/T-1200/T-1253-screen-assign-now/report.md`
- `docs/tasks/T-1200/T-1253-screen-assign-now/verification.txt`
- `server/index.ts`
- `server/local-vm-screen-runtime.test.ts`
- `server/local-vm-screen-runtime.ts`
- `server/local-vm-screens.e2e.test.ts`
- `server/local-vm-screens.test.ts`
- `server/local-vm-screens.ts`
- `server/routes/computers.test.ts`
- `server/routes/computers.ts`
- `src/components/AssignLocalVmScreen.tsx`
- `src/components/ComputerPanel.takeover.test.ts`
- `src/components/ComputerPanel.tsx`
- `src/components/remote-desktop-panel.open.test.ts`
- `src/components/remote-desktop-panel.screen.test.ts`
- `src/components/remote-desktop-panel.tsx`
- `src/locales/en.json`
- `src/locales/zh.json`

为什么：闲置智能体无需运行任务即可打开桌面；保留已有分配、忙屏保护和单屏行为。

测试：23 个文件、283 个测试逐个通过（`pnpm exec vitest run <文件> --maxWorkers=1`）；屏幕 e2e 最终连续三轮均为 16/16 通过。`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec tsc -p tsconfig.json`、`pnpm exec oxlint --deny-warnings <全部改动代码文件>`、`git diff --check` 均通过；完整命令与脱敏输出见 verification.txt。验证说明文档在工作树缺失，使用现有隔离 fixture 完成验证。

## 第 2 轮

改了什么：保留排队、起屏、打开桌面期间的申请状态；失败显示错误和「重试」，父面板持续轮询未就绪的屏幕。补齐两个入口的起屏、失败重试及打开失败测试；恢复验证记录中的测试路径，补齐 IPv6 脱敏。本轮文件（与 git status 一致）：

- `src/components/AssignLocalVmScreen.tsx`
- `src/components/ComputerPanel.tsx`
- `src/components/ComputerPanel.takeover.test.ts`
- `src/components/remote-desktop-panel.tsx`
- `src/components/remote-desktop-panel.screen.test.ts`
- `docs/tasks/T-1200/T-1253-screen-assign-now/verification.txt`
- `docs/tasks/T-1200/T-1253-screen-assign-now/report.md`

为什么：拿到屏幕号不代表桌面就绪，不能因此隐藏申请和重试入口；日志只脱敏真实地址，不破坏测试文件名。

测试：`pnpm exec vitest run <文件> --maxWorkers=1` 逐文件通过：23 个文件、289 项；其中屏幕 e2e 连续 3 轮各 16/16。`pnpm exec tsc -p tsconfig.json`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec oxlint --deny-warnings <上述 5 个代码文件>`、`git diff --check` 通过；`grep -niP` 检查 IPv4、IPv6、域名、UUID 无匹配，并额外核验公共域名后缀及仓库文件路径。完整命令与脱敏输出见 verification.txt。仓库缺少验证 README，e2e 使用独立临时数据目录和模拟运行时；未提交 git。

## 第 3 轮

改了什么：统一先清空申请引用再 reject，覆盖 `screen_not_assigned`、其他终止错误、卸载及切换智能体／会话／面板；取得控制权期间仍保留可取消的 Promise。补 10 项回归，验证错误、可点击的「重试」、重试成功及取消。验证记录仅保留最终有效输出。本轮文件（与 git status 一致）：

- `src/components/ComputerPanel.tsx`
- `src/components/ComputerPanel.takeover.test.ts`
- `docs/tasks/T-1200/T-1253-screen-assign-now/report.md`
- `docs/tasks/T-1200/T-1253-screen-assign-now/verification.txt`

为什么：避免拿到屏幕后 Promise 悬空、按钮卡在「进行中」，确保失败可以重试，离开当前面板时结束等待。

测试：`pnpm exec vitest run <文件> --maxWorkers=1` 逐文件通过 23 个文件、299 项；AssignLocalVmScreen 由两个面板的真实组件集成测试覆盖，屏幕 e2e 使用隔离 fixture 连续 3 轮各 16/16。`pnpm exec tsc -p tsconfig.json`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec oxlint --deny-warnings src/components/ComputerPanel.tsx src/components/ComputerPanel.takeover.test.ts`、`git diff --check` 均通过。`grep -niP` 脱敏检查无匹配；live 测试通过但有已有连接拒绝诊断，完整脱敏输出见 verification.txt。未提交 git。
