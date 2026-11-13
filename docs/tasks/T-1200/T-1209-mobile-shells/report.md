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

## 第 2 轮返工

### 变更与逐条验收

1. 已改：将 iOS 自定义 plist 键移到 XcodeGen `info.properties`，包含 `CFBundleExecutable` 等标准键；`mobile/ios/project.yml:30`。
2. 已改：修正 `WKNavigationResponse` 策略回调签名，并用 `value(forHTTPHeaderField:)` 读取 Content-Disposition；`mobile/ios/CryBot/ViewController.swift:195`。
3. 已改：处理 `shouldPerformDownload`、`blob/data/about`、网络错误域过滤和 UUID 下载目录；`mobile/ios/CryBot/ViewController.swift:146`、`:151`、`:194`、`:216`。
4. 已改：Android 下载先检查 HTTP(S)，并保护目标路径设置和队列入列；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:221`、`:235`、`:289`。
5. 已改：所有 Kotlin `catch` 使用具名异常参数，并清理未使用 import；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:186`、`:243`、`:272`、`:296`。
6. 已改：把自适应图标前景缩放并平移到安全区中心；`mobile/android/app/src/main/res/drawable/icon_foreground.xml:2`。
7. 已改：移除全屏 flag，加入 adjustResize 和系统栏/输入法 Insets padding；`mobile/android/app/src/main/AndroidManifest.xml:18`、`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:51`。
8. 已改：用 GET_CONTENT、扩展名 MIME 映射、多选标志，并合并 data/clipData Uri、取消回调 null；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:172`、`:175`、`:180`、`:316`、`:320`。
9. 已改：实现白名单弹窗导航在当前 WebView 加载、其他目标外开；`mobile/ios/CryBot/ViewController.swift:164`。
10. 已改：使用 `applicationNameForUserAgent` 在系统 UA 后追加 CryBot 版本；`mobile/ios/CryBot/ViewController.swift:85`。
11. 已改：构建注入服务器时隐藏更换服务器按钮；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:133`、`mobile/ios/CryBot/ViewController.swift:72`。
12. 已改：解析 intent URI 后加入 BROWSABLE 并清除 component/selector；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:264`。
13. 已改：媒体权限仅允许服务端/登录主机、只 grant 音频/视频，先拒绝旧请求；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:193`。
14. 已改：重试复用同一 WebView，只有 WebView 可见时处理返回后退；`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:141`、`:307`。
15. 已改：补充 `uiMode|smallestScreenSize|screenLayout|density` 配置变更；`mobile/android/app/src/main/AndroidManifest.xml:18`。
16. 已改：关闭备份、移除全局明文流量、服务器输入仅接受 HTTPS；`mobile/android/app/src/main/AndroidManifest.xml:10`、`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:286`。
17. 已改：声明相机和麦克风为可选硬件特性；`mobile/android/app/src/main/AndroidManifest.xml:6`。
18. 已改：背景改为带 0.55 中间色标的斜向 VectorDrawable 渐变，删除无用 inset 图标和根目录 InfoPlist.strings；`mobile/android/app/src/main/res/drawable/icon_background.xml:1`、删除 `mobile/android/app/src/main/res/mipmap/ic_launcher.xml` 与 `mobile/ios/CryBot/InfoPlist.strings`。
19. 已改：workflow 增加 contents read 权限和 iOS 通用模拟器 destination；`.github/workflows/mobile.yml:3`、`:48`。
20. 已改：Android README 说明 setup-gradle 指定 8.11.1 后直接运行 gradle，源码 import 和未使用权限字符串已清理；`mobile/android/README.md:9`、`mobile/android/app/src/main/kotlin/com/crysound/crybot/MainActivity.kt:3`。

### 第 2 轮检查

- `python3` 遍历解析 `mobile` 下 XML、plist、Contents.json，并用 PyYAML 解析 workflow/project.yml：`XML and JSON parse: OK`、`YAML parse: OK`。
- `grep -rniE 'maus|\\bomb\\b|@[a-z0-9-]+\\.(com|cn)' mobile .github/workflows/mobile.yml`：无命中。
- `rg` 检查 `SYSTEM_UI_FLAG_FULLSCREEN`、`usesCleartextTraffic`、匿名 catch、旧 WebKit 回调、已删除资源：无命中。
- `rg` 检查 `info.properties`、BuildConfig URL、下载/权限/文件选择、Insets、workflow 权限和 destination：关键标记均存在。
- 本机仍无 Android SDK、Gradle、XcodeGen、Swift/Xcode，未执行编译；最终编译由 GitHub Actions 执行。

### 需要协调者处理

- 首次 CI 重点确认 XcodeGen 生成的 Info.plist 包含 Xcode 标准键并正确展开命令行传入的 `CRYBOT_SERVER_URL`、`CRYBOT_LOGIN_HOSTS`。
- Android CI 重点确认 AGP 8.7.3 在 Gradle 8.11.1、compileSdk 35 下对 VectorDrawable aapt gradient 和 API 30 Insets 分支的 lint/build 结果。
- Android 传统图标仍按上一轮约束只提交 `mipmap-xxxhdpi` 一份 PNG，其余密度由系统缩放。
