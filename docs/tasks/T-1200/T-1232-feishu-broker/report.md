# T-1232 飞书令牌代领服务

## 实现范围

新增独立 Unix 套接字 broker、仓库内的 `lark-cli` 包装器，以及 Claude（驱动标识 `claudeAgent`）的按轮次授权接入。没有安装服务、修改系统用户、读取真实凭证或调用真实飞书接口；`meegle` 不接入。

当前其他驱动不注入飞书能力，也不添加飞书提示。它们包含共享进程和不同的环境/会话快照机制，不能直接套用 Claude 的注入逻辑。本次按任务指向的 Claude 启动链路实现；若部署需要其他驱动，应先补齐相应的进程隔离与不落盘验证，再启用。

前几轮的工作记录保留在下文；当前部署要求及安全边界以第 5 轮为准。本轮不提交或推送。

## 文件与行为

| 文件 | 修改内容 |
| --- | --- |
| `server/feishu-cli/broker.ts` | 读取独立用户专有的凭证 JSON；POST 配置的 tokenUrl，禁止重定向，20 秒超时；校验三项返回值；仅缓存短期令牌，剩余时间不超过 5 分钟时重新代领，刚成功取得且仍有效的令牌至少复用 60 秒；合并并发请求；失败冷却 30 秒；只监听 Unix socket。 |
| `server/feishu-cli/protocol.ts` | 共享令牌校验、刷新阈值及 Unix socket 客户端。客户端 22 秒总超时和响应大小限制。 |
| `server/feishu-cli/wrapper.ts`、`scripts/lark-cli.mjs` | 优先使用本轮环境中的短期令牌，临近到期或失效时经 socket 重取；清理继承的飞书/项目环境；固定用户身份；拒绝 config/update；处理 help/version/auth；原样传递 CLI 退出码；Windows cmd 包装器走固定 JS 入口，不启 shell。 |
| `server/feishu-cli/turn.ts` | union_id 白名单、只在内存中的取令牌能力、中英文飞书说明；broker 失败降级为无飞书能力的正常轮次；仅传递不可用提示及结构化授权链接，不将任意错误正文送入系统提示。 |
| `server/feishu-login.ts` | 复用已有 union_id 列表解析器；新增禁止通配符模式；告警不回显名单内容。 |
| `server/sessions.ts` | 从现有有效 SessionRecord 的 personKey 和 accessIdentity 查询 union_id，不增加身份文件或前端字段。 |
| `server/contracts.ts` | 增加只供服务端使用的轮次能力回调；可序列化轮次字段不携带令牌。 |
| `server/credential-env.ts` | 普通子进程清理 CRYBOT_FEISHU_*、LARKSUITE_CLI_*、MEEGLE_*，阻止继承服务端配置中的身份。 |
| `server/index.ts` | 仅单聊按当前请求可证明的发起人确定身份，名单内的 Claude 轮次获得能力和说明；群聊和受限轮次不启用。 |
| `server/drivers/claude.ts` | 启动进程时才取令牌并合并到局部环境，不进入参数、MCP 配置或保温合同；授权轮次独立启动，结束后退出；授权变化不复用旧进程。 |
| `scripts/feishu-broker/main.mjs`、`config.example.json`、`crybot-feishu-broker.service` | 独立服务入口、占位配置、systemd 单元模板。 |
| `scripts/public-scan/allow-domains.txt` | 精确列入两个 systemd target 单元名；它们在模板中是 OS 单元引用，被域名扫描误识别，不是网络地址。 |
| `server/feishu-cli/*.test.ts` | broker、包装器、身份和提示单测；本地假 HTTP 上游、socket 权限、驱动及完整服务器隔离 fixture 测试。 |

身份链路：飞书登录将身份记为 `accessIdentity = feishu:<union_id>`。认证消息的 sender.id 来自既有 `personKey`。单聊通过 `provenRequestPerson` 校验当前请求的 messageId、generation 和 stopped 状态，再用 `linePersonKey` 读取该消息的 sender.id；不回退到 thread starter 或上一条用户消息。例行任务、peer bot、无 sender 或无法证明当前发起人的轮次一律关闭。群聊本期一律关闭，后续按需再开。SessionRegistry 在有效会话中解析该 personKey 对应的唯一飞书 union_id。匿名、非飞书登录、已撤销或身份不明确的来源不授权。

broker 返回非 2xx 时仅转发 `message`、`authorization_url`，不复制其他上游字段，也不自动刷新 OAuth refresh token。上游若原样回显长期凭证，整份响应改为固定失败；异常详情不打印。凭证文件必须是归 broker 用户所有、组与其他用户均无权限的普通文件。socket 目录归 broker 用户和进程主组所有，最终目录 750、socket 660；创建期间目录收紧为 700。已有 socket 不覆盖、不自动删除。

包装器无本轮令牌时，即使继承了 socket 路径，也返回「当前对话未开通飞书」并退出 1。help/version 不取令牌；config/update 即使带 help 也拒绝；auth status 只输出 `{"authorized":true,"identity":"user"}`；其他 auth 操作引导到授权页。真实 CLI 只收到 LARKSUITE_CLI_APP_ID / LARKSUITE_CLI_USER_ACCESS_TOKEN 以及固定的 STRICT_MODE=user、DEFAULT_AS=user、BRAND=feishu；不收到本轮 broker 环境。

## 配置项

broker 的 JSON 配置只由 broker 系统用户读取：

| 名称 | 含义 | 占位示例 |
| --- | --- | --- |
| `tokenUrl` | 代领接口完整 URL；强制 HTTPS，仅本地回环主机允许 HTTP | `https://example.invalid/token` |
| `credentialFile` | 长期凭证 JSON 的绝对路径，内容格式为带字符串 token 字段的对象 | `/etc/crybot-feishu-broker/credential.json` |
| `socketPath` | broker Unix socket 绝对路径，目录由独立用户拥有 | `/run/crybot-feishu-broker/token.sock` |

Cry Bot 服务的环境变量（上线必须开启沙箱）：

| 名称 | 含义 | 占位示例 |
| --- | --- | --- |
| `CRYBOT_BOT_BOX` | 必须为 on，且启动检测为 bwrap，沙箱成功运行 | `on` |
| `CRYBOT_FEISHU_CLI_USERS` | 飞书 union_id；去空白、去重后只允许一人，超过一人失败关闭并告警；禁止 `*`；未配置则关闭 | `union_example` |
| `CRYBOT_FEISHU_BROKER_SOCKET` | 与 broker 配置一致的 socket 路径 | `/run/crybot-feishu-broker/token.sock` |
| `CRYBOT_LARK_CLI_EXECUTABLE` | 真正的 @larksuite/cli 可执行文件绝对路径，不能指回包装器 | `/opt/crybot-lark/node_modules/.bin/lark-cli` |
| `CRYBOT_FEISHU_AUTHORIZATION_URL` | 可选，其他 auth 子命令提示的授权页；未配置则提示找管理员 | `https://example.invalid/authorize` |

