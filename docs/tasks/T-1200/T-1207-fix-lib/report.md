
# lib 路修复报告（2026-11-13）

分支：`T-1207-fix-lib`。已阅读规格第 1–5 节；仅修改本路目录及此报告，未提交 git，未修改 server、src/components、.github、docs/specs 或授权/归属文件。

**当前未完成执行验收。** 指定的 `systemd-run` 在沙箱中无法连接 system scope bus（`Operation not permitted`），Vitest 与 oxlint 都未启动。已请求允许使用进程组 RSS 监控替代 scope，在得到答复前未执行替代命令。不能把下列修复记为测试已通过。

## 按清单文件记录

“未执行”统一表示上述本地沙箱阻塞，不等于 CI 缺浏览器引擎，也不是测试 pass。清单 39 个文件分两批（20 + 19）均尝试过指定命令。

| 文件 | 规则分类 | 修改/判断 | 最终运行状态 |
|---|---|---|---|
| `companion/test/e2e/vectors.test.ts` | 3、5 | 保留原断言；V1/V2/V3 的派生值、prologue 与摘要未随协议品牌变更重新生成；V7 的固定中继域名限制与当前解析器冲突，见未解决项。 | 未执行：systemd bus 拒绝 |
| `companion/test/proxy.test.ts` | 1 | 重置外观的 fixture 与期望由 cursor 改为规格要求的 dome；保留非法 shape 拒绝测试。 | 未执行：systemd bus 拒绝 |
| `connector/test/update-runner.test.ts` | 3 | 镜像仓库精确期望改为 ghcr.io/crysound/crybot，与现有 runner 和 connector 的 digest 白名单一致；不放宽正则。 | 未执行：systemd bus 拒绝 |
| `electron/menu.test.mjs` | 1 | 英文及葡语菜单显示名改为 Cry Bot。 | 未执行：systemd bus 拒绝 |
| `electron/updater.test.mjs` | 2、5 | 移除托管账号恢复的 fixture、Cloud 更新授权与恢复通知用例；用真实启动状态 cloudAccount=null 测本机 updater，所有远端页面（包括残留 Cloud 页）都必须被拒绝，保留冒充 frame、错误账号和用户确认更新保护。 | 未执行：systemd bus 拒绝 |
| `evals/live/live-suite.test.ts` | 3 | 两份品牌已变更的 judge prompt 升为 v2，并更新 manifest 校验和、场景引用及说明；保留摘要验证和未知版本拒绝。 | 未执行：systemd bus 拒绝 |
| `scripts/after-pack.test.mjs` | 3 | 导入前显式配置隔离测试用 CRYBOT_BROWSER_ENGINE_URL；缺 manifest 的 fail-closed 断言不变。 | 未执行：systemd bus 拒绝 |
| `scripts/prepare-browser.test.mjs` | 3 | 导入前显式配置测试镜像 URL，测试结束恢复环境变量；原下载大小、摘要、目录穿越及篡改拒绝断言不变。 | 未执行：systemd bus 拒绝 |
| `scripts/server-locale-plugin.test.ts` | 2、3 | 用仍保留的 server.teammates.sameRequest 德英文本验证 bundle；不再要求已删除的上游报告上传成功文案。 | 未执行：systemd bus 拒绝 |
| `scripts/testing/duration-sequencer.test.ts` | 2、3 | 测试不改；移除 vitest-shard-weights.json 中指向已不存在测试文件的 42 条权重，保持存在性和全量分片断言。 | 未执行：systemd bus 拒绝 |
| `scripts/testing/host-e2e.test.ts` | 2 | 测试不改；从 host-e2e.ts 删去已删除的 cloud-send-kinds 测试入口。 | 未执行：systemd bus 拒绝 |
| `shared/app-frame/host-page.test.ts` | 3 | 测试不改；使用现有 build-app-host.ts 重新生成 shared/app-frame/app-host.html 及首行摘要。 | 未执行：systemd bus 拒绝 |
| `shared/computer-ask.test.ts` | 1、4 | 显示名期望及 shared/computer-ask.ts 中与 locale 镜像的显示文本统一为 Cry Bot。 | 未执行：systemd bus 拒绝 |
| `shared/pairing-code.test.ts` | 1、4 | 测试不改；修 shared/pairing-code.ts 中旧配对码错误的产品显示名，保持错误代码和校验逻辑。 | 未执行：systemd bus 拒绝 |
| `shared/place-view.test.ts` | 1、4 | shared/place-view.ts 显示名改为 Cry Bot；禁术语正则继续拒绝独立 CRY，但允许正式产品名 Cry Bot（不是安全断言）。 | 未执行：systemd bus 拒绝 |
| `shared/widget.test.ts` | 3、5 | 测试不改；shared/widget-samples.ts 的 Image.src 改为 https://example.com/app-icon-512.png；不放宽 HTTPS 校验。 | 未执行：systemd bus 拒绝 |
| `src/lib/bot-unread.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/cloud-send.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/companion-pairing.test.ts` | 3、5 | 预期 address/hosts 使用 fixture 的 server.example.test，保持精确主机、HTTPS、不降级 LAN 和 pin 校验。 | 未执行：systemd bus 拒绝 |
| `src/lib/failed-turn.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/github-refs.test.ts` | 3 | 示例仓库统一为 example/project，修复 URL、repo 字段及短引用不一致。 | 未执行：systemd bus 拒绝 |
| `src/lib/live-call-media.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/local-computer.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/mac-cua-permissions.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/new-bot.test.ts` | 2 | 删除 analytics mock、统计 fixture 和 3 条统计调用断言；创建、取消、错误处理与回滚断言保留。 | 未执行：systemd bus 拒绝 |
| `src/lib/org-library.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/page-open.test.ts` | 3、5 | 恢复长度合法的 published-page ID fixture；修回短 ID、根域名、嵌套标签、HTTP、伪后缀、凭据及端口的拒绝样本。 | 未执行：systemd bus 拒绝 |
| `src/lib/plain-error.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/published-links.test.ts` | 3、5 | PAGE fixture 改为符合现有 PAGES_DOMAIN/PAGE_ID 的 URL，保留未知应用与外链拒绝断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/routine-display.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/server-update.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/server-word-contracts.test.ts` | 4 | 保持契约断言；仍受范围外 server/user-errors.ts 的显示名错误影响，见未解决项。 | 未执行：systemd bus 拒绝 |
| `src/lib/team-bulk-settings.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/lib/updater.test.ts` | 1 | 测试输入/期望中的产品显示名统一为 Cry Bot；保留原行为断言。 | 未执行：systemd bus 拒绝 |
| `src/locales/everyday-words.test.ts` | 2 | 删除已不存在的 cloudHowTo. 前缀；保持其他键/前缀存在性检查。 | 未执行：systemd bus 拒绝 |
| `src/locales/native-keys.test.ts` | 2 | 测试不改；删 en、pt-br、zh-tw 的 native.accounts.moving / native.accounts.myComputer 及 source-hashes 对应记录。 | 未执行：systemd bus 拒绝 |
| `src/locales/server-lines.test.ts` | 4 | 保持扫描及 pending 表断言；范围外 server/routine-requests.ts 仍使用错误显示名，见未解决项。 | 未执行：systemd bus 拒绝 |
| `src/locales/settings-words.test.ts` | 2 | 共享组件扫描清单删 AnalyticsRow.tsx，避免读取已删除的统计设置组件。 | 未执行：systemd bus 拒绝 |
| `src/pair/PairPage.test.ts` | 1、2、5 | 保留普通桌面配对流程并更新显示名；删 Cloud/Plan 导流、Cloud 标题及旧账号登录文案断言；保留 teamPage 的 HTTPS/凭据/hash/会话描述符安全断言。 | 未执行：systemd bus 拒绝 |

## 删除记录及理由

- `src/lib/new-bot.test.ts`：删除“取消时不 track”断言；统计功能已移除，无需为取消行为 mock 统计模块。
- `src/lib/new-bot.test.ts`：删除成功时 `bot_created` 调用断言；规格要求不恢复统计事件。
- `src/lib/new-bot.test.ts`：删除失败时不 track 断言及对应 fixture/mock；创建失败仍验证错误返回和回滚。
- `electron/updater.test.mjs`：删除 My Cloud 获取 updater 的授权与点击后安装分支；托管 Cloud 入口已删除，改为验证这些远端页面即使点击也拿不到 bridge。
- `electron/updater.test.mjs`：删除登录恢复期间给 My Cloud bridge 的正向分支；托管账号恢复已删除，保留远端拒绝和 frame 冒充拒绝。
- `electron/updater.test.mjs`：删除另一个自有 Cloud 获得 bridge 的正向用例；托管账号的 Cloud 所有权授权已删除，保留对这些远端页面的拒绝。
- `electron/updater.test.mjs`：删除“恢复登录后发送 Restart to update”的用例；已无托管账号恢复流程，本机下载、安装、窗口重开及消息隔离测试仍保留。
- `electron/updater.test.mjs`：删除当前/缓存 Cloud 账号一致时获准 updater 的断言；仅本机活动主 frame 获准，错误账号与远端 frame 拒绝仍验证。
- `scripts/server-locale-plugin.test.ts`：删除德英两条上游报告上传成功文案断言；该上传功能已删除，改用保留的服务器文本检查 bundle 内容。
- `scripts/testing/host-e2e.ts`：删除 cloud-send-kinds 入口；对应托管迁移测试文件已删除。
- `src/locales/everyday-words.test.ts`：删除 cloudHowTo. 前缀要求；Cloud 引导已删除。
- `src/locales/settings-words.test.ts`：删除 AnalyticsRow.tsx 扫描项；统计设置组件已删除。
- `src/locales/en.json`、`pt-br.json`、`zh-tw.json`、`source-hashes.json`：删除 moving / myComputer 两个 native.accounts 键及哈希；Electron 不再使用这些账号迁移菜单文案。
- `src/pair/PairPage.test.ts`：删除 My Cloud 入口、Settings Cloud 和 Plan 页面导流断言；托管 Cloud 及付费页已删除，普通配对提示保留。
- `src/pair/PairPage.test.ts`：删除个人/团队 Cloud 标题与旧 email 登录标题/发送提示断言；这些托管账号展示不再是产品契约。
- `src/pair/PairPage.test.ts`：删除 team.open 的 Cloud 文案断言；保留该 helper 所有 URL 与会话安全校验断言。

`vitest-shard-weights.json` 删除的 42 条权重（同一路径在不同平台重复）逐项如下；仅删不存在文件的索引，没有删除这些测试或修改存在性断言：

- `scripts/ci-scope.test.ts`（win32）：当前工作树已无该文件，移除失效权重。
- `server/app-events-cloud.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/app-events.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/app-events.ui.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/cloud-connections.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/cloud-send-kinds.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/cloud-send-move.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/cloud-team-connections.e2e.test.ts`（linux）：当前工作树已无该文件，移除失效权重。
- `server/cloud-team-inbox.e2e.test.ts`（linux）：当前工作树已无该文件，移除失效权重。
- `server/cloud-team-owners.e2e.test.ts`（linux）：当前工作树已无该文件，移除失效权重。
- `server/cloud-team.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/devs-reports.e2e.test.ts`（linux）：当前工作树已无该文件，移除失效权重。
- `server/first-hour.e2e.test.ts`（linux）：当前工作树已无该文件，移除失效权重。
- `server/hosted-access.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/hosted-models-api.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/license-expiry-api.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/spend-cap-api.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。
- `server/spend-cap-goal.e2e.test.ts`（darwin, linux, win32）：当前工作树已无该文件，移除失效权重。

