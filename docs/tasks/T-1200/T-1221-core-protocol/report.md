# T-1221-01 协议层与工程基础：第 1 轮报告（2026-11-14）

分支：`T-1221-core-protocol`。路径由 `task-paths report T-1221-core-protocol` 计算。未 git 提交、未推送、未开 PR。

本机 Linux Swift 6.3.3 实跑通过：35 个 XCTest，4 个跳过，0 失败；其中 32 个 CryCore 测试、31 个实际执行。跳过项是尚未合并的任务 00 契约目录，以及 CryNetLogic、CryNet、CryRFB 的三个占位测试。App/XcodeGen/SPM 远程依赖解析和 Actions 尚未验证。

## 1. 文件变更

任务正文第 13 项、允许范围与规格 1.3 都明确任务 01 本次写全 `project.yml`，所以按这项专属职责落地；末尾“只列行不改工程”的通用约束用于其后的功能任务。未修改 App 现有 Swift、手表、Shared、服务端、网页和 contract 目录。报告本身是任务指定的额外输出。

模型按线上声明展开到具体值类型及枚举，保留 `additionalFields` 和显式 null；没有使用任何 ignoredKeys 豁免。新增模型均为 Codable/Equatable/Sendable；消息、帧、runtime、widget 和结构化联合保留 unknown 原始载荷。`WireMessage.fields` 与 `WidgetNode.fields` 提供类型化载荷，动态成员读取可直接取可选字段；未知消息仍保留共同 id。

