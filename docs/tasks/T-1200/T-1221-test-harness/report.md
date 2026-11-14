# T-1221-04 截图流水线与文案生成器

## 本轮改动

- `.github/workflows/mobile.yml`：保留原有构建、CryKit 和手表测试结构，加入 PR 功能选择、App 内截图、XCUITest、零测试保护和 `ios-screenshots` 产物；main push 清空截图选择并跳过交互流程。
- `.github/workflows/ios-nightly.yml`：新增每日/手动全量工作流，覆盖 iPhone SE（缺失时回退 iPhone 16e）、iPhone 16、iPhone 16 Pro Max，并加入每周 iOS 18 的非阻塞 job。
- `mobile/ios/CryBotTests/Support/SnapshotCase.swift`：提供三种固定尺寸、深浅色、动态字体、附件命名和功能选择开关；文档写明内嵌网页只截入口和容器外框。
- `mobile/ios/CryBotTests/Support/HarnessSnapshotTests.swift`：提供含 List、ScrollView、UIViewRepresentable 的基础截图和 Accessibility L 截图。
- `mobile/ios/CryBotTests/Support/ServerTextRendererTests.swift`：覆盖文案原文和码本身回退及参数替换。
- `mobile/ios/CryBotUITests/Support/ScreenshotCase.swift`：提供夹具启动和交互截图附件。
- `mobile/ios/CryBotUITests/Support/HarnessFlowTests.swift`：启动夹具并截 `harness-launch`。
- `mobile/ios/CryBotUITests/Placeholder.swift`：删除只会跳过的占位测试。
- `mobile/ios/scripts/ui-test-selection.sh`、`ui-test-selection.test.sh`：按改动路径输出截图功能和 FlowTests 参数，并覆盖 Linux bash 自测场景。
- `mobile/ios/scripts/assert-tests-ran.sh`：按调用方选择是否要求 xcresult 至少执行一个测试。
- `mobile/ios/scripts/gen-strings.mjs`、`gen-strings.test.mjs`：生成/检查 Web 功能和 ServerText xcstrings，处理 16 个语言代码、缺失键和插值参数位置。
- `mobile/ios/CryBot/Strings/ServerText.xcstrings`：按当前 `shared/server-text.ts` 命名空间生成的服务端文案表。
- `mobile/ios/CryBot/Strings/ServerTextRenderer.swift`：读取 ServerText 表并在缺键时回退服务端原文或码本身。
- `mobile/ios/scripts/README.md`：记录截图、内嵌网页截图范围、交互流程和文案生成器用法。

## 本地验证

以下命令在 InstaBox Linux 沙箱中执行：

- `crybot-link-deps`：成功链接 73 个预装依赖。
- `node --test mobile/ios/scripts/gen-strings.test.mjs`：通过（3 个断言场景在 Node test runner 中通过）。
- `bash mobile/ios/scripts/ui-test-selection.test.sh`：通过，`Features/Inbox` 输出 `Inbox` 且没有 FlowTests 参数。
- `node mobile/ios/scripts/gen-strings.mjs --check`：退出码 0。
- `bash -n mobile/ios/scripts/*.sh`：通过。
- 用伪造的 `xcrun xcresulttool` 输出演示 `assert-tests-ran.sh`：普通模式允许 0 个测试，`--required` 对 0 个测试返回失败。
- 用 Node `yaml` 包解析 `.github/workflows/mobile.yml` 和 `.github/workflows/ios-nightly.yml`：格式通过。

当前沙箱没有 Xcode、Swift 编译器、macOS 模拟器或端口监听能力，因此 Swift 编译、App 内截图、XCUITest 和两个 Actions 工作流只能由 macOS Actions 验证；本地没有声称这些项目通过。仓库现状也没有 `server/testing/ios-contract/coverage.ts`，覆盖表条目需协调者按主线文件补录。

## 覆盖表项目

