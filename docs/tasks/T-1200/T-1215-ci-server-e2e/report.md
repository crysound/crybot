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


## r4 返工记录（2026-11-14）

### 基线核对：清单不能作为“上游通过”的证据

开工核对 `/root/build/t1215/ci-pr12-r3/failed-files.txt` 仍为 28 个文件，已有 7 份分片日志；没有出现额外更新。按要求先处理指定的 9 个文件。

**日志与任务说明中的基线清单有冲突：9 个第一优先文件在上游基线日志里也全部失败，不能写成“上游通过、改名后回归”。** `ci-baseline/job-132202769962.log:92,106` 明确检出 `ci-baseline-upstream` 的 `da73ab0079902f1d40607eb6bed87996e122acdf`，不是 r3。用 Python 读取全部 8 份日志、去 ANSI 后提取所有 `FAIL`，共 66 个失败文件，原 failed-files.txt 只有 46 个，漏了 20 个（包含这 9 个）。部分日志有 NUL，普通文本工具可能停止扫描；本轮未改协调者提供的原始日志或清单。下表给出逐文件可复核位置。表中“已改”均表示代码修复，**不表示整个 e2e 已通过**。

`data-format` 的基线源码在 :32 无条件读取 prepare-release.yml。`git ls-tree da73ab00 -- .github/workflows/` 只有 ci.yml；基线日志也确实为 ENOENT。因此不存在“基线因条件读取而通过”。当前 release.yml 构建锁定提交的既有 package version，不负责版本 bump，也没有调用记录脚本；本轮测试核对这个真实合同，仍由现有 record-data-format 单测验证记录生成逻辑。

### 共同修复和第一优先 9 个文件

新增 `server/testing/fixture-state.ts`：测试写的 plan、reply、tool-call 输入和 release gate 放到 `<fixture HOME>/.crybot/tools/npm/fixture-inputs`，随现有引擎目录只读挂载；引擎写的 dump、room evidence、shell log、ACP RPC 放到它自己的 bot 工作区 `.fixture-output`。测试从宿主汇集这些输出，不把 server HOME、数据目录或其他 bot 的目录开放给引擎。`room-handoff-agent` 可单独指定 evidence 路径，沿用原来按 bot 的 turnIndex/script-key 计数；没有指定时保持原默认路径。

新增测试验证个人 HOME、team/member 引擎 HOME 下的 mount plan：输入/gate 只读、输出可写、其他 bot 及 config.json 不可见；并新增 room evidence 独立存放及连续计数测试。所有状态都在临时 fixture 内，无 live 数据。没有生产代码改动、没有改 CI/阈值、没有删除测试、没有新增 skip。

下表日志分别相对于 `/root/build/t1215/ci-baseline/` 和 `/root/build/t1215/ci-pr12-r3/`；测试行号为对应运行时的源码位置。

