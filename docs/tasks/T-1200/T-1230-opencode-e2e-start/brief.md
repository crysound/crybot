## 运行环境（InstaBox 云沙箱，必读）
- 开工先在 worktree 根目录运行 `crybot-link-deps`（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1230 Cry Bot：OpenCode 服务商钥匙 e2e 取错启动记录

仓库 crybot，分支 T-1230-opencode-e2e-start（基于 main）。小任务。

## 现象
Actions run 43610835465：`server/opencode-provider-keys.e2e.test.ts` 第 201 行
`expected undefined to be 'venice-owner-…'`（savedEnv.VENICE_API_KEY 为空）。
T-1227 已把记录文件改为按 startId 命名（server/testing/opencode-provider-environment.ts），超时没了，但 `nextProviderEnvironment(beforeSave)` 取的是「保存前目录里没有的第一个新文件」。保存过程中/之前已经开始的 OpenCode 启动（比如模型列表刷新）也会产生新文件，它不带新钥匙，测试就拿错了。

## 要做
1. 记录里加启动时刻（例如 `startedAt: Date.now()` 或单调序号），测试在**保存接口返回之后**取时间点，只认这之后开始的启动。
2. 断言要更严，不能变松：保存后开始的启动至少有一个，且**每一个**都带 VENICE_API_KEY=新钥匙、Anthropic 环境正确、没有 OPENAI_API_KEY。不能改成「找到任意一个带钥匙的就行」。
3. 同文件里其他用 nextProviderEnvironment 的地方同样处理。
4. 只改测试与 server/testing/ 下的辅助文件，不改产品代码；如果分析后认为是产品缺陷（保存后启动的进程确实没拿到钥匙），停下在报告里说明证据，不要改测试去掩盖。

## 验证
- `pnpm exec vitest run server/testing/opencode-provider-environment.test.ts`
- 尝试 `pnpm exec vitest run server/opencode-provider-keys.e2e.test.ts`（沙箱不能监听端口就写明，以 Actions 为准）
- `pnpm exec tsc --noEmit -p tsconfig.server.json`

## 约束
不提交 git；报告追加到本任务 report.md（中文）。
