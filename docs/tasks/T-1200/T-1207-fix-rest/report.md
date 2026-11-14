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

## 第 2 轮（审核返工）

日期：2026-11-14；基于 `dded30f`。本轮不提交 git；未改 `.github/`、`docs/specs/`、NOTICE、LICENSE，保留用户已有的 `r2.md`。下列结果只针对隔离测试，未接触运行中的用户服务或数据。

### 必改及建议的处理

1. **显示名及对应测试**：指定的 `desktop-computer`、`claude-elicitation`（7 个用例）、`mcp-gate`、`chat-mcp-tools`、`phones.e2e`、`loop-guard.e2e`、`mcp-cards.e2e`、`desktop-computer.e2e`、`cloud-lending-browser.e2e`、`group-local-vm.e2e` 的显示文案期望已改为 `Cry Bot`，断言逻辑不变。`shared/your-computer.ts` 两条提示统一，并同步桌面控制/聊天视图的显示期望。
   - 按要求全量扫描 `server src shared companion electron scripts` 的 TS/TSX/MJS，并对字符串、模板、正则及 JSX 文本逐项复核；清理发现的 shared 提示语、客户端错误匹配、companion 错误及控制页、Electron 通知/错误/窗口文案、验证脚本文案和相关测试期望。Widget 的示例应用标题改为 `Cry Bot Mobile`。追踪原生窗口测试的实际生产者，另同步三个 `.cjs` 文件中的窗口/登录提示；连接标题的主机名期望对齐夹具已有的 `server.example.test`。
   - 保留标识符及翻译键、协议字节（包括 `PHONE_SECRET_INFO`）、URL、安装/备份路径、User-Agent、MCP 名称、Windows 登录任务名、证书测试 CN、向量元数据、临时模型探测仓库的 git 身份；不改读取历史消息的解析式及其历史/恶意输入样本，以及禁止旧拼写的负向断言。注释和非产品显示的测试标题不作无关改写。逐项分类见 `/tmp/t1207-rest2/brand-audit.log`；完整 grep 结果见 `residue-after.log`。
   - 验证发现手机连接帮助 manifest 仍只含旧拼写触发词：补充带空格的三个触发词、保留旧词兼容，同步该帮助正文显示名；输入匹配测试同时覆盖新旧拼写。没有改选择技能的实现。
2. **Fish 前缀**：客户端改为 `[Cry Bot]`，与服务端现有常量一致；客户端发送期望同步。服务端测试新增跨端常量相等断言，并验证 `defuse()` 对新旧前缀、大小写、零宽字符和重复空格的伪造更新均转义开括号。没有改防护实现。
3. **恢复 SMTP 安全测试**：从 `4a11408` 恢复 `server/sign-in-mail.test.ts` 的全部 8 个用例；仅为缺少配置的 `createEmailSignIn` 调用显式传入 `env: { CRYBOT_SIGNIN_SMTP_URL: URL_ }`，保留注入的 `mailTransport`，同步邮件主题显示名。原有 38 个 `expect()` 全保留，覆盖一次性验证码、有效期、错误次数、重发节流、SMTP 失败及 STARTTLS 要求。
   - `server/email-signin.test.ts` 的 7 个用例全部恢复，**没有删除托管流程用例**。原有用例本身均验证仍在使用的路由/会话安全语义，只有旧 control-plane 邮件夹具过时。
   - 用 `startFakeSmtp`、`testCertificate` 替换已删除的 control-plane 夹具。子服务器在临时 HOME 中运行，配置 SMTP 和独立测试证书信任，从对应收件人的 SMTP 邮件解析真实验证码。保持 JSON-only、名单拒绝、管理员/成员权限、域名单、来源锁定、降级撤销全部邮件会话与 SSE/stream ticket、配对设备不受影响、外部移除名单后旧 cookie 永不复活的断言。
   - 一次性 SMTP 验证码不能复用旧 stub 的固定 OTP；锁定测试在另一来源申请新验证码，额外确认已锁来源拿到正确码仍为 429，而另一来源成功。错误码选择保证不偶然等于随机验证码。原有 50 个 `expect()` 变为 55 个，没有降低安全要求；夹具失败时也能清理已创建资源。示例域名使用 `team.example.test`。
