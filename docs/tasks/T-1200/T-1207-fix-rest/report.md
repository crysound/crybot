# T-1207 收尾修复报告

日期：2026-11-14。未提交 git。先阅读了 lib 路报告的「仍失败的文件」一节；没有改 `.github/`、`docs/specs/`、NOTICE、LICENSE。

## 结果与改动

指定的文案契约、companion 向量、手机密钥及例程测试已通过。扩展服务端验证仍有沙箱阻塞和已在隔离 HEAD 副本复现的既有失败，不能声称服务端全量验收通过。

### 服务端显示名

- 逐项审阅 `rg -n 'CryBot' server --glob '*.ts'`；修改了 169 个服务端源码文件中的显示字符串，覆盖 CLI、错误、通知、提示词、例程、工具说明、发布提示等。`server/routine-requests.ts` 的两处启动文案已修正。
- 当前基线的 `server/user-errors.ts`、`server/drivers/driver-notices.ts`、`server/chat-notices.ts`、`server/routine-lines.ts` 已是正确显示名，未重复修改；已运行其契约及现有直接测试。
- 同步精确文本期望，保留断言的种类、权限条件和安全拒绝逻辑。`server/index.test.ts` 的 Identity 字符串字节数同步为 74；未删断言。
- `scripts/mcp-server.ts` 同步错误包装与显示文案，使 `server/headless/client.ts` 的错误文本解析与生产者一致；类名 `CryBotApiError` 等标识符保持不变。
- 保留代码标识符、环境变量、安装/备份文件名、包名、URL、User-Agent、MCP client name、任务调度器任务名、小写机器名，以及读取历史 provenance 文本的匹配规则。测试中的历史/恶意消息样本不改安全语义。
- locale 已登记的英文是正确的 `Cry Bot`；来源修正后检查通过，不需要改 locale JSON、source-hashes、扫描器或 PENDING 规则。

### Companion 与 relay 向量

- **未修改** `companion/src/e2e/descriptor.ts` 或 `isRelayHost`。
- V7 删除 `relay_host_suffix`、`relay_host_zero`、`relay_host_upper`、`relay_host_other_domain` 四个旧拒绝样本。加入要求的 localhost、子域 localhost、IPv4、十六进制主机、单标签、尾点六类，并补充数字/十六进制/裸 `0x` 末段、64 字符标签、255 字符全名，共 11 个新拒绝样本。
- 示例域名使用 `relay1.example.com` 等中性域名。生成器重建了 V1–V9；V7 为 9 个接受、33 个拒绝样本。
- 同步 `companion/src/e2e/vectors/v1.json`、`v1.sha256`，以及实际消费者 `relay/test/vectors/e2e-v1.json` 和 `relay/test/token.test.ts` 的固定摘要。两个 JSON 文件逐字节相同，摘要为 `890fefc8fcf55dd5c1efae3e53795e13a411bdade5db08ad56c0920d090b0adf`。没有放宽摘要断言。
- 搜索了完整检出中的 ios、android、watch/watchOS 目录名及 Swift/Kotlin 文件：没有 iOS、Android 或 watch 原生项目；唯一 Swift 文件是 `electron/resources/speech-helper.swift`，与这些协议无关。watch 相关 TS 文件是服务监视功能，不是原生客户端。没有 Swift/Kotlin 可供逐端验证，也没有修改 Swift/Kotlin。
- 发现 relay 的副本仍含旧 prologue 字节，已随全部向量一起同步。当前 companion 标签为 `cry-e2e/1`、`cry-e2e psk v1`、`cry-relay admission v1`；向量中无旧品牌明文残留。不能以本仓库检查代替未检出的手机客户端互操作测试。

### 手机密钥向量

- 新增 `scripts/generate-phone-secret-vector.ts`，使用 Node、`@hpke/core` 的 DHKEM(P-256, HKDF-SHA256) / HKDF-SHA256 / AES-256-GCM，与源码相同。
- 直接导入 `PHONE_SECRET_INFO` 和 `phoneSecretAAD(...)`。保留固定接收方 JWK、上下文字段和明文，使用公开测试专用的固定 ephemeral key material，重复运行得到完全相同的 encapsulatedKey/ciphertext。
- `server/phone-secret.test.ts` 只改固定向量两项数据并增加来源注释；按要求保留测试结构、标题及所有断言。注释说明 Node 生成脚本及原 CryptoKit 向量因标签改名失效。
- **未修改加解密源码** `server/phone-secret.ts`。协议 INFO 仍是 `CryBot phone credential v1`，AAD 前缀仍是 `crybot-phone-credential-v1`；这些是协议字节，不是显示名。本次 Node 向量不再声称提供 CryptoKit 互操作证据。

