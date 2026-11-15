# T-1235：Cry Bot 灵动岛小补（T-1231 第 2 轮复审的 2 条建议）

基准是 T-1231-mac-island 分支（97307c32，灵动岛还没合 main），本分支叠在它上面做，不改 T-1231 分支本身。

## 要做的事
1. **只在刚进入 list/chat 时取焦点**：`electron/island.mjs` 约 96 行，`island:action` 处理完后只要当前形态是 list/chat 就调用一遍 `win.setFocusable(true); win.showInactive(); win.focus();`。对话里每敲一个字都会发 typing action，导致每次都重复取焦点。改成：记下处理前的形态，只有从「不是 list/chat」变成「list 或 chat」时才调用这三步；list↔chat 之间切换、typing 等停留在 list/chat 内的动作不再重复调用。其余收起/blur/setFocusable(false) 逻辑不动。
2. **补强焦点测试**：`electron/island.node-test.mjs` 的 "expanded island becomes key without showing the app, then releases keyboard focus"（约 52–60 行）抓不到「删掉 showInactive」的回退（did-finish-load 时已记过一次 showInactive，`focusCalls.slice(-2)` 照样相等）。改成在 expand 之前清空 `focusCalls`，断言 expand 期间 setFocusable(true)、showInactive、focus 依次各一次；再加断言：进入 list/chat 后连续发几个停留在 list/chat 内的 action（例如 typing），不再新增 focus 相关调用。用变异自检：临时删掉 showInactive，确认测试会失败，再改回（报告里写明结果）。
3. **远程页宽度保存失败要回退**：`src/components/IslandSettings.tsx` 的 `save` 用 `.catch(() => {})` 吞掉失败。远程页面（云、服务器页面）的 `islandSettings.set` 要求 `navigator.userActivation.isActive`（`electron/preload.cjs` 约 229 行），拖滑块超过约 5 秒或靠失焦提交时可能被拒，此时本地 `width` 停在新值、看起来像已保存。改成：保存失败时把本地 `width` 重置为 null（显示回已保存的 `settings.width`）；开关类保存失败同样不能让界面显示成已改。不放松 preload 的激活校验。在 `src/components/IslandSettings.test.ts`（已有）补用例：`set` 拒绝时滑块和 `<output>` 回到已保存值。

## 范围与约束
- 只改 `electron/island.mjs`、`electron/island.node-test.mjs`、`src/components/IslandSettings.tsx`、`src/components/IslandSettings.test.ts`，以及本任务报告 `docs/tasks/T-1200/T-1235-island-focus/report.md`。不改 `.github/workflows/`、不改 file-size ratchet 数字、不动其他测试的断言。
- 不要 git 提交，不联网，不装依赖。
- 开工先在 worktree 根目录准备依赖（本机：若 `node_modules` 不存在，链到 `/root/workspace/crybot/node_modules`；上运行 依赖准备脚本）。没有 systemd 的环境去掉 `systemd-run` 前缀；一次只跑一个测试文件，测试命令套 `systemd-run --scope -q -p MemoryMax=4G --`。

## 验收
- 逐个跑并贴结尾输出：`node --test --test-force-exit --test-concurrency=1 electron/island.node-test.mjs`、`electron/island-model.node-test.mjs`、`electron/island-page.node-test.mjs`；`pnpm exec vitest run src/components/IslandSettings.test.ts`、`src/components/Island.test.ts`。
- `pnpm exec tsc -b`、改动文件 `pnpm exec oxlint --deny-warnings <文件>`、`git diff --check` 通过。
- 报告写清每条改法、变异自检结果、跑过的命令和真实输出结尾几行。
- 最终以 GitHub Actions 为准（协调者推分支开草稿 PR，目标分支先指 T-1231-mac-island，T-1231 合入 main 后改指 main）。
