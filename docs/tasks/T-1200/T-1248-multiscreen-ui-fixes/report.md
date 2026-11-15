第 1 轮：排队状态、多屏文案、侧栏中文和设置更新权限修复已在当前沙箱基线中，开工时工作区干净。原验证输出保留在 verification.txt；本轮结果见下。

## 第 2 轮

改了什么（本轮文件清单与 git status 一致）：

- `docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/brief.md`
- `docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/r2.md`
- `docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/report.md`
- `docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/verification.txt`
- `src/components/remote-desktop-panel.tsx`
- `src/components/remote-desktop-panel.screen.test.ts`

为什么：面板未取得屏号时每 4 秒查询现有状态接口，取得屏号或卸载后停止，避免 busy 始终为 true 时副标题停留在「私有桌面」。新增 4 个回归用例，覆盖分配到第 2 块屏、停止轮询、关闭时取消请求、慢请求及失败重试。brief.md 和 r2.md 的域名误报字段引用改为自然语言；重写旧扫描结果，并按实际工作区更新文件清单。未提交 git。

测试命令与结果摘要：

- `pnpm exec vitest run <单个文件> --maxWorkers=1`：远程桌面 test、open、focus、screen 四个文件逐一通过，共 25 个用例。
- `pnpm exec vitest run server/local-vm-screens.e2e.test.ts --maxWorkers=1`：使用隔离临时数据和 Docker 替身，连续 3 次通过，每次 13 个用例。
- `pnpm exec tsc -b`：通过。
- `pnpm exec oxlint --deny-warnings src/components/remote-desktop-panel.tsx src/components/remote-desktop-panel.screen.test.ts`：通过，零警告、零错误。
- `scanDiff`：扫描 HEAD 至工作区全部差异、全部未跟踪文件，并额外扫描四份任务文档及新测试全文，零命中；实际有 1 个未跟踪文件。未配置名单密钥，denylist 检查按工具规则跳过。完整可复现命令见 verification.txt。
- `git diff --check`：通过。
- 完整命令与输出见 [verification.txt](verification.txt)。


## 第 3 轮

改了什么：`src/components/remote-desktop-panel.tsx`、`src/components/remote-desktop-panel.screen.test.ts`、`docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/report.md`、`docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/verification.txt`。未提交 git。

为什么：首次查询仍为普通请求；仅在收到 409 且错误为 `screen_not_assigned` 时每 4 秒后台重试，避免轮询阻止云端休眠或唤醒实例；200（含单屏无屏号）及其他错误均停止重试。排队夹具使用真实错误协议，验证 busy 始终为 true 时副标题变为「第 2 块屏」、所有重试带后台标记、单屏只查询一次及其他错误停止重试。

测试命令与结果摘要：

- `pnpm exec vitest run <单个文件> --maxWorkers=1`：remote-desktop-panel 的 test、open、focus、screen 四个文件逐一通过，共 28 个用例；api-background 与 cloud-power 两个文件逐一通过，共 8 个用例。
- `pnpm exec vitest run server/local-vm-screens.e2e.test.ts --maxWorkers=1`：临时目录隔离夹具及 Docker 替身，连续 3 次通过，每次 13 个用例。
- `pnpm exec tsc -b`：通过。
- `pnpm exec oxlint --deny-warnings src/components/remote-desktop-panel.tsx src/components/remote-desktop-panel.screen.test.ts`：通过，零警告、零错误。
- 公开扫描 `scanDiff` 覆盖 HEAD 至工作区全部差异及全部未跟踪文件，零命中；未配置名单密钥，denylist 按工具规则跳过。`git diff --check` 通过。
- 完整命令与输出追加于 [verification.txt](verification.txt)。引用的验证 README 在当前检出中缺失；实际 e2e 使用独立数据与子服务，未访问用户运行中的应用。

## 第 4 轮

改了什么（本轮文件清单与 git status 一致）：

- `docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/report.md`
- `docs/tasks/T-1200/T-1248-multiscreen-ui-fixes/verification.txt`
- `mobile/ios/CryBot/Strings/ServerText.xcstrings`
- `server/incidents.ts`
- `shared/thread-titles.ts`
- `shared/wire.ts`
- `src/lib/task-title.ts`

为什么：重新生成过期的 iOS ServerText 文案；将事故线程标题常量移到 `shared/thread-titles.ts`，让 `shared/wire.ts` 回到 1000 行并更新引用。

测试命令与结果摘要：

- `node mobile/ios/scripts/gen-strings.mjs --check`：通过。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts --maxWorkers=1`：1 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `node --test mobile/ios/scripts/gen-strings.test.mjs`：8 个测试通过。
- `pnpm exec vitest run <server/incidents.test.ts、SidebarThreadRow.shared-chat.test.ts、words.test.ts、server-lines.test.ts> --maxWorkers=1`：四个文件逐一通过，共 26 个测试。
- `pnpm exec oxlint --deny-warnings server/incidents.ts shared/thread-titles.ts src/lib/task-title.ts shared/wire.ts`、`git diff --check`：通过。
- 公开扫描 HEAD 至工作区差异及未跟踪文件：0 命中。

完整输出见 [verification.txt](verification.txt)。
