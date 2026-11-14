# T-1215：lint 与非 e2e 测试修复报告

基线：`1ac45153`；CI 运行 `43555137016`，日志 `/tmp/t1215/ci-main-1ac45153.log`。本路不修改 `server/`、`.github/workflows/ci.yml`，没有 Git 提交，没有运行全量 Vitest 或 build。最终以协调者推送后的 Actions 为准。

本路已修复 lint、词汇规则、更新器、分片权重及 Widget fixture。4 个目标测试文件共 90 条测试通过；仍有 2 项服务器结构阈值检查失败（路径计数、文件行数），需服务端一路处理，不能宣称全 CI 已绿。

## 修改及依据

### 1. lint：删除失去调用者的绑定

- 修改 `electron/main.mjs:1291`：从 `environmentsModule` 解构中删除 `withEnvironmentLook`。
- 原调用位于 `7124ef58^:electron/main.mjs:2602` 的 `cloudLook` / `saveEntry`，用于托管云购买页外观同步；T-1207 提交 `7124ef58` 删除调用和绑定。T-1208 提交 `56b31572` 把绑定重新加回，却没有恢复任何调用。因此这是死绑定，不是远程默认服务器漏接线。
- 不删除 `electron/environments.cjs:388` 的函数：`electron/home-places.mjs:15` 仍使用它。

### 2. vocabulary：恢复正负例的区分，保留全部六条测试

- `src/locales/vocabulary.test.ts:11`：移除“Cry Bot Cloud 应替换成 Cry Bot Cloud”的自匹配规则，恢复上游品牌、Cloud/Pro 名称和旧缩写的识别；旧拼写在源码中使用 Unicode 转义，运行时按真实词匹配，同时遵循品牌残留检查的源码要求。
- `src/locales/vocabulary.test.ts:18`：修正标签为 CRY、正则却匹配旧缩写的不一致；旧缩写由独立规则继续拦截。保留合法 `CRYBOT_*` 环境变量和已有备份格式例外。
- `src/locales/vocabulary.test.ts:116`：翻译检查复用品牌规则，继续拒绝旧名称，并要求英文提到的新品牌在译文中保留原名。
- `src/locales/vocabulary.test.ts:141`：原文档检查读取不存在的 `apps/docs/content`。改为检查现有 `README.md` 和 `docs/` 的公开文档，排除规格/任务历史，并断言包含 `docs/self-hosting.md`，避免扫描空集合假通过。T-1207 报告已记录移除上游文档站点；该测试没有删除。
- `src/locales/vocabulary.test.ts:60`：删除指向已删除 `src/lib/boat-offer.ts` 的陈旧豁免。该文件在 `7124ef58` 删除，原功能是 Boat 推广额度邮件（该提交父版本第 14–18 行）；移除的是豁免，不是测试。
- `src/locales/vocabulary.test.ts:191`：补齐旧名称负例，保留新品牌正例、Boat 自备密钥和环境变量正例。

### 3. update-runner：测试契约过期，并发现真实安装漏接线

- `deploy/update.sh:40`、`:42`、`:673` 在 T-1207 (`7124ef58`) 已改为 `ghcr.io/crysound/crybot`、显式 `CRYBOT_UPDATE_URL`、默认无更新请求；不再读取旧 stable/newest 环境变量，不再允许 file feed 或自动 GitHub 回退。这不是 T-1214 的发版行为回归。
- `scripts/testing/update-runner.test.ts:15`、`:71`、`:103`、`:125`：修正镜像仓库，使用当前 HTTPS feed 配置和已有 `fake-update-curl.mjs` 替身。所有 feed 内容来自每例独立临时目录；替身还校验 HTTPS、禁止跳转和唯一目标 URL。保留请求注入、回滚、磁盘不足、节流、信任边界等原断言。
- `deploy/update-runner.sh:342`：修复生产安装代码；写入 systemd 单元时传递 `CRYBOT_UPDATE_URL`，移除已无消费者的 stable/newest 配置。否则运维设置新变量执行 `--install` 后，服务运行时会丢失 feed。
- `scripts/testing/update-runner.test.ts:182`：增加默认无 feed 时拒绝更新、没有 feed 请求、没有拉镜像/停服务的回归用例。
- `scripts/testing/update-runner.test.ts:494`、`:525`、`:529`：现有安装测试验证新变量持久化、旧变量不传入、含 `%` 的 URL 及恶意命令值不写入单元；不放宽现有 systemd 环境值过滤。
- 本地首轮剩两条失败来自测试假定执行者不是 root：真实 root 拥有的目录按生产规则本来就可信。`scripts/testing/update-runner.test.ts:64` 将测试目录所有者固定模拟为非 root UID 1000；权限位、父目录、数据所有者查询仍按原逻辑处理。这样 root 沙箱与 Actions 普通用户都真正覆盖“不可信目录所有者”分支，不跳过断言。

