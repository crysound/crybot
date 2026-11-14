## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行依赖准备脚本（镜像自带，把预装依赖链进 node_modules）。
- 没有 systemd、Docker；不能监听 TCP 端口。vitest 一次只跑一个文件。

# T-1236 修 main 上 lint 失败

CI 的 check 作业在 main 上失败，`pnpm lint`（`oxlint --deny-warnings .`）报两条警告：
1. `scripts/public-scan/scan.mjs:297:87` Unexpected control characters（正则里的控制字符）。改成等价写法（例如 `new RegExp` 配 `\u` 转义字符串，或按 oxlint 规则允许的写法），行为不变。
2. `server/lazy-container-mcp.ts:122:54` `Promise.allSettled` 接受可迭代对象，不必先转数组。去掉多余转换。

## 验收
- `pnpm exec oxlint --deny-warnings .` 退出码 0，贴输出。
- 跑 `scripts/public-scan` 相关测试（`ls scripts/public-scan` 找 *.test.*，一次一个）和 `server/lazy-container-mcp` 相关测试（如有），贴结果。
- report.md 写明改了什么；不提交 git。