按本任务目标覆盖：App 内截图基类和固定尺寸/深浅色附件、动态字体截图、内嵌网页截图约束文档、XCUITest 启动和截图基类、改动路径选择、xcresult 零测试保护、PR/nightly 截图产物、16 语言 xcstrings 生成和检查、服务端文案渲染及回退。

## 需要协调者处理

- `project.yml` 仍未改：需要把 `CryBot/Strings/*.xcstrings` 作为资源、把 `CryBotTests/Support/**` 和 `CryBotUITests/Support/**` 纳入对应 target（按第 1.3 节变更通道处理）。
- 43 接入 Linux 检查时使用：`node mobile/ios/scripts/gen-strings.mjs --check`。
- 请在 macOS Actions 上验证 Swift、截图、XCUITest、附件导出和 iOS 18 runtime；本轮没有运行链接可填写。
- 请在 PR 上演示一次选择不存在 FlowTests 类时 `assert-tests-ran.sh --required` 失败，并补充运行链接。

## 第 2 轮返工（2026-11-14）

本节追加于第 1 轮记录之后；前文的测试数量、环境判断和待办以本节复核为准。已重读 brief 和 iOS 原生规格。开工执行 `crybot-link-deps`，成功链接 73 个预装依赖。没有提交 git，没有修改范围外的源文件，也没有接触运行中的用户 App 或数据。仓库中缺少 AGENTS.md 引用的 `docs/verification/README.md`；本次没有服务器或会话变更，脚本测试均使用独立临时目录和假工具。

### 改动文件

| 文件 | 本轮改动 |
|---|---|
| `.github/workflows/mobile.yml` | 修正选择结果读取与日志、main push 的 `none`、全量 XCUITest 分支，以及独立的 always 附件导出和强制截图检查。 |
| `.github/workflows/ios-nightly.yml` | 拆开周日 cron，三台机型汇总失败后再退出，导出失败附件，补齐 iOS 18 runtime/设备/包锁处理和独立产物名。 |
| `mobile/ios/CryBot/Strings/ServerText.xcstrings` | 重新生成 389 个键，保留具名占位符，新增 `serverError.*`；保留上游翻译缺失状态。 |
| `mobile/ios/CryBot/Strings/ServerTextRenderer.swift` | 按名字替换参数，格式化整数，翻译引用部件，按语言及服务端时区派生 resets，缺内容时保留英文原文或回退英文表。 |
| `mobile/ios/CryBotTests/Support/ServerTextRendererTests.swift` | 增加命中实际资源表、16 种语言的参数顺序/英文回退、额外参数、数字、引用部件和时间等 10 个 XCTest 方法。 |
| `mobile/ios/CryBotTests/Support/SnapshotCase.swift` | 修正文档与 none 开关，断言 drawHierarchy 成功并采样像素，补 `[SnapshotSize].all`，明确主线程隔离。 |
| `mobile/ios/CryBotUITests/Support/ScreenshotCase.swift` | 去掉未约定的 contentSize 参数及 `-CryContentSize`，明确主线程隔离。 |
| `mobile/ios/scripts/gen-strings.mjs` | ServerText 生成具名模板，Web 按英文位置编号并转义百分号，检查英文缺键和旧 Web 表。 |
| `mobile/ios/scripts/gen-strings.test.mjs` | 使用 import.meta.url 定位，增加语言映射、顺序、缺键、旧表等 7 个用例，CLI 子进程输出写入临时文件。 |
| `mobile/ios/scripts/ui-test-selection.sh` | 将 App、共享代码和资源的非功能路径纳入 all，完整输出 help，去掉 mapfile 依赖。 |
| `mobile/ios/scripts/ui-test-selection.test.sh` | 在隔离目录覆盖共享路径、真实存在的功能 UI 目录、Inbox 无流程、stdin、空选择和 help。 |
| `mobile/ios/scripts/assert-tests-ran.sh` | 统计 passedTests + failedTests + expectedFailures，独立打印 skippedTests，required 不接受全 skip。 |
| `mobile/ios/scripts/assert-tests-ran.test.sh` | 假 xcrun 覆盖全 skip、零测试、成功/失败/预期失败、非法及缺失 summary。 |
| `mobile/ios/scripts/export-screenshots.sh` | 汇总所有结果包的附件导出失败并继续导出，最后检查 App 内截图目录的 PNG，避免 UI 启动图掩盖截图缺失。 |
| `mobile/ios/scripts/assert-screenshots.py` | 非空有效选择必须有 PNG；all 必须齐备 12 张 harness-basic，支持 manifest 的实际文件映射。 |
| `mobile/ios/scripts/assert-screenshots.test.py` | 5 个临时目录用例覆盖零图、缺图、manifest 映射、UI 截图不可掩盖 App 截图缺失及失败后继续导出。 |
| `mobile/ios/scripts/workflows.test.mjs` | 9 个用例解析真实工作流并用假工具执行选择、XCUITest、三机失败汇总和 iOS 18 步骤。 |
| `mobile/ios/scripts/README.md` | 修正 WebHost 的 feature/scene 示例，说明具名模板、选择哨兵、导出检查和自测命令。 |

