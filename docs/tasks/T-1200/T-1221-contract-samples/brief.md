## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1221-00 服务端契约样本、覆盖表和差异清单

> 规格以仓库里的 `docs/specs/2026-11-14-ios-native.md` 为准，开工前先通读一遍（2026-11-14 已缩小范围：常用部分原生，其余内嵌网页，共 25 个任务）。任务 01 已合并，CryCore 已在 main 上：`mobile/ios/Packages/CryKit/Package.swift`（库 CryCore、CryNetLogic、CryNet、CryRFB；测试 target CryCoreTests 带 `resources: [.copy("Fixtures")]`）；`Sources/CryCore/` 下有 `WireModels.swift`（`WireMessage`，15 种 kind 加 `unknown(kind:raw:)`；`WireAttachment`、`OptionCardData`、`WireBot`、`WireGroup`、`ServerFrame`）、`CoreAPIModels.swift`（`BotsSnapshot`、`ThreadPage`、`SendResponse`、`InboxPage`、`InboxCount`、`NotificationsPage`、`ConfigResponse`、`EnvironmentInfo`、`AuthSession`、`APIError`、`PairResponse`、`EmailVerifyResponse`、`UploadResponse` 等）、`RuntimeEventsModels.swift`（`RuntimeEvent`）、`WidgetNodeModels.swift`（`WidgetNode`，32 种节点）、`DataSurfaceModels.swift`（`CryChartSpec`）、`ServerTextModels.swift`、`JSONValue.swift`（`JSONValue`、协议 `WireModel` 和 `ignoredKeys`；模型保留不认识的字段，往返时不会丢）。`Tests/CryCoreTests/ContractTests.swift` 已经写好：读 `Fixtures/contract/index.json`，文件不存在就跳过；存在时按 `swiftType` 查 18 个类型的注册表逐个解码，再编码一次逐键比较。本任务的样本一落地，这个测试就会真的跑起来。

## 依赖
- after：无
- 估计：2 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读「合同」、第 1.3 节、第 9、11、12、13 节，以及第 2、4.2、7.6、7.7、8.1 节。
- 分支名：`T-1221-contract-samples`

## 目标
服务端 CI 自动生成 iOS 解码要用的 API JSON 样本，并检查样本是不是最新的。覆盖表用 TS 类型列全网页的消息、帧、卡片字段、widget 节点、设置页和面板页，每一项登记 iOS 状态（含新增的「内嵌网页」状态 `web`），网页一加新成员 tsc 就报错。另外提供每周差异清单脚本。

## 背景
服务端接口没有版本号，也没有 OpenAPI。iOS 原生 App 靠仓库里提交的 JSON 样本测试解码：样本由服务端代码生成，iOS 测试读样本。网页在 iOS 开发期间还会继续加功能，所以需要一张编译期就能发现遗漏的覆盖表（规格第 12 节）。
- 线上模型：`shared/wire.ts`（`ServerFrame`、`WireMessage` 的判别字段都是 `kind`）、`shared/runtime-events.ts`、`shared/widget.ts`、`shared/data-surface.ts`、`shared/server-text.ts`，以及 `WireMessage`、`OptionCardData` 混入字段所在的文件（`shared/wait-request.ts`、`setup-card.ts`、`default-bot.ts`、`devs-report-status.ts`、`computer-ask.ts`、`bot-access.ts`、`outside-write.ts` 等，看 `wire.ts` 的 import 就能找到）。
- widget 节点：`shared/widget.ts` 的 `SPECS`（:449，`Record<string, NodeSpec>`，**没有导出，键类型是 string**）和导出的 `WIDGET_NODE_TYPES`（:497）。CryCore 里是 32 种节点，以代码为准（旧说明写的 31 不对）。
- 设置页 id：导出的联合类型 `SettingsPageId` 在 `src/state/store.tsx:506`，`src/components/settings/settings-index.ts` 重新导出了它。机器人面板页：`src/components/bot-panel/page-registry.ts` 的 `PageId`（26 个）和 `PAGE_IDS`。
- 起测试服务器：`scripts/control-cry.ts:280` 的 `launchVerificationServer`，配合假引擎 `server/testing/fake-claude-cli.ts`，用法参考 `server/bot-api.e2e.test.ts`。
- 网页会话 cookie 名：`server/index.ts:768` 的 `SESSION_COOKIE = sessionCookieName(PORT, ENVIRONMENT_ID)`，格式为 `cry_session_<端口>_<environmentId 的前 12 个字母数字>`，值就是 `cry_sess_…` 令牌。任务 48 会在 `GET /api/auth/session` 的 `kind: "session"` 返回里加字段 `cookieName`，值就是这个常量（规格第 1.3、7.6 节）。样本归本任务，48 改服务端后由协调者安排重新生成；**本任务现在就要让归一化能处理这个字段**，到时候 `--update` 一次就能用。
- CI：`.github/workflows/ci.yml` 有 `check`（`tsc -b`、`tsc -p tsconfig.server.json`、lint、i18n:check、check:brand）和 8 片 `vitest`。`Public scan`（任务 45）已合并：PR 新增的每一行都要过扫描（第 13 节）。
- 样本目录 `mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/` 归本任务独占，01 没往里写过文件。这个目录在 `mobile/ios/**` 下，所以本任务的 PR 也会触发 `Mobile builds`。

