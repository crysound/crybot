# T-1216 提供方锁定报告

已实现 `CRYBOT_PROVIDER_LOCK=1`：运行时仅加载 Claude 自定义端点，统一显示 Cry Bot，保留原始提供方配置以便关闭开关后恢复列表；启动时迁移失效的实例引用，空端点列表不迁移。未执行 git 提交，未安装新依赖，未访问真实应用数据。

## 1. 修改文件

| 文件 | 修改说明 |
| --- | --- |
| `server/provider-lock.ts` | 集中实现开关、端点筛选与品牌覆盖、更新器驱动筛选，以及配置、机器人、任务和定时任务的引用迁移。 |
| `server/claude-endpoint-kind.ts` | 提取无运行时配置依赖的 Claude 自定义端点判定，避免配置模块产生循环初始化依赖。 |
| `server/claude-endpoints.ts` | 复用并重新导出端点判定，保持原有调用接口。 |
| `server/config.ts` | 在运行时实例生成入口应用锁定，保持可持久化配置完整，并支持保存迁移后的 helper 引用。 |
| `server/harness/registry.ts` | 添加实例配置过滤入口，确保后续加载也无法将非端点实例加入 registry 或触发探测。 |
| `server/index.ts` | 接入启动迁移、registry 过滤和更新器驱动筛选，并在配置状态中返回 `providerLock`。 |
| `server/store.ts` | 将备用模型加入 `renameInstances` 的持久化迁移范围。 |
| `server/routes/instances.ts` | 对成员隐藏端点地址，锁定时返回空隐藏列表，并限制提供方变更为首次添加 Claude 端点及检查、刷新操作。 |
| `server/agent-endpoint-models.ts` | 为请求头补上 `Record<string, string>` 类型，修复验收时发现的既有类型检查错误。 |
| `shared/provider-icon.ts` | 新增 Cry Bot 图标 preset。 |
| `shared/claude-endpoint.ts` | 将端点地址标记为仅 owner/admin 才会返回的可选字段。 |
| `src/components/ProviderIcons.tsx` | 使用现有品牌资源 `/app-icon.svg` 渲染 Cry Bot preset，资源约 2 KB，低于现有 128 KB 上限。 |
| `src/components/EnginesSettings.tsx` | 锁定时直接展示端点行及重新检查按钮，移除更多提供方、管理增删和隐藏列表入口，空列表显示 Claude 端点表单。 |
| `src/components/ClaudeEndpoints.tsx` | 锁定且无端点时直接显示添加表单，已有端点时不显示端点管理区域。 |
| `src/components/keys/key-catalog.ts` | 锁定时隐藏 AI 钥匙条目，统一影响钥匙页面和搜索结果，其余分区保留。 |
| `src/components/settings/settings-context.ts` | 将服务端锁定状态传入设置上下文。 |
| `src/components/settings/settings-index.ts` | 锁定时移除指向 AI 钥匙的通用搜索条目。 |
| `src/state/config-status.ts` | 增加可选 `providerLock` 状态字段，兼容旧服务端。 |
| `src/state/store.tsx` | 在配置推送转换中保留 `providerLock`，防止后续配置刷新恢复被隐藏的入口。 |
| `scripts/desktop-build-config.cjs` | 仅在构建变量严格等于 `1` 时生成 `providerLock: true`。 |
| `electron/desktop-build-config.mjs` | 严格读取布尔锁定字段，并提供本机服务环境变量合成函数。 |
| `electron/main.mjs` | 本机服务启动时应用构建期锁定，同时移除验收 lint 发现的既有未使用解构变量。 |
| `.github/workflows/release.yml` | 仅新增指定的 `CRYBOT_PROVIDER_LOCK: ${{ vars.CRYBOT_PROVIDER_LOCK }}` 顶层环境变量。 |
| `docs/self-hosting.md` | 说明服务器与桌面开关、首次端点配置、迁移行为及关闭后的恢复范围。 |
| `server/config.test.ts` | 验证关闭时列表不变、开启时只保留端点、品牌覆盖、空列表和原配置保留。 |
| `server/provider-lock.test.ts` | 验证机器人、任务、备用模型、默认值、helper、定时任务的持久化迁移，以及 registry 探测和更新器计划过滤。 |
| `server/provider-lock-routes.test.ts` | 通过直接调用真实路由验证 owner/admin/member 地址权限、空列表及首次添加后的变更限制。 |
| `server/provider-lock.fixture.test.ts` | 新增独立临时数据目录、隔离环境和假 Claude CLI 的完整启动验证，覆盖有端点与空端点两种情况。 |
| `server/routes/instances.test.ts` | 补充完整 HTTP 路由的成员地址脱敏测试。 |
| `src/components/EnginesSettings.test.ts` | 验证锁定后只渲染端点行和重新检查、空列表直接显示添加表单。 |
| `src/components/EnginesSettings.hidden.test.ts` | 验证锁定后不请求也不渲染隐藏提供方。 |
| `src/components/keys/KeysPage.dom.test.ts` | 验证 AI 分区及聚焦链接均不可见，其余五个分区仍在。 |
| `src/components/settings/settings-index.test.ts` | 验证搜索隐藏 AI 钥匙，并验证配置推送保留锁定状态。 |
| `electron/desktop-build-config.test.mjs` | 验证构建文件生成、严格布尔读取和本机子进程环境变量传递。 |
| `docs/tasks/T-1200/T-1216-provider-lock/report.md` | 记录实现、验证结果及协调事项。 |