| 第一优先文件 | 上游基线首个失败 | r3 首个失败 | 根因与修法 |
| --- | --- | --- | --- |
| `server/bot-api-team.e2e.test.ts` | `job-132202769962.log:2604`（`server/bot-api-team.e2e.test.ts:33:26`） | `job-132369227272.log:2799`（`server/bot-api-team.e2e.test.ts:29:35`） | r3 的 HTTP 200 已通过，随后读取宿主 `/tmp/bot-api-team-*.json` 报 ENOENT；box 的 `/tmp` 是私有目录。改为从该 bot 工作区读取 dump，并给首个 HTTP 状态断言补响应体诊断；保留 API 信息来源、权限模式、工具范围断言。 |
| `server/cloud-team-included-hosting.e2e.test.ts` | `job-132202769962.log:2581`（`server/cloud-team-included-hosting.e2e.test.ts:47:115`） | `job-132369227244.log:2459`（`server/cloud-team-included-hosting.e2e.test.ts:119:29`） | reply.txt 在宿主独立 `/tmp`，引擎看不到指定回复，完成回合却没有发出 Team site URL，列表缺项、删除返回 404。回复移入只读夹具输入目录，原 URL 可见性和 403/404 权限断言不变。 |
| `server/cloud-team-one-answer.e2e.test.ts` | `job-132202770007.log:6462`（`server/cloud-team-one-answer.e2e.test.ts:94:50`） | `job-132369227382.log:5276`（`server/cloud-team-one-answer.e2e.test.ts:96:66`） | 成员 HOME 隔离后不可读服务器 HOME 的 plan、bolt-go，也无法写宿主可见 evidence。plan/gate 移至只读输入目录，evidence 放在 bot 工作区；仍验证合并同一人的请求及不同人的答案隔离。 |
| `server/cloud-team-open-reach.e2e.test.ts` | `job-132202769962.log:2669`（`server/cloud-team-open-reach.e2e.test.ts:86:50`） | `job-132369227551.log:2793`（`server/cloud-team-open-reach.e2e.test.ts:87:140`） | 与上一项相同；原 plan/evidence 位于 team.home。迁移输入并汇集各 bot evidence，保持实际 MCP handoff、跨部门路由和私聊拒绝断言。 |
| `server/cloud-team-people.e2e.test.ts` | `job-132202769962.log:2745`（`server/cloud-team-people.e2e.test.ts:50:50`） | `job-132369227551.log:2874`（`server/cloud-team-people.e2e.test.ts:42:33`） | dump、tool-calls.json、reply.txt 均指向不可见的 team.home。输入移入只读目录，dump 从 Scout 工作区读取，保持 message_person 挂载、离队、上限等原断言。 |
| `server/data-format.test.ts` | `job-132202770007.log:6481`（`server/data-format.test.ts:32:12`） | `job-132369227382.log:5320`（`server/data-format.test.ts:32:12`） | 测试无条件读取 prepare-release.yml；上游导入基线也没有该文件，并非条件通过。现按协调者指定核对 release.yml：prepare 的提交/版本输出、5 个平台使用同一 source action、source 校验 package.json 版本。保留 released.version 与当前包版本相等及完整 N-1/格式断言；未改 workflow，也未假称现流程调用 record-data-format。 |
| `server/parallel-threads.e2e.test.ts` | `job-132202769962.log:2760`（`server/parallel-threads.e2e.test.ts:211:76`） | `job-132369227260.log:5538`（`server/parallel-threads.e2e.test.ts:213:76`） | r3 家用 Cloud 的并发数量故障已消失，Team Cloud 仍因 HOME 下 gates/dump/RPC 不可见计数为 0；浏览器替身仍在不可信 HOME，导致 browser route 无 result。gate 移入只读输入目录，Claude dump/ACP RPC 写 bot 工作区并从宿主汇集，保留 UUID 对应释放 gate；agent-browser 移入可信引擎程序目录，internal 调用新增 HTTP 200 和响应体诊断。 |
| `server/same-name-mentions.e2e.test.ts` | `job-132202769962.log:3059`（`server/same-name-mentions.e2e.test.ts:91:68`） | `job-132369227382.log:5332`（`server/same-name-mentions.e2e.test.ts:91:68`） | room plan、lead-go、evidence 仍在 team.home。与 one-answer 共用迁移，保留被选中的唯一 bot、同名歧义拒绝、mention_ids 和私聊的人名归属断言。 |
| `server/team-move.e2e.test.ts` | `job-132202770007.log:6660`（`server/team-move.e2e.test.ts:157:120`） | `job-132369227551.log:3018`（`server/team-move.e2e.test.ts:179:105`） | r3 已通过迁入文件/对话的前置检查，卡在迁移后 Team Cloud 回合的 team.home/dump.json。仅迁移目标 team 的合成引擎输出，并读取 Scout 工作区；源 Cloud 和迁移协议保持原样。 |

### 第二优先 19 个文件逐个现状

以下每一项均已核对为**上游基线也失败**，包含改名后的两个 crybot 文件。只改同根因的夹具路径；未处理的 3 项保留原测试和断言。