### 4. duration-sequencer：清理不存在的权重

- `scripts/testing/vitest-shard-weights.json:93`、`:380`、`:718` 附近删除 darwin/linux/win32 的 `server/cloud-computer-lazy.e2e.test.ts` 权重（原值 19/23/26）。
- 该测试文件在 `7124ef58` 已删除，残留权重同时导致“文件必须存在”及“日志匹配全部权重”两条断言失败。仅清理这三个数据项，不降低平衡要求、不修改 sequencer 或其测试，也不重新估算其他权重。

### 5. WidgetMessage：修复图片 fixture 的地址替换

- `src/components/widget/WidgetMessage.test.ts:20`：测试原先把样例的相对路径替换成测试专用远程地址；T-1207 已将 `shared/widget-samples.ts:196` 改为 `https://example.com/app-icon-512.png`，所以替换不再命中。
- 改为替换当前样例地址，仍使用 `https://example.test/app-icon-512.png` 验证点击后加载、lazy、no-referrer 等行为。渲染器行为没有问题，无需改生产组件或放宽断言。

### 6. file-size-ratchet：关闭不需要的 Git 标准输入

- `scripts/testing/file-size-ratchet.test.ts:52`：`git ls-files` 不使用 stdin，显式设置 `stdio: ["ignore", "pipe", "pipe"]`。在本沙箱的 Node 24 中，默认同步子进程即使退出码为 0、返回正确文件列表，也会附带 `spawnSync git EPERM`；最小复现确认关闭 stdin 后错误消失。仅修复测试启动方式，文件枚举和行数阈值保持不变，使检查能报告实际的服务端超限。

## server/ 边界：仍需另一路处理

1. `scripts/testing/index-route-ratchet.test.ts:9` 的阈值没有修改。`56b31572` 在 `server/index.ts:12565` 新增 Access 公开探针判定，新增三个 `path === "/` 和一个 `.test(path)`；当前计数分别为 87 > 84、1 > 0。建议把探针分类放到 `server/` 的合适模块，复用现有公开路由定义；本路不能移动该代码，直接上调阈值会掩盖真实超限。
2. 日志额外发现 `scripts/testing/file-size-ratchet.test.ts:19` 失败：`server/index.ts` 当前 15516 行，超过 15515 上限。与新增 Access 接线相关；建议随上一项抽取解决。本路保持阈值不变，交另一路处理。
3. 原 CI 的 `server/bot-box/env.test.ts` 还报告四个新变量未归类：`CRYBOT_CF_ACCESS_ALLOW`、`CRYBOT_CF_ACCESS_AUD`、`CRYBOT_CF_ACCESS_TEAM_DOMAIN`、`CRYBOT_DESKTOP_UPDATES_DIR`。均来自 T-1208 服务端接线，需另一路确认归入仅服务端使用的集合。
4. 本地 `tsc -p tsconfig.server.json` 通过，未发现新增服务端类型错误。原 CI 的 55 个 `server/` 失败测试文件列在末尾，它们未在本路重跑，原因及修复由服务端一路确认。

## 测试删除清单

无。保留 vocabulary 的六条测试和 update-runner 原有 23 条测试，另加一条。只删除已不存在测试的三个分片权重，以及已删除推广功能的词汇豁免；对应提交和功能在上文逐项注明。

## 验证环境与命令

使用 Node `v24.22.3`、pnpm `10.33.0`；所有 pnpm 命令均以前缀 `PATH=/opt/node24/bin:$PATH` 运行，一次一个重命令。默认 Node 22 且工作树无 node_modules 时的第一次 `pnpm lint` 因找不到 oxlint 未能执行检查。

尝试 `CRYBOT_SKIP_HOOKS=1 pnpm install --frozen-lockfile --offline` 时，pnpm 要在共享 store 注册工作树，沙箱以 EROFS 拒绝写入。本地改为 `cp -a --reflink=auto /root/workspace/crybot/node_modules ./node_modules`，使用工作树独立可写副本，无需修改依赖或锁文件；不能把这一点宣称为重新安装成功，Actions 仍需重新执行 frozen install。

仓库引用的 `docs/verification/README.md` 不存在（T-1207 报告也已记录）。本路使用已有 Vitest 临时 HOME、临时部署目录、DOM 和 fake 工具；未启动真实服务器/Chromium、未使用 systemd-run、未对 live app 或用户数据执行验证，不声明服务端/真实会话验收通过。

CI `check` 的 run 步骤为 frozen install、`tsc -b`、`tsc -p tsconfig.server.json`、lint、i18n、brand。安装限制如上；其余全部在本地逐项通过，最终另执行了组合 `pnpm typecheck`。

