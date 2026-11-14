
## 2026-11-13 本轮实现报告

### 1. 文件改动

本轮没有 git 提交，没有修改服务端、Web 前端或 brand 源资源；除以下移动端/CI 文件外，仅按任务末尾的明确要求追加本报告，任务 brief 保持原样。

- `mobile/ios/project.yml`：新增 watchOS 10 单 target `CryBotWatch`、iOS 无宿主 XCTest target `CryBotWatchTests` 和对应 scheme，共享源码并把手表 App 嵌入 iOS 产物的 `Watch` 目录。
- `mobile/ios/.gitignore`：忽略由 XcodeGen 生成的手表 Info.plist。
- `mobile/ios/CryBot/AppDelegate.swift`：iPhone 恢复前台时触发登录同步。
- `mobile/ios/CryBot/ViewController.swift`：启动、选择服务器及主页面加载完成时通知登录同步器。
- `mobile/ios/CryBot/WatchSync.swift`：从 WebKit cookie store 读取对应服务器的登录 cookie，通过 WatchConnectivity 去重同步并响应前台刷新请求。
- `mobile/ios/Shared/WatchContract.swift`：提供两端共享的服务器校验、cookie 筛选、认证头、HTTP 错误分类、真实 wire JSON 模型和消息占位逻辑。
- `mobile/ios/CryBotWatch/APIClient.swift`：实现三个 HTTP 接口、15 秒超时、禁用 cookie/凭据缓存和重定向拒绝。
- `mobile/ios/CryBotWatch/Session.swift`：接收同步上下文并使用 AfterFirstUnlock Keychain 保存凭据，处理过期、服务器不匹配和重新同步。
- `mobile/ios/CryBotWatch/ConversationModel.swift`：管理最近 20 条消息、发送、排队、原 sendId 重试与回复等待状态。
- `mobile/ios/CryBotWatch/CryBotWatchApp.swift`：实现 SwiftUI 生命周期、机器人列表、会话气泡、系统文本输入、快捷回复和随页面/前后台切换的轮询。
- `mobile/ios/CryBotWatch/en.lproj/Localizable.strings`：提供 29 个英文界面文案。
- `mobile/ios/CryBotWatch/zh-Hans.lproj/Localizable.strings`：提供与英文键集合一致的 29 个简体中文文案。
- `mobile/ios/CryBotWatch/Assets.xcassets/AppIcon.appiconset/Contents.json`：声明 watchOS universal 单张 1024 图标。
- `mobile/ios/CryBotWatch/Assets.xcassets/AppIcon.appiconset/icon-ios-1024.png`：复制任务指定的 brand 图标，源文件未修改。
- `mobile/ios/CryBotWatchTests/WatchContractTests.swift`：新增 12 个契约行为测试，覆盖 cookie、有无 Access、域/路径/过期/端口、认证头、失效状态、解码和中英文占位。
- `mobile/ios/CryBotWatchTests/APIClientTests.swift`：新增 6 个隔离 URLProtocol 测试，覆盖实际请求、最近消息、网络中断后复用 sendId、登录失效、重定向拒绝和离线错误。
- `.github/workflows/mobile.yml`：新增手表编译、内嵌目录断言、动态模拟器选择、XCTest 执行及 xcresult 上传。
- `mobile/ios/README.md`：补充 Apple Watch 功能、登录同步、安全存储、限制、验证命令及签名/TestFlight 接入说明。
- `docs/tasks/T-1200/T-1211-watch/report.md`：追加本轮实现和验证记录。

### 2. 验证过程和结果

已执行：

