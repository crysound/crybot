# T-1223 智能体恢复提速

实现已完成；本次没有 git 提交。214 个测试用例通过，但隔离服务器验收未能执行成功，不能据此声称真实聊天的 `turn.started < 1 秒` 已通过。

## 改动

非 strict 自动挂载路径遇到已存在、可安全恢复的停止中或未就绪云电脑时，先登记 `lazy: true` 的 `autoVmClaims`，立即启动后台 claim，不再等待启动完成才派发聊天。已就绪的懒 claim、容器不存在时的创建流程、用户明确指定电脑的 strict 流程保留原来的挂载时机。

后台任务和首次工具调用共用同一个 claim promise。首次调用确实需要等待时，写入现有 activity notice，并通过 `nameCode` 显示「正在唤醒电脑…」/ “Waking the computer…”，不增加共享事件协议字段。唤醒错误保留实际原因，走现有 `surfaceLazyClaimRejection` 和中断收尾逻辑。该回调仍按 generation 隔离，旧轮次迟到的结果不能终止新轮次；实际唤醒错误若在原轮次结束后到达，会作为带原 turnId 的历史 notice 留下原因。

启动与桌面就绪轮询提取到 `local-vm-ready.ts`。生命周期锁现在覆盖整个等待过程；失败时也释放锁、启动 idle backstop。claim 在关键 await 前后检查当前轮次，取消后不继续领取、绑定预览或自动 pin；旧任务释放租约时仍按目标对象身份及 resource owner 判断。

`containerComputerStatus` 按 runner、平台、target 和探测深度缓存 5 秒，并合并正在进行的相同探测。启动、停止、删除、创建和拉取镜像在开始及结束时使缓存失效，失败也失效；镜像更新与模式切换清除全部缓存。失效代次阻止旧探测结果再次被复用。生命周期操作和桌面启动轮询使用新探测，不被 5 秒缓存拖慢。

常规状态检查保留版本、daemon status、health report，移除准备截图及 base64 读取，正常路径的容器内探测由 5 次减少为 3 次。实际截图仍检查图片完整性，并在失败时清除状态缓存。截图和普通查询共用新的短缓存。

还修复了单纯后台启动不能解决的 MCP 握手问题：原桥接器初始化就会执行容器命令。休眠轮次改用目录式 MCP，立即提供 `search_tools`、`describe_tool`、`call_tool`，在第一次检索或调用电脑工具时才等 gate、连接真正的 CUA MCP 并获取实际 schema。已就绪和 strict 路径继续使用原桥接器。目录调用保留工具范围限制、输入校验、执行前再次检查归属、错误结果只保留文本等处理；CLI gate 与 Chat MCP 都按内部工具名执行权限判断。

## 文件

- 服务端挂载、缓存及生命周期：`server/index.ts`、`server/auto-vm-claims.ts`、`server/container-computer.ts`、`server/local-vm-box.ts`、新增 `server/local-vm-ready.ts`。
- 延迟 MCP 和权限：`server/container-mcp.ts`、新增 `server/lazy-container-mcp.ts`、`server/mcp-gate-config.ts`、`server/drivers/chat-mcp-tools.ts`。
- 前端翻译：`src/lib/live-activity.ts`、`src/locales/en.json`、`src/locales/zh.json`。
- 测试：`server/container-computer.test.ts`、`server/container-mcp.test.ts`、`server/mcp-gate-config.test.ts`、新增 `server/local-vm-ready.test.ts`、`server/lazy-container-mcp.test.ts`、`server/drivers/chat-mcp-lazy-container.test.ts`、`server/local-vm-resume.fixture.test.ts`，以及 `src/lib/live-activity.test.ts`、`src/components/ToolActivity.notice.test.ts`。
- 隔离慢启动桩：新增 `server/testing/local-vm-resume-hooks.mjs`，复用既有容器 fixture，注入 5 秒启动、启动失败和真实 driver 事件记录。

没有修改 `electron/`、`mobile/`、`.github/`、config.json 或休眠默认时长；没有增加依赖或联网。为运行测试，将本 worktree 的 `node_modules` 链接到了主仓库已有依赖目录，没有修改依赖清单。

