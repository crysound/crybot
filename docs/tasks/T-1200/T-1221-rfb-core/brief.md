## 运行环境（本机 Linux 沙箱，必读）
- 禁网、只能写工作区、没有 Xcode/macOS、不能用 systemd-run。PATH 上已有 Swift 6.3.3 Linux 工具链（先 `swift --version` 自查），按规格第 8.5 节把所有缓存指到工作区里跑 `swift test`，输出原样贴进报告。
- 规格以 main 上的 `docs/specs/2026-11-14-ios-native.md` 为准（2026-11-14 已缩小范围，本任务内容和依赖没有变）。
- 分支名用 `T-1221-rfb-core`（下文「建议分支名」作废）；报告路径用 `task-paths report T-1221-rfb-core` 计算。
- 并行：任务 43（T-1221-linux-selftest，改 Package.swift、scripts、ios-linux.yml）同时在做，不改它「可以改」里的文件。
- 43 还没合并，本任务不依赖它的脚本：直接用第 8.5 节的参数跑 `swift test --package-path mobile/ios/Packages/CryKit --filter CryRFBTests`（CryNet 已用 canImport 守卫，Linux 上整包能编）。

# T-1221-34 RFB 协议核心

## 依赖
- after：01
- 估计：2 天（一轮 Astra）
- 规格：`docs/specs/2026-11-14-ios-native.md`。先读第 1、2、8、11 节和第 1.4 节入口表，以及第 7.2 节。
- 建议分支名：`t1221-34-rfb-core`

## 目标
CryRFB 能完整说 VNC（RFB）协议：握手、认证、收帧缓冲更新、发鼠标键盘和剪贴板，全部有字节级单元测试。

## 背景
远程桌面现在由网页的 noVNC 实现（`src/lib/desktop-connection.ts`），走 WebSocket `/api/desktop-viewer/<target>/websockify`。原生版本按规格第 7.2 节自己写。协议参考 RFC 6143。CryRFB 只依赖 Foundation；DES 加密和 zlib 解压通过协议注入（App 侧由任务 35 用 CommonCrypto 和 Compression 实现），这样本包在 Linux 上也能测。

## 要做的事
1. `RFBClient` 状态机：吃进字节、吐出要发送的字节和事件，不直接碰网络（传输由调用方负责）。
2. 握手：协议版本 3.3、3.7、3.8；安全类型 None 和 VNC 认证（挑战用注入的 `DESEncryptor`，按 VNC 规则把密码每个字节的位反转作为密钥）；ClientInit 和 ServerInit。
3. SetPixelFormat（32 位真彩 BGRA）、SetEncodings（Raw、CopyRect、ZRLE、DesktopSize 伪编码、Cursor 伪编码）、增量 FramebufferUpdateRequest。
4. 解码到 `Framebuffer`（BGRA 字节数组加脏矩形）：Raw、CopyRect、ZRLE（64×64 瓦片；raw、solid、packed palette、plain RLE、palette RLE 五种子编码；CPIXEL 规则；整条连接共用一个注入的 `Inflater` 流）。
5. 客户端消息：KeyEvent、PointerEvent（按钮掩码）、ClientCutText；服务器消息：ServerCutText、Bell、SetColourMapEntries（忽略）。
6. CryRFBTests：每种消息的字节编码；握手各分支（含认证失败的原因字符串）；Raw 和 CopyRect 解码；ZRLE 五种子编码各一个手造样本（测试里的 `Inflater` 只处理 deflate 存储块，样本用存储块构造）；分包输入（一个字节一个字节喂）结果相同。

## 范围
- 可以改：`mobile/ios/Packages/CryKit/Sources/CryRFB/**`、`mobile/ios/Packages/CryKit/Tests/CryRFBTests/**`
- 不要改：`Package.swift`、CryCore、CryNet、App 目录。确实需要改时，在汇报里说明原因，不要自己改。

## 验收标准
- [ ] Actions 上 CryRFBTests 全部通过；43 合并后 `iOS Linux` job 里也通过。
- [ ] CryRFB 源码里没有 import Foundation 以外的模块（grep 检查）。
- [ ] 单元测试覆盖「要做的事」里列出的逻辑，并在 Actions 上通过。
- [ ] 协调者推分支、开草稿 PR 后，`Mobile builds`、`iOS Linux`（43 合并后才有）和 `Public scan`（45 合并后才有）都是绿的；日志里本任务选中的测试数大于 0。运行链接由协调者补进报告。

## 约束
- 不要 git 提交。沙箱禁网，没有 Xcode：不要声称「编译通过」或「测试通过」。如果 PATH 上有 `swift`，按规格第 8.5 节的参数跑 `swift test`（`--scratch-path`、`--cache-path`、`--config-path`、`--security-path` 和 `XDG_CACHE_HOME`、`CLANG_MODULE_CACHE_PATH`、`HOME` 都指到 `mobile/ios/.linux-cache/` 或 `.linux-build/` 下），把输出原样贴进汇报；没有就写明只能等 Actions。
- 需要新的依赖时，在汇报里列出包名和版本，不要自己安装。只能用规格第 10 节列出的第三方依赖，其余一律用系统框架。
- 公开仓库：代码、测试、夹具、注释里只用 `example.com` 和虚构名字，不写内部域名、IP、邮箱、人名、密钥或真实实例 ID。
- 并行开发：只改「可以改」里的路径；不改入口签名（规格第 1.4 节）；不改 `project.yml`，要加的行写进汇报（规格第 1.3 节的变更通道）。
- 类型命名遵守规格第 1.5 节：不和 SwiftUI、Foundation、`Shared/` 里的类型重名（例如不能叫 `TimelineView`、`ServerAddress`、`SendResult`）。
- SwiftUI 代码拆成小视图，少用复杂的泛型和长链式表达式，降低在没有编译器的情况下出错的概率。纯逻辑放 `Features/<名字>/Logic/`，只 import Foundation 和 CryCore，这样能在 Linux 上先做类型检查。
- 只写必要的注释，只解释代码看不出来的原因。
- 测试要测行为：像调用方那样调用，断言具体的期望值。

## 汇报格式
报告写到 `docs/tasks/T-<桶>/<分支名>/report.md`（用 `task-paths report <分支名>` 计算）；各轮追加到同一文件，保留前轮内容。
用中文汇报：
1. 改了哪些文件，每个文件一句话。
2. 怎么验证的，命令和结果；哪些只能等 Actions 验证。
3. 本任务完成了覆盖表（`server/testing/ios-contract/coverage.ts`）里的哪些项（只列出，不改那个文件）。
4. 需要协调者处理的事：依赖、`project.yml` 要加的行、超出范围的改动、入口签名修改、没解决的问题。