### 19 项返工逐项结果

| 项 | 结果与验证边界 |
|---|---|
| 1 | `all` 明确传 `-only-testing:CryBotUITests`，包括现有 `HarnessFlowTests`；有功能参数用功能参数；有效功能没有流程目录时运行 HarnessFlowTests；只有空选择/none 跳过。假 xcodebuild 的工作流回归通过，PR 真机型执行数待 Actions。 |
| 2 | 日常 cron 为 `17 19 * * 1-6`，周日为 `17 19 * * 0`；nightly 无 job 条件，周日同一次运行还启动 ios-18-weekly；回归通过。 |
| 3 | 周任务产物改为 `ios-screenshots-ios18`，普通任务仍为 `ios-screenshots`；回归通过。 |
| 4 | 采用第二种方案：ServerText 表保留 `{name}`，Swift 按名字替换，不依赖字母序或位置。Swift 用同一个 backupContinuingSignedOut 键遍历 16 个语言资源（已有翻译为 en/pt-BR/zh-Hant，其他回退英文），同时带额外 aaa、resetsAt、timeZone；Swift 执行待 Actions。Web 表单独统一使用英文首次出现顺序，Node 用例通过。 |
| 5 | 整数 Double 输出 `3`，分数保留 `3.5`，零归一为 `0`；Swift 单测断言完整文本，执行待 Actions。 |
| 6 | 基类和 README 都写明 feature="WebHost"，scene 为 menu-global、menu-bot、summary-widget、container；示例图片名只含一次 webhost。 |
| 7 | required 按实际执行数计数，日志分别打印执行和跳过数，全 skip 自测失败符合预期。去掉附件导出 `|| true`，截图上传缺文件报错；all 的 12 个名字分别检查，manifest 记录必须指向实际存在的 PNG；5 个截图检查用例通过。实际 xcresulttool 导出和 PNG 数待 Actions。 |
| 8 | AppDelegate、Assets、所有 lproj、ViewController、Shared、App/Store/Design/Strings、测试 Support/Shell、顶层测试文件、Watch、Packages、project.yml、Package.resolved 均覆盖 all；临时 CryBotUITests/Chat 目录输出实际 only-testing 参数；选择自测通过。 |
| 9 | 先运行选择脚本写文件，成功后才读两行；直接打印 scope[0]/scope[1]。模拟选择脚本 exit 7 时步骤 exit 7，未写出空 scope；回归通过。 |
| 10 | 只有 push 且 refs/heads/main 使用 none；main workflow_dispatch 和非 main push 都为 all；回归通过。 |
| 11 | main push 传明确 none，SnapshotCase 显式跳过；未设变量的本地运行仍全选；空功能列表也跳过截图。工作流传值已自测，Swift 跳过行为待 Actions。 |
| 12 | iOS 18 已安装时不下载，否则下载具体 18.6；没有 iPhone 16 就创建。生成项目后复制 Package.resolved，两个 xcodebuild 都传包缓存路径及自动解析禁用参数（有锁时）；runtime/创建设备假工具回归通过，真实下载/构建待 Actions。 |
| 13 | 三处附件导出均为单独 always 步骤；nightly 三个 destination 逐一运行并汇总失败，第一台失败后第二/三台仍调用，随后退出失败；独立导出步骤保留失败结果附件，回归通过。 |
| 14 | 断言 drawHierarchy 返回 true，并缩采样到 64×64 RGBA，要求有可见且颜色非均匀的像素；实际渲染待 Actions。 |
| 15 | limit/meanwhile/why 仅对规定部件键翻译（也支持网页已接受的 routines.server.part）；普通参数原样使用。resetsAt 按毫秒和 timeZone 派生 resets，使用地区时间格式。缺部件/参数/非法时区保留服务端英文，未给原文则尝试英文表；单测已补，待 Actions。 |
| 16 | 缺英文键直接失败，check 检出遗留 Web 表，普通生成删除遗留生成表；serverError 已收入 ServerText；Web 字面百分号转 %%；Node 自测通过。 |
| 17 | 测试定位基于 import.meta.url，在其他 cwd 启动生成器；zh-Hans、zh-Hant、pt-BR 映射及无效 JSON 的 source-hashes 跳过均有用例并通过。 |
| 18 | --help 显示输入、两行输出、all 的调用方行为、共享路径和示例；自测通过。 |
| 19 | 删除 -CryContentSize 及对应可选参数；保留 launch(scenario:appearance:) 和 gallery。 |

