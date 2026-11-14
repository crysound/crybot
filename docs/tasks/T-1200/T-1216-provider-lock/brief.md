# T-1216 AI 提供方锁定为单一「Cry Bot」

## 目标
打开锁定开关后，设置 → AI → 提供方只显示一行「Cry Bot」（即部署方配置好的那个 Claude 自定义端点），不再出现 Grok、Kimi、Cursor、Claude、Codex、Gemini 等内置提供方，也没有「更多提供方」、隐藏提供方列表和「其他服务」里的 AI 钥匙分区。服务器网页和桌面端本机模式都适用。

## 背景
- 本仓库是公开仓库。代码、测试、文案里不能出现任何内部域名、IP、邮箱、人名、密钥或真实实例 id；测试地址用 `https://gateway.example` 这类占位。
- 提供方列表全部来自服务端 `GET /api/instances`（`server/routes/instances.ts:115` → `server/index.ts` 的 `describeInstances()`）。实例清单由 `server/config.ts` 的 `instanceConfigs()`（约 1153 行）生成：config 里只要有 `claude`/`grok`/`codex` 任一键，就会补回 `server/instance-fleets.ts` 的 `PRODUCT_FLEET_ADDITIONS`；实例为空时用 `DEFAULT_FLEET`。`persistableInstanceConfigs()` 约 1046 行。
- Claude 自定义端点：`server/claude-endpoints.ts`（`isClaudeEndpoint()`、`endpointEnvironment()`），实例形如 `driver: "claudeAgent"`、`access: "custom"`，地址和钥匙在实例 `environment` 的 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_API_KEY`。设置页「添加 Claude 端点」表单生成这种实例。
- 前端：`src/components/settings/pages/PlacePages.tsx` 的 `AiPage()`（约 114–140 行，「其他服务」折叠行和 `KeysPage`）；`src/components/EnginesSettings.tsx`（`SimpleEngines` 约 454–479 行「更多提供方」，`HiddenEngines`，约 557–559 行添加 Claude 端点表单）；`src/components/keys/key-catalog.ts` 的 `KEY_SECTIONS`；`src/components/settings/settings-index.ts` 约 187–188 行搜索索引；图标 `src/components/ProviderIcons.tsx` 的 `InstanceProviderMark`、`shared/provider-icon.ts`；品牌名在 `server/brand.ts`，品牌图在 `brand/`。
- 桌面端：本机服务由 `electron/main.mjs` 的 `startServerOn()`（约 984–1012 行）启动，继承 `process.env`；安装包配置 `desktop-config.json` 由 `scripts/desktop-build-config.cjs` 在构建期从环境变量生成，运行时由 `electron/desktop-build-config.mjs` 的 `readDesktopBuildConfig()` 读取；构建变量在 `.github/workflows/release.yml` 顶部 env 注入。

## 要做的事
1. 服务端开关 `CRYBOT_PROVIDER_LOCK`（值为 `1` 表示开启，默认关闭，关闭时行为完全不变）：
   - 开启时 `instanceConfigs()` 只返回 Claude 自定义端点实例（`isClaudeEndpoint` 为真的），不补 `PRODUCT_FLEET_ADDITIONS`、不用 `DEFAULT_FLEET`、不加载 API_KEY_FLEET。其他实例不进 registry，也不被 CLI 探测或引擎更新器更新。
   - 开启时这些端点实例对外显示名一律为品牌产品名（取 `server/brand.ts`，即「Cry Bot」），实例未设图标时用 Cry Bot 品牌图标（custom dataUrl 或新增 preset，按现有图标机制选最简单的，体积不超过现有上限）。
   - 开启时，机器人、任务、默认模型、备用模型等引用了不存在实例的 instanceId，启动时迁移到第一个端点实例（可复用 `store.renameInstances`）。没有任何端点实例时不迁移、不报错，列表为空并由前端显示添加表单。
   - `configStatus()`（或前端已在读的配置状态）加 `providerLock: boolean`。
2. 前端，`providerLock` 为真时：
   - 不显示「更多提供方」、隐藏提供方列表、「重新检查」之外的提供方增删入口；已有端点时不显示「添加 Claude 端点」表单，没有端点时只显示这个表单（让本机模式能填地址和钥匙）。
   - 「其他服务」里去掉 `ai` 钥匙分区（其余 servers/voice/computers/apps/helpers 分区保留可用）；设置搜索里指向 AI 钥匙的条目同样去掉。
3. 安全：`GET /api/instances` 返回的自定义端点 `baseUrl` 只给 owner/admin，普通成员看不到。
4. 桌面端：`desktop-config.json` 增加布尔字段 `providerLock`，由构建变量 `CRYBOT_PROVIDER_LOCK=1` 生成；本机模式启动本机服务时，若该字段为真，给子进程设置 `CRYBOT_PROVIDER_LOCK=1`。`.github/workflows/release.yml` 顶部 env 加 `CRYBOT_PROVIDER_LOCK: ${{ vars.CRYBOT_PROVIDER_LOCK }}`（协调者会建这个仓库变量）。
5. 补测试（行为测试）：开关关时实例列表不变；开关开时只剩端点实例、显示名为 Cry Bot、旧引用被迁移、成员看不到 baseUrl；前端开关开时不渲染「更多提供方」和 AI 钥匙分区；`desktop-config.json` 生成和读取 `providerLock`。

## 范围
- 可以改：`server/`、`shared/`、`src/components/`、`src/locales/`（新增文案时中英文都补）、`electron/`、`scripts/desktop-build-config.cjs`、`.github/workflows/release.yml`（只加上面那一行 env）、对应测试文件、`docs/self-hosting.md`（补一段开关说明）。
- 不要改：其他文件。确实需要时在汇报里说明原因。

## 验收标准
- [ ] 以下测试通过（逐个文件跑，`--maxWorkers=2`）：`server/config.test.ts`、`server/built-in-instances.test.ts`、`server/routes/instances.test.ts`、`server/default-model-selection.test.ts`、`server/claude-endpoints.test.ts`、`server/store-rename-instances.test.ts`、`src/components/EnginesSettings.test.ts`、`src/components/EnginesSettings.hidden.test.ts`、`src/components/settings/settings-index.test.ts`、`electron/desktop-build-config.test.mjs`，以及新增测试。
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm i18n:check`、`pnpm check:brand` 通过（命令前加 `NODE_OPTIONS=--max-old-space-size=4096`）。
- [ ] 开关关闭时现有测试行为不变。
- [ ] 代码、测试、文档里没有内部域名、IP、邮箱、人名、真实实例 id。

## 约束
- 不要 git 提交。沙箱禁网；需要新依赖时在汇报里列出，不要自己装（本任务应不需要新依赖）。
- 不要跑完整 `pnpm test`（会构建打包，太重），只跑上面列的测试文件。
- 只写必要的注释。测试测行为，断言具体期望值。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1216-provider-lock/report.md`。用中文：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果。
3. 需要协调者处理的事。
