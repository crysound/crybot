# T-1231 macOS 灵动岛实现报告

已实现隐藏、简介、列表、对话四种形态，以及 macOS 设置开关。默认隐藏；等待审批只改变数据与排序，不会让岛自动出现。原生窗口、消息请求、事件订阅和操作鉴权由主进程管理。

## 实现与文件

| 文件 | 改动 |
| --- | --- |
| `electron/island.mjs` | 仅 macOS 创建透明 panel；固定 520×620 窗口，主显示器顶部居中；screen-saver 层级、跨桌面与全屏选项；全局指针感应、透明区域及圆角穿透、1 秒离开收起、Esc/失焦收起、输入保护；独立窗口身份、从原生窗口菜单/Mission Control 排除与 IPC 主框架校验。 |
| `electron/island-model.mjs`、`.d.mts` | 四态转换、等待确认优先排序、状态计数、最近对话选择、刘海/无刘海几何、实际胶囊形状命中测试、当前地点解析。 |
| `electron/island-data.mjs` | `/api/bots`、`/api/events`、最近对话的历史消息、发送消息和允许/拒绝审批；复用 SSE 解析器；断线重连；地点代次、AbortController 与旧响应隔离；并发历史读取与实时消息合并；通过主进程读取真实头像。 |
| `electron/island-page.mjs`、`island-preload.cjs`、`shared/island.ts` | 独立本地资源协议、窄 preload 接口与类型；岛页面不能指定服务器、任意 URL 或任意对话。生产资源来自现有打包位置 `resources/ui`，不新增端口。 |
| `electron/main.mjs` | 接入窗口生命周期、主窗口导航和当前地点；从 `appWindows()` 排除岛；保持原有语音浮窗先清理的退出顺序。 |
| `island.html`、`src/island.tsx`、`src/island/Island.tsx`、`src/island/island.css`、`vite.config.ts` | 独立 React 页面；黑色胶囊、弹性尺寸动画、六头像与 +N、三列滚动列表、等待确认高亮、消息气泡、实时回复、审批、输入、返回和主窗口打开。 |
| `src/components/Avatar.tsx` | 继续使用原有 BotAvatar/MascotAvatar；增加可选栅格数据源，使主进程取回的自定义头像仍使用原组件的裁剪、缩放和焦点。现有调用保持原行为。 |
| `electron/desktop-prefs.mjs`、`.d.mts`、`electron/preload.cjs`、`src/types/cry.d.ts` | 本桌面持久偏好与设置桥接：显示默认开、全屏默认开、宽度默认 200px（120–320）；远程页面修改继续要求用户操作。 |
| `src/components/IslandSettings.tsx`、`src/components/settings/pages/AppPages.tsx`、`src/locales/en.json`、`zh.json` | macOS 设置项与中英文文案。宽度调整影响隐形感应区与简介胶囊；列表和对话保持约 460px。 |
| `electron/island*.node-test.mjs`、`src/island/Island.test.ts`、`src/components/IslandSettings.test.ts` | 可重复的隔离逻辑、数据流、窗口与组件测试。 |
| `electron/desktop-prefs.node-test.mjs`、`electron/talk-main.node-test.mjs` | 新偏好测试和窗口排除断言；修正已有测试中已移除 analytics preload API、未提供导航依赖的过时夹具。两项旧失败已在 HEAD 文件的独立临时副本复现，未恢复旧产品行为。 |
| `.github/workflows/island-screenshots.yml`、`scripts/testing/island-screenshots.mjs` | `macos-26` Electron 截图作业，上传 `island-screenshots`。 |

## 地点与同一条对话

已检查 `account-places.mjs`、`cloud-connections.mjs`、`remote-only.mjs` 与 `main.mjs`。账号地点清理、云迁移和 remote-only 最终都通过现有环境状态及主窗口导航确定所显示的地点。岛直接读取主窗口 URL、现有 `environmentsState.activeId` / `activeEnvironment`、本机运行目录和导航代次，不维护另一份地点选择。

本机打包版通过 `localServerRequest`，继续携带现有桌面写入令牌；云端、其他服务器与远程客户端使用主窗口的 Electron session 和当前来源，沿用登录 cookie 和 Origin 校验。导航、切换本机数据目录或更换地点会隐藏岛、清空旧消息/头像、取消旧订阅；同地址重新导航也产生新代次，避免沿用旧账号的数据。