范围例外只有两处源码：`src/state/config-status.ts` 和 `src/state/store.tsx`；它们是前端配置状态的实际定义和推送转换入口，不修改就无法类型安全地消费锁定状态，且状态会在推送时丢失。报告文件按任务明确要求创建。复用现有依赖，在工作树内建立依赖链接及工具缓存，没有修改依赖清单或锁文件。

## 2. 验证命令和结果

使用 Node `v24.22.3`；默认系统 Node 为 22，因此命令显式选择已有 Node 24。所有测试逐文件独立调用，均使用 `--maxWorkers=2`，没有运行完整 `pnpm test`。

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <下表文件> --maxWorkers=2
```

| 测试文件 | 结果 |
| --- | --- |
| `server/config.test.ts` | 230 通过、1 跳过、3 因沙箱 `spawnSync ... EPERM` 失败；新增锁定测试全部通过。 |
| `server/built-in-instances.test.ts` | 1 通过。 |
| `server/routes/instances.test.ts` | 完整 HTTP 测试未完成；命令加外层 `timeout 75s` 后以 124 退出，本机监听预检返回 `EPERM`。 |
| `server/default-model-selection.test.ts` | 45 通过。 |
| `server/claude-endpoints.test.ts` | 12 通过。 |
| `server/store-rename-instances.test.ts` | 2 通过。 |
| `src/components/EnginesSettings.test.ts` | 34 通过。 |
| `src/components/EnginesSettings.hidden.test.ts` | 3 通过。 |
| `src/components/settings/settings-index.test.ts` | 123 通过。 |
| `electron/desktop-build-config.test.mjs` | 9 通过。 |
| `server/provider-lock.test.ts` | 8 通过。 |
| `server/provider-lock-routes.test.ts` | 4 通过，直接执行路由，无网络监听。 |
| `src/components/keys/KeysPage.dom.test.ts` | 19 通过。 |
| `server/provider-lock.fixture.test.ts` | 两种隔离启动均因监听端口不可分配而失败，报 `no free port block`；独立 Node 监听预检证实为沙箱 `EPERM`。 |

配置测试受阻的三项均为已有的 DATA_DIR 子进程隔离测试。隔离启动测试尚未启动到服务可用状态，因此本报告不宣称完整服务器启动或桌面运行已通过端到端验证。仓库中的 `docs/verification/README.md` 不存在；测试使用现有 `verificationServerEnvironment` / `verificationServerArgs`、临时目录和仓库假 CLI，未替换成真实服务验证。

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm lint
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm i18n:check
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm check:brand
git diff --check
```

四项项目检查及 diff 空白检查均通过。i18n 检查验证 16 个语言目录；没有新增需要翻译的界面文案。新增测试和文档只使用 `https://gateway.example`、隔离 fixture 的回环地址与虚构标识、凭据占位值，没有引入内部域名、真实实例标识或真实凭据。

## 3. 需要协调者处理的事

