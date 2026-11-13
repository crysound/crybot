# T-1212 执行报告

## 结果与范围

恢复 12 个测试文件，新增 cloud-status、account-service、cloud-disabled 三个测试文件。生产代码仅修改 `electron/account-service.mjs` 和 `electron/cloud-disabled.mjs`。未提交 git；未修改另一工作树处理的人名、companion/devices、中继主机白名单、update-check 文件；未运行 build 或全量测试。

所有恢复文件先从 `git show d383696:<路径>` 原样读取，再做品牌、导入和已删除功能适配；原始副本与逐项用例清单保存在 `/tmp/t1212-baseline/`、`/tmp/t1212-inventory.json`，最终交付不依赖这些临时文件。

**源码核对的重要差异：** 清单中的 `cloud-accounts.node-test.mjs` 实际测试 `account.mjs` 和 `accounts.mjs`，二者均已删除。`accounts-main.mjs` 仍在，但 `createAccountLeave` 已删除、`createDesktopRing` 已变为空 ring。`cloud-plan-ipc.mjs`、preload 的 cloudPlan/cloudAccount 桥、main 的 rememberCloudHome、ProSettingsCard/proOfferAvailable 也已删除。下文明确列出对应未恢复用例，未把这些安全流程改成自测 fixture，也没有恢复已删除的生产代码。

**安全覆盖边界：** 现存主窗口 sender/main-frame/origin、home grant、cookie 清理、account-places 隔离、远程页无本地能力等断言保留。已删除实现的 OTP 撤销、账户切换清 cookie 顺序和套餐 IPC sender 流程无法仅替换 fixture 来保留验证意义，因此按“源不存在不恢复”处理，并补禁用入口无能力/无副作用测试。此项涉及任务中“所有安全用例必须保留”与“不要恢复已删除生产代码”的冲突，已询问用户，但本轮没有收到明确回复；这些条目需协调者复核，不能宣称所有历史安全流程用例均已保留。

## 恢复文件与用例数

计数按实际展开的测试用例；SettingsModal 的 3 个基线测试在 Simple/Advanced 各运行一次，因此为 6。本轮 2 个测试同样展开为 4。其他恢复文件没有额外参数化展开，ProIntroduction 新增 hook 测试包含参数化场景。

| 文件 | 基线用例数 | 本轮用例数 | 结果 |
| --- | ---: | ---: | --- |
| `electron/home-window.node-test.mjs` | 49 | 46 | 全部通过，无 skip |
| `electron/cloud-home.node-test.mjs` | 28 | 23 | 全部通过，无 skip |
| `electron/cloud-signin.node-test.mjs` | 9 | 1 | 全部通过，无 skip |
| `electron/accounts-main.node-test.mjs` | 17 | 8 | 全部通过，无 skip |
| `electron/cloud-sync-preload.node-test.mjs` | 2 | 2 | 全部通过，无 skip |
| `electron/native-language.node-test.mjs` | 3 | 3 | 全部通过，无 skip |
| `src/components/CloudRoomCard.dom.test.ts` | 5 | 5 | 全部通过，无 skip |
| `src/components/CloudTrialNotice.test.ts` | 5 | 5 | 全部通过，无 skip |
| `src/components/CloudUsageMeter.test.ts` | 8 | 8 | 全部通过，无 skip |
| `src/components/ProIntroduction.test.ts` | 4 | 6 | 全部通过，无 skip |
| `src/components/SettingsModal.cloudPlan.test.ts` | 6 | 4 | 全部通过，无 skip |
| `src/components/SidebarProfileMenu.cloud.test.ts` | 2 | 2 | 全部通过，无 skip |
| `electron/cloud-accounts.node-test.mjs` | 27 | 0 | 源 `account.mjs`、`accounts.mjs` 已删除，不恢复 |
| `src/components/CloudCancelPlan.dom.test.ts` | 8 | 0 | 死组件，不恢复；交协调者决定删除 |

## Fixture 与保留用例适配

