# T-1224 首屏瘦身报告

## 第 1 轮数字有误，以第 3 轮为准

第 1 轮报告把入口、App 静态依赖和语言包的口径混在了一起，不能用其中的 356,837 B、628.80 KB 等数字判断本轮结果。本报告统一使用构建产物的原始字节数和 `gzip -9` 字节数；合计按去重后的入口资源、App 的静态 import 闭包和一个语言包计算。

## 第 1 轮原始记录（数字有误，以第 3 轮为准）

| 产物 | 改前未压缩 | 改前 gzip | 改后未压缩 | 改后 gzip |
| --- | ---: | ---: | ---: | ---: |
| `index` 入口 JS | 39.51 KB | 11.88 KB | 39.74 KB | 11.91 KB |
| `styles` 共享 JS | 958.88 KB | 274.81 KB | 63.20 KB | 21.77 KB |
| `styles` CSS | 333.89 KB | 52.47 KB | 333.89 KB | 51.53 KB |
| `App` 业务块 | 2,647.56 KB | 817.38 KB | 2,044.41 KB | 628.80 KB |
| `GroupView` | 合入 App | 合入 App | 47.40 KB | 14.08 KB |
| 英文语言包 | 合入 styles | 合入 styles | 700.80 KB | 191.32 KB |

## 基线最大的 20 个模块

这是第一次构建中 `styles` 和 `App` 主块的 Rollup `renderedLength` 排名：

| 模块 | 未压缩 |
| --- | ---: |
| `src/locales/en.json` | 741.2 KB |
| `react-dom/cjs/react-dom-client.production.js` | 552.9 KB |
| `tailwind-merge` | 102.2 KB |
| `src/state/store.tsx` | 119.2 KB |
| `src/components/Sidebar.tsx` | 106.2 KB |
| `shared/carved-bodies.ts` | 86.9 KB |
| `src/components/ChatView.tsx` | 69.5 KB |
| `src/components/GroupView.tsx` | 64.0 KB |
| `src/components/ModelPicker.tsx` | 54.2 KB |
| `src/components/ProviderIcons.tsx` | 44.0 KB |
| `src/components/Composer.tsx` | 43.3 KB |
| `src/components/AttachmentPreview.tsx` | 40.2 KB |
| `src/components/ChatMarkdown.tsx` | 34.7 KB |
| `src/components/EngineSetup.tsx` | 34.2 KB |
| `src/components/CallView.tsx` | 29.1 KB |
| `src/components/SidebarThreadRow.tsx` | 29.0 KB |
| `src/components/VoiceSettings.tsx` | 28.1 KB |
| `src/components/AnimatedMascot.tsx` | 26.6 KB |
| `src/components/ApprovalCard.tsx` | 25.3 KB |
| `src/components/SidebarProfileMenu.tsx` | 25.0 KB |

## 第 2 轮

- 恢复 `src/App.tsx` 对 `HomeLine`、`NoEngines` 的静态 import，修复登录后 `HomeLine is not defined` 导致的整页错误；`ChatView` 对 `EngineSetup` 也恢复静态 import，首帧仍显示登录按钮。
- 删除 `LazyChatMarkdown`，`ChatView`、`CallSheet`、`DataCard`、`InboxReading`、`WidgetNodes`、`GroupView` 等全部改回静态 `ChatMarkdown`。ChatMarkdown 本身继续静态进入 App；KaTeX 保持动态 import，构建中 `katex-HP8lGamR.js`（261,313 B，77,166 B gzip）和 KaTeX CSS 是独立块。
- 从 `vite.config.ts` 移除 `vendor-markdown` manual chunk，并删除写 `/tmp` 的 moduleStats 插件。Markdown 渲染主路径仍由 ChatMarkdown 负责。
- 撤回 `NotificationRail`、`NotificationsPanel`、`NewLocalFromMenu`、`CommandPalette`、`CryBotWelcome`、`EngineSetup` 的 lazy wrapper；保留确有独立产物的 `GroupView`，并给它保留 Loader2 占位。`src/components/lazy-screens.test.ts` 的预加载数量和 `SCREENS` 断言已与最终实现一致。
- 新增 `scripts/locale-bundles.ts` Vite 插件：每种语言构建为“本语言翻译 + 缺失 key 的英文值”，运行时按当前语言只动态加载一个包。`main.tsx` 等待 `loadPageLanguage()` 后首次渲染；切换语言按需加载，失败回退英文。`src/locales/index.ts` 不再静态引入英文 JSON。
- `scripts/check-frontend-budget.mjs` 现在解析 `.vite/manifest.json`，统计入口、App 静态闭包和中文语言包，去重后按 gzip -9 计算；没有匹配资源或 manifest 节点时退出报错。阈值仍是 `500 * 1024`，逻辑可被 import，`package.json` 增加 `check:bundle`。

构建命令：

```text
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec vite build
```

本轮构建成功。产物块如下（字节）：

