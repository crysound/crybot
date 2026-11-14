# T-1221 服务端契约样本、覆盖表和差异清单

## 本轮改动

- `server/testing/ios-contract/fixtures.ts`：提供带 `satisfies` 的消息、卡片、图表和节点夹具类型入口，并读取隔离的 CryCore manual 协议样本。
- `server/testing/ios-contract/areas/manual.ts`：示例 area，自动收集已有隔离样本。
- `server/testing/ios-contract/normalize.ts`、`compare.ts`：稳定化样本并比较生成结果。
- `server/testing/ios-contract/coverage.ts`：登记消息/帧/字段/widget/设置页/面板页/RuntimeEvent 的四态覆盖表，含状态统计和 todo 列表。
- `server/testing/ios-contract/*test.ts`：字段、种类、状态穷尽性、归一化和比较行为测试；`coverage.type-test.ts` 用 `@ts-expect-error` 演示 `Record<keyof WireMessage, IosStatus>` 的缺键编译错误。
- `server/testing/ios-contract/live.ts`、`server/ios-contract.e2e.test.ts`：隔离验证服务器抓取 API、分页、发送、SSE、收件箱/通知/配置、环境、Bearer session 和配对错误的采集入口。端口受限沙箱默认不启用 socket 实测。
- `scripts/ios-contract.ts`、`package.json`：自动发现 `areas/*.ts`、归一化输出契约 JSON 和 `index.json`，默认比对，`--update` 更新。
- `mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/**`：由 `--update` 生成 122 个样本 JSON（另含 index），来源是已经由 CryCore manual fixture 覆盖的 15 种消息、38 种帧、23 种 RuntimeEvent、32 种 widget 节点和 18 个注册 Swift 类型。
- `scripts/ios-web-drift.mjs`、`scripts/ios-web-drift.test.mjs`：无第三方依赖的每周 shared/src/components 差异清单和临时 git 仓库测试，基线写为 `0f44b8b6`。
- `server/testing/ios-contract/README.md`：样本来源、更新、归一化占位值、四种覆盖状态和差异清单用法。
- `.github/workflows/ci.yml`：新增 ubuntu `ios-contract` job，运行生成比对和本任务 Vitest。

## 验证

已运行：

```text
pnpm contract:ios --update
Updated .../mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract
pnpm contract:ios
# exit 0
pnpm exec tsc -p tsconfig.server.json --noEmit
# exit 0
pnpm typecheck
# exit 0
pnpm exec vitest run --maxWorkers=2 server/testing/ios-contract server/ios-contract.e2e.test.ts
# Test Files 4 passed | 1 skipped; Tests 10 passed | 1 skipped
node --test scripts/ios-web-drift.test.mjs
# pass 1
```

`pnpm lint` 受仓库已有的两条 warning 阻断：`server/lazy-container-mcp.ts:122` 的 `unicorn(no-useless-spread` 和 `scripts/public-scan/scan.mjs:297` 的 `eslint(no-control-regex)`；本轮新增文件没有 lint warning。

按约束写成脚本后执行 Linux Swift 命令，沙箱没有 Swift 工具链，原样输出为：

```text
timeout: failed to run command ‘swift’: No such file or directory
```

因此 CryKit `ContractTests` 是否实际解码只能由 Actions 的 `Mobile builds` 验证；本机也无法启动监听端口，`server/ios-contract.e2e.test.ts` 默认跳过，Actions/沙箱外再运行 `CRYBOT_RUN_IOS_CONTRACT_E2E=1`。

## 覆盖表初始统计

当前覆盖表统计为 `done 6`、`web 0`、`todo 261`、`skip 6`。内嵌网页项按要求暂登记为 `todo`/任务 `48`，待 48 合并后由协调者改成 `web` 并填路由；新 widget 节点由 Vitest 运行时穷尽检查拦截，`SPECS` 当前键类型为 `string`，因此 tsc 本身无法拦截新增 widget 节点。

第 4.2 节列出的第一期没有原生订阅者的帧（`routine`、`routine.deleted`、`routine.run`、`webhook`、`webhook.attempt`、`webhook.deleted`、`app-trigger`、`app-trigger.attempt`、`app-trigger.deleted`、`app-trigger.service`、`mcp.changed`、`device.job` 和 `data`）登记为 `todo`/`48`，理由是它们在第一期由网页容器模块消费，原生端只需保留解码能力和摘要入口。

## 需要协调者处理

