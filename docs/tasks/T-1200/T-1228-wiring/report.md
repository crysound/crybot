# T-1228-wiring 执行报告

日期：2026-11-14。服务端接线和测试已写入工作区；整服务验收、UI 联调及屏私有文件访问依赖尚未完成，不能据此声明可上线。没有提交、暂存或推送 git。

## 实现

- 直接使用第一批导出的屏池、屏目标、容器身份、启动/停止、观看和接管函数。新增 `local-vm-screen-runtime.ts` 管理拿屏、就绪、亲和恢复、屏口令与空闲；`index.ts` 负责直接会话、Auto、群聊和生命周期接线。
- 从原 `bindTurnComputer` 提取公共等待流程到 `turn-computer-wait.ts`。满屏沿用排队位置、预计等待、`turn.wait_started` / `turn.wait_ended`、`ComputerWaitParked`；协调器按屏池可用状态自动恢复挂起轮次。拿到屏后绑定该屏资源并挂该屏 MCP。
- 第 2 轮已统一为屏池自身的空闲计时；工具调用、轮次结束和接管心跳刷新对应屏。`onAnyOn` 取消容器计时，`onAllOff` 才启动容器空闲计时。`CRYBOT_SCREEN_IDLE_MS` 只允许缩短单屏的十分钟窗口，不改变生产容器空闲配置。
- 第 2 轮删除重启时 root exec 读回/解码 VNC 密码的路径；恢复时停止无主进程，分配时重新生成屏密码。密码通过标准输入交给启动函数，不放入日志、事件、公开屏列表或命令行参数。
- 新增管理员屏 join/截图路由；机器人状态/join/截图指向已分配屏，未分配返回 `409 screen_not_assigned`。屏列表使用 `shared/local-vm-screens.ts` 导出的 `ScreenListPayload`。机器人状态包含 `screen.viewerTarget`；设置响应包含 `localVm.screens`。
- 配置接受屏数。1↔多屏与模式切换共用忙碌保护和修改围栏，认领准备期间也拒绝切布局；重建由更新器处理。2/3/4 之间只调整屏池，不重建容器。
- 布局标签不符触发本机容器重建。重建保留旧工作区，将旧浏览器资料复制给 s1，不覆盖已有屏资料。并发首次认领共用同一次迁移；迁移失败允许重试。屏浏览器 HOME 资料链接到持久工作区。
- 共享多屏创建时采用现有 8G/3 核默认值并夹到宿主上限；`screens=1` 保留原创建参数和运行路径。Apple container 或初始化探测回退时继续单屏并返回提示。
- 提示词说明当前屏号、隔离和受限安装助手。附件、页面打包、发布页面、应用托管、密钥卡片的宿主/访客根路径改为当前屏路径；私有文件权限问题见下文依赖项。

## 第一批审核事项

1. `botKeys`、`keyFor`、`leaseKey` 使用分配屏键；新增无运行轮次的面板接管可见性和手机续租测试，覆盖面板不能少报自身持有状态。
2. 显式屏目标必须匹配机器人分配屏；带/不带 `threadId` 均拒绝未分配屏和其他机器人的屏。多屏模式拒绝旧 `local/shared` 接管目标。
3. 直连 `joinUrl` 带 `path=websockify?token=sN` 和对应屏密码；代理连接使用已有 `DesktopConnection.path` 契约。
4. 交还约定：有租约时按 `controlLeaseId` 释放原持有键，不要求再传 `target`。保留前端 `leave()` 的租约式释放；新增整服务用例明确省略 `target`，断言释放 s1 不会释放 s2。
5. 更正：D 已合入 main（任务提供的信息），本检出已有 `LocalVmScreens.tsx` 和 `LocalComputerSection.tsx`。第 2 轮已删除组件自定义类型，两个组件直接导入 `shared/local-vm-screens.ts`，并增加接口契约测试。当前快照缺少 `origin/main`，无法独立复核合并提交。
6. 第 2 轮移除 root 读回屏口令，保留内存随机生成；`cua`→s1 迁移改用不跟随符号链接的 `chown -hR`，等待用户和 supervisord 初始化，添加容器内一次性标记。

## 第 1 轮验证记录

开工已运行 依赖准备脚本。未使用 systemd；Vitest 按单文件串行执行。验证只使用 mock、临时目录或隔离服务 fixture，没有访问用户真实应用及数据。AGENTS.md 引用的 docs/verification/README.md 在当前检出不存在。

