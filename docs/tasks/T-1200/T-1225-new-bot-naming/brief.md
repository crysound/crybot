# T-1225 新建智能体：所有人都先起名，首条问候跟随本人界面语言

## 背景
用户反馈：新建智能体时没有让人起名，系统直接给了一个名字；说明文字的语言也和界面对不上。
调研结论（main 0f44b8b6）：
- 起名弹窗 `src/components/NewBotName.tsx` 已经有了，但 `src/lib/new-bot.ts:87` 写的是 `if (team && nameAsker)`，所以只有团队用户才会弹。个人或单机用户点新建，会直接用 `/api/bot-defaults` 的 `suggestedName`。`suggestedName` 是从 `server/names.ts` 的英文昵称里随机挑的。
- 新建后的首条问候和设置卡在 `server/initial-greeting.ts:7-37`，只有 en、es、pt-br、ko、zh-tw 五种语言。简体 zh 没有条目，会回退成英文。服务端选语言用 `cfg.language ?? 团队语言 ?? 系统 locale`（`server/index.ts:708`、`:2834`），不看是谁在新建。按人记录的语言其实已经有了，见 `server/host/person-languages.ts:59`。
- AI 生成的个性化选项按 `appLanguage() ?? 系统 locale` 出语言（`server/setup-suggestions.ts:70`、`:366`）。

## 要做的
1. **所有人新建都先起名**
   - 去掉 `team &&` 这个条件，个人、单机、团队用户新建时都弹 NewBotName。
   - 输入框预填 `suggestedName`，并全选，方便直接改写。
   - 旁边加「换一个」按钮，换成另一个未被占用的建议名。文案 key `newBot.randomName` 已存在，各语言包缺的补上。
   - 回车或点确定创建。取消就不创建。名字为空时不能确定。
   - 所有入口都走这一个流程：侧栏「+」、Ctrl/Cmd+N、日历、公告卡、团队对话框。
2. **首条问候和设置卡跟随新建者的界面语言**
   - `initial-greeting.ts` 补上简体中文 `zh`。顺手检查语言别名：`zh`、`zh-cn`、`zh-hans`、`zh-sg` 都应该落到简体。
   - 语言按这个顺序取：新建者本人的语言（前端在 `POST /api/bots` 带可选字段 `language`，取当前界面语言；没有就用 person-languages 里记录的）→ `cfg.language` → 团队语言 → 系统 locale。
   - AI 生成的个性化选项也按同一顺序取语言。
   - `language` 是只增不改的可选字段，不传时行为和现在一样。服务端要做白名单校验，只接受已支持的语言代码。
3. 不改：description、soul 默认留空的逻辑；配对设备只能设名字和外观的限制（`bots-create.ts:93-97`）；非管理员 `useDefaults:false` 的限制。

## 测试（写进仓库，保持可重复）
- 改 `src/lib/new-bot.test.ts`：非团队用户也会问名字；取消就不创建；预填建议名；点「换一个」会换。
- `NewBotName` 组件测试：空名不能确定；回车提交。
- 服务端测试：
  - 带 `language: "zh"` 新建，问候和设置卡是简体中文。
  - 带 `language: "en"`，但 `cfg.language` 是 zh 时，结果是英文。
  - 不带 `language` 时，行为和原来一样。
  - 非法 `language` 被忽略。
- 一次只跑一个文件：`PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner`
- 不要跑 `pnpm typecheck`、`pnpm lint`、完整 `pnpm test`，也不要跑 e2e。

## 约束
- 不要 git 提交。沙箱禁网，不加新依赖。不要改 `electron/`、`mobile/`、`.github/`。
- 公开仓库：不写内部域名、人名、邮箱。
- 前端文案走 locales，所有语言包都补齐，没有翻译的先用英文。

## 汇报
写到 `report.md`（中文），包括：逐条怎么改的、改了哪些文件、跑了哪些测试和结果、没把握的地方。