- `home-window` 继续使用已存在的 `electron/fixtures/home-window-world.mjs`：真实 createHomeWindow，内存账户状态、手动时钟、隔离 fetch/窗口；没有账户生产客户端依赖。preload 仍在 VM 中执行真实源码。删掉已不存在的 cloudPlanSnapshot/installCloudPlanIpc 导入和专用 pageIpc fixture。原“自己的 Cloud 页具有聊天链接、诊断、session renewal”用例保留 home bridge 的用户点击拒绝、远程能力隔离断言；只去掉已经不存在的 cloudPlan.signIn 调用和相应的一次 IPC 预期。team pairing URL fixture 从历史 fly 域名改为现有 world 的 example.test，同样匹配 `/pair#code=`。
- `home-window` 新增 **no page receives a hosted plan or account bridge, even with user activation**：local/home/other server × 有无用户激活均无 cloudPlan/cloudAccount，零 invoke，main 不注册套餐处理器。
- `cloud-home` 保留全部现存解析器的严格输入、错误状态和配对 grant 断言。删除专供已删账户客户端使用的 HTTP Admin fixture。原 **main lists the machine from verified states only, and connects without a dialog** 改名为 **main connects through the home window without a dialog**：去掉已不存在的 rememberCloudHome 段，VM 改为执行仍在的 connectCloudHome/activateCloud；文件内 getCloudAccount fixture 仅返回账户状态，真实主进程函数决定打开和激活。原 connect/拒绝/无 dialog/无直接 probe 断言保留；原列出机器、保留名字颜色的行为仍有 withCloudHome 用例。
- `cloud-signin` 保留原 **the email, the code and the Admin's answers are read strictly** 的全部断言；其余对象是已删除账户客户端，移除专用 HTTP fixture，不复刻 OTP 登录实现。
- `accounts-main` 使用原文件内 client/ring/IPC fixture；真实 installAccounts/accountsView 和 account-places 执行权限与数据隔离。非 ownPage 的 list、sign-out、add、sheet 通道拒绝断言原样保留；已经禁用的 offered/open 的旧“显示 sheet”及拒绝 open 期望改为 `false` / unavailable / 无副作用。原“no page can switch or read another account's address”断言原样保留，仅去掉标题中已不存在的 rail 切换描述。新增 **disabled account actions cannot sign in, sign out or hold a sheet**，覆盖全部禁用 action 和空 ring。
- `cloud-sync-preload` 测试的是仍在的 `preload.cjs`。保留 My Cloud 无 Files bridge 断言；替换已删 local Files 正向用例为本机也无 hosted Files bridge，用户激活与否均不产生 invoke。
- `native-language` 保留 activity window 随显示语言切换和 menu/trays/title/badge 重绘两个原测试；品牌文案同步当前源码。已删 Cloud factory 用例替换为 **main initializes native text from the saved language and follows later choices**，在 VM 执行真实 main 的 nativeText 初始化，以文件内 prefs/OS fixture 验证保存的葡语优先并可切回英语。现有 tooltip/配对 label 的 `CryBot` 拼写按当前生产输出验证，本任务不扩大修改其他生产文件。
- `CloudRoomCard.dom`、`CloudTrialNotice`、`CloudUsageMeter`、`SidebarProfileMenu.cloud` 的 20 条原测试全部保留。类型导入由已删 account.mjs 改为 cloud-account-types.mjs；cloud-plan 导入改为 cloud-status。CloudUsageMeter 显示文字同步为 `Cry Bot Cloud usage`。均使用文件内 bridge/React/DOM fixture，不连用户账户；房间卡跨账户不能 restart、套餐操作确认前不发送、bridge 被拒绝后停止轮询、远程窗口不读账户等断言保留。
- `ProIntroduction` 当前仅剩 useCloudPlan hook，原购买卡及 proOfferAvailable 已删；新建 hook 测试 6 条，覆盖本地/浏览器/服务器无桥返回 null、remoteClient 即使有旧桥也不读取、推送状态优先于迟到初次查询、卸载 unsubscribe、拒绝查询保持 unknown。使用真实 React/DOM、文件内可延迟 bridge。
- `SettingsModal.cloudPlan` 保留普通服务器无套餐入口的原断言；原 Cloud home、本机购买页用例删除，新增本地和 home 即使旧 bridge 存在也无套餐页面的回归，在两种模式展开。去掉对已删除 CloudAccountSettings 的 mock。
- 恢复文件中的叙述性注释清理；保留 Vitest 环境指令。不改 lint 配置、不 suppress 正确性规则。

