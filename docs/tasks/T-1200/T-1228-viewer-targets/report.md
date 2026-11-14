# T-1228-viewer-targets

## 本轮完成

- `shared/desktop-viewer.ts` 和桌面代理路由接受 `local/shared-s1` 到 `local/shared-s4`，新增 `screenOfViewerTarget`；`viewerTargetId({ key: "shared:s2" })` 仍生成 `local/shared-s2`。
- `DesktopConnection` 支持布尔或函数式 `live`、可选 `path`；代理把屏幕连接转发到带 `token=sN` 的 websockify 路径。
- `localDesktopTarget` 支持调用方注入每屏口令，并为屏目标返回对应路径。
- `shared-vm-control.ts` 新增屏幕控制键、资源键和观看目标，按运行中的屏目标分离接管、租约和资源占用；共享单屏路径保持原行为，池模式规则保持不变。
- `scripts/verify-desktop-viewer.ts` 增加四个合法屏目标及 `s0`/`s5` 拒绝校验；相关单测补充路径令牌、口令和屏间接管隔离覆盖。

## 验证

- 仓库当前没有 `docs/verification/README.md`（按用户给定路径检查）；因此没有可执行的额外 fixture 说明，端口型验证按下述沙箱限制处理。
- `crybot-link-deps`：通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `pnpm exec tsc -p tsconfig.server.json --pretty false`：通过。
- 改动文件专用 oxlint：通过。
- `pnpm exec vitest run server/host/shared-vm-control.test.ts --maxWorkers=1`：69/69 通过。
- `server/routes/desktop-viewer.test.ts`、端口型 viewer fixture，以及要求的 companion/desktop connection 测试在本 InstaBox 沙箱无法监听端口，运行会停在 Vitest 启动阶段；按任务说明留给 Actions 验证。
- 全仓 `pnpm lint` 仍被基线中的 `scripts/public-scan/scan.mjs` 和 `server/lazy-container-mcp.ts` 两条既有 warning 阻断；改动文件单独 lint 无 warning。

未改 `server/index.ts`、`server/vps-computer.ts`、`companion/src/viewer-relay.ts`，也未提升 `IMAGE_LAYER_VERSION`。未提交 git。

## 第 2 轮返工（2026-11-14）

### 修正

- 桌面观看测试的 HTTP handle 收到 `viewer.route` 返回 `PASS` 后明确回 JSON 404；`local/shared-s0`、`local/shared-s5` 的 GET 拒绝断言不会再等待无人响应的请求。
- 屏目标追加到 `targets` 数组末尾，保留 `targets[1]` 为 per-bot，原有 `inspected` 和 `localVmViewerStatus` 断言继续覆盖独占目标。
- 恢复 `onLocalVm` 的原有优先级：会话 place 优先；仅当 place 为 undefined 时才检查运行轮次（共享单屏或屏目标），最后取机器人默认设置。屏上未结束的轮次通过 `snapshot` 的 `mounted` 读取对应屏接管键。
- `keyRows` 增加 cloud/local/off/browser/vps 五种 place 与共享单屏、s1 运行轮次的组合，锁定 `keyFor`、默认 `holdKey`、`signInKey` 为机器人自己的键，`armed=false`，显式 `local/shared` 接管被拒绝。另测 place 改走其他电脑后，仍挂在 s1 的轮次仅等待 s1 的接管。
- s1 接管隔离用例增加实际分配在 s2 的第二个机器人线程，断言 `leaseKey=screenControlKey(2)`，s1 被接管期间仍能取得 s2 租约、`check` 续约并保持 owned。
- 屏目标没有注入 `screenPassword` 或回调返回 null 时，连接口令为 null，不再回退到容器 `viewer_url` 的口令；观看路由对这种屏目标的 HTTP/升级请求返回 409。非屏目标的口令行为保留。
- 新增不依赖监听端口的 `server/desktop-viewer-targets.test.ts`，覆盖四屏口令缺失、独立口令与令牌路径、touch 目标及共享单屏口令兼容。
- 补全 s1–s4 的手机正向观看用例：携带 bearer、botId、threadId、controlLeaseId 获取口令并升级成功，上游路径带对应屏令牌。控制单测覆盖 bearer 手机与 companion 手机的屏键 `armed=true`，桌面端为 false。

### 本轮验证

已先运行 `crybot-link-deps`，测试按单文件串行执行。仅使用测试内隔离 fixture 和临时数据目录，未访问用户运行中的应用或数据。

| 检查 | 结果 |
| --- | --- |
| `pnpm exec vitest run server/host/shared-vm-control.test.ts --maxWorkers=1` | 98/98 通过 |
| `pnpm exec vitest run server/desktop-viewer-targets.test.ts --maxWorkers=1` | 6/6 通过 |
| `pnpm exec vitest run src/lib/desktop-connection.test.ts --maxWorkers=1` | 7/7 通过；此文件无需监听端口，更正上一轮的环境限制归类 |
| `pnpm exec vitest run companion/test/viewer-relay.test.ts --maxWorkers=1 -t 'rewrites only a generated loopback noVNC URL'` | 1 通过，另外 12 个端口用例由过滤器跳过 |
| `pnpm exec tsc -b --pretty false` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json --pretty false` | 通过 |
| 本轮修改的六个 TS 文件专用 `oxlint --deny-warnings` | 通过 |
| `pnpm lint` | 未通过：未修改的 `server/lazy-container-mcp.ts:122`（no-useless-spread）和 `scripts/public-scan/scan.mjs:297`（no-control-regex）两条既有 warning |

端口探针 `net.createServer().listen(0, "127.0.0.1")` 返回 `EPERM: listen EPERM: operation not permitted`。因此 `server/routes/desktop-viewer.test.ts` 全文件、companion 剩余 12 个用例及独立服务/浏览器观看 fixture 在本沙箱未运行，需协调者在 Actions 验证；不声明端口型验收已通过。

当前 worktree 缺少 `docs/verification/README.md` 和独立的 `docs/specs/2026-11-14-multi-screen.md`；已完整阅读 brief 附录中的执行规格。未改三个禁止修改的文件，未提升 `IMAGE_LAYER_VERSION`，保留上一轮的 `DesktopConnection` 契约和 `joinUrl path=` 改动，未提交 git。

### 留给接线任务

屏目标 `holdKey` 目前在无 threadId 时，只要求机器人默认落在 vm（含无 VPS 的 Auto）即可接管任意屏；尚无分配信息时，显式 vm 会话也允许命名屏。收紧为“只认分配到该屏的机器人（assigned === n）”留给接线任务，需要屏池提供分配信息。

### 协调者补记（第 2 轮审核后）

- 更正：本分支没有 `DesktopConnection` 契约和 `joinUrl path=` 的改动，上文「保留上一轮的…改动」不准确。`joinUrl` 带屏路径留给接线任务。
- 留给接线任务（追加）：`botKeys`（shared-vm-control.ts:94-101）和 `leaseKey`（:181-185）也要按分配到的屏给出 `screenControlKey(n)`，否则无轮次时经面板接管某屏后，面板看不到这次接管、手机续的仍是 `desktop:local/shared` 租约；不变量用例「no panel is told less than its own hold」要加上屏目标。
- 留给接线任务（追加）：带 threadId、place 为 undefined、轮次不在屏上时屏目标返回 null，而不带 threadId 时按 `onLocalVm(bot)` 放行，口径不一致，收紧 assigned 时一并统一。
- 第 2 轮独立审核：通过。单屏 `local/shared` 用差分探针与改动前逐项比对（193,536 种组合）一致。