## 测试结果

每次只运行一个文件，均使用以下命令形式，没有运行 typecheck、完整测试集或 `.e2e` 文件：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner
```

| 文件 | 结果 |
| --- | --- |
| `server/container-computer.test.ts` | 115 通过 |
| `server/computer-idle.test.ts` | 20 通过 |
| `server/local-vm-ready.test.ts` | 5 通过 |
| `server/lazy-container-mcp.test.ts` | 5 通过 |
| `server/local-vm-box.test.ts` | 4 通过 |
| `server/auto-vm-claims.test.ts` | 17 通过 |
| `server/mcp-gate-config.test.ts` | 15 通过 |
| `src/lib/live-activity.test.ts` | 26 通过 |
| `src/components/ToolActivity.notice.test.ts` | 7 通过 |
| `server/local-vm-resume.fixture.test.ts` | beforeAll 无法取得可监听端口，5 个用例未执行 |
| `server/container-mcp.test.ts` | 4 个进程用例失败，子进程退出但没有输出，包括原有 3 个用例 |
| `server/drivers/chat-mcp-lazy-container.test.ts` | 1 个进程用例失败，MCP 子进程在握手前退出 |

独立诊断确认本地监听返回 `EPERM`，Node 同步子进程启动也返回 `EPERM`；异步 Node 子进程出现无输出退出。没有申请提权、放宽沙箱或连接用户的应用。另通过临时目录中的独立 MCP 进程检查确认：休眠模式的 initialize / tools/list 能正常回答，且不会启动假容器运行时。这项检查不替代完整服务器验收。

通过的假时钟测试覆盖了 5 秒慢启动、MCP 初始化不等待、首次工具调用等待后成功、失败不连接容器、只启动一次、启动期间不触发 idle stop、取消后不再轮询、归属变化拒绝执行。缓存测试覆盖 5 秒边界、并发请求合并、target/探测深度隔离、生命周期成功与失败失效、失效后旧探测晚到、fresh 探测更新缓存；中英文组件与运行提示测试通过。`git diff --check` 通过。

## 尚未确认及竞态边界

1. 完整隔离服务器用例需要在允许本地监听及 Node 子进程工作的环境中重跑。该文件实际断言发送到 `turn.started < 1000ms`、首次 gate 等待、失败原因可见且轮次结束、strict 同步等待，以及聊天结束后的生命周期锁。当前不能宣称这些服务器级断言已通过。
2. 没有使用真实 Podman/CUA 或真实模型进行计时。目录式 MCP 的初始化已有独立进程检查，但各真实引擎的工具发现、权限卡和首次工具执行仍需实际环境验证。
3. 取消不能撤回已经交给容器运行时的启动命令。因此启动仍可能完成；锁会保留到命令结束，随后旧轮次不再附加预览或 pin，idle backstop 负责后续休眠。该机制的局部测试通过，跨 HTTP 生命周期请求的完整竞态仍待 fixture 验证。
4. 为保护新轮次，迟到的真实唤醒错误只追加原 turnId 的历史 notice，不通知失败、不中断当前轮次；取消本身不显示唤醒失败。已新增“旧轮失败不打断新聊天”的服务器 fixture 用例，但受监听限制尚未执行。
5. 绕过本服务直接操作容器时没有服务内生命周期通知，状态最多可能保留 5 秒。实际截图失败会提前使缓存失效；电脑工具仍经过归属 gate。常规 ready 判定现在依赖 driver health，不再预先验证截图传输，截图完整性在真正取图时验证。
6. 当前检出缺少 AGENTS.md 引用的 `docs/verification/README.md`。使用了仓库现有的隔离 HOME、数据目录、假 CLI 和容器边界 fixture 方式，未接触用户实时数据；完整服务器 fixture 因上述权限限制未能启动。

## 第 2 轮

本轮基于第 1 轮继续修改，没有 git 提交。以下记录替代第 1 轮中“后台失败中断聊天”和“生命周期锁覆盖整个桌面轮询”的描述。

### 必改项

1. **后台失败不打断聊天。** 新增 `server/local-vm-resume.ts`，把等待 notice、后台失败 notice、迟到失败 notice 和目标级 60 秒失败冷却集中处理。`auto-vm-claims.ts` 继续把失败 slot 留在表中，后续电脑调用保持 fail-closed；Local VM 后台唤醒的网络错误也按失败处理，不进入通用 claim 的静默网络重试。`computer-call-gate.ts` 只在实际动作等待 claim 的期间登记 waiter，取消和等待结束都会撤销。只有活跃轮次确有动作在等时，才调用原来的 `surfaceLazyClaimRejection`；纯聊天失败只留带原因的 notice，不通知 turn-failed、不上报 could-not-start、不 interrupt。冷却期间再次挂载会登记失败 slot 并立即给 notice，不重新启动或重复等待坏桌面 90 秒。`local-vm-resume.fixture.test.ts` 第二例现要求先看到失败原因、聊天仍 busy，再写 finishFile 正常完成到 idle，且没有 turn-failed 或事故；还验证下一轮不会再次启动。

2. **首次调用等待超过 5 秒仍可执行。** 将实际 gate 提取到 `server/computer-call-gate.ts`，只扣除本轮自己的 Local VM 唤醒 claim 成功所花的等待时间，仍保留其他轮次占用造成的 CONTROL_WAITED、人控交还拒绝、能力失效与取消检查。目录查询通过 `readinessOnly` 等待就绪，不进入屏幕动作检查或动作 journal。`computer-call-gate.test.ts` 使用真实 gate 和 lazy MCP，在假时钟推进 7 秒后同时断言 held:false 和底层 click 已执行；完整 fixture 的首例也改成 7 秒。取消后到达的失败只提示、不报告，以及动作仍在等待时走拒绝路径，也有回归测试。

3. **Claude 动作名称和截图识别。** 新增 `server/computer-tool-title.ts`，用现有 `directoryCallTarget` 解开 `mcp__computer__call_tool`。Claude 在裁剪 input 前从原始 tool_use input 生成内层动作标题；`index.ts` 的活动标题和 `screen-frame-gate.ts` 的 touched/surface 判定也复用此解析。`screen-frame-gate.test.ts` 覆盖 Claude 名形态的 click、screenshot、browser_click、type_text 标题、touched 和 computer surface，同时排除目录查询与 computer_exec。这样原有 poller.touched、screenIsTheWork 和最终截图选择能识别懒唤醒轮中的动作。

4. **行数棘轮。** `StatusEntry`、缓存、失效代次和 changingTargets 已搬到 `server/container-status-cache.ts`，原模块保留公开函数入口。gate、等待及迟到 notice 抽出后，文件行数（main → 完工）为：
   - `server/index.ts`：**15562 → 15523**，按本轮审核指定的 main 基线计算。当前本地 `main` 引用实测为 15564 行；完工行数也低于较严格的 15562 要求。
   - `server/container-computer.ts`：**1175 → 1172**。
   - 没有提高 ratchet 上限；新增模块均不足 200 行，`server/drivers/claude.ts` 保持 2087 行。

### 建议项（均已处理）

1. `lazy-container-mcp.ts` 的连接或 tools/list 失败后清掉共享 connection promise，已经打开的失败连接会关闭；测试验证下一次调用重新连接成功。
2. stdin 请求不再整条串行排队，ping 可以立即回答；`notifications/cancelled` 按 requestId 取消正在等待的请求，AbortSignal 经 `computer-control-client.ts` 传到 HTTP gate。共享唤醒和其他请求不会被一条调用的取消撤掉。新增直接请求测试及 PassThrough stdin 测试，验证先收到 ping、随后取消响应，且取消后没有连接容器或执行动作。
3. `local-vm-ready.ts` 的生命周期锁只覆盖状态准备、机器启动和容器启动，桌面轮询放在锁外；目标级 pending promise 合并重复 readiness 请求。测试覆盖启动只执行一次、轮询时锁已释放，以及轮询期间容器停止后不再启动。已有租约/活跃轮次保护仍可能拒绝用户停止或删除，需先停止正在用电脑的轮次；本轮消除了额外持有最长 90 秒启动锁的行为，没有放宽正在使用中的电脑保护。
4. 下一轮 attach 遇到上一轮自己的 readiness 尚未结束时，仍登记懒 claim，并等待 pending wake 结束后重新检查本轮归属；不会因该启动锁而静默返回 false。新增隔离 fixture 覆盖快聊天结束后下一轮拿到 lazy MCP、第一次 gate 成功且仅一次 start。
5. `ownsLiveTurn` 补回 `!companyShutdown`。
6. 增加 `chat.notice.computerWakeFailed`、`chat.notice.previousComputerWakeFailed`，提供 en 和 zh-CN 对应的 `zh.json` 文案，其余语言按现有机制回退英文。迟到提示保留原 request 对象，等 turn.started 填入 turnId 后读取，写入原轮次；失败 notice 不作为 `turnNowPhrases` 当前状态行。组件测试覆盖英文、中文及英文回退，并断言原因可见。
7. fixture 的假容器探测接入真实 `cachedContainerStatus`，在边界上记录 statusProbes。新增用例实际发起两次 beginTurn，断言两次 turn.started 在 5 秒内、statusProbes 恰好为 1；生命周期 action 使用真实缓存失效入口。

### 验证结果

所有 Vitest 调用均逐文件、单 worker 执行，使用指定的 Node 24、2048 MB 内存及 `--configLoader runner`，没有运行完整 pnpm test 或 e2e。隔离 fixture 使用临时 HOME、数据目录、假容器和假 Claude，不接触用户应用或数据。当前检出仍缺少 `docs/verification/README.md`，已采用仓库现有的隔离 fixture 方式。

逐文件验证结果如下；每个 Vitest 命令均使用 Node 24、单 worker 和 `--configLoader runner`。

| 文件 | 结果 |
| --- | --- |
| `server/container-computer.test.ts` | 115 通过 |
| `server/lazy-container-mcp.test.ts` | 11 通过 |
| `server/local-vm-ready.test.ts` | 6 通过 |
| `server/local-vm-resume.test.ts` | 5 通过 |
| `server/computer-call-gate.test.ts` | 7 通过 |
| `server/screen-frame-gate.test.ts` | 83 通过 |
| `server/computer-idle.test.ts` | 20 通过 |
| `src/components/ToolActivity.notice.test.ts` | 10 通过 |
| `src/lib/live-activity.test.ts` | 28 通过 |
| `src/locales/native-keys.test.ts` | 3 通过 |
| `server/local-vm-resume.fixture.test.ts` | 沙箱无可监听端口，beforeAll 失败，7 个用例未执行 |
| `server/container-mcp.test.ts` | 4 个子进程用例失败；沙箱启动子进程后无 stdout，无法验证其 MCP 断言 |
| `server/drivers/chat-mcp-lazy-container.test.ts` | 1 个子进程用例失败；MCP 子进程在握手前退出 |
| `server/computer-control-client.test.ts` | 20 通过，2 个监听用例因 `EPERM listen 127.0.0.1` 超时 |
| `server/routes/desktop-viewer.test.ts` | 沙箱中无法完成监听型测试，已中止等待 |
| `scripts/testing/file-size-ratchet.test.ts` | 沙箱 `spawnSync git` 返回 `EPERM`；未执行行数断言 |

独立单元测试覆盖了 7 秒唤醒后首次动作、纯聊天失败收尾、60 秒失败冷却、取消、MCP 连接重试、ping 并行响应、Claude 内层动作标题和截图触达判断。上述监听及子进程失败均未改测试绕过；需在允许本地监听和 Node 子进程的环境中重跑。`git diff --check` 通过。

类型检查通过：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc -p tsconfig.server.json --noEmit
```

