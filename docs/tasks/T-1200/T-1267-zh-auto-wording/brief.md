## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec tsc` 才可用。
- 这里没有 systemd、Docker，`systemd-run --scope ... --` 前缀一律去掉直接运行；一次只跑一个测试文件。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。
- 不提交 git。
- 本仓库是公开仓库：代码、注释、报告里不得出现内部域名、IP、邮箱、人名、真实钥匙、沙箱主目录绝对路径。

# T-1267：中文界面里工作位置「Auto」没翻译

## 现象
智能体设置 →「访问」区，云端那块的标题显示「Auto 云端偏好。」，说明里也写「Auto 在任务中……」。中文界面里工作位置的「自动」模式已统一叫「自动」（见 `src/locales/zh.json` 的 `place.auto`「自动」、`place.view.auto.short`「自动为你选择」），这里却残留英文 Auto。

## 要改的（只改中文文案）
`src/locales/zh.json` 里指工作位置「自动」模式的 Auto 全部改成中文，与 `place.auto` 口径一致，读起来通顺：
- `botAccess.cloud.autoTitle`：「Auto 云端偏好。」→ 例如「自动模式的云端偏好。」
- `botAccess.cloud.autoDescription`、`botAccess.cloud.startVpsDescription`、`botAccess.cloud.vpsAutoDescription`、`botOverview.preference.auto` 里的 Auto 同理改成「自动模式」/「自动」。
- 顺带检查 `botAccess.cloud.*` 与 `botOverview.preference.*` 这两组 zh 文案里有没有别的未翻译英文普通词，一并改。产品名和专有名词保持原样：Cry Bot、Cloud（指 Cry Bot Cloud 产品时）、VPS、、Linux、Android、Starter/Team 方案名。
- 不改 en.json，不改键名，不改代码逻辑。若仓库有中文文案相关的测试或哈希文件（如 `src/locales/source-hashes.json`、`src/locales/*.test.ts`）要求同步，按现有规矩同步。iOS 端若有同一键的中文文案，按仓库已有做法同步。

## 测试（沉淀进仓库）
- 在 `src/locales/` 现有的文案测试里（参照 `everyday-words.test.ts` 一类的写法）补一条：zh.json 中 `botAccess.cloud.*`、`botOverview.preference.*` 的值不含独立单词 `Auto`。
- 跑改动相关的测试文件和 `pnpm exec tsc`，报告写结果摘要。

## 验收
- 中文界面打开智能体设置「访问」区，云端偏好标题和说明不再出现英文 Auto。
- 英文界面不变。
