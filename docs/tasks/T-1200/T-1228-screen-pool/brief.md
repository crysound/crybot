## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1228 多屏云电脑 子任务 A：T-1228-screen-pool

台账 T-1228，仓库 crybot，分支 `T-1228-screen-pool`。中文汇报写进 docs/tasks 下本任务的 report.md。不提交 git。

## 通用要求(每个任务说明都抄进去)：
- 公开仓库，不写内部域名、IP、邮箱、人名、密钥。
- 不提升 `IMAGE_LAYER_VERSION`，不改 `server/vps-computer.ts`。
- 只有 T-1228-wiring 能改 `server/index.ts`。其他任务需要接线的地方只导出函数，不自己接。
- 每个任务都要通过：`pnpm exec tsc -b`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm lint`、自己任务的 vitest 文件。本机跑加 `systemd-run --scope -q -p MemoryMax=4G --`，以 Actions 为准。改完推分支、开草稿 PR 跑 Actions。
- 标「新建」的文件目前不存在，其余都已核对存在。
- 把文末附录的执行规格原样保存为 `docs/specs/2026-11-14-multi-screen.md`(只这一个任务做)。

## A. 屏池与设置 — `T-1228-screen-pool`

批次：第一批。after：无。估时：0.5 天。

文件：
- `server/local-vm-screens.ts`(新建)
- `server/local-vm-screens.test.ts`(新建)
- `server/local-vm-settings.ts`
- `server/container-limits.ts`
- `server/config.test.ts`(只追加 `screens` 和默认资源的用例)

接口契约：

```ts
// server/local-vm-screens.ts
export const MAX_SCREENS = 4;
export type ScreenNumber = 1 | 2 | 3 | 4;
export type ScreenState = "off" | "starting" | "ready" | "stopping" | "failed";
export interface ScreenSlot { screen: ScreenNumber; state: ScreenState; botId: string | null; lastBotId: string | null; lastActiveAt: number; startedAt: number | null; failure?: string }
export interface ScreenAssignment { botId: string; screen: ScreenNumber; assignedAt: number; lastActiveAt: number }
export interface ScreenWaiter { botId: string; threadId: string; generation: number; enqueuedAt: number }
export interface ScreenPoolSnapshot { screens: number; slots: ScreenSlot[]; waiters: Array<{ botId: string; threadId: string; position: number; enqueuedAt: number }> }
export interface ScreenPoolDeps {
  now?: () => number;
  idleMs: number;
  startScreen(screen: ScreenNumber): Promise<void>;
  stopScreen(screen: ScreenNumber): Promise<void>;
  isBusy(screen: ScreenNumber): boolean;
  onChange?(snapshot: ScreenPoolSnapshot): void;
  onAllOff?(): void;
  onAnyOn?(): void;
  persist?(affinity: Record<string, ScreenNumber>): void;
}
export class LocalVmScreenPool {
  constructor(screens: number, deps: ScreenPoolDeps, affinity?: Record<string, ScreenNumber>);
  setScreens(n: number): { stopping: ScreenNumber[] };
  setIdleMs(ms: number): void;
  assigned(botId: string): ScreenNumber | null;
  request(waiter: ScreenWaiter): { screen: ScreenNumber } | { queued: true; position: number };
  waitFor(waiter: ScreenWaiter, signal: AbortSignal): Promise<ScreenNumber>;
  cancel(botId: string, threadId: string): void;
  waitPosition(botId: string, threadId: string): number | null;
  estimateMs(): number | null;   // 最早一块屏到空闲回收的剩余时间
  touch(botId: string): void;
  release(botId: string, reason: "idle" | "removed" | "shutdown" | "recreate"): void;
  stopAll(reason: "shutdown" | "recreate"): Promise<void>;
  snapshot(): ScreenPoolSnapshot;
}
export function readScreenAffinity(dataDir: string): Record<string, ScreenNumber>;
export function writeScreenAffinity(dataDir: string, affinity: Record<string, ScreenNumber>): void; // 文件名 local-vm-screens.json

// server/local-vm-settings.ts
// localVmConfigSchema 加 screens: z.number().int().min(1).max(4).optional()
export function localVmScreens(config: unknown): number;          // 共享模式未设置时 4；非共享模式恒 1
export function localVmResources(config: unknown, host?: { cpus: number; memoryGb: number }): { memoryGb: number; cpus: number };
// 共享模式未设置：{8,3} 夹到 cpus<=host.cpus、memoryGb<=host.memoryGb-2；per-bot/pool 仍 DEFAULT_DESKTOP_RESOURCES