## 修改的源码与产物

- `shared/computer-ask.ts`、`shared/pairing-code.ts`、`shared/place-view.ts`：只修产品显示文本；接口、错误键、权限判断不变。
- `shared/widget-samples.ts`：修无效图片 URL；仍走现有 HTTPS 校验。
- `scripts/testing/host-e2e.ts`、`vitest-shard-weights.json`：清理删除文件的测试调度引用。
- `shared/app-frame/app-host.html`：由生成器重建；正文 SHA-256 为 `0f66e957eaa674da95a2d988203f5f7c0d37f2b384471ac2f8d0a4c22e2e0e32`。
- `evals/live/judge/prompts/open-ended-v2.md`、`reply-habits-v2.md`、`manifest.json`：取代品牌修改后摘要失效的 v1 工件，并修正 `an Cry Bot` 为 `a Cry Bot`；`evals/README.md`、live-suite 及 6 份场景同步版本引用。
- `src/locales/en.json`、`pt-br.json`、`zh-tw.json`、`source-hashes.json`：删除不可达菜单键。
- 类型影响复核：生产 TS 仅字符串值及 Record 条目删除，无新增接口或类型改动；未运行全量 tsc -b。

## 未解决项及需要别路处理的源码

1. `companion/test/e2e/vectors.test.ts`（规则 3、5，非 CI 环境问题）：保留原文件与全部断言。`companion/src/e2e/descriptor.ts` 的 isRelayHost 现在接受任意合法 DNS 名；`gen-vectors.ts:535` 起仍要求拒绝固定域名的 suffix、zero、upper、other_domain 变体，生成器因 `relay_host_suffix parsed` 无法完成。没有将这些拒绝样本改成接受，也没有改主机校验。需先确认“可配置中继”在描述符中的主机信任契约，再同步生成器和各客户端；随后运行生成器重算全部密钥派生、握手及摘要。当前 V1/V2/V3 和 V7 的旧编码/校验工件仍未修复，不能声称安全契约已验证。
2. `src/lib/server-word-contracts.test.ts`（规则 4，非 CI 环境问题）：`server/user-errors.ts` 多个面向用户的字符串仍写作 CryBot（owner.personal、computer.*、install.* 等）。建议 server 路按显示名规则统一成 Cry Bot，并与 locale 精确对齐；不要修改本测试或 locale 来迎合错误文本。shared/pairing-code 的 oldCode 已在本路修复。
3. `src/locales/server-lines.test.ts`（规则 4，非 CI 环境问题）：`server/routine-requests.ts:705` 中启动文案仍为 `Also runs once each time CryBot starts`，与 pending 表里的正确显示名不符；建议 server 路改为 Cry Bot（同文件 863 行也有显示名），保留来源扫描与 stale 检查。
4. 当前缺少 AGENTS.md 指定的 `docs/verification/README.md`。本路未对用户服务或数据做任何验证操作；companion/proxy 测试原有临时目录、隔离 HOME 与独立 harness 仍保留，但本环境未启动成功。

