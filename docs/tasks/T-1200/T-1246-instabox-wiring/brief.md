## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1246 T-1239⑤ 云电脑：把核心、工具、画面、设置/快照接进服务端，端到端可用

## 背景
父任务 T-1239：新增云电脑后端 `instabox`。①–④ 已分别合并进 main，但为避免互相冲突，都没有接进服务端入口，现在处于「代码在、没接线」状态：
- ① T-1242 核心：`server/instabox/` 下机器生命周期（ensureRunning/suspend/remove/exec/readFile/writeFile/vncUpstream）、回合接入、策略与删除。报告：`docs/tasks/T-1200/T-1242-instabox-core/report.md`。
- ② T-1243 工具：`server/instabox/computer-tools.ts`（智能体操作电脑的工具、复制上限、lease）。报告：`docs/tasks/T-1200/T-1243-instabox-tools/report.md`。
- ③ T-1244 画面：`server/instabox/vnc.ts` 远程桌面中继。报告里「供⑤接线的现有确切签名」一节：`docs/tasks/T-1200/T-1244-instabox-vnc/report.md`。
- ④ T-1245 设置/快照：钥匙设置项、三后端选择 `CloudBackendPicker`、快照面板 `InstaboxSnapshots`、快照路由与假服务。报告里「⑤ 接线的确切签名」和「尚未独立闭环」两节：`docs/tasks/T-1200/T-1245-instabox-settings/report.md`。

先完整读这四份报告和下面的共同约定，再动手。

## 要做的事（必改）
1. 配置：`instabox.apiKey` 接进配置 schema、saveConfig 的 section 合并列表、加载、`INSTABOX_API_KEY` 环境变量覆盖、全局 configStatus 和 config 广播。`/api/config` 和广播里只给「已配置/末四位/来源」，绝不回显钥匙原文（④第 4 轮已有的约束保持）。
2. 路由：注册④的快照路由；注册③的画面中继：浏览器 target id 沿用 `vps/<botId>`，服务端按智能体实际后端选 provider，instabox 时调 `machines.ensureRunning(botId)` + `machines.vncUpstream(id)`，服务端 key 用 `instabox/<botId>/<machineId>`，换机后旧连接失效。
3. 工具：智能体后端为 instabox 时，回合里的电脑工具走②的 `computer-tools`，不再落到 Boat/VPS；box/vps 行为不变。
4. 前端：电脑面板里④的后端选择和快照面板在接好后正常可用；没配钥匙时 instabox 选项置灰并提示去设置页填钥匙（用④已加的文案键，缺的键补进 zh/en/pt-br）。
5. 共用电脑（team computer / 部门桌面）、本地 VM 私有桌面、多屏一律不动。

## 一起改（来自④第 2 轮复审的建议）
6. 快照接口同步等待每段实际约 205 秒（180 + 一次 25 秒长轮询）：前端请求超时和服务端反代/路由超时按此留余量，或把剩余时间截成 `wait` 参数，不能让前端先超时而后台还在跑。
7. 假服务快照对象改成真实 OpenAPI 形状：status 为 `pending|ready|failed`，带 `sourceMachineId`；操作单判别只认 `type/phase`，不认 `machineId`。
8. 快照 e2e 在 restore 前断言创建时已调过 operations 和 `GET /v1/snapshots`。
9. pt-br 里「智能体」译法统一，照文件里已有的多数译法。

## 端到端测试（必须新增，进仓库）
新增 `server/instabox/wiring.e2e.test.ts`（名字可调整），用真实服务端入口 + 本地假 （不连真实服务）走完一条链：
设置钥匙（含环境变量覆盖）→ `/api/config` 不含钥匙原文 → 新建智能体选 instabox → 回合里调一次电脑工具（exec + 截图/读文件）落到假 → 画面中继以 `vps/<botId>` 连上并收到 RFB 握手 → 建快照、列快照、restore → 删智能体时机器被删除。
另加一条：box/vps 智能体的同一路径不碰假 。
e2e 连跑 3 次都要过。