### 提示缓存与待真实环境核对

没有修改 `server/cache-keepwarm.ts`。懒唤醒轮暴露 3 个目录工具，而普通轮暴露完整电脑工具，tools 前缀变化可能让 Claude 提示缓存无法命中，增加输入 token 费用及首 token 延迟；需协调者在真实环境比较两种轮次的 cache_read。当前结果不证明真实 Podman/CUA 的端到端唤醒时间、完整 Claude 最终截图帧或真实提示缓存命中率。

启动命令已经交给容器运行时后无法撤回；取消或聊天提前完成时，仍等命令结束再释放启动锁，随后按 generation/lease 检查阻止旧轮次绑定预览。桌面轮询已不持有该锁。完整 HTTP fixture 仍需要在允许本地监听和 Node 子进程的环境中复跑。

## 第 3 轮

本轮沿用原 worktree，仅修改下面 4 项涉及的实现、测试和本报告；没有 git 提交、联网或新增依赖。以上两轮记录保留，本节替代第二轮中“Local VM 后台网络失败立即终止、不重试”和“所有 claim 失败进入冷却”的行为描述。

### 逐项修复及测试

1. **目录查询等待时也提示唤醒。** `server/computer-call-gate.ts` 的 `onWaiting` 不再受 `readinessOnly` 限制，调用后仍清空回调，所以同一个 slot 只提示一次。目录查询继续跳过人控占用、资源 claim、ACT_WITHIN 和动作 journal，也不登记动作 waiter。`server/computer-call-gate.test.ts` 使用真实 lazy MCP、真实 gate 和 notice 回调：两个并发 `search_tools` 等待 7 秒，等待期间恰好一个 `chat.notice.wakingComputer`，随后 `call_tool` 真正执行 click，提示不重复。原人控目录查询测试同时检查提示和不领取资源。`server/local-vm-resume.fixture.test.ts` 首例改为先通过 HTTP `readinessOnly=1` 等待、再执行动作 gate，并检查聊天启动时间及提示次数；受沙箱监听限制，该 fixture 本轮尚未验证成功。

