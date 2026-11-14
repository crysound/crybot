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

## 第 2 轮

### 修改与根因

本轮仅修改 `server/cloud-lending.e2e.test.ts`、`server/opencode-provider-keys.e2e.test.ts` 和本报告；没有修改产品代码或 `ci.yml`，没有执行 git commit / checkout / stash。工作区原有未跟踪的 `r2.md` 保持不动。

1. **cloud-lending：API bot 的读取路径遗漏。** API bot 和前面的 webhook bot 都设置 `cwd: home/hook-project`。第 1 轮的 CLI wrapper 根据实际 cwd 把两者的 turn 写到该目录的 `.fixture-output/turns`；API bot 的轮询却仍直接 `readdirSync(home/turns)`。这个固定目录既不是自定义 cwd 的输出位置，也不是 `engineOutput` 的标准 bot workspace 输出位置，因此报 ENOENT 并超时。现在 API bot 复用已有 `readTurns()`，同时覆盖标准 workspace 和获授自定义工作目录，仍按该 API 请求的 prompt 匹配 turn。没有改写入逻辑、授权目录或超时；`--restricted` 和 `mcpServers` 精确等于 `["cry"]` 两条断言原样保留。

2. **opencode-provider-keys：环境观测遗漏，不是已证实的产品地址缺失。**
   - `server/drivers/acp/core.ts` 的 `hostFor` 把 engine env 交给 `spawnCli`；`server/bot-box/box.ts` 的 `wrap` 先过滤环境，再调用 broker rewrite，最终直接把 `brokered.env` 用于 spawn。
   - `server/bot-box/broker-env.ts` 明确定义 Anthropic 的 key 为 `ANTHROPIC_API_KEY`、地址为 `ANTHROPIC_BASE_URL`。存在 owner key 时，两者同时改写为 `cry_t0_…` 和 `http://127.0.0.1:18080/b/<token>/anthropic`，原始地址和 owner key 保存在 grant。此路径不是通过 OpenCode 配置文件传递地址；`server/bot-box/broker.ts` 再把 `/messages` 拼到 grant 的 upstream（本 fixture 为 `/v1`），并注入 owner key。
   - `server/testing/fake-acp-cli.ts` 的 `dumpEnv` 是有限名单：有 `ANTHROPIC_API_KEY`，没有 `ANTHROPIC_BASE_URL`。所以日志里的 `undefined` 只证明 dump 漏记，不能证明进程缺少该变量；未启用 box 时，原 URL 断言也会受同一遗漏影响。本轮临时进程验证已复现“进程确有 URL，而共享 fake dump 不含 URL”。
   - 为遵守只改两个失败文件的范围，本测试生成一个放在 fixture engine root 的专用 wrapper，在加载共享 fake ACP CLI 前直接记录 `process.env` 中这两个字段到 `<dump>.<pid>.provider-env.json`。读取方使用实际 prompt 的 PID，且额外核对 key 与共享 dump 一致；不会从另一个模型探测进程取地址，也不会在读取方拼造实际值。
   - 精确 token 格式、精确 broker URL、无 box 时的 owner key/原始 URL、共享 dump 不含 owner key 均保留；新增 provider dump 也不得含 owner key。后续 `modelCall` 仍用进程实际拿到的地址和 key，请求真实 broker Unix socket，保留上游收到 owner key、`/v1/messages`、错误 token 401、未授权 grant 403、拒绝后上游请求数不增加等全部断言。

### 验证

使用 Node `v24.22.3`（`/opt/node24/bin/node`），vitest 均为 `--maxWorkers=2`。`AGENTS.md` 引用的 `docs/verification/README.md` 仍不存在；全部尝试使用临时 HOME/dataDir 或既有隔离 fixture，未访问用户 live app/data。

