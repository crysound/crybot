# T-1221-43 Linux 自测通道

## 第 1 轮（2026-11-15）

分支：`T-1221-linux-selftest`。报告路径由 `<tools>/task-paths report T-1221-linux-selftest` 算得；工具不在默认 PATH，使用已有工具的绝对路径。规格读取 main 上的 `docs/specs/2026-11-14-ios-native.md`，重点核对第 1、1.4、1.5、2、8、8.1、8.5、11 节。没有 git 提交，没有安装依赖，没有访问网络或启动服务。

实现已写入允许范围；完整验收尚未达到：当前工作区生成文案过期，且 CryRFB 仍只有跳过的占位测试。没有 Xcode/macOS 或 Actions 运行链接，本报告不声称 App 编译或 Actions 测试通过。

### 1. 文件变更

- `mobile/ios/Packages/CryKit/Package.swift`：只追加一个 `#if os(Linux)` 条件块，移除 CryNet 产品和 CryNet、CryNetTests target，原有包定义不变。
- `mobile/ios/scripts/linux-test.sh`：配置工作区内 HOME、各项 Swift/Clang 缓存及临时目录，完整运行 Linux SwiftPM 测试，缺少 Swift 返回 2。
- `mobile/ios/scripts/linux-check.sh`：逐文件语法检查、构建 CryCore、逐功能 Logic 目录类型检查、命名检查和文案检查，保留诊断并汇总失败。
- `mobile/ios/scripts/check-type-names.mjs`：无运行时依赖的 Node 扫描器，检查规格完整禁用名单和 Markdown/SwiftUI 同文件导入，输出文件行列。
- `mobile/ios/scripts/check-type-names.test.mjs`：13 项行为测试，覆盖声明/导入、注释和字符串、CLI、缓存参数、缺少工具、失败传播、Logic 文件分组、空目录及 workflow 调度。
- `.github/workflows/ios-linux.yml`：新增 ubuntu-24.04 PR 通道，运行 Swift 版本、两个脚本和本任务及 04 的所有 Node 测试，依赖按仓库锁文件安装。
- `mobile/ios/scripts/README-linux.md`：记录 PATH、运行方法、缓存布局、检查范围和常见错误。
- `mobile/ios/.gitignore`：已包含 `.linux-build/` 和 `.linux-cache/`，通过 `git check-ignore` 核对，没有重复修改。

未修改 `Sources/**`、`Tests/**`、CryBot 源码/资源、project.yml、现有 workflow、服务端或网页代码；隔离验证副本都在被忽略的 `.linux-cache/` 内。

### 2. 验证命令与结果

本机为禁网 Linux 沙箱，Swift 6.3.3、Node v22.22.1，使用协调者链接好的 node_modules。Actions 配置使用 Node 24。`docs/verification/README.md` 在本 worktree 中不存在；本任务不涉及服务端或会话行为，所有新增验证均用本地隔离夹具，不触碰用户应用或数据。

| 命令 | 本地观测 |
| --- | --- |
| `swift --version` | Swift 6.3.3，x86_64-unknown-linux-gnu；原始输出见下 |
| `mobile/ios/scripts/linux-test.sh` | 退出 0；XCTest 日志共 69 项、跳过 1 项、失败 0 项；CryCoreTests 44 项、CryNetLogicTests 24 项、CryRFBTests 1 项占位且跳过 |
| `mobile/ios/scripts/linux-check.sh` | 退出 1；152 个 Swift 文件执行语法检查，114 个文件命名扫描无错误；Features 下当前没有 Logic Swift 文件，明确汇总 0；文案过期导致唯一失败 |
| `node --test mobile/ios/scripts/*.test.mjs` | 退出 0；当前沙箱默认隔离模式显示 3 个测试文件的结果 |
| `node --experimental-test-isolation=none --test mobile/ios/scripts/*.test.mjs` | 退出 0；展开结果为 34 项，失败 0、跳过 0：本任务 13 项、gen-strings 8 项、workflows 13 项 |
| `bash -n mobile/ios/scripts/linux-test.sh mobile/ios/scripts/linux-check.sh` | 退出 0 |
| `git diff --check` | 退出 0 |
| `git check-ignore mobile/ios/.linux-build mobile/ios/.linux-cache` | 两个目录均被忽略 |

`linux-check.sh` 的文案失败来自既有 `mobile/ios/CryBot/Strings/ServerText.xcstrings`：当前 394 个键，生成器预期 396 个，缺少 `serverError.secret.saving`、`serverError.secret.screenUnavailable`，没有其他键内容差异。这是禁止修改范围内的生成文件，因此未在工作区更新，也未绕过 `--check`。 <!-- public-scan: allow domain -->

为验证当前空缺的 Logic 路径，另复制 iOS 输入及 locales、shared/server-text 到 `.linux-cache/integration/repository/`，仅在副本运行文案生成器，并添加两个互相引用且 import CryCore、使用 JSONValue 的 Logic 文件。用真实 Swift 编译器执行同一 `linux-check.sh`；详见下面原始输出和负例结果。这个副本的结果不能替代原工作区文案失败的结果。 <!-- public-scan: allow domain -->

缓存前后对比：新增 0 项，`~/.swiftpm` 完全无差异；`~/.cache` 中只发现 security-review 临时目录及两文件消失，以及其父目录时间变化。Swift/SwiftPM 缓存路径无变化，不能把该观测写成整个用户缓存目录完全未变，详见文末。

Linux 的 Package.swift 分支已由真实 SwiftPM 使用；macOS 的分支只做了差异审查（条件块之外零改动），仍须等 `Mobile builds` 验证。`iOS Linux`、`Mobile builds`、`Public scan` 的 Actions 状态和运行链接由协调者补充。

### 3. 覆盖表

`server/testing/ios-contract/coverage.ts` 中本任务新完成的条目：无。该表登记协议和功能覆盖，没有任务 43/Linux 通道条目；本任务提供检查基础设施，不改变任何功能项的状态，也未修改该文件。

### 4. 需要协调者处理

