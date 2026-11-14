# T-1228-screens-ui 实现报告

日期：2026-11-14。任务：T-1228 多屏云电脑，子任务 D，第一批。

状态：前端实现和本地组件验证已完成；整体验收尚未完成。两张真实截图、全量中继／服务 E2E、Actions 仍未完成。未提交 git，未推送，未开 PR。

更正：上面关于第 1 轮未提交、`.git` 只读以及工作树显示 `master` 的记录属于当时环境；第 1、2 轮改动现已提交，本轮仅保留第 3 轮工作树改动。

## 实现

- 新增 `src/components/LocalVmScreens.tsx`，消费约定的 `ScreenListPayload`。显示屏号、运行状态、智能体、人工接管状态、空闲秒数和排队顺序／已等待时间；单屏布局直接返回空内容。
- 设置页从现有状态轮询取得屏幕列表。切换观看调用所选屏的 `/api/local-computer/screens/:n/screenshot`，不暂停智能体。接管请求携带该屏的 `viewerTarget`，实时界面复用 `LiveDesktop`，包括手机宽度下的交还与全屏操作。切屏、关闭和页面离开时复用租约释放；接管请求在切屏后才返回时，也释放原屏租约。
- 共享模式新增 1–4 屏选择，默认显示 4，保存只发 `PATCH /api/config` 的 `{ localVm: { screens } }`。显示共享模式默认 8 GB／3 核、受宿主上限约束。独占和池模式不显示屏数设置或共享资源说明。
- `ComputerPanel` 优先使用服务器返回的 `screen.viewerTarget`；旧状态没有 `screen` 时保留原观看目标。`screen: null` 或 `queue_position` 显示等待状态，不允许误接管共享容器。每两秒重新查询，获分配后恢复观看／接管。兼容 `409 { error: "screen_not_assigned" }`。
- `remote-desktop-panel` 接管前查询分配，向控制与 join 请求传入屏目标，保留 bot join 路由和 `controlLeaseId`。排队或未分配时不打开桌面，也不关闭其他查看端的连接。原生手机端未修改。
- 新文案进入英／中文及其余 14 种语言，并记录新键的源文案哈希。默认语言生成命令调用外部 CLI 后 45 秒超时，随后补齐本任务 15 个键的翻译，执行 `node scripts/generate-locale.mjs --record-hashes`；只保留本任务新键的哈希改动。`i18n:check` 通过，不把超时生成器记作成功。
- `vite.config.ts` 增加 `src/**/*.test.tsx` 收集项，否则任务指定的新测试文件不会执行。

`ScreenListPayload` 暂作为前端导出类型保留在组件文件中，结构与任务合同一致；未引入或修改服务端定义。未修改 `server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION`、观看目标正则、`desktop-connection.ts` 或附录规格文件。

## 本地验证

开工已运行 `crybot-link-deps`。没有使用 systemd。测试一次只跑一个文件；后续命令使用 `NODE_OPTIONS=--max-old-space-size=4096` 限制 Node 堆。该参数是堆上限，不等同于 cgroup 进程总内存上限。

| 命令 | 结果 |
| --- | --- |
| `pnpm exec vitest run src/components/LocalVmScreens.test.tsx` | 11 项通过 |
| `pnpm exec vitest run src/components/LocalComputerSection.test.ts` | 51 项通过 |
| `pnpm exec vitest run src/components/ComputerPanel.takeover.test.ts` | 23 项通过 |
| `pnpm exec vitest run src/lib/desktop-connection.test.ts` | 7 项通过 |
| `pnpm exec vitest run src/components/remote-desktop-panel.open.test.ts` | 9 项通过 |
| `pnpm exec tsc -b` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm i18n:check` | 通过，16 种语言的目录有效 |
| `pnpm check:brand` | 通过，0 个禁止引用 |
| 本次修改代码与截图脚本的 `oxlint --deny-warnings` | 通过 |
| `git diff --check` | 通过 |
| `pnpm lint` | 未通过：两个未修改文件的已有告警，见下文 |

测试使用隔离的 happy-dom／模拟 API，没有连接用户应用或修改真实数据。覆盖四块屏的精确目标、单屏回退、排队自动分配、未分配冲突、按屏交还、切屏释放、迟到接管释放、停机／失败屏禁用、接管拒绝、中英文文案、共享模式屏数 PATCH、独占／池模式不展示共享设置。

全仓库 lint 剩余告警：

- `scripts/public-scan/scan.mjs:297`：`eslint(no-control-regex)`。
- `server/lazy-container-mcp.ts:122`：`unicorn(no-useless-spread)`。

两文件在本任务中均无修改；没有通过关闭规则绕过问题。

完整 `companion/test/viewer-relay.test.ts` 涉及实际监听端口，运行后无法完成，已中止，不记为通过。隔离监听探针确认返回 `EPERM`。另行运行 `pnpm exec vitest run companion/test/viewer-relay.test.ts -t 'rewrites only a generated loopback noVNC URL'`：1 项通过、12 项跳过；这是局部回归，不代表整个文件通过。其余中继与服务 E2E 以 Actions 为准。

## 截图验收与复现

**两张真实尺寸截图尚未生成，不能视作交付完成。**

已提供 [capture.mjs](capture.mjs)，构建真实 `LocalVmScreens`、`LiveDesktop` 和仓库样式，API 与远程桌面画面由独立模拟数据提供。使用临时目录、独立 Chromium profile、`file://` 页面和 CDP 管道，不监听端口、不读取真实应用数据。脚本会点击第 2 屏；手机场景实际点击接管，断言只向 `local/shared-s2` 发送一次 take，再截图，并检查两个视口都没有横向溢出。