4. **恢复团队策略测试**：从 `4a11408` 恢复 `server/cloud-team-policy.test.ts` 的全部 20 个用例、81 个 `expect()`。签名实现仍在，保留签名向量用例，按当前 `cry-team-policy-v1` 构造独立重算 HMAC-SHA256；指纹向量不变。`remoteAccessPaths(false)` 的 `/api/auth/pair`、`/api/pair`、`/api/auth/pairing`、`/api/auth/email/start`、`/api/auth/email/verify` 拦截契约完整保留。
5. **两项建议**：手机密钥用例标题明确为 deterministic Node HPKE，移除误导性的 CryptoKit 历史注释，向量和加解密实现均未改。`CompanyBackupSettings.test.ts` 从 `4a11408` 完整恢复 33 个用例、188 个 `expect()`，仅同步 `Fully quit Cry Bot`；选中备份校验、精确输入 REPLACE、恢复标记持久化失败不覆盖数据等断言全部保留。

### 策略签名向量的可复现生成

以下命令使用 Node 标准库独立计算，与源码同样采用请求体 SHA-256/base64url，再以五段 LF 分隔文本做 HMAC-SHA256/base64url；密钥是 UTF-8 的 43 个 `s`，末尾没有额外换行。输入均为公开测试数据，不涉及真实密钥。

```sh
/opt/node24/bin/node --input-type=module <<'JS' > /tmp/t1207-rest2/policy-vector.log 2>&1
import { createHash, createHmac } from 'node:crypto';
const body = '{"v":1,"loaded":null,"problem":null}';
const bodyHash = createHash('sha256').update(body).digest('base64url');
const signed = ['cry-team-policy-v1', 'cm-test-home', '1792670400', 'nonce-nonce-nonce-1', bodyHash].join('\n');
console.log(createHmac('sha256', 's'.repeat(43)).update(signed).digest('base64url'));
JS
```

输出：`JVsynawDsAzL5a-kvJ-dhKN9G30Snd91_tZ3b8pfzrs`。不再声称该值已在未检出的上游仓库中固定。

### 本轮验证环境

- 直接使用 `/opt/node24/bin/node`，不用 systemd-run。Vitest 始终 `--maxWorkers=1 --configLoader runner`，每次 1–3 文件，批次串行；Node 原生测试也每批至多 3 文件，`--test-isolation=none --test-concurrency=1`。
- 日志全部位于 `/tmp/t1207-rest2/`，仅查看 tail/grep 摘要。常规 Vitest setup 给每文件创建临时 HOME、删除继承的数据目录；邮件路由另外启动独立 HOME 的服务器/SMTP 夹具，原生测试沿用自身临时夹具。
- `docs/verification/README.md` 本检出仍不存在；不能声称完成其中未能读取的验收流程。真实 SMTP 用例实际返回 `listen EPERM: operation not permitted 127.0.0.1`；其他测试也遇到 Unix socket/子进程 EPERM。邮件路由夹具停在 OpenSSL 测试证书创建失败，7 个用例未执行。不为沙箱改 skip、超时设置或断言。
- 扩展批次设置外部 55 秒上限，超时后终止该批次进程组并等待退出，再运行下一批；不把无最终汇总的批次算作通过。命令清单与退出结果见 `batches.json`、`batch-results.json`。

### 测试命令和关键输出

下表 `V <文件>` 展开为：

```sh
/opt/node24/bin/node node_modules/vitest/vitest.mjs run <文件> --maxWorkers=1 --configLoader runner > /tmp/t1207-rest2/<日志>.log 2>&1
```

`N <文件>` 展开为：

```sh
/opt/node24/bin/node --test --test-isolation=none --test-concurrency=1 <文件> > /tmp/t1207-rest2/<日志>.log 2>&1
```

批次驱动器另外给子进程 PATH 前置 `/opt/node24/bin`。`baseline-*` 仅在 `git archive HEAD` 得到的 `/tmp/t1207-rest2/baseline` 独立树中运行，只用于归因，不算当前树通过数。`fix-*` 是修正/拆分后的最终复跑，覆盖相同文件的早期结果。`skipped` 是仓库既有条件或夹具失败所致，本轮没有新增 skip。

