# T-1217 用户名字统一显示登录身份里的名字

## 目标
服务器前面套了 Cloudflare Access，身份源是 OIDC（飞书登录）。现在所有经 Access 进来的人共用一份 `config.json` 的 `profile`（名字为空，侧栏显示「你」、头像显示「?」），消息发送者记成设备标签（如「Chrome on Mac」），AI 看到的人名是「User」。改成：**每个人在所有显示人名的地方都显示自己登录身份里的名字**。

## 现状（已调研，main 分支）
- `server/cf-access.ts` 约 17–43 行：校验 `cf-access-jwt-assertion` 后只取 `payload.sub`（无则 email）作为 identity，调用 `sessions.issueAccess(identity, 标签)`；不取名字，email 也不存。
- `server/sessions.ts`：会话 schema 约 63–92 行，`issueAccess` 约 550–561 行，`issueAccount` 约 598–612 行；同一 identity 会复用已有会话。
- `server/index.ts` 约 828–836 行 `sessionPersonName`：依次取 `session.email`、`session.label`（设备标签）；约 851、865 行发给 AI 的人名在非团队模式取 `profile.name`，否则 "User"；约 869–876 行 `sharedMembership()`、表情回应记成 "user"。
- 前端：`src/lib/session.ts` 约 25–32 行 `profileForSession` 对 admin 会话返回服务器共用 profile；`src/components/SidebarProfileMenu.tsx` 约 69–84 行；设置页名字 `src/components/settings/pages/AccountPages.tsx` 约 18 行、`ProfileSettings.tsx` 约 157–188 行；消息上方发送者名只在 `config.team` 为真时显示：`ChatView.tsx` 约 899 行、`GroupView.tsx` 约 157 行、`src/lib/own-profile.ts` 约 13–15 行；排队提示 `SharedQueueLine.tsx` 约 26 行；@提及 `ChatView.tsx` 约 901 行、`shared/person-mention.ts`。
- 智能体主人等：`shared/bot-owner.ts`、`server/host/looked-after.ts`（`nameFromEmail` 邮箱前缀回退）、`server/host/access-requests.ts` 约 45 行、`server/host/share-notice.ts` 约 30 行。
- Cloudflare Access 已把身份源的 `name` 声明配置为 OIDC Claim，按 Cloudflare 文档它出现在 Access JWT 的 `custom` 对象里（`payload.custom.name`）。实际结构没有拿真实 token 验证过，代码要同时兼容 `payload.custom.name` 和顶层 `payload.name`。

## 要做的事
1. 服务端：`cf-access.ts` 读出名字（`custom.name` 优先，其次顶层 `name`，去首尾空白、限制长度如 64 字符、去掉控制字符）和小写 email，传给 `issueAccess`；会话 schema 增加可选 `displayName`（以及 `email`，若尚无）；签发和复用已有会话时都更新为最新值并持久化。JWT 里没有名字时行为与现在一致。
2. 人名解析统一：新增一个函数（如 `personDisplayName(session)`），顺序为 `displayName` → 团队成员名（原逻辑）→ email 前缀（`nameFromEmail`）→ 本机/单人模式下的 `profile.name` → 中性回退（中文「成员」/英文 "Member"，走 i18n 或服务端已有的称呼方式）。**设备标签永远不作为人名。** `sessionPersonName`、发给 AI 的人名（按实际发言者取，不再统一用 profile.name）、表情回应者、排队提示、智能体主人（`botOwner` 的 email 若能对应到有 `displayName` 的会话则用它）、访问申请、分享提示都走它。
3. 历史消息：已存的消息 `sender.name` 是旧值（设备标签）。下发消息给前端时（或读取时）按 `sender.id`（personKey）解析为当前名字；能对应上就用新名字，对应不上保留原值。不改写磁盘上的历史记录。
4. 前端：
   - `/api/auth/session`（或前端已在读的会话接口）返回当前会话的 `displayName`；`profileForSession` 对带 `displayName` 的 Access 会话返回该名字（头像首字母同样取它）。设置页「名字」对这类会话只读显示，并注明来自登录账号；没有 `displayName` 时保持现状可编辑。
   - 消息发送者名：非团队模式下，只要服务器上出现过不止一个人（例如存在带不同 identity 的 Access 会话，或消息里的发送者 id 不是当前用户），就在别人的消息上方显示其名字；自己的消息不显示。单人本机使用时界面与现在一致。
   - @提及自己用自己的 `displayName`。
5. 测试（行为测试）：带 `custom.name` 和带顶层 `name` 的 JWT 都写进会话；复用会话时名字更新；没有名字时回退链正确且不出现设备标签；发给 AI 的人名按发言者；历史消息按 personKey 解析为新名字；前端侧栏/设置页显示 displayName；非团队多人时显示他人发送者名、单人不显示。测试里用 `https://team.example.cloudflareaccess.com` 这类占位，名字用「张三」「Alex」这类虚构值。

## 范围
可以改：`server/`、`shared/`、`src/`、`src/locales/`（新增文案中英文都补，其他语言按 `pnpm i18n:check` 要求处理）、对应测试、报告。不改 `electron/`、`mobile/`、构建和 CI 文件。

## 验收标准
- [ ] 上述行为测试通过；改动涉及的已有测试文件逐个复跑通过（一次一个文件，`--maxWorkers=1`，`PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run <文件> --maxWorkers=1`）。
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm i18n:check`、`pnpm check:brand` 串行跑通过。
- [ ] 没有 Access、单人本机模式下行为与 main 一致；团队模式原逻辑不变。
- [ ] 公开仓库：没有内部域名、IP、邮箱、真实人名、密钥。

## 约束
不要 git 提交，不装新依赖，不跑完整 `pnpm test`。沙箱里因 EPERM 或端口分配跑不了的测试不要反复重试，在报告里列出，协调者在沙箱外补跑。只写必要的注释，测试测行为。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1217-feishu-names/report.md`，中文：改了哪些文件（每个一句）、怎么验证（命令和结果）、需要协调者处理的事。