仅由服务端为获准轮次临时注入，**不得配置到服务环境文件、config.json 或 shell 启动文件**：

| 名称 | 含义 | 占位示例 |
| --- | --- | --- |
| `CRYBOT_FEISHU_USER_TOKEN` | 短期飞书用户令牌 | `<本轮短期令牌>` |
| `CRYBOT_FEISHU_APP_ID` | 代领接口返回的 app_id | `cli_example` |
| `CRYBOT_FEISHU_EXPIRES_AT` | 过期 Unix 秒 | `1800003600` |

轮次环境还带 socket 路径及可选授权页。服务端已有的飞书登录 `CRYBOT_FEISHU_APP_ID` 仍可照常配置；智能体子进程先清掉继承值，再使用代领结果，不能用登录 app_id 猜代领结果。

一个 broker 对应一份员工长期凭证，白名单应由管理员核对为该凭证所属的飞书身份。上游只返回规定的三字段，无法据此自行核验 union_id；不要将不同员工误配到同一个凭证。多员工各自身份需要独立 broker 和相应路由，当前配置为单 broker。

## 协调者安装步骤

**上线前置条件：必须设置 `CRYBOT_BOT_BOX=on`，安装可用的 bubblewrap 并确认启动检测为 `bwrap`。检测失败时飞书代领自动停用；不得以关闭沙箱替代修复。broker socket 必须位于专用 `/run/crybot-feishu-broker/` 目录，不可放入 HOME、代码目录或智能体共享挂载。**

以下操作只用于真实 Linux 主机上的协调者；本云沙箱没有 systemd，不在本任务中执行。示例假设 Cry Bot 运行用户及组叫 `crybot`，代码部署在 `/opt/crybot`，Node 24 在 `/opt/node24/bin/node`。按现场情况修改用户组和绝对路径。

1. 将审核后的源码部署到 `/opt/crybot`。broker 入口及其导入的 TS 文件必须存在；使用 Node 24，不能只拷贝入口文件。程序文件由 root 管理，Cry Bot 用户不可写。管理员将审核过的 `@larksuite/cli` 固定版本安装到独立的 `/opt/crybot-lark`，同样只允许管理员更新。配置真实 CLI 的路径，不使用动态 PATH 搜索代替真实入口。
2. 创建独立系统用户，主组设为 Cry Bot 的组，并创建私有配置目录：

   ```sh
   sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid crybot crybot-feishu-broker
   sudo install -d -o crybot-feishu-broker -g root -m 0700 /etc/crybot-feishu-broker
   sudo install -o crybot-feishu-broker -g root -m 0600 /opt/crybot/scripts/feishu-broker/config.example.json /etc/crybot-feishu-broker/config.json
   ```

3. 管理员用安全方式写入 `credential.json`，格式为 `{"token":"<管理员安全提供的长期凭证>"}`。不要把真实内容放在仓库、命令行参数、shell history 或日志中。设置 owner 为 `crybot-feishu-broker`、mode 0400。编辑 config.json 中的 tokenUrl 和路径。必须移除旧包装器、原同用户可读凭证文件及其他可读副本；既然凭证曾被智能体读取，应在管理员侧撤销/轮换旧长期凭证。文件权限才是隔离边界，包装器拒绝读文件不能替代权限。
4. 安装包装器和服务模板：

   ```sh
   sudo ln -s /opt/crybot/scripts/lark-cli.mjs /usr/local/bin/lark-cli
   sudo install -o root -g root -m 0644 /opt/crybot/scripts/feishu-broker/crybot-feishu-broker.service /etc/systemd/system/crybot-feishu-broker.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now crybot-feishu-broker.service
   ```

   模板的 `ExecStart=/opt/node24/bin/node ...` 是 Node 24 绝对路径占位值，安装前须改为现场实际的 Node 24（或更高版本）路径，并确认包装器 PATH 中的 node 也满足版本要求。两个入口在加载 TS 模块前检查版本，低版本输出中文说明并以非零退出。

   如已有同名命令，由管理员检查后替换，不能继续保留旧的读长期凭证包装器。确认 `/usr/local/bin` 在智能体 PATH 中。Windows 的真实 CLI 路径应指向 npm 全局 `.cmd` shim（相邻 `node_modules/@larksuite/cli/scripts/run.js`）；包装器使用 Node 固定入口，不通过 cmd 拼接用户参数。broker 部署仍为 Linux Unix socket。

5. 在 Cry Bot 服务的现有环境配置中填写上表服务变量，包括 `CRYBOT_BOT_BOX=on`，并确认启动检测为 `bwrap`，再上线 broker 和 Cry Bot。不要填写任何短期令牌。配置缺失或名单为空时不会授予能力。模板使用独立 User、Cry Bot Group、RuntimeDirectory、ProtectSystem=strict、NoNewPrivileges=yes、PrivateTmp=yes、只读绑定配置/凭证目录及禁用 core dump；broker 仅向上游发起网络请求，不开 TCP 监听。
6. 检查 `systemctl status crybot-feishu-broker`，用 `stat` 核对 runtime 目录 owner/group/mode 和 socket 的 group/mode；用 Cry Bot 系统用户执行 `test ! -r /etc/crybot-feishu-broker/credential.json` 应成功。不要用 curl 打印真实令牌做验收。先运行下述全套隔离测试，再由协调者在获准对话中做不回显令牌的 `lark-cli auth status` 与只读业务验收。

停止服务会清理 RuntimeDirectory。异常残留 socket 由管理员确认无活跃 broker 后处理；服务不会擅自覆盖现有路径。

## 可重复测试与验证结果

先在 worktree 根目录运行 依赖准备脚本。下列命令每次只跑一个测试文件，不加 systemd-run 前缀：

```sh
pnpm exec vitest run server/feishu-cli/broker.test.ts
pnpm exec vitest run server/feishu-cli/wrapper.test.ts
pnpm exec vitest run server/feishu-cli/turn.test.ts
pnpm exec vitest run server/feishu-cli/socket.e2e.test.ts
pnpm exec vitest run server/feishu-cli/claude.e2e.test.ts
pnpm exec vitest run server/feishu-cli/server.e2e.test.ts
pnpm exec vitest run server/feishu-login.test.ts
pnpm exec vitest run server/credential-env.test.ts
pnpm exec vitest run server/sessions.test.ts
pnpm exec tsc -p tsconfig.server.json --pretty false
pnpm exec oxlint --deny-warnings server/feishu-cli server/feishu-login.ts server/sessions.ts server/contracts.ts server/credential-env.ts server/drivers/claude.ts server/index.ts scripts/lark-cli.mjs scripts/feishu-broker/main.mjs
```

