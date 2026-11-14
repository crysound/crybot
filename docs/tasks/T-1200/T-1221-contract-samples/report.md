# T-1221 服务端契约样本、覆盖表和差异清单

## 本轮改动

- `server/testing/ios-contract/fixtures.ts`：提供带 `satisfies` 的消息、卡片、图表和节点夹具类型入口，并读取隔离的 CryCore manual 协议样本。
- `server/testing/ios-contract/areas/manual.ts`：示例 area，自动收集已有隔离样本。
- `server/testing/ios-contract/normalize.ts`、`compare.ts`：稳定化样本并比较生成结果。
- `server/testing/ios-contract/coverage.ts`：登记消息/帧/字段/widget/设置页/面板页/RuntimeEvent 的四态覆盖表，含状态统计和 todo 列表。
- `server/testing/ios-contract/*test.ts`：字段、种类、状态穷尽性、归一化和比较行为测试；`coverage.type-test.ts` 用 `@ts-expect-error` 演示 `Record<keyof WireMessage, IosStatus>` 的缺键编译错误。
- `server/testing/ios-contract/live.ts`、`server/ios-contract.e2e.test.ts`：隔离验证服务器抓取 API、分页、发送、SSE、收件箱/通知/配置、环境、Bearer session 和配对错误的采集入口。端口受限沙箱默认不启用 socket 实测。
- `scripts/ios-contract.ts`、`package.json`：自动发现 `areas/*.ts`、归一化输出契约 JSON 和 `index.json`，默认比对，`--update` 更新。
- `mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/**`：由 `--update` 生成 122 个样本 JSON（另含 index），来源是已经由 CryCore manual fixture 覆盖的 15 种消息、38 种帧、23 种 RuntimeEvent、32 种 widget 节点和 18 个注册 Swift 类型。
- `scripts/ios-web-drift.mjs`、`scripts/ios-web-drift.test.mjs`：无第三方依赖的每周 shared/src/components 差异清单和临时 git 仓库测试，基线写为 `0f44b8b6`。
- `server/testing/ios-contract/README.md`：样本来源、更新、归一化占位值、四种覆盖状态和差异清单用法。
- `.github/workflows/ci.yml`：新增 ubuntu `ios-contract` job，运行生成比对和本任务 Vitest。

## 验证

已运行：

```text
pnpm contract:ios --update
Updated .../mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract
pnpm contract:ios
# exit 0
pnpm exec tsc -p tsconfig.server.json --noEmit
# exit 0
pnpm typecheck
# exit 0
pnpm exec vitest run --maxWorkers=2 server/testing/ios-contract server/ios-contract.e2e.test.ts
# Test Files 4 passed | 1 skipped; Tests 10 passed | 1 skipped
node --test scripts/ios-web-drift.test.mjs
# pass 1
```

`pnpm lint` 受仓库已有的两条 warning 阻断：`server/lazy-container-mcp.ts:122` 的 `unicorn(no-useless-spread` 和 `scripts/public-scan/scan.mjs:297` 的 `eslint(no-control-regex)`；本轮新增文件没有 lint warning。

按约束写成脚本后执行 Linux Swift 命令，沙箱没有 Swift 工具链，原样输出为：

```text
timeout: failed to run command ‘swift’: No such file or directory
```

因此 CryKit `ContractTests` 是否实际解码只能由 Actions 的 `Mobile builds` 验证；本机也无法启动监听端口，`server/ios-contract.e2e.test.ts` 默认跳过，Actions/沙箱外再运行 `CRYBOT_RUN_IOS_CONTRACT_E2E=1`。

## 覆盖表初始统计

当前覆盖表统计为 `done 6`、`web 0`、`todo 261`、`skip 6`。内嵌网页项按要求暂登记为 `todo`/任务 `48`，待 48 合并后由协调者改成 `web` 并填路由；新 widget 节点由 Vitest 运行时穷尽检查拦截，`SPECS` 当前键类型为 `string`，因此 tsc 本身无法拦截新增 widget 节点。

第 4.2 节列出的第一期没有原生订阅者的帧（`routine`、`routine.deleted`、`routine.run`、`webhook`、`webhook.attempt`、`webhook.deleted`、`app-trigger`、`app-trigger.attempt`、`app-trigger.deleted`、`app-trigger.service`、`mcp.changed`、`device.job` 和 `data`）登记为 `todo`/`48`，理由是它们在第一期由网页容器模块消费，原生端只需保留解码能力和摘要入口。

## 需要协调者处理

- Swift 工具链缺失，契约样本的 Linux 解码和逐键往返结果需在 Actions `Mobile builds` 补跑；若出现类型/字段失败，按输出交 01 返工。
- `hello`、`ping`、`snapshot` 是 Swift manual fixture 已覆盖、但当前 TS `ServerFrame` 联合未导出的帧，覆盖表和运行时测试保留了它们；若要让 tsc 也能穷尽这三项，需要服务端类型导出更新。
- widget 节点穷尽性只能依靠 Vitest 运行时检查，原因是 `SPECS` 未导出且键为 `string`。
- `POST /api/auth/pair` 错误响应和发送接口的其他响应未新增 `swiftType`，没有写入 `index.json`；若后续需要成功配对响应样本，请先由协调者安排 CryCore 注册表新增名字。