// server/container-limits.ts
export const SHARED_DESKTOP_RESOURCES = { memoryGb: 8, cpus: 3 };
export const MULTI_SCREEN_PIDS_LIMIT = 8192;
export const MULTI_SCREEN_SHM = "2g";
export function clampDesktopResources(r: { memoryGb: number; cpus: number }, host: { cpus: number; memoryGb: number }): { memoryGb: number; cpus: number };
```

要点：分配顺序为已有分配 → 亲和空闲屏 → 从未用过 → 最久未用空闲屏 → 排队；先来先到；`setScreens` 缩屏时忙的屏等释放后再停；所有屏停掉调 `onAllOff`，第一块屏启动调 `onAnyOn`。用假时钟测，不起真实计时器。

验收：
- `pnpm vitest run server/local-vm-screens.test.ts server/config.test.ts`
- 用例至少覆盖：两个机器人分到不同屏；第 5 个排队且位置为 1，释放后自动拿到；回来分回原屏；空闲 10 分钟回收但保留亲和；缩屏；`onAllOff`/`onAnyOn` 次数；2 核宿主夹到 2 核；per-bot/pool 默认仍 4G/2 核。
- `tsc -b`、`tsc -p tsconfig.server.json`、`pnpm lint`。

---

# 附录：执行规格全文

# 让共享云电脑支持一个容器多块虚拟屏(T-1228)


## 合同

### 结果

- 共享模式(`localVm.mode = "shared"`)的那一个云电脑容器里，最多同时开 4 块互相隔离的虚拟屏。每个智能体固定占一块屏、用独立的 Linux 用户，看不到别的屏的文件和浏览器登录。
- 4 块屏都有人在用时，第 5 个智能体在对话里看到「正在排队，第 N 位」，有屏空出来后自动接上继续干活，不用人点。
- 某块屏 10 分钟没有活动就关掉这块屏(进程停掉，文件和登录保留)；同一智能体回来时尽量分回原来那块屏。最后一块屏关掉后，整个容器按现有的空闲休眠逻辑再等一段时间后休眠，和今天一样。
- 界面上能看到屏幕列表，能在各屏之间切换观看，能单独接管某一块屏(只暂停那块屏上的智能体，其他屏不受影响)，手机端也能接管。
- 共享模式默认资源提到 8G 内存、3 核(超过宿主机上限时自动夹到上限)。
- `screens = 1` 时行为、端口、用户、套接字、观看地址、接管键与今天完全一致；独占模式(per-bot)和池模式(pool)不受影响。

### 验收

每条都能在 GitHub Actions 上跑(假 docker CLI + 整服务进程的 E2E，沿用 `server/group-local-vm.e2e.test.ts` 的写法)：

1. 两个智能体同时操作不串屏：两个机器人各发一轮要用电脑的消息，断言两轮分到不同屏(资源键 `computer:vm:shared:s1` 与 `computer:vm:shared:s2`)，各自 MCP 桥接的 exec 参数里用户、`DISPLAY`、套接字分别是 `crybot-s1`/`:1`/`/run/user/61001/crybot-cua.sock` 和 `crybot-s2`/`:2`/`/run/user/61002/crybot-cua.sock`，互不出现对方的值。
2. 4 屏占满时第 5 个排队：`screens=4`，4 个机器人占住 4 屏(轮次挂起不结束)，第 5 个机器人的轮次收到排队消息(含位置 1)和 `turn.wait_started` 事件；释放其中一屏后，第 5 个自动拿到这块屏、收到 `turn.wait_ended` 并完成轮次，全程无人工操作。
3. 接管一块屏不影响其他屏：两个机器人在 s1、s2 上跑，人通过 `POST /api/bots/:id/computer/control` 接管 s1；断言 s1 上的轮次暂停(工具调用被挡)，s2 上的轮次照常完成；交还后 s1 继续。
4. `screens=1` 与今天一致：同一套断言跑旧路径——资源键 `computer:vm:shared`、exec 用户 `cua`、`DISPLAY=:1`、套接字 `/run/user/1000/crybot-cua.sock`、观看目标 `local/shared`、接管键 `desktop:local/shared`、`docker run` 参数与改动前快照一致(不带分屏标签和初始化脚本)。现有 `server/group-local-vm.e2e.test.ts`、`server/desktop-updates.e2e.test.ts` 不改断言照样通过。
5. 空闲回收：把单屏空闲时间用测试环境变量缩到秒级，断言无活动的屏被停(`supervisorctl stop screen-s2:*` 被调用)、亲和记录保留；同一机器人再来时分回 s2；所有屏都停后才启动容器级空闲计时。
6. 隔离(真实容器，可选工作流)：在 Actions 的 ubuntu 机器上真起镜像，断言 `crybot-s2` 读不了 `crybot-s1` 的 HOME 和工作目录、连不上 s1 的 cua-driver 套接字、用 s1 的 VNC 口令以外的口令连不上 s1；环境里没有 `VNC_PW`。
7. 现有检查全绿：`tsc -b`、`tsc -p tsconfig.server.json`、`pnpm lint`、`pnpm i18n:check`、`pnpm check:brand`、vitest 全部分片。

### 范围

做：
- 共享模式原地升级，加设置 `localVm.screens`(1–4)。
- 容器内多屏布局：每屏一个 Xvnc、dbus、桌面会话、cua-driver 套接字、独立用户；一个 websockify 按令牌分发到各屏。
- 屏幕池：分配、亲和、排队、单屏空闲回收、与容器空闲休眠衔接。
- 服务端：电脑路由、select_computer 提示、MCP 路由到所在屏的套接字、观看目标、接管按屏。
- 宿主侧访问工作区文件(附件、应用托管、发布页面、页面打包、密钥卡片投递、浏览器资料抢救)按屏走。
- 前端：屏幕列表、切换、单屏接管、手机接管入口；设置页加屏数。
- 默认资源调整为 8G/3 核(仅共享模式)。
- 测试：单元、假 docker E2E；可选的真实容器工作流。

不做：
- 不改独占模式、池模式的容器结构和默认资源(仍 4G/2 核)。
- 不改 VPS 云电脑(`server/vps-computer.ts`)，不提升 `IMAGE_LAYER_VERSION`。
- 不做一个智能体占多块屏、不做屏幕之间拖文件。
- 不改原生手机端代码(它们只消费服务端给的 `socketPath`)。
- 不做排队插队、优先级、提前抢占空闲屏(见补充决定 3)。

### 约束

- 公开仓库：代码、注释、文档里不得出现内部域名、IP、邮箱、人名、密钥。
- 不提升 `IMAGE_LAYER_VERSION`：一提升 VPS 云电脑就会被标成过期，而它的替换会删文件、需要人工处理。多屏布局通过容器启动命令(初始化脚本，仿照 `server/container-isolation.ts` 里 `GUEST_IDS_SCRIPT` 的做法)和新标签 `com.crybot.screens-layout` 下发，镜像本身不变。
- 宿主端口仍只发布一个 `127.0.0.1:<port>->6901`，`dockerPortsAreLocal`/`applePortsAreLocal` 的判定不放宽。
- 已有的加固不退：`--cap-drop ALL` 加白名单能力、`--ipc private`、`--cgroupns private`、根映射为宿主 root 时的 `no-new-privileges`、`keep-id` 用户映射。
- 只有一个子任务改 `server/index.ts`(T-1228-wiring)。
- 本机跑测试/构建加 `systemd-run --scope -q -p MemoryMax=4G --` 前缀，前端相关 `--mem 4G`；以 Actions 结果为准。
- 不得在日志、事件、接口返回里明文带出 VNC 口令，只在需要连接的那一次 join/观看响应里返回给有权限的人(与今天一致)。

### 停止条件

遇到以下情况停下来问：
- 需要提升 `IMAGE_LAYER_VERSION` 或改动 VPS 云电脑镜像。
- 需要放宽端口发布判定、加回 `--privileged` 或额外的 Linux 能力。
- 要改上面五条已定的决定(如每屏多个智能体、屏数超过 4、换成一智能体一容器)。
- 补充决定 1–4 在实现中被证明不可行。
- 真实容器测试显示 8G 内存下 4 屏同时跑浏览器会被内核 OOM 杀进程且无法通过调参解决。
- 迁移会丢失现有工作区文件或浏览器登录。

### 已定的决定

用户 2026-11-14 定(T-1228，不再讨论)：
1. 一个容器多块虚拟屏，最多 4 块。
2. 满了排队，有空屏自动接上，对话里显示在排队。
3. 每个智能体固定一块屏；空闲 10 分钟回收；回来尽量给原来那块。
4. 每屏一个独立 Linux 用户，屏之间互相看不到文件和浏览器登录。
5. 云电脑默认资源调到 8G 内存、3 核(宿主 4 核 16G)。

用户同日一并确认：单屏 10 分钟无活动关闭；最后一块屏关后整个容器再按现有逻辑休眠；界面要屏幕列表、切换屏幕、单独接管某屏(只暂停那块)、手机接管；现有共享单屏、独占、池模式不能坏。

主会话 2026-11-14 定：在共享模式上原地升级，`screens=1` 等同今天。

补充决定(主会话 2026-11-14 按建议定)：
1. 8G/3 核只作用于共享模式的默认值；独占、池模式仍 4G/2 核(池模式 2 台 x 8G 会超过宿主内存)。
2. 多屏布局下 `cua` 不再有无限制 sudo，屏幕用户也没有 sudo；装软件改走受限助手 `/usr/local/sbin/crybot-pkg`(只允许 `apt-get install` 合法包名，由 root 执行，记日志)。`screens=1` 保持今天的 sudo。
3. 排队严格按 10 分钟空闲回收，不在有人排队时提前回收(提前回收会打断短暂停顿的智能体)；排队消息里给出预计等待。
4. 切到多屏时旧工作区顶层文件原样保留，屏幕用户看不到，宿主侧功能和管理员仍可访问；`cua` 的浏览器资料迁给 s1 作为初始资料。

### 来源

- 设计方案：T-1228 多屏方案页(主会话已发用户确认)。
- 台账项目：crybot。
- 相关任务：T-1228(本任务)、T-1206(改名，许可文本必须保留)。
- 现有机制：`server/turn-resources.ts`(独占资源 + 先来先到排队)、`server/computer-wait.ts`(排队文案)、`server/local-vm-seat-pool.ts`(亲和)、`server/computer-idle.ts`(空闲计时)、`server/desktop-updates.ts`(过期容器自动重建且保留工作区和登录)、`server/host/shared-vm-control.ts`(共享机接管)。

---

## 设计

### 1. 目标与非目标

目标：同一容器内最多 4 个智能体并行用电脑，彼此隔离；满了排队自动接上；单屏可接管；单屏模式零变化。

非目标：多容器横向扩展(那是池模式)、跨屏协作、屏数超过 4、VPS 云电脑多屏。

### 2. 两级目标(target)

| 层级 | 用途 | key | 容器名 | 观看目标 id | 资源键 | 接管键 |
|---|---|---|---|---|---|---|
| 容器 | 生命周期、状态、镜像更新、容器空闲 | `shared` | `crybot-computer` | `local/shared`(仅单屏) | `computer:vm:shared`(仅单屏) | `desktop:local/shared`(仅单屏) |
| 屏 N(1–4，多屏布局) | 智能体分配、MCP、观看、接管、截图、执行命令 | `shared:sN` | 同上 | `local/shared-sN` | `computer:vm:shared:sN` | `desktop:local/shared-sN` |

- `LocalVmTarget`(`server/container-computer.ts`)加可选字段 `screen?: number`。屏目标与容器目标共用 `containerName`、`workspaceDir`、`viewerPort`、`label`。
- 新函数：`sharedScreenTarget(n: number): LocalVmTarget`、`containerTargetOf(t: LocalVmTarget): LocalVmTarget`(屏目标返回 `SHARED_LOCAL_VM_TARGET`，其他原样返回)、`isScreenTarget(t): t is LocalVmTarget & { screen: number }`。
- 所有「是不是共享机」的判断(`target.key === SHARED_LOCAL_VM_TARGET.key`)改成先 `containerTargetOf`。容器状态缓存(`server/container-status-cache.ts`)按容器 key 缓存，屏目标不另起探测。
- `server/managed-policy.ts` 的 `computerKindForResource` 按前缀 `computer:vm:` 判断，屏资源键天然归为本机云电脑，不用改。

### 3. 数据结构(新建 `server/local-vm-screens.ts`)

```ts
export const MAX_SCREENS = 4;
export type ScreenNumber = 1 | 2 | 3 | 4;
export type ScreenState = "off" | "starting" | "ready" | "stopping" | "failed";

