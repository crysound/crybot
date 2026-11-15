## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1243 云电脑②：智能体操作电脑工具

（本任务是 T-1239 的第 2 块，与 ①③④ 并行开发。下面「共同约定」必须遵守。）

## 本任务负责的文件（只改这些）
- 新建：`server/instabox/machine.ts`（共享契约，按约定原样；已存在就不改）、`server/instabox/computer-tools.ts` 及测试、你自己的假服务 `server/testing/fake-instabox-tools.ts`。
- 修改：`server/cloud-computer-tools.ts`（当前 183 行，未登记，上限 1000）、`shared/wire.ts:62`（按约定原样改那一行）。
- **不改** `server/index.ts`（由 ⑤ 接线）。

## 要做
1. `computer-tools.ts` 导出 `runInstaboxComputerTool(machines: InstaboxMachines, machineId: string, name: string, args: Record<string, unknown>, signal: AbortSignal, folder?: string | null): Promise<CloudComputerResult>`，支持 `CLOUD_COMPUTER_TOOLS` 里的全部工具，行为与 `runCloudComputerTool`（Boat 版，cloud-computer-tools.ts:77）一致：
   - 参数检查复用 `cloudComputerCallProblem`；返回文案复用现有常量（NOT_READY / LATE / COPY_LATE / 打开网址提示等），不要另写英文句子。
   - 鼠标键盘用 `xdotool`，所有命令前加 `DISPLAY=:1`（经 exec 的 envs）。`type_text` 走剪贴板（xclip，没有就在报告里写明并用 `xdotool type` 兜底）。
   - `screenshot`：机器里 `scrot` 或 `import` 截图转 JPEG，读文件返回 base64，原生尺寸。
   - `exec` 前台：exec 接口 timeoutSeconds 按 `cloudComputerCallBudgetMs` 换算并夹到 1–600；超时返回现有 EXEC_LATE 语义。`exec` 后台 + `exec_status`：机器里 `nohup setsid ... >log 2>&1 </dev/null &`，记录 pid 和日志位置，`exec_status` 读日志尾和退出码，行为对齐 Boat 版 `startInBackground` / `backgroundStatus`。
   - `copy_from_computer` / `copy_to_computer`：用 `machines.readFile` / `writeFile`，路径规则、大小上限、只能落在 `folder` 内等安全检查与 Boat 版一致（直接复用 Boat 版的路径检查函数，没导出就从原文件导出，不改其行为）。
   - 命令隔离：Boat 版用 `isolatedRemoteCommand` 包装，确认对 是否适用，适用就复用。
2. `cloud-computer-tools.ts` 的 `cloudComputerRpc` deps 加可选项 `instabox?: { machines: InstaboxMachines; machineId(): string | null | undefined }`：有它时，在原有「参数→控制门→读机器」顺序不变的前提下，读 `machineId()` 并调用 `runInstaboxComputerTool`；没有它时行为完全不变。现有测试全部照过。
3. 测试：假服务记录收到的 exec/文件请求，逐个工具断言命令里带 DISPLAY=:1、参数正确转义（含引号、换行、中文的 type_text）、截图返回 image、后台 exec 与 exec_status 全流程、复制越界被拒、机器 409 时由 machines 处理（用假 InstaboxMachines 即可）。`cloudComputerRpc` 带 instabox 时走新分支、不带时走旧分支各一条。

## 验收
按「共同约定 · 测试」执行；report.md 只写实际改过的文件，写明 `cloudComputerRpc` 新增 deps 的确切签名（⑤ 要照着接）。

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
