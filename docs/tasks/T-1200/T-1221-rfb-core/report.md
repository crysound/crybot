# T-1221-34 RFB 协议核心报告

## 第 1 轮（2026-11-15）

分支：`T-1221-rfb-core`。按 `task-paths report T-1221-rfb-core` 得到本文件路径；工具不在 PATH，实际调用 `<tools>/task-paths report T-1221-rfb-core`。规格读取自 main 的 `docs/specs/2026-11-14-ios-native.md`，main 提交为 `673e209bebc12f32e825c4f5347334eebfa08e7b`，已读第 1、2、7.2、8、11 节及入口表。

### 1. 改了哪些文件

以下源码路径均相对于 `mobile/ios/Packages/CryKit/`：

| 文件 | 改动 |
|---|---|
| `Sources/CryRFB/Placeholder.swift` | 删除仅导入 Foundation 的占位文件。 |
| `Sources/CryRFB/RFBTypes.swift` | 定义 DES/Inflater 注入协议、连接状态、事件、输出、矩形、光标和错误类型，以及对端输入的内存上限。 |
| `Sources/CryRFB/RFBBytes.swift` | 提供可暂停的字节读取和大端整数编解码。 |
| `Sources/CryRFB/RFBMessages.swift` | 编码 SetPixelFormat、SetEncodings、FramebufferUpdateRequest、KeyEvent、PointerEvent 和 ClientCutText。 |
| `Sources/CryRFB/Framebuffer.swift` | 保存不透明 BGRA 像素和当前更新的脏矩形，并处理四个方向的重叠 CopyRect。 |
| `Sources/CryRFB/ZRLEDecoder.swift` | 解码 64×64 瓦片、边缘瓦片、CPIXEL 和五类 ZRLE 子编码，拒绝越界索引、过长游程、截断和多余数据。 |
| `Sources/CryRFB/RFBClient.swift` | 实现 3.3/3.7/3.8 握手、None/VNC 认证、服务器消息和矩形解析；输出发送字节与事件，不访问网络。 |
| `Tests/CryRFBTests/Placeholder.swift` | 删除原来的跳过测试占位。 |
| `Tests/CryRFBTests/RFBFixtures.swift` | 提供手造 RFB 字节、只解 deflate 存储块的持续流 Inflater 和记录 DES 调用的隔离测试替身。 |
| `Tests/CryRFBTests/RFBHandshakeTests.swift` | 用 11 个测试覆盖各版本、认证分支、密码逐字节位反转/截断/补零、失败原因和握手边界。 |
| `Tests/CryRFBTests/RFBMessageTests.swift` | 用 5 个测试断言客户端消息的具体字节、服务器剪贴板、Bell、调色板跳过和状态错误。 |
| `Tests/CryRFBTests/RFBFramebufferTests.swift` | 用 6 个测试覆盖 Raw、重叠 CopyRect、脏矩形、DesktopSize、Cursor 掩码和非法矩形。 |
| `Tests/CryRFBTests/RFBZRLETests.swift` | 用 15 个测试覆盖全部五种子编码、1/2/4 位调色板、持续解压流、瓦片边界、分包一致性和恶意输入。 |

另新增本报告；保留预先存在的 `brief.md`。未改 Package.swift、CryCore、CryNet、App、project.yml、scripts、工作流或覆盖表。未 git 提交、未联网、未安装依赖。 <!-- public-scan: allow domain -->

### 2. 怎么验证

仅运行隔离的内存协议夹具，无 WebSocket、真实 VNC 服务端或用户数据访问。当前工作树及 main 均没有 `docs/verification/README.md`；本任务没有服务端或会话变更，不声称真实桌面链路可用。

工具链自查命令：

```sh
swift --version
```

原始输出：

```text
Swift version 6.3.3 (swift-6.3.3-RELEASE)
Target: x86_64-unknown-linux-gnu
```

缓存目录创建命令：

```sh
mkdir -p mobile/ios/.linux-cache/{home,xdg,clang,modules,swiftpm,config,security} mobile/ios/.linux-build
```

两次执行的核心命令完全相同，使用第 8.5 节规定的全部路径参数与环境变量；用 `env HOME=...` 只改变 Swift 子进程环境，不重设当前 shell 的 HOME。日志以 `2>&1 | tee mobile/ios/.linux-cache/rfb-swift-test-N.log` 保存，并启用 `set -o pipefail` 取得实际失败状态。

```sh
set -o pipefail
env HOME="$PWD/mobile/ios/.linux-cache/home" XDG_CACHE_HOME="$PWD/mobile/ios/.linux-cache/xdg" CLANG_MODULE_CACHE_PATH="$PWD/mobile/ios/.linux-cache/clang" SWIFTPM_MODULECACHE_OVERRIDE="$PWD/mobile/ios/.linux-cache/modules" swift test --package-path mobile/ios/Packages/CryKit --scratch-path mobile/ios/.linux-build --cache-path mobile/ios/.linux-cache/swiftpm --config-path mobile/ios/.linux-cache/config --security-path mobile/ios/.linux-cache/security --filter CryRFBTests 2>&1 | tee mobile/ios/.linux-cache/rfb-swift-test-1.log
```

