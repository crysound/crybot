1. 改了什么

第 2、3 轮实际改动文件（历史记录）：

```text
 M docs/tasks/T-1200/T-1242-instabox-core/report.md
 M docs/tasks/T-1200/T-1242-instabox-core/verification.txt
 M server/index.ts
 M server/instabox/core.e2e.test.ts
```

`server/index.ts` 当前 15449 行。本轮 `beginTurn` 的云策略判定改用已解析的 `cloudBackend`，因此 `run_on=cloud` 的 instabox 按 box 策略检查；instabox 删除失败改为抛出 503，外层 catch 仍会执行 browser cleanup abort。新增 index 层 e2e 回归覆盖 `run_on=cloud`、切换后删除、Boat 侧 5xx/网络错误降级、instabox 删除失败保留智能体。

2. 为什么

确保实际使用的云电脑类型与管理策略一致，避免 `run_on=cloud` 绕过 box 禁止策略；删除时保留 Boat/VPS 清理流程，并让 失败只在 instabox 智能体上阻止最终删除，同时保持浏览器清理回滚。

3. 测试命令与结果摘要

依赖准备脚本 已运行。仓库未提供 `docs/verification/README.md`；本轮使用临时目录、假引擎和 loopback 假 服务，未连接真实服务。

- `pnpm exec vitest run server/instabox/core.e2e.test.ts --maxWorkers=1`：7 项通过，连续 3 次通过。
- `pnpm exec vitest run server/cloud-backend.test.ts --maxWorkers=1`：12 项通过。
- `pnpm exec vitest run server/index.test.ts --maxWorkers=1`：338 项通过。
- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec oxlint --deny-warnings server/index.ts server/instabox/core.e2e.test.ts`：通过。
- `git diff --check`：通过。

完整输出见 [verification.txt](verification.txt)。

## 第 4 轮

1. 改了什么

本轮最终 `git status --short` 文件清单：

```text
 M docs/tasks/T-1200/T-1242-instabox-core/report.md
 M docs/tasks/T-1200/T-1242-instabox-core/verification.txt
 M scripts/control-cry.ts
 M server/instabox/core.e2e.test.ts
 M server/instabox/machines.test.ts
 M server/instabox/machines.ts
 M server/instabox/power.test.ts
 M server/instabox/power.ts
 M server/testing/desktop-parent.mjs
```

模板未指定时复用已有 机器的模板，新建机器仍默认 Linux；补充 Android 普通回合、Boat/VPS 归属机器删除、策略拒绝和 删除失败保留智能体的真实回合回归。`server/index.ts` 本轮净增 0 行，当前及基线均为 15449 行。`instaboxMachinesFor` 签名为 `function instaboxMachinesFor(cfg: AppConfig): InstaboxMachines | null`。

仍在用的文案键及中英文：

| 键 | 中文 | English |
| --- | --- | --- |
| `serverError.instabox.keyMissing` | 钥匙未配置 | API key is not configured |
| `serverError.instabox.template` | 模板必须是 linux 或 android | template must be linux or android |
| `serverError.instabox.unavailable` | 电脑访问不可用 | computer access is unavailable |

`autoSuspendAfterSeconds: 600` 是 自动挂起兜底，本轮没有另写定时器。

2. 为什么

让 Android 机器在普通回合未传模板时继续可用，并保持群聊调用所需的未指定模板语义；让策略判断真正覆盖 `beginTurn` 的后端选择，删除时按机器归属清理 Boat/VPS，删除网络错误返回 503 并保留智能体。

3. 测试命令与结果摘要

依赖准备脚本 已运行。旧策略判断临时恢复后，VPS 策略回合测试按预期失败，随后恢复正确实现。使用 loopback 假服务和临时目录，未连接真实服务。

- `pnpm exec vitest run server/instabox/core.e2e.test.ts --maxWorkers=1`：13 项通过，最终连续 3 次通过。
- `pnpm exec vitest run server/instabox/machines.test.ts --maxWorkers=1`：13 项通过。
- `pnpm exec vitest run server/instabox/power.test.ts --maxWorkers=1`：7 项通过。
- `pnpm exec vitest run scripts/control-cry.test.ts --maxWorkers=1`：9 项通过。
- `pnpm exec vitest run server/cloud-backend.test.ts --maxWorkers=1`：12 项通过。
- `pnpm exec vitest run server/index.test.ts --maxWorkers=1`：338 项通过。
- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec oxlint --deny-warnings`（本轮改动文件）：通过。
- `git diff --check`：通过。