1. 在允许修改生成资源的任务中运行 `node mobile/ios/scripts/gen-strings.mjs`，更新 `mobile/ios/CryBot/Strings/ServerText.xcstrings`，随后重跑 `linux-check.sh`。当前 PR 的 iOS Linux 文案检查会如实报错，不能报绿。 <!-- public-scan: allow domain -->
2. 集成并行任务 34 的 CryRFB 实现后，重跑三个 target，确认 CryRFBTests 有实际执行且非跳过的测试；本任务没有对它加过滤或特殊处理。
3. 推分支、开草稿 PR，补齐 `Mobile builds`、`iOS Linux` 和 `Public scan`（对应 workflow 合并后）的运行链接；本机无法验证 Apple 平台编译或 GitHub Actions。
4. 无新依赖、无 project.yml 新增行、无入口签名修改。测试复用现有开发依赖 `yaml`（本机 2.9.0），没有自行安装。

### 原始输出

以下日志为重定向合并 stdout/stderr 后直接嵌入，未删改；退出码另列。

#### `swift --version`（退出 0）

```text
Swift version 6.3.3 (swift-6.3.3-RELEASE)
Target: x86_64-unknown-linux-gnu
```

#### `mobile/ios/scripts/linux-test.sh`（退出 0）

```text
Building for debugging...
[0/22] Write sources
[6/22] Copying Fixtures
[7/22] Write swift-version-6F7309784324DD2.txt
[9/46] Emitting module CryCore
[10/67] Emitting module CryRFB
[11/67] Compiling CryRFB Placeholder.swift
[13/70] Compiling CryRFBTests Placeholder.swift
[14/70] Emitting module CryRFBTests
[15/71] Wrapping AST for CryRFB for debugging
[16/71] Wrapping AST for CryRFBTests for debugging
[18/71] Compiling CryCore EnvironmentModels.swift
[19/71] Compiling CryCore FirstReplyRescueModels.swift
[20/71] Compiling CryCore GroupGoalRunModels.swift
[21/71] Compiling CryCore HelperFollowupModels.swift
[22/71] Compiling CryCore ImageGenerationModels.swift
[23/71] Compiling CryCore InboxModels.swift
[24/71] Compiling CryCore JSONValue.swift
[25/71] Compiling CryCore LimitResetModels.swift
[26/71] Compiling CryCore LiveCallWireModels.swift
[27/71] Compiling CryCore LiveState.swift
[28/71] Compiling CryCore McpRequestModels.swift
[29/71] Compiling CryCore ModelRequestModels.swift
[30/71] Compiling CryCore NotificationModels.swift
[31/71] Compiling CryCore OnboardingModels.swift
[32/71] Compiling CryCore PhoneAppsModels.swift
[33/71] Compiling CryCore PlaceBannerModels.swift
[34/71] Compiling CryCore PlaceViewModels.swift
[35/71] Compiling CryCore ProfileRequestModels.swift
[36/71] Compiling CryCore PublishedPageModels.swift
[37/71] Compiling CryCore ReplyStyleModels.swift
[38/71] Compiling CryCore RoutineRequestModels.swift
[39/91] Compiling CryCore AdditionalTypesModels.swift
[40/91] Compiling CryCore AppModels.swift
[41/91] Compiling CryCore AppTriggersModels.swift
[42/91] Compiling CryCore ApprovalModeModels.swift
[43/91] Compiling CryCore AskQuestionModels.swift
[44/91] Compiling CryCore BotAccessModels.swift
[45/91] Compiling CryCore BotAvatarModels.swift
[46/91] Compiling CryCore BurstModels.swift
[47/91] Compiling CryCore CommandAllowlistModels.swift
[48/91] Compiling CryCore ComputerAskModels.swift
[49/91] Compiling CryCore ConfigStatusModels.swift
[50/91] Compiling CryCore ConnectorCardModels.swift
[51/91] Compiling CryCore CoreAPIModels.swift
[52/91] Compiling CryCore CoreTypes.swift
[53/91] Compiling CryCore CredentialRequestModels.swift
[54/91] Compiling CryCore DataSurfaceModels.swift
[55/91] Compiling CryCore DefaultBotModels.swift
[56/91] Compiling CryCore DevsReportStatusModels.swift
[57/91] Compiling CryCore DigestModels.swift
[58/91] Compiling CryCore EmailModels.swift
[59/91] Compiling CryCore Endpoint.swift
[60/91] Compiling CryCore RoutineRunModels.swift
[61/91] Compiling CryCore RoutinesModels.swift
[62/91] Compiling CryCore RuntimeEventAccess.swift
[63/91] Compiling CryCore RuntimeEventsModels.swift
[64/91] Compiling CryCore SSEParser.swift
[65/91] Compiling CryCore SavedStepsModels.swift
[66/91] Compiling CryCore ServerTextModels.swift
[67/91] Compiling CryCore SessionsModels.swift
[68/91] Compiling CryCore SkillRequestModels.swift
[69/91] Compiling CryCore TeamSetupModels.swift
[70/91] Compiling CryCore ToolScopeModels.swift
[71/91] Compiling CryCore Transport.swift
[72/91] Compiling CryCore TurnProgressModels.swift
[73/91] Compiling CryCore WaitRequestModels.swift
[74/91] Compiling CryCore WebhookRequestModels.swift
[75/91] Compiling CryCore WebhooksModels.swift
[76/91] Compiling CryCore WidgetModels.swift
[77/91] Compiling CryCore WidgetNodeModels.swift
[78/91] Compiling CryCore WireMessageAccess.swift
[79/91] Compiling CryCore WireModels.swift
[81/101] Emitting module CryNetLogic
[82/104] Emitting module CryCoreTests
[83/107] Compiling CryNetLogic CallbackRouter.swift
[84/107] Compiling CryNetLogic PairingInvite.swift
[85/107] Compiling CryNetLogic ReconnectState.swift
[86/107] Compiling CryNetLogic SessionPolicy.swift
[87/107] Compiling CryCoreTests SSEParserTests.swift
[88/107] Compiling CryCoreTests WireMessageStackTests.swift
[89/108] Wrapping AST for CryCore for debugging
[93/108] Compiling CryCoreTests resource_bundle_accessor.swift
[94/111] Emitting module CryNetLogicTests
[95/112] Compiling CryNetLogicTests CallbackTests.swift
[96/112] Compiling CryNetLogicTests ReconnectTests.swift
[97/112] Compiling CryNetLogicTests SessionTests.swift
[98/113] Wrapping AST for CryNetLogic for debugging
[99/113] Wrapping AST for CryNetLogicTests for debugging
[105/114] <repo>/mobile/ios/.linux-build/x86_64-unknown-linux-gnu/debug/CryKitPackageDiscoveredTests.derived/all-discovered-tests.swift
[106/114] Write sources
[107/114] Wrapping AST for CryCoreTests for debugging
[109/117] Compiling CryKitPackageDiscoveredTests CryCoreTests.swift
[110/117] Compiling CryKitPackageDiscoveredTests CryNetLogicTests.swift
[111/117] Emitting module CryKitPackageDiscoveredTests
[112/119] Compiling CryKitPackageDiscoveredTests CryRFBTests.swift
[113/119] Compiling CryKitPackageDiscoveredTests all-discovered-tests.swift
[114/120] <repo>/mobile/ios/.linux-build/x86_64-unknown-linux-gnu/debug/CryKitPackageTests.derived/runner.swift
[115/120] Write sources
[116/122] Wrapping AST for CryKitPackageDiscoveredTests for debugging
[118/122] Emitting module CryKitPackageTests
[119/122] Compiling CryKitPackageTests runner.swift
[120/123] Wrapping AST for CryKitPackageTests for debugging
[121/123] Write Objects.LinkFileList
[122/123] Linking CryKitPackageTests.xctest
Build complete! (38.04s)
Test Suite 'All tests' started at 2026-11-15 00:26:30.051
Test Suite 'debug.xctest' started at 2026-11-15 00:26:30.069
Test Suite 'CallbackTests' started at 2026-11-15 00:26:30.069
Test Case 'CallbackTests.testBase64AndJWTExpiry' started at 2026-11-15 00:26:30.069
Test Case 'CallbackTests.testBase64AndJWTExpiry' passed (0.004 seconds)
Test Case 'CallbackTests.testBothHandoffEntrancesDispatchThroughRegistry' started at 2026-11-15 00:26:30.074
Test Case 'CallbackTests.testBothHandoffEntrancesDispatchThroughRegistry' passed (0.002 seconds)
Test Case 'CallbackTests.testCallbackModeFourCombinations' started at 2026-11-15 00:26:30.075
Test Case 'CallbackTests.testCallbackModeFourCombinations' passed (0.0 seconds)
Test Case 'CallbackTests.testMismatchedStateIsIgnoredBeforeVersionDispatch' started at 2026-11-15 00:26:30.076
Test Case 'CallbackTests.testMismatchedStateIsIgnoredBeforeVersionDispatch' passed (0.001 seconds)
Test Case 'CallbackTests.testParametersRejectDuplicatesAndNeverDescribePayload' started at 2026-11-15 00:26:30.077
Test Case 'CallbackTests.testParametersRejectDuplicatesAndNeverDescribePayload' passed (0.0 seconds)
Test Case 'CallbackTests.testRouterMatchesHostAndExactEncodedPath' started at 2026-11-15 00:26:30.077
Test Case 'CallbackTests.testRouterMatchesHostAndExactEncodedPath' passed (0.0 seconds)
Test Case 'CallbackTests.testVersionDispatchAndUnknownVersionError' started at 2026-11-15 00:26:30.077
Test Case 'CallbackTests.testVersionDispatchAndUnknownVersionError' passed (0.0 seconds)
Test Suite 'CallbackTests' passed at 2026-11-15 00:26:30.078
	 Executed 7 tests, with 0 failures (0 unexpected) in 0.009 (0.009) seconds
Test Suite 'ReconnectTests' started at 2026-11-15 00:26:30.078
Test Case 'ReconnectTests.testBackoffAndPingReset' started at 2026-11-15 00:26:30.078
Test Case 'ReconnectTests.testBackoffAndPingReset' passed (0.0 seconds)
Test Case 'ReconnectTests.testFortySecondsWithoutFrame' started at 2026-11-15 00:26:30.078
Test Case 'ReconnectTests.testFortySecondsWithoutFrame' passed (0.101 seconds)
Test Case 'ReconnectTests.testParserAndStatePreserveEachFrameCursor' started at 2026-11-15 00:26:30.179
Test Case 'ReconnectTests.testParserAndStatePreserveEachFrameCursor' passed (0.003 seconds)
Test Case 'ReconnectTests.testResumedHelloNeverSkipsReplay' started at 2026-11-15 00:26:30.181
Test Case 'ReconnectTests.testResumedHelloNeverSkipsReplay' passed (0.001 seconds)
Test Case 'ReconnectTests.testSnapshotCursorCommitsOnlyAfterSnapshotAndKeepsNewerFrames' started at 2026-11-15 00:26:30.182
Test Case 'ReconnectTests.testSnapshotCursorCommitsOnlyAfterSnapshotAndKeepsNewerFrames' passed (0.0 seconds)
Test Suite 'ReconnectTests' passed at 2026-11-15 00:26:30.182
	 Executed 5 tests, with 0 failures (0 unexpected) in 0.104 (0.104) seconds
Test Suite 'SessionTests' started at 2026-11-15 00:26:30.182
Test Case 'SessionTests.testCFFieldsRoundTripAndRedactedDescription' started at 2026-11-15 00:26:30.182
Test Case 'SessionTests.testCFFieldsRoundTripAndRedactedDescription' passed (0.002 seconds)
Test Case 'SessionTests.testCookieRotationWithCombinedHeadersAndExpiryComma' started at 2026-11-15 00:26:30.184
Test Case 'SessionTests.testCookieRotationWithCombinedHeadersAndExpiryComma' passed (0.006 seconds)
Test Case 'SessionTests.testCookieWithoutExpiryRetainsSessionDeadline' started at 2026-11-15 00:26:30.190
Test Case 'SessionTests.testCookieWithoutExpiryRetainsSessionDeadline' passed (0.0 seconds)
Test Case 'SessionTests.testExpiryByMethod' started at 2026-11-15 00:26:30.190
Test Case 'SessionTests.testExpiryByMethod' passed (0.0 seconds)
Test Case 'SessionTests.testHeadersWithAndWithoutCF' started at 2026-11-15 00:26:30.190
Test Case 'SessionTests.testHeadersWithAndWithoutCF' passed (0.0 seconds)
Test Case 'SessionTests.testMethodsAndOptionalCFEncoding' started at 2026-11-15 00:26:30.191
Test Case 'SessionTests.testMethodsAndOptionalCFEncoding' passed (0.001 seconds)
Test Case 'SessionTests.testPairingLinkUsesOneTimeTokenAndRefusesUnsupportedRoutes' started at 2026-11-15 00:26:30.191
Test Case 'SessionTests.testPairingLinkUsesOneTimeTokenAndRefusesUnsupportedRoutes' passed (0.001 seconds)
Test Case 'SessionTests.testResponseExpiryRules' started at 2026-11-15 00:26:30.192
Test Case 'SessionTests.testResponseExpiryRules' passed (0.0 seconds)
Test Case 'SessionTests.testServerNormalizationAndBuildSettings' started at 2026-11-15 00:26:30.192
Test Case 'SessionTests.testServerNormalizationAndBuildSettings' passed (0.001 seconds)
Test Case 'SessionTests.testUnknownVersionsRetainServerButDiscardCredentials' started at 2026-11-15 00:26:30.193
Test Case 'SessionTests.testUnknownVersionsRetainServerButDiscardCredentials' passed (0.001 seconds)
Test Case 'SessionTests.testVersionTwoAndUnknownMethodRoundTrip' started at 2026-11-15 00:26:30.193
Test Case 'SessionTests.testVersionTwoAndUnknownMethodRoundTrip' passed (0.101 seconds)
Test Case 'SessionTests.testWebSocketURLPreservesAPIOriginPortPrefixAndEscapedPath' started at 2026-11-15 00:26:30.294
Test Case 'SessionTests.testWebSocketURLPreservesAPIOriginPortPrefixAndEscapedPath' passed (0.001 seconds)
Test Suite 'SessionTests' passed at 2026-11-15 00:26:30.295
	 Executed 12 tests, with 0 failures (0 unexpected) in 0.112 (0.112) seconds
Test Suite 'ContractTests' started at 2026-11-15 00:26:30.295
Test Case 'ContractTests.testComparatorDetectsDroppedChangedAndAddedValues' started at 2026-11-15 00:26:30.295
Test Case 'ContractTests.testComparatorDetectsDroppedChangedAndAddedValues' passed (0.001 seconds)
Test Case 'ContractTests.testEveryKnownUnionCaseUsesTypedDecoding' started at 2026-11-15 00:26:30.296
Test Case 'ContractTests.testEveryKnownUnionCaseUsesTypedDecoding' passed (0.186 seconds)
Test Case 'ContractTests.testJSONNumbersRetainLargeIntegersAndDecimals' started at 2026-11-15 00:26:30.482
Test Case 'ContractTests.testJSONNumbersRetainLargeIntegersAndDecimals' passed (0.001 seconds)
Test Case 'ContractTests.testMalformedMessagesDoNotDiscardThreadOrSnapshot' started at 2026-11-15 00:26:30.482
Test Case 'ContractTests.testMalformedMessagesDoNotDiscardThreadOrSnapshot' passed (0.06 seconds)
Test Case 'ContractTests.testManualRoundTrips' started at 2026-11-15 00:26:30.543
Test Case 'ContractTests.testManualRoundTrips' passed (0.228 seconds)
Test Case 'ContractTests.testNestedIgnoredKeysAreScopedToDeclaringModel' started at 2026-11-15 00:26:30.771
Test Case 'ContractTests.testNestedIgnoredKeysAreScopedToDeclaringModel' passed (0.002 seconds)
Test Case 'ContractTests.testPanelAndSettingsUnknownValues' started at 2026-11-15 00:26:30.773
Test Case 'ContractTests.testPanelAndSettingsUnknownValues' passed (0.0 seconds)
Test Case 'ContractTests.testRequiredFieldsAndKnownFieldTypesAreChecked' started at 2026-11-15 00:26:30.773
Test Case 'ContractTests.testRequiredFieldsAndKnownFieldTypesAreChecked' passed (0.001 seconds)
Test Case 'ContractTests.testServerContract' started at 2026-11-15 00:26:30.774
Test Case 'ContractTests.testServerContract' passed (0.21 seconds)
Test Case 'ContractTests.testTypedConstructorsMatchDecodedValuesAndExposeOptionalFields' started at 2026-11-15 00:26:30.984
Test Case 'ContractTests.testTypedConstructorsMatchDecodedValuesAndExposeOptionalFields' passed (0.001 seconds)
Test Case 'ContractTests.testUnknownKindsAndFieldsSurvive' started at 2026-11-15 00:26:30.985
Test Case 'ContractTests.testUnknownKindsAndFieldsSurvive' passed (0.002 seconds)
Test Suite 'ContractTests' passed at 2026-11-15 00:26:30.986
	 Executed 11 tests, with 0 failures (0 unexpected) in 0.691 (0.691) seconds
Test Suite 'EndpointTests' started at 2026-11-15 00:26:30.986
Test Case 'EndpointTests.testInboxNotificationsConfigAndIdentityPaths' started at 2026-11-15 00:26:30.986
Test Case 'EndpointTests.testInboxNotificationsConfigAndIdentityPaths' passed (0.001 seconds)
Test Case 'EndpointTests.testInterruptReadAndReactionBodies' started at 2026-11-15 00:26:30.987
Test Case 'EndpointTests.testInterruptReadAndReactionBodies' passed (0.0 seconds)
Test Case 'EndpointTests.testOriginCannotBeReplacedByEndpoint' started at 2026-11-15 00:26:30.987
Test Case 'EndpointTests.testOriginCannotBeReplacedByEndpoint' passed (0.001 seconds)
Test Case 'EndpointTests.testQueryEncodingMatchesURIComponent' started at 2026-11-15 00:26:30.988
Test Case 'EndpointTests.testQueryEncodingMatchesURIComponent' passed (0.0 seconds)
Test Case 'EndpointTests.testSingleAndGroupSendsAndAllResponses' started at 2026-11-15 00:26:30.989
Test Case 'EndpointTests.testSingleAndGroupSendsAndAllResponses' passed (0.001 seconds)
Test Case 'EndpointTests.testSnapshotAndHistoryURLQueries' started at 2026-11-15 00:26:30.990
Test Case 'EndpointTests.testSnapshotAndHistoryURLQueries' passed (0.0 seconds)
Test Case 'EndpointTests.testUploadAndDownloadsUseRawBytesAndScopedFilePOST' started at 2026-11-15 00:26:30.990
Test Case 'EndpointTests.testUploadAndDownloadsUseRawBytesAndScopedFilePOST' passed (0.0 seconds)
Test Suite 'EndpointTests' passed at 2026-11-15 00:26:30.991
	 Executed 7 tests, with 0 failures (0 unexpected) in 0.004 (0.004) seconds
Test Suite 'LiveStateTests' started at 2026-11-15 00:26:30.991
Test Case 'LiveStateTests.testBotGroupUpdatesOrderingAndDeletes' started at 2026-11-15 00:26:30.991
Test Case 'LiveStateTests.testBotGroupUpdatesOrderingAndDeletes' passed (0.144 seconds)
Test Case 'LiveStateTests.testComputerControlCallAndLatestScreen' started at 2026-11-15 00:26:31.135
Test Case 'LiveStateTests.testComputerControlCallAndLatestScreen' passed (0.101 seconds)
Test Case 'LiveStateTests.testFutureMessagesAndReadBeforeNotify' started at 2026-11-15 00:26:31.236
Test Case 'LiveStateTests.testFutureMessagesAndReadBeforeNotify' passed (0.001 seconds)
Test Case 'LiveStateTests.testLoadConfigInitializesAndReplacesAllFields' started at 2026-11-15 00:26:31.237
Test Case 'LiveStateTests.testLoadConfigInitializesAndReplacesAllFields' passed (0.031 seconds)
Test Case 'LiveStateTests.testLoadNotificationsMergesLiveEntriesAndServerReadState' started at 2026-11-15 00:26:31.268
Test Case 'LiveStateTests.testLoadNotificationsMergesLiveEntriesAndServerReadState' passed (0.003 seconds)
Test Case 'LiveStateTests.testMessagesPatchesLeavesAndQueuedConsumption' started at 2026-11-15 00:26:31.271
Test Case 'LiveStateTests.testMessagesPatchesLeavesAndQueuedConsumption' passed (0.047 seconds)
Test Case 'LiveStateTests.testNotificationDeduplicationReadAndReplay' started at 2026-11-15 00:26:31.317
Test Case 'LiveStateTests.testNotificationDeduplicationReadAndReplay' passed (0.001 seconds)
Test Case 'LiveStateTests.testPresenceAndConfigReplacement' started at 2026-11-15 00:26:31.318
Test Case 'LiveStateTests.testPresenceAndConfigReplacement' passed (0.001 seconds)
Test Case 'LiveStateTests.testRuntimeItemsRequestsAndTurnReset' started at 2026-11-15 00:26:31.319
Test Case 'LiveStateTests.testRuntimeItemsRequestsAndTurnReset' passed (0.002 seconds)
Test Case 'LiveStateTests.testRuntimeStreamingDeduplicationAndFinalMessageReplacement' started at 2026-11-15 00:26:31.320
Test Case 'LiveStateTests.testRuntimeStreamingDeduplicationAndFinalMessageReplacement' passed (0.001 seconds)
Test Case 'LiveStateTests.testSnapshotLoadsTranscriptsQueuesAndControlAndResetsStaleState' started at 2026-11-15 00:26:31.322
Test Case 'LiveStateTests.testSnapshotLoadsTranscriptsQueuesAndControlAndResetsStaleState' passed (0.035 seconds)
Test Case 'LiveStateTests.testSnapshotPreservesCallComputerAndScreen' started at 2026-11-15 00:26:31.357
Test Case 'LiveStateTests.testSnapshotPreservesCallComputerAndScreen' passed (0.032 seconds)
Test Case 'LiveStateTests.testSubscriptionOnlyAndUnknownFramesAreCounted' started at 2026-11-15 00:26:31.389
Test Case 'LiveStateTests.testSubscriptionOnlyAndUnknownFramesAreCounted' passed (0.019 seconds)
Test Suite 'LiveStateTests' passed at 2026-11-15 00:26:31.408
	 Executed 13 tests, with 0 failures (0 unexpected) in 0.417 (0.417) seconds
Test Suite 'RequestCardTests' started at 2026-11-15 00:26:31.408
Test Case 'RequestCardTests.testAppliedAndUndoneRequireAllowedUnheldAutoApplication' started at 2026-11-15 00:26:31.408
Test Case 'RequestCardTests.testAppliedAndUndoneRequireAllowedUnheldAutoApplication' passed (0.901 seconds)
Test Case 'RequestCardTests.testEveryKindAndEveryPriorityPair' started at 2026-11-15 00:26:32.309
Test Case 'RequestCardTests.testEveryKindAndEveryPriorityPair' passed (0.095 seconds)
Test Case 'RequestCardTests.testFalseFlagsAndUnknownFieldUseGeneralApproval' started at 2026-11-15 00:26:32.404
Test Case 'RequestCardTests.testFalseFlagsAndUnknownFieldUseGeneralApproval' passed (0.0 seconds)
Test Suite 'RequestCardTests' passed at 2026-11-15 00:26:32.405
	 Executed 3 tests, with 0 failures (0 unexpected) in 0.996 (0.996) seconds
Test Suite 'SSEParserTests' started at 2026-11-15 00:26:32.405
Test Case 'SSEParserTests.testCRLinesIDResetAndNulIgnored' started at 2026-11-15 00:26:32.405
Test Case 'SSEParserTests.testCRLinesIDResetAndNulIgnored' passed (0.0 seconds)
Test Case 'SSEParserTests.testEOFDiscardsIncompleteAndEventNameResets' started at 2026-11-15 00:26:32.405
Test Case 'SSEParserTests.testEOFDiscardsIncompleteAndEventNameResets' passed (0.0 seconds)
Test Case 'SSEParserTests.testEveryByteBoundaryIncludingUnicodeAndCRLF' started at 2026-11-15 00:26:32.405
Test Case 'SSEParserTests.testEveryByteBoundaryIncludingUnicodeAndCRLF' passed (0.006 seconds)
Test Case 'SSEParserTests.testGoodBadGoodFramesInOneChunk' started at 2026-11-15 00:26:32.411
Test Case 'SSEParserTests.testGoodBadGoodFramesInOneChunk' passed (0.0 seconds)
Test Case 'SSEParserTests.testIncompleteEventDoesNotCommitID' started at 2026-11-15 00:26:32.412
Test Case 'SSEParserTests.testIncompleteEventDoesNotCommitID' passed (0.0 seconds)
Test Case 'SSEParserTests.testMalformedEventsRecoverAtEveryChunkBoundary' started at 2026-11-15 00:26:32.412
Test Case 'SSEParserTests.testMalformedEventsRecoverAtEveryChunkBoundary' passed (0.024 seconds)
Test Case 'SSEParserTests.testMalformedJSONUTF8AndSizeLimits' started at 2026-11-15 00:26:32.436
Test Case 'SSEParserTests.testMalformedJSONUTF8AndSizeLimits' passed (0.0 seconds)
Test Case 'SSEParserTests.testMultipleDataLinesCommentsAndConsecutiveEvents' started at 2026-11-15 00:26:32.436
Test Case 'SSEParserTests.testMultipleDataLinesCommentsAndConsecutiveEvents' passed (0.001 seconds)
Test Suite 'SSEParserTests' passed at 2026-11-15 00:26:32.437
	 Executed 8 tests, with 0 failures (0 unexpected) in 0.032 (0.032) seconds
Test Suite 'WireMessageStackTests' started at 2026-11-15 00:26:32.437
Test Case 'WireMessageStackTests.testDetachedRoundTripOfLargeMessageCollections' started at 2026-11-15 00:26:32.437
Test Case 'WireMessageStackTests.testDetachedRoundTripOfLargeMessageCollections' passed (0.35 seconds)
Test Case 'WireMessageStackTests.testFixedStackRoundTripOfLargeMessageCollections' started at 2026-11-15 00:26:32.787
Test Case 'WireMessageStackTests.testFixedStackRoundTripOfLargeMessageCollections' passed (0.342 seconds)
Test Suite 'WireMessageStackTests' passed at 2026-11-15 00:26:33.129
	 Executed 2 tests, with 0 failures (0 unexpected) in 0.692 (0.692) seconds
Test Suite 'Placeholder' started at 2026-11-15 00:26:33.129
Test Case 'Placeholder.testImplementationPlaceholder' started at 2026-11-15 00:26:33.129
<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/Placeholder.swift:6: Placeholder.testImplementationPlaceholder : Test skipped - CryRFB implementation is pending
Test Case 'Placeholder.testImplementationPlaceholder' skipped (0.0 seconds)
Test Suite 'Placeholder' passed at 2026-11-15 00:26:33.129
	 Executed 1 test, with 1 test skipped and 0 failures (0 unexpected) in 0.0 (0.0) seconds
Test Suite 'debug.xctest' passed at 2026-11-15 00:26:33.129
	 Executed 69 tests, with 1 test skipped and 0 failures (0 unexpected) in 3.059 (3.059) seconds
Test Suite 'All tests' passed at 2026-11-15 00:26:33.129
	 Executed 69 tests, with 1 test skipped and 0 failures (0 unexpected) in 3.059 (3.059) seconds
◇ Test run started.
↳ Testing Library Version: 6.3.3 (48d727cc1cf4eda)
↳ Target Platform: x86_64-unknown-linux-gnu
✔ Test run with 0 tests in 0 suites passed after 0.001 seconds.
```

