# T-1228-screen-files：屏文件访问

日期：2026-11-14。F 的访问层、调用点适配和隔离 fixture 已完成；实际目标选择与生命周期接线交给 E。未提交 git、未推送分支。沙箱实际分支为 `master`；执行 `git switch -c T-1228-screen-files` 因 `.git` 为只读文件系统、无法创建 ref lock 而失败。所有修改保留在当前 worktree，需协调者在可写仓库中建立目标分支。

## 实现

- 新增 `server/screen-files.ts`，提供约定的 `ScreenFileAccess` 和 `screenFileAccess(runtime, target)`。复用第一批的 `screenWorkdir`、`isScreenTarget` 和 `screenIdentityArgs`，没有重写屏布局或执行身份。
- 多屏读取、写入、stat、目录枚举通过所选屏的 Linux 用户执行。相对路径以该屏工作区为根；拒绝其他屏、`..` 和越界绝对路径。容器端脚本从根目录逐级用目录描述符和 `O_NOFOLLOW` 打开路径，拒绝目录及文件软链接；写入采用同目录临时文件替换，避免通过最终文件的软链接或硬链接修改其他文件。文件内容只经 stdin 传递，错误消息不携带子进程输出。
- 写入由 `crybot-sN` 创建文件，默认 0600，调用方可指定模式；密钥目录为 0700，密钥文件为 0600。读取同时检查文件类型和字节上限。额外导出 `removeScreenFile`，供发布记录删除和密钥过期清理使用。
- 单屏映射函数原样移到 `server/guest-workspace.ts`，`bot-attachment.ts` 保留原导出。未传 `access` 的既有调用仍走原路径；没有修改既有测试断言。
- 附件、应用发布、页面发布/下线、页面打包、动态页面刷新、密钥卡片与 Vault 重用支持可选访问器。屏路径不再回退到宿主根目录。页面和附件继续排除密钥目录。
- 密钥卡片新增 `saveCustomSecretAsync`，路由等待屏写入完成才恢复会话；原同步 `saveCustomSecret` 保留，兼容单屏调用。手机投递和选用已存密钥也等待屏写入。定时清理通过同一屏身份删除过期文件。
- 浏览器资料抢救支持所选屏 HOME 中的 Firefox、Chrome、Chromium，以及应用资料；写回该屏持久目录。失败保留未完成标记，避免重试把部分复制误判为已保留。越界链接和超限文件会报错，不能据此删除旧容器。
- 导出 `migrateLegacyBrowserProfilesToScreen`：仅为 s1 复制旧 `.browser-profiles`，保留旧文件，不覆盖已有屏资料。

除清单文件外，修改了 `server/host/app-publisher.ts`、`server/host/included-hosting.ts`、`server/host/netlify-sites.ts`、`server/pages/publisher.ts`、`server/secret-vault.ts` 和 `server/routes/secret-cards.ts`：这些才是真正读取文件、计算项目 ID、写发布记录和投递密钥的位置，仅改路由映射仍会访问宿主文件系统。新增脚本和资料辅助模块用于分离逻辑，未修改行数上限。

未改 `server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION` 或第一批的屏池/布局代码。

## 交给 E 的接线说明（可用于 PR 说明）

1. 从本轮已分配的屏目标创建 `screenFileAccess(runtime, target)`；只对多屏传入，单屏继续省略访问器。访问器必须来自服务端的已授权目标，不能由请求正文选择屏号。
2. 附件调用 `saveBotAttachment(input, access)`。`BotFolders` 返回值可带 `access`；应用和页面内部路由读取该属性，也可通过上下文的 `access` 注入。`readBotPageBundle` 同样读取它。保留访客路径，不能先映射为宿主路径。
3. `createSecretCards` 注入 `fileAccess(vmKey, botId, threadId)`，按卡片记录的 `shared:sN` 和所属机器人、会话核对当前屏归属：只有该机器人当前仍在该会话中占用该屏，且容器正在运行时，才返回访问器，否则返回 `undefined`。`turnVm` 必须记录屏 key；不能改投恢复时分配的其他屏。失去访问权时返回 `serverError.secret.screenUnavailable`，不写屏文件。单参数重载 `fileAccess(vmKey)` 仅供 sweep 列举并删除过期文件，投递不能调用此重载。HTTP 保存路由已在 F 中接到异步方法。
4. `createPagePublisher` 的 `liveAccess(botId, threadId, source)` 用于重启后恢复屏访问，并在权限或目标失效时返回 `null` 停止刷新。没有该回调时，仅能复用本进程发布时保留的访问器。
5. 多屏重建前先停止各屏进程，但保持容器运行，再按屏抢救资料；全部成功后才能停止/删除容器。调用 `keepFirefoxProfileBeforeRemove` / `keepInstalledAppsBeforeRemove` 时，屏目标的 `stop` 回调必须停止该屏，不能停止整个容器；容器已经停止时应在生命周期层安排保留步骤，不能忽略 exec 失败继续删除。
6. 单屏转多屏后、s1 首次启动前调用 `migrateLegacyBrowserProfilesToScreen(runtime, s1Target)`。HOME 到持久浏览器/应用目录的恢复链接仍属于 B/E 的容器启动接线；F 不修改布局初始化脚本。
7. `botFileSource` 带访问器时返回访客路径；若 E 将同一个 folders 回调交给提取工具，其下游读取也必须使用访问器，不能把返回值当成本机文件路径直接打开。

