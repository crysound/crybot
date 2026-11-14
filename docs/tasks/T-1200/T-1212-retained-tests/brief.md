# T-1212：恢复保留模块被整删的测试，补 cloud-status 测试，清理旧托管凭据

父任务 T-1206，执行规格 `docs/specs/2026-11-13-crybot.md`。本分支基于 T-1207-rebrand（提交 b934794，第 8 轮）。T-1207 第 9 轮仍在另一个工作树改测试里的人名、companion/devices、中继主机白名单、update-check，那些文件本任务不要动；最后由协调者合并。

背景：T-1207 改名时删掉托管云（Cloud 购买/计划/账号）功能，顺手把一批测试整文件删了。其中有些测试对应的源文件仍然保留、仍在运行，测试也该保留。第 8 轮已恢复 `electron/app-permissions.node-test.mjs`、`electron/updates-consent.node-test.mjs`、`src/components/AppNotices.test.ts`，做法写在 `docs/tasks/T-1200/T-1207-rebrand/report.md` 的「第 8 轮」，本任务照同样做法处理剩下的。

原始版本用 `git show d383696:<路径>` 取回（d383696 是改名前的基线）。

## 要做

1. **恢复源文件仍在的测试**。下面这些在 d383696 有、现在被删，且源文件仍在仓库里：
   - `electron/home-window.node-test.mjs`（源 `electron/home-window.mjs`）
   - `electron/cloud-home.node-test.mjs`（源 `electron/cloud-home.mjs`）
   - `electron/cloud-signin.node-test.mjs`（源 `electron/cloud-signin.mjs`）
   - `electron/accounts-main.node-test.mjs`、`electron/cloud-accounts.node-test.mjs`（源仍在）
   - `electron/cloud-sync-preload.node-test.mjs`、`electron/native-language.node-test.mjs`：源文件名不同，先读原测试弄清它测的是哪个现存模块（preload、语言选择等），模块还在就恢复。
   - 前端：`src/components/CloudCancelPlan.dom.test.ts`、`CloudRoomCard.dom.test.ts`、`CloudTrialNotice.test.ts`、`CloudUsageMeter.test.ts`、`ProIntroduction.test.ts`、`SettingsModal.cloudPlan.test.ts`、`SidebarProfileMenu.cloud.test.ts`（对应组件仍在）。
   - 做法：原样取回 → 改名（OpenMausBot→Cry Bot 等，品牌规则见规格）→ 跑。测的是已删除托管功能（购买、试用推广、套餐、OTP 登录等）的用例可以删，但每删一个都要在报告里逐条写名字和理由；**本地安全边界、发送方（sender）校验、权限、fail-closed 一类的用例必须保留**，只能换 fixture，不能改断言。依赖已删除模块的 fixture 改成文件内的隔离 fixture，不要恢复已删除的生产代码。
   - 如果某个组件现在已经没有任何地方引用（真正的死代码），不要硬恢复测试，在报告里列出来，写明建议删组件，由协调者决定。
   - 源文件不存在的那些（cloud-buy、cloud-rail、cloud-room、cloud-staging、cloud-trial-notice 的 electron 测试，CloudAddDialog、CloudHowTo、cloud-buy/*、cloud-plan*.test.ts 等）不恢复。
2. **补 `src/lib/cloud-status.ts` 的测试**：覆盖托管关闭时的各种状态返回（本地、服务器、未知输入），新建 `src/lib/cloud-status.test.ts`。
3. **account-service 未配置时退出登录要清本地旧凭据**（`electron/account-service.mjs` 约 928 行 `signOut`）：未配置账户服务时，signOut 现在不清本地保存的旧 token。改成无论服务端是否可用，都清除本地保存的 token 和账户记录（服务端调用失败或不可用不影响本地清理）。补 node-test：有旧 token、服务未配置时 signOut 后本地为空。
4. **cloud-disabled 写回去重**（`electron/cloud-disabled.mjs` 的 `localEnvironmentsStore().write`）：现在只按 id 去重，休眠的托管条目和新写入条目 origin 相同但 id 不同时会出现两条同 origin。改成按 id 和 origin（归一化后）都去重，新写入的优先。补 node-test 覆盖同 id、同 origin 不同 id、都不同三种情况。

## 跑法

- 沙箱里没有 systemd-run，一次只跑一个重命令；只跑相关测试文件，不跑 vitest 全量、不跑 build。
- node-test：`node --test electron/<文件>.node-test.mjs`。
- vitest：`pnpm vitest run <路径> --maxWorkers=2 --configLoader runner`。
- 最后跑 `pnpm typecheck`、`pnpm lint`、`node scripts/check-brand-residue.mjs`（须 0 残留）、`git diff --check`。

## 交付

- 报告写进本任务文件夹 report.md：每个恢复的文件列「基线用例数 / 本轮用例数 / 结果」，删掉的用例逐条写名字和理由，改过 fixture 的说明换了什么；第 2-4 条写改了哪个文件哪一行和测试结果；列出建议删的死组件（如有）。
- 不要 git 提交。
