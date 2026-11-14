# T-1215 server CI/e2e 修复报告

## 根因

`server/index.ts` 在全新数据目录启动时只调用了 `firstEngineRead()`，没有等待 `registry.readAtStart()` 完成，就执行 `refreshUnsetModelSelections()`。首次读取时 registry 仍处于 provisional 状态，seed bot 的 model selection 被写成空值；后续请求因此集中得到 `no_ai`、409 和 matcher timeout。现在 fresh-start 分支等待 registry 读取并把读取到的 engines 传给刷新函数，若配置发生变化也广播 config（`server/index.ts:2857-2862`）。已有数据目录继续异步启动读取。

## 代码和测试修复

- `server/decider/fixtures/relay-seams.json`、`server/extractor/fixtures/extract-relay.json`：fixture 中残留的 `CryBot` 改为 `Cry Bot`，与 T-1207 的产品名及 key-check 断言一致。
- `server/data-format-released.json`：release marker 从 `0.1.155` 更新为当前 `1.0.0`；没有改 data-format 逻辑。
- `server/bot-box/env.test.ts`：将新增的 `CRYBOT_CF_ACCESS_ALLOW`、`CRYBOT_CF_ACCESS_AUD`、`CRYBOT_CF_ACCESS_TEAM_DOMAIN`、`CRYBOT_DESKTOP_UPDATES_DIR` 明确归入 server-only allow-list，并把测试集合名称改为 `SERVER_ONLY_CRYBOT`。产品的 `CRYBOT_CLOUD_*` box 禁止策略未放宽。
- `server/cloud-guest-shell.e2e.test.ts`：测试改为确认 `CRYBOT_CLOUD_MACHINE_ID` 不出现在 engine 的 parent/own environment。这与 `server/bot-box/env.ts:54-60` 的 `BOX_ENV_NEVER_PREFIXES` 安全策略一致；没有把 machine id 放回 box。
- `server/cloud-home-server.test.ts`：CLI fixture 写入后显式 `chmodSync(..., 0o755)`，避免 `/api/cli-test` 在 Linux runner 上报告 fixture 不可执行。
- `server/index.test.ts`：同步当前 server 合同：fleet entitlement 错误为 `Workspace administration is unavailable.`；内部 Chief 路由为 `/api/internal/team-setup-catalog`；新 bot greeting 使用当前 profile 名称。
- `server/drivers/agents-catalog-goldens/bridged.profiles.json`：根据当前 bridge wire 重新记录每个 profile 的 bytes/hash。工具列表内容的 golden 未删除或放宽。

没有删除测试，也没有删除或绕过仍存在的托管云功能。`server/model-providers-docs.test.ts` 仍无法在本 checkout 收集：它引用的 `apps/docs/content/docs/providers/model-providers.mdx` 不存在；该文件不在本路允许修改的 server 范围内。

## 已运行的测试

以下批次在当前工作树运行：

```text
pnpm vitest run server/default-model-selection.test.ts server/harness/registry-start-read.test.ts server/bot-box/env.test.ts server/cloud-home-server.test.ts --maxWorkers=2 --configLoader runner
```

其中 default-model-selection、registry-start-read、bot-box/env 通过；cloud-home-server 在本地 fixture 启动前因 `no free port block for offsets 0,1 in 19600..22600` 失败，属于沙箱端口池限制。

```text
pnpm vitest run server/decider/helper-backends.test.ts server/extractor/extractor.test.ts server/bot-box/env.test.ts --maxWorkers=2 --configLoader runner
```

3 files、114 tests 全部通过。

修复后补跑：

```text
pnpm vitest run server/default-model-selection.test.ts server/harness/registry-start-read.test.ts server/bot-box/env.test.ts server/decider/helper-backends.test.ts server/extractor/extractor.test.ts --maxWorkers=2 --configLoader runner
```

5 files、167 tests 全部通过。

`pnpm typecheck` 通过；server 范围的 `pnpm exec oxlint --deny-warnings server` 通过。根目录 `pnpm lint` 仍被未授权修改的 `electron/main.mjs:1291` 既有 `no-unused-vars` warning 阻断。`node scripts/check-brand-residue.mjs` 报告 6540 files、0 forbidden references；`git diff --check` 通过。

