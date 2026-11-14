# iOS 契约样本

样本由服务端验证夹具产生。`areas/` 下的每个 TypeScript 文件导出 `collect()`，脚本会自动收集它们，写入 `mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/`，并更新 `index.json`。当前 `manual.ts` 复用 CryCore 已有的隔离协议夹具，后续 area 可以直接抓取验证服务器的响应。

更新样本：

```sh
pnpm contract:ios --update
```

默认的 `pnpm contract:ios` 是比对模式；发现差异会列出文件并提示更新命令。样本不能手改，因为它们是服务端响应的稳定、归一化快照，手改会让服务端和 iOS 的契约失去同一来源。

归一化固定值如下：服务器地址为 `https://cry.example.com`，会话令牌为 `cry_sess_placeholder`，网页 cookie 名为 `cry_session_cookie_name`，UUID 使用 `00000000-0000-4000-8000-` 前缀。时间、端口、游标和标识也会归一化为稳定值。

覆盖表的状态含义：

- `done`：第一期已有原生消费者。
- `web`：由任务 48 的网页容器打开；登记时同时写 `route`。
- `todo`：仍由指定 iOS 任务负责；内嵌网页项先写任务 `48`，48 合并后由协调者改成 `web`。
- `skip`：第一期明确不做，必须写具体原因。

iOS 功能任务不改覆盖表，只在报告里列完成项。每周差异清单从规格基线 `0f44b8b6` 开始：

```sh
node scripts/ios-web-drift.mjs --since 0f44b8b6
```