| 检查 | 结果 |
| --- | --- |
| `pnpm exec tsc -b` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm lint` | 只有允许的两条基线告警；脚本含 `--deny-warnings`，因此实际退出码为 1 |
| `pnpm i18n:check` | 通过 |
| `pnpm check:brand` | 通过，未检出禁用引用 |
| `git diff --check` | 通过 |

Lint 告警位置保持为 `scripts/public-scan/scan.mjs:297`、`server/lazy-container-mcp.ts:122`，没有新增告警，也没有抑制规则。

以下均使用 `pnpm exec vitest run <文件>`：

| 文件 | 通过用例 |
| --- | ---: |
| `server/local-vm-screen-runtime.test.ts` | 7 |
| `server/local-vm-screen-layout.test.ts` | 3 |
| `server/local-vm-screens.test.ts` | 33 |
| `server/host/shared-vm-control.test.ts` | 101 |
| `server/desktop-viewer-targets.test.ts` | 6 |
| `server/routes/computers.test.ts` | 10 |
| `server/desktop-updates.test.ts` | 9 |
| `server/container-screens.test.ts` | 25 |
| `server/container-computer.test.ts` | 150 |
| `server/routes/published-pages.test.ts` | 8 |
| `server/routes/app-hosting.test.ts` | 6 |
| `server/pages/bundle.test.ts` | 5 |
| `server/surface.test.ts` | 48 |
| `server/host/secret-cards.test.ts` | 39 |
| `src/components/computer-takeover.test.ts` | 15 |
| `scripts/testing/file-size-ratchet.test.ts` | 1 |

共 16 个文件、466 项通过。`desktop-updates.test.ts` 包含 VPS 当前镜像不会因本机布局变化而过期的断言。密钥卡片原有测试通过仅表示既有行为没有回归，不代表屏用户私有文件投递已验证。

## 整服务验收与外部依赖

新增 `server/local-vm-screens.e2e.test.ts` 五个场景：两智能体隔离、第 5 个排队/挂起/自动恢复、单屏接管和按租约交还、单屏兼容、单屏空闲与容器空闲衔接。另覆盖繁忙时拒绝切布局，以及 2/3/4 配置返回值与不重建行为。假 Docker 位于 `server/testing/local-vm-screens-hooks.mjs`，记录 supervisor、exec 身份、套接字、资源键和等待事件。

实际执行新 E2E 后，5 项全部在 fixture 的 `freePortBlock` 阶段报 `no free port block for offsets 0,1`，服务未启动；当前沙箱禁止 TCP 监听，不能把这些用例记作通过。既有 `group-local-vm.e2e.test.ts`、`desktop-updates.e2e.test.ts`、`openai-compat-vm.e2e.test.ts` 因相同限制未运行。旧共享单屏 fixture 明确以默认 1 屏运行，未修改原验收断言。

协调者推分支后须运行指定的四个端口型 E2E、两份指定单测及全部 Vitest 分片，以 Actions 为准。本次没有 Actions 结果。

以下仍待完成：

- **屏私有文件访问依赖**：规格规划的 `server/screen-files.ts` 不在本检出。当前只完成根路径映射；rootless UID 映射下，宿主直接读屏用户 0600 文件、向其私有目录投递密钥文件仍可能失败。须合入屏文件访问任务，并把附件、发布/托管、打包与密钥投递接到该访问层，补相应隔离 E2E 后才满足完整文件访问合同。
- **D 联调与截图**：UI 已在本检出，第 2 轮完成共享类型接入、接口契约和组件测试。本机无法监听端口，设置页/电脑面板预览与真实截图由协调者在可监听端口的环境补充。
- **真实容器验证**：本机无 Docker，未进行真实多屏隔离、浏览器登录迁移、四屏负载或 OOM 验证；由已有真实容器工作流和预览环境完成。

## 交付边界

未改 `server/vps-computer.ts`、`IMAGE_LAYER_VERSION`、文件行数上限或容器权限/端口安全判定。新逻辑放在独立模块，`server/index.ts` 保持低于 15515 行上限。

当前 checkout 实际为 `master`。尝试创建 `T-1228-wiring` 分支时，因 `.git` 只读而失败；全部修改保留在工作区，由协调者搬到目标分支并推送验证。没有 git 提交。


## 第 2 轮：审核返工

日期：2026-11-14。任务目标分支为 **T-1228-wiring**。必须如实记录：沙箱实际检出分支为 `master`，仅有 `<沙箱基线提交>`；没有远程引用，也没有第一轮的未提交 diff，第一轮实现已包含在此基线文件中。执行了要求的 `git log origin/main -3 -- src/components/LocalVmScreens.tsx`，返回 `fatal: bad revision 'origin/main'`；尝试 `git checkout -b T-1228-wiring` 返回 `.git/refs/heads/T-1228-wiring.lock: Read-only file system`。因此无法声明已检出 T-1228-wiring；需协调者将本工作区改动应用到该分支。未提交、暂存或推送 git。

### 修复与证据

1. 启动恢复由 `localVmStartupReady` 统一等待，直接会话 attach/claim 和群聊 claim 均先等待。屏恢复、库存恢复、更新 sweep 分别捕获失败并记录阶段日志，任一失败不跳过后续步骤。fixture 轮询 `Local VM startup recovery complete` 日志标记，无固定启动 sleep。新增启动测试覆盖未就绪时阻塞以及三个阶段分别失败仍完成其余阶段。
2. 多屏 Auto 安装懒 MCP，仅工具调用才 claim；strict 多屏回合仍提前申请。`claimAutoLocalVm` 优先使用 pinnedTarget 和已有回合目标。内部控制门禁返回已授权的屏号，MCP 根据该屏生成用户、DISPLAY 和 socket；未拿到有效屏号时拒绝连接。单测覆盖空池、四屏全忙时纯聊天不占屏、不排队，以及第一次工具调用才占屏；桥接测试覆盖 s1–s4、单屏回退和无效分配。新增开关已进入 bot-box 环境白名单。
3. D 的两个前端组件及组件测试统一 import `shared/local-vm-screens.ts`，实际字段一致，无需改共享类型。`local-vm-screen-runtime.test.ts` 用真实运行态生成四屏与等待队列，经 `createComputerRoutes` 的 GET 路由返回并 JSON 序列化，按前端共享契约逐项断言 `layout/screens/slots/queue`、机器人、观看目标、人工接管、空闲与等待秒数；不含密码。组件测试另验证列表、切换和接管。真实界面截图由协调者补充。
4. 管理员与机器人截图、join 路由均移除显式空闲 touch。真实屏池配合路由测试连续轮询两种截图，仍在 1.5 秒窗口后停屏并返回 409；join 测试验证不 touch。回合内工具门禁和人工 `touchControl` 保留活动续期。
5. 删除 runtime 中每屏重复的 `ComputerIdleTimer`，仅保留 `LocalVmScreenPool` 的 arm 逻辑；容器继续在最后一屏关闭后开始自己的计时。生命周期、亲和、接管保活及排队单测通过。
6. 浏览器资料迁移等待 `crybot-s1` 用户及 supervisord pid 文件，使用 `cp -a` / `chown -hR`，不会递归跟随资料里的符号链接；成功后写 root 管理的 `/run/crybot/screens/browser-profiles-migrated` 标记。失败可重试，后续 claim 不再复制。临时目录执行真实迁移 shell，验证旧资料保留、不覆盖新资料、标记生效及符号链接目标未改。
7. 共享容器新增的全容器 busy 拒绝仅在多屏启用。路由测试验证多屏 start 返回 409、单屏按旧规则允许。
8. 配置合并值在保存前校验，繁忙布局转换在落盘前拒绝；保存后 `localVmScreensChanged` 失败返回 HTTP 200 和 warning，后续广播仍执行。新增测试验证非法屏数不落盘、忙碌拒绝及失败后磁盘值/响应值一致；日志不写原始运行时错误。
9. 群聊 fixture 配置显式 `screens: 1`，删除替换 `local-vm-settings.ts` 源码来修改默认值的 hook。
10. 多屏 E2E 场景 1 增加实际 MCP 工具执行，检查每屏 exec 不出现另一屏 DISPLAY/socket；场景 2 要求 `wait_ended.outcome === acquired`；场景 4 实际执行 MCP 并检查 `-u cua`、`DISPLAY=:1` 和旧 socket。另保留独立的第 5 个回合 park/自动恢复用例，增加两个纯聊天用例和 Auto 首次工具动态选屏用例。最终共 9 个场景。
11. 恢复时所有运行屏无主，会停止并在下次使用时生成新密码，因此删除 root exec + TigerVNC 解码读回路径。密码模块仅保留随机生成函数；恢复测试验证没有读回 exec，也没有恢复后的旧密码。

### 第 2 轮验收输出

已先执行 依赖准备脚本，输出 `linked 73 entries`。无 systemd、无 Docker；Vitest 全程一次一个文件。测试使用仓库隔离 home、临时数据目录和假运行时，无用户真实应用变更。`docs/verification/README.md` 仍缺失，不能声称完成该文档中不可读取的步骤。

完整命令与原始输出见 [round2-verification.txt](round2-verification.txt)。下表均为 `pnpm exec vitest run <文件>` 的最终结果：

| 文件 | 输出摘要 |
| --- | --- |
| `server/local-vm-screens.e2e.test.ts` | 9 failed；均在 fixture 分配端口时阻塞，`no free port block for offsets 0,1` |
| `server/group-local-vm.e2e.test.ts` | 47 skipped，beforeAll 失败；`listen EPERM: operation not permitted 127.0.0.1` |
| `server/desktop-updates.test.ts` | 9 passed |
| `server/routes/computers.test.ts` | 12 passed |
| `server/host/shared-vm-control.test.ts` | 101 passed |
| `server/local-vm-screen-runtime.test.ts` | 11 passed |
| `server/local-vm-screen-layout.test.ts` | 3 passed |
| `server/desktop-viewer-targets.test.ts` | 6 passed |
| `server/local-vm-startup.test.ts`（新增） | 4 passed |
| `server/routes/config-screens.test.ts`（新增） | 6 passed |
| `server/lazy-container-mcp.test.ts` | 18 passed |
| `scripts/testing/file-size-ratchet.test.ts` | 1 passed |
| `server/bot-box/env.test.ts` | 10 passed |
| `src/components/LocalVmScreens.test.tsx` | 12 passed |
| `src/components/LocalComputerSection.test.ts` | 52 passed |

可执行测试合计 **13 个文件、245 项通过**。端口型 E2E 无法在本沙箱完成，不能记为产品通过；以 Actions 和协调者可监听端口的主机实跑结果为准。

```text
pnpm exec tsc -p tsconfig.server.json
exit 0（无诊断）
pnpm exec tsc -p tsconfig.json
exit 0（无诊断）
pnpm exec oxlint --deny-warnings <全部改动及新增的 TS/TSX/MJS 文件>
exit 0（无诊断）
git diff --check
exit 0
```

修正了改动文件 `lazy-container-mcp.ts` 原有的多余 spread lint 告警，无规则抑制。`server/index.ts` 为 15399 行（上限 15515），`container-computer.ts` 为 1155 行（上限 1175，未改）；新增源码/测试均不足 1000 行，未调整 ratchet 上限。未修改 `IMAGE_LAYER_VERSION` 或 `server/vps-computer.ts`。

剩余交付限制：目标分支切换受只读 `.git` 限制；端口型 E2E、真实容器迁移/隔离与真实界面截图需由协调者或 Actions 完成。第 1 轮报告的屏私有文件访问依赖保持原交付边界，本轮未声称验证该外部任务。


## 第 3 轮：复审返工

日期：2026-11-14。本轮基于当前快照内的第二轮实现继续修改；开工时 `git status --short` 为空，实际检出仍为 `master`（`<沙箱基线提交>`），任务目标分支为 T-1228-wiring。未提交、暂存或推送 git。

### 修复内容

1. **启动不再等待更新 sweep**：`recoverLocalVmStartup` 的 ready 只等待屏恢复与 inventory，各自捕获错误；随后后台调用 sweep 并独立 catch。直接会话 attach 和群聊均先检查模型能否挂 computer MCP，再等待 ready；claim 的等待仍位于实际认领路径内。启动单测用未完成的 sweep 验证 attach 已可继续，并验证后台 sweep 拒绝会被记录且不暴露原始错误内容。
2. **单屏门禁响应兼容**：只有未被接管且目标满足 `isScreenTarget(target)` 时返回 `localVmScreen`。单屏不再额外返回 `localVmScreen: 0`；未修改 group-local-vm 的原断言。
3. **修正 strict fixture**：创建机器人后用 PATCH 设置 `computer: "vm"`，Auto fixture 继续省略该设置。「四屏全忙时纯文本不排队」在发送 Auto 消息前断言已分配槽位数为 4、全部 ready、分属 4 个机器人，避免空测。
4. **多屏 Auto 复用旧路径检查**：使用 `SHARED_LOCAL_VM_TARGET` 共用单屏的 `observe` / `kick`、`autoLocalVmAttachable`、`localVmDesktopPending`、image/mode/lifecycle busy 检查，再安装懒屏 MCP。更新中的聊天返回原有更新提示而不挂电脑，例程沿用等待更新的处理。`desktop-updates.e2e` fixture 明确设置 `screens: 1`，原有七项断言不变；多屏 e2e 新增阻塞镜像拉取时 Auto 仍能派发、没有 computer MCP、带更新提示的场景。
5. **逐目标隔离库存探测错误**：在 `recoverLocalVms` 内逐个 status Promise `.catch(() => null)`，单个失败不丢弃其他目标的探测结果。新增 pool/per-bot 两项测试，验证健康目标仍入账并启动空闲计时。
6. **恢复单屏活动续期**：管理员截图、机器人截图和机器人 join 仅在非多屏运行态调用原 `localVmIdleFor(...).touch()`；多屏继续不续期。路由测试分别覆盖单屏与多屏，三种请求各连续调用三次，验证单屏续期、多屏不续期；已有真实屏池轮询截图后的空闲回收测试通过。
7. **多屏 Auto 例程不创建缺失容器**：未见过共享 VM 时直接返回 false；探测后的 missing 容器不安装懒 MCP，也不进入 claim/prepare 创建容器。新增两项例程 e2e，分别覆盖镜像可用但容器 missing、镜像和容器都不存在，要求不挂电脑、不执行 run、不分配屏。
8. **fixture 打桩失败显式报错**：computer-idle、harness bus、turn-resources 三处源码替换统一使用 `replaceFixtureSource`，找不到原串立即抛错。新增测试验证命中时替换、源码变化导致未命中时抛错；hook 的 Node 语法检查通过。

### 第 3 轮验收输出

开工先执行 依赖准备脚本，输出 `linked 73 entries`。全部 Vitest 按单文件串行执行；没有 systemd、Docker，也没有访问用户 live app 或数据。端口型测试均尝试启动各自隔离 fixture，但本机禁止监听 TCP。仓库仍缺少 `docs/verification/README.md`，无法执行其中未提供的步骤。

完整命令与原始输出见 [round3-verification.txt](round3-verification.txt)。以下每项均实际执行 `pnpm exec vitest run <文件>`：

| 文件 | 输出摘要 |
| --- | --- |
| `server/local-vm-screens.e2e.test.ts` | 12 failed；均为 `no free port block for offsets 0,1`，未进入服务场景 |
| `server/group-local-vm.e2e.test.ts` | 47 skipped；beforeAll 超时，并报 `listen EPERM: operation not permitted 127.0.0.1` |
| `server/desktop-updates.e2e.test.ts` | 7 failed；均为 `no free port block for offsets 0,1` |
| `server/openai-compat-vm.e2e.test.ts` | 4 skipped；beforeAll 超时，并报 `listen EPERM: operation not permitted 127.0.0.1` |
| `server/local-vm-startup.test.ts` | 4 passed |
| `server/routes/config-screens.test.ts` | 6 passed |
| `server/local-vm-screen-runtime.test.ts` | 11 passed |
| `server/routes/computers.test.ts` | 14 passed |
| `server/desktop-updates.test.ts` | 9 passed |
| `server/lazy-container-mcp.test.ts` | 18 passed |
| `server/host/shared-vm-control.test.ts` | 101 passed |
| `src/components/LocalVmScreens.test.tsx` | 12 passed |
| `src/components/LocalComputerSection.test.ts` | 52 passed |
| `scripts/testing/file-size-ratchet.test.ts` | 1 passed |
| `server/bot-box/env.test.ts` | 10 passed |
| `server/local-vm-recovery.test.ts`（新增） | 2 passed |
| `server/testing/fixture-source.test.ts`（新增） | 1 passed |

本机可执行的 **13 个测试文件、241 项全部通过**。四个端口型 e2e 均未完成行为验收，不能记为通过；以 Actions 或复审员在可监听端口的主机上实跑为准。本轮未获取 Actions 结果。

```text
pnpm exec tsc -p tsconfig.server.json
exit 0（无诊断）
pnpm exec tsc -p tsconfig.json
exit 0（无诊断）
pnpm exec oxlint --deny-warnings <本轮全部 12 个改动/新增 TS、MJS 文件>
exit 0（无诊断；完整文件列表见原始输出）
node --check server/testing/local-vm-screens-hooks.mjs
exit 0
git diff --check
exit 0
```

`server/index.ts` 为 15397 行（上限 15515），`server/container-computer.ts` 为 1155 行（上限 1175，未改）；本轮新增文件均不足 1000 行，未提高任何 ratchet 上限。未修改 `IMAGE_LAYER_VERSION` 或 `server/vps-computer.ts`。

本轮完成上述八项代码修复与可运行测试；端口型 e2e、真实容器及界面验证仍受环境限制。前两轮记录的屏私有文件访问依赖保持原交付边界，本轮未声称验证该外部任务。

## 第 4 轮：复审返工

日期：2026-11-14。本轮继续使用当前工作区快照，未提交、暂存或推送 git。

### 修复

1. 挂起轮次恢复判断抽出屏资源判定：单屏的 `computer:vm:shared` 在资源空闲时不再受共享 VM 的人工接管状态阻塞；多屏屏资源仍把对应屏的接管视为忙碌。新增单屏和多屏单测。
2. 配置路由拆分屏数变化与 1↔多屏布局变化。`localVmTurnsBusy` 只阻止真正的布局切换；shared↔per-bot 纯模式切换继续使用 active thread、生命周期和镜像检查，不触发屏幕变更回调。2/3/4 之间仍只调整屏池。新增单屏纯模式切换用例，覆盖无关 setup 会话不返回 409 且不调用回调。

### 验收

开工已运行 依赖准备脚本，输出 `linked 73 entries`。Vitest 按单文件串行执行；没有 systemd、Docker，也没有访问用户 live app 或数据。仓库仍缺少 `docs/verification/README.md`。

| 检查 | 结果 |
| --- | --- |
| `server/routes/config-screens.test.ts` | 7 passed |
| `server/local-vm-startup.test.ts` | 4 passed |
| `server/local-vm-screen-runtime.test.ts` | 13 passed |
| `server/routes/computers.test.ts` | 14 passed |
| `server/host/shared-vm-control.test.ts` | 101 passed |
| `scripts/testing/file-size-ratchet.test.ts` | 1 passed |
| `pnpm exec tsc -p tsconfig.server.json` | exit 0，无诊断 |
| 改动文件 `pnpm exec oxlint --deny-warnings` | exit 0 |
| `git diff --check` | exit 0 |

端口型 E2E 按要求尝试但无法在本沙箱完成：`server/local-vm-screens.e2e.test.ts` 的 12 项均在 `no free port block for offsets 0,1` 失败；`server/group-local-vm.e2e.test.ts` 的 47 项跳过，fixture 报 `listen EPERM: operation not permitted 127.0.0.1` 后 hook 超时。以 Actions 和可监听端口的主机结果为准。

`server/index.ts` 为 15397 行，低于 ratchet 上限；未修改 `IMAGE_LAYER_VERSION`、`server/vps-computer.ts` 或上限数字。

## 第 5 轮：修复挂起轮次的 this 绑定

日期：2026-11-14。在第 4 轮快照上只修复接线并补测试，未提交、暂存或推送 git。

两处调用（coordinator 的 busy 钩子和 waitsForComputer）共用新增的 `bindParkedLocalVmTurnBusy`，在该函数内以 `r => turnResources.free(r)` 传入回调，保留真实实例的 this。第 4 轮的忙碌判断保持原样。已核对 localVmScreensHost.free() 和 sharedVm.personHolds()：两者都是捕获闭包变量的箭头函数，不依赖 this，可以直接传递。

新增 `server/parked-local-vm-wiring.test.ts`，直接测试 index 使用的绑定函数。用真实 `TurnResources`、`createLocalVmScreenRuntime`、`createSharedVmControl` 和 `ComputerControl`，不替换资源 free 方法；单屏和四屏分别覆盖空闲、资源占用、人工接管、资源释放与交还。单屏释放后即使人工接管仍能解除 busy，多屏人工接管期间继续 busy。每项测试使用独立临时目录并清理，不操作用户 live app 或数据。

`scripts/public-scan/scan.node-test.mjs` 新增代码字符串 （supervisord 的 pid 文件路径）（同时覆盖裸文件名 （裸 pid 文件名））无 finding 的断言。直接调用真实 `scanDiff`，避免新增用例因 CLI 子进程启动受限而跳过；未改协调者已加入 pid 的扩展名表。

开工运行 依赖准备脚本，输出 `linked 73 entries`；Node 为 `v24.22.3`。所有测试按单文件串行执行，命令未使用 systemd。仓库仍缺少 `docs/verification/README.md`。以下为实际命令及输出摘录：

```text
$ pnpm exec vitest run server/local-vm-screen-runtime.test.ts
 Test Files  1 passed (1)
      Tests  13 passed (13)