| 块 | 未压缩 | gzip -9 |
| --- | ---: | ---: |
| 入口 `index-*.js` | 39,632 | 11,869 |
| `styles-*.js` | 82,164 | 26,747 |
| `styles-*.css` | 333,893 | 51,704 |
| `vendor-react` | 192,646 | 60,314 |
| `vendor-icons` | 65,472 | 19,982 |
| `vendor-schema` | 95,766 | 26,977 |
| `vendor-url` | 95,913 | 40,320 |
| `PlacesRail` | 41,586 | 12,862 |
| `MenuMotion` | 697 | 445 |
| `App`（含静态 ChatMarkdown 首条消息路径） | 2,256,385 | 692,268 |
| 英文合并语言包 | 700,828 | 191,246 |
| 中文合并语言包 | 790,119 | 232,999 |
| KaTeX 动态块 | 261,313 | 77,166 |
| KaTeX CSS 动态块 | 29,288 | 7,935 |

入口、登录后普通聊天的合计按以下口径计算：入口包含 HTML 直接引用的 JS/CSS 及其 manifest 静态依赖；登录后再加 App 及静态依赖；语言包按当前语言追加一次。

| 场景 | 未压缩合计 | gzip -9 合计 | 距 500 KiB 阈值 |
| --- | ---: | ---: | ---: |
| 入口 | 713,807 | 170,616 | 还剩 341,384 B |
| 登录后机器人列表 + 普通聊天（英文） | 3,904,982 | 1,134,734 | 超出 622,734 B |
| 登录后机器人列表 + 普通聊天（中文） | 3,994,273 | 1,176,487 | 超出 664,487 B |

严格口径仍超过 500 KiB，因此当前使用 `node scripts/check-frontend-budget.mjs dist --report-only` 输出报告而不失败；脚本默认模式仍会在超预算时退出非零。最值得继续拆的是 `shared/carved-bodies.ts`、`ProviderIcons.tsx`、`AttachmentPreview.tsx` 和 `tailwind-merge`，并确认首屏是否真的需要 `vendor-url`（tldts）及 `vendor-schema`（zod）。本轮没有继续拆 tldts 或 zod；它们仍分别约 40 KiB 和 27 KiB gzip。

验证结果：

- `src/App.engine-status.test.ts`：2 passed
- `src/components/ChatView.controls.test.ts`：58 passed
- `src/components/CallSheet.test.ts`：5 passed
- `src/components/ChatView.data-result.test.ts`：2 passed
- `src/components/inbox/InboxReading.dom.test.ts`：8 passed
- `src/components/ChatView.rows.test.ts`：7 passed
- `src/components/lazy-screens.test.ts`：18 passed
- `src/components/ChatMarkdown.test.ts`：140 passed
- `src/components/ChatMarkdown.katex-load.test.ts`：3 passed
- `src/components/ChatMarkdown.renderers.test.ts`：7 passed
- `src/components/ChatMarkdown.streaming.test.ts`：5 passed
- `src/components/ChatMarkdown.block-actions.test.ts`：3 passed
- `src/components/AttachmentGallery.test.ts`：25 passed；`src/components/AttachmentGallery.reply-group.test.ts`：9 passed
- `scripts/check-frontend-budget.test.mjs`：3 passed
- `src/lib/i18n.test.ts`：37 passed，保留主分支已有的 pt-br 缺 3 个 key 那 1 项失败

## 第 3 轮

### 冲突与修复

- `src/locales/index.ts` 的语言代码类型和别名映射统一从 main 新增的 `shared/languages.ts` 引入，不再保留重复的 `localePacks`。加载器以共享 `LanguageCode` 为完整键集合，继续按需加载每种语言的一个合并包；T-1225 新增的英文和译文也进入同一合并流程。
- `src/lib/render-page.tsx` 统一处理 `main.tsx` 和 `rail.tsx` 的启动失败。当前语言与英文都无法下载时，仍挂载最小错误页，沿用 PageBoundary 的布局、按钮样式，只有三条内置英文，不调用 `t()`。Retry 刷新页面，重新发起启动加载；整页刷新也能清除浏览器缓存的失败动态模块。新增 `render-page.test.ts` 覆盖 en/zh 全离线、错误页、点击刷新、网络恢复后正常渲染。`i18n.test.ts` 恢复对英文也失败的 mock，另保留仅目标语言失败时回退英文的测试。
- 新增 `src/testing/preview-locale.ts`，先 `await loadLocale` 再允许预览渲染。统一接入 `src/` 的 8 个 `*-preview.tsx`、`scripts/testing/` 的 22 个 `*-preview.tsx`，以及 `src/testing/{bot-settings,mentions,avatar-providers,thread-approvals}.tsx`，共 34 个独立入口。默认英文，保留 `?lang=` 选择。`preview-locale.test.ts` 检查所有入口的 await 顺序，并覆盖英文/中文的异步等待。`createRoot` 搜索的其余结果是正式 main/rail、单测或 `modal-dialog-focus-check.ts` 中在已有页面运行的测试代码，不是遗漏的预览入口。
- `src/components/AttachmentGallery.tsx` 恢复 `fromMarkdown(text, { mdastExtensions: [windowsPathDestinations] })`，保留 `chat-markdown-links.ts` 中的路径工具。`AttachmentGallery.markdown.test.ts` 用 15 个用例直接对比服务端 `messageFileTargets`：括号、反转义、自动链接、完整/折叠/快捷引用、引用空白归一化、嵌套方括号、缩进代码、HTML 注释、转义方括号、Windows 路径和代码围栏。只调用纯解析函数，不启动服务、不读取真实会话文件。
- `scripts/locale-bundles.ts` 使用 `\0locale-bundle:<语言代码>` 作为虚拟 ID，构建机路径仅供插件读取输入文件。`vite.config.ts` 删除默认 `manifest: true`；`package.json` 的 `check:bundle` 改为先 `vite build --manifest` 再运行检查，`scripts/check-frontend-budget.mjs` 和测试同步识别新 ID。普通生产构建不生成 manifest，体积核查显式生成。
- `src/components/lazy-screens.tsx` 对 LiveCallHost、NewBotNameHost、ConversationShareDialogs、TeamWelcome、FirstConversationTour 恢复静态导出。CloudIntent 的旧产物为 2,923 B gzip，也恢复静态；CloudSetup（3,808 B）和 CloudWelcome（5,501 B）保留懒加载并加 Loader2 占位。`lazy-screens.test.ts` 同步预加载数量（27）、静态依赖约定和云端主界面的占位断言。NewBotNameHost 因而在 App 首次挂载时就能注册起名回调。
- 恢复第 1 轮的原始改前/改后表与主块 20 个模块表，明确标注数字有误、以本轮为准；删除 AttachmentGallery 避免静态引入 Markdown 解析器的不实说明。