#### `mobile/ios/scripts/linux-check.sh`（退出 1）

```text

== Swift syntax ==

== CryCore module and feature logic ==
[0/1] Planning build
Building for debugging...
[0/1] Write swift-version-6F7309784324DD2.txt
Build of target: 'CryCore' complete! (0.21s)

== Type names and imports ==
Type names: 114 Swift files checked; 0 errors.

== Generated strings ==
Out of date: mobile/ios/CryBot/Strings/ServerText.xcstrings; run node mobile/ios/scripts/gen-strings.mjs to update.
mobile/ios/scripts/gen-strings.mjs:1: error: check failed (exit 1): node mobile/ios/scripts/gen-strings.mjs --check

Summary: 152 Swift files parsed; 0 Logic directories (0 files) typechecked; 1 failed checks.
```

#### `node --test mobile/ios/scripts/*.test.mjs`（退出 0）

```text
TAP version 13
# Subtest: mobile/ios/scripts/check-type-names.test.mjs
ok 1 - mobile/ios/scripts/check-type-names.test.mjs
  ---
  duration_ms: 8758.910686
  type: 'test'
  ...
# Subtest: mobile/ios/scripts/gen-strings.test.mjs
ok 2 - mobile/ios/scripts/gen-strings.test.mjs
  ---
  duration_ms: 2152.327816
  type: 'test'
  ...
# Subtest: mobile/ios/scripts/workflows.test.mjs
ok 3 - mobile/ios/scripts/workflows.test.mjs
  ---
  duration_ms: 1660.30382
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8773.766436
```