## 未恢复/删除用例逐条记录

以下名字按基线或机械改名后的名称列出；“未恢复”不会引入 skip/todo。

### `electron/home-window.node-test.mjs`

1. **Settings on the person's own Cloud shows the plan read only, says when it is home, and can open the Plan page or sign in again; never switch away** — 套餐 state/manage/signIn/notice IPC 及其 sender 实现已随 cloud-plan-ipc 删除；现存 cloudPageSenderAllowed 原测试保留，新增无套餐桥边界。
2. **the usage meter's Upgrade: only from the person's click, only to a plan the verified session offers, only from this app's own pages** — 已删除套餐 upgrade-preview/upgrade IPC；不把旧 sender/用户激活校验搬进 fixture 冒充生产验证。
3. **Cancel and Keep my plan on the Cloud's own page: only from the person's click there, the survey's words only, and the plan's renewal shown read only** — 已删除套餐 cancel/keep IPC；CloudCancelPlan 也无运行时入口，新增无套餐桥边界。
4. **the room card on the person's own Cloud: the offer read only, Not now and Restart now only from their click there, for the session's own Cloud** — 已删除套餐 room-not-now/restart IPC；仍在的前端 CloudRoomCard 跨账户安全用例全部保留。

### `electron/cloud-home.node-test.mjs`

1. **signed out, the app asks nothing about a Cloud machine and offers nothing to join** — 已删除 account.mjs 的 start/homeTarget/pairHome，非 cloud-home 解析器；无桥/无外部依赖另有禁用回归。
2. **the session's machine reaches the page as state and address; a code is minted only on request** — 已删除账户客户端 refresh/pairHome 与 token/快照持久化流程；现存 parsePairingGrant/URL hash 断言保留。
3. **a grant for another machine or an Admin refusal never connects** — 已删除账户客户端 pairHome 的 HTTP 拒绝处理；现存 pairing grant 不匹配/过期拒绝测试保留。
4. **stopped, unpaid and failed machines show plainly and cannot be joined** — 已删除账户客户端 entitlement/机器 session 状态机；现存机器解析器的状态与 malformed 断言保留。
5. **signing out forgets the machine** — 已删除 Cloud 账户客户端 signOut；本轮另为仍在的 account-service 补旧 token 清理回归。

### `electron/cloud-signin.node-test.mjs`

1. **happy path: the code is sent, the right code signs this computer in with the token stored like the browser sign-in's** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
2. **with new accounts closed the Admin still answers "sent" (only an existing address gets mail), and the page is told** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
3. **a wrong code says the tries left; the last one asks for a new code; nothing is stored** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
4. **single sign-on is told at the start (no code is sent) and falls back to the browser approval** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
5. **limits, an expired code and the Admin's refusals each come back as one plain outcome; an Admin without the route means the browser** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
6. **a refused Resend keeps the code already sent; a successful one replaces it; another address drops it** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
7. **cancelled while the code is checked: a token the Admin issued anyway is revoked, nothing is stored or signed in** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。
8. **a token that cannot be stored is revoked and nothing is signed in; cancelling forgets the attempt** — 测试对象是已删除 account.mjs 的 OTP 客户端流程；cloud-signin 输入/响应严格校验原样保留，不以 fixture 重写 OTP 实现。

### `electron/accounts-main.node-test.mjs`

