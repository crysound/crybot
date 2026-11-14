# T-1221-scan-followups 报告

## 第 1 轮（Astra）

已完成三处修复、回归用例和 README 更新，仅改动允许范围内的 4 个文件。

- 七种媒体扩展名静默跳过内容；gitlink 按 `160000` 识别，保留路径检查及其他 Git 错误。
- 原始 NUL 已替换为等价 `\0`，未添加豁免；工作区及临时提交 HEAD 均确认 NUL 为 0。
- 测试沿用实际入口 `scan.node-test.mjs`。命令退出 0，但逐项结果为 **1 通过、37 因沙箱 EPERM 跳过**，不能宣称全量通过。
- 独立临时 Git 夹具验证上述新增场景全部通过；最终补丁的临时提交自检输出 `Public scan passed`。
- memory-store Vitest 因缺少依赖无法启动，未安装依赖；`git diff --check` 通过。

改动尚未提交，当前分支 HEAD 尚未更新。协调者提交、推送并开草稿 PR 后，仍需确认 `Public scan`、`check` 和相关 Vitest 分片结果。

## 协调者验证与审核

- 沙箱外 `node --test scripts/public-scan/scan.node-test.mjs`：38/38 通过（说明里写的 scan.test.mjs 实际文件名为 scan.node-test.mjs）。
- `vitest run server/memory-store.test.ts`：45 通过、1 跳过（main 上原本就跳过）；文件 NUL 计数 0，改动为原始 NUL 换成等价 `\0`。
- 第 1 轮审核：PASS，无必改；子模块只认 diff 头 mode 160000，其他 git 读取错误仍退出码 2；跳过的文件仍做路径检查。
- 待确认：推分支后 Public scan、check、vitest 分片与 main 一致或更好。
