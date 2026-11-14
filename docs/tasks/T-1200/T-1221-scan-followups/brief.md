# T-1221 公开扫描收尾（三个遗留小修）

## 依赖
- after：无（T-1221 public-scan 已随 PR #27 合入 main）
- 估计：半天（一轮 Astra）
- 相关：`scripts/public-scan/README.md`、规格 `docs/specs/2026-11-14-ios-native.md` 第 13 节

## 目标
修掉公开扫描在第 6 轮复审后留下的三处误拦/报错，让正常的 iOS 资源、子模块变更和含 NUL 的测试文件不再把 `Public scan` 弄红。

## 要做的事
1. **常见媒体扩展名静默跳过内容**：`scripts/public-scan/scan.mjs` 的 `skippedExtensions` 补上 `.icns`、`.mp3`、`.m4a`、`.caf`、`.mov`、`.mp4`、`.heic`（大小写不敏感，沿用现有 `shouldSkipFile`）。路径检查照旧执行。
2. **子模块不报错**：PR 新增或更新子模块（git 树里 mode 160000 的 gitlink，diff 里是 `Subproject commit <sha>` 行、`new file mode 160000` / `index ... 160000`）时，现在 `readHead` 对该路径执行 `git show HEAD:<path>` 会失败，整个扫描以退出码 2 结束。改为：识别出子模块条目后跳过内容检查（不调用 readHead，也不报 binary-skip），路径检查照旧执行。识别方式优先用 diff 头里的 mode 160000；不要为此吞掉其他 git 错误（其他读取失败仍按配置/仓库错误退出码 2）。
3. **`server/memory-store.test.ts` 含 NUL 字节**：任何改动这个文件的 PR 都会被 `binary-skip` 拦下。把文件里的原始 NUL 字节改成等价的转义写法（例如字符串里的 `\0` / `\u0000`），保证测试语义完全不变；不要用 `public-scan: allow binary-skip` 豁免。改完确认该文件 HEAD 内容不再含 NUL。
4. **测试**：在 `scripts/public-scan/scan.test.mjs`（`node --test`，临时 git 仓库）补用例：
   - 新增 `.icns`、`.heic`、`.mp4` 等含 NUL 的文件：不报 binary-skip；但路径里含非 example 域名时仍报 domain。
   - 新增一个子模块（临时仓库里 `git -c protocol.file.allow=always submodule add` 一个本地仓库，或直接 `git update-index --add --cacheinfo 160000,<sha>,<path>` 造 gitlink）：扫描退出码 0、无 findings；更新子模块指针同样不报错。
   - 原有用例全部保持通过。
5. `scripts/public-scan/README.md` 同步：跳过扩展名列表、子模块行为各补一句。

## 范围
- 可以改：`scripts/public-scan/**`、`server/memory-store.test.ts`
- 不要改：其他所有文件，特别是 `.github/workflows/**`、`package.json`、`denylist.hmac`。不要生成或写入任何真实名单/密钥。

## 测试命令
- `node --test scripts/public-scan/scan.test.mjs`
- `server/memory-store.test.ts` 若本机沙箱跑不起来（依赖为链接、盒内不可见），在汇报里写明，以 Actions 为准；不要自己装依赖。
- 自检：`node scripts/public-scan/scan.mjs --base origin/main` 在你的分支上应输出 `Public scan passed`（若因沙箱拿不到 origin/main，改用 `git merge-base HEAD main`）。

## 验收标准
- [ ] `node --test scripts/public-scan/scan.test.mjs` 全部通过，含上面新增用例。
- [ ] `server/memory-store.test.ts` 不含 NUL 字节（`grep -cP '\x00'` 为 0），测试断言与原来等价。
- [ ] 协调者推分支开草稿 PR 后，`Public scan`、`check`、相关 vitest 分片与 main 一致或更好。
- [ ] 汇报里列出改动摘要和每条验收的实际结果。
