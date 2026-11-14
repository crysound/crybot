# T-1222-07 手表凭据合同：CF cookie 改为可选

## 依赖
- after：无；**必须在 T-1221-05 开工前合并**
- 估计：0.5 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-unified-login.md`。先读「合同」全部（尤其约束 2 的行数基线），再读第 4.5 节、第 5 节第 3 条。
- 建议分支名：`t1222-07-watch-contract`

## 目标
手表在服务器不经 Access（只有 Bearer）时也认为自己已登录并能正常请求。

## 背景
- T-1221 规定本期不动 `mobile/ios/Shared/`，T-1221-05 的任务说明也写了「不要改 Shared/**」。**本任务是这条规定的唯一例外**（协调者已在 T-1221 的任务说明里注明），所以必须在 T-1221-05 开工前合并，T-1221-05 只消费结果。
- `mobile/ios/Shared/WatchContract.swift`：`WatchCredentials{server, sessionToken, cfAuthorization, cfExpires}`，`isReady` 要求 `cfAuthorization`；请求头约 98–100 行同时带 Bearer 和 `CF_Authorization` cookie。
- 手表 App：`mobile/ios/CryBotWatch/APIClient.swift`；测试 `mobile/ios/CryBotWatchTests/APIClientTests.swift`。

## 要做的事
1. `cfAuthorization`、`cfExpires` 改为可选；解码旧数据（有这两个字段）和新数据（没有）都能成功；编码时没值就不写。
2. `isReady` 只要求 `server` 是 https 且 `sessionToken` 非空。
3. 请求头：有 `cfAuthorization` 时才加 cookie；`cfExpires` 只在有值时参与「快过期」判断。
4. 测试：新旧两种数据解码；只有 Bearer 时的请求头（无 Cookie 头）；有 CF cookie 时行为不变。
5. 改动尽量小：只动这几个字段和用到它们的地方，不重命名、不调整其他字段，减少和 T-1221 的冲突。

## 范围
- 可以改：`mobile/ios/Shared/WatchContract.swift`、`mobile/ios/CryBotWatch/**`、`mobile/ios/CryBotWatchTests/**`。
- 不要改：手机端 App、CryKit、`project.yml`、服务端。

## 验收标准
- [ ] Actions 上手表测试和构建绿。
- [ ] 新旧数据兼容有测试。
- [ ] 沙箱没有 Xcode：写清哪些只能等 Actions。

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
