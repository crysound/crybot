# T-1238：界面语言只保留简体中文和英文

## 盘点

| 范围 | 位置 | 处理 |
| --- | --- | --- |
| Web 语言包 | `src/locales/en.json`、`src/locales/zh.json` | 保留；其他 14 个 JSON 包删除 |
| 语言哈希 | `src/locales/source-hashes.json` | 只保留 `zh` 条目；`en` 是源目录 |
| Web 语言测试 | `src/locales/*-words.test.ts`、`server-lines.test.ts`、i18n 与语言偏好测试 | 共享测试按 `localeChoices` 检查，覆盖 en/zh 与旧值回退 |
| 集中语言定义 | `shared/languages.ts` | `SUPPORTED_LANGUAGE_CODES`、`localePacks`、`supportedLanguage()`；旧码仅保留在兼容识别表 |
| 选择器和加载 | `src/locales/index.ts`、`src/lib/i18n.ts`、`src/lib/language-preference.ts` | 选择器、动态加载、保存值、Electron 值和系统探测统一走集中定义 |
| 服务端语言 | `server/language.ts`、`server/server-lines.ts`、`server/server-line-packs.ts`、`server/initial-greeting.ts`、`server/routine-cron-text.ts`、`server/workspace.ts`、`server/host/{brief-words,first-hour-words}.ts`、`server/saved-steps/screen-words.ts` | 固定文案表收敛到 en/zh；服务端按语言选择仍保留英文兜底 |
| Electron | `electron/native-text.cjs`、`electron/lending-words.mjs`、菜单、桌面偏好和相关测试 | 删除旧固定文案；旧保存值按规则回退，主进程仍跟随页面语言 |
| iOS | `mobile/ios/scripts/gen-strings.mjs`、`mobile/ios/CryBot/Strings/ServerText.xcstrings`、`mobile/ios/project.yml` | 生成映射、工程区域和 ServerText 只保留 `en`、`zh-Hans` |
| Android/watch | `mobile/android/app/src/main/res/values*`、`mobile/ios/CryBotWatch/{en,zh-Hans}.lproj` | 盘点后已有英文和简体中文资源，没有额外语言包需要删除 |
| 公告语言校验 | `shared/announcements.ts`、`announcements/announcements.schema.json`、公告 fixture | 公告语言枚举引用集中定义，严格校验只接受 en/zh，最大语言数为 2 |
| 生成/校验脚本 | `scripts/generate-locale.mjs` 及测试 | 语言码归一化只接受集中定义的 en/zh；旧语言哈希可被清理，不再生成旧包 |

删除的资源为 `de`、`es`、`fr`、`hi`、`it`、`ja`、`ko`、`pl`、`pt-br`、`ru`、`tr`、`uk`、`vi`、`zh-tw`，以及它们对应的 `src/locales` 目录资源和生成内容。

## 兼容规则

- `zh`、`zh-*`、包括 `zh-TW`、`zh-Hant-TW`，统一使用简体中文包 `zh`。
- 已删除的其他语言（例如 `de-DE`、`pt-BR`）统一回退英文 `en`。
- 未知值也回退英文；空字符串仍表示跟随系统语言。
- 旧值在读取偏好、浏览器/系统探测、前端加载、服务端日期区域和 Electron 原生文案中都不会造成空包或异常。
- 智能体回复语言选择逻辑没有收窄；本次只删除固定 UI、服务端、桌面和移动端文案包。模型仍可按用户要求用其他语言回答。

## 验证

依赖准备：已在 worktree 根目录运行 依赖准备脚本。

通过的类型和静态检查：

- `pnpm exec tsc -b --pretty false`
- `pnpm exec tsc -p tsconfig.server.json --pretty false`
- 改动文件 `pnpm exec oxlint --deny-warnings ...`
- `git diff --check`
- `node scripts/generate-locale.mjs --check`：`locale catalogs valid (2 languages, 10608 English strings)`，zh 为 `8014/10608`。
- `node scripts/check-announcements.mjs`：`announcements: valid`。

通过的语言相关 Vitest 文件：