## 环境、隔离与限制

- 全部 Node 命令使用 `/opt/node24/bin/node`；Vitest 每条命令为 1–3 文件、`--maxWorkers=1`。没有使用 systemd-run。计划串行执行，但收尾发现工具中断未传播给早期 Python 驱动器，曾出现批次重叠；不声称完全满足批次串行约束，详见下项。
- Vitest 使用 `--configLoader runner`，避免共享只读依赖目录中的 Vite 临时构建输出。保留仓库 setup，使用临时 HOME、清除继承的数据目录、隔离 fixture；未请求用户运行中的服务或数据。
- `docs/verification/README.md` 在本检出和 HEAD 中都不存在。实际尝试了测试自带隔离 fixture，监听被拒；不据此声称完成真实 server/conversation 行为验证。
- loopback 探针实际返回 `EPERM listen EPERM: operation not permitted 127.0.0.1`，日志 `loopback-probe.log`。此外观察到 `spawnSync ... EPERM`，以及 Node 子进程退出 0 却没有预期 stdout（`child-probe.log`）；未为沙箱修改测试。
- 对早期三个驱动器发送中断时，工具返回 exit 130，但收尾审计发现 A/B 驱动器仍写入了后续结果；旧 session 句柄随后不可访问。已保存完整结果为 `batch-results.stopped.json`、`portable-results.stopped.json`、`remaining-results.stopped.json`，并将原结果路径设为拒绝写入的目录，使驱动器在当前调用返回后异常退出、无法启动下一批。当前 A20、B17、C6 未取得最终汇总，仍可能有未返回的子进程，不能宣称已全部回收。额外完成的日志也列入下表。最后一轮对两个被 hosting fixture 卡住的批次设外部 90 秒限时；这是运行限制，未改测试超时设置或断言。其中可独立运行的文件随后单独重跑，结果见后表。

## 核心验证与生成命令

以下日志均在 `/tmp/t1207-rest/`。Vitest 表中 `V <文件列表>` 表示完整命令：

```sh
/opt/node24/bin/node node_modules/vitest/vitest.mjs run <文件列表> --maxWorkers=1 --configLoader runner > /tmp/t1207-rest/<日志>.log 2>&1
```

| 命令/文件 | 关键输出 | 日志 |
|---|---|---|
| `V companion/test/e2e/vectors.test.ts server/phone-secret.test.ts` | 2 files passed; 141 tests passed | `crypto-tests.log` |
| `V src/lib/server-word-contracts.test.ts src/locales/server-lines.test.ts` | 2 files passed; 377 tests passed | `word-tests.log` |
| `V server/user-errors.test.ts server/chat-notices.test.ts server/routine-lines.test.ts` | 3 files passed; 27 tests passed | `known-tests.log` |
| `V server/routine-recovery.test.ts server/routine-requests.test.ts server/routines.test.ts` | 3 files passed; 362 tests passed | `final-batch-16.log` |
| `V server/pages/published-pages.test.ts server/runtime-coordinator.test.ts server/host/chief-notices-retry.test.ts` | 修正剩余精确文案后：3 files passed; 185 tests passed | `fixed-tests.log` |
| `/opt/node24/bin/node companion/src/e2e/gen-vectors.ts` | wrote v1.json 与摘要 | `generate-vectors.log` |
| `/opt/node24/bin/node companion/src/e2e/gen-vectors.ts --check` | vectors are current | `vectors-check.log` |
| `/opt/node24/bin/node scripts/generate-phone-secret-vector.ts`（运行两次）及 `cmp` 两次输出 | 两次完全相同；cmp exit 0 | `phone-vector.log`、`phone-vector-repeat.log`、`phone-repro.log` |
| `/opt/node24/bin/node --test --test-isolation=none --test-concurrency=1 relay/test/token.test.ts relay/test/wire.test.ts` | 24 tests / 5 suites / 24 pass / 0 fail | `relay-tests-isolated.log` |