agents bridge golden 已用打包 proxy 逐 profile 生成并核对，当前 Node 22 无法直接执行 Vitest 的 `.ts` child proxy（项目要求 Node >=24）；Actions 应在 Node 24 上运行该批次。

## 沙箱限制和待由 Actions 确认的项目

- 当前运行时为 Node `v22.22.1`，项目要求 `>=24`。
- 沙箱禁止 server fixture 监听 `127.0.0.1`（`listen EPERM`），并且端口池可能被占用；因此真实 `server/index.test.ts` 和大多数 HTTP/e2e suite 不能在这里完整启动。fresh-start 修复由 registry 单测覆盖，最终以 Actions 为准。
- 沙箱不能启动 Chromium，bubblewrap/浏览器相关 suite（包括 `cloud-lending-chrome.e2e.test.ts`、`bot-box/*.linux.test.ts`、`box-attachments.linux.test.ts`、`engine-homes/box.linux.test.ts`）只能由 CI runner 验证。该环境错误不据此修改产品行为。
- `docs/verification/README.md` 在本 checkout 不存在，无法按该路径执行额外验证；所有运行均使用临时 fixture，不接触用户 live 数据。


## r3 返工记录（2026-11-14）

**更正前文：registry provisional 不是有证据支持的 no_ai 根因，相关首启修改已撤回。本轮不宣称 47 个失败文件已全部修复。** 所有验证使用 Node 24.22.3、临时 fixture；一次一个重命令，Vitest `--maxWorkers=1`。本 checkout 仍缺少 `docs/verification/README.md`。没有接触 live 数据，没有 git commit，没有修改 CI 配置或 ratchet 阈值。

### 1. r2 半成品、ratchet、公开探针

复核 `cfAccessRefusal()`：Access 未配置或属于公开 GET 探针时返回 null，其余请求调用原 Access 验证器，401/403 响应保持原样。`isCfAccessPublicProbe()` 单测覆盖四个公开路径、非 GET、哈希长度错误、大写、额外后缀及普通 API。撤回无依据的首启修改后 index.ts 也回到行数上限内。

验证：`PATH=/opt/node24/bin:$PATH pnpm vitest run scripts/testing/index-route-ratchet.test.ts scripts/testing/file-size-ratchet.test.ts server/cf-access.test.ts --maxWorkers=1 --configLoader runner`：3 files / 19 tests 通过；最终合并相关单测复验见下。

### 2. release marker

运行 `PATH=/opt/node24/bin:$PATH node scripts/record-data-format.mjs`，由工具生成 1.0.1，未手写版本号。运行 `server/data-format.test.ts` 后，原版本不符已消失，但同一用例的下一行读取 `.github/workflows/prepare-release.yml` 报 ENOENT；该发布工作流在当前仓库不存在，不能把这个结果写成整个文件通过。另 4 个 server 启动用例因沙箱无法分配监听端口而失败；该批次（含 fixture-engine 单测）为 11 passed / 5 failed / 1 skipped。

建议协调者确定新的发版入口，再把“发版时调用记录工具”的合同接到该入口。本轮遵守不改 CI 的限制，未删除或绕过这条断言。

### 3. 首启、no_ai 与连接拒绝

恢复 `if (store.needsSeed()) { firstEngineRead(); await refreshUnsetModelSelections(); }`。`registry.unread` 初值为 null，原首启路径没有调用 `readAtStart()`；`refreshUnsetModelSelections()` 会等待 `registry.describe()`，因此旧报告的 provisional 竞态解释不成立。

重新找到的可核对调用链是：

