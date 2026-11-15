# 第 2 轮报告（2026-11-15）

## 本轮结果与文件

保留工作区已有改动，未 git 提交、未安装依赖、未改动范围外文件。本轮首次读取时，两项指定修正已在工作区中（会话冲突检查不再排除 token/owner，launch 测试已配置同 origin URL），因此保留并完成审查、补测及验收；本轮新补了两条 admin-only 策略测试。最终交付包含：

- `server/sessions.ts`：先检查同 person 的所有有效非飞书会话，再从合格飞书会话提取唯一 union_id，发生身份冲突即返回 undefined。
- `server/sessions.test.ts`：覆盖纯飞书、普通邮箱会话的两种签发顺序、token/owner 会话、同邮箱中继 person key、其他 accessIdentity、到期边界及不同 union_id；本轮补测被 admin-only 禁用的普通/飞书会话。
- `server/feishu-cli/turn.ts`：只有合法配置 URL 存在且 origin 相同才采用 broker URL，否则回退合法配置；配置非法或缺失不给链接。
- `server/feishu-cli/turn.test.ts`：覆盖不同主机/端口/协议、规范化相同 origin、缺失或非法配置；launch 失败测试明确配置同 origin URL，并断言采用 broker 链接、不采用配置链接、不能保留 warm contract。
- `server/feishu-cli/wrapper.ts`：broker 错误输出移除 C0/DEL/C1 控制字符，将换行等空白压为单个空格，按 Unicode 码点限制为最多 300 字符（含截断省略号），空消息回退原提示。
- `server/feishu-cli/wrapper.test.ts`：覆盖 ESC、换行及其他控制字符、300/301 字符边界、超长中文/emoji 和空消息，确认失败时不运行 CLI。
- `server/feishu-cli/server.e2e.test.ts`：保留同 origin 的配置 URL，使现有完整服务重新授权场景符合新规则。

## SessionRegistry 语义与过滤依据

- `token: true` 是脚本访问令牌标记，由带 `tokenTtlMs` 的配对签发；不是普通登录返回的 token 字符串。`issue()` 的普通邮箱会话不设置此标记。
- `owner` 是浏览器配对携带的所有者标记，随 `browser` 配对写入 cookie-only 会话；不等于邮箱登录的 `email`，也不表示会话无效。
- `personal(scopes)` 仅在启用 admin-only 策略且该会话没有 admin scope 时为真；这类会话也会被 `authenticate()` / `isLive()` 拒绝，所以不参与可用身份判断。
- `prune()` 先复核邮箱成员资格并移除到期会话。随后仅按 `!personal(scopes)` 和 `personKey(session) === person` 收集候选；任何候选没有 `feishu:` 身份都失败关闭，不能提前过滤 token/owner。提取 union_id 时仍排除 token/owner，且要求唯一值。
- `relayedPersonKey({ email })` 与普通会话的 `personKey` 使用同一个规范化邮箱哈希；测试用这两个入口断言相同邮箱冲突均被拒绝，不会因中继 key 绕过冲突检查。

对旧失败原因的澄清：`issue()` 本身既没有 token 标记，也没有 owner，因此不能仅凭旧失败断言它被 token/owner 过滤。普通邮箱会话还要求测试提供 `emailScopes`，否则 `authenticate()` 或 `prune()` 的成员资格复核会将其撤销。当前 fixture 已显式允许 admin/client，并断言普通会话确实可认证，避免测试在冲突检查前悄悄删除该会话。到期用例也验证了到期前拒绝、到期后恢复飞书身份两个边界。

## 验证命令与结果

1. `npx vitest run --maxWorkers=2 server/feishu-cli server/sessions`
   - 启动失败：Vite 尝试写共享只读 `node_modules/.vite-temp`，报 `EROFS`，尚未执行测试。
2. `npx vitest run --configLoader runner --maxWorkers=2 server/feishu-cli server/sessions`
   - 使用相同仓库配置，避免打包配置时写共享缓存；结果 **190 passed / 3 failed / 2 skipped**，文件为 7 passed / 2 failed。
   - `socket.e2e.test.ts` 两条失败：临时 HTTP upstream 监听 `127.0.0.1` 被沙箱拒绝，`listen EPERM`。
   - `claude.e2e.test.ts` 一条失败：permission broker 不能绑定临时 Unix socket，`listen EPERM` / `permission broker could not bind a local socket`。
   - `server.e2e.test.ts` 两条由现有环境检测跳过，不能算端到端通过；保留原检测和断言，未为沙箱增加 skip。
3. `npx vitest run --configLoader runner --maxWorkers=2 server/feishu-cli server/sessions --exclude 'server/feishu-cli/*.e2e.test.ts'`
   - **6 个文件、190 条测试全部通过**，退出码 0，包括任务指定回归和本轮新增测试。
4. `npx tsc --noEmit -p .`
   - 最终执行退出码 0，无报错。
5. `npx oxlint --deny-warnings server/sessions.ts server/sessions.test.ts server/feishu-cli/turn.ts server/feishu-cli/turn.test.ts server/feishu-cli/wrapper.ts server/feishu-cli/wrapper.test.ts server/feishu-cli/server.e2e.test.ts`
   - 退出码 0，无警告或错误；`git diff --check` 也通过。

