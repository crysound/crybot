# T-1227 Cry Bot：main CI 全绿 + T-1215 安全审查 2 条低项

## 目标
crybot main 分支的 GitHub Actions `CI` 工作流（`.github/workflows/ci.yml`，check + vitest 8 个分片）全部通过；顺带收掉 T-1215 安全审查留下的 2 条低风险项。

## 背景
- T-1215（已合并，main 8e96a29a）修掉了 main CI 的大部分失败，最近一次 main CI（run 43597874746）还剩 7 个失败测试文件。失败摘要：`/root/build/t1227/main-ci-43597874746-failures.txt`；完整失败日志：`/root/build/t1227/main-ci-43597874746-failed.log`（只读参考）。
- 7 个失败文件：
  1. `server/bot-box/env.test.ts`：`CRYBOT_ANDROID_CERT_SHA256` 等 4 个新环境变量没归类（来自 T-1220 新加的 App Links 配置，见 `server/app-links.ts`）。报错原文：「add each to BOX_ENV_CRYBOT_NAMES in env.ts if a bot's engine, hook or MCP proxy reads it, else to SERVER_ONLY_CRYBOT here」。这 4 个只有服务端读，应归入 `SERVER_ONLY_CRYBOT`——先 grep 确认没有引擎/钩子/MCP 代理读它们再归类。
  2. `src/locales/vocabulary.test.ts`：「hard-coded strings ... use the same words」失败，`server/boat-access.ts:11` 的错误文案用了词表禁用的 `Boat`。按 vocabulary 规则改成词表认可的叫法（看测试和词表文件决定用哪个词），不要改测试规则本身，也不要加豁免。
  3. `server/bot-box/command-line-paths.linux.test.ts`：4 个用例在 CI 上超时（60s/120s），测试标题写「bubblewrap works here」。
  4. `server/bot-box/self-check.linux.test.ts`：「each mutation fails the checks it guards, and only those」——share-net 变体没触发 `host-loopback-unreachable`。
  5. `server/cloud-lending.e2e.test.ts`：expected false to be true。
  6. `server/cloud-team-engine-homes.e2e.test.ts`：expected 'tok-1' to be 'tok-1+'。
  7. `server/opencode-provider-keys.e2e.test.ts`：凭据/配置 JSON 断言不等（见日志里的 'cry_t0_…' vs 'anthropic-owner-…' 与 instances JSON 不等）。
  3–7 是从上游带进来的遗留失败（T-1215 认定上游 main 也失败），不是本分支引起的。
- T-1215 安全审查的 2 条低项：
  a. `server/index.ts` 开头注释写明 `./cloud-secrets-boot.ts` 必须最先 import（它要在任何模块能起进程前从启动器管道读走 Cloud 秘钥），但现在前面排了 4 个 import（admin-audit-request-fields、host/session-names、host/data-dir-lease-exit、provider-lock）。把 `cloud-secrets-boot` 挪回第一个 import，确认这几个模块挪后不影响行为（它们不应在加载时起进程）。
  b. `server/app-handoff.ts` 的 `createAppHandoffGate` 没有直接单测。补单测：被拦时返回 403、公共探针路径放行，以及正常放行路径。测行为，像调用方那样调用。

## 要做的事
1. 修 1、2 和 a、b（上面已写清做法）。
2. 对 3–7 逐个查根因：
   - 是代码或测试本身的真 bug（例如断言过期、改名后残留、时序竞争）就修根因。
   - 是 GitHub Actions 运行环境限制（例如 ubuntu-latest 默认限制非特权 user namespace，bubblewrap 实际不可用或很慢，回环网络行为不同）就二选一：(i) 在 `.github/workflows/ci.yml` 的 vitest 作业里加最小必要的环境准备步骤让它真跑通（例如放开 `kernel.apparmor_restrict_unprivileged_userns`），或 (ii) 让测试里的「bubblewrap 可用」探测更准确，探测不到时按现有的跳过机制跳过并在输出写清原因。优先 (i)；不得削弱安全断言，不得把失败用例直接 skip/删掉/放宽断言。
   - 判断不了是环境问题还是真 bug 的，在报告里写明证据和你的判断，不要硬改。
3. 本机能跑的就跑：每个改到的测试文件单独跑一遍。

## 范围
- 可以改：上面列的 7 个测试文件及其被测源文件、`server/boat-access.ts`、`server/bot-box/env.ts`、`server/index.ts`（只动开头 import 顺序）、`server/app-handoff.ts` 及新增的 `server/app-handoff*.test.ts`、`.github/workflows/ci.yml`（只限 vitest 作业的环境准备）。
- 不要改：其他文件。确实需要改时，在报告里说明原因，不要自己改。尤其不要碰 `server/index.ts` 的其余部分（别的任务在拆它）。

## 验收标准
- [ ] `server/bot-box/env.test.ts`、`src/locales/vocabulary.test.ts` 本机通过（`pnpm vitest run <文件>`）。
- [ ] 新增的 createAppHandoffGate 单测通过，覆盖 403、公共探针放行、正常放行。
- [ ] `server/index.ts` 第一个 import 是 `./cloud-secrets-boot.ts`；`pnpm exec tsc -p server --noEmit`（或仓库里现有的服务端类型检查命令）和 lint 通过。
- [ ] 3–7 每个文件在报告里写明：根因、怎么修的、本机能否复现/跑通；改 ci.yml 的写清每一行为什么要加。
- [ ] 没有新增 skip、没有放宽断言、没有删用例（探测改准确后按既有机制跳过的除外，须在报告逐条说明）。
- [ ] 最终以协调者推分支后 GitHub Actions 的结果为准。

## 约束
- 不要 git 提交。本机 workspace-write 禁网；需要新依赖时在报告里列出包名和版本，不要自己装。
- vitest 用 `--maxWorkers=2`；跑 vitest/build 用 `systemd-run --scope -q -p MemoryMax=4G -- <命令>` 包住（不可用就直接跑并在报告说明）。沙箱里起 socket/bubblewrap 失败的用例，在报告列出命令和报错，由协调者在沙箱外补跑。
- Node 用 `/opt/node24/bin/node`（系统 node22 跑不了 TS e2e，会超时）。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为，断言具体期望值。

## 汇报格式
报告追加到 `docs/tasks/T-1200/T-1227-main-ci-green/report.md`，用中文：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果。
3. 需要协调者处理的事：依赖、沙箱外补跑的用例、超出范围的改动、没解决的问题。