1. `git diff --check`：通过，无空白格式问题。
2. `command -v swift swiftc xcodegen xcodebuild`：本机四项工具均不可用；未安装工具，也未运行 Xcode 编译或 XCTest。
3. 用 `python3` 和已有 PyYAML 的 `yaml.safe_load` 解析 `mobile/ios/project.yml` 与 `.github/workflows/mobile.yml`：通过；进一步断言三个 target、源文件路径、watchOS 10.0、bundle ID、自动签名/空团队、Info.plist 属性和依赖复制目录均符合任务要求。
4. 对照已读取的 XcodeGen 官方 `Docs/ProjectSpec.md` 逐项核对：`application` + `platform: watchOS` 为现代单 target；`sources` 接受共享目录和单文件；`dependencies.target`、`embed`、`link`、`copy.destination: productsDirectory` 与 `copy.subpath` 均是支持字段；`info.path/properties` 生成 plist；`bundle.unit-test`、scheme 的 build/test 配置使用文档定义。显式复制子路径是 `$(CONTENTS_FOLDER_PATH)/Watch`，不是旧式 WatchKit Extension。
5. 用 `python3` 逐文件核对 Swift 括号/分隔符，并人工复核 actor 隔离、delegate 必需方法、异步取消、类型与 API 可用版本：分隔符检查通过；这不等价于 Swift 编译通过。
6. 用 `python3` 解析两端 `Localizable.strings`：iOS 既有 7 键、手表新增 29 键，两种语言的键集合分别一致、无重复/空值；所有手表本地化引用都能找到键。
7. 用 `python3` 的 `json.loads` 解析 XCTest 中 6 份固定 JSON：全部通过；消息使用真实的 `id/role/kind/text/at/sendId/requestMessageId` 模型，`at` 按毫秒转换日期；机器人使用 `id/name/title/threadId/messages`，分页使用 `messages/hasMore/activeLeafId`，未知字段忽略，可选字段允许缺失。字段依据 `shared/wire.ts`、`server/routes/threads.ts`、`server/host/message-pages.ts` 和 `server/routes/bot-messages.ts` 核对。
8. 用 `python3` 核对 PNG 头和字节：图标确为 1024×1024，且与 `brand/icon-ios-1024.png` 完全一致；Contents.json 可解析且采用 watchOS 单尺寸格式。
9. 对所有 iOS job 的 `run` 内容执行 `bash -n`，并对内嵌 Python 执行 `compile`：通过；用 `/tmp` 独立临时目录启动模拟器清单夹具，确认能忽略不可用设备/iPad/手表并选择可用 iPhone，没有可用 iPhone 时失败，不写用户数据。
10. `rg -n 'print|os_log|Logger' mobile/ios`：无匹配（退出码 1），没有令牌或 cookie 日志；逐处检查 UserDefaults 写入，只有服务器地址和同步时间，认证信息只由应用写入 Keychain。
11. 执行任务给定的 `mobile/` 与 `.github/workflows/mobile.yml` 旧品牌残留扫描：无匹配（退出码 1）；新增示例网络地址仅用保留示例域名，没有引入内部部署地址、IP、邮箱或人名。

尚待协调者推送后的 macos-15 GitHub Actions 执行以下验收命令，**本轮没有将其记为通过**：

```sh
xcodegen generate
xcodebuild -scheme CryBot -sdk iphonesimulator -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData/iOS \
  build CODE_SIGNING_ALLOWED=NO
test -d 'DerivedData/iOS/Build/Products/Debug-iphonesimulator/Cry Bot.app/Watch/CryBotWatch.app'
xcodebuild -scheme CryBotWatch -sdk watchsimulator -configuration Debug \
  -destination 'generic/platform=watchOS Simulator' -derivedDataPath DerivedData/Watch \
  build CODE_SIGNING_ALLOWED=NO
xcrun simctl list
xcodebuild -scheme CryBotWatchTests -sdk iphonesimulator -configuration Debug \
  -destination "platform=iOS Simulator,id=$CRYBOT_TEST_SIMULATOR" \
  -derivedDataPath DerivedData/Tests -resultBundlePath DerivedData/WatchTests.xcresult \
  -parallel-testing-enabled NO test CODE_SIGNING_ALLOWED=NO
```

CI 在测试前从 `xcrun simctl list devices available --json` 结果中按 iPhone 名称筛选可用设备并设置上述环境变量，没有写死设备型号。18 个 XCTest 已编写但未在本机执行；API 测试的 URLProtocol 夹具拦截全部请求，重定向 delegate 测试也不启动真实网络任务。

当前检出缺少 AGENTS.md 指定的 `docs/verification/README.md`，因此未进行服务端会话链路集成验收，也没有向真实服务发请求。没有服务端/前端代码改动，未运行它们的构建或集成测试；不能据此宣称真实配对、语音输入或线上登录链路已验证成功。

### 3. 协调者后续事项和未验证项