测试日志保存在本机 `/tmp/T-1232-vitest.log`、`/tmp/T-1232-vitest-runner.log`、`/tmp/T-1232-units.log`、`/tmp/T-1232-tsc-final.log`、`/tmp/T-1232-lint.log`。

## 隔离 fixture 与待协调事项

仓库说明里引用的验证说明文档在当前检出不存在。Vitest 使用 server/testing 下已有 setup 提供的临时主目录，以及各测试独立的会话目录、假 CLI 和假 broker，不访问线上应用或用户数据。

另外实际尝试启动现有隔离服务 fixture：

```sh
/opt/node24/bin/node --input-type=module -e 'import { launchRestartableServer } from "./server/testing/restartable-server.ts"; const fixture = await launchRestartableServer(); try { console.log("isolated fixture ready", fixture.url); } finally { await fixture.close(); }'
```

Node 24.22.3 下在端口分配阶段失败：`no free port block for offsets 0,1 in 19600..22600`，日志 `/tmp/T-1232-fixture-node24.log`。此前默认 `/usr/bin/node`（22.22.1）的直接尝试不能加载 TypeScript，开启 strip-types 后又报告该构建不支持 TypeScript，因此改用已有 Node 24；未安装工具链。

需要协调者在允许 TCP/Unix socket、具备可用 bwrap 的隔离环境或 Actions 中补跑：

```sh
npx vitest run --maxWorkers=2 server/feishu-cli server/sessions
```

若同样使用共享只读依赖目录，加 `--configLoader runner`。也可单独复验受限项：

```sh
npx vitest run --configLoader runner --maxWorkers=2 server/feishu-cli/socket.e2e.test.ts server/feishu-cli/claude.e2e.test.ts server/feishu-cli/server.e2e.test.ts
```

本轮没有 Actions 结果，不声明完整服务或真实对话端到端验收通过。

## 第 3 轮（2026-11-15）

改了什么（本轮实际修改文件；未提交 git）：

- `server/feishu-cli/wrapper.ts`：提供共用授权 URL 选择函数；先移除 `BrokerAuthorizationError.message` 末尾附带的 URL，再清洗消息、附上可信链接；新增零宽与双向控制符清洗。
- `server/feishu-cli/turn.ts`：调用共用函数，选中的链接使用 `URL.href` 规范化。
- `server/feishu-cli/wrapper.test.ts`：区分配置与 broker 链接，覆盖异源、同源、非法/缺失配置、非 ASCII URL、空消息和全部指定零宽/双向控制符。
- `server/feishu-cli/turn.test.ts`：补充同 origin 的非 ASCII broker 链接规范化断言。
- `server/sessions.test.ts`：只添加纵深防御注释，测试逻辑未改。
- `docs/tasks/T-1200/T-1232-broker-hardening/report.md`：追加本轮报告。
- `docs/tasks/T-1200/T-1232-broker-hardening/verification-r3.txt`：保存验证命令、完整输出、退出码及环境探测结果。

为什么：包装器刷新令牌失败时也必须遵守「配置有效且 origin 一致才采用 broker 链接，否则回退配置，配置无效不给链接」，防止异源授权链接进入智能体上下文。URL 规范化及控制符清洗减少文本伪装。会话测试通过修改 `authenticate()` 返回记录的 email 构造身份碰撞，是纵深防御；线上飞书会话不带 email。

测试命令与结果（均逐文件、单 worker；全部退出码 0）：

| 命令 | 结果 |
| --- | --- |
| 依赖准备脚本 | 链接 73 项预装依赖 |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/wrapper.test.ts` | 33 passed |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/turn.test.ts` | 37 passed |
| `pnpm exec vitest run --maxWorkers=1 server/sessions.test.ts` | 87 passed |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/broker.test.ts` | 29 passed |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/config.test.ts` | 18 passed |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/protocol.test.ts` | 1 passed |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/socket.e2e.test.ts` | 连跑 3 次，每次 2 passed |
| `pnpm exec vitest run --maxWorkers=1 server/feishu-cli/claude.e2e.test.ts` | 连跑 3 次，每次 1 passed |
| `TMPDIR=/tmp TMP=/tmp TEMP=/tmp pnpm exec vitest run --maxWorkers=1 server/feishu-cli/server.e2e.test.ts` | 连跑 3 次，每次 2 passed，无跳过 |
| `pnpm exec tsc --noEmit -p .` | 通过 |
| `pnpm exec oxlint --deny-warnings server/feishu-cli/wrapper.ts server/feishu-cli/wrapper.test.ts server/feishu-cli/turn.ts server/feishu-cli/turn.test.ts server/sessions.test.ts` | 通过 |
| `git diff --check` | 通过 |

完整服务 e2e 初次使用默认 `/data/tmp`，三次均为 1 passed / 1 skipped；现有测试要求沙箱场景的临时目录位于 `/tmp`，因此设置上述环境变量重跑，两个场景均连续三次通过。TCP、Unix socket 和 bwrap 可用，无遗留未运行项。`docs/verification/README.md` 在当前检出缺失；测试使用现有临时 HOME、假 CLI/broker，完整服务 e2e 实际启动并关闭 `launchRestartableServer` 隔离 fixture，未使用用户 live app 或数据。完整输出见同目录 `verification-r3.txt`。