- `cloud-send-fixture.ts` 明确写入了合成 `claudeAgent`，所以不能断言 T-1207 删除了这些测试所用的默认假 AI。
- box 初始化调用 `distrustHomePrograms(home, [dataDir], ...)`。原合成 CLI 在 HOME 的 `fixture-claude.mjs`；`cliVersionProbe → execCli → outsideBoxOptions` 在 spawn 之前对它抛 EACCES。
- `ClaudeDriver.snapshot()` 在版本读取失败时返回 unavailable；默认模型选择排除它，留下空 instanceId。`host/no-ai-notice.ts` 对空 instanceId 返回日志中的 `no_ai` 409。`cloud-team-admin` CI 的 authenticated=undefined 也与版本探针失败一致。
- 日志 `job-132350279195.log:2547` 直接给出同一规则拒绝 HOME 下 agent-browser 的原文。新增 `server/testing/fixture-engine.test.ts` 用实际信任检查与 box mount plan 验证旧 HOME 路径被拒绝、新路径可用且最后覆盖挂载为只读；不需要启动服务器。

共同修复：`fixtureEnginePath()` 将临时合成程序放入 `<data>/tools/npm/bin`，这是现有引擎安装/只读挂载目录。cloud-send 及本次涉及的独立 fixture 使用该目录；Node 包装命令也只读取这个受保护目录中的脚本。没有放开 HOME 程序执行策略，也没有关闭 box。

这证明并修复了探针阶段的共同故障；Team Cloud 的独立 engine home 会隐藏原 server HOME，多个 fixture 的 plan/dump/gate 仍在旧 HOME 或共享 /tmp 下；这些后续阶段还需要迁移输入输出，并由 Actions 检查，不能据静态推理宣称整组绿。

`127.0.0.1:18080` 已另行定位为 `BOX_BROKER_PORT`：cloud-lent-mcp 的测试侧直接 fetch 引擎获得的 box 内 URL，宿主未监听该地址；不是 server 主端口启动失败。现让测试通过 `<data>/box/broker.sock` 连接实际 broker，保留引擎 URL 的能力令牌路径、全部 MCP 响应与 Mac 收到真实 key 的断言，并新增 HTTP 200 断言；box 关闭时仍按原 URL 请求。关闭 fixture 时释放 dispatcher。未启动该 e2e，待 Actions。`:3000` 日志没有调用者栈或 suite 标签，不能证明与 no_ai 同因，列为未定位，不据此改产品代码。

### 4. guest-shell 正向对照

无 box 时保留 parent 含 `CRYBOT_CLOUD_MACHINE_ID`；有 box 时 parent 不含该标记，而测试侧 `/proc/<server pid>/environ` 必须含它，证明读的是不同环境。parent 必须可读，不能拿“unreadable”通过负向断言。服务器、parent、engine 自身分别检查 secret/relayToken 不存在，engine 自身仍检查 machine id 不存在。生成的探针程序同样移入受保护引擎目录。HTTP/e2e 按用户限制未在本沙箱重跑，Actions 待验。

### 5. dump-env 不可执行

根因是 `outsideBoxOptions` 的程序信任拒绝，不是有证据的 noexec 挂载：`/api/cli-test` 经 `execCli` 得到 EACCES，`describeSpawnFailure` 将它翻译成“isn't executable”。chmod 无法改变 HOME 路径是否可信。现在 dump-env 脚本放入受保护引擎目录，由绝对 Node 解释器执行，保留全部环境凭据断言。无修改生产信任规则；静态检查及 fixture-engine 合同单测通过，HTTP 用例待 Actions。

### 6. provider 文档

新增 [`docs/model-providers.md`](../../../model-providers.md)，测试读取它。保留 Claude 自定义 endpoint/本机 settings、OpenCode 2 ACP 模型与 effort、纯 JSON 配置、Cline 及 OpenRouter 错误说明的全部断言，并补了可编辑的 provider 示例。

命令：`PATH=/opt/node24/bin:$PATH pnpm vitest run server/model-providers-docs.test.ts --maxWorkers=1 --configLoader runner`。10/11 通过，ACP 模型发现仍失败；最小隔离 Node 子进程复现 `spawnSync /opt/node24/bin/node EPERM`，异步模式也无法正常读写 stdio，而 shell 管道直接运行 fake ACP 可以返回 initialize/session。撤回无效的 FAKE_ACP_ALLOW_DETACHED 调试修改，没有改生产探针或断言。CI `job-132350279189.log:341` 通过的是另一个 ACP driver 用例，**不是本文件**；本文件须在 Actions 验证。

