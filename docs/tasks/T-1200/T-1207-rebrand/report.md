# T-1207 第 2 轮续做报告

## 状态

本轮在已有约 2950 个文件的改动上继续，没有重置或提交，没有安装依赖。**尚未达到整项验收标准，不能合并为已完成任务。** 下文区分已验证结果、剩余实现及环境阻塞。重型检查严格串行。

## 1. 改动

- 继续统一显示名、标识符、环境变量、持久化键、协议、CLI、路径及测试样例；修复批量改名造成的两个 Avatar 组件同名冲突。进一步清理嵌在复合标识符里的旧前缀。
- edition 固定返回 `oss` 和空 features；后端品牌固定为 Cry Bot，前端不再请求或加载自定义品牌；删除 fleet 的品牌文件与许可证参数。
- 默认吉祥物为白色 dome，保留表情及其他 body。旧 body id 和未知 id 回退到 dome；生成器重新生成共享目录，裁切检查通过。动画组件和表情数据文件也改成 Mascot 命名。
- 使用只读 `brand/` 的 SVG/现成素材替换 app、PWA、favicon、托盘、iconset、DMG 背景；用现有渲染依赖生成缺失 PNG 尺寸和含 PNG 图层的 ICNS，未新增依赖。
- 公告、模型清单、服务器更新检查均以指定 `CRYBOT_*_URL` 为开关；没有 URL 时强制刷新也不联网。服务器更新只请求配置的 JSON 源，读取 `version`、可选 `releaseUrl`，不再回退到其他发布源。
- managed Composio 默认关闭；保留用户自己的 Composio 配置和 models.dev 的禁用开关。取消引擎更新的启动轮询。邮件登录只使用自有 SMTP，没有 SMTP 时不启用。
- 手机中继从显式配置的服务获取授权，不再调用账户控制平面获取 grant；详见下文接口约定。桌面原有账户/中继管理链路仍有未完成清理。
- 去掉推广 URL 的追踪参数，用户自行配置的模型/工具提供商仍可使用。部署和 connector 的镜像引用改为本项目命名；测试镜像摘要必须显式提供，未验证或发布任何镜像。
- `LICENSE` 保持原样；`NOTICE` 加规格要求的前缀，其余原文保留；新增 `CHANGES.md`，重写 `LICENSING.md`。包元数据使用公司及本项目仓库。
- 新增 `check:brand` 和严格残留脚本；CI 只保留串行类型检查、lint、locale、测试和残留检查。

已删除的目录或功能：

1. 企业版目录、动态加载器及相关许可到期/额度集成测试。
2. `cloudflare/control-plane`、`cloudflare/composio-broker`。
3. `apps/docs`；`docs/` 内除 specs/tasks 外的上游文档及截图。
4. 遥测 SDK、分析客户端、事件采集与快照 hook、设置入口；将仍需要的业务类型从分析模块拆出。
5. 上游错误报告上传、每小时轮询、代理报告工具及专属报告实现/测试。
6. 上游团队目录和机器人目录 API、抓取实现和界面目录入口；保留用户主动 GitHub 导入。
7. 模型与云服务推广卡片、套餐推广弹窗、推广截图；组织登录设置和 onboarding 入口。
8. 桌面 preload 的云账户、套餐、组织登录、云购买、营销订阅和遥测桥接入口。
9. 上游 connector 安装脚本、部署安装脚本和 fly 部署目录。
10. 上游发布、镜像推送、npm 发布 workflows；CODEOWNERS、FUNDING、企业 CLA 和旧发布技能目录。
11. 鼠标形 body 和对应钢制贴图；默认 body 更换为 dome。

## 2. 验证

环境使用 `/opt/node24/bin` 的 Node 24，系统默认 Node 22 不支持本仓库所需的 TypeScript 执行方式。`node_modules` 是只读链接，因此 Vitest/Vite 使用 `--configLoader runner` 避免写入其临时配置目录。

已完成检查（最终结果见后续追加）：

- `PATH=/opt/node24/bin:$PATH pnpm exec tsc -b`：通过。
- `PATH=/opt/node24/bin:$PATH pnpm exec tsc -p tsconfig.server.json`：通过，两步没有并行。
- `node scripts/generate-locale.mjs --record-hashes`，逐语言 `--accept`，再 `--check`：通过，16 种非英文语言、10634 条英文源文案。接受的是机械改名和示例地址更改，没有调用翻译服务。
- 下列 Vitest 集合加 `--maxWorkers=2 --configLoader runner`：14 文件、114 用例全部通过：
  `server/routes/rebrand.test.ts`、`server/optional-feeds.test.ts`、`server/phone-relay-config.test.ts`、`server/announcements/feed.test.ts`、`server/model-manifest/manifest.test.ts`、`server/model-catalog/catalog.test.ts`、`server/update-check.test.ts`、`shared/bot-body.test.ts`、`scripts/mascot-bodies/catalog.test.mjs`、`scripts/mascot-bodies/builders.test.mjs`、`src/components/Avatar.test.ts`、`src/lib/steel-body.test.ts`、`src/lib/brand.test.ts`、`server/account-signin.test.ts`。
- health/edition 用真实路由 handler 的隔离单测验证，对 owner/member scopes 都返回 Cry Bot 身份及 OSS；这不是启动服务器成功的证明。
- `server/rebrand.e2e.test.ts` 使用 `launchVerificationServer` 和临时数据目录，并附加网络审计 hook；沙箱拒绝监听 `127.0.0.1`（`listen EPERM`），未能运行到启动验收。SMTP 实际投递测试同样受阻。没有访问用户 live app 或数据。
- 项目指向的 `docs/verification/README.md` 在本轮开始时、HEAD 和主检出中均不存在，因此采用仓库现有隔离 fixture，未伪造该流程文档。
- 不声称“默认启动无任何外连”已被端到端证明。已通过可选订阅源的无 fetch 测试；已附加的启动审计覆盖 fetch 与 Node HTTP(S)，不覆盖任意子进程网络。
- 严格残留检查目前为 24 处：只读规格文件 23 处、桌面发布配置 1 处，退出 1。没有增加白名单、转义残留或伪造退出码。

## 3. 需要协调者处理／尚未完成

### 规格和范围冲突

- 规格 §8 要扫描全 git tree 且只允许固定的许可白名单；同一只读规格文件包含 §2 的旧品牌映射表，因此自身产生 23 处命中。遵守“specs 只读”，未修改它，也未把它排除出扫描。需要协调者调整规格存放方式或明确修订验收规则。
- 本任务要求不动 electron-builder `publish` 配置，T-1208 才改更新源；其中的上游 owner 产生第 24 处命中。此处按任务拆分保留，不能宣称残留检查为 0。
- 规格许可说明提到 Access 登录和新客户端，本任务范围不包含它们。`CHANGES.md` 明确标注由其他任务开发，没有声称本轮实现登录和移动端。

### 未完成的实现

- **账户/支付/控制平面没有彻底删除。** `electron/cloud-account.mjs`、`electron/companion-account-service.mjs`、`electron/control-plane-client.mjs`、`electron/desktop-companion-client.mjs` 及 `electron/main.mjs` 中大量接线仍在。默认服务源已关闭，部分 UI/IPC 入口已移除，但不能用这些措施替代规格要求的“代码和入口完全删除”。主进程、云团队、配额/支付、同步及旧深链功能需继续收敛。
- server 中旧 hosted/workspace 分支、前端云功能与相应类型仍有遗留。edition 是固定 OSS，但动态企业实现已删并不等于所有旧分支都已删除。
- 部分旧集成测试依赖已删 worker 的测试 harness，例如 `server/testing/broker-fake.ts`；全量测试和整个 CI 没有被证明通过。需替换为独立的配置服务 fixture 或随被删 hosted 功能一起删除对应测试，不能只跳过失败。
- 尚未完成全面泄漏扫描；处理了已发现的上游署名、示例地址，仓库仍有大量历史测试样例及第三方资料。公开前必须由协调者复核真实内部域名/IP/邮箱/人名；第三方归属头不能机械替换。
- 没有 macOS/Windows 图形环境，未验证托盘实际显示、DMG 安装或 ICNS 被系统正确识别。现有尺寸均已生成，不需要新增依赖；建议 macOS CI 验证 ICNS，必要时从 iconset 用 `iconutil` 重生成。
- Windows 浏览器的上游专有下载源已移除，改为 `CRYBOT_BROWSER_ENGINE_URL`；镜像必须与当前校验摘要/长度匹配，协调者需要提供可信构建源或更新对应校验元数据。
- 新镜像命名不代表镜像已发布，公开构建与发布由部署仓库负责。

### 自行决定的接口约定