| 文件 | 变更 |
| --- | --- |
| `.github/workflows/mobile.yml` | 统一 macos-26/Xcode 26、main push、PR 路径、并发取消、SPM 缓存与锁文件产物，并采用一次构建后的两次单测执行。 |
| `mobile/ios/.gitignore` | 仅追加 .linux-cache/ 和 .linux-build/。 |
| `mobile/ios/CryBot/CryBot-AppLinks.entitlements` | 新增约定的 Associated Domains 文件并同时写入 Keychain 共享组，默认不选用。 |
| `mobile/ios/CryBot/CryBot.entitlements` | 新增默认的 Keychain 共享组权限。 |
| `mobile/ios/CryBotTests/Placeholder.swift` | 增加宿主测试，验证 CryCore 产品链接及响应解码。 |
| `mobile/ios/CryBotUITests/Placeholder.swift` | 增加显式跳过的 UI 测试占位，等待夹具启动入口。 |
| `mobile/ios/Packages/CryKit/Package.swift` | 建立无远程依赖的四库四测试 target 和 Fixtures 资源。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/AdditionalTypesModels.swift` | 补齐机身标识、手机应用授权和团队角色等共享值类型。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/AppModels.swift` | 定义 HTML App 消息载荷及来源引用。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/AppTriggersModels.swift` | 定义 App 事件触发器、请求和执行记录。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ApprovalModeModels.swift` | 定义审批级别及未知值兜底。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/AskQuestionModels.swift` | 定义结构化问题与选项。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/BotAccessModels.swift` | 定义机器人共享权限及授权级别。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/BotAvatarModels.swift` | 定义头像裁剪与面部颜色。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/BurstModels.swift` | 定义并行任务卡片、阶段和计数。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/CommandAllowlistModels.swift` | 定义可记住的原生命令候选。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ComputerAskModels.swift` | 定义电脑请求的需求、原因、设备和状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ConfigStatusModels.swift` | 定义配置响应依赖的凭据状态、浏览器和策略类型。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ConnectorCardModels.swift` | 定义连接器卡片及连接状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/CoreAPIModels.swift` | 定义快照、分页、发送、认证、配置、环境响应以及共用导航类型。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/CoreTypes.swift` | 定义共用 ID、DataRow、APIError 错误协议和带优先级表的卡片分类。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/CredentialRequestModels.swift` | 定义凭据目标标识与未知值兜底。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/DataSurfaceModels.swift` | 定义全部数据表、数据卡、图表规格、查询、导出和广播模型。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/DefaultBotModels.swift` | 定义默认机器人混入的跟进数据。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/DevsReportStatusModels.swift` | 定义问题报告状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/DigestModels.swift` | 定义回合摘要及摘要条目。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/EmailModels.swift` | 定义邮件卡片的发件服务器字段。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/Endpoint.swift` | 定义安全的相对请求描述及全部核心 REST、认证、上传下载接口。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/EnvironmentModels.swift` | 定义环境安装方式。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/FirstReplyRescueModels.swift` | 定义首条回复恢复信息。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/GroupGoalRunModels.swift` | 定义群聊目标执行记录。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/HelperFollowupModels.swift` | 定义助手跟进信息。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ImageGenerationModels.swift` | 定义图像供应商枚举。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/InboxModels.swift` | 定义收件箱条目、来源、行和回复数据。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/JSONValue.swift` | 提供保留数值精度、未知键和显式 null 的 Codable 基础及 WireModel 合同。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/LimitResetModels.swift` | 定义用量重置重复方式。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/LiveCallWireModels.swift` | 定义实时通话状态、记录和非密钥设置。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/LiveState.swift` | 实现快照、消息、列表、运行项、通知、presence、电脑、通话与屏幕归并。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/McpRequestModels.swift` | 定义 MCP 变更请求。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ModelRequestModels.swift` | 定义模型变更卡片。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/NotificationModels.swift` | 定义通知类型、内容和日志项。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/OnboardingModels.swift` | 定义配置响应中的初始设置状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/PhoneAppsModels.swift` | 定义手机应用读写授权值。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/PlaceBannerModels.swift` | 定义空间横幅摘要。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/PlaceViewModels.swift` | 定义执行位置和状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ProfileRequestModels.swift` | 定义资料变更、变更前值和撤销元数据。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/PublishedPageModels.swift` | 定义发布页面及发布失败卡片。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ReplyStyleModels.swift` | 定义回复风格。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/RoutineRequestModels.swift` | 定义自动化审批中的创建、修改、计划与撤销载荷。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/RoutineRunModels.swift` | 定义自动化执行卡片与消息归属。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/RoutinesModels.swift` | 定义自动化记录、计划及运行状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/RuntimeEventAccess.swift` | 提供运行事件的线程与事件 ID 访问。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/RuntimeEventsModels.swift` | 定义全部 runtime 事件及各分支载荷。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/SSEParser.swift` | 实现增量 UTF-8 SSE 解析、CR/LF、注释、多行 data、事件名、游标和大小限制。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/SavedStepsModels.swift` | 定义保存步骤标记。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ServerTextModels.swift` | 定义服务端文案键、参数和错误正文。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/SessionsModels.swift` | 定义公开会话信息。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/SkillRequestModels.swift` | 定义技能审批、分享、变更和撤销信息。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/TeamSetupModels.swift` | 定义团队设置提案与操作。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/ToolScopeModels.swift` | 定义工具范围。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/Transport.swift` | 只声明 Transport、WebSocketChannel 和文本/二进制 socket 载荷。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/TurnProgressModels.swift` | 定义运行步骤与静默状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WaitRequestModels.swift` | 定义等待请求与结束行。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WebhookRequestModels.swift` | 定义 Webhook 提案及变更操作。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WebhooksModels.swift` | 定义 Webhook 触发器和尝试记录。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WidgetModels.swift` | 定义 widget 载荷、动作、按钮和已回答状态。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WidgetNodeModels.swift` | 定义源码实际存在的 32 种 widget 节点及其属性。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WireMessageAccess.swift` | 使已知及未来消息 kind 均能暴露共同的 id 和 parentId。 |
| `mobile/ios/Packages/CryKit/Sources/CryCore/WireModels.swift` | 定义机器人、群聊、消息、附件、选项卡、线程与全部 SSE 帧。 |
| `mobile/ios/Packages/CryKit/Sources/CryNet/Placeholder.swift` | 保留纯 Foundation 库入口。 |
| `mobile/ios/Packages/CryKit/Sources/CryNetLogic/Placeholder.swift` | 保留纯 Foundation 库入口。 |
| `mobile/ios/Packages/CryKit/Sources/CryRFB/Placeholder.swift` | 保留纯 Foundation 库入口。 |
| `mobile/ios/Packages/CryKit/Tests/CryCoreTests/ContractTests.swift` | 注册全部 18 个契约类型，验证 122 个手工目录样本、未知分支、字段类型、精度和逐键往返比较。 |
| `mobile/ios/Packages/CryKit/Tests/CryCoreTests/EndpointTests.swift` | 验证核心 URL、查询、JSON 请求体、原始字节上传下载和同源路径限制。 |
| `mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/manual/protocol.json` | 提供 122 个隔离样本，覆盖消息、帧、runtime、widget 和所有契约入口类型。 |
| `mobile/ios/Packages/CryKit/Tests/CryCoreTests/LiveStateTests.swift` | 验证规格 4.2 归并、重复帧、分支末端、队列、流式文本、请求和通知边界。 |
| `mobile/ios/Packages/CryKit/Tests/CryCoreTests/RequestCardTests.swift` | 验证全部 23 种分类、每一对优先级及终态标记不改变分类。 |
| `mobile/ios/Packages/CryKit/Tests/CryCoreTests/SSEParserTests.swift` | 验证每个字节切分点、Unicode、CR/LF、注释、空块、游标和异常输入。 |
| `mobile/ios/Packages/CryKit/Tests/CryNetLogicTests/Placeholder.swift` | 保留测试 target 并显式跳过尚未实现的模块。 |
| `mobile/ios/Packages/CryKit/Tests/CryNetTests/Placeholder.swift` | 保留测试 target 并显式跳过尚未实现的模块。 |
| `mobile/ios/Packages/CryKit/Tests/CryRFBTests/Placeholder.swift` | 保留测试 target 并显式跳过尚未实现的模块。 |
| `mobile/ios/project.yml` | 配置四个本地库、远程产品、iOS 17、宿主测试与 UI 测试、权限、音频后台、本地化和既定 App Links 构建参数。 |

`docs/tasks/T-1200/T-1221-core-protocol/report.md`：追加本轮中文报告及实际运行输出。

## 2. 验证

验证过程只有本地隔离 JSON/内存状态/请求描述测试，没有启动或访问用户的 App、服务或数据。仓库不存在 `docs/verification/README.md`，无法引用其启动步骤；本次没有服务端改动或服务端运行成功声明。

使用脚本 `/tmp/cry-linux-test.sh`，所有 Swift 缓存和临时目录在本工作区。执行命令：

```bash
bash /tmp/cry-linux-test.sh > /tmp/cry-linux-final.log 2>&1
```

脚本原文：

```bash
#!/usr/bin/env bash
set -euo pipefail
WS=$(pwd)/mobile/ios
C=$WS/.linux-cache
export PATH=/opt/swift/usr/bin:$PATH HOME=$C/home XDG_CACHE_HOME=$C/xdg TMPDIR=$C/tmp \
       CLANG_MODULE_CACHE_PATH=$C/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$C/swiftpm-module-cache