broker 单测覆盖并发合并、POST/redirect/超时信号、缓存、5 分钟刷新边界、严格字段校验、原样错误字段、30 秒冷却、失败后不返回旧令牌、长期凭证不在响应及日志中。socket e2e 使用本地假 HTTP tokenUrl，并检查 660/750 和 socket 属组，非 Linux 跳过。包装器测试用临时的假真 CLI 记录环境，仅写入合成测试值，验证身份清理及退出码 10。轮次测试验证现有 SessionRegistry 身份、名单拒绝、通配符告警、中英文提示、序列化结果不含令牌。

驱动 e2e 验证获准轮次环境、拒绝保温、同一对话下一轮撤权、事件与文件不含令牌。完整服务器 e2e 使用 `launchRestartableServer` 的隔离数据目录，分别用两个假飞书登录会话发消息，检查真实驱动启动环境、系统提示、SSE、前端会话接口、日志和最终存储文件；假 CLI 的临时观测文件在测试中会短暂含合成令牌，仅用于断言，最终被覆盖/删除。

检查了本机 Claude Code 2.1.288 的 shell snapshot 生成逻辑：保存函数、别名、shell 选项和 PATH，不全量序列化继承的进程环境；本实现不把飞书令牌写入这些字段。这是静态核查，尚未在真实 CLI 执行工具的隔离测试中验证，协调者更换原生 CLI 版本时需用合成凭证重新检查。

本机实际为 **Node v24.22.3**，并非任务环境说明中预期的 Node 22。已执行 依赖准备脚本；本次没有遇到 TS 直接运行版本不兼容。Node 22 环境若无法运行 TS 或 fixture，仍以仓库 Node 24 Actions 为准。

本机通过：broker 15 项、包装器 11 项、轮次 7 项、飞书登录回归 13 项、凭证环境回归 2 项、session 回归 75 项，共 123 项；服务端 TypeScript 检查、改动文件 oxlint、git diff --check 通过。公开内容检查使用仓库 scanDiff 扫描工作区 diff（包含未跟踪的新文件）；无真实地址或凭证写入。

本机端到端限制：HTTP socket 测试报 `listen EPERM`；Claude fixture 也在 Unix permission socket 监听时报 `EPERM`，修正测试清理代码后由 Actions 重跑。按 AGENTS.md 尝试 `node --experimental-strip-types scripts/control-cry.ts launch`，因监听被禁止返回 `no free port block`。完整服务器 e2e 同样需要监听，本机未宣称通过。当前仓库缺少 AGENTS.md 指向的 `docs/verification/README.md`；使用仓库既有的隔离验证入口，未验证或修改用户 live app/data。既有 `.github/workflows/ci.yml` 使用 Node 24 且匹配新增的 server 测试；Actions 尚未在本任务中执行，不能视为已经通过。

## 已知局限

- 必须开启沙箱是上线前置条件；非 bwrap 或沙箱未成功运行时自动停用。获准智能体仍能主动输出或写入自己持有的短期令牌；进程隔离不能阻止它泄漏自身权限内的内容。
- 写操作/发消息前确认由系统提示要求；包装器保留真实 CLI 的高风险退出码 10，不自动绕过。提示不是所有 CLI 写 API 的强制授权网关。
- 单 broker 对应单凭证身份；其他驱动及多员工路由的范围见上文。没有接入 meegle，没有 refresh token，也不会自行刷新 OAuth 凭证。
- 同一机器人线程若有其他登录用户进入，飞书轮次读到的内容会留在该线程历史里；当前飞书直登只开放给一个人，所以不构成问题，放开多人前要另行处理。


## 第 2 轮返工

本轮基于工作区现有实现修改；未安装系统服务、接触真实凭证或用户 live app/data。当前仅对名单内用户本人发起、身份可证明的 Claude 单聊轮次开放飞书；群聊不在本期范围，后续按需再开。长期凭证的读取、属主/权限校验、回显即失败、仅内存短期缓存和无 refresh 逻辑保持原有边界。

1. **取令牌失败降级**：`turn.ts` 的取环境回调吞掉 broker 失败并返回空环境；Claude 驱动在生成启动系统提示前取令牌，随后选择正常飞书说明或中英文「飞书暂不可用」。`protocol.ts` 将非 200 的授权错误保留为结构化类型；存在 `authorization_url` 时，提示明确要求智能体在回复中告诉用户去该链接授权。任意错误正文（包括可能夹带令牌的 message）不进入系统提示，不抛轮次错误、不记错误日志，因此不进入事故上报路径。失败时无 CRYBOT_FEISHU_* 或 LARKSUITE_CLI_* 注入，也不附 lark-cli 用法。单测覆盖断连和两种语言的授权提示；服务器 fixture 覆盖 403 `{message, authorization_url}`、broker 离线、`turnSucceeded:true`、无事故通知/失败活动，以及提示和最终回复中的链接。
2. **Node 版本**：两个 mjs 入口先检查 Node 主版本至少 24，再动态导入 TS；不足时只输出「需要 Node 24 及以上版本，请升级 Node 后重试」并退出 1。systemd 模板使用 `/opt/node24/bin/node`，安装说明明确要求按实际路径修改。入口测试在独立子进程中模拟 Node 20/22，覆盖两个入口及无堆栈输出。
3. **严格单聊身份**：`directFeishuCliAccess` 使用现有 `provenRequestPerson`，由 `index.ts` 提供当前请求、派发 generation 和对应消息查询；不使用 thread starter 回退。测试构造名单内用户开启的会话，再放入无 sender / peer bot 请求，确认不授予能力、不请求 broker；同时覆盖过期 generation、stopped、缺失请求和合法当前请求。
4. **群聊关闭**：删除群聊派发处的飞书能力与系统提示注入。服务器 fixture 中让名单内用户向群内机器人提问，断言正常完成、无飞书令牌/socket 环境、无 lark-cli 提示且不额外访问 broker。
5. **最短重取间隔**：broker 记录成功取令牌的时间；仍有效的缓存令牌即使已经处于 5 分钟窗口内，也在 60 秒内复用。测试覆盖 59,999 ms 不重取、60,000 ms 重取；已过期令牌不复用，仍执行有效性校验并重新获取。失败的 30 秒冷却及并发合并保持原行为。
6. **启动诊断**：固定中文启动错误使用受限的 `BrokerStartupError` 类型，入口原样输出 message；其他错误只输出固定「飞书代领服务启动失败，请检查配置和权限」，不打印异常对象或堆栈。测试用隔离凭证文件的错误权限和含合成敏感标记的缺失路径验证两种输出。
7. **包装器测试补强**：快过期测试改为 `calendar list`，检查假 CLI 实际收到的新 `LARKSUITE_CLI_USER_ACCESS_TOKEN`；重取被拒时检查 message、authorization_url、非零退出、无令牌回显且假 CLI 未启动。原前置全局参数拦截策略不变，meegle 不接入。
8. **公开扫描注释**：保留两个 systemd 单元名白名单项，将同行说明改为中文。

### 本轮验证

已先运行 依赖准备脚本，全部命令使用 PATH 中的 **Node v24.22.3**，每次仅运行一个测试文件，没有使用 systemd-run。

