# T-1252

## 改了什么

- `server/routes/instabox-snapshots.e2e.test.ts`
- `server/routes/instabox-snapshots.ts`
- `server/instabox/snapshot-wiring.e2e.test.ts`
- `shared/place-view.ts`
- `src/components/instabox-panel.test.ts`
- `src/locales/en.json`
- `src/locales/source-hashes.json`
- `src/locales/zh.json`
- 本报告
- `verification.txt`

## 为什么

未建机时使用不含 Boat 的中性云桌面文案。快照列表先确认机器，不存在时返回空列表；真实上游失败仍返回错误并显示错误文案。补充组件和路由测试覆盖两处修复。

## 测试命令与结果摘要

- `pnpm exec vitest run shared/place-view.test.ts`：19 passed。
- `pnpm exec vitest run src/components/instabox-panel.test.ts`：6 passed；`src/components/InstaboxSnapshots.test.tsx`：6 passed。
- `pnpm exec vitest run server/routes/instabox-snapshots.e2e.test.ts`：连续 3 次，每次 13 passed；`server/instabox/snapshot-wiring.e2e.test.ts`：连续 3 次，每次 6 passed。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`：1 passed。
- `pnpm i18n:check`、`pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json`、改动文件 `pnpm exec oxlint --deny-warnings`、`git diff --check`：通过。
- `server/verification-fixture.e2e.test.ts`：1 passed、1 failed；失败是现有 fixture 将当前 Node 目录中的 CLI 误识别为可用，与本次改动无关。

仓库中缺少 `docs/verification/README.md`，因此使用现有隔离 fixture；完整命令输出见 `verification.txt`。未提交 git。

## T-1252 第 3 轮

### 改了什么

- 文件：`electron/desktop-prefs.mjs`、`electron/desktop-prefs.node-test.mjs`、`server/routes/instabox-snapshots.e2e.test.ts`、`server/routes/instabox-snapshots.ts`、`server/testing/fake-instabox-snapshots.ts`、`shared/credential-request.ts`、`shared/place-view.test.ts`、`shared/place-view.ts`、`src/components/CloudBackendPicker.test.ts`、`src/components/CloudBackendPicker.tsx`、`src/components/ComputerPanel.simple.test.ts`、`src/components/ComputerPanel.tsx`、`src/components/InstaboxSnapshots.test.tsx`、`src/components/InstaboxSnapshots.tsx`、`src/components/bot-settings/AccessSection.tsx`、`src/components/keys/KeysPage.dom.test.ts`、`src/components/keys/key-catalog.test.ts`、`src/components/keys/key-catalog.ts`、`src/lib/remote-desktop.ts`、`src/locales/en.json`、`src/locales/no-retired-provider-visible.test.ts`、`src/locales/source-hashes.json`、`src/locales/zh.json`、本报告、`verification.txt`。
- 提供方选择只显示 /VPS，默认旧值按 显示，设置页和面板隐藏旧云服务密钥；用户文案过滤旧名称，桌面推广入口移除。
- 快照保存/恢复前唤醒休眠机器，区分并发 busy 与拒绝 409，列表显示本地创建时间，恢复成功提示。

### 为什么

界面不再向用户暴露已下线的 Boat 入口或提示；快照操作在休眠状态先唤醒，并把真实并发冲突与上游拒绝分别反馈。

### 测试命令与结果摘要

- `pnpm exec vitest run` 相关前端/共享测试：8 files、146 passed；`server/routes/instabox-snapshots.e2e.test.ts` 连续 3 次各 15 passed；`server/instabox/snapshot-wiring.e2e.test.ts` 连续 3 次各 6 passed。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`：1 passed；`node --test electron/desktop-prefs.node-test.mjs`：23 passed。
- `pnpm i18n:check`、前端/服务端 `tsc`、改动文件 `oxlint --deny-warnings`、`git diff --check`：通过。

zh/en 中仍含 `Boat` 的位置只有 `boatOffer.*`、`keys.boat.*`、`place.action.addBoatKey` 等键名；对应值已改成 或云端桌面，键名为兼容旧配置而保留，没有用户可见的 Boat 字样。

## T-1252 第 4 轮

