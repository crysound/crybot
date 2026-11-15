**改了什么**

| 文件 | 改动 |
| --- | --- |
| `docs/tasks/T-1200/T-1241-vm-engine-msg/report.md` | 记录实际修改文件、原因和验证结果。 |
| `docs/tasks/T-1200/T-1241-vm-engine-msg/verification.txt` | 保存测试命令与结果摘要，包括失败、基线复核和复跑。 |
| `server/bot-box/boot.test.ts` | 覆盖被过滤、受信任替代、未安装、隔离关闭四种启动情况。 |
| `server/bot-box/boot.ts` | 自检前对已配置且被隔离过滤的 CLI 记录警告。 |
| `server/bot-box/engine-availability.e2e.test.ts` | 真实隔离服务验证默认/自定义 CLI 的 snapshot、警告及未执行。 |
| `server/env-path.ts` | 保留被过滤的原始 PATH 目录供诊断，执行路径仍过滤。 |
| `server/index.ts` | 向启动自检提供启用引擎的已配置或默认 CLI。 |
| `server/procs.test.ts` | 覆盖隔离 reason、可信替代、真实缺失、绝对路径及旧版本缓存。 |
| `server/procs.ts` | 区分隔离拦截与未安装，提示安装到智能体不可写的位置。 |
| `src/components/ComputerPanel.engine.test.ts` | 覆盖中英文提示、恢复、设置跳转及例行任务默认运行位置。 |
| `src/components/ComputerPanel.tsx` | 区分能力不足与引擎不可用，显示 reason 并直达引擎设置。 |
| `src/lib/i18n.test.ts` | 用临时完整语言包验证完整性，避免假定其他语言永远全部翻译。 |
| `src/locales/en.json` | 新增英文不可用提示、原因兜底及设置按钮。 |
| `src/locales/zh.json` | 新增中文不可用提示、原因兜底及设置按钮。 |

**为什么**

引擎暂不可用不代表模型不支持私有桌面；HOME 中被隔离策略排除的程序也不等于未安装。例行任务仍须同时满足能力支持和实例可用，已用测试确认。仅新增 zh/en 文案。

**测试命令与结果摘要**

先运行 依赖准备脚本，成功链接 73 项依赖。以下每个文件均单独执行 `pnpm exec vitest run <文件>`，没有并行跑测试文件。

| 文件 | 结果 |
| --- | --- |
| `server/boot-readiness.e2e.test.ts` | 4 通过 (4)；连续 3 次通过 |
| `server/bot-box/boot.test.ts` | 4 通过 (4) |
| `server/bot-box/engine-availability.e2e.test.ts` | 1 通过 (1)；连续 3 次通过 |
| `server/bot-box/program-trust.test.ts` | 5 通过 (5) |
| `server/bot-box/self-check.linux.test.ts` | 1 失败 / 1 通过 (2) |
| `server/cli-probe-env.test.ts` | 2 通过 (2) |
| `server/cli-probe.test.ts` | 1 通过 (1) |
| `server/drivers/claude-box.test.ts` | 3 通过 (3) |
| `server/drivers/claude-keepwarm-box.test.ts` | 5 通过 (5) |
| `server/drivers/claude.test.ts` | 256 通过 / 1 跳过 (257) |
| `server/env-path.mac-runtimes.test.ts` | 2 通过 (2) |
| `server/env-path.test.ts` | 23 通过 / 17 跳过 (40) |
| `server/procs-windows-stop.test.ts` | 2 通过 (2) |
| `server/procs.test.ts` | 15 通过 (15) |
| `server/verification-fixture.e2e.test.ts` | 2 通过 (2)；连续 3 次通过 |
| `src/components/ComputerPanel.android.test.ts` | 7 通过 (7) |
| `src/components/ComputerPanel.browser.test.ts` | 7 通过 (7) |
| `src/components/ComputerPanel.engine.test.ts` | 8 通过 (8) |
| `src/components/ComputerPanel.focus.test.ts` | 12 通过 (12) |
| `src/components/ComputerPanel.i18n.test.ts` | 3 通过 (3) |
| `src/components/ComputerPanel.lazy.test.ts` | 9 通过 (9) |
| `src/components/ComputerPanel.live.test.ts` | 5 通过 (5) |
| `src/components/ComputerPanel.simple.test.ts` | 43 通过 (43) |
| `src/components/ComputerPanel.tabs.test.ts` | 11 通过 (11) |
| `src/components/ComputerPanel.takeover.test.ts` | 29 通过 (29) |
| `src/components/ComputerPanel.test.ts` | 5 通过 (5) |
| `src/lib/computer-messages.test.ts` | 1 通过 (1) |
| `src/lib/i18n.test.ts` | 39 通过 (39) |

- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec tsc -p tsconfig.json`：通过。
- `pnpm exec oxlint --deny-warnings <全部改动的 TS/TSX/JSON 文件>`：通过，完整文件参数见 verification.txt。
- `git diff --check`：通过。

`self-check.linux.test.ts` 的正常隔离检查通过；变异检查中 `share-net / no-direct-internet` 失败，因为当前沙箱连接公网探测目标超时。未修改基线 `4668ce2` 的独立 worktree 复现相同失败。18 个跳过用例均为 Windows 专用用例。

`verification-fixture.e2e.test.ts` 最初因 Node 同目录存在镜像预装 Codex/Claude 而失败，基线同样复现；将同一 Node 二进制复制到临时空目录并置于 PATH 首位后，同一命令连续三次通过，未修改该测试或产品逻辑。

仓库缺少 `docs/verification/README.md`；验证使用仓库临时 HOME 与独立服务 fixture。命令与结果摘要见 [verification.txt](verification.txt)。

## 第 2 轮

**改了什么**

| 文件 | 改动 |
| --- | --- |
| `docs/tasks/T-1200/T-1241-vm-engine-msg/report.md` | 清理公网探测地址，追加本轮实际修改与验收摘要。 |
| `docs/tasks/T-1200/T-1241-vm-engine-msg/verification.txt` | 删除原始日志，仅保留命令和结果摘要。 |
| `server/bot-box/boot.test.ts` | 验证 configuredClis 抛异常时仅记录一行诊断错误，自检仍执行并记录结果。 |
| `server/bot-box/boot.ts` | 用 try/catch 隔离诊断循环异常，错误日志压成一行。 |
| `server/bot-box/engine-availability.e2e.test.ts` | 自检日志断言只匹配自检已运行。 |
| `server/index.ts` | 启动诊断改用 providerConfigs() 获取实际生效的引擎。 |
| `src/components/ComputerPanel.engine.test.ts` | 增加中英文末尾句号、混合句号和空白字符测试。 |
| `src/components/ComputerPanel.tsx` | reason 插入中英文文案前去掉末尾英文句号、中文句号及空白。 |

**为什么**

诊断失败不应阻断自检，警告应对应实际生效的引擎；动态 reason 与中英文文案拼接时应只保留文案自身的标点。自检是否成功受运行环境影响，此 e2e 只需确认自检执行。公开任务文档只保留可公开的命令与结果摘要。

**测试命令与结果摘要**

- 依赖准备脚本：成功链接 73 项依赖。
- `pnpm exec vitest run <文件>`：18 份相关测试逐文件运行，233 通过、0 失败、0 跳过；其中启动诊断 5 通过，中英文界面提示 18 通过。逐条命令见 verification.txt。
- 以下 3 份 e2e 各连续运行 3 次，共 21 通过、0 失败、0 跳过；均使用独立 fixture。

| 命令 | 每次结果 |
| --- | --- |
| `pnpm exec vitest run server/bot-box/engine-availability.e2e.test.ts` | 1 通过；连续 3 次 |
| `pnpm exec vitest run server/boot-readiness.e2e.test.ts` | 4 通过；连续 3 次 |
| `pnpm exec vitest run server/verification-fixture.e2e.test.ts` | 2 通过；连续 3 次 |

fixture 测试将同一 Node 二进制放入临时空目录并加入 PATH 首位，避免发现镜像预装 CLI。

- `pnpm exec tsc -p tsconfig.server.json`：通过。
- `pnpm exec tsc -p tsconfig.json`：通过。
- `pnpm exec oxlint --deny-warnings <本轮全部改动的 TS/TSX 文件>`：通过，0 错误、0 警告；完整参数见 verification.txt。
- `git diff --check`：整理报告末尾空行后通过。
- `node --input-type=module` 调用 `scripts/public-scan/scan.mjs` 的 `scanDiff`，扫描 HEAD 至工作区全部改动并纳入未跟踪文件：0 命中；未配置 denylist 密钥，该项跳过。完整命令见 verification.txt。