- 开发者后台注册 `com.crysound.crybot.watchkitapp` App ID，配置与 iPhone 相同开发团队的证书和描述文件。
- 私有 TestFlight 流程继续 archive `CryBot` scheme、destination 使用 `generic/platform=iOS`，同时给 iOS/watchOS 两个 bundle ID 提供签名配置；手动 export options 需映射两份 provisioning profile，自动签名需保证两个 App ID 均有权限。
- iOS 与手表必须共用营销版本、构建号和同一服务器地址；archive 中检查 `Watch/CryBotWatch.app`，导出含手表的单一 iOS IPA 后上传，不单独上传 watchOS 包。
- 推送后确认两个 App scheme 编译、18 个 XCTest 和内嵌产物检查通过，再在隔离账号及配对设备上验收 WatchConnectivity、听写/随手写、过期重登、排队/重发和前后台轮询停止；禁止使用用户生产会话做变更验证。
- 未解决的验证限制是本机没有 Swift/Xcode/XcodeGen、缺少指定的验证说明，不能提供实际编译/测试/配对运行结果；如 runner 的 Xcode 版本触发 watchOS 打包兼容问题，以实际 CI 和 archive 验证结果为准，不应省略内嵌检查。
- 本任务按约定不包含系统推送、后台长连接、历史消息分页或服务器修改；App 关闭后内存中的待重发消息不持久保存。

## 第 2 轮：审核返工

本轮基于 f38df59 继续修改，处理必改项和本轮要求的全部八条建议，没有回退第一轮实现，没有 git 提交或推送。以下构建命令和行为说明替代前轮记录中的对应旧命令/旧行为；前轮记录按要求保留。

### 1. 文件与行为变更

- `.github/workflows/mobile.yml`：CryBot、CryBotWatch 和 CryBotWatchTests 三条 xcodebuild 命令全部去掉 `-sdk`，只用各自的 `-destination` 选择平台；模拟器 runtime 使用整数版本元组降序排列，修复 `iOS-18-10` 排在 `iOS-18-5` 后的问题。
- `mobile/ios/Shared/WatchContract.swift`：`WatchBot.threadId` 改为可选，BotList 逐项解码并跳过损坏、缺少/null/空 threadId 的 bot，保留其余可用条目；多个匹配 session cookie 按过期时间最晚选择，不使用公网端口优先规则；latestReply 优先选择时间最新的 bot 文本消息，没有文本时才回退到最新 bot 消息；HTTP 校验接收响应体，仅 401、302/303/307 和无 JSON `error` 的 403 返回登录过期，带 JSON `error` 的 403 返回请求失败。
- `mobile/ios/CryBotWatch/APIClient.swift`：列表改为 `messages=5`，会话页仍单独请求 `limit=20`；把响应体传入错误分类，并提供共用实例。
- `mobile/ios/CryBotWatch/CryBotWatchApp.swift`：列表使用共用 APIClient，进入会话前解包 threadId，避免视图重建时创建 URLSession。
- `mobile/ios/CryBotWatch/ConversationModel.swift`：会话模型也使用共用 APIClient，由初始化参数接收已解包的非可选 threadId，保留 StateObject 生命周期和原有轮询机制。
- `mobile/ios/CryBotWatch/Session.swift`：Keychain 保存和更新使用 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`，首次解锁后可访问，该 Keychain 项不随备份迁移到其他设备；原有 `report` 仅对 `.loginExpired` 标记过期，业务 403 的 `.rejected(403)` 不清凭据、不置过期、不改变轮询身份。
- `mobile/ios/CryBotWatch/en.lproj/Localizable.strings`：请求失败提示改为 `Request failed.`，不对权限拒绝一律提示重试。
- `mobile/ios/CryBotWatch/zh-Hans.lproj/Localizable.strings`：对应提示改为“请求失败”，两种语言继续使用 `REQUEST_FAILED` 键。
- `mobile/ios/CryBotWatchTests/WatchContractTests.swift`：改写 cookie 端口测试为最新过期时间测试，增加域/路径优先级不覆盖 session 到期时间、两类 403、其他重定向不误判过期、可选 threadId、混合坏条目的宽容列表解码、文本回复优先与回退测试。
- `mobile/ios/CryBotWatchTests/APIClientTests.swift`：断言 `messages=5`，补齐 307；通过隔离 URLProtocol 覆盖 HTML/非 error JSON 边缘 403 和服务端 JSON error 403，后者请求失败后可使用相同 client/凭据继续读取消息。
- `mobile/ios/README.md`：同步所有无 `-sdk` 的构建/测试命令、列表条数及跳过规则、cookie 选择、两类 403、Keychain 不跨设备迁移和模拟器排序说明。
- `docs/tasks/T-1200/T-1211-watch/report.md`：追加本节，保留此前报告。

已核对未修改的 `project.yml`：CryBot 的 `PRODUCT_NAME` 为 `Cry Bot`，CryBotWatch 的为 `CryBotWatch`，iOS 内嵌复制子目录为 `$(CONTENTS_FOLDER_PATH)/Watch`。因此保留检查路径 `DerivedData/iOS/Build/Products/Debug-iphonesimulator/Cry Bot.app/Watch/CryBotWatch.app`，是否实际生成该产物由 macOS CI 的 `test -d` 验证。没有修改任何 Contents.json 或图标。

### 2. 本机验证与限制

已执行：

1. `git diff --check`：通过。
2. `python3 /tmp/t1211-r2-static-check.py`：通过。此临时检查脚本使用已有 PyYAML 解析 workflow/project，检查所有 iOS job shell 的 `bash -n` 语法、三个 xcodebuild 命令均带 destination 且无 sdk 覆盖、PRODUCT_NAME、平台、最低版本和复制目录。
3. 同一脚本直接提取并执行 workflow 中实际的 Python 选设备代码，在 `/tmp` 独立临时目录提供四组 JSON 清单：`18-10` 优于 `18-5`；`18-10-1` 优于 `18-10` 和 `9-9`；跳过更新 runtime 下不可用 iPhone/iPad 及非 iOS runtime 后选择可用 iPhone；无可用 iPhone 时非零退出且不写环境变量。全部通过，没有调用真实模拟器或服务器。
4. 同一脚本检查 iOS 两种语言 7 个键、watchOS 两种语言 29 个键均匹配、无重复/空值，所有手表文案引用有定义；解析 XCTest 的 17 份原始 JSON 字面量成功；Swift 分隔符检查通过。分隔符检查与人工检查不等价于 Swift 编译。
5. 人工复核可选 threadId 的全部使用点、逐条解码推进、共享 URLSession 生命周期、403 到 `Session.report` 和轮询循环的错误传播，以及本轮新增 API 的 iOS 16/watchOS 10 可用性。没有为业务 403 设置 expired 或清除凭据的代码路径；真实界面轮询尚未运行验证。
6. `rg -n 'print|os_log|Logger|NSLog|debugPrint' mobile/ios` 和 `rg -ni 'maus|omb_' mobile/ .github/workflows/mobile.yml`：无匹配；未新增令牌日志或内部地址。
7. 工具探测：`swift`、`swiftc`、`xcodegen`、`xcodebuild`、`plutil` 全部不可用，因此跳过 plutil，没有执行 Swift 编译、XCTest 或设备操作。当前共 26 个 XCTest（较前轮净增 8 个），均仍需 macOS Actions 执行。

当前 worktree 和主仓库均缺少 AGENTS.md 引用的 `docs/verification/README.md`；本轮未声明服务端/真实会话链路验证通过，也未接触 live app 或用户数据。网络行为的 XCTest 继续使用全部请求由 URLProtocol 拦截的固定夹具，但本机没有执行这些 XCTest。

### 3. 协调者后续验收

请协调者推送后检查 Mobile builds 的 iOS job 全部步骤通过，尤其不能仅以第一条编译成功代替手表构建、内嵌检查和测试结果。等价命令为：

```sh
xcodegen generate
xcodebuild -scheme CryBot -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData/iOS \
  build CODE_SIGNING_ALLOWED=NO