mkdir -p "$HOME" "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
swift test --package-path $WS/Packages/CryKit --scratch-path $WS/.linux-build \
  --cache-path $C/swiftpm --config-path $C/config --security-path $C/security \
  --manifest-cache local --disable-sandbox
```

工具链输出：

```text
Swift version 6.3.3 (swift-6.3.3-RELEASE)
Target: x86_64-unknown-linux-gnu
```

最终一次执行输出原文（退出码 0）：

```text
Building for debugging...
[0/3] Write sources
[1/3] Write swift-version-6F7309784324DD2.txt
[3/46] Compiling CryCore CredentialRequestModels.swift
[4/46] Compiling CryCore DataSurfaceModels.swift
[5/46] Compiling CryCore DefaultBotModels.swift
[6/46] Compiling CryCore DevsReportStatusModels.swift
[7/46] Compiling CryCore DigestModels.swift
[8/46] Compiling CryCore EmailModels.swift
[9/46] Compiling CryCore EnvironmentModels.swift
[10/46] Compiling CryCore FirstReplyRescueModels.swift
[11/46] Compiling CryCore GroupGoalRunModels.swift
[12/46] Compiling CryCore HelperFollowupModels.swift
[13/46] Compiling CryCore ImageGenerationModels.swift
[14/46] Compiling CryCore InboxModels.swift
[15/46] Compiling CryCore JSONValue.swift
[16/46] Compiling CryCore LimitResetModels.swift
[17/60] Emitting module CryCore
[18/62] Compiling CryCore LiveCallWireModels.swift
[19/62] Compiling CryCore McpRequestModels.swift
[20/62] Compiling CryCore ModelRequestModels.swift
[21/62] Compiling CryCore NotificationModels.swift
[22/62] Compiling CryCore OnboardingModels.swift
[23/62] Compiling CryCore PhoneAppsModels.swift
[24/62] Compiling CryCore PlaceBannerModels.swift
[25/62] Compiling CryCore PlaceViewModels.swift
[26/62] Compiling CryCore ProfileRequestModels.swift
[27/62] Compiling CryCore PublishedPageModels.swift
[28/62] Compiling CryCore ReplyStyleModels.swift
[29/62] Compiling CryCore RoutineRequestModels.swift
[30/62] Compiling CryCore RoutineRunModels.swift
[31/62] Compiling CryCore RoutinesModels.swift
[32/64] Compiling CryCore RuntimeEventAccess.swift
[33/64] Compiling CryCore SSEParser.swift
[34/65] Compiling CryCore Transport.swift
[35/66] Compiling CryCore WireMessageAccess.swift
[36/66] Compiling CryCore Endpoint.swift
[37/66] Compiling CryCore LiveState.swift
[38/66] Compiling CryCore AdditionalTypesModels.swift
[39/66] Compiling CryCore AppModels.swift
[40/66] Compiling CryCore AppTriggersModels.swift
[41/66] Compiling CryCore ApprovalModeModels.swift
[42/66] Compiling CryCore AskQuestionModels.swift
[43/66] Compiling CryCore BotAccessModels.swift
[44/66] Compiling CryCore BotAvatarModels.swift
[45/66] Compiling CryCore BurstModels.swift
[46/66] Compiling CryCore CommandAllowlistModels.swift
[47/66] Compiling CryCore ComputerAskModels.swift
[48/66] Compiling CryCore ConfigStatusModels.swift
[49/66] Compiling CryCore ConnectorCardModels.swift
[50/66] Compiling CryCore CoreAPIModels.swift
[51/66] Compiling CryCore CoreTypes.swift
[52/66] Compiling CryCore RuntimeEventsModels.swift
[53/66] Compiling CryCore SavedStepsModels.swift
[54/66] Compiling CryCore ServerTextModels.swift
[55/66] Compiling CryCore SessionsModels.swift
[56/66] Compiling CryCore SkillRequestModels.swift
[57/66] Compiling CryCore TeamSetupModels.swift
[58/66] Compiling CryCore ToolScopeModels.swift
[59/66] Compiling CryCore TurnProgressModels.swift
[60/66] Compiling CryCore WaitRequestModels.swift
[61/66] Compiling CryCore WebhookRequestModels.swift
[62/66] Compiling CryCore WebhooksModels.swift
[63/66] Compiling CryCore WidgetModels.swift
[64/66] Compiling CryCore WidgetNodeModels.swift
[65/66] Compiling CryCore WireModels.swift
[66/76] Wrapping AST for CryCore for debugging
[68/79] Compiling CryCoreTests RequestCardTests.swift
[69/80] Compiling CryCoreTests SSEParserTests.swift
[70/80] Compiling CryCoreTests LiveStateTests.swift
[71/80] Compiling CryCoreTests ContractTests.swift
[72/80] Compiling CryCoreTests EndpointTests.swift
[73/80] Emitting module CryCoreTests
[74/76] Write Objects.LinkFileList
[75/76] Linking CryKitPackageTests.xctest
Build complete! (18.37s)
Test Suite 'All tests' started at 2026-11-14 12:18:16.382
Test Suite 'debug.xctest' started at 2026-11-14 12:18:16.385
Test Suite 'Placeholder' started at 2026-11-14 12:18:16.385
Test Case 'Placeholder.testImplementationPlaceholder' started at 2026-11-14 12:18:16.385
/root/workspace/crybot/.worktrees/T-1221-core-protocol/mobile/ios/Packages/CryKit/Tests/CryRFBTests/Placeholder.swift:6: Placeholder.testImplementationPlaceholder : Test skipped - CryRFB implementation is pending
Test Case 'Placeholder.testImplementationPlaceholder' skipped (0.003 seconds)
Test Suite 'Placeholder' passed at 2026-11-14 12:18:16.387
	 Executed 1 test, with 1 test skipped and 0 failures (0 unexpected) in 0.003 (0.003) seconds