## 要做的事
1. 类型化夹具 `server/testing/ios-contract/fixtures.ts`：每种 `WireMessage.kind` 至少一条；`WireMessage` 的每个可选字段至少在一条样本里出现（setupOffer、setupSuggestion、setupRequest、helperIntro、wait、bugReport、comm、relay、threadRef、dataResult、publishedPage、sentDirectly、peerAsk、threadPost、peerPost、webhookPost、routedBy、quickModel、doneWhen、replyToId、fromApp、pointed、sender、steered、aside、via、relayed、inbox、dataContext 等，以 `wire.ts` 为准）；`OptionCardData` 的每个可选字段至少出现一次（含 waitRequest、computerAsk、accessRequest、outsideWrite 混入）；widget 的每种节点（以 `WIDGET_NODE_TYPES` 为准）至少一次；`CryChartSpec` 的每种图形一条；`ServerFrame` 每种 `kind` 至少一条；RuntimeEvent 每种至少一条。全部写 `satisfies <类型>`，让 tsc 检查形状。widget、图表和 `app` 消息在 iOS 上虽然走内嵌网页，样本照样要有：iOS 要能解码这些消息，才能显示摘要行（第 5 节）。
2. 字段覆盖测试：遍历每个 TS 类型的键清单（用第 3 条覆盖表里的 `keyof` 记录），断言每个键至少在一条样本里出现过。从夹具里删掉任意一种 kind、一个字段或一种 widget 节点，测试就要失败。
3. 覆盖表 `server/testing/ios-contract/coverage.ts`：
   - `type IosStatus = { ios: "done" } | { ios: "web"; route: string } | { ios: "todo"; task: string } | { ios: "skip"; reason: string }`。`web` 表示这一项在 App 里经任务 48 的网页容器打开，`route` 写容器打开的网页路由，算已覆盖。另外导出一个小工具函数，统计各状态的数量、列出所有 `todo` 项，供协调者和任务 42 使用。
   - 用 `Record<…, IosStatus>` 列全：`WireMessage["kind"]`、`ServerFrame["kind"]`、`keyof WireMessage`、`keyof OptionCardData`、widget 节点类型、设置页 id（`SettingsPageId`）、机器人面板 `PageId`、RuntimeEvent 类型。
   - 初始登记按第 9 节「做法」列、第 1.4 节入口表「状态」列和第 7.7 节分法来：
     - 原生行：`{ ios: "todo", task: "<保留任务号>" }`，任务号只能是第「任务拆分」表里保留的编号（05–12、14–16、22、23、34、35、48）。例如 `widget`、`app` 两个 kind 记 48（摘要行在 48），`connector`、`secret`、`signin`、记录类 kind 记 16，引用回复和发送者相关字段（`replyToId`、`sender` 等）记 08。
     - 内嵌网页行（第 9 节第 17–19、22–32、34–36 行，以及 26 个 `PageId` 和全部设置页 id、全部 widget 节点）：一律 `{ ios: "todo", task: "48" }`。不要现在就写成 `web`：路由由 48 定，48 合并后由协调者改成 `web` 并填路由。
     - 不做的项：`{ ios: "skip", reason: "…" }`，原因写具体。包括只在 Electron 里存在、依赖 `window.cry` 的设置项（开机自启、本机电脑控制、本地 Ollama、桌面版更新、USB 主机端等），以及聊天内查找相关的项（第 1 期不做）。
     - 01 已在 `LiveState` 里归并的帧（第 4.2 节表前三行），以及 `computer`、`computer-control`、`live.call`、`screen`（LiveState 按机器人存最新状态，第 1 期没有原生消费者），登记 `{ ios: "done" }`。
     - 第 4.2 节写着「帧订阅保留，第 1 期没有原生订阅者」的帧（`routine`、`routine.deleted`、`routine.run`、`webhook*`、`app-trigger*`、`mcp.changed`、`device.job`、数据帧）：对应模块走内嵌网页，登记 `{ ios: "todo", task: "48" }`，在报告里单独列出这几项和理由，交协调者确认。
     - 已删除的任务号（13、17–21、24–33、36–40、44、46、47）一个都不能出现在覆盖表里。写一个测试检查：所有 `todo` 的 `task` 都在保留任务号清单里。
   - 设置页 id：直接 import `SettingsPageId` 联合类型来做 `Record`，不要另抄一份。
   - widget 节点：`SPECS` 没导出、键类型是 string，`Record` 管不住它的穷尽性。用 `WIDGET_NODE_TYPES` 做一个运行时测试：每个节点类型都要在覆盖表里，覆盖表里也不能有多余的类型。在报告里写明「新加 widget 节点要靠 vitest 拦，tsc 拦不住」。如果有不改 `shared/` 也能在类型层做到穷尽的办法，就用那个办法，并在报告里说明。
