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