- Swift 工具链缺失，契约样本的 Linux 解码和逐键往返结果需在 Actions `Mobile builds` 补跑；若出现类型/字段失败，按输出交 01 返工。
- `hello`、`ping`、`snapshot` 是 Swift manual fixture 已覆盖、但当前 TS `ServerFrame` 联合未导出的帧，覆盖表和运行时测试保留了它们；若要让 tsc 也能穷尽这三项，需要服务端类型导出更新。
- widget 节点穷尽性只能依靠 Vitest 运行时检查，原因是 `SPECS` 未导出且键为 `string`。
- `POST /api/auth/pair` 错误响应和发送接口的其他响应未新增 `swiftType`，没有写入 `index.json`；若后续需要成功配对响应样本，请先由协调者安排 CryCore 注册表新增名字。

## 第 2 轮返工（2026-11-14）

### 结论与未完成的验收

本节取代上一轮对生成来源、测试有效性和覆盖统计的结论。没有 git 提交，没有安装依赖，没有改动服务端实现、网页实现或 CryCore 模型。开工已执行 `crybot-link-deps`。

本地可执行的类型检查、契约单元测试、差异清单测试和变红演示已完成。当前工作区是 **226 条类型化服务端样本 + index.json**，不是全量实测样本。旧的 iOS manual 转写文件已删除；没有以它们填补无法抓取的接口。新增的 live area 已接入默认生成命令，但本沙箱禁止监听，完整生成和完整干净比对仍未通过。真实会话、SSE、分页及 Swift 解码的运行结果必须由允许监听的环境和 Actions 补齐；不能把下面的 typed-only 退出 0 当作完整验收。

`AGENTS.md` 引用的 `docs/verification/README.md` 在此 checkout 不存在。已重读原任务说明和完整规格，隔离方式参照 `scripts/control-cry.ts` 与 `server/bot-api.e2e.test.ts`；所有实测入口仅调用 `launchVerificationServer`，不会使用用户应用或用户数据。以下都是本地执行记录，尚无 Actions 运行链接。

### 18 项返工逐项结果

| # | 改动与结果 |
|---|---|
| 1 | 删除 `areas/manual.ts` 和 `readManualFixtures()`。`areas/typed.ts` 只收集服务端类型约束的字面量；`areas/live.ts` 异步启动隔离服务并收集真实响应。主脚本 await collect，并在生成前执行新 tsconfig。字段改名的本地演示退出 1 且定位样本文件，见下文。Badge 有 label，没有 children/future。AuthSession 仅由 live area 生成并严格要求 kind=session；本地尚无该实测文件。 |
| 2 | 先 POST pairing，再兑换真正 token；成功请求用 Bearer，不发送占位 token。SSE 用 reader 按 data 帧解析，等待 hello、用户 message、runtime 和 ping，finally 中 abort/cancel。before 使用返回页末条消息的真实 id，并断言有旧消息且不含边界消息。监听受限，运行验证待 Actions。 |
| 3 | CI ios-contract job 设置开关为 1，测试安排在比对之前。GET、配对成功、SSE 精确断言 200；普通消息发送依据实际 `server/routes/bot-messages.ts` 返回断言 **202**；只有故意错误的配对请求允许 401。session kind/via、发送 ok/threadId、快照 bots、inbox rows/count、notifications、environment capabilities 和 SSE 帧都有断言，其他 401 立即抛错。 |
| 4 | 消息字段、卡片字段、页面、RuntimeEvent 等全部改为字面量 `satisfies Record<K, IosStatus>`，移除 fromEntries/as 覆盖表构造，补 burst。PageId 直接 import page-registry。 |
| 5 | 移除 TS6142 压制；新增开启 JSX、包含网页声明文件的 `tsconfig.ios-contract.json`，同时检查生成脚本、全部任务测试和类型演示。server tsconfig 排除这些改由专用配置负责的入口，CI check 显式运行新配置。SettingsPageId 保持真实联合类型。 |
| 6 | 类型演示从真实完整表解构，只删 replyToId / text / overview 各一个键，再赋给完整 Record；另演示新增 kind / 设置页需要登记。每个预期错误都由 tsc 检查，不是用 `{ id }` 这种无关缺键对象。 |
| 7 | widget 表是手写 32 键字面量。覆盖测试双向比表与 WIDGET_NODE_TYPES，也双向比节点样本；fixtures 测试另检查生成目录中的 32 种节点。删除 Badge 的实跑测试退出 1。 |
| 8 | 每条消息 kind、字段变体、卡片字段变体、节点、图形、帧、RuntimeEvent 均逐条 satisfies 服务端类型；七种 chart 没有类型强转。不同可选字段分散成独立样本。widget 还通过服务端 parseWidgetInput 得到规范节点，避免只受宽泛索引签名约束。 |
| 9 | 第 4.2 节前三行的帧和 live.call 等归并帧登记 done；运行记录消息 screen/call/routine.run 登记 16。核心字段显式登记：id/role/kind/text/at 等为 08，attachments/png/mime 为 14，card 为 15，运行活动字段为 10；其他附加信息为 16，widget/app/数据相关字段为 48。完整统计见下表。 |
| 10 | 归一化包含不同 ID/UUID 的稳定映射及引用、ID map 键、时间、cursor、端口、http/https、裸 IPv4、邮箱、cookie、session token、JWT、本机主机名和路径、环境 label。UUID 按出现顺序分配不同占位。实测响应的稳定性仍须在允许监听的环境连续生成两次确认。 |
| 11 | 全目录 JSON 扫描含非 example.com 邮箱、IPv4、非占位 UUID、JWT、长 token、本机 hostname；URL 使用 URL.hostname 精确比较，并以拼接生成的恶意后缀地址证明前缀冒充被拒绝。当前 226 条样本扫描通过。 |
| 12 | 默认生成命令直接调用 compareDirectories，测试同一函数返回新增、缺失、内容变化三类路径，也覆盖空文件与相同文件。 |
| 13 | live.ts 不再有无用 spread fallback。pnpm lint 只报要求中两条基线 warning；因为脚本使用 --deny-warnings，实际退出码仍是 1，没有把它写成退出 0。 |
| 14 | drift 脚本在每个 diff 头重置文件，使用 --- 路径识别 +++ /dev/null；删除行归到被删文件。测试断言删除文件 -1、不污染下一文件，并覆盖 async function/default/命名导出别名/let。 |
| 15 | --since 校验为提交/引用及可选 ~、^ 后缀，拒绝前导减号、空值、范围和命令字符；git diff 参数包含 --end-of-options。临时仓库测试涵盖非法值和 HEAD~1。 |
| 16 | 未注册 swiftType 明确打印类型及样本名，并说明不加入 index，不再静默丢弃；生成脚本由新 tsconfig 检查。当前没有未注册的样本类型。 |
| 17 | 归一化排序使用 Unicode 码点比较，测试包含 BMP 私用字符和补充平面字符，未使用 localeCompare。 |
| 18 | compare 临时目录用 finally 清理；drift 临时 git 仓库用 node:test 的 t.after 清理。 |

