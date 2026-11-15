# 本轮根因与证据

- `server/cloud-guest-shell.e2e.test.ts:71`：包装器把所有非 version/auth 调用写进同一个探针。首次记录显示 `--help` 和 text/json 一次性调用均由 server 直接启动。再临时取消过滤并逐次保存断言实际读取的记录：第三轮自然复现失败，选中的是 `-p --model claude-haiku-5-5 --output-format json`，PID 121327、父 PID 121114 与 server PID 相同，父环境带机器标记；前两轮读到 stream-json 则通过。这证明错误来自读取了未进 box 的后台调用，不是会话泄漏；并非本次选中了 help。修复后的记录：server 29426，help/text 的父 PID 29426 且带机器标记；stream-json 会话的 PID/父 PID 为命名空间内的 9/2，父环境没有机器标记。帮助调用来自 `server/drivers/claude.ts:821`；后台生成来自 `server/drivers/claude-background.ts:37`，默认 crybot 所有者通过 `server/procs.ts:229` 的 outsideBoxOptions。原环境断言不变，撤回无依据的 health 判定替换。
- `server/runtime/runtime.ts:151`、`:442`：关闭后原来仅忽略失败结果，仍接受 completed/needs_input/continue。dispose 等待 CLI 退出扩大了迟到结果落盘的时间窗，切断的 room root 被写成 completed，重启不再重跑。修改前实跑复现两条 R6 的 undefined/C-RERUN、completed/failed 错误，以及 group-local-vm 等不到重跑 setup 的超时；修复关闭边界，不改这三条用例的断言。
- `server/steer-e2e.test.ts:92`、`:115`、`:122`、`:155`：fixture 使用 Claude、Grok/Hermes ACP 和 Codex；SIGTERM 经 `server/index.ts:15360` 调用 registry 的 disposeAll，确实会走 Claude/ACP dispose。但 POSIX 活进程本身不会造成删除目录的权限位错误。正常运行一次、临时去掉两处 dispose 等待后再连跑三次，均通过；删除前巡查未发现非本用户属主或缺少 owner rwx 的目录。因此撤回上一轮“未等进程退出导致 EACCES”的根因结论，历史 CI 的具体残留子目录及属主尚无证据，不能冒称已确定。
- `server/testing/cleanup.ts:60`：旧函数只重试，不能恢复权限。人工残留复现明确为 `.crybot/task-workspaces/bot/thread/residual`，mode 0500、uid/gid 1000/1000、调用者 uid 1000；旧函数 20 次重试仍报根目录 EACCES，新函数删除成功。新增测试还覆盖 0000 父目录、0500 子目录及指向 fixture 外部只读目录的符号链接。这是权限错误的可重复复现，不能反推历史 CI 恰好留下同一目录。

# 改了什么

与本轮 git status 对应：

- `server/cloud-guest-shell.e2e.test.ts`：追加 argv/PID/父 PID/环境记录；只有 stream-json 会话写断言读取的探针，增加调用类型断言。
- `server/runtime/runtime.ts`、`server/runtime/runtime.test.ts`：关闭后保留所有被切断轮次供重启协调；新增四类迟到结果回归。
- `server/testing/cleanup.ts`、`server/testing/cleanup.test.ts`：仅遇 EACCES/EPERM 才恢复 fixture 内目录的 owner rwx，不跟随符号链接；无法修复继续抛错；chmod 失败附目录权限/属主信息。
- `server/drivers/acp/core.ts`：等待集合包括全部 hosts 和 retiring 子进程，覆盖无会话的存活 host；精简至 1704 行。
- `server/drivers/claude.ts`：精简 dispose 至 2086 行。保留两驱动等待退出作为独立的资源回收保证，与 EACCES 根因分开；它保证 dispose 返回前等待已知 CLI，而不靠 server 退出偶然清理。
- `server/drivers/claude.test.ts`、`server/drivers/acp/acp.test.ts`：只验证根 PID 的新增测试改名为 process，不再称已验证整棵进程树。
- `docs/tasks/T-1200/T-1240-flaky-ci/report.md`、`docs/tasks/T-1200/T-1240-flaky-ci/round2-verification.txt`：重写根因、记录本轮命令与输出。

