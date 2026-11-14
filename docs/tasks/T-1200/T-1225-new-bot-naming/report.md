# T-1225 新建智能体命名与首条问候语言报告

## 逐条改动

1. **所有用户先起名**
   - `makeNewBot` 移除团队身份条件，只要应用已挂载命名弹窗，个人、单机、团队用户都会先看到它。
   - 管理员和个人用户读取 `/api/bot-defaults` 的 `suggestedName`，弹窗预填并聚焦、全选；读取的默认配置复用于确认后的创建。
   - 输入框旁新增「换一个」，复用 `newBot.randomName`。服务端新增只读 `GET /api/bot-name?exclude=...`，排除已有智能体的名字和输入框当前名字；前端再排除已知占用名。
   - 团队普通成员与配对设备通过仅返回 `suggestedName` 的接口取名，不读取管理员默认配置；客户端和配对设备白名单仅新增该 GET 接口。
   - 支持回车和确定按钮；空白名字不能提交；取消、Escape 或遮罩关闭均不创建。输入法确认回车不会误提交。换名请求失败会显示本地化错误；关闭后的迟到结果不会覆盖下一次弹窗。
   - 检查了侧栏「+」、Ctrl/Cmd+N、日历两个入口、公告卡、团队对话框：它们原本都派发 `newBot`，因此统一经过本次修改的流程，无须逐入口复制逻辑。

2. **首条问候、设置卡与个性化选项使用新建者的语言**
   - `POST /api/bots` 在普通、团队成员、配对设备和配置式创建请求中附带可选 `language: activeLocale()`。
   - 服务端优先级为：合法请求语言 → 当前新建者的已记录语言 → `cfg.language` → 团队语言 → 系统 locale。
   - 新增 `personLanguages.forPerson`，只读取指定人的记录，不借用其他用户的语言；入口按现有 presence 逻辑使用 session 的 actor key 或本机 key。
   - 将前端支持的语言表抽到 `shared/languages.ts` 供服务端白名单共用。请求语言仅接受已支持代码及明确别名；非法值、非字符串值忽略。`zh`、`zh-cn`、`zh-hans`、`zh-sg` 都落到简体。前端原有 `zh-CN → zh` 的解析结果保持不变。
   - 在 Store 创建参数中传递本次语言，在首条消息写入前生效，不修改全局配置。未传语言且无本人记录时，保留原有配置、团队、系统回退顺序。
   - 补齐简体中文问候、设置卡五个固定选项和点击设置后的说明。
   - 个性化选项生成器接收同一次解析结果；简体中文提示词明确要求 `Simplified Chinese`。运行期间的后续改名重写沿用本次语言，删除智能体时清理对应记录。

3. **约束与本地化**
   - 未更改 description、soul 的默认留空逻辑。
   - `language` 作为请求元数据在权限检查前剥离，不加入智能体设置的允许字段。配对设备对 section、approvalMode 等字段的限制保持；其前端创建分支不再附带无权设置的 section。
   - 非管理员创建仍强制 `useDefaults: false`，不能通过 language 绕过设置限制。
   - 法语、印地语、乌克兰语包补入缺少的 `newBot.randomName`，暂用英文；简体中文显示「换一个」。检查了全部 16 个语言包，该 key 无遗漏。

## 修改文件

| 文件 | 内容 |
| --- | --- |
| `src/lib/new-bot.ts` | 统一命名、预填、换名、取消和受限用户创建流程 |
| `src/components/NewBotName.tsx` | 全选、换名按钮、空名校验、回车与输入法处理 |
| `src/lib/create-configured-bot.ts` | 创建请求携带当前界面语言 |
| `shared/languages.ts`（新增） | 共享语言表、白名单与简体别名 |
| `src/locales/index.ts` | 使用共享语言表，约束加载器覆盖所有语言包 |
| `src/locales/fr.json`、`hi.json`、`uk.json`、`zh.json` | 换名按钮文案 |
| `server/routes/bots-create.ts` | 建议名接口、语言优先级、创建和个性化生成参数 |
| `server/request-auth.ts` | 客户端建议名 GET 白名单 |
| `companion/src/routes.ts` | 配对设备建议名 GET 白名单 |
| `server/host/person-languages.ts` | 获取指定人的语言记录 |
| `server/index.ts` | 接入创建者身份、团队语言和生成器语言参数 |
| `server/store.ts` | 创建时使用本次语言写入首条问候 |
| `server/initial-greeting.ts` | 简体中文问候、设置说明和选项 |
| `server/setup-suggestions.ts` | 个性化生成使用创建语言，明确简体中文 |
| `src/lib/new-bot.test.ts` | 非团队命名、取消、预填、换名及各创建分支的语言 |
| `src/components/NewBotName.test.ts`（新增） | 弹窗交互测试 |
| `server/routes/bots-create.test.ts`（新增） | 隔离路由、真实 Store、语言和权限测试 |
| `server/initial-greeting.test.ts` | 简体中文及别名回归 |
| `report.md`（新增） | 本报告 |

