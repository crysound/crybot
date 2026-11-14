# iOS 测试脚本

App 内截图测试继承 `SnapshotCase`，调用 `snapshot(view, feature: "Inbox", scene: "list")`。CI 通过 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 选择功能；测试代码读取 `CRY_SNAPSHOT_FEATURES`。内嵌网页功能只截原生入口和网页容器外框，feature 传 `WebHost`，scene 传入口名：`menu-global`、`menu-bot`、`summary-widget`、`container`。例如 `snapshot(view, feature: "WebHost", scene: "menu-global")` 生成 `webhost-menu-global-se-light`，图片名不会带 `webhost-webhost-` 前缀，不截网页内容。

交互流程继承 `ScreenshotCase`，先调用 `launch(scenario: "harness", appearance: "light")`，再调用 `snap("harness-launch")`。流程测试放在 `CryBotUITests/<Feature>/`，类名以 `FlowTests` 结尾。

文案表由以下命令生成或检查：

```sh
node mobile/ios/scripts/gen-strings.mjs
node mobile/ios/scripts/gen-strings.mjs --check
```

生成器读取 `CryBot/Features/*/web-keys.json` 和 `src/locales/*.json`，输出 `Web<Feature>.xcstrings` 以及 `CryBot/Strings/ServerText.xcstrings`。

`CRY_SNAPSHOT_FEATURES` 未设时本地全跑；`all` 全跑；`none` 或空列表全部跳过截图。ServerText 表保留 `{name}`，渲染器按名字替换、翻译引用部件并派生重置时间；Web 表按英文占位符首次出现的顺序使用 `%N$@`，字面百分号转为 `%%`。缺英文键会报错，`--check` 也检查遗留的 Web 表。

附件通过 `export-screenshots.sh OUTPUT FEATURES RESULT...` 导出，导出失败会报错；选中截图必须在 App 内截图目录有 PNG（UI 启动图不计入），`all` 必须有 12 张 `harness-basic`（含 `-axl`），检查同时读取 xcresulttool 的 `manifest.json` 名称映射。`assert-tests-ran.sh RESULT --required` 要求 passed、failed、expectedFailures 之和大于零，全部 skip 不算执行。

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