// 屏池状态：每块屏一条
export interface ScreenSlot {
  screen: ScreenNumber;
  state: ScreenState;
  botId: string | null;        // 当前分配给谁
  lastBotId: string | null;    // 亲和：上次用它的机器人
  lastActiveAt: number;        // 最近活动时间(毫秒)
  startedAt: number | null;
  failure?: string;            // 启动失败原因(不含口令)
}

// 屏分配记录：每个机器人最多一条
export interface ScreenAssignment {
  botId: string;
  screen: ScreenNumber;
  assignedAt: number;
  lastActiveAt: number;
}

// 排队项
export interface ScreenWaiter {
  botId: string;
  threadId: string;
  generation: number;
  enqueuedAt: number;
}

export interface ScreenPoolSnapshot {
  screens: number;                       // 当前设置的屏数
  slots: ScreenSlot[];
  waiters: Array<{ botId: string; threadId: string; position: number; enqueuedAt: number }>;
}

export interface ScreenPoolDeps {
  now?: () => number;
  idleMs: number;                              // 单屏空闲，默认 10 分钟
  startScreen(screen: ScreenNumber): Promise<void>;
  stopScreen(screen: ScreenNumber): Promise<void>;
  isBusy(screen: ScreenNumber): boolean;       // 有轮次持有该屏资源或人在接管
  onChange?(snapshot: ScreenPoolSnapshot): void;
  onAllOff?(): void;                           // 最后一块屏停掉：启动容器空闲计时
  onAnyOn?(): void;                            // 有屏开始用：取消容器空闲计时
  persist?(affinity: Record<string, ScreenNumber>): void;
}

