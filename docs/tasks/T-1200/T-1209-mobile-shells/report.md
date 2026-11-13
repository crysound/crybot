# T-1209 移动端原生壳报告

## 新建文件

- `mobile/android/settings.gradle.kts`、`build.gradle.kts`、`gradle.properties`：声明 Android 工程、插件版本和 Gradle 运行参数。
- `mobile/android/app/build.gradle.kts`：配置 SDK、包名、版本、BuildConfig 字段和可选 release 签名。
- `mobile/android/app/src/main/AndroidManifest.xml`：声明 WebView 网络、摄像头、麦克风权限及启动 Activity。
- `mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt`：实现 WebView、持久 Cookie、导航白名单、文件选择、媒体权限、下载、错误页和返回键。
- `mobile/android/app/src/main/res/values*/*`：提供中英文界面字符串、主题和图标颜色。
- `mobile/android/app/src/main/res/drawable/*`、`mipmap-*/*`：提供渐变自适应图标和传统图标资源。
- `mobile/android/README.md`、`.gitignore`：记录本地构建、构建变量和签名变量，并忽略生成目录。
- `mobile/ios/project.yml`：描述 iOS 16+ 的 CryBot target、bundle id、构建设置和共享 scheme。
- `mobile/ios/CryBot/AppDelegate.swift`：创建应用窗口和根控制器。
- `mobile/ios/CryBot/ViewController.swift`：实现持久 WKWebView、导航规则、媒体提示、文件输入、下载分享、刷新、错误页和服务器设置页。
- `mobile/ios/CryBot/Info.plist`、`InfoPlist.strings`、`en.lproj/*`、`zh-Hans.lproj/*`：声明构建注入键、权限说明、启动画面和双语界面文本。
- `mobile/ios/CryBot/Assets.xcassets/*`：提供 1024 AppIcon 和 #170057 启动画面颜色。
- `mobile/ios/README.md`、`.gitignore`：记录 XcodeGen/xcodebuild 命令、命令行覆盖参数和签名说明，并忽略生成目录。
- `.github/workflows/mobile.yml`：运行 Android（JDK 17、Gradle 8.11.1）和 iOS（XcodeGen、模拟器）无签名 CI。
- `docs/tasks/T-1200/T-1209-mobile-shells/report.md`：本报告。

## 检查

- `find mobile -type f | sort`：确认两个工程的源码、资源、README 和构建文件均已生成。
- `python3 - <<'PY' ... ET.parse(...) ... json.loads(...) ... PY`：解析 AndroidManifest、Android XML 资源、iOS Info.plist 和 XcodeGen 资产 JSON，结果 `XML and JSON parse: OK`。
- `python3 - <<'PY' ... yaml.safe_load(...) ... PY`：解析 `.github/workflows/mobile.yml`，结果 `YAML parse: OK`。
- `grep -rniE 'maus|\bomb\b|@[a-z0-9-]+\.(com|cn)' mobile .github/workflows/mobile.yml`：无命中（示例地址使用 `example.com`）。
- `rg` 检查 SDK 版本、插件版本、BuildConfig、Cookie、下载、媒体权限、WKDownload、下拉刷新和签名设置关键项：`required mobile markers: OK`。
- 本机没有 Android SDK、Xcode 或网络，因此未执行 Gradle/Xcode 编译；由 GitHub Actions workflow 执行编译验证。

## 需要协调者处理

- CI 首次运行需确认 `gradle/actions/setup-gradle@v4` 在 Ubuntu runner 上可直接解析 Android SDK 35；工程未提交 wrapper，按要求使用 setup-gradle 提供的 Gradle 8.11.1。
- iOS CI 需确认 macOS-15 镜像预装的 Xcode 版本与 WKDownload/WebKit iOS 16 API 一致；`brew install xcodegen` 为唯一额外工具。
- Android 传统图标按约束只放置 `mipmap-xxxhdpi` 的 1024 PNG；自适应图标使用 VectorDrawable 背景和前景，其余密度由系统缩放。
