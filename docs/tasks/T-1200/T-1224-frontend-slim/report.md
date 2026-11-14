# T-1224 首屏瘦身报告

## 第 1 轮数字有误，以下为准

第 1 轮报告把入口、App 静态依赖和语言包的口径混在了一起，不能用其中的 356,837 B、628.80 KB 等数字判断本轮结果。本报告统一使用构建产物的原始字节数和 `gzip -9` 字节数；合计按去重后的入口资源、App 的静态 import 闭包和一个语言包计算。

## 第 2 轮

- 恢复 `src/App.tsx` 对 `HomeLine`、`NoEngines` 的静态 import，修复登录后 `HomeLine is not defined` 导致的整页错误；`ChatView` 对 `EngineSetup` 也恢复静态 import，首帧仍显示登录按钮。
- 删除 `LazyChatMarkdown`，`ChatView`、`CallSheet`、`DataCard`、`InboxReading`、`WidgetNodes`、`GroupView` 等全部改回静态 `ChatMarkdown`。ChatMarkdown 本身继续静态进入 App；KaTeX 保持动态 import，构建中 `katex-HP8lGamR.js`（261,313 B，77,166 B gzip）和 KaTeX CSS 是独立块。
- 从 `vite.config.ts` 移除 `vendor-markdown` manual chunk，并删除写 `/tmp` 的 moduleStats 插件。`AttachmentGallery` 改为本地链接提取器，避免为少量附件路径判断静态引入 `mdast-util-from-markdown`；Markdown 渲染主路径仍由 ChatMarkdown 负责。
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
