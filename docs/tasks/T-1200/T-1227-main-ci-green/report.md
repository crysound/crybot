# T-1227 本机修复与验证报告

2026-11-14。未提交 git、未推送、未安装新依赖。修复已落地；**尚不能宣称 main CI 全绿**，需协调者在沙箱外补跑，并以推分支后的 GitHub Actions `CI`（check + 8 分片）为准。

## 1. 改了哪些文件

| 文件 | 改动 |
| --- | --- |
| `server/bot-box/env.test.ts` | 将四个 App Links 环境变量归入 `SERVER_ONLY_CRYBOT`，不扩大 box 环境白名单。 |
| `server/boat-access.ts` | 错误文案改用词表认可的 `Cloud desktop`，未改词表规则或豁免。 |
| `server/index.ts` | 仅把原有 `cloud-secrets-boot.ts` import 及其注释移至最前。 |
| `server/app-handoff-gate.test.ts` | 新增 9 个直接调用 gate 的行为测试，覆盖 403、四条公共探针、正常放行、401 和 handoff 分支终止路由。 |
| `server/bot-box/command-line-paths.linux.test.ts` | fixture 的 harness 端口由特权端口 1 改为普通端口 8799，原四个用例和断言不变。 |
| `server/bot-box/self-check.ts` | self-check 始终要求运行网络隔离探针，避免 share-net mutation 自行关闭被测检查。 |
| `server/bot-box/self-check.linux.test.ts` | 保留原两个网络隔离失败断言，另要求 share-net 撤掉 bridges 后的四个 gate 检查也明确失败，仍禁止任何额外失败。 |
| `server/cloud-lending.e2e.test.ts` | 自定义 webhook 工作目录的 fixture 输出写入该工作目录，并让读取方查找它；路径比较兼容 realpath。 |
| `server/cloud-team-engine-homes.e2e.test.ts` | 将本就验证无 box 凭据副本同步的 fixture 显式设为 `CRYBOT_BOT_BOX=0`，所有原凭据值断言保留。 |
| `server/opencode-provider-keys.e2e.test.ts` | 验证盒内代理令牌及真实密钥转发、错误令牌和越权 grant 拒绝，并将“拒绝且不落盘”测试移到首轮对话之前避免异步配置写入竞争。 |
| 本报告 | 记录根因、验证结果及待协调事项。 |

### 明确要求的四项

- 用 `rg` 检查 `server/`、`shared/`、`electron/` 生产代码：`CRYBOT_ANDROID_CERT_SHA256`、`CRYBOT_ANDROID_PACKAGE`、`CRYBOT_APPLE_APP_IDS`、`CRYBOT_APP_LINK_ORIGIN` 的直接读取均在 `server/app-links.ts`；handoff 调用它的 origin helper，没有引擎、hook 或 MCP proxy 读取这些变量。
- `src/locales/vocabulary.test.ts` 明确要求把泛指桌面的 `Boat` 改成 `cloud desktop`；修改被测文案，规则和测试文件原封不动。
- `server/index.ts` 第一个 import 已是 `./cloud-secrets-boot.ts`。检查后移的四个模块及其运行时依赖，并在 Node 24 子进程内把所有 `child_process` 启动入口替换成抛错函数、调用 `syncBuiltinESMExports()` 后逐个 import；四个模块全部加载成功，没有启动进程。它们提供函数或纯数据，加载顺序调整不依赖进程启动副作用。
- 新 gate 测试使用临时 `SessionRegistry`、本地签名 JWT 与 `memoryHttp`，像调用方一样根据 gate 返回值决定是否继续路由；断言具体状态码、JSON、cookie 或响应体，没有 mock gate/refusal。

### 原失败 3–7 的根因与处理

**3. `command-line-paths.linux.test.ts`：特权端口 fixture，静态根因判断，待实机证实。**