屏内聊天页面的视频当前按普通文件读入 bundle，受页面总字节上限约束；单屏原有的宿主视频惰性读取方式保持不变。

## 验证

开工已运行 依赖准备脚本，链接 73 项预装依赖。没有使用 systemd 或 Docker；vitest 每次只运行一个文件。

`docs/verification/README.md` 在本 worktree 不存在。新增 `server/testing/screen-files-fixture.ts` 使用独立临时目录和假运行时子进程，执行生产用的容器文件脚本；只将访客根映射到 fixture。写入身份通过记录真实生成的 exec 参数断言。未访问用户 live app 或数据。应用/页面发布测试使用进程内假服务，不建立 TCP 监听。

| 检查 | 结果 |
| --- | --- |
| `pnpm exec tsc -b` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json` | 通过 |
| `pnpm lint` | 仅下列两条获准基线告警；因 `--deny-warnings` 返回 1，无新增告警 |
| `server/screen-files.test.ts` | 8 通过 |
| `server/bot-attachment.test.ts` | 31 通过 |
| `server/routes/app-hosting.test.ts` | 8 通过 |
| `server/routes/published-pages.test.ts` | 9 通过 |
| `server/pages/bundle.test.ts` | 6 通过 |
| `server/host/secret-cards.test.ts` | 40 通过 |
| `server/secret-vault.test.ts` | 13 通过 |
| `server/routes/secret-cards.test.ts` | 10 通过 |
| `git diff --check` | 通过 |
| `scripts/testing/file-size-ratchet.test.ts` | 1 通过；新增源码也均低于 1000 行 |

指定六个文件合计 **102 项通过**。覆盖跨屏及遍历拒绝、父目录/文件/屏根软链接拒绝、大小上限、二进制读写、屏执行身份、私密模式和 stdin 投递、旧映射兼容、附件私有副本、发布记录生命周期、页面刷新、密钥卡片及重用、过期清理、资料抢救和 s1 初始资料迁移。

基线 lint 告警：

- `scripts/public-scan/scan.mjs:297`：`eslint(no-control-regex)`。
- `server/lazy-container-mcp.ts:122`：`unicorn(no-useless-spread)`。

额外运行 `server/local-vm-browser-profiles.test.ts`：7 项通过，5 项失败于准备镜像启动脚本的 `spawnSync /bin/sh EPERM`（第 37 行），尚未进入脚本行为断言。未改断言、未跳过测试；结果以 Actions 为准。

`server/host/secret-cards.test.ts` 早期一轮有一条既有团队/个人同名密钥选择断言失败，单独复跑和最终逐文件回归均为 40 项通过；保留该事实供 Actions 观察，没有通过修改断言掩盖。

本沙箱不能监听 TCP，也没有 Docker，因此未运行端口型服务 E2E、真实容器 uid/权限或实际浏览器迁移验证；带监听服务的既有应用托管集成测试也留给 Actions。不能据本地假运行时测试宣称真实容器验证通过。协调者推分支后的 Actions 为最终验收依据。

## 第 2 轮：审核返工（2026-11-14）

本节替代上文涉及实时刷新回退、软链接抢救和停止容器时序的旧说明。已按八项审核意见修改，未提交 git；未改 `server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION` 或文件行数上限。

### 修复与接线契约

1. **0711 中间目录**：从 `/` 到屏根之前的所有目录使用 `O_PATH | O_DIRECTORY | O_NOFOLLOW`，屏根及以下仍使用原有可读目录描述符，以支持枚举和 `fchmod`。新增 Linux/root 条件测试：中间目录由 root 持有、模式 0711，通过 `setpriv --reuid=61002 --regid=61002 --clear-groups --no-new-privs` 跑生产脚本，验证读、写、列目录、文件 uid 和目录模式。本沙箱 uid=1000，按要求跳过并给出原因；未声称跨 uid 权限实测通过。
2. **屏重新分配后的实时页面**：删除进程内 `sourceAccess`。来源位于 `/home/cua/workspace/screens/` 下时，缺少 `liveAccess` 或它返回 null/undefined，都停止刷新并关闭 live 标记，不再触碰文件。E 必须在每次调用 `liveAccess(botId, threadId, source)` 时核对机器人当前占屏及来源目标；失去原屏必须返回 null。新增两种回归：没有回调、回调在重新分配后返回 null；旧页面不再读取新机器人的文件，也不上传新内容。仍有占屏授权的刷新测试显式注入回调。
3. **批量操作**：访问器增加可选 `tree`、`readMany`、`writeMany`，保留原五个接口。`tree` 一次 exec 返回路径、类型、大小、mtime 清单；发布在筛选并检查总量后，一次批量读取所选文件。页面签名只使用路径/size/mtime，不读取内容。批量内容通过 stdin/stdout 的 JSON/base64 传输，子进程仍逐级用目录描述符和 `O_NOFOLLOW` 拒绝逃逸。回归断言：1 与 30 文件的应用收集均为 **2 exec**、页面 bundle 均为 **4 exec**、签名均为 **1 exec**；完整应用发布从 1 增至 26 文件仍为 **7 exec**。应用资料抢救为 **5 exec**；包含 Chrome 的三种浏览器资料检查及抢救为 **9 exec**，1 与 30 文件相同，另有固定次数的 `cp`。s1 旧资料迁移也改为批量写入。
4. **抢救软链接**：对 `docker cp` 的隔离暂存目录使用 `lstat`/`readlink`，保留链接原文并在屏用户下重建，不对链接调用宿主 `realpath`、不读取链接目标。测试同时覆盖 `/usr/bin/python3` 和宿主不存在的绝对目标，应用资料及 Chrome 抢救均成功；普通屏文件读取仍拒绝这些链接。浏览器锁文件继续跳过。
5. **容器不运行时的明确错误**：导出固定文字 `SCREEN_RESCUE_REQUIRES_RUNNING = "Screen profile preservation requires the container to be running."`。`keepFirefoxProfileBeforeRemove` / `keepInstalledAppsBeforeRemove` 收到屏目标且 `status.container !== "running"` 时，在调用 stop、cp、exec 和所有权错误包装之前直接抛出此错误。**E 的触发时机**：重建/删除前，容器仍运行时先停该屏进程，完成所有屏的抢救，最后停止和删除整个容器；不要在已经停止容器后调用屏抢救。新增测试断言非运行状态下不调用 stop/runtime。
6. **目录模式**：脚本显式设 umask 007，普通新目录为 0770，只有 `.crybot-secrets` 相关路径为 0700；普通和密钥目录模式都有不依赖 root 的实测断言。
7. **宿主自有目录与别名**：附件、应用发布/状态/删除、页面定位和打包共享 `screen-host-files.ts` 的选择逻辑。先尝试当前屏，缺失或不是屏路径时允许自有宿主 roots；对 roots 和候选路径做 realpath 检查，排除 vmWorkspace、其所有屏目录及指向它们的链接。为避免扩大宿主读取范围，与 vmWorkspace 重叠的 root（包括其祖先 root）不用于回退。`/home/crybot-sN/workspace/...` 只映射当前访问器对应的屏，其他屏的别名拒绝。对应附件、应用、页面和访问器测试覆盖自有目录成功、VM 宿主路径/链接拒绝、当前屏别名成功和其他屏别名拒绝。
8. **密钥卡片并发保存**：以 threadId/messageId 为键设进行中锁；第二次保存立即 409，既不写 vaultStore 也不写文件，成功或失败都释放锁。测试阻塞第一次屏写入，断言第二次被拒绝、vault 和文件仅写一次，第一次完成后只恢复一次会话。

批量资料暂存在内存中编码，单文件上限 256 MiB、整批 1 GiB、条目上限 100000、深度上限 32；超限会失败并保留 rescue-pending 标记，接线方不得在抢救失败后删除旧容器。没有进行真实 Docker 或大体积资料压测。

### 本轮验证输出

开工运行 依赖准备脚本：`linked 73 entries`。所有 vitest 按单文件串行执行，没有 systemd、Docker 或 live app 操作；全部新测试使用独立临时目录的 fixture。`docs/verification/README.md` 仍缺失。

完整命令输出（包含初次失败与修正后的复跑）在同目录 [`round2-validation.log`](round2-validation.log)。最终摘要如下：

```text
pnpm exec vitest run server/screen-files.test.ts --reporter=verbose
  Tests  13 passed | 1 skipped (14)
  skipped: Linux root is required to run setpriv with another uid.