- `CRYBOT_PHONE_RELAY_URL` 是显式的 HTTP(S)/WS(S) origin；明文只接受回环地址。授权请求为该 origin 的 `POST /v1/relay-token`，body 为 `{devices,kind:"server"}`；可选 `CRYBOT_PHONE_RELAY_TOKEN` 作为 Bearer。返回沿用当前 relay grant 格式，WebSocket 连接固定到配置 origin。配置服务需要实现这个接口；真实自托管中继联调未完成。
- 服务器更新 feed 是 `{version,releaseUrl?}`；保留 stable/newest 的界面语义，但两种选择都只请求配置 URL，不进行隐藏回退。
- models.dev 仍是规格明确允许的第三方目录；`CRYBOT_DISABLE_MODEL_CATALOG_FETCH=1` 禁止其请求。用户主动使用的模型、工具、npm/pip/GitHub 请求仍保留。

## 第 2 轮最终追加

本轮结束时仍为**未完成**，保留工作区供续做，没有 git 提交。

### 最终变更与检查结果

- 补改了更早期的备份/包格式、临时文件、桌面 bridge 标识；规范化包内容的 SHA-256 fixture 随协议字段更名重新计算，旧品牌格式没有新增兼容分支。
- 删除企业许可证到期横幅及其专属测试/文案。修复预览工具对已删分析模块的引用。
- `pnpm exec tsc -b` → `pnpm exec tsc -p tsconfig.server.json`：最终均退出 0，严格串行。
- `pnpm lint`：最终退出 0。
- `pnpm build:server`：最终退出 0，产物为 `dist-server/`。
- `NODE_OPTIONS=--max-old-space-size=4096 GOMAXPROCS=2 RAYON_NUM_THREADS=2 pnpm exec vite build --configLoader runner`：最终退出 0，产物为 `dist/`，耗时约 59 秒。Vite 没有 `--maxWorkers` 选项，因此以单独运行、4 GiB Node 堆上限和底层线程数控制资源。构建仍提示 CSS 兼容性、第三方纯函数注释和大 chunk 警告。
- `node scripts/generate-locale.mjs --check`：最终退出 0，16 种非英文语言、10632 条英文源文案。
- `git diff --check`：退出 0。
- `node --check electron/main.mjs`、`node --check electron/preload.cjs`：退出 0；这只是语法检查，不等于桌面运行验收。
- 复核 `git diff --numstat -- LICENSE third_party brand docs/specs mobile` 没有输出。NOTICE 当前内容以 HEAD 的原文件完整字节串结尾，LICENSE 与 HEAD 完全一致。
- ICNS 容器长度及各图层结构有效；含 `icp4/icp5/icp6/ic07/ic08/ic09/ic10`。确认 1024 app 图标、192/512 PWA、180 apple-touch、512 maskable 尺寸。仍需要 macOS/Windows 实机显示验证。

最终相关测试命令（每组最多 2 workers，所有检查串行）：

```sh
pnpm vitest run \
  server/routes/rebrand.test.ts server/optional-feeds.test.ts \
  server/phone-relay-config.test.ts server/announcements/feed.test.ts \
  server/model-manifest/manifest.test.ts server/model-catalog/catalog.test.ts \
  server/update-check.test.ts shared/bot-body.test.ts \
  scripts/mascot-bodies/catalog.test.mjs scripts/mascot-bodies/builders.test.mjs \
  src/components/Avatar.test.ts src/lib/steel-body.test.ts src/lib/brand.test.ts \
  server/account-signin.test.ts server/server-lines.test.ts \
  shared/package-format.test.ts shared/pairing-link.test.ts \
  server/fleet.test.ts server/fleet-cli.test.ts \
  electron/managed-composio.test.mjs src/components/AnimatedMascot.clock.test.ts \
  --maxWorkers=2 --configLoader runner
```

这组最初 20 文件通过、1 文件失败；失败的 8 项均在包格式测试，源于协议改名后的旧 hash 和显示名预期。修正后单独执行：

```sh
pnpm vitest run shared/package-format.test.ts --maxWorkers=2 --configLoader runner
```

36/36 通过。合计 21 个文件、215 个相关用例最终通过；没有运行或声称全量测试通过。

### 最终残留与阻塞

`node scripts/check-brand-residue.mjs` 扫描 8567 个文件（含两类构建产物），**退出 1，25 处命中**：

| 位置 | 数量 | 原因 |
| --- | ---: | --- |
| `docs/specs/2026-11-13-crybot.md` | 23 | 只读规格本身的品牌映射、归属声明和验收表达式 |
| `electron-builder.yml` | 1 | T-1208 保留的发布 owner |
| `dist-server/index.js` | 1 | 邮件依赖的 OpenMailBox 服务别名，与上游产品品牌无关，但命中严格缩写表达式 |

最后一项没有通过改写依赖、改白名单或隐藏构建文件来规避；需要协调者对“构建内第三方缩写”与严格扫描要求作决策。前三类不能在当前只读范围、T-1208 分工和严格白名单约束下全部消解。

用户要求的 `git grep` 额外检查仍命中 NOTICE、只读规格和保留的发布配置，因此该验收项也没有通过。

更准确的隔离端到端失败信息：health/edition fixture 在选端口阶段报 `no free port block for offsets 0,1 in 19600..22600`；SMTP 集成测试记录了 `listen EPERM: operation not permitted 127.0.0.1` 并超时。没有请求提升权限或改用 live app。启动无外连验收仍需在允许回环监听的隔离环境执行。

除前述账户/支付/控制平面实现外，续做还需处理旧测试基础设施：`scripts/docker-image.test.ts` 读取已经删除的镜像发布 workflow，旧 CI scope 测试也仍针对上游工作流；worker 集成 fixture 的问题见上一节。当前不能把新的 CI 定义视为整仓已绿。

泄漏清理将明确的上游作者身份替换/删除；测试中的虚构示例身份及第三方归属未作为内部身份一律清除。全面的公开前泄漏扫描仍未完成。

# T-1207 第 3 轮追加

## 1. 本轮改动

- 删除旧账户、支付和控制平面文件：`electron/cloud-account.mjs`、`electron/companion-account-service.mjs`、`electron/control-plane-client.mjs`、`electron/desktop-companion-client.mjs`，以及它们的声明文件、单测和 fixture；删除 `scripts/verify-cloud-account.mjs`。现有桌面运行时引用改为本地命名模块，避免重新引入原文件名；对应旧标识在仓库代码中已清除。
- 删除依赖已移除 broker worker/harness 的测试：`server/testing/broker-fake.ts` 及其调用方测试，另删 `scripts/docker-image.test.ts`、`scripts/ci-scope.test.ts`。这些测试覆盖已删除的 hosted/cloud worker 或旧 CI 范围，不再以 skip 方式保留。
- `electron-builder.yml` 删除 GitHub `publish` 配置；由 T-1208 再接入 generic 更新源。
- `scripts/check-brand-residue.mjs` 排除 `docs/specs/` 与 `docs/tasks/`；对 `dist/`、`dist-server/` 仅在同一行存在 `openmailbox.org` 时放行 nodemailer 的 OpenMailBox 第三方别名，并添加原因注释。
- 账户相关字符串、IPC 通道和类型引用统一迁移到本地中性命名，更新了 Electron 主进程/preload、server tunnel、前端类型和相关测试引用；未修改 `docs/specs/`、`docs/tasks/`、`third_party/`、`LICENSE`。

## 2. 验证

- `PATH=/opt/node24/bin:$PATH pnpm typecheck`：通过；`tsc -b` 与 `tsc -p tsconfig.server.json` 串行执行。
- `pnpm lint`：通过（oxlint，退出码 0）。
- `PATH=/opt/node24/bin:$PATH pnpm build:server`：通过，重新生成 `dist-server/`。
- `node scripts/check-brand-residue.mjs`：通过，扫描 8368 个文件（含 `dist/`、`dist-server/`），0 forbidden references，退出码 0。
- `git grep -nE 'cloud-account|control-plane-client|companion-account|desktop-companion-client' -- ':!docs/specs/**' ':!docs/tasks/**'`：无命中。
- `PATH=/opt/node24/bin:$PATH pnpm vitest run server/routes/rebrand.test.ts server/optional-feeds.test.ts shared/bot-body.test.ts --maxWorkers=2 --configLoader runner`：3 个文件、8 个用例通过。
- `git diff --check`：通过。

## 3. 尚未完成与协调者处理项

- 沙箱无法进行端口监听；需要协调者在沙箱外运行隔离 fixture 的启动验收（health/edition、默认无外连、SMTP relay），此前错误为 `no free port block` / `listen EPERM`。不能用 live app 或用户数据替代。
- Windows `CRYBOT_BROWSER_ENGINE_URL` 与 ICNS 实机验证按决定保持现状。
- server 中仍存在部分旧 hosted/workspace 数据路径与历史业务分支；本轮删除了 broker/旧 CI 测试基础设施，但没有把所有 hosted/cloud 业务模块全部重写为纯自托管实现。前端云组件源文件仍有历史实现，尚未全部删除；这部分不能宣称已完全达到规格 §5 的“代码和界面入口一起删”。
- 本轮没有 git 提交；工作区保留全部改动供协调者复核。

