# T-1207 server 路：第 2 轮报告

延续 worktree 原有改动；未提交 git，未修改 .github/、docs/specs/、NOTICE、LICENSE。仅修改 server/ 和本报告。分类编号遵循任务的 1–5 规则。

本轮最终结果：60 个清单文件中，31 个完整通过、9 个已删除功能文件删除、20 个仍失败或未完成验证。20 个中 2 个为明确未解决差异（CryptoKit 固定向量、范围外 pairing-code 文案），其余为环境失败或尚未能完成的子进程/fixture 验证。lint、品牌残留检查及定向类型检查通过。

## 按文件的修改

| 文件 | 分类 | 修改/删除理由 |
|---|---|---|
| `server/bot-box/env.test.ts` | 1、3、5 | 更新改名后的有序变量列表及服务器专用名称清单；用文件系统遍历替代 git 子进程扫描，继续要求每个运行时代码中的 CRYBOT_ 名称都有显式决策。 |
| `server/bot-box/env.ts` | 4、5 | 补入 engine 需要的 CRYBOT_CODEX_API_KEY / CRYBOT_CHATGPT_TOKEN 显式白名单；未开放其他变量。 |
| `server/bot-profile.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/browser-engine-release.ts` | 4 | 按调用时的配置读取 Windows 下载镜像；保留默认关闭、固定版本/尺寸/SHA-256 及缺少镜像时报错。 |
| `server/browser-engine.test.ts` | 1、3、5 | 提供 HTTPS 示例镜像，更新 URL 期望；保留下载摘要、版本和平台校验。 |
| `server/chat-notices.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/chat-widgets.test.ts` | 3、5 | 仅将 kitchenSink 测试中的相对图片地址修为 HTTPS 示例地址；不放宽 widget 外链校验。共享示例源文件仍需其他路修复。 |
| `server/cli-reach.ts` | 2 | 删除提示用户 login 后使用上游免费 --tunnel 的命令行引导；该入口已删除。 |
| `server/cloud-computer-lazy.e2e.test.ts` | 2 | 删除整个文件：仅覆盖上游托管云计算机的自动供应/替换流程，功能已删除。 |
| `server/cloud-home.test.ts` | 2 | 删除整个文件：仅覆盖托管云 home、边缘入口和 Fly 模板；这些部署/控制面已删除。 |
| `server/cloud-team-policy.test.ts` | 2 | 删除整个文件：仅覆盖托管云团队策略及 Admin 签名契约，控制面已删除。 |
| `server/cloud-team-roster.test.ts` | 2 | 删除整个文件：仅覆盖托管云团队名册及 Admin 签名契约，控制面已删除。 |
| `server/comms.test.ts` | 3 | tag 样本改为与 Owner fixture 对应的小写 @owner，继续验证忽略大小写匹配。 |
| `server/computer-asks.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/connector-card-text.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/connector-verdict.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/context-rebuild.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/credential-env.ts` | 4、5 | 控制面拒绝列表补入 CRYBOT_LICENSE_KEY、CRY_CLOUD_READY_TOKEN；保持大小写无关过滤。 |
| `server/default-bot.e2e.test.ts` | 1、3 | 修复改名导致的 callback bot 遮蔽外层 bot、自比较恒真的查找；改为 candidate.id === bot.id，并更新人格文案。 |
| `server/default-bot.test.ts` | 1、3 | 更新显示名/拒绝文案，设备/person fixture 统一使用中性 Alex。 |
| `server/default-bot.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/desktop-computer.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/drivers/agents-bridge-wire.test.ts` | 1、3 | profile 子进程改串行并收紧继承环境，保留桥接权限及完整 wire/golden/hash/预算断言。 |
| `server/drivers/agents-bridge.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/drivers/agents-catalog-goldens/bridged.profiles.json` | 1、2 | 更新工具清单的产品显示名、移除工具及对应字节数/SHA-256；全部 30 个 profile 均保留。 |
| `server/drivers/agents-catalog-goldens/bridged.tools-list.json` | 1、2 | 更新工具清单的产品显示名、移除工具及对应字节数/SHA-256；全部 30 个 profile 均保留。 |
| `server/drivers/agents-catalog-goldens/full.tools-list.json` | 1、2 | 更新工具清单的产品显示名、移除工具及对应字节数/SHA-256；全部 30 个 profile 均保留。 |
| `server/drivers/agents-catalog-goldens/profiles.json` | 1、2 | 更新工具清单的产品显示名、移除工具及对应字节数/SHA-256；全部 30 个 profile 均保留。 |
| `server/drivers/agents-catalog-wire.test.ts` | 1、2、3 | 删除已移除 list_team_library 的 Chief-only 期望；profile 子进程改串行并收紧继承环境，保留完整 wire/golden/hash/预算断言。 |
| `server/drivers/agents-catalog.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/drivers/agents-proxy.test.ts` | 2 | 从完整工具列表删除 list_team_library、report_bug，从 Chief-only 列表删除 list_team_library：上游团队库与 bug 上传已删除；其他工具和权限断言保留。 |
| `server/drivers/codex.test.ts` | 1、3、5 | 将大小写冲突样本修为 crybot_gate_config_*；更新改名后凭据排除列表的排序，保留完整排除集合与覆盖 include 的安全断言。 |
| `server/drivers/driver-notices.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/email-signin.test.ts` | 2 | 删除整个文件：仅覆盖已删除的邮件账号登录路由及其会话流程。 |
| `server/fleet-agent.test.ts` | 2 | 删除整个文件：仅覆盖已删除的上游 fleet 账号管理/计费控制面。 |
| `server/helper-followup.ts` | 4 | 修复 bot 遮蔽导致的 id 自比较，按 candidate.id !== bot.id 计算其余可见 bot 数。 |
| `server/host/app-publisher.test.ts` | 1、3、5 | 修正 .crybot-secrets 改名后的字典序和下架文案；保留 secret、符号链接、路径边界和上传限制。 |
| `server/host/app-publisher.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/host/brief.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/host/first-hour.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/host/first-hour.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/host/mcp-requests.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/host/mcp-requests.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/host/mcp-sign-in-cards.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/host/secret-cards.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/host/team-away.test.ts` | 2 | 删除整个文件：仅覆盖托管团队的离线邮件及上游 Admin 签名契约。 |
| `server/incidents.e2e.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/incidents.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/initial-greeting.test.ts` | 3 | 把误替换为公司名称的 person fixture 改为 Alex Morgan，首名期望为 Alex。 |
| `server/lent-computers.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/lent-computers.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/live-fish.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/mcp-gate-config.test.ts` | 1、5 | 修正 CRYBOT_REMOTE_MCP_CONFIG_* 在排序结果中的位置，继续精确断言私密配置的变量集合。 |
| `server/mcp-sign-in-card.e2e.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/mcp-sign-in-card.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/onepassword.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/pages/published-pages.test.ts` | 2 | 删除 signs a home's request exactly as the Admin checks it 用例及专用 import：仅验证已删除上游 Admin 的固定签名契约，其余 bundle/权限测试保留。 |
| `server/people-invite.test.ts` | 2 | 删除整个文件：仅覆盖已删除的托管账号邀请/登录/成员变更流程。 |
| `server/phone-secret.test.ts` | 1、5 | 更新显示文案；保留 CryptoKit 固定向量、metadata tampering、pinned key、凭据权限等所有安全断言。固定向量仍失败，原因见下。 |
| `server/phone-secret.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/phones/access.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/phones/host.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/phones/instructions.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/phones/rpc.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/phones/rpc.ts` | 1 | 保留上一轮的产品名注释修正；运行逻辑无变化。 |
| `server/redact.ts` | 4、5 | 私密 MCP descriptor 名称修为 crybot_gate_upstream / crybot_remote_mcp_server / crybot_remote_mcp_config_，避免普通 header 名的凭据漏出。 |
| `server/routes/internal-mcp.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/routes/internal-mcp.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/routes/published-apps.test.ts` | 2、5 | 移除已删除上游托管页面的隐式放行期望；将被批量替换的 server.example.test/report 加入拒绝列表，保留 Netlify 放行及所有外链/内网/协议拒绝断言。 |
| `server/routes/teams.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/routine-lines.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/runtime/envelope.test.ts` | 1、3、5 | 将旧前缀的同形字注入样本更新为新 cry 前缀的同形字（含零宽字符）。保留必须转义为括号的断言；不向源码添加旧品牌兼容分支。 |
| `server/secret-requests.e2e.test.ts` | 1、5 | 恢复并保留 file/ref secret canary、Vault 与权限隔离安全断言，仅修正品牌文案；不能仅因 fixture 使用云 home 而删除保留功能的安全测试。 |
| `server/service-cli.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/service-unit.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/service-unit.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/setup-suggestions.test.ts` | 1 | 对历史录制 prompt 的产品显示名作确定性归一化后仍逐字比较。 |
| `server/setup-suggestions.ts` | 4 | 修正生成 setup prompt 的产品显示名为 Cry Bot，与 locale/fixture 期望一致。 |
| `server/shared-computers.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/sign-in-mail.test.ts` | 2 | 删除整个文件：仅覆盖已删除的邮件账号登录和邮件验证码发送入口。 |
| `server/skill-library.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/skill-publish-to-netlify.test.ts` | 1、5 | 修正 .crybot-secrets 改名后的字典序；保留完整 skipped 集合、文件内容和 Netlify 主机限制断言。 |
| `server/store.test.ts` | 1、3 | 修正默认 bot 引导显示名；person fixture 用 Alex Morgan，验证首次问候只取 Alex。 |
| `server/system-prompt.test.ts` | 1 | 将产品显示名及相关断言修正为 Cry Bot；保留原有功能/权限断言。 |
| `server/system-prompt.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |
| `server/user-errors.ts` | 1、4 | 修正 server 返回/写入的产品显示文案为 Cry Bot，保持原有结构、权限和执行逻辑。 |

上表逐项列出了整文件删除，以及 pages Admin 签名、agents 工具名、托管页面放行期望的删除理由。未恢复统计、账号或上游网络调用。

## 验证方式与边界

- Node 24 (`/opt/node24/bin/node`)，vitest `--maxWorkers=1`，每批至多 8 个文件、每批至多 1 个 e2e，后续逐文件串行运行。未使用 systemd-run，未设置 CRYBOT_VITEST_WORKERS。
- 测试 setup 使用 throwaway home；e2e 使用 `launchVerificationServer` 隔离 fixture，从未验证用户 live app/data。当前 checkout 缺少 `docs/verification/README.md`，因此不能宣称已完成该文档的整体验证流程。
- 完整清单 60 个文件中 9 个依规则 2 删除，51 个保留。以下按文件记录最终结果；超时/启动失败不视为通过。
- 原版 66 个已知失败文件与本路清单没有交集，未为那些文件扩展修复范围。
- 子进程/监听受限并非原始 CI 失败的通用豁免：相关旧断言已按 CI 片段修复，但这些文件仍需要在允许 fixture 监听和子进程的环境确认。

| 清单文件 | 最终结果 | 证据/说明 |
|---|---|---|
| `server/bot-box/env.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/bot-profile.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/browser-engine.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/chat-notices.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/chat-widgets.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/cli-printed-commands.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/cloud-computer-lazy.e2e.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/cloud-home.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/cloud-team-policy.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/cloud-team-roster.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/comms.test.ts` | 环境失败 | 假 ACP fleet fixture 的 beforeAll 超时，明确 listen EPERM；mentionedBots 的修复单元断言已执行。 |
| `server/computer-asks.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/config.test.ts` | 环境失败 | 231 个测试中 3 个子进程数据目录检查 spawnSync Node EPERM；其余 227 个测试通过、1 个跳过。原控制面凭据失败已通过。 |
| `server/connector-card-text.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/context-rebuild.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/default-bot.e2e.test.ts` | 环境失败 | 隔离 fixture 无法找到可监听端口块；测试未到行为断言。 |
| `server/default-bot.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/drivers/agents-bridge-wire.test.ts` | 未完成验证 | proxy 子进程退出 0，但未回答请求；全部用例在 setup 阶段跳过。进程内 30 profile 的 golden/hash/预算检查通过，不能替代真实 stdio。 |
| `server/drivers/agents-catalog-wire.test.ts` | 未完成验证 | proxy 子进程退出 0，但未回答 tools/list；全部用例在 setup 阶段跳过。进程内 30 profile 的 golden/hash/预算检查通过。 |
| `server/drivers/agents-proxy.test.ts` | 环境失败 | beforeAll 的 loopback stub listen EPERM，30s hook 超时；164 个测试未执行。 |
| `server/drivers/chat-mcp-tools.test.ts` | 未完成验证 | 假 MCP 子进程在建连前退出，123 个测试失败、8 个通过；权限/凭据断言保留，需可运行子进程的环境复核。 |
| `server/drivers/claude.test.ts` | 环境失败 | permission broker Unix socket/loopback listen EPERM，以及假 CLI 子进程不可用；220 失败、36 通过、1 跳过。 |
| `server/drivers/codex.test.ts` | 超时，未完成 | 单文件串行 240s 后中止（exit 124），未得到完整断言汇总；假 app-server/子进程链路在本沙箱未能验证，不能称 CI 通过。 |
| `server/email-signin.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/fleet-agent.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/host/app-publisher.test.ts` | 超时，未完成 | 每个用例先启动 loopback app-hosting fixture，本沙箱禁止监听；75s 中止，未得到完整断言汇总。 |
| `server/host/brief-cards.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/host/first-hour.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/host/mcp-requests.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/host/secret-cards.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/host/team-away.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/incidents.e2e.test.ts` | 超时，未完成 | 75s 中止，日志只有 RUN；使用隔离 verification server，需要在可启动 fixture 的环境重跑，不能据此判断后续断言。 |
| `server/incidents.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/initial-greeting.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/lent-computers.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/live-fish.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/mcp-gate-config.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/mcp-sign-in-card.e2e.test.ts` | 超时，未完成 | 75s 中止，未得到完整汇总；verification server/OAuth stand-in 需要本地监听，当前未完成端到端验证。 |
| `server/mcp-sign-in-card.test.ts` | 超时，未完成 | 75s 中止；fake Postiz 需要 loopback 监听，未得到完整断言汇总。 |
| `server/onepassword.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/pages/published-pages.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/people-invite.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/phone-secret.test.ts` | 真实差异，保留断言 | 17 个测试中仅 CryptoKit 固定向量失败，16 个通过。已证明向量使用上游 info/AAD，改名后必然认证失败；不是 Node 24 的普通环境故障。 |
| `server/phones/rpc.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/redact.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/routes/helper-followup.test.ts` | 超时，未完成 | 75s 中止；逐用例 HTTP fixture 需要 loopback 监听。源码计数自比较已修，需在可监听环境确认。 |
| `server/routes/internal-mcp.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/routes/published-apps.test.ts` | 超时，未完成 | 75s 中止；HTTP fixture 需要 loopback 监听。外链拒绝断言未放宽。 |
| `server/routine-lines.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/runtime/envelope.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/secret-requests.e2e.test.ts` | 环境失败 | 已恢复全部 secret 安全断言；隔离 fixture 获取监听端口失败（no free port block），唯一用例在 setup 阶段未执行。 |
| `server/service-cli.test.ts` | 环境失败 | 6 个测试中 3 个 sentinel 用例失败：沙箱 /tmp/.git 导致 outRefusal 先拒绝在 git 仓库内写入。没有放宽目录拒绝逻辑。 |
| `server/service-unit.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/setup-suggestions.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/sign-in-mail.test.ts` | 已删除 | 规则 2，理由见上表。 |
| `server/skill-library.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/skill-publish-to-netlify.test.ts` | 环境失败 | 修正排序后纯文件/上传边界测试通过；剩余 CONNECT 测试及 fake Netlify beforeAll 因 listen EPERM 超时，afterAll 又因 fixture 未创建报错。 |
| `server/store.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/system-prompt.test.ts` | 通过 | Node 24 / maxWorkers=1，完整文件执行通过。 |
| `server/user-errors.test.ts` | 范围外源码差异 | 5 个测试中 4 个通过；shared/pairing-code.ts 的 serverError.pair.oldCode 仍写 CryBot，locale 为 Cry Bot。未修改 shared/。 |

## 补充检查

- `oxlint --deny-warnings <所有改过且保留的 server TS 文件>`：使用 Node 24；全部 73 个保留的修改文件检查退出 0；日志 `/tmp/t1207-fix/server-lint.log`。
- `scripts/check-brand-residue.mjs`：使用 Node 24；6471 个文件，0 个禁止引用；日志 `/tmp/t1207-fix/server-brand.log`。
- 定向 TypeScript 检查通过：`server/browser-engine-release.ts`、`server/credential-env.ts`、`server/bot-box/env.ts`，`--noEmit --strict`，未运行全量 `tsc -b`。其他源码修改逐项复核：字符串常量/文案不改变类型；helper 的 candidate callback 保持 BotRecord 类型及返回结构。
- 两套 agent 工具清单各 30 个 profile 的完整工具名/字节数/SHA-256/2% 预算与 golden 一致；用 `/tmp/t1207-fix/verify-goldens.mjs` 进程内核对，明确未覆盖 stdio 或 bundle。
- 手机向量诊断 `/tmp/t1207-fix/check-phone-vector.mjs`：同一个固定密文在 e8fe11b 的 info + AAD 下可解出预定 fixture 明文；在改名后的标签下抛 OpenError。应在 Apple CryptoKit 下用当前 info/AAD 重新生成向量，保持跨实现断言；没有恢复旧品牌标签或以本实现 seal/open 往返替代互操作性测试。
- `git diff --check` 通过。没有 git commit。

## 范围外待协同

1. `shared/pairing-code.ts:33`：将 `serverError.pair.oldCode` 的显示名改成 `Cry Bot`，即可消除 user-errors 的剩余差异；未放宽字典相等断言。
2. `shared/widget-samples.ts:196`：kitchenSink 的图片 `src` 被改成 `/app-icon-512.png`，与 widget 只接受 HTTPS 的契约冲突。建议改为中性 HTTPS 示例资源；本路只规范化测试样本，未放宽外链校验。

## 日志索引

- `/tmp/t1207-fix/server-batch-1.log`、`server-batch-2.log`、`server-batch-6.log`、`server-batch-7.log`：完成的分批结果。
- `/tmp/t1207-fix/server-fix-check.log`：setup suggestions 与 Netlify 排序修复后的重跑。
- `/tmp/t1207-fix/phones-rpc.log`、`onepassword.single.log`、`published-pages.single.log`、`redact.single.log`：逐文件通过记录。
- `/tmp/t1207-fix/final-status.tsv` 与 `final-server_*.log`：后续逐文件串行结果；124 表示明确中止，绝不计通过。
- `/tmp/t1207-fix/final-rerun-*.log` 与 `rerun-status.tsv` 及 `final-lent-computers.log`：最后修改涉及的文件，以及恢复的 secret e2e 的重跑。

早先小批次中止的日志仅作为排查记录，不纳入通过统计。所有尚未通过的文件均在结果表列出；本轮不能报告 server 路全绿。
