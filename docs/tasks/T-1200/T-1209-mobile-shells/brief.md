# T-1209 Cry Bot 安卓、iOS 原生壳

## 目标
新增 `mobile/android` 和 `mobile/ios` 两个原生 App 工程：打开就是一个全屏 WebView，加载 Cry Bot 服务端网页；登录在 WebView 里完成并持久保存；能上传文件、下载、用麦克风。再加一个 GitHub Actions workflow，能在 CI 里编译这两个工程(不签名)。

## 背景
- 执行规格：`docs/specs/2026-11-13-crybot.md`，先读一遍，本任务对应第 7 节的 Android、iOS 两条，以及第 2 节的包名(都是 `com.crysound.crybot`)和第 5 节最后一条(公开仓库不能有内部域名、IP、邮箱、人名)。
- 服务端网址和登录域名**不写死在仓库里**，构建时传入：
  - `CRYBOT_SERVER_URL`：服务端地址，如 `https://bot.example.com`。
  - `CRYBOT_LOGIN_HOSTS`：逗号分隔的登录相关主机名(Cloudflare Access 团队域、身份源域等)，这些主机的顶层跳转留在 WebView 里。
  - 构建时没给 `CRYBOT_SERVER_URL` 时：首次打开显示一个原生的「填写服务器地址」界面(中英文按系统语言)，保存到本地后加载；错误页上提供「更换服务器」入口。