### 7. 其余失败的共同根因与修复

- 程序信任：共同 cloud-send fixture 覆盖多数 cloud-team、question-cards/routing、team-protocol、same-name-mentions、connector-stayed、team-move、team-refused-handoff。独立 cloud-credit、cloud-lending 系列、cloud-home、cloud-routine-level、cloud-team-admin/sleep、use-my-mac、parallel fixture 也移入受保护目录。Chrome stand-in 保留原生成脚本、shebang 和日志协议，仅改程序位置，避免先前草稿新文件的执行位/环境日志变量问题。
- PID namespace：parallel 和 lending 的合成进程用 `process.pid` 命名 dump/gate；不同 box 可以有相同 PID。改为每个进程生成随机 UUID，parallel 的 release gate 与 dump 共享同一个 UUID。CI parallel 的“expected 3 got 1”与覆盖机制吻合；保留全部计数/调度断言，仍需 Actions。
- Linux fixture：`job-132350279204.log:2438` 明确报 bwrap 缺少 `.../workspaces/bot-a`。ask-socket 与 attachments 的 fixture 只建 task workspace，未建 plan 必挂的 bot workspace，现补建。engine-homes 的失败内容包括 `cat: <Bob 路径>: No such file`，实际列表只有自己的 member；改为断言进程成功并只对 stdout 检查目录可见性，stderr 保留作诊断，原隔离/凭据断言全部保留。
- diagnostics：补 `CRYBOT_LICENSE_KEY`、`CRY_CLOUD_READY_TOKEN`，credential parity 用例通过，共 81 tests。
- 尚未解决且不以环境问题掩盖：self-check 的 share-net mutation 在 `self-check.ts` 将 `isolatedNet=false`，`box-probe.ts` 因而不执行两个网络隔离检查，且不再建立 gate bridges；测试却期待这两个 ID 失败且其他项都通过。需要重新设计 mutation 观察合同，本轮未放宽断言。opencode-provider-keys 期望原始 ANTHROPIC key，但 CI 收到 `cry_t0_` broker 令牌；需验证 broker 转发真实 key，不能简单改成“不是原值”。cloud-lent-mcp 的 :18080 访问已改为 broker socket，见第 3 项。memory 两个正向 capture 用例与 routine-level 的空字符串 schema 失败尚无充分证据判定已修复。

T-1207 证据：`git show --format= --name-status 7124ef58` 确实删除 `cloudflare/control-plane/src/index.ts`、`cloudflare/composio-broker/src/index.ts`、`server/enterprise.ts`、`server/team-library.ts`、`server/testing/broker-fake.ts` 等。与此同时 `CloudCreditProvider`、`cloud-home.ts`、`cloud-team.ts` 和合成 Claude fixture 仍存在，不能把所有 cloud-* 失败归为已删功能。建议协调者分别决定控制面端到端覆盖应迁移到新 workspace 合同还是正式退役；本轮没有删测试、恢复托管云服务或放宽安全策略。

清单逐文件处置（日志引用以 `/root/build/t1215/ci-pr12/` 为根；“待验”不等于已修复）：

