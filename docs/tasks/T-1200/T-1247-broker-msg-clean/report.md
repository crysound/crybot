# T-1247 本轮（2026-11-15）

改了什么（与 `git status --short --untracked-files=all` 一致，未提交）：

- `server/feishu-cli/protocol.ts`：增加只读 `brokerMessage`，保留 `error.message` 拼接格式。
- `server/feishu-cli/wrapper.ts`：抽出字符清洗函数；补齐 U+061C、U+180E、U+2060–2064、U+FEFF；依次清洗字符、压空白、替换 HTTP(S)/www 网址、按码点限长 300（含省略号），空串回退；直接读取 `brokerMessage`。
- `server/feishu-cli/wrapper.test.ts`：补充正文网址、大小写、零宽混淆、新增不可见字符、清洗顺序、长度边界、错误拼接格式变化及真实 Unix socket 401 回归。
- `server/feishu-cli/protocol.test.ts`：覆盖 401/403 的原始消息字段和兼容拼接格式。
- `docs/tasks/T-1200/T-1247-broker-msg-clean/report.md`：本轮报告。
- `docs/tasks/T-1200/T-1247-broker-msg-clean/verification.txt`：完整验证输出。

为什么：阻止 broker 正文中的钓鱼网址及不可见字符混淆进入智能体上下文，消除按授权链接长度切片的格式依赖。授权链接仍经原有同 origin 校验后单独追加；grep 确认 `turn.ts` 不输出 broker 正文，无需修改。

测试命令与结果摘要（逐文件串行，均使用临时目录/隔离 fixture）：

先运行 `crybot-link-deps`，成功链接 73 项。下表每行分别执行 `pnpm exec vitest run server/feishu-cli/<文件> --maxWorkers=1`：

| 文件 | 结果 |
| --- | --- |
| `wrapper.test.ts` | 43/43；初次通过后连续 3 次通过，含真实 broker 401 |
| `turn.test.ts` | 37/37 |
| `protocol.test.ts` | 2/2 |
| `broker.test.ts` | 29/29 |
| `config.test.ts` | 18/18 |
| `socket.e2e.test.ts` | 连续 3 次，每次 2/2 |
| `claude.e2e.test.ts` | 连续 3 次，每次 1/1 |
| `server.e2e.test.ts` | 最终连续 3 次，每次 2/2，无跳过；完整命令见下 |

服务器 e2e 最终命令：`TMPDIR=/tmp TMP=/tmp TEMP=/tmp pnpm exec vitest run server/feishu-cli/server.e2e.test.ts --maxWorkers=1 --reporter=verbose`。初次 3 轮每轮 1 通过、1 跳过，原因是默认临时目录 `/data/tmp` 不满足开盒用例的 `/tmp` 要求；改用 `/tmp` 后开盒、关盒场景均实际通过。仓库缺少 `docs/verification/README.md`，验证沿用现有隔离 fixture。

- `pnpm exec tsc --noEmit -p .`：通过。
- `pnpm exec tsc --noEmit -p tsconfig.server.json`：未通过；既有 `server/sessions.test.ts:79` 调用缺少必填 `label`（TS2741）。已确认该行存在于 HEAD，相关文件无本轮差异。
- `pnpm exec oxlint --deny-warnings server/feishu-cli/wrapper.ts server/feishu-cli/protocol.ts server/feishu-cli/wrapper.test.ts server/feishu-cli/protocol.test.ts`：通过。
- `git diff --check`：通过。

完整输出：[verification.txt](verification.txt)。
