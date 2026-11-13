# T-1207 Cry Bot 整体改名、删 enterprise、换品牌和吉祥物、去掉上游服务

## 目标
本仓库是 CryBot v0.1.155(Apache-2.0)的快照。做完后，界面、命令、环境变量、数据目录、协议标识、图标、吉祥物里都看不到上游品牌；产品不再访问任何上游服务；仓库里有残留检查脚本，跑一遍返回 0。

## 背景
- 执行规格：`docs/specs/2026-11-13-crybot.md`。**先完整读一遍**，本任务做规格第 2、3、4、5 节(第 5 节里「桌面自动更新」那段留给 T-1208，不做)和第 8 节的残留检查脚本。规格和本说明冲突时以规格为准，在汇报里指出。
- 品牌素材在 `brand/`(`B.svg` 大图标、`B-16.svg` 小图标、已渲染的 `icon-macos.png`(1024)、`icon-windows.ico`、`tray-windows.ico`、`icon-512.png`、`icon-maskable-512.png`、参考生成脚本 `gen.mjs`、`README.md`)。
- 改名面很大(不计 docs/ 约 3000 个文件、2.7 万处；441 个 `CRYBOT_*` 环境变量，另有 `CRYBOT_*`、`CRYBOT_*`；17 种 locale)。建议先写一次性改名脚本放 `/tmp`(不进仓库)，按规格第 2 节的映射表逐条替换(注意大小写和整词)，再手工处理脚本处理不了的地方，最后用残留脚本收尾。文件名、目录名里的上游名也要改(`git mv` 不可用就直接改名，不提交)。
- 持久化和协议标识(规格第 2 节表里那些)要一起改，不留兼容代码。
- 已知位置(行号以上游提交 8b17baf 为准，仅供参考)：
  - enterprise 引用：`server/enterprise.ts`、`server/brand.ts:8`、`vite.config.ts:41`、`tsconfig.server.json:27`、`scripts/bundle-server.mjs`、`scripts/build-npm-package.mjs`、`scripts/smoke-packaged-server.mjs`、`.github/workflows/` 下 docker/ci/npm-package、`CODEOWNERS`。删掉后 `/api/edition` 恒为开源版。
  - 上游服务：遥测 SDK `src/lib/analytics.ts`；公告 `shared/announcements.ts`；模型清单 `server/model-manifest/manifest.ts`；models.dev `server/model-catalog/catalog.ts`(保留，遵守 `CRYBOT_DISABLE_MODEL_CATALOG_FETCH`)；更新检查 `server/update-check.ts`、`server/server-update.ts`、`deploy/update.sh`、`deploy/install.sh`；错误报告上传 `server/devs-report-send.ts`(及每小时轮询)；云账户/支付 `electron/cloud-account.mjs`；accounts/control-plane `electron/companion-account-service.mjs`、`electron/control-plane-client.mjs`、`electron/desktop-companion-client.mjs`；admin 链接 `src/lib/onboarding.ts`、`OrganizationSettings.tsx`；外链 `src/lib/app-links.ts`；手机中继 `server/phone-relay.ts`；Composio `electron/managed-composio.mjs`、`server/composio-project.ts`；团队库 `server/team-library.ts`；bot 目录 `server/bot-directory.ts`；推广 `shared/modelgo.ts`、`server/x-research.ts`、`XCard.tsx`、`widget-samples.ts`；`connector/install.sh`；`cloudflare/control-plane`、`cloudflare/composio-broker` 整个删。
  - 吉祥物：`shared/mascot-bodies.ts` 由 `scripts/gen-mascot-bodies.ts` 生成；body id 有 cursor(默认，鼠标/光标形状，要删)、blob、circle、squircle、capsule、drop、shield、hexagon、diamond、star。名字表 `src/lib/mascot-names.ts`。
  - locale：改完用 `scripts/generate-locale.mjs` 重新生成 hash 文件。
  - `docs/` 下上游截图和文档(约 157MB)与本产品无关：除 `docs/specs/`、`docs/tasks/` 外，`docs/` 里上游的文档、截图整体删除；`apps/docs` 若是上游文档站也删除，并去掉对它的引用。