### 样本与覆盖重新统计

| 样本类别 | 数量 |
|---|---:|
| WireMessage（15 种 kind，字段变体另列） | 89 |
| OptionCardData（必填字段随每个变体出现） | 38 |
| WireBot / WireGroup | 1 / 1 |
| ServerFrame（TS 联合的全部成员） | 35 |
| RuntimeEvent（21 种 type，含 item.completed 的 3 个变体） | 23 |
| CryChartSpec | 7 |
| WidgetNode | 32 |
| 合计 | 226 |

live area 计划另产出 15 个样本：session、send、两页历史、bots、inbox、inbox count、notifications、config、environment、配对错误，以及 hello/message/runtime/ping 四帧。它们尚未在本机生成，不能声称 18 种 Swift 类型已经全量覆盖。snapshot 在覆盖表表示快照归并能力，不伪造服务端不存在的 SSE snapshot 帧；hello/ping 也只取实际 SSE。

| 覆盖表 | 登记数 |
|---|---:|
| 消息 kind | 15 |
| 帧及快照/连接控制项 | 38 |
| WireMessage 字段（含 burst） | 79 |
| OptionCardData 字段 | 41 |
| widget 节点 | 32 |
| SettingsPageId | 16 |
| PageId | 26 |
| RuntimeEvent type | 21 |
| 明确 skip 项 | 6 |
| 合计 | 274 |

状态统计：**done 25，web 0，todo 243，skip 6**。全部 todo 任务号通过保留编号检查。全部设置页、面板页、widget 节点仍为 todo 48；skip 包括 Electron 开机自启、本机电脑控制、本地 Ollama、桌面更新、USB 主机端及聊天内查找，均有原因。

第 4.2 节保留订阅但无第一期原生消费者的 13 个帧仍为 todo 48：routine、routine.deleted、routine.run、webhook、webhook.attempt、webhook.deleted、app-trigger、app-trigger.attempt、app-trigger.deleted、app-trigger.service、mcp.changed、device.job、data。理由是自动化、MCP、设备和数据模块由网页容器负责；交协调者确认。新加 widget 节点要靠 vitest 拦，tsc 拦不住（服务端节点名仍是 string）。