第二次仅将上面的日志名改为 `rfb-swift-test-2.log`。

- 第一次退出码 1：测试夹具的混合数字字面量被 Swift 推断为 `[Any]`，在执行测试前停止；随后为两个数组补上 `UInt8` 类型。
- 第二次退出码 0：XCTest 原始输出记录 `Executed 37 tests, with 0 failures (0 unexpected)`，实际选中数为 37；尾部 Swift Testing 的 `0 tests` 是另一套测试运行器，本任务使用 XCTest。
- 所有握手成功分支、认证失败原因、主要帧消息和 ZRLE 样本均包含逐字节输入场景；还对包含握手、Raw、CopyRect、ZRLE、Bell 和剪贴板的完整字节流逐一遍历每个切分点，与整包输入比较输出和最终帧缓冲。
- 任务 43 的脚本尚未合并，按派活要求直接调用 swift test，未依赖或修改其脚本。现有 CryNet 的条件导入允许本次包构建继续进行；本次过滤器只执行 CryRFBTests。

这只是本机 Linux 命令记录，不作为 Actions 或 App/Xcode 的验收结论。

其他检查：

```sh
grep -Rn '^import ' mobile/ios/Packages/CryKit/Sources/CryRFB
git diff --check
```

前一条输出如下；后一条退出码 0、无输出。另对全部 11 个新增 Swift 文件做只读扫描，未发现第 1.5 节禁用类型名或行尾空白，6 个源码文件的导入均只有 Foundation。

```text
mobile/ios/Packages/CryKit/Sources/CryRFB/RFBBytes.swift:1:import Foundation
mobile/ios/Packages/CryKit/Sources/CryRFB/RFBTypes.swift:1:import Foundation
mobile/ios/Packages/CryKit/Sources/CryRFB/RFBClient.swift:1:import Foundation
mobile/ios/Packages/CryKit/Sources/CryRFB/RFBMessages.swift:1:import Foundation
mobile/ios/Packages/CryKit/Sources/CryRFB/Framebuffer.swift:1:import Foundation
mobile/ios/Packages/CryKit/Sources/CryRFB/ZRLEDecoder.swift:1:import Foundation
```

只能等协调者推送后由 Actions 检查：`Mobile builds` 的 macOS/Xcode 包测试及 App 集成；任务 43 合并后的 `iOS Linux`；任务 45 合并后的 `Public scan`。所有运行链接待协调者补充，尚未取得任何 Actions 验收结果。

### 3. 覆盖表完成项

无。当前 `server/testing/ios-contract/coverage.ts` 虽在 `RETAINED_TASKS` 中保留 `34`，但没有归属任务 34 的具体覆盖条目；RFB 字节协议也不是其中的 ServerFrame/WireMessage 联合。未修改覆盖表，未把任务 35 的桌面 UI 或接线算作完成。

### 4. 需要协调者处理的事

- 推送 `T-1221-rfb-core`、开草稿 PR，补充上述 Actions 运行链接及实际 CryRFBTests 数量大于 0 的证据；等待 43、45 合并后检查相应工作流。
- 新依赖：无。`project.yml` 要加的行：无。超出范围的源码改动：无。第 1.4 节入口签名修改：无。
- 任务 35 按 `DESEncryptor.encrypt(challenge:key:)` 注入 DES ECB、无 padding；传入挑战是 16 字节、密钥是已经逐字节位反转的 8 字节，不要再反转。密码目前取 String 的 UTF-8 前 8 字节，不足补零。
- 每条连接新建一个 `Inflater` 实例及 `RFBClient`；`inflate(_:maximumOutputSize:)` 第一次收到 zlib 头，之后是同一条流的后续片段，必须跨矩形及 FramebufferUpdate 复用解压状态，遵守输出上限。真实 CommonCrypto/Compression 实现和兼容性由任务 35 验证，本任务测试只实现 deflate 存储块。
- 调用方串行调用 `receive(_:)`，按返回顺序发送所有 `.send(Data)`，处理 `.event`；读取 `framebuffer` 获取最新 BGRA 像素。一次 receive 可能包含多次更新，绘制时使用最新帧缓冲和最新尺寸；`serverInfo` 保存初始 ServerInit 信息，当前尺寸读 framebuffer。开始下一条 FramebufferUpdate 时清空上一条脏矩形；一条更新结束时发 `.framebufferUpdated`，随后自动请求下一次增量更新，尺寸变化后则请求一次全量更新。调用方不要再为每条更新自动重复请求。
- `keyEvent`、`pointerEvent`、`clientCutText` 和手动 `framebufferUpdateRequest` 返回需由调用方发送的 Data；Unicode keysym 可直接传 `0x01000000 | 码点`。连接失败后需新建 client。
- 剪贴板遵守 RFC 6143 基础 ClientCutText/ServerCutText 的 Latin-1 编码，不能表示的客户端文本抛 `textNotLatin1`；未宣告扩展剪贴板编码。帧缓冲上限 64 MiB，文本上限 16 MiB，ServerInit 名称上限 1 MiB，压缩矩形上限 64 MiB，待解析输入上限 128 MiB；非法协议输入产生失败事件并终止该 client。
- 任务 34 范围内无已知未解决问题；真实 VNC 服务端、Apple 加解密实现、App 显示交互和 Actions 验收仍需任务 35／协调者完成。