| 命令 | 最终结果 |
|---|---|
| `pnpm exec tsc -b` | 通过，退出 0 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过，退出 0 |
| `pnpm lint` | 通过，退出 0，保持 `--deny-warnings` |
| `pnpm i18n:check` | 通过，16 种语言、10550 条英文字符串 |
| `pnpm check:brand` | 通过，0 forbidden references |
| `pnpm typecheck` | 通过，退出 0 |
| `node scripts/check-brand-residue.mjs` | 通过，6540 files checked; 0 forbidden references，退出 0 |
| `git diff --check` | 通过，退出 0 |
| `pnpm vitest run src/locales/vocabulary.test.ts --maxWorkers=2 --configLoader runner` | 6/6 通过，退出 0 |
| `pnpm vitest run scripts/testing/update-runner.test.ts --maxWorkers=2 --configLoader runner` | 24/24 通过，退出 0 |
| `pnpm vitest run scripts/testing/duration-sequencer.test.ts --maxWorkers=2 --configLoader runner` | 15/15 通过，退出 0 |
| `pnpm vitest run scripts/testing/index-route-ratchet.test.ts --maxWorkers=2 --configLoader runner` | 1 条失败，退出 1：87 > 84、1 > 0，交服务端一路 |
| `pnpm vitest run src/components/widget/WidgetMessage.test.ts --maxWorkers=2 --configLoader runner` | 45/45 通过，退出 0 |
| `pnpm vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=2 --configLoader runner` | 1 条失败，退出 1：`server/index.ts` 15516 > 15515，交服务端一路 |

首次 update-runner 修复后为 22/24，补上非 root UID fixture 后完整重跑 24/24。file-size 首次及 stdin 重定向尝试均因同步进程 stdin 的 EPERM 提前失败；显式忽略不需要的 Git stdin 后完整重跑，确认唯一失败是上述服务器行数超限。

## 原 CI 服务端失败索引（未在本路重跑）

- `server/bot-api-team.e2e.test.ts`
- `server/bot-box/ask-socket.linux.test.ts`
- `server/bot-box/command-line-paths.linux.test.ts`
- `server/bot-box/env.test.ts`
- `server/bot-box/self-check.linux.test.ts`
- `server/box-attachments.linux.test.ts`
- `server/cloud-credit.e2e.test.ts`
- `server/cloud-guest-shell.e2e.test.ts`
- `server/cloud-home-server.test.ts`
- `server/cloud-lending-chrome.e2e.test.ts`
- `server/cloud-lending-memory.e2e.test.ts`
- `server/cloud-lending.e2e.test.ts`
- `server/cloud-lent-mcp.e2e.test.ts`
- `server/cloud-routine-level.e2e.test.ts`
- `server/cloud-team-admin.e2e.test.ts`
- `server/cloud-team-bot-access.e2e.test.ts`
- `server/cloud-team-browser.e2e.test.ts`
- `server/cloud-team-conversation-share.e2e.test.ts`
- `server/cloud-team-crybot-own-chat.e2e.test.ts`
- `server/cloud-team-crybot-reach.e2e.test.ts`
- `server/cloud-team-engine-homes.e2e.test.ts`
- `server/cloud-team-included-hosting.e2e.test.ts`
- `server/cloud-team-member-secrets.e2e.test.ts`
- `server/cloud-team-one-answer.e2e.test.ts`
- `server/cloud-team-open-reach.e2e.test.ts`
- `server/cloud-team-people.e2e.test.ts`
- `server/cloud-team-per-person.e2e.test.ts`
- `server/cloud-team-preference.e2e.test.ts`
- `server/cloud-team-privacy-holes.e2e.test.ts`
- `server/cloud-team-private-default.e2e.test.ts`
- `server/cloud-team-private.e2e.test.ts`
- `server/cloud-team-profile.e2e.test.ts`
- `server/cloud-team-published-apps.e2e.test.ts`
- `server/cloud-team-routines.e2e.test.ts`
- `server/cloud-team-setup-request.e2e.test.ts`
- `server/connector-stayed.e2e.test.ts`
- `server/data-format.test.ts`
- `server/decider/helper-backends.test.ts`
- `server/drivers/agents-bridge-wire.test.ts`
- `server/engine-homes/box.linux.test.ts`
- `server/extractor/extractor.test.ts`
- `server/index.test.ts`
- `server/model-providers-docs.test.ts`
- `server/opencode-provider-keys.e2e.test.ts`
- `server/outside-lineage.e2e.test.ts`
- `server/outside-work-threads.e2e.test.ts`
- `server/parallel-threads.e2e.test.ts`
- `server/question-cards.e2e.test.ts`
- `server/question-routing.e2e.test.ts`
- `server/same-name-mentions.e2e.test.ts`
- `server/starter-bots.e2e.test.ts`
- `server/team-move.e2e.test.ts`
- `server/team-protocol.e2e.test.ts`
- `server/team-refused-handoff.e2e.test.ts`
- `server/use-my-mac.e2e.test.ts`