| 命令 / 检查 | 结果 | 日志 |
| --- | --- | --- |
| `PATH=/opt/node24/bin:$PATH pnpm exec vitest run server/cloud-lending.e2e.test.ts server/opencode-provider-keys.e2e.test.ts --maxWorkers=2 --reporter=verbose` | 两套 beforeAll 被环境阻止：lending 分配端口失败；OpenCode `listen EPERM 127.0.0.1`。9 项业务测试未执行，不计通过 | `/tmp/t1227-r2-e2e.log` |
| `PATH=/opt/node24/bin:$PATH pnpm exec vitest run server/bot-box/broker-env.test.ts --maxWorkers=2` | 3/3 通过，覆盖真实 key 留在 grant、token 与 URL 同时改写 | `/tmp/t1227-r2-broker-env.log` |
| 从测试文件生成的 wrapper 启动临时 fake ACP 进程，发送 `initialize`，按 dump PID 读取两个环境字段 | 通过；复现共享 dump 漏记 URL，新采集文件精确保留进程环境，ACP 回复正常；无网络监听、无真实 box | `/tmp/t1227-r2-fixture-smoke.log` |
| `PATH=/opt/node24/bin:$PATH pnpm exec tsc -p tsconfig.server.json --noEmit` | 通过 | `/tmp/t1227-r2-tsc.log` |
| `PATH=/opt/node24/bin:$PATH pnpm lint` | 通过 | `/tmp/t1227-r2-lint.log` |
| `git diff --check` | 通过 | — |

临时 wrapper 验证最初用 Node `spawnSync` 传 stdin 时遇到 `spawnSync ... EPERM`；改用 shell 重定向给同一个临时 wrapper 传入 ACP JSON 后通过。这个调整仅用于临时验证命令，没有改变测试或产品启动方式来绕过沙箱。

### 需要协调者补跑

在沙箱外使用 Node 24、MemoryMax=4G、`--maxWorkers=2`、可用 bubblewrap，分别完整运行这两个 E2E 文件，预期 lending 7/7、OpenCode 2/2。重点确认 API bot 的两个安全断言，以及盒内实际 provider URL、owner key 转发、401/403 均执行成功。当前结果不声称完整 E2E 已通过；没有新增 skip、删除或放宽断言，也没有关闭产品安全能力。

## 第 3 轮

2026-11-14。**本轮未完成两个 E2E 的全绿修复：OpenCode 的测试根因已确认并修改；lending 仍需沙箱外失败诊断确认，不能声称根因已完全查清或已修复。** 只改这两个测试文件及本报告；保留前两轮工作区修改和未跟踪的 `r2.md`、`r3.md`，没有 git commit / checkout / stash，没有改产品代码或安装依赖。

### 修改与根因证据

1. **`server/opencode-provider-keys.e2e.test.ts`：按 PID 观察 ACP 探针，在保存、turn、删除 key 后统一验证真实的 box 契约。**
   - 这段不是应当关闭 box 的路径。`server/drivers/acp/opencode-probe.ts` 的 `probeOpenCodeSession` 显式传 `box: { allowEnv }` 给 `spawnCli`；其安全契约是 OpenCode 的模型探针也会加载配置、插件和 MCP，必须像 turn 一样隔离。`opencode-go.ts` 的 `models --verbose` / `models --refresh` 也通过 `execCliBoxed` 启动。`BoxRunner.broker` 在 isolated network 中把 owner key 改写为每进程 token，并同步改写 URL。因此删除 Venice 后仍看到 Anthropic broker token 是正确行为，没有证据表明产品误走 box。
   - 原 `started()` 读的是所有 fake CLI 进程共用的 dump。`fake-acp-cli.ts` 在处理 `--version` 之前也会写这个 dump；`acp/core.ts` 的版本探针使用盒外 `execCli`。所以盒外版本探针可留下原始 owner key，盒内 ACP/模型探针又会留下 token，读取结果受最后一次写入影响。协调者日志中保存后 raw-key 断言通过、删除后同一断言失败，不能据此推导两次刷新有不同的隔离契约。
   - 复用第 2 轮的 `<dump>.<pid>.provider-env.json`，增加 Venice 和 OpenAI 字段。保存/删除之前记录已有 ACP 文件，之后只等新 ACP 进程的完整 JSON；`--version` 不生成这种文件，不能覆盖观测。初始配置同样检查 ACP 实际拿不到 server 自有的 Anthropic/OpenAI key。
   - 公共断言在有 box 时严格要求 `^cry_t0_[a-f0-9]{48}$`、精确的 `http://127.0.0.1:18080/b/<token>/anthropic` 和采集内容不含 owner key；无 box 时严格要求 owner key 与原 upstream URL。turn 仍按 prompt PID 核对共享 dump，保留两份 dump 不泄漏 owner key、真实 broker 转发得到 owner key、上游路径、错误 token 401、未授 grant 403、拒绝后上游请求数不增加等断言。删除后 Venice 必须消失，并新增 OpenAI 仍缺失的断言。没有改 box 探测或关闭 box。