## 验证记录

- Vitest：Node 24、2 workers，按清单先 20 后 19 个文件，串行尝试；两批在 systemd 阶段退出，未产生 Vitest 结果。日志：`/tmp/t1207-fix/lib-run-batch1.log`、`lib-run-batch2.log`，`lib-run.log` 保留第二批。
- oxlint：尝试指定 MemoryMax=3G / Node 24 / --deny-warnings 命令；同样被 systemd bus 拒绝，日志 `/tmp/t1207-fix/lib-lint.log`。
- 品牌残留：Node 24 运行 `scripts/check-brand-residue.mjs`，通过，6472 files checked / 0 forbidden references（报告写入前的运行）。
- Locale：Node 24 运行 `scripts/generate-locale.mjs --check`，通过，16 languages / 10550 English strings。
- `git diff --check` 通过；`node --check electron/updater.test.mjs` 通过（仅语法检查，不替代测试/lint）。
- 未运行上游已知失败清单或任何全量测试；没有将上面的源码/安全契约问题归因于缺浏览器引擎。


最终复查：报告写入后品牌残留检查再次通过（6473 files checked / 0 forbidden references）；locale 再次通过；最终 oxlint 尝试仍被 systemd bus 拒绝。


## 第 2 轮追加：Node 24 串行复验（2026-11-13）