# 命令与结果

开工已执行 依赖准备脚本。所有 server 验证使用临时 home/独立 fixture，未触碰 live app。工作区缺少 AGENTS 所引用的 `docs/verification/README.md`，沿用各测试已有隔离启动器；一次只跑一个测试文件，无 systemd 前缀、不安装依赖、不修改 workflow、不提交 git。

- `pnpm exec vitest run server/cloud-guest-shell.e2e.test.ts`：连续三次退出码 0；每次 `12 passed (12)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  04:46:53
   Duration  28.39s (transform 1.06s, setup 981ms, import 370ms, tests 26.88s, environment 0ms)
```

- `pnpm exec vitest run server/steer-e2e.test.ts`：连续三次退出码 0；每次 `24 passed (24)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  04:48:08
   Duration  24.36s (transform 784ms, setup 963ms, import 60ms, tests 23.20s, environment 0ms)
```

- `pnpm exec vitest run server/room-roots.e2e.test.ts`：连续三次退出码 0；每次 `14 passed | 1 skipped (15)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  14 passed | 1 skipped (15)
   Start at  04:38:34
   Duration  67.96s (transform 992ms, setup 682ms, import 628ms, tests 66.52s, environment 0ms)
```

- `pnpm exec vitest run server/group-local-vm.e2e.test.ts`：连续三次退出码 0；每次 `45 passed | 2 skipped (47)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  45 passed | 2 skipped (47)
   Start at  04:43:48
   Duration  126.36s (transform 1.15s, setup 959ms, import 522ms, tests 124.73s, environment 0ms)
```

- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`：连续三次退出码 0；每次 `1 passed (1)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  04:48:37
   Duration  1.33s (transform 825ms, setup 1.07s, import 9ms, tests 86ms, environment 0ms)
```

- `pnpm exec vitest run server/drivers/claude.test.ts`：连续三次退出码 0；每次 `257 passed | 1 skipped (258)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  257 passed | 1 skipped (258)
   Start at  04:51:58
   Duration  98.27s (transform 1.96s, setup 1.12s, import 1.36s, tests 95.62s, environment 0ms)
```

- `pnpm exec vitest run server/drivers/acp/acp.test.ts`：连续三次退出码 0；每次 `214 passed (214)`。第三次输出结尾：

```text

 Test Files  1 passed (1)
      Tests  214 passed (214)
   Start at  04:55:05
   Duration  44.75s (transform 2.65s, setup 1.31s, import 2.05s, tests 41.25s, environment 0ms)
```

- `pnpm exec vitest run server/runtime/runtime.test.ts`：`65 passed (65)`，退出码 0。

- `pnpm exec vitest run server/testing/cleanup.test.ts`：`2 passed (2)`，退出码 0。

- `pnpm exec vitest run server/kill-tree-linux.test.ts`：`6 passed (6)`，退出码 0。

- `pnpm exec tsc -p tsconfig.server.json --pretty false`、改动的九个 TypeScript 文件 `pnpm exec oxlint --deny-warnings <文件>`、`git diff --check`：无输出，退出码 0；完整参数见 verification。
- `node scripts/public-scan/scan.mjs --base origin/main`：退出码 2，真实输出 `Public scan error: invalid base, configuration, repository, or unparsed diff.`。此工作区只有 master 的 b27bf86 基线，无远端及 origin/main，不能伪报通过。另用同一 scanDiff 扫描当前未提交修改和新增文件：`Working tree public scan: 0 findings`，辅助脚本也存入 verification。
- room-roots 的 1 个 skip、group-local-vm 的 2 个 skip 均为原有 Linux 平台条件；Claude 的 1 个 skip 是 Windows permission pipes 用例；本轮未增加跳过或修改三条失败用例的断言。
- 完整通过输出、诊断命令和失败复现结尾见 [round2-verification.txt](round2-verification.txt)。未提交/推送，未运行 PR Actions；远端分片是否转绿仍待协调者推送核对。
