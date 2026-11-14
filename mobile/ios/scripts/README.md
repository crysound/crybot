# iOS 测试脚本

App 内截图测试继承 `SnapshotCase`，调用 `snapshot(view, feature: "Inbox", scene: "list")`。CI 通过 `TEST_RUNNER_CRY_SNAPSHOT_FEATURES` 选择功能；测试代码读取 `CRY_SNAPSHOT_FEATURES`。内嵌网页功能只截原生入口和网页容器外框，场景名使用 `webhost-<入口>`，不截网页内容。

交互流程继承 `ScreenshotCase`，先调用 `launch(scenario: "harness", appearance: "light")`，再调用 `snap("launch")`。流程测试放在 `CryBotUITests/<Feature>/`，类名以 `FlowTests` 结尾。

文案表由以下命令生成或检查：

```sh
node mobile/ios/scripts/gen-strings.mjs
node mobile/ios/scripts/gen-strings.mjs --check
```

生成器读取 `CryBot/Features/*/web-keys.json` 和 `src/locales/*.json`，输出 `Web<Feature>.xcstrings` 以及 `CryBot/Strings/ServerText.xcstrings`。