本节是最新验收结果，取代上文第一轮“未执行”的运行状态；第一轮的改动、逐文件分类和删除理由全部保留。本轮先执行了 `git status --short` / `git diff --stat`，确认已有 51 个受跟踪文件的改动，未回退、未提交。复读规格第 1–5 节后，没有新增测试删除或产品源码改动；只追加本报告。

**清单 39 文件全部执行完毕：35 文件通过，4 文件未通过。** 合计 916 passed、53 failed、34 skipped、3 todo；其中 29 skipped 来自 proxy fixture 初始化失败，另外 5 skipped、3 todo 是通过文件内已有的跳过/待办。分配清单与上游 baseline 失败清单没有交集，未执行上游 baseline 文件。

### 运行方式及环境限制

- 全部使用 `/opt/node24/bin/node`，未设置 `CRYBOT_VITEST_WORKERS`，未使用 systemd-run。8 批串行，每批最多 8 文件；路径含 e2e 的文件各自一批，启动实际服务的 proxy 也单独一批。
- 原指定命令首次启动时失败：共享 `node_modules` 是指向工作树外只读目录的软链接，Vite 默认 bundle loader 写入 `.vite-temp` 返回 `EROFS`。随后使用 Vitest 支持的 `--configLoader runner`，直接加载相同的 `vite.config.ts`，不修改配置、测试或依赖目录，不取消 setup/隔离 fixture。
- 实际复验命令：`/opt/node24/bin/node node_modules/vitest/vitest.mjs run <本批文件> --maxWorkers=1 --configLoader runner > /tmp/t1207-fix/lib-run.log 2>&1`。批次清单为 `/tmp/t1207-fix/lib-batches.json`；各批日志保存在 `/tmp/t1207-fix/lib-round2-batch1.log` 至 `lib-round2-batch8.log`。只读取日志 tail 与 rg 匹配结果。
- `docs/verification/README.md` 仍不存在。测试 setup 使用临时 HOME、清除继承的数据目录，proxy 尝试启动其独立 fixture，但端口绑定被沙箱拒绝；未对用户服务或数据做任何请求。

