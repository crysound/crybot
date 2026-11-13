# Cry Bot iOS

工程由 XcodeGen 的 `project.yml` 描述，不提交 `.xcodeproj`。要求 Xcode 15 或更新版本、iOS 16 SDK 和 XcodeGen。生成并构建：

```sh
xcodegen generate
xcodebuild -scheme CryBot -configuration Debug -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO
```

`xcodegen generate` 会按 `project.yml` 的 `info.path` 生成 `CryBot/Info.plist`，该文件是构建产物，不提交到仓库。

服务器配置使用构建设置注入。因为 xcconfig 中的 `//` 会被解析为注释，默认值在 `project.yml` 的 settings 中留空；实际值从 `xcodebuild` 命令行传入：

```sh
xcodegen generate
xcodebuild -scheme CryBot -configuration Debug -destination 'generic/platform=iOS Simulator' build \
  CRYBOT_SERVER_URL=https://bot.example.com \
  CRYBOT_LOGIN_HOSTS=team.example.com,login.example.com \
  MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1 \
  CODE_SIGNING_ALLOWED=NO
```

服务器地址只接受 `https`。未提供 `CRYBOT_SERVER_URL` 时，首次启动显示填写服务器地址界面。签名由部署环境处理；可通过 `DEVELOPMENT_TEAM` 和其他 Xcode 签名设置在私有构建中注入，本仓库不包含团队 ID。

## Apple Watch

`CryBotWatch` 是 watchOS 10.0+ 的原生 SwiftUI 单 target App，随 iPhone App 内嵌安装（`Cry Bot.app/Watch/CryBotWatch.app`）。它显示机器人列表（每个机器人最多获取 5 条消息，优先预览最近的文本回复）及当前会话最近 20 条消息；列表跳过无法解码或缺少有效 `threadId` 的机器人。支持系统文本输入面板提供的听写/随手写，以及中英文快捷回复。非文本消息显示占位，不下载附件、不执行工具操作。列表前台每 15 秒刷新，会话页每 3 秒刷新，发送后等待回复期间每 2 秒刷新；后台停止轮询。发送失败可用原 `sendId` 重试，忙时显示“已排队”。

手表不单独登录。iPhone 启动、恢复前台、WebView 主页面加载完成时，从持久化 WebKit cookie 中选取服务器域下的 `cry_session_*` 和 `CF_Authorization`；多个匹配的 session cookie 按到期时间从晚到早选取，不根据公网 URL 端口匹配 cookie 名。通过 WatchConnectivity application context 同步服务器地址与令牌；内容不变时不重复发送。手表“重试”会向可达的前台 iPhone 请求重新读取 cookie；iPhone 不可达或不在前台时提示打开手机 App。手表把认证信息存入 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` Keychain（首次解锁后可访问，令牌不随备份迁移到其他设备），UserDefaults 仅保存地址和同步时间；API 使用无 cookie 存储的 ephemeral URLSession，携带 Bearer 与 Access cookie，拒绝重定向。

`CRYBOT_SERVER_URL` 同样注入手表 Info.plist。未配置时使用 iPhone 同步的地址；配置时必须与 iPhone 的地址一致，否则拒绝使用同步令牌。`CryBotWatch/Info.plist` 与 iOS 的 Info.plist 一样由 XcodeGen 生成，不提交。项目中的 `application` + `platform: watchOS` 使用现代 App 生命周期，无 WatchKit Extension；依赖的 `embed: true` 和 `copy.destination: productsDirectory`、`copy.subpath: $(CONTENTS_FOLDER_PATH)/Watch` 明确指定内嵌目录。字段依据 XcodeGen Project Spec 的 Target、Dependency、Plist、Scheme/Test Action 定义核对。

限制：没有 APNs/系统推送，只有打开 App 时自动刷新；不提供并发后台同步或历史分页。Access 令牌过期后，需在 iPhone 打开 Cry Bot，完成必要的重新登录，再回手表重试。401、302/303/307 和不带 JSON `error` 字段的 403 视为登录过期；带 JSON `error` 的服务端 403 显示“请求失败”，保留会话并继续轮询。登录过期会保留当前内存中的消息；更换服务器或会话账号后清空旧视图。听写、连接手机和 Keychain 行为还需用隔离测试账号在真实配对设备上验收。

CI 分别编译 iOS 和 watchOS scheme，检查 iOS 产物内的 Watch App，然后在 runner 实际存在的 iPhone 模拟器上跑 `CryBotWatchTests`。测试 target 无宿主 App，直接编译共享 Swift 逻辑与 APIClient；URLProtocol 固定响应夹具拦截全部请求，不访问真实服务器或用户数据。可在 macOS 上执行：

```sh
xcodegen generate
xcodebuild -scheme CryBot -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData/iOS \
  build CODE_SIGNING_ALLOWED=NO
test -d 'DerivedData/iOS/Build/Products/Debug-iphonesimulator/Cry Bot.app/Watch/CryBotWatch.app'
xcodebuild -scheme CryBotWatch -configuration Debug \
  -destination 'generic/platform=watchOS Simulator' build CODE_SIGNING_ALLOWED=NO
xcrun simctl list devices available
xcodebuild -scheme CryBotWatchTests -configuration Debug \
  -destination "platform=iOS Simulator,id=$CRYBOT_TEST_SIMULATOR" test CODE_SIGNING_ALLOWED=NO
```

最后一条命令需将 `CRYBOT_TEST_SIMULATOR` 设置成上一条列出的 iPhone UDID；CI 会按 runtime 版本号数值从新到旧排序，再按设备名称筛选可用 iPhone。测试包含 cookie 域/路径/有效期筛选、认证头、重定向与登录失效、真实 wire JSON 解码、占位文本和发送请求幂等标识。

签名和上架由协调者完成：在开发者后台为 `com.crysound.crybot.watchkitapp` 注册 App ID 和对应描述文件，与 iPhone App 使用同一开发团队。TestFlight 流程继续归档 `CryBot` scheme（`generic/platform=iOS`），它会构建并嵌入 watchOS App；为两个 bundle ID 都提供签名配置，手动签名的 export options 需同时映射两份 provisioning profile，自动签名需确保两者权限和证书齐全。共享 `MARKETING_VERSION`、`CURRENT_PROJECT_VERSION` 与服务器构建设置，检查 archive 中的 `Watch/CryBotWatch.app` 后统一导出并上传 iOS IPA，不单独上传手表 App。公开 CI 不签名、不上传 TestFlight。