本轮未修改 `server/`、`electron/`、`mobile/`、`.github/`；工作区已有这些目录的暂存变更来自协调者合入 main。未提交、未中止合并、未 checkout。工作文件中的冲突已解决，但 Git 索引所在目录只读，`git add src/locales/index.ts` 无法创建 `index.lock`；协调者提交前需暂存这个已修复的文件。仓库当前缺少 AGENTS.md 引用的 `docs/verification/README.md`；本轮仅运行下面列出的隔离单测和构建，未对运行中的应用或数据做验证。

### 单测与检查

所有 Vitest 调用都一次一个文件，统一使用：

```text
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner
```

最终 30 个文件、473 项通过，仅保留 pt-br 缺少 3 个 key 导致的 1 项已有失败。预览入口检查首次运行因 TypeScript 7 不提供 AST API 失败，改用已安装的 `@typescript/typescript6` 后单独复跑通过；未加依赖。

| 测试文件 | 结果 |
| --- | --- |
| `src/testing/preview-locale.test.ts` | 3 passed |
| `src/components/AttachmentGallery.markdown.test.ts` | 15 passed |
| `src/components/lazy-screens.test.ts` | 20 passed |
| `src/lib/i18n.test.ts` | 38 passed；1 failed（已有 pt-br 完整性断言） |
| `src/App.engine-status.test.ts` | 2 passed |
| `src/components/ChatView.controls.test.ts` | 58 passed |
| `src/components/CallSheet.test.ts` | 5 passed |
| `src/components/ChatView.data-result.test.ts` | 2 passed |
| `src/components/inbox/InboxReading.dom.test.ts` | 8 passed |
| `src/components/ChatView.rows.test.ts` | 7 passed |
| `src/components/ChatMarkdown.test.ts` | 140 passed |
| `src/components/ChatMarkdown.katex-load.test.ts` | 3 passed |
| `src/components/ChatMarkdown.renderers.test.ts` | 7 passed |
| `src/components/ChatMarkdown.streaming.test.ts` | 5 passed |
| `src/components/ChatMarkdown.block-actions.test.ts` | 3 passed |
| `src/components/AttachmentGallery.test.ts` | 25 passed |
| `src/components/AttachmentGallery.reply-group.test.ts` | 9 passed |
| `src/components/NewBotName.test.ts` | 6 passed |
| `src/lib/new-bot.test.ts` | 20 passed |
| `src/lib/create-configured-bot.test.ts` | 14 passed |
| `src/lib/language-preference.test.ts` | 12 passed |
| `src/components/cloud-welcome/CloudWelcome.test.ts` | 29 passed |
| `src/components/TeamWelcome.test.ts` | 11 passed |
| `src/components/onboarding/FirstConversationTour.test.ts` | 7 passed |
| `src/components/conversation-share/ConversationShareDialogs.dom.test.ts` | 8 passed |
| `src/components/CloudIntent.test.ts` | 3 passed |
| `src/components/PageBoundary.test.ts` | 2 passed |
| `src/components/MarkdownFilePreview.dom.test.ts` | 6 passed |
| `scripts/check-frontend-budget.test.mjs` | 3 passed |
| `src/lib/render-page.test.ts` | 2 passed |

本轮改动的 TS/TSX/MJS 文件通过 `oxlint --deny-warnings`；`git diff --check` 通过；`grep -rn '<<<<<<<\|>>>>>>>' src shared server` 无输出。没有运行全量 typecheck、完整 pnpm test 或 e2e，构建没有与 Vitest 并行。

### 本轮构建与体积（gzip -9）

仅构建一次，成功，耗时 57.94 秒：

```text
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec vite build --manifest
PATH=/opt/node24/bin:$PATH node scripts/check-frontend-budget.mjs dist --report-only
```

Vite 的诊断 manifest 将虚拟 ID 的开头 NUL 去掉，最终键为 `locale-bundle:zh` 等；检查脚本按这个实际格式匹配。首次体积检查发现这个差异后，只修正检查脚本并复跑其 3 项单测和 `--report-only`，没有重复构建。`grep -r "$PWD" dist` 无输出（包含本次显式生成的 `.vite/manifest.json`），产物不再包含构建机绝对路径。构建仍提示部分块较大及依赖注释标记问题，未导致失败。