4. 覆盖表的穷尽性：`Record<联合类型, …>` 保证网页加新成员时 `pnpm typecheck` 报错。写一个类型测试文件演示这一点（用 `// @ts-expect-error` 证明少一个键会报错），并确认 `ci.yml` 的 `check` job 确实编译到了这个文件（看 `tsconfig.server.json` 的 include）。
5. 实测样本 `server/testing/ios-contract/live.ts` 和测试 `server/ios-contract.e2e.test.ts`：用 `launchVerificationServer` 和假引擎起服务，抓这些响应：
   - `GET /api/bots?messages=20`
   - `GET /api/threads/:id/messages`（含 before 翻页）
   - `POST /api/bots/:id/messages` 的返回
   - `GET /api/events` 的前几帧（hello、message、runtime、ping）
   - `/api/inbox`、`/api/inbox/count`、`/api/notifications`、`/api/config`
   - `/.well-known/crybot/environment`
   - `GET /api/auth/session`：**用 Bearer 会话请求，取 `kind: "session"` 的返回**（不要只抓 loopback 的返回）。48 加了 `cookieName` 之后，这个样本就会带上这个字段
   - `POST /api/auth/pair` 的错误响应
6. 归一化：
   - id、时间戳、cursor、端口换成稳定的占位值。UUID 只用全零或 `00000000-0000-4000-8000-` 开头的占位。
   - 令牌：`cry_sess_…` 一律换成短占位（`cry_sess_` 后面不超过 19 个字符，例如 `cry_sess_placeholder`）。公开扫描会拦 `cry_sess_`、`cry_session_` 后面跟 20 个以上字符的值。
   - cookie 名：任何字段里形如 `cry_session_<端口>_<环境>` 的值，都换成固定占位 `cry_session_cookie_name`。现在的返回里还没有 `cookieName`，用单元测试证明这条规则生效：构造一个带 `cookieName: "cry_session_<端口>_<12 位>"` 的 session 返回，归一化后变成占位。
   - JWT（`eyJ` 开头的三段式）换成不带 `eyJ` 的占位。
   - 地址统一成 `https://cry.example.com`。
   - 对象键排序，2 空格缩进，结尾换行。
