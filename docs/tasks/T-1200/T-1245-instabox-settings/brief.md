## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1245 云电脑④：设置页钥匙、后端选择、快照

（本任务是 T-1239 的第 4 块，与 ①②③ 并行开发。下面「共同约定」必须遵守。只有本任务改 zh/en 文案。）

## 本任务负责的文件（只改这些）
- 新建：`server/instabox/machine.ts`（共享契约，按约定原样；已存在就不改）、`server/routes/instabox-snapshots.ts` 及测试、你自己的假服务 `server/testing/fake-instabox-snapshots.ts`、`src/components/InstaboxSnapshots.tsx` 及测试。
- 修改：`src/components/CloudBackendPicker.tsx`、`src/components/keys/key-catalog.ts`（及其测试）、`server/routes/config.ts`（余量 10 行）、`src/components/ComputerPanel.tsx`（余量 25 行，只放挂载点）、`src/locales/zh.json`、`src/locales/en.json`、`shared/wire.ts:62`（按约定原样改那一行）。
- **不改** `server/index.ts`、`server/config.ts`、`server/store.ts`（属于 ①/⑤）。配置字段约定为 `cfg.instabox?.apiKey`，环境变量 `INSTABOX_API_KEY` 优先（① 实现读取；你这边保存时写 `instabox.apiKey`，类型若尚未存在就在 routes/config.ts 内局部声明，⑤ 合并时统一）。

## 要做
1. 设置页钥匙：在 key-catalog 里加 钥匙一项（与现有 Boat 钥匙同样的保存/清除/显示已配置方式），说明一句话：「云电脑（）钥匙，所有智能体共用」。钥匙只回显「已配置」，绝不回传明文；环境变量设置时显示为环境变量提供、不可在页面改。`routes/config.ts` 的保存接口支持它；`RemoteComputerProvider` 类型（routes/config.ts:56）加 `"instabox"`。
2. `CloudBackendPicker.tsx`：选项从 Boat / VPS 变为 Boat / VPS / 三个；的说明文案中英文都加。钥匙没配时 按钮可点但下方提示「先在设置里填 钥匙」。
3. 快照路由 `instabox-snapshots.ts` 导出 `createInstaboxSnapshotRoutes(deps: { machines(): InstaboxMachines | null; request(): InstaboxRequest | null; machineIdFor(botId: string): Promise<string | null>; botExists(botId: string): boolean }): RouteHandler`（RouteHandler 与现有路由同类型），路由：
   - `GET /api/bots/:id/instabox/snapshots`：列出该智能体机器的快照（按 metadata/名字前缀 `crybot-<botId前12>-` 过滤）。
   - `POST /api/bots/:id/instabox/snapshots {name?}`：存快照，名字规范化为 a-z0-9-、1–63、自动加时间后缀防重名；轮询到 ready。
   - `POST /api/bots/:id/instabox/snapshots/:snapId/restore`：`desiredState:"running"`，完成后开桌面（可调 `machines().ensureRunning`）。
   - `DELETE /api/bots/:id/instabox/snapshots/:snapId`：只允许删属于该智能体的快照。
   - 权限与现有云电脑接口一致（admin、同源）；钥匙未配置返回明确错误；所有 调用带 Idempotency-Key（用 request 的 `idempotent: true`）。
4. `InstaboxSnapshots.tsx`：在电脑面板里，仅当该智能体后端是 instabox 时显示：列表、「存一个快照」、恢复（二次确认，说明会冷启动、只保留磁盘）、删除（二次确认）。CRYSOUND 设计系统风格，手机 360/390 宽不溢出。`ComputerPanel.tsx` 里只加挂载点。
5. 文案：本任务所有新文案中英文都加；另外预留 ①②③ 可能用到的键：`computer.instabox.keyMissing`（钥匙未配置 / key is not set）、`computer.instabox.starting`（云电脑开机中 / Starting the cloud computer）、`computer.instabox.suspended`（云电脑已休眠，用到时自动唤醒 / The cloud computer is asleep and wakes when needed）。i18n 测试要通过。
6. 测试：路由用假服务覆盖列/存/恢复/删、越权删别的智能体快照被拒、钥匙未配置；前端选择器三选项、快照组件的空/有数据/确认流程；key-catalog 新项。

## 验收
按「共同约定 · 测试」执行，前端改动另截 1280 宽和 390 宽两张图（设置页钥匙、后端选择、快照面板）放进任务文件夹；report.md 只写实际改过的文件，写明 `createInstaboxSnapshotRoutes` 确切签名（⑤ 照着接）。

---

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