exit 0

$ pnpm exec vitest run server/parked-local-vm-wiring.test.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
exit 0

$ node --test --test-isolation=none scripts/public-scan/scan.node-test.mjs
✔ an added line without a parseable file header fails closed
✔ code strings containing supervisor pid paths are allowed
ℹ tests 39
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 37
ℹ todo 0
exit 0

$ pnpm exec tsc -p tsconfig.server.json
exit 0（无诊断）

$ pnpm exec oxlint --deny-warnings server/index.ts server/local-vm-screen-runtime.ts server/parked-local-vm-wiring.test.ts scripts/public-scan/scan.node-test.mjs
exit 0（无诊断）

$ pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0

$ pnpm exec vitest run server/group-local-vm.e2e.test.ts
Error: Hook timed out in 30000ms.
Error: listen EPERM: operation not permitted 127.0.0.1
 Test Files  1 failed (1)
      Tests  47 skipped (47)
     Errors  1 error
exit 1

$ wc -l server/index.ts
15398 server/index.ts

$ git diff --check
exit 0
```

public-scan 的另外 37 项均由既有测试辅助函数以 `spawn blocked` 跳过，不能记为全部通过。最初的 `node --test scripts/public-scan/scan.node-test.mjs` 只显示文件级汇总，因此最终用 `--test-isolation=none` 展开用例结果；这不会访问外部应用，CLI 用例仍使用各自的临时仓库。

group-local-vm E2E 已尝试启动独立 fixture，但沙箱禁止监听 TCP，beforeAll 超时，未完成场景验证；以 Actions 或复审员在可监听端口主机上的结果为准，本轮未获取 Actions 结果。`server/index.ts` 为 15398 行，低于 ratchet 上限 15515，未改上限。

## 第 8 轮：全量 CI 失败复核（第 9 轮校正记录）

原记录遗漏了单屏 fixture 和源码抽取测试的调整，“只改四个文件”的结论撤回。第 6–8 轮代码已由协调者提交；本沙箱只有一个包含合并冲突的压平基线提交，无法取出各轮原始 diff。以下记录可从交付快照核实的修复落点，不把历史记录中的测试执行清单当作改动文件清单，也不声称能还原第 6、7、8 轮的逐提交归属。

| 文件 | 修复落点与根因 |
| --- | --- |
| `server/host/shared-vm-control.ts` | 新增 `localKey`：多屏模式下还没分到屏的机器人，控制锁退回用机器人自己的键，不再落到整台共享电脑的键上，所以未分屏的机器人之间不会互相 409；`holdKey` 不再对未分屏的机器人返回 null，统一走 `keyFor`/`localKey`，修好的是那批因拿不到锁而返回的 409；放行条件同步加上「共享桌面且多屏」时允许机器人自己的键；`armed()` 改为 `deps.multiScreen?.() === true`，避免可选依赖缺失时得到 `undefined`。屏隔离不受影响：分到屏的机器人仍用 `screenControlKey(屏号)`。 |
| `src/locales/server-lines.test.ts` | 服务端文案扫描器新增识别 `hooks.row(...)` 调用（+4 行），`server/turn-computer-wait.ts` 的排队等待提示（如 Waiting for this computer.）经 `hooks.row` 写进状态行，原扫描器不认这个入口，这些英文文案没被纳入翻译检查；新增用例覆盖了这一写法。 |
| `server/index.test.ts` | 模式切换和 idle timeout 两个单屏兼容场景显式设置 `screens: 1`，并更新配置响应期望。前者测旧共享目标到 per-bot 隔离目标的切换，后者测两种模式的 idle timeout；它们均未执行多屏认领，故使用单屏。模式切换的磁盘期望和失败清理仍有遗漏，由第 9 轮补齐。 |
| `evals/runners/local-vm-world.ts` | Local VM world 的隔离配置显式设 `screens: 1`。这些场景使用既有 `group-local-vm-hooks.mjs` 和共享 VM 资源来测懒认领、争用与排队；fixture 没有建多屏运行态，继承默认 4 屏会导致电脑挂载缺失。 |
| `server/local-vm-resume.fixture.test.ts` | 隔离配置显式设 `screens: 1`。这些用例测共享 VM 的唤醒、失败提示和恢复时序，并用 shared 容器状态模拟，不是屏池分配测试。 |
| `server/surface-pins.e2e.test.ts` | 隔离配置显式设 `screens: 1`。这些用例测任务的执行位置 pin、重启恢复和云电脑/本机 VM 切换，断言依赖旧共享 VM 资源和工作区租约，不能让默认多屏改变 fixture 的对象。 |
| `server/managed-policy.test.ts` | 从 `index.ts` 抽取 `bindTurnComputer` 的策略 guard 时，以 `await waitForComputer(` 为截断位置，并抽取 `computerPlaceRefusal`。根因是等待逻辑拆分后，旧源码边界会把无关模块内容带入动态函数，触发 `Unexpected token 'export'`。 |
| `server/turn-watchdog.test.ts` | 把从 `turn-computer-wait.ts` 导入的 `COMPUTER_WAIT_MAX_MS` 注入执行抽取代码的 VM context。根因是常量提取为模块依赖后，动态测试环境未提供该依赖。 |
| `server/index.ts` | 多屏共享容器状态响应清空容器级 `viewer_url`，同时曾强制 `status.ready = false`。后者不是必要修复，会把容器就绪状态错误地变成“未就绪”；第 9 轮撤回这一赋值，保留按屏观看。 |

旧说明中“默认 4 屏下预览不能返回 409”作废。执行规格明确规定：未分配屏的机器人查询 `/api/bots/:id/local-computer` 返回 `409 screen_not_assigned`。这不是本轮要修掉的错误，也不能列作新修复；第 9 轮未改生产路由或规格。工具权限预览用例的单屏设置及理由见下节。

第 8 轮原记录中的验证结果属于历史记录，不作为第 9 轮验收：shared-vm-control 101、computers 14、screen-runtime 13、parked wiring 2、turn-watchdog 37、managed-policy 20、server-lines 8、file-size-ratchet 1 项通过；config 253 项通过、3 项被 Node 子进程 `EPERM` 阻断；服务 fixture 受 TCP 监听限制未完成。该轮未获取 Actions 结果。本次没有把“跑过测试”改写成“修改过该测试文件”。

## 第 9 轮：语义合并与复审修改

日期：2026-11-15。开工执行 依赖准备脚本，输出 `linked 73 entries`；Node `v24.22.3`。所有 Vitest 文件逐个串行运行，没有 systemd 或 Docker。验证只使用隔离服务 fixture、临时目录和假容器运行时，没有操作用户 live app 或数据。仓库约定里引用的验证说明文档仍不存在，无法声称执行了该文档中未提供的步骤。未提交、暂存或推送 git。

### 实际改动文件及根因

| 文件 | 改了什么、为什么 |
| --- | --- |
| `server/host/secret-cards.ts` | 合并 E 的 `localVmWorkspace` 和 F 的屏访问器/错误处理导入；保留非屏目标的宿主与显示路径计算，以及 F 对屏密钥投递的归属检查。屏目标不能在访问器缺失时退回宿主投递，否则屏重分配后可能写给新占用者；因此保留 `screenUnavailable` 拒绝，移除冲突留下的无效 screen 分支。 |
| `server/pages/bundle.ts` | `BotFolders` 同时保留 `vmGuestRoot` 和 `access`。`readBotPageBundle`、`botFileSource` 优先使用显式访问器或 folders 的访问器，不先映射屏路径；无访问器时才按 `vmGuestRoot ?? VM_WORKSPACE_GUEST` 映射。修复两边接口能力互相覆盖的问题，并保留 F 的 VM 宿主目录排除参数。 |
| `server/routes/app-hosting.ts` | 合并两字段和访问器优先级；publish/status/delete 的 `path`、`project` 都只有在无访问器时才作宿主映射。访问器和 `vmWorkspace` 继续传给 publisher，避免以宿主身份处理屏文件。 |
| `server/routes/published-pages.ts` | 发布和按路径撤销均保留 `vmGuestRoot` 映射回退，同时让访问器优先处理原始路径。若发布和撤销走不同映射，会无法识别同一个来源。 |
| `server/routes/published-pages.test.ts` | 合并测试辅助函数的两个字段，保留 E 的宿主映射测试与 F 的发布、刷新、撤销及屏重分配测试；增加真实屏根/用户工作区别名的发布和撤销覆盖，访问器场景同时提供 `vmGuestRoot`，防止合并后错误优先映射。 |
| `server/pages/bundle.test.ts` | 增加无访问器时的旧默认根、屏根和用户别名映射用例；显式/随 folders 提供访问器时，用真实隔离屏文件 fixture 验证打包和 extract 来源均经访问器解析，防止只保留一边能力。 |
| `server/routes/app-hosting.test.ts` | 补无访问器时 path/project 的屏根映射回归；加强访问器用例，同时传屏工作区别名、`vmGuestRoot` 和 project，检查 publish/status/delete 都原样转交。 |
| `server/index.test.ts` | 模式切换用例的磁盘配置期望补 `screens: 1`；配置恢复放进 `finally`，从第一次修改屏数起保护。根因是 screens 会随 per-bot 配置持久化，而旧断言失败会阻止末尾恢复，污染后续 idle timeout 用例。 |
| `server/tool-scope.e2e.test.ts` | 只在 corrupt persisted selection 的 preview 分支，通过隔离 API 显式设置并断言 `screens: 1` 成功。此处验证损坏的工具权限配置不妨碍预览及 thread 校验，机器人没有认领屏；单屏避免触发与该用例目的无关、且符合规格的 `screen_not_assigned`。该 fixture 每个参数场景独立启动并在 finally 关闭。 |
| `server/index.ts` | 撤回共享多屏容器状态中的 `status.ready = false`；继续清空容器级观看地址。根因是容器就绪状态被错误覆盖，设置页会一直显示未就绪、步骤 4 不完成。 |
| `docs/tasks/T-1200/T-1228-wiring/report.md` | 校正第 8 轮记录、逐处解释单屏 fixture 设置，追加本轮文件清单和实际验证结果。 |
| `docs/tasks/T-1200/T-1228-wiring/round9-verification.txt` | 保存本轮逐文件测试和静态检查的命令、完整输出、退出码，供协调者复跑比对。 |

核实 F 的现有访问器：`screenFilePath()` 只把当前屏的 `/home/crybot-sN/workspace` 转换为该屏的规范根；其他屏别名和越界路径被拒绝。现有 screen-files 别名测试、本轮 bundle 的访问器测试均通过。没有修改 `server/screen-files.ts`。

### 本轮验收输出

完整输出见 [round9-verification.txt](round9-verification.txt)。以下每个文件实际单独执行 `pnpm exec vitest run <文件>`：

| 文件 | 实际输出摘要 | 退出码 |
| --- | --- | ---: |
| `server/index.test.ts` | `Test Files 1 failed; Tests 338 skipped; Errors 1 error`；`listen EPERM: operation not permitted 127.0.0.1`，beforeAll 30 秒超时 | 1 |
| `server/tool-scope.e2e.test.ts` | `Test Files 1 failed; Tests 9 failed`；全部在 fixture 的 `no free port block for offsets 0,1 in 19600..22600` 阻断 | 1 |
| `server/host/secret-cards.test.ts` | `Test Files 1 passed; Tests 51 passed` | 0 |
| `server/pages/bundle.test.ts` | `Test Files 1 passed; Tests 13 passed` | 0 |
| `server/routes/app-hosting.test.ts` | `Test Files 1 passed; Tests 9 passed` | 0 |
| `server/routes/published-pages.test.ts` | `Test Files 1 passed; Tests 14 passed` | 0 |
| `server/screen-files.test.ts` | `Test Files 1 passed; Tests 13 passed, 1 skipped` | 0 |
| `server/parked-local-vm-wiring.test.ts` | `Test Files 1 passed; Tests 2 passed` | 0 |
| `server/local-vm-screen-runtime.test.ts` | `Test Files 1 passed; Tests 13 passed` | 0 |
| `scripts/testing/file-size-ratchet.test.ts` | `Test Files 1 passed; Tests 1 passed` | 0 |
| `scripts/testing/lazy-server-modules.test.ts` | `Test Files 1 failed; Tests 1 failed`；`spawnSync git EPERM`，未执行到模块导入断言 | 1 |
| `server/local-vm-screens.e2e.test.ts` | `Test Files 1 failed; Tests 12 failed`；全部在 `no free port block for offsets 0,1` 阻断 | 1 |
| `server/cloud-lending-browser.e2e.test.ts` | `Test Files 1 failed; Tests 10 skipped`；beforeAll 在 `no free port block for offsets 0,1` 阻断 | 1 |

8 个文件完成运行，116 项通过；screen-files 的 1 项既有 UID 隔离测试因当前非 root 而跳过（需要 Linux root 执行 setpriv），不是本轮新增跳过。四个端口型测试文件未完成行为验收，lazy-server-modules 未完成断言，均须在主机或 Actions 复跑；本轮未获取 Actions 结果，不能据此确认整服务无回归。真实 Docker/UID 权限隔离也不能由假运行时测试代替。

```text
$ pnpm exec tsc -p tsconfig.server.json
exit 0（无诊断）

$ pnpm exec oxlint --deny-warnings server/host/secret-cards.ts server/index.test.ts server/index.ts server/pages/bundle.test.ts server/pages/bundle.ts server/routes/app-hosting.test.ts server/routes/app-hosting.ts server/routes/published-pages.test.ts server/routes/published-pages.ts server/tool-scope.e2e.test.ts
exit 0（无诊断）

$ git diff --check
exit 0

$ wc -l server/index.ts
15406 server/index.ts
```

补充只读检查：在 shell 中先运行 `git ls-files server shared`，再由 Node 读取文件并使用 lazy-server-modules 测试的同一导入正则，扫描 1549 个非测试 TS 文件，结果 `staticImports: []`。这仅补充静态证据，不将被 EPERM 阻断的原测试记为通过。

全工作区扫描没有合并冲突块；第三方许可证中的既有等号分隔线不属于冲突标记，未改许可证。未修改 ratchet 上限。