### 本地验证命令与输出

本地只使用预装依赖；workflows.test.mjs 使用仓库已有的 yaml（当前预装 2.9.0），没有新增依赖。一次只运行一个测试文件；未使用 systemd。

| 命令 | 本地结果 |
|---|---|
| `crybot-link-deps` | 退出 0；linked 73 entries。 |
| `node --test mobile/ios/scripts/gen-strings.test.mjs` | 退出 0；当前沙箱进程隔离模式只汇总显示文件级 pass 1。 |
| `node --test --test-isolation=none mobile/ios/scripts/gen-strings.test.mjs` | 退出 0；7 tests、7 pass、0 fail，显示各用例。 |
| `node mobile/ios/scripts/gen-strings.mjs --check` | 退出 0，无输出。 |
| `bash mobile/ios/scripts/ui-test-selection.test.sh` | 退出 0；ui-test-selection: ok。 |
| `bash mobile/ios/scripts/assert-tests-ran.test.sh` | 退出 0；assert-tests-ran: ok。 |
| `python3 mobile/ios/scripts/assert-screenshots.test.py` | 退出 0；Ran 5 tests / OK。 |
| `node --test mobile/ios/scripts/workflows.test.mjs` | 退出 0；文件级 pass 1。 |
| `node --test --test-isolation=none mobile/ios/scripts/workflows.test.mjs` | 退出 0；9 tests、9 pass、0 fail。 |
| 修改过的 bash 脚本逐个 `bash -n`；工作流内嵌 shell 由 workflows.test.mjs 逐项 `bash -n` | 通过；两个 YAML 同时解析成功。 |
| `git diff --check` | 退出 0。 |
| `git diff --name-only \| mobile/ios/scripts/ui-test-selection.sh` | 输出第一行 all、第二行空；工作流将其解释为整个 CryBotUITests。 |

为探测 Swift 编译器并在可用时逐文件 parse，执行了 `/tmp/crybot-harness-swift-parse.sh`：先 `command -v swiftc`，再检查 `/opt/swift/usr/bin/swiftc`；若存在则对 Strings、CryBotTests/Support、CryBotUITests/Support 内的 Swift 文件逐个执行 `swiftc -parse -module-cache-path "$PWD/mobile/ios/.linux-cache/clang" "$file"`。本次原始输出如下：

