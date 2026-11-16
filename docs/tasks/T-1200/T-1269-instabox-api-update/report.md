改了什么：

- docs/tasks/T-1200/T-1269-instabox-api-update/report.md
- docs/tasks/T-1200/T-1269-instabox-api-update/verification.txt
- server/instabox/computer-tools.e2e.test.ts
- server/instabox/computer-tools.ts
- server/instabox/machines.test.ts
- server/instabox/machines.ts
- server/testing/fake-instabox-core.ts
- server/testing/fake-instabox-tools.ts

建机改为顶层 vcpus: 4、memMiB: 8192；租约由客户端生成 ID，创建与续期共用 PUT 和 ttlSeconds: 7200，释放使用同一 ID 的 DELETE。夹具严格校验新字段；回归覆盖空响应、共用租约、释放与拒绝后重试。

为什么：修复建机旧字段导致的 HTTP 400，以及旧租约路由失效导致的保活失败。全仓搜索已核对，旧格式只留在历史任务文档；wiring-backends-fixture 只模拟 Boat/VPS，无需修改。

测试命令与结果摘要：

- 依赖准备脚本：通过。
- TMPDIR=/tmp pnpm exec vitest run <测试文件> --maxWorkers=1：逐文件运行，16 个文件共 179 项通过、0 失败、0 跳过；8 个 e2e 最终各连续三轮通过，验收合计 401 项次通过。VNC 验证另外设置 CRYBOT_CDP_CHROME=/usr/bin/chromium，已补齐默认路径未配置时跳过的浏览器用例。
- pnpm exec tsc -p tsconfig.server.json：通过。
- pnpm exec oxlint --deny-warnings <上述六个 TypeScript 文件>：最终通过，0 警告；初次发现的夹具请求警告已修复。
- git diff --check：通过。逐文件命令和计数见 [verification.txt](verification.txt)。

验证说明文件 docs/verification/README.md 在当前仓库缺失；实际使用现有隔离 HTTP、服务端和浏览器 fixture。测试临时目录通过 os.tmpdir() 新建，设置 TMPDIR=/tmp 以符合模拟远端路径限制。未提交 git。