完整输出见 [verification.txt](verification.txt)。

## 第 5 轮

1. 改了什么

本轮最终 `git status --short` 文件清单：

```text
 M docs/tasks/T-1200/T-1242-instabox-core/report.md
 M docs/tasks/T-1200/T-1242-instabox-core/verification.txt
 M scripts/control-cry.test.ts
 M scripts/control-cry.ts
 M server/instabox/core.e2e.test.ts
```

启动器只在假 地址通过原有回环正则时传入钥匙；环境过滤测试覆盖地址缺失、无效、有效及无钥匙。新增两个普通消息回合（不建例程、不带 `runOn`）：管理策略禁 box 时校验失败回合及准确拒绝文案，且无任何机器请求；真实云端家通过签名配对，并断言 `cloudHome: true`、回合成功、创建与桌面启动、该回合无 Boat 请求。追加本节并重新生成脱敏验证记录；未提交 git。

2. 为什么

避免宿主钥匙在未指定隔离假服务时进入子进程，并覆盖此前例程用例未经过的普通回合策略分支。云端家按允许分支验收：`server/cloud-home.ts:134` 的 `cloudHomePlaceRefusal` 只拒绝 local/vm，cloud 返回 undefined（第 137 行）；`server/index.ts:1540` 将云电脑传作 cloud，随后在第 8205 行调用 `ensureRunning`。

3. 测试命令与结果摘要

已运行 依赖准备脚本。仓库缺少 `docs/verification/README.md`；全部服务验证使用隔离临时目录和假服务。

自检：临时把 `server/index.ts:7933` 的 cloud 分支改成 undefined，运行 `pnpm exec vitest run server/instabox/core.e2e.test.ts --maxWorkers=1 -t 'refuses a normal turn'`，用例按预期失败（普通回合成功回复，缺少应有的策略拒绝）；随后恢复，`server/index.ts` 最终无 diff。

