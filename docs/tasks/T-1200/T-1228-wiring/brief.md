## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行依赖准备脚本（镜像自带，把预装依赖链进 node_modules）。
- 这里**没有** systemd、没有 Docker；本机 8G/4 核；不能监听 TCP 端口；vitest 一次只跑一个文件。

# T-1228 多屏云电脑 子任务 E：T-1228-wiring

台账 T-1228，仓库 crybot，分支 `T-1228-wiring`。中文汇报写进 docs/tasks 下本任务的 report.md。不提交 git。

执行规格：`docs/specs/2026-11-14-multi-screen.md`（已在 main），先完整读一遍。第一批的屏池（`server/local-vm-screens.ts`）、观看目标（`server/desktop-viewer-targets.ts`、`server/host/shared-vm-control.ts`）、容器多屏布局（`server/container-screens.ts`、`server/container-computer.ts`）都已合并到 main，直接使用它们导出的函数，不要重写。

## 通用要求
- 公开仓库，不写内部域名、IP、邮箱、人名、密钥。
- 不提升 `IMAGE_LAYER_VERSION`，不改 `server/vps-computer.ts`。
- 只有 T-1228-wiring 能改 `server/index.ts`。其他任务需要接线的地方只导出函数，不自己接。
- 每个任务都要通过：`pnpm exec tsc -b`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm lint`（只允许基线两条告警 `scripts/public-scan/scan.mjs:297`、`server/lazy-container-mcp.ts:122`）、自己任务的 vitest 文件。以 Actions 为准，协调者推分支后跑。
- 文件行数上限见 `scripts/testing/file-size-ratchet.test.ts`，不许改上限数字；`server/index.ts` 等大文件新增逻辑放进新模块，index 里只接线。
- 标「新建」的文件目前不存在，其余都已核对存在。

## E. 服务端接线与 E2E — `T-1228-wiring`

批次：第二批。after：A、B、C。估时：1.5 天。唯一改 `server/index.ts` 的任务。

文件：
- `server/index.ts`(`claimAutoLocalVm`、群聊电脑认领、`attachLocalVm`、`bindTurnComputer` 前加拿屏、`localVmPayload`、`recoverLocalVms`、空闲计时、接管路由、观看目标解析、宿主访客路径映射)
- `server/routes/computers.ts`(新增屏 join/截图路由、返回 `ScreenListPayload`)
- `server/routes/config.ts`(接受 `localVm.screens`，1↔多屏切换走「有轮次就拒绝」保护并触发重建；2/3/4 之间只 `setScreens`)
- `server/desktop-updates.ts`(分屏标签不符判 `recreate`；迁移后把 `cua` 浏览器资料复制给 s1)
- `server/surface.ts`(select_computer 提示词说明所在屏)
- `server/computer-wait.ts`(如需新增排队文案)
- `server/local-vm-screens.e2e.test.ts`(新建)
- `server/testing/local-vm-screens-hooks.mjs`(新建，假 docker 记录 `supervisorctl`、exec 用户、套接字)
- `server/routes/computers.test.ts`、`server/desktop-updates.test.ts`(追加)

接口契约：使用 A、B、C 导出的全部函数；对 D 产出上面的 `ScreenListPayload` 与路由。新增测试环境变量 `CRYBOT_SCREEN_IDLE_MS`(仅缩短单屏空闲时间)。

要点：
- 共享多屏布局下：`screenPool.request` → 排队则复用 `bindTurnComputer` 的等待文案、`turn.wait_started`/`turn.wait_ended`、`ComputerWaitParked` 挂起与自动恢复 → 拿到屏后 `bindTurnComputer(screenResource(n))` → `startScreen` 到 ready → `attachLocalVm` 挂该屏 MCP。
- 每屏一个 `ComputerIdleTimer`；`onAllOff` 才启动容器空闲计时，`onAnyOn` 取消。
- 屏口令保存在服务端内存，重启后经 root exec 读回；不进日志和事件。
- `screens=1` 完全走旧路径。

验收：
- `pnpm vitest run server/local-vm-screens.e2e.test.ts server/group-local-vm.e2e.test.ts server/desktop-updates.e2e.test.ts server/desktop-updates.test.ts server/routes/computers.test.ts server/openai-compat-vm.e2e.test.ts`
- `server/local-vm-screens.e2e.test.ts` 必须含规格验收 1–5：两智能体不串屏、第 5 个排队并自动接上、接管一屏不影响其他屏、`screens=1` 与今天一致、单屏空闲回收与容器空闲衔接。
- `server/desktop-updates.test.ts` 断言 VPS 云电脑不因此过期。
- 与 D 联调：本机预览环境打开设置页和电脑面板，屏幕列表、切换、接管可用(截图)。
- `tsc -b`、`tsc -p tsconfig.server.json`、`pnpm lint`、全部 vitest 分片。


## 第一批审核留给本任务的事项（必须做）
1. `server/host/shared-vm-control.ts` 的 `botKeys`（约 :94-101）和 `leaseKey`（约 :181-185）要按分配到的屏给出 `screenControlKey(n)`；否则无轮次时经面板接管某屏后，面板看不到这次接管，手机续的仍是 `desktop:local/shared` 租约。不变量用例「no panel is told less than its own hold」加上屏目标。
2. 观看目标：带 threadId、place 为 undefined、轮次不在屏上时屏目标返回 null，而不带 threadId 时按 `onLocalVm(bot)` 放行，口径不一致；收紧 assigned 时统一。
3. `joinUrl` 带屏路径（`DesktopConnection` 契约）在本任务实现。
4. `src/lib/computer-takeover.ts` 的 `leave()` 发 release 时是否带 `target`：本任务定下约定并用 E2E 覆盖（多屏下交还只交还该屏）。
5. 界面分支（T-1228-screens-ui）里的 `ScreenListPayload` 暂在组件内定义；本任务在 `shared/` 导出共享定义。界面分支若已合并，就把组件改为导入共享定义；未合并就在报告里写明，由协调者处理。
6. 容器布局：屏口令服务端重启后经 root exec 读回（不进日志和事件）；`cua` 浏览器资料迁给 s1（`server/desktop-updates.ts`）。
