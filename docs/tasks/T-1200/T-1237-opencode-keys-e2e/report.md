# T-1237 OpenCode provider key e2e 回归报告

## 根因

产品环境传递链路没有丢掉 `VENICE_API_KEY`。保存路由把 key 写进 `cfg.opencodeGo.providerKeys`，`server/config.ts` 的 `instanceConfigs` 注入 OpenCode 实例；`server/drivers/acp/core.ts:334-348` 合并实例环境、剥离控制面变量，再在 `core.ts:354` 和 `core.ts:605` 用 `instanceEnvNames` 把实例实际提供的 key 加入探测和 OpenCode ACP 进程的 box `allowEnv`。`server/credential-env.ts:49-53` 新增的规则只剥离 `CRYBOT_FEISHU_*`、`LARKSUITE_CLI_*`、`MEEGLE_*` 及控制面变量；它不会匹配 `VENICE_API_KEY`。`server/bot-box/env.ts:66-71` 仍允许被该 spawn 明确授予的任意非 `CRYBOT_` 名称。

回归来自 e2e 夹具的启动竞态，位置在原 `server/opencode-provider-keys.e2e.test.ts:199-207`。OpenCode 初始 catalog 在 `createAcpDriver` 创建期间异步启动多个探测进程；测试在看到第一条初始环境记录后立即保存配置，并把当时已存在的文件名作为 `beforeSave`。因此，仍在保存前排队、却在保存时间点之后才启动并落盘的旧探测进程被 `nextProviderEnvironment(savedAt, beforeSave)` 当作保存后的进程检查。这类进程当然没有刚保存的 Venice key，触发第 210 行的 `undefined`。T-1232 在 `server/index.ts:747-748` 增加启动时的 `feishuCliUser(process.env, console.warn)` 检查，改变了启动时序，使这个原有竞态在 CI 上稳定暴露；它没有改变 provider key 的环境链路。

## 修法

在 e2e 保存前先请求一次 fresh instances，使初始 catalog 探测完成，再由 `waitForProviderStartsToSettle` 等待环境记录数量稳定 1 秒后建立 `beforeSave` 基线。保存后的断言、删除后的断言和 key 的语义均未改变。

新增 `server/bot-box/env.test.ts` 单测：先用 `stripControlPlaneEnv` 清理继承的飞书/Lark/MEEGLE 变量，再用该 spawn 的 allow-list 验证保存的 `VENICE_API_KEY` 仍进入提供方环境。该测试锁住了安全约束和 provider key 传递行为。

## 验证

依赖使用 worktree 的本地 node_modules 链接；没有安装依赖、联网或访问 live app/data。`docs/verification/README.md` 在本检出中不存在。

通过：

```text
$ pnpm exec vitest run server/bot-box/env.test.ts
 Test Files  1 passed (1)
 Tests  11 passed (11)

$ pnpm exec vitest run server/feishu-cli/turn.test.ts
 Test Files  1 passed (1)
 Tests  26 passed (26)

$ pnpm exec vitest run server/feishu-cli/wrapper.test.ts
 Test Files  1 passed (1)
 Tests  12 passed (12)

$ pnpm exec vitest run server/feishu-cli/server.e2e.test.ts
 Test Files  1 passed (1)
 Tests  2 skipped (2)

$ pnpm exec vitest run server/credential-env.test.ts
 Test Files  1 passed (1)
 Tests  2 passed (2)

$ pnpm exec vitest run server/testing/opencode-provider-environment.test.ts
 Test Files  1 passed (1)
 Tests  2 passed (2)

$ pnpm exec vitest run server/config.test.ts -t 'hands the saved provider keys|skips a hand-edited'
 Test Files  1 passed (1)
 Tests  2 passed | 254 skipped (256)

$ pnpm exec tsc -p tsconfig.server.json
 EXIT:0

$ pnpm exec oxlint --deny-warnings server/opencode-provider-keys.e2e.test.ts server/bot-box/env.test.ts
 exit 0

$ git diff --check
 exit 0
```

沙箱不能监听端口，OpenCode e2e 的真实输出结尾为：

```text
 FAIL  server/opencode-provider-keys.e2e.test.ts [ server/opencode-provider-keys.e2e.test.ts ]
 Error: listen EPERM: operation not permitted 127.0.0.1
 Tests  2 skipped (2)
```

因此该命令只验证到 `beforeAll`，没有在沙箱内宣称业务断言通过；需要在 GitHub Actions 的 vitest (1) 分片确认。
