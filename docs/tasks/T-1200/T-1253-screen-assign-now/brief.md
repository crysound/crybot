## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1253 共用电脑：未分配屏幕时可一键分配

## 背景
共用电脑（服务器上的 Local VM，多屏模式）最多 4 块虚拟屏。屏幕只在智能体开始跑任务时由 `server/local-vm-screens.ts` 的 `LocalVmScreenPool.request()` / `waitFor()` 分配，闲置后收回。用户在桌面面板打开一个当前没跑任务的智能体，会看到 `vm.screens.unassignedBot` 提示「这个智能体目前没有分配屏幕，下次运行时会自动分配。」，只能等着，什么也做不了。出现这条提示的地方：`src/components/remote-desktop-panel.tsx` 约 212、241 行；`src/lib/local-vm-screen-state.ts` 约 65 行；`server/routes/computers.ts` 约 384、456、480 行的 409 `screen_not_assigned`。

## 要做
1. 服务端新增一个接口（放在现有 local-computer 路由旁边，权限和现有查看/加入接口一致）：替当前智能体申请一块屏幕。
   - 有空屏，或能收回别人的闲置屏，就立即分配，返回屏幕号。
   - 4 块都忙，就进入现有排队（复用 pool 的排队机制，不另造），返回排队位置。
   - 用户主动申请的屏幕同样按现有闲置规则到时收回。不能抢正在跑任务的屏幕，也不能改变已有智能体的分配。
2. 前端：所有显示「未分配屏幕」的地方，在提示下面加一个按钮「现在分配屏幕」（英文 Assign a screen now）。
   - 点了以后调用上面的接口。
   - 拿到屏幕就接着走原来的打开桌面流程。
   - 在排队时显示现有的排队文案 `vm.screens.queued`（第几位），并轮询状态，轮到后自动打开。
   - 提示文案改为「这个智能体目前没有分配屏幕。」，后半句去掉，改由按钮说明。
   - zh/en 都要改，不出现 Boat 字样。
3. 单屏模式或没开多屏时，行为和现在完全一致。

## 不要动
`server/instabox/`、`server/cloud-backend.ts`、`CloudBackendPicker.tsx`、`AccessSection.tsx`、快照相关文件（这些另一个分支正在改）。改动尽量集中在屏幕池、computers 路由、remote-desktop-panel 和 local-vm-screen-state 这几处。

## 验收
- 补隔离测试，覆盖以下情况：
  - 有空屏时立即分配；
  - 屏满时进入排队并返回位置；
  - 不抢正在跑任务的屏幕；
  - 非多屏模式下行为不变；
  - 前端按钮点击后的流程（组件测试）。
- 改动涉及的测试文件逐个跑过，包括 `server/local-vm-screens*.test.ts`、`server/routes/computers.test.ts`、相关前端测试，以及 `scripts/testing/file-size-ratchet.test.ts`。
- `pnpm exec tsc -p tsconfig.server.json` 和前端 tsc 都要通过；改动过的文件跑 `oxlint --deny-warnings`。
- 写 report.md（短）和 verification.txt。verification.txt 里不写 IP、地址、域名、uuid。