Test Suite 'Placeholder' started at 2026-11-14 12:18:16.388
Test Case 'Placeholder.testImplementationPlaceholder' started at 2026-11-14 12:18:16.388
/root/workspace/crybot/.worktrees/T-1221-core-protocol/mobile/ios/Packages/CryKit/Tests/CryNetLogicTests/Placeholder.swift:6: Placeholder.testImplementationPlaceholder : Test skipped - CryNetLogic implementation is pending
Test Case 'Placeholder.testImplementationPlaceholder' skipped (0.0 seconds)
Test Suite 'Placeholder' passed at 2026-11-14 12:18:16.388
	 Executed 1 test, with 1 test skipped and 0 failures (0 unexpected) in 0.0 (0.0) seconds
Test Suite 'Placeholder' started at 2026-11-14 12:18:16.388
Test Case 'Placeholder.testImplementationPlaceholder' started at 2026-11-14 12:18:16.388
/root/workspace/crybot/.worktrees/T-1221-core-protocol/mobile/ios/Packages/CryKit/Tests/CryNetTests/Placeholder.swift:6: Placeholder.testImplementationPlaceholder : Test skipped - CryNet implementation is pending
Test Case 'Placeholder.testImplementationPlaceholder' skipped (0.0 seconds)
Test Suite 'Placeholder' passed at 2026-11-14 12:18:16.388
	 Executed 1 test, with 1 test skipped and 0 failures (0 unexpected) in 0.0 (0.0) seconds