1. **the sheet asked for before the rail's page was up opens once when that page asks, and closing lets the rail go** — 托管 sheet/pending/rail 保持流程已禁用，当前必须不显示 sheet。
2. **a sign-out answers with who is signed in now; a failure says failed, with no detail** — 托管账户 ring signOut 动作已禁用，当前 IPC 返回 unavailable，不再执行旧异常分支。
3. **Settings' Sign out is the same sign-out, refused while the move holds it, and works with no account to name** — 已删除真实账户 ring 的 Settings sign-out 路径；当前 signOutActive 仅返回状态。
4. **leaving: the list changes, then the window leaves, and only then the sessions go, so its page can't sign in again** — createAccountLeave 已删除，原 persist→leaveWindow→clear 顺序不再存在；保留真实 clearPlaceStorage 单元覆盖。
5. **sessions go only after what was still waiting on those places has been answered, since a Cloud's answer re-issues its cookie** — createAccountLeave.settled 已删除，旧在途 HTTP 回答/清 cookie 顺序无被测生产实现。
6. **cookies never cross accounts: leaving takes every session of that account's places, a team's Cloud the two share included, and leaves a server saved by hand** — createAccountLeave 已删除，跨账户切换功能也已禁用；真实 accountPlaces/clearPlaceStorage 的账户 origin 和 cookies/storage 范围测试保留。
7. **a switch keeps the rail's rows for the account leaving, without their live state, and brings the other's places back** — createDesktopRing 已变为空 ring，不再切换账户或缓存 rail rows；真实 createPlaceStash 隔离用例保留。
8. **signing out the last account: the sign-in ends before its sessions go, since lending's last answers can re-issue a cookie** — 真实 ring 的最后账户退出/lending 等待/清 cookie 流程已删除，不在 fixture 重建。
9. **signing out one of two: only its group goes, and the other account takes over** — 真实 ring 的双账户退出后接管功能已删除，空 ring 与无切换通道另有回归。
10. **the app waits for lending's last answers before it clears an account's sessions** — main 已不向空 ring 接入 lendingDone；原静态接线断言对应已删除流程。

### `electron/native-language.node-test.mjs`

1. **main's Cloud account factory keeps the same client in the current app language** — Cloud 账户 factory 和 account.mjs 已删除；新增 main 原生语言初始化测试覆盖现存 nativeText。

### `electron/cloud-sync-preload.node-test.mjs`

1. **this computer's own window gets the Files controls** — 本地 cloudAccount.files bridge 已删除；替换为本地也无桥且无 invoke。

### `src/components/ProIntroduction.test.ts`

1. **for someone who may buy: what Cloud does, the Admin's lowest price and money-back; Start free trial and Compare plans both open the sheet, never the website** — ProSettingsCard/proOfferAvailable 已删除；模块仅保留 useCloudPlan，改为测试真实 hook，不恢复推广入口。
2. **without a trial it says Add a Cloud; signed in, no sign-in link; without the Admin's numbers, no price and no money-back** — ProSettingsCard/proOfferAvailable 已删除；模块仅保留 useCloudPlan，改为测试真实 hook，不恢复推广入口。
3. **someone with a plan sees that plan and the way to it, never an offer, and Cloud is never asked** — ProSettingsCard/proOfferAvailable 已删除；模块仅保留 useCloudPlan，改为测试真实 hook，不恢复推广入口。
4. **never offers a plan to anyone who pays, may pay, or whose state is unknown; and never in a browser or on another server** — ProSettingsCard/proOfferAvailable 已删除；模块仅保留 useCloudPlan，改为测试真实 hook，不恢复推广入口。

### `src/components/SettingsModal.cloudPlan.test.ts`

1. **shows the plan, read only, on the person's own Cloud** — 对应托管套餐/购买设置页面及 CloudAccountSettings 已删除；两种模式均应没有入口，以新增禁用入口回归替代。
2. **is the full plan page in the app on this computer, with the offer in both modes** — 对应托管套餐/购买设置页面及 CloudAccountSettings 已删除；两种模式均应没有入口，以新增禁用入口回归替代。

### `electron/cloud-accounts.node-test.mjs`