口径与审核一致：入口取 `index.html` 直接资源及静态依赖；登录后再加 App 全部静态 JS/CSS 依赖和当前语言的单个合并包，去重后逐文件 gzip level 9 求和。main 列使用本轮审核给出的对照值，没有额外构建 main；main 未压缩合计未提供，不推测。

| 场景 | main gzip -9（B） | 第 3 轮未压缩（B） | 第 3 轮 gzip -9（B） | 相对 main | 距 500 KiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| 入口 | 338,030 | 714,542 | 170,885 | -167,145 B（-49.4%） | 剩余 341,115 B |
| 登录后机器人列表 + 普通聊天（英文） | 1,168,405 | 3,938,931 | 1,144,904 | -23,501 B（-2.0%） | 超出 632,904 B |
| 登录后机器人列表 + 普通聊天（中文） | 1,325,886 | 4,028,209 | 1,186,667 | -139,219 B（-10.5%） | 超出 674,667 B |

本轮主要块如下。ChatMarkdown 的首条消息路径仍静态进入 App，没有另算一个不存在的首条消息块；KaTeX 仍是独立动态块，不在以上静态合计中。

| 块 | 未压缩（B） | gzip -9（B） |
| --- | ---: | ---: |
| 入口 JS | 39,655 | 11,868 |
| styles 共享 JS | 82,876 | 27,018 |
| styles CSS | 333,893 | 51,704 |
| vendor-react | 192,646 | 60,314 |
| vendor-icons | 65,472 | 19,981 |
| vendor-schema | 95,766 | 26,977 |
| vendor-url | 95,913 | 40,320 |
| App（包含静态 ChatMarkdown） | 2,289,496 | 702,147 |
| 英文合并包 | 700,931 | 191,267 |
| 中文合并包 | 790,209 | 233,030 |
| CloudSetup（动态） | 10,256 | 3,790 |
| CloudWelcome（动态） | 17,951 | 5,483 |
| KaTeX（动态） | 261,313 | 77,166 |

恢复小组件静态加载、补齐失败页并合入 T-1225 后，英文/中文登录后合计相对第 2 轮分别增加 10,170 / 10,180 B gzip，仍低于本轮 main 对照。500 KiB 目标仍未达到，中文超出 674,667 B；`--report-only` 仅用于报告，默认预算检查仍会失败。下一步主要空间仍在 App 业务依赖（尤其 carved-bodies、ProviderIcons、AttachmentPreview、tailwind-merge）及首屏对 tldts/zod 的依赖。未额外新增语言包预加载提示。

## 第 4 轮

### 改动

- `src/components/CloudSetup.tsx` 改为 `src/App.tsx` 的静态 import，移除 `lazy-screens.tsx` 中会占满 `flex` 主布局的 Loader2 占位和失败提示。CloudWelcome 仍保留懒加载及主内容区占位。`src/components/lazy-screens.test.ts` 删除 CloudSetup 的懒加载断言，预加载数量从 27 调整为 23，并把 CloudSetup、CloudEngineSignIn、MemberApps、GuidedTour 加入启动静态依赖断言。
- `CloudEngineSignIn`、`MemberApps`、`GuidedTour` 同样恢复为 `src/App.tsx` 静态 import；它们分别是云端首次主内容、插件面板和所有用户常驻挂载，避免首帧空白或块加载失败提示。
- `src/lib/language-preference.ts` 的 `usePageLanguage` 在异步加载后补 `.catch(() => {})`，失败时不改变当前语言，也不产生未处理 rejection。新增单测覆盖离线加载；去掉 catch 的改前运行结果是 Vitest 报 `Unhandled Rejection: Error: offline`（测试断言本身通过但进程以 1 退出），加回后 13 项全部通过。
- 三个独立 Vite fixture（`scripts/verify-server-connection.mjs`、`scripts/verify-company-backups.mjs`、`scripts/verify-organization-settings.mjs`）均加入 `localeBundles()`，内联入口改为 `loadLocale('en').then(() => { ... createRoot(...); })`，确保 `virtual:english-contracts` 在渲染前可解析。用不监听端口的 `vite.createServer(...).transformRequest('/src/locales/index.ts')` 逐一验证，三个配置都输出 `transformed (2777 chars)`。
- 全仓入口扫描使用：

  ```text
  rg -n 'createRoot\(|createServer\(' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' --glob '*.cjs' --glob '*.js' --glob '!node_modules/**'
  ```

  扫描共 818 行；其中浏览器预览入口由现有 `src/testing/preview-locale.test.ts` 扫描 `src/`、`src/testing/`、`scripts/testing/` 下的 34 个 `.tsx` 入口并全部检查 `preparePreviewLocale` 在 `createRoot` 前；`scripts/` 根目录没有独立的 `.tsx` 预览入口，只有本轮单独处理的三个 `.mjs` Vite fixture。`scripts/verify-engines-ui.ts` 和 `scripts/testing/preview-fixture.ts` 使用仓库默认 Vite 配置（包含 `localeBundles()`），其余 `createServer` 命中是 HTTP/测试服务器，不是前端 Vite 入口。

### 第 4 轮构建体积（gzip -9）

构建前确认内存可用 7.0 GiB；只执行一次：

