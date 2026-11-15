# T-1243 computer tools

## 改了什么

- `server/instabox/computer-tools.ts`
- `server/instabox/computer-tools.e2e.test.ts`
- `docs/tasks/T-1200/T-1243-instabox-tools/report.md`
- `docs/tasks/T-1200/T-1243-instabox-tools/verification.txt`

`cloudComputerRpc` 的可选依赖签名为 `instabox?: { machines: InstaboxMachines; machineId(): string | null | undefined }`。

## 为什么

复制到机器前先完成本地路径和文件检查，避免无效请求触达机器；fixture 使用符合远程路径规则的 `/tmp` 路径覆盖中文、引号和换行；后台 `setsid` 等待子进程，避免快速命令被误报为 `lost`。

## 测试

- `pnpm exec vitest run server/instabox/computer-tools.e2e.test.ts --reporter=dot`：连续 3 次通过，18/18。
- `pnpm exec vitest run server/cloud-computer-tools.test.ts --reporter=dot`：31/31 通过。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --reporter=dot`：1/1 通过。
- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec oxlint --deny-warnings server/instabox/computer-tools.ts server/instabox/computer-tools.e2e.test.ts`：通过。

## 第 2 轮

### 改了什么

- `server/instabox/computer-tools.ts`
- `server/instabox/computer-tools.e2e.test.ts`
- `server/cloud-computer-tools.ts`
- `server/cloud-computer-tools.test.ts`
- `server/cloud-computer-background.ts`
- `server/cloud-computer-files.ts`
- `server/cloud-computer-tool-shared.ts`
- `server/testing/fake-instabox-tools.ts`
- `server/instabox/machine.ts`
- `shared/wire.ts`
- `docs/tasks/T-1200/T-1243-instabox-tools/report.md`
- `docs/tasks/T-1200/T-1243-instabox-tools/verification.txt`

### 为什么

后台状态现在复用 Boat 的 next、错误和收尾读取格式，轮询间隔为 2 秒；截图使用 `scrot -o -p ... || import ...`，xclip 不存在时回退到 `xdotool type`。路径集中限制在 `/home/user` 或 `/tmp`，整文件复制上限为 256 MiB（契约是非流式 `Uint8Array`）。后台命令通过可选 `InstaboxRequest` 获取、续租并释放 activity lease，未注入时退化为不续租；共享工具抽出后消除了循环 import。`cloud-computer-files.ts` 和 `cloud-computer-background.ts` 的导出调整不改变行为。路径拒绝文案键名为 `cloudComputer.instaboxPathRefusal`，英文为 `Path must be under /home/user or /tmp.`，中文由任务④补齐。

`cloudComputerRpc` 的本轮 deps 签名为 `instabox?: { machines: InstaboxMachines; machineId(): string | null | undefined; request?: InstaboxRequest }`。`cloud-computer-files.ts` 实际导出的共享符号为 `MiB`、`COPY_MAX_BYTES`、`DISK_RESERVE_BYTES`、`noFollow`、`CopyOutcome`、`CopyOptions`、`diskFree`、`tooBig`、`noSpace`、`placeInFolder`、`land`、`copyFromComputer`、`copyToComputer`；`cloud-computer-background.ts` 实际导出的共享符号为 `PROCESS_ID_PATTERN`、`STATUS_WAIT_MAX_SECONDS`、`STDOUT_TAIL_CHARS`、`STDERR_TAIL_CHARS`、`POLL_MS`、`BACKGROUND_KEEPS_AWAKE_MS`、`EXEC_LATE`、`OTHER_COMPUTER`、`UNKNOWN_PROCESS`、`LOST`、`CUT`、`STALE`、`BACKGROUND_NEXT`、`processIdOn`、`backgroundCommandRunning`、`startInBackground`、`describeStatus`、`statusError`、`backgroundStatus`、`commandLateText`；这些调整只增加导出，行为不变。

### 测试

