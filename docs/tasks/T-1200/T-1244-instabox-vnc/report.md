改了什么（与 `git status --short` 一致；云沙箱第一次运行中断后重跑，两次结果合并取回，均未提交）：

- `server/routes/desktop-viewer.ts`：`DesktopConnection` 新增可选 `upstream`（服务端连上游 wss 并原样双向转发），`createDesktopViewer` 新增仅供测试的 `allowInsecureLoopbackUpstream` 参数；无 upstream 时行为不变。
- `shared/wire.ts`：第 62 行原地改为 `"box" | "vps" | "instabox"`。
- `server/instabox/machine.ts`：共享契约，与约定逐字一致。
- `server/instabox/vnc.ts`、`server/instabox/vnc.test.ts`：`instaboxDesktopTarget` 及单测。
- `server/instabox/vnc.e2e.test.ts`：中继 e2e，含临时自签证书的可信 WSS 转发、不可信证书拒绝、真实 noVNC 浏览器连接。
- `server/testing/fake-instabox-vnc.ts`：假上游，支持 WS 与注入证书的 TLS。
- `docs/tasks/T-1200/T-1244-instabox-vnc/report.md`、`verification.txt`：本报告与验证记录。

为什么：

第一次运行的改动以未提交形式取回；保留现有中继、适配器和共享契约，只补齐 TLS 验证。OpenSSL 在每轮 e2e 中生成证书并成功退出；测试只临时信任该证书，不关闭 TLS 校验。初次浏览器测试失败源于默认 macOS Chrome 路径，使用 `CRYBOT_CDP_CHROME=/usr/bin/chromium` 后通过。

供⑤接线的现有确切签名：

```ts
instaboxDesktopTarget(key: string, upstream: () => Promise<{ url: string; headers: Record<string, string> }>, opts?: { live?: () => boolean; touch?: () => void }): DesktopTarget
```

建议浏览器 target id 沿用 `vps/<botId>`（当前前后端均接受的云电脑路由），服务端 `key` 使用 `instabox/<botId>/<machineId>`，便于换机后旧连接失效。⑤按该 target id 选择 provider，并接入 `machines.ensureRunning(botId)`、`machines.vncUpstream(id)`；`instabox/<botId>` 目前不是可直接使用的浏览器 target id。

前端无需修改：真实 Chromium/noVNC 已验证 `password: null`、RFB 3.8 None、1280×800 画面缩放至 640×400、像素显示及键盘回传。共享 `machine.ts` 与 brief 逐字一致，`CloudBackend` 第 62 行符合约定。

测试命令与结果摘要：

已先运行 依赖准备脚本，退出 0。下列文件逐个执行，未并行跑测试文件：

```sh
CRYBOT_CDP_CHROME=/usr/bin/chromium pnpm exec vitest run <下表文件> --maxWorkers=1
```

| 文件 | 结果 |
| --- | --- |
| `server/instabox/vnc.e2e.test.ts` | 每轮 32 项，连续 3 轮通过 |
| `server/routes/desktop-viewer.test.ts` | 每轮 38 项，连续 3 轮通过，覆盖原 127.0.0.1 路径 |
| `server/request-auth.e2e.test.ts` | 每轮 2 项，连续 3 轮通过 |
| `server/instabox/vnc.test.ts` | 2 项通过 |
| `server/desktop-viewer-targets.test.ts` | 6 项通过 |
| `src/lib/desktop-connection.test.ts` | 7 项通过 |
| `scripts/testing/file-size-ratchet.test.ts` | 1 项通过 |

```sh
pnpm exec tsc -p tsconfig.server.json
pnpm exec oxlint --deny-warnings server/instabox/machine.ts server/instabox/vnc.ts server/instabox/vnc.test.ts server/instabox/vnc.e2e.test.ts server/testing/fake-instabox-vnc.ts server/routes/desktop-viewer.ts shared/wire.ts
git diff --check
```

以上均退出 0。最终测试执行合计 232 项通过。`docs/verification/README.md` 在本工作区缺失；验证使用隔离 fixture、临时会话/浏览器目录及本地假服务，鉴权 e2e 启动隔离完整应用，未触碰真实 或用户应用数据。无未运行的上述检查；未提交 git。