pnpm exec vitest run server/bot-attachment.test.ts
  Tests  32 passed (32)
pnpm exec vitest run server/routes/app-hosting.test.ts
  Tests  8 passed (8)
pnpm exec vitest run server/routes/published-pages.test.ts
  Tests  11 passed (11)
pnpm exec vitest run server/pages/bundle.test.ts
  Tests  7 passed (7)
pnpm exec vitest run server/host/secret-cards.test.ts
  Tests  41 passed (41)
pnpm exec vitest run server/secret-vault.test.ts
  Tests  13 passed (13)
pnpm exec vitest run server/routes/secret-cards.test.ts
  Tests  10 passed (10)
pnpm exec vitest run server/local-vm-browser-profiles.test.ts
  Tests  5 failed | 7 passed (12)
  Error: spawnSync /bin/sh EPERM
  at prepareScript server/local-vm-browser-profiles.test.ts:37:3
pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
  Tests  1 passed (1)
pnpm exec vitest run server/bot-box/env.test.ts
  Tests  10 passed (10)
pnpm exec vitest run server/pages/published-pages.test.ts
  Tests  42 passed (42)
pnpm exec tsc -p tsconfig.server.json
  Exit: 0
pnpm exec tsc -b
  Exit: 0
pnpm exec oxlint --deny-warnings <本轮全部 16 个改动的 TypeScript 文件>
  Exit: 0（无输出）
git diff --check
  Exit: 0
