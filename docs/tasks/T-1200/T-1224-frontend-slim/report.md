# T-1224 首屏瘦身报告

## 产物对比

基线构建使用 `vite v7.3.6`，构建命令为：

```text
PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec vite build
```

| 产物 | 改前未压缩 | 改前 gzip | 改后未压缩 | 改后 gzip |
| --- | ---: | ---: | ---: | ---: |
| `index` 入口 JS | 39.51 KB | 11.88 KB | 39.74 KB | 11.91 KB |
| `styles` 共享 JS | 958.88 KB | 274.81 KB | 63.20 KB | 21.77 KB |
| `styles` CSS | 333.89 KB | 52.47 KB | 333.89 KB | 51.53 KB |
| `App` 业务块 | 2,647.56 KB | 817.38 KB | 2,044.41 KB | 628.80 KB |
| `GroupView` | 合入 App | 合入 App | 47.40 KB | 14.08 KB |
| 英文语言包 | 合入 styles | 合入 styles | 700.80 KB | 191.32 KB |

入口 HTML 直接引用的 JS/CSS（入口脚本、modulepreload 和 stylesheet）改后 gzip 合计 **356,837 B**，由 `scripts/check-frontend-budget.mjs` 检查，阈值常量为 `ENTRY_GZIP_BUDGET_BYTES = 500 * 1024`。

登录后打开机器人列表和普通聊天还会加载动态 `App` 业务块，当前约 **628.80 KB gzip**，因此“普通聊天实际下载 JS+CSS gzip ≤500 KB”尚未达到。主要卡点是 `state/store.tsx`、`Sidebar.tsx`、`ChatView.tsx`、`ModelPicker.tsx`、`shared/carved-bodies.ts` 及其业务依赖；这些模块同时承担机器人列表和普通聊天的首屏功能，继续拆分需要协调者确认交互上的加载占位策略。

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

## 已完成的拆分

- `manualChunks` 将 React/React DOM、Lucide、Markdown/remark、Zod、tldts 分到稳定的第三方块；日常发版时业务块变化不会重新生成这些稳定块。
- Markdown 渲染器改为 `LazyChatMarkdown`，react-markdown、remark、KaTeX 及其解析依赖只在消息需要渲染时加载。Mermaid、Shiki 语言包、数据面板、AG Grid、Vega、远程桌面和设置页沿用或加强已有动态加载。
- GroupView、通知、收件箱、云端引导、插件页、命令面板、新建机器人、实时语音宿主等从 App 静态图中移到 `lazy-screens`；加载失败沿用现有可重试提示。
- `AttachmentGallery` 使用独立的 `chat-markdown-links`，避免仅为路径判断而静态拉入完整 Markdown 渲染器。
- `styles` 959KB 的内容是多入口共享的 JS 公共块，主要含英文语言包、React DOM 和 `tailwind-merge`；CSS 本身仍是独立的 334KB 文件。拆分后公共 JS 约 63KB，英文语言包单独缓存。

## 验证

通过：

- `src/components/ChatMarkdown.test.ts`（140 tests）
- `src/components/ChatMarkdown.katex-load.test.ts`（3 tests）
- `src/components/ChatMarkdown.renderers.test.ts`（7 tests）
- `src/components/MarkdownFilePreview.dom.test.ts`（6 tests）
- 指定构建命令，构建成功。
- `node scripts/check-frontend-budget.mjs dist`，入口直接引用资源 gzip 356,837 B，预算通过。

`src/components/ChatView.controls.test.ts` 有 1 个已有行为断言失败：测试期待 `Sign in to Claude` 按钮，但当前渲染只有错误说明和 Details；失败发生在改动前后均涉及的 `FailedTurnRow` 路径，未据此修改产品逻辑。

## 需要协调者做的事

CI 接入 `node scripts/check-frontend-budget.mjs dist`。若验收口径要求把登录后 `App` 及其静态依赖也计入 500KB，而非只检查入口 HTML 直接引用资源，需要继续拆分 store、侧栏和聊天主视图，并先确定普通聊天加载时允许显示的骨架范围。