- 登录流程：服务端前面是 Cloudflare Access，未登录时顶层跳转到 Access 团队域，再到身份源(飞书)登录页，登录完跳回服务端，cookie 写在服务端域名上。所以 cookie 必须持久保存(重启 App 不丢)，第三方 cookie 也要允许(安卓 `setAcceptThirdPartyCookies`)。
- 身份源页面可能尝试打开飞书 App(非 http/https 的 scheme 或 intent:// 链接)：交给系统处理；系统处理不了就忽略，不要让 WebView 显示错误页。
- 品牌素材在 `brand/`：`icon-ios-1024.png`(1024 不透明，iOS 和安卓商店图标都用它)、`B.svg`(64×64 视图框，路径和渐变都在里面)、`gen.mjs`(颜色定义)。
- 本仓库其他部分正被另一个任务大规模改名，本任务只新建文件，不碰 `mobile/` 和新 workflow 以外的任何文件。

## 要做的事
### 安卓 `mobile/android`
1. Kotlin，单模块 `app`，`minSdk 26`、`compileSdk 35`、`targetSdk 35`，JDK 17。用 AGP 8.7.3、Kotlin 2.1.0 插件，Gradle 8.11.1(不放 gradle wrapper 的 jar，CI 用 `gradle/actions/setup-gradle` 指定版本直接跑 `gradle`；在 `mobile/android/README.md` 写清)。**不依赖 androidx 或其他三方库**，只用 Android 框架类，减少依赖解析。
2. `applicationId com.crysound.crybot`，应用名 `Cry Bot`，`versionCode`/`versionName` 从环境变量 `CRYBOT_VERSION_CODE`(默认 1)、`CRYBOT_VERSION_NAME`(默认 `0.1.0`)读。`CRYBOT_SERVER_URL`、`CRYBOT_LOGIN_HOSTS` 从环境变量或 Gradle 属性读进 `BuildConfig` 字段(要开 `buildFeatures.buildConfig`)。
3. 一个 Activity，全屏 WebView：开 JavaScript、DOM storage、媒体自动播放不需手势可不开；`CookieManager` 接受 cookie 和第三方 cookie，`onPause` 时 `flush()`；User-Agent 末尾追加 ` CryBotApp/<versionName> Android`。
4. 顶层导航规则：目标主机等于服务端主机或在 `CRYBOT_LOGIN_HOSTS` 里 → 留在 WebView；其他 http/https → 用系统浏览器打开；其他 scheme / intent:// → 尝试交给系统，失败忽略。只管主框架导航。
5. 文件上传(`onShowFileChooser`，支持多选和 accept 类型)；麦克风/摄像头(`onPermissionRequest` 时先请求对应运行时权限，用户同意后 grant，拒绝则 deny)；下载(`DownloadListener` 用 `DownloadManager`，带上 `CookieManager` 里该网址的 cookie 和 UA，文件名用 `URLUtil.guessFileName`)。
6. 返回键：WebView 能后退就后退，否则退出。下拉刷新不用做(不引 androidx)。加载失败(主框架)显示原生错误界面：一句说明 + 「重试」 + 「更换服务器」。
7. 图标：自适应图标(`mipmap-anydpi-v26`)，背景层是 `B.svg` 的紫色渐变(VectorDrawable 的 gradient)，前景层是白色圆顶脸和眼睛(从 `B.svg` 的路径换算到 108dp 画布、居中放进安全区)；再从 `brand/icon-ios-1024.png` 缩放生成各密度的传统 `ic_launcher.png`(如果你那边没有缩放工具，就只放 `mipmap-xxxhdpi` 一份，在汇报里说明)。
8. release 签名从环境变量读：`CRYBOT_ANDROID_KEYSTORE`(keystore 文件路径)、`CRYBOT_ANDROID_KEYSTORE_PASSWORD`、`CRYBOT_ANDROID_KEY_ALIAS`、`CRYBOT_ANDROID_KEY_PASSWORD`；都有才配 release 签名，否则 release 不签名。不开混淆。
9. 中文、英文两套字符串(`values`、`values-zh`)。

### iOS `mobile/ios`
1. Swift，iOS 16+，用 XcodeGen 的 `project.yml` 描述工程(不提交 `.xcodeproj`)。target `CryBot`，bundle id `com.crysound.crybot`，显示名 `Cry Bot`。
2. `CRYBOT_SERVER_URL`、`CRYBOT_LOGIN_HOSTS` 作为 build setting(默认空)，写进 Info.plist 的自定义键，代码从 Bundle 读。**注意**：xcconfig 里 `//` 会被当成注释，所以默认值放 `project.yml` 的 settings 里留空，实际值由 CI 用 `xcodebuild ... CRYBOT_SERVER_URL=https://...` 命令行传入(命令行不受此影响)，在 `mobile/ios/README.md` 写清。`MARKETING_VERSION`、`CURRENT_PROJECT_VERSION` 也由命令行覆盖。
3. 一个全屏 `WKWebView`(默认持久化 data store)，User-Agent 追加 ` CryBotApp/<version> iOS`(`customUserAgent` 或 `applicationNameForUserAgent`)；导航规则同安卓第 4 条(外部 http/https 用 `UIApplication.shared.open`)；`input type=file` 用系统默认；麦克风/摄像头用 `requestMediaCapturePermissionFor` 返回 `.prompt`；下载用 `WKDownload`，完成后弹分享面板；`UIRefreshControl` 下拉刷新；主框架加载失败显示原生错误界面(说明 + 重试 + 更换服务器)；没配置服务器时显示填写服务器地址界面(同安卓)。
4. Info.plist：`ITSAppUsesNonExemptEncryption = NO`；`NSMicrophoneUsageDescription`、`NSCameraUsageDescription`、`NSPhotoLibraryUsageDescription` 中英文(用 `InfoPlist.strings` 的 `en`、`zh-Hans`)；`UILaunchScreen` 用纯色背景(#170057)；只竖屏可不限制，iPad 支持全部方向。
5. AppIcon：`Assets.xcassets/AppIcon.appiconset` 只放一个 1024 单尺寸图标，复制 `brand/icon-ios-1024.png`。
6. 签名留给私有部署仓库：`project.yml` 里 `CODE_SIGN_STYLE` 用 Automatic、`DEVELOPMENT_TEAM` 留空由命令行传，不写任何团队 ID。

### CI
新建 `.github/workflows/mobile.yml`：只在 `mobile/**` 或该文件变化时、以及手动触发时运行。
- Android job(`ubuntu-24.04`)：`actions/setup-java` 17、`gradle/actions/setup-gradle`(gradle-version 8.11.1)，在 `mobile/android` 跑 `gradle assembleDebug lintDebug`，上传 debug APK 为 artifact。
- iOS job(`macos-15`)：`brew install xcodegen`，`xcodegen generate`，`xcodebuild -scheme CryBot -sdk iphonesimulator -configuration Debug build CODE_SIGNING_ALLOWED=NO`。
- 不设任何 secret，不签名。

## 范围
- 可以改(新建)：`mobile/**`、`.github/workflows/mobile.yml`。
- 不要动其他任何文件(包括 `brand/`、根 `package.json`、`.gitignore`；`mobile/` 自己的 `.gitignore` 可以加)。

## 验收标准
本机沙箱没有 Android SDK、Xcode，也不联网，编译验证由协调者推到 GitHub Actions 跑。你要做到：
- [ ] 两个工程结构完整，按上面每一条实现；`gradle assembleDebug lintDebug` 和 `xcodebuild ... build` 在 CI 环境下应当一次通过(仔细核对 AGP/Kotlin/Gradle 配置写法、Manifest 权限、Swift 语法和 API 可用性)。
- [ ] 仓库中新文件里没有内部域名、IP、邮箱、人名，也没有 `maus`/`omb` 字样：`grep -rniE 'maus|\bomb\b|@[a-z0-9-]+\.(com|cn)' mobile .github/workflows/mobile.yml` 无命中(示例域名用 `example.com`)。
- [ ] 两份 README 写清：构建需要的环境变量/命令行参数、本地构建命令、签名变量。
- [ ] 能离线跑的检查都跑一下(比如 `python3 -c` 解析 XML/YAML 合法性)，把命令和结果写进汇报。

## 约束
- 不要 git 提交。沙箱禁网，不要装东西。
- 只写必要的注释。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1209-mobile-shells/report.md`。用中文：
1. 新建了哪些文件，每个一句话。
2. 做了哪些检查，命令和结果。
3. 需要协调者处理的：CI 上最可能出问题的地方、你拿不准的版本/API、缺的图标尺寸。