原 `box.start({ port: 1 })` 不会在启动时监听 TCP 1；真正监听发生在盒内 bridge。`detectBox` 仅执行 namespace 中的 `/bin/true`，因此会报告“bubblewrap works here”。没有 socat 时，`box-bridge.ts` 用 Node 并行打开 egress/harness/broker 三个 listener；普通用户不能监听特权端口 1，`Promise.all` 拒绝后尚未执行后面的 `unref()`，其他已打开的 listener 会保活，外层四个用例便一直等不到子进程 exit。这与 CI 中全部四个用例超时、而另一套使用临时高端口的 self-check 正常运行吻合。

改为 8799，不改隔离边界、不延长超时、不弱化断言。此处优先修正非法测试输入；没有证据要求放开 AppArmor。**本机不能复现完整 CI 超时**：bubblewrap 在创建 namespace 时即被拒绝，故该根因仍需外部运行确认。Node bridge 部分 listener 初始化失败时的清理可另行完善，本次没有扩大到这项通用进程生命周期修改。

**4. `self-check.linux.test.ts`：mutation 关闭了自己的探针，且原期望集漏算 gate 的变化。**

`self-check.ts` 原先根据 share-net 设置 `isolatedNet=false`，`box-probe.ts` 因而完全不产生 `host-loopback-unreachable`、`no-direct-internet` 结果；这是代码可直接证明的矛盾，不是回环网络偶发问题。同时 `BoxRunner` 对 shared network 不建立 bridges，所以 `/api/bots` 直达上游，三个 egress 拒绝测试也接不到 gate 的 403。CI 日志中的失败集合从 `harness-other-refused` 开始，与此一致。

现在 self-check 的两个网络隔离探针始终执行。share-net 必须失败的完整集合是：`host-loopback-unreachable`、`no-direct-internet`、`harness-other-refused`、`egress-loopback-refused`、`egress-metadata-refused`、`egress-private-refused`。新增的四项是**必须失败**，不是忽略；原两项保留，集合以外仍必须全部通过。其他 mutation 不变。本机因 namespace 限制走既有跳过路径，尚未动态验证。原探针仍用 `1.1.1.1:443` 检测直连公网，外部验证时该目标应能从宿主机连接；未放宽这条安全断言。

**5. `cloud-lending.e2e.test.ts`：自定义 cwd 的输出路径不匹配。**

CI 栈定位到第 324 行 webhook 的 `proxyFor`。该用例把 cwd 指向 `home/hook-project`，`engineOutput` 对这种非 bot/task 工作目录返回 `home/.fixture-output`，而 `readTurns` 只读取 `home/.crybot/workspaces/<bot>/.fixture-output`。盒内该 fallback 路径还可能不可写：它不在服务器 HOME 或获授的 cwd 中。

现在 webhook fixture 的 turn dump 和 one-shot dump 都写到获授工作目录下的 `.fixture-output`，读取方也包含这个目录。仍按新输出内容及 bot/thread 标识匹配 turn，所有 lending 授权和拒绝断言不变。本机在 fixture 分配端口时被沙箱阻止，不能到达原断言。

**6. `cloud-team-engine-homes.e2e.test.ts`：测试意图为无 box，但环境自动启用了 box。**

文件开头声明验证无 box 的凭据副本同步，fixture 却未关闭 Cloud 默认启用的 box。盒内把团队凭据源文件 bind 到 Bob 的目标路径，fake Claude 刷新会写回团队源文件；宿主机上 Bob 的副本仍可能是 `tok-1`。因此 CI 中 turn dump 已读到 `tok-1+`，紧接着宿主机读 Bob 副本却是 `tok-1`，与实际挂载语义一致。

显式配置 fixture 的 `CRYBOT_BOT_BOX=0`，使本文件稳定验证它原本声明的未装 box / 未启用 box 路径。没有关闭产品的默认 box，也没有移除或改变单独的 `server/engine-homes/box.linux.test.ts`；原始全部 `tok-1+` 断言保留。本机仍在分配端口时失败，待外部运行。

