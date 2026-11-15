## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行依赖准备脚本（镜像自带，把预装依赖链进 node_modules）。
- 没有 systemd、Docker；不能监听 TCP 端口（跑不了的 e2e 写明，协调者会在主机实跑）。vitest 一次只跑一个文件；需要 Node 24。
- 不提交 git。

# T-1238 Cry Bot 界面语言只留中文（简体）和英文

## 背景
仓库是从上游导入的，带 16 种界面语言。产品负责人决定只保留 简体中文（zh）和英文（en），去掉其余 14 种：zh-tw、ja、ko、de、fr、es、it、pt-br、ru、uk、pl、tr、vi、hi。目的是以后加功能只需补中英两份文案、测试更快。

## 要做
1. 先盘点：仓库里所有「按语言分份」的东西，列一张表写进报告。至少包括：
   - src/locales/*.json、source-hashes.json、各语言的 src/locales/*.test.ts；
   - 语言清单/选择器（前端设置里的语言选项、i18n 加载、浏览器语言探测）；
   - 服务端按语言的固定文案：server/language.ts、server/server-lines.ts、server/server-line-packs.ts、server/initial-greeting.ts、server/routine-cron-text.ts、server/workspace.ts、server/setup-import.ts 等（用 grep 找全，例如 "pl"、"pt-br"、"zh-tw"、"ja" 等语言码）；
   - 桌面端 electron、移动端（mobile/ 下 iOS/Android/手表）若有各自的本地化资源，也一并处理；
   - 生成/校验脚本（scripts/generate-locale.mjs 及其测试、文案扫描器）和 CI 工作流里涉及语言列表的地方。
2. 删除 14 种语言的资源和对应测试，语言清单只剩 zh、en。用一个集中定义的「支持语言列表」，不要在多处各写一份。
3. 兼容：已保存的语言偏好如果是被删的语言，读取时自动退回——zh-tw 等中文变体→zh，其他→en；浏览器/系统语言探测同理。不能因为旧设置值导致报错或空白文案。补测试覆盖这条。
4. 智能体回复语言不受影响：如果有「按用户语言选择回复语言/提示词」的逻辑，只砍固定文案的语言包，不要限制智能体用其他语言回答用户。若两者耦合，在报告里说明你的处理和理由。
5. 公开仓库规矩：不要在代码、文档里写内部域名、IP、邮箱、人名。

## 验收
- 语言检查（新增文案必须有各语言翻译的那条）改为只要求 zh 和 en，并有测试。
- 逐个文件跑与语言相关的全部测试（i18n、language、server-lines、generate-locale、preview-locale、各被改动文件的测试）并贴输出；跑不了的写明。
- `tsc -b` 和 `tsc -p tsconfig.server.json` 通过；对改动文件跑 `oxlint --deny-warnings`。
- report.md 写：盘点表、删了什么、兼容退回规则、哪些地方故意没动及原因。