- `shared/languages.test.ts`：2 tests
- `src/lib/i18n.test.ts`：39 tests
- `src/lib/language-preference.test.ts`：13 tests
- `src/lib/cloud-send.test.ts`：20 tests
- `src/lib/server-error.test.ts`：6 tests
- `server/language.test.ts`：3 tests
- `server/server-lines.test.ts`：3 tests
- `server/host/brief-words.test.ts`：12 tests
- `server/host/first-hour-words.test.ts`：5 tests
- `src/locales/server-lines.test.ts`：8 tests
- `server/skill-switch.test.ts`：9 tests
- `shared/announcements.test.ts`：21 tests
- `src/lib/announcements.test.ts`：18 tests
- `src/testing/preview-locale.test.ts`：3 tests
- `src/locales/trial-days.test.ts`：3 tests
- `src/locales/vocabulary.test.ts`：6 tests
- `src/locales/credential-store-words.test.ts`：1 test
- `src/locales/native-keys.test.ts`：3 tests
- 其余 locale 检查也逐文件通过：`data-keys`（1）、`departments`（2）、`everyday-words`（3，另 3 todo）、`mcp-sign-in-path`（1）、`screen-words`（1）、`sent-keys`（2）、`settings-words`（2）、`vm-confirm`（1）、`welcome-words`（2）、`words`（3）。
- `electron/menu.test.mjs`：21 tests

通过的 Node 测试：

- `node --test electron/native-text.node-test.mjs`
- `node --test electron/native-language.node-test.mjs`
- `node --test electron/lend-automatically.node-test.mjs`
- `node --test electron/lending-dialogs.node-test.mjs`
- `node --test electron/desktop-prefs.node-test.mjs`
- `node --test electron/environments.node-test.mjs`
- `node --test electron/error-pages.node-test.mjs`
- `node --test electron/move-gaps.node-test.mjs`
- `node --test electron/team-move-bring.node-test.mjs`
- `node --test electron/startup-tray.node-test.mjs`
- `node --test electron/screen-status.node-test.mjs`
- `node --test electron/talk-panel.node-test.mjs`
- `node --test electron/credential-patch.node-test.mjs`
- `node --test electron/cloud-first-open.node-test.mjs`
- `node --test electron/one-home-main.node-test.mjs`
- `node --test electron/one-home.node-test.mjs`
- `node --test electron/approval-trusted-mode.node-test.mjs`
- `node --test mobile/ios/scripts/gen-strings.test.mjs`

`pnpm exec vitest run scripts/generate-locale.test.mjs` 通过 20/23 个测试；剩余 3 个 Git 历史测试在本 中因 `spawnSync git EPERM`，无法创建临时 Git 仓库。`electron/cloud-lending.node-test.mjs` 的语言无关并发/计时场景在沙箱中有超时，未将其归因于本次语言改动。

仓库说明要求的 `docs/verification/README.md` 在此 checkout 中不存在，无法执行该文件规定的 fixture 验证。沙箱禁止监听 TCP 端口，因此端口型 E2E 未运行，交由 Actions/主机环境执行。

## 有意未改动

`src/lib/send-key.ts` 仍识别 `ja` 输入法，以保留日文输入法确认 Enter 的键盘行为；这不是界面语言包，也不改变语言选择器。服务端和客户端中按用户语言生成智能体提示/回复的逻辑保持开放，避免把固定 UI 语言限制误传给智能体回复。

## 第 2 轮

### 改了什么

恢复外部屏幕的 16 种安全词表、四种旧 MEMORY 种子识别和历史服务端文案识别；恢复设置选项是否有固定翻译的判断。新建智能体保留原始语言标签供模型生成选项，`en-US` 使用英文固定文案，`de`、`ar` 都保留给模型。统一工作区种子、定时任务与日期的中文选择。公告严格校验限中英文，远程宽松读取保留 16 种语言上限。

补齐缺失的 116 条 `server.*` 中文和相关前端测试所需的 281 条中文；断言要求全部 382 个英文 `server.*` 键都有非空中文。迁移旧语言固定文案测试，保留模型多语言、安全识别和历史兼容用例。完整 locale 子集发现了指定 29 个文件之外的遗漏，已一并迁移。连接器 e2e 的隔离 PATH 排除镜像预装的 uvx，以保持该测试模拟「Cloud 未安装 uvx」的条件。

