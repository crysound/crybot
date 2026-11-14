# T-1219 Cry Bot：提供方锁定的低风险收尾

## 背景
T-1216（提供方锁定为单一 Cry Bot 网关、桌面端只连服务器）已合入 main。它的第 3 次安全审查（`.tasks/T-1216-provider-lock.security-3.md`）和第 3 轮代码审核留下几条低风险项，本任务一次收掉。都在锁定开关 `CRYBOT_PROVIDER_LOCK=1` / 桌面 `remoteOnly` 打开时才相关；开关关闭时行为必须与 main 完全一致。

## 要改的
1. **托管模型策略与锁定并存**（`server/index.ts` 约 789 行 `const hostedModels = providerLockEnabled() ? null : hostedModelPolicy(DATA_DIR)`）：现在锁定时托管模型策略被静默跳过，路由里的 hostedModels 403 守卫也失效。改成：两者同时启用时服务启动即报错退出（错误信息写清两个开关不能同时开），并在 `docs/self-hosting.md` 锁定一节说明。只开其一时行为不变。补测试。
2. **Boat 回收语义**（`server/boat.ts` 约 892 行 `boatConfigured` 在锁定时恒为 false）：删除智能体时的 Boat 恢复检查、空闲休眠等清理/收尾逻辑也读它，锁定后已有 Boat 机器可能不被休眠或回收。改成：`boatConfigured` 恢复原语义（只看是否配置了 Boat 账号），锁定判断挪到面向用户的入口（新建/启动 Boat、界面展示等），清理、休眠、回收路径在锁定时仍照常工作。补测试：锁定 + 已配 Boat 时空闲休眠/删除回收仍会调用；锁定时用户入口仍拒绝。
3. **迁移丢弃旧续接游标**（`server/store.ts` 约 1694 行 `renameInstances`，以及 `server/provider-lock.ts` 里调用它的锁定迁移）：锁定迁移会把其他提供方的 `resumeCursors` 改挂到端点名下，之后外来会话 ID 可能被交给端点导致续接失败。改成锁定迁移时丢弃这些游标（bot 级和 task 级都处理），其他调用 `renameInstances` 的场景行为不变。补测试。
4. **remoteOnly 下 Cmd/Ctrl+R**（`electron/menu.mjs` 约 125 行、`electron/main.mjs` 的 onReload）：现在菜单快捷键固定刷新主窗口。改成只有聚焦的是主窗口时走 remoteOnly 自定义刷新逻辑，其他窗口（设置、弹出窗口等）照常刷新自己。补测试。
5. **remote-only 测试别截源码**（`electron/remote-only.node-test.mjs` 约 14 行 `readFileSync(.../main.mjs)` 截片段）：把被测逻辑抽成 `electron/remote-only.mjs` 里的纯函数，测试直接测函数行为，去掉读源码。
6. **workspaces IPC**（`electron/main.mjs`）：remoteOnly 下仍注册 workspaces 相关 IPC，加一层判断，remoteOnly 时这些处理器拒绝或不注册（选改动小、关闭开关时行为不变的做法）。补测试。

## 范围
可以改 `server/`、`electron/`、`docs/self-hosting.md`、对应测试、报告。前端 `src/` 不改（除非第 6 条必须配合，写进报告说明原因）。不改发布流程和 CI 配置。

## 验收标准
- [ ] 1–6 每条都有行为测试并通过（测行为，不截源码）。
- [ ] 改动涉及的已有测试文件仍通过：vitest 一次一个文件、`--maxWorkers=1`，命令前加 `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096`；electron node-test 用 `node --test --test-isolation=none <文件>`。至少包括 `server/config.test.ts`、`server/routes/instances.test.ts`、`server/provider-lock.fixture.test.ts`（沙箱里跑不通的写明原因，协调者会在沙箱外补跑）、boat 和 store 相关测试、`electron/remote-only.node-test.mjs`。
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm i18n:check`、`pnpm check:brand` 串行跑通过。
- [ ] 锁定/remoteOnly 开关关闭时行为与 main 一致。
- [ ] 没有内部域名、IP、邮箱、人名、密钥。

## 约束
不要 git 提交，不装新依赖，不跑完整 `pnpm test`，不打包。只写必要的注释，测试测行为。改动只在本 worktree 和 /tmp。

## 汇报格式
在任务文件夹 `report.md` 写：每条改了哪些文件、怎么验证（命令和结果）、没跑通的测试及原因、需要协调者处理的事。
