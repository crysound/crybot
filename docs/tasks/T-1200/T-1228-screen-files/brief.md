## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行依赖准备脚本（镜像自带，把预装依赖链进 node_modules）。
- 这里**没有** systemd、没有 Docker；本机 8G/4 核；不能监听 TCP 端口；vitest 一次只跑一个文件。

# T-1228 多屏云电脑 子任务 F：T-1228-screen-files

台账 T-1228，仓库 crybot，分支 `T-1228-screen-files`。中文汇报写进 docs/tasks 下本任务的 report.md。不提交 git。

执行规格：`docs/specs/2026-11-14-multi-screen.md`（已在 main），先完整读一遍。第一批的屏池（`server/local-vm-screens.ts`）、观看目标（`server/desktop-viewer-targets.ts`、`server/host/shared-vm-control.ts`）、容器多屏布局（`server/container-screens.ts`、`server/container-computer.ts`）都已合并到 main，直接使用它们导出的函数，不要重写。

## 通用要求
- 公开仓库，不写内部域名、IP、邮箱、人名、密钥。
- 不提升 `IMAGE_LAYER_VERSION`，不改 `server/vps-computer.ts`。
- 只有 T-1228-wiring 能改 `server/index.ts`。其他任务需要接线的地方只导出函数，不自己接。
- 每个任务都要通过：`pnpm exec tsc -b`、`pnpm exec tsc -p tsconfig.server.json`、`pnpm lint`（只允许基线两条告警 `scripts/public-scan/scan.mjs:297`、`server/lazy-container-mcp.ts:122`）、自己任务的 vitest 文件。以 Actions 为准，协调者推分支后跑。
- 文件行数上限见 `scripts/testing/file-size-ratchet.test.ts`，不许改上限数字；`server/index.ts` 等大文件新增逻辑放进新模块，index 里只接线。
- 标「新建」的文件目前不存在，其余都已核对存在。

## F. 屏文件访问 — `T-1228-screen-files`

批次：第二批。after：B。估时：1 天。

文件：
- `server/screen-files.ts`(新建：多屏布局下按屏读写工作区文件，经 `exec -u crybot-sN` 或宿主直读)
- `server/screen-files.test.ts`(新建)
- `server/bot-attachment.ts`
- `server/routes/app-hosting.ts`
- `server/routes/published-pages.ts`
- `server/pages/bundle.ts`
- `server/host/secret-cards.ts`
- `server/local-vm-profiles.ts`
- 对应已有测试追加：`server/bot-attachment.test.ts`、`server/routes/app-hosting.test.ts`、`server/routes/published-pages.test.ts`、`server/pages/bundle.test.ts`、`server/host/secret-cards.test.ts`

接口契约：

```ts
// server/screen-files.ts
export interface ScreenFileAccess {
  guestToHost(guestPath: string): string | null;                // 单屏：与现有 guestWorkspaceToHost 一致
  readFile(guestPath: string, maxBytes: number): Promise<Buffer>;
  writeFile(guestPath: string, data: Buffer, mode?: number): Promise<void>; // 写完属主为 crybot-sN，屏幕用户可读
  stat(guestPath: string): Promise<{ size: number; isFile: boolean } | null>;
  list(guestDir: string): Promise<string[]>;
}
export function screenFileAccess(runtime: string, target: LocalVmTarget): ScreenFileAccess;
```

要点：
- 屏目标的访客路径根是 `screenWorkdir(n)`，路径不得越出该根(防 `..`、软链接逃逸)，越界返回 null 或抛错。
- 单屏目标行为与改动前逐字一致，现有测试不改断言。
- 各调用点只把直接 `fs` 访问换成 `ScreenFileAccess`，函数签名加可选的 `access` 参数(默认单屏实现)，由 E 之后的小接线或 F 自己在不碰 `server/index.ts` 的前提下注入；需要改 `server/index.ts` 的接线写进 PR 说明，交给 E 或其返工处理。

验收：
- `pnpm vitest run server/screen-files.test.ts server/bot-attachment.test.ts server/routes/app-hosting.test.ts server/routes/published-pages.test.ts server/pages/bundle.test.ts server/host/secret-cards.test.ts`
- 用例至少覆盖：s2 的访问拒绝 s1 路径和 `..` 逃逸；密钥卡片写入后属主为该屏用户(用假 exec 断言参数)；单屏路径映射不变。
- `tsc -b`、`tsc -p tsconfig.server.json`、`pnpm lint`。