先红后绿：新增的 60 秒复用用例在旧逻辑下观测到重复上游请求；断连降级用例在旧逻辑下抛出「飞书授权暂不可用」；严格请求身份的新测试在接入入口尚未实现时失败。入口测试另以返工前入口复跑，确认旧入口没有拒绝低版本、已知权限错误仍被笼统启动错误掩盖，恢复修复后通过。包装器新增断言用于补强已有行为。监听限制使完整服务器的新场景无法在本机完成红绿验证，不宣称端到端已通过。

| 检查 | 本轮结果 |
| --- | --- |
| `pnpm exec vitest run server/feishu-cli/broker.test.ts` | 17 项通过 |
| `pnpm exec vitest run server/feishu-cli/wrapper.test.ts` | 12 项通过 |
| `pnpm exec vitest run server/feishu-cli/turn.test.ts` | 12 项通过 |
| `pnpm exec vitest run server/feishu-cli/protocol.test.ts` | 1 项通过，模拟 HTTP 403 响应并检查结构化授权信息，不复制令牌字段 |
| `pnpm exec vitest run scripts/feishu-broker/entrypoints.test.mjs` | 3 项通过 |
| `pnpm exec vitest run server/feishu-cli/socket.e2e.test.ts` | 2 项在 HTTP 监听时报 `listen EPERM` |
| `pnpm exec vitest run server/feishu-cli/claude.e2e.test.ts` | 1 项在 permission broker 的 Unix socket 监听时报 `EPERM` |
| `pnpm exec vitest run server/feishu-cli/server.e2e.test.ts` | 1 项（包含成功、名单外、群聊、403、离线场景）在 fixture broker 的 Unix socket 监听时报 `EPERM` |
| `pnpm exec tsc -b --pretty false` | 通过 |
| `pnpm exec tsc -p tsconfig.server.json --pretty false` | 通过 |
| 改动代码及测试文件 `oxlint --deny-warnings` | 无告警 |
| `pnpm lint` | 只有约定的两条基线告警：`scripts/public-scan/scan.mjs:297`、`server/lazy-container-mcp.ts:122`；因 `--deny-warnings` 退出 1 |

单测共 45 项通过。新增测试和原有 e2e 全部使用临时目录及合成身份/凭证；完整服务沿用 `launchRestartableServer` 隔离 fixture。仓库仍缺少 AGENTS.md 指向的 `docs/verification/README.md`。本沙箱不允许监听端口或 Unix socket，端到端结果以仓库 Node 24 Actions 为准；本轮没有运行 Actions，不将上一轮端到端通过记录视为本轮通过。

另已尝试 `node --experimental-strip-types scripts/control-cry.ts launch` 启动独立验证实例，返回 `no free port block`，与监听禁令一致。`git diff --check` 通过；公开扫描通过仓库 `scanDiff` 检查本轮 diff（含两个未跟踪的新测试文件），未发现问题。扫描环境未配置私有 denylist 密钥，因此私有词表检查未执行；新增测试地址均为 `example.invalid`，身份与凭证均为合成夹具值。

## 第 3 轮小修

本轮继续使用隔离测试夹具，没有安装服务、读取真实凭证或接触用户 live app/data。

1. **启动错误可诊断**：`BrokerStartupError` 新增「飞书代领服务无法创建套接字」消息，监听失败时由 `main.mjs` 原样输出；无效 tokenUrl、缺失凭证文件和套接字目录创建失败分别归一为固定配置、凭证或套接字错误，避免泄露原始路径和系统错误。入口测试用带尾斜杠的 Unix 路径触发监听失败并检查 stderr 原文。
2. **授权链接校验**：轮次只接受可解析、`https`、无空白和控制字符且长度不超过 2048 的 `authorization_url`。上游没有安全链接时才使用 `CRYBOT_FEISHU_AUTHORIZATION_URL`，配置值也经过相同校验；不安全链接不会进入系统提示。新增换行、HTTP、超长链接及配置回退用例。
3. **公开扫描说明**：保留两个 systemd target 白名单行，并将同行说明统一为中文。

### 本轮验证

先运行 依赖准备脚本，测试逐文件执行，使用 PATH 中的 Node 24；没有使用 `systemd-run`。

| 检查 | 本轮结果 |
| --- | --- |
| `pnpm exec vitest run server/feishu-cli/broker.test.ts` | 20 项通过 |
| `pnpm exec vitest run server/feishu-cli/wrapper.test.ts` | 12 项通过 |
| `pnpm exec vitest run server/feishu-cli/turn.test.ts` | 17 项通过 |
| `pnpm exec vitest run scripts/feishu-broker/entrypoints.test.mjs` | 4 项通过 |
| `pnpm exec vitest run server/feishu-cli/socket.e2e.test.ts` | 2 项因本沙箱禁止监听 HTTP 端口而报 `listen EPERM`，以 Actions 为准 |
| `pnpm exec vitest run server/feishu-cli/server.e2e.test.ts` | 1 项因本沙箱禁止监听 Unix socket 而报 `listen EPERM`，以 Actions 为准 |
| `pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false` | 通过 |
| `pnpm exec oxlint --deny-warnings`（本轮改动代码和测试） | 通过 |

本轮新增测试均使用临时目录、`example.invalid` 和合成凭证。端到端测试没有在禁止监听的沙箱内宣称通过；Actions 负责完整监听环境验证。


## 第 4 轮小修

以下记录描述第 4 轮当时的实现与验证；其中未装箱注入及不开放盒内能力的状态，已由第 5 轮的失败关闭和逐轮盒内授权替代，不作为安装指引。

本轮只修文件行数和环境变量归属两个 CI 失败。未提交 git，未安装系统服务或访问真实凭证、live app/data。

### 改动与边界

- 新增 `server/drivers/claude-turn-launch.ts`，承接飞书取令牌、取令牌后拼接系统提示、启动环境清理/合并，以及保温合同的保存/清除。`claude.ts:1243` 用一行调用准备启动，spawn 时调用返回的环境函数，`claude.ts:1355` 用一行调用处理保温合同。取令牌和提示的先后顺序、spawn 时才合并环境、获准飞书轮次及受限轮次不保温的行为保持不变。
- `server/drivers/claude.ts` 从 **2097 行降到 2087 行**，没有修改 ratchet 上限，也没有通过压行隐藏逻辑。
- `server/bot-box/env.test.ts` 补齐服务端配置及本期按轮次注入的变量归属。**没有扩大 `BOX_ENV_CRYBOT_NAMES`**。当前设计的包装器用于未装箱的 Claude 进程；装箱后 `box.ts:106` 仍用 `boxEnvironment` 过滤飞书配置与令牌，也没有新增 broker socket 挂载。此处 SERVER_ONLY 表示不经盒子全局白名单放行，不表示包装器从来不读该名字。
- 正常注入链路仍是 `index.ts:8411` → `directFeishuCliAccess` / `provenRequestPerson` → `feishuCliAccess` 检查 union_id 名单 → `claudeTurnLaunch` → 本轮 spawn 环境。群聊、无可证明发起人和名单外用户均无此能力。继承的飞书变量先清掉，再合并本轮授权结果；其他智能体的盒子拿不到这些名字。没有绕过盒子过滤的额外注入路径。未来要启用盒内飞书，需要另外实现按用户挂载 socket/包装器和环境授权，本轮不将配置或令牌升级为全局可继承变量。
- `CRYBOT_FEISHU_` 是整族清理正则的前缀，并非通过拼接生成某个变量名。现有读取位置已经使用完整名字；将清理正则改为有限枚举会漏掉未来或未知的凭证变量，削弱安全边界。因此沿用测试已有的尾下划线族登记方式，登记到 SERVER_ONLY，并说明原因。
- `turn.test.ts` 新增 3 个行为测试：获准令牌与其他用户/盒子/保温合同隔离；取令牌失败后才生成授权提示且不保温；普通启动合同仍复制参数、环境和嵌套配置，受限轮次清除合同。