本轮实际改动文件（与 `git status --short` 一致）：

- `docs/tasks/T-1200/T-1238-zh-en-only/report.md`
- `scripts/server-locale-plugin.test.ts`
- `scripts/testing/secret-card-descriptions.test.ts`
- `server/automation-reports.test.ts`
- `server/chat-notices.test.ts`
- `server/cloud-send-arrived.test.ts`
- `server/cloud-team-crybot-own-chat.e2e.test.ts`
- `server/connector-card-text.test.ts`
- `server/connector-stayed.e2e.test.ts`
- `server/email/host.test.ts`
- `server/host/brief.test.ts`
- `server/host/chief-notices-retry.test.ts`
- `server/host/first-hour.test.ts`
- `server/host/lending-lifts.test.ts`
- `server/host/outside-lineage.test.ts`
- `server/host/secret-cards.test.ts`
- `server/incidents.test.ts`
- `server/initial-greeting.test.ts`
- `server/initial-greeting.ts`
- `server/language.test.ts`
- `server/language.ts`
- `server/memory-move.test.ts`
- `server/notify.test.ts`
- `server/parked-cards.e2e.test.ts`
- `server/post-to-room.test.ts`
- `server/proactive-routines.e2e.test.ts`
- `server/recall-disclosure.test.ts`
- `server/room-lines.test.ts`
- `server/routes/bots-create.test.ts`
- `server/routes/bots-create.ts`
- `server/routes/setup-request.test.ts`
- `server/routine-cron-text.test.ts`
- `server/routine-cron-text.ts`
- `server/routine-requests.test.ts`
- `server/routine-run-card.test.ts`
- `server/saved-steps/screen-words.ts`
- `server/server-lines.test.ts`
- `server/server-lines.ts`
- `server/setup-request.test.ts`
- `server/setup-suggestions.test.ts`
- `server/teammate-lines.test.ts`
- `server/workspace.test.ts`
- `server/workspace.ts`
- `shared/announcements.test.ts`
- `shared/announcements.ts`
- `src/components/AboutDialog.test.ts`
- `src/components/AppNotices.test.ts`
- `src/components/ApprovalCard.i18n.test.ts`
- `src/components/ApprovalCard.wait-details.test.ts`
- `src/components/ApprovalModeSelector.i18n.test.ts`
- `src/components/AttachmentPreview.refusal.test.ts`
- `src/components/BrowserProfilesManager.test.ts`
- `src/components/BugReportNote.test.ts`
- `src/components/ChatMarkdown.test.ts`
- `src/components/ComputerAskCard.test.ts`
- `src/components/ComputerPanel.i18n.test.ts`
- `src/components/ComputerPanel.tabs.test.ts`
- `src/components/DecisionModelSettings.test.ts`
- `src/components/EmailMailbox.test.ts`
- `src/components/FailedTurnRow.trial-credit.test.ts`
- `src/components/HomeLine.test.ts`
- `src/components/HomeScreen.test.ts`
- `src/components/LocalComputerSection.test.ts`
- `src/components/McpServersPanel.embedded.test.ts`
- `src/components/McpServersPanel.test.ts`
- `src/components/MoveToTeam.test.ts`
- `src/components/OptionCard.i18n.test.ts`
- `src/components/PluginsPanel.i18n.test.ts`
- `src/components/RoutineCalendarPage.dialogs.test.ts`
- `src/components/RunLog.test.ts`
- `src/components/SecretRequestCard.test.ts`
- `src/components/SettingsModal.i18n.test.ts`
- `src/components/Sidebar.i18n.test.ts`
- `src/components/Sidebar.rows.test.ts`
- `src/components/SidebarBotRead.test.ts`
- `src/components/SidebarThreadRow.shared-chat.test.ts`
- `src/components/SidebarThreadRow.test.ts`
- `src/components/TaskPicker.test.ts`
- `src/components/ToolActivity.notice.test.ts`
- `src/components/ToolActivity.test.ts`
- `src/components/XCard.test.ts`
- `src/components/app/app-blocked.test.ts`
- `src/components/bot-settings/OverviewSection.test.ts`
- `src/components/bot-settings/UsageSection.test.ts`
- `src/components/browser/ChromeRow.test.ts`
- `src/components/browser/StreamSurface.test.ts`
- `src/components/live-panels.test.ts`
- `src/components/model-picker-reasoning.test.ts`
- `src/components/routines/RoutineViews.test.ts`
- `src/components/send-key.test.ts`
- `src/components/sidebar-preview.test.ts`
- `src/hooks/use-presence.test.ts`
- `src/lib/activity-runs.test.ts`
- `src/lib/activity-text.test.ts`
- `src/lib/activity.test.ts`
- `src/lib/approval-request-contract.test.ts`
- `src/lib/attach-notice.test.ts`
- `src/lib/automations.test.ts`
- `src/lib/bot-overview-text.test.ts`
- `src/lib/chat-copy.i18n.test.ts`
- `src/lib/clock-time.test.ts`
- `src/lib/composer-commands.test.ts`
- `src/lib/computer-messages.test.ts`
- `src/lib/cron-text.test.ts`
- `src/lib/engine-name.test.ts`
- `src/lib/failed-turn.test.ts`
- `src/lib/fixed-runtime-lines.test.ts`
- `src/lib/fixed-server-lines.test.ts`
- `src/lib/group-routing.test.ts`
- `src/lib/i18n.test.ts`
- `src/lib/keyboard-shortcuts.test.ts`
- `src/lib/mascot-names.test.ts`
- `src/lib/notify.test.ts`
- `src/lib/plain-error.test.ts`
- `src/lib/plan-spend.test.ts`
- `src/lib/presence-client.test.ts`
- `src/lib/ready-bots.test.ts`
- `src/lib/routine-calendar.test.ts`
- `src/lib/routine-display.test.ts`
- `src/lib/send-key.test.ts`
- `src/lib/server-update.test.ts`
- `src/lib/server-word-contracts.test.ts`
- `src/lib/team-map.test.ts`
- `src/lib/tool-step-label.test.ts`
- `src/lib/transcript-derivations.test.ts`
- `src/lib/tts/index.test.ts`
- `src/lib/updater.test.ts`
- `src/lib/usage-trace.test.ts`
- `src/lib/usage.test.ts`
- `src/lib/verify-steps.test.ts`
- `src/lib/widget-text.test.ts`
- `src/locales/screen-words.test.ts`
- `src/locales/server-lines.test.ts`
- `src/locales/zh.json`
- `docs/tasks/T-1200/T-1238-zh-en-only/verification-round2/`
- `server/legacy-server-lines.json`
- `server/testing/fixtures/legacy-memory-seeds.json`

