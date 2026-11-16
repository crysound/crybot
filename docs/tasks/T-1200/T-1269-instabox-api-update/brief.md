## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd、Docker，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；机器 8G/4 核，一次只跑一个测试文件。
- 若本轮沙箱已放开（能联网、能监听端口），交回前必须把改动相关的测试全部跑过，包括需要端口的 e2e；涉及的 e2e 连跑 3 次都要过。跑不了的写明原因。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。不要写长篇分析；完整输出放 verification 文本文件即可。
- 不提交 git。

# T-1269 改接口后启动报 400：建机字段和保持唤醒租约按新接口改

## 背景
线上用户点「启动 」报 `HTTP 400: unknown_field`。接口已更新，建机请求体不再接受未知字段。协调者已用不建机的方式核对过当前接口（接口文档即 的 openapi）：

1. `POST /v1/machines` 请求体不再有 `spec`。CPU 和内存是顶层字段：`vcpus`（整数）、`memMiB`（整数，单位 MiB）。`templateId`、`name`、`autoSuspendAfterSeconds`、`metadata` 仍然支持。请求体禁止额外字段。
2. 活动租约接口改了：
   - 旧：`POST /v1/machines/{id}/activity-leases`，body `{ durationSeconds }` 或 `{ leaseId, durationSeconds }`，服务端返回 id。现在这个路由返回 404 route not found。
   - 新：`PUT /v1/machines/{id}/activity-leases/{leaseID}`，body `{ ttlSeconds }`。leaseID 由客户端自己生成；同一个 PUT 既创建也续期，会先唤醒闲置挂起的机器。不需要 Idempotency-Key。
   - `DELETE /v1/machines/{id}/activity-leases/{leaseID}` 释放，幂等，不变。
3. 其他调用已核对，仍然兼容，不要改：`POST /v1/machines/{id}/desktop` 的 `{ action, width, height }`、`/start` `/resume` `/suspend`、`/exec`、`/files`、`/snapshots` 的 `{ name, description }`、`/restore` 的 `{ snapshotId, desiredState }`。

## 要改
1. server/instabox/machines.ts 建机请求：把 `spec: { vcpus: 4, memoryGiB: 8 }` 换成顶层 `vcpus: 4, memMiB: 8192`。其他字段不变。
2. server/instabox/computer-tools.ts 活动租约：
   - 获取时由客户端生成 leaseID（例如 `crybot-` 加 randomUUID），调用 `PUT /v1/machines/{machineId}/activity-leases/{encodeURIComponent(leaseID)}`，body `{ ttlSeconds: BACKGROUND_MAX_MS / 1000 }`。响应不 ok 时仍按现在的方式视为失败。
   - 续期用同一个 leaseID 再 PUT 一次，body 相同。
   - 释放保持 DELETE 同一路径。
   - 如果 ttlSeconds 有上限，接口文档没写；保持现有时长即可。
3. 更新相关测试和假接口夹具（server/instabox 下的 machines、computer-tools、wiring-backends-fixture 等）里断言 `spec`、`memoryGiB`、`POST .../activity-leases`、`durationSeconds` 的地方，改成新格式。再加一条回归断言：建机请求体里没有 `spec`，有 `vcpus: 4` 和 `memMiB: 8192`；租约走 PUT 带 ttlSeconds，续期和释放用同一个 leaseID。
4. 全仓搜一遍 `memoryGiB`、`spec:`、`activity-leases`、`durationSeconds`，确认没有别的 调用遗漏（Boat、VPS 的同名字段不要动）。

## 验收
- `server/instabox/` 下全部测试通过；改动过的其他测试文件通过。
- `pnpm exec tsc -p tsconfig.server.json` 通过；改动过的文件跑 `oxlint --deny-warnings`。
- report.md 和 verification.txt 放在本任务文件夹。verification.txt 只写命令和汇总结果（通过数、失败数），不贴原始输出。不写 IP、地址、域名、uuid、任何密钥。文件名不要用反引号单独包住带 md 后缀的写法。
- 测试临时目录用 os.tmpdir() 下新建的目录。