| 失败文件 | CI 首个失败位置 | 归类与本轮处置 |
| --- | --- | --- |
| `electron/diagnostics.test.mjs` | `job-132350279008.log:2617` | credential parity 少两个名称；补齐，81 tests 本地通过。 |
| `scripts/testing/file-size-ratchet.test.ts` | `job-132350279294.log:2995` | index.ts 超行数；抽出 Access 守卫、撤回首启修改；本地通过。 |
| `scripts/testing/index-route-ratchet.test.ts` | `job-132350279195.log:2696` | 公开探针增加路由匹配；抽到 cf-access；本地通过。 |
| `server/bot-api-team.e2e.test.ts` | `job-132350279294.log:2712` | 首个 Bot API 调用 403；共用 CLI 夹具已修，但日志未给响应体，403 原因未证实；外部 /tmp dump 也需迁移。 |
| `server/bot-box/ask-socket.linux.test.ts` | `job-132350279204.log:3103` | bwrap 缺 bot workspace，补建；Linux 待验。 |
| `server/bot-box/self-check.linux.test.ts` | `job-132350279429.log:3062` | share-net 跳过预期的隔离探针并撤掉 bridges；尚未修复，需重做 mutation 观察合同。 |
| `server/box-attachments.linux.test.ts` | `job-132350279230.log:5560` | fixture 同样漏建必挂的 bot workspace；补建，Linux 待验。 |
| `server/cloud-credit.e2e.test.ts` | `job-132350279189.log:5147` | Claude authenticated 未定义，随后模型/对象断言级联；迁移 CLI，待验；未删除 credit 测试。 |
| `server/cloud-home-server.test.ts` | `job-132350279195.log:2520` | dump-env 被程序信任规则拒绝；移入只读引擎目录、绝对 Node 启动，待验。 |
| `server/cloud-lending-chrome.e2e.test.ts` | `job-132350279195.log:2543` | agent-browser 信任拒绝、连接计数级联；迁移程序，dump 用 UUID，待验。 |
| `server/cloud-lending-memory.e2e.test.ts` | `job-132350279189.log:5232` | owner capture 正向对照缺注入事实；迁移 CLI/dump UUID，尚不能判定 capture 故障已修。 |
| `server/cloud-lending.e2e.test.ts` | `job-132350279189.log:5286` | 等待 lent turn 证据超时；迁移 CLI/dump UUID，待验。 |
| `server/cloud-lent-mcp.e2e.test.ts` | `job-132350279294.log:2731` | 宿主访问 box :18080 ECONNREFUSED；改经 broker Unix socket，保留真实 key 转发断言，待验。 |
| `server/cloud-routine-level.e2e.test.ts` | `job-132350279429.log:2678` | create_bot 返回空字符串 schema 错误；CLI 探针已修。默认 modelSelection 可能为空，但尚无端到端证据，保留为待定位。 |
| `server/cloud-team-admin.e2e.test.ts` | `job-132350279230.log:5580` | authenticated 未定义；独立 CLI 迁移，后续只读/权限断言待验。 |
| `server/cloud-team-bot-access.e2e.test.ts` | `job-132350279189.log:5125` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-browser.e2e.test.ts` | `job-132350279230.log:5626` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-conversation-share.e2e.test.ts` | `job-132350279230.log:5517` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-crybot-own-chat.e2e.test.ts` | `job-132350279008.log:2658` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-crybot-reach.e2e.test.ts` | `job-132350279294.log:2738` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-engine-homes.e2e.test.ts` | `job-132350279204.log:2916` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-included-hosting.e2e.test.ts` | `job-132350279195.log:2497` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-member-secrets.e2e.test.ts` | `job-132350279204.log:2877` | routine failed 而非 completed；共用 CLI 修复，成员 HOME 可见性问题仍待处理。 |
| `server/cloud-team-one-answer.e2e.test.ts` | `job-132350279008.log:2697` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-open-reach.e2e.test.ts` | `job-132350279429.log:2691` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-people.e2e.test.ts` | `job-132350279429.log:2767` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-per-person.e2e.test.ts` | `job-132350279230.log:5646` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-preference.e2e.test.ts` | `job-132350279008.log:2716` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-privacy-holes.e2e.test.ts` | `job-132350279429.log:2660` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-private-default.e2e.test.ts` | `job-132350279195.log:2597` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-private.e2e.test.ts` | `job-132350279230.log:5537` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-published-apps.e2e.test.ts` | `job-132350279204.log:2893` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/cloud-team-setup-request.e2e.test.ts` | `job-132350279204.log:3046` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/connector-stayed.e2e.test.ts` | `job-132350279008.log:2735` | 发消息 409；共用 CLI 修复，连接保持的后续断言待 Actions。 |
| `server/data-format.test.ts` | `job-132350279008.log:2755` | 生成 1.0.1，原版本失败解除；下一断言读已删 prepare-release.yml，仍失败，待协调发布入口。 |
| `server/engine-homes/box.linux.test.ts` | `job-132350279429.log:3074` | stderr 的拒绝路径被误作可见目录；验证 exit 0、仅检查 stdout，Linux 待验。 |
| `server/model-providers-docs.test.ts` | `job-132350279294.log:2697` | 文档 ENOENT；补 docs 页面并改引用，10 项通过；ACP 子进程受沙箱限制待 Actions。 |
| `server/opencode-provider-keys.e2e.test.ts` | `job-132350279429.log:2782` | 只有 turn 的 ANTHROPIC 原 key 断言失败，收到 broker token；需真实 upstream 正向转发验证，未改断言。 |
| `server/outside-work-threads.e2e.test.ts` | `job-132350279189.log:5389` | 等待团队 turn 超时；共用 CLI 迁移，但 /tmp dump 在 box 私有 /tmp 中不可从宿主读取，尚需迁移。 |
| `server/parallel-threads.e2e.test.ts` | `job-132350279230.log:5726` | 计数 3→1、调度级联；Claude dump/gate 同一 UUID，CLI 迁移；team HOME gate/ACP 路径仍待处理和验证。 |
| `server/question-cards.e2e.test.ts` | `job-132350279294.log:2915` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/question-routing.e2e.test.ts` | `job-132350279429.log:2798` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/same-name-mentions.e2e.test.ts` | `job-132350279008.log:2771` | 计数/交接失败且后续明确 no_ai；共用 CLI 修复，room plan 的成员 HOME 可见性仍待处理。 |
| `server/team-move.e2e.test.ts` | `job-132350279429.log:2920` | 等待 turn 超时及 409；共用 CLI 修复，后续迁移协议待验。 |
| `server/team-protocol.e2e.test.ts` | `job-132350279429.log:2962` | no_ai / 409 或同组后续失败；共用 CLI 探针修复，保留原断言；成员 HOME 的 plan/dump 可见性仍待处理，Actions 待验。 |
| `server/team-refused-handoff.e2e.test.ts` | `job-132350279195.log:2617` | 交接状态/回复数量失败；共用 CLI 修复，tool-calls 与成员 HOME 可见性仍待处理。 |
| `server/use-my-mac.e2e.test.ts` | `job-132350279230.log:6034` | 等待当前 turn dump 超时；独立 CLI 迁移、dump UUID，待验。 |

以上按清单列出 47/47 文件，位置为原日志首个 FAIL 的行号；同一文件可能还有级联或独立失败，表中不把一次共同修复等同整文件通过。

### 建议项与最终验证

`server/index.test.ts` 恢复普通人名 `Ada Lovelace` → `Hi Ada` 和原 first-name 测试标题；未启动需要端口的 index 集成 suite。

最终命令都在 `PATH=/opt/node24/bin:$PATH` 下串行运行：

- `pnpm vitest run scripts/testing/index-route-ratchet.test.ts scripts/testing/file-size-ratchet.test.ts server/cf-access.test.ts server/testing/fixture-engine.test.ts electron/diagnostics.test.mjs --maxWorkers=1 --configLoader runner`：5 files / 101 tests 通过。
- `pnpm lint`：全仓通过，exit 0。本结果更新前文旧轮次的 lint 阻塞记录。
- `pnpm typecheck`：通过，exit 0（包含最新 broker socket fixture 修改）。
- `pnpm vitest run server/model-providers-docs.test.ts --maxWorkers=1 --configLoader runner --testNamePattern '^(?!.*lists provider models from ACP)'`：10 passed / 1 filtered，确认最终文档内容；完整文件的 ACP 失败记录仍见第 6 项，没有改 skip 或测试断言。
- `git diff --check`：通过。

尚未完成：Team Cloud 夹具的共享 plan/dump/gate 需要适配成员 HOME；self-check share-net、OpenCode 实际凭据转发对照、Bot API 403、memory capture、routine-level 空模型候选及 `:3000` 连接拒绝仍需继续定位/验证。发布 workflow 合同需协调者确定新入口。上述项目不能标记为已通过，也未因可能属于旧托管云覆盖而擅自删除。

按本轮限制，没有运行需监听端口、bubblewrap 或浏览器的 e2e，也没有重跑全量 suite。原 Actions 日志是失败依据；本轮静态修复的端到端结果须等待新的 Actions 运行。