#### `node --experimental-test-isolation=none --test mobile/ios/scripts/*.test.mjs`（退出 0）

```text
TAP version 13
# Subtest: rejects TimelineView with an exact source location
ok 1 - rejects TimelineView with an exact source location
  ---
  duration_ms: 16.705288
  type: 'test'
  ...
# Subtest: rejects every forbidden name for all six declarations, including escaped names
ok 2 - rejects every forbidden name for all six declarations, including escaped names
  ---
  duration_ms: 6.861103
  type: 'test'
  ...
# Subtest: rejects Markdown and SwiftUI together, including attributed and scoped imports
ok 3 - rejects Markdown and SwiftUI together, including attributed and scoped imports
  ---
  duration_ms: 3.449931
  type: 'test'
  ...
# Subtest: allows references, scoped imports, safe names and separate Markdown files
ok 4 - allows references, scoped imports, safe names and separate Markdown files
  ---
  duration_ms: 0.893634
  type: 'test'
  ...
# Subtest: ignores line comments, nested block comments and normal, raw and multiline strings
ok 5 - ignores line comments, nested block comments and normal, raw and multiline strings
  ---
  duration_ms: 0.446173
  type: 'test'
  ...
# Subtest: CLI scans both trees recursively and returns failure with the file and line
ok 6 - CLI scans both trees recursively and returns failure with the file and line
  ---
  duration_ms: 465.736195
  type: 'test'
  ...
# Subtest: linux-test isolates all Swift caches and propagates test failures without filtering targets
ok 7 - linux-test isolates all Swift caches and propagates test failures without filtering targets
  ---
  duration_ms: 190.768734
  type: 'test'
  ...
# Subtest: both scripts explain missing Swift and exit 2
ok 8 - both scripts explain missing Swift and exit 2
  ---
  duration_ms: 42.382055
  type: 'test'
  ...
# Subtest: linux-check parses all source trees, groups logic files and imports the freshly built module
ok 9 - linux-check parses all source trees, groups logic files and imports the freshly built module
  ---
  duration_ms: 3753.202222
  type: 'test'
  ...
# Subtest: linux-check aggregates syntax, logic, naming and strings failures with diagnostics
ok 10 - linux-check aggregates syntax, logic, naming and strings failures with diagnostics
  ---
  duration_ms: 3168.591479
  type: 'test'
  ...
# Subtest: a failed CryCore build still runs naming and strings but never uses stale modules
ok 11 - a failed CryCore build still runs naming and strings but never uses stale modules
  ---
  duration_ms: 6103.276036
  type: 'test'
  ...
# Subtest: empty feature Logic trees are explicitly counted
ok 12 - empty feature Logic trees are explicitly counted
  ---
  duration_ms: 1338.900288
  type: 'test'
  ...
# Subtest: iOS Linux workflow selects relevant PRs and executes both scripts and all Node tests
ok 13 - iOS Linux workflow selects relevant PRs and executes both scripts and all Node tests
  ---
  duration_ms: 26.848001
  type: 'test'
  ...
# Subtest: Web interpolation uses English positions, repeated names and escaped literal percents
ok 14 - Web interpolation uses English positions, repeated names and escaped literal percents
  ---
  duration_ms: 1.692156
  type: 'test'
  ...
# Subtest: maps all renamed language codes and keeps English positions across languages
ok 15 - maps all renamed language codes and keeps English positions across languages
  ---
  duration_ms: 0.454192
  type: 'test'
  ...
# Subtest: ServerText retains named placeholders across languages
ok 16 - ServerText retains named placeholders across languages
  ---
  duration_ms: 0.622572
  type: 'test'
  ...
# Subtest: missing English key fails generation even if a translation exists
ok 17 - missing English key fails generation even if a translation exists
  ---
  duration_ms: 167.790055
  type: 'test'
  ...
# Subtest: skips source-hashes.json, includes serverError and maps locale files
ok 18 - skips source-hashes.json, includes serverError and maps locale files
  ---
  duration_ms: 4.817047
  type: 'test'
  ...
# Subtest: --check fails for stale content and succeeds after regeneration
ok 19 - --check fails for stale content and succeeds after regeneration
  ---
  duration_ms: 708.198327
  type: 'test'
  ...
# Subtest: --check and generation only clean exactly named generated feature tables
ok 20 - --check and generation only clean exactly named generated feature tables
  ---
  duration_ms: 871.143956
  type: 'test'
  ...
# Subtest: ServerText includes all five production heldCode messages
ok 21 - ServerText includes all five production heldCode messages
  ---
  duration_ms: 174.446138
  type: 'test'
  ...
# Subtest: the app keeps its Swift module name when the display product name has spaces
ok 22 - the app keeps its Swift module name when the display product name has spaces
  ---
  duration_ms: 0.18494
  type: 'test'
  ...
# Subtest: workflow YAML and every embedded shell script parse
ok 23 - workflow YAML and every embedded shell script parse
  ---
  duration_ms: 134.30703
  type: 'test'
  ...
# Subtest: main push uses none; manual main and other push use all; PR logs both scope lines
ok 24 - main push uses none; manual main and other push use all; PR logs both scope lines
  ---
  duration_ms: 55.138608
  type: 'test'
  ...
# Subtest: selection script failure fails the workflow step without publishing empty selection
ok 25 - selection script failure fails the workflow step without publishing empty selection
  ---
  duration_ms: 22.388465
  type: 'test'
  ...
# Subtest: PR with no selected feature publishes none, including an empty script result
ok 26 - PR with no selected feature publishes none, including an empty script result
  ---
  duration_ms: 53.884495
  type: 'test'
  ...
# Subtest: real git diff preserves spaces and Unicode paths for PR selection
ok 27 - real git diff preserves spaces and Unicode paths for PR selection
  ---
  duration_ms: 204.975862
  type: 'test'
  ...
# Subtest: all runs the full UI target; selected flows run; only empty/none scope skips
ok 28 - all runs the full UI target; selected flows run; only empty/none scope skips
  ---
  duration_ms: 317.861659
  type: 'test'
  ...
# Subtest: a missing or entirely skipped UI class fails the required guard
ok 29 - a missing or entirely skipped UI class fails the required guard
  ---
  duration_ms: 144.152714
  type: 'test'
  ...
# Subtest: nightly tries all three destinations before returning failure
ok 30 - nightly tries all three destinations before returning failure
  ---
  duration_ms: 280.021339
  type: 'test'
  ...
# Subtest: nightly checks launch screenshots for all three devices even if snapshot export fails
ok 31 - nightly checks launch screenshots for all three devices even if snapshot export fails
  ---
  duration_ms: 78.80679
  type: 'test'
  ...
# Subtest: daily and weekly cron do not overlap; exports run after failures; artifact names differ
ok 32 - daily and weekly cron do not overlap; exports run after failures; artifact names differ
  ---
  duration_ms: 1.110704
  type: 'test'
  ...
# Subtest: iOS 18 downloads a concrete version only when no runtime is available
ok 33 - iOS 18 downloads a concrete version only when no runtime is available
  ---
  duration_ms: 121.688347
  type: 'test'
  ...
# Subtest: iOS 18 creates a missing iPhone 16
ok 34 - iOS 18 creates a missing iPhone 16
  ---
  duration_ms: 91.795093
  type: 'test'
  ...
1..34
# tests 34
# suites 0
# pass 34
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 18902.082285
```