2. **`server/cloud-lending.e2e.test.ts`：只增加失败取证，不凭猜测改轮询或安全行为。**
   - 协调者日志只说明 20 秒内没有 `card.requestId`，返回值一直是 `run.status === "running"`。这里的 `"working"` 是测试在找到问题卡后返回的哨兵值，不是应把期望改成 `"running"` 的产品状态改名。
   - `fake-acp-cli.ts` 的 `lend-question` 会先 `await driveMcp(list_shared_computers)`，再发 `session/request_permission`。`driveMcp` 的等待期限是 60 秒；子进程退出没有立即结束这个等待。因此 MCP 启动/调用出错可以表现为 20 秒内没有问题卡；单凭当前 Vitest 日志不能确定停在启动、模型配置还是 MCP 调用的哪一步。
   - 找到一项明确的本机 fixture 环境问题：当前 worktree 的 `node_modules/jmespath` 链接到 `/root/workspace/crybot/node_modules/.pnpm/jmespath@0.16.0/node_modules/jmespath/jmespath.js`。用产品的 `defaultCodeRoots()`、`planBox()`、`visibleInBox()` 和本测试相同的 HOME/dataDir 布局计算，`server/mcp-gate.ts` 为 `ro`，上述真实依赖路径为 `none`。`mcp-gate.ts` 通过 `mcp-shape.ts` 导入 jmespath。宿主机运行的前面几个 proxy 可以读取该依赖，不代表后面的 fake ACP 在盒内启动 gate 也能读取它。**这证明依赖可见性存在问题，但尚无该次失败的 ACP stderr，不能把它写成已动态确认的唯一根因。** 未为此扩大 box 挂载或关闭隔离。
   - 增加仅作用于隔离服务器的诊断 prelude：调用原 `StderrTail.write` 后，把它已脱敏的 tail 送到 fixture server log。失败时 `afterEach` 输出该日志和已有的 Grok ACP native trace，再按原逻辑清理临时目录。这样下一次沙箱外失败能看到 engine/MCP 的错误与最后一条 ACP 消息。原轮询、20 秒期限、必须出现问题卡、interrupt 以及其余安全断言全部保留。
   - 当前没有足够证据认定产品缺陷；没有修改产品代码。已向协调者询问是否保留旧 fixture 的服务器日志/目录，写报告时尚未得到补充信息。

### 沙箱内验证

Node 为 `/opt/node24/bin/node`（v24.22.3），vitest 均带 `--maxWorkers=2`。再次尝试 `systemd-run --scope -q -p MemoryMax=4G -- /opt/node24/bin/node --version`，仍报 `Failed to connect to system scope bus ... Operation not permitted`，故以下检查直接运行。`docs/verification/README.md` 仍缺失；所有验证使用既有隔离 fixture 或临时 HOME/dataDir，未访问 live app/data。