### CI 文件逐行说明

相对于上一轮 `.github/workflows/ci.yml`：

- 第 21 行新增 `pnpm exec tsc -p tsconfig.ios-contract.json`，check job 真正检查 TSX 来源的联合类型、类型演示和生成脚本。
- 第 45 行新增 ios-contract job 的 env 块。
- 第 46 行新增 `CRYBOT_RUN_IOS_CONTRACT_E2E: "1"`，防止 CI 跳过实测。
- 第 57 行保留本任务 vitest 命令，移到契约比对之前，使缺样本导致比对失败时，实测仍已执行。
- 第 58 行新增 Node drift 测试。
- 第 59 行把原有 `pnpm contract:ios` 移到测试之后；没有使用 typed-only，也没有在 CI 自动 update 后掩盖仓库差异。

专用 tsconfig extends 网页配置（jsx=react-jsx），include 契约目录、e2e、scripts/ios-contract.ts、src 的声明文件。tsconfig.server.json 只增加这两个入口的 exclude；这是避免原 server 配置无 JSX 的必要分工，检查责任明确交给 check 中的新命令。

### 本地命令与输出

```text
crybot-link-deps
crybot-link-deps: linked 73 entries ...

pnpm typecheck
> tsc -b && tsc -p tsconfig.server.json
# exit 0
pnpm exec tsc -b
# exit 0，无诊断
pnpm exec tsc -p tsconfig.server.json
# exit 0，无诊断
pnpm exec tsc -p tsconfig.ios-contract.json
# exit 0，无诊断

pnpm lint
> oxlint --deny-warnings .
server/lazy-container-mcp.ts:122:54: warning unicorn(no-useless-spread)
scripts/public-scan/scan.mjs:297:87: warning eslint(no-control-regex)
ELIFECYCLE Command failed with exit code 1.
```

按本机一次一个测试文件运行（都带 `--maxWorkers=2`）：

```text
pnpm exec vitest run --maxWorkers=2 server/testing/ios-contract/fixtures.test.ts
Test Files 1 passed; Tests 4 passed; exit 0
pnpm exec vitest run --maxWorkers=2 server/testing/ios-contract/coverage.test.ts
Test Files 1 passed; Tests 2 passed; exit 0
pnpm exec vitest run --maxWorkers=2 server/testing/ios-contract/normalize.test.ts
Test Files 1 passed; Tests 5 passed; exit 0
pnpm exec vitest run --maxWorkers=2 server/testing/ios-contract/compare.test.ts
Test Files 1 passed; Tests 1 passed; exit 0
node --test scripts/ios-web-drift.test.mjs
tests 1; pass 1; fail 0; skipped 0; exit 0

pnpm contract:ios --typed-only --update
Typed fixtures only: live capture and full contract verification are NOT performed.
Updated .../Fixtures/contract
# exit 0
pnpm contract:ios --typed-only
Typed fixtures only: live capture and full contract verification are NOT performed.
# exit 0
```

监听限制是实测结果，不是默认跳过：独立 loopback listen 探针返回 EPERM。随后执行完整入口：

```text
CRYBOT_RUN_IOS_CONTRACT_E2E=1 pnpm exec vitest run --maxWorkers=2 server/ios-contract.e2e.test.ts
Error: no free port block for offsets 0,1 in 19600..22600
  freePortBlock server/testing/ports.ts:25
  launchVerificationServer scripts/control-cry.ts:308
Test Files 1 failed; Tests 1 failed; exit 1

pnpm contract:ios
Error: no free port block for offsets 0,1 in 19600..22600
  at freePortBlock
  at launchVerificationServer
  at launchAndCapture
  at Module.collect
# exit 1（实测 area 不静默降级）

swift test --jobs 2 --package-path mobile/ios/Packages/CryKit --filter CryCoreTests
swift: command not found
# exit 127
```

没有 Swift 工具链，因此没有解码错误或往返字段差异可以据实列出，也不声称 ContractTests 执行过；没有改 Swift 模型规避失败。

### 两组变红演示及删样本演示

在工作区临时修改源文件，脚本用 finally 恢复原始内容；结束后 shared/wire.ts 和 src/state/store.tsx 均无 diff，没有连接任何应用。不是只演示 expect-error。

1. 把服务端 `replyToId?: string` 改为 `replyToRenamed?: string`，运行 **`pnpm contract:ios`**：

