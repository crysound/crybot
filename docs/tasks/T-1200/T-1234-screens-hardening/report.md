# T-1234 多屏容器后续加固报告

## 修改文件

- `server/container-screens.ts`：`crybot-pkg` 先执行带 root 环境隔离的 `apt-get update`，分别记录 update/install 结果，并在 root 初始化 chmod 前拒绝可控路径上的符号链接。
- `server/container-computer-screens.ts`：屏内 exec 经 `screen-program` 统一设置 `oom_score_adj=500`，并让 `stopScreen` 始终尝试清理且保留 supervisor stop 原始错误。
- `server/container-computer.ts`：多屏布局标记探测不再受 `probeDesktop` 选项影响。
- `server/container-screens.test.ts`：补充包安装顺序和失败日志、符号链接判定、屏幕 supervisor 环境、setuid 后环境设置及屏内 OOM 参数断言。
- `server/container-computer.test.ts`：补充三种 stopScreen 错误组合、屏内 OOM 参数和 marker 探测测试。
- `server/container-mcp.test.ts`：更新屏内 MCP 参数断言，锁定 OOM wrapper。
- `scripts/smoke-screens-container.mjs`：增加 token 路由的 RFB 密码认证、跨屏 X/socket 访问、三种 sudo 拒绝以及运行目录目标 mode 保持检查。

## 要做的事处理结果

1. **已完成**：`crybot-pkg` 先 update；update 失败写 `operation=update` 日志并立即退出，install 单独写 `operation=install` 日志；单测覆盖顺序、失败不安装和结果区分。
2. **已完成**：多屏 `screenIdentityArgs` 保留 `-u`、`env -u VNC_PW`、`prlimit --nproc=1500`、`umask 007`，通过 `screen-program` 设置 OOM 优先级；单屏路径参数 fixture 未变。
3. **已完成**：stop 和 pkill 清理都执行；单步失败抛对应错误，双失败抛 `AggregateError`，`cause` 和 `errors[0]` 保留原 stop 错误，消息包含两步错误。
4. **已完成**：初始化脚本对 `/home/cua`、`/home/cua/workspace`、`/home/cua/workspace/screens`、`/home/cua/.vnc` 逐项做 `[ -L ]` 拒绝，正常目录流程不变。
5. **已完成**：每个 `[program:screen-sN-*]` 段均断言没有 `environment=`；`screenProcessScript` 单测断言 setuid/setgid 后才设置 HOME/USER 等环境。
6. **已完成（脚本检查已补）**：冒烟脚本现在验证 token=s1/s2 的正确密码、错误密码和 s1 密码跨 token=s2 失败；s1 访问 `DISPLAY=:2`、s2 cua socket 和三种身份 sudo 均必须失败；运行目录符号链接目标同时比较属主和 mode。沙箱无法运行真实 Docker/端口型冒烟，结果以 Actions「Real VM screens」为准。
7. **已完成**：当前 main 仍存在 marker 探测受 `probeDesktop` 影响的问题，已改为多屏运行容器始终探测 marker，并补 `probeDesktop:false` 回归单测。

## 验证

先运行 `crybot-link-deps`，成功链接 73 项依赖；未使用 `systemd-run`，测试文件逐个执行。

- `pnpm exec vitest run server/container-screens.test.ts`：28/28 通过。
- `pnpm exec vitest run server/container-computer.test.ts`：154/154 通过。
- `pnpm exec vitest run server/container-mcp.test.ts`：9/13 通过；剩余 4 项是沙箱已知的子进程桥接 fixture `EPERM`/空 stdout 失败，未修改或跳过。
- `pnpm exec vitest run server/bot-box/env.test.ts`：10/10 通过。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`：1/1 通过，`server/container-computer.ts` 未超 ratchet 上限。
- `pnpm exec tsc -p tsconfig.server.json --pretty false`：通过。
- `pnpm exec oxlint --deny-warnings` 覆盖本轮改动 TS/MJS 文件：通过。
- `node --check scripts/smoke-screens-container.mjs`：通过；冒烟内嵌 Python RFB 检查也通过 `py_compile`。
- `git diff --check`：无输出。

逐文件测试输出摘要：

```text
server/container-screens.test.ts: 1 passed, 28 passed
server/container-computer.test.ts: 1 passed, 154 passed
server/container-mcp.test.ts: 1 failed, 9 passed, 4 failed (沙箱 EPERM 子进程桥接)
server/bot-box/env.test.ts: 1 passed, 10 passed
scripts/testing/file-size-ratchet.test.ts: 1 passed, 1 passed
tsc -p tsconfig.server.json: exit 0
oxlint --deny-warnings (改动文件): exit 0
node --check scripts/smoke-screens-container.mjs: exit 0
git diff --check: no output
```

当前 InstaBox 没有 Docker daemon 且禁止监听端口，未运行真实容器冒烟；Actions「Real VM screens」需要实际执行新增的 RFB token 认证、跨屏隔离、sudo 拒绝和运行目录 mode 检查。工作树中也不存在 AGENTS.md 要求引用的 `docs/verification/README.md`，请协调者确认是否需要补回该验证说明。

## 需要协调者处理

- 推送后运行 Actions「Real VM screens」，确认真实镜像中的 WebSocket RFB 认证、跨屏连接拒绝、sudo 拒绝及重启后的 mode 保持。
- 在当前分支补齐或确认 `docs/verification/README.md` 的来源，便于后续按仓库规定执行隔离 fixture 验证。