## 约束
- 行数门禁（`scripts/testing/file-size-ratchet.test.ts`）：`server/index.ts`、`ComputerPanel.tsx`、`config.ts`、`store.ts` 余量很少，先查余量；接线逻辑放 `server/instabox/wiring.ts` 等新文件，大文件里只加挂载调用。
- 公开仓库：代码、测试、文档、verification.txt 不得出现内部域名、IP、邮箱、人名、真实钥匙、uuid；假钥匙用 `instabox-e2e-fixture` 这类明显的假值。
- 钥匙只在服务端，不进机器、前端、日志、智能体上下文。

## 验收
改动相关测试逐文件跑过（含①–④已有的 instabox 测试、`server/index.test.ts`、`server/bot-box/env.test.ts`、file-size-ratchet）；`pnpm exec tsc -p tsconfig.server.json`、前端 tsc；改动文件 `oxlint --deny-warnings`。report.md 写短：改了哪些文件、怎么接的、测试结果；列出还需要协调者用真实钥匙核对的点（例如真实快照耗时、真实画面）。

## 顺手修（main 上已有）
10. `server/routes/config-instabox.test.ts` 第 20 行 `configForAccess: (status, auth) =>` 两个参数隐式 any，`tsc -p tsconfig.server.json` 报 TS7006；补上类型，让服务端 tsc 全绿。
# T-1239 云电脑后端：共同约定（4 个并行子任务都必须遵守）

## 目标与范围（用户已定）
- 新增云电脑后端 `instabox`，与 Boat（box）、VPS（vps）并列，供单个智能体使用自己的云电脑。范围：Linux 桌面 + Android 模板，不含苹果。
- 共用电脑（team computer / 部门桌面）、本地 VM 私有桌面、多屏都**不改**，仍走原来的路。
- 所有机器用同一把 钥匙：配置 `instabox.apiKey`，环境变量 `INSTABOX_API_KEY` 覆盖；钥匙只在服务端，绝不进入机器、前端、日志或智能体上下文。
- 本仓库是**公开仓库**：代码、测试、文档里不得出现内部域名、IP、邮箱、人名、真实钥匙。公共接口域名 `api.instabox.sh`、`connect.instabox.sh` 可以出现。

## 接口要点（实测）
- 基址 `https://api.instabox.sh`，请求头 `X-API-Key: <key>`。
- 生命周期调用（POST /v1/machines、PATCH、start/stop/suspend/resume/restore、POST snapshots、DELETE）**必须**带 `Idempotency-Key`；删机器另带 `X-Confirm-Delete: <id>`。都返回 202 + 操作单 `{id,machineId,type,state,phase,error}`，用 `GET /v1/operations/{id}?wait=25s` 长轮询到 succeeded/failed。
- 机器 state：creating、starting、running、stopping、stopped、suspending、suspended、resuming、deleting、deleted、error。
- 创建：`{"name","templateId":"agent-browser"|"android","spec":{"vcpus":4,"memoryGiB":8},"autoSuspendAfterSeconds":600,"metadata":{...}}`。按名字找回机器：`GET /v1/machines`（按 name 过滤）。
- 新建、冷启动、restore、从快照新建之后桌面不运行：必须 `POST /v1/machines/{id}/desktop {"action":"start","width":1280,"height":800}`。
- exec：`POST /v1/machines/{id}/exec {"cmd"|"argv","envs","cwd","stdin","timeoutSeconds":1..600}` → `{stdout,stderr,exitCode,timedOut,truncated,...}`；非流式输出各 1 MiB 截断。默认没有 DISPLAY，桌面在 `:1`（Boat 是 :0）。后台任务用 `nohup setsid ... >log 2>&1 </dev/null &`。
- 手动挂起的机器调 exec/文件返回 409 `machine_not_running`，要先 resume；空闲自动挂起的机器 exec 会自动唤醒。挂起中不能 stop。
- 文件：`PUT /v1/machines/{id}/files?path=&mode=0644&parents=true`（原始字节）上传；`GET /v1/machines/{id}/files/content?path=` 下载。
- VNC：`wss://api.instabox.sh/v1/machines/{id}/vnc`，服务端带 `X-API-Key` 头连接；RFB 3.8，安全类型 None（无密码）。
- 快照：`POST /v1/machines/{id}/snapshots {"name","description"}`（名字 a-z0-9-，1–63，不重名）→ 轮询 `GET /v1/snapshots/{id}` 到 ready；`GET /v1/snapshots`；`POST /v1/machines/{id}/restore {"snapshotId","desiredState":"running"}`；`DELETE /v1/snapshots/{id}`。
- 机器命名：`crybot-<botId 前 12 位>`，metadata 带 `{"app":"crybot","botId":...}`。