```

`secret-cards` 第 236 行既有团队密钥不稳定用例本轮通过。新加重新分配用例初跑的两条失败，是将“关闭 live”写成严格等于 false；存储实际省略该字段，已改为断言记录仍在且 live 不为 true，同时保留“不读取文件、不上传”的关键断言。新增测试的 TypeScript 联合类型问题已修正，最终服务端编译通过。

`pnpm lint` Exit 1，仍只有允许的两条基线告警，无新增告警：

```text
scripts/public-scan/scan.mjs:297:87: warning eslint(no-control-regex)
server/lazy-container-mcp.ts:122:54: warning unicorn(no-useless-spread)
```

旧浏览器启动脚本的 5 项失败与第 1 轮一致，均在沙箱禁止的 `/bin/sh` 同步启动处，尚未进入行为断言。额外尝试 `server/host/app-publisher.test.ts` 后确认其 beforeEach 必须启动 TCP 服务，已停止；本次应用完整发布路径由无监听的 `routes/app-hosting.test.ts` 覆盖。沙箱不允许监听 TCP，因此端口型 E2E/集成验证、真实容器和 root 跨 uid 测试均以 Actions 为准，不将它们记作通过。

本轮新增源码 `server/screen-host-files.ts` 为 33 行；第 1 轮新增的访问器、脚本和资料模块也都不足 1000 行，未修改 ratchet 上限。

## 第 3 轮：复审返工（2026-11-14）

本节替代第 2 轮的整批内存编码、256 MiB 单文件上限和 missing 容器报错说明。任务要求的检出分支为 **`T-1228-screen-files`**；本沙箱实际检出仍为 `master`。已尝试 `git switch -c T-1228-screen-files`，但 `.git` 为只读文件系统，无法创建 ref lock，不能声称已切换成功。需协调者在可写仓库检出目标分支。未提交 git。

### 修复

1. **资料流式写入与缓存过滤**：`transferProfile` 改为异步目录遍历和逐文件读取流，不再将整棵树读入 Buffer 数组。新增可选 `writeStream`；已有 `writeMany` 也复用流式编码，不再整批 base64/JSON.stringify。单次 `exec -u crybot-sN` 接收逐条 JSON 元数据头和指定长度的原始二进制数据；宿主读取块、容器消费块均为 1 MiB，并由 pipeline 背压控制。使用现有 Python 描述符写入器承接流，保留路径分段校验、父目录 `O_NOFOLLOW`、临时文件原子替换和屏用户属主。源软链接只读链接原文；流中新建的链接也不能成为后续写入的父目录。流截断会失败，已有目标文件保留，未完成标记不删除。容器复制及流式写入超时均为 **5 分钟**，普通文件操作仍为 30 秒。
2. **真实可达的限额**：每次资料传输总文件内容上限 **1 GiB**，单个文件可占满该额度，不再受 256 MiB 单文件限制；最多 100000 个子条目、深度 32。每个抢救目录各自计量，旧 `.browser-profiles` 迁移按整棵目录计量。新增隔离 fixture 用稀疏源文件分别验证 **400 MiB、1 GiB** 实际穿过生产写入脚本，校验目标大小、末尾内容和 pending 标记删除，均只用 **1 次写入 exec**。1 GiB + 1 字节拒绝测试不读取巨量数据，并验证 pending 标记保留。这些是本地文件传输验证，不代表实际 Docker 或浏览器登录验证。
3. **浏览器缓存**：抢救和旧资料迁移都跳过 `Cache`、`Code Cache`、`GPUCache`、`Service Worker/CacheStorage`、`ShaderCache`、`GrShaderCache`、`DawnCache`、`component_crx_cache`，另跳过 Firefox 的 `cache2`、`startupCache` 及原有锁文件。测试确认 Cookies、Login Data、Local Storage、IndexedDB 和 Service Worker/Database 保留。应用 `.local` 不应用浏览器缓存过滤。容器 `cp` 仍先复制到独立临时目录，过滤发生在从暂存目录写入持久区时。
4. **卡片锁和本地化**：`saveCustomSecretAsync`、`useSavedSecret`、`provideSecretFromPhone` 共用 `withCardLock(key, fn)`，锁覆盖校验、外部读取、vault 授权/保存、屏文件写入及恢复会话；成功和失败均释放。同步兼容入口也拒绝正在异步保存的卡片。新增三种获胜路径与全部竞争路径的测试，断言只有一次文件投递、没有额外 vault 保存/授权、只恢复一次；另验证失败可重试。409 使用 `userError("serverError.secret.saving")`，已添加英文和简体中文文案。
5. **missing / unmanaged**：两个 `keep…BeforeRemove` 在容器 missing 时返回 `"none"`，不调用 stop/cp/exec；unmanaged 按原约定返回 `"none"`，即使它已停止也不抢救或抛运行状态错误。runtime 不可用同样沿用 `"none"`。只有需要管理和抢救、容器存在但未运行的屏目标才抛 `SCREEN_RESCUE_REQUIRES_RUNNING`。屏目标不会因 `imageMatches` 而略过抢救。新增 missing、停止的 unmanaged、运行中的 unmanaged 测试；原 stopped/managed 拒绝测试保留。
6. **显式 VM 工作区排除**：应用路由、应用发布/状态/删除/定位，以及页面路由、发布器、bundle 和 botFileSource 一路传递 `vmWorkspace` 给 `resolveScreenOrHost`。附带屏访问器才在路由传递此字段，保持单屏调用形状和既有断言。新增包装访问器（不在 WeakMap 中）的回归：宿主自有目录允许，VM 路径和指向 VM 的链接拒绝；应用发布、状态和删除均覆盖。
7. **sweep 不重叠**：整轮开始时置进行中标志，所有屏的清理 Promise 全部 settled 后才释放；期间定时或删除事件触发的 sweep 跳过。测试覆盖一屏失败、其余屏仍阻塞时不启动下一轮，完成后可以再次清理。验证中发现旧 fixture 将同一 s2 访问器返回给四个屏，导致清理与 fixture 删除竞争；已让该 fixture 只返回 s2，并保留四屏并行清理、等待整轮结束的实现。
8. **验证日志**：`round2-validation.log` 中沙箱 worktree 的绝对路径已统一替换为 `<worktree>`；本轮日志同样脱敏。

### 给接线任务补充的两条约定

- `liveAccess(botId, threadId, source)`：来源不在屏目录、实际采用宿主回退的页面，返回 **`undefined`**，使刷新走宿主访问和 roots 检查。屏目录来源仍须验证机器人当前占用该屏；失去授权返回 `null`。不能给所有页面无条件返回当前屏访问器。
- `fileAccess(vmKey, botId, threadId)`：必须核对机器人在该会话中仍占用这块屏；失去归属或容器不运行时返回 **`undefined`**。单参数重载只用于 sweep 清理。抢救则必须提前在容器运行时停止对应屏进程、完成抢救，再停止/删除容器；不能把 missing 和 stopped 的处理混同，也不能在抢救异常后继续删除旧容器。

### 本轮验收

开工执行 依赖准备脚本，链接 73 项依赖。全部 vitest 按单文件串行运行；没有 systemd、Docker 或用户 live app 操作。`docs/verification/README.md` 仍不存在，验证使用独立临时目录、假 runtime 和进程内假服务。完整命令与输出（包括失败、原因和复跑）见 [`round3-validation.log`](round3-validation.log)。

```text
pnpm exec vitest run server/screen-files.test.ts
  Tests  13 passed | 1 skipped (14)