1. 建立仓库变量 `CRYBOT_PROVIDER_LOCK=1`，用于后续桌面安装包构建；已有安装包不会因仓库变量变化而自动获得该字段。
2. 在目标服务器配置 `CRYBOT_PROVIDER_LOCK=1` 并重启，确认已有 Claude 自定义端点；本机模式无端点时可使用表单配置地址和钥匙。
3. 在允许子进程与本机监听的隔离环境，按上述命令重跑 `server/config.test.ts`、`server/routes/instances.test.ts` 和 `server/provider-lock.fixture.test.ts`，补齐受沙箱阻断的验收。
4. 补齐或更正 AGENTS.md 引用的 `docs/verification/README.md`，便于后续遵循统一验证流程。

迁移保留原模型 ID；部署端点需要支持这些模型。关闭开关恢复原提供方列表，但不会自动回滚已持久化迁移的引用。

## 第 2 轮

本轮在已有改动上续做，保留第 1 轮设计和上述报告，不提交 git、不安装依赖、不运行完整 `pnpm test`。本轮修改限于 `src/`、`server/`、`shared/`、移动端本地化和本报告；工作树中的构建、Electron、发布流程及自托管文档改动均为第 1 轮保留内容。

### 修改文件与行为

| 文件 | 本轮改动 |
| --- | --- |
| `server/boat.ts` | `boatConfigured` 复用 `providerLockEnabled()`，锁定时报告未配置，保留原 Boat 凭据供关闭开关后恢复。 |
| `server/index.ts` | 锁定时配置状态不下发 Boat 凭据提示，团队电脑列表为空，不继承团队 Boat；可选电脑列表过滤 Boat，保留 VPS、Local VM 等；缺少 Boat 时不再提示连接 Boat。 |
| `server/routes/computer-frames.ts` | 锁定时直接返回空电脑列表，不启动 Boat 缩略图采集。 |
| `src/components/keys/key-catalog.ts`、`src/components/settings/settings-index.ts` | 隐藏 Boat 钥匙条目及云端桌面搜索词，保留 VPS 和本地桌面入口。电脑分区仍保留 VPS 设置。 |
| `src/components/ComputerPanel.tsx`、`WorksOnGrid.tsx`、`CloudBackendPicker.tsx`、`LocalComputerSection.tsx` | 隐藏 Boat 卡片、钥匙、恢复操作、后端切换及库存请求；锁定时电脑选择明确显示自托管 VPS，并保存 `cloudBackend: "vps"`，保留 Local VM。 |
| `src/components/CanvasComputers.tsx`、`TeamMapPage.tsx` | 隐藏 Boat 列表、创建和显示电脑按钮、团队电脑提示及缩略图请求。 |
| `src/components/PlaceChip.tsx`、`src/lib/place.ts`、`src/lib/place-view.ts`、`shared/place-view.ts` | 桌面和手机 place 菜单过滤 Boat；旧 Boat 选择不再显示云端桌面标签；隐藏 Boat 连接及团队桌面提示。保留 VPS/VM 视图，以及 VPS 共用的模型、工具权限和登录故障提示。 |
| `src/components/bot-settings/AccessSection.tsx`、`src/components/bot-panel/ComputerTab.tsx` | 新建智能体时使用 VPS 选项和对应保存值；隐藏 Boat 后端设置及相关提示。 |
| `src/components/RoutineCalendarPage.tsx`、`WebhookTrigger.tsx`、`remote-desktop-panel.tsx` | 隐藏 Boat 运行位置选项，锁定时不报告 Boat 定时任务运行能力。 |
| `src/locales/zh.json`、`src/locales/zh-tw.json` | 分别将所有「机器人」「機器人」替换为「智能体」「智能體」，保留量词和复数后缀；未修改英文及其他语言。逐键比较确认只有指定称谓替换。 |
| `mobile/ios/CryBotWatch/zh-Hans.lproj/Localizable.strings` | 更新 watchOS 简体中文称谓。扫描 iOS 壳、Android 简体中文资源，其余文件没有待替换称谓。 |
| `server/host/brief-words.ts`、`server/workspace.ts` | 更新硬编码简繁中文称谓。 |
| `src/components/ConnectedWorkspacesSettings.test.ts` | 同步更新旧中文文案断言。 |
| `src/components/keys/KeysPage.dom.test.ts`、`keys/key-catalog.test.ts`、`settings/settings-index.test.ts`、`ComputerPanel.simple.test.ts`、`LocalComputerSection.test.ts`、`CanvasComputers.test.ts`、`PlaceChip.test.ts`、`CloudBackendPicker.test.ts`、`FailedTurnRow.place.test.ts` | 覆盖锁定时入口不可见、关闭后仍显示，以及 VPS/VM 保留。补完 PlaceChip 桌面和手机菜单测试，并重跑此前待验证的钥匙页面断言。 |
| `shared/place-view.test.ts`、`server/boat-availability.test.ts`、`server/routes/computer-frames.test.ts`、`server/provider-lock.fixture.test.ts` | 覆盖 Boat 可用性、place 提示、空缩略图列表；隔离启动 fixture 增加配置、团队电脑和缩略图接口断言。 |