1. **an old saved sign-in upgrades as it is: no prompt, no sign-out, nothing written** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
2. **a downgrade: the active account stays in the old format for the old file, and the others are in a file an older app never opens** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
3. **add: signs in beside the account in use, which goes on until it succeeds, then the new one is active and the old one waits** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
4. **a cancelled add changes nothing and asks nothing of the account in use** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
5. **switch: one tap, no code, each account's own token; a saved account asks nothing while it waits** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
6. **three accounts: each is one tap from any other** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
7. **a switch writes in the order that loses nothing: at every write each token is in a file** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
8. **a crash mid-switch: an account found in both files is the active one, shown once** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
9. **the active file can't be written: nothing changes, the account in use goes on, and both tokens are kept** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
10. **sign out of the active account: gone from this device and ended at the Admin, and the app moves to another signed in here** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
11. **sign out of the last account: signed out, with nothing left on this device** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
12. **sign out of an account that is waiting: its token ends, and the one in use isn't touched** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
13. **while the move holds the account: no switch and no sign-out, nothing written; an added account waits** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
14. **adding the account that's already here: its new token ends at once, and the address is said** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
15. **a waiting sign-in that ended by its date asks for the code again, and changes nothing** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
16. **a switch to an account no longer here says so** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
17. **a locked keychain never loses the saved accounts: the switch fails and the file stays; one that can never be read is dropped** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
18. **a saved file from a newer version is left alone; a record for another Admin or with a bad token is never used** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
19. **a launch with no one active but others waiting: the first still good takes its place; a locked active file is left alone** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
20. **a sign-in that ended gives way: the code brings that account back with the new token, for the active one and for one waiting** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
21. **until the saved accounts have been read, there may be more than one: nothing that needs one account starts on a guess** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
22. **while a switch is under way nothing of the old sign-in runs: a window coming to the front or Settings' Refresh can't write it over the new one** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
23. **a change of account that fails partway never leaves the sign-in stopped: it reads its file again, and the window goes where it belongs** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
24. **a sign-in that can't be written stays the old account's, running again** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
25. **the browser's way says how it ended: the account in use already, one kept during a move, one switched to, once each** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
26. **the browser's way failing says so rather than leaving the sheet waiting** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。
27. **the emailed code's way answers directly, and leaves nothing for the browser's way to say** — 实际被测 account.mjs/accounts.mjs 均已删除；整个测试文件不恢复，不用自制账户客户端模拟生产行为。

### `src/components/CloudCancelPlan.dom.test.ts`

1. **Cancel trial opens a calm sheet; the reason and both boxes go to main, then when it ends, that nothing is charged, how long its files stay, and Keep my plan** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
2. **cancelling never needs an answer: nothing said sends no survey; words without a reason go as they are; a failure says so and can be tried again** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
3. **Keep my plan before cancelling only closes the sheet; an Admin without Cancel says the Cloud page's Billing opened** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
4. **a paid plan says Cancel plan and that nothing more is charged; a team's Cloud stops for everyone in it; files kept in days, a day, hours, or not at all** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
5. **already cancelled: when it ends and Keep my plan, never Cancel; nothing at all without a renewal (someone else pays) or a way to change it** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
6. **keeps its sheet open while main's state changes underneath (the plan cancelled), and Escape closes it** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
7. **this computer's Settings: Cancel trial for the account that pays, through main's own bridge; nothing for anyone else** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。
8. **the Cloud page in home mode: Cancel trial beside Manage in your browser, and the plan read again after; none without a renewal** — CloudCancelPlan/CloudCancelSheet 只在已断开页面的 plan-parts 内引用，是真正死组件；按要求不恢复测试，交协调者决定删除。

## 第 2–4 项实现与验证

1. `src/lib/cloud-status.test.ts:11`：新增 21 条用例。覆盖无账户桥的本地状态、无账户 snapshot 的服务器、null/undefined、restoring、disabled/unavailable、未知/缺少 status、旧 lastPlan 仍未验证、无 trial/offer 的返回、未知或原型链 tier、计算过程不联网，以及已保存 signed-out/removed/connecting/reauth/free 状态区分。未修改 cloud-status.ts 生产逻辑。定向 Vitest 全通过。
2. **原任务第 3 项，限模块单测层面（第 2 轮修正）：** `electron/account-service.mjs:928` 的 signOut 在无 client/无有效 account 时清本地；远端 cleanupCurrentAccount 失败后，本地清理成功返回 signed-out 且无旧邮箱，本地清理失败返回 error 而不 reject。使用现有 withoutCompanionAccount 清 account token、账户记录、installation 凭据与 endpoint/connector token，保留稳定 instance id 和无关 provider 配置。第 1 轮 account-service 7 条，第 2 轮增至 11 条；`electron/hosted-disabled.node-test.mjs:25` 的 6 条回归继续通过。

   **该模块未在运行时实例化，本修复只保证模块被重新启用时行为正确，不影响现有安装里已存的旧凭据。** `electron/main.mjs:81` 只导入两个状态读取 helper，`:2319` 的 sign-out IPC 固定返回 disabled；`electron/preload.cjs:275` 虽保留桥，渲染端无调用。默认改名后的应用**不能自动读到原品牌目录里的 credentials.bin**；但 **能读到已经使用 Cry Bot 名称的较早安装（包括 d383696）在同一 userData 中保存且可解密的旧凭据**，不会过滤其中的旧账户字段。名称、路径证据、字段清单及另开任务的清理接入建议见下方「第 2 轮」第 1 条。远端清理失败时模块不会保留 bearer 供重试，也不能保证服务端记录已撤销；此处不声称运行时已清除或撤销任何凭据。