# T-1207 第 4 轮追加

本轮尚未达到整体验收：第 2 条托管客户端的完整删除未完成，不能把这次工作认定为 §5 已完成。下面区分实际改动、保留判断与未完成项；没有 git 提交。

## 逐项结果

1. **IPC 冲突已消除，但不是通过完整删除云账户实现。** `electron/main.mjs:2464` 与 `electron/preload.cjs:269` 将 companion 账户的通道分离为 `companion-account:*`，云账户仍使用 `account:*`。新增 `electron/ipc-channels.node-test.mjs:6`，以 TypeScript AST 扫描生产 `electron/*.mjs` 的 `ipcMain.handle/on`，展开字面量、已知 method 数组、元组循环和注册包装函数；`electron/ipc-channels.node-test.mjs:69` 断言通道无重复。新测试通过。`electron/preload.node-test.mjs:92` 同步通道断言。`electron/bridge-contract.json:6` 清除前轮已移除的云账户/购买/计划/组织、遥测等 bridge 的兼容契约；没有为这些接口重新加 stub。完整移除账户 IPC 仍属于第 2 条的欠项。

2. **部分删除，未完成。** 已删除 `server/tunnel.ts`、`server/tunnel.test.ts`，移除 CLI 的托管隧道、上游 login/logout 和账户恢复路径：`server/cli.ts:63`、`server/cli.ts:102`、`server/service-cli.ts:46`；`server/cli-phone-setup.ts:29` 仅保留 Tailscale 或用户提供的 HTTPS 入口。移除相关 CLI 测试中的托管用例，并让解析测试断言旧选项被拒绝。`Dockerfile:128` 后的 `cloud-home` 阶段整体删除，包括失效的 `deploy/fly/Caddyfile*` COPY。`server/phone-relay.ts:141` 不再依赖已删除的 tunnel 账户凭据；`server/phone-relay.e2e.test.ts:30` 改为通过同一个隔离 relay fixture 的 `/v1/relay-token` 获取凭据，不写 tunnel-account 文件。

   **仍未删除：** `electron/account.mjs`、`electron/cloud-buy.mjs`、`electron/cloud-plan-ipc.mjs`、`electron/cloud-rail.mjs`、`electron/cloud-trial-notice*`、`electron/account-service.mjs`、`electron/account-messages.mjs`、`electron/accounts-main.mjs`、`electron/control-client.mjs`，以及关联声明、测试、preload/UI/organization/accountRing/Team Cloud/cloud-home 实现。代表性入口仍在 `electron/main.mjs:798`、`:2486`、`:2604`、`:2634` 和 `server/index.ts:700`。`CRYBOT_CONTROL_PLANE_URL` 读取仍在 `electron/account-service.mjs:86`。这不是沙箱造成的删除阻塞，而是本轮没有完成对混合本地/托管依赖的拆分。曾尝试扩大依赖删除，但会连带删掉本地迁移、共享与窗口导航；已收回这些过宽改动。

   **保留判断：**
   - 原 `server/control-client.ts` 读取的是电脑控制权接口 `CRYBOT_CONTROL_URL/TOKEN`，保障用户接管屏幕时机器人停止操作，不是上游 control plane。保留实现及测试，更名为 `server/computer-control-client.ts:58`，更新 `mcp-bridge`、phone proxy、saved-steps 等导入。这一更名不计作删除托管客户端。
   - `electron/desktop-remote-client.mjs` 完整保留，未改动；本地 bot-box、本机电脑及用户自填远端服务器路径未作为托管模块删除。没有完成桌面实机启动/配对验证，不能宣称远程模式已通过运行时验收。
   - `cloud-sync-main`、`one-home`、`own-home-main`、`cloud-power`、`cloud-list` 同时参与本地/自填服务器共享、迁移或窗口行为；目前保留，不代表它们全部符合 §5，仍需抽出本地部分并删除托管分支。
   - `runOn: "cloud"` 暂保留。`server/routines.ts:46`、`server/index.ts:5983`、`:5993` 表明它选择 bot 的 Boat VM，`server/included-services.ts:84` 支持用户自己配置的 Boat API 和自己的密钥。因此它不是只能在上游托管账户中执行；本地运行的 server 也能调度自己的 Boat 服务。这里不是本机 Podman 执行，不把两者混称。与上游 included-service/Team Cloud 的剩余耦合仍属上述欠项。

3. **已改。** `server/credential-env.ts:45` 将 `CRYBOT_PHONE_RELAY_TOKEN`、broker token 纳入本进程运维密钥清除列表；`server/bot-box/box-check.ts:14` 增加 relay token；`electron/diagnostics.mjs:38` 同时覆盖 broker、relay、installation credential。`electron/diagnostics.test.mjs` 的漂移检查覆盖工作区和运维两类名单。新增 `server/credential-env.test.ts:10`，检查两种环境清除函数、大小写变体，并实际启动子进程读取环境文件，断言 relay/broker token 不存在。子进程输出写隔离临时文件，不通过受限的 stdout pipe。测试通过。

4. **已改。** 共用校验在 `server/optional-feed-url.ts:1`：HTTPS；HTTP 仅 localhost、127.0.0.1、[::1]；拒绝用户名密码。接入 `server/update-check.ts:89`、`server/announcements/feed.ts:77`、`server/model-manifest/manifest.ts:73`；三处 fetch 均为 `redirect: "error"`。`server/update-check.ts:115` 丢弃非 HTTPS 或不同源 releaseUrl。`src/lib/app-links.ts:37` 在 preload 调用和 `window.open` 前限定 http/https/mailto。测试见 `server/optional-feed-url.test.ts:10`、`src/lib/app-links.test.ts:6`，已通过。

5. **已改。** `shared/announcements.ts:77` 的图片校验显式接收 feed origin，不读取环境变量，仅接受同源 HTTPS 图片。`server/announcements/feed.ts:71` 计算并传入 origin，`:87` 也过滤缓存/内置卡片的外源图片；`server/routes/announcements.ts:13` 将 origin 交给前端，`src/lib/announcements.ts:48` 按相同来源解析。`scripts/check-announcements.mjs` 同步校验。`shared/announcements.test.ts`、`server/announcements/feed.test.ts` 覆盖异源主机/端口、凭据、缓存切换来源和内置图片，已通过。

6. **已改名字及测试域名。** 所列测试中的上游作者名改成 ada/owner，中性路径为 `/Users/ada/...`；修改包括 `companion/test/mdns.test.ts`、`server/comms.test.ts`、`server/message-file.test.ts`、`server/peer-*.test.ts`、`server/runtime/envelope.test.ts`、`src/components/ChatMarkdown.test.ts`、`src/lib/group-*.test.ts`。保留测试及 `electron/fixtures/home-window-world.mjs:5` 中的上游测试主机后缀改为 `.example.test`。`scripts/check-brand-residue.mjs:10` 将名字匹配放宽到完整作者名，原署名文件白名单保留。品牌扫描通过。部分名字替换涉及的集成测试没有在本沙箱跑通，见下文。

7. **已改。** `deploy/update.sh:42` 只保留一个 UPDATE_URL；`:161` 的 curl 使用 `--proto =https --proto-redir =https` 且不跟随重定向，wget 后备同样仅 HTTPS、零重定向；`:672` 不再对 404 重复请求同一地址，也删除不可达的 newest 分支。`deploy/README.md:1` 解释服务端 `{version, releaseUrl}` 与脚本 `{image, version}`，镜像示例使用脚本要求的 digest。`scripts/testing/deploy-update.test.ts` 更新隔离 fake curl fixture 和旧双 feed 断言，4 个直接相关用例通过；完整部署回滚套件未通过完整复验，不能报告全绿。

8. **已改。** `.github/workflows/ci.yml:5` 增加 `permissions: contents: read`，三项 actions 固定 commit SHA，行尾标注 checkout v4.2.2、pnpm/action-setup v4.1.0、setup-node v4.4.0。没有在 GitHub 实际触发 CI，也未联网复核这些 SHA。

9. **已改。** `server/phone-relay.ts:140` 的注释改为有效 `CRYBOT_PHONE_RELAY_URL` 才配置 relay，与当前逻辑一致。

10. **已改。** `server/index.ts:12985` 删除 `PASS !== PASS` 恒假分支。

## 验证结果与限制