| 文件 | 上游基线首个失败 | r3 首个失败 | 判断与本轮现状 |
| --- | --- | --- | --- |
| `server/bot-box/self-check.linux.test.ts` | `job-132202769892.log:5598`（`server/bot-box/self-check.linux.test.ts:47:87`） | `job-132369227551.log:3157`（`server/bot-box/self-check.linux.test.ts:47:87`） | 未改。share-net 令 isolatedNet=false，探针跳过 host-loopback/外部网络隔离检查且撤去 bridges，预期失败集合与实际观察合同不符；按本轮要求不重设计、不放宽断言。 |
| `server/cloud-lending.e2e.test.ts` | `job-132202769924.log:3487`（`server/cloud-lending.e2e.test.ts:86:27`） | `job-132369227405.log:3602`（`server/cloud-lending.e2e.test.ts:87:27`） | 未改。agentsFor 等不到能按 agents.env.CRYBOT_BOT_ID 匹配的 dump（调用者 :247，首个 owner turn）。这是个人 Cloud，HOME 本应可见，不能直接套用 Team HOME 解释；需进一步区分回合未启动与工具 gate/环境封装改变匹配结构。保留为未定位。 |
| `server/cloud-team-admin.e2e.test.ts` | `job-132202769924.log:3589`（`server/cloud-team-admin.e2e.test.ts:89:42`） | `job-132369227260.log:5446`（`server/cloud-team-admin.e2e.test.ts:147:95`） | 同根因已改：独立 CLI 的 tool-calls.json 位于服务器 HOME，迁入只读输入目录，使真实工具调用可更新 tracker health；待 Actions。 |
| `server/cloud-team-browser.e2e.test.ts` | `job-132202769924.log:3635`（`server/cloud-team-browser.e2e.test.ts:174:50`） | `job-132369227260.log:5470`（`server/cloud-team-browser.e2e.test.ts:118:79`） | 同根因已改：tool-calls.json 不可见，原回合没有执行浏览器工具，stub 日志为空。迁移输入及 dump，保留会话隔离/浏览器调用断言；真实浏览器待 Actions。 |
| `server/cloud-team-conversation-share.e2e.test.ts` | `job-132202769892.log:5148`（`server/cloud-team-conversation-share.e2e.test.ts:57:50`） | `job-132369227260.log:5415`（`server/cloud-team-conversation-share.e2e.test.ts:49:33`） | 同根因已改：等待 HOME dump 超时，改用发起回合 bot 的工作区 dump；保留分享成员、通知、记忆、撤回权限断言；待 Actions。 |
| `server/cloud-team-engine-homes.e2e.test.ts` | `job-132202769895.log:3712`（`server/cloud-team-engine-homes.e2e.test.ts:54:50`） | `job-132369227250.log:2249`（`server/cloud-team-engine-homes.e2e.test.ts:56:41`） | 同根因已改：Team dump/tool-calls/shell log 不可见。迁移输入、dump 和 shell 日志；My Cloud 对照仍走原 HOME；引擎实际 HOME、transcript、凭据刷新和离队断言不变；待 Actions。 |
| `server/cloud-team-per-person.e2e.test.ts` | `job-132202769892.log:5191`（`server/cloud-team-per-person.e2e.test.ts:45:50`） | `job-132369227260.log:5482`（`server/cloud-team-per-person.e2e.test.ts:36:33`） | 同根因已改：Scout HOME dump 不可见；改读工作区 dump，保留每人 unread/SSE/排序独立性；待 Actions。 |
| `server/cloud-team-preference.e2e.test.ts` | `job-132202769895.log:3934`（`server/cloud-team-preference.e2e.test.ts:80:50`） | `job-132369227382.log:5298`（`server/cloud-team-preference.e2e.test.ts:82:69`） | 同根因已改：plan/evidence 不可见，使用只读 plan 和工作区 evidence；保留 About me 私人层和经 handoff 写入断言；待 Actions。 |
| `server/cloud-team-private.e2e.test.ts` | `job-132202769944.log:2856`（`server/cloud-team-private.e2e.test.ts:42:50`） | `job-132369227260.log:5429`（`server/cloud-team-private.e2e.test.ts:50:33`） | 同根因已改：HOME dump/tool-calls 不可见；迁移输入与输出，保留所有跨成员权限/搜索/SSE/文件负向断言；待 Actions。 |
| `server/cloud-team-published-apps.e2e.test.ts` | `job-132202769941.log:2881`（`server/cloud-team-published-apps.e2e.test.ts:49:115`） | `job-132369227250.log:2359`（`server/cloud-team-published-apps.e2e.test.ts:114:29`） | 与 included-hosting 同根因已改：宿主 /tmp reply 不可见，使对话未出现发布 URL。回复移入只读输入，保留列表和删除授权断言；待 Actions。 |
| `server/cloud-team-setup-request.e2e.test.ts` | `job-132202769918.log:3092`（`server/cloud-team-setup-request.e2e.test.ts:58:106`） | `job-132369227250.log:2471`（`server/cloud-team-setup-request.e2e.test.ts:47:41`） | 同根因已改：HOME dump 不可见；按本次 botId 读取工作区 dump，保留 Set me up 归属和停止权限断言；待 Actions。 |
| `server/opencode-provider-keys.e2e.test.ts` | `job-132202769941.log:3056`（`server/opencode-provider-keys.e2e.test.ts:139:43`） | `job-132369227551.log:2888`（`server/opencode-provider-keys.e2e.test.ts:139:43`） | 未改。断言期望原始 ANTHROPIC key，实际收到 broker 的 cry_t0_ 令牌；上游为对应 omb_t0_。需要真实 upstream 收到 key 的正向转发证据，不以接收令牌代替原断言。 |
| `server/outside-work-threads.e2e.test.ts` | `job-132202769895.log:3965`（`server/outside-work-threads.e2e.test.ts:25:148`） | `job-132369227405.log:3704`（`server/outside-work-threads.e2e.test.ts:25:148`） | 与 bot-api-team 同根因已改：dump 位于宿主私有 /tmp。改读 bot 工作区，保留 webhook 派生线程受限和本人对照断言；待 Actions。 |
| `server/question-cards.e2e.test.ts` | `job-132202769924.log:3891`（`server/question-cards.e2e.test.ts:85:50`） | `job-132369227272.log:3014`（`server/question-cards.e2e.test.ts:100:11`） | 同根因已改：room-plan 与 evidence 不可见，迁移 plan，按 botId 汇集 evidence；保留卡片、Inbox、点击续跑的原断言；待 Actions。 |
| `server/question-routing.e2e.test.ts` | `job-132202769941.log:3103`（`server/question-routing.e2e.test.ts:67:50`） | `job-132369227551.log:2935`（`server/question-routing.e2e.test.ts:61:33`） | 同根因已改：room-plan 与 evidence 不可见，迁移并按 botId 汇集；保留默认处理、问题卡片和通知路由断言；浏览器分支待 Actions。 |
| `server/team-protocol.e2e.test.ts` | `job-132202769944.log:3471`（`server/team-protocol.e2e.test.ts:51:54`） | `job-132369227551.log:3041`（`server/team-protocol.e2e.test.ts:52:102`） | 同根因已改：plan、hold.gate、evidence 不可见；迁移并保留每个发言人的身份协议和排队行为断言；待 Actions。 |
| `server/team-refused-handoff.e2e.test.ts` | `job-132202769941.log:3240`（`server/team-refused-handoff.e2e.test.ts:58:15`） | `job-132369227244.log:2507`（`server/team-refused-handoff.e2e.test.ts:58:15`） | 同根因已改：tool-calls.json 不可见，合成引擎没有执行预定 handoff，routine 状态与预期不同。迁移输入，保留 failed/refused 和 Inbox 断言；待 Actions。 |
| `server/cloud-team-crybot-own-chat.e2e.test.ts` | `job-132202769918.log:3053`（`server/cloud-team-mausbot-own-chat.e2e.test.ts:66:122`） | `job-132369227382.log:5254`（`server/cloud-team-crybot-own-chat.e2e.test.ts:67:97`） | 同根因已改：plan/evidence 不可见；迁移并保留私人默认 bot/记忆层/权限断言。上游文件名为 cloud-team-mausbot-own-chat；待 Actions。 |
| `server/cloud-team-crybot-reach.e2e.test.ts` | `job-132202769944.log:3275`（`server/cloud-team-mausbot-reach.e2e.test.ts:54:54`） | `job-132369227272.log:2807`（`server/cloud-team-crybot-reach.e2e.test.ts:56:113`） | 同根因已改：plan/evidence 不可见；迁移并保留名单、list_bots、hand-off 和私人记忆断言。上游文件名为 cloud-team-mausbot-reach；待 Actions。 |