### 验证

遵循本次续做要求：一次只运行一个文件，统一使用 `--maxWorkers=1`，各项项目检查也串行执行。测试沿用仓库临时 HOME/数据目录隔离，不访问用户真实应用或数据。`docs/verification/README.md` 仍不存在；已尝试已有隔离服务器 fixture，但启动前被端口分配限制阻断，因此不宣称完整服务器或桌面端到端验证通过。

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <测试文件> --maxWorkers=1
```

第 1 轮列出的全部文件均逐一复跑，连同本轮测试共 31 个文件：28 个文件全部通过；合计 732 项通过、1 项跳过，5 项受环境阻断失败，另 1 个 HTTP 文件超时。未重试 EPERM 失败。逐文件外层设置 75 或 90 秒超时，避免沙箱监听失败长期挂起。

| 测试文件 | 本轮结果 |
| --- | --- |
| `server/config.test.ts` | 230 通过、1 跳过；3 项 DATA_DIR 子进程测试因 `spawnSync /opt/node24/bin/node EPERM` 失败。 |
| `server/built-in-instances.test.ts` | 1 通过。 |
| `server/routes/instances.test.ts` | 75 秒超时，退出码 124；未完成 HTTP 测试。 |
| `server/default-model-selection.test.ts` | 45 通过。 |
| `server/claude-endpoints.test.ts` | 12 通过。 |
| `server/store-rename-instances.test.ts` | 2 通过。 |
| `server/provider-lock.test.ts` | 8 通过。 |
| `server/provider-lock-routes.test.ts` | 4 通过。 |
| `server/provider-lock.fixture.test.ts` | 两种隔离启动均在端口分配处报 `no free port block`，尚未进入服务器断言。 |
| `electron/desktop-build-config.test.mjs` | 9 通过。 |
| `src/components/EnginesSettings.test.ts` | 34 通过。 |
| `src/components/EnginesSettings.hidden.test.ts` | 3 通过。 |
| `src/components/settings/settings-index.test.ts` | 124 通过。 |
| `src/components/keys/KeysPage.dom.test.ts` | 21 通过。 |
| `src/components/keys/key-catalog.test.ts` | 13 通过。 |
| `src/components/ComputerPanel.simple.test.ts` | 41 通过。 |
| `src/components/ComputerPanel.lazy.test.ts` | 9 通过。 |
| `src/components/ComputerPanel.i18n.test.ts` | 3 通过。 |
| `src/components/LocalComputerSection.test.ts` | 46 通过。 |
| `src/components/CanvasComputers.test.ts` | 2 通过。 |
| `src/components/CloudBackendPicker.test.ts` | 6 通过。 |
| `src/components/PlaceChip.test.ts` | 14 通过。 |
| `src/components/PlaceChip.dom.test.ts` | 1 通过。 |
| `src/components/FailedTurnRow.place.test.ts` | 10 通过。 |
| `src/components/ConnectedWorkspacesSettings.test.ts` | 11 通过。 |
| `src/components/bot-settings/AccessSection.test.ts` | 26 通过。 |
| `src/components/RoutineCalendarPage.simple.test.ts` | 32 通过。 |
| `src/components/TeamMapPage.edges.test.ts` | 2 通过。 |
| `shared/place-view.test.ts` | 19 通过。 |
| `server/boat-availability.test.ts` | 1 通过。 |
| `server/routes/computer-frames.test.ts` | 3 通过。 |

以下命令逐个执行，全部通过：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm lint
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm i18n:check
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm check:brand
git diff --check
```