- `PATH=/opt/node24/bin:$PATH pnpm typecheck`：通过（`/tmp/r4-typecheck-final2.log`，退出 0）。
- `PATH=/opt/node24/bin:$PATH pnpm lint`：通过（`/tmp/r4-lint-final2.log`，退出 0）。
- `node scripts/check-brand-residue.mjs`：8343 files checked，0 forbidden references；`git diff --check`、`bash -n deploy/update.sh` 通过。
- 用户指定的 `systemd-run --scope -q -p MemoryMax=4G -- ...` 无法连接 system scope bus，报 `Operation not permitted`。实际 vitest 使用 `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=768 pnpm vitest run <paths> --maxWorkers=2 --configLoader runner`；这不等价于已通过 systemd 4G scope 验收。`--configLoader runner` 用于避免在只读 node_modules 下生成配置缓存。
- 安全测试组：`server/optional-feed-url.test.ts`、`server/credential-env.test.ts`、`server/update-check.test.ts`、`server/announcements/feed.test.ts`、`server/model-manifest/manifest.test.ts`、`shared/announcements.test.ts`、`src/lib/app-links.test.ts`、`server/cli-phone-setup.test.ts`：8 文件、132 用例通过（`/tmp/r4-security-final.log`）。新增的真实子进程环境断言随后随下一组复验通过。
- 回归组：`server/credential-env.test.ts`、`server/optional-feeds.test.ts`、`scripts/check-announcements.test.mjs`、`electron/diagnostics.test.mjs`、`server/cli-relay.test.ts`、`server/cli-lifecycle.test.ts`、`server/cli-pair.test.ts`、`server/cli-setup.test.ts`、`src/lib/announcements.test.ts`：9 文件、195 用例通过（`/tmp/r4-regression-final.log`）。
- `server/cli.test.ts` 通过名称过滤运行纯解析、pairing block、onboarding mock、saved startup、endpoint identity 用例：28 通过，4 个未选；`server/computer-control-client.test.ts` 的 mock 请求用例 17 通过，4 个未选，包含监听端口的部分留待外部环境。
- `scripts/testing/deploy-update.test.ts` 名称过滤 `is valid bash|requests the configured feed once|rejects insecure feed`：4 通过、32 未选。全套初次暴露 fixture 镜像仓库与脚本白名单不符，已将 fixture 对齐为 `ghcr.io/crysound/crybot`；再次全套运行未结束，已中断，不计为通过。完整部署 fixture 套件还需复验。
- `node --test electron/ipc-channels.node-test.mjs electron/preload.node-test.mjs electron/preload-contract.node-test.mjs electron/remote-microphone-permission.node-test.mjs electron/remote-clipboard-permission.node-test.mjs`：5 文件全部通过（`/tmp/r4-node-tests-final.log`）。
- 扩大到本轮修改的 Electron node-test，加新 IPC 与 contract 测试：58 文件，40 通过、18 失败（`/tmp/r4-electron-affected.log`）。失败文件为 `app-permissions`、`cloud-buy`、`cloud-home`、`cloud-lending`、`cloud-rail`、`cloud-room`、`cloud-send`、`cloud-staging`、`cloud-sync-preload`、`desktop-prefs`、`device-link`、`environments`、`home-window`、`lent-folders`、`own-home-main`、`saved-server`、`two-places`、`use-my-mac`（均在 `electron/` 下，后缀 `.node-test.mjs`）。其中 cloud-home 已确认 `listen EPERM 127.0.0.1`；cloud-buy 缺失前轮移除的 bridge，app-permissions 的账户恢复源码断言与当前实现不符。不是把所有失败都归因于沙箱；托管功能欠项关联的测试也未全部清理完。
- `server/service-cli.test.ts`：普通 service 的 3 用例通过，Sentinel 的 3 用例失败。实际环境 `/tmp/.git` 存在且只读，Sentinel 按安全规则拒绝把输出写到 `/tmp` 下的仓库；未修改安全规则或测试去绕开它。协调者需在仓库外临时目录重跑。
- **待沙箱外隔离 fixture 复验：** `server/phone-relay.test.ts`、`server/phone-relay.e2e.test.ts`（更新后的真实 relay/token 流）、`server/cli.test.ts` 的 serve/lan/Caddy 集成用例、`server/cli-probe-env.test.ts`、`server/computer-control-client.test.ts` 的真实 HTTP 等待/超时用例，以及上述 Electron 监听端口用例。名字替换涉及的 `server/comms.test.ts`、`companion/test/mdns.test.ts` 和本轮修改的其他 `*.e2e.test.ts` 也需要协调者按原 fixture 跑；不能宣称全部受影响 vitest 已通过。
- **验收 grep 未通过：** `git grep -n 'CONTROL_PLANE_URL\|cloud-buy\|cloudBuy\|ensureCloudAccount' -- . ':!docs'` 仍有 3451 行、61 个文件命中，详见 `/tmp/r4-hosted-residue-final.log`。这是第 2 条未完成的直接证据。
- 仓库引用的 `docs/verification/README.md` 当前不存在；验证均使用测试自行创建的临时目录、mock 或隔离 fixture，没有对用户 live app/数据执行验证，没有成功完成真实服务启动验收。

补充名字替换回归结果：`server/peer-roster.test.ts`、`server/peer-provenance.test.ts`、`server/runtime/envelope.test.ts`、`src/lib/group-call.test.ts`、`src/lib/group-routing.test.ts`、`src/components/ChatMarkdown.test.ts`、`server/message-file.test.ts` 最终为 4 文件通过、3 文件失败，391 用例通过、4 失败（`/tmp/r4-neutral-tests-final.log`）。已将攻击字符串的名字统一为 Owner，与断言一致。剩余失败是 message-file 的 `mkfifo` 子进程报 EPERM；ChatMarkdown 的两个发布页面链接点击用例；envelope 对旧 Unicode 仿冒 marker 的一个用例。后两类不是端口限制，没有在本轮改动其产品实现，仍需处理。最终品牌扫描仍为 8343 文件、0 命中，diff whitespace 检查通过。


# T-1207 第 5 轮追加

本节合并被 OOM 中断的第 5 轮与本次续做。起点为 149 个已跟踪文件改动、3426 行新增和 16864 行删除；保留此前改动，没有 git 提交。**实现继续收敛，正式验收仍未完成：指定的 systemd scope 被沙箱拒绝，六项正式检查均未启动，不能宣称测试回绿或构建通过。**

## 逐项实现

1. **已改：删除托管购买及账户叶子。** `electron/main.mjs:94` 接入显式禁用状态，移除账户构造、账户存储、支付/试用通知、购买接线及 `account:*` handler。删除 `electron/account.mjs`、`cloud-buy.mjs`、`cloud-plan-ipc.mjs`、`cloud-trial-notice*`、`cloud-rail.mjs`、`cloud-team-plan.mjs` 及原有对应声明/测试；前端删除 `src/components/cloud-buy/`、`CloudAddDialog.tsx`、`CloudAccountSettings.tsx`、`src/lib/cloud-plan.ts` 及原有相关测试。删除 `src/cancel-plan-preview.tsx`。

   `electron/rail.mjs:72`、`:103` 保留本地工作区、手填服务器及共用的列表/导航行为，已删除购买状态转换、购买中工作区、购买完成通知和全部 `cloud-add:*` IPC。`src/lib/cloud-extra.ts:7` 仅保留本地工作区也使用的名称长度与颜色选择；`src/lib/cloud-look.ts:5` 保留颜色转换。`src/lib/cloud-status.ts:1` 保留现有状态/额度/通知组件使用的显示逻辑，已移除购买步骤、套餐卡片、结算等待与购买状态机。`src/components/cloud-parts.tsx:1` 仅留下仍有调用的界面部件。`electron/cloud-home.mjs:363` 保留迁移状态、手机目的地判定需要的 Team 套餐分类；没有保留新建的 `cloud-team-status` 复制模块。

   共用数据结构拆到 `electron/cloud-account-types.d.mts:1`、`electron/cloud-types.d.mts:1`、`electron/rail-types.d.mts:1`，并移除类型文件里对已删账户实现的函数/常量声明。`src/types/cry.d.ts:176` 改用 rail 类型，删除购买 bridge 声明。原有共用组件仍依赖的可选状态 bridge 类型暂留；对应账户/购买 preload 实现不存在。

2. **已改：关闭指定界面入口。** `src/components/AccountMenu.tsx:22` 不再提供账户列表或登录 sheet；`src/components/PlaceAddSheet.tsx:247` 只提供本地工作区和手填服务器；`src/components/settings/pages/PlacePages.tsx:1`、`src/components/lazy-screens.tsx:1` 移除云账户设置页的引用。`src/pair/PairPage.tsx:1` 保留当前服务器自己的配对登录，不提供购买与 Team Cloud 入口。`electron/accounts-main.mjs:14` 的账户 sheet 不再被提供，保留的请求返回 unavailable。

3. **已改：移除托管地址开关。** `electron/account-service.mjs:78` 的地址解析恒为空；删除默认地址常量和环境变量读取。`:289` 的健康探测、`:612`/`:630` 的 OTP、`:687` 的 retry、`:929` 的 sign-out、`:950` 的 restore 在没有 client 时直接返回不可用状态，不发请求。OTP 与 sign-out 的禁用路径不会因缺少 client 而抛错。`electron/companion-e2e-desktop.mjs:9` 同步说明托管服务已禁用；`electron/account-service.d.mts:1` 移除失效默认常量和旧 tunnel 注释。

