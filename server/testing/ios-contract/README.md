# iOS 契约样本

样本仅来自服务端类型化夹具和隔离服务的实测响应。`fixtures.ts` 的每条消息、字段变体、卡片、节点、图形、帧和 RuntimeEvent 都用服务端类型 `satisfies` 检查。`areas/typed.ts` 收集这些字面量；`areas/live.ts` 启动 `launchVerificationServer`，配合仓库假引擎，通过配对取得真实 Bearer 会话，抓取 API 和 SSE，再关闭隔离实例。不会读取 CryCore 手写 JSON 或连接用户应用。

```sh
pnpm contract:ios --update
pnpm contract:ios
```

两个命令都先运行 `tsconfig.ios-contract.json` 类型检查。默认模式生成临时目录并比对新增、缺失和内容不同的文件；失败时打印差异文件和更新命令。类型检查失败会打印 TS 诊断及能定位的受影响样本路径。样本不能手改，更新必须经过相同的生成链路。

端口被禁止的环境可显式用 `--typed-only --update` 生成类型化子集，再用 `--typed-only` 比对子集。这不是完整验收，也不会伪造、缓存或静默跳过实测。完整命令仍会尝试启动隔离服务并报错；完整样本须在允许监听的环境重新生成并复核。CI 不使用这个选项。

扩展 area：在 `areas/` 新建 `.ts` 文件，导出 `collect(): ContractSample[] | Promise<ContractSample[]>`（类型在 `fixtures.ts`）。`typed.ts` 是同步示例，`live.ts` 是异步示例，无需修改主脚本。`swiftType` 使用 CryCore 的 18 项注册表；未注册的类型会打印名字与样本名，暂不加入 index。

归一化：地址统一为 `https://cry.example.com`（包括 http），令牌为 `cry_sess_placeholder`，cookie 名为 `cry_session_cookie_name`，JWT 为 `jwt_placeholder`。UUID 和其他 ID 按出现顺序映射到 `00000000-0000-4000-8000-` 前缀的不同值，保留引用及 map 键。毫秒时间为 `1767225600000`，ISO 时间为 `2026-01-01T00:00:00.000Z`，端口为 `443`，cursor 为 `cursor-0` 等。邮箱用 `person@example.com`，裸 IPv4 用 `cry.example.com`；环境 label 用 `Example device`，本机主机名用 `fixture-host`。绝对本地路径用 `/fixture/path`，耗时毫秒用 `1000`。对象键按 Unicode 码点排序，2 空格缩进，末尾换行。

覆盖表四种状态：

- `done`：协议层已支持，包括 LiveState 已归并但第一期无原生消费者的帧。
- `web`：任务 48 已提供网页容器入口，必须登记 `route`。
- `todo`：由指定保留任务负责；网页项先登记 `48`，48 合并后由协调者改成 `web`。
- `skip`：第一期明确不做，必须写具体原因。

iOS 功能任务不改覆盖表，只在报告列完成项。所有联合类型和字段用字面量 `satisfies Record` 穷尽检查；设置页和面板页直接 import 网页联合类型。widget 的服务端类型仍为 string，新加节点要靠 vitest 拦，tsc 拦不住；测试双向检查手写表及样本和 `WIDGET_NODE_TYPES`。

每周差异清单（接受提交号、引用及 `~`/`^` 后缀，拒绝选项形式的输入）：

```sh
node scripts/ios-web-drift.mjs --since 0f44b8b6
```
