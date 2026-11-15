## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。
- 本仓库是**公开仓库**：代码、测试、文档、报告里不得出现内部域名、IP、邮箱、人名、真实钥匙、沙箱主目录绝对路径。

# T-1248：多屏界面 4 处小问题

## 背景
「一个容器多块虚拟屏」（T-1228）已上线，预览截图里发现 4 处界面问题。下面是已查实的根因和位置（行号以当前 main 为准，可能略有偏移，按内容找）。只修这 4 处，不顺手改别的；「私有桌面」这个产品名本身（相关文案 80 多处）不改。

## 要改的

### 1. 排队等屏的智能体，侧栏显示「正在操作屏幕」
根因：等屏时服务端往对话追加一条进行中的 activity 行，tool 的 name 字段 是英文句子 `Waiting for its turn on this computer — 1st in queue — …`，没有 nameCode（`server/turn-computer-wait.ts` 约 47 行，文案来自 `server/computer-wait.ts` 的 `computerWaitingText`，多屏排队也走这里 `server/local-vm-screen-runtime.ts`）。前端 `src/lib/live-activity.ts` 的 `toolActivityPhrases` 把整句当工具名，用 FALLBACK 正则（约 18 行，含 `computer`）去猜，命中后映射成 「正在操作屏幕」文案。
改法：
- (a) 服务端：等屏行改用 `noticeTool(...)`（`server/chat-notices.ts`）带 nameCode，新增 `chat.notice.waitingForScreen`，英文保持现有句子，参数带 `{position}`（无位置时省略）。
- (b) 前端：`toolActivityPhrases` 识别该 nameCode 时，返回现成的 `vm.screens.queued`（「正在排队，第 {position} 位」/「Queued · Position {position}」），无位置时用 `vm.screens.queue`。`ActivityTool` 类型补 `nameCode` / `nameParams`（如还没有）。
- (c) 兜底：FALLBACK 正则只对不含空格的真工具名生效，带空格的整句不去猜。这样 `chat.notice.wakingComputer`（「Waking the computer…」）也不会再被判成「正在操作屏幕」。
- `src/locales/server-lines.test.ts` 的 PENDING 名单里如有这两句英文，改完后从名单删掉。
测试：`src/lib/live-activity.test.ts`（照内存等待用例加等屏、唤醒两例，以及「带空格句子不走正则」）、`src/components/SidebarWorkingStep.test.ts`、`server/computer-wait.test.ts`、`server/chat-notices.test.ts`、`server/local-vm-screen-runtime.test.ts`（按实际改动挑）。

### 2. 共享多屏模式下屏被标成「私有桌面」「隔离的本地桌面」
根因：标签是静态键，不区分隔离方式和屏数：`src/components/ComputerPanel.tsx`（约 1285 行 `t("vm.dest.vm")` 角标）、`src/components/remote-desktop-panel.tsx`（约 230 行副标题）、`src/components/WorksOnGrid.tsx`（约 16 行，`vm.dest.vm` + `computer.dest.vmDesc`）、`src/components/PlaceChip.tsx`（约 96-97 行）。`/api/config` 已下发 `localVm.screens`（server/index.ts），但前端类型 `src/state/config-status.ts` 没声明该字段。
改法：
- 屏幕面板角标和远程桌面副标题：有屏号（`vmStatus.screen?.screen` 或等价字段）时显示现成的 `vm.screens.number`（「第 {screen} 块屏」/「Screen {screen}」），没有屏号再回退 `vm.dest.vm`。
- `config-status.ts` 类型补 `screens?: number`；隔离方式为 shared 且屏数 > 1 时，WorksOnGrid / PlaceChip 的描述改用新键 `computer.dest.vmScreenDesc`：zh「共享容器里的一块虚拟屏」，en「A screen in a shared container」。单屏或按智能体隔离时保持原样。
测试：`src/components/ComputerPanel.test.ts`（及同前缀测试）、`src/components/remote-desktop-panel.test.ts`、`src/components/PlaceChip.test.ts`、`src/components/PlaceChip.dom.test.ts`、`src/locales/screen-words.test.ts`（按实际改动挑），覆盖多屏和单屏两种情况。

### 3. 侧栏两处英文没翻译
- 「Problems to look at」：服务端写死的对话标题 `server/incidents.ts` 的 `INCIDENTS_THREAD_TITLE`（旧名 `Team incidents`）。侧栏标题走 `src/lib/task-title.ts` 的 `localizedTaskTitle`，只认 `SHARED_CHAT_TITLE` 和 `New thread`。
  改法：把这两个常量挪到 `shared/wire.ts`（和 `SHARED_CHAT_TITLE` 放一起），服务端改为引入；`localizedTaskTitle` 遇到这两个标题返回 `t("task.incidents")`。新键 en `"task.incidents": "Problems to look at"`，zh `"task.incidents": "待处理的问题"`。
- 「no activity for 20 minutes — …」：这一行带 nameCode `chat.notice.stalled`，en 有键，zh.json 缺。补 zh `"chat.notice.stalled": "已有 {minutes} 分钟没有活动，回合已停止"`（另一分支 T-1238 也会加完全相同的这一行，合并时以相同内容去重即可，不要改成别的译文）。
- 只动 en.json 和 zh.json，其余语言文件不碰（项目正在精简为只留 zh/en）。
测试：`src/components/SidebarThreadRow.shared-chat.test.ts`（加 incidents 标题用例，zh 下显示中文）、`src/lib/failed-turn.test.ts`、`server/incidents.test.ts`，以及 `src/locales/words.test.ts`、`src/locales/server-lines.test.ts`。

### 4. 打开设置页时控制台有一条 403
根因：设置「概览」页渲染 `ServerUpdateRow`（`src/components/settings/pages/PlacePages.tsx` 约 82 行），挂载时先请求 `GET /api/updates/check`，install 不是 desktop/managed 就接着请求 `GET /api/updates/server`（`src/components/ServerUpdateRow.tsx`）。服务端 `server/routes/update-check.ts` 的 `mayUpdateServer` 要求 `auth.kind === "session"` 且有 admin——这是有意的安全设计（回环地址可能是机器人的 shell），**服务端不要改**。本机浏览器走 loopback 认证，因此返回 403 `admin_only`。前端 `src/lib/admin-scope.ts` 的 `unlessRefused`/`lacksAdminScope` 只认含 "lacks the admin scope" 的 403，不认 `admin_only`，每次打开设置都会再请求。
改法：
- (a) `useServerUpdate`（或 ServerUpdateRow 内）先读当前会话（`src/lib/session.ts`），只有 `kind === "session"` 且 scopes 含 admin 时才请求 `/api/updates/server`。
- (b) `lacksAdminScope` 同时识别 body `code === "admin_only"`，作为兜底记住拒绝结果。
测试：`src/lib/admin-scope.test.ts`、`src/components/SidebarProfileMenu.server-update.test.ts`、`src/lib/server-update.test.ts`（按实际改动挑），覆盖 loopback 不请求、session+admin 请求、收到 admin_only 后不再请求。

## 验收
1. 上面每条相关的测试文件逐个跑过并贴结果摘要；新增用例覆盖各条的修复点。
2. `pnpm exec tsc -b` 和 `pnpm exec tsc -p tsconfig.server.json` 通过。
3. 对改动文件跑 `pnpm exec oxlint --deny-warnings <改动文件>` 零告警。
4. `node scripts/public-scan/scan.mjs` 对本轮全部改动（含未跟踪文件）零命中。
5. report.md 只列实际改过的文件，和 git status 一致。
