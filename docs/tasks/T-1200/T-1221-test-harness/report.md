# T-1221-04 截图流水线与文案生成器

## 本轮改动

- `.github/workflows/mobile.yml`：保留原有构建、CryKit 和手表测试结构，加入 PR 功能选择、App 内截图、XCUITest、零测试保护和 `ios-screenshots` 产物；main push 清空截图选择并跳过交互流程。
- `.github/workflows/ios-nightly.yml`：新增每日/手动全量工作流，覆盖 iPhone SE（缺失时回退 iPhone 16e）、iPhone 16、iPhone 16 Pro Max，并加入每周 iOS 18 的非阻塞 job。
- `mobile/ios/CryBotTests/Support/SnapshotCase.swift`：提供三种固定尺寸、深浅色、动态字体、附件命名和功能选择开关；文档写明内嵌网页只截入口和容器外框。
- `mobile/ios/CryBotTests/Support/HarnessSnapshotTests.swift`：提供含 List、ScrollView、UIViewRepresentable 的基础截图和 Accessibility L 截图。
- `mobile/ios/CryBotTests/Support/ServerTextRendererTests.swift`：覆盖文案原文和码本身回退及参数替换。
- `mobile/ios/CryBotUITests/Support/ScreenshotCase.swift`：提供夹具启动和交互截图附件。
- `mobile/ios/CryBotUITests/Support/HarnessFlowTests.swift`：启动夹具并截 `harness-launch`。
- `mobile/ios/CryBotUITests/Placeholder.swift`：删除只会跳过的占位测试。
- `mobile/ios/scripts/ui-test-selection.sh`、`ui-test-selection.test.sh`：按改动路径输出截图功能和 FlowTests 参数，并覆盖 Linux bash 自测场景。
- `mobile/ios/scripts/assert-tests-ran.sh`：按调用方选择是否要求 xcresult 至少执行一个测试。
- `mobile/ios/scripts/gen-strings.mjs`、`gen-strings.test.mjs`：生成/检查 Web 功能和 ServerText xcstrings，处理 16 个语言代码、缺失键和插值参数位置。
- `mobile/ios/CryBot/Strings/ServerText.xcstrings`：按当前 `shared/server-text.ts` 命名空间生成的服务端文案表。
- `mobile/ios/CryBot/Strings/ServerTextRenderer.swift`：读取 ServerText 表并在缺键时回退服务端原文或码本身。
- `mobile/ios/scripts/README.md`：记录截图、内嵌网页截图范围、交互流程和文案生成器用法。

## 本地验证

以下命令在 InstaBox Linux 沙箱中执行：

- `crybot-link-deps`：成功链接 73 个预装依赖。
- `node --test mobile/ios/scripts/gen-strings.test.mjs`：通过（3 个断言场景在 Node test runner 中通过）。
- `bash mobile/ios/scripts/ui-test-selection.test.sh`：通过，`Features/Inbox` 输出 `Inbox` 且没有 FlowTests 参数。
- `node mobile/ios/scripts/gen-strings.mjs --check`：退出码 0。
- `bash -n mobile/ios/scripts/*.sh`：通过。
- 用伪造的 `xcrun xcresulttool` 输出演示 `assert-tests-ran.sh`：普通模式允许 0 个测试，`--required` 对 0 个测试返回失败。
- 用 Node `yaml` 包解析 `.github/workflows/mobile.yml` 和 `.github/workflows/ios-nightly.yml`：格式通过。

当前沙箱没有 Xcode、Swift 编译器、macOS 模拟器或端口监听能力，因此 Swift 编译、App 内截图、XCUITest 和两个 Actions 工作流只能由 macOS Actions 验证；本地没有声称这些项目通过。仓库现状也没有 `server/testing/ios-contract/coverage.ts`，覆盖表条目需协调者按主线文件补录。

## 覆盖表项目

按本任务目标覆盖：App 内截图基类和固定尺寸/深浅色附件、动态字体截图、内嵌网页截图约束文档、XCUITest 启动和截图基类、改动路径选择、xcresult 零测试保护、PR/nightly 截图产物、16 语言 xcstrings 生成和检查、服务端文案渲染及回退。

## 需要协调者处理

- `project.yml` 仍未改：需要把 `CryBot/Strings/*.xcstrings` 作为资源、把 `CryBotTests/Support/**` 和 `CryBotUITests/Support/**` 纳入对应 target（按第 1.3 节变更通道处理）。
- 43 接入 Linux 检查时使用：`node mobile/ios/scripts/gen-strings.mjs --check`。
- 请在 macOS Actions 上验证 Swift、截图、XCUITest、附件导出和 iOS 18 runtime；本轮没有运行链接可填写。
- 请在 PR 上演示一次选择不存在 FlowTests 类时 `assert-tests-ran.sh --required` 失败，并补充运行链接。