pnpm exec vitest run server/bot-attachment.test.ts
  Tests  32 passed (32)
pnpm exec vitest run server/routes/app-hosting.test.ts
  Tests  8 passed (8)
pnpm exec vitest run server/routes/published-pages.test.ts
  Tests  11 passed (11)
pnpm exec vitest run server/pages/bundle.test.ts
  Tests  8 passed (8)
pnpm exec vitest run server/host/secret-cards.test.ts
  Tests  46 passed (46)
pnpm exec vitest run server/secret-vault.test.ts
  Tests  13 passed (13)
pnpm exec vitest run server/routes/secret-cards.test.ts
  Tests  10 passed (10)
pnpm exec vitest run server/pages/published-pages.test.ts
  Tests  42 passed (42)
pnpm exec vitest run server/local-vm-browser-profiles.test.ts
  Tests  5 failed | 7 passed (12)
  spawnSync /bin/sh EPERM，均位于 prepareScript:37
pnpm exec vitest run server/host/app-publisher.test.ts --bail=1 --hookTimeout=2000
  listen EPERM: operation not permitted 127.0.0.1
  首个 beforeEach 超时；afterEach 因 fake 未创建而失败；其余 28 项未执行
pnpm exec vitest run server/screen-profile-files.test.ts
  Tests  10 passed (10)
pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
  Tests  1 passed (1)
pnpm exec vitest run server/bot-box/env.test.ts
  Tests  10 passed (10)
pnpm exec tsc -p tsconfig.server.json --noEmit
  Exit: 0
pnpm exec oxlint --deny-warnings <全部 16 个改动/新增 TypeScript 文件>
  Exit: 0
```

`screen-files` 的跳过项需要 Linux/root 跨 uid 执行，本沙箱 uid=1000。浏览器脚本的 5 项 EPERM 与前两轮相同，未修改原断言或跳过它们。app-publisher 使用首错停止及较短 hook 超时确认端口限制，未把未执行项记作通过；不监听的应用完整发布、状态、删除由 routes/app-hosting fixture 验证。端口型集成/E2E、真实容器身份和实际登录迁移仍以协调者在可用主机及 Actions 的结果为准。

初次类型检查指出新增测试 fixture 的 screen 为可选类型，已显式提供 screen 数字；初次应用路由 3 项失败是新增字段影响单屏参数形状，已修复，未修改单屏断言。密钥用例一轮遇到清理竞争（已修复）；随后一轮遇到第 236 行既有团队/个人同名密钥不稳定断言，保留失败输出，未改该断言。最终复跑 46 项全部通过，其中本轮的三路径互斥、失败解锁与整轮 sweep 等待测试全部通过。

新文件 `server/screen-profile-files.test.ts` 不足 1000 行；访问器、容器脚本、资料模块等新增源码仍均低于 1000 行。未改 `server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION` 或 ratchet 上限。

## 第 4 轮：复审返工（2026-11-14）

### 修复

1. **葡萄牙语密钥**：为 `src/locales/pt-br.json` 补充 `serverError.secret.saving` 的葡萄牙语译文。locale 检查通过，`source-hashes.json` 无需更新。
2. **1 GiB 边界测试**：400 MiB 继续通过真实 fixture 写入并校验目标文件；1 GiB 测试改为使用稀疏源文件和不消费 payload 的流接收器，仅验证恰好 1 GiB 可接受、超过 1 字节拒绝及 pending 标记行为，不再写满 1 GiB 目标文件。

### 本轮验收

```text
pnpm exec vitest run src/lib/i18n.test.ts
  Test Files  1 passed (1)
  Tests  39 passed (39)

