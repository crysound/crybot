## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1242 云电脑①：核心客户端、开机/挂起、后端切换接线

（本任务是 T-1239 的第 1 块，与 ②③④ 并行开发。下面「共同约定」必须遵守。）

## 本任务负责的文件（只改这些；别的任务的文件不要碰）
- 新建：`server/instabox/machine.ts`（共享契约，按约定原样）、`server/instabox/client.ts`、`server/instabox/machines.ts`、`server/instabox/power.ts`、`server/instabox/key.ts`，以及它们的测试和你自己的假服务 `server/testing/fake-instabox-core.ts`。
- 修改：`shared/wire.ts:62`（按约定原样改那一行）、`server/config.ts`（加 `instabox?: { apiKey?: string }`，余量 10 行）、`server/store.ts:336`（允许 `cloudBackend: "instabox"`）、`server/routes/bot-patch.ts:389-390`（接受 instabox，错误文案改为 box, vps or instabox）、`server/cloud-backend.ts`（集中放后端判断小函数）、`server/index.ts`（余量约 110 行，你最多用 80 行，给 ⑤ 留 30 行）。

## 要做
1. `client.ts`：`createInstaboxRequest(apiKey: string, baseUrl = "https://api.instabox.sh"): InstaboxRequest`。带 X-API-Key；`idempotent: true` 时加随机 Idempotency-Key；非 2xx 抛带状态码和 错误码的错误（不得把钥匙写进错误或日志）。另导出 `waitOperation(request, opId, timeoutMs)`：`?wait=25s` 长轮询到 succeeded/failed。
2. `key.ts`：`instaboxApiKey(cfg)`：环境变量 `INSTABOX_API_KEY` 优先，否则 `cfg.instabox?.apiKey`，空串当未配置。`instaboxConfigured(cfg)`。
3. `machines.ts`：`createInstaboxMachines(request: InstaboxRequest): InstaboxMachines`，完整实现契约：
   - 机器名 `crybot-<botId 前 12 位>`，metadata `{app:"crybot",botId}`；`find` 按名字查（`deleted` 视为没有）。
   - `ensureRunning`：没有就建（linux→`agent-browser`，android→`android`，4 核 8G，autoSuspend 600）；`suspended` 就 resume；`stopped` 就 start；`error` 抛错；中间态等到稳定；然后 `POST /desktop {"action":"start","width":1280,"height":800}`（桌面已在跑时接口返回的情况要容错）。同一 botId 并发调用只发一次创建（进程内单飞）。
   - `suspend`、`remove`（带 X-Confirm-Delete）、`exec`（409 machine_not_running 时先 resume 再重试一次）、`readFile`、`writeFile`、`vncUpstream`（返回 `wss://api.instabox.sh/v1/machines/{id}/vnc` 和含钥匙的头；基址跟随 client 的 baseUrl，http→ws、https→wss，便于测试）。
4. `power.ts`：智能体回合结束、空闲时挂起机器（自身的 600 秒自动挂起是兜底，不必另写定时器的话可以只在删智能体/切走后端时处理）；删除智能体时删除其机器；把智能体的后端从 instabox 切走时挂起（不删，留着可切回）。说明清楚你的选择。
5. `server/index.ts` 接线（只做本任务的部分）：
   - 现在很多地方写的是 `bot.cloudBackend === "vps" ? "vps" : "box"`。在 `cloud-backend.ts` 加一个小函数（如 `cloudKindOf(bot)` 返回 `"box" | "vps" | "instabox"`），把 index.ts 里涉及「这个智能体用哪种云电脑」的判断（约 2518、2915、4617、5955-6043、7902-8243、14995-15111 这些位置）改成三分支：instabox 智能体不走 Boat、不走 VPS，云电脑请求走 `createInstaboxMachines(...).ensureRunning(botId)`。
   - 钥匙没配置时，选 instabox 的智能体要明确报「钥匙未配置」，不能悄悄回退到 Boat。
   - 共用电脑（team computer）、本地 VM、多屏路径一律不动：继承共用电脑的智能体照旧走 Boat。
   - 状态接口（约 14995 行 `backend:` 字段）返回 `"instabox"`。
   - 智能体操作电脑的工具、远程画面、快照路由由 ②③④ 实现、⑤ 接进来；你这里**不要**引用它们的文件，只保证 `InstaboxMachines` 实例能被拿到：在 index.ts 里留一个函数 `instaboxMachinesFor(cfg)`（钥匙变了要换新实例，未配置返回 null），⑤ 会用它。
6. 测试：假服务覆盖创建→等操作单→开桌面、挂起中 exec 先 resume、并发 ensureRunning 只建一次、删除带确认头、错误里不含钥匙；后端判断函数的单测；bot-patch 接受 instabox；store 读回 instabox 不被删。e2e（用假服务把一个 instabox 智能体从无到开机）连跑 3 次。

## 验收
按「共同约定 · 测试」执行；report.md 只写实际改过的文件，并单独列出你在 index.ts 用了多少行、`instaboxMachinesFor` 的签名、需要 ④ 加的文案键（中英文）。

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