7. 生成脚本 `scripts/ios-contract.ts`，`package.json` 加一行 `"contract:ios"`。默认是比对模式：生成到临时目录，和仓库里的样本比，有差异就以非 0 退出，打印有差异的文件和更新命令；加 `--update` 时写入样本目录。
8. 输出到 `mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/<area>/<name>.json`，同时生成 `index.json`：`[{"file": "messages/text.json", "swiftType": "WireMessage"}, …]`。`swiftType` 只能用 01 注册表里的 18 个名字：`WireMessage`、`WireBot`、`WireGroup`、`BotsSnapshot`、`ThreadPage`、`SendResponse`、`ServerFrame`、`RuntimeEvent`、`WidgetNode`、`CryChartSpec`、`OptionCardData`、`InboxPage`、`InboxCount`、`NotificationsPage`、`ConfigResponse`、`EnvironmentInfo`、`AuthSession`、`APIError`。别的响应（比如 pair 的成功返回）要用新名字，就先不放进 `index.json`，在报告里列出来；本任务不能改 CryCore 的注册表。
9. 扩展点：以后其他任务在 `server/testing/ios-contract/areas/<area>.ts` 新建一个文件就能加样本，脚本按目录自动收集，不用改主脚本。写一个示例 area。
10. 用 Linux 上的 Swift 实测 iOS 能不能解码这些样本（见「约束」里的命令）：生成样本后跑 CryKit 的 `swift test`，`ContractTests` 不能再是跳过，必须真的解码并逐键比较。哪个样本解码失败或往返丢字段，把类型、字段和错误原样写进报告，交协调者安排 01 的返工。不要为了让测试变绿去改样本内容或往 `index.json` 里少登记，也不要改 `Packages/` 里样本目录以外的文件。
11. 每周差异清单 `scripts/ios-web-drift.mjs`（Node，不用第三方依赖）：`--since <提交>` 列出该提交到 HEAD 之间 `shared/` 和 `src/components/` 的改动，包括文件、增删行数、新增的 `export` 名字、新增的类型成员（按行匹配 `^\+\s+\w+\??:` 这类简单规则就够了）。输出 Markdown。脚本用法说明里写上规格的基线 `0f44b8b6`。附一个用临时 git 仓库的 `node --test` 测试。
12. 目录里放 `server/testing/ios-contract/README.md`，写清楚：样本从哪来；怎么更新（`pnpm contract:ios --update`）；为什么不能手改；覆盖表四种状态的含义和怎么登记（iOS 任务不改覆盖表，只在报告里列完成项；内嵌网页项由协调者在 48 合并后改成 `web`）；差异清单怎么跑。
13. `ci.yml` 新增 job `ios-contract`（ubuntu），跑 `pnpm contract:ios` 和本任务的 vitest。不改其他 job。

## 范围
- 可以改：`server/testing/ios-contract/**`（新建）、`server/ios-contract.e2e.test.ts`（新建）、`scripts/ios-contract.ts`（新建）、`scripts/ios-web-drift.mjs`、`scripts/ios-web-drift.test.mjs`（新建）、`package.json`（只在 scripts 里加一行）、`.github/workflows/ci.yml`（只加 ios-contract job）、`mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/**`
- 不要改：`shared/**`、`src/**`、`server/index.ts` 和其他服务端代码（`cookieName` 归 48）、`mobile/ios` 下其他文件（包括 `ContractTests.swift`、CryCore 模型和 `Fixtures/manual/`）。确实需要改时，在报告里说明原因，不要自己改。
- 和并行任务的边界：同时进行的 02、03、04 都不碰本任务的任何路径；本任务也不碰 `mobile/ios` 下样本目录以外的东西。

## 接口契约
- `index.json`：数组，每项 `{ "file": "<area>/<name>.json", "swiftType": "<18 个名字之一>" }`，路径相对于 `Fixtures/contract/`，按 `file` 排序。
- `IosStatus` 四种形状照第 12 节，字段名一个字都不能改；`task` 是不带前缀的两位任务号字符串（如 `"48"`、`"08"`）。
- 归一化后的占位值固定下来写进 README：服务器地址 `https://cry.example.com`、令牌 `cry_sess_placeholder`、cookie 名 `cry_session_cookie_name`、UUID 前缀 `00000000-0000-4000-8000-`。48 和 05 的 iOS 测试会照这些值写断言。