- `pnpm exec vitest run server/instabox/computer-tools.e2e.test.ts --reporter=dot`：连续 3 次通过，20/20。
- `pnpm exec vitest run server/cloud-computer-tools.test.ts --reporter=dot`：32/32 通过。
- `pnpm exec vitest run server/cloud-computer-background.test.ts --reporter=dot`：60/60 通过。
- `pnpm exec vitest run server/cloud-computer-files.test.ts --reporter=dot`：27/27 通过。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --reporter=dot`：1/1 通过。
- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec oxlint --deny-warnings`（全部改动文件）：通过。

## 第 3 轮

### 改了什么

- `server/cloud-computer-tool-shared.ts`
- `server/cloud-computer-tools.test.ts`
- `server/instabox/computer-tools.ts`
- `server/instabox/computer-tools.e2e.test.ts`
- `docs/tasks/T-1200/T-1243-instabox-tools/report.md`
- `docs/tasks/T-1200/T-1243-instabox-tools/verification.txt`

### 为什么

恢复 `scroll` 的 `direction` 必填校验，并覆盖缺字段拒绝；后台任务在 `exec_status` 仍为 running 或等待窗口结束时继续保留 activity lease，只在任务结束、丢失或 exit 44 时释放。没有 lease id 时不再删除整个 activity-leases 集合，等服务端到期。lease 请求体中的 `durationSeconds`、`leaseId` 尚未对真实接口验证。

### 测试

- `pnpm exec vitest run server/cloud-computer-tools.test.ts --reporter=dot`：33/33 通过。
- `pnpm exec vitest run server/instabox/computer-tools.e2e.test.ts --reporter=dot`：连续 3 次 21/21 通过。
- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec oxlint --deny-warnings server/cloud-computer-tool-shared.ts server/cloud-computer-tools.test.ts server/instabox/computer-tools.ts server/instabox/computer-tools.e2e.test.ts`：通过。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --reporter=dot`：通过。


## 第 4 轮

### 改了什么

- `server/instabox/machine.ts`
- `server/instabox/computer-tools.ts`
- `server/instabox/computer-tools.e2e.test.ts`
- `server/testing/fake-instabox-tools.ts`
- `docs/tasks/T-1200/T-1243-instabox-tools/report.md`
- `docs/tasks/T-1200/T-1243-instabox-tools/verification.txt`

### 为什么

按指定原文扩展 `readFile` 契约；复制传入 256 MiB、截图传入 16 MiB 的读取上限，保留事后检查，假实现按响应头和流中累计字节拒绝超限，避免分配完整超大缓冲。全局最多两个复制，第三个立即返回 busy；取消后仍占用名额直到底层传输结束。真实机器层实现由任务①配套修改，本轮验证注入的假实现。

后台 lease 按 machineId 共用，后续执行只续租，共用一组定时器；最后一个已跟踪任务结束或到期才释放。remotePath 的 TOCTOU 仅作用于智能体自己的机器，本轮不改其代码。

### 测试命令与结果

- `pnpm exec vitest run server/instabox/computer-tools.e2e.test.ts --reporter=dot`：最终连续 3 次，每次 29/29。
- `pnpm exec vitest run server/cloud-computer-tools.test.ts --reporter=dot`：33/33。
- `pnpm exec vitest run server/cloud-computer-background.test.ts --reporter=dot`：60/60。
- `pnpm exec vitest run server/cloud-computer-files.test.ts --reporter=dot`：27/27。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --reporter=dot`：1/1。
- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec oxlint --deny-warnings server/instabox/machine.ts server/instabox/computer-tools.ts server/instabox/computer-tools.e2e.test.ts server/testing/fake-instabox-tools.ts`：通过。
- `git diff --check`：通过。

所有测试逐文件运行；e2e 使用隔离 HTTP fixture 和临时目录。仓库缺少 `docs/verification/README.md`，无法读取该规范；未连接真实应用或数据。首次类型检查发现测试使用了当前 lib 不支持的 API，修正后全部通过；完整输出见 `verification.txt`。