Test Suite 'ContractTests' started at 2026-11-14 12:18:16.388
Test Case 'ContractTests.testComparatorDetectsDroppedChangedAndAddedValues' started at 2026-11-14 12:18:16.388
Test Case 'ContractTests.testComparatorDetectsDroppedChangedAndAddedValues' passed (0.001 seconds)
Test Case 'ContractTests.testEveryKnownUnionCaseUsesTypedDecoding' started at 2026-11-14 12:18:16.390
Test Case 'ContractTests.testEveryKnownUnionCaseUsesTypedDecoding' passed (0.098 seconds)
Test Case 'ContractTests.testJSONNumbersRetainLargeIntegersAndDecimals' started at 2026-11-14 12:18:16.488
Test Case 'ContractTests.testJSONNumbersRetainLargeIntegersAndDecimals' passed (0.0 seconds)
Test Case 'ContractTests.testManualRoundTrips' started at 2026-11-14 12:18:16.489
Test Case 'ContractTests.testManualRoundTrips' passed (0.184 seconds)
Test Case 'ContractTests.testPanelAndSettingsUnknownValues' started at 2026-11-14 12:18:16.672
Test Case 'ContractTests.testPanelAndSettingsUnknownValues' passed (0.0 seconds)
Test Case 'ContractTests.testRequiredFieldsAndKnownFieldTypesAreChecked' started at 2026-11-14 12:18:16.673
Test Case 'ContractTests.testRequiredFieldsAndKnownFieldTypesAreChecked' passed (0.0 seconds)
Test Case 'ContractTests.testServerContract' started at 2026-11-14 12:18:16.673
/root/workspace/crybot/.worktrees/T-1221-core-protocol/mobile/ios/Packages/CryKit/Tests/CryCoreTests/ContractTests.swift:70: ContractTests.testServerContract : Test skipped - Task 00 contract/index.json is not present
Test Case 'ContractTests.testServerContract' skipped (0.0 seconds)
Test Case 'ContractTests.testTypedConstructorsMatchDecodedValuesAndExposeOptionalFields' started at 2026-11-14 12:18:16.674
Test Case 'ContractTests.testTypedConstructorsMatchDecodedValuesAndExposeOptionalFields' passed (0.001 seconds)
Test Case 'ContractTests.testUnknownKindsAndFieldsSurvive' started at 2026-11-14 12:18:16.675
Test Case 'ContractTests.testUnknownKindsAndFieldsSurvive' passed (0.001 seconds)
Test Suite 'ContractTests' passed at 2026-11-14 12:18:16.676
	 Executed 9 tests, with 1 test skipped and 0 failures (0 unexpected) in 0.288 (0.288) seconds
Test Suite 'EndpointTests' started at 2026-11-14 12:18:16.676
Test Case 'EndpointTests.testInboxNotificationsConfigAndIdentityPaths' started at 2026-11-14 12:18:16.676
Test Case 'EndpointTests.testInboxNotificationsConfigAndIdentityPaths' passed (0.001 seconds)
Test Case 'EndpointTests.testInterruptReadAndReactionBodies' started at 2026-11-14 12:18:16.677
Test Case 'EndpointTests.testInterruptReadAndReactionBodies' passed (0.001 seconds)
Test Case 'EndpointTests.testOriginCannotBeReplacedByEndpoint' started at 2026-11-14 12:18:16.678
Test Case 'EndpointTests.testOriginCannotBeReplacedByEndpoint' passed (0.001 seconds)
Test Case 'EndpointTests.testSingleAndGroupSendsAndAllResponses' started at 2026-11-14 12:18:16.679
Test Case 'EndpointTests.testSingleAndGroupSendsAndAllResponses' passed (0.001 seconds)
Test Case 'EndpointTests.testSnapshotAndHistoryURLQueries' started at 2026-11-14 12:18:16.680
Test Case 'EndpointTests.testSnapshotAndHistoryURLQueries' passed (0.001 seconds)
Test Case 'EndpointTests.testUploadAndDownloadsUseRawBytesAndScopedFilePOST' started at 2026-11-14 12:18:16.680
Test Case 'EndpointTests.testUploadAndDownloadsUseRawBytesAndScopedFilePOST' passed (0.001 seconds)
Test Suite 'EndpointTests' passed at 2026-11-14 12:18:16.681
	 Executed 6 tests, with 0 failures (0 unexpected) in 0.004 (0.004) seconds
Test Suite 'LiveStateTests' started at 2026-11-14 12:18:16.681
Test Case 'LiveStateTests.testBotGroupUpdatesOrderingAndDeletes' started at 2026-11-14 12:18:16.681
Test Case 'LiveStateTests.testBotGroupUpdatesOrderingAndDeletes' passed (0.175 seconds)
Test Case 'LiveStateTests.testComputerControlCallAndLatestScreen' started at 2026-11-14 12:18:16.856
Test Case 'LiveStateTests.testComputerControlCallAndLatestScreen' passed (0.001 seconds)
Test Case 'LiveStateTests.testFutureMessagesAndReadBeforeNotify' started at 2026-11-14 12:18:16.857
Test Case 'LiveStateTests.testFutureMessagesAndReadBeforeNotify' passed (0.001 seconds)
Test Case 'LiveStateTests.testMessagesPatchesLeavesAndQueuedConsumption' started at 2026-11-14 12:18:16.858
Test Case 'LiveStateTests.testMessagesPatchesLeavesAndQueuedConsumption' passed (0.048 seconds)
Test Case 'LiveStateTests.testNotificationDeduplicationReadAndReplay' started at 2026-11-14 12:18:16.907
Test Case 'LiveStateTests.testNotificationDeduplicationReadAndReplay' passed (0.001 seconds)
Test Case 'LiveStateTests.testPresenceAndConfigMerging' started at 2026-11-14 12:18:16.907
Test Case 'LiveStateTests.testPresenceAndConfigMerging' passed (0.001 seconds)
Test Case 'LiveStateTests.testRuntimeItemsRequestsAndTurnReset' started at 2026-11-14 12:18:16.908
Test Case 'LiveStateTests.testRuntimeItemsRequestsAndTurnReset' passed (0.002 seconds)
Test Case 'LiveStateTests.testRuntimeStreamingDeduplicationAndFinalMessageReplacement' started at 2026-11-14 12:18:16.910
Test Case 'LiveStateTests.testRuntimeStreamingDeduplicationAndFinalMessageReplacement' passed (0.001 seconds)
Test Case 'LiveStateTests.testSnapshotLoadsTranscriptsQueuesAndControlAndResetsStaleState' started at 2026-11-14 12:18:16.911
Test Case 'LiveStateTests.testSnapshotLoadsTranscriptsQueuesAndControlAndResetsStaleState' passed (0.035 seconds)
Test Case 'LiveStateTests.testSubscriptionOnlyAndUnknownFramesAreCounted' started at 2026-11-14 12:18:16.946
Test Case 'LiveStateTests.testSubscriptionOnlyAndUnknownFramesAreCounted' passed (0.018 seconds)
Test Suite 'LiveStateTests' passed at 2026-11-14 12:18:16.964
	 Executed 10 tests, with 0 failures (0 unexpected) in 0.282 (0.282) seconds