### 为什么

第 1 轮测试结论有误：所运行的测试不足以证明兼容性和中文覆盖，遗漏了失败测试，也把安全识别与界面语言错误地一并收窄；本轮以实际运行记录纠正。第 1 轮记录的端口限制不适用于本轮，隔离测试可以监听端口。

故意保留：安全词表识别其他网站和应用，不随界面语言裁剪；旧种子仅用于排除出厂占位记忆，不用于生成；旧文案模板仅用于识别历史记录，不重新提供旧语言包；模型回复和选项仍可用其他语言。未提交 git。

### 测试命令与结果

第 2 轮中断时没有完成最终汇总；其输出保存在 `verification-round2/`，本轮重新验证的最终结果见下文。本 checkout 和公开上游都没有 `docs/verification/README.md`；使用现有测试的临时 home 和 `launchVerificationServer` 隔离 fixture，未对用户真实应用或数据执行验证。


## 第 3 轮

### 改了什么

保留系统、网页和桌面保存的原始语言标签；`activeLocale()` 只表示界面包，`activeLanguage()` 表示原始用户语言。个人、团队成员、配对设备及配置对话框创建智能体均发送后者；语言选择器仍只显示中英选项。补原始语言、界面回退、异步加载顺序及服务端模型提示回归测试，修正上一轮 presence 测试传入 `null` 导致的类型错误。

本轮实际文件（与 `git status --short` 一致；前两轮代码已包含在本轮初始快照中）：

