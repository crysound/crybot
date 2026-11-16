## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1271 活动租约时长超过接口上限，PUT 返回 400

## 背景
T-1269 已把活动租约改成 `PUT /v1/machines/{id}/activity-leases/{leaseID}`，body `{ ttlSeconds }`。线上实测这个 PUT 返回 400：接口文档写明 ttlSeconds 范围是 30–3600 秒，而 server/instabox/computer-tools.ts 发的是 `BACKGROUND_MAX_MS / 1000`，等于 7200。

## 要改
1. 租约的 ttlSeconds 单独定一个常量，取 3600，即接口上限。不要改 BACKGROUND_MAX_MS 本身：后台任务的总时长上限仍是 2 小时，由现有的 expiry 定时器负责。
2. 续期间隔现在是 30 分钟，小于 3600 秒，保持不变。确认在 2 小时内，租约会一直被续上，不会中途过期。
3. 测试：
   - 更新 computer-tools.e2e.test.ts 和假接口里断言 ttlSeconds 的地方。
   - 假接口对 ttlSeconds 超过 3600 的请求返回 400，和真接口一致。
   - 加一条断言：首次 PUT 和续期 PUT 的 ttlSeconds 都等于 3600。

## 验收
- server/instabox 下全部测试通过；`pnpm exec tsc -p tsconfig.server.json` 通过；改动的文件过 `oxlint --deny-warnings`。
- report.md 和 verification.txt 放在本任务文件夹。verification.txt 只写命令和汇总结果。
- 不写 IP、地址、域名、uuid、任何密钥。文件名不要用反引号单独包住带 md 后缀的写法。