```text
free -h
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec vite build --manifest
PATH=/opt/node24/bin:$PATH node scripts/check-frontend-budget.mjs dist --report-only
```

构建成功（1m 2s）。产物中 `rg -n -F "$PWD" dist` 无输出。入口和登录后合计使用 manifest 静态 import 闭包去重后逐文件 gzip -9 求和；main 对照沿用复核值。

| 场景 | main gzip -9（B） | 第 4 轮未压缩（B） | 第 4 轮 gzip -9（B） | 相对 main | 距 500 KiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| 入口 | 338,030 | 714,556 | 170,885 | -167,145 B（-49.4%） | 剩余 341,115 B |
| 登录后机器人列表 + 普通聊天（英文） | 1,168,405 | 3,968,512 | 1,152,905 | -15,500 B（-1.3%） | 超出 640,905 B |
| 登录后机器人列表 + 普通聊天（中文） | 1,325,886 | 4,057,790 | 1,194,668 | -131,218 B（-9.9%） | 超出 682,668 B |

主要块如下：

| 块 | 未压缩（B） | gzip -9（B） |
| --- | ---: | ---: |
| 入口 JS | 39,655 | 11,866 |
| styles 共享 JS | 82,890 | 27,020 |
| styles CSS | 333,893 | 51,704 |
| vendor-react | 192,646 | 60,314 |
| vendor-icons | 65,472 | 19,981 |
| vendor-schema | 95,766 | 26,977 |
| vendor-url | 95,913 | 40,320 |
| App（包含四个恢复的静态组件） | 2,319,063 | 710,153 |
| 英文合并包 | 700,931 | 191,267 |
| 中文合并包 | 790,209 | 233,030 |
| CloudWelcome 动态块 | 17,919 | 5,474 |
| KaTeX 动态块 | 261,313 | 77,166 |

500 KiB 目标仍未达到；`--report-only` 仅用于输出，默认预算检查仍会以超预算退出。恢复四个小组件后 App 增加约 8 KiB gzip，英文和中文仍分别低于 main 对照；下一步空间仍在 App 业务依赖（`carved-bodies`、`ProviderIcons`、`AttachmentPreview`、`tailwind-merge`）及首屏是否需要 tldts/zod。

### 测试与检查

所有 Vitest 均按单文件、`--maxWorkers=2` 运行。通过结果：

- `src/components/lazy-screens.test.ts`：19 passed。
- `src/testing/preview-locale.test.ts`：3 passed；`src/lib/render-page.test.ts`：2 passed。
- `src/lib/language-preference.test.ts`：13 passed。
- `src/components/AttachmentGallery.test.ts`：25、`AttachmentGallery.reply-group.test.ts`：9、`AttachmentGallery.markdown.test.ts`：15 passed。
- `src/components/NewBotName.test.ts`：6、`src/lib/new-bot.test.ts`：20、`src/components/CloudIntent.test.ts`：3、`scripts/check-frontend-budget.test.mjs`：3、`src/App.engine-status.test.ts`：2 passed。
- `src/lib/i18n.test.ts`：38 passed、1 failed；唯一失败仍是 main 已有的 pt-br 缺少 3 个 key 完整性断言。
- `oxlint --deny-warnings` 对本轮改动的 8 个源码/脚本文件通过，`git diff --check` 通过。

前端 `PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc -b --pretty false` 未通过，报错均在本轮未修改的既有文件：`src/components/SettingsModal.i18n.test.ts:54` 的 possibly undefined，以及 `src/lib/activity-text.ts:19,56` 的 `string | number` 类型不匹配。

## 第 5 轮

### 归因与修复

更正第 4 轮的归因：上述三处类型错误都是本任务引入的，不能因为文件在第 4 轮未修改就视为 main 已有问题。本轮只修改 `src/lib/activity-text.ts`、`src/components/SettingsModal.i18n.test.ts` 和本报告；保留已有工作区改动，未提交、未联网。

- `activity-text.ts`：两处 `hasLocaleKey(value)` 前增加 `typeof value === "string"`，让 `string | number` 先收窄为 string。`isReferenceParam` 的返回类型是 boolean，虽然内部已检查 string，但不会向调用方传递类型收窄。数字参数仍按原值处理，与 main 一致；通过 `hasLocaleKey` 后已得到 `LocaleKey`，同时移除这两处多余的类型断言。
- `SettingsModal.i18n.test.ts`：保存 `en[key]` 为局部变量，缺失时抛出带 key 的错误，确认存在后再调用 `replaceAll`。保持测试对英文文案的严格检查，不使用非空断言或类型检查屏蔽，也不把尚未加载的 `en` 声明成完整包。

### main 对照证据

在 worktree 外的仓库主目录读取本地 `origin/main`（`0048d386`），未 fetch：

```sh
git show origin/main:src/lib/activity-text.ts
git show origin/main:src/components/SettingsModal.i18n.test.ts
git show origin/main:src/locales/index.ts
git show origin/main:src/locales/en.json
git show origin/main:tsconfig.json
```