i18n 校验 16 个语言目录通过；品牌检查 6549 个文件，禁止项为 0。`src/locales/zh.json` 中「机器人」计数为 0，繁体 locale 中「機器人」计数为 0；移动端简体中文资源无旧称谓。`src/`、`server/`、`shared/` 和移动端代码、本地化资源也无旧称谓残留。移动端 README 属于范围外文档，保持原样。本轮未新增内部域名、真实 IP、邮箱、人名或密钥；测试使用已有虚构 fixture 标识及凭据占位值。

### 需要协调者处理的事

1. 在允许子进程和本机监听的隔离环境，使用本轮单文件、单 worker 命令补跑 `server/config.test.ts`、`server/routes/instances.test.ts`、`server/provider-lock.fixture.test.ts`。最后一项包含本轮新增的配置及电脑列表断言；当前沙箱无法证明完整服务器启动行为。
2. 补齐或更正 `AGENTS.md` 引用的 `docs/verification/README.md`。
3. 全仓扫描额外发现范围外 `electron/lending-words.mjs` 的 231、247 行分别含繁体和简体旧称谓（电脑出借活动空状态）。本轮“不要改其他文件”的限制未授权修改 Electron，故保留原样；如需整个桌面壳也统一称谓，请在获准范围内另行替换并验证。

## 第 3 轮

本节按本轮“Boat 直接关掉；桌面端只连服务器”的说明执行，替换作废 r4 留下的第 3 轮报告；第 1、2 轮报告保留。未提交 git、未安装依赖、未运行完整 `pnpm test`、未打包、未访问用户真实应用或数据。

### 修改文件与行为

- `scripts/desktop-build-config.cjs`、`electron/desktop-build-config.mjs`：生成并严格读取 `remoteOnly`。只有 `CRYBOT_DESKTOP_REMOTE_ONLY=1` 且默认服务器地址有效才启用；默认关闭。启用后，每次启动都选中部署服务器，包括已有 `environments.json`、上次停在本机或其他服务器的用户；复用已有服务器条目及其名称、颜色，不删除旧环境。
- `.github/workflows/release.yml`：本轮只新增顶层 `CRYBOT_DESKTOP_REMOTE_ONLY: ${{ vars.CRYBOT_DESKTOP_REMOTE_ONLY }}` 一行，保留第 1 轮的 provider lock 行。
- `electron/remote-only.mjs`、`electron/error-pages.mjs`、`electron/main.mjs`：统一主窗口加载入口，拒绝把本机页面或其他服务器加载到主窗口；持久化时保持默认服务器为当前环境。服务器或允许的登录主机加载失败，显示“连不上服务器 / 重试”页，重试回到服务器；不调用原有切本机的失败处理。登录主机弹窗转为窗口内导航，登录回跳服务器继续留在窗口内，登录页不获得本机 IPC 权限。旧 companion 模式、启动时的组织/云端恢复不抢占服务器窗口。
- `electron/menu.mjs`、`electron/main.mjs`：隐藏 Server 环境菜单、工作区弹出菜单及桌面侧栏的切换入口；保留编辑、窗口、设置等必要菜单，重新加载和强制重新加载都指向服务器，也能从错误页恢复。
- 本机后台服务选择**继续启动**：现有 `startUpdater(quietSignals(... local: localServerRequest ...))` 的空闲检测、`sharingController()` 的本机电脑控制接口以及本机 IPC 使用该服务。主窗口的所有加载入口受 remoteOnly 策略约束，后台服务的界面不显示在主窗口。
- `src/locales/en.json`、`zh.json`、`zh-tw.json`、`pt-br.json`：增加重试页文案；补齐简体中文原生菜单翻译，避免中文系统下 Server、Reload、Edit 等回退英文。葡萄牙语补齐新增 native 文案，满足现有 native catalog 行为测试；其余语言按现有英文回退规则处理。
- `server/routes/instances.ts`、`server/provider-lock-routes.test.ts`：锁定且没有端点时，首次 POST 显式要求 `ownerOrAdmin(auth)`；member 返回 403。已有端点的 PATCH、DELETE 及第二次 POST 仍然禁止。
- `src/components/keys/key-catalog.ts`、`KeysPage.tsx`、`src/lib/bot-overview-text.ts`、`src/components/bot-settings/OverviewSection.tsx`、`src/components/BotSettingsDialog.tsx`：保留本轮允许的 r4 残余文案修正，锁定时电脑钥匙分区改为“你自己的服务器和网站登录信息”，智能体概览改为“已配置的服务器”；中英文及繁体补齐，未锁定保留原文案。补测中文页面以及带 My Cloud 限制后缀的概览文本。
- `electron/desktop-build-config.test.mjs`、`menu.test.mjs`、`main-navigation.node-test.mjs`、新增 `remote-only.node-test.mjs`：覆盖生成/读取、老用户迁移、失败后重试且不切本机、持久化约束、菜单隐藏/中文、登录主机及回跳、关闭开关的原有行为。`electron/server-supervisor.node-test.mjs` 将受加载入口重构影响的源码字符串断言改为实际执行恢复导航的行为断言。
- `src/components/keys/KeysPage.dom.test.ts`、`key-catalog.test.ts`、`src/lib/bot-overview-text.test.ts`：覆盖锁定/解锁时文案与入口的差异。
- `docs/self-hosting.md`：补充构建开关、默认服务器与登录主机配置、旧用户迁移、失败重试和后台服务依赖说明。