### 附录：第一次 swift test 原始输出（退出码 1）

```text
Building for debugging...
[0/26] Write sources
[8/26] Copying Fixtures
[9/26] Write swift-version-6F7309784324DD2.txt
[11/80] Compiling CryRFB RFBTypes.swift
[12/81] Compiling CryCore AppTriggersModels.swift
[13/81] Compiling CryCore ApprovalModeModels.swift
[14/81] Compiling CryCore AdditionalTypesModels.swift
[15/81] Compiling CryCore AppModels.swift
[16/81] Emitting module CryRFB
[17/81] Compiling CryCore DefaultBotModels.swift
[18/81] Compiling CryCore DevsReportStatusModels.swift
[19/81] Compiling CryCore DigestModels.swift
[20/81] Compiling CryCore EmailModels.swift
[21/81] Compiling CryCore Endpoint.swift
[22/81] Compiling CryCore EnvironmentModels.swift
[23/81] Compiling CryCore FirstReplyRescueModels.swift
[24/81] Compiling CryCore GroupGoalRunModels.swift
[25/81] Compiling CryCore HelperFollowupModels.swift
[26/81] Compiling CryCore ImageGenerationModels.swift
[27/81] Compiling CryCore InboxModels.swift
[28/81] Compiling CryCore JSONValue.swift
[29/81] Compiling CryCore LimitResetModels.swift
[30/81] Compiling CryCore LiveCallWireModels.swift
[31/81] Compiling CryCore LiveState.swift
[32/81] Compiling CryCore McpRequestModels.swift
[33/96] Compiling CryRFB ZRLEDecoder.swift
[34/97] Wrapping AST for CryRFB for debugging
[36/102] Compiling CryRFBTests RFBMessageTests.swift
[37/103] Compiling CryRFBTests RFBHandshakeTests.swift
[38/103] Compiling CryRFBTests RFBZRLETests.swift
[39/103] Compiling CryCore ModelRequestModels.swift
[40/103] Compiling CryCore NotificationModels.swift
[41/103] Compiling CryCore OnboardingModels.swift
[42/103] Compiling CryCore PhoneAppsModels.swift
[43/103] Compiling CryCore PlaceBannerModels.swift
[44/103] Compiling CryCore PlaceViewModels.swift
[45/103] Compiling CryCore ProfileRequestModels.swift
[46/103] Compiling CryCore PublishedPageModels.swift
[47/103] Compiling CryCore ReplyStyleModels.swift
[48/103] Compiling CryCore RoutineRequestModels.swift
[49/103] Compiling CryCore RoutineRunModels.swift
[50/103] Compiling CryCore RoutinesModels.swift
[51/103] Compiling CryCore RuntimeEventAccess.swift
[52/103] Compiling CryCore RuntimeEventsModels.swift
[53/103] Compiling CryCore SSEParser.swift
[54/103] Emitting module CryCore
[55/103] Compiling CryRFBTests RFBFixtures.swift
[56/103] Compiling CryRFBTests RFBFramebufferTests.swift
[59/103] Compiling CryCore AskQuestionModels.swift
[60/103] Compiling CryCore BotAccessModels.swift
[61/103] Compiling CryCore BotAvatarModels.swift
[62/103] Compiling CryCore BurstModels.swift
[63/103] Compiling CryCore CommandAllowlistModels.swift
[64/103] Compiling CryCore ComputerAskModels.swift
[65/103] Compiling CryCore ConfigStatusModels.swift
[66/103] Compiling CryCore ConnectorCardModels.swift
[67/103] Compiling CryCore CoreAPIModels.swift
[68/103] Compiling CryCore CoreTypes.swift
[69/103] Compiling CryCore CredentialRequestModels.swift
[70/103] Compiling CryCore DataSurfaceModels.swift
[71/103] Emitting module CryRFBTests
<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:25:32: warning: 'flatMap' is deprecated: Please use compactMap(_:) for the case where closure returns an optional value [#DeprecatedDeclaration]
 23 |     func testCopyRectHandlesOverlapInEveryDirection() {
 24 |         let directions = [(0, 0, 1, 0, 2, 3), (1, 0, 0, 0, 2, 3), (0, 0, 0, 1, 3, 2), (0, 1, 0, 0, 3, 2)]
 25 |         let original = (1...9).flatMap { [UInt8($0), 0, 0, 255] }
    |                                |- warning: 'flatMap' is deprecated: Please use compactMap(_:) for the case where closure returns an optional value [#DeprecatedDeclaration]
    |                                `- note: use 'compactMap(_:)' instead
 26 |         for (sourceX, sourceY, destX, destY, width, height) in directions {
 27 |             for bytewise in [false, true] {

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:29:91: error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
 27 |             for bytewise in [false, true] {
 28 |                 let client = RFBFixture.connected(width: 3, height: 3)
 29 |                 let raw = RFBFixture.rectangle(width: 3, height: 3, encoding: 0, payload: original)
    |                                                                                           |- error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
    |                                                                                           `- note: arguments to generic parameter 'Element' ('[Any]' and 'UInt8') are expected to be equal
 30 |                 let copy = RFBFixture.rectangle(x: destX, y: destY, width: width, height: height, encoding: 1,
 31 |                                                payload: RFBFixture.u16(sourceX) + RFBFixture.u16(sourceY))

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:36:25: error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions
 34 |                 for y in 0..<height {
 35 |                     for x in 0..<width {
 36 |                         expected[((destY + y) * 3 + destX + x) * 4] = UInt8((sourceY + y) * 3 + sourceX + x + 1)
    |                         `- error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions
 37 |                     }
 38 |                 }

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:39:60: error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
 37 |                     }
 38 |                 }
 39 |                 XCTAssertEqual(client.framebuffer?.pixels, expected)
    |                                                            |- error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
    |                                                            `- note: arguments to generic parameter 'Element' ('[Any]' and 'UInt8') are expected to be equal
 40 |                 XCTAssertEqual(client.framebuffer?.dirtyRectangles, [RFBRectangle(x: 0, y: 0, width: 3, height: 3),
 41 |                                                                       RFBRectangle(x: destX, y: destY, width: width, height: height)])

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:75:62: error: cannot convert value of type '[Any]' to expected argument type '[UInt8]'
 73 |             let source = Array(repeating: [UInt8(1), 2, 3, 0], count: 18).flatMap { $0 }
 74 |             let cursor = RFBFixture.rectangle(x: 8, y: 1, width: 9, height: 2, encoding: -239,
 75 |                                              payload: source + [0x80, 0x80, 0x40, 0x00])
    |                                                              |- error: cannot convert value of type '[Any]' to expected argument type '[UInt8]'
    |                                                              `- note: arguments to generic parameter 'Element' ('Any' and 'UInt8') are expected to be equal
 76 |             let output = RFBFixture.feed(RFBFixture.update([cursor]), to: client, bytewise: bytewise)
 77 |             guard case .cursor(let value) = RFBFixture.events(output).first else { return XCTFail("Missing cursor") }

