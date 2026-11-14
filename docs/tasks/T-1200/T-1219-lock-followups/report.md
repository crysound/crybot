# T-1219 提供方锁定收尾

## 修改与行为

1. **托管模型策略互斥**：`server/index.ts` 始终调用 `hostedModelPolicy`；`server/hosted-models.ts` 在锁定开启且托管模型环境变量存在时抛错，错误明确列出互斥开关。仅开锁定、仅开托管策略及均未开启的原有行为保留。`docs/self-hosting.md` 补充互斥说明。`server/hosted-models.test.ts` 覆盖开关组合和不完整托管配置；`server/provider-lock.fixture.test.ts` 增加隔离服务器启动失败断言。
2. **Boat 清理语义**：`server/boat.ts` 的 `boatConfigured` 只判断账号是否配置，新增 `boatOffered` 判断用户是否可用；新建、唤醒、连接和控制台执行入口增加锁定拒绝。`server/index.ts`、`server/host/meetings-host.ts`、`server/routes/computers.ts`、`computer-frames.ts`、`computer-usage.ts` 的用户入口及展示改用可用性判断。删除前恢复检查、库存核对、回收、空闲休眠仍使用真实配置状态。`server/boat-availability.test.ts` 使用真实库存/休眠/删除代码、假时钟及注入的网络响应，断言开关两种状态下均发出停止和删除请求；锁定用户入口在联网前拒绝。`server/routes/computers.test.ts` 补充库存隐藏和新建拒绝测试。
3. **丢弃外来续接游标**：`server/store.ts` 为 `renameInstances` 增加可选 `discardResumeCursors`；默认调用仍迁移游标。`server/provider-lock.ts` 仅在锁定迁移时传入此选项，同时扫描 bot/task 游标键，处理只存在于游标中的旧提供方；保留已有端点游标。`server/provider-lock.test.ts` 和 `server/store-rename-instances.test.ts` 验证持久化、重新加载、幂等和关闭锁定的对照行为。
4. **聚焦窗口刷新**：`electron/menu.mjs` 将 Electron 菜单回调给出的聚焦窗口传入 `onReload`；`electron/main.mjs` 使用 `remote-only.mjs` 的刷新策略和执行函数。只有聚焦主窗口时采用服务器路由保留/错误页恢复逻辑，设置及弹窗刷新各自页面，无窗口时不操作。关闭 remoteOnly 时菜单保留原生 role。普通和强制刷新均有行为测试。
5. **移除截源码测试**：`electron/remote-only.mjs` 提取导航目标、失败页、刷新动作、保存环境、保存错误处理、启动目标及工作区可用性等策略函数；`electron/remote-only.node-test.mjs` 直接导入并测试函数，移除 `readFileSync(main.mjs)`、源码切片和 VM 执行。
6. **workspaces IPC 拒绝**：`electron/main.mjs` 为 `workspaces:state`、`workspaces:line`、`workspaces:menu` 统一包裹 `workspaceHandler`。remoteOnly 时在原有处理器执行前抛错，关闭时保留原有 sender 检查及参数/返回值。Node 行为测试覆盖两种开关状态、拒绝时零调用。未修改前端 `src/`。

## 验证环境与命令

全部测试使用隔离临时数据或函数 fixture，没有访问用户真实应用或数据。仓库缺少 `AGENTS.md` 指向的 `docs/verification/README.md`；完整服务器验证沿用现有 `verificationServerEnvironment` / `verificationServerArgs`，仅在临时目录尝试启动。

本 worktree 初始没有 `node_modules`。复用主仓已有依赖，在本 worktree 创建忽略的依赖链接和本地缓存目录；未安装依赖。首次直接链接整个依赖目录导致 Vite 临时配置写入只读目录，随后改成逐项依赖链接，让 `.vite-temp`、`.vite`、`.tmp` 缓存留在 worktree。