### CRYBOT_FEISHU 名字归属

下表覆盖代码中的全部飞书名字，并补列扫描同样发现的包装器路径变量。所有 SERVER_ONLY 均登记在 `server/bot-box/env.test.ts`；本轮无 BOX 新增。

| 名字 | 归属 | 读它的文件:行 | 理由 |
| --- | --- | --- | --- |
| `CRYBOT_FEISHU_CLI_USERS` | SERVER_ONLY（新增） | `server/feishu-cli/turn.ts:29` | 服务端解析 union_id 名单，禁用通配符；不向智能体传名单。 |
| `CRYBOT_FEISHU_AUTHORIZATION_URL` | SERVER_ONLY（新增） | `server/feishu-cli/turn.ts:44`、`:50`；`server/feishu-cli/wrapper.ts:36` | 服务端配置用于失败提示回退；成功时只随获准未装箱轮次提供给包装器的 auth 提示，不全局放行。 |
| `CRYBOT_FEISHU_BROKER_SOCKET` | SERVER_ONLY（新增） | `server/feishu-cli/turn.ts:30`；`server/feishu-cli/wrapper.ts:30`、`:31` | 服务端代领，以及获准未装箱轮次的包装器重取；不向盒子透传路径或新增挂载。 |
| `CRYBOT_FEISHU_USER_TOKEN` | SERVER_ONLY（新增） | `server/feishu-cli/wrapper.ts:27`、`:28` | `turn.ts:40` 生成，`claude-turn-launch.ts:8`、`:13` 按获准轮次注入；包装器读取短期令牌，不通过盒子全局白名单。 |
| `CRYBOT_FEISHU_EXPIRES_AT` | SERVER_ONLY（新增） | `server/feishu-cli/wrapper.ts:28` | `turn.ts:42` 随短期令牌逐次注入，包装器判断过期和重取；盒子继续拒绝。 |
| `CRYBOT_FEISHU_APP_ID` | SERVER_ONLY（既有） | `server/feishu-login.ts:66`；`server/app-links.ts:104`；`server/feishu-cli/wrapper.ts:28` | 服务端登录配置；包装器所用同名值来自 `turn.ts:41` 的 broker 结果，继承登录值被清掉，不全局放行。 |
| `CRYBOT_FEISHU_APP_SECRET` | SERVER_ONLY（既有） | `server/feishu-login.ts:73` | 登录服务端密钥，智能体不需要。 |
| `CRYBOT_FEISHU_APP_SECRET_FILE` | SERVER_ONLY（既有） | `server/feishu-login.ts:74` | 登录密钥文件路径，只由服务端读取。 |
| `CRYBOT_FEISHU_TENANTS` | SERVER_ONLY（既有） | `server/feishu-login.ts:68` | 登录租户限制。 |
| `CRYBOT_FEISHU_ALLOW` | SERVER_ONLY（既有） | `server/feishu-login.ts:95` | 登录允许名单，不等同于 CLI 能力名单。 |
| `CRYBOT_FEISHU_ADMINS` | SERVER_ONLY（既有） | `server/feishu-login.ts:96` | 服务端管理员身份判定。 |
| `CRYBOT_FEISHU_SESSION_MAX_DAYS` | SERVER_ONLY（既有） | `server/feishu-login.ts:98` | 登录会话有效期。 |
| `CRYBOT_FEISHU_TOKEN_ENDPOINT` | SERVER_ONLY（既有） | `server/feishu-login.ts:109` | 登录服务端的令牌接口覆盖。 |
| `CRYBOT_FEISHU_USER_INFO_ENDPOINT` | SERVER_ONLY（既有） | `server/feishu-login.ts:110` | 登录服务端的用户信息接口覆盖。 |
| `CRYBOT_FEISHU_`（前缀，非变量） | SERVER_ONLY（新增族登记） | `server/credential-env.ts:52`；`server/feishu-cli/wrapper.ts:6` | 扫描命中安全清理正则；整族剥离必须覆盖未知名字，不能缩成有限枚举。 |
| `CRYBOT_LARK_CLI_EXECUTABLE` | SERVER_ONLY（新增） | `server/feishu-cli/wrapper.ts:42` | 当前未装箱包装器读取真实 CLI 路径；本轮未提供盒内 CLI 安装/挂载，不扩大盒子权限。 |

### 本轮验证与输出

开工先执行 依赖准备脚本，输出 `linked 73 entries`；Node `v24.22.3`。Vitest 全程逐文件串行执行，没有使用 systemd-run。测试 setup 给每个文件创建临时 HOME，业务测试使用合成身份/凭证和临时目录。

以下为实际命令输出摘录（省略时间和工作目录）；7 个测试文件合计 **68 项通过**：

```text
$ pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

```text
$ pnpm exec vitest run server/bot-box/env.test.ts
 Test Files  1 passed (1)
      Tests  10 passed (10)
exit 0
```

```text
$ pnpm exec vitest run server/feishu-cli/broker.test.ts
 Test Files  1 passed (1)
      Tests  20 passed (20)
exit 0
```

```text
$ pnpm exec vitest run server/feishu-cli/wrapper.test.ts
 Test Files  1 passed (1)
      Tests  12 passed (12)
exit 0
```

```text
$ pnpm exec vitest run server/feishu-cli/turn.test.ts
 Test Files  1 passed (1)
      Tests  20 passed (20)
exit 0
```

```text
$ pnpm exec vitest run scripts/feishu-broker/entrypoints.test.mjs
 Test Files  1 passed (1)
      Tests  4 passed (4)
exit 0
```

```text
$ pnpm exec vitest run server/feishu-cli/protocol.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

