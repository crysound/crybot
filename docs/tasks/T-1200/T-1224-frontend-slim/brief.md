# T-1224 网页首屏瘦身：拆分大块、按需加载

## 背景（实测）
网页首屏要下载 index 约 39KB + `styles` 块约 959KB + css 约 334KB + App 主块约 2.65MB，未压缩约 4MB，gzip 后约 1.15MB。大陆用户经海外节点访问，200–500KB/s 下首屏 3–6 秒；每次发版文件名变化又要全量重下。

## 要做的
1. 先 `vite build` 一次，用 rollup 产物（可加 `build.rollupOptions.output` 的临时统计或 `--mode` 下的 manifest）列出主块里最大的 20 个模块，写进 report。
2. 把首屏用不到的重模块改成按需加载（`React.lazy` / 动态 `import()`），候选：mermaid、KaTeX/公式、代码高亮语言包、图表库、AG Grid、远程桌面（noVNC）、终端、实时语音、各设置页/管理页、文件预览、Markdown 里的少见扩展等，以实测为准。加载中用现有的占位/骨架组件。
3. 用 `manualChunks` 把稳定的第三方库（react、react-dom 等）单独成块，这样平常发版只变业务块，浏览器缓存能复用。
4. 查 `styles` 这个 959KB 的 JS 块是什么（是否把 CSS 或字体/图标打进了 JS），能拆则拆、能去则去。
5. 目标：首屏（打开机器人列表 + 一个普通聊天）必须下载的 JS+CSS gzip 后 ≤ 500KB；做不到就在报告里写清卡在哪个模块。

## 不能出的问题
- 功能和外观不变；按需加载失败（网络断）时要有可重试的提示，不能白屏。
- 不加新依赖。不改 `server/`（除非只是静态资源响应头，且要在报告里说明）、`electron/`、`mobile/`、`.github/`。

## 验收
- report 里给出改前/改后的块大小表（未压缩和 gzip）。
- 现有前端单测通过（只跑改到的组件对应的测试文件）。
- 新增一个仓库内测试或脚本，构建后检查首屏入口块 gzip 体积不超过阈值（阈值写成常量，便于以后调整），由协调者在 CI 接入。

## 验证
构建：`PATH=/opt/node24/bin:$PATH NODE_OPTIONS=--max-old-space-size=3072 pnpm exec vite build`
单测一次一个文件：`PATH=/opt/node24/bin:$PATH pnpm exec vitest run <文件> --maxWorkers=1 --configLoader runner`
不要跑 `pnpm typecheck`、完整 `pnpm test`、e2e。

## 约束
- 不要 git 提交；沙箱禁网。
- 公开仓库：不能出现内部域名、IP、邮箱、人名、密钥、真实实例 ID。

## 汇报
`report.md`（中文）：块大小对比、拆了什么、哪里没把握、需要协调者做的事。