relay 最初使用默认 Node test 子进程隔离只返回两个文件级状态，没有实际子测试输出；不以该结果作为验证证据，以上 24 条是禁用测试 runner 子进程隔离后的实际执行结果。

## 未通过与基线对照

- **既有邮箱失败**：`server/email/service.test.ts` 的 public-internet 拒绝文案断言期望 `My Cloud can only reach mail servers on the public internet.`，实际得到 secure-connection 错误。没有改此安全断言或相关校验源码。
- 用 `git archive HEAD` 在 `/tmp/t1207-rest/baseline` 建立完整独立源树，只链接现有 node_modules，再从该目录运行 `V server/email/service.test.ts server/host/secret-cards.test.ts server/host/browser.test.ts`。基线与修改后均为 **15 failed / 98 passed，2 failed files / 1 passed file，1 unhandled error**；失败用例相同。日志 `security-baseline.log` 与 `security-current.log`。
- `server/host/browser.test.ts` 的 14 条失败伴随实际 `listen EPERM`，基线一致。`server/host/secret-cards.test.ts` 在早期一批出现一次凭据选择断言失败；上述当前树和 HEAD 完整复跑均通过，保留早期日志，不隐藏该波动。
- `server/boat-delete-journal.test.ts` 的两个 worker 未回复即退出；`server/checkpoints.test.ts` / `server/config.test.ts` / `server/drivers/claude-keepwarm.test.ts` 有明确 spawnSync EPERM；browser-runtime、chatgpt-plan-api、CLI、data-format、control-cry、managed-desktop 等存在 socket、端口探测或假 CLI 不可用。各文件实际结果见下表，均未将失败记为通过。
- `server/engine-install.test.ts` 的 fake npm 无法通过 shebang 找到 node，8 failed / 8 passed；尝试给命令补 `PATH=/opt/node24/bin:$PATH` 后仍是相同失败，见 `engine-install-path.log`。未更改测试构造或放宽断言。
- 初轮 CLI、页面发布、重启及 Chief retry 的旧品牌精确期望均已修正，最终复跑通过。

## 服务端扩展测试逐批记录

每行列出实际 `V` 命令的完整文件参数、该批各文件结果和关键输出。**重复文件以最后一次完整执行为准**；早期失败和未完成批次保留。最终完整执行所覆盖的不同文件中，117 个通过、28 个未通过，另 2 个只有未完成批次记录；这不是全仓测试总数。

