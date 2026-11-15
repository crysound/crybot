## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1249 修 main 上 sessions.test.ts 的类型错误

## 背景
main 的 Actions「check」任务里 `pnpm exec tsc -p tsconfig.server.json` 失败：
`server/sessions.test.ts(79,38): error TS2741: Property 'label' is missing in type '{ code: string; source: string; browser: boolean; }'`。
registry 的 exchange 调用 的参数现在要求 `label`（server/sessions.ts:69 `label: z.string().max(80)`）。

## 要做
- 只改 server/sessions.test.ts：给该处（以及同文件其他同类调用，如有）补上合理的 `label`，不改断言含义、不改 server/sessions.ts。
- 全仓库 grep 一下其他测试里有没有同样缺 label 的 `exchange(` 调用，一并补上（只改测试文件）。

## 验收
- `tsc -p tsconfig.server.json` 通过（用 `systemd-run --scope -q -p MemoryMax=4G` 套着跑）。
- server/sessions.test.ts 跑通。
- report.md 只写实际改过的文件。