作废改动已撤回：`server/boat.ts` 恢复第 2 轮锁定时 `boatConfigured=false`，移除 `boatOffered`；`server/index.ts`、`server/store.ts`、`server/provider-lock.ts` 及对应测试撤回 r4 的清理例外、托管模型、首次添加后即时迁移和续接状态迁移修改；`server/routes/computer-usage.ts`、`computers.ts`、`server/host/cloud-computer-power.test.ts` 回到原版本；`src/App.tsx`、`src/components/NoEngines.tsx` 撤回零实例首屏改动，`ClaudeEndpoints.tsx`、`EnginesSettings.tsx` 撤回锁定端点编辑入口。此处范围外文件仅用于撤回用户明确要求作废的 r4 改动。

### 验证

Vitest 一次只跑一个文件，使用以下命令；完整 HTTP 测试使用外层 `timeout 75s`，避免沙箱中无限等待。

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <文件> --maxWorkers=1
```

| 测试文件 | 本轮结果 |
| --- | --- |
| `server/config.test.ts` | 230 通过、1 跳过；3 项子进程测试因 `spawnSync /opt/node24/bin/node EPERM` 失败 |
| `server/provider-lock.test.ts` | 8 通过 |
| `server/provider-lock-routes.test.ts` | 5 通过 |
| `server/provider-lock.fixture.test.ts` | 两种隔离启动在分配端口时失败：`no free port block` |
| `server/routes/instances.test.ts` | 75 秒超时，退出码 124；未完成 HTTP 测试 |
| `src/components/EnginesSettings.test.ts` | 34 通过 |
| `src/components/EnginesSettings.hidden.test.ts` | 3 通过 |
| `src/components/keys/KeysPage.dom.test.ts` | 23 通过 |
| `src/components/settings/settings-index.test.ts` | 124 通过 |
| `electron/desktop-build-config.test.mjs` | 14 通过 |
| `server/built-in-instances.test.ts` | 1 通过 |
| `server/default-model-selection.test.ts` | 45 通过 |
| `server/claude-endpoints.test.ts` | 12 通过 |
| `server/store-rename-instances.test.ts` | 2 通过 |
| `src/components/ConnectedWorkspacesSettings.test.ts` | 11 通过 |
| `src/components/keys/key-catalog.test.ts` | 14 通过 |
| `src/components/ComputerPanel.simple.test.ts` | 41 通过 |
| `src/components/ComputerPanel.lazy.test.ts` | 9 通过 |
| `src/components/ComputerPanel.i18n.test.ts` | 3 通过 |
| `src/components/LocalComputerSection.test.ts` | 46 通过 |
| `src/components/CanvasComputers.test.ts` | 2 通过 |
| `src/components/CloudBackendPicker.test.ts` | 6 通过 |
| `src/components/PlaceChip.test.ts` | 14 通过 |
| `src/components/PlaceChip.dom.test.ts` | 1 通过 |
| `src/components/FailedTurnRow.place.test.ts` | 10 通过 |
| `src/components/bot-settings/AccessSection.test.ts` | 26 通过 |
| `src/components/RoutineCalendarPage.simple.test.ts` | 32 通过 |
| `src/components/TeamMapPage.edges.test.ts` | 2 通过 |
| `shared/place-view.test.ts` | 19 通过 |
| `server/boat-availability.test.ts` | 1 通过 |
| `server/routes/computer-frames.test.ts` | 3 通过 |
| `electron/menu.test.mjs` | 21 通过 |
| `src/lib/bot-overview-text.test.ts` | 15 通过 |
| `src/components/bot-settings/OverviewSection.test.ts` | 10 通过 |

Electron Node 测试也逐文件执行，使用 Node 自带测试 runner，并让文件在当前进程内执行：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 node --test --test-isolation=none <文件>
```