2. **缩小冷却范围，并由生命周期事件清除。** `server/local-vm-resume.ts` 用 `LocalVmWakeError` 标记真实唤醒故障；`server/local-vm-ready.ts` 仅在启动机器、启动容器、桌面就绪探测异常或桌面就绪超时时产生该错误。错误保留原 message 和 cause。生命周期占用、资源/租约冲突以及绑定失败等普通 claim 错误仍按原 notice/reject 路径显示，但不进入 60 秒冷却；网络错误也不进入冷却。未就绪但因取消、生命周期停止、容量/创建条件等提前返回的状态不会被包装成唤醒故障。`server/container-status-cache.ts` 的 `invalidateContainerComputerStatus` 同时清除对应 target 的冷却，无 target 时清除全部，覆盖既有手动启动、停止、镜像更新及模式切换的失效入口。`server/local-vm-resume.test.ts` 覆盖临时 claim 错误、readiness 内生命周期占用、目标级/全局失效后下一轮重新 claim、无关目标冷却保留、60 秒到期，以及机器启动/桌面探测/桌面超时故障确实进入冷却。

3. **合并 readiness 后使用仍活跃调用方的轮次状态。** `server/local-vm-ready.ts` 等待已有 promise 后，若返回未就绪而当前调用方仍活跃，则使用该调用方自己的依赖重新走 readiness；成功结果和已结束调用方直接返回。重新准备仍经目标级 pending 合并及生命周期锁，不并发启动。`server/local-vm-ready.test.ts` 新增两个调用方的测试：第一个启动容器后结束，第二个仍活跃；第一个收到未就绪状态，第二个继续轮询直至 ready，容器启动总次数为 1，不落入 not-ready claim 失败路径。