点智能体时，选择按对话时间排序的最新普通对话，排除归档、routine 与 bot API 专用对话；不创建新对话。发送携带该 threadId；打开主窗口复用已有 `crybot://thread/...?...bot=...` 路由并聚焦。聊天期间保持该对话，重新选择智能体时重新解析最近对话。

## 验证结果与复现

开工已运行 `crybot-link-deps`。测试文件串行执行，不使用 systemd。所有操作测试均使用内存夹具或临时 userData，没有访问用户的实时应用/数据。

已通过：

- `pnpm exec tsc -b` 与 `pnpm exec tsc -p tsconfig.server.json`。
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vite build`。首次默认 2GB 堆耗尽，增至 4GB 后构建成功；工作流也设置了该值。
- `node scripts/generate-locale.mjs --check`。
- 改动文件的 `oxlint --deny-warnings` 与 `git diff --check`。
- 17 个相关 Electron 测试文件，含岛、语音快问、preload、偏好、remote-only、cloud-connections、environments、single-instance、window-all-closed。
- 逐文件运行的 Vitest：`src/island/Island.test.ts`（5 项）、`src/components/IslandSettings.test.ts`（1 项）、`src/components/Avatar.test.ts`（17 项）、`src/components/WindowFrameRow.test.ts`（3 项）、`src/components/settings/SettingsWindow.test.ts`（30 项）。

主要测试命令：

```bash
crybot-link-deps
node --test --test-force-exit --test-concurrency=1 electron/island*.node-test.mjs electron/talk-*.node-test.mjs electron/desktop-prefs.node-test.mjs electron/preload.node-test.mjs electron/preload-contract.node-test.mjs electron/remote-only.node-test.mjs electron/cloud-connections.node-test.mjs electron/window-all-closed.node-test.mjs electron/single-instance.node-test.mjs electron/environments.node-test.mjs
pnpm exec vitest run src/island/Island.test.ts
pnpm exec vitest run src/components/IslandSettings.test.ts
pnpm exec vitest run src/components/Avatar.test.ts
pnpm exec vitest run src/components/WindowFrameRow.test.ts
pnpm exec vitest run src/components/settings/SettingsWindow.test.ts
pnpm exec tsc -b
pnpm exec tsc -p tsconfig.server.json
NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vite build
```

新增测试覆盖四态和非法转换、简介立即收起/列表延时收起、输入保护及强制关闭、等待优先、总状态中英文、无刘海与偏移显示器、透明圆角、地点切换及同来源导航代次、旧响应/旧头像隔离、流式回复、历史读取竞态、最近对话发送、审批校验、真实头像和裁剪、+N、名字/状态/长任务、设置持久化及非 macOS 不创建窗口。

全仓 `pnpm exec oxlint --deny-warnings .` 仍报告两处未修改文件的警告：`scripts/public-scan/scan.mjs:297` 的 `no-control-regex`、`server/lazy-container-mcp.ts:122` 的 `no-useless-spread`。本任务未压制规则或改动这些文件。

## Actions 与沙箱限制

本次沙箱里运行 `pnpm exec electron --version` 即被 Electron 的 Linux sandbox 检查以 `Operation not permitted` / SIGTRAP 拦截，无法运行原生窗口截图；禁止监听端口的服务端 e2e 也未在这里执行。macOS 原生运行结果与截图需要以新增 Actions 作业为准，本报告不声称该作业已执行成功。

macOS 上可直接复现：

```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vite build
pnpm exec electron scripts/testing/island-screenshots.mjs
```

截图脚本独立启动 Electron、使用临时 userData 和内存服务夹具，不启动正式主进程、不连接真实服务、不监听端口。它驱动生产面板依次进入四态，验证八个真实头像及名字、审批请求、同一 threadId 发送/主窗口打开和实时回复，生成 `hidden.png`、`summary.png`、`list.png`、`chat.png`。隐藏截图全透明是预期行为。产物位于 `artifacts/island-screenshots/`，CI 以同名 artifact 上传。

仓库当前没有 AGENTS 指定的 `docs/verification/README.md`，因此无法读取该文件；已遵循其明确要求，全部验证隔离进行。当前依赖清单及源码没有 `@crysound/ui`，界面沿用已有 React、BotAvatar/MascotAvatar 和 SettingsPrimitives，未额外引入另一个 UI 库。

## 真机待确认

- 带刘海 Mac 的菜单栏高度阈值、刘海实际宽度和 120–320px 微调范围；旧款 Mac/外接屏顶部隐形感应区域。
- 窗口是否紧贴屏幕顶边、Retina 缩放、圆角阴影、鼠标穿透与菜单栏点击是否符合预期。
- “全屏应用时也显示”开/关、Spaces/Stage Manager、全屏菜单栏自动隐藏、主显示器切换与热插拔。
- 原生 panel 的不抢焦点、点击后键盘输入、Esc/点外部收起与主窗口聚焦。
- 使用真实本机/云端/其他服务器登录会话的地点切换、审批权限和流式回复端到端验收。

## 第 2 轮返工

本轮基于 worktree 中已有的实现修改，开工先执行 `crybot-link-deps`。全部行为测试使用内存数据、模拟 Electron 窗口或临时目录夹具，没有访问用户正在运行的应用或真实服务。仓库仍缺少 `docs/verification/README.md`，无法执行其中未提供的步骤；这里不将单元/组件测试当作真实服务端到端验收。

### 逐项修改与验证

1. **在主窗口打开**：`electron/main.mjs` 改用 `openIslandChat`，取消岛对 `queueChatLink` 的调用。先核对当前主窗口 origin 与所选对话的 `place.origin`，并确认主框架不在加载，再 reveal；发送前再次核对窗口和 origin，最后只向当前页发送 `desktop-notifications:open` 的 `{ botId, threadId }`。数据层单独保存读取打开目标的入口，避免刷新地点先清掉对话、导致连 reveal 都无法执行。不匹配或加载中只 reveal；岛显示中英文单行提示约 3 秒，不抢焦点。node-test 覆盖团队云、自存服务器、其他云、本机目的地、origin 不匹配、加载中，以及实际 island IPC 到当前页的发送和提示生命周期。
2. **第一次点击**：岛 BrowserWindow 增加 `acceptFirstMouse: true` 及 Electron/macOS 行为注释，设置 `backgroundColor: "#00000000"`，禁止 minimize/maximize/fullscreen。窗口夹具逐项断言构造参数。
3. **焦点**：列表/对话先 `setFocusable(true)`、`showInactive()`，再 `focus()`；收回非交互形态时 `setFocusable(false)`，从展开状态主动 `blur()`。blur 只折叠展开的岛，避免主窗口 reveal 后迟到的 blur 吞掉提示。测试断言调用顺序、Esc/外部 blur 后不可聚焦和不持有键盘焦点。原生 key window 行为仍须真机确认。
4. **关闭后空转**：关闭开关时清除鼠标轮询和离开定时器，收起并隐藏窗口；重新启用才重启轮询。模拟时钟验证关闭后推进 2 秒不再 publish，重新开启可再次悬停展开。
5. **close 后复活**：窗口控制器和数据源各自增加 `closed` 保护，close 幂等；后续 refresh/create/sync 不再读来源、创建窗口或发起请求，已排队的重连也不能重启数据源。测试验证窗口创建次数、来源读取次数、IPC 清理、请求次数和排队重连后的发布次数。
6. **截图初始化**：用同步 `mkdtempSync` 创建隔离 userData，将 `app.setPath` 与 `protocol.registerSchemesAsPrivileged` 都放在第一个 await 之前。脚本通过 `node --check`；原生截图待 Actions。
7. **最近对话**：使用与 `orderedThreadList` 相同的时间键 `lastThreadOrderAt ?? createdAt ?? 0`，去掉 `updatedAt` 回退；继续排除 routine/归档/bot API 对话。测试覆盖旧线程后台更新不能挤掉较新对话、显式 thread order 优先于创建时间。
8. **离线计数**：`islandCounts` 接收 online，离线的工作/等待计数归零；简介离线时显示“离线 / Offline”，不显示缓存的“N 在干活”。纯逻辑与组件测试均覆盖。
9. **专门审阅卡**：前端与主进程共用 `islandPermission`，仅普通待处理 permission 卡显示并接受允许/拒绝。技能及其他结构化 Request、电脑授权、外部写入等卡提供“在主窗口打开”。组件参数化测试覆盖 17 类专门卡；数据层测试验证带技能 hash 的卡无法绕过页面直接允许/拒绝，且不会 POST；普通权限卡的原有允许/拒绝测试通过。技能完整审阅与 `reviewedSha256` 仍由主窗口处理。
10. **截图 paths**：pull_request 和 push 都只匹配本轮指定的 7 类路径，保留现有分支限制与 `workflow_dispatch`；核对工作流内容。
11. **注释位置**：`src/types/cry.d.ts` 和 `electron/preload.cjs` 的 “The window's own frame…” 注释移回 windowFrame 上方；islandSettings 独立。preload / preload-contract 回归和类型检查通过。
12. **宽度滑块**：拖动仅更新本地 value/output；pointer release/cancel、键盘松键或失焦才保存，有 dirty 标记防止重复提交，pointer capture 保证拖出滑块后仍收到释放。组件测试验证两次拖动预览不调用 bridge.set，释放只保存最终宽度一次，键盘修改在松键后保存；原有开关测试通过。主进程只在保存时收到设置刷新，从而避免每次拖动都 setBounds。

### 测试结果与复现

先添加回归断言并观察失败，再修改实现：窗口参数/焦点/停止轮询/关闭生命周期、打开目的地、排序/离线计数、专门审阅按钮与滑块保存均复现。集成测试另行复现了不匹配提示在下一次轮询消失，修复后通过；随后补充排队重连和主进程拒绝技能审批的防回归覆盖。

本地最终结果：

| 验证 | 结果 |
| --- | --- |
| island node-test（island / island-data / island-model / island-page） | 27/27（10 + 8 + 8 + 1） |
| 原有指定回归（desktop-prefs / talk-main / talk-panel / talk-server / preload / preload-contract / window-all-closed / remote-only） | 110/110（23 + 18 + 21 + 16 + 13 + 2 + 5 + 12） |
| desktop-notifications node-test | 13/13 |
| `src/island/Island.test.ts` | 24/24 |
| `src/components/IslandSettings.test.ts` | 2/2 |
| `pnpm exec tsc -b` | 通过 |
| 本轮改动文件 `oxlint --deny-warnings` | 通过，无告警 |
| 截图脚本语法检查、`git diff --check` | 通过 |

Node 默认 `--test` 子进程模式在本沙箱只返回文件级 `test failed`，没有输出实际测试断言；使用 `--test-isolation=none` 并逐文件单独启动进程后可正常执行。talk-main 文件运行约 60 秒并正常退出。全部测试文件串行运行，没有使用 systemd。

```bash
crybot-link-deps
for name in island island-data island-model island-page desktop-prefs talk-main talk-panel talk-server preload preload-contract window-all-closed remote-only desktop-notifications; do
  node --test --test-isolation=none "electron/$name.node-test.mjs" || exit 1
done
pnpm exec vitest run src/island/Island.test.ts
pnpm exec vitest run src/components/IslandSettings.test.ts
pnpm exec tsc -b
git diff --name-only -z | xargs -0 pnpm exec oxlint --deny-warnings
node --check scripts/testing/island-screenshots.mjs
git diff --check
```

### Actions 与真机待确认

- 本沙箱禁止监听端口，未运行需要端口的服务端/e2e；相关结果以 Actions 为准。本轮没有运行原生 Electron 截图，也没有声称截图作业通过。协调者推送分支后，以 `macos-26` 的 `island-screenshots` 作业及四态 artifacts 为准。
- 真机确认：其他应用在前台时第一次点击能直接展开/输入；岛成为 key window 时主窗口不被带到前面；简介/隐藏后键盘输入不会落到岛上；打开主窗口成功和地点不匹配时的焦点与提示时序。
- 真机确认：刘海尺寸、无刘海外接屏、菜单栏穿透、Retina、Spaces/Stage Manager、全屏开关与显示器热插拔；真实会话下不同地点的流式消息和主窗口完整技能审批。
