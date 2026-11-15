## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1247：飞书代领令牌后续——broker 报错消息去网址、补齐不可见字符清洗

## 背景
T-1232（已合并 ea0c8b37）收紧了 broker 授权链接：`feishuAuthorizationUrl()` 只认与配置 `CRYBOT_FEISHU_AUTHORIZATION_URL` 同 origin 的链接。安全审查留下两条低风险项，本单一起收尾，另补两段漏掉的不可见字符。

## 要改的
1. **消息正文里的网址去掉**（`server/feishu-cli/wrapper.ts` 的 `brokerErrorMessage`）：broker 返回的 `message` 正文可能直接写钓鱼链接（如 `请访问 https://evil.example`），现在只去控制字符和限长，会进智能体上下文。清洗后把正文里的网址一律替换成占位符（如 `[链接已移除]`）：至少覆盖 `https?://\S+`，以及不带协议但形如 `www.` 开头的写法；大小写不敏感。授权链接只走 `feishuAuthorizationUrl()` 的结果单独附上，不受影响。
2. **不再靠切片剥离授权链接**（`server/feishu-cli/protocol.ts:19-25` 与 `wrapper.ts:35-37`）：`BrokerAuthorizationError` 增加一个只读字段保存不带链接的原始 message（例如 `brokerMessage`），`error.message` 的拼接保持不变（其他调用方可能依赖）；`brokerErrorMessage` 直接读这个字段，去掉 `slice(0, -authorizationUrl.length)`。
3. **补齐不可见字符**：清洗时额外去掉 U+061C（阿拉伯字母标记）、U+2060–U+2064（词连接符、不可见运算符）、U+FEFF（BOM/零宽不换行空格）、U+180E。现有 U+200B–200F、U+202A–202E、U+2066–2069、C0/DEL/C1 保持。把判定抽成 wrapper.ts 内一个小函数，别再往三元表达式里堆。
4. 顺序：先去不可见字符和压空白，再替换网址，再限长 300 码点（含省略号），空串回退「飞书代领服务不可用」——保证零宽字符插在网址中间（如 `ht​tps://evil.example`）时也能被识别并替换。

## 不改的
- `feishuAuthorizationUrl()` 的 origin 判定逻辑、`turn.ts` 的行为不变（turn.ts 若也输出 broker message，同样走新的清洗函数；先 grep 确认）。
- 不碰 server/sessions.ts 和 InstaBox 相关文件（另有任务在改）。

## 测试（补进 server/feishu-cli/wrapper.test.ts，必要时 protocol 测试）
- broker 401 带 `message: "请访问 https://evil.example/x 重新授权"` → stderr 不含 `evil.example`，含占位符。
- message 中 `ht​tps://evil.example`、`www.evil.example`、`HTTPS://EVIL.EXAMPLE` 均被替换。
- message 含 U+061C、U+2060、U+2063、U+FEFF → 输出中不含这些码点。
- `BrokerAuthorizationError` 的新字段等于原始 message；authorizationUrl 与 message 拼接格式改变时（构造一个 message 末尾不是链接的实例）包装器输出仍正确。
- 原有用例（配置与 broker 不同 origin 不带 broker 主机、同 origin 采用 broker 链接、配置无效不输出链接）保持通过。

## 验收
逐个文件跑并贴结果：server/feishu-cli/wrapper.test.ts、server/feishu-cli/turn.test.ts、server/feishu-cli 下其他 *.test.ts；需要端口的 e2e 能跑就跑。另跑 `pnpm exec tsc --noEmit -p .`。在 report.md 写本轮一节，只写实际改过的文件。
