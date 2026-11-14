# Public scan

`scan.mjs` 检查 `git diff --unified=0 <base>...HEAD` 中的新增行。告警统一以 `public-scan: ` 开头，后接文件、行号和规则名，保证路径不能成为行首的工作流命令；日志不会输出命中的内容。文件路径命中名单时，路径告警输出 `public-scan: <redacted-path #N>: denylist`；该文件的所有内容告警都改用同一占位路径（保留内容行号），N 是本次 diff 内从 1 开始的文件序号。路径和内容使用同一个名单分词函数，文件扩展名不会遮住前面的连续片段。Git 和配置错误只输出固定错误消息，不回显输入或 Git stderr。

规则如下：

- `domain`：按 `iana-tlds.txt` 中的 IANA Root Zone Database 快照识别域名。拦截非 `example.com`、`example.net`、`example.org`（含子域）、`.example`、`.test`、`.invalid`、`.localhost`、或 `allow-domains.txt` 中域名的域名；`localhost` 也放行。另识别 `internal`、`corp`、`lan`、`local`、`home`、`private`、`intranet`、`localdomain` 私有后缀；`home.arpa` 也会检查。代码文件只接受紧邻 `://` 或 `@` 的主机，以及一对匹配引号内的全部内容恰好是主机名的字面量。后者的末段不能是下面列出的常见文件扩展名，也不能是 `t(` 或成员方法 `i18n.t(` 这类翻译调用的第一个参数（同一行内跟踪括号和参数分隔，包含条件表达式及嵌套表达式里的字面量）；引号中的私有后缀（含上述特殊用途后缀）优先报告，不受这两个排除条件影响。代码中任何未加引号的赋值或成员表达式都不能单凭 `host`、`hostname`、`baseURL` 等字段名成为主机。正文和 shell 保留原判定：易混 TLD 要求紧邻 `://`、`@`、完整引号主机名或主机字段赋值上下文；字段支持 hostname、baseURL、apiUrl、endpoint、server、domain、host、url、href 及变量名中的这些后缀，大小写不敏感。所有 TLD 后接可选空白和 `(` 都不报域名。`net` 不属于易混 TLD。 <!-- public-scan: allow domain -->
- `ip`：拦截公网及内网 IP；放行 `127.0.0.1`、`::1`、`::`、`0.0.0.0`、`::ffff:127.0.0.1` 和文档专用 IPv4 网段。四段版本号、Python 切片和双冒号类型标注不当作 IP。
- `email`：域名部分按上面的保留域名规则放行（含子域和保留 TLD）；公共第三方域名允许列表不豁免邮箱规则。
- `jwt`：拦截以 `eyJ` 开头的三段式 JWT。
- `session-token`：拦截带真实值的 `cry_sess_` 或 `cry_session_` 令牌。
- `uuid`：拦截非全零、非约定占位前缀的 UUID。
- `denylist`：对域名正则的所有原始匹配计算每一级后缀 HMAC，不受 TLD 或主机上下文过滤影响；ASCII 标识符 `[A-Za-z0-9_.-]+` 保留整词，按点、下划线、连字符切成非空片段，把所有连续片段区间对应的原串子串（保留原分隔符）加入 HMAC 计算，再加入驼峰子词。区间逐个生成并计算 HMAC，不展开成函数实参数组；每个区间最多 32 段；超长词仍从每个片段起点枚举最多 32 段，避免二次方区间爆炸，整词、单段、驼峰子词及原始域名后缀仍检查；连续汉字取 2–4 字滑窗。有 `PUBLIC_SCAN_DENYLIST_KEY` 时，所有词小写后计算 `HMAC-SHA256(key, 小写词)`，与 `denylist.hmac` 比较。没有 key（包括空值）时跳过本规则，输出一行固定提示 `denylist: skipped (no key)`；其他规则照常运行，跳过本身不会使退出码变红。
- `binary-skip`：HEAD 完整文件任意位置含 NUL（包括未改动行）时停止检查该文件内容，并报 `public-scan: <路径>: binary-skip`（不带行号或内容），退出码为 1；路径命中名单时仍使用脱敏占位路径。下列二进制扩展名的文件静默跳过内容。确需豁免时，在 HEAD 文件里写 `public-scan: allow binary-skip`，标记所在行未改动也有效；该文件的路径检查仍然执行。
- `gitattributes`：PR 新增 `.gitattributes` 中的 `binary` 或 `-diff` 属性时失败；二进制判断由扫描器按扩展名和 NUL 字节完成。

内容跳过扩展名（大小写不敏感）为 `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.ico`、`.icns`、`.mp3`、`.m4a`、`.caf`、`.mov`、`.mp4`、`.heic`、`.pdf`、`.zip`、`.gz`、`.jar`、`.jks`、`.keystore`、`.p12`、`.woff`、`.woff2`、`.ttf`、`.otf` 的文件；其他含 NUL 的文件按 `binary-skip` 报告。仍检查这些文件的路径。diff 头中模式为 `160000` 的子模块条目（gitlink）新增或更新时也只检查路径，不读取 HEAD 内容、不报 `binary-skip`；其他 Git 读取失败仍以退出码 2 报错。`pnpm-lock.yaml` 和 `Package.resolved` 在 Git diff 阶段直接排除。纯改名和新增空文件同样检查新路径。确有公开内容需要保留时，可在该行写 `public-scan: allow <规则名>`，例如 `public-scan: allow domain`；豁免必须经过审核。每条规则各写一个注释；规则名是 `domain`、`ip`、`email`、`jwt`、`session-token`、`uuid`、`denylist`、`gitattributes` 或 `binary-skip`。

