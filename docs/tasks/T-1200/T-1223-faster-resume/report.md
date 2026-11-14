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
