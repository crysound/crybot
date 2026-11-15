# T-1240：修 Cry Bot main CI 上两个不稳定用例

## 现象（GitHub Actions，main 分支 CI 工作流）
同一套代码有时全绿（c0cfa555），有时某个分片失败，失败用例每次不同：

1. 217172c0 的 vitest (6)：
```
FAIL server/cloud-guest-shell.e2e.test.ts（第 205 行）
AssertionError: expected 'PATH=./node_modules/.bin:/home/runner…' not to contain 'CRYBOT_CLOUD_MACHINE_ID='
```
即用例 "no engine a bot runs finds the Cloud's secrets…" 中 `log.includes("bot box: on")` 分支里 `expect(probe.parent).not.toContain("CRYBOT_CLOUD_MACHINE_ID=")` 失败。

2. ff5c9785 的 vitest (7)：
```
Error: EACCES, Permission denied: '/tmp/cry-steer-B1lmzw'
 ❯ removeTempDirStrict server/testing/cleanup.ts:52:7
 ❯ server/steer-e2e.test.ts:155:5   (afterAll)
```

## 要做的事
1. cloud-guest-shell：先弄清 `probe.parent`（引擎父进程环境）在 bot box 打开时为什么偶尔带上 `CRYBOT_CLOUD_MACHINE_ID=`。重点分辨：是测试本身判定 bot box 开没开的方式有竞态（比如 `log` 在探针写出前后读取不一致、父进程其实是没进 box 的某条路径），还是产品代码确有一条路径会把服务端起始环境里的 `CRYBOT_CLOUD_MACHINE_ID` 漏给引擎父进程。若是产品漏变量，修产品代码，**不得放松断言**；若是测试判定的竞态，修测试使判定可靠，断言语义不变，报告写清证据。
2. steer-e2e：查清 afterAll 删临时目录时 EACCES 的来源（子进程或 bot box 留下的只读/改了属主的子目录、子进程未退干净仍在写等）。从根上修：确保子进程及其后代退出后再删，或在删除前把留下的目录权限改回可删；若改 `removeTempDirStrict`，要对所有调用它的测试仍成立。不要用吞掉错误的方式让测试变绿。
3. 两处各补能在沙箱里跑的针对性测试或复现手段（能做到的话），锁住修复。

## 范围与约束
- 只改相关测试文件、`server/testing/*`、定位到的产品文件和本任务报告；不改 `.github/workflows/`、不改 file-size ratchet 数字、不改其他用例断言。
- 不要 git 提交，不联网，不装依赖。
- 开工先在 worktree 根目录准备依赖（本机：若 `node_modules` 不存在，链到 `/root/workspace/crybot/node_modules`；InstaBox 上运行 `crybot-link-deps`）。没有 systemd 的环境去掉 `systemd-run` 前缀；一次只跑一个测试文件。

## 验收
- 逐个跑并贴结尾输出：`server/cloud-guest-shell.e2e.test.ts`、`server/steer-e2e.test.ts`（沙箱禁止监听端口跑不了就写明）、新增/改动的单测文件；可行的话各重复跑 3 次。
- `pnpm exec tsc -p tsconfig.server.json`、改动文件 `pnpm exec oxlint --deny-warnings <文件>`、`git diff --check` 通过。
- 报告 `report.md` 只写：根因（文件:行）、改了什么、跑过的命令和真实输出结尾几行。
- 最终以 GitHub Actions vitest 各分片转绿为准（协调者推分支开草稿 PR 核对）。