目标输出：

- `screenshots/desktop-four-screens.png`：1440 × 1080，桌面四屏列表。
- `screenshots/mobile-screen-takeover.png`：390 × 844，手机宽度接管第 2 屏。

本沙箱中构建成功，但 Chromium 启动被系统调用限制阻止：最初是 crashpad 的 `setsockopt: Operation not permitted`；关闭 crashpad 后仍在 `content/browser/sandbox_host_linux.cc` 因 `shutdown: Operation not permitted` 退出。管道连接和单进程模式也不能解决，未生成替代图片冒充截图。

在允许启动 Chromium 的隔离机器或 Actions 中运行：

```sh
node docs/tasks/T-1200/T-1228-screens-ui/capture.mjs
```

可用 `CHROMIUM_PATH` 指定 Chromium 可执行文件。脚本完成后需人工查看两张截图；目前未声称视觉验收通过。全局 CSS 构建另有已有的 `::highlight` 优化器提示，不是此次浏览器启动失败的原因。

## 集成与环境限制

- `AGENTS.md` 指向的 `docs/verification/README.md` 在当前工作树不存在。没有运行用户在线服务，也没有声称真实服务器或真实会话多屏接管已验证。
- C 分支负责 `shared-s1`–`shared-s4` 的代理正则／连接能力；E／接线分支负责状态载荷、截图／join 路由和按屏控制。本任务的模拟验证不能替代合并后的真实连接验收。未修改正则来抢占 C 的工作。
- `.git` 挂载只读。尝试创建 `T-1228-screens-ui` 时无法创建 ref lock，当前工作树仍报告 `master`。代码变更全部保留在工作区；遵循“不提交 git”的任务指令，未提交、推送或创建草稿 PR，因此没有 Actions 结果。

## 通用要求（任务原文）

- 公开仓库，不写内部域名、IP、邮箱、人名、密钥。
- 不提升 `IMAGE_LAYER_VERSION`，不改 `server/vps-computer.ts`。
- 只有 T-1228-wiring 能改 `server/index.ts`。其他任务需要接线的地方只导出函数，不自己接。
- 每个任务都要通过：`pnpm exec tsc -b`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm lint`、自己任务的 vitest 文件。本机跑加 `systemd-run --scope -q -p MemoryMax=4G --`，以 Actions 为准。改完推分支、开草稿 PR 跑 Actions。
- 标「新建」的文件目前不存在，其余都已核对存在。
- 执行规格在文末附录(仓库里由 T-1228-screen-pool 提交为 `docs/specs/2026-11-14-multi-screen.md`)，本任务不要提交这份规格文件。

本次执行采用用户针对本沙箱的覆盖要求：不使用 systemd，一次一个测试文件，禁止监听导致的 E2E 限制如实报告；不提交 git。

## 第 2 轮返工（2026-11-14）

### 实现

- 新增 `src/lib/local-vm-screen-state.ts`，集中处理屏幕等待状态、排队／未分配轮询间隔和观看目标选择，并以 `local-vm-screen-state.test.ts` 覆盖单屏回退、明确屏目标、排队和未分配分支。未分配且没有 `queue_position` 时改用单独提示，轮询放宽到 15 秒；排队仍为 2 秒。
- `ComputerPanel` 记住最近一次明确的屏幕 `viewerTarget`，也记住旧单屏的 legacy VM 目标。状态重新拉取造成 `vmStatus` 短暂为空时，接管会话键和实时画面继续使用该目标，不发送 release；屏幕目标不存在时保留原单屏会话键行为。接管回归覆盖 per-bot／共享单屏状态刷新。
- `LocalVmScreenSetting` 和 `saveScreens` 移到 `LocalVmScreens.tsx`。设置页只在服务端返回 `status.screens` 时显示屏数和 8 GB／3 核说明；缺少字段时不会伪造默认值。
- 空闲屏使用 `Available`／「空闲」，时长超过 60 秒改按分钟显示；英文排队行使用 `Queued`，按钮增加横向图标布局。新增文案已补齐 16 种语言并通过 `i18n:check`。
- 文件行数实测：`ComputerPanel.tsx` 1781 行（上限 1782），`LocalComputerSection.tsx` 1436 行（上限 1437）。`scripts/testing/file-size-ratchet.test.ts` 已实际通过。

### 第 2 轮验证

| 命令 | 结果 |
| --- | --- |
| `pnpm exec vitest run src/lib/local-vm-screen-state.test.ts` | 3 项通过 |
| `pnpm exec vitest run src/components/LocalVmScreens.test.tsx` | 12 项通过 |
| `pnpm exec vitest run src/components/LocalComputerSection.test.ts` | 52 项通过，含缺少 `screens` 字段不显示设置 |
| `pnpm exec vitest run src/components/ComputerPanel.takeover.test.ts` | 26 项通过，含 per-bot／共享状态刷新不 release、等待提示节点保持挂载 |
| `pnpm exec vitest run src/lib/desktop-connection.test.ts` | 7 项通过 |
| `pnpm exec vitest run src/components/remote-desktop-panel.open.test.ts` | 9 项通过 |
| `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts` | 1 项通过 |
| `pnpm exec tsc -b` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm i18n:check` | 通过，16 种语言目录有效 |
| `pnpm check:brand` | 通过，0 个禁止引用 |
| `pnpm lint` | 仅剩基线告警：`scripts/public-scan/scan.mjs:297`、`server/lazy-container-mcp.ts:122` |
| `git diff --check` | 通过 |