### 审核建议

`server/engine-homes/box.linux.test.ts` 继续要求无 spawn error、exit 0，stdout 保留全部可见性/凭据断言，另外明确断言 stderr 不含 `sardine` 和 `lighthouse`。拒绝访问的 stderr 可以打印调用者自己指定的路径，但不能带出其他成员的秘密内容。

### 验证与边界

所有命令用 `PATH=/opt/node24/bin:$PATH`（Node 24.22.3），重命令串行，Vitest 一律 `--maxWorkers=1 --configLoader runner`。本 checkout 依然缺少 AGENTS.md 指定的 `docs/verification/README.md`；所有已启动的程序仅使用临时隔离 fixture，不宣称完成缺失文档规定的服务验证。

- 完整 `server/data-format.test.ts` 加 fixture-state/fixture-engine 首次执行：13 passed / 4 failed / 1 existing skipped。4 个失败全部在 `freePortBlock()`：`no free port block for offsets 0,1 in 19600..22600`，没有走到 server 启动断言；发布合同已过。日志 `/tmp/t1215-r4/unit-first.log`。
- `pnpm vitest run server/data-format.test.ts --maxWorkers=1 --configLoader runner --testNamePattern 'the N-1 rule|the data folder'`：11 passed，4 个 server 用例被过滤，另 1 个原有 root 权限 skip；没有把过滤记为整文件通过。日志 `/tmp/t1215-r4/data-format-pure.log`。
- `pnpm vitest run server/testing/fixture-state.test.ts server/testing/fixture-engine.test.ts scripts/testing/record-data-format.test.ts scripts/testing/index-route-ratchet.test.ts scripts/testing/file-size-ratchet.test.ts server/engine-homes/box.linux.test.ts --maxWorkers=1 --configLoader runner`：5 files / 6 tests passed；engine-homes 的 2 个真实 bubblewrap 用例因本机检测不可用按原逻辑跳过。日志 `/tmp/t1215-r4/pure-final.log`。
- 真实启动新包装的 synthetic Claude（shell stdin、临时 HOME/workspace，未启动 server）：成功从只读输入目录约定的位置读取 `fixture-paths-work` 回复，输出 assistant + successful result，并在 bot 工作区生成含原 prompt 的 dump；文件 `/tmp/t1215-r4/engine-smoke/`。这里只证明合成 CLI 的输入/输出接线，真实只读 mount 仍需 Linux Actions。
- 完整 `server/testing/room-handoff-agent.test.ts` 同上述 5 个纯测试一起执行：7 passed / 5 failed，其中 room 文件原 4 个子进程用例及新增 1 个子进程用例失败（空 stdio、exit 0 或 timeout），纯 ownTurnText 通过。最小独立 Node `spawn(node, ['-e', stdin echo])` 复现输入 `fixture-stdio\n`，收到 `{code:0,stdout:'',stderr:''}`；同一 shell 直接给 synthetic CLI stdin 正常。保留这组失败和新增测试，不放宽断言，待 Actions 验证。日志 `/tmp/t1215-r4/unit-final.log`。