| 批次 | `V` 文件参数（各文件结果） | 关键输出 | 日志 |
|---|---|---|---|
| A1 | `server/agent-endpoint-models.test.ts`：通过<br>`server/auto-vm-claims.test.ts`：通过<br>`server/boat-create-idempotency.test.ts`：未通过 | Test Files  1 failed \| 2 passed (3); Tests  41 passed \| 14 skipped (55); Errors  1 error | `server-batch-01.log` |
| A2 | `server/boat-delete-journal.test.ts`：未通过<br>`server/boat-included.test.ts`：未通过<br>`server/boat-inventory.test.ts`：未通过 | Test Files  3 failed (3); Tests  2 failed \| 7 passed \| 53 skipped (62); Errors  2 errors | `server-batch-02.log` |
| A3 | `server/boat-recovery.test.ts`：未通过<br>`server/bot-package.test.ts`：通过<br>`server/browser-engine.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  103 passed \| 33 skipped (136); Errors  1 error | `server-batch-03.log` |
| A4 | `server/browser-lifecycle-cleanup.test.ts`：通过<br>`server/browser-runtime.test.ts`：未通过<br>`server/browser-tool-shape.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  75 failed \| 57 passed (132); Errors  1 error | `server-batch-04.log` |
| A5 | `server/browser/chrome/flags.test.ts`：通过<br>`server/browser/chrome/host-setup.test.ts`：通过<br>`server/browser/egress/hostile-pages.e2e.test.ts`：通过 | Test Files  2 passed \| 1 skipped (3); Tests  15 passed \| 6 skipped (21) | `server-batch-05.log` |
| A6 | `server/browser/egress/policy.test.ts`：通过<br>`server/browser/egress/registry.test.ts`：未通过<br>`server/browser/lent-chrome.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  14 failed \| 59 passed (73); Errors  6 errors | `server-batch-06.log` |
| A7 | `server/browser/passkey-notice.test.ts`：通过<br>`server/chat-widgets.e2e.test.ts`：未通过<br>`server/chat-widgets.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  1 failed \| 37 passed (38) | `server-batch-07.log` |
| A8 | `server/chatgpt-plan-api.test.ts`：未通过<br>`server/checkpoints.test.ts`：未通过<br>`server/chief-of-staff.test.ts`：通过 | Test Files  2 failed \| 1 passed (3); Tests  14 failed \| 18 passed \| 7 skipped (39) | `server-batch-08.log` |
| A9 | `server/claude-update.test.ts`：通过<br>`server/cli-lifecycle.test.ts`：通过<br>`server/cli-pair.test.ts`：通过 | Test Files  3 passed (3); Tests  30 passed (30) | `server-batch-09.log` |
| A10 | `server/cli-phone-setup.test.ts`：通过<br>`server/cli-reach.test.ts`：通过<br>`server/cli-relay.test.ts`：通过 | Test Files  3 passed (3); Tests  56 passed (56) | `server-batch-10.log` |
| A11 | `server/cli-setup.test.ts`：通过<br>`server/cli.test.ts`：未通过<br>`server/cloud-connections-prompt.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  3 failed \| 89 passed (92) | `server-batch-11.log` |
| A12 | `server/cloud-connections.test.ts`：通过<br>`server/cloud-health.test.ts`：通过<br>`server/cloud-move-http.test.ts`：通过 | Test Files  3 passed (3); Tests  27 passed (27) | `server-batch-12.log` |
| A13 | `server/composio-auth-configs.test.ts`：未通过<br>`server/computer-control-client.test.ts`：未通过<br>`server/config.test.ts`：未通过 | Test Files  3 failed (3); Tests  5 failed \| 246 passed \| 12 skipped (263); Errors  3 errors | `server-batch-13.log` |
| A14 | `server/connector-advertisement.test.ts`：通过<br>`server/connector-arguments.test.ts`：通过<br>`server/connector-proxy.test.ts`：未通过 | Test Files  1 failed \| 2 passed (3); Tests  29 failed \| 21 passed (50) | `server-batch-14.log` |
| A15 | `server/connector-scope-hint.test.ts`：通过<br>`server/connector-verdict.test.ts`：通过<br>`server/container-computer.test.ts`：通过 | Test Files  3 passed (3); Tests  138 passed (138) | `server-batch-15.log` |
| A16 | `server/context-rebuild.test.ts`：通过<br>`server/control-cry.test.ts`：未通过<br>`server/crybot-notifications.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  4 failed \| 95 passed (99) | `server-batch-16.log` |
| A17 | `server/custom-domain.test.ts`：通过<br>`server/data-format.test.ts`：未通过<br>`server/data/engine.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  5 failed \| 163 passed \| 1 skipped (169) | `server-batch-17.log` |
| A18 | `server/decider-included.e2e.test.ts`：未通过<br>`server/delta-context.e2e.test.ts`：未通过<br>`server/drivers/acp/acp.test.ts`：未通过 | Test Files  3 failed (3); Tests  219 failed \| 40 passed \| 6 skipped (265); Errors  1 error | `server-batch-18.log` |
| A19 | `server/drivers/acp/background-text.test.ts`：未通过<br>`server/drivers/acp/cursor.test.ts`：未通过<br>`server/drivers/agents-call-triggers.test.ts`：通过 | Test Files  2 failed \| 1 passed (3); Tests  34 failed \| 38 passed (72) | `server-batch-19.log` |
| B1 | `server/agent-endpoint-models.test.ts`：通过<br>`server/auto-vm-claims.test.ts`：通过<br>`server/boat-delete-journal.test.ts`：未通过 | Test Files  1 failed \| 2 passed (3); Tests  2 failed \| 48 passed (50) | `portable-batch-01.log` |
| B2 | `server/bot-package.test.ts`：通过<br>`server/browser-engine.test.ts`：通过<br>`server/browser-lifecycle-cleanup.test.ts`：通过 | Test Files  3 passed (3); Tests  120 passed (120) | `portable-batch-02.log` |
| B3 | `server/browser-runtime.test.ts`：未通过<br>`server/browser-tool-shape.test.ts`：通过<br>`server/browser/chrome/flags.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  75 failed \| 51 passed (126); Errors  1 error | `portable-batch-03.log` |
| B4 | `server/browser/chrome/host-setup.test.ts`：通过<br>`server/browser/egress/policy.test.ts`：通过<br>`server/browser/passkey-notice.test.ts`：通过 | Test Files  3 passed (3); Tests  65 passed (65) | `portable-batch-04.log` |
| B5 | `server/chat-widgets.test.ts`：通过<br>`server/chatgpt-plan-api.test.ts`：未通过<br>`server/checkpoints.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  14 failed \| 35 passed \| 7 skipped (56) | `portable-batch-05.log` |
| B6 | `server/chief-of-staff.test.ts`：通过<br>`server/claude-update.test.ts`：通过<br>`server/cli-lifecycle.test.ts`：通过 | Test Files  3 passed (3); Tests  32 passed (32) | `portable-batch-06.log` |
| B7 | `server/cli-pair.test.ts`：未通过<br>`server/cli-phone-setup.test.ts`：通过<br>`server/cli-reach.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  1 failed \| 59 passed (60) | `portable-batch-07.log` |
| B8 | `server/cli-relay.test.ts`：未通过<br>`server/cli-setup.test.ts`：通过<br>`server/cli.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  4 failed \| 88 passed (92) | `portable-batch-08.log` |
| B9 | `server/cloud-connections-prompt.test.ts`：通过<br>`server/cloud-connections.test.ts`：通过<br>`server/cloud-health.test.ts`：通过 | Test Files  3 passed (3); Tests  32 passed (32) | `portable-batch-09.log` |
| B10 | `server/cloud-move-http.test.ts`：通过<br>`server/config.test.ts`：未通过<br>`server/connector-advertisement.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  3 failed \| 240 passed \| 1 skipped (244) | `portable-batch-10.log` |
| B11 | `server/connector-arguments.test.ts`：通过<br>`server/connector-scope-hint.test.ts`：通过<br>`server/connector-verdict.test.ts`：通过 | Test Files  3 passed (3); Tests  41 passed (41) | `portable-batch-11.log` |
| B12 | `server/container-computer.test.ts`：通过<br>`server/context-rebuild.test.ts`：未通过<br>`server/control-cry.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  5 failed \| 175 passed (180) | `portable-batch-12.log` |
| B13 | `server/crybot-notifications.test.ts`：通过<br>`server/custom-domain.test.ts`：通过<br>`server/data-format.test.ts`：未通过 | Test Files  1 failed \| 2 passed (3); Tests  5 failed \| 139 passed \| 1 skipped (145) | `portable-batch-13.log` |
| B14 | `server/data/engine.test.ts`：通过<br>`server/drivers/acp/acp.test.ts`：未通过<br>`server/drivers/acp/background-text.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  184 failed \| 90 passed (274) | `portable-batch-14.log` |
| B15 | `server/drivers/acp/cursor.test.ts`：未通过<br>`server/drivers/agents-call-triggers.test.ts`：通过<br>`server/drivers/agents-call.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  23 failed \| 87 passed (110) | `portable-batch-15.log` |
| B16 | `server/drivers/chat-repeat-guard.test.ts`：通过<br>`server/drivers/claude-keepwarm.test.ts`：未通过<br>`server/drivers/codex-instructions.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  3 failed \| 23 passed (26) | `portable-batch-16.log` |
| C1 | `server/drivers/agents-call-triggers.test.ts`：通过<br>`server/drivers/agents-call.test.ts`：通过<br>`server/drivers/chat-repeat-guard.test.ts`：通过 | Test Files  3 passed (3); Tests  67 passed (67) | `remaining-batch-01.log` |
| C2 | `server/drivers/claude-keepwarm.test.ts`：未通过<br>`server/drivers/codex-instructions.test.ts`：通过<br>`server/drivers/codex-shared-home.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  3 failed \| 28 passed (31) | `remaining-batch-02.log` |
| C3 | `server/drivers/prompt-split.test.ts`：通过<br>`server/email/service.test.ts`：未通过<br>`server/engine-install.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  9 failed \| 48 passed (57) | `remaining-batch-03.log` |
| C4 | `server/fleet.test.ts`：通过<br>`server/harness/bus.test.ts`：通过<br>`server/harness/wsl-launch.test.ts`：通过 | Test Files  3 passed (3); Tests  64 passed (64) | `remaining-batch-04.log` |
| C5 | `server/headless/client.test.ts`：通过<br>`server/headless/doctor.test.ts`：通过<br>`server/headless/host-doctor.test.ts`：通过 | Test Files  3 passed (3); Tests  33 passed \| 1 skipped (34) | `remaining-batch-05.log` |
| D1 | `server/headless/run.test.ts`：未完成<br>`server/host/app-publisher.test.ts`：未完成<br>`server/host/browser.test.ts`：未完成 | 未完成：无最终 Vitest 汇总 | `final-batch-01.log` |
| D2 | `server/host/chief-notices-retry.test.ts`：未完成<br>`server/host/fill-login-turn.test.ts`：未完成<br>`server/host/included-hosting.test.ts`：未完成 | 未完成：无最终 Vitest 汇总 | `final-batch-02.log` |
| D3 | `server/host/loop-guard.test.ts`：通过<br>`server/host/person-first.test.ts`：通过<br>`server/host/secret-cards.test.ts`：未通过 | Test Files  1 failed \| 2 passed (3); Tests  1 failed \| 105 passed (106) | `final-batch-03.log` |
| D4 | `server/host/sign-in-settle.test.ts`：通过<br>`server/host/team-connections-host.test.ts`：通过<br>`server/incidents.test.ts`：通过 | Test Files  3 passed (3); Tests  46 passed (46) | `final-batch-04.log` |
| D5 | `server/lent-mcp.test.ts`：通过<br>`server/lent-screen-guidance.test.ts`：通过<br>`server/live-fish.test.ts`：通过 | Test Files  3 passed (3); Tests  47 passed (47) | `final-batch-05.log` |
| D6 | `server/login-email-code.test.ts`：通过<br>`server/login-fill.test.ts`：通过<br>`server/managed-desktop.test.ts`：未通过 | Test Files  1 failed \| 2 passed (3); Tests  2 failed \| 71 passed (73) | `final-batch-06.log` |
| D7 | `server/mcp-registry.test.ts`：通过<br>`server/mcp-shape.test.ts`：通过<br>`server/mcp-tool-schema.test.ts`：通过 | Test Files  3 passed (3); Tests  58 passed (58) | `final-batch-07.log` |
| D8 | `server/mcp-trim.test.ts`：通过<br>`server/meetings/manager.test.ts`：通过<br>`server/meetings/prompt.test.ts`：通过 | Test Files  3 passed (3); Tests  25 passed (25) | `final-batch-08.log` |
| D9 | `server/message-db.test.ts`：通过<br>`server/onepassword.test.ts`：通过<br>`server/org-library.test.ts`：通过 | Test Files  3 passed (3); Tests  89 passed (89) | `final-batch-09.log` |
| D10 | `server/outbound-hold.test.ts`：通过<br>`server/package-export.test.ts`：通过<br>`server/package-import.test.ts`：通过 | Test Files  3 passed (3); Tests  82 passed (82) | `final-batch-10.log` |
| D11 | `server/pages/published-pages.test.ts`：未通过<br>`server/peer-provenance.test.ts`：通过<br>`server/peer-roster.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  2 failed \| 184 passed (186) | `final-batch-11.log` |
| D12 | `server/phone-link.test.ts`：通过<br>`server/places-elsewhere.test.ts`：通过<br>`server/provenance-label.test.ts`：通过 | Test Files  3 passed (3); Tests  26 passed (26) | `final-batch-12.log` |
| D13 | `server/read-and-draft.test.ts`：通过<br>`server/recall.test.ts`：通过<br>`server/records-block.test.ts`：通过 | Test Files  3 passed (3); Tests  33 passed (33) | `final-batch-13.log` |
| D14 | `server/replies.test.ts`：通过<br>`server/request-auth.test.ts`：通过<br>`server/research.test.ts`：通过 | Test Files  3 passed (3); Tests  104 passed (104) | `final-batch-14.log` |
| D15 | `server/routes/published-pages.test.ts`：通过<br>`server/routes/waits.test.ts`：通过<br>`server/routine-execution.test.ts`：通过 | Test Files  3 passed (3); Tests  43 passed (43) | `final-batch-15.log` |
| D16 | `server/routine-recovery.test.ts`：通过<br>`server/routine-requests.test.ts`：通过<br>`server/routines.test.ts`：通过 | Test Files  3 passed (3); Tests  362 passed (362) | `final-batch-16.log` |
| D17 | `server/runtime-coordinator.test.ts`：未通过<br>`server/runtime/runtime.test.ts`：通过<br>`server/runtime/scenarios.test.ts`：通过 | Test Files  1 failed \| 2 passed (3); Tests  1 failed \| 233 passed (234) | `final-batch-17.log` |
| D18 | `server/secret-vault.test.ts`：通过<br>`server/setup-mode.test.ts`：通过<br>`server/shared-computers.test.ts`：通过 | Test Files  3 passed (3); Tests  73 passed (73) | `final-batch-18.log` |
| D19 | `server/skill-switch.test.ts`：通过<br>`server/store.test.ts`：通过<br>`server/surface.test.ts`：通过 | Test Files  3 passed (3); Tests  215 passed (215) | `final-batch-19.log` |
| D20 | `server/tailscale.test.ts`：通过<br>`server/team-manifest.test.ts`：通过<br>`server/today.test.ts`：通过 | Test Files  3 passed (3); Tests  31 passed (31) | `final-batch-20.log` |
| D21 | `server/waiting-on-person.test.ts`：通过<br>`server/webhook-address.test.ts`：通过<br>`server/webhooks.test.ts`：通过 | Test Files  3 passed (3); Tests  65 passed (65) | `final-batch-21.log` |
| D22 | `server/workspace-backup-maintenance.test.ts`：通过<br>`server/workspace-backup-team-private.test.ts`：通过<br>`server/x-research.test.ts`：通过 | Test Files  3 passed (3); Tests  52 passed (52) | `final-batch-22.log` |
| D23 | `server/your-computer-consent.test.ts`：通过<br>`server/cli-pair.test.ts`：通过<br>`server/cli-relay.test.ts`：通过 | Test Files  3 passed (3); Tests  20 passed (20) | `final-batch-23.log` |
| D24 | `server/context-rebuild.test.ts`：通过<br>`server/mcp-server.test.ts`：通过<br>`server/runtime/envelope.test.ts`：通过 | Test Files  3 passed (3); Tests  165 passed (165) | `final-batch-24.log` |
| E1 | `companion/test/e2e/vectors.test.ts`：通过<br>`server/phone-secret.test.ts`：通过 | Test Files  2 passed (2); Tests  141 passed (141) | `crypto-tests.log` |
| E2 | `src/lib/server-word-contracts.test.ts`：通过<br>`src/locales/server-lines.test.ts`：通过 | Test Files  2 passed (2); Tests  377 passed (377) | `word-tests.log` |
| E3 | `server/user-errors.test.ts`：通过<br>`server/chat-notices.test.ts`：通过<br>`server/routine-lines.test.ts`：通过 | Test Files  3 passed (3); Tests  27 passed (27) | `known-tests.log` |
| E4 | `server/pages/published-pages.test.ts`：通过<br>`server/runtime-coordinator.test.ts`：通过<br>`server/host/chief-notices-retry.test.ts`：通过 | Test Files  3 passed (3); Tests  185 passed (185) | `fixed-tests.log` |
| E5 | `server/email/service.test.ts`：未通过<br>`server/host/secret-cards.test.ts`：通过<br>`server/host/browser.test.ts`：未通过 | Test Files  2 failed \| 1 passed (3); Tests  15 failed \| 98 passed (113); Errors  1 error | `security-current.log` |
| E6 | `server/engine-install.test.ts`：未通过 | Test Files  1 failed (1); Tests  8 failed \| 8 passed (16) | `engine-install-path.log` |
| E7 | `server/host/fill-login-turn.test.ts`：通过 | Test Files  1 passed (1); Tests  17 passed (17) | `fill-login-tests.log` |
| E8 | `server/headless/run.test.ts`：通过 | Test Files  1 passed (1); Tests  12 passed (12) | `headless-run-tests.log` |

| A20 | `server/drivers/agents-call.test.ts`：未完成<br>`server/drivers/chat-repeat-guard.test.ts`：未完成<br>`server/drivers/chatgpt-plan-auth.test.ts`：未完成 | 未取得最终汇总；不计为通过 | `server-batch-20.log` |
| B17 | `server/drivers/codex-shared-home.test.ts`：未完成<br>`server/drivers/codex.test.ts`：未完成<br>`server/drivers/muse-code.test.ts`：未完成 | 未取得最终汇总；不计为通过 | `portable-batch-17.log` |
| C6 | `server/headless/main.test.ts`：未完成<br>`server/headless/run.test.ts`：未完成<br>`server/host/app-publisher.test.ts`：未完成 | 未取得最终汇总；不计为通过 | `remaining-batch-06.log` |

E6 使用了上述 PATH 前缀，其余 Vitest 命令均按 `V` 展开。基线对照只用于归因，不混入当前树通过数。

## 无法完整运行的对应测试

下列文件的完整执行命令均为 `V <该文件>`，即同一 Node 24、单 worker 命令；它们依赖 socket/子进程，未取得通过结果。部分已在早期驱动器的额外批次中执行并失败，实际完成状态以上表为准；其余未完整执行。没有新增 skip 或删除测试。

| 文件 | 原因 |
|---|---|
| `server/boat-create-idempotency.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/boat-included.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/boat-inventory.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/boat-recovery.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/browser/egress/registry.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/browser/lent-chrome.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/chat-widgets.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/composio-auth-configs.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/computer-control-client.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/connector-proxy.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/decider-included.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/delta-context.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/drivers/acp/acp.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/acp/background-text.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/acp/cursor.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/chatgpt-plan-auth.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/drivers/claude.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/drivers/codex.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/dweb-proxy.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/drivers/muse-code.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/openai-chat.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/openai-compat.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/phone-proxy.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/pi-mcp-extension.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/drivers/pi.test.ts` | 依赖 CLI/子进程 fixture；当前环境子进程探针未产出预期输出，未执行完整文件 |
| `server/engine-standalone.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/harness-mcp-proxy.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/headless/connect.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/headless/engine.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/headless/main.test.ts` | 依赖子进程或端口 fixture；未执行完整文件 |
| `server/headless/token.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/incidents.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/index.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/live-call.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/live-call.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/mcp-gate.test.ts` | 依赖子进程或端口 fixture；未执行完整文件 |
| `server/mcp-oauth.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/mcp-remote-proxy.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/mcp-restart.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/mcp-strict-handshake.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/openai-tools.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/org-library.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/permission-proxy.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/phone-relay.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/phone-relay.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/places-elsewhere.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/question-routing.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/request-auth.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/room-roots.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routes/bot-memory.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routes/bot-messages.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routes/desktop-viewer.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routes/instances.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routes/setup-import.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routine-cron.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/routine-recovery.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/runtime-coordination.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/runtime-roots.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/sentinel/cli.test.ts` | 依赖子进程或端口 fixture；未执行完整文件 |
| `server/shared-computers.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/vps-computer.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/vps-routing.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/vps-ssh.test.ts` | 依赖子进程或端口 fixture；未执行完整文件 |
| `server/webhook-address.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/workspace-backup-http.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/workspace-backup.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |
| `server/x-research.e2e.test.ts` | 源码明确需要监听 socket 或隔离 server fixture；未执行完整文件 |

`server/host/app-publisher.test.ts`、`server/host/included-hosting.test.ts` 通过 `startFakeAppHosting` 间接启动监听 fixture，所在批次限时终止；`server/host/fill-login-turn.test.ts`、`server/headless/run.test.ts` 和 Chief retry 随后单独/定向完整复跑通过。

## 收尾检查

- `/opt/node24/bin/node scripts/check-brand-residue.mjs`：通过，0 forbidden references（最终输出见 `brand-final.log`）。
- `/opt/node24/bin/node scripts/generate-locale.mjs --check`：通过，16 languages / 10550 English strings（`locale-final.log`）。
- `/opt/node24/bin/node node_modules/oxlint/bin/oxlint --deny-warnings <git diff --name-only 的改动文件及新增生成脚本/报告>`：退出 0（`lint-final.log`）。文件参数列表保存为 `changed-files.log`；非 JS/TS 工件由工具按其支持范围处理。
- `git diff --check`：退出 0（`diff-check-final.log`）。
- `rg -ni 'openmausbot' companion/src/e2e/vectors relay/test/vectors`：0 行（`vector-residue.log`）。
- 只做了与改动相关的定向运行，没有运行全仓测试或全量 tsc；lint 和 Vitest 不等同于完整类型检查。