```text
$ pnpm exec tsc -p tsconfig.server.json --noEmit --pretty false
（无输出）
exit 0

$ pnpm exec oxlint --deny-warnings server/drivers/claude.ts server/drivers/claude-turn-launch.ts server/bot-box/env.test.ts server/feishu-cli/turn.test.ts
（无输出）
exit 0

$ wc -l server/drivers/claude.ts
2087 server/drivers/claude.ts

$ git diff --check
（无输出）
exit 0
```

已尝试启动现有 Claude 与完整服务器隔离 fixture；监听限制下未宣称端到端通过。本轮实际 Unix socket 也被执行沙箱拒绝，与运行环境说明中“Unix 套接字可以”不同：

```text
$ pnpm exec vitest run server/feishu-cli/claude.e2e.test.ts
permission broker unavailable ... listen EPERM: operation not permitted ...sock
Error: claude: permission broker could not bind a local socket
 Test Files  1 failed (1)
      Tests  1 failed (1)
exit 1

$ pnpm exec vitest run server/feishu-cli/socket.e2e.test.ts
Error: listen EPERM: operation not permitted 127.0.0.1
 Test Files  1 failed (1)
      Tests  2 failed (2)
exit 1

$ pnpm exec vitest run server/feishu-cli/server.e2e.test.ts
Error: listen EPERM: operation not permitted .../broker.sock
 Test Files  1 failed (1)
      Tests  1 failed (1)
exit 1
```

首次集成验证发现抽取函数返回的 `environment` 名称遮蔽了驱动已有函数；已改成局部别名 `launchEnvironment`，重新执行 TypeScript 和 Claude fixture，前者通过，后者推进到上述 Unix socket 监听限制。这里列出的均为最终代码结果。

AGENTS.md 指向的 `docs/verification/README.md` 仍不在仓库中；沿用现有测试的隔离夹具，不访问用户 live 数据。未运行 Actions；完整端到端及 CI 是否还有分支独有失败，以协调者推分支后的 Actions 为准。

## 第 5 轮安全修复

本轮处理 1 项中危和 4 项低危；未提交 git，未安装服务、读取真实凭证或访问用户 live app/data。开工运行依赖准备脚本，输出 `linked 73 entries`；运行时为 Node `v24.22.3`。以下为当前实现，替代前几轮关于未装箱注入的说明。

### 改动与上线条件

1. **必须开启沙箱**：`server/feishu-cli/config.ts` 每次组装轮次时刷新 bot-box 报告并检查运行时是否启用，只在实际 bwrap 盒子中返回名单用户。仅设置环境变量不足以通过检查。启动时还按默认盒子的挂载计划检查 broker socket；若路径在所有盒子可见的只读挂载中，输出固定文字「飞书代领套接字路径对非授权盒子可见，已停用」并关闭。关闭时不请求 broker、不注入令牌、不添加飞书用法或 socket 挂载。
2. **逐轮盒内授权**：`claude-turn-launch.ts` 只将本轮成功代领所得的 socket 加入该次 spawn 的 `box.rw`，并将相应变量名传入 `allowEnv`。`bot-box/env.ts` 仅允许六个明确的飞书能力名字被逐轮授予，未扩大盒子的全局白名单；名单、登录密钥等配置继续留在服务端。broker 失败时环境授权和 socket 挂载均为空。测试调用实际 `BoxRunner.wrap`，核对授权用户可见 socket，其他用户和无身份轮次不可见，旁边的其他 socket 也不可见；短期令牌只出现在授权盒子的环境中，PID 隔离参数仍存在。 <!-- public-scan: allow domain -->
3. **名单仅一人**：复用 union_id 解析器，去空白、去重后超过一人立即关闭；启动时固定告警「飞书代领只支持一位用户，当前名单超过一人，已停用」。重复填写同一个人仍按一人处理。一个 broker 仍只对应一份员工凭证，管理员须核对唯一名单身份与凭证归属。
4. **追加消息身份隔离**：`directFeishuCliAccess` 捕获本轮已证明的发起人；驱动接口新增可选的认证 `person` 参数。`index.ts` 只为认证真人追加消息传入该身份；Claude 的 steer 在写入 stdin 前调用 `maySteerClaudeTurn`。其他身份或身份缺失返回 `refused`，走既有排队逻辑；原发起人可以继续 steer。身份通过独立参数传递，不解析提示中的名字。保温禁用及轮次结束后释放进程的规则继续生效。`claude.ts` 保持 **2087 行**，未修改 ratchet 上限。
5. **上游传输安全**：broker 启动只接受 HTTPS；HTTP 仅接受主机 `127.0.0.1`、`::1`、`localhost`。外部 HTTP、近似本地域名、其他协议、带用户名密码的 URL 均拒绝并返回固定配置错误。测试保留本地假上游所需的回环 HTTP。
6. **公开文档清理**：仅清理本任务目录的 brief、r2–r5、report；删除旧包装器附录及其引用，内部产品、环境变量和命令改为中性表述。指定的递归内部标识扫描无匹配。安装说明及 brief 已将 `CRYBOT_BOT_BOX=on` 和实际 `bwrap` 检测写成上线前置条件。

部署时应使用安装说明中的专用 `/run/crybot-feishu-broker/token.sock`，不能把 socket 放入智能体已有的共享挂载。包装器、真实 CLI 及 Node 24 安装在盒内可见的管理员只读程序目录。不开沙箱的主机不得上线此能力；停用注入不能替代在部署层停止可被同用户直接访问的 broker。

### 本轮环境变量归属

下面六项仍不允许全局继承，仅在本轮成功代领后显式放行；`SERVER_ONLY_CRYBOT` 表示默认服务端保留，`allowEnv` 是受限的逐轮例外。

| 名字 | 来源与读者 | 放行范围 |
| --- | --- | --- |
| `CRYBOT_FEISHU_USER_TOKEN` | `turn.ts:44` 生成，`wrapper.ts` 读取 | 获准轮次的短期令牌 |
| `CRYBOT_FEISHU_APP_ID` | `turn.ts:45` 从 broker 返回体取值，`wrapper.ts` 读取 | 不继承服务端登录配置 |
| `CRYBOT_FEISHU_EXPIRES_AT` | `turn.ts:46` 生成，`wrapper.ts` 判断重取 | 获准轮次 |
| `CRYBOT_FEISHU_BROKER_SOCKET` | `turn.ts:47` 提供，包装器重取；`claude-turn-launch.ts:20` 构造挂载 | 仅绑定该 socket，不绑定整个目录 |
| `CRYBOT_FEISHU_AUTHORIZATION_URL` | `turn.ts:49` 提供，包装器授权提示 | 获准轮次；代领失败时只通过校验后的系统提示给出链接 |
| `CRYBOT_LARK_CLI_EXECUTABLE` | `turn.ts:48` 提供，包装器启动固定 CLI | 获准轮次 |

`CRYBOT_FEISHU_CLI_USERS`、登录密钥及其文件路径不在逐轮例外中。所有继承的飞书凭证仍先清除；普通轮次不会因为父环境留有短期令牌而获得能力。

### 验证输出