Test Suite 'RequestCardTests' started at 2026-11-14 12:18:16.964
Test Case 'RequestCardTests.testEveryKindAndEveryPriorityPair' started at 2026-11-14 12:18:16.964
Test Case 'RequestCardTests.testEveryKindAndEveryPriorityPair' passed (0.079 seconds)
Test Case 'RequestCardTests.testFalseFlagsAndUnknownFieldUseGeneralApproval' started at 2026-11-14 12:18:17.042
Test Case 'RequestCardTests.testFalseFlagsAndUnknownFieldUseGeneralApproval' passed (0.0 seconds)
Test Suite 'RequestCardTests' passed at 2026-11-14 12:18:17.043
	 Executed 2 tests, with 0 failures (0 unexpected) in 0.079 (0.079) seconds
Test Suite 'SSEParserTests' started at 2026-11-14 12:18:17.043
Test Case 'SSEParserTests.testCRLinesIDResetAndNulIgnored' started at 2026-11-14 12:18:17.043
Test Case 'SSEParserTests.testCRLinesIDResetAndNulIgnored' passed (0.0 seconds)
Test Case 'SSEParserTests.testEOFDiscardsIncompleteAndEventNameResets' started at 2026-11-14 12:18:17.043
Test Case 'SSEParserTests.testEOFDiscardsIncompleteAndEventNameResets' passed (0.0 seconds)
Test Case 'SSEParserTests.testEveryByteBoundaryIncludingUnicodeAndCRLF' started at 2026-11-14 12:18:17.044
Test Case 'SSEParserTests.testEveryByteBoundaryIncludingUnicodeAndCRLF' passed (0.005 seconds)
Test Case 'SSEParserTests.testMalformedJSONUTF8AndSizeLimits' started at 2026-11-14 12:18:17.048
Test Case 'SSEParserTests.testMalformedJSONUTF8AndSizeLimits' passed (0.0 seconds)
Test Case 'SSEParserTests.testMultipleDataLinesCommentsAndConsecutiveEvents' started at 2026-11-14 12:18:17.049
Test Case 'SSEParserTests.testMultipleDataLinesCommentsAndConsecutiveEvents' passed (0.0 seconds)
Test Suite 'SSEParserTests' passed at 2026-11-14 12:18:17.049
	 Executed 5 tests, with 0 failures (0 unexpected) in 0.006 (0.006) seconds
Test Suite 'debug.xctest' passed at 2026-11-14 12:18:17.049
	 Executed 35 tests, with 4 tests skipped and 0 failures (0 unexpected) in 0.663 (0.663) seconds
Test Suite 'All tests' passed at 2026-11-14 12:18:17.049
	 Executed 35 tests, with 4 tests skipped and 0 failures (0 unexpected) in 0.663 (0.663) seconds
