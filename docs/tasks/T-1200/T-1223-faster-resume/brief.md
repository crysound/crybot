# T-1223 智能体恢复提速：云电脑休眠时不阻塞聊天，状态检查加短缓存

## 背景（实测，北京时间 11-14）
共用云电脑（`localVm.mode=shared`）闲置 10 分钟会被 `server/computer-idle.ts` 停掉。之后用户再发消息：
- `server/index.ts` 约 8259 行 `attachLocalVm(false)` 走非懒加载分支，同步 `await claimAutoLocalVm(threadId)`（约 8180 行），要等容器启动、桌面就绪后才启动引擎。**纯聊天也要等**，实测每次多约 6.5 秒（发消息到 turn.started 8.2–8.6 秒）。
- 每一轮都会先 `containerComputerStatus`（约 8134/8138 行），对容器执行约 5 次 podman exec（`server/container-computer.ts` 612-655 行），热状态下每轮固定多 1.7–2.1 秒。

## 要做的
1. **休眠的云电脑改为后台唤醒 + 懒加载。** 非 strict（自动挂电脑）路径下，容器存在但未就绪/已停止时：
   - 立即在后台开始唤醒（不 await），本轮引擎照常马上启动；
   - 电脑工具按现有 `lazy: true` 的方式登记，第一次真正用到电脑工具时再等它就绪；
   - 唤醒失败时，按现有 `surfaceLazyClaimRejection` / `skipComputer` 的方式告诉用户，不能让本轮卡死或静默丢失；
   - 唤醒期间若发生休眠计时、镜像更新、模式切换、生命周期锁（`localVmLifecycleBusy` 等），行为与现在一致，不能出现两次并发启动同一容器；租约/归属（resourceOwner、autoVmClaims）语义不变。
   - strict 路径（用户明确要用电脑）保持现状。
2. **状态检查加短缓存。** `containerComputerStatus` 的结果按 target 缓存约 5 秒；容器启动、停止、休眠、更新、模式切换等生命周期事件发生时立即失效。同一轮内和相邻轮次（5 秒内）不重复执行 podman exec。截图类数据如果不是本轮决策需要的，不要放在每轮必经的检查里。
3. **前端提示。** 第一次用电脑工具而需要等唤醒时，运行活动区显示「正在唤醒电脑…」（中英文文案走现有 i18n，英文 "Waking the computer…"）；如果已有相近的运行状态事件就复用，不新增协议字段则更好。

## 不在本轮
- 不改休眠时长默认值和 config.json。
- 不改模型网关、缓存保活。
- 不改 `electron/`、`mobile/`、`.github/`。

## 验收（写成仓库内可重复执行的测试）
- 新增/修改服务端测试：模拟容器启动耗时 5 秒的已休眠云电脑，纯聊天一轮的 turn.started 不受唤醒耗时影响（断言 < 1 秒，用假定时器或注入的慢启动桩）；随后该轮第一次调用电脑工具时会等到就绪并成功。
- 唤醒失败：用户能看到原因，本轮正常结束。
- 5 秒内连续两轮只执行一次状态检查；生命周期事件后缓存失效。
- 前端文案组件测试。

## 验证
一次只跑一个文件：
`PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner`
跑新增/改动的测试文件，以及 `server/container-computer` 和 `computer-idle` 相关的现有测试。不要跑 `pnpm typecheck`、完整 `pnpm test`、e2e。

## 约束
- 不要 git 提交；沙箱禁网，不加新依赖。
- 仓库是公开的：代码、测试、注释里不能出现内部域名、IP、邮箱、人名、密钥、真实实例 ID。

## 汇报
写 `report.md`（中文）：怎么改的、改了哪些文件、测试结果、哪里没把握（尤其竞态）。