```text
server/testing/ios-contract/coverage.ts(85,3): error TS2353:
  '"replyToId"' does not exist in type 'Record<keyof WireMessage, IosStatus>'.
server/testing/ios-contract/fixtures.ts(722,3): error TS2353:
  '"replyToId"' does not exist in type 'WireMessage'.
Affected contract file: messages/field-replyToId.json
EXIT=1
```

这是生成命令的类型关卡拒绝服务端形状漂移，并列出受影响文件；不是伪称服务未启动时已经比较了实测 JSON。正常内容比较由同一 compareDirectories 函数负责。

2. 在 WireMessage.kind 加一个未登记成员，运行 `pnpm exec tsc -p tsconfig.ios-contract.json`：

```text
server/testing/ios-contract/coverage.ts(21,3): error TS2741:
  Property ... is missing ... but required in type 'Record<... , IosStatus>'.
EXIT=1
```

另在真实 SettingsPageId 加 `contract-new-page`，相同命令输出：

```text
server/testing/ios-contract/coverage.ts(205,3): error TS2741:
  Property '"contract-new-page"' is missing ... but required in type 'Record<SettingsPageId, IosStatus>'.
EXIT=1
```

恢复后新 tsconfig 和 typed-only 比对退出 0。上述新 tsconfig 就是 CI check 第 21 行运行的配置。

另外四次分别移除 screen kind 的全部消息样本、field-replyToId、卡片 field-waitRequest、Badge 节点样本，逐次运行 fixtures.test.ts：每次都是 `Test Files 1 failed; Tests 1 failed | 3 passed; EXIT=1`。前三次失败于字段/kind 覆盖断言，最后一次失败于 widget 样本覆盖断言；恢复后 4/4 通过。

### 原说明验收逐条核对

| 原验收项 | 本轮结果 |
|---|---|
| typecheck 与 lint | 三个 tsc 命令退出 0。lint 仅基线两条，因 deny-warnings 退出 1；不能写“lint 命令通过”。 |
| 本任务 vitest 与 drift | 四个单元文件共 12/12，通过；Node 1/1，通过。显式开启 e2e 后因 EPERM 对应的端口分配错误失败，待 Actions。 |
| 删 kind/字段/widget 会失败 | 四次实际变异运行全部退出 1，恢复后通过。 |
| 覆盖状态、保留任务、widget 穷尽性 | 类型检查及覆盖测试通过；上述统计和帧分配待协调者确认。 |
| 比对函数相同通过、不同列文件 | compareDirectories 测试通过，含 added/missing/content 三类以及空文件。 |
| 归一化与全量样本安全扫描 | 5 个归一化测试通过；fixtures 扫描当前 226 个样本及 index 通过。尚无实测样本，不能把扫描结论延伸到未生成内容。 |
| 全量 --update 落盘且默认命令干净退出 0 | **未完成**。仅显式 typed-only 的 226 条落盘和比对退出 0；默认入口因端口限制退出 1。需在允许监听环境运行完整 update，再连续运行默认比对，排查实测波动。 |
| Linux Swift 实际解码及逐键往返 | **未完成**，swift 不存在，交 Actions；不能判断 Swift 模型是否需 01 返工。 |
| CI check/ios-contract、Public scan、Mobile builds 运行链接 | **待协调者推分支后补**。当前缺 15 个 live 样本，不能预先声称 CI ios-contract 绿；需先在允许监听环境完成生成。Public scan 的本地补充结果见下。 |
| PR 上字段/kind 变红运行链接 | 本地真实源文件变异已复现；Actions/PR 演示及链接待协调者补。 |

### 公开扫描与协调者后续

本任务的样本扫描确认现有 JSON 没有真实邮箱、IP、UUID、主机名或 token。另调用仓库 `scanDiff` 扫工作区 diff（含未跟踪文件），发现其 domain 规则会把合法协议判别值当域名，例如运行记录 kind、通知已读帧 kind、实时通话 kind、文本增量 type；这些值直接由服务端协议决定，不能为了扫描改写 wire JSON。类型演示里人为的新成员已改为不含点的名字。该扫描器误报需由 45/协调者处理，不能把当前 Public scan 写成绿色；没有在样本里加入豁免字段，也没有改扫描器或 allowlist。私有 denylist 无 key，未执行。

后续必要步骤：在可监听的隔离环境运行完整 `pnpm contract:ios --update`、再次 `pnpm contract:ios`，审查/扫描新生成的 15 个 live 文件及稳定性；运行已开启的 e2e；在 Actions 运行 Swift 契约测试，记录实际解码及往返失败原文。CI 与 PR 演示链接由协调者补。本轮没有提交 git。