沙箱禁止监听端口，浏览器截图和完整中继／服务 E2E 仍无法在本机完成，以 Actions 为准；上一节的截图脚本已记录 Chromium 启动限制，没有伪造截图。本轮没有改动 `server/`、`desktop-connection.ts` 正则、`IMAGE_LAYER_VERSION` 或原生手机端。

按任务约定，`computer-takeover.ts` 的 `leave()` 是否在 release 中携带 `target` 留给接线任务并由 E2E 覆盖；`ScreenListPayload` 仍暂留前端组件，接线时改为导入共享定义。

## 第 3 轮返工（2026-11-14）

### 实现

- `ComputerPanel` 的接管会话键只在当前 bot 收到明确的 `screen.viewerTarget` 时追加屏目标；VPS、单屏和独占模式沿用原会话键。屏目标 ref 按 bot 和电脑模式清理，`liveTarget` 不再用旧 ref 兜底，VM 在未分配、状态未确认或切 bot 时返回空目标。VPS 的状态重拉保留接管画面和 viewer-close 路径，不发送 release。
- 409 `screen_not_assigned` 按未分配处理：清除旧 `screen`／`queue_position`，重试间隔改为 15 秒，等待提示节点保持挂载。远程桌面面板在 `screen === null` 或 409 时使用未分配 bot 文案。
- 新增 `local-vm-screen-state` 的目标、会话、冲突清理和状态文案辅助函数及单测；抽出 `LocalVmIdleTimeoutSetting`，恢复 `ComputerPanel` 中的多语句格式。文件行数为 `ComputerPanel.tsx` 1761（上限 1782）、`LocalComputerSection.tsx` 1358（上限 1437）。
- 空闲和等待时长在 1 分钟显示单数英文（`1 minute`），其他语言补齐对应键；其余 14 种语言的排队行改用短的「已排队」前缀。

### 第 3 轮验证

| 命令 | 结果 |
| --- | --- |
| `pnpm exec vitest run src/components/LocalVmScreens.test.tsx` | 12 项通过 |
| `pnpm exec vitest run src/components/LocalComputerSection.test.ts` | 52 项通过 |
| `pnpm exec vitest run src/components/ComputerPanel.takeover.test.ts` | 27 项通过，含 VPS 状态刷新不 release／不关闭 viewer |
| `pnpm exec vitest run src/lib/desktop-connection.test.ts` | 7 项通过 |
| `pnpm exec vitest run src/components/remote-desktop-panel.open.test.ts` | 9 项通过 |
| `pnpm exec vitest run src/lib/local-vm-screen-state.test.ts` | 5 项通过 |
| `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts` | 1 项通过 |
| `pnpm exec tsc -b` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm i18n:check` | 通过，16 种语言目录有效 |
| `pnpm check:brand` | 通过，0 个禁止引用 |
| `pnpm lint` | 仅剩基线告警：`scripts/public-scan/scan.mjs:297`、`server/lazy-container-mcp.ts:122` |

本轮未修改 `server/`、`desktop-connection.ts` 正则、`IMAGE_LAYER_VERSION` 或原生手机端。沙箱禁止监听端口，浏览器截图和完整服务 E2E 仍以 Actions 为准。