main 的两处调用为 `Object.hasOwn(en, value)`，接受 `string | number`；本任务替换后的 `hasLocaleKey` 仅接受 string。SettingsModal 测试在本轮修复前与 main 完全相同，但 main 的 `src/locales/index.ts` 静态导入并导出 `en.json`，所测 10 个 key 均存在，`en[key]` 为 string。本任务将导出改为 `en: Partial<Record<LocaleKey, string>> = {}`，使同一表达式变为 `string | undefined`，因此该报错也是本任务造成的。

另外用 `git archive origin/main` 导出独立快照到 `/tmp/t1224-r5-main-c6z62wq4`，仅将其 `node_modules` 链接到本 worktree 已安装的依赖。快照不含历史 `tsconfig.tsbuildinfo`，在该目录执行下列前端类型检查，退出 **0**、无诊断，实证 main 没有 SettingsModal 那处报错。未操作用户应用或数据。

### 命令与结果

两次 tsc 前均检查 `free -m` 和进程占用：main 快照检查前可用约 7,132 MiB，当前 worktree 检查前约 7,166 MiB；没有并行构建或测试进程。按本轮 4 GiB 限额串行执行，tsc 的 Node 堆上限设为 3,072 MiB。

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc -b --pretty false
```

- main 独立快照：退出 **0**，无报错。
- 当前 worktree 修复后：退出 **0**，三处错误全部消除。

以下 Vitest 命令逐条执行，一次一个文件：

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run src/lib/activity-text.test.ts --maxWorkers=2 --configLoader runner
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run src/lib/i18n.test.ts --maxWorkers=2 --configLoader runner
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run src/components/lazy-screens.test.ts --maxWorkers=2 --configLoader runner
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run src/components/SettingsModal.i18n.test.ts --maxWorkers=2 --configLoader runner
PATH=/opt/node24/bin:$PATH pnpm exec oxlint --deny-warnings src/lib/activity-text.ts src/components/SettingsModal.i18n.test.ts
git diff --check
```

| 检查 | 结果 |
| --- | --- |
| activity-text | 14 passed，退出 0 |
| i18n | 38 passed、1 failed，退出 1；仅允许的 pt-br 完整性断言失败 |
| lazy-screens | 19 passed，退出 0 |
| SettingsModal.i18n | 3 passed，退出 0 |
| oxlint（本轮两个代码文件） | 退出 0，无警告 |
| git diff --check | 退出 0 |

i18n 唯一失败为 `activePackComplete > is true only for a pack other than English that has every English key`，pt-br 返回 false、断言期待 true。通过 `git show origin/main:src/locales/{en,pt-br}.json` 读取两份语言包并比较 key，main 与当前分支都恰好缺少 `botOverview.preference.cloud.locked`、`keys.section.computers.purpose.locked`、`settings.profile.nameFromLogin`，没有新增缺失项。


## 第 6 轮

### 根因与改法

本轮基于 `df1c1b8e`，本地 `origin/main` 为 `ea5bc8b8`，没有联网或提交。修改范围只有共享测试引导 `src/testing/all-locales.ts`、必要的冷启动测试引导 `src/lib/i18n.test.ts` 和本报告；保留用户已有的未跟踪 `r6.md`。

`vite.config.ts:69` 已对所有这些测试配置 `src/testing/all-locales.ts`。问题不是遗漏 setup 或独立配置：setup 在每个测试文件开始前 `await loadLocalePack("en")`，只填充当时的 `src/locales/index.ts` 实例。Vitest 4.1.11 的 `vi.resetModules()` 清空模块缓存，却不会重新执行 setup；随后动态 import 得到新的 locales/i18n，英文对象重新为空。同步 `setLocale("en")` 只选择语言，不下载包。

| 文件 | 具体触发路径 |
| --- | --- |
| `src/components/ChromeRailToggle.test.ts` | happy-dom 环境；`page()` 第 25 行 reset，然后动态导入 i18n、同步 setLocale，再导入 ChromeRailToggle/ChromeRailRow。新的英文对象为空，两个有 rail 的用例在 `rail.hide` 抛错；无按钮的用例不触发翻译。afterEach 也 reset。 |
| `src/components/MacLocalControl.test.ts` | 默认 node 环境；文件顶部首次导入使用已预热实例，所以前几个用例正常。第 43 行为了隔离“Not now”会话状态 reset，再导入组件并 SSR，新的 macCuaPermissionMessage/i18n 在 `computer.mac.permission.requiredOne` 抛错。第 53、59 行也重置和导入，但只调用权限打开函数，不渲染文案。DesktopCapabilities mock 没有 mock 语言模块。 |
| `src/components/PlaceLookCard.test.ts` | happy-dom 环境；`page()` 第 21 行 reset，再导入 i18n、同步 setLocale 和 PlaceLookCard/PlaceTint，分别在 `placeLook.pictureLine`、`rail.thisComputer` 抛错。“older app”分支第 156 行还有一次额外 reset，之后直接导入并渲染 PlaceLookCard。store、权限、图片的 mock 均不是 locales mock。 |
| `src/components/RoutineScheduleNote.test.ts` | 默认 node 环境；前两个用例只测 schedulePlace，不需要文案。第三个用例第 27 行 reset，mock store、云计划、WelcomeGate、brand 后动态导入组件并 SSR，没有加载语言包，在 `routines.scheduleNote.local` 抛错。brand mock 提供产品名，并不预热 locales。 |
| `src/lib/skins.default.test.ts` | 默认 node 环境并 stub document/window；`boot()` 第 11 行每次 reset，重新导入皮肤和模式模块。前六个用例只检查状态；后两个在 boot 后动态导入 SkinPicker/ThemeRow/SettingsPrimitives 并 SSR，在 `settings.theme.title` 抛错。 |