| 测试文件 | 本轮结果 |
| --- | --- |
| `electron/main-navigation.node-test.mjs` | 3 通过 |
| `electron/remote-only.node-test.mjs` | 7 通过 |
| `electron/environments.node-test.mjs` | 30 通过 |
| `electron/environment-switch.node-test.mjs` | 16 通过 |
| `electron/error-pages.node-test.mjs` | 2 通过 |
| `electron/home-window-recovery.node-test.mjs` | 1 通过 |
| `electron/server-supervisor.node-test.mjs` | 24 通过 |
| `electron/native-text.node-test.mjs` | 9 通过 |

首次验证发现恢复窗口的旧源码字符串断言受加载函数重构影响，以及葡萄牙语 native 目录要求覆盖全部新增 native 文案；已改为恢复导航行为测试、补齐葡萄牙语并复跑相应文件，均通过。

`server/provider-lock.fixture.test.ts` 使用临时目录、`verificationServerEnvironment` / `verificationServerArgs` 和假 CLI 尝试启动隔离服务器，端口分配阶段即受阻。未用用户数据或真实服务器替代验证。`docs/verification/README.md` 在当前仓库中仍不存在。完整 HTTP/启动行为不列为已验证通过，受限测试未反复重试。

以下检查在测试结束后串行执行，全部通过：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm lint
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm i18n:check
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm check:brand
git diff --check
```

i18n 校验 16 个语言目录通过；品牌检查 6553 个文件，禁止项为 0。新增地址均为示例域名或隔离测试的回环地址，没有引入内部域名、真实 IP、邮箱、人名或密钥。简体/繁体 locale 与移动端简体资源中未发现旧的“机器人 / 機器人”称谓。默认关闭的桌面流程由原有默认环境选择、环境切换、导航、菜单和恢复行为测试验证；第 1、2 轮实现保留，本轮未扩展作废 r4 的功能。

### 需要协调者处理的事

1. 创建仓库变量 `CRYBOT_DESKTOP_REMOTE_ONLY=1`，确认构建时已有 `CRYBOT_DEFAULT_SERVER_URL` 和需要的 `CRYBOT_LOGIN_HOSTS`；服务器继续设置 `CRYBOT_PROVIDER_LOCK=1`。配置值不写入本报告或源码。
2. 在允许子进程和本机端口监听的隔离环境，逐文件补跑 `server/config.test.ts`、`server/routes/instances.test.ts`、`server/provider-lock.fixture.test.ts`，仍使用 Node 24、`--maxWorkers=1` 和 4096 MB 堆限制。当前结果不能证明完整服务器 HTTP/启动已通过。
3. 补齐或更正 `AGENTS.md` 引用的 `docs/verification/README.md`。本轮 Electron 验证使用临时环境文件及 Node/Vitest 行为 fixture，未启动真实 Mac/Windows 安装包；协调者后续验收安装包时，检查已有本机环境的用户升级、登录主机跳转和断网重试。

## 第 4 轮

### 改动文件

保留第 1–3 轮改动，本轮仅调整以下文件：

- `electron/main.mjs`：向 preload 传入 remoteOnly 标记；服务器同源页面的普通/强制刷新分别调用 `reload()` / `reloadIgnoringCache()`，错误页、登录页和其他来源回到默认服务器；启动导航直接使用 `desktopBuild.defaultServerUrl`，不读取当前远程环境；remoteOnly 写盘失败记日志后仍更新内存，关闭开关时继续抛出原错误。
- `electron/preload.cjs`：remoteOnly 时不向页面暴露 `workspaces`，现有侧栏与个人菜单据此隐藏切换入口；关闭开关时桥接保持原样，无需修改前端生产逻辑。
- `electron/menu.mjs`：重新加载与强制重新加载分别传入是否绕过缓存的参数，关闭开关时保留 Electron 原生菜单 role。
- `electron/menu.test.mjs`：断言两个菜单动作分别传入 `false` / `true`，保留菜单隐藏与默认行为测试。
- `electron/remote-only.node-test.mjs`：补充同源路由刷新、跨协议/端口与错误页恢复、写盘失败后的启动内存状态、启动不依赖保存环境的行为测试；切换拒绝测试显式统计切换、持久化、导航等调用次数，并验证关闭开关后确实调用这些桩。
- `src/components/DesktopWorkspaceSwitcher.remote-only.test.ts`：执行主窗口实际参数表达式和真实 preload，再渲染实际切换器及个人菜单位置项，覆盖 remoteOnly 开关和六种展示形式。

### 验证

使用 Node 24 和 4096 MB 堆限制，所有测试一次一个文件；没有运行完整 `pnpm test`、安装依赖、打包或提交 git。

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 node --test --test-isolation=none <文件>
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <文件> --maxWorkers=1
```