4. **已改：主进程停止托管启动。** `electron/cloud-disabled.mjs:1` 是固定关闭状态和明确的方法集合，没有通用 Proxy 或账户存储。`electron/main.mjs:148` 不构造 Team join；`:741` 返回禁用状态，不初始化云账户；`:759` 不构造 organization 客户端；`:2467` 不构造 cloud sync；`:2838`、`:2863`、`:2867` 阻止 organization、cloud sync 和组织恢复启动。账户恢复不再注册等待定时器。`:2328` 保留的 organization/company-backups IPC 在授权检查后返回禁用状态，不执行原 handler。`:543`/`:629` 阻止旧托管凭据启动隧道；`:1631` 的旧云深链不能打开购买或登录页面。

   `electron/cloud-disabled.mjs:24`、`electron/main.mjs:1378` 将已保存、明确标记为托管的工作区从运行时列表排除，使菜单、选择器和工作区轮询都看不到它们；写入其他工作区变更时仍保存这些停用记录，不删除用户的旧配置。本地工作区和手填服务器继续走原共用模块。

5. **已改：清理专用 locale。** `src/locales/en.json:1` 及其他语言删除原购买/账户 UI 专用键；本次续做额外移除 73 个无剩余源码引用的键。使用仓库 `node scripts/generate-locale.mjs --record-hashes` 重新生成 `src/locales/source-hashes.json:1`，没有手工编辑哈希。最终 `--check` 通过，16 种语言、10559 条英文源文案。日志 `/tmp/r6-locale-hashes.log`、`/tmp/r6-locale-hashes-final.log`、`/tmp/r6-locale-check.log`。

6. **已改代码与回归覆盖，尚未运行测试确认：第 4 轮两个新增失败。** `electron/preload.cjs:78` 将共用迁移 bridge `cloudSendPage` 恢复到远端页面白名单，保留主进程 sender 检查及用户手势限制；对应原测试仍在 `electron/cloud-send.node-test.mjs:247`，没有放宽断言。原 `home-window.node-test.mjs` 随上一阶段清理删除后，将指定的 401/配对回归完整提取到 `electron/home-navigation.node-test.mjs:5`，URL 断言使用 fixture 的实际 TEAM 域名和精确 pairing code，保留第二次配对次数等断言。

   新增 `electron/hosted-disabled.node-test.mjs:25`，以隔离的内存 store、IPC map、VM 和 fake account 依赖覆盖不可用账户、禁用客户端初始化、organization/backup IPC、保留本地/服务器 rail、无购买 IPC、旧托管工作区隐藏但保留磁盘记录。`electron/cloud-entry.node-test.mjs:142` 检查禁用深链没有窗口或客户端依赖。以上用例尚未执行，不能将其记为通过。

7. **已改并静态检查：指定残留为零。** `git grep -n 'CONTROL_PLANE_URL\|cloud-buy\|cloudBuy\|ensureCloudAccount' -- . ':!docs'` 无命中（grep 退出 1 表示零匹配），`/tmp/r6-hosted-residue.log` 为空。对被删除模块的导入和已删除类型/购买函数名补查无命中，见 `/tmp/r6-deleted-references.log`。

## 正式验收与环境阻塞

本轮所有正式重命令都严格串行，统一使用 `systemd-run --scope -q -p MemoryMax=3G -- …`；没有并行跑 build、typecheck 或测试，也没有在 scope 失败后绕开它运行重命令。使用 `/opt/node24/bin`，Electron 指定 `--test-concurrency=2`，Vitest 指定 `--maxWorkers=2`。已执行尝试如下：

| 检查 | 结果 | 日志 |
| --- | --- | --- |
| `pnpm typecheck` | scope 启动失败，未执行编译 | `/tmp/r6-typecheck.log` |
| `pnpm lint` | scope 启动失败，未执行 lint | `/tmp/r6-lint.log` |
| `node scripts/check-brand-residue.mjs` | scope 启动失败，未执行品牌扫描 | `/tmp/r6-brand.log` |
| `node --test --test-concurrency=2 electron/*.node-test.mjs` | scope 启动失败，未执行任何测试文件 | `/tmp/r6-electron.log` |
| `pnpm vitest run <25 个受影响文件> --maxWorkers=2 --configLoader runner` | scope 启动失败，未执行任何测试文件 | `/tmp/r6-vitest.log` |
| `pnpm build` | scope 启动失败，未执行构建 | `/tmp/r6-build.log` |

六项均退出 1，原因完全相同：`Failed to connect to system scope bus via local transport: Operation not permitted`。最小 `systemd-run … true` 同样失败（`/tmp/r6-scope.log`）。可复跑的完整命令按顺序记录在 `/tmp/r6-checks.sh`，25 个 Vitest 路径在 `/tmp/r6-vitest-paths.txt`，汇总在 `/tmp/r6-check-status.log`。这些错误发生在测试进程启动之前，因此**本轮没有可逐文件归因的 listen/mkfifo 失败，也没有单文件通过证据**；不得用上一轮日志冒充本轮全套结果。协调者需要在允许 system scope 的环境执行上述命令。

已完成的轻量静态检查：`git diff --check`；`node --check` 检查 main/preload/rail/disabled adapter 语法；修改文件的 TypeScript AST 语法、导入存在性、明显未绑定引用检查；locale generator 的 `--check`。静态审计日志 `/tmp/r6-static-audit-final.log` 为空。这些都不替代 typecheck、lint 或运行时测试。

`docs/verification/README.md` 仍不存在。本轮未启动真实应用或服务器，没有对用户 live app/数据验证变更。新测试使用隔离 fake/内存 fixture；完整 Electron 启动、本地及自填服务器运行时验收、默认无外连验收均待执行。此前已询问是否允许替代内存限制，未收到许可，未绕过指定 scope。

## 保留模块清单，供后续台账

- Electron 的混合本地/托管基础设施：`cloud-sync-*`、`cloud-sync.mjs`、`one-home*`、`own-home-main`、`home-window*`、`home-places`、`start-place`、`team-*`、`organization-*`、`org-library`、`cloud-send*`、`cloud-list`、`cloud-power`、`cloud-connections`、`cloud-logins`、`cloud-signin`、`cloud-space`、`rail-accounts`、`lending*`、`cloud-lending`、`lent-folders`、`server-lending`、`computer-sharing`、`two-places*`、`bot-move*`、`move-status`、`move-session`。
- 账户与组织外围：`account-service`、`account-messages`、`accounts-main`（禁用适配）、`accounts`、`cloud-accounts`、`account-places`、`control-client`、`managed-desktop`、`managed-companion*`、`company-backup*`、`updates-consent`、`included-x`、`included-pages`、`companion-e2e*`。主进程关闭托管初始化；这些源文件的历史业务分支没有在本轮全部删除。
- 新提取的共用结构/适配：`electron/rail.mjs`、`rail-types.d.mts`、`cloud-account-types.d.mts`、`cloud-types.d.mts`、`cloud-disabled.mjs`；购买 IPC、账户客户端实现和购买状态机没有搬入这些模块。
- 前端仍保留的共用状态/历史界面：`CloudRoomCard`、`CloudUsageMeter`、`CloudCancelPlan`、`CloudTrialNotice`、`CloudTrialIntro`、`CloudNotice`、`ProIntroduction`、`cloud-welcome/`、`settings/plan-parts`、`src/lib/cloud-status.ts`、`cloud-extra.ts`、`cloud-look.ts`、`use-cloud-offer.ts`、手机配对/额度/迁移相关代码，以及 store 内未消费的旧购买 action。当前 preload 不提供云账户/套餐 bridge，已删除入口不会呈现这些托管购买流程；这些遗留源代码及可选类型需后续台账进一步收敛。
- 本地和自填远端的 `desktop-remote-client`、本机工作区、Tailscale/自填服务器连接实现保留。server 中已有的 hosted/workspace 分支未扩展删除，本轮没有宣称整个仓库已完成全部去云化。

## 尚未完成

正式 typecheck、lint、品牌扫描、完整 Electron、受影响 Vitest、build 全部待环境允许后复跑。第 4 轮两个新增失败已按原日志定位并补改，但未验证回绿；其他历史失败也尚未重新分类/修复到全绿。不能将本轮认定为已满足 r5.md 全部验收标准。工作区完整保留供续做，未提交。

# T-1207 第 7 轮

