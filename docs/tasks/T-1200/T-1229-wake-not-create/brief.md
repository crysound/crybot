# T-1229 云电脑休眠后再点进去：显示「唤醒」，不要让用户以为要重新创建

## 背景（调研结论，北京时间 11-14）
共用云电脑（`localVm.mode=shared`）闲置 10 分钟会被停掉（`podman stop`，容器不删，`local-vm-stops/` 记下 `stoppedAt`）。服务端能正确判断它是 `container:"stopped"`、`resumable:true`、`stop_reason:"idle"`。用户反馈：休眠后再点进去，界面让他「重新创建」。

根因在前端，所有智能体的「工作位置」都是默认的「自动」（bot 记录里没有 `computer` 字段）：
- `src/components/ComputerPanel.tsx` 约 141 行：`canManageVm = profileBot.computer === "vm" && livePlace === "vm"`，自动模式下为 false。
- 约 1430–1462 行：因为 `canManageVm` 为 false，「启动私有桌面」按钮不显示；shared 模式下 per-bot 分支也不成立；最后只剩「打开私有桌面设置」。
- `src/components/LocalComputerSection.tsx` 约 1328–1336 行：shared 模式下第 4 步标题固定是 `vm.setup.step4`「创建并启动私有桌面」，停止状态下整页像从头安装的向导。
- 服务端 `server/index.ts` 约 6047 行：`canCreate = !ready && autoLocalVmAttachable(status)`，已停止、可恢复的桌面在 select_computer 选项里被标成 `canCreate:true, canStart:false`，智能体可能因此对用户说「需要创建电脑」。
行号是调研时的，以实际代码为准。

## 要做的
1. `ComputerPanel.tsx`：私有桌面已停止且可恢复（`resumable`，且不是 pool 模式）时，即使工作位置是「自动」、自动选中的是私有桌面，也直接显示「唤醒私有桌面」按钮，复用现有的 `runVmAction("vm-start")`（非 per-bot 模式走 `/api/local-computer/start`）。权限仍由服务端路由把关，不在前端放宽权限判断以外的东西。按钮文案用「唤醒」（新增 i18n key，中英文都要，英文 "Wake the desktop"；其他语言文件按仓库现有做法处理，至少不能缺 key 导致测试失败）。
2. `LocalComputerSection.tsx`：`container === "stopped"` 且可恢复时，第 4 步标题改为「唤醒私有桌面」，并且不要让整页看起来像要重新安装（已完成的步骤显示完成）。`container === "missing"` 时保持「创建并启动」。
3. `server/index.ts` select_computer 选项：按 `localVmWakeAction(status)`（或等价判断）区分——容器已存在只需启动的 → `canStart:true, canCreate:false`；真的不存在要新建的 → `canCreate:true`。`pickComputer` 的选择结果不能变。
4. 顺带核查并在报告里说明（能小改就改，改不了就只报告）：服务刚重启、`localVmSeen` 里还没有 shared 时，自动模式的智能体会不会被 `computerPreviewSurface`（约 5991–6002 行）判成 `"cloud"`，从而落到 VPS「需要设置」页。若会，改成在 shared 容器存在时仍优先返回 vm。

## 不在本轮
- 不改休眠时长、config.json、镜像、`electron/`、`mobile/`、`.github/`。
- 不做多智能体多桌面（另一个任务）。

## 验收（写成仓库内可重复执行的测试）
- ComputerPanel 组件测试：自动模式、自动选中 vm、状态 `{container:"stopped", resumable:true, stop_reason:"idle", mode:"shared"}` → 渲染出「唤醒」按钮，点击会 POST `/api/local-computer/start`；页面上不出现 `computer.createVm`、`computer.openVmSetup`、`vm.setup.step4` 对应文案。另加「工作位置明确选私有桌面」的对照用例，行为不变。
- LocalComputerSection 组件测试：shared、已停止、可恢复 → 第 4 步标题不是「创建并启动私有桌面」；`container:"missing"` → 仍是创建。
- 服务端单测：select_computer 选项对已停止可恢复的私有桌面返回 `canStart:true / canCreate:false`；`pickComputer` 结果不变。
- 新测试先红后绿（在报告里写明）。

## 验证
一次只跑一个文件：
`PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner`
跑新增/改动的测试文件，以及 ComputerPanel、LocalComputerSection、select_computer 相关的现有测试；改了 server 就跑 `PATH=/opt/node24/bin:$PATH pnpm exec tsc --noEmit -p tsconfig.server.json`。不要跑完整 `pnpm test`、e2e。

## 约束
- 不要 git 提交；沙箱禁网，不加新依赖。
- 仓库是公开的：代码、测试、注释里不能出现内部域名、IP、邮箱、人名、密钥、真实实例 ID。

## 汇报
把本轮报告追加到 `docs/tasks/T-1200/T-1229-wake-not-create/report.md`（中文）：怎么改的、改了哪些文件、测试结果（含先红后绿）、第 4 点核查结论、哪里没把握。