- 改了什么：修正真实客户端快照冲突分类和休眠唤醒重试；默认后端及创建／保存／切换写入 ；隐藏旧云电脑管理、团队入口及历史行链接，清除错误活动文案；恢复 409 协议匹配；恢复成功与列表刷新失败分开提示。文件：本报告、`server/cloud-backend.test.ts`、`server/cloud-backend.ts`、`server/instabox/core.e2e.test.ts`、`server/instabox/snapshot-conflicts.e2e.test.ts`、`server/instabox/snapshot-wiring.ts`、`server/instabox/wiring.e2e.test.ts`、`server/new-bot-defaults.test.ts`、`server/new-bot-defaults.ts`、`server/routes/bot-patch.test.ts`、`server/routes/bots-create.test.ts`、`server/routes/instabox-snapshots.e2e.test.ts`、`server/routes/instabox-snapshots.ts`、`server/store.ts`、`server/testing/fake-instabox-core.ts`、`server/testing/fake-instabox-snapshots.ts`、`shared/place-view.test.ts`、`shared/place-view.ts`、`src/components/BotSettingsDialog.simple.test.ts`、`src/components/CloudBackendPicker.test.ts`、`src/components/CloudBackendPicker.tsx`、`src/components/ComputerPanel.android.test.ts`、`src/components/ComputerPanel.focus.test.ts`、`src/components/ComputerPanel.instabox.test.ts`、`src/components/ComputerPanel.lazy.test.ts`、`src/components/ComputerPanel.live.test.ts`、`src/components/ComputerPanel.simple.test.ts`、`src/components/ComputerPanel.tabs.test.ts`、`src/components/ComputerPanel.takeover.test.ts`、`src/components/ComputerPanel.tsx`、`src/components/FailedTurnRow.place.test.ts`、`src/components/InstaboxSnapshots.test.tsx`、`src/components/InstaboxSnapshots.tsx`、`src/components/LocalComputerSection.test.ts`、`src/components/LocalComputerSection.tsx`、`src/components/TeamMapPage.edges.test.ts`、`src/components/TeamMapPage.tsx`、`src/components/bot-panel/ComputerTab.tsx`、`src/components/bot-settings/AccessSection.test.ts`、`src/components/bot-settings/AccessSection.tsx`、`src/lib/local-computer.test.ts`、`src/lib/local-computer.ts`、`src/lib/notices.test.ts`、`src/lib/place-view.ts`、`src/lib/remote-desktop.test.ts`、`src/lib/remote-desktop.ts`、`src/locales/en.json`、`src/locales/no-retired-provider-visible.test.ts`、`src/locales/source-hashes.json`、`src/locales/vocabulary.test.ts`、`src/locales/zh.json`、`verification.txt`。
- 为什么：消除前后端默认值不一致、409 误报和旧服务冒称 ；保留旧后端及 Local VM／多屏能力。
- 测试命令与结果：`pnpm exec vitest run <文件>` 逐文件通过，共 46 个文件、56 次运行、934 个测试执行通过；快照路由、snapshot-conflicts、snapshot-wiring、wiring、core 五组 e2e 各连续 3 次通过。`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec tsc -b --pretty false`、改动文件 `pnpm exec oxlint --deny-warnings`、`pnpm i18n:check`、`git diff --check` 均通过。zh/en 值无 Boat。仓库缺少验证 README，使用隔离假服务和临时数据 fixture；完整脱敏输出见 `verification.txt`。未提交 git。

## T-1252 第 5 轮

- 改了什么：`server/index.ts`、`server/instabox/power.ts`、`server/instabox/power.test.ts`、`server/instabox/wiring.e2e.test.ts`、`server/local-vm-screens.e2e.test.ts`、`server/surface-pins.e2e.test.ts`、本报告、`verification.txt`。修正 Auto 预览及切换后端休眠，补隔离回归；旧预览夹具显式选择原假服务后端。
- 为什么：默认 不应跳过共用 VM／本机检测；明确选择云桌面或已有就绪机器时仍显示云端。切换前后统一用 `cloudKindOf` 判断，缺省后端建机后切到 VPS 也会休眠；共用 VM 和多屏选择规则保持原样。
- 测试命令与结果：`pnpm exec vitest run <文件>` 逐文件验证 32 个文件（含 `server/instabox/` 全部测试、云后端、预览、Local VM 和文件大小检查），54 次运行、924 次测试执行通过；9 组 e2e 均连续 3 次通过。VNC 浏览器和 VPS 图像子用例初次缺依赖跳过，已用临时 Chromium 启动器和 Pillow 环境补跑全部通过，无遗留跳过。`pnpm exec tsc -p tsconfig.server.json`、改动文件 `pnpm exec oxlint --deny-warnings`、`git diff --check` 通过。验证 README 缺失，使用现有隔离夹具；完整脱敏输出见 `verification.txt`。未提交 git。

