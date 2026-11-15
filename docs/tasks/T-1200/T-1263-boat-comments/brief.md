## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec tsc` 才可用。
- 这里没有 systemd、Docker，`systemd-run --scope ... --` 前缀一律去掉直接运行；一次只跑一个测试文件。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。
- 不提交 git。
- 本仓库是公开仓库：代码、注释、报告里不得出现内部域名、IP、邮箱、人名、真实钥匙、沙箱主目录绝对路径。

# T-1263：同步公共注释里仍写「缺省即 Boat」的地方

## 背景
T-1252 把机器人云电脑后端的缺省值改成了 （以 T-1252 合并后的 main 为准）。T-1252 第 4 轮审核指出，公共类型注释还写着缺省是 Boat，和实际行为不符。

## 要改的（只改注释，不改任何代码行为）
1. 先确认当前 main 上 `cloudBackend` 缺省时实际落到哪个后端：看 `server/cloud-backend.ts` 的 `cloudKindOf` / `cloudPolicyKindOf` 以及 T-1252 引入的缺省逻辑。注释按实际行为写，不要照本说明猜。
2. `shared/wire.ts` 两处 `/** Which cloud computer backs computer: "cloud"; absent means Boat. */`（约 61 行 type CloudBackend 上方、约 326 行 cloudBackend 字段上方）改成与实际缺省一致的说法。
3. `shared/place-view.ts` 约 86–90 行、约 332 行描述云电脑来源/提供方的注释，如仍把 Boat 说成唯一或缺省来源，改成与现状一致（现有后端：、Boat、自有服务器 VPS）。
4. 用 `git grep -n -i "absent means boat\|defaults to boat\|default.*boat"` 在 shared/、server/、src/ 里再扫一遍同类过时注释，一并改；界面文案字符串（locales、place.view.* 文案）不在本任务范围，不改。

## 验收
- 只有注释变化：`git diff` 里没有任何非注释行改动。
- `pnpm exec tsc -p .`（或仓库现有的类型检查命令）通过。