test -d 'DerivedData/iOS/Build/Products/Debug-iphonesimulator/Cry Bot.app/Watch/CryBotWatch.app'
xcodebuild -scheme CryBotWatch -configuration Debug \
  -destination 'generic/platform=watchOS Simulator' -derivedDataPath DerivedData/Watch \
  build CODE_SIGNING_ALLOWED=NO
xcodebuild -scheme CryBotWatchTests -configuration Debug \
  -destination "platform=iOS Simulator,id=$CRYBOT_TEST_SIMULATOR" \
  -derivedDataPath DerivedData/Tests -resultBundlePath DerivedData/WatchTests.xcresult \
  -parallel-testing-enabled NO test CODE_SIGNING_ALLOWED=NO
```

`CRYBOT_TEST_SIMULATOR` 由 workflow 前一步选出的可用 iPhone UDID 提供。本轮没有远程 CI 结果，不能把 exit 65 已消除、26 个测试已通过或手表内嵌成功写成已验证事实。

开发者后台的手表 App ID/描述文件、同一团队的两个 bundle 签名以及 TestFlight archive/export 仍由协调者处理，步骤见前轮和 README。合并顺序仍需保证服务端 `cry_` 令牌改名先就绪。WatchConnectivity、首次解锁及 Keychain 设备迁移限制、听写/随手写、前后台轮询及两种 403 的界面行为，还需隔离账号和配对设备验收；没有新增服务端修改或第三方依赖。