pnpm exec vitest run server/screen-profile-files.test.ts
  Test Files  1 passed (1)
  Tests  11 passed (11)

pnpm exec vitest run server/host/secret-cards.test.ts
  Test Files  1 passed (1)
  Tests  46 passed (46)

node scripts/generate-locale.mjs --check
  pt-br.json: 100% (10587/10587)
  locale catalogs valid (16 languages, 10587 English strings)

pnpm exec oxlint --deny-warnings server/screen-profile-files.test.ts
  Exit: 0（无输出）

git diff --check
  Exit: 0
```

本轮未提交 git。`docs/verification/README.md` 在此 worktree 中不存在；测试使用独立临时 fixture、假 runtime 和进程内假服务，未操作用户 live app。沙箱没有 Docker、systemd，也禁止监听 TCP 端口，因此端口型 E2E/集成验证仍以 Actions 为准。

## 第 5 轮：安全审查返工（2026-11-14）

### 修复

1. 屏资料抢救不再调用 runtime `cp`。`rescueScreenProfile` 通过 `exec -u crybot-sN` 在容器内执行校验和 `tar`，归档从 stdout 流到宿主独立临时文件；容器命令逐级检查 source 的每一级不是软链接，并确认 `realpath` 位于该屏 `/home/crybot-sN` 内。源不存在或容器侧校验不满足时返回 `"none"`；调用方把 `"none"` 视为没有可抢救内容，重建会继续删除旧容器。打包成功但宿主解包、路径过滤或资料转移失败时 reject，并保留 `rescue-pending`，让旧容器保留以便重试。
2. 宿主解包使用安全路径过滤，拒绝绝对路径和 `..` 越界，再沿用现有 `lstat` 遍历、缓存目录过滤、软链接原文保存、1 GiB 上限和 5 分钟流式超时。归档不进入内存；屏用户负责读取内容，宿主只接收 stdout 归档。
3. `server/testing/screen-files-fixture.ts` 新增真实中间软链接判定和 tar 流模拟。新增回归将 s2 的 `.config` 指向 s1 家目录，确认抢救返回 `"none"`、不产生持久内容、不调用 `cp`，并断言 runtime 参数带 `-u crybot-s2`。既有 Firefox、应用和 Chrome 抢救断言同步改为 tar exec 及新的固定调用次数。

迁移路径 `migrateLegacyBrowserProfilesToScreen` 仍只处理 s1 宿主旧 `.browser-profiles`；接线时必须在旧单屏容器停止后执行，且应在删除旧容器前完成。该路径不读取屏 HOME，因此不走屏内 tar 抢救。

### 本轮验收

开工在 worktree 根目录执行 依赖准备脚本，链接 73 项依赖。未使用 systemd、Docker 或用户 live app；vitest 按单文件运行。

```text
pnpm exec vitest run server/screen-profile-files.test.ts --reporter=verbose
  Tests 12 passed (12)
  含新增“中间软链接不得读取另一屏”用例
pnpm exec vitest run server/screen-files.test.ts --reporter=verbose
  Tests 13 passed | 1 skipped (14)
  skipped: Linux root is required to run setpriv with another uid
pnpm exec vitest run server/local-vm-browser-profiles.test.ts --reporter=verbose
  Tests 5 failed | 7 passed (12)
  5 项均在 prepareScript 的 spawnSync /bin/sh EPERM；其余真实 rescue fixture 用例通过
pnpm exec tsc -p tsconfig.server.json --noEmit
  Exit: 0
pnpm exec oxlint --deny-warnings server/screen-profile-files.ts server/screen-profile-files.test.ts server/screen-files.test.ts server/testing/screen-files-fixture.ts
  Exit: 0（无输出）
git diff --check
  Exit: 0