Vitest 全程逐文件串行执行，不使用 systemd-run。以下七个文件共 **83 项通过**；输出摘录省略时间和工作目录。

```text
$ pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0

$ pnpm exec vitest run server/bot-box/env.test.ts
 Test Files  1 passed (1)
      Tests  10 passed (10)
exit 0

$ pnpm exec vitest run server/feishu-cli/broker.test.ts
 Test Files  1 passed (1)
      Tests  29 passed (29)
exit 0

$ pnpm exec vitest run server/feishu-cli/wrapper.test.ts
 Test Files  1 passed (1)
      Tests  12 passed (12)
exit 0

$ pnpm exec vitest run server/feishu-cli/turn.test.ts
 Test Files  1 passed (1)
      Tests  26 passed (26)
exit 0

$ pnpm exec vitest run scripts/feishu-broker/entrypoints.test.mjs
 Test Files  1 passed (1)
      Tests  4 passed (4)
exit 0

$ pnpm exec vitest run server/feishu-cli/protocol.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

新增轮次测试覆盖非 bwrap 的三种结果、检测成功但运行时未启用、多人名单拒绝、socket 路径挂载可见性、原发起人与其他身份的 steer 判定，以及授权/非授权盒子的实际挂载计划和过滤后环境。broker 增加 9 项协议及主机校验。Claude 隔离 fixture 增加外人/缺失身份拒绝、本人可 steer；服务器 fixture 的 `sandbox=true` 场景用与服务进程相同的 PATH 调用 `detectBox`，只有检测到可用 bwrap 才执行，否则打印原因并跳过。假 CLI 放在代码根测试临时目录，转储写入轮次工作目录；授权盒子实际连接 socket，名单外盒子没有 socket 路径。

已实际尝试启动隔离 fixture。本执行沙箱除禁止 TCP 外，Unix socket 监听也报 `EPERM`；这些端到端用例没有宣称通过，完整结果以 Actions 为准：

```text
$ pnpm exec vitest run server/feishu-cli/claude.e2e.test.ts
permission broker unavailable ... listen EPERM: operation not permitted ...sock
Error: claude: permission broker could not bind a local socket
 Test Files  1 failed (1)
      Tests  1 failed (1)
exit 1

$ pnpm exec vitest run server/feishu-cli/socket.e2e.test.ts
Error: listen EPERM: operation not permitted 127.0.0.1
 Test Files  1 failed (1)
      Tests  2 failed (2)
exit 1

$ pnpm exec vitest run server/feishu-cli/server.e2e.test.ts
Error: listen EPERM: operation not permitted .../broker.sock
 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
exit 1
```

AGENTS.md 所指的 `docs/verification/README.md` 仍缺失，验证沿用现有隔离 fixture，全部使用临时目录和合成身份/凭证，没有接触 live 数据。未运行 Actions。历史中关于共享线程可保留飞书内容、提示确认不等于 API 强制审批等边界仍适用。

最终静态检查和文档扫描输出：

```text
$ pnpm exec tsc -p tsconfig.server.json --pretty false
（无输出）
exit 0

$ pnpm exec oxlint --deny-warnings server/bot-box/env.ts server/bot-box/env.test.ts server/contracts.ts server/drivers/claude.ts server/drivers/claude-turn-launch.ts server/feishu-cli/config.ts server/feishu-cli/turn.ts server/feishu-cli/turn.test.ts server/feishu-cli/broker.ts server/feishu-cli/broker.test.ts server/feishu-cli/claude.e2e.test.ts server/feishu-cli/server.e2e.test.ts server/index.ts
（无输出）
exit 0

$ pnpm exec oxlint --deny-warnings server/feishu-cli/server.e2e.test.ts
（最终测试声明调整后复查，无输出）
exit 0

$ wc -l server/drivers/claude.ts
2087 server/drivers/claude.ts

$ git diff --check
（无输出）
exit 0

任务目录指定内部标识 grep 扫描：
（无输出，无匹配）
exit 1
```

服务器 fixture 参数化时曾发现测试上下文/超时签名类型错误，已修正并重新运行 TypeScript 及该 fixture；以上记录均为最终结果。

## 第 6 轮沙箱端到端修复

本轮未提交 git，也没有安装服务、读取真实凭证或接触用户 live app/data。`server/feishu-cli/server.e2e.test.ts` 的 `sandbox=true` 场景现在把 bwrap 所在目录加入传给服务子进程的 PATH，并用同一份环境调用 `detectBox`；只有检测结果为 `bwrap` 才执行，其他情况打印固定的跳过原因。假 CLI 放在代码根下的测试临时目录，转储仍写入轮次工作目录。授权轮次的假 CLI 实际连接传入的 Unix socket，名单外轮次没有 socket 路径且探测结果为 `missing`。

`server/feishu-cli/config.ts` 启动校验使用默认盒子的挂载计划：`/run/crybot-feishu-broker/token.sock` 对非授权盒子不可见，可以通过；`/opt/x/token.sock` 落在只读挂载中，输出「飞书代领套接字路径对非授权盒子可见，已停用」并关闭。运行时能力只由 `botBox.enabled()` 判定，组装轮次不再调用 `botBox.report()` 同步读取 `/proc/mounts`。第 5 轮文档的重复运行环境段已删除，背景流程改为中性描述。

### 本轮验收

已先运行依赖准备脚本，Vitest 每次只跑一个文件，没有使用 systemd-run。Node 为 `v24.22.3`。

| 检查 | 结果 |
| --- | --- |
| `pnpm exec vitest run server/feishu-cli/server.e2e.test.ts` | 2 项跳过；本沙箱禁止 Unix socket，输出「跳过 server.e2e：当前沙箱禁止监听 Unix socket」；未在本沙箱执行 bwrap 场景，以 Actions 为准 |
| `pnpm exec vitest run server/feishu-cli/turn.test.ts` | 28 项通过 |
| `pnpm exec vitest run server/feishu-cli/broker.test.ts` | 29 项通过 |
| `pnpm exec vitest run server/feishu-cli/claude.e2e.test.ts` | 1 项因 permission broker 监听 Unix socket 报 `listen EPERM`，未宣称通过，以 Actions 为准 |
| `pnpm exec vitest run server/bot-box/env.test.ts` | 10 项通过 |
| `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts` | 1 项通过；`claude.ts` 仍为 2087 行 |
| `pnpm exec tsc -p tsconfig.server.json --pretty false` | 通过 |
| 改动代码和测试 `pnpm exec oxlint --deny-warnings ...` | 通过，无告警 |

实际输出摘要：

```text
$ pnpm exec vitest run server/feishu-cli/server.e2e.test.ts
 Test Files  1 passed (1)
      Tests  2 skipped (2)

$ pnpm exec vitest run server/feishu-cli/turn.test.ts
 Test Files  1 passed (1)
      Tests  28 passed (28)
$ pnpm exec vitest run server/feishu-cli/broker.test.ts
 Test Files  1 passed (1)
      Tests  29 passed (29)