4. **恢复 Local VM 后台网络重试。** `server/auto-vm-claims.ts` 移除对 `localVm && startsComputer` 的例外，沿用原来的行为：暂时性网络失败清除 begin、设置 retryReason，后续调用重试，总计最多 3 次；不是主动定时后台重试。`server/auto-vm-claims.test.ts` 将已有重试成功、次数上限测试扩展到 Local VM 后台唤醒。`server/local-vm-resume.test.ts` 同时验证首次网络失败不发失败 notice、不写冷却，后续可成功；实际启动错误经 cause 包装后仍可识别网络故障，耗尽 3 次后只发一次失败 notice，仍不进入冷却。

本轮实现文件：`computer-call-gate.ts`、`local-vm-ready.ts`、`local-vm-resume.ts`、`container-status-cache.ts`、`auto-vm-claims.ts`。测试改动仅在 `computer-call-gate.test.ts`、`local-vm-ready.test.ts`、`local-vm-resume.test.ts`、`auto-vm-claims.test.ts`、`local-vm-resume.fixture.test.ts`，均位于 `server/`。

### 先红后绿记录

先补测试，在修改实现之前逐文件运行，实际得到以下失败输出（只摘录关键断言；不是推测）：

| 命令中的文件 | 改前结果 | 关键失败输出 |
| --- | --- | --- |
| `server/computer-call-gate.test.ts` | 2 failed / 6 passed | 人控目录查询：`expected "vi.fn()" to be called once, but got 0 times`；search_tools → call_tool：`expected [] to deeply equal [ [ ObjectContaining{…}, false ] ]`，收到的提示列表为空 |
| `server/local-vm-resume.test.ts` | 6 failed / 4 passed | 临时占用/租约失败：`expected 'this Local VM is being started, stopp…' to be undefined` 等；生命周期失效后下一轮：`expected "vi.fn()" to be called once, but got 0 times`；网络失败：`expected undefined to be 'runtime disconnected'` |
| `server/local-vm-ready.test.ts` | 1 failed / 6 passed | 第二调用方期望 `ready: true`，实际 `ready: false` |
| `server/auto-vm-claims.test.ts` | 2 failed / 17 passed | Local VM 网络失败的 `retryReason` 为 undefined，begin 仍是 Promise；重试上限测试：`expected "vi.fn()" to be called 3 times, but got 1 times` |

