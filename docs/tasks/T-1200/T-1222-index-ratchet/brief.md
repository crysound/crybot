# T-1222-00 修 main 上 `server/index.ts` 行数棘轮

## 依赖
- after：无；排在本任务所有其他子任务之前
- 估计：0.5 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-unified-login.md`。先读「合同」全部（尤其约束 2 的行数基线），再读约束 2。
- 建议分支名：`t1222-00-index-ratchet`

## 目标
main 上 `scripts/testing/file-size-ratchet.test.ts` 恢复通过：`server/index.ts` 从 15562 行降到 ≤ 15515 行，**不调高上限**。

## 背景
- 棘轮：`scripts/testing/file-size-ratchet.test.ts` 第 19 行 `"server/index.ts": 15515`；计数是 `split("\n").length - 1`，和 `wc -l` 相同。
- 2026-11-14 main 上 `wc -l server/index.ts` = 15562，超 47 行（棘轮最后一次修改早于 index.ts 最后一次修改，所以是后来的提交把它撑破的）。
- 仓库已有大量「从 index.ts 拆出的模块」（`server/host/*.ts`、`server/routes/*.ts`，依赖通过 `deps` 对象注入），照这个写法拆。

## 要做的事
1. 先跑一次棘轮测试，确认现状（记下输出；如果别的文件也超限，只记录，不处理）。
2. 从 `index.ts` 里挑一段**内聚、和登录无关**的逻辑（纯函数组、一个独立路由组或一个 host 辅助），移到新模块（`server/host/` 或 `server/routes/` 下，命名照现有风格），`index.ts` 只留导入和调用。至少净减 47 行；建议多减一些（例如 80 行以上），给后面的任务留余量。
3. **不要动** `index.ts` 里约 12590–12840 行的请求前置处理段（公开探针、`desktopUpdateFiles`、`cfAccess`、`/auth/app-handoff`、配对、`resolveRequestAuth` 一带）：任务 01、02 要在那里挂载，规格按现有结构写的。
4. 行为不变：被移走的代码原样搬过去（只改必要的参数注入），不顺手重构。给新模块补一个小的行为测试（如果原来没测试覆盖）。
5. 不改棘轮文件里的任何数字。

## 范围
- 可以改：`server/index.ts`、新建的一个（最多两个）模块及其测试。
- 不要改：`scripts/testing/file-size-ratchet.test.ts`、登录相关文件（`server/cf-access.ts`、`server/request-auth.ts`、`server/sessions.ts`、`server/app-handoff.ts`）、`src/**`、`mobile/**`、`electron/**`。

## 验收标准
- [ ] `wc -l server/index.ts` ≤ 15515，汇报写出新行数。
- [ ] 棘轮测试中 `server/index.ts` 一项通过；被移走代码相关的现有测试全部通过。
- [ ] `tsc` 通过。
- [ ] 协调者推分支、开草稿 PR 后 CI 全绿（如果有与本任务无关的已有失败，协调者在报告里注明），尽快合并，作为后续任务的起点。

## 约束
- 不要 git 提交，不联网，不安装依赖。需要新依赖时在汇报里列出包名和版本，不要自己装（唯一已批准的例外见规格约束 5）。
- 公开仓库：代码、测试、夹具、注释、文档里只用 `example.com`、`cli_example` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 飞书 App Secret、授权 code、code_verifier、`cry_sess_`、JWT 不进日志、错误信息和任何返回给客户端的内容（规格约束 3、4）。union_id 可以进服务端日志。
- `server/index.ts` 行数棘轮（`scripts/testing/file-size-ratchet.test.ts`，上限 15515，口径同 `wc -l`）：开工时先记下 `wc -l server/index.ts` 作为起点；新逻辑放新模块，完工时行数不超过起点且不超过 15515。汇报里写「起点 → 完工」两个数字。
- vitest 用 `--maxWorkers=2`；重命令用 `systemd-run --scope -q -p MemoryMax=2G` 包住。
- 并行开发：只改「可以改」里的路径。确实要改别的，写进汇报，由协调者安排。
- 只写必要的注释，只解释代码看不出来的原因。测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-1200/<分支名>/report.md`（用 `task-paths report <分支名>` 计算）；各轮追加到同一文件，保留前轮内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 Actions 或真机验证。
3. `index.ts` 行数：起点 → 完工。
4. 需要协调者处理的事：依赖、超出范围的改动、没解决的问题、触发的停止条件。