| 日志 | 命令的完整文件参数 | 关键输出 / 退出状态 |
|---|---|---|
| `core-tests.log` | `V server/live-fish.test.ts src/lib/live-call-fish.test.ts server/cloud-team-policy.test.ts` | Test Files  3 passed (3); Tests  62 passed (62); exit 0 |
| `restored-tests.log` | `V server/sign-in-mail.test.ts src/components/CompanyBackupSettings.test.ts server/phone-secret.test.ts` | Test Files  1 failed \| 2 passed (3); Tests  1 failed \| 68 passed (69); Errors  1 error; exit 1; listen EPERM |
| `email-desktop-tests.log` | `V server/email-signin.test.ts server/desktop-computer.test.ts server/drivers/claude-elicitation.test.ts` | Test Files  1 failed \| 2 passed (3); Tests  23 passed \| 7 skipped (30); exit 1; OpenSSL 测试证书夹具失败 |
| `v01.log` | `V companion/test/proxy-response.test.ts companion/test/upstream-failure.test.ts electron/capabilities.test.mjs` | 外部 55s 限时；无完整汇总，不计通过 |
| `v02.log` | `V electron/cua-restart.test.mjs electron/diagnostics.test.mjs scripts/generate-locale.test.mjs` | Test Files  2 failed \| 1 passed (3); Tests  4 failed \| 106 passed (110); exit 1; spawnSync git EPERM |
| `v03.log` | `V scripts/testing/deploy-update.test.ts scripts/verify-engines-ui.test.mjs server/boat-inventory.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `v04.log` | `V server/bot-box/box.test.ts server/bot-visibility.test.ts server/cloud-health.test.ts` | Test Files  1 failed \| 2 passed (3); Tests  3 failed \| 65 passed (68); exit 1; listen EPERM |
| `v05.log` | `V server/cloud-home-server.test.ts server/composio-auth-configs.test.ts server/custom-domain.test.ts` | Test Files  2 failed \| 1 passed (3); Tests  104 passed \| 25 skipped (129); Errors  1 error; exit 1; 隔离端口分配失败; listen EPERM |
| `v06.log` | `V server/default-bot.test.ts server/drivers/acp/opencode-go.test.ts server/drivers/chat-mcp-tools.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `v07.log` | `V server/harness-mcp-proxy.test.ts server/headless/run.test.ts server/host/person-inbox.test.ts` | Test Files  1 failed \| 2 passed (3); Tests  42 passed \| 17 skipped (59); Errors  1 error; exit 1; listen EPERM |
| `v08.log` | `V server/host/proactive-crybot.test.ts server/host/published-apps.test.ts server/host/team-messages.test.ts` | Test Files  3 passed (3); Tests  57 passed (57); exit 0 |
| `v09.log` | `V server/independent-threads-api.test.ts server/local-computer.test.ts server/mcp-gate.test.ts` | Test Files  3 failed (3); Tests  41 failed \| 22 passed \| 1 skipped (64); exit 1; 隔离端口分配失败; listen EPERM; 子进程在回复前退出 |
| `v10.log` | `V server/model-providers-docs.test.ts server/own-home.test.ts server/paired-thread-targets-api.test.ts` | Test Files  2 failed \| 1 passed (3); Tests  4 passed \| 3 skipped (7); exit 1; 隔离端口分配失败; 缺少文档源文件 |
| `v11.log` | `V server/peer-provenance.test.ts server/records-block.test.ts server/registry-save.test.ts` | Test Files  3 passed (3); Tests  111 passed (111); exit 0 |
| `v12.log` | `V server/routes/internal-mcp.test.ts server/runtime/envelope.test.ts server/setup-suggestions.test.ts` | Test Files  3 passed (3); Tests  182 passed (182); exit 0 |
| `v13.log` | `V server/skill-library.test.ts server/system-prompt.test.ts server/team-backup.test.ts` | Test Files  2 failed \| 1 passed (3); Tests  2 failed \| 95 passed (97); exit 1 |
| `v14.log` | `V server/team-memory.test.ts server/testing/fake-claude-dump.test.ts server/today.test.ts` | Test Files  1 failed \| 2 passed (3); Tests  5 failed \| 47 passed (52); exit 1 |
| `v15.log` | `V server/your-computer-consent.test.ts shared/cloud-computer-recovery.test.ts shared/grok-import.test.ts` | Test Files  3 passed (3); Tests  27 passed (27); exit 0 |
| `v16.log` | `V shared/logins.test.ts shared/meetings.test.ts shared/sign-in-request.test.ts` | Test Files  3 passed (3); Tests  45 passed (45); exit 0 |
| `v17.log` | `V shared/team-setup.test.ts shared/your-computer.test.ts src/components/AccountMove.test.ts` | Test Files  3 passed (3); Tests  28 passed (28); exit 0 |
| `v18.log` | `V src/components/AppNotices.test.ts src/components/CallView.mode-menu.test.ts src/components/ChatMoreMenu.test.ts` | Test Files  3 passed (3); Tests  95 passed (95); exit 0 |
| `v19.log` | `V src/components/ChatView.controls.test.ts src/components/ChatView.missing-thread.test.ts src/components/ChatView.progress-lines.test.ts` | Test Files  3 passed (3); Tests  63 passed (63); exit 0 |
| `v20.log` | `V src/components/CloudSendStrip.test.ts src/components/EngineSetup.cursor.test.ts src/components/HelperIntro.test.ts` | Test Files  3 passed (3); Tests  28 passed (28); exit 0 |
| `v21.log` | `V src/components/PlacesRail.test.ts src/components/SidebarProfileMenu.test.ts src/components/TaskPicker.test.ts` | Test Files  1 failed \| 2 passed (3); Tests  1 failed \| 106 passed (107); exit 1 |
| `v22.log` | `V src/components/TeamSideSwitch.dom.test.ts src/components/bot-archive.test.ts src/components/bot-settings/PromptPreview.test.ts` | Test Files  3 passed (3); Tests  41 passed (41); exit 0 |
| `v23.log` | `V src/components/bot-settings/ProposalStatus.test.ts src/components/conversation-share/ConversationShareDialogs.dom.test.ts src/components/keys/key-catalog.test.ts` | Test Files  3 passed (3); Tests  31 passed (31); exit 0 |
| `v24.log` | `V src/components/onboarding/WelcomeFlow.test.ts src/lib/computer-messages.test.ts src/lib/own-team-bot.test.ts` | Test Files  3 passed (3); Tests  20 passed (20); exit 0 |
| `v25.log` | `V src/lib/phone-setup.test.ts src/lib/server-word-contracts.test.ts src/lib/skins.test.ts` | Test Files  3 passed (3); Tests  411 passed (411); exit 0 |
| `v26.log` | `V src/locales/server-lines.test.ts src/state/team-side.test.ts` | Test Files  2 passed (2); Tests  34 passed (34); exit 0 |
| `n01.log` | `N electron/bot-move-main.node-test.mjs electron/cloud-connections.node-test.mjs electron/cloud-list.node-test.mjs` | ℹ tests 37; ℹ suites 0; ℹ pass 36; ℹ fail 1; ℹ cancelled 0; ℹ skipped 0; exit 1 |
| `n02.log` | `N electron/cloud-logins.node-test.mjs electron/cloud-send-check.node-test.mjs electron/cloud-send.node-test.mjs` | ℹ tests 45; ℹ suites 0; ℹ pass 45; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `n03.log` | `N electron/company-backup-schedule.node-test.mjs electron/data-dir-lease.node-test.mjs electron/environment-switch.node-test.mjs` | 外部 55s 限时；无完整汇总，不计通过 |
| `n04.log` | `N electron/environments.node-test.mjs electron/error-pages.node-test.mjs electron/host-screen-lease.node-test.mjs` | ℹ tests 36; ℹ suites 0; ℹ pass 35; ℹ fail 1; ℹ cancelled 0; ℹ skipped 0; exit 1 |
| `n05.log` | `N electron/lend-automatically.node-test.mjs electron/lending-guards.node-test.mjs electron/lent-mcp.node-test.mjs` | ℹ tests 52; ℹ suites 0; ℹ pass 45; ℹ fail 7; ℹ cancelled 0; ℹ skipped 0; exit 1; listen EPERM |
| `n06.log` | `N electron/managed-desktop.node-test.mjs electron/move-status.node-test.mjs electron/one-home-gone.node-test.mjs` | ℹ tests 71; ℹ suites 0; ℹ pass 71; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `n07.log` | `N electron/one-home-main.node-test.mjs electron/one-home.node-test.mjs electron/open-at-login.node-test.mjs` | ℹ tests 39; ℹ suites 0; ℹ pass 39; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `n08.log` | `N electron/own-home-main.node-test.mjs electron/place-look.node-test.mjs electron/screen-status.node-test.mjs` | ℹ tests 23; ℹ suites 0; ℹ pass 23; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `n09.log` | `N electron/talk-main.node-test.mjs electron/talk-panel.node-test.mjs electron/talk-session.node-test.mjs` | ℹ tests 67; ℹ suites 0; ℹ pass 66; ℹ fail 1; ℹ cancelled 0; ℹ skipped 0; exit 1; MockTimers 已启用；随后按文件拆分复跑 |
| `n10.log` | `N electron/team-move-bring.node-test.mjs electron/update-errors.node-test.mjs electron/updater-coordinator.node-test.mjs` | ℹ tests 63; ℹ suites 0; ℹ pass 63; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `e01.log` | `V scripts/testing/automations-journey.ui.e2e.test.ts scripts/testing/cloud-sleep-wake.e2e.test.ts scripts/testing/control-cry-ui.e2e.test.ts` | Test Files  1 failed \| 2 skipped (3); Tests  7 skipped (7); exit 1; 隔离端口分配失败 |
| `e02.log` | `V scripts/testing/cron-routines-ui.e2e.test.ts scripts/testing/one-workspace-ui.e2e.test.ts scripts/testing/team-own-chat.e2e.test.ts` | Test Files  1 failed \| 2 skipped (3); Tests  20 skipped (20); exit 1; 隔离端口分配失败 |
| `e03.log` | `V scripts/testing/team-side-switch-ui.e2e.test.ts scripts/testing/workspace-backup-ui.e2e.test.ts server/browser/egress/hostile-pages.e2e.test.ts` | Test Files  3 skipped (3); Tests  12 skipped (12); exit 0 |
| `e04.log` | `V server/cloud-connected-apps.e2e.test.ts server/cloud-credit.e2e.test.ts server/cloud-guest-shell.e2e.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `e05.log` | `V server/cloud-lending-browser.e2e.test.ts server/cloud-lending-chrome.e2e.test.ts server/cloud-lending-memory.e2e.test.ts` | Test Files  3 failed (3); Tests  68 skipped (68); exit 1; 隔离端口分配失败; listen EPERM |
| `e06.log` | `V server/cloud-lending.e2e.test.ts server/cloud-lent-mcp.e2e.test.ts server/cloud-lent-screen.e2e.test.ts` | Test Files  3 failed (3); Tests  9 skipped (9); exit 1; 隔离端口分配失败 |
| `e07.log` | `V server/cloud-onepassword.e2e.test.ts server/cloud-personal.e2e.test.ts server/cloud-routine-level.e2e.test.ts` | Test Files  3 failed (3); Tests  26 skipped (26); exit 1; 隔离端口分配失败 |
| `e08.log` | `V server/cloud-sharing.e2e.test.ts server/cloud-sync.e2e.test.ts server/cloud-team-admin.e2e.test.ts` | Test Files  3 failed (3); Tests  1 failed \| 6 skipped (7); exit 1; 隔离端口分配失败 |
| `e09.log` | `V server/cloud-team-crybot-own-chat.e2e.test.ts server/cloud-team-crybot-reach.e2e.test.ts server/cloud-team-first-look.e2e.test.ts` | Test Files  3 failed (3); Tests  13 skipped (13); exit 1; 隔离端口分配失败 |
| `e10.log` | `V server/cloud-team-phones.e2e.test.ts server/cloud-team-privacy-holes.e2e.test.ts server/cloud-team-private-default.e2e.test.ts` | Test Files  3 failed (3); Tests  29 skipped (29); exit 1; 隔离端口分配失败 |
| `e11.log` | `V server/cloud-team-published-apps.e2e.test.ts server/cloud-team-sleep.e2e.test.ts server/desktop-computer.e2e.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `e12.log` | `V server/direct-coordination.e2e.test.ts server/group-local-vm.e2e.test.ts server/lent-folders.e2e.test.ts` | Test Files  3 failed (3); Tests  45 failed \| 48 skipped (93); Errors  1 error; exit 1; 隔离端口分配失败; listen EPERM |
| `e13.log` | `V server/live-azure-access.e2e.test.ts server/live-call.e2e.test.ts server/loop-guard.e2e.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `e14.log` | `V server/mcp-cards.e2e.test.ts server/opencode-provider-keys.e2e.test.ts server/parallel-threads.e2e.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `e15.log` | `V server/person-first.e2e.test.ts server/phones.e2e.test.ts server/place-view.e2e.test.ts` | Test Files  3 failed (3); Tests  1 failed \| 16 skipped (17); Errors  1 error; exit 1; 隔离端口分配失败; listen EPERM |
| `e16.log` | `V server/proactive-routines.e2e.test.ts server/runtime-roots.e2e.test.ts server/starter-bots.e2e.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `e17.log` | `V server/use-my-mac.e2e.test.ts server/x-research.e2e.test.ts` | 外部 55s 限时；无完整汇总，不计通过 |
| `fix-v01.log` | `V server/skill-library.test.ts src/components/TaskPicker.test.ts shared/widget.test.ts` | Test Files  3 passed (3); Tests  71 passed (71); exit 0 |
| `fix-v02.log` | `V server/default-bot.test.ts electron/capabilities.test.mjs scripts/verify-engines-ui.test.mjs` | Test Files  3 passed (3); Tests  58 passed (58); exit 0 |
| `fix-v03.log` | `V server/system-prompt.test.ts` | Test Files  1 passed (1); Tests  57 passed (57); exit 0 |
| `fix-n01.log` | `N electron/cloud-list.node-test.mjs electron/environments.node-test.mjs electron/desktop-workspace.node-test.mjs` | ℹ tests 56; ℹ suites 0; ℹ pass 56; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `fix-n02.log` | `N electron/preload.node-test.mjs` | ℹ tests 13; ℹ suites 0; ℹ pass 13; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `fix-n03.log` | `N electron/company-backup-schedule.node-test.mjs` | ℹ tests 23; ℹ suites 0; ℹ pass 23; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `fix-n04.log` | `N electron/talk-main.node-test.mjs` | 外部 55s 限时；无完整汇总，不计通过 |
| `fix-n05.log` | `N electron/talk-panel.node-test.mjs` | ℹ tests 21; ℹ suites 0; ℹ pass 21; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `fix-n06.log` | `N electron/talk-session.node-test.mjs` | ℹ tests 28; ℹ suites 0; ℹ pass 28; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0; exit 0 |
| `fix-e01.log` | `V server/desktop-computer.e2e.test.ts` | Test Files  1 failed (1); Tests  2 failed \| 1 skipped (3); exit 1; 隔离端口分配失败 |
| `baseline-v01.log` | `V electron/diagnostics.test.mjs server/testing/fake-claude-dump.test.ts` | Test Files  2 failed (2); Tests  6 failed \| 78 passed (84); exit 1 |
| `baseline-n01.log` | `N electron/lending-guards.node-test.mjs electron/lent-mcp.node-test.mjs` | ℹ tests 26; ℹ suites 0; ℹ pass 19; ℹ fail 7; ℹ cancelled 0; ℹ skipped 0; exit 1; listen EPERM |

### 结果边界及基线对照

- 必改的非端口验证：Fish 两端、防伪前缀及团队策略共 **62 passed**；桌面控制和 Claude elicitation 共 **23 passed**；手机向量 **28 passed**；恢复的备份组件 **33 passed**。SMTP 单测 **7 passed / 1 blocked**（完整文件实际为 1 failed，见真实 SMTP 的 EPERM），邮件路由测试 **7 未执行**（beforeAll 的证书夹具失败）。共享文案契约、locale 文案契约和新增手机帮助触发词复跑通过，详见上表。
- `mcp-gate.test.ts` 的子进程在回复前退出；`chat-mcp-tools.test.ts`、OpenCode 等子进程测试批次无完整汇总。独立探针 `child-probe.log` 中 Node 子进程退出 0，但原本应输出的固定 marker 没有出现；`openssl-probe.log` 同时记录 `error: "EPERM"` 和 OpenSSL 版本输出，因此不能将该环境视为正常的子进程执行环境。未改这些测试以适应沙箱。
- 指定的 `phones.e2e`、`cloud-lending-browser.e2e`、`group-local-vm.e2e`、单独复跑的 `desktop-computer.e2e` 均因隔离端口/socket 或服务器夹具无法启动而未通过。`loop-guard.e2e`、`mcp-cards.e2e` 所在批次到达外部 55 秒限时，没有最终汇总；它们依赖隔离服务器/子进程，不能宣称执行完断言。`group-local-vm` 的 darwin 分支只做了文案修正，本 Linux 沙箱不提供 macOS 分支运行证据。
- 其他带端口/子进程的扩展批次同样未通过或未完成，表中逐批保留真实退出值与输出；依赖浏览器/宿主机开关的 UI e2e 使用仓库原有 skip 条件，未开启后再绕过端口限制。**exit 0 且全部 skipped 的批次不等于通过行为验证**。
- `server/model-providers-docs.test.ts` 因检出缺少 `apps/docs/content/docs/providers/model-providers.mdx` 而加载失败；未为此删除测试或新增文档替身。
- 在 `HEAD` 的独立 archive 副本复现了 `electron/diagnostics.test.mjs` 的凭据环境变量清单不一致，以及 `server/testing/fake-claude-dump.test.ts` 的 5 个捕获/子进程失败：合计 **6 failed / 78 passed**，失败用例与当前树相同。没有更改凭据过滤实现或安全断言。
- `electron/lending-guards.node-test.mjs` 与 `electron/lent-mcp.node-test.mjs` 的相同 7 个驱动器/子进程/监听失败也在基线复现：**7 failed / 19 passed**；当前 `n05` 包含额外通过文件，不能直接用该组总数与基线两文件总数相减。
- Native 测试在关闭文件进程隔离后，`n09` 出现共享 MockTimers 已启用的运行干扰。拆成单文件后，talk-panel **21 passed**、talk-session **28 passed**；talk-main 显示 18 条通过但进程未在 55 秒内退出，未取得完整汇总，仍列为未完成，不把它归因成已确认的产品故障或已确认的沙箱问题。
- 扫描对应的 **140 个改动/恢复测试文件均出现在实际尝试的命令中**，无遗漏（`test-coverage-audit.log`）；其中失败、仓库既有 skip、外部限时和未执行断言的情况如实保留。两个批次驱动器均已返回结束状态，没有通过中断驱动器来提前开始另一批测试。

### 本轮收尾检查

| 命令 | 关键输出 | 日志 |
|---|---|---|
| `/opt/node24/bin/node scripts/check-brand-residue.mjs` | `6470 files checked; 0 forbidden references.`；exit 0 | `brand-final.log` |
| `/opt/node24/bin/node scripts/generate-locale.mjs --check` | `locale catalogs valid (16 languages, 10550 English strings)`；exit 0 | `locale-final.log` |
| `/opt/node24/bin/node node_modules/oxlint/bin/oxlint --deny-warnings <改动文件和 4 个恢复文件>` | exit 0，无警告输出；文件参数见 `changed-files-final.log` | `lint-final.log` |
| `git diff --check`；恢复文件另用 `git diff --no-index --check /dev/null <文件>` | 前者 exit 0；后者无空白诊断，exit 1 表示文件相对 `/dev/null` 有内容差异 | `diff-check-final.log`、`restored-whitespace.log` |
| 指定目录 `grep -rn "CryBot" ... --include=*.ts --include=*.tsx --include=*.mjs` | 逐项复核；剩余为前述标识符、机器契约、旧输入/负向断言和注释/测试标题 | `residue-after.log`、`brand-audit.log` |
| 策略签名独立生成两次后 `cmp` | 相同输出，exit 0 | `policy-vector.log`、`policy-vector-repeat.log`、`policy-vector-repro.log` |
| `git diff --name-only -- .github docs/specs NOTICE LICENSE` | 无输出 | `protected-paths.log` |

未运行全仓测试或完整 tsc；没有将 lint、单测或当前环境下的失败/skip 当成真实服务验收通过。所有新增测试数据和域名均为测试示例。