#### 隔离副本 `linux-check.sh`，重新生成副本文案并加入 Logic 文件（退出 0） <!-- public-scan: allow domain -->

```text

== Swift syntax ==

== CryCore module and feature logic ==
Building for debugging...
[0/2] Write sources
[1/2] Write swift-version-6F7309784324DD2.txt
[3/24] Emitting module CryCore
[4/45] Compiling CryCore EnvironmentModels.swift
[5/45] Compiling CryCore FirstReplyRescueModels.swift
[6/45] Compiling CryCore GroupGoalRunModels.swift
[7/45] Compiling CryCore HelperFollowupModels.swift
[8/45] Compiling CryCore ImageGenerationModels.swift
[9/45] Compiling CryCore InboxModels.swift
[10/45] Compiling CryCore JSONValue.swift
[11/45] Compiling CryCore LimitResetModels.swift
[12/45] Compiling CryCore LiveCallWireModels.swift
[13/45] Compiling CryCore LiveState.swift
[14/45] Compiling CryCore McpRequestModels.swift
[15/45] Compiling CryCore ModelRequestModels.swift
[16/45] Compiling CryCore NotificationModels.swift
[17/45] Compiling CryCore OnboardingModels.swift
[18/45] Compiling CryCore PhoneAppsModels.swift
[19/45] Compiling CryCore PlaceBannerModels.swift
[20/45] Compiling CryCore PlaceViewModels.swift
[21/45] Compiling CryCore ProfileRequestModels.swift
[22/45] Compiling CryCore PublishedPageModels.swift
[23/45] Compiling CryCore ReplyStyleModels.swift
[24/45] Compiling CryCore RoutineRequestModels.swift
[25/65] Compiling CryCore AdditionalTypesModels.swift
[26/65] Compiling CryCore AppModels.swift
[27/65] Compiling CryCore AppTriggersModels.swift
[28/65] Compiling CryCore ApprovalModeModels.swift
[29/65] Compiling CryCore AskQuestionModels.swift
[30/65] Compiling CryCore BotAccessModels.swift
[31/65] Compiling CryCore BotAvatarModels.swift
[32/65] Compiling CryCore BurstModels.swift
[33/65] Compiling CryCore CommandAllowlistModels.swift
[34/65] Compiling CryCore ComputerAskModels.swift
[35/65] Compiling CryCore ConfigStatusModels.swift
[36/65] Compiling CryCore ConnectorCardModels.swift
[37/65] Compiling CryCore CoreAPIModels.swift
[38/65] Compiling CryCore CoreTypes.swift
[39/65] Compiling CryCore CredentialRequestModels.swift
[40/65] Compiling CryCore DataSurfaceModels.swift
[41/65] Compiling CryCore DefaultBotModels.swift
[42/65] Compiling CryCore DevsReportStatusModels.swift
[43/65] Compiling CryCore DigestModels.swift
[44/65] Compiling CryCore EmailModels.swift
[45/65] Compiling CryCore Endpoint.swift
[46/65] Compiling CryCore RoutineRunModels.swift
[47/65] Compiling CryCore RoutinesModels.swift
[48/65] Compiling CryCore RuntimeEventAccess.swift
[49/65] Compiling CryCore RuntimeEventsModels.swift
[50/65] Compiling CryCore SSEParser.swift
[51/65] Compiling CryCore SavedStepsModels.swift
[52/65] Compiling CryCore ServerTextModels.swift
[53/65] Compiling CryCore SessionsModels.swift
[54/65] Compiling CryCore SkillRequestModels.swift
[55/65] Compiling CryCore TeamSetupModels.swift
[56/65] Compiling CryCore ToolScopeModels.swift
[57/65] Compiling CryCore Transport.swift
[58/65] Compiling CryCore TurnProgressModels.swift
[59/65] Compiling CryCore WaitRequestModels.swift
[60/65] Compiling CryCore WebhookRequestModels.swift
[61/65] Compiling CryCore WebhooksModels.swift
[62/65] Compiling CryCore WidgetModels.swift
[63/65] Compiling CryCore WidgetNodeModels.swift
[64/65] Compiling CryCore WireMessageAccess.swift
[65/65] Compiling CryCore WireModels.swift
Build of target: 'CryCore' complete! (47.64s)
Typecheck mobile/ios/CryBot/Features/Fixture/Logic (2 files)

== Type names and imports ==
Type names: 116 Swift files checked; 0 errors.

== Generated strings ==

Summary: 154 Swift files parsed; 1 Logic directories (2 files) typechecked; 0 failed checks.
```