| 命令 / 检查 | 结果 | 日志 |
| --- | --- | --- |
| `PATH=/opt/node24/bin:$PATH pnpm exec vitest run server/cloud-lending.e2e.test.ts --maxWorkers=2` | beforeAll 分配端口失败：`no free port block for offsets 0,1 in 19600..22600`；7 项未执行，不计通过 | `/tmp/t1227-r3-lending.log` |
| `PATH=/opt/node24/bin:$PATH pnpm exec vitest run server/opencode-provider-keys.e2e.test.ts --maxWorkers=2` | beforeAll：`listen EPERM: operation not permitted 127.0.0.1`；2 项未执行，不计通过 | `/tmp/t1227-r3-opencode.log` |
| `PATH=/opt/node24/bin:$PATH pnpm exec vitest run server/bot-box/broker-env.test.ts --maxWorkers=2` | 3/3 通过 | `/tmp/t1227-r3-broker-env.log` |
| `/opt/node24/bin/node /tmp/t1227-r3-fixture-smoke.mjs` | 从实际测试源码生成 wrapper；raw 环境和真实 `brokerRewrite` 产物均被按 PID 精确保留，后续版本探针覆盖共享 dump 但不生成/覆盖 ACP 文件；诊断 prelude 保留原 stderr tail 并输出；另输出上述实际依赖的挂载可见性 | `/tmp/t1227-r3-fixture-smoke.log` |
| `PATH=/opt/node24/bin:$PATH pnpm exec tsc -p tsconfig.server.json --noEmit` | 通过 | `/tmp/t1227-r3-tsc.log` |
| `PATH=/opt/node24/bin:$PATH pnpm lint` | 通过 | `/tmp/t1227-r3-lint.log` |
| `git diff --check` | 通过 | — |

临时 smoke 只验证进程环境采集、诊断和纯挂载计划；没有实际启动 box，也不算完整 ACP 对话或 HTTP 转发通过。两套 E2E 输出的 skipped 来自 beforeAll 失败，未新增 skip。没有增加超时、删除用例或放宽安全断言。

### 需要协调者处理

在沙箱外使用 Node 24、MemoryMax=4G、`--maxWorkers=2`、可用 bubblewrap 分别运行：

```sh
PATH=/opt/node24/bin:$PATH systemd-run --scope -q -p MemoryMax=4G -- pnpm exec vitest run server/cloud-lending.e2e.test.ts --maxWorkers=2 --reporter=verbose
PATH=/opt/node24/bin:$PATH systemd-run --scope -q -p MemoryMax=4G -- pnpm exec vitest run server/opencode-provider-keys.e2e.test.ts --maxWorkers=2 --reporter=verbose
```

OpenCode 预期 2/2，并确认保存/删除后的 ACP 探针以及 turn 的 token、URL、401/403 都实际执行。lending 当前仍可能原样失败；请保留新增 `Fixture ACP stderr`、`Cloud fixture server log` 和 `Cloud fixture ACP trace` 输出，用它确认是否为盒内 `ERR_MODULE_NOT_FOUND`（尤其 jmespath 的外部依赖链接）。若确认如此，应先修复协调者运行环境中现有依赖的盒内可见性，再决定是否需要测试 fixture 打包调整；本轮未擅自搬动依赖、扩展产品挂载或新增依赖。其他停点也应依据新 trace 继续定位，不能把本轮诊断改动算作 lending 修复完成。

## 第 4 轮

### 环境变量归类

逐个检查了服务端读取点和盒内代理的启动方式。以下 11 个变量只由服务端读取，已加入 `SERVER_ONLY_CRYBOT`：