### 清单逐文件最新结果

分类沿用第一轮按文件说明；本轮未新增删除。

| 文件 | 规则分类 | 批次 | 第 2 轮结果 |
|---|---|---|---|
| `companion/test/e2e/vectors.test.ts` | 3、5 | 1 | 失败：18 failed / 99 passed；协议向量与中继安全契约，见下文 |
| `companion/test/proxy.test.ts` | 1 | 2 | 环境阻塞：beforeAll 无法绑定端口，29 skipped；不是断言通过 |
| `scripts/testing/host-e2e.test.ts` | 2 | 3 | 通过 |
| `connector/test/update-runner.test.ts` | 3 | 4 | 通过 |
| `electron/menu.test.mjs` | 1 | 4 | 通过 |
| `electron/updater.test.mjs` | 2、5 | 4 | 通过 |
| `evals/live/live-suite.test.ts` | 3 | 4 | 通过 |
| `scripts/after-pack.test.mjs` | 3 | 4 | 通过 |
| `scripts/prepare-browser.test.mjs` | 3 | 4 | 通过 |
| `scripts/server-locale-plugin.test.ts` | 2、3 | 4 | 通过 |
| `scripts/testing/duration-sequencer.test.ts` | 2、3 | 4 | 通过 |
| `shared/app-frame/host-page.test.ts` | 3 | 5 | 通过 |
| `shared/computer-ask.test.ts` | 1、4 | 5 | 通过 |
| `shared/pairing-code.test.ts` | 1、4 | 5 | 通过 |
| `shared/place-view.test.ts` | 1、4 | 5 | 通过 |
| `shared/widget.test.ts` | 3、5 | 5 | 通过 |
| `src/lib/bot-unread.test.ts` | 1 | 5 | 通过 |
| `src/lib/cloud-send.test.ts` | 1 | 5 | 通过 |
| `src/lib/companion-pairing.test.ts` | 3、5 | 5 | 通过 |
| `src/lib/failed-turn.test.ts` | 1 | 6 | 通过 |
| `src/lib/github-refs.test.ts` | 3 | 6 | 通过 |
| `src/lib/live-call-media.test.ts` | 1 | 6 | 通过 |
| `src/lib/local-computer.test.ts` | 1 | 6 | 通过 |
| `src/lib/mac-cua-permissions.test.ts` | 1 | 6 | 通过 |
| `src/lib/new-bot.test.ts` | 2 | 6 | 通过 |
| `src/lib/org-library.test.ts` | 1 | 6 | 通过 |
| `src/lib/page-open.test.ts` | 3、5 | 6 | 通过 |
| `src/lib/plain-error.test.ts` | 1 | 7 | 通过 |
| `src/lib/published-links.test.ts` | 3、5 | 7 | 通过 |
| `src/lib/routine-display.test.ts` | 1 | 7 | 通过 |
| `src/lib/server-update.test.ts` | 1 | 7 | 通过 |
| `src/lib/server-word-contracts.test.ts` | 4 | 7 | 失败：33 条文案契约断言；需 server 路处理 |
| `src/lib/team-bulk-settings.test.ts` | 1 | 7 | 通过 |
| `src/lib/updater.test.ts` | 1 | 7 | 通过 |
| `src/locales/everyday-words.test.ts` | 2 | 7 | 通过 |
| `src/locales/native-keys.test.ts` | 2 | 8 | 通过 |
| `src/locales/server-lines.test.ts` | 4 | 8 | 失败：2 条来源扫描断言；需 server 路处理 |
| `src/locales/settings-words.test.ts` | 2 | 8 | 通过 |
| `src/pair/PairPage.test.ts` | 1、2、5 | 8 | 通过 |