```

本沙箱禁止监听 TCP 端口，不能运行端口型 E2E；真实容器 uid/权限、tar 工具和浏览器登录迁移以 Actions 为准。未提交 git。

## 第 6 轮：宿主解包安全返工（2026-11-14）

### 修复

1. 宿主解包过滤器先拒绝反斜杠，再用同一 `posix.normalize` 形式检查归档路径；绝对路径、包含 `..` 段、空路径和越界路径都会被拒绝。软链接前缀按规范化路径记录，后续落在软链接下的条目会被拒绝；绝对软链接目标仍原样保留，反斜杠和相对越界目标拒绝。
2. 解包只接受 File、Directory、SymbolicLink，硬链接、设备文件和 FIFO 等类型拒绝。过滤器只记录首个错误并返回 `false`，pipeline 完成后再 reject，异常进入调用方 Promise；pending 标记在解包前写入，过滤失败会保留标记。容器内打包命令增加 `--hard-dereference`。
3. 新增构造归档覆盖 `./a/../../...`、软链接逃逸、绝对路径、硬链接、反斜杠路径、反斜杠软链接目标和设备文件，断言解包 reject、pending 保留、目标目录和外部目录没有写入。

### 本轮验收

开工在 worktree 根目录执行 依赖准备脚本，链接 73 项依赖。未使用 systemd、Docker 或用户 live app；vitest 按单文件运行。

```text
pnpm exec vitest run server/screen-profile-files.test.ts
  Test Files 1 passed (1)
  Tests 19 passed (19)
pnpm exec vitest run server/screen-files.test.ts
  Test Files 1 passed (1)
  Tests 13 passed | 1 skipped (14)
pnpm exec vitest run server/local-vm-browser-profiles.test.ts
  Test Files 1 failed (1)
  Tests 5 failed | 7 passed (12)
  5 项均在 prepareScript 的 spawnSync /bin/sh EPERM
pnpm exec vitest run src/lib/i18n.test.ts
  Test Files 1 passed (1)
  Tests 39 passed (39)
pnpm exec vitest run server/host/secret-cards.test.ts
  Test Files 1 passed (1)
  Tests 46 passed (46)
pnpm exec tsc -p tsconfig.server.json
  Exit: 0
pnpm exec oxlint --deny-warnings server/screen-profile-files.ts server/screen-profile-files.test.ts
  Exit: 0（无输出）
```

`local-vm-browser-profiles.test.ts` 的失败是沙箱禁止 `spawnSync /bin/sh`，与本轮解包改动无关；`screen-files` 的跳过项需要 Linux/root 跨 uid。`docs/verification/README.md` 在此 worktree 中不存在。沙箱禁止监听 TCP 端口，端口型 E2E/集成验证仍以 Actions 为准。未提交 git。

## 第 7 轮：复审与密钥投递归属审查返工（2026-11-14）

### 修复

1. **尾斜杠软链接**：归档条目统一使用 `posix.normalize(path).replace(/\/+$/, "")`，链接记录与前缀比较使用相同结果。根路径仅允许 Directory；原始名称以 `/` 结尾的 SymbolicLink 直接拒绝。新增 `./x/`、`./x//` hostile 回归，确认 rescue Promise reject、pending 保留且 fixture 外部目录没有新文件；另补根 File、根 SymbolicLink 和 FIFO 拒绝测试。
2. **根内相对链接**：相对软链接目标按链接所在目录计算规范化目标，仅拒绝越根、空目标或反斜杠目标。`.local/bin/app -> ../share/app/run` 抢救成功且链接文本原样保留；绝对链接目标也原样保留。`a/l -> ../../x` 拒绝。未修改容器打包脚本。
3. **密钥投递归属**：投递调用 `fileAccess(vm, botId, threadId)`，回调必须核对当前屏归属。保存卡片、选用已存密钥、手机提交和直接复用均传入所属机器人、会话；`shared:s...` 拿不到访问器时，在进入 `SecretVault.saveFileWithAccess` / `mintFileWithAccess` / `writeWithAccess` 前拒绝，不能回退到宿主写入。新增 `serverError.secret.screenUnavailable` 中、英、葡文案；HTTP 保存/选择/复用返回 409，手机 Promise 携带同一 errorKey。同步旧入口也返回该本地化错误。sweep 仍沿用单参数访问器重载，仅列举、删除过期文件；接线说明已明确区分投递归属校验与清理用途。
4. **断言位置**：绝对路径 hostile 条目直接指向 fixture 的外部目录。导出 `extractScreenProfile`，将同一 hostile 归档解包到 fixture 内指定 staging，检查其父目录只有 `profile`，以捕获 `./a/../../...` 写入；移除错误的 `tmpdir()/marker` 检查及清理操作。

新增 8 项资料抢救测试、4 项密钥归属测试。正常归属用例验证投递与复用均收到 `shared:s2, ledger, screen-thread`，以屏身份写入私有文件；改分用例覆盖桌面、已存密钥、手机和直接复用，验证没有调用写文件、屏内没有密钥目录、卡片未完成且会话未恢复。

### 本轮验收

开工执行 依赖准备脚本，链接 73 项依赖。所有 vitest 单文件串行运行。完整命令、输出、退出码及初次失败记录见 [`round7-validation.log`](round7-validation.log)，worktree 绝对路径已脱敏。