| 命令 | 结果 |
| --- | --- |
| `pnpm exec vitest run server/instabox/core.e2e.test.ts --maxWorkers=1` | 最终连续 3 次，每次 15 项全过 |
| `pnpm exec vitest run scripts/control-cry.test.ts --maxWorkers=1` | 10 项通过 |
| `pnpm exec vitest run server/cloud-backend.test.ts --maxWorkers=1` | 12 项通过 |
| `pnpm exec vitest run server/index.test.ts --maxWorkers=1` | 338 项通过 |
| `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=1` | 1 项通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm exec oxlint --deny-warnings scripts/control-cry.ts scripts/control-cry.test.ts server/instabox/core.e2e.test.ts` | 通过 |
| `git diff --check` | 通过 |
| `pnpm exec vitest run server/control-cry.test.ts --maxWorkers=1` | 19 过、1 失败；第 261 行预期仅 claude，实际还有 chatgpt。临时恢复 HEAD 中的启动器后复跑仍同样失败，确认是基线问题，未扩展修复，也未重复跑三次 |

完整输出（含预期失败的自检与基线复跑）见 [verification.txt](verification.txt)。


## 第 6 轮

1. 改了什么

- `src/locales/en.json`、`src/locales/zh.json`：补齐 `serverError.instabox.keyMissing`、`serverError.instabox.template`、`serverError.instabox.unavailable` 的简洁用户文案。
- `server/bot-box/env.test.ts`：将 `CRYBOT_TEST_INSTABOX_API` 加入 `SERVER_ONLY_CRYBOT`。
- `docs/tasks/T-1200/T-1242-instabox-core/report.md`、`docs/tasks/T-1200/T-1242-instabox-core/verification.txt`：追加本节并更新脱敏验证输出。以上五个文件与最终 git status 一致；未提交 git。

2. 为什么

修复 CI 的缺失翻译键和环境变量未分类失败。其他语言按现有部分目录规则回退英文；假服务地址仅供服务端测试使用，现有分类测试同时检查它不能传入智能体 box。

3. 测试命令与结果摘要

已执行 依赖准备脚本。仓库缺少 `docs/verification/README.md`；服务验证全部使用隔离 fixture 和假服务。以下 Vitest 命令均逐文件执行。

| 命令 | 结果 |
| --- | --- |
| `pnpm exec vitest run src/locales/sent-keys.test.ts --maxWorkers=1` | 2 项通过 |
| `pnpm exec vitest run server/bot-box/env.test.ts --maxWorkers=1` | 11 项通过 |
| `pnpm exec vitest run src/lib/i18n.test.ts --maxWorkers=1` | 39 项通过 |
| `pnpm exec vitest run scripts/generate-locale.test.mjs --maxWorkers=1` | 23 项通过 |
| `pnpm exec vitest run server/instabox/<file>.test.ts --maxWorkers=1` | client、key、machines、persistence、power 分别 6、4、13、1、7 项通过 |
| `pnpm exec vitest run server/instabox/core.e2e.test.ts --maxWorkers=1` | 连续 3 次，每次 15 项通过 |
| `pnpm exec tsc -p tsconfig.server.json`、`pnpm exec tsc -p tsconfig.json` | 均通过 |
| `pnpm exec oxlint --deny-warnings server/bot-box/env.test.ts src/locales/en.json src/locales/zh.json` | 通过 |
| `git diff --check` | 通过 |

完整输出见 [verification.txt](verification.txt)，已检查不含 IP、连接地址、域名或 UUID。


## 第 7 轮

1. 改了什么

本轮文件清单与 `git status --short` 一致；未提交 git。

```text
 M docs/tasks/T-1200/T-1242-instabox-core/report.md
 M docs/tasks/T-1200/T-1242-instabox-core/verification.txt
 M server/instabox/client.ts
 M server/instabox/machine.ts
 M server/instabox/machines.test.ts
 M server/instabox/machines.ts
 M server/testing/fake-instabox-core.ts
```

接口按要求原样增加 `options?: { maxBytes?: number }`；默认上限 256 MiB，先检查 Content-Length，再逐块累计，超限立即取消响应体或 reader。错误包含上限数值、不含钥匙或地址；拒绝无效上限。假服务记录发送块数及取消状态，测试覆盖提前拒绝、中途取消、正常及边界大小读取。

2. 为什么

防止文件被替换成超大内容后，在大小检查前完整读入共享服务内存。

3. 测试命令与结果摘要

已执行 依赖准备脚本。仓库仍缺少 `docs/verification/README.md`；所有服务验证使用隔离 fixture 和假服务。Vitest 均以 `pnpm exec vitest run <文件> --maxWorkers=1` 逐文件执行。

| 文件或命令 | 结果 |
| --- | --- |
| `server/instabox/machines.test.ts` | 24 项通过 |
| `server/instabox/client.test.ts` | 6 项通过 |
| `server/instabox/power.test.ts` | 7 项通过 |
| `server/instabox/core.e2e.test.ts` | 最终连续 3 次，每次 15 项通过 |
| `scripts/testing/file-size-ratchet.test.ts` | 1 项通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm exec oxlint --deny-warnings`（上述 5 个 TS 文件） | 通过 |
| `git diff --check` | 通过 |

此前两次完整 e2e 在 `core.e2e.test.ts:380` 出现间歇失败（期望 deleted，实际 suspended）。临时恢复 HEAD 的全部 5 个代码文件后，单独用例 6 次、完整 e2e 2 次均未复现，未确认原因；恢复本轮改动后最终三连过。完整命令、失败及成功输出均见 [verification.txt](verification.txt)，已检查不含 IP、连接地址、域名或 UUID。
