# 根因

- `server/cloud-guest-shell.e2e.test.ts:204-214` 原先用累计 stdout 的 `log.includes("bot box: on")` 判断 box 状态；stdout data 事件与探针文件写出之间存在读取竞态，导致同一进程偶尔走错断言分支。`server/index.ts:747` 在监听前完成 box 启动，健康接口返回的是稳定启动状态；`server/bot-box/env.ts:50-55` 的 `CRYBOT_CLOUD_*` 永拒规则和 `server/bot-box/box.ts:104-106` 的白名单没有产品漏变量路径。
- `server/drivers/claude.ts:2081-2082`、`server/drivers/acp/core.ts:1696-1703` 原先关闭会话后没有等待 CLI 进程树结束；服务器父进程收到 `close` 后，仍在写临时 home 的子孙进程会令 `server/steer-e2e.test.ts:155` 的严格删除偶发 EACCES。

# 改了什么

- 用认证后的 `/api/health` 的 `body.box` 判定 bot box，保留原有环境断言。
- Claude 和 ACP dispose 收集活动/retiring CLI，并等待 `killCliTree` 完成后再返回；新增 Claude、ACP 活跃 turn 回归测试。

# 跑过的命令和输出结尾

- `PATH=/opt/node24/bin:$PATH /opt/node24/bin/node /root/workspace/crybot/node_modules/.pnpm/vitest@4.1.11_@types+node@26.2.0_happy-dom@21.0.4_vite@7.3.6_@types+node@26.2.0_jiti@2._e1863e8544b106673873d37d7ac717f9/node_modules/vitest/vitest.mjs run --config /tmp/t1240-run/vitest.config.ts server/bot-box/env.test.ts`：`Test Files 1 passed (1)`；`Tests 11 passed (11)`。
- 同命令运行 `server/kill-tree-linux.test.ts`：`Test Files 1 passed (1)`；`Tests 6 passed (6)`。
- 同命令运行 `server/drivers/acp/acp.test.ts -t "waits for a live turn's process tree before disposing"`：`Test Files 1 passed (1)`；`Tests 1 passed | 213 skipped (214)`。
- 同命令运行 Claude 回归测试：`permission broker unavailable ... listen EPERM`；沙箱禁止 Unix socket。
- 同命令运行 `server/cloud-guest-shell.e2e.test.ts`：`no free port block for offsets 0,1 in 19600..22600`。
- 同命令运行 `server/steer-e2e.test.ts`：`listen EPERM: operation not permitted 127.0.0.1:24864`。
- `pnpm exec tsc -p tsconfig.server.json --pretty false`：无输出，退出码 0。
- `pnpm exec oxlint --deny-warnings server/cloud-guest-shell.e2e.test.ts server/drivers/claude.ts server/drivers/acp/core.ts server/drivers/claude.test.ts server/drivers/acp/acp.test.ts`：无输出，退出码 0。
- `git diff --check`：无输出，退出码 0。