- 已改：删除 `src/components/HomeScreen.tsx` 的 `cloudAdd` 购买/checkout/payment 分支及对应入口；保留本地重试、登录、移除工作区。同步更新 HomeScreen 单元和 DOM 测试，理由是托管购买接线已删除。
- 已改：删除 `electron/main.mjs` 中未使用的 `updatesConsent` 与 `withEnvironmentLook`。它们是删托管功能后的残留。
- 已改：本地确认 IPC 不再被托管禁用判断影响；确认框继续要求本地主窗口精确主框架、默认 Cancel、仅显式 OK 成功、非法消息和关闭窗口 fail closed。
- 已改：备份 main fixture 补齐禁用状态依赖；安全边界测试继续覆盖子框架、其他窗口、远程主框架和缺失 frame。组织 reopen 测试改为断言托管 disabled，preload 不暴露已删除入口。
- 已改：托管 Cloud link 测试断言不会创建窗口或启动 client；该用例覆盖已删除接线。

本轮删/改用例及理由：Cloud 购买入口相关 HomeScreen checkout/payment/buy 测试改断言没有动作；organization:reopen 的托管客户端转发断言改为 disabled；hosted Cloud link 的旧启动断言改为 disabled。以上均为已删除托管接线。备份 IPC、确认框及本地主窗口边界用例均保留并修复 fixture/产品代码。

验证：相关 Electron 6 文件 6 个测试文件通过；`pnpm -s typecheck` 通过；`pnpm -s lint` 通过；`node scripts/check-brand-residue.mjs` 8082 files checked, 0 forbidden references。`pnpm -s build` 首次被共享只读 node_modules 的 Vite 缓存目录拒绝，随后改用 /tmp 可写依赖覆盖运行，构建进入 Vite 但在沙箱中长时间无输出，未能取得退出数字。Electron 全量仍在运行，结果写入 `/tmp/r7-electron-full.log`，完成后由协调者复核；基线新增名单中其余已有失败未处理。


# 第 8 轮

基于 HEAD `e15b15c` 修改；未提交。保留用户已有的 `r8.md`。

## 已改

1. **新手引导不再提供托管入口。** `src/lib/default-bot.ts:90`、`:103` 从两个类型和两个引导列表删除 cloud 项；`src/components/HelperSetup.tsx:14` 删除图标、标签、动作分支。`HelperIntro.test.ts:211` 覆盖本机新用户在 Simple / Advanced 两种模式下的实际渲染列表，均没有 Cloud 按钮。
2. **删除悬空状态和路由。** `src/state/store.tsx` 删除 cloudAdd 的状态、初值、打开/关闭 action 和 reducer；一并删除 cloudHowTo 的状态及 action。`src/App.tsx:118`、`:286`、`electron/preload.cjs:37`、`src/types/cry.d.ts` 删除 cloud-add / cloud-add-howto 路由和桥接类型。`src/components/AppNotices.tsx:119` 的 waits 不再依赖上述状态。`src/App.settings-links.test.ts:65` 断言真实 initialState 不含这两个字段；`AppNotices.test.ts:180` 验证没有托管桥接/状态时 Simple mode 能显示。
3. **清点其余入口并删除。** `PublishedPageCard.tsx`、`app/PageTools.tsx` 删除增加页数的购买按钮；`ProIntroduction.tsx` 删除购买/登录卡、行和比较入口，仅保留仍被共享组件使用的 useCloudPlan；`settings/plan-parts.tsx` 删除其比较行。`RoutineScheduleNote.tsx` 删除 add-cloud 分支，保留本地/服务器说明及已有目标打开前的确认。`AppNotices.tsx` 删除托管试用推广卡的入口、offer 请求及队列状态；`CloudHowTo.tsx` 整个删除，Sidebar、SidebarFooter、sidebar-state、DesktopWorkspaceSwitcher 同步删除引导接线。主进程删除同名托管添加空函数及 rail 回调中的调用，不补空桥。
4. **清理专用文案。** 各 locale 删除 cloudHowTo 的 4 个键、两个 helperIntro Cloud 按钮键、routines.scheduleNote.addCloud；使用 `node scripts/generate-locale.mjs --record-hashes` 更新 hashes：补录 0、删除 94 条。`settings/closed-scale.test.ts` 删除已消失的 Pro UI 对应样式债务计数。
5. **主进程两个小修。** `electron/main.mjs:2315`、`:2316` 的 request-code / verify-code 返回 `hostedDisabledState`，形状为 `{ available: false, status: "unavailable", message: "disabled" }`；`:2446` 的账户切换改为 `accountRing()?.switchTo(id)`。

## 恢复的测试

三个文件均先通过 `git show d383696:<路径>` 原样取回，再做下述调整；没有跳过用例。

| 文件 | 基线顶层用例 | 本轮顶层用例 | 最终结果 |
| --- | ---: | ---: | --- |
| `electron/app-permissions.node-test.mjs` | 34 | 34 | 34 通过 |
| `electron/updates-consent.node-test.mjs` | 26 | 26 | 26 通过；展开嵌套子用例共 53 通过 |
| `src/components/AppNotices.test.ts` | 85 | 63 | 保留 61、删除 24 个已下线托管推广用例、新增 2；63 全通过 |

- app-permissions 的本地/远程权限、外链、剪贴板、通知、发送方和 fail-closed 断言均保留。依赖旧 account 客户端的 fixture 改为文件内的账户状态 fixture；仍由真实 appPermissionHandlers、myCloudOrigin、rememberedCloudHome 决定权限，不在 fixture 里返回权限结论。
- updates-consent 的 **26 个测试体和原断言全部保留**。只替换 world fixture：删除已移除的账户客户端与其 OTP/HTTP 接线，用隔离内存 transport 模拟账户状态、回执、错误和暂停/释放响应。真实 createUpdatesConsent / desktop-prefs / IPC 注册仍被执行；“不可用时什么都不问不发”和发送方拒绝边界原样保留，无网络或真实用户数据依赖。
- AppNotices 改用 `cloud-account-types` 类型。真实 preload、desktop-prefs、updates-consent 仍参与测试；已移除的桥接仅在测试 fixture 内按 local/cloud/server 页面模拟。默认无外部公告；需要公告的用例注入隔离 feed。所有 bot 移动用例原样保留，特别是确认后才移动、Cancel 不动、Escape 不动；未改其断言。
- 本轮给出的基线 app-permissions 为 33/34 通过，原失败名为 **the app installs these handlers, with its one rule for My Cloud and a wait for the saved sign-in**。该用例包含的权限接线断言仍保留，只将托管启动断言改为当前 disabled 生命周期，本轮通过。没有声称在沙箱内重跑了整套历史基线。

## Electron 用例的逐条变更

1. **the app installs these handlers, with its one rule for My Cloud and a wait for the saved sign-in** → **the app installs these handlers with its one origin rule and hosted sign-in disabled**：保留 permission handlers、IPC、origin、恢复等待等全部安全接线断言；仅替换“启动已删除账户客户端”的断言，要求启动 promise 为已完成状态。主进程不初始化托管客户端另由既有 hosted-disabled 测试覆盖。
2. **after the sign-in has ended or expired, the same account's Cloud keeps the microphone until sign-out**：仅移除已删除账户模块的 `cloudPlanSnapshot(...).status === "signin"` 套餐展示断言；失效、过期、退出前后的所有麦克风/账户状态断言不变。

其他 32 个 app-permissions 测试体和所有 updates-consent 测试体未修改；0 个 Electron 用例删除。

## AppNotices 删除用例逐条说明

以下均针对已删除的托管试用推广卡或托管 Cloud/Team What's new 营销弹窗，不是本地 bot 移动、通知发送方或权限边界。通用通知互斥、首轮安静期、关闭持久化仍由保留的 Grok/Simple/公告用例覆盖。

