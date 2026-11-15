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

仓库中缺少 docs/verification/README.md，因此使用现有隔离 fixture；完整命令输出见 `verification.txt`。未提交 git。

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

## 第 9 轮

改了什么与原因（本轮文件清单）：

- server/index.ts：只有已配置 时才检查其删除前占用和执行云端删除；没有密钥的普通智能体可正常删除。已配置服务的删除失败保护保留。
- server/instabox/machines.ts、server/instabox/machines.test.ts：回归发现后台休眠与删除竞争；删除等待已有休眠结束，补充挂起休眠时的调用顺序和最终删除状态验证。
- server/instabox/core.e2e.test.ts：补充缺密钥、未建机智能体删除成功且不访问上游的断言。
- server/group-local-vm.e2e.test.ts、server/hosted-desktop.e2e.test.ts、server/incidents.e2e.test.ts、server/openai-boat.e2e.test.ts、server/place-view.e2e.test.ts：只给依赖 Boat 假服务或专属错误的场景显式保存 box，其余默认后端覆盖保留。
- server/post-to-room.test.ts：等待群聊停止完成再进入后续设置；慢退出假 CLI 固定覆盖竞争，并在状态断言中显示响应原因。
- src/components/ComputerPanel.tsx：历史回归发现文件已超出行数上限 1 行；删除复述代码的注释，保持原有限制。
- src/components/keys/KeyRow.test.ts：确认旧密钥入口隐藏、行没有 Boat 文案，保留 OpenAI 提醒及其余覆盖。
- docs/tasks/T-1200/T-1252-instabox-panel-polish/report.md、docs/tasks/T-1200/T-1252-instabox-panel-polish/verification.txt：记录本轮原因、命令和脱敏输出。

临时文件清理记录：ci-fails.txt 已在第 9 轮删除，不列为本轮仓库改动。

逐文件原因与处理：

| 文件 | 原因分类与处理 |
| --- | --- |
| server/full-access-workflows.e2e.test.ts | 产品回归：团队删除失败使工作流失败；修服务端，原测试不改。 |
| server/group-local-vm.e2e.test.ts | 混合：删除失败遗留 VM，导致后续清理及模式切换连锁失败；修服务端。云电脑选择、唤醒场景显式 box，Local VM 场景保留默认值。 |
| server/headless-cli.e2e.test.ts | 产品回归：团队 prune 无法删除；修服务端，原测试不改。 |
| server/hosted-desktop.e2e.test.ts | 后端夹具：托管桌面依赖 Boat 假服务；显式 box，保留引擎、工具及失败恢复断言。 |
| server/incidents.e2e.test.ts | 后端夹具：两项检查 Boat 专属缺密钥错误；只修改这两项为 box，并按已隐藏 Boat 的中性提示更新文字匹配，保留缺电脑、通知和重试断言。 |
| server/independent-threads-api.test.ts | 产品回归：删除返回 503；修服务端，原测试不改。 |
| server/late-question-source.e2e.test.ts | 产品回归：删除提问智能体返回 503；修服务端，原测试不改。 |
| server/live-call.e2e.test.ts | 产品回归：通话中删除智能体返回 503；修服务端，原测试不改。 |
| server/no-cry-cards.e2e.test.ts | 产品回归：撤销新建智能体被缺密钥阻止；修服务端，原测试不改。 |
| server/one-home.e2e.test.ts | 产品回归：删除 503 中断迁移，随后读取未迁移会话出现 messages 错误；修服务端，原测试不改。 |
| server/openai-boat.e2e.test.ts | 后端夹具：直接、群聊及例行任务依赖 Boat；显式 box。 |
| server/place-view.e2e.test.ts | 后端夹具：套餐额度、占用及开机错误来自 Boat；云电脑及自动固定夹具显式 box。 |
| server/post-to-room.test.ts | 夹具时序：停止请求返回时旧群聊仍在退出，下一项修改部门被权限保护拒绝；慢退出 CLI 复现同一 409，补等待，保留权限保护。 |
| server/session-credentials.e2e.test.ts | 产品回归：未配置云服务却阻止工作中智能体删除；修服务端，原测试不改。 |
| server/steer-e2e.test.ts | 产品回归：删除返回 503；修服务端，原测试不改。 |
| server/team-setup.e2e.test.ts | 产品回归：团队删除请求失败；修服务端，原测试不改。 |
| server/thread-aware-bots.e2e.test.ts | 产品回归：清理删除失败遗留智能体，后续设置遇到 409；修服务端，原测试不改。 |
| server/thread-page-frames.e2e.test.ts | 产品回归：导入后的源智能体无法删除；修服务端，原测试不改。 |
| src/components/keys/KeyRow.test.ts | 界面规则变化：改为旧入口隐藏和无 Boat 文案断言，保留其他覆盖。 |