`iana-tlds.txt` 是离线内置的 IANA Root Zone Database 快照，文件头注明来源和日期。`allow-domains.txt` 每行列出一个经过审核的公共域名，支持尾随 `#` 来源注释，协调者负责增删；登记域名及其子域放行。协调者在本机维护内部名单原文及高熵随机 key，只把小写词的 HMAC-SHA256 逐行写入 `denylist.hmac`。只提交 HMAC，不提交原文、key 或命中样本。当前名单仅含注释，等待协调者用真实 key 生成；测试名单及测试 key 只用于隔离夹具。名单允许空行和 `#` 开头的注释，任何其他非 64 位十六进制行都会以配置错误退出（退出码 2），没有 key 时也校验格式。

在受信任的本机环境安全注入 `PUBLIC_SCAN_DENYLIST_KEY` 后，运行 `node scripts/public-scan/hmac-word.mjs < /本机私有目录/words.txt > scripts/public-scan/denylist.hmac`。工具从标准输入逐行读词，去除首尾空白、转小写，忽略空行，只输出 HMAC 行；缺 key 或传任何命令行参数都以固定错误退出，不回显参数。不要把 key 写入命令行、日志或仓库。换 key 后需重新生成全部名单行。

仓库 Actions secret 使用同名 `PUBLIC_SCAN_DENYLIST_KEY`，只注入 scan 步骤；工作流保留 `pull_request` 事件和只读权限。fork PR 拿不到该 secret，因此不跑名单检查；其他规则与测试照常。协调者本地 pre-push 可配置同一 key，运行 `node scripts/public-scan/scan.mjs --base <SHA或ref>` 检查已提交、待推送的新增内容。

管理员还需要在仓库设置中打开 GitHub secret scanning 和 push protection（推送拦截）。

代码扩展名（大小写不敏感）：`.ts`、`.tsx`、`.js`、`.jsx`、`.mjs`、`.cjs`、`.mts`、`.cts`、`.swift`、`.kt`、`.kts`、`.java`、`.py`、`.pyi`、`.go`、`.rs`、`.c`、`.h`、`.cc`、`.cpp`、`.cxx`、`.hpp`、`.m`、`.mm`、`.cs`、`.fs`、`.fsx`、`.rb`、`.php`、`.pl`、`.pm`、`.lua`、`.r`、`.dart`、`.scala`、`.sc`、`.clj`、`.cljs`、`.ex`、`.exs`、`.erl`、`.hrl`、`.hs`、`.lhs`、`.ps1`、`.psm1`、`.sql`、`.vue`、`.svelte`。shell（`.sh`、`.bash`、`.zsh`、`.fish`）及其余扩展名按正文检查；例如 `.md`、`.txt`、`.yml`、`.yaml`、`.json` 使用完整 IANA 表（易混 TLD 仍要求上下文），其中的成员访问示例可能报告 domain。路径本身也按正文检查。

引号主机名排除的常见文件扩展名（大小写不敏感）：`md`、`sh`、`py`、`rs`、`js`、`ts`、`json`、`yml`、`yaml`、`txt`、`zip`、`mov`、`mp4`、`png`、`jpg`、`gz`、`tar`、`log`、`csv`、`html`、`css`、`swift`、`kt`、`java`、`go`、`rb`、`pl`、`tsx`、`jsx`、`mjs`、`cjs`、`mts`、`cts`、`bash`、`zsh`、`fish`、`kts`、`pyi`、`c`、`h`、`cc`、`cpp`、`cxx`、`hpp`、`m`、`mm`、`cs`、`fs`、`fsx`、`php`、`pm`、`lua`、`r`、`dart`、`scala`、`sc`、`clj`、`cljs`、`ex`、`exs`、`erl`、`hrl`、`hs`、`lhs`、`ps1`、`psm1`、`sql`、`vue`、`svelte`、`markdown`、`mdx`、`htm`、`xml`、`toml`、`ini`、`conf`、`cfg`、`env`、`lock`、`map`、`svg`、`jpeg`、`gif`、`webp`、`ico`、`bmp`、`tiff`、`avif`、`pdf`、`wav`、`mp3`、`ogg`、`flac`、`avi`、`webm`、`m4a`、`m4v`、`tgz`、`bz2`、`xz`、`rar`、`7z`、`jar`、`war`、`wasm`、`exe`、`dll`、`so`、`dylib`、`bin`、`db`、`sqlite`、`woff`、`woff2`、`ttf`、`otf`。显式 URL 和邮箱主机不受此表影响。

运行 `node scripts/public-scan/scan.mjs --base <SHA或ref>`。base 不接受选项或 revision 表达式；先验证合法 ref，再用 `--end-of-options` 解析为 commit SHA。diff 禁用外部 diff 和 textconv。运行 `node --test scripts/public-scan/scan.node-test.mjs` 验证；测试在临时 Git 仓库里调用真实 CLI，spawn 被沙箱拒绝时明确跳过，不模拟 CLI 输出。工作流先测试再扫描。