## 测试及结果

每次仅运行一个测试文件，均使用以下命令格式；未并发运行文件：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner
```

| 文件 | 最终结果 |
| --- | --- |
| `src/lib/new-bot.test.ts` | 20 项通过 |
| `src/components/NewBotName.test.ts` | 5 项通过 |
| `server/routes/bots-create.test.ts` | 23 项通过 |
| `server/initial-greeting.test.ts` | 9 项通过 |
| `server/setup-suggestions.test.ts` | 22 项通过 |
| `src/lib/i18n.test.ts` | 35 项通过，1 项已有失败 |
| `src/lib/create-configured-bot.test.ts` | 14 项通过 |
| `src/state/bot-creation.test.ts` | 6 项通过 |
| `companion/test/routes.test.ts` | 131 项通过 |
| `server/new-bot-sharing.test.ts` | 11 项通过 |
| `server/host/person-languages.test.ts` | 5 项通过 |
| `server/request-auth.test.ts` | 66 项通过 |

最终共 **347 项通过，1 项失败**，涉及 12 个文件。`git diff --check` 通过。

服务端新增测试覆盖：显式简体及别名、英文覆盖中文配置和本人记录、缺省回退、其他人的记录不影响本次创建、非法字段忽略、配置/团队/系统顺序、固定卡片及模拟生成结果写入、配对设备和成员权限、建议名排重及读取权限。

唯一最终失败位于 `src/lib/i18n.test.ts:137`：该测试期待葡萄牙语包完整，但其缺少以下英文 key。对比当前文件与 `git show HEAD:...`，两者缺失完全相同，本次未修改葡萄牙语包或这些 key：

- `botOverview.preference.cloud.locked`
- `keys.section.computers.purpose.locked`
- `settings.profile.nameFromLogin`

早期回归发现的中文别名返回值变化已修正；前端语言解析相关断言最终通过。没有为绕过已有失败而修改完整性测试。

## 验证环境与没把握的地方

- 当前工作树缺少依赖目录，首次测试报 `vitest not found`。随后在工作树内复用本机已有依赖链接，缓存保留在本工作树；没有联网安装或新增依赖。
- 仓库不存在 AGENTS.md 引用的 `docs/verification/README.md`，无法按该文档操作。
- 尝试启动仅包含创建路由的隔离 HTTP fixture 时，沙箱拒绝监听本地端口：`listen EPERM: operation not permitted 127.0.0.1`。该轮 21 项测试均在 fixture 启动阶段失败，没有执行创建断言。随后改为无监听端口的请求 fixture，调用真实路由和 Store；测试使用仓库测试初始化器提供的临时数据目录，未访问用户应用或数据。
- 因此，本次验证证明了路由、Store、生成提示词和组件逻辑；**没有完成完整服务启动、真实浏览器交互或配对设备实机验证**。各 UI 入口一致性通过代码检查和共享创建流程测试确认。
- 个性化生成使用模拟模型响应，验证了语言指令和结果落入卡片，未调用真实 AI 服务；真实模型是否始终遵守语言指令未验证。
- 建议名按请求时的已有名字排重，不预留名字；并发创建期间的名字占用变化没有新增锁或唯一性约束。
- 按要求未运行 `pnpm typecheck`、`pnpm lint`、完整 `pnpm test` 或 e2e。未修改 `electron/`、`mobile/`、`.github/`，未做 git 提交。

## 第 2 轮

### 逐条改动

1. **拆分默认名称占位文字与换名按钮文案**
   - 新增 `newBot.anotherName`：英文为 `Another name`，简体中文为「换一个」，其他语言包暂用英文。全部 16 个语言包均已补齐，放在 `newBot.*` 文案旁。
   - `NewBotName.tsx` 的按钮改用新 key。简体中文 `newBot.randomName` 恢复为「随机名称」，`NewBotDialog.tsx` 继续使用它作为默认设置名字输入框的占位文字。
   - 将法语、印地语、乌克兰语文件开头的 `newBot.randomName` 移到各自 `newBot.failed`、`newBot.startsOnAsk` 文案旁。

2. **建议名只排除调用者可见的智能体名字**
   - 创建路由增加 `visibleFor(auth)` 依赖，服务入口接入现有 `visibleTo(viewerFor(auth))`。`GET /api/bot-name` 先按可见性过滤，再排除可见名字和调用者当前输入的名字。
   - 不可见智能体的名字不参与建议名选择；重名仍沿用现有 `freeName` 和服务端创建流程处理。
   - 隔离路由 fixture 接入真实可见性模块，新增确定性测试：固定随机选择，确认新增不可见智能体前后返回相同建议名；管理员能看到该智能体时则排除其名字，同时验证可见名字及当前输入仍被排除。

3. **换名失败使用专用提示**
   - 新增 `newBot.anotherNameFailed`：英文为 `Couldn't get another name. Try again.`，简体中文为「没换成，请再试一次」，其余语言包暂用英文，全部 16 包补齐。
   - 换名失败时显示该提示，保留原名字与弹窗，并恢复按钮可用状态。组件测试覆盖中英文按钮和失败提示，不再将换名失败描述为创建失败。

