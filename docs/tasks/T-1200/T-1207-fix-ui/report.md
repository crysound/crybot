# T-1207 UI 测试修复报告

## Account/Call/Chat/Cloud/Computer

- 类别 2：删除仅覆盖已移除账号、托管云、付费和云备份的文件：`AccountMenu.keys.dom.test.ts`、`AccountMenu.test.ts`、`BotLimitPopup.test.ts`、`CloudComputerRecovery.dom.test.ts`、`CloudSetup.test.ts`、`CompanyBackupSettings.test.ts`。从 `ChatView.controls.test.ts` 删除 Cloud guest composer 用例；从 `ComputerPanel.browser.test.ts` 删除 My Cloud Works-on 入口断言；从 `ComputerPanel.takeover.test.ts` 删除托管云 viewer 用例，保留 self-hosted VPS 和本地 VM 控制用例。
- 类别 2：删除 `CallView.composer.test.ts`、`CallView.panel.test.ts`、`CallView.voiceSetup.test.ts`、`Composer.ime.test.ts`、`ChatGptPlanSignIn.interaction.test.ts`、`ClaudeSignIn.interaction.test.ts` 中已移除 PostHog 事件断言，保留通话、登录和发送行为断言。
- 类别 1：`BotPickerList.team.test.ts`、`BotSettingsDialog.simple.test.ts`、`CallView.availability.test.ts`、`CallView.journeys.test.ts`、`ComputerAskCard.test.ts`、`ComputerPanel.takeover.test.ts` 更新为 `Cry Bot`，并将已删除 Cursor 身体改为 Dome；`ChatView.controls.test.ts`、`ChatMarkdown.test.ts`、`ComputerPanel.browser.test.ts` 更新品牌文案和 HTTPS fixture。
- 类别 3：`GroupView.speaker.test.ts` 移除 SSR markup 中不存在的 CSS 变量断言，保留 `bot-identity` 和 `data-bot-color` 语义断言。

## DecisionModelSettings–PluginsPanel

- 类别 1：`DecisionModelSettings.test.ts`、`DiagnosticsRow.test.ts`、`EngineSetup.refresh.test.ts`、`EngineSetup.test.ts`、`EnginesSettings.app-copy.test.ts`、`EnginesSettings.test.ts`、`FilesView.test.ts`、`ImportSettings.test.ts`、`LocalComputerSection.test.ts`、`MacLocalControl.test.ts`、`McpServersPanel.hosted.test.ts`、`MoveToTeam.test.ts`、`NewLookNotice.test.ts`、`PairedPhones.test.ts`、`PhoneDevicesSection.page.test.ts`、`PhoneSetupFlow.publicNetwork.test.ts`、`PlaceLookCard.test.ts` 统一产品显示名为 `Cry Bot`。
- 类别 2：删除 `GrokMoveDialog.test.ts`、`GrokSignIn.interaction.test.ts`、`NewBotDialog.test.ts`、`NewLookNotice.test.ts`、`OpenAiCompatServers.test.ts`、`PluginsPanel.navigation.test.ts` 的 `track(...)` 断言；对应 UI/API 行为断言保留。
- 类别 3：`LinkHoverCard.test.ts` 恢复中性的 `example/project` GitHub fixture；`GroupView.speaker.test.ts` 保留语义断言并删除错误的静态 CSS 断言。

## Remote/Settings/Onboarding/Widgets

- 类别 1：`RemoteComputerSection.test.ts`、`RoutineCalendarPage.simple.test.ts`、`ServerList.test.ts`、`ServerPairingCard.test.ts`、`SettingsModal.updates.test.ts`、`SidebarProfileMenu.updates.test.ts`、`SidebarTiles.test.ts`、`SignInRequestCard.test.ts`、`TalkShortcutRow.test.ts`、`TeamPhoneCard.test.ts`、`TeamWelcome.test.ts`、`UpdateBanner.test.ts`、`UpdateBanner.updated.test.ts`、`UpdateIndicator.test.ts`、`UpdatesConsent.test.ts`、`WorkspaceBackupSettings.test.ts`、`automations/automations.test.ts`、`bot-settings/AccessSection.test.ts`、`cloud-welcome/CloudWelcome.test.ts`、`cloud-welcome/WelcomeBring.test.ts`、`onboarding/ChiefIntro.test.ts`、`onboarding/ConnectAi.test.ts`、`onboarding/FirstConversationTour.test.ts`、`onboarding/WelcomeGate.test.ts`、`published-apps/PublishedAppsPage.test.ts`、`room-panel/RoomPanel.dom.test.ts`、`routines/ResultsDestination.test.ts`、`routines/RoutineViews.test.ts`、`settings/SettingsWindow.test.ts` 统一品牌显示；Simple 导航移除已删除的付费 Plan 项。
- 类别 2：删除 `SecretRequestCard.test.ts`、`SimpleModePrompt.test.ts`、`XCard.test.ts`、`keys/KeysPage.dom.test.ts` 中已移除统计事件断言；`onboarding/ConnectAi.test.ts` 删除组织登录和 ModelGo 赞助入口（账号/推广已移除）。XCard/KeysPage 测试同步当前保存后手动检查流程，移除不存在的自动 `/api/keys/test` 期望。
- 类别 3：`widget/WidgetMessage.test.ts`、`widget/WidgetFields.test.ts` 将改名误伤的相对图片 fixture 修为 `https://example.test/app-icon-512.png`，并按当前 sample 更新 GitHub 文档链接；`routines/ResultsDestination.test.ts` 修正 bot fixture；`onboarding/FirstConversationTour.test.ts` mock 移至实际的 `welcome-progress` 模块。

## 源码与其他路

本路未修改源码。没有需要其他路修改的源码；安全相关断言未放宽。

## 验证

- 清单中现存文件按每批不超过 20 个文件运行，Node 24、Vitest `--maxWorkers=2 --configLoader runner`：四批分别通过 14/375、20/346、20/280、20/339 tests，Remote/Settings/Onboarding/Widgets 后段另通过 35/542 tests；恢复 self-hosted VPS/Works-on 保留用例后，`ComputerPanel.browser.test.ts` 7/7、`ComputerPanel.takeover.test.ts` 14/14 通过。
- Node 24 oxlint `--deny-warnings`（所有改动的 `src/components/**` 文件）：通过。
- Node 24 `scripts/check-brand-residue.mjs`：6471 files checked，0 forbidden references。
- 规定的 `systemd-run` 在当前沙箱无法连接 system scope bus（`Operation not permitted`）；使用同样 Node 24、2 workers 的等价命令完成验证。未提交 git commit。
- 仍失败文件：无。
