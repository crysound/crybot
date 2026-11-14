# T-1215（一路）：修好 crybot main 的 CI —— lint 与非 e2e 测试

父任务 T-1206（规格 `docs/specs/2026-11-13-crybot.md`）。T-1207（整体改名为 Cry Bot、移除托管云接线）合并后，main 的 CI 从未变绿。最新 main 1ac45153 的 CI 运行 43555137016：`check` 任务在 `pnpm lint` 就失败（后面的步骤没跑到），8 路 vitest 共约 60 个测试文件失败。失败日志（去掉颜色码）在 `/tmp/t1215/ci-main-1ac45153.log`，第一列是任务名，用 grep 看。

另有一路 `T-1215-ci-server-e2e` 并行修 `server/**/*.e2e.test.ts` 以及 `server/` 下其他失败测试，**本路不要动 `server/` 目录**；`.github/workflows/ci.yml` 也不改。

## 要做

1. **lint**：`electron/main.mjs:1291` 变量 `withEnvironmentLook` 声明未使用（oxlint `--deny-warnings`）。查清它是改名/删托管云时遗留的死代码还是漏接线：死代码就删，漏接线就接回去，在报告里写依据。
2. 修完 lint 后把 `ci.yml` 里 `check` 任务的其余步骤（看 ci.yml 里 check 有哪些 run 步骤，如 typecheck、品牌残留检查等）在本地逐个跑，修掉暴露出来的错误（`server/` 下的问题记进报告交给另一路，不要改）。
3. **`src/locales/vocabulary.test.ts`**（6 条里 5 条失败）：改名后的退役词规则把 "Cry Bot Cloud" 当成退役词、建议替换成自己。修规则（不是删测试），使正确的新品牌名不被误报，同时原本要拦的旧品牌名仍然被拦。
4. **`scripts/testing/update-runner.test.ts`**（23 条里 11 条失败）、`scripts/testing/duration-sequencer.test.ts`、`scripts/testing/index-route-ratchet.test.ts`：查失败原因（改名导致的路径/镜像名/仓库名变化，或 T-1214 发版改动等），修代码或修测试期望，选择要有依据，写进报告。
5. `src/components/widget/WidgetMessage.test.ts` 也在失败列表里，一并查修。
6. 如果某条测试测的是 T-1207 已明确移除的托管云功能，可以删除该测试，但必须在报告里逐条列出删了什么、对应被删的哪段功能代码（文件:行号或提交）。能修的不删。

## 跑法

- 沙箱里没有 systemd-run、起不了 Chromium；一次只跑一个重命令；不跑 vitest 全量、不跑 build。
- vitest 单文件：`pnpm vitest run <文件> --maxWorkers=2 --configLoader runner`。
- 最后跑 `pnpm lint`、`pnpm typecheck`、`node scripts/check-brand-residue.mjs`（须 0 残留）、`git diff --check`，以及上面列出的每个测试文件。

## 交付

- `report.md`：逐项写原因、改了哪个文件哪一行、测试命令和结果；列出发现但属于 `server/` 的问题。
- 不要 git 提交。协调者会推分支跑 Actions，以 Actions 结果为准。