**7. `opencode-provider-keys.e2e.test.ts`：broker 契约变化与前一用例失败后的落盘竞争。**

- CI 的第 139 行要求盒内 turn 拿到真实 Anthropic key，但 box 正确返回了 `cry_t0_…`。现在依据与服务器一致的 box 探测决定期望：启用时要求完整 token 格式、精确 broker URL，并确认 dump 不含真实 key；未启用时仍严格要求原始 owner key 和 fixture URL。
- 新建本地 HTTP upstream，以 turn 实际拿到的 URL/key 发请求。盒内 URL 通过 broker 的 Unix socket 访问，因为端口 18080 属于盒内网络；断言返回 200、路径 `/v1/messages`、上游收到的 key 精确等于 owner key。另要求无效 token 返回 401、未获授的 OpenAI grant 返回 403，且上游请求数不增加。
- 完整失败日志显示配置差异实际是 `onboarding.firstTurnAt` 新增，不是拒绝请求保存了 provider key：前一测试在 turn 进行中因 token 断言失败，后一测试立即拍快照，turn 随后完成并落盘。将整个“拒绝且不落盘”用例移至任何 turn 之前，保留逐字节配置快照比较，并对第二种拒绝也增加同样比较；没有忽略字段或改成部分匹配。

本机新增 upstream 的 `listen(0, 127.0.0.1)` 被沙箱以 EPERM 拒绝，不能运行到业务断言。该文件需外部完整补跑，尤其应在可用 bubblewrap 的机器上实际覆盖 broker 分支。

## 2. 怎么验证的

### 执行环境

- `PATH=/opt/node24/bin:$PATH pnpm exec node -p process.execPath` 输出 `/opt/node24/bin/node`；版本 `v24.22.3`。
- 尝试 `systemd-run --scope -q -p MemoryMax=4G -- /opt/node24/bin/node --version`，失败：`Failed to connect to system scope bus via local transport: Operation not permitted`。因此以下 vitest 均直接执行，均带 `--maxWorkers=2`；没有运行 build。
- worktree 初始没有 `node_modules`。复用 `/root/workspace/crybot/node_modules` 的现有依赖，建立本地被 git 忽略的目录及依赖链接，保留可写的本地 Vite 缓存目录；未下载或安装包，未修改主检出的依赖。
- `AGENTS.md` 引用的 `docs/verification/README.md` 在本检出不存在。使用现有隔离 fixture、临时 HOME/dataDir 或内存 HTTP，未访问用户 live app/data。

以下每行均是单独一次测试命令，统一前缀为 `PATH=/opt/node24/bin:$PATH`。

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `pnpm vitest run server/bot-box/env.test.ts --maxWorkers=2` | 9/9 通过 | `/tmp/t1227-env.log` |
| `pnpm vitest run src/locales/vocabulary.test.ts --maxWorkers=2` | 6/6 通过 | `/tmp/t1227-vocabulary.log` |
| `pnpm vitest run server/app-handoff-gate.test.ts --maxWorkers=2` | 9/9 通过 | `/tmp/t1227-gate.log` |
| `pnpm vitest run server/app-handoff.test.ts --maxWorkers=2` | 65/65 通过 | `/tmp/t1227-handoff.log` |
| `pnpm vitest run server/bot-box/command-line-paths.linux.test.ts --maxWorkers=2 --reporter=verbose` | 4 项按既有机制跳过，原因 `userns-refused`；不计通过 | `/tmp/t1227-paths.log` |
| `pnpm vitest run server/bot-box/self-check.linux.test.ts --maxWorkers=2 --reporter=verbose` | 2 项按既有机制跳过，原因 `userns-refused`；不计通过 | `/tmp/t1227-self-check.log` |
| `pnpm vitest run server/cloud-lending.e2e.test.ts --maxWorkers=2` | beforeAll 失败：`no free port block for offsets 0,1 in 19600..22600`；7 项未执行 | `/tmp/t1227-lending.log` |
| `pnpm vitest run server/cloud-team-engine-homes.e2e.test.ts --maxWorkers=2` | beforeAll 失败：同上；7 项未执行 | `/tmp/t1227-team.log` |
| `pnpm vitest run server/opencode-provider-keys.e2e.test.ts --maxWorkers=2` | beforeAll 失败：`listen EPERM: operation not permitted 127.0.0.1`；2 项未执行 | `/tmp/t1227-opencode.log` |
| `pnpm exec tsc -p tsconfig.server.json --noEmit` | 退出 0，通过（仓库实际服务端 tsconfig） | `/tmp/t1227-tsc.log` |
| `pnpm lint` | 退出 0，通过 | `/tmp/t1227-lint.log` |
| `git diff --check` | 退出 0，通过 | — |

