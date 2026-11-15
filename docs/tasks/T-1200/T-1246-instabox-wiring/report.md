改了什么

接通服务端回合工具、VNC、快照路由与电脑面板；补齐缺钥匙禁选、设置保存后刷新、截图预览、快照等待预算、真实快照对象形状和 pt-br 的 bot 译法；修复配置测试隐式 any。文件清单与 `git status --short --untracked-files=all` 一致，未提交 git：

```text
 M server/index.ts
 M server/instabox/client.ts
 M server/instabox/power.test.ts
 M server/instabox/power.ts
 M server/routes/config-instabox.test.ts
 M server/routes/instabox-snapshots.e2e.test.ts
 M server/routes/instabox-snapshots.ts
 M server/testing/fake-instabox-core.ts
 M server/testing/fake-instabox-snapshots.ts
 M shared/place-view.ts
 M src/components/CloudBackendPicker.test.ts
 M src/components/CloudBackendPicker.tsx
 M src/components/ComputerPanel.tsx
 M src/components/InstaboxSnapshots.test.tsx
 M src/components/InstaboxSnapshots.tsx
 M src/lib/place-view.ts
 M src/locales/pt-br.json
?? docs/tasks/T-1200/T-1246-instabox-wiring/report.md
?? docs/tasks/T-1200/T-1246-instabox-wiring/verification.txt
?? server/instabox/wiring.e2e.test.ts
?? server/instabox/wiring.ts
?? src/components/ComputerPanel.instabox.test.ts
?? src/components/instabox-panel.test.ts
?? src/components/instabox-panel.ts
```

为什么

已有配置 schema、section 合并、加载及环境覆盖继续复用，并由真实入口验证保存、读回、广播和末四位脱敏。新增 `wiring.ts` 统一机器缓存与凭据；单个智能体的普通/群聊回合绑定 工具，画面沿用 `vps/<botId>`，服务端按机器编号区分连接，换机后旧连接失效。共用电脑、本地 VM、多屏保持原路径。

快照 API 单次请求上限 30 秒，轮询按剩余时间缩短 wait；服务端路由留 700 秒、前端留 720 秒。创建快照的 operations/list 断言移至 restore 之前。入口为 15463/15515 行，电脑面板为 1774/1782 行。

测试命令与结果摘要

- 开工运行 依赖准备脚本。验证 README 缺失；服务验证均使用临时数据目录、隔离入口和本地假服务。
- `pnpm exec vitest run <文件> --maxWorkers=1`：48 个相关文件最终全部通过，包含①–④全部 测试、`server/index.test.ts`（338）、`server/config.test.ts`（257）、`server/bot-box/env.test.ts`（11）、行数门禁及前端回归。完整逐文件命令见日志。
- 8 个 e2e 文件均连续 3 次通过：core（15）、computer-tools（29）、vnc（32）、wiring（3）、snapshots（12）、request-auth（2）、key-readback（2）、place-view（7）。VNC 设置 `CRYBOT_CDP_CHROME=/usr/bin/chromium`，无浏览器用例跳过；桌面代理 HTTP 测试另连续 3 次通过（38）。
- `pnpm exec tsc -p tsconfig.server.json`、`pnpm exec tsc -p tsconfig.json`：最终均通过。
- 改动 TS/TSX/JSON 的 `pnpm exec oxlint --deny-warnings`、`node scripts/generate-locale.mjs --check`、`git diff --check`：通过。
- 协调者仍需用真实钥匙核对真实快照耗时和部署反代的等待预算、真实 VNC 画面/输入、Android 冷启动，以及后台 activity lease 字段与续租行为。

完整输出（含修正前的 fixture/type-check 失败）见 [verification.txt](verification.txt)。


## 第 2 轮

改了什么（本轮文件清单，与 `git status --short --untracked-files=all` 一致；未提交）：

```text
 M docs/tasks/T-1200/T-1246-instabox-wiring/report.md
 M docs/tasks/T-1200/T-1246-instabox-wiring/verification.txt
 M server/index.ts
 M server/instabox/client.ts
 M server/instabox/wiring.e2e.test.ts
 M server/instabox/wiring.ts
 M server/routes/instabox-snapshots.e2e.test.ts
 M server/routes/instabox-snapshots.ts
 M server/testing/fake-instabox-core.ts
?? server/instabox/snapshot-wiring.e2e.test.ts
?? server/instabox/snapshot-wiring.ts
?? server/instabox/wiring-backends-fixture.ts
?? server/instabox/wiring.test.ts
```

为什么：快照变更与 VNC 启动复用 Boat/VPS 生命周期锁；快照复用普通回合、群聊、例行任务和控制占用检查，VNC 取锁后复查智能体及凭据。快照全流程共用 600 秒截止时间，单请求仍限 30 秒，覆盖查机、分页、轮询、正文读取与恢复后的桌面启动，并在断连时取消。回归覆盖双向并发、删机窗口及慢响应；box/vps 用例执行电脑工具并断言各自假后端收到命令。入口仍为 15463 行。

测试命令与结果摘要：

- `pnpm exec vitest run <文件> --maxWorkers=1`：22 个文件逐个通过，含 `server/instabox/` 全部、`server/index.test.ts`、快照路由、Boat/env 与行数门禁；7 个 e2e 文件及桌面代理 HTTP 测试均连续 3 次通过，VNC 设置 `CRYBOT_CDP_CHROME=/usr/bin/chromium`，浏览器用例实际执行。
- `pnpm exec tsc -p tsconfig.server.json`、`pnpm exec tsc -p tsconfig.json`、改动文件 `pnpm exec oxlint --deny-warnings`、`git diff --check`：全部通过。
- 验证 README 缺失；全部服务验证使用隔离 fixture。完整脱敏输出见 [verification.txt](verification.txt)。

## 第 3 轮

改了什么（未提交）：

```text
 M docs/tasks/T-1200/T-1246-instabox-wiring/report.md
 M docs/tasks/T-1200/T-1246-instabox-wiring/verification.txt
 M server/instabox/wiring-backends-fixture.ts
 M server/instabox/wiring.test.ts
 M server/instabox/wiring.ts
```

为什么：假后端输出改用 cloud desktop 的统一词汇；`CRYBOT_TEST_INSTABOX_API` 现在仅在测试环境开关启用时生效，生产进程忽略它，并新增了回归单测。

测试命令与结果摘要：

- `src/locales/vocabulary.test.ts` 通过 6 项；`server/instabox/` 下全部测试逐文件执行，147 项通过、1 项既有跳过；wiring e2e 连续 3 次通过（每次 6 项）。
- `pnpm exec tsc -p tsconfig.server.json`、改动文件 `pnpm exec oxlint --deny-warnings`、`git diff --check`：通过。
- 验证使用隔离 fixture；仓库未提供 `docs/verification/README.md`。完整输出见 [verification.txt](verification.txt)。
