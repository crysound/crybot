## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1232 飞书令牌改由独立代领服务发放，智能体碰不到长期凭证

仓库 crybot（**公开仓库**：代码、测试、文档里不得出现内部域名、IP、邮箱、人名、真实令牌；地址一律走配置项，测试用 example.invalid 之类的假地址），分支 `T-1232-feishu-broker`，基准 main。

## 背景（现状）

- 服务端和所有智能体进程都以同一个 Linux 用户运行，没开沙箱（`box: off`）。
- 现在给智能体用的飞书命令由包装器转交；服务端向配置的令牌接口换取短期令牌后再提供给它。旧包装器不在仓库内。
- 问题：长期凭证对同用户的所有智能体都可读，而它的权限远大于飞书（能代表该员工访问其他内部系统）。已临时停用。

## 目标

1. **长期凭证只给一个独立的系统用户读**。新增一个小的「飞书令牌代领服务」（broker），以独立系统用户运行，长期凭证文件只有它能读。它只对外给出**短期**飞书用户令牌，绝不把长期凭证本身返回、写日志或写进任何同用户可读的位置。
2. broker 通过 **Unix 套接字** 提供服务（不开 TCP 端口），套接字属组为 Cry Bot 运行用户的组、权限 660，所在目录 750。
3. broker 拿令牌的方式：POST `tokenUrl`（配置项），`redirect: "error"`，20 秒超时；返回体字段是 `user_access_token`（字符串）、`app_id`（字符串）、`expires_at`（Unix 秒）；三者缺一或已过期就报错，不猜。**只缓存短期令牌**到内存，过期前 5 分钟内重新向 `tokenUrl` 要；绝不自己用 refresh token 刷新（我们手里也没有）。接口返回非 2xx 时把 `message` 和 `authorization_url` 原样转给调用方，不重试风暴（失败后 30 秒内不再请求）。
4. **只给指定用户的对话**：Cry Bot 服务端新增配置（例如 `CRYBOT_FEISHU_CLI_USERS`，取值为飞书 union_id 列表，复用 `server/feishu-login.ts` 里现有的 union_id 名单解析方式，`*` 不允许）。只有会话归属用户在名单里时，该轮智能体进程才拿到使用飞书命令的能力：服务端在启动该轮时向 broker 取短期令牌，经环境变量（例如 `CRYBOT_FEISHU_USER_TOKEN`、`CRYBOT_FEISHU_APP_ID`、`CRYBOT_FEISHU_EXPIRES_AT`）注入；长任务里令牌可能过期，包装器发现快过期时可以自己经 broker 套接字重取（套接字路径也经环境变量给）该轮进程；名单外用户的轮次不注入，也不在系统提示里提飞书。不在名单里的轮次调用 `lark-cli` 时得到清楚的中文提示「当前对话未开通飞书」。
   - 弄清会话归属用户怎么定（`server/sessions.ts`、`server/feishu-login.ts`、驱动 `server/drivers/claude.ts` 等），用已有的来源，不另存一份。
   - 令牌注入只在轮次进程环境里，不写盘，不进日志、事件流、会话记录或前端接口。
5. **新的包装器**进仓库（建议 `packages/` 或 `scripts/` 下合适位置，以仓库现有结构为准），令牌来源为：优先读 `CRYBOT_FEISHU_USER_TOKEN`（快过期则经套接字重取），交给真 CLI 时设 `LARKSUITE_CLI_APP_ID` 和 `LARKSUITE_CLI_USER_ACCESS_TOKEN`；没有就报「当前对话未开通飞书」退出 1。遵循这些安全做法：清掉继承的 `LARKSUITE_CLI_*`/`MEEGLE_*` 环境变量、`STRICT_MODE=user`、`DEFAULT_AS=user`、`BRAND=feishu`、`--help`/`version` 不要令牌、`config` 子命令拒绝、`auth status` 只回 `{"authorized":true,"identity":"user"}`、其他 `auth` 子命令提示去授权页、高风险确认退出码 10 原样返回、Windows `.cmd` 走固定 JS 入口。**拦截 `update` 子命令**（`lark-cli update` 直接拒绝，提示由管理员升级）。
6. **系统提示**：在名单内用户的轮次里，给智能体加一段简短说明（中英文都走现有 locales 或现有系统提示拼接方式，看 `server/drivers/claude.ts`、`server/team-memory.ts` 现有做法）：
   - 可以用 `lark-cli` 读写这位用户的飞书（日程、文档、消息、多维表格等），身份是用户本人；先 `lark-cli --help` 或子命令 `--help` 查用法。
   - **写操作和发消息之前必须先问用户确认**，用户明确同意后才执行。
   - 时间一律带时区，写成 `+08:00`（如 `2026-11-15T09:00:00+08:00`）。
   - 不要运行 `lark-cli update`，不要尝试读取或寻找任何凭证文件。
7. broker 的部署件：仓库里给出 systemd 单元模板和安装说明（`DynamicUser` 或指定独立用户均可，`ProtectSystem=strict`、`NoNewPrivileges=yes`、`PrivateTmp=yes`、`RuntimeDirectory`、只读挂载凭证文件；凭证文件路径和 tokenUrl 走配置文件），文档里地址用占位符。真实安装由协调者做，你不要动系统。

另：旧包装器还处理 `meegle`（飞书项目）命令，本任务只做 `lark-cli`，`meegle` 不接入。

## 上线前置条件

必须开启智能体沙箱（`CRYBOT_BOT_BOX=on`），且实际检测为 `bwrap`。否则代领能力失败关闭，不注入令牌、不挂载 socket，并在启动时输出固定告警。只有名单内唯一用户本人发起的单聊轮次可以获得能力；socket 逐轮挂载，其他轮次不得可见。管理员须确保名单身份与 broker 的单份员工凭证一致。

## 测试（写成仓库里可重复跑的测试）

1. broker 单测：用本地假 tokenUrl（测试里起的 HTTP 服务）验证 取令牌、缓存、过期前 5 分钟重取、非 2xx 转发 message/authorization_url、失败 30 秒内不重复请求、返回体和日志里绝无长期凭证（断言测试用的长期凭证字符串不出现）。
2. 套接字权限：创建后模式 660、目录 750（Linux 下跑，其他平台跳过）。
3. 服务端：名单内用户的轮次环境里有短期令牌、系统提示含飞书说明；名单外没有；`*` 被拒并告警；令牌不出现在事件流/会话记录/日志里。
4. 包装器：无令牌时提示并退出 1；`update` 被拦；`auth status`；`--help` 不需要令牌；继承的 `LARKSUITE_CLI_*` 被清掉（用假的真 CLI 脚本记录收到的环境）。
5. 本机 node 22 不支持 TS 的测试以 Actions（node 24）为准；报告里写明哪些本机跑过。

## 报告

`docs/tasks/T-1200/T-1232-feishu-broker/report.md` 写中文报告：改了哪些文件、配置项清单（名称、含义、示例占位值）、安装步骤（给协调者照做）、怎么跑测试、已知局限。
