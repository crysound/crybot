# T-1221-45 公开仓库扫描

## 依赖
- after：无
- 估计：1 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读合同、第 12、13 节，以及第 13 节。
- 建议分支名：`t1221-45-public-scan`

## 目标
每个 PR 自动扫描新增的行，发现内部域名、IP、邮箱、令牌、真实 ID 或内部名单里的词就变红，并且不在日志里泄露命中的原文。

## 背景
仓库是公开的。iOS 原生开发会新增大量夹具、截图测试和文档，最容易把内部信息带进来（规格第 13 节）。现有的 `check:brand` 只管品牌词。规则：只扫 PR 新增的行（`git diff --unified=0 <base>...HEAD` 里以 `+` 开头的行）；内部名单只以 SHA-256 哈希形式进仓库，名单原文由协调者在本机维护，不进仓库、不进任务说明。

## 要做的事
1. `scripts/public-scan/scan.mjs`（Node，无第三方依赖）：参数 `--base <提交>`；读新增行；按规格第 13 节的规则检查域名（放行 `example.com`、`*.example.com`、`*.invalid` 和 `allow-domains.txt`）、IP（放行 `127.0.0.1`、`::1` 和 192.0.2.0/24、198.51.100.0/24、203.0.113.0/24；内网网段也拦）、邮箱（只放行 `@example.com`）、JWT（`eyJ` 开头的三段式）、`cry_sess_` 和 `cry_session_` 后跟真实值的令牌、非占位 UUID（占位：全零或 `00000000-0000-4000-8000-` 开头）。
2. 哈希名单：把新增行切成词（域名、`[A-Za-z0-9_.-]+` 标识符、连续汉字按 2 到 4 字滑窗），小写后算 SHA-256，和 `scripts/public-scan/denylist.sha256`（每行一个十六进制哈希，`#` 开头是注释）比对。命中时只报文件、行号和规则名，不打印原文。
3. `scripts/public-scan/allow-domains.txt`：初始只放开源许可和官方文档要用的公共域名（例如 apple.com、developer.apple.com、swift.org、github.com、opensource.org、apache.org、livekit.io），每行一个；`denylist.sha256` 先放一个说明注释和一个测试用哈希。
4. 二进制文件、`*.png`、`*.jpg`、`pnpm-lock.yaml`、`Package.resolved` 跳过；单行加 `public-scan: allow <规则名>` 注释可以豁免该行的某条规则（豁免要过审核）。
5. `.github/workflows/public-scan.yml`（新建，ubuntu，每个 PR）：`fetch-depth: 0`，以 PR 的 base 为 `--base` 运行脚本。
6. 测试 `scripts/public-scan/scan.test.mjs`（`node --test`，用临时 git 仓库）：每条规则一个命中用例和一个放行用例；哈希名单命中时输出不含原文；只扫新增行（删除行和未改动行里的内部词不报）。
7. `scripts/public-scan/README.md`：规则、怎么豁免、名单怎么由协调者更新（只提交哈希）。另在汇报里提醒协调者：请管理员在仓库设置里打开 secret scanning 和推送拦截。

## 范围
- 可以改：`scripts/public-scan/**`（新建）、`.github/workflows/public-scan.yml`（新建）
- 不要改：其他所有文件，特别是 `ci.yml`、`mobile.yml`、`package.json`。确实需要改时，在汇报里说明原因，不要自己改。

## 验收标准
- [ ] `node --test scripts/public-scan/scan.test.mjs` 通过。
- [ ] 协调者推分支、开草稿 PR 后，`Public scan` 是绿的；再在 PR 里临时加一行非 example.com 域名，变红且日志里能看到规则名和行号；临时加一个名单词，变红且日志里没有原文。运行链接写进 PR 描述。

## 约束
- 不要 git 提交。本机默认 workspace-write 禁网。需要新的依赖时，在汇报里列出包名和版本，不要自己安装。
- Vitest 用 `--maxWorkers=2`，只跑本任务相关的测试文件。沙箱里 socket 测试可能失败：写出具体命令和失败原因，由协调者在沙箱外补跑。
- 公开仓库：样本和夹具里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-<桶>/<分支名>/report.md`（用 `task-paths report <分支名>` 计算）；各轮追加到同一文件，保留前轮内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 Actions 验证。
3. 本任务完成了覆盖表（`server/testing/ios-contract/coverage.ts`）里的哪些项（只列出，不改那个文件）。
4. 需要协调者处理的事：依赖、`project.yml` 要加的行、超出范围的改动、入口签名修改、没解决的问题。
