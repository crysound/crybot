# T-1229 云电脑休眠后再点进去：显示「唤醒」

## 本轮改动

- `src/components/ComputerPanel.tsx`：自动模式在服务端已选中私有桌面、状态为 `resumable` 且不是 pool 时显示「唤醒」按钮，继续调用 `runVmAction("vm-start")`；shared 模式使用 `/api/local-computer/start`，明确选择私有桌面时仍使用原来的「启动」文案和行为。
- `src/components/LocalComputerSection.tsx`：增加可恢复状态字段和第 4 步标题选择逻辑。shared 停止且可恢复时显示「唤醒私有桌面」，缺失容器仍显示「创建并启动私有桌面」；运行时、镜像等已完成步骤仍显示完成状态。
- `server/index.ts`：`select_computer` 的 VM 选项使用 `localVmWakeAction`：停止的可恢复容器返回 `canStart: true, canCreate: false`，缺失且可创建的容器返回 `canCreate: true`。共享模式在 `localVmSeen` 为空的服务重启后也会探测共享目标，存在时优先返回 `vm`。
- `src/locales/en.json`、`src/locales/zh.json` 及其余语言包：增加 `computer.wakeVm` 和 `vm.setup.step4Wake`；英文按钮文案为 `Wake the desktop`，中文为「唤醒」。
- 测试：`ComputerPanel.simple.test.ts` 增加自动唤醒和明确选择私有桌面的对照；`LocalComputerSection.test.ts` 覆盖停止可恢复与缺失两种标题；`server/container-computer.test.ts` 覆盖唤醒/创建动作；`group-local-vm.e2e.test.ts` 更新 select_computer 对停止共享桌面的能力断言。

## 测试结果

新增断言先运行于实现之前：

- `ComputerPanel.simple.test.ts`：新增自动唤醒断言先失败（当时自动模式仍显示设置入口）；对照断言也先未通过，随后按现有「启动」文案校正。
- `LocalComputerSection.test.ts`：新增标题断言先失败（辅助逻辑尚未实现）。

实现后逐文件运行，均通过：

- `src/components/ComputerPanel.simple.test.ts`：43 tests passed。
- `src/components/ComputerPanel.test.ts`：5 tests passed。
- `src/components/ComputerPanel.i18n.test.ts`：3 tests passed。
- `src/components/LocalComputerSection.test.ts`：47 tests passed。
- `server/computer-selection.test.ts`：7 tests passed，现有 `pickComputer` 选择结果保持不变。
- `server/container-computer.test.ts`：119 tests passed，覆盖停止桌面返回 `start`、缺失桌面返回 `run`。
- `src/locales/words.test.ts`：3 tests passed。
- `scripts/generate-locale.mjs --check`：16 个语言包通过校验。
- `tsc --noEmit -p tsconfig.server.json`：通过。
- `tsc -b --pretty false`：通过。
- 额外的 `server/index.test.ts` 因沙箱禁止监听 `127.0.0.1`（`EPERM`）在 30 秒初始化钩子超时，338 个测试均未执行；这不是代码断言失败。

工作树没有安装本地 `node_modules`，所以题目给出的 `pnpm exec vitest` 和 `pnpm exec tsc` 入口返回了 “Command not found”；随后用工作区已有的同版本 Vitest/TypeScript 二进制逐文件执行了上述等价命令。没有运行完整测试套件或 e2e。

## 第 4 点核查

问题会发生：服务刚重启时 `localVmSeen` 为空，原来的 `computerPreviewSurface` 不会检查共享容器，自动模式可能先落到 `cloud`，再显示 VPS「需要设置」。现在仅对 `localVm.mode=shared` 的共享目标允许首次只读探测；状态必须仍满足 `autoLocalVmAttachable`（包括可恢复停止状态）或正在等待启动，才返回 `vm`。per-bot 和 pool 仍要求目标先被记录，避免从未知目标推断桌面归属。

## 尚未完全把握

没有在本机运行真实 Podman 休眠/唤醒流程，也没有运行 e2e；服务端路由权限仍由既有路由校验负责，前端只根据已返回的可恢复状态改变按钮展示。