修改方式：setup 保留原有真实英文包加载和其他语言 JSON getter，待初始化完成后用 `vi.doMock("../locales/index.ts", () => readyLocales)` 将这个已就绪的真实模块作为共享测试 fixture。Vitest 的模块重置不会清掉 mock 注册，因此新导入的 i18n 仍能获得已加载的英文；i18n 自己的当前语言、切换计数以及组件状态仍可随 reset 重新初始化。没有 mock 翻译函数、替换文案或修改生产代码，真实运行时未就绪的 `t()` 仍抛错。

特殊处理只有 `i18n.test.ts` 的 `loading a language` 分组：增加 beforeEach `vi.doUnmock("@/locales")`，让已有 reset 和动态 import 继续取得真实冷启动模块。保留全部断言，包括英文初始为空、只加载所选语言、补齐缺失翻译、离线回退和英文也离线后重试。`render-page.test.ts` 已通过自身 doMock + importOriginal 取得真实冷模块，覆盖 setup mock，无须修改；`preview-locale` 和 `language-preference` 自己的 i18n mock 同样保留。

修复前按指定命令重现 ChromeRailToggle：2 failed / 1 passed，两个失败均为 `Locale not ready for rail.hide`。修复后同命令为 3 passed。其余四个指定文件均未改动，直接由共享引导修复。

### 全仓同类扫描与逐文件验证

执行的搜索命令（从仓库根目录）：

```sh
rg -n 'resetModules' --glob '*test*' --glob '*spec*' .
rg -n -U '(?:vi|vitest)\.(?:doMock|mock|unmock|doUnmock)\(\s*(?:import\()?\s*["\x27][^"\x27]*(?:locales|i18n)' --glob '*test*' --glob '*spec*' .
rg -l 'resetModules|(?:vi|vitest)\.(?:doMock|mock|unmock|doUnmock)\([^\n]*(?:locales|i18n)' --glob '*test*' --glob '*spec*' src
```

resetModules 共命中 60 个文件：`src/` 30 个、`server/` 25 个、`electron/` 4 个、`scripts/` 1 个。语言模块 mock/unmock 搜索仅命中 `i18n.test.ts`、`render-page.test.ts`、`language-preference.test.ts`、`preview-locale.test.ts`，全部包含在这 30 个前端文件内，没有额外的 locale JSON mock。

检查各文件 reset 后的 import：除指定五个外，组件/文案相关候选还包括 `ChatMarkdown.katex-load`（重新导入 ChatMarkdown）、`lazy-screens`（重新导入懒加载组件）、`computer-takeover`（重新导入 UI 控制模块）、`admin-scope`（导入 PluginsPanel）、`cloud-intent`（SSR）、`follow-up`、`send-key`（文案函数），以及上述四个语言模块测试。为覆盖间接依赖，30 个前端命中全部逐个执行，连只测偏好或状态的文件也没有省略。

非前端命中不属于本轮的渲染语言包风险：`scripts/verify-engines-ui.test.mjs` 重置后导入的是验证启动脚本，Vite/HTTP/fixture launch 均被 mock，没有导入或渲染浏览器组件；Electron 的 `cua-launch`、`cua-watch-restart`、`cua-windows-isolation`、`updater` 测试重置主进程模块；25 个 server 测试重置服务端模块，不渲染前端组件。这些不纳入本轮逐文件运行范围。