第 3 轮验证表中的 42 个文件全部逐文件复跑：8 个 Electron Node 文件全部通过；34 个 Vitest 文件中 31 个通过，3 个受下表所列环境限制。另补跑 6 个文件，均通过。合计 48 个文件，45 个完整通过。

| 本轮重点与补充测试 | 结果 |
| --- | --- |
| `electron/remote-only.node-test.mjs` | 12 通过：覆盖刷新、启动写盘失败、直接导航、切换拒绝及关闭开关的对照行为 |
| `electron/menu.test.mjs` | 21 通过：包括普通/强制刷新参数与默认菜单 role |
| `electron/preload.node-test.mjs` | 13 通过 |
| `electron/preload-contract.node-test.mjs` | 2 通过 |
| `src/components/DesktopWorkspaceSwitcher.test.ts` | 7 通过 |
| `src/components/DesktopWorkspaceSwitcher.home.test.ts` | 4 通过 |
| `src/components/DesktopWorkspaceSwitcher.remote-only.test.ts` | 2 通过：实际 preload、切换器和 `SidebarProfileMenu` 生成的菜单项；开关开启时隐藏，关闭时显示 |
| `src/components/SidebarProfileMenu.test.ts` | 58 通过 |

| 环境受限测试 | 结果 |
| --- | --- |
| `server/config.test.ts` | 230 通过、1 跳过，3 项因 `spawnSync /opt/node24/bin/node EPERM` 失败 |
| `server/provider-lock.fixture.test.ts` | 两种隔离启动均在端口分配阶段失败：`no free port block` |
| `server/routes/instances.test.ts` | 外层 `timeout 75s` 到期，退出码 124，HTTP 测试未完成 |

受限测试各尝试一次，未反复重试。Electron 测试使用临时环境文件或隔离 VM 桩；服务器启动验证仅尝试现有临时目录 fixture，未连接用户的实时应用或数据。`docs/verification/README.md` 仍不存在，因此不声称完整服务器启动或 HTTP 流程已验证成功。

以下检查在测试之后串行执行，最终全部通过；首次 typecheck 发现新增测试的可选 props 类型推断问题，补充显式类型后复跑通过。

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm lint
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm i18n:check
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm check:brand
git diff --check
```

关闭 remoteOnly 时，preload 桥接、原生刷新菜单、环境切换、保存失败处理和启动环境选择均保持原有行为，并有对照测试。新增测试使用示例域名和 localhost，占位目录均在 `/tmp`；本轮未加入内部域名、真实 IP、邮箱、人名或密钥。

### 需要协调者处理的事

1. 在允许子进程和本机端口监听的隔离环境补跑 `server/config.test.ts`、`server/provider-lock.fixture.test.ts`、`server/routes/instances.test.ts`，仍一次一个文件、Node 24、`--maxWorkers=1` 和 4096 MB 堆限制。
2. 补齐或修正 `AGENTS.md` 引用的 `docs/verification/README.md`。本轮未打包或启动真实 Mac/Windows GUI；后续安装包验收请检查开启/关闭 remoteOnly 的切换入口、保留当前路由的两种刷新，以及断网错误页重试。
3. 构建与服务器开关沿用第 3 轮部署配置，无新增依赖或配置项需要处理。
