# T-1207 收尾修复：显示名残留、e2e 向量、手机密钥向量

仓库 crybot,基于分支 T-1207-rebrand(OpenMausBot 整体改名为 Cry Bot,已合并 ui/server/lib 三路测试修复)。三路报告在 `docs/tasks/T-1200/T-1207-fix-{ui,server,lib}/report.md`,先读 lib 路报告「仍失败的文件」一节。

## 运行环境(必须遵守)
- 沙箱里没有 systemd-run。直接用 `/opt/node24/bin/node`,vitest 带 `--maxWorkers=1`,每次只跑 1~3 个文件。
- 输出写 `/tmp/t1207-rest/*.log`,只看 tail/grep 结果。
- 沙箱禁止监听端口，需要 loopback 的测试跑不了，写进报告即可，不要为此改测试。

## 要做的事

### 1. 服务端显示文本里的 `CryBot` 改成 `Cry Bot`
- 产品显示名是 `Cry Bot`(带空格)。只改给用户看的文字(报错、提示、通知、提示词里称呼产品的地方)。代码标识符、环境变量、文件名、包名、URL、`crybot` 小写机器名不动。
- 已知失败点：`server/user-errors.ts`、`server/drivers/driver-notices.ts`、`server/chat-notices.ts`、`server/routine-lines.ts:12`、`server/routine-requests.ts:705` 和 `:863`。另外 `grep -rn "CryBot" server --include=*.ts` 逐条看，凡是显示文本一并改。
- 改完要通过：`src/lib/server-word-contracts.test.ts`、`src/locales/server-lines.test.ts`,以及被改文件对应的 server 测试。若 locale 有登记(`scripts/generate-locale.mjs --check`),按仓库现有做法同步登记，不要改扫描器或放宽断言。

### 2. companion e2e 向量重新生成
- 中继主机契约已定：`companion/src/e2e/descriptor.ts` 的 `isRelayHost` 接受任意合法 DNS 名(大小写不敏感),拒绝 `localhost`、`*.localhost`、末段为纯数字或 `0x` 的主机、单段主机名、尾点、超长名。这是已过安全审查的结论，**不要改 isRelayHost**。
- 改 `companion/src/e2e/gen-vectors.ts` 的 V7:
  - 删掉旧的固定域名拒绝样本 `relay_host_suffix`、`relay_host_zero`、`relay_host_upper`、`relay_host_other_domain`。
  - 换成新契约下应拒绝的样本，至少：`relay_host_localhost`(localhost)、`relay_host_dot_localhost`(relay1.localhost)、`relay_host_ipv4`(127.0.0.1)、`relay_host_hex`(0x7f000001)、`relay_host_single_label`(relay1)、`relay_host_trailing_dot`(relay1.example.com.)。
  - 样本里的示例中继域名用中性的 `relay1.example.com` 这类写法，不要写公司真实域名。
- 运行生成器重新生成全部向量(V1~最后一组),让 `companion/test/e2e/vectors.test.ts` 全部通过。向量文件里不能出现 openmausbot。
- **iOS/Android 是否也读这些向量**:搜 `ios/`、`android/`、`watch` 相关目录有没有引用向量文件或写死同样的 prologue/info 标签。若有，确认它们用的协议标签和 companion 一致(都已改名);不一致就列在报告里，说明哪些文件、哪些标签，不要改 Swift/Kotlin 代码。

### 3. 手机密钥固定向量 `server/phone-secret.test.ts`
- 里面有一个原先用 Apple CryptoKit 生成的固定向量，info/AAD 还是改名前的标签，现在失败。
- 用 Node 按同一构造(HPKE 的 KEM/KDF/AEAD 套件与源码一致，info 用 `PHONE_SECRET_INFO`,AAD 用 `phoneSecretAAD(...)`)重新生成这个固定向量，写一个可重复运行的生成脚本放在测试旁边或 `scripts/` 下，测试注释里说明向量来源改为该脚本、原 CryptoKit 来源因标签改名作废。
- 只能改向量数据和注释，不能改加解密源码，不能删断言。

## 规矩
- 不改 `.github/`、`docs/specs/`、NOTICE、LICENSE。
- 不放宽任何安全断言。
- 公开仓库：不写公司内部域名、IP、邮箱、人名。
- 结束前跑：上面提到的测试文件、`scripts/check-brand-residue.mjs`、`scripts/generate-locale.mjs --check`、对改动文件跑 oxlint `--deny-warnings`、`git diff --check`。
- 报告写到 `docs/tasks/T-1200/T-1207-fix-rest/report.md`:改了什么、每个测试的结果(命令+关键输出)、跑不了的和原因。不要 git 提交。