3. `electron/cloud-disabled.mjs:34`：写入新列表后，只保留 id 与归一化 origin 均不冲突的 dormant 条目；复用 environments.normalizeOrigin，处理大小写、默认端口和尾随路径，忽略无效/不存在的 origin，避免本地 workspace 相互冲突。也消除 dormant 之间重复。`electron/cloud-disabled.node-test.mjs:1` 共 4 条通过：同 id、同 origin 不同 id（包含归一化）、两者均不同、无 origin 的本地条目。

## 真正死组件建议

- 建议删除 `src/components/CloudCancelPlan.tsx`，包含 CloudCancelPlan、CloudCancelSheet、endedLine 等。`rg` 全仓核对：CloudCancelPlan 无外部调用，CloudCancelSheet/endedLine 仅由 `src/components/settings/plan-parts.tsx` 引用。
- 建议一并评估删除 `src/components/settings/plan-parts.tsx`：没有运行时代码导入，只有 closed-scale.test.ts 的静态路径列表提及。两个文件本轮均未修改或删除，由协调者决定。
- ProIntroduction 仍被 AccessSection、RoutineScheduleNote、XCard 引用（useCloudPlan）；CloudTrialNotice/CloudRoomCard/CloudUsageMeter 仍有运行时引用，不能因为部分托管导出已失去入口就整文件删除。
- `electron/cloud-signin.mjs` 为部分死导出：`cleanEmail`（`:14`）仍由 `electron/updates-consent.mjs:3` 导入、`:25` 等处使用；`cleanCode`（`:21`）、`signInIdentity`（`:28`）、`parseSignInStart`（`:36`）、`startFailure`（`:48`）、`verifyFailure`（`:56`）无运行时调用方，只有保留测试覆盖。只列出供协调者评估，不删除文件或导出。

## 检查记录

沙箱没有 systemd-run；所有重命令串行。Node 使用 `/opt/node24/bin`（24），node_modules 链接已有依赖；未安装依赖。Vitest 使用 runner loader，2 workers、2048 MiB；typecheck/lint 3072 MiB。

- `pnpm vitest run src/lib/cloud-status.test.ts src/components/CloudRoomCard.dom.test.ts src/components/CloudTrialNotice.test.ts src/components/CloudUsageMeter.test.ts src/components/ProIntroduction.test.ts src/components/SettingsModal.cloudPlan.test.ts src/components/SidebarProfileMenu.cloud.test.ts --maxWorkers=2 --configLoader runner`：7 文件、51 用例通过，`/tmp/t1212-vitest-final.log`。
- `node --test` 指定 home-window、cloud-home、cloud-signin、accounts-main、cloud-sync-preload、native-language、account-service、cloud-disabled、hosted-disabled 九文件：全部通过，`/tmp/t1212-node-final.log`。之后增加一条 nativeText 初始化测试，单文件展开 3/3 通过，`/tmp/t1212-language-final.log`。按文件计数合计 100 条，无 skip；进程隔离模式摘要显示文件数，恢复测试展开计数见 `/tmp/t1212-restored-second.log`（增加语言初始化用例前为 82，后为 83），新增修复 11 条、已有 hosted-disabled 6 条。
- `pnpm typecheck`：退出 0，`/tmp/t1212-typecheck.log`。
- `pnpm lint`：退出 0，`/tmp/t1212-lint.log`。
- `node scripts/check-brand-residue.mjs`：6483 files，0 forbidden references，`/tmp/t1212-brand.log`。
- `git diff --check`：通过；另检查未跟踪的新增/恢复文件的尾空格与 EOF。

`docs/verification/README.md` 当前不存在，先前第 8 轮报告也记录了相同缺失。本轮为内存/VM/DOM 单元验证，无 server/conversation 生产代码变更；没有启动或访问用户 live app，没有写用户凭据/真实数据，不声称完成服务端或真实会话端到端验收。