$ pnpm exec vitest run server/feishu-cli/claude.e2e.test.ts
permission broker unavailable ... listen EPERM: operation not permitted ...sock
 Test Files  1 failed (1)
      Tests  1 failed (1)
$ pnpm exec vitest run server/bot-box/env.test.ts
 Test Files  1 passed (1)
      Tests  10 passed (10)
$ pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
$ pnpm exec tsc -p tsconfig.server.json --pretty false
（无输出，exit 0）
$ pnpm exec oxlint --deny-warnings server/feishu-cli/config.ts server/feishu-cli/server.e2e.test.ts server/feishu-cli/turn.test.ts
（无输出，exit 0）
```

所有新临时文件在测试结束清理，令牌和 socket 路径不进入事件流、会话记录或日志断言。完整端到端结果需在允许 Unix socket、具备 bwrap 的 Actions 主机复核。

## 第 7 轮：开盒端到端场景修正

本轮只调整 `server/feishu-cli/server.e2e.test.ts` 的测试夹具，并补充本轮验收记录。服务进程的 `PATH` 现在按 Node 所在目录、bwrap 所在目录、继承的 PATH 排列，避免假 CLI 的 env shebang 使用旧 Node。代码根由 `fileURLToPath(new URL("../..", import.meta.url))` 求得；假 CLI 仍放在代码根下的临时目录。broker socket 改放 `mkdtemp(join(tmpdir(), "feishu-broker-"))` 创建的独立目录，开盒场景的 `TMPDIR`、`TMP`、`TEMP` 指向该目录下的 `tmp` 子目录，测试结束删除整个目录。令牌泄漏扫描同时覆盖 fixture 数据目录和该 socket/TMP 目录。

本沙箱不允许监听 Unix socket，且 bwrap 检测结果为 `userns-refused`，因此两个参数化场景均按设计跳过；检测结果为 bwrap 的 Linux 主机才会实际执行开盒场景。未访问用户 live app 或数据。

### 本轮验收

```text
$ pnpm exec vitest run server/feishu-cli/server.e2e.test.ts --reporter=verbose
 Test Files  1 passed (1)
 Tests  2 skipped (2)
 sandbox=false：跳过 server.e2e：当前沙箱禁止监听 Unix socket
 sandbox=true：跳过 sandbox=true：服务进程检测结果为 userns-refused

$ pnpm exec tsc -p tsconfig.server.json --pretty false
（无输出，exit 0）

$ pnpm exec oxlint --deny-warnings server/feishu-cli/server.e2e.test.ts
（无输出，exit 0）
```


## 第 8 轮：复审收尾与套接字路径加固

本轮未提交 git，未改动 `server/drivers/claude.ts`（仍为 2087 行），未接触用户 live app 或数据。

- `server/feishu-cli/config.ts` 删除无人使用返回值的 `botBox.report()` 调用，能力判断只看 `botBox.enabled()`；`turn.test.ts` 删除对应 mock，把原来三个检测结果的重复参数化用例合并为一个明确验证 `enabled() = false` 的用例，因此该文件由 28 项变为 26 项。
- 套接字父目录先做 realpath；父目录不存在时回退到原字面路径，其他解析错误失败关闭。真实路径位于服务数据目录或 HOME 内时直接拒绝，两个根目录也解析真实路径。其余路径按默认盒子的挂载计划判断可见性，计划请求携带服务进程 `process.env` 中全部 `PATH_ENV_NAMES` 变量（包括 TMPDIR）。拒绝只输出固定文字，不包含路径。
- 新增 `server/feishu-cli/config.test.ts`：覆盖指向 `/opt` 的父目录符号链接、数据目录 `workspaces/fixture/`、HOME、指向数据目录/HOME 的符号链接、父目录不存在时的拒绝/放行、`/tmp` 独立目录放行，以及每个路径环境变量引入的共享挂载。修复前 18 项中 14 项失败、4 项通过，修复后 18 项全部通过。
- `server.e2e.test.ts` 的开盒假 CLI 直接写入套接字真实路径，不依赖是否注入路径环境变量；授权轮次仍断言 `connected`，名单外、群聊及降级轮次实际尝试连接并断言 `ENOENT`、`EACCES` 或 `EPERM`。测试进程临时目录的真实路径不在 `/tmp` 下时，开盒场景打印原因并跳过。
- `.gitignore` 增加 `.tmp-feishu-host-*/`。`r6.md`、`r7.md` 的运行环境产品名和依赖命令改为中性表述；更正第 6 轮的 report 调用说明及第 7 轮的执行主机条件。 <!-- public-scan: allow domain -->

### 验收输出

Node `v24.22.3`；已先运行依赖准备脚本，不使用 systemd-run，Vitest 逐文件串行执行。以下摘录省略工作目录和计时。

```text
$ pnpm exec vitest run server/feishu-cli/config.test.ts
 Test Files  1 passed (1)
      Tests  18 passed (18)
exit 0

$ pnpm exec vitest run server/feishu-cli/turn.test.ts
 Test Files  1 passed (1)
      Tests  26 passed (26)
exit 0

$ pnpm exec vitest run server/feishu-cli/server.e2e.test.ts --reporter=verbose
Importing from "vitest/runners" is deprecated since Vitest 4.1. Please use "vitest" instead.
跳过 server.e2e：当前沙箱禁止监听 Unix socket
跳过 sandbox=true：测试进程的 tmpdir() 不在 /tmp 下，套接字路径校验会停用代领
 Test Files  1 passed (1)
      Tests  2 skipped (2)
exit 0

$ pnpm exec vitest run server/bot-box/env.test.ts
 Test Files  1 passed (1)
      Tests  10 passed (10)
exit 0

$ pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0

$ pnpm exec tsc -p tsconfig.server.json --pretty false
（无输出）
exit 0

$ pnpm exec oxlint --deny-warnings server/feishu-cli/config.ts server/feishu-cli/config.test.ts server/feishu-cli/turn.test.ts server/feishu-cli/server.e2e.test.ts
（无输出）
exit 0

$ wc -l server/drivers/claude.ts
2087 server/drivers/claude.ts

$ git diff --check
（无输出）
exit 0

任务目录按第 8 轮指定表达式递归 grep 扫描（排除 r8.md）：
（无输出，无匹配）
exit 1
```

单测共 55 项通过。端到端两个场景均未实跑完成：关盒场景尝试在隔离临时目录启动假 broker 时监听被拒，开盒场景触发新增的临时目录检查；不能把 Vitest 文件级 exit 0 当作端到端通过。最终端到端结果以 Actions 为准，开盒复核需要检测结果为 bwrap 的 Linux 主机、允许 fixture 监听，并使用 `/tmp` 下的测试临时目录。本轮没有运行 Actions。

AGENTS.md 引用的 `docs/verification/README.md` 在仓库中仍不存在；沿用现有隔离 fixture，未对 live app/data 做任何验证或修改。