export class LocalVmScreenPool {
  constructor(screens: number, deps: ScreenPoolDeps, affinity?: Record<string, ScreenNumber>);
  setScreens(n: number): { stopping: ScreenNumber[] };  // 缩屏：多出来的屏空闲时停，忙的等释放后停
  setIdleMs(ms: number): void;
  assigned(botId: string): ScreenNumber | null;
  request(waiter: ScreenWaiter): { screen: ScreenNumber } | { queued: true; position: number };
  waitFor(waiter: ScreenWaiter, signal: AbortSignal): Promise<ScreenNumber>; // 排到后 resolve
  cancel(botId: string, threadId: string): void;
  waitPosition(botId: string, threadId: string): number | null;
  touch(botId: string): void;                  // 工具调用、观看输入、接管时调用
  release(botId: string, reason: "idle" | "removed" | "shutdown" | "recreate"): void;
  stopAll(reason: "shutdown" | "recreate"): Promise<void>;
  snapshot(): ScreenPoolSnapshot;
}
```

分配顺序：已有分配 → 空闲且 `lastBotId` 是自己的屏 → 从没用过的屏 → 最久没用的空闲屏 → 排队。同一机器人多个会话共用它的那块屏，会话之间的互斥继续由 `TurnResources` 在 `computer:vm:shared:sN` 上做(与今天单屏相同)。

排队：屏池自己维护先来先到队列(`TurnResources` 只能表达单个独占资源，表达不了「4 选 1」)。轮次侧的等待文案、`turn.wait_started`/`turn.wait_ended` 事件、等待上限后挂起(`ComputerWaitParked`)、有空屏自动恢复，全部复用 `bindTurnComputer` 那一套，只是在它前面多一步「拿屏」。预计等待取各屏最近 `lastActiveAt + idleMs` 中最早的那个与 `TurnResources.waitEstimateMs` 的较小值。

亲和持久化：`lastBotId` 映射写到数据目录 `local-vm-screens.json`(只有机器人 id 和屏号)，服务重启后保留；容器被重建时保留亲和、清空运行态。

### 4. 容器内进程布局

`screens=1`(单屏布局)：与今天完全相同，不加初始化脚本、不加分屏标签。

多屏布局(`screens` 为 2–4 时容器以多屏布局创建；2、3、4 之间切换不重建容器)：

| 项 | 屏 N |
|---|---|
| 用户 | `crybot-sN`，uid/gid `61000+N`，无 sudo，不在 `cua` 组 |
| HOME | `/home/crybot-sN`(0700) |
| 工作目录 | `/home/cua/workspace/screens/sN`(属主 `crybot-sN`、属组 `cua`，2770，umask 007)；HOME 下 `workspace` 软链接到它，执行命令的 `-w` 用真实路径 |
| 运行目录 | `/run/user/61000+N`(0700)，`TMPDIR` 设到其下 `tmp/` |
| 显示 | Xvnc `:N`，`-rfbport 590N`，`-localhost yes`，`-rfbauth` 指向该屏口令文件 |
| 会话总线 | dbus `unix:path=/run/user/61000+N/bus` |
| 桌面 | 该用户的 xfce 会话，`DISPLAY=:N` |
| cua-driver | `cua-driver serve --socket /run/user/61000+N/crybot-cua.sock --permission-mode standard --grant existing-profile`，以 `crybot-sN` 运行 |
| supervisor 组 | `screen-sN`(含 `x`、`dbus`、`session`、`cua` 四个程序)，`autostart=false`，由服务端 `supervisorctl start/stop screen-sN:*`(exec -u root)按需起停 |
| 口令 | 每屏独立随机 8 字符(VNC 认证只用前 8 位)，屏启动时由服务端经标准输入交给 root 写入 `/run/crybot/screens/sN/passwd`(属主 `crybot-sN`，0400)，不进命令行参数和环境变量；服务端内存保存一份，重启后经 root exec 读回 |
| 截图 | 写到 `/run/user/61000+N/crybot-preview.png`，不再用共享 `/tmp` |

- 观看：仍是一个 websockify 监听 6901，改为 `--token-plugin TokenFile --token-source /etc/crybot/vnc-tokens`，令牌文件固定 `s1: 127.0.0.1:5901` … `s4: 127.0.0.1:5904`。令牌不是密钥，屏之间靠各自的 VNC 口令隔离。宿主端口不变。
- 原来 `cua` 的 `vncserver :1`、dbus、cua-driver 在多屏布局下不启动；`/home/cua` 改 0711，`/home/cua/.vnc` 改 0700；`/home/cua/workspace` 改 0711。
- 初始化脚本(新建 `server/container-screens.ts` 生成)负责：建用户和目录、去掉 `cua` 的无限制 sudo 并装 `crybot-pkg`、写令牌文件、生成四个 supervisor 组、给屏幕用户设 `oom_score_adj=500` 和每用户进程数上限、`env -u VNC_PW` 启动 supervisord 的子进程。脚本作为容器启动命令，最后 `exec supervisord`(与 `GUEST_IDS_SCRIPT` 同法)，Docker 下与 `GUEST_IDS_SCRIPT` 串联。
- 多屏布局资源参数：`--shm-size 2g`、`--pids-limit 8192`；单屏不变。

### 5. 服务端接口改动

- 设置(`server/local-vm-settings.ts`)：`localVmConfigSchema` 加 `screens: z.number().int().min(1).max(4).optional()`，导出 `localVmScreens(config): number`(未设置时共享模式默认 4)；共享模式 `localVmResources` 未设置时默认 `{ memoryGb: 8, cpus: 3 }`，夹到宿主上限(核数不超过宿主核数，内存不超过宿主内存减 2G)。
- 设置路由(`server/routes/config.ts`)：接受 `localVm.screens`；1↔多屏切换走与模式切换相同的「有轮次在跑就拒绝」保护，并触发容器按需重建；2/3/4 之间切换只调用 `screenPool.setScreens`。
- 电脑路由(`server/routes/computers.ts`)：
  - `GET /api/local-computer` 返回体加 `screens: ScreenPoolSnapshot` 的公开形式(见第 6 节 `ScreenListPayload`)，不含口令。
  - 新增 `POST /api/local-computer/screens/:n/screenshot`、`POST /api/local-computer/screens/:n/join`(管理员；后者返回该屏的 `socketPath` 和口令)。
  - `GET /api/bots/:id/local-computer`、`POST /api/bots/:id/local-computer/join`：多屏布局下指向该机器人当前所在屏；未分配时返回 `409 { error: "screen_not_assigned" }`。
  - `run/start/stop/remove/pull` 仍作用于容器目标。
- 接管(`POST /api/bots/:id/computer/control`)：`target` 可为 `local/shared-sN`，`sharedVm.holdKey` 按屏给键，人只占 `computer:vm:shared:sN`；其他屏的资源不受影响。
- `server/host/shared-vm-control.ts`：新增 `screenControlKey(n)`、`screenResource(n)`、`screenViewer(n)`，`keyFor/holdKey/leaseKey/heldOnTarget` 能识别屏目标。
- MCP：`containerComputerMcp(runtime, control, target, lazy)` 对屏目标传该屏的套接字和执行身份；`server/container-mcp.ts` 的套接字校验放宽到 `/run/user/1000/` 或 `/run/user/6100[1-4]/`，并接收用户、`DISPLAY`、`HOME`、`XDG_RUNTIME_DIR` 参数(参数有白名单校验)。
- 执行命令和截图：`containerExec`、`containerComputerFrame` 对屏目标以 `crybot-sN` 身份、`DISPLAY=:N`、该屏工作目录执行。
- 观看代理：
  - `shared/desktop-viewer.ts` 的 `DESKTOP_VIEWER_TARGET` 和 `server/routes/desktop-viewer.ts` 的 `ROUTE` 增加 `shared-s[1-4]`。
  - `DesktopConnection` 加可选 `path?: string`(默认 `/websockify`)，屏目标用 `/websockify?token=sN`；本机直连的 `joinUrl` 加 `path=` 参数。
  - `server/desktop-viewer-targets.ts` 按屏返回端口、口令、`live`、`touch`(touch 同时 `screenPool.touch`)。
  - 池模式拒绝手机接管的规则不变；屏目标允许手机接管。
- select_computer：`server/surface.ts` 的提示词说明「你在第 N 块屏上，其他屏属于别的智能体」，不暴露其他屏信息。
- 轮次(`server/index.ts`)：`claimAutoLocalVm` 和群聊里的电脑认领在共享多屏布局下先 `screenPool.request`，排队则复用 `bindTurnComputer` 的等待文案和挂起；拿到屏后 `bindTurnComputer("computer:vm:shared:sN")`，确保屏已 `ready`，`attachLocalVm` 挂上该屏的 MCP。
- 空闲：每屏一个 `ComputerIdleTimer`(10 分钟，测试可用环境变量 `CRYBOT_SCREEN_IDLE_MS` 改小)，到点 `stopScreen` 并 `release`；屏池 `onAllOff` 时才启动现有容器空闲计时(`idleTimeoutMinutes` 逻辑不变)，`onAnyOn` 时取消。
- 恢复：`recoverLocalVms` 启动时对多屏容器读回各屏运行态(`supervisorctl status`)，有运行但无主的屏直接停掉。

### 6. 前端改动

- 公开载荷(服务端定义、前端消费)：

```ts
export interface ScreenListPayload {
  layout: "single" | "multi";
  screens: number;
  slots: Array<{
    screen: number;
    state: "off" | "starting" | "ready" | "stopping" | "failed";
    bot: { id: string; name: string } | null;
    viewerTarget: string;          // local/shared-sN
    controlledByPerson: boolean;
    idleSeconds: number | null;
  }>;
  queue: Array<{ bot: { id: string; name: string }; position: number; waitingSeconds: number }>;
}
```

- `src/components/LocalComputerSection.tsx`：共享模式下加「屏数」选择(1–4)，显示资源默认值 8G/3 核。
- 新建 `src/components/LocalVmScreens.tsx`：屏幕列表(每屏状态、在用的智能体、空闲时长、排队列表)，点某屏切换观看，「接管这块屏」按钮。
- `src/components/ComputerPanel.tsx`：`liveTarget` 用 `vmStatus` 返回的该机器人所在屏的 `viewerTarget`；接管只发该屏目标；会话里显示排队状态(复用现有等待消息展示)。
- `src/components/remote-desktop-panel.tsx`：join 走屏目标；手机接管入口同。
- 文案进 `src/locales/en.json`、`src/locales/zh.json`，再跑 `node scripts/generate-locale.mjs` 生成其他语言。
- 原生手机端、`companion/src/viewer-relay.ts` 不改(它们只用服务端返回的 `socketPath`，`BOT_JOIN_PATH` 不变)，`companion/test/viewer-relay.test.ts` 回归通过即可。

### 7. 兼容与迁移

- 旧配置没有 `screens`：共享模式按默认 4(补充决定待确认时可临时改默认 1)。切换由 `server/desktop-updates.ts` 识别为 `recreate` 需求(新标签 `com.crybot.screens-layout` 不符)，沿用现有「空闲时自动重建、保留工作区和浏览器登录」的路径；有轮次在跑时等其结束。
- 迁移步骤(单屏 → 多屏，重建前后)：
  1. 重建前 `keepFirefoxProfileBeforeRemove`、`keepInstalledAppsBeforeRemove` 照旧。
  2. 新容器初始化后，把 `cua` 的浏览器资料复制给 s1(`/home/cua/workspace/screens/s1/.browser-profiles`)，属主改为 `crybot-s1`。
  3. 旧工作区顶层文件原样保留(补充决定 4)。
- 多屏 → 单屏：重建为单屏布局，`screens/` 目录保留不删，`cua` 资料不被覆盖。
- 独占、池模式：不加标签不加脚本，`server/local-vm-seat-pool.ts` 行为不变。
- 镜像层版本不变，VPS 云电脑不受影响。
- Apple container 运行时、Windows podman：初始化脚本只用 POSIX sh 和镜像自带工具；不支持多屏时(探测 `supervisorctl`/`useradd` 失败)回退为单屏并在设置页提示。

### 8. 资源与空闲回收

- 共享模式默认 8G/3 核，夹到宿主上限；4 屏预算约每屏 1.5G + 系统 2G。
- 每屏 `oom_score_adj=500`，内存吃紧时内核先杀屏幕用户进程而不是 supervisord、websockify。
- `--shm-size 2g`、`--pids-limit 8192`、每用户进程数上限 1500。
- 单屏 10 分钟无活动关闭。「活动」= 该屏 MCP 工具调用、观看端输入、有轮次持有该屏资源、人在接管。
- 关屏 = 停掉 `screen-sN` 组的进程，文件和登录保留，亲和保留。
- 最后一块屏关后，容器按现有空闲休眠逻辑处理。

### 9. 安全

- 屏之间：独立 uid、HOME 0700、工作目录 2770(属组 `cua`，屏幕用户不在该组)、运行目录 0700(套接字在其中)、私有 `TMPDIR`、截图在私有目录、每屏独立 VNC 口令且 Xvnc 只听容器内回环。
- `VNC_PW` 不进入屏幕用户的进程环境(supervisord 子进程、`exec` 都显式去掉)。
- 多屏布局去掉 `cua` 的 `NOPASSWD:ALL`，装软件走 `crybot-pkg`(只收 `^[a-z0-9][a-z0-9+.-]*$` 的包名)。
- 能力白名单不变(初始化脚本建用户、改属主需要的 `CHOWN`、`SETUID`、`SETGID`、`FOWNER` 本来就有)。
- 剩余风险：同一容器共享内核和 `/proc`，屏幕用户能看到别人的进程名(加 `hidepid` 需要能力，不做)，写入规格作为已知限制。
- 接口：屏的 join/截图只给有该机器人权限的人或管理员；口令只在 join 响应里出现。

### 10. 风险预演(半年后失败了，原因是什么)

| # | 失败原因 | 早期信号 | 对策 |
|---|---|---|---|
| 1 | 宿主侧功能读写不到屏幕用户的文件：屏目录属主是映射后的从属 uid，宿主进程(非 root 运行时)读不到 0600 文件、写进去的文件屏幕用户又读不到，附件、发布页面、密钥卡片投递静默失败 | 多屏下附件为空、发布页 404、密钥卡片「已投递」但智能体读不到 | 目录 2770 + 属组 `cua` + umask 007 让宿主可读大部分文件；写入和读私有文件统一走 `exec -u crybot-sN`(新建 `server/screen-files.ts`)；E2E 覆盖附件和密钥卡片 |
| 2 | 去掉 `cua` 的 sudo 后，智能体装不了软件，用户觉得「多屏后变笨了」 | 对话里出现 `sudo: command not found`/权限拒绝 | `crybot-pkg` 受限安装助手；提示词告诉智能体用它；保留安装软件持久化(`keepInstalledAppsBeforeRemove`)；补充决定 2 让用户确认 |
| 3 | 4 屏同时开浏览器把 8G 吃满，内核杀掉 supervisord 或 websockify，全部屏一起掉 | 容器内存长期 > 85%、`dmesg` 出现 OOM | 屏幕用户 `oom_score_adj=500`、每用户进程数上限；状态页显示每屏内存；`screen-sN` 组单独 `autorestart`；真实容器工作流跑 4 屏开浏览器压测 |
| 4 | 第 5 个智能体排很久：4 块屏都被「分配但没在干活」的智能体占着，要等满 10 分钟 | 排队消息里预计等待接近 10 分钟、用户抱怨卡住 | 排队消息给出预计时间；轮次结束后屏立即进入空闲计时(不是等会话结束)；保留以后加「有人排队时提前回收」的开关(补充决定 3) |
| 5 | 一屏的口令或环境泄漏让人控制别的屏：`VNC_PW` 在容器环境里，被 `exec` 或 supervisord 子进程继承 | 屏幕用户 `env` 里能看到 `VNC_PW` | 每屏独立口令、只经标准输入写文件；所有屏程序和 `exec` 去掉 `VNC_PW`；Xvnc `-localhost yes`；真实容器测试断言 |
| 6 | 迁移时重建容器丢浏览器登录或工作区，或者误提升镜像层版本把 VPS 云电脑标成过期 | 升级后用户需要重新登录网站；VPS 云电脑出现「需要替换」 | 不提升 `IMAGE_LAYER_VERSION`，用标签 + 初始化脚本；复用 `desktop-updates` 的保留路径；`server/desktop-updates.test.ts` 加断言：VPS 不因此过期 |
| 7 | `/dev/shm` 或进程数耗尽：多个浏览器共享 512m shm、4096 进程上限 | 浏览器标签页崩溃、`fork: retry` | 多屏布局 `--shm-size 2g`、`--pids-limit 8192`、每用户上限 |
| 8 | 屏的运行态与服务端记录不一致(服务重启、容器被外部重启)：服务端以为 s2 空着又分给别人，而上一个人的进程还在 | 同一屏出现两个智能体的窗口 | 启动和每次分配前用 `supervisorctl status` 对账；分配到「运行但无主」的屏先停再起；重建后清空运行态只留亲和 |
| 9 | 观看代理路径/令牌不匹配导致某些客户端(手机、伴侣中继)连不上屏 | 手机接管黑屏、中继 404 | `DesktopConnection.path` 统一由服务端给出；`socketPath` 带完整路径；`scripts/verify-desktop-viewer.ts` 和 `companion/test/viewer-relay.test.ts` 回归 |
| 10 | 小宿主上 `--cpus 3` 被 docker 拒绝，云电脑起不来 | `docker run` 报 `range of CPUs is from 0.01 to N` | 默认值夹到宿主核数；单元测试覆盖 2 核宿主 |

最可能的失败：#1(宿主侧文件访问)。最危险的失败：#3(一屏 OOM 拖垮全部)和 #5(跨屏控制)。隐藏的假设：容器内 uid 61001–61004 在 podman 的从属 uid 范围内(默认 65536 个，满足)；Apple container 运行时能跑初始化脚本(未验证，失败回退单屏)。

### 11. 上线前检查清单

- [ ] Actions 全绿，含新 E2E `server/local-vm-screens.e2e.test.ts`(新建)。
- [ ] 可选真实容器工作流在 ubuntu 机器上通过(隔离、口令、套接字)。
- [ ] 本机预览环境：4 屏同时开浏览器 15 分钟，容器内存峰值和 OOM 记录截图。
- [ ] 单屏 → 多屏迁移后浏览器登录仍在、工作区文件在。
- [ ] VPS 云电脑状态没有变成过期。
- [ ] 手机端接管某一屏成功，其他屏智能体照常干活。

## 里程碑

- [ ] 第一批合并 — 屏池、容器多屏布局、观看目标、界面四个分支各自单测通过并合并，`screens` 尚未接线，线上行为不变。
- [ ] 第二批合并 — 屏文件访问分支合并。
- [ ] 接线合并 — `server/index.ts` 接线和 E2E 合并，`screens=1` 回归通过，`screens=4` 的 4 条验收 E2E 通过。
- [ ] 预览验证 — 本机预览环境 4 屏实测、迁移实测、手机接管实测通过。
- [ ] 上线 — 部署后线上核对屏幕列表、排队、接管。

## 进度

状态：未开始
更新：2026-11-14
当前里程碑：第一批合并

### 已完成
- 调研与规格。

### 下一步
- 主会话向用户确认补充决定 1–4，然后派第一批任务。

### 阻塞
- 无。

## 合同变更

(暂无)
