改了什么

新增 钥匙目录项（环境变量来源显示为只读行）、三后端选择、快照路由/假服务/面板与确认流程、中英文文案；电脑面板只加两行挂载，配置路由净增 9 行，wire 保持 1000 行。实际改动文件与 `git status --short --untracked-files=all` 一致：

```text
server/routes/config.ts
shared/wire.ts
src/components/CloudBackendPicker.test.ts
src/components/CloudBackendPicker.tsx
src/components/ComputerPanel.tsx
src/components/keys/KeysPage.dom.test.ts
src/components/keys/key-catalog.test.ts
src/components/keys/key-catalog.ts
src/locales/en.json
src/locales/zh.json
docs/tasks/T-1200/T-1245-instabox-settings/key-environment-360.png
docs/tasks/T-1200/T-1245-instabox-settings/report.md
docs/tasks/T-1200/T-1245-instabox-settings/ui-1280.png
docs/tasks/T-1200/T-1245-instabox-settings/ui-390.png
docs/tasks/T-1200/T-1245-instabox-settings/verification.txt
server/instabox/machine.ts
server/routes/instabox-snapshots.e2e.test.ts
server/routes/instabox-snapshots.ts
server/testing/fake-instabox-snapshots.ts
src/components/InstaboxSnapshots.test.tsx
src/components/InstaboxSnapshots.tsx
```

为什么

支持每个智能体的 磁盘快照，限制 admin/同源访问、拒绝跨智能体恢复/删除、全量调用使用 `idempotent: true`，恢复完成后调用 `ensureRunning(botId)` 开桌面。钥匙响应仅含 `{ configured, fromEnv }`，不含明文和尾号。

⑤ 接线的确切签名：

```ts
export function createInstaboxSnapshotRoutes(deps: { machines(): InstaboxMachines | null; request(): InstaboxRequest | null; machineIdFor(botId: string): Promise<string | null>; botExists(botId: string): boolean }): RouteHandler
```

**尚未独立闭环：**遵守原文件边界，未改 `server/index.ts`、`server/config.ts`、`server/store.ts`。①/⑤须注册路由，并在配置 schema、saveConfig 的 section 合并列表、加载/环境变量读取、全局 configStatus 及 config 广播接上 。隔离实测当前 `saveConfig({instabox:{apiKey:…}})` 会丢弃该字段，所以本分支不能宣称钥匙已可持久化；本任务路由已接收/校验保存与清除 patch，并拒绝覆盖 `INSTABOX_API_KEY`。此前范围扩展询问未收到确认，保留原范围。存快照和恢复都在单个 HTTP 请求里同步等待：快照对象形状最多等待 ready 180 秒；操作单形状最多等待操作单 180 秒、按唯一名称发现快照 180 秒、再等待 ready 180 秒；恢复最多等待操作单 180 秒，随后同步等待 `ensureRunning`。⑤ 接线时应让前端和反向代理超时覆盖这些等待。

测试命令与结果摘要

- 开工 依赖准备脚本 成功。`docs/verification/README.md` 缺失；验证全部使用隔离 HTTP 假服务/临时数据目录，无真实 调用。
- 逐文件 `pnpm exec vitest run <文件> --maxWorkers=1`：20 个文件、242 项通过（去重计数），具体文件及命令见 [verification.txt](verification.txt)。快照路由 e2e 最终连续 3 次，各 11/11。
- `node --experimental-strip-types <isolated browser capture script>`：Chromium 隔离组件页面，三后端切换、存快照、取消/确认恢复、确认删除连续 3 轮通过；环境变量钥匙无编辑按钮。1280/390/360 宽及确认框无横向溢出。[1280 截图](ui-1280.png)、[390 截图](ui-390.png)、[环境变量只读截图](key-environment-360.png)。
- `pnpm exec tsc -p tsconfig.server.json`、`pnpm exec tsc -p tsconfig.json`、改动 TS/TSX 文件的 `pnpm exec oxlint --deny-warnings`、行数门禁、`git diff --check` 均通过。
- `node scripts/generate-locale.mjs --check` 通过；`pnpm exec vitest run src/lib/i18n.test.ts --maxWorkers=1` 为 **38/39**：`activePackComplete` 写死要求 pt-br 覆盖全部英文键，新加的 20 键仅在用户授权的 en/zh 中，故此项未过；未修改其他语言或范围外测试。
- 完整输出保存在 [verification.txt](verification.txt)。未提交 git。


第 2 轮

改了什么

- `server/routes/instabox-snapshots.ts`、`server/routes/instabox-snapshots.e2e.test.ts`、`server/testing/fake-instabox-snapshots.ts`
- `src/locales/en.json`、`src/locales/zh.json`、`src/locales/pt-br.json`
- `docs/tasks/T-1200/T-1245-instabox-settings/verification.txt`、`docs/tasks/T-1200/T-1245-instabox-settings/report.md`

为什么

创建快照现在兼容快照对象和生命周期操作单：操作单完成后按本次生成的唯一名称查找快照，再等待 ready；假服务默认返回操作单，并保留快照对象开关，两种形状均有测试。pt-br 补齐本轮新增的 20 个英文键，并同步删除未使用的 `keys.instabox.configured`。验证记录改为仓库相对路径。公开接口文档 `https://api.instabox.sh/v1/openapi.json` 当前将 `POST /v1/machines/{id}/snapshots` 的 201/202 响应描述为 `Snapshot`；实现仍兼容任务约定的操作单返回。

测试命令与结果摘要

- `pnpm exec vitest run server/routes/instabox-snapshots.e2e.test.ts --maxWorkers=1`：12/12 通过；最终验收连续运行 3 次。
- `pnpm exec vitest run src/lib/i18n.test.ts --maxWorkers=1`：39/39 通过；`node scripts/generate-locale.mjs --check` 通过。
- 其余验收测试、`tsc -b`、`tsc -p tsconfig.server.json`、改动文件 `oxlint --deny-warnings`、行数门禁和 `git diff --check` 的结果已追加到 `verification.txt`。未提交 git。