```text
pnpm exec vitest run server/screen-profile-files.test.ts
  Test Files 1 passed (1)
  Tests 27 passed (27)
pnpm exec vitest run server/screen-files.test.ts
  Test Files 1 passed (1)
  Tests 13 passed | 1 skipped (14)
pnpm exec vitest run server/local-vm-browser-profiles.test.ts
  Test Files 1 failed (1)
  Tests 5 failed | 7 passed (12)
  5 项均在 prepareScript:37 报 spawnSync /bin/sh EPERM
pnpm exec vitest run server/host/secret-cards.test.ts
  Test Files 1 passed (1)
  Tests 50 passed (50)
pnpm exec vitest run server/routes/secret-cards.test.ts
  Test Files 1 passed (1)
  Tests 10 passed (10)
pnpm exec vitest run server/secret-vault.test.ts
  Test Files 1 passed (1)
  Tests 13 passed (13)
pnpm exec vitest run src/lib/i18n.test.ts
  Test Files 1 passed (1)
  Tests 39 passed (39)
node scripts/generate-locale.mjs --check
  pt-br.json: 100% (10588/10588)
  locale catalogs valid (16 languages, 10588 English strings)
pnpm exec tsc -p tsconfig.server.json
  Exit: 0
pnpm exec oxlint --deny-warnings server/screen-profile-files.ts server/screen-profile-files.test.ts server/host/secret-cards.ts server/host/secret-cards.test.ts server/user-errors.ts src/locales/en.json src/locales/zh.json src/locales/pt-br.json
  Exit: 0（无输出）
git diff --check
  Exit: 0
```

密钥测试初次运行 48 通过、2 失败：新增“选用已存密钥”fixture 将同名密钥预先授权给机器人，导致它按现有选择规则不出现在列表，已改为未授权后由用户选用；另一项是第 3 轮已记录的团队/个人同名密钥不稳定断言，未改该断言。复跑 50 项全部通过。类型检查、locale 和 lint 均无错误。

`docs/verification/README.md` 在本 worktree 不存在。所有验证使用独立临时目录、假 runtime 或进程内 fixture，未操作用户 live app 或数据。浏览器脚本 5 项 EPERM 与前轮相同；screen-files 的跳过项需要 Linux/root 跨 uid。沙箱没有 systemd、Docker，禁止监听 TCP 端口，因此端口型 E2E 未运行，以 Actions 为准。

未改 `server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION` 或打包端脚本。新增文件只有验收日志，不超过 1000 行。未提交 git。

## 第 8 轮：解包路径与密钥入库预检（2026-11-14）

仅在第 7 轮逻辑上补两处校验：

1. 解包过滤器拒绝盘符前缀、路径段中的冒号以及 NUL；路径段字符校验与独立 NUL 检查共同满足 `^[^\\/:\0]+$`。软链接目标含冒号也拒绝。links 的存储、同名判断和子路径判断统一使用 `normalized.normalize("NFC").toLowerCase()`，实际解包路径不变。新增 `C:/x`、`C:x`、`a/b:c`、含冒号的软链接目标、`x` 后跟 `X/f`、NFD 链接名后跟 NFC 子路径，以及大小写/Unicode 折叠后同名的条目，共 8 项 hostile 测试；全部断言 reject、rescue-pending 保留、目标未写入且 fixture 外部目录没有新文件。
2. 同步 `storeCustomSecret` 和异步 `storeCustomSecretWithAccess` 在 `vaultStore.saveSecret` 前为文件型密钥调用 `accessFor(vm, botId, threadId)`。手机提交复用异步入口，失去屏归属时沿用原有 `serverError.secret.screenUnavailable` 错误及 HTTP 409 映射。改分测试覆盖同步桌面、异步桌面和手机提交，断言 Vault 没有新密钥；已存密钥选择与直接复用仍验证原有 Vault 值未被替换。

开工执行 依赖准备脚本，成功链接 73 项预装依赖。所有 vitest 按单文件串行运行，使用独立临时目录、假 runtime 或进程内 fixture，未操作用户 live app 或数据。完整命令、输出和退出码见 [`round8-validation.log`](round8-validation.log)。

```text
pnpm exec vitest run server/screen-profile-files.test.ts
  Test Files  1 passed (1)
       Tests  35 passed (35)
  Exit: 0
pnpm exec vitest run server/host/secret-cards.test.ts
  Test Files  1 passed (1)
       Tests  51 passed (51)
  Exit: 0
pnpm exec vitest run server/routes/secret-cards.test.ts
  Test Files  1 passed (1)
       Tests  10 passed (10)
  Exit: 0
pnpm exec vitest run server/secret-vault.test.ts
  Test Files  1 passed (1)
       Tests  13 passed (13)
  Exit: 0
pnpm exec tsc -p tsconfig.server.json
  Exit: 0（无输出）
pnpm exec oxlint --deny-warnings server/screen-profile-files.ts server/screen-profile-files.test.ts server/host/secret-cards.ts server/host/secret-cards.test.ts
  Exit: 0（无输出）
git diff --check
  Exit: 0（无输出）
```

合计 109 项测试通过。密钥卡片测试初次为 50 通过、1 失败：正常投递用例原先只期望两次归属校验，新增入库前预检后实际为三次；更新这条次数断言后复跑 51 项全部通过，类型检查和 lint 再次通过。初次失败输出也保留在日志中。

`docs/verification/README.md` 在此 worktree 中不存在。沙箱没有 systemd、Docker，禁止监听 TCP 端口，因此端口型 E2E 未运行，以 Actions 为准；本地 fixture 不能替代 macOS/Windows 原生文件系统验证。

未改 `server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION` 或打包端脚本。未提交 git。
