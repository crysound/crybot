改了什么：

- docs/tasks/T-1200/T-1271-lease-ttl/report.md
- docs/tasks/T-1200/T-1271-lease-ttl/verification.txt
- server/instabox/computer-tools.e2e.test.ts
- server/instabox/computer-tools.ts
- server/testing/fake-instabox-tools.ts

为什么：

活动租约使用接口允许的最大时长 3600 秒，后台任务总时长仍由 2 小时的过期定时器控制。假接口现在拒绝超出 30–3600 秒范围的 TTL；测试覆盖首次 PUT、30 分钟续期 PUT 和超上限请求。

测试命令与结果摘要：

- 依赖准备脚本：通过。
- server/instabox 下 8 个非 e2e 测试文件：逐文件通过，共 68 项。
- server/instabox 下 8 个 e2e 测试文件：逐文件连续三轮通过，共 339 项次；VNC 使用显式 Chromium 路径，三轮均 32 项通过。
- pnpm exec tsc -p tsconfig.server.json：通过。
- pnpm exec oxlint --deny-warnings server/instabox/computer-tools.ts server/instabox/computer-tools.e2e.test.ts server/testing/fake-instabox-tools.ts：通过，0 警告。
- git diff --check：通过。

未提交 git。