下表每个文件各执行一次独立 Vitest 命令，没有同时运行两个文件；`activity-text`、`SettingsModal.i18n` 是额外的必需回归文件，其余 30 个就是扫描命中集合。ChromeRailToggle 的修复前重现另计。

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=2048 pnpm exec vitest run <下表完整文件路径> --maxWorkers=2
```

| 文件 | 结果 | 退出码 |
| --- | --- | ---: |
| `src/components/ChatMarkdown.katex-load.test.ts` | 3 passed (3) | 0 |
| `src/components/ChromeRailToggle.test.ts` | 3 passed (3) | 0 |
| `src/components/MacLocalControl.test.ts` | 5 passed (5) | 0 |
| `src/components/PlaceLookCard.test.ts` | 11 passed (11) | 0 |
| `src/components/RoutineScheduleNote.test.ts` | 3 passed (3) | 0 |
| `src/components/SettingsModal.i18n.test.ts` | 3 passed (3) | 0 |
| `src/components/computer-takeover.test.ts` | 15 passed (15) | 0 |
| `src/components/lazy-screens.test.ts` | 19 passed (19) | 0 |
| `src/lib/activity-text.test.ts` | 14 passed (14) | 0 |
| `src/lib/admin-scope.test.ts` | 4 passed (4) | 0 |
| `src/lib/call-mode.test.ts` | 6 passed (6) | 0 |
| `src/lib/cloud-intent.test.ts` | 7 passed (7) | 0 |
| `src/lib/connected-apps-outages.test.ts` | 5 passed (5) | 0 |
| `src/lib/desktop.test.ts` | 7 passed (7) | 0 |
| `src/lib/follow-up.test.ts` | 4 passed (4) | 0 |
| `src/lib/i18n.test.ts` | 1 failed 、 38 passed (39) | 1 |
| `src/lib/interface-mode.test.ts` | 7 passed (7) | 0 |
| `src/lib/language-preference.test.ts` | 13 passed (13) | 0 |
| `src/lib/mcp-servers.test.ts` | 9 passed (9) | 0 |
| `src/lib/new-look.test.ts` | 16 passed (16) | 0 |
| `src/lib/notification-preferences.test.ts` | 13 passed (13) | 0 |
| `src/lib/render-page.test.ts` | 2 passed (2) | 0 |
| `src/lib/run-card-preferences.test.ts` | 8 passed (8) | 0 |
| `src/lib/send-key.test.ts` | 23 passed (23) | 0 |
| `src/lib/session-ended.test.ts` | 3 passed (3) | 0 |
| `src/lib/sidebar-preferences.density.test.ts` | 4 passed (4) | 0 |
| `src/lib/simple-mode-prompt.test.ts` | 2 passed (2) | 0 |
| `src/lib/skins.default.test.ts` | 8 passed (8) | 0 |
| `src/lib/thread-preferences.test.ts` | 13 passed (13) | 0 |
| `src/lib/use-owner-or-admin.test.ts` | 4 passed (4) | 0 |
| `src/lib/user-bubble-preference.test.ts` | 3 passed (3) | 0 |
| `src/testing/preview-locale.test.ts` | 3 passed (3) | 0 |

共 32 个文件，31 个文件全绿；唯一失败是已允许的 `i18n > activePackComplete > is true only for a pack other than English that has every English key`，仍为 pt-br 期待 true、实际 false，i18n 其余 38 项通过。读取本地 `origin/main` 与 `HEAD` 的 en/pt-br JSON 比较，均恰好缺少 `botOverview.preference.cloud.locked`、`keys.section.computers.purpose.locked`、`settings.profile.nameFromLogin` 三项，没有新增失败。

### Electron 依赖证据

检查 `electron/updater-handoff.electron.test.mjs` 的直接 import/require，以及它启动的 `electron/fixtures/updater-handoff.cjs`。fixture 动态导入 `updater.mjs` 和 `package-install-command.mjs`；updater 导入的终端、提权、更新协调、原生文案等模块继续递归展开，连 re-export 和条件 require 的 vendored updater 一并检查，共 27 个本地文件。和 `git diff --name-only origin/main...HEAD` 的交集为空，无缺失的相对引用。

完整集合（均在 `electron/` 下）：

```text
updater-handoff.electron.test.mjs, fixtures/updater-handoff.cjs,
updater.mjs, package-install-command.mjs, terminal-launch.mjs,
desktop-build-config.mjs, environments.cjs, elevated-install.mjs,
single-instance.mjs, update-errors.mjs, updater-coordinator.mjs,
update-when-quiet.mjs, update-when-quiet-main.mjs, update-words.mjs,
one-home.mjs, native-text.cjs, move-failure.mjs, move-gaps.mjs,
cloud-send.mjs, cloud-send-parts.mjs, cloud-send-check.mjs,
cloud-send-kinds.mjs, cloud-connections.mjs, cloud-logins.mjs,
cloud-power.mjs, cloud-space.mjs, vendor/electron-updater.cjs
```

`native-text.cjs` 额外用 fs 直接读取 `src/locales/*.json`；它不 import 前端 `src/locales/index.ts` 或 `src/lib/i18n.ts`。继续检查数据和依赖：

```sh
git rev-parse origin/main
git diff --name-only origin/main...HEAD
rg -n 'import|require\(' electron/updater-handoff.electron.test.mjs electron/fixtures/updater-handoff.cjs electron/updater.mjs
# 同样逐层检查上述 27 个文件的相对 import、export from、require。
git diff origin/main...HEAD -- electron 'src/locales/*.json' pnpm-lock.yaml
git diff origin/main...HEAD -- package.json
```

倒数第二条无输出；package.json 唯一变化是增加 `check:bundle` script，依赖版本未变。Vitest 父进程的公共 setup 确有本任务改动，但独立启动的 Electron fixture 不会加载它，终端启动链没有进入前端语言模块。CI 片段已经走到 `fixture-complete`，缺少的是 `terminal-really-launched`，并伴随 XIO 错误；这与终端/X11 环境问题相符，不能仅凭片段证明具体抖动机制。按本轮要求不改、不重跑该 Electron 测试，不宣称已修好该环境失败。

### 类型与静态检查

所有 Vitest 结束后执行 `free -m` 和 `ps -eo pid,ppid,rss,args`：可用内存 6,323 MiB，未发现仍在运行的 Vitest、tsc 或 Vite build。按本轮 4 GiB 限额串行执行前端 tsc，Node 堆上限 3,072 MiB；没有并行测试或构建。

```sh
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec tsc -b --pretty false
PATH=/opt/node24/bin:$PATH pnpm exec oxlint --deny-warnings src/testing/all-locales.ts src/lib/i18n.test.ts
git diff --check
```

三项均退出 **0**，tsc 无诊断，oxlint 无警告。未修改任何生产源码、断言期望、依赖、server/electron/mobile/.github 文件，也没有 git 提交。测试日志和本轮扫描明细保存在本机 `/tmp/t1224-r6/`，不纳入仓库。
