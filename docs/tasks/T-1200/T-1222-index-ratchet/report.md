# T-1222-00 第 1 轮报告

日期：2026-11-14。工作分支：`T-1222-index-ratchet`。

## 1. 改动文件

- `server/index.ts`：移出 SOUL.md 文件操作与历史回滚路由，保留模块导入、依赖注入和注册，删除随迁移失去用途的导入。
- `server/routes/bot-profile-files.ts`：新增 `createBotProfileFilesRoutes`，通过 `deps` 注入 `store`、`wireBot`、`broadcast`，承接读取、应用、丢弃 SOUL.md 文件修改及读取、回滚历史的五个路由。
- `server/routes/bot-profile-files.test.ts`：补充三个行为测试，断言读取记录与文件漂移不会应用修改、缺失 bot 返回 404、邻近路径和不支持的方法返回 `PASS`。
- 本报告：通过 `/root/workspace/claude-setup/bin/task-paths report T-1222-index-ratchet` 计算落点；保留已有 `brief.md`。

迁移的两段路由共 105 行，与 HEAD 原文逐字节一致；只在模块外层增加依赖接口、工厂和 `PASS`。原 `index.ts` 第 12590–12840 行逐字节保留。未修改登录文件、棘轮数字、前端或移动端代码。

## 2. 验证命令和结果

### 开工基线

`wc -l server/index.ts` 输出 `15564 server/index.ts`，比任务背景的 15562 多 2 行，以当前工作树实测为准。

修改代码前尝试：

```sh
systemd-run --scope -q -p MemoryMax=2G pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=2
```

退出码 1，输出如下；vitest 未启动，不能记为测试失败或通过：

```text
Failed to connect to system scope bus via local transport: Operation not permitted (consider using --machine=<user>@.host --user to connect to bus of other user)
```

尝试同一命令加 `--user` 仍退出 1：用户级 bus 所需的 `DBUS_SESSION_BUS_ADDRESS` 和 `XDG_RUNTIME_DIR` 未定义。已询问能否直接运行本地检查；截至本轮报告未收到许可，未绕过要求运行重命令。

随后在修改代码前，用 Python 按棘轮的 `git ls-files` 文件集合、排除规则、上限和换行计数执行轻量扫描，得到以下结果（这是静态扫描，非 vitest 输出）：

```text
server/config.ts grew to 1251 lines (listed at 1245): move code out, do not add here
server/index.ts grew to 15564 lines (listed at 15515): move code out, do not add here
server/store.ts grew to 2295 lines (listed at 2291): move code out, do not add here
src/components/ChatView.tsx grew to 1295 lines (listed at 1293): move code out, do not add here
src/components/ComputerPanel.tsx grew to 1785 lines (listed at 1782): move code out, do not add here
src/components/GroupView.tsx grew to 1222 lines (listed at 1220): move code out, do not add here
src/components/LocalComputerSection.tsx grew to 1439 lines (listed at 1437): move code out, do not add here
```

### 本地已完成检查

- Python 对比 `git show HEAD:server/index.ts` 与新模块：两段迁移代码逐字节一致；原第 12590–12840 行仍完整包含于新 `index.ts`；换行数为 15460，满足 15515 上限；棘轮文件无 diff。
- `/opt/node24/bin/node --check server/index.ts`：通过。
- `/opt/node24/bin/node --check server/routes/bot-profile-files.ts`：通过。
- `/opt/node24/bin/node --check server/routes/bot-profile-files.test.ts`：通过。
- `git diff --check`：通过。
- `wc -l server/index.ts server/routes/bot-profile-files.ts server/routes/bot-profile-files.test.ts`：分别为 15460、127、82 行。

默认 `node` 是 22.22.1，直接 `node --check *.ts` 不识别扩展名；加 `--experimental-strip-types` 后语法检查通过，也已用现成的 Node 24 再确认。未安装依赖。

`systemd-run --scope -q -p MemoryMax=2G pnpm typecheck` 同样因 system bus 权限退出 1，`tsc` 未启动。不能声称类型检查或行为测试通过。

### 协调者待执行

请在 Node 24 及可用的 systemd scope 环境中执行以下检查，vitest 均保持两个 worker：

```sh
systemd-run --scope -q -p MemoryMax=2G pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts scripts/testing/index-route-ratchet.test.ts server/routes/bot-profile-files.test.ts server/bot-folder.test.ts server/bot-profile.test.ts server/profile-versions.test.ts --maxWorkers=2
systemd-run --scope -q -p MemoryMax=2G pnpm exec vitest run server/index.test.ts --maxWorkers=2 -t 'soul|SOUL|apply-file|rollback|instruction changes|file actions|own profile change'
systemd-run --scope -q -p MemoryMax=2G pnpm exec vitest run server/cloud-team-privacy-holes.e2e.test.ts --maxWorkers=2
systemd-run --scope -q -p MemoryMax=2G pnpm typecheck
```

现有 `server/index.test.ts` 覆盖文件读取、应用与丢弃、修订冲突、未见过的文件版本拒绝、历史正文默认隐藏、唯一历史行回滚、脱敏历史拒绝还原、不可读文件等行为；隐私集成测试覆盖这些路径的访问隔离。新增模块测试覆盖分派边界。

`AGENTS.md` 引用的 `docs/verification/README.md` 在本工作树不存在。已阅读现有测试的临时目录与隔离服务器启动方式；本轮因重命令限制未能启动隔离服务器，未访问用户运行中的 app 或数据，不声称服务端行为已验证。上述集成检查须使用其已有的隔离夹具。完整 CI 留待协调者推分支、开草稿 PR 后核验；本次纯服务端迁移不涉及真机功能变更。

## 3. 行数

**起点 → 完工：15564 → 15460。** 净减 104 行；上限保持 15515，剩余 55 行。新模块 127 行，低于新文件列入棘轮的 1000 行门槛。

## 4. 协调者事项

- 本地 vitest、隔离服务端验证及 `tsc` 尚未运行，原因是 systemd scope 不可用；需按上列命令补验，或授权直接本地运行后继续。
- 另外六个文件已有超限，保持原状；因此即使本项修复，整个文件棘轮测试仍预计失败，不能宣称 CI 全绿。请协调对应任务处理或在 PR 报告中注明。
- 核对缺失的验证 README 是否应恢复；本任务未新增或修改该文件。
- 无新增依赖，无产品代码范围外改动，未触发规格列举的停止条件；当前阻碍是验证环境限制。
- 未 git 提交、未联网、未安装依赖。提交、推送、草稿 PR、Actions 和合并由协调者处理。
