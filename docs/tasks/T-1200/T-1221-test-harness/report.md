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


## 第 3 轮小修（2026-11-14）

开工先执行 `crybot-link-deps`，输出 `crybot-link-deps: linked 73 entries`；已阅读 brief、r2 和原生规格，在前两轮分支改动基础上完成本轮修改。未提交 git，未安装依赖，未改允许范围以外的源码。`docs/verification/README.md` 在当前 checkout 中仍不存在；本轮没有服务端或会话实现变更，脚本自测使用临时目录、假 xcrun/xcodebuild，路径测试使用临时 Git 仓库的暂存 diff（不创建提交），未接触用户运行中的 App 或数据。

### 改动文件

| 文件 | 第 3 轮改动 |
|---|---|
| `.github/workflows/mobile.yml` | PR diff 禁用非 ASCII 路径转义，并把空选择规范化为 none。 |
| `.github/workflows/ios-nightly.yml` | 导出后逐机检查三份 CryBotUITests 目录的 harness-launch，即使 App 截图检查失败也继续检查并汇总退出状态。 |
| `mobile/ios/scripts/ui-test-selection.sh` | 脚本和两份 iOS 工作流改动归 all，功能名只接受 ASCII 字母数字，空选择输出 none。 |
| `mobile/ios/scripts/ui-test-selection.test.sh` | 覆盖流水线路径、非法功能名、空格及非 ASCII 路径、none。 |
| `mobile/ios/scripts/export-screenshots.sh` | 将对应的 CryBotTests 源码目录显式传给截图校验器。 |
| `mobile/ios/scripts/assert-screenshots.py` | 根据实际 SnapshotTests 类逐功能要求 PNG，无类则警告；增加三台机型的启动截图检查，保留 all 的 12 张检查。 |
| `mobile/ios/scripts/assert-screenshots.test.py` | 10 个临时夹具用例覆盖有类零图失败、无类零图继续、跨功能/跨机型不可补图、manifest 和导出错误。 |
| `mobile/ios/scripts/gen-strings.mjs` | 旧表清理限定为 Features/<名字>/Web<名字>.xcstrings，ServerText 命名空间加入 approval.held。 |
| `mobile/ios/scripts/gen-strings.test.mjs` | 增加手写表不删除、不报遗留及英文 5 个 heldCode 键的生成检查。 |
| `mobile/ios/CryBot/Strings/ServerText.xcstrings` | 重新生成 394 个键，新增 5 个 approval.held.* 及已有翻译。 |
| `mobile/ios/CryBot/Strings/ServerTextRenderer.swift` | resets 改用 Date.FormatStyle 显式要求两位小时，保留本地化月日、12/24 小时制和服务端时区。 |
| `mobile/ios/CryBotTests/Support/ServerTextRendererTests.swift` | 补 5 个 heldCode 完整英文文案及 en_US/en_GB/zh_Hans 两位小时 XCTest 断言。 |
| `mobile/ios/scripts/workflows.test.mjs` | 增加 PR none、真实 Git 空格/非 ASCII 路径及 nightly 三机启动截图检查的工作流回归。 |
| `mobile/ios/scripts/README.md` | 写明按类存在性要求截图、三机启动截图检查、合法功能名、none 和生成表清理边界。 |
| `docs/tasks/T-1200/T-1221-test-harness/report.md` | 追加本节，保留前两轮记录。 |

### 8 项逐项结果