### 仍失败的文件、原因及交接建议

1. `companion/test/e2e/vectors.test.ts`（规则 3、5，18 failed / 99 passed，非 CI 浏览器环境问题）。固定摘要、V1 派生值、V2/V3 prologue 与握手结果仍是改名前的工件；V7 的 base64 内嵌主机和可读期望也不一致。生成器在 `companion/src/e2e/gen-vectors.ts:566` 因 `relay_host_suffix parsed` 停止。更关键的是，现有解析器 `companion/src/e2e/descriptor.ts:11` 接受 suffix、zero、upper、other_domain 四个原本应拒绝的样本，四个拒绝测试实际失败。按规则 5，保留全部安全断言，不把拒绝改成接受，也不只重算 SHA 来隐藏问题。需要协调确认可配置中继的信任契约，再让解析器、生成器和客户端一致，最后完整重生成并验证向量。这是本路明确保留的安全待决项，不声称已修复。
2. `companion/test/proxy.test.ts`（规则 1 的修复已保留；环境问题）。`beforeAll` 在寻找三个连续端口时失败，29 条测试全部跳过。额外用 Node 24 的 `net.createServer().listen(0, "127.0.0.1")` 做独立诊断，得到 `EPERM: listen EPERM: operation not permitted 127.0.0.1`，证实为沙箱网络权限限制。没有放宽 host、token 或权限断言；需要在允许隔离 loopback fixture 的环境重跑，不能据此断言产品行为通过，也不是缺浏览器引擎。
3. `src/lib/server-word-contracts.test.ts`（规则 4，33 failed，非环境问题）。完整运行比第一轮静态排查多发现三个 server 文件；以下四个文件均不在本路修改范围，保持不动，请 server 路修复显示文本为 `Cry Bot`，保留 key、参数和权限逻辑：
   - `server/user-errors.ts:86` 起：13 条失败，涉及 owner.personal、computer.desktopOnly/permissionsThenRestart/notReadyDetail/notReadyMacPermission、install.versionGone/notPlainFolder/unexpectedFolder/cannotWrite、setup.crybotMissing/crybotOwnerOnly、secret.localService、share.ownBot。
   - `server/drivers/driver-notices.ts:2` 起：14 条失败，包含 4 条 elicitationUrlDeclined、8 条 elicitationFormDeclined 及 2 条 codexElicitationDeclined 变体。
   - `server/chat-notices.ts:9`、`:135` 起：5 条失败，restartInterrupted 及 4 条 computer 文案。
   - `server/routine-lines.ts:12`：1 条失败，routines.server.retryAfterRestart。英文不匹配使 `routineLineText` 按现有保护逻辑保留原文，pt-BR 翻译断言失败；应改 server 英文，不应削弱前端精确匹配保护。
4. `src/locales/server-lines.test.ts`（规则 4，2 failed，非环境问题）。`server/routine-requests.ts:705` 的 `Also runs once each time CryBot starts` 与已正确写为 `Cry Bot` 的 PENDING 不一致，分别触发未登记文本与 stale 登记断言。server 路应修产品显示名（同文件 `:863` 还有同类显示文本），本路不改扫描器/PENDING 来迎合错误源文本。

### 最终检查

- oxlint：用 Node 24 执行 `node_modules/oxlint/bin/oxlint --deny-warnings <所有已修改且仍存在的文件>`，退出 0；日志 `/tmp/t1207-fix/lib-lint.log`（无诊断输出）。对 5 个修改的 TS 源码文件另行执行同样的 lint，也退出 0。
- 品牌检查：Node 24 执行 `scripts/check-brand-residue.mjs`，6474 files checked / 0 forbidden references。
- Locale 检查：Node 24 执行 `scripts/generate-locale.mjs --check`，通过，16 languages / 10550 English strings。
- 类型复核：修改的 TS 产品源码只有字符串值替换，`host-e2e.ts` 仅删除 Record 条目；没有签名、字段类型或控制流变化。相关 shared、host-e2e 测试均已通过。未运行全量 tsc -b，也不将 lint 或 Vitest 表述为完整类型检查。
- `git diff --check` 通过。未修改 `.github/`、`docs/specs/`、NOTICE、LICENSE，未修改上述范围外 server 文件。