Vitest 一次一个文件、一个 worker；每次执行的外层超时为 75 秒：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <文件> --maxWorkers=1
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 node --test --test-isolation=none <文件>
```

### 已通过的完整测试文件

| 文件 | 结果 |
| --- | --- |
| `server/provider-lock.test.ts` | 10 通过 |
| `server/store-rename-instances.test.ts` | 3 通过 |
| `server/store.test.ts` | 158 通过 |
| `server/boat-availability.test.ts` | 5 通过 |
| `server/host/cloud-computer-power.test.ts` | 34 通过 |
| `server/provider-lock-routes.test.ts` | 5 通过 |
| `server/routes/computer-frames.test.ts` | 3 通过 |
| `electron/menu.test.mjs` | 21 通过 |
| `server/routes/computers.test.ts` | 6 通过 |
| `electron/remote-only.node-test.mjs` | 12 通过 |
| `electron/main-navigation.node-test.mjs` | 3 通过 |
| `electron/server-supervisor.node-test.mjs` | 24 通过 |
| `electron/environment-switch.node-test.mjs` | 16 通过 |
| `electron/environments.node-test.mjs` | 30 通过 |

### 未跑通的测试及原因

| 文件 | 实际结果与原因 |
| --- | --- |
| `server/config.test.ts` | 230 通过、1 跳过；3 项子进程测试因 `spawnSync /opt/node24/bin/node EPERM` 失败。 |
| `server/routes/instances.test.ts` | 外层 75 秒超时，退出码 124；HTTP fixture 未完成，没有测试通过结果。 |
| `server/provider-lock.fixture.test.ts` | 3 项均在 `freePortBlock` 阶段失败：`no free port block`。包含新增的互斥启动失败测试，尚未执行到服务器启动。 |
| `server/hosted-models.test.ts` | 7 通过，包括新增的互斥配置测试；1 项已有 Claude turn/helper 测试因 permission broker 无法绑定本机 socket 失败。 |
| `server/routes/computer-usage.test.ts` | 9 项未执行；监听时 `listen EPERM`，随后 beforeAll 30 秒超时。 |
| `server/boat-auto-sleep.test.ts` | 7 项未执行；监听时 `listen EPERM`，随后 beforeAll 30 秒超时。 |
| `server/boat-inventory.test.ts` | 32 项未执行；监听时 `listen EPERM`，随后 beforeAll 30 秒超时。 |
| `server/boat-lifecycle.test.ts` | 3 项未执行；监听时 `listen EPERM`，随后 beforeAll 30 秒超时。 |
| `server/boat-provision.test.ts` | 6 项未执行；监听时 `listen EPERM`，随后 beforeAll 30 秒超时。 |

受限文件各完整尝试一次，没有通过删除断言、跳过测试或访问真实服务来绕过限制。新增无需监听的 Boat 测试已验证实际库存、定时休眠和删除代码；该结果不等于完整服务器 HTTP 或真实桌面 GUI 已通过。

原始命令、退出码和日志保存在 `/tmp/T-1219-checks/`；逐文件结果为 `results.json`，补充测试复跑及首轮静态检查为 `final-results.json`，最终静态检查为 `recheck-results.json`。补充 bot/task 被迁移提供方游标断言、补齐所有锁定 Boat 用户入口断言后，单独复跑 `server/provider-lock.test.ts`、`server/boat-availability.test.ts`。

### 静态检查

修正 `migrateCursors` 的值类型后，以下命令再次按顺序串行执行，全部退出码为 0：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm lint
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm i18n:check
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm check:brand
git diff --check
```

首轮 typecheck 发现辅助函数错误地假定游标值为字符串；实际契约为不透明值，已改成泛型保留原有类型。最终结果记录在 `/tmp/T-1219-checks/recheck-results.json`。i18n 校验 16 个语言目录通过，品牌检查 6557 个文件、禁止项为 0。

本次共尝试 23 个测试文件，14 个完整通过，9 个因上述沙箱限制未完整通过。修改后的提供方迁移与 Boat 行为测试最终复跑分别为 10、5 项通过。未新增内部域名、内部地址、邮箱、人名或真实密钥；新增测试使用示例域名、临时目录和虚构凭据。未修改 `src/`、发布流程或 CI，未提交 git、安装新依赖、运行完整 `pnpm test` 或打包。

## 需要协调者处理

1. 在允许子进程和本机监听的隔离环境，按上述单文件命令补跑“未跑通的测试及原因”中的 9 个文件。尤其确认 `server/provider-lock.fixture.test.ts` 的互斥启动报错，以及既有端点/无端点两种服务器启动行为。当前沙箱结果不能证明完整服务器 HTTP 验收通过。
2. 补齐或修正 `AGENTS.md` 引用的 `docs/verification/README.md`。
3. 本轮未启动真实 Electron GUI；后续桌面验收可检查主窗口、设置窗口、登录弹窗的普通/强制刷新，以及 remoteOnly 关闭时的原生菜单行为。无需前端配合或新增配置。
