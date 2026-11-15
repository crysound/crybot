# T-1232 跟进：飞书代领令牌的三处失败关闭加固

## 目标
「服务端代领飞书短期令牌」(PR #45，已上线)的安全审查留下两条低危意见，这次补上：同邮箱的非飞书会话不能借到令牌；展示给智能体的授权链接只认配置的主机；代领服务返回的错误消息进入智能体上下文前限长、去控制字符。

## 背景
- `server/sessions.ts` 的 `feishuUnionIdForPerson(person)`（约 820 行）：只在 `accessIdentity` 以 `feishu:` 开头的会话里，按 `personKey(session) === person` 找 union_id。`personKey`（`server/person-key.ts`）在会话有 email 时只按 email 哈希，`relayedPersonKey` 也按 email 生成同样的 key。所以一个**非飞书登录**、但 email 与名单用户相同的会话（或中继应用代发、带同 email 的消息）发起的轮次，也会被映射到该 union_id 并拿到短期令牌。
- `server/feishu-cli/turn.ts` 的 `validAuthorizationUrl`：只校验 https、长度、空白、控制字符；`BrokerAuthorizationError.authorizationUrl` 来自上游 broker，可以是任意主机。
- `server/feishu-cli/wrapper.ts` 约 32 行：`console.error(error.message)` 把 broker/上游给的消息原样输出到 stderr，会进入智能体上下文。
- 现有测试：`server/feishu-cli/turn.test.ts`、`server/feishu-cli/wrapper.test.ts`。

## 要做的事
1. `feishuUnionIdForPerson`：同一 person 只要存在任何一个**非飞书**会话（没有 `feishu:` accessIdentity 的、未过期的普通会话），就返回 `undefined`（失败关闭）。原有「多个不同 union_id 返回 undefined」保留。
2. 授权链接：broker 返回的 `authorizationUrl` 只有在 `CRYBOT_FEISHU_AUTHORIZATION_URL` 已配置且两者 `origin`（协议+主机+端口）一致时才采用；否则用配置值；配置值本身仍走原校验，不合法则不给链接。
3. 包装器输出 broker 错误消息：去掉控制字符（码点 ≤0x1f、0x7f、以及 0x80–0x9f），把换行等压成空格，限长 300 字符（超出截断并加「…」）；空消息回落到原来的「飞书代领服务不可用」。
4. 补测试（测行为）：
   - 同 email 一个飞书会话 + 一个非飞书会话 → `feishuUnionIdForPerson` 为 `undefined`；只有飞书会话时仍返回 union_id。
   - broker 给出别的主机的授权链接 → 提示里是配置的链接，不含别的主机；同 origin 的 → 采用 broker 的。
   - broker 错误消息含 `\u001b[31m`、换行、超长文本 → 包装器 stderr 无控制字符、不超长。

## 范围
- 可以改：`server/sessions.ts`、`server/feishu-cli/turn.ts`、`server/feishu-cli/wrapper.ts` 及对应的 `*.test.ts`、本任务的 `docs/tasks/` 文件夹。
- 不要改：其他文件。确需改时在汇报里说明，不要自己改。

## 验收标准
- [ ] `npx vitest run --maxWorkers=2 server/feishu-cli server/sessions` 通过（沙箱里 socket/e2e 跑不了的，在报告里列出命令和原因，以 Actions 为准）。
- [ ] 上面第 4 条的测试都存在且通过。
- [ ] `npx tsc --noEmit -p .`（或仓库现有的类型检查命令）无新增报错。

## 约束
- 不要 git 提交。本机 workspace-write 禁网；需要新依赖就在汇报里列出，不要自己装。
- 只写必要注释。测试像调用方那样调用、断言具体期望值。

## 汇报格式
报告追加到 `docs/tasks/T-1200/T-1232-broker-hardening/report.md`（`task-paths report T-1232-broker-hardening`），中文：改了哪些文件各一句话；怎么验证的（命令和结果）；需要协调者处理的事。
