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

