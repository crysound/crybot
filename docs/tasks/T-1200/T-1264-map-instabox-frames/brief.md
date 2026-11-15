## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec tsc` 才可用。
- 这里没有 systemd、Docker，`systemd-run --scope ... --` 前缀一律去掉直接运行；一次只跑一个测试文件。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。
- 不提交 git。
- 本仓库是公开仓库：代码、注释、报告里不得出现内部域名、IP、邮箱、人名、真实钥匙、沙箱主目录绝对路径。

# T-1264：团队地图把 智能体算成地图电脑，但画面接口只查 Boat，出现空电脑卡

## 背景
以 T-1252 合并后的 main 为准（T-1252 把云电脑缺省后端改为 ，并改了 `src/components/TeamMapPage.tsx`）。
T-1252 第 5 轮审核指出两处不一致：
- 前端 `src/components/TeamMapPage.tsx` 约 290 行 `anyComputer`：只排除了 `box`/`vps`，于是用 （含 cloudBackend 缺省、现在缺省即 ）的智能体会让地图认为「有电脑」，打开电脑显示。
- 服务端 `server/routes/computer-frames.ts` 的 `mapComputers`（约 33 行）把 `cloudBackend !== "vps"` 且 `computer === "cloud"` 的智能体都列成地图电脑；而画面来源 `createComputerFrames` 的 `listMachines`/`capture` 只查 Boat。结果 智能体在地图上是一张永远没画面的空电脑卡。

## 要改的
目标：地图上列出的电脑必须都有画面来源；没有画面来源的后端不列。
1. 先读懂当前（T-1252 后）`cloudKindOf` / `cloudPolicyKindOf`（`server/cloud-backend.ts`）里「智能体实际用哪个后端」的判定，前后端都用同一套判定，不要各写一份字符串比较。前端如需同样判定，放在 shared/ 里的纯函数中复用。
2. 服务端 `mapComputers`：只列实际后端是 Boat 的智能体自有电脑；团队共用电脑（kind: "team"）保持现状不动。
3. 前端 `anyComputer`：与服务端同口径，只在存在 Boat 智能体（或已有团队共用电脑，若 T-1252 后仍有此概念）时为真。
4. 不要给 加画面轮询（会把挂起的沙箱唤醒、产生费用），本任务只做排除。
5. 补测试：`server/routes/computer-frames` 相关单测里加用例——（显式与缺省两种）智能体不出现在 `mapComputers` 结果里，Boat 智能体照常出现；前端判定若抽成 shared 纯函数，给它补单测。

## 验收
- 智能体（cloudBackend 缺省或显式 ）不再出现在 `/api/computers/frames` 的 computers 里，也不会单独让地图打开电脑显示。
- Boat 智能体与团队共用电脑行为不变，原有相关测试全部通过。
- `pnpm exec tsc -p .`（或仓库现有类型检查命令）通过；只跑改动相关的测试文件。