## 第 2 轮

### 1. 修正 signOut 的运行时效果与凭据路径结论

已在上方原任务第 3 项处明确限制为模块单测修复，不再暗示当前应用退出登录会执行清理。本轮未修改 main.mjs，也未新增调用链。全仓检索 factory、桥调用与模块导入，运行时代码无 `createCompanionAccountService` 实例化、渲染端无 `companionAccount.signOut` 调用；证据为 `electron/main.mjs:81` 的 helper-only 导入、`:2319` 的 disabled IPC，以及 `electron/preload.cjs:275` 的仅转发桥。

**可读性结论：原品牌安装默认不能读到；较早 Cry Bot 安装同路径旧凭据能读到（需操作系统解密可用）。** 本轮仅核对源码与 Git 历史，没有打开用户实际凭据文件。不能把“改名隔离目录”描述成删除旧文件或保证所有安装均无残留。

| 证据位置 | 核实结果 |
| --- | --- |
| `e8fe11b:package.json:2`、`e8fe11b:electron-builder.yml:1`、`:2` | 真正改名前基线：name 为 `openmausbot`，appId 为 `com.openmausbot.app`，productName 为 `OpenMausBot`。 |
| `package.json:2`、`electron-builder.yml:1`、`:2` | 当前 name 为 `crybot`，appId 为 `com.crysound.crybot.desktop`，productName 为 `Cry Bot`。Electron 默认 userData 由 appData 加应用名组成；改名前后的名称不同，默认目录随之变化。appId 变化不是 credentials.bin 路径拼接的依据。 |
| `d383696:package.json:2`、`d383696:electron-builder.yml:2` | 任务用于恢复测试的 d383696 已是 `crybot` / `Cry Bot`，不能作为真正改名前名称的证据；它与当前名称相同，因此同安装方式、同用户下可能共用 userData。 |
| `e8fe11b:electron/main.mjs:364`、`d383696:electron/main.mjs:364`、当前 `electron/main.mjs:356` | 三者均把凭据文件定位为 `path.join(app.getPath("userData"), "credentials.bin")`；文件名不变，是否同目录取决于应用名与启动配置。生产 electron 入口无 app.setName/app.setPath 覆盖，也无扫描、复制原品牌 userData 的迁移代码；scripts 中的 setPath 是隔离验证入口。 |
| `electron/main.mjs:330`、`:356` | `CRYBOT_DATA_DIR` / `~/.crybot` 是 workspace 数据路径，不是 secure credentials 位置；改这个环境变量不会让 credentials.bin 指向旧目录。 |
| `electron/main.mjs:362`、`:381`、`:2688`；`electron/secure-credentials.mjs:15`、`:32` | 启动只读当前 userData 中的文件，safeStorage 解密后按对象原样返回，不做 companion 字段白名单过滤。不存在则空；解密失败标记 unavailable，不尝试原品牌目录。若人为复用/迁入目录，仍取决于能否解密，不能保证跨应用复制密文可用。 |
| `electron/main.mjs:2690`、`:2704`；`electron/secure-credential-state.mjs:18` | 启动现有定向删除仅涉及 assemblyAiApiKey；随后建立的串行状态保留其他普通字段，不调用 account-service 的清理函数。 |

**可能残留的字段（指较早同路径文件中本来存在的字段）：** `companionAccountToken`、`companionAccountUserId`、`companionAccountEmail`、`companionInstallationId`、`companionInstallationCredential`、`companionInstallationCredentialExpiresAt`、`companionAccountCleanupPending`、`companionEndpointReleasePending`、`companionEndpointPaused`、`companionTunnelRetired`、`companionTunnelWaiting`，以及 `managedCompanionEndpointUrl`、`managedCompanionConnectorToken`、`managedCompanionOriginVersion`、`managedCompanionReleaseAt`。字段依据为 `electron/account-service.mjs:21`、`:106` 与 `electron/managed-companion-tunnel.mjs:14`、`:91`；`companionClientInstanceId` 是刻意保留的稳定标识，不是待撤销 bearer。当前没有清理这些字段的运行时迁移，原品牌旧目录里的文件本身也仍保留在磁盘。

