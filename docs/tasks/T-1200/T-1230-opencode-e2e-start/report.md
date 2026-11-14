# T-1230 OpenCode 启动记录验证报告

2026-11-14。未提交 git、未推送、未安装新依赖。

## 修改

- `server/testing/opencode-provider-environment.ts` 的每条 ACP 环境记录增加 `startedAt` 启动时刻。
- `server/opencode-provider-keys.e2e.test.ts` 在保存和删除配置接口返回后记录时间点，只收集该时间点之后启动的记录；每次操作至少要求一条记录，并逐条检查 Venice key、Anthropic 环境和缺少 `OPENAI_API_KEY`。
- `server/testing/opencode-provider-environment.test.ts` 更新记录结构断言，覆盖 `startedAt`。

没有修改产品代码。当前证据不足以认定保存后启动的 OpenCode 进程缺少钥匙；沙箱无法进入该 e2e 的业务断言。

## 验证

工作区根目录已运行 `crybot-link-deps`。

| 命令 | 结果 |
| --- | --- |
| `pnpm exec vitest run server/testing/opencode-provider-environment.test.ts` | 2/2 通过 |
| `pnpm exec vitest run server/opencode-provider-keys.e2e.test.ts` | `beforeAll` 因沙箱禁止监听 `127.0.0.1`（`listen EPERM`）失败，2 项跳过；以 Actions 为准 |
| `pnpm exec tsc --noEmit -p tsconfig.server.json` | 通过 |
| `git diff --check` | 通过 |

`docs/verification/README.md` 在本检出中不存在；验证使用了测试自身的临时 HOME、数据目录和 fixture，没有访问用户 live app 或数据。