4. **语言未持久化的限制**
   - 本轮未修改 `server/setup-suggestions.ts` 或存储结构。创建时选定的语言仍只保存在内存 `languages` Map 中；同一次服务运行期间的改名重写可沿用它。
   - 服务重启后该记录丢失，后续改名触发设置卡重写时会回退到默认语言来源，不能保证继续使用新建者当时的界面语言。本轮仅记录此限制，不声称已解决跨重启的语言保持。

### 修改文件

| 文件 | 本轮内容 |
| --- | --- |
| `src/components/NewBotName.tsx` | 换名按钮和失败提示改用专用 key |
| `src/components/NewBotName.test.ts` | 更新按钮断言，覆盖中英文失败提示及按钮恢复 |
| `src/locales/{en,zh,de,es,fr,hi,it,ja,ko,pl,pt-br,ru,tr,uk,vi,zh-tw}.json` | 全部补齐两个新 key，恢复中文占位文案，调整 fr/hi/uk 原 key 位置 |
| `server/routes/bots-create.ts` | 建议名按调用者可见性过滤 |
| `server/index.ts` | 注入现有可见性判断 |
| `server/routes/bots-create.test.ts` | 接入真实可见性模块并增加不可见名字回归测试 |
| `docs/tasks/T-1200/T-1225-new-bot-naming/report.md` | 追加本轮改动、验证结果与限制 |

### 测试结果与验证范围

按指定命令逐个运行以下文件，没有并发测试文件：

```bash
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner
```

| 文件 | 结果 |
| --- | --- |
| `src/components/NewBotName.test.ts` | 6 项通过 |
| `src/lib/new-bot.test.ts` | 20 项通过 |
| `server/routes/bots-create.test.ts` | 24 项通过 |
| `src/lib/i18n.test.ts` | 35 项通过，1 项已知失败 |

共 **85 项通过，1 项已知失败，无新增失败**。已知失败仍为 `src/lib/i18n.test.ts:137` 的葡萄牙语包完整性断言；对比本轮开始时的 `HEAD` 与修改后的语言包，缺失 key 完全一致：

- `botOverview.preference.cloud.locked`
- `keys.section.computers.purpose.locked`
- `settings.profile.nameFromLogin`

额外检查全部 16 个 JSON 语言包：三个命名相关 key 均只出现一次，新增文案值符合要求；`git diff --check` 通过。

仓库仍缺少 `docs/verification/README.md`。服务端测试使用测试初始化器创建的临时数据目录、真实 Store 和可见性模块，通过无监听端口的隔离请求 fixture 调用路由，未访问用户应用或数据。上述结果只证明组件和隔离路由行为，未进行完整服务启动、真实浏览器或实机验证。

本轮未运行 typecheck、完整 `pnpm test` 或 e2e，未联网或新增依赖，未修改 `electron/`、`mobile/`、`.github/`，未做 git 提交。

## 第 3 轮

- 修正 `server/routes/bots-create.test.ts` 中客户端和管理员会话夹具的两处 `RequestAuth` 强转，改用同文件已有的 `as unknown as RequestAuth` 写法，未改变被测代码或测试行为。
- 检查本分支改过的其他测试文件，未发现会触发同类 TS2352 的 `RequestAuth` 强转。

验证结果：

- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run server/routes/bots-create.test.ts --maxWorkers=1 --configLoader runner`：24 项通过。
- `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc --noEmit -p tsconfig.server.json`：通过，无输出。
- 未提交 git；未联网、未加依赖，仅修改测试文件及本报告。