## T-1252 第 6 轮

- 改了什么：`server/index.ts`、`server/instabox/wiring.e2e.test.ts`、`shared/place-view.ts`、`shared/place-view.test.ts`、`src/components/CloudBackendPicker.tsx`、`src/components/CloudBackendPicker.test.ts`、`src/components/ComputerPanel.tsx`、`src/components/ComputerPanel.simple.test.ts`、`src/components/PlaceChip.tsx`、`src/components/PlaceChip.test.ts`、`src/components/WorksOnGrid.tsx`、`src/components/bot-panel/ComputerTab.tsx`、`src/components/bot-settings/AccessSection.tsx`、`src/components/bot-settings/AccessSection.test.ts`、`src/lib/place.ts`、`src/lib/place-view.ts`、本报告、`verification.txt`。
- 为什么：provider lock 只屏蔽旧 box；锁定时云端桌面、VPS、和 生命周期路径保持可用，默认及选择云电脑写入 ，旧 VPS 值保持不变。
- 测试命令与结果：前端／共享／provider-lock 逐文件通过；`server/instabox/` 全部测试通过，wiring 和 VNC e2e 各连续 3 次通过（每次 8、32 项）；`pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec oxlint --deny-warnings`、`pnpm i18n:check`、`git diff --check` 通过。未提交 git。

## 第 7 轮

- 改了什么：`server/index.ts`、`server/instabox/wiring.ts`、`server/instabox/preview.e2e.test.ts`、本报告、`verification.txt`。Auto 预览使用独立的 2.5 秒云端探测；补新建、未保存后端和显式选择 三种智能体的隔离回归，断言挂起请求取消且 4 秒内返回 `vm`。
- 为什么：上游无响应不能长期阻塞已就绪的本地桌面。超时通过客户端 AbortSignal 真正取消请求，再按原顺序检测 VM／本机；其他状态、开机、画面及快照调用的超时不变。
- 测试命令与结果：`pnpm exec vitest run <文件> --maxWorkers=1`，23 个文件、41 次运行、696 次测试执行通过；包含 `server/instabox/` 全部测试、预览选择、多屏和文件大小检查，9 组 e2e 各连续 3 次通过，无跳过。`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec oxlint --deny-warnings server/index.ts server/instabox/wiring.ts server/instabox/preview.e2e.test.ts`、`git diff --check` 通过。验证 README 缺失，使用现有隔离夹具；完整脱敏输出见 `verification.txt`。未提交 git。

## 第 8 轮

- 改了什么：`src/components/RoutineCalendarPage.tsx`、`src/components/RoutineCalendarPage.dialogs.test.ts`、本报告、`verification.txt`。全仓检索前端 lock 与后端判断，仅发现并修正 `RoutineCalendarPage.tsx:1463` 的同类误判；新增 12 项回归覆盖 lock 开关下的显式／缺省 、VPS、box、本机和旧云例行任务。
- 为什么：按服务端默认规则将缺省后端视为 ，lock 只隐藏有效后端为 box 的云电脑运行位置；旧 `runOn === "cloud"` 处理保持不变。
- 测试命令与结果：`pnpm exec vitest run <文件> --maxWorkers=1` 逐文件通过 9 个相关测试文件、107 项（含文件大小检查）；新增测试修复前准确复现 2 项失败。`pnpm exec tsc -b --pretty false`、`pnpm exec oxlint --deny-warnings src/components/RoutineCalendarPage.tsx src/components/RoutineCalendarPage.dialogs.test.ts`、`git diff --check` 均通过。本轮仅改前端显示，无涉及的端口 e2e；验证 README 缺失，使用隔离组件夹具。完整输出见 `verification.txt`，未提交 git。