最终检查结果见下（代码修复不等于 Actions 已绿）：

- `pnpm typecheck`：最终通过，exit 0（`/tmp/t1215-r4/typecheck-final.log`）。
- `pnpm lint`：最终全仓通过，exit 0（`/tmp/t1215-r4/lint-final.log`）。
- `node scripts/check-brand-residue.mjs`：通过，0 forbidden references（`/tmp/t1215-r4/brand-final.log`）。
- `git diff --check`：通过。

没有提交或推送；开工时已有未跟踪的任务说明 r4.md 未改动。第一优先 9 个文件均已针对当前可定位根因落地修改，第二优先 16 个同根因文件一并修改，剩余 self-check/share-net、cloud-lending、opencode-provider-keys 保留原样并逐项记录。**真实 HTTP/e2e 和 bubblewrap 验收仍未完成，不能据本机纯测试宣称这 9 个文件已经全绿；最终以协调者推送后的 Actions 为准。**

## 第 5 轮续跑（2026-11-14）

本节是第 5 轮的续跑记录。工作树保留上一轮约 43 个未提交文件，本轮先按 `r5.md` 的 1–9 条核对并在原改动上完成收尾，没有重置或提交。

1. `server/parallel-threads.e2e.test.ts` 的内部线程接口 helper 固定把所有成功响应当作 200；创建子线程实际返回 201，因此在“own thread through”用例的调用处失败。helper 现在接受预期状态，创建自己的子线程默认检查 201、跨 bot hand-off 检查 200；孙线程仍明确检查 409。
2. `server/starter-bots.e2e.test.ts` 的 fixture 只写了 Claude instance，没有写默认模型选择。合入 provider-lock 后初始 Chief 的 selection 仍为空，发送消息得到空 provider instance 的 409。fixture 配置补上 `defaultModelSelection: CLAUDE`，并保留引擎输入、输出在隔离 fixture 目录中的改动。
3. `server/steer-e2e.test.ts` 在子进程尚未完全退出时直接递归删除 home，Linux 可能留下 EACCES。清理先用 `waitForExit` 等待 close（超时才 SIGKILL），再用严格重试删除目录；公共 cleanup 保留兼容的告警包装。
4. 五个 ratchet 超限文件的可复用逻辑已分别移到 `server/admin-audit-request-fields.ts`、`server/host/data-dir-lease-exit.ts`、`server/host/session-names.ts`、`server/thread-title.ts`、`src/lib/computer-control.ts`、`src/lib/local-vm-idle-timeout.ts` 等小模块，未提高登记行数。`scripts/testing/file-size-ratchet.test.ts` 通过。
5. `CRYBOT_PROVIDER_LOCK` 只在服务器的 `server/provider-lock.ts` 读取，不由 bot engine、hook 或 MCP child 读取，因此加入 `SERVER_ONLY_CRYBOT`；env 合同测试通过。
6. 执行 `node scripts/record-data-format.mjs` 重生成 `server/data-format-released.json`。差异只有版本从 `1.0.1` 更新为当前 `1.0.2`，`writes` 和 `reads` 未变。
7. provider mark 测试原先只检查组件 HTML，Cry Bot 预设通过 SVG 文件提供颜色，因而误判为 mono。判定现在读取引用的 SVG 内容；41 个 provider mark 测试通过，仍遵守“图标自带颜色才算 brand”。
8. 英文新增的三个键已补进 pt-BR 及其余受检语言包，翻译按各语言现有用词完成。`pnpm i18n:check` 通过（16 个语言包、10555 个英文键）。
9. `respond-replay` 原来固定 worker port，和并发分片或 webhook 相邻端口争用。新增 `spawnReservedServer`：先由 OS 分配并持有应用和 webhook 两个 listener，通过继承 fd 启动子进程，再由 `reserved-listen` 将配置端口接到已继承的 listener；新增合同测试覆盖两组端口不冲突和服务可达性。