#### 隔离副本真实类型错误负例（脚本退出 1，符合预期）

在副本 Consumer.swift 第 3 行添加 `let fixtureWrongType: Int = "fixture"`，再次运行同一脚本。语法阶段能接受该文件，类型阶段输出准确行列；之后命名和文案检查仍运行。

```text

== Swift syntax ==

== CryCore module and feature logic ==
[0/1] Planning build
Building for debugging...
[0/1] Write swift-version-6F7309784324DD2.txt
Build of target: 'CryCore' complete! (0.26s)
Typecheck mobile/ios/CryBot/Features/Fixture/Logic (2 files)
mobile/ios/CryBot/Features/Fixture/Logic/Consumer.swift:3:29: error: cannot convert value of type 'String' to specified type 'Int'
1 | import CryCore
2 | func fixtureValue() -> FixtureValue { FixtureValue(value: .string("fixture")) }
3 | let fixtureWrongType: Int = "fixture"
  |                             `- error: cannot convert value of type 'String' to specified type 'Int'
4 | 
mobile/ios/CryBot/Features/Fixture/Logic/Consumer.swift:1: error: check failed (exit 1): swiftc -swift-version 5 -typecheck -I <repo>/mobile/ios/.linux-cache/integration/repository/mobile/ios/.linux-build/x86_64-unknown-linux-gnu/debug/Modules mobile/ios/CryBot/Features/Fixture/Logic/Consumer.swift mobile/ios/CryBot/Features/Fixture/Logic/Value.swift

