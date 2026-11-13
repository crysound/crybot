# Cry Bot iOS

工程由 XcodeGen 的 `project.yml` 描述，不提交 `.xcodeproj`。要求 Xcode 15 或更新版本、iOS 16 SDK 和 XcodeGen。生成并构建：

```sh
xcodegen generate
xcodebuild -scheme CryBot -sdk iphonesimulator -configuration Debug build CODE_SIGNING_ALLOWED=NO
```

服务器配置使用构建设置注入。因为 xcconfig 中的 `//` 会被解析为注释，默认值在 `project.yml` 的 settings 中留空；实际值从 `xcodebuild` 命令行传入：

```sh
xcodegen generate
xcodebuild -scheme CryBot -sdk iphonesimulator -configuration Debug build \
  CRYBOT_SERVER_URL=https://bot.example.com \
  CRYBOT_LOGIN_HOSTS=team.example.com,login.example.com \
  MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1 \
  CODE_SIGNING_ALLOWED=NO
```

服务器地址只接受 `https`。未提供 `CRYBOT_SERVER_URL` 时，首次启动显示填写服务器地址界面。签名由部署环境处理；可通过 `DEVELOPMENT_TEAM` 和其他 Xcode 签名设置在私有构建中注入，本仓库不包含团队 ID。