串行验证结果：

- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck`：通过。
- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm lint`：通过。
- `PATH=/opt/node24/bin:$PATH pnpm i18n:check`：通过。
- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm check:brand`：通过，0 forbidden references。
- `pnpm vitest run src/components/provider-mark-fade.test.ts --maxWorkers=1 --configLoader runner`：41 tests 通过。
- `pnpm vitest run server/bot-box/env.test.ts --maxWorkers=1 --configLoader runner`：9 tests 通过。
- `pnpm vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=1 --configLoader runner`：通过。
- `git diff --check`：通过。

本沙箱禁止绑定 `127.0.0.1`，所以 `server/data-format.test.ts` 的 4 个真实 server 用例在 `freePortBlock` 处失败，11 个非监听测试通过；`server/starter-bots.e2e.test.ts`、`server/respond-replay.e2e.test.ts`、`server/testing/reserved-server.test.ts` 和 `server/steer-e2e.test.ts` 分别在端口分配或监听处得到 `EPERM`。`server/parallel-threads.e2e.test.ts` 同样在服务启动阶段无输出等待后终止。未把这些沙箱限制记作产品断言失败，需由协调者在 Actions/可监听环境按 r5 验收重新运行。未提交。

## 第 6 轮（2026-11-14）

合入 T-1218 后，`server/index.ts` 为 15518 行，超过 `scripts/testing/file-size-ratchet.test.ts` 登记的 15515 行。将 Cloudflare Access 拦截与 app-handoff 路由的组合门面移入 `server/app-handoff.ts` 的 `createAppHandoffGate()`：门面先调用原 `cfAccessRefusal()`，再仅处理 `GET /auth/app-handoff`，因此 Access 校验顺序和公开探测路径保持不变。`server/index.ts` 只保留一次门面调用，降至 15514 行；未调高 ratchet 登记。

串行验证（Node 24，`--maxWorkers=1`）：

- `pnpm vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=1 --configLoader runner`：1 file / 1 test 通过。
- `pnpm vitest run server/cf-access.test.ts --maxWorkers=1 --configLoader runner`：19 tests 通过。
- `pnpm vitest run server/app-handoff.test.ts --maxWorkers=1 --configLoader runner`：60 tests 通过。
- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `git diff --check`：通过。

未提交。`docs/verification/README.md` 仍不在当前 checkout，验证未接触用户 live 数据。


## 第 8 轮（2026-11-14）

本轮只处理 main 合入 T-1217/T-1218 后留下的 8 个测试文件，并复核两个 ratchet。

### 原因与修改

- server/index.test.ts：配对会话没有 displayName、团队名或 email 时按 T-1217 回退 Member，发送者断言改为 Member，设备 label 仍断言为 Safari on Mac。
- server/steer-e2e.test.ts：配对发送者的六处断言改为 Member，并单独保留设备 label 为 Safari on Mac。
- server/chat-followups-restart.test.ts：配对发送者断言改为 Member，session.label 仍为 Safari on Mac，没有 sender.id 的历史 name-only 行仍保留旧值。
- server/card-answerers.e2e.test.ts：T-1217 的 email 前缀回退把 ada@example.test 和 bob@example.test 显示为 Ada 和 Bob，三处卡片姓名断言改为具体值。
- server/bot-visibility.e2e.test.ts：三处表情回应姓名断言改为 Ada/Bob，保持具体姓名和 person key 断言。
- server/recent-work.e2e.test.ts：最近工作行没有丢失；server/index.ts 的房间路径把多说话者 PersonName 传给 recentWork 时使用 "the team"，server/recent-work.ts 仍生成完整行，因此断言改为 1:1 with the team，没有改产品代码。
- server/bot-box/env.test.ts：CRYBOT_APP_SCHEME 只在服务器的 server/app-handoff.ts 读取，加入测试内的 SERVER_ONLY_CRYBOT。
- server/data-format-released.json：按 PATH=/opt/node24/bin:$PATH node scripts/record-data-format.mjs 正规重生成，版本从 1.0.2 更新到 package 的 1.0.3，writes/reads 保持 1/1。

### 逐文件验证

Vitest 命令均使用 PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <文件> --maxWorkers=1；由于 Vite 在本 worktree 的 node_modules/.vite-temp 写入受 EROFS 限制，实际启动时追加 --configLoader runner，没有修改配置或安装依赖。

| 文件 | 结果 |
| --- | --- |
| server/bot-box/env.test.ts | 9/9 通过 |
| server/data-format.test.ts | 11 个非监听测试通过；4 个 server 启动测试在 freePortBlock 报 no free port block for offsets 0,1 in 19600..22600；原有 1 个 root 权限测试 skip |
| scripts/testing/file-size-ratchet.test.ts | 1/1 通过 |
| scripts/testing/index-route-ratchet.test.ts | 1/1 通过 |
| server/index.test.ts | 监听 127.0.0.1 报 EPERM，beforeAll 超时，338 个测试均未执行 |
| server/steer-e2e.test.ts | 子服务监听 127.0.0.1:25760 报 EPERM，24 个测试均未执行 |
| server/chat-followups-restart.test.ts | freePortBlock 报无可用端口块，未启动 fixture |
| server/card-answerers.e2e.test.ts | 子服务监听 127.0.0.1:33664 报 EPERM，8 个测试均未执行 |
| server/bot-visibility.e2e.test.ts | freePortBlock 报无可用端口块，14 个测试均未执行 |
| server/recent-work.e2e.test.ts | freePortBlock 报无可用端口块，未进入断言 |

按要求没有重复尝试受沙箱端口/监听限制的测试，需在 Actions 或可监听环境逐文件复跑。

### 全仓检查

- PATH=/opt/node24/bin:$PATH pnpm typecheck：通过。
- PATH=/opt/node24/bin:$PATH pnpm lint：通过。
- PATH=/opt/node24/bin:$PATH pnpm i18n:check：通过，16 个语言包有效。
- PATH=/opt/node24/bin:$PATH pnpm check:brand：通过，6600 个文件、0 个禁用引用。
- git diff --check：通过。

没有提交、安装依赖、运行完整 pnpm test，也没有改 CI/构建文件。docs/verification/README.md 在当前 checkout 中不存在，因此无法执行其中规定的额外验证流程。