== Type names and imports ==
Type names: 116 Swift files checked; 0 errors.

== Generated strings ==

Summary: 154 Swift files parsed; 1 Logic directories (2 files) typechecked; 1 failed checks.
```

#### 将所有 Node 夹具临时目录固定到工作区后复核（退出 0）

```sh
env TMPDIR="$PWD/mobile/ios/.linux-cache/tmp" node --experimental-test-isolation=none --test mobile/ios/scripts/*.test.mjs
```

末尾汇总（详细行为与上文 34 项相同）：

```text
1..34
# tests 34
# suites 0
# pass 34
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 13623.233396
```

#### 原 HOME 缓存前后对比

在首次真实 `linux-test.sh` 前及全部真实 Swift/Node 运行结束后，递归快照 `<home>/.cache`、`<home>/.swiftpm`。逐项比较路径、模式、大小、mtime_ns、ctime_ns、符号链接目标，不使用读取时会变化的 atime；未跟随目录符号链接。快照和比对脚本保留于 `.linux-cache/snapshot-caches.py`、`cache-before.json`、`cache-after.json`，均为忽略的本地验证产物。

```sh
python3 mobile/ios/.linux-cache/snapshot-caches.py mobile/ios/.linux-cache/cache-before.json
# 运行上文 Swift/Node 命令后：
python3 mobile/ios/.linux-cache/snapshot-caches.py mobile/ios/.linux-cache/cache-after.json
```

```text
Cache entries before: 22146
Cache entries after: 22143
Added: 0
Removed: 3
Metadata changed: 1
```

差异全部位于 `<home>/.cache/<审查工具目录>/`：一个临时目录及其中 `changes.diff`、`security-audit.md` 被删除，父目录 mtime/ctime 改变；没有新增文件或既有普通文件内容元数据变化。`<home>/.swiftpm` 逐项一致。本任务命令没有操作该审查目录，沙箱也未授予该目录写权限。 <!-- public-scan: allow domain -->
