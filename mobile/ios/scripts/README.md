# iOS 测试脚本

App 内截图测试继承 `SnapshotCase`，调用 `snapshot(view, feature: "Inbox", scene: "list")`。CI 通过 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 选择功能；测试代码读取 `CRY_SNAPSHOT_FEATURES`。内嵌网页功能只截原生入口和网页容器外框，feature 传 `WebHost`，scene 传入口名：`menu-global`、`menu-bot`、`summary-widget`、`container`。例如 `snapshot(view, feature: "WebHost", scene: "menu-global")` 生成 `webhost-menu-global-se-light`，图片名不会带 `webhost-webhost-` 前缀，不截网页内容。

交互流程继承 `ScreenshotCase`，先调用 `launch(scenario: "harness", appearance: "light")`，再调用 `snap("harness-launch")`。流程测试放在 `CryBotUITests/<Feature>/`，类名为 `<Feature>FlowTests`。App 内截图测试类名为 `<Feature>SnapshotTests`，放在 `CryBotTests` 下。

文案表由以下命令生成或检查：

```sh
node mobile/ios/scripts/gen-strings.mjs
node mobile/ios/scripts/gen-strings.mjs --check
```

生成器读取 `CryBot/Features/*/web-keys.json` 和 `src/locales/*.json`，输出 `Web<Feature>.xcstrings` 以及 `CryBot/Strings/ServerText.xcstrings`。

`CRY_SNAPSHOT_FEATURES` 未设时本地全跑；`all` 全跑；`none` 或空列表全部跳过截图。ServerText 表保留 `{name}`，渲染器按名字替换、翻译引用部件并派生重置时间；Web 表按英文占位符首次出现的顺序使用 `%N$@`，字面百分号转为 `%%`。ServerText 也包含 `approval.held.*` 的 heldCode 文案。缺英文键会报错，`--check` 只检查 `Features/<Feature>/Web<Feature>.xcstrings` 这种命名的遗留生成表；普通生成删除这些遗留表。其他命名或子目录的表不参与清理，例如 `Features/WebHost/WebHost.xcstrings`、`WebHostMenu.xcstrings` 是手写表，会保留。

附件通过 `export-screenshots.sh OUTPUT FEATURES RESULT...` 导出；找不到 `.xcresult` 或所有结果都没有执行测试时，先打印「测试未运行（编译或启动失败），见上一步日志」并失败。按 `CryBotTests` 内 Swift 源码的类声明识别 `<Feature>SnapshotTests`（不区分功能名大小写）：选中的功能存在该类，就必须在 App 内截图目录产出至少一张该功能前缀的 PNG；不存在该类时打印警告并继续，允许 0 张。多个功能逐个检查，其他功能或 UI 启动图不计入。`all` 仍必须有 12 张 `harness-basic`（含 `-axl`），检查同时读取 xcresulttool 的 `manifest.json` 名称映射且要求文件存在。Nightly 另外运行 `assert-screenshots.py OUTPUT none --require-launch iPhone16 iPhoneSE iPhoneProMax`，分别要求 `CryBotUITests-<机型>` 目录至少有一张 `harness-launch-*` PNG，不能跨机型补足。`assert-tests-ran.sh RESULT --required` 要求 passed、failed、expectedFailures 之和大于零，全部 skip 不算执行。

Linux 自测（一次一个文件）：

```sh
node --test mobile/ios/scripts/gen-strings.test.mjs
node mobile/ios/scripts/gen-strings.mjs --check
bash mobile/ios/scripts/ui-test-selection.test.sh
bash mobile/ios/scripts/assert-tests-ran.test.sh
python3 mobile/ios/scripts/assert-screenshots.test.py
node --test mobile/ios/scripts/workflows.test.mjs
```

工作流自测在临时目录运行实际步骤，使用假的 `xcodebuild`/`xcrun`；只验证选择和失败处理，不代表模拟器测试通过。无功能 FlowTests 目录但选中了截图功能时，Mobile builds 跑 `HarnessFlowTests`；`all` 跑整个 `CryBotUITests`。

选择脚本通过 `git -c core.quotePath=false diff --name-only` 接收逐行路径。功能名仅接受 `^[A-Za-z0-9]+$`，含空格、非 ASCII 或其他字符时选 `all`；文件名和子目录名可含空格或非 ASCII。`mobile/ios/scripts/**`、`.github/workflows/mobile.yml` 和 `.github/workflows/ios-nightly.yml` 改动也选 `all`。未选中功能时输出 `none`，PR 和 main push 都向测试进程传此哨兵值。