红、绿阶段均使用以下命令形式，每次只跑一个文件，严格采用本轮要求的 `--maxWorkers=2`：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <上表或下表文件> --maxWorkers=2 --configLoader runner
```

红阶段完整输出保存在本次环境 `/tmp/T-1223-r3-red-{gate,resume,ready,claims}.log`。修复后另外补充了 5 个故障分类/网络 cause 的测试，因此最终 resume 单测数为 15。

### 最终验证

| 文件 | 本轮最终结果 |
| --- | --- |
| `server/local-vm-resume.fixture.test.ts` | beforeAll 失败，7 skipped；`Error: no free port block for offsets 0,1 in 19600..22600` |
| `server/computer-call-gate.test.ts` | 8 passed |
| `server/lazy-container-mcp.test.ts` | 11 passed |
| `server/local-vm-ready.test.ts` | 7 passed |
| `server/local-vm-resume.test.ts` | 15 passed |
| `server/auto-vm-claims.test.ts` | 19 passed |
| `server/screen-frame-gate.test.ts` | 83 passed |
| `server/container-computer.test.ts` | 115 passed；补查状态缓存/生命周期失效 |
| `server/computer-idle.test.ts` | 20 passed；补查原任务要求的 idle 行为 |

共 **278 个单测通过**。隔离 fixture 使用临时 HOME、数据目录、假 CLI 与假容器，已尝试启动，但未能取得端口。独立执行 `net.createServer().listen(0, "127.0.0.1")` 也返回 `EPERM listen EPERM: operation not permitted 127.0.0.1`。未修改测试绕过权限限制，未访问用户 live app 或数据；需要协调者在沙箱外重跑上表 fixture，不能把这 7 例写成通过。

Server tsc **通过（exit 0，无诊断）**：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc -p tsconfig.server.json --noEmit
```

执行前检查本轮 service cgroup：`memory.max=5368709120`（5 GiB），`memory.current=189009920`（约 180 MiB），系统 available 约 7070 MiB；确认无测试任务在跑后才单独运行 tsc，堆上限 3072 MiB。没有运行完整 pnpm test、pnpm typecheck 或 e2e。

行数（**本轮起点 → 完工**）：`server/index.ts` **15523 → 15523**，与本轮开始保存的文件逐字节相同。本轮未新增文件；本轮涉及的实现和测试文件最大 221 行，任务此前新增的文件也均不足 1000 行。`git diff --check` 通过。

当前检出及可读主仓库均缺少用户引用的 `r2.md` 和 AGENTS.md 引用的 `docs/verification/README.md`，已读取 `brief.md`、本轮要求和本报告保留的第二轮内容，并沿用已有隔离 fixture。验证限制仍是上述端口权限；本轮不声称真实 Podman/CUA 或完整服务器 fixture 已通过。