## 共享文件（各任务需要时原样创建，内容必须一字不差；已存在就不要改）
`server/instabox/machine.ts`：
```ts
/** cloud computer: the contract the four backend pieces share. */
export type InstaboxTemplate = "linux" | "android";
export type InstaboxMachineState = "creating" | "starting" | "running" | "stopping" | "stopped" | "suspending" | "suspended" | "resuming" | "deleting" | "deleted" | "error";

export interface InstaboxMachine { id: string; name: string; state: InstaboxMachineState; template: InstaboxTemplate }

export interface InstaboxExecRequest { cmd?: string; argv?: string[]; envs?: Record<string, string>; cwd?: string; stdin?: string; timeoutSeconds?: number }
export interface InstaboxExecResult { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; truncated: boolean }

/** One authenticated API call. `idempotent: true` adds an Idempotency-Key; lifecycle calls need it. */
export type InstaboxRequest = (method: string, path: string, opts?: { body?: unknown; raw?: Uint8Array; idempotent?: boolean; headers?: Record<string, string>; query?: Record<string, string> }) => Promise<Response>;

export interface InstaboxMachines {
  find(botId: string): Promise<InstaboxMachine | null>;
  /** Create, resume or start the bot's machine as needed, then make sure its desktop runs. */
  ensureRunning(botId: string, opts?: { template?: InstaboxTemplate }): Promise<InstaboxMachine>;
  suspend(botId: string): Promise<void>;
  remove(botId: string): Promise<void>;
  exec(machineId: string, req: InstaboxExecRequest): Promise<InstaboxExecResult>;
  readFile(machineId: string, path: string): Promise<Uint8Array>;
  writeFile(machineId: string, path: string, data: Uint8Array, opts?: { mode?: string }): Promise<void>;
  /** Where the server connects for this machine's VNC (RFB, no password); headers carry the key and never leave the server. */
  vncUpstream(machineId: string): Promise<{ url: string; headers: Record<string, string> }>;
}
```
`shared/wire.ts:62` 改成（原行上改，不增行；文件正好 1000 行，多一行会挂行数门禁）：
`export type CloudBackend = "box" | "vps" | "instabox";`

## 行数门禁
`scripts/testing/file-size-ratchet.test.ts`：登记文件不许变长，未登记文件不许超过 1000 行。`server/index.ts` 四个任务合计只剩约 110 行余量（由任务①统一占用），`ComputerPanel.tsx` 余量 25、`config.ts` 10、`store.ts` 17、`boat.ts` 1。新逻辑一律放 `server/instabox/` 下的新文件。

## 测试
- 不连真实 。写 `server/testing/fake-instabox.ts` 风格的假服务（`createServer` 起本地 HTTP/WS，`vi.stubEnv` 或依赖注入指过去）；各任务若都需要假服务，各自放在自己命名的文件里（如 `fake-instabox-power.ts`），避免同名冲突。
- 本轮沙箱已放开，可监听端口：改动相关的测试全部跑过，涉及的 e2e 连跑 3 次。另跑 `pnpm exec tsc -p tsconfig.server.json`、前端有改动时跑前端 tsc，对改动文件跑 `oxlint --deny-warnings`。
- 文案只加 `src/locales/zh.json` 和 `en.json`（且只有任务④加；其他任务需要文案时在报告里列出键名和中英文，由④统一加，代码里先用这些键）。