| 项 | 实现及本地结果 |
|---|---|
| 1 | 扫描 CryBotTests 中的 Swift 类声明，不依赖源文件名。选中的功能不存在 <名字>SnapshotTests 时警告并继续；存在时必须有对应功能前缀的 PNG，多个功能分别检查，其他功能和 UI 图不能掩盖缺图。支持 manifest 映射且要求 PNG 文件实际存在。all 仍要求 harness-basic 三尺寸×深浅×普通/axl 共 12 个名字。两种情况均有自测，包含调用实际导出脚本的用例。 |
| 2 | mobile/ios/scripts/**、mobile.yml、ios-nightly.yml 都选 all；Bash 用例通过，当前分支 diff 选择输出 all/空行。 |
| 3 | 工作流使用 git -c core.quotePath=false diff --name-only；功能名正则为 ^[A-Za-z0-9]+$，非法名称归 all。覆盖含空格、中文、重音字母、连字符、下划线、逗号的功能名；合法功能内的非 ASCII 子目录和含空格文件名仍按功能选。临时 Git 仓库设置 core.quotePath=true，使用工作流的命令覆盖选项读取暂存 diff，确认 Unicode 路径不会变成空选择。 |
| 4 | 选择脚本无匹配时输出 none；工作流读入后也将空首行转为 none。普通空 PR 选择和模拟脚本输出空行均有用例。 |
| 5 | 仅清理功能目录直属的 Web<目录名>.xcstrings；WebHost/WebHost.xcstrings、WebHost/WebHostMenu.xcstrings 以及嵌套子目录中的表保留原内容，--check 不报遗留；真正的 WebInbox 旧表仍被检测和清理。 |
| 6 | nightly 对 CryBotUITests-iPhone16、CryBotUITests-iPhoneSE、CryBotUITests-iPhoneProMax 分别要求至少一张 harness-launch-*。逐个机型缺图、整个目录缺失、manifest 指向已删除 PNG 都不能通过；App 导出检查失败后仍执行启动图检查。 |
| 7 | approval.held.* 的 native、sandbox、outbound、undeliveredFull、undelivered 共 5 键进入 ServerText；生成器从实际英文目录验证 5 键，Swift 测试通过既有 render(ServerTextLine(textCode: ...)) 接口断言完整英文且不使用 fallback。Swift 测试执行待 Actions。 |
| 8 | 使用 hour(.twoDigits(amPM: .abbreviated))，与网页 Intl.DateTimeFormat 的 hour: "2-digit" 对齐。补 09:00 在 en_US、en_GB、zh_Hans 的断言；毫秒时间戳和 Asia/Tokyo 时区不变。月份/标点/空白仍由各平台本地化数据决定；Swift 实际输出待 Actions，不声称本地运行通过。 |

### 本地验收命令与原始输出

一次只运行一个测试文件，无 systemd。以下六项指定检查全部退出 0。Node 默认测试隔离模式显示文件级计数，所以另以 --test-isolation=none 显示用例明细：生成器 8/8，工作流 12/12。Python 截图检查 10/10。

```text
$ node --test mobile/ios/scripts/gen-strings.test.mjs
✔ mobile/ios/scripts/gen-strings.test.mjs (914.639294ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 932.239967
Exit code: 0
```

```text
$ node mobile/ios/scripts/gen-strings.mjs --check
Exit code: 0
```

```text
$ bash mobile/ios/scripts/ui-test-selection.test.sh
ui-test-selection: ok (isolated paths, feature flow directory, shared files, pipeline paths, ASCII feature names, spaces, Unicode, none, stdin, help)
Exit code: 0
```

```text
$ bash mobile/ios/scripts/assert-tests-ran.test.sh
assert-tests-ran: ok (executed/skipped counts, required, malformed/missing summary)
Exit code: 0
```

```text
$ python3 mobile/ios/scripts/assert-screenshots.test.py
..........
----------------------------------------------------------------------
Ran 10 tests in 0.171s

OK
/data/tmp/tmpop243edm: 12 PNG screenshots
All 12 harness-basic screenshots are present
/data/tmp/tmpop243edm: 12 PNG screenshots
/data/tmp/tmp4j6iqalf: 0 PNG screenshots
/data/tmp/tmp4j6iqalf: 0 PNG screenshots
/data/tmp/tmp4j6iqalf: 0 PNG screenshots
/data/tmp/tmp4j6iqalf: 1 PNG screenshots
/data/tmp/tmp4j6iqalf: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhone16: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneSE: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneProMax: 1 PNG screenshots
All required devices have harness-launch screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhone16: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneSE: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneProMax: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhone16: 2 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneSE: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneProMax: 1 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhone16: 2 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneSE: 2 PNG screenshots
/data/tmp/tmp_687si47/CryBotUITests-iPhoneProMax: 1 PNG screenshots
/data/tmp/tmpgt1s2wr9: 12 PNG screenshots
All 12 harness-basic screenshots are present
/data/tmp/tmpgt1s2wr9: 11 PNG screenshots
/data/tmp/tmpg567y2bx: 0 PNG screenshots
/data/tmp/tmpyjy2x8bk: 1 PNG screenshots
/data/tmp/tmpyjy2x8bk: 0 PNG screenshots
Exit code: 0
```

```text
$ node --test mobile/ios/scripts/workflows.test.mjs
✔ mobile/ios/scripts/workflows.test.mjs (1000.191025ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1008.650131
Exit code: 0
```

```text
$ node --test --test-isolation=none mobile/ios/scripts/gen-strings.test.mjs
✔ Web interpolation uses English positions, repeated names and escaped literal percents (1.434611ms)
✔ maps all renamed language codes and keeps English positions across languages (0.45907ms)
✔ ServerText retains named placeholders across languages (0.573521ms)
✔ missing English key fails generation even if a translation exists (46.974523ms)
✔ skips source-hashes.json, includes serverError and maps locale files (2.892212ms)
✔ --check fails for stale content and succeeds after regeneration (161.285935ms)
✔ --check and generation only clean exactly named generated feature tables (200.853124ms)
✔ ServerText includes all five production heldCode messages (156.933173ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 592.927465
Exit code: 0
```

```text
$ node --test --test-isolation=none mobile/ios/scripts/workflows.test.mjs
✔ workflow YAML and every embedded shell script parse (91.628696ms)
✔ main push uses none; manual main and other push use all; PR logs both scope lines (27.98886ms)
✔ selection script failure fails the workflow step without publishing empty selection (10.862678ms)
✔ PR with no selected feature publishes none, including an empty script result (24.490438ms)
✔ real git diff preserves spaces and Unicode paths for PR selection (76.116354ms)
✔ all runs the full UI target; selected flows run; only empty/none scope skips (118.386945ms)
✔ a missing or entirely skipped UI class fails the required guard (81.244338ms)
✔ nightly tries all three destinations before returning failure (103.886924ms)
✔ nightly checks launch screenshots for all three devices even if snapshot export fails (26.417959ms)
✔ daily and weekly cron do not overlap; exports run after failures; artifact names differ (1.292051ms)
✔ iOS 18 downloads a concrete version only when no runtime is available (62.302075ms)
✔ iOS 18 creates a missing iPhone 16 (43.835462ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 727.54242
Exit code: 0
```

附加检查：`bash -n mobile/ios/scripts/ui-test-selection.sh mobile/ios/scripts/ui-test-selection.test.sh mobile/ios/scripts/export-screenshots.sh` 和 `git diff --check` 均退出 0、无输出；workflows.test.mjs 同时解析两份 YAML 并逐段检查内嵌 shell。`git -c core.quotePath=false diff --name-only | mobile/ios/scripts/ui-test-selection.sh` 输出第一行 `all`、第二行空。

Swift 探测脚本 `/tmp/t1221-r3-swift-parse.sh` 先找 PATH 中的 swiftc，再检查 /opt/swift/usr/bin/swiftc；如果可用，逐个运行本轮两个改动文件的 `swiftc -parse -module-cache-path "$PWD/mobile/ios/.linux-cache/clang" "$file"`。实际输出原文：

```text
swiftc unavailable: not on PATH; /opt/swift/usr/bin/swiftc does not exist.
Swift parse not run. macOS compilation and XCTest require Actions.
```

没有 Swift 工具链，故本轮未执行 parse、编译或 XCTest；没有 Xcode/macOS，也没有模拟器截图结果。沙箱禁止监听端口，e2e 未运行。以上本地脚本结果不代替 Actions 的构建、测试和真实附件导出。

### 覆盖表与协调者交接

- 当前 checkout 仍无 `server/testing/ios-contract/coverage.ts`；本轮是测试基础设施及服务端文案渲染修正，不新增业务覆盖项，也未修改覆盖表。
- 不需要新增依赖或 project.yml 行，无超范围源码改动。给任务 43 的命令仍为 `node mobile/ios/scripts/gen-strings.mjs --check`。
- 请协调者推分支后补 Mobile builds、iOS Linux、Public scan 和 nightly 的运行链接；真实 Swift 编译/XCTest、12 张 harness-basic 内容、三台机型 harness-launch、实际执行数与耗时以 Actions 为准。前轮要求的“不存在 FlowTests”真实失败演示仍需协调者补链接。
- 本轮没有运行 Actions，没有提交或推送 git。除这些环境相关验收外，8 项修改和相应本地脚本自测已完成。

## T-1221-test-harness 第 4 轮

### 改动文件

| 文件 | 改动 |
|---|---|
| `mobile/ios/project.yml` | CryBot 主 App 在保留显示名 `Cry Bot` 的同时固定 `PRODUCT_MODULE_NAME: CryBot`，解决 `@testable import CryBot` 的编译失败。CryBotWatch 的 `PRODUCT_NAME` 已是无空格的 `CryBotWatch`，没有 widget 目标，因此无需增加其他模块名设置。 |
| `mobile/ios/scripts/export-screenshots.sh` | 导出前检查 `.xcresult` 是否存在且至少有一个结果实际执行测试；缺失或未运行时打印「测试未运行（编译或启动失败），见上一步日志」并失败。 |
| `mobile/ios/scripts/assert-screenshots.test.py` | 为无结果包、结果包全跳过、正常无 SnapshotTests 类、UI 附件和导出失败场景补充夹具。 |
| `mobile/ios/scripts/workflows.test.mjs` | 增加 project.yml 中 `PRODUCT_MODULE_NAME: CryBot` 的回归断言。 |
| `mobile/ios/scripts/README.md` | 记录截图导出在编译或启动失败时的诊断信息。 |
| `docs/tasks/T-1200/T-1221-test-harness/report.md` | 追加第 4 轮记录。 |

### 本地验证

已按要求在仓库根目录先运行 `crybot-link-deps`，输出：

```text
crybot-link-deps: linked 73 entries from /opt/crybot-deps/node_modules into /data/home/codex-t-1221-test-harness-d622561cfdb4/node_modules
```

第 3 轮脚本自测重新执行，结果如下：

```text
$ node --test mobile/ios/scripts/gen-strings.test.mjs
✔ mobile/ios/scripts/gen-strings.test.mjs
ℹ pass 1
Exit code: 0

$ node mobile/ios/scripts/gen-strings.mjs --check
Exit code: 0

$ bash mobile/ios/scripts/ui-test-selection.test.sh
ui-test-selection: ok (isolated paths, feature flow directory, shared files, pipeline paths, ASCII feature names, spaces, Unicode, none, stdin, help)
Exit code: 0

$ bash mobile/ios/scripts/assert-tests-ran.test.sh
assert-tests-ran: ok (executed/skipped counts, required, malformed/missing summary)
Exit code: 0

$ python3 mobile/ios/scripts/assert-screenshots.test.py
............
----------------------------------------------------------------------
Ran 12 tests in 0.357s

OK
Exit code: 0

$ node --test mobile/ios/scripts/workflows.test.mjs
✔ mobile/ios/scripts/workflows.test.mjs
ℹ pass 1
Exit code: 0

（以 `--test-isolation=none` 展开用例时为 13/13，新增模块名断言也通过。）
```

新增夹具确认无 `.xcresult` 和结果全跳过时均输出指定「测试未运行（编译或启动失败），见上一步日志」，不会再只报 `0 PNG`。`bash -n mobile/ios/scripts/export-screenshots.sh`、`git diff --check` 均无输出且退出 0；工作流自测同时解析 `project.yml` 和两份 iOS workflow。当前环境没有 Xcode/macOS，Swift 编译、XCTest、真实截图和 XCUITest 仍以 Actions 为准；沙箱禁止监听端口，e2e 未运行。

### 覆盖表与协调者交接

- 本轮完成测试模块名固定和截图导出失败诊断，未修改 `server/testing/ios-contract/coverage.ts`；当前 checkout 仍没有该覆盖表文件可供追加项。
- 无新增依赖。请协调者推分支后确认 Mobile builds 的 iOS 编译、截图产物和测试执行数，并补运行链接；project.yml 的模块名改动已直接落在本轮允许的工程配置范围内。
- 本轮未提交或推送 git。