- `docs/tasks/T-1200/T-1238-zh-en-only/report.md`
- `docs/tasks/T-1200/T-1238-zh-en-only/verification-round3/`
- `server/routes/bots-create.test.ts`
- `src/components/AppSettingsRows.tsx`
- `src/lib/create-configured-bot.ts`
- `src/lib/i18n.test.ts`
- `src/lib/i18n.ts`
- `src/lib/language-preference.test.ts`
- `src/lib/language-preference.ts`
- `src/lib/new-bot.test.ts`
- `src/lib/new-bot.ts`
- `src/lib/presence-client.test.ts`

### 为什么

界面不支持德语不代表用户要求模型改用英文。原始 `de` 必须保留，UI 回退 `en` 只发生在选择界面语言包和显示语言选择器的选中值时；服务端已有原始标签校验及模型语言传递逻辑，本轮增强断言确认模型要求为 German / Arabic，固定文案才回退英文。

逐项核对第 2 轮 39 文件、59 个失败：[failure-audit.txt](verification-round3/failure-audit.txt)。其中 38 文件、58 个失败来自旧语言预期、中文缺键或相邻失败造成的语言状态残留，初始快照已包含第 2 轮后续修复，本轮逐文件全部通过。剩余 `connector-stayed` 是镜像预装 `uvx` 破坏 fixture 的“缺少 uvx”前提，前轮已修正隔离 PATH。本轮在同一 `origin/main` 上运行同一测试，仍是 1 测试失败、缺失预期的 fetch/uvx stayed 项，和旧日志一致；见 [origin-main-connector-stayed.txt](verification-round3/origin-main-connector-stayed.txt)。

`verification-fixture` 原始环境的 1 个失败也在 `origin/main`（`0c8950353d5b6a6c729afa36373ed78a18db6f68`）复现；两边该测试及 `scripts/control-cry.ts` 无差异。fixture 将 Node 所在目录加入 PATH，而镜像的 Codex CLI 恰好同目录，导致预期 unavailable 实际 available；与语言包删除无关。对照输出见 [origin-main-verification-fixture.txt](verification-round3/origin-main-verification-fixture.txt)。

### 测试命令与结果摘要

开工运行 依赖准备脚本。所有 Vitest 使用 `--maxWorkers=1` 串行，服务端测试使用临时 home / `launchVerificationServer`，没有访问用户真实应用或数据。当前 checkout 与取得的上游都缺少 `docs/verification/README.md`，按现有隔离 fixture 验证。未提交 git。验证输出已清除网络地址、域名与 UUID。

- `pnpm exec vitest run <scripts/ci-scope.mjs 的 locale-tests.files> --maxWorkers=1`：1043 文件通过、7 跳过；11248 测试通过、0 失败、69 跳过、3 todo（完整展开命令及输出见 `verification-round3/locale-subset.txt`）。
- 39 个旧失败文件逐个 `pnpm exec vitest run <file> --maxWorkers=1`：894 测试通过、0 失败。
- `src/lib/{new-bot,create-configured-bot,language-preference}.test.ts`、`server/routes/bots-create.test.ts` 逐文件同命令：80 测试通过、0 失败。
- `pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json --pretty false`：均退出 0，无类型错误。
- `pnpm exec oxlint --deny-warnings <本轮 10 个 TS/TSX 文件>`：退出 0，无错误或警告；完整文件参数见 `verification-round3/oxlint.txt`。

- 子集外 27 文件逐文件同命令：838 测试通过、0 失败，清单见 `verification-round3/supplementary-summary.txt`。
- 以下 11 组逐文件 `pnpm exec vitest run <file> --maxWorkers=1`，各连续 3 次通过，共 165 测试通过、0 失败：`server/{bot-setup,cloud-team-crybot-own-chat,cloud-team-first-look,cloud-team-setup-request,connector-stayed,parked-cards,proactive-routines,setup-import,team-setup,workspace-banner}.e2e.test.ts`、`server/post-to-room.test.ts`。
- `node scripts/generate-locale.mjs --check`：退出 0，仅 2 种语言，10608 英文键；`node scripts/check-announcements.mjs`：退出 0。