补充环境证据：

```sh
/opt/node24/bin/node --input-type=module -e 'import {createServer} from "node:net"; const server = createServer(); server.once("error", e => {console.error(e); process.exitCode = 1;}); server.listen(0, "127.0.0.1", () => server.close());'
```

结果为 `listen EPERM: operation not permitted 127.0.0.1`，说明上述“无可用端口”并非已证实的端口耗尽。

```sh
bwrap --unshare-user --unshare-pid --unshare-net --unshare-ipc --unshare-uts --die-with-parent --ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/lib /lib --symlink usr/lib64 /lib64 --proc /proc --dev /dev --tmpfs /tmp /bin/true
```

结果为 `bwrap: No permissions to create a new namespace, likely because the kernel does not allow non-privileged user namespaces.`。

四模块导入验证命令为 `/opt/node24/bin/node --input-type=module`，脚本如下；结果四行均为 `imported without starting a process`，日志 `/tmp/t1227-imports.log`。

```js
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  childProcess[name] = () => { throw new Error(`Unexpected process during module loading: ${name}`); };
}
syncBuiltinESMExports();
for (const name of ['admin-audit-request-fields', 'host/session-names', 'host/data-dir-lease-exit', 'provider-lock']) {
  await import(`${process.cwd()}/server/${name}.ts`);
  console.log(`${name}: imported without starting a process`);
}
```

## 3. 需要协调者处理的事

1. 在沙箱外按上表分别补跑两个 Linux box 文件及三个 Cloud E2E；使用 Node 24、`--maxWorkers=2`，可用时以 `systemd-run --scope -q -p MemoryMax=4G --` 包裹。两个 box 文件应实际执行全部 6 项，而不是把既有跳过算作成功。尤其确认端口 8799 修复确实解决原 60/120 秒超时。
2. 推分支后运行 GitHub Actions `CI` 的 check 和全部 8 个 vitest 分片；本机没有网络权限，未发起远程工作流，不能代替该最终验收。
3. 无新增依赖需求、无已实施的越范围源码修改。缺失的验证 README 建议由协调者确认位置或在其他任务恢复，本次未擅自新增该文件。
4. `.github/workflows/ci.yml` 未改。原 CI 已通过 bubblewrap 探测，且 self-check 基准用例通过；当前证据不支持仅靠解除 AppArmor 修复这些失败。若外部 runner 实际拒绝 user namespace，再依据具体报错加 vitest 环境准备，不能用本机沙箱限制替代 GitHub 环境证据。
5. 没有新增 skip、没有删测试、没有改可用性探测。上表的 6 项 box 跳过来自原 `describe.skipIf`；三个 E2E 日志里的 skipped 是 beforeAll 失败后的未执行项。无 box 的团队凭据 fixture 属于测试路径固定，原独立盒内安全测试不变。self-check 和 OpenCode 的期望更新均在上文逐项解释，原安全要求继续断言，并新增精确行为检查。