1. **offers the free trial to someone signed out who has used the app before, in the Admin's numbers, with Start free trial and Show me how**：托管试用 offer、价格和 Start free trial 入口已删除。
2. **needs a trial: without one it waits (the star may show), and without money-back from the Admin it says none**：托管试用/退款展示条件已删除。
3. **never to someone new this launch, who pays or may pay, on a branded build, or a desktop signed in with an organization**：已删除托管推广卡的受众筛选。
4. **Start free trial opens the Add a Cloud dialog from the card, and the card is done for good**：目标 Add a Cloud 弹窗及动作已删除。
5. **Show me how starts the one-step tip; Not now, the X and Escape end it for good, then say where Add a Cloud lives**：托管购买引导和购买位置 toast 已删除。
6. **Sign in to your Cloud plan opens the sheet at its own sign-in and only hides the card for now**：已删除托管账户登录入口。
7. **shows on at most three days, or one for someone who closed the earlier Pro card**：已删除托管试用推广卡的展示频次。
8. **never after the welcome's Cloud step, which was this desktop's Cloud offer however it was answered**：已删除托管 Cloud onboarding offer 及后续推广卡。
9. **never over setup, a dialog, the Add a Cloud dialog or its tip, busy work, or an update being offered**：已删除托管试用卡及其购买弹窗/引导的互斥；本地提示互斥用例仍保留。
10. **no Cloud plan: once, before every other card, a modal with the new Cloud then Team in the Admin's numbers; Get Pro opens Add a Cloud with its tag**：已删除托管 Cloud/Team 购买营销弹窗及 Get Pro 入口。
11. **Next shows the Team slide, Back the new Cloud again, each step counted**：已删除托管营销弹窗的 Cloud/Team 两张幻灯片。
12. **See the new Cloud and Start a Team open the Cloud website with their slide's tag, and end it for good**：已删除托管购买网站 CTA。
13. **a Cloud plan of one's own, in no team: the Team slide alone**：已删除根据托管订阅展示 Team 幻灯片的逻辑。
14. **nothing for anyone in a team, owner or member, nor while a payment is linked or needs attention or a checkout is open; the cards after it show**：已删除托管团队、支付、checkout 对购买营销弹窗的筛选。
15. **a slide the Admin doesn't sell is left out; neither sold, or the Cloud unreachable, waits for a later launch and lets the other cards show**：已删除根据 Admin 销售套餐决定营销幻灯片的逻辑。
16. **one promo a launch: What's new first; Boat's credit offer waits for the next launch, a reload in this one included**：已删除托管购买营销弹窗及内置 Boat 推广；本地通知排序另有保留用例。
17. **a new install sees it once onboarding is done and a bot has answered, in a later launch than the welcome's, after CryBot's card**：已删除托管 Cloud 营销活动的首次展示规则；本地首轮/首答门槛仍有覆盖。
18. **claims the launch for the popups, so CryBot's card waits for a later one**：已删除托管 Cloud 营销弹窗的 launch 占位；保留本地 Grok/Simple 占位用例。
19. **never during a bot's turn, a room's work, another dialog, a call, Settings, adding a Cloud or an update; it waits and comes back**：已删除托管 Cloud 营销弹窗及购买状态；保留 Simple/Grok 的忙碌、设置、通话、其他弹窗互斥用例。
20. **Not now, the X, Escape and a click outside end it for good on this computer and in the workspace**：已删除托管 Cloud 营销弹窗的关闭持久化；保留本地 Grok 的 Not now/X/Escape 和公告关闭持久化。
21. **closed on another port or in another browser on this workspace, it stays closed; the desktop learns an earlier close**：已删除托管营销 campaign 的跨端关闭记录；保留本地通知的 desktop/workspace/browser 记录测试。
22. **a first run on this computer leaves it for a later launch: everyone who installs sees it once**：已删除托管营销 campaign 的首次安装推迟逻辑；保留本地 Simple 首次启动安静期。
23. **a new campaign id shows it once more to someone who closed an earlier one**：已删除托管套餐营销 campaign 切换；保留公告按 id 去重的用例。
24. **never in a remote client's window, on My Cloud's or a saved server's page, on a branded build, a desktop an organization runs, or one that sells no Cloud**：已删除托管购买营销活动的页面/组织/套餐受众筛选。

## AppNotices 保留用例的适配（逐条）

以下改动均保留本地行为断言，替换已删除的推广依赖或同步品牌文字：

1. **an ended sign-in on a paid plan asks to sign in again; the star comes last and is for good**：账户重新登录断言保留；已删除的评分卡改为本地公告，仍验证后续提示及关闭后的持久化。
2. **comes after What's new, never with it, and right after it closes; No thanks is kept and it is never asked again**：前置弹窗改为现存 Simple mode，点击 Done；同意问题的显示、拒绝后持久化、不发送邮件等断言保留。
3. **waits for a new install's first reply and for a launch after the one whose welcome finished, then keeps its place after What's new**：前置托管营销弹窗换为 Simple mode；仍覆盖首次回复和跨 launch 门槛及关闭后提问。
4. **the page never asks main for one, whatever an older main would answer, and the cards go on as before**：评分卡换为本地公告；仍断言本机和远程页面都不请求旧 Use my Mac 桥接。
5. **is one popup at a time: it comes before What's new, which waits for a later launch**：后续托管营销弹窗换为本地公告；验证 Simple 关闭前不共显、关闭后公告按当前 FOLLOWERS 规则显示、后续 launch 不重现 Simple。
6. **follows the built-in sponsor card in its launch once that closes, never beside it**：已删除内置 sponsor 换为本地 Simple 弹窗；仍验证公告不并排、关闭后显示、前置提示保有 launch 标记。
7. **follows a closed What's new in the same launch, then no other remote card that launch**：前置托管营销弹窗换为 Simple mode；保留同次 launch 只显示一条远程公告、重载不越过限制、下一 launch 显示下一条的断言。
8. **a card left up keeps the corner: a card that arrives meanwhile waits for it to close**：已删除评分卡换为现存手机更新提示；保留新公告到达时不能抢占角落、关闭原提示后才显示的断言。
9. **shows once this computer's link ended and a paired phone has an older app: the phone, what to do, Open Phone & devices and Not now**：静态品牌文案 CryBot 改为 Cry Bot；设备、入口、launch 标记断言不变。
10. **names how many phones when more than one has an older app**：仅同步 Cry Bot 文案。
11. **shows on a branded build too, as Settings → Phone & devices explains it there**：共享 TITLE 常量同步 Cry Bot，品牌构建仍显示提示的断言不变。
12. **is a notice to act on: ahead of the sponsor's card, which follows once it is closed, and behind the Grok Bot popup**：已删除内置 sponsor 换为本地公告；保留手机提示先于公告、晚于 Grok 的排序断言。
13. **waits while it can't tell yet, and over a live call**：后续内置 sponsor 换为本地公告 fixture，TITLE 同步品牌；仍检查设备查询未完成和 live call 时不显示。

新增 2 条：**shows Simple mode for a local user without a hosted entry or modal state**；**never offers a hosted trial even if an older desktop supplies an account bridge**。分别覆盖无托管状态时本地提示可显示，以及旧桥存在也不能复活托管试用入口。

## 其他相关测试适配

- `src/components/HelperIntro.test.ts` — **draws its lines and follow-up as the chat's own bubbles, with chips for only what is missing**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **shows three chips at most, AI first, and one tapped makes room for the next**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **counts Try Cloud as the first run's Cloud moment, then opens Add a Cloud** → **a local new user has no hosted Cloud entry in either onboarding list**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **opens the app's own flow for each chip**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **arrives part by part: three lines, the bot typing, its follow-up (written once by the server), then the chips**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **shows everything at once with reduced motion, and says what it saw itself when the server can't save it**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **is the one bubble it always was: who it is, the setup still to do, and asks**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/components/HelperIntro.test.ts` — **opens the app's own flow for each setup step**：删除 Cloud 按钮/派发期望，其他本地引导断言保留；其中旧 Try Cloud 用例改为双模式无托管入口的渲染回归。
- `src/lib/default-bot.test.ts` — **in Advanced mode, as on a new install before: an AI, bots, apps, the phone and the Cloud**：列表期望删除 cloud，保留 AI、app、phone、import 等条件。
- `src/lib/default-bot.test.ts` — **in Simple mode, chips for only what its look around found missing, in order: AI, apps, skills, phone, Cloud**：列表期望删除 cloud，保留 AI、app、phone、import 等条件。
- `src/components/PublishedPageCard.test.ts` — **at the free limit, says so in the person's words and opens the app's Get Cloud flow** → **at the free limit, explains usage without a hosted purchase entry even with an old bridge**：购买入口断言改为即使旧 bridge 存在也无按钮、不派发；使用当前 Cry Bot 文案。
- `src/components/RoutineScheduleNote.test.ts` — **My Cloud runs it 24/7; another server, a browser or companion mode while that server runs**：移除购买入口和 offersAllowed 参数，保留已有目标及本地/服务器行为断言。
- `src/components/RoutineScheduleNote.test.ts` — **This computer: Add a Cloud for someone who may buy where it is offered, Open the Cloud once it is ready, else the note alone** → **This computer: never offers a hosted purchase; an existing ready Cloud can still be opened**：移除购买入口和 offersAllowed 参数，保留已有目标及本地/服务器行为断言。
- `src/components/DesktopWorkspaceSwitcher.test.ts` — **is the Show me how tip's anchor, and opens the menu as reached from the tip only while the tip is up** → **keeps the server switcher available in every sidebar layout**：已删除 how-to 接线，保留各 sidebar 布局下的服务器切换器断言。
- `src/components/onboarding/WelcomeFlow.test.ts` — **is two screens with an AI already working: Next, then Create, and it lands in the Chief's chat**：仅将 Meet CryBot / shared CryBot 的旧文案期望同步为 Cry Bot。
- `src/components/onboarding/WelcomeFlow.test.ts` — **keeps the screen's shape: the pill signs in, and the line under it offers other ways or later**：仅将 Meet CryBot / shared CryBot 的旧文案期望同步为 Cry Bot。
- `src/components/onboarding/WelcomeFlow.test.ts` — **opens every other way in the Connect an AI dialog, where OpenCode's free model is only a backup**：仅将 Meet CryBot / shared CryBot 的旧文案期望同步为 Cry Bot。
- `src/components/onboarding/WelcomeFlow.test.ts` — **moves on with Escape, and Enter presses the pill, never past an AI still to connect**：仅将 Meet CryBot / shared CryBot 的旧文案期望同步为 Cry Bot。
- `src/components/onboarding/WelcomeFlow.test.ts` — **gives a hosted place's admin the first screen only, then the chat**：仅将 Meet CryBot / shared CryBot 的旧文案期望同步为 Cry Bot。

- `PublishedPageCard.test.ts` 的共享 URL fixture 改为 `https://abcdefghijklmnopqrstuvwxyz.crybot.page/`：原 `server.example.test` 不满足现存 `isPublishedPageUrl` 合约，无法测试浏览器面板打开；保留原来的面板、外链、无消息派发断言。
- `onboarding/WelcomeFlow.test.ts` 删除共享 fixture 的 cloudAdd 字段，16 条用例全部保留；5 个旧品牌文字失败已同步期望，没有改产品逻辑。
- `App.settings-links.test.ts` 新增 **the local store has no hosted modal state**，原设置/手机深链接用例保留。
- `settings/closed-scale.test.ts` 仅删除已移除 Pro UI 对应的样式债务条目，不删除用例。
- 删除 `CloudHowTo.test.ts` 的 3 个用例，因专用托管购买指引组件已删除：**finds the menu button on screen, below it in a full sidebar and beside it in the icons-only one**（仅该指引使用的定位函数）；**one step on the menu that keeps Add a Cloud, with Skip; nothing when not asked for**（已删除购买引导）；**with the menu off screen, the dialog opens instead and says where the menu is for next time**（已删除购买弹窗回退入口）。服务器切换器本身的布局和本地/远程显示用例仍在。