**交协调者另开任务：** 可在 `electron/main.mjs:2704` 创建 secureCredentialState 后、`:2708` 起初始化身份/启动 companion 消费方前，接入一次有明确字段范围的本地清理，使用现有串行凭据更新入口（`:513`），并保留 credentialStoreUnavailable 的不可写保护。只删除确认已退役的凭据，保留无关 provider 配置及需要保留的稳定标识；是否保留 paused/retired 等状态标记应由新任务明确。若还要清理原品牌目录，需单独设计迁移范围及解密/不可读处理，当前不会自动发现该目录。本轮只记录建议，不接线、不写真实凭据，也不把本地删除等同于服务端撤销。

### 2. signOut 异常处理与回归

- `electron/account-service.mjs:928`：配置存在且有账户时才尝试远端清理；无配置、无账户或远端失败进入独立的本地清理 try/catch（`:942`）。本地成功清空 phase，返回 signed-out 且不含旧邮箱；本地清理抛错则用 publicState 返回 error，不让 signOut reject。显式 error 快照避免未配置/服务不健康时 settledState 的 signed-out 回退掩盖此次清理失败。
- `electron/account-service.node-test.mjs:63`：扩展原 5 个远端成功/失败场景，先通过 fixture health 进入健康状态，再断言 signed-out、返回值和后续 state 均无 email。这会捕获第 1 轮在 clearAfterCleanup 后重新设置旧邮箱 error 的问题；未预热健康状态时旧实现可能被 settledState 的回退掩盖。
- `electron/account-service.node-test.mjs:85`：新增 4 条，交叉覆盖有/无 client × 凭据写入/端点停止抛错，断言不 reject、返回 error、有错误信息，且写入失败不假装清掉原记录，停止失败时已完成的凭据删除仍生效。fixture（`:26`）仅在内存注入异常，无网络或真实存储。

### 3. 删除恒真断言

`src/components/SettingsModal.cloudPlan.test.ts:27`、`:32` 两个 it 删除对已无 mock 来源的 CLOUD_PLAN_MARKER 的否定检查。保留真实渲染的 `data-settings-page="plan"` / `data-settings-page-open="plan"` 入口断言；若入口恢复即可失败。仍在 Simple/Advanced 下共 4 条。

### 4. 补部分死导出清单

已在「真正死组件建议」补充 `electron/cloud-signin.mjs:21`、`:28`、`:36`、`:48`、`:56` 的五个无运行时调用导出；同时明确 `cleanEmail` 的生产调用证据 `electron/updates-consent.mjs:3`、`:25`。只列出，本轮不删源码、不删既有测试。

### 5. 保持已接受断言与排除范围

`electron/accounts-main.node-test.mjs:18` 的非本页 accounts:open 返回 unavailable 断言保持原样。第 1 轮恢复文件、cloud-status 测试和 cloud-disabled 去重均保留。本轮不修改 `.github/workflows/ci.yml`、main.mjs、人名、companion/devices、中继白名单或 update-check 相关文件，不 git 提交。

### 第 2 轮验证

全部重命令串行；Node 使用 `/opt/node24/bin`，Vitest 堆限制 2048 MiB，typecheck/lint 3072 MiB。只运行指定相关测试，不跑全量 Vitest 或 build。

- `node --test electron/account-service.node-test.mjs electron/hosted-disabled.node-test.mjs`：退出 0，2 文件通过；文件内用例为 11 + 6 = 17，无 skip。当前 Node 摘要按隔离文件显示 2/2。
- `pnpm vitest run src/components/SettingsModal.cloudPlan.test.ts --maxWorkers=2 --configLoader runner`：退出 0，1 文件、4 用例全部通过。
- `pnpm typecheck`：退出 0。
- `pnpm lint`：退出 0，无警告。
- `node scripts/check-brand-residue.mjs`：退出 0，6484 files checked，0 forbidden references。
- `git diff --check`：退出 0；另逐行检查所有未跟踪文件的尾空格、末尾换行，全部通过。

`docs/verification/README.md` 仍不存在；本轮使用新建内存服务实例、VM、静态渲染 fixture 验证，没有 server/conversation 生产改动，不访问用户 live app 或数据，不声称端到端验证或旧安装凭据已被清理。