## 要做的事
1. 按规格第 2 节改名(代码、配置、文档、测试、文件名)。显示名用 `Cry Bot`，标识符用 `CryBot` / `crybot` / `CRYBOT_` / `cry_` / `cry-`。上游域名不改成 crybot 的仿冒域名，而是按规格第 5 节删除或改成可配置、默认关闭。
2. 删除 `enterprise/` 及全部引用；删除依赖 enterprise 的 whitelabel/brand.json 加载；edition 恒为开源。
3. 许可文件按规格第 3 节：`LICENSE` 不动；`NOTICE` 开头加规格给的那段；新增 `CHANGES.md`；重写 `LICENSING.md`；`third_party/` 和第三方归属头一律不动。
4. 图标：用 `brand/` 的素材替换 `build/` 下所有图标(png/svg/icns/ico/iconset)、`public/` 下 app-icon、apple-touch-icon、PWA manifest 图标、favicon、托盘图标；dmg 背景图如有旧吉祥物或旧名字也换掉(可改成纯色渐变)。缺的尺寸从 `brand/` 的 svg 渲染(仓库已有的依赖里能渲染就用；没有可用的渲染工具时，在汇报里列出缺哪些文件、需要什么尺寸，协调者来生成)。`.icns` 没法在 Linux 生成时，在汇报里说明，协调者在 macOS CI 里生成。
5. 吉祥物：新增 dome body(和 `brand/B.svg` 里的白色圆顶脸同形，眼睛用现有表情系统)，设为默认；删掉 cursor body 及所有画鼠标/光标形吉祥物的地方；保留其他 body；未知或已删的 body id 回退到默认(已有回退逻辑，确认它对 cursor 生效)。名字表里不能有上游品牌词。改 `scripts/gen-mascot-bodies.ts` 后重新生成 `shared/mascot-bodies.ts`。
6. 规格第 5 节的「完全删除」清单：代码和界面入口一起删。「可配置、默认关」清单：用规格给的环境变量名，未设置就完全不发请求。
7. 新增 `scripts/check-brand-residue.mjs`(规格第 8 节)，`package.json` 加脚本 `check:brand`，并接进仓库 CI(`.github/workflows/` 里保留的 CI 只做 lint/typecheck/测试/残留检查；上游的发布、docker 推送、npm 发布 workflow 删掉，桌面打包发布交给私有部署仓库)。
8. 规格第 5 节最后一条：仓库里不能出现内部主机名、IP、邮箱、人名(上游作者署名只允许出现在 NOTICE/CHANGES.md/LICENSING.md 和 third_party)。`package.json` 的 author/repository/homepage/bugs 改成中性内容(author 写 `Hangzhou Crysound Electronics Co., Ltd.`，repository 写 `https://github.com/crysound/crybot`)。`CODEOWNERS`、`FUNDING.yml`、issue 模板里的上游内容删除。

## 范围
- 可以改：整个仓库，`brand/` 和 `docs/specs/` 除外(只读)。
- 不要动：`third_party/` 文件内容、第三方归属头、`LICENSE`、`mobile/`(另一个任务在建)、`electron-builder` 的 `publish` 配置和 `electron/updater.mjs` 的更新源逻辑(T-1208 做；本任务只改其中的名字)。
- 不要新增依赖。

## 验收标准
- [ ] `node scripts/check-brand-residue.mjs` 退出 0(白名单只有规格第 3、8 节列的那些)。
- [ ] `git grep -nIi -E 'crybot\.com|crybot\.si|cry-cloud'` 只命中 NOTICE / CHANGES.md / LICENSING.md / third_party。
- [ ] `pnpm typecheck` 通过；`pnpm lint` 通过。
- [ ] `pnpm build:server` 和前端构建(`pnpm build` 或 package.json 里对应脚本)通过，构建产物再跑一次残留检查也通过。
- [ ] 改动涉及的 vitest 用例通过：`pnpm vitest run <路径> --maxWorkers=2`(全量太大，挑和改名、enterprise、吉祥物、公告/更新检查/分析相关的；被删功能的测试一起删)。列出你跑了哪些、结果。
- [ ] locale 校验通过(`node scripts/generate-locale.mjs --check` 或 package.json 里的对应脚本)。
- [ ] `/api/health` 返回 `app:"crybot"`；`/api/edition` 为开源版(写或改一个测试证明)。
- [ ] 吉祥物默认是 dome，cursor 已不存在，存的 body 为 cursor 时回退到 dome(有测试)。
- [ ] 未设置任何 `CRYBOT_*_URL` 时，服务端启动不发出任何对外请求(在汇报里说明你怎么确认的，例如列出剩下所有硬编码外部 URL 及用途)。

## 约束
- 不要 git 提交。沙箱禁网，`node_modules` 已就绪(链接)，不要装依赖；需要新依赖就在汇报里列出。
- 跑 vitest、vite build 这类吃内存的命令时加 `--maxWorkers=2`，一次只跑一组。
- 只写必要的注释。测试测行为。
- 工作量大，按「改名脚本 → typecheck 修错 → 删服务 → 图标吉祥物 → 许可 → 残留检查 → 测试」顺序推进；中途别停下来问，做不了的写进汇报。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1207-rebrand/report.md`(各轮追加)。用中文：
1. 改了哪些东西(按类别概括，删除的目录/功能逐条列)。
2. 怎么验证的，命令和结果。
3. 需要协调者处理的：缺的图标文件、依赖、没解决的问题、你拿不准而自己定了的地方。