[#DeprecatedDeclaration]: <https://docs.swift.org/compiler/documentation/diagnostics/deprecated-declaration>
<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:25:32: warning: 'flatMap' is deprecated: Please use compactMap(_:) for the case where closure returns an optional value [#DeprecatedDeclaration]
 23 |     func testCopyRectHandlesOverlapInEveryDirection() {
 24 |         let directions = [(0, 0, 1, 0, 2, 3), (1, 0, 0, 0, 2, 3), (0, 0, 0, 1, 3, 2), (0, 1, 0, 0, 3, 2)]
 25 |         let original = (1...9).flatMap { [UInt8($0), 0, 0, 255] }
    |                                |- warning: 'flatMap' is deprecated: Please use compactMap(_:) for the case where closure returns an optional value [#DeprecatedDeclaration]
    |                                `- note: use 'compactMap(_:)' instead
 26 |         for (sourceX, sourceY, destX, destY, width, height) in directions {
 27 |             for bytewise in [false, true] {

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:29:91: error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
 27 |             for bytewise in [false, true] {
 28 |                 let client = RFBFixture.connected(width: 3, height: 3)
 29 |                 let raw = RFBFixture.rectangle(width: 3, height: 3, encoding: 0, payload: original)
    |                                                                                           |- error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
    |                                                                                           `- note: arguments to generic parameter 'Element' ('[Any]' and 'UInt8') are expected to be equal
 30 |                 let copy = RFBFixture.rectangle(x: destX, y: destY, width: width, height: height, encoding: 1,
 31 |                                                payload: RFBFixture.u16(sourceX) + RFBFixture.u16(sourceY))

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:36:25: error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions
 34 |                 for y in 0..<height {
 35 |                     for x in 0..<width {
 36 |                         expected[((destY + y) * 3 + destX + x) * 4] = UInt8((sourceY + y) * 3 + sourceX + x + 1)
    |                         `- error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions
 37 |                     }
 38 |                 }

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:39:60: error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
 37 |                     }
 38 |                 }
 39 |                 XCTAssertEqual(client.framebuffer?.pixels, expected)
    |                                                            |- error: cannot convert value of type '[[Any]]' to expected argument type '[UInt8]'
    |                                                            `- note: arguments to generic parameter 'Element' ('[Any]' and 'UInt8') are expected to be equal
 40 |                 XCTAssertEqual(client.framebuffer?.dirtyRectangles, [RFBRectangle(x: 0, y: 0, width: 3, height: 3),
 41 |                                                                       RFBRectangle(x: destX, y: destY, width: width, height: height)])

<repo>/mobile/ios/Packages/CryKit/Tests/CryRFBTests/RFBFramebufferTests.swift:75:62: error: cannot convert value of type '[Any]' to expected argument type '[UInt8]'
 73 |             let source = Array(repeating: [UInt8(1), 2, 3, 0], count: 18).flatMap { $0 }
 74 |             let cursor = RFBFixture.rectangle(x: 8, y: 1, width: 9, height: 2, encoding: -239,
 75 |                                              payload: source + [0x80, 0x80, 0x40, 0x00])
    |                                                              |- error: cannot convert value of type '[Any]' to expected argument type '[UInt8]'
    |                                                              `- note: arguments to generic parameter 'Element' ('Any' and 'UInt8') are expected to be equal
 76 |             let output = RFBFixture.feed(RFBFixture.update([cursor]), to: client, bytewise: bytewise)
 77 |             guard case .cursor(let value) = RFBFixture.events(output).first else { return XCTFail("Missing cursor") }

[#DeprecatedDeclaration]: <https://docs.swift.org/compiler/documentation/diagnostics/deprecated-declaration>
error: fatalError
```

### 附录：第二次 swift test 原始输出（退出码 0）

```text
[0/1] Planning build
Building for debugging...
[0/18] Write sources
[1/18] Write swift-version-6F7309784324DD2.txt
[3/29] Emitting module CryRFBTests
[4/33] Compiling CryRFBTests RFBFixtures.swift
[5/33] Compiling CryRFBTests RFBFramebufferTests.swift
[6/36] Compiling CryRFBTests RFBMessageTests.swift
[7/36] Compiling CryRFBTests RFBHandshakeTests.swift
[8/36] Compiling CryRFBTests RFBZRLETests.swift
[9/37] Wrapping AST for CryRFBTests for debugging
[11/37] Compiling CryCore WaitRequestModels.swift
[12/37] Compiling CryCore WebhookRequestModels.swift
[13/37] Compiling CryCore WebhooksModels.swift
[14/37] Compiling CryCore WidgetModels.swift
[15/37] Compiling CryCore SavedStepsModels.swift
[16/37] Compiling CryCore ServerTextModels.swift
[17/37] Compiling CryCore SessionsModels.swift
[18/37] Compiling CryCore SkillRequestModels.swift
[19/37] Compiling CryCore TeamSetupModels.swift
[20/37] Compiling CryCore ToolScopeModels.swift
[21/37] Compiling CryCore Transport.swift
[22/37] Compiling CryCore TurnProgressModels.swift
[23/42] Compiling CryCore CoreTypes.swift
[24/43] Compiling CryCore Endpoint.swift
[25/44] Emitting module CryCore
[26/46] Compiling CryCore GroupGoalRunModels.swift
[27/46] Compiling CryCore LiveState.swift
[28/47] Compiling CryCore InboxModels.swift
[29/48] Compiling CryCore RuntimeEventAccess.swift
[30/49] Compiling CryCore CoreAPIModels.swift
[31/49] Compiling CryCore RoutinesModels.swift
[32/49] Compiling CryCore RuntimeEventsModels.swift
[33/49] Compiling CryCore WidgetNodeModels.swift
[34/49] Compiling CryCore WireMessageAccess.swift
[35/49] Compiling CryCore WireModels.swift
[36/87] Compiling CryCore ConfigStatusModels.swift
[37/87] Compiling CryCore ConnectorCardModels.swift
[38/87] Compiling CryCore CredentialRequestModels.swift
[39/87] Compiling CryCore DataSurfaceModels.swift
[40/87] Compiling CryCore DefaultBotModels.swift
[41/87] Compiling CryCore DevsReportStatusModels.swift
[42/87] Compiling CryCore DigestModels.swift
[43/87] Compiling CryCore EmailModels.swift
[44/87] Compiling CryCore EnvironmentModels.swift
[45/87] Compiling CryCore FirstReplyRescueModels.swift
[46/87] Compiling CryCore AdditionalTypesModels.swift
[47/87] Compiling CryCore AppModels.swift
[48/87] Compiling CryCore AppTriggersModels.swift
[49/87] Compiling CryCore ApprovalModeModels.swift
[50/87] Compiling CryCore AskQuestionModels.swift
[51/87] Compiling CryCore BotAccessModels.swift
[52/87] Compiling CryCore BotAvatarModels.swift
[53/87] Compiling CryCore BurstModels.swift
[54/87] Compiling CryCore CommandAllowlistModels.swift
[55/87] Compiling CryCore ComputerAskModels.swift
[56/87] Compiling CryCore PhoneAppsModels.swift
[57/87] Compiling CryCore PlaceBannerModels.swift
[58/87] Compiling CryCore PlaceViewModels.swift
[59/87] Compiling CryCore ProfileRequestModels.swift
[60/87] Compiling CryCore PublishedPageModels.swift
[61/87] Compiling CryCore ReplyStyleModels.swift
[62/87] Compiling CryCore RoutineRequestModels.swift
[63/87] Compiling CryCore RoutineRunModels.swift
[64/87] Compiling CryCore SSEParser.swift
[65/87] Compiling CryCore HelperFollowupModels.swift
[66/87] Compiling CryCore ImageGenerationModels.swift
[67/87] Compiling CryCore JSONValue.swift
[68/87] Compiling CryCore LimitResetModels.swift
[69/87] Compiling CryCore LiveCallWireModels.swift
[70/87] Compiling CryCore McpRequestModels.swift
[71/87] Compiling CryCore ModelRequestModels.swift
[72/87] Compiling CryCore NotificationModels.swift
[73/87] Compiling CryCore OnboardingModels.swift
[74/88] Wrapping AST for CryCore for debugging
[76/101] Emitting module CryCoreTests
[77/102] Compiling CryNetLogic SessionRecord.swift
[78/103] Compiling CryCoreTests resource_bundle_accessor.swift
[79/103] Emitting module CryNetLogic
[80/103] Compiling CryNetLogic ReconnectState.swift
[81/103] Compiling CryNetLogic SessionPolicy.swift
[82/103] Compiling CryNetLogic CallbackRouter.swift
[83/103] Compiling CryNetLogic PairingInvite.swift
[84/103] Compiling CryNetLogic WebSocketRequest.swift
[87/104] Wrapping AST for CryNetLogic for debugging
[89/115] Compiling CryNet LiveWebSocketChannel.swift
[90/115] Compiling CryNet Logins.swift
[91/115] Compiling CryNet HTTPClient.swift
[92/115] Compiling CryNet LiveTransport.swift
[93/116] Compiling CryNet AppHandoff.swift
[94/116] Compiling CryNet CryNetError.swift
[95/116] Emitting module CryNet
[96/116] Compiling CryNet SessionStore.swift
[97/117] Wrapping AST for CryNet for debugging
[99/124] Emitting module CryNetLogicTests
[100/124] Compiling CryNetTests LoginTests.swift
[101/124] Compiling CryNetTests NetworkFixture.swift
[102/126] Compiling CryNetTests KeychainStoreTests.swift
[103/126] Compiling CryNetTests LiveTransportTests.swift
[104/126] Compiling CryNetTests HTTPClientTests.swift
[105/126] Compiling CryNetTests HandoffTests.swift
[109/126] Emitting module CryNetTests
[111/126] Compiling CryNetLogicTests CallbackTests.swift
[112/126] Compiling CryNetLogicTests ReconnectTests.swift
[113/126] Compiling CryNetLogicTests SessionTests.swift
[115/128] Wrapping AST for CryCoreTests for debugging
[116/128] Wrapping AST for CryNetLogicTests for debugging
[118/128] Compiling CryNetTests SessionStoreTests.swift
[119/128] Compiling CryNetTests UploadProgressTests.swift
[120/129] <repo>/mobile/ios/.linux-build/x86_64-unknown-linux-gnu/debug/CryKitPackageDiscoveredTests.derived/all-discovered-tests.swift
[121/129] Write sources
[122/129] Wrapping AST for CryNetTests for debugging
[124/134] Compiling CryKitPackageDiscoveredTests CryRFBTests.swift
[125/135] Compiling CryKitPackageDiscoveredTests all-discovered-tests.swift
[126/135] Compiling CryKitPackageDiscoveredTests CryCoreTests.swift
[127/135] Compiling CryKitPackageDiscoveredTests CryNetLogicTests.swift
[128/135] Emitting module CryKitPackageDiscoveredTests
[129/135] Compiling CryKitPackageDiscoveredTests CryNetTests.swift
[130/136] <repo>/mobile/ios/.linux-build/x86_64-unknown-linux-gnu/debug/CryKitPackageTests.derived/runner.swift
[131/136] Write sources
[132/136] Wrapping AST for CryKitPackageDiscoveredTests for debugging
[134/138] Compiling CryKitPackageTests runner.swift
[135/138] Emitting module CryKitPackageTests
[136/139] Wrapping AST for CryKitPackageTests for debugging
[137/139] Write Objects.LinkFileList
[138/139] Linking CryKitPackageTests.xctest
Build complete! (42.36s)
Test Suite 'Selected tests' started at 2026-11-15 00:30:34.544
Test Suite 'RFBFramebufferTests' started at 2026-11-15 00:30:34.545
Test Case 'RFBFramebufferTests.testCopyRectHandlesOverlapInEveryDirection' started at 2026-11-15 00:30:34.545
Test Case 'RFBFramebufferTests.testCopyRectHandlesOverlapInEveryDirection' passed (0.003 seconds)
Test Case 'RFBFramebufferTests.testCursorMaskUsesMSBFirstAndPadsEveryRow' started at 2026-11-15 00:30:34.548
Test Case 'RFBFramebufferTests.testCursorMaskUsesMSBFirstAndPadsEveryRow' passed (0.001 seconds)
Test Case 'RFBFramebufferTests.testDesktopSizeReallocatesAndRequestsFullNewSize' started at 2026-11-15 00:30:34.549
Test Case 'RFBFramebufferTests.testDesktopSizeReallocatesAndRequestsFullNewSize' passed (0.0 seconds)
Test Case 'RFBFramebufferTests.testIncompleteRawDoesNotPublishOrWritePixels' started at 2026-11-15 00:30:34.549
Test Case 'RFBFramebufferTests.testIncompleteRawDoesNotPublishOrWritePixels' passed (0.0 seconds)
Test Case 'RFBFramebufferTests.testInvalidRectangleBoundsEncodingsAndResizeOrderFail' started at 2026-11-15 00:30:34.549
Test Case 'RFBFramebufferTests.testInvalidRectangleBoundsEncodingsAndResizeOrderFail' passed (0.0 seconds)
Test Case 'RFBFramebufferTests.testRawPixelsUseBGRAAndTrackDirtyRectangles' started at 2026-11-15 00:30:34.550
Test Case 'RFBFramebufferTests.testRawPixelsUseBGRAAndTrackDirtyRectangles' passed (0.0 seconds)
Test Suite 'RFBFramebufferTests' passed at 2026-11-15 00:30:34.550
	 Executed 6 tests, with 0 failures (0 unexpected) in 0.004 (0.004) seconds
Test Suite 'RFBHandshakeTests' started at 2026-11-15 00:30:34.550
Test Case 'RFBHandshakeTests.test38NoneWaitsForSecurityResultAndReportsFailure' started at 2026-11-15 00:30:34.550
Test Case 'RFBHandshakeTests.test38NoneWaitsForSecurityResultAndReportsFailure' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testAuthenticationFailureWith38ReasonAndOlderStatus' started at 2026-11-15 00:30:34.550
Test Case 'RFBHandshakeTests.testAuthenticationFailureWith38ReasonAndOlderStatus' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testDESFailureAndWrongResponseLengthAreTerminal' started at 2026-11-15 00:30:34.550
Test Case 'RFBHandshakeTests.testDESFailureAndWrongResponseLengthAreTerminal' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testNoneCanBeSelectedWithoutAnEncryptor' started at 2026-11-15 00:30:34.551
Test Case 'RFBHandshakeTests.testNoneCanBeSelectedWithoutAnEncryptor' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testNoneHandshakeForAllVersionsAndFragmentation' started at 2026-11-15 00:30:34.551
Test Case 'RFBHandshakeTests.testNoneHandshakeForAllVersionsAndFragmentation' passed (0.001 seconds)
Test Case 'RFBHandshakeTests.testOversizedNameReasonAndFramebufferAreRejected' started at 2026-11-15 00:30:34.552
Test Case 'RFBHandshakeTests.testOversizedNameReasonAndFramebufferAreRejected' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testSecurityFailureReasonsForAllVersions' started at 2026-11-15 00:30:34.552
Test Case 'RFBHandshakeTests.testSecurityFailureReasonsForAllVersions' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testShortAndEmptyPasswordsAreZeroPadded' started at 2026-11-15 00:30:34.552
Test Case 'RFBHandshakeTests.testShortAndEmptyPasswordsAreZeroPadded' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testUnsupportedSecurityAndMissingEncryptorFail' started at 2026-11-15 00:30:34.552
Test Case 'RFBHandshakeTests.testUnsupportedSecurityAndMissingEncryptorFail' passed (0.0 seconds)
Test Case 'RFBHandshakeTests.testVNCAcrossVersionsReversesBitsTruncatesPasswordAndEncryptsOnce' started at 2026-11-15 00:30:34.552
Test Case 'RFBHandshakeTests.testVNCAcrossVersionsReversesBitsTruncatesPasswordAndEncryptsOnce' passed (0.001 seconds)
Test Case 'RFBHandshakeTests.testVersionNegotiationAndMalformedBanners' started at 2026-11-15 00:30:34.553
Test Case 'RFBHandshakeTests.testVersionNegotiationAndMalformedBanners' passed (0.0 seconds)
Test Suite 'RFBHandshakeTests' passed at 2026-11-15 00:30:34.553
	 Executed 11 tests, with 0 failures (0 unexpected) in 0.003 (0.003) seconds
Test Suite 'RFBMessageTests' started at 2026-11-15 00:30:34.553
Test Case 'RFBMessageTests.testClientMessagesRequireConnectedState' started at 2026-11-15 00:30:34.553
Test Case 'RFBMessageTests.testClientMessagesRequireConnectedState' passed (0.0 seconds)
Test Case 'RFBMessageTests.testEmptyFramebufferUpdateRequestsNextFrame' started at 2026-11-15 00:30:34.553
Test Case 'RFBMessageTests.testEmptyFramebufferUpdateRequestsNextFrame' passed (0.0 seconds)
Test Case 'RFBMessageTests.testEveryClientMessageHasExactWireBytes' started at 2026-11-15 00:30:34.554
Test Case 'RFBMessageTests.testEveryClientMessageHasExactWireBytes' passed (0.01 seconds)
Test Case 'RFBMessageTests.testServerClipboardBellAndIgnoredColourMapStayAligned' started at 2026-11-15 00:30:34.564
Test Case 'RFBMessageTests.testServerClipboardBellAndIgnoredColourMapStayAligned' passed (0.0 seconds)
Test Case 'RFBMessageTests.testUnknownMessageAndOversizedClipboardFailImmediately' started at 2026-11-15 00:30:34.564
Test Case 'RFBMessageTests.testUnknownMessageAndOversizedClipboardFailImmediately' passed (0.0 seconds)
Test Suite 'RFBMessageTests' passed at 2026-11-15 00:30:34.564
	 Executed 5 tests, with 0 failures (0 unexpected) in 0.011 (0.011) seconds
Test Suite 'RFBZRLETests' started at 2026-11-15 00:30:34.564
Test Case 'RFBZRLETests.testCompleteSessionHasIdenticalOutputAtEverySplit' started at 2026-11-15 00:30:34.564
Test Case 'RFBZRLETests.testCompleteSessionHasIdenticalOutputAtEverySplit' passed (0.005 seconds)
Test Case 'RFBZRLETests.testInflaterHasOutputBudgetAndClientChecksReturnedSize' started at 2026-11-15 00:30:34.569
Test Case 'RFBZRLETests.testInflaterHasOutputBudgetAndClientChecksReturnedSize' passed (0.0 seconds)
Test Case 'RFBZRLETests.testInflaterNotCalledUntilEntireRectangleArrives' started at 2026-11-15 00:30:34.570
Test Case 'RFBZRLETests.testInflaterNotCalledUntilEntireRectangleArrives' passed (0.0 seconds)
Test Case 'RFBZRLETests.testInflaterStreamContinuesAcrossRectanglesAndUpdates' started at 2026-11-15 00:30:34.570
Test Case 'RFBZRLETests.testInflaterStreamContinuesAcrossRectanglesAndUpdates' passed (0.0 seconds)
Test Case 'RFBZRLETests.testMalformedDeflateAndOversizedCompressedLengthFail' started at 2026-11-15 00:30:34.570
Test Case 'RFBZRLETests.testMalformedDeflateAndOversizedCompressedLengthFail' passed (0.0 seconds)
Test Case 'RFBZRLETests.testMalformedTilesAreTerminalWithoutChangingFramebuffer' started at 2026-11-15 00:30:34.570
Test Case 'RFBZRLETests.testMalformedTilesAreTerminalWithoutChangingFramebuffer' passed (0.001 seconds)
Test Case 'RFBZRLETests.testPackedPaletteFourBitsAndUnusedRowPadding' started at 2026-11-15 00:30:34.572
Test Case 'RFBZRLETests.testPackedPaletteFourBitsAndUnusedRowPadding' passed (0.0 seconds)
Test Case 'RFBZRLETests.testPackedPaletteOneBitPadsEachRow' started at 2026-11-15 00:30:34.572
Test Case 'RFBZRLETests.testPackedPaletteOneBitPadsEachRow' passed (0.0 seconds)
Test Case 'RFBZRLETests.testPackedPaletteTwoBitsUsesMSBFirst' started at 2026-11-15 00:30:34.572
Test Case 'RFBZRLETests.testPackedPaletteTwoBitsUsesMSBFirst' passed (0.0 seconds)
Test Case 'RFBZRLETests.testPaletteRLESingletonAndExtendedRunLength' started at 2026-11-15 00:30:34.573
Test Case 'RFBZRLETests.testPaletteRLESingletonAndExtendedRunLength' passed (0.001 seconds)
Test Case 'RFBZRLETests.testPlainRLEAndExtendedRunLength' started at 2026-11-15 00:30:34.573
Test Case 'RFBZRLETests.testPlainRLEAndExtendedRunLength' passed (0.0 seconds)
Test Case 'RFBZRLETests.testRawCPIXELExpandsBGRToOpaqueBGRA' started at 2026-11-15 00:30:34.574
Test Case 'RFBZRLETests.testRawCPIXELExpandsBGRToOpaqueBGRA' passed (0.0 seconds)
Test Case 'RFBZRLETests.testSolidSubencoding' started at 2026-11-15 00:30:34.574
Test Case 'RFBZRLETests.testSolidSubencoding' passed (0.0 seconds)
Test Case 'RFBZRLETests.testTilesAre64By64AndEdgeTilesUseRemainingDimensions' started at 2026-11-15 00:30:34.574
Test Case 'RFBZRLETests.testTilesAre64By64AndEdgeTilesUseRemainingDimensions' passed (0.002 seconds)
Test Case 'RFBZRLETests.testZRLEWritesAtRectangleOffset' started at 2026-11-15 00:30:34.577
Test Case 'RFBZRLETests.testZRLEWritesAtRectangleOffset' passed (0.0 seconds)
Test Suite 'RFBZRLETests' passed at 2026-11-15 00:30:34.577
	 Executed 15 tests, with 0 failures (0 unexpected) in 0.012 (0.012) seconds
Test Suite 'Selected tests' passed at 2026-11-15 00:30:34.577
	 Executed 37 tests, with 0 failures (0 unexpected) in 0.031 (0.031) seconds
◇ Test run started.
↳ Testing Library Version: 6.3.3 (48d727cc1cf4eda)
↳ Target Platform: x86_64-unknown-linux-gnu
✔ Test run with 0 tests in 0 suites passed after 0.001 seconds.
```
