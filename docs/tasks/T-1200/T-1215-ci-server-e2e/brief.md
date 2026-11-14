# T-1215（二路）：修好 crybot main 的 CI —— server 测试与 e2e

父任务 T-1206（规格 `docs/specs/2026-11-13-crybot.md`）。T-1207（整体改名为 Cry Bot、移除托管云接线）合并后，main 的 CI 从未变绿。最新 main 1ac45153 的 CI 运行 43555137016 里，`server/` 下约 55 个测试文件失败（主要是 `server/*.e2e.test.ts`，还有 `server/index.test.ts`、`server/bot-box/*`、`server/extractor/extractor.test.ts`、`server/data-format.test.ts`、`server/cloud-home-server.test.ts` 等）。失败日志（去掉颜色码）在 `/tmp/t1215/ci-main-1ac45153.log`，第一列是任务名，`grep -oE 'FAIL +[^ ]+\.test\.[a-z]+'` 可列出全部失败文件。

另有一路 `T-1215-ci-lint-units` 并行修 lint、`src/`、`scripts/testing/` 下的测试，**本路只改 `server/` 目录（含 `server/testing/`）和与之直接相关的测试辅助代码**；不改 `electron/main.mjs`、`src/locales/`、`scripts/testing/`、`.github/workflows/ci.yml`。

## 日志里的主要错误（按次数）

- 约 90 处 `{"code":"no_ai", "error":"Connect an AI first..."}` 之类：测试里的机器人回答前提示没接 AI。很可能 T-1207 删掉托管云时，把测试默认用的 AI 提供方（托管云/假提供方）一起删了或改了默认值。先找到根因，优先在测试准备代码里恢复一个本地假 AI 提供方，而不是逐个测试打补丁。
- 约 130 处 `connect ECONNREFUSED 127.0.0.1:<端口>` / `::1:<端口>`：查是测试服务没起来（可能是上一条导致的连锁），还是测试指向了已删除的托管服务地址。
- `Matcher did not succeed in time`、`Test timed out`、`Invalid snapshot: webhooks/routines/instances is not a list`、`bad listener`、`Cannot read properties of undefined (reading 'id')`、`expected 'refused' to be 'updated'` 等：逐类定位。
- 浏览器相关（`The browser could not start on this server`、`Iframe page loading is disabled`）：先看是否在 main 之前就是靠 CI 环境才能跑；沙箱里起不了 Chromium，这类在报告里写清楚判断，由协调者在 Actions 上验证。

## 原则

- 先找共同根因，再处理个别文件。
- 测的是 T-1207 已明确移除的托管云功能（例如依赖已删除的托管云服务端点的 `cloud-*` 测试）可以删除或改成断言「已停用」，但必须在报告里逐条列出：删/改了哪个测试、对应被删的哪段功能代码（文件:行号或提交号），以及判断依据。功能代码还在的，要修好测试，不能删。
- 不为了让测试过而放宽产品行为；需要改产品代码的，说明原因。

## 跑法

- 沙箱里没有 systemd-run、起不了 Chromium；一次只跑一个重命令；不跑 vitest 全量、不跑 build。
- vitest 单文件或少量文件：`pnpm vitest run <文件...> --maxWorkers=2 --configLoader runner`。修完共同根因后，按目录分批把失败列表里的文件都跑一遍。
- 最后跑 `pnpm typecheck`、`pnpm lint`、`node scripts/check-brand-residue.mjs`（须 0 残留）、`git diff --check`。

## 交付

- `report.md`：共同根因、逐类修法、删/改测试清单及依据、每批测试命令和结果、沙箱里没法验证的项目。
- 不要 git 提交。协调者会推分支跑 Actions，以 Actions 结果为准。