- `/tmp/t1238-node/bin/node node_modules/vitest/vitest.mjs run server/verification-fixture.e2e.test.ts --maxWorkers=1`：把同一 Node 可执行文件复制到仅含 Node 的临时目录，连续 3 次通过，共 6 测试通过；上游同环境 2 测试通过。原始目录运行则本分支每次 1 通过 / 1 失败，上游同为 1 通过 / 1 失败；保留全部记录，不改业务代码规避该环境问题。
- `node --test <file>`，逐个运行 `electron/{native-text,native-language,desktop-prefs}.node-test.mjs`、`mobile/ios/scripts/gen-strings.test.mjs`：43 测试通过、0 失败。

- 显式开启 `CRYBOT_UI_E2E=1`，设置 `AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium`、`CRYBOT_AGENT_BROWSER_PATH=/tmp/t1238-ui-tools/tools/agent-browser/0.37.0/agent-browser` 后，逐文件运行 `pnpm exec vitest run scripts/testing/<file>.e2e.test.ts --maxWorkers=1`：`team-side-switch-ui` 连续 3 次各 5 测试通过，`key-readback` 连续 3 次各 2 测试通过。


上述浏览器环境下，以下额外失败在同一 `origin/main` 的同一测试文件也存在；这些测试文件两边无差异。本轮未扩大到修改其流程或 fixture，完整对照见 [ui-comparison.txt](verification-round3/ui-comparison.txt)。通过/失败数如下，失败记录均保留：

| `scripts/testing/<名称>.e2e.test.ts` | 本分支首跑 通过/失败 | 上游 通过/失败 | 对照依据 |
| --- | --- | --- | --- |
| `bot-tools-ui` | 0/1 | 0/1 | 同一行仍假定快捷键立即提交创建请求，实际先询问名称 |
| `rail-profile-ui` | 5/8 | 8/5 | 上游 5 个失败均在本分支失败集合内；截图超时、工作区切换空响应及连带失败，步骤并非完全相同 |
| `team-conversation-share-ui` | 2/4 | 2/4 | 相同 4 项收件箱、接续会话及记忆读取断言失败 |
| `team-private-default-ui` | 5/1 | 5/1 | 相同预设按钮选择器等待超时 |

`locale-tests` 默认跳过的 7 个文件中，6 个浏览器文件已显式开启补跑；`team-own-chat` 的旧 fixture 未提供 Team Cloud，因此保留其代码声明的跳过。平台限定的测试和 3 个既有 todo 也按套件原定义保留。


`one-workspace-ui` 首次为 15 通过 / 1 续签超时；上游同环境 16 通过。本分支未改代码，随后完整连续复跑 3 次，每次 16 通过、0 失败，共 48 通过，确认首跑为偶发超时。初跑与三次复跑输出均保留在 `verification-round3/`。

`git diff --check`：退出 0。所有验证命令均已结束；第 3 轮记录完成最终脱敏扫描，无网络地址、域名或 UUID 残留。上述 4 个额外浏览器文件未能三连通过，其上游失败依据已逐项列出；没有将它们计为通过。

## 第 4 轮

### 改了什么

- 重新生成 `mobile/ios/CryBot/Strings/ServerText.xcstrings`。
- 更新 `mobile/ios/CryBotTests/Support/ServerTextRendererTests.swift` 的简体中文断言。
- `src/lib/send-key.ts` 的默认发送键读取原始语言；`src/lib/send-key.test.ts` 补回英文界面、日语原始标签的 mod-enter 回归断言。
- 本节验证记录：`docs/tasks/T-1200/T-1238-zh-en-only/verification-round4/commands.txt`。
- 本报告：`docs/tasks/T-1200/T-1238-zh-en-only/report.md`。

### 为什么

生成 iOS 资源以同步新增中文服务端文案。iOS 测试改用 `chat.notice.claudeLimitSaid` 和 `chat.notice.goalRetry` 的简体模板及参数；本环境没有 Xcode，XCTest 未能本地运行，CI 将执行。默认发送键使用原始语言标签，避免日语用户在英文界面下从 mod-enter 回退为 Enter。

### 测试命令与结果

