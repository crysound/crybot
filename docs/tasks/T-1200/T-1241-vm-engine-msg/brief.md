## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# 屏幕页「无法使用私有桌面」误报：区分引擎不可用与模型不支持

## 背景
开启隔离盒子（CRYBOT_BOT_BOX=on）后，服务端不再运行 HOME 下的程序（server/bot-box/program-trust.ts:29-41，server/procs.ts:204-216）。claude 装在 HOME 下时，`claude --version` 报 ENOENT，实例被判为 unavailable，reason 写的是「`claude` CLI not found」（server/procs.ts:357-359，server/drivers/claude.ts:1908-1911）。屏幕页 src/components/ComputerPanel.tsx:345-348 只要 state 不是 available 就报 `computer.err.vmEngine`（:397-401），用户看到的是「该模型无法使用私有桌面，请选择支持的模型，例如 Claude」，而当时选的就是 Claude，所以这条提示是错的。

## 要做
1. ComputerPanel：只有 `capabilities.computerMcp` 为假时才报 vmEngine。实例存在但 state 不是 available 时，新增一条提示：「引擎当前不可用：<snapshot.reason>」，并引导用户去设置里检查引擎。中英文文案都要加，只有 zh/en 两套。:352-355 例行任务那里也是同一个判断，一起检查。
2. 被过滤导致找不到程序时，reason 要说清楚：PATH 里能找到这个程序，但它在智能体可写的目录里，隔离开启时服务端不会运行它；建议把它装到智能体写不了的位置。不要再报「not found」。在 procs.ts 加这个判断：原始 PATH 能找到、过滤后找不到。
3. 隔离盒子启动自检时，如果已配置引擎的 CLI 只能在 HOME 下找到，日志里打一条警告。
4. 补测试：前端两种情况分别显示哪条提示；procs 的新 reason；自检警告。

## 验收
逐个文件跑改动相关的测试并贴结果，另跑 `tsc -p tsconfig.server.json` 和前端 tsc，对改动文件跑 `oxlint --deny-warnings`。report.md 只写实际改过的文件。