测试命令与结果摘要：

- 修复前逐文件运行 19 个目标：18 个直接复现失败；post-to-room 普通及单核共 7 次通过后，用慢退出假 CLI 定向复现同一 409，再补等待。
- pnpm exec vitest run <文件> --maxWorkers=1，以及 node --test electron/desktop-prefs.node-test.mjs：最终 102 个文件、162 次文件运行通过，共 2403 次测试执行通过；30 个端到端／集成文件各连续 3 次通过。包含全部 19 个目标、server/instabox/ 全部测试及前几轮相关测试。
- Linux 上保留 4 个平台限定跳过：group-local-vm 两项 macOS／本机桌面场景、independent-threads-api 一项 macOS 场景、session-credentials 一项非 Linux 本机桌面场景。其余无跳过；VNC 浏览器 32 项和 VPS 图像 59 项均实际通过。
- pnpm exec tsc -p tsconfig.server.json、pnpm exec tsc -b --pretty false、全部改动 TS／TSX 文件的 pnpm exec oxlint --deny-warnings、pnpm i18n:check、git diff --check：通过。
- 验证 README 缺失，使用隔离夹具。Chromium 使用临时直接启动器，Pillow 使用临时虚拟环境，验证隔离性测试使用只含 Node 的临时目录；完整脱敏输出见同目录 verification.txt。未提交 git。


## 第 10 轮

改了什么（第 10 轮实现已在入口基线中；当前相对 HEAD 的清单与第 11 轮一致，共 8 个文件）：

- server/instabox/machine-records.ts：记录加入密钥指纹，旧两元组按指纹未知读取。
- server/instabox/machines.ts：列表为空时按记录中的机器标识核实，只有同指纹且已删除才清记录。
- server/instabox/wiring.ts、server/instabox/snapshot-wiring.ts：生命周期、预览和快照记录绑定当前密钥指纹。
- server/instabox/machine-records.test.ts、server/instabox/deletion.e2e.test.ts：补不同账号、同密钥已删除、未知指纹及核实失败回归，保留第 10 轮覆盖。
- docs/tasks/T-1200/T-1252-instabox-panel-polish/report.md、docs/tasks/T-1200/T-1252-instabox-panel-polish/verification.txt：修正当前文件清单与数量，追加命令和脱敏验证输出。

临时文件清理记录：ci-fails.txt 在入口即已不存在，本轮没有删除该文件，不计入当前改动。

为什么：当前配置与内存缓存不能证明云机器不存在。独立持久记录使清空密钥、重启和切换后端后仍能保留清理入口；缺密钥预检先于普通忙碌检查返回 503，不会继续删除。没有机器记录且没有密钥时仍允许删除。入口工作区干净，既有第 9 轮修复保留在基线中；不提交 git。

测试命令与结果摘要：

- pnpm exec vitest run <文件> --maxWorkers=1：47 个文件、118 次运行通过，包含第 9 轮全部 19 个文件、全部 16 个文件及删除相关测试；33 组服务 e2e 各连续 3 次通过。新增删除回归每轮 4 项、持久记录回归 3 项通过。
- pnpm exec tsc -p tsconfig.server.json、pnpm exec tsc -b --pretty false、7 个改动 TS 文件的 pnpm exec oxlint --deny-warnings、git diff --check：通过。
- Linux 下原有 4 项平台专属用例跳过：group-local-vm 的 2 项本机桌面／macOS 权限用例、independent-threads-api 的 1 项 macOS 用例、session-credentials 的 1 项本机桌面用例。VNC 浏览器用例每轮 32 项全部执行通过，无新增跳过。
- 仓库缺少指定验证 README，全部服务端验证使用临时目录和假服务的隔离 fixture；完整脱敏输出追加在同目录 verification.txt。


## 第 11 轮

改了什么（当前相对 HEAD 的清单，按 git diff HEAD --stat 加未跟踪文件核对，共 8 个文件，无未跟踪文件）：