- `node mobile/ios/scripts/gen-strings.mjs --check`：通过。
- `node --test mobile/ios/scripts/gen-strings.test.mjs`：8 通过。
- `pnpm exec vitest run src/lib/send-key.test.ts --maxWorkers=1`：23 通过；`shared/languages.test.ts`：2 通过；`src/lib/i18n.test.ts`：42 通过。
- `pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json --pretty false`、改动 TypeScript 文件 `pnpm exec oxlint --deny-warnings`、`git diff --check`：均通过。

## 第 5 轮

- **改了什么**：`src/locales/zh.json` 合并双方文案、去重并按英文键序排列；`src/lib/i18n.test.ts` 保留中文不完整断言，以及完整／缺键 `zz` 包断言；删除 `src/locales/pt-br.json`。必要适配：脚本重新生成 `mobile/ios/CryBot/Strings/ServerText.xcstrings`，补入 3 条 错误文案并去重；`server/routes/config-instabox.test.ts` 补回调参数类型。文档改动为本报告，以及 `verification-round5/audit.txt`、`commands.txt`、`generated-resources.txt`、`final-checks.txt`。
- **为什么**：保留本分支只支持中英的规则及 main 的新增功能文案。葡语包中的 19 个 键全部存在于中英包，相关代码和测试没有需要迁移的葡语引用。初次生成检查发现资源过期，服务端类型检查发现新测试有两个隐式参数类型错误，均已修复。当前快照只有一个基线提交，没有合并父提交或远端历史，无法重建葡语历史差异；缺少 `docs/verification/README.md`，验证使用现有隔离 fixture、临时数据与模拟服务。
- **测试命令与结果**：`pnpm exec vitest run <文件> --maxWorkers=1` 逐文件运行要求的 4 个语言／错误测试、`server/instabox/` 的 6 个单元测试、4 个相关组件测试及 `server/routes/config-instabox.test.ts`：15 文件、161 项通过；类型修复后后者复跑 6 项通过。`computer-tools.e2e`、`core.e2e`、`vnc.e2e`、`instabox-snapshots.e2e` 各连续三次通过，每次分别 29、15、32、12 项，共 264 项，无跳过，包含 Chromium 桌面用例。`node mobile/ios/scripts/gen-strings.mjs --check`、`node scripts/generate-locale.mjs --check` 通过；`node --test mobile/ios/scripts/gen-strings.test.mjs` 8 项通过。`pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json --pretty false`、改动文件 `pnpm exec oxlint --deny-warnings`、`git diff --check` 均通过；全仓库及指定目录冲突标记扫描无结果。完整脱敏输出见上述 verification 文本文件。未执行 Git 提交或其他 Git 写操作。

## 第 6 轮

- **改了什么**：`server/store.test.ts` 两条用例改用 `zh` 验证当前语言，并断言 `es-MX` 设置选项、`pt-BR` 问候回退英文；追加本报告 `docs/tasks/T-1200/T-1238-zh-en-only/report.md` 和完整脱敏输出 `docs/tasks/T-1200/T-1238-zh-en-only/verification-round6.txt`。未提交 Git。
- **为什么**：旧测试仍要求已删除语言的固定文案。两条 失败用例在未改实现／判定、关闭 CI 自动重试的情况下，随完整文件各连续三次通过（core 每次 15 项，computer-tools 每次 29 项）；未复现删除状态或进程完成超时，相关状态流程不依赖语言包，本轮按偶发处理，不改代码。当前快照无远端历史，未作 main 对照运行。
- **测试命令与结果**：先运行 依赖准备脚本；`pnpm exec vitest run <文件> --maxWorkers=1 --reporter=verbose` 逐文件覆盖 store、instabox 全部 9 文件、实际路径 `src/lib/i18n.test.ts`、locales 全部 15 文件：26 个文件通过，含重复运行共 511 项通过、0 失败，另有 3 项既有 todo。三份 e2e 均各三连通过，VNC 每次 32 项，包含 Chromium 用例。`pnpm exec tsc -p tsconfig.server.json`、`pnpm exec oxlint --deny-warnings server/store.test.ts`、`git diff --check` 均通过。引用的验证 README 缺失；所有服务验证均使用现有隔离 fixture 和临时数据。
