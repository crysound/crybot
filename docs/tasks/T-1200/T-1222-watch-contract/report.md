## 第 1 轮（2026-11-14）：CF cookie 可选

### 1. 文件改动

- `mobile/ios/Shared/WatchContract.swift`：将 `cfAuthorization` 改为可选，保留已可选的 `cfExpires`，同步 context 缺省兼容且编码省略无值字段，`isReady` 改为有效 HTTPS 地址加非空令牌，缺少 Access cookie 时保存 nil，仅有 CF 凭据时附加 Cookie 请求头。
- `mobile/ios/CryBotWatchTests/WatchContractTests.swift`：新增旧 JSON、新 JSON（字段缺失或 null）、新旧同步 context 的解码及编码行为测试，验证非空令牌无需特定前缀、空令牌及非 HTTPS 地址不可用，并更新无 Access cookie 的登录预期。
- `mobile/ios/CryBotWatchTests/APIClientTests.swift`：新增通过隔离 URLProtocol 调用真实 APIClient 的 Bearer-only 请求测试，断言无 Cookie/Origin、Bearer 与 Accept 正确且能解析返回结果；保留原有双凭据请求测试。
- 本报告：按实际分支 `T-1222-watch-contract` 追加交付记录；原有 `brief.md` 未改。

`cfExpires` 在 `Session.swift` 的初始化、获取凭据、接收同步三处均已通过可选绑定或 map 判断，仅有值时影响过期状态，因此无需修改。`APIClient.swift` 已统一消费共享请求头，无需修改。未改手机端 App、CryKit、工程配置或服务端，未重命名字段。

### 2. 验证命令与结果

已执行：

- `PYTHONDONTWRITEBYTECODE=1 /root/workspace/claude-setup/bin/task-paths report T-1222-watch-contract`：输出 `docs/tasks/T-1200/T-1222-watch-contract/report.md`。
- `git diff --check`：通过。
- `git diff --stat`、`git diff -- <上述三个 Swift 文件>`：人工检查差异；代码改动仅在授权的三个 Swift 文件内。
- `python3` 静态检查：用 `git diff --name-only` 检查代码路径白名单；对比 `server/index.ts` 与 `git show HEAD:server/index.ts` 的完整字节；统计换行并断言不超过基线和上限。全部通过，服务端文件未变化。
- `wc -l server/index.ts`：开工为 15460 行，完工为 15460 行。
- `command -v swift swiftc xcodebuild xcodegen` 及 Python `shutil.which`：均不可用；本地 `node_modules/.bin/vitest` 也不存在。未安装依赖、未运行 vitest，也没有把静态检查当作 Swift 测试通过。

待 Actions（沙箱无 Swift/Xcode，且本任务禁止联网，尚未执行或查询结果）：

在 `mobile/ios` 下，现有 `.github/workflows/mobile.yml` 已包含以下流程，无需改工程或 CI：

```sh
xcodegen generate
xcodebuild -scheme CryBot -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData/iOS build CODE_SIGNING_ALLOWED=NO
xcodebuild -scheme CryBotWatch -configuration Debug -destination 'generic/platform=watchOS Simulator' -derivedDataPath DerivedData/Watch build CODE_SIGNING_ALLOWED=NO
xcodebuild -scheme CryBotWatchTests -configuration Debug -destination "platform=iOS Simulator,id=$CRYBOT_TEST_SIMULATOR" -derivedDataPath DerivedData/Tests -resultBundlePath DerivedData/WatchTests.xcresult -parallel-testing-enabled NO test CODE_SIGNING_ALLOWED=NO
```

`CRYBOT_TEST_SIMULATOR` 由现有 Actions 的模拟器选择步骤设置。需确认整个测试套件、手表构建和嵌入手表的 iOS 构建均绿。新增 API 测试使用现有 FixtureProtocol 返回虚构响应，不访问真实网络或用户数据。

真机待验证：T-1221-05 接入后，用隔离测试账号在预览环境分别同步仅 Bearer 与带 CF cookie 的凭据，确认手表登录、列表请求、重启后钥匙串恢复及有 CF 过期时间时的原有过期行为。

仓库中的 `docs/verification/README.md` 不存在（读取返回 No such file or directory）。本轮未改服务端或会话交互逻辑，未启动服务、未访问真实应用或数据；Swift 隔离测试也因工具链缺失未能启动，不宣称运行验证已通过。

### 3. index.ts 行数

**15460 → 15460**，未超过起点，也未超过 15515 行上限。

### 4. 需要协调者处理

- 提交/推送后等待 Actions 的测试及构建通过，并在 **T-1221-05 开工前合并本任务**；本轮遵守要求，未 git 提交、未联网、未合并。
- 无新增依赖，无需要安排的范围外代码改动，无触发规格中的停止条件。
- 尚未解决的验收项：Actions 绿及后续真机同步验证；代码和兼容测试已补齐，但当前环境不能给出 Swift 执行结果。
- 请确认或补齐仓库引用的 `docs/verification/README.md`；本轮未越界创建该文件。