## 验证

所有重命令串行执行，未用 systemd-run；未跑 build、全量 vitest 或全量 Electron。日志写入 `/tmp`，只读取摘要和匹配行。TypeScript 堆上限 3072 MiB，vitest 每 worker 堆上限 2048 MiB、最多 2 workers。

- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm -s typecheck`：退出 0，`/tmp/r8-typecheck-final.log`。
- 同样环境下 `pnpm -s lint`：退出 0，`/tmp/r8-lint.log`。
- 用户指定的 `node --test --test-concurrency=2 electron/app-permissions.node-test.mjs electron/updates-consent.node-test.mjs`：退出 0，两文件通过，`/tmp/r8-node-final.log`。当前进程隔离模式的摘要仅输出文件数，因此另以 Node 24 `--test-isolation=none` 展开计数：**87 通过、0 失败、0 skip**，`/tmp/r8-node-cases.log`（34 权限 + 53 更新同意，后者含子用例）。
- 定向 vitest：**9 文件、208 用例全部通过**，`/tmp/r8-vitest-final.log`。文件为 AppNotices、HelperIntro、default-bot、PublishedPageCard、RoutineScheduleNote、App.settings-links、DesktopWorkspaceSwitcher、settings/closed-scale、onboarding/WelcomeFlow。命令为 `pnpm exec vitest run <上述路径> --maxWorkers=2 --configLoader runner`；runner 避免向只读 node_modules 写配置缓存。
- 额外 preload/托管关闭回归：`node --test --test-concurrency=2 electron/hosted-disabled.node-test.mjs electron/preload.node-test.mjs electron/preload-contract.node-test.mjs` 退出 0，三文件通过，`/tmp/r8-preload-final.log`。首次非隔离合跑因两份 preload fixture 共用 require cache 导致 13 个失败；改回测试原本要求的进程隔离后全过，没有改测试或放宽断言。
- `docs/verification/README.md` 在当前 checkout 和 d383696 中均不存在。本轮使用隔离的内存/DOM/VM fixture，不连接用户实时应用或数据；未作服务端/真实会话端到端验收声明。
- 最终品牌扫描、要求的 git grep 和 diff 检查结果见下方最终扫描记录。

最终扫描记录：`node scripts/check-brand-residue.mjs` 检查 **8299 files，0 forbidden references**（`/tmp/r8-brand.log`）；指定 `git grep 'CONTROL_PLANE_URL\|cloud-buy\|cloudBuy\|ensureCloudAccount\|openCloudAdd' -- . ':!docs'` **零命中**（退出 1，`/tmp/r8-residue.log` 空）。另检查尚未跟踪的三个恢复测试文件，同样零命中。`git diff --check` 通过。

## 第 9 轮

本轮继续保留第 8 轮工作树改动，未提交。

### 改动

1. 清理测试样例中的上游人名：代码和测试范围内统一为中性名字，并修正房主路径大小写测试，使 Linux 的大小写不匹配和 Windows 的大小写不敏感语义保持原意；修复 `server/recall.test.ts`、`server/host/room-sessions.test.ts` 的前后断言一致性。
2. 修复 `companion/test/devices.test.ts` 的 Bearer 输入，将残留的 `omb_abc` 改为 `cry_abc`，并确认测试中没有 `omb_` 输入配 `cry_` 期望的同类项。
3. 收紧中继主机校验：三端采用相同的完整域名规则，拒绝 `localhost`、单段主机名、IPv4/IPv6 及 IP 样式写法；各端测试覆盖拒绝项和 `relay.example.com` 通过项。Electron 和 companion 产物各自内置规则，避免自包含发布包跨目录加载顶层模块。
4. npm 安装类型不再生成安装命令；更新检查结果仅保留 feed 提供的发布页链接，更新测试同步调整。

### 验证

- `pnpm vitest run shared/pairing-link.test.ts --maxWorkers=2 --configLoader runner`：14/14 通过。
- `pnpm vitest run companion/test/e2e/credentials.test.ts companion/test/devices.test.ts --maxWorkers=2 --configLoader runner`：41/41 通过。
- `pnpm vitest run electron/companion-e2e.test.mjs --maxWorkers=2 --configLoader runner`：9/9 通过。
- `pnpm vitest run server/host/room-sessions.test.ts server/recall.test.ts --maxWorkers=2 --configLoader runner`：134/134 通过。
- `pnpm vitest run server/safety-floor.test.ts --maxWorkers=2 --configLoader runner`：508/508 通过。
- `pnpm vitest run server/update-check.test.ts --maxWorkers=2 --configLoader runner`：10/10 通过。
- `pnpm vitest run server/server-update.test.ts --maxWorkers=2 --configLoader runner`：17/17 通过。
- `pnpm vitest run server/connected-reads.test.ts server/host/room-transcript.test.ts --maxWorkers=2 --configLoader runner`：17/17 通过。
- `pnpm vitest run src/components/BotSettingsDialog.simple.test.ts -t "keeps the bot's own private folder" --maxWorkers=2 --configLoader runner`：1/1 通过。
- `BotSettingsDialog.simple.test.ts` 全文件另有既有的 Cursor body 断言失败，与本轮路径样例改动无关；本轮相关 folder 用例单独通过。
- `pnpm typecheck`：通过；`pnpm lint`：通过；`git diff --check`：通过。
- `node scripts/check-brand-residue.mjs`：8298 个文件，0 条残留。
- 按指定排除范围执行人名残留扫描：无命中；测试中 `omb_` 输入配 `cry_` 期望的复查：无命中。
- `server/webhook-room-post.e2e.test.ts` 使用隔离启动 fixture 时受沙箱端口块限制（`no free port block`），未把该环境阻塞误报为代码通过或失败。

## 第 10 轮

### 改动

- 三份中继主机校验统一拒绝最后标签为纯数字或 `0x` 十六进制、`localhost` 及其子域名；保留完整多标签 DNS 名称，并覆盖大小写和尾点形式。
- shared 测试新增同一组样例对 shared、companion、Electron 三份实现的结果一致性回归；三处实现测试均补齐简写 IP、localhost 变体及两个合法域名样例。
- `companion/test/devices.test.ts` 的无效 Bearer 样例改为 `Bearercry_abc`。

### 验证

- `pnpm vitest run shared/pairing-link.test.ts --maxWorkers=2 --configLoader runner`：15/15 通过。
- `pnpm vitest run companion/test/e2e/credentials.test.ts --maxWorkers=2 --configLoader runner`：9/9 通过。
- `pnpm vitest run companion/test/devices.test.ts --maxWorkers=2 --configLoader runner`：32/32 通过。
- `pnpm vitest run electron/companion-e2e.test.mjs --maxWorkers=2 --configLoader runner`：9/9 通过。
- `pnpm typecheck`、`pnpm lint`、`node scripts/check-brand-residue.mjs`（8299 个文件，0 残留）和 `git diff --check`：通过。
- 未访问用户 live app 或数据；未提交 git commit。
