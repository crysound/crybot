# T-1237：修 main 上 opencode-provider-keys e2e 回归（OpenCode 提供方钥匙没交给 OpenCode 进程）

## 现象
main 从 732fd31e（PR #45，T-1232「服务端代领飞书短期令牌」）起，CI 的 vitest (1) 分片稳定失败，后续 4f6ee7a6(#44)、6be10174(#46) 同样失败：

```
FAIL server/opencode-provider-keys.e2e.test.ts > saves keys for any OpenCode provider on a Cloud, shows only their names, and hands them to OpenCode alone
AssertionError: expected undefined to be 'venice-owner-…'   (opencode-provider-keys.e2e.test.ts:210)
```

第 210 行附近是 `expect(savedRecord.env.VENICE_API_KEY).toBe(VENICE)`：用户在 Cloud 上保存 OpenCode 提供方钥匙后，重新拉起的 OpenCode 提供方进程环境里拿不到 `VENICE_API_KEY`。

## 已核实的线索
- main 262f8826（PR #36，T-1228）CI 的 vitest 全部分片通过（只有 check/lint 失败，已由 T-1236 修）；PR #45 自身分支 T-1232-feishu-broker 的 vitest (1) 就已失败，合入后 main 持续失败 → 回归由 **T-1232（732fd31e）** 引入，确定性失败，不是偶发。
- T-1232 动到的、可能影响子进程环境的地方（`git diff 262f8826 732fd31e`）：
  - `server/credential-env.ts` 的 `stripControlPlaneEnv`：新增按 `/^(CRYBOT_FEISHU_|LARKSUITE_CLI_|MEEGLE_)/` 删除；
  - `server/bot-box/env.ts` 的 `boxEnvironmentAllows`：新增 `TURN_CRYBOT_NAMES` 例外；
  - `server/index.ts`：启动时新调用 `feishuCliUser(process.env, console.warn)`，以及 `beginTurn` 里的 `directFeishuCliAccess`；
  - `server/drivers/claude.ts`、`server/drivers/claude-turn-launch.ts`、`server/feishu-cli/*`、`server/sessions.ts`、`server/feishu-login.ts`。
  先确认真正原因（例如：启动顺序/某个调用改动了 process.env 或配置读取、提供方进程不再按保存的钥匙重启、模型列表刷新路径变了），不要猜着改。

## 要做的事
1. 在 worktree 里定位根因：读 `server/opencode-provider-keys.e2e.test.ts` 的整个流程（保存钥匙 → `nextProviderEnvironment` 等待提供方进程重启并 dump 环境），对照 T-1232 的改动找出导致新进程环境缺 `VENICE_API_KEY` 的那一处。能在沙箱里跑这个 e2e 就跑（`pnpm exec vitest run server/opencode-provider-keys.e2e.test.ts`）；沙箱禁止监听端口跑不了就在报告里写明，靠读代码 + 针对性单测定位。
2. 修复产品代码，让 OpenCode 提供方钥匙照旧只交给 OpenCode 进程；**不得放松 T-1232 的安全约束**（飞书令牌只经服务端按轮授予、`CRYBOT_FEISHU_*`/`LARKSUITE_CLI_*`/`MEEGLE_` 仍不能漏进智能体环境），也**不得改这个 e2e 的断言来迁就**。如果确认是测试本身的夹具与新行为不符（而非产品回归），在报告里写清证据，只改夹具、断言语义不变。
3. 在根因附近补一个不需要监听端口的单测，锁住这次回归（保存的提供方钥匙出现在提供方进程环境里，同时飞书类变量仍被剥离）。
4. 报告文件写清：根因（文件:行）、为什么 #45 的改动导致它、修法、跑过的命令和真实输出结尾几行。

## 范围与约束
- 只改定位到的产品文件、对应 `*.test.ts` 和本任务报告；不改 `.github/workflows/`、不改 file-size ratchet 数字、不改其他 e2e 的断言。
- 不要 git 提交，不联网，不装依赖。
- 开工先在 worktree 根目录准备依赖（本机：若 `node_modules` 不存在，链到 `/root/workspace/crybot/node_modules`；上运行 依赖准备脚本）。没有 systemd 的环境去掉 `systemd-run` 前缀；一次只跑一个测试文件。

## 验收
- 逐个跑并贴结尾输出：新增/改动的单测文件、`server/bot-box/env.test.ts`、`server/feishu-cli/turn.test.ts`、`server/feishu-cli/wrapper.test.ts`；能跑的话 `server/opencode-provider-keys.e2e.test.ts`、`server/feishu-cli/server.e2e.test.ts`。
- `pnpm exec tsc -p tsconfig.server.json`、改动文件 `pnpm exec oxlint --deny-warnings <文件>`、`git diff --check` 通过。
- 最终以 GitHub Actions 的 vitest (1) 分片转绿为准（协调者推分支开草稿 PR 核对）。