- server/instabox/machine-records.ts：记录加入密钥指纹，旧两元组按指纹未知读取。
- server/instabox/machines.ts：列表为空时按记录中的机器标识核实，只有同指纹且已删除才清记录。
- server/instabox/wiring.ts、server/instabox/snapshot-wiring.ts：生命周期、预览和快照记录绑定当前密钥指纹。
- server/instabox/machine-records.test.ts、server/instabox/deletion.e2e.test.ts：补不同账号、同密钥已删除、未知指纹及核实失败回归，保留第 10 轮覆盖。
- docs/tasks/T-1200/T-1252-instabox-panel-polish/report.md、docs/tasks/T-1200/T-1252-instabox-panel-polish/verification.txt：修正当前文件清单与数量，追加命令和脱敏验证输出。

为什么：另一个账号返回空列表或单机不存在，不能证明原账号的机器已经清理。记录仅保存 SHA-256 的前 16 位十六进制指纹；指纹不同、未知或无法确认删除时保留记录并抛错，由既有删除流程返回 503、保留智能体并提示恢复原密钥。既有改动保留，不提交 git。

测试命令与结果摘要：

- pnpm exec vitest run <文件> --maxWorkers=1：47 个文件、113 次最终运行全部通过；33 组服务 e2e／集成测试各连续 3 次通过，包含全部 19 个第 9 轮目标、全部 16 个文件和删除相关测试。新增删除回归每轮 7 项、持久记录回归 16 项通过。
- pnpm exec tsc -p tsconfig.server.json、pnpm exec tsc -b --pretty false、6 个改动 TS 文件的 pnpm exec oxlint --deny-warnings、git diff --check：通过。
- 保留原有 4 项 Linux 平台限定跳过，无新增跳过；VNC 每轮 32 项全部执行通过。初次新增 e2e 的夹具准备被环境密钥保护返回 409，调整为先保存配置密钥、再启用环境密钥后连续三轮通过。
- 指定验证 README 和 server/bot-delete 路径在本基线不存在，删除生命周期使用现有删除相关 e2e 验证；全部服务端验证使用临时目录和假服务的隔离 fixture。完整脱敏输出见同目录 verification.txt。

## 第 12 轮

改了什么与为什么（本轮 7 个文件）：

- shared/place-view.ts：第一处同时保留旧提供方名称过滤、专属文案和共用屏幕文案；第二处同时传入 backend 与 sharedVmScreen，避免任一侧上下文丢失。
- src/components/ComputerPanel.tsx：工作位置名称传入当前配置，支持共用电脑叫法；保留云端桌面的通用名称，provider lock 不将其改成 VPS。保留已合入的未分配提示去重和按钮间距。
- src/components/WorksOnGrid.tsx：vm 标题和描述都按当前配置选择；保留 T-1252 的云端选项过滤，不因 provider lock 将云端桌面限定为 VPS。
- src/components/bot-panel/ComputerTab.tsx：工作位置名称传入当前配置，保留浏览器名称逻辑和云端通用名称。
- src/locales/source-hashes.json：合并双方新增键，逐项确认哈希对应当前英文源；没有整体重写。
- docs/tasks/T-1200/T-1252-instabox-panel-polish/report.md、docs/tasks/T-1200/T-1252-instabox-panel-polish/verification.txt：追加冲突处理说明、验证命令及结果摘要。

入口基线已包含冲突标记，Git 显示干净且没有进行中的合并；本轮只编辑冲突文件和上述记录，没有提交、中止或重置。Boat 隐藏、默认 、provider lock 只拦 box、快照和删除保护均保留。

测试命令与结果摘要：

- pnpm exec vitest run <文件> --maxWorkers=1：逐文件运行 47 个文件、65 次，共 923 项测试执行通过，0 失败、0 跳过。包含指定的 T-1266 测试、ComputerPanel／WorksOnGrid／ComputerTab／place-view 相关测试及 server/instabox 下全部 16 个文件；9 组 e2e 均连续 3 次通过，VNC 浏览器用例每次 32 项全部执行。
- pnpm exec tsc -p tsconfig.server.json、pnpm exec tsc -b --pretty false、冲突文件 pnpm exec oxlint --deny-warnings：通过。
- PATH=/opt/node24/bin:$PATH node scripts/generate-locale.mjs zh --check：当前脚本不支持语言参数与 --check 组合，返回用法错误；改用支持的 PATH=/opt/node24/bin:$PATH node scripts/generate-locale.mjs --check，通过中英文目录及源哈希检查。未修改脚本。
- 指定验证 README 缺失；全部服务测试通过现有临时目录、假服务及隔离 fixture 执行。完整命令和汇总结果追加在同目录 verification.txt。
- grep -rn 冲突标记扫描 shared／src／server 无输出；全仓冲突标记扫描与 git diff --check 通过。最终 git status 为上述 7 个修改文件，无新增文件，未提交。