- `CRYBOT_APP_HOST`：`server/feishu-login.ts` 将它作为 App 回调主机名，路由和重定向判断在服务端完成。
- `CRYBOT_HOSTED_WORKSPACE`：服务端用它判断托管工作区并关闭自托管飞书登录；盒内引擎不读取它。
- `CRYBOT_FEISHU_APP_ID`：服务端 OAuth 配置读取飞书应用 ID。
- `CRYBOT_FEISHU_APP_SECRET`：服务端 OAuth 换 token 时读取应用密钥；密钥不能进入 bot 盒子。
- `CRYBOT_FEISHU_APP_SECRET_FILE`：服务端读取密钥文件并使用其内容，文件路径和内容都不能进入盒子。
- `CRYBOT_FEISHU_TENANTS`：服务端解析允许的 tenant 列表并校验登录身份。
- `CRYBOT_FEISHU_ALLOW`：服务端解析 union ID 白名单并决定是否接受登录。
- `CRYBOT_FEISHU_ADMINS`：服务端解析管理员 union ID 列表并决定会话作用域。
- `CRYBOT_FEISHU_SESSION_MAX_DAYS`：服务端计算设备会话期限，并与通用会话上限取较小值。
- `CRYBOT_FEISHU_TOKEN_ENDPOINT`：服务端发起 OAuth token 请求时选择端点。
- `CRYBOT_FEISHU_USER_INFO_ENDPOINT`：服务端取得登录用户资料时选择端点。

以下 2 个变量由容器 MCP 代理在盒内读取，已加入 `BOX_ENV_CRYBOT_NAMES`：

- `CRYBOT_CONTAINER_LAZY`：`server/container-mcp.ts` 在盒内启动时用它决定是否启用延迟容器控制连接。
- `CRYBOT_CONTAINER_TOOL_SCOPE`：`server/lazy-container-mcp.ts` 在盒内解析工具作用域，限制代理暴露的工具；服务端也会检查该值来构造网关，但实际代理仍需在盒内读取它。

因此飞书应用密钥、密钥文件路径、白名单和托管工作区设置均不会因通用 `CRYBOT_` 前缀进入 bot 环境；容器代理的两个运行时开关仍能随对应 MCP 启动。

### OpenCode e2e 根因和改法

r3 的 fixture 用 `<dump>.<pid>.provider-env.json` 作为 ACP 启动记录。保存或删除 provider key 会触发 provider 配置重载并启动新的 ACP；在盒子或受限 runner 中，旧进程结束后新进程可能复用同一个 PID。新进程于是覆盖同名记录，`before` 列表看不到新文件，`nextProviderEnvironment` 在 15 秒后错误超时。日志只显示“没有新文件”，根因是测试观测文件名依赖 PID，不是被测代码没有重启 OpenCode，也不是 key 没有交给 OpenCode。

新增 `server/testing/opencode-provider-environment.ts`，每次 `acp` 启动生成 UUID `startId`，把实际 ACP 环境写入 `<dump>.<startId>.provider-env.json`；fixture 的共享 dump 和 prompt 记录同时带上该 ID。e2e 按 UUID 等待新启动记录，并在 turn 中同时核对 PID、`startId`、共享 dump 和 provider 环境，保留盒内 token/URL、无盒时原始 key/URL、未授权 401/403 以及上游收到原始 key 等断言。没有放宽“key 交给 OpenCode”的证明。

### 本轮验证

单文件、串行执行：

- `server/bot-box/env.test.ts`：10/10 通过。
- `server/testing/opencode-provider-environment.test.ts`：2/2 通过，覆盖忽略非 ACP 命令、每次启动记录唯一 ID、同 PID 下环境记录互不覆盖。
- `server/testing/fakes-self-contained.test.ts`：18/18 通过，确认共享 fake ACP 文件仍能自包含运行。
- `pnpm exec oxlint` 针对本轮改动文件：通过。
- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc --noEmit -p tsconfig.server.json`：通过。
- `server/opencode-provider-keys.e2e.test.ts`：本机 beforeAll 因沙箱禁止监听 `127.0.0.1`（`listen EPERM`）未进入业务断言，以 Actions 为准。
- `server/drivers/acp/opencode-go.test.ts`：本机沙箱中的 fake ACP 父进程监视器提前看到父进程不可用，子进程以 0 退出，导致 50 项连锁失败；这不是本轮改动涉及的断言，未据此修改产品代码或放宽测试。