```text
swiftc unavailable: not on PATH; /opt/swift/usr/bin/swiftc does not exist.
Swift parse not run. macOS compilation and XCTest require Actions.
```

所以本轮没有 Swift parse、编译或 XCTest 通过的结论，也没有 Xcode/macOS 模拟器截图。沙箱不能监听端口，未运行 e2e；无 systemd。仓库也尚无任务 43 的 linux-test.sh/linux-check.sh，未伪称执行过它们。

### 原任务 7 条验收逐条复核

| 原验收 | 本轮结果 |
|---|---|
| 1. harness-basic 三尺寸×深浅共 6 张，加 axl 6 张，List/ScrollView 可见 | 基类、视图和附件命名存在，补齐 drawHierarchy/像素断言及导出后 12 张检查；真实截图数量、内容待 Actions/协调者看图。 |
| 2. PR Mobile builds 30 分钟内；手动 nightly 90 分钟内、三机 harness-launch | 三机尝试与失败后导出逻辑本地回归通过；真实耗时和三机截图待协调者手动运行，不能以 YAML 超时值代替测量。 |
| 3. Node 测试及生成器 --check | 两条指定命令退出 0；给 43 的命令仍为 `node mobile/ios/scripts/gen-strings.mjs --check`。 |
| 4. 选择脚本自测、Inbox 无 FlowTests、本 PR all | 自测通过，Inbox 输出 Inbox/空行；当前差异输出 all/空行；真实 PR 日志待 Actions。有效截图功能无流程时额外运行 HarnessFlowTests 符合本轮“只在空选择时跳过”的要求。 |
| 5. 不存在 FlowTests 的零测试失败演示 | 假工具回归已运行 NonexistentFlowTests，0 测试或全部 skip 都失败；真实 PR 临时演示及运行链接仍由协调者补充。 |
| 6. 单元逻辑及 Actions 通过 | Node 7 用例、工作流 9 用例、Python 5 用例及两个 bash 自测本地通过；新增 Swift 10 个方法待 Actions，无本地编译结论。 |
| 7. Mobile builds、iOS Linux、Public scan 绿且实际测试数>0 | 尚未推分支、未运行 Actions，无运行链接；由协调者推送后填写状态、测试数、截图数。 |

### 覆盖表与协调者交接

- 当前 checkout 仍没有 `server/testing/ios-contract/coverage.ts`。本任务完善的是截图/流程测试基础设施、选择与零测试保护、文案表生成/渲染；不把它们冒充具体 WireMessage/ServerFrame 等业务联合类型项完成，也未修改覆盖表。
- `project.yml` 当前已有 CryBot（递归含 Strings）、CryBotTests、CryBotUITests 的 sources 规则，本轮未发现需要再添加的行；第 1 轮报告中“必须加 Support 和 Strings 规则”不再作为确定待办。由 macOS 构建确认 xcstrings 被编译入 App，命中真实表的 Swift 单测会检测漏资源。
- 无超范围源文件改动，无新增依赖；为 `.all` 默认参数补 Array 扩展属于原允许的 SnapshotCase.swift。
- 请协调者推分支后补 Mobile builds、iOS Linux（43 接入后）、Public scan 运行链接，确认 PR 实际跑 HarnessFlowTests；手动触发 nightly，记录三机执行数、harness-launch 截图及总耗时；核对全量 12 张 harness-basic 的 List/ScrollView/UIKit 内容。
- iOS 18 的真实 runtime 下载、创建、包锁和非阻塞测试结果也以 Actions 为准。截图导出检查支持 xcresulttool manifest 的 exportedFileName/suggestedHumanReadableName 映射，但本地没有真实 xcresult，最终命名兼容性必须由第一次 macOS 运行确认。
- 给任务 43 的生成器检查命令：`node mobile/ios/scripts/gen-strings.mjs --check`。其余自测命令见上表；协调者仍需补真实“选中不存在 FlowTests”的失败演示链接。