◇ Test run started.
↳ Testing Library Version: 6.3.3 (48d727cc1cf4eda)
↳ Target Platform: x86_64-unknown-linux-gnu
✔ Test run with 0 tests in 0 suites passed after 0.001 seconds.
```

末尾 Swift Testing 的 “0 tests” 是该包没有使用 Swift Testing 框架；上面的 XCTest 实际执行数为 35，不能把两者混淆。

其余本机检查：

- `git diff --check`：通过，无输出。
- `rg -n '^import ' mobile/ios/Packages/CryKit/Sources/{CryCore,CryNetLogic,CryRFB} | rg -v 'import Foundation(Networking)?$'`：无命中；只有 Endpoint 的 FoundationNetworking 在 canImport 条件内。
- 按规格 1.5 的完整禁用类型名正则扫描 CryKit 中 struct/enum/class/protocol/typealias 声明：无命中。
- `rg -n 'CRYBOT_LINK_DOMAIN|links\.entitlements|CRYBOT_ENTITLEMENTS_FILE' mobile/ios --glob '!**/.linux-*/**'`：无命中。
- Python/PyYAML 解析 project.yml/mobile.yml，逐个对工作流 run 块执行 `bash -n`：通过；确认只存在一个 build-for-testing 步骤，随后是逐 target 的 test-without-building。
- Python/plistlib 检查两份 entitlements：通过；两份都有共享组，默认文件没有 Associated Domains。
- 对照真实语言包检查 knownRegions 与 CFBundleLocalizations：通过（16 种，差异见第 4 节）。
- 新 Swift/JSON 文件的 URL 主机、IP 和固定 UUID 扫描：通过，URL 只出现 example.com；依赖仓库 URL 是工程配置明确需要的公开 GitHub 地址。
- `git diff --name-only -- mobile/ios/CryBot/*.swift mobile/ios/CryBotWatch mobile/ios/Shared server src`：无输出。

只待 Actions：XcodeGen 生成、App/嵌入式手表编译、CryBotTests 宿主运行、CryBotWatchTests、首次远程解析及锁文件、实际 xcresult 测试数、Public scan 和后续 iOS Linux 工作流。未在本机声称这些通过。

## 3. 覆盖表对应项

当前检出没有 `server/testing/ios-contract/coverage.ts`；以下只列协议解码、往返和归并覆盖，不把依赖它们的页面渲染视作已完成，也未修改该表。

- WireMessage.kind：15 种：`text`, `options`, `activity`, `screen`, `connector`, `secret`, `signin`, `routine.run`, `goal.run`, `burst`, `digest`, `compaction`, `call`, `widget`, `app`。
- ServerFrame：线上 35 种，加 hello/ping/snapshot，共 38 种：`sections`, `bot.queued`, `message`, `message.patch`, `thread`, `bot`, `group`, `notify`, `notifications.read`, `group.deleted`, `routine`, `routine.deleted`, `routine.run`, `webhook`, `webhook.attempt`, `webhook.deleted`, `app-trigger`, `app-trigger.attempt`, `app-trigger.deleted`, `app-trigger.service`, `runtime`, `mcp.changed`, `screen`, `computer`, `computer-control`, `data`, `bot.deleted`, `bots.order`, `groups.order`, `live.call`, `device.job`, `team.presence`, `thread.presence`, `team.people`, `config`, `hello`, `ping`, `snapshot`。
- RuntimeEvent.type：21 种，item.completed 的 tool/assistant_text/assistant_image 三分支均有样本：`session.started`, `session.model-variants`, `session.exited`, `turn.started`, `turn.retrying`, `turn.completed`, `cap.exhausted`, `turn.wait_started`, `turn.wait_ended`, `item.started`, `item.updated`, `item.output`, `turn.progress`, `item.completed`, `content.delta`, `request.opened`, `request.resolved`, `thread.token-usage.updated`, `runtime.error`, `runtime.notice`, `context.compacted`。
- WidgetNode.type：实际 32 种：`Card`, `ListView`, `ListViewItem`, `Box`, `Row`, `Col`, `Form`, `Spacer`, `Divider`, `Table`, `Table.Row`, `Table.Cell`, `Text`, `Title`, `Caption`, `Label`, `Markdown`, `Image`, `Icon`, `Chart`, `Badge`, `Progress`, `Button`, `Select`, `DatePicker`, `TimePicker`, `DayPicker`, `Checkbox`, `RadioGroup`, `Input`, `Textarea`, `Transition`。
- keyof WireMessage（含混入）：`kind`, `textCode`, `textParams`, `helperFollowup`, `helperIntro`, `setupOffer`, `setupChoices`, `setupChoicesPending`, `setupChoicesUpdating`, `wait`, `bugReport`, `roomRequest`, `id`, `role`, `text`, `digest`, `engineCompaction`, `compaction`, `attachments`, `card`, `widget`, `serverCard`, `setupSuggestion`, `setupRequest`, `app`, `fromApp`, `pointed`, `connector`, `secret`, `signIn`, `routineRun`, `burst`, `automation`, `goalRun`, `call`, `tool`, `webhookPost`, `steered`, `aside`, `via`, `callId`, `relayed`, `sender`, `turnId`, `stoppedBy`, `itemId`, `requestMessageId`, `turnSucceeded`, `requestCancelled`, `requestPending`, `turnTerminal`, `turnCompletedAt`, `savedSteps`, `png`, `mime`, `at`, `parentId`, `replyToId`, `sendId`, `channelMode`, `from`, `threadPost`, `peerPost`, `routedBy`, `quickModel`, `doneWhen`, `peerAsk`, `reactions`, `reaction`, `comm`, `relay`, `inbox`, `threadRef`, `sentDirectly`, `publishedPage`, `dataResult`, `dataContext`, `queued`, `queueId`。
- keyof OptionCardData（含混入）：`waitRequest`, `computerAsk`, `accessRequest`, `outsideWrite`, `lendingLift`, `outboundRequest`, `teamMemoryRequest`, `title`, `subtitle`, `summaryCode`, `summaryParams`, `options`, `requestType`, `answered`, `answeredText`, `dismissed`, `answeredBy`, `requestId`, `tool`, `held`, `expired`, `stopped`, `heldCode`, `allowKey`, `allowSession`, `commandAllowlist`, `approvalScope`, `autoApplied`, `undone`, `routineRequest`, `webhookRequest`, `appTriggerRequest`, `profileRequest`, `modelRequest`, `teamSetupRequest`, `mcpRequest`, `skillRequest`, `questionRequest`, `fixedOptions`, `quotaSwitch`, `yourComputer`。
- PanelPageID：规格入口表对应的 26 个 PageId，未知值往返保留。
- SettingsPageID：overview、phone、ai、bots、desktops、vault、usage、transfer、data、people、installations、account、plan、app、general、appearance。
- 规格 4.2 中所有标记为 LiveState 归并的帧；其余帧按 kind 计数。presence 按线上 team.presence、thread.presence、team.people 处理。
- RequestCardKind：23 种分类，含 17 种请求卡；优先级逐对测试，终态标记分别测试。

## 4. 协调者需要处理的事

**依赖版本待联网核对，未安装任何新依赖。** CryKit 没有远程依赖；以下仅配置到 App 工程：

| 包 | 锁定版本 | App 产品 |
| --- | --- |
| apple/swift-markdown | 0.6.0 | Markdown |
| mgriebling/SwiftMath | 1.7.1 | SwiftMath |
| appstefan/HighlightSwift | 1.0.5 | HighlightSwift |
| livekit/client-sdk-swift | 2.5.0 | LiveKit |
| livekit/webrtc-xcframework | 125.6422.06 | LiveKitWebRTC |

LiveKitWebRTC 按 LiveKit 的配套包显式列为独立 package/product，没有把它当作 client-sdk-swift 自身导出的产品。它属于规格第 10 节允许的 LiveKit/WebRTC 依赖范围，但比正文的“四个远程包”多一条显式包声明。沙箱禁网，未核实这些 tag 是否存在、LiveKit 2.5.0 所需 WebRTC exact 版本是否与此一致；协调者必须优先核对，必要时同时调整两项 exactVersion 后再收取锁文件。不能把目前工程配置视为远程依赖已解析成功。

`project.yml` 所需行已落地，无额外待追加行；后续若核对依赖需调整，应经规格 1.3 的协调者通道。App 入口签名未改。

首次推分支并开草稿 PR，收取 `Mobile builds` 的 `package-resolved` 产物，提交为 `mobile/ios/Package.resolved`；后续 workflow 复制锁文件并启用 `-disableAutomaticPackageResolution`。本任务未生成或伪造锁文件，也没有运行链接。请协调者补充 Mobile builds、后续 iOS Linux/Public scan 的运行链接和实际测试计数。

App Links 已按 T-1220 的约定名称落地：全局 `CRYBOT_APP_LINK_HOST: ""`、`CRYBOT_IOS_ENTITLEMENTS: CryBot/CryBot.entitlements`，CryBot 的 `CODE_SIGN_ENTITLEMENTS: $(CRYBOT_IOS_ENTITLEMENTS)`，以及 Info.plist 同名 host 键。两份文件均有 `$(AppIdentifierPrefix)com.crysound.crybot.shared`；AppLinks 文件另有 applinks/webcredentials。默认没有启用 Associated Domains，未搬 ViewController.swift 回调改动。发版选择 AppLinks 文件、描述文件和后台能力仍由协调者处理。

**源码数量与任务文案的差异：** widget SPECS 实际 32 项，已全部实现；src/locales/*.json 实际 17 个文件，但 source-hashes.json 是元数据，不是语言包，locales/index.ts 与 shared/languages.ts 均只登记 16 种语言。没有凭空声明第 17 种语言。请确认是否另有尚未合并的语言包；当前映射如下：

| 源文件 | Apple 语言代码 |
| --- | --- |
| `de.json` | `de` |
| `en.json` | `en` |
| `es.json` | `es` |
| `fr.json` | `fr` |
| `hi.json` | `hi` |
| `it.json` | `it` |
| `ja.json` | `ja` |
| `ko.json` | `ko` |
| `pl.json` | `pl` |
| `pt-br.json` | `pt-BR` |
| `ru.json` | `ru` |
| `tr.json` | `tr` |
| `uk.json` | `uk` |
| `vi.json` | `vi` |
| `zh-tw.json` | `zh-Hant` |
| `zh.json` | `zh-Hans` |

任务 00 的真实契约索引尚未出现。目前读取数组索引或带 fixtures/samples/entries 的索引对象，样本路径支持 file/path，未知 swiftType 必失败。合并 00 后需实跑真实样本，并根据其最终索引合同核对；本任务没有写入该目录。

没有超范围业务改动；本报告是指定输出。仍未解决的是上面列明的离线依赖核对、语言数量差异和 Actions/真实契约验证，不涉及已跑通的 Linux 协议逻辑。