## 验收标准
- [ ] `pnpm typecheck` 和 `pnpm lint` 通过。
- [ ] `pnpm vitest run --maxWorkers=2 server/testing/ios-contract server/ios-contract.e2e.test.ts` 和 `node --test scripts/ios-web-drift.test.mjs` 通过（沙箱里 socket 测试失败的话，写出命令和失败原因，由协调者在沙箱外补跑）。
- [ ] 字段覆盖测试能证明：从夹具里删掉任意一种 kind、一个 `WireMessage` 或 `OptionCardData` 字段、一种 widget 节点，测试都会失败。
- [ ] 覆盖表测试：没有已删除的任务号；内嵌网页行全部是 `todo` 48；所有 `skip` 都写了原因；widget 节点的运行时穷尽检查生效（多一个或少一个都失败）。
- [ ] 比对函数有单元测试：样本相同时通过；改一个字段时失败，并列出这个文件。
- [ ] 归一化有单元测试：`cry_sess_` 长令牌、`cry_session_<端口>_<环境>` 形式的 cookie 名、JWT、真实 UUID、非 example.com 的地址，都被换成占位。另有一个测试扫描所有生成的 JSON：出现其他域名、example.com 以外的邮箱、IPv4、非占位 UUID、`eyJ` 三段式，或者 `cry_sess_`/`cry_session_` 后面跟 20 个以上字符，就失败。
- [ ] `pnpm contract:ios --update` 生成的文件已放进工作区（不 git 提交），在干净状态下 `pnpm contract:ios` 退出码为 0。
- [ ] 在 Linux 上跑 CryKit 的 `swift test`，`ContractTests` 实际执行（不是跳过），结果和失败项原样贴进报告。
- [ ] 协调者推分支、开草稿 PR 后：`CI` 工作流的 `check` 和 `ios-contract` 两个 job 是绿的（其他 job 不作要求）；`Public scan` 是绿的；`Mobile builds` 里 CryKit 的契约测试通过（这是 iOS 侧的验收，没过就按报告里的失败项安排 01 返工，不算本任务不合格）。运行链接由协调者补进报告。
- [ ] 协调者在 PR 里临时演示两次并把运行链接写进 PR 描述：改一个被样本用到的 `shared/wire.ts` 字段，`ios-contract` 变红；往 `WireMessage.kind` 加一个新值而不登记覆盖表，`check` 变红。改回后变绿。

## 约束
- 不要 git 提交。沙箱禁网，需要新依赖时在报告里列出包名和版本，不要自己装。
- Vitest 用 `--maxWorkers=2`，只跑本任务相关的测试文件。沙箱里 socket 测试可能失败：写出具体命令和失败原因，由协调者在沙箱外补跑。
- Linux 上跑 CryKit 测试（规格第 8.5 节的 `linux-test.sh` 归 43，还没合并，先用下面的写法）。写成脚本再调用（直接在命令行写 `${...}` 可能被替换），缓存全部放工作区，跑完不要把 `.linux-cache/`、`.linux-build/` 留在改动里（它们已在 `.gitignore`）：
  ```bash
  WS=$(pwd)/mobile/ios; C=$WS/.linux-cache
  export PATH=/opt/swift/usr/bin:$PATH HOME=$C/home XDG_CACHE_HOME=$C/xdg TMPDIR=$C/tmp \
         CLANG_MODULE_CACHE_PATH=$C/clang-module-cache SWIFTPM_MODULECACHE_OVERRIDE=$C/swiftpm-module-cache
  mkdir -p "$HOME" "$XDG_CACHE_HOME" "$TMPDIR" "$CLANG_MODULE_CACHE_PATH" "$SWIFTPM_MODULECACHE_OVERRIDE"
  timeout 1200 swift test --jobs 2 --package-path $WS/Packages/CryKit --scratch-path $WS/.linux-build \
    --cache-path $C/swiftpm --config-path $C/config --security-path $C/security \
    --manifest-cache local --disable-sandbox --filter CryCoreTests
  ```
  CryNet 在 Linux 上可能编不过（Linux 条件归 43）。编不过时把输出贴进报告，契约测试就等 Actions 的 `Mobile builds` 验证。
- 公开仓库：样本、夹具、测试、README 和注释里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。报告也会进仓库，同样遵守。
- 只说已发生的事：报告里写「已验证」的，必须附 Actions 运行链接（由协调者补）。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1221-contract-samples/report.md`（等于 `task-paths report T-1221-contract-samples` 算出的路径）；各轮追加到同一个文件，保留前几轮的内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果（含 Linux `swift test` 的原样输出）；哪些只能等 Actions 验证。
3. 覆盖表初始登记的统计（done、web、todo 按任务号、skip 各多少），以及第 4.2 节「没有原生订阅者」那几类帧的登记方式和理由。
4. 需要协调者处理的事：iOS 解码或往返失败的样本（交 01 返工）、需要新 `swiftType` 名字的响应、widget 穷尽性只能靠运行时检查这件事、超出范围的改动、没解决的问题。
