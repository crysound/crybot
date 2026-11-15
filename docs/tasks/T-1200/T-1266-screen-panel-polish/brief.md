## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec tsc` 才可用。
- 这里没有 systemd、Docker，`systemd-run --scope ... --` 前缀一律去掉直接运行；一次只跑一个测试文件。
- 报告只写三样：改了什么（文件列表与 git status 一致）、为什么、测试命令与结果摘要。
- 不提交 git。
- 本仓库是公开仓库：代码、注释、报告里不得出现内部域名、IP、邮箱、人名、真实钥匙、沙箱主目录绝对路径。

# T-1266：Cry Bot 屏幕面板三处小问题（T-1253 上线截图发现）

## 现象（共用电脑模式：`config.localVm.mode === "shared"` 且屏数 > 1；智能体工作位置选「vm」但还没分到屏）
1. 「这个智能体目前没有分配屏幕。」出现两次：`src/components/AssignLocalVmScreen.tsx` 在按钮上方有一行 `role="status"` 提示，同时下面的预览框（`src/components/ComputerPanel.tsx` 约 1300 行一带，`vm-waiting` 阶段的空态）里又显示同一句。
2. 「现在分配屏幕」按钮底边紧贴下面的预览框，没有间距，手机 390 宽度更明显。
3. 下方「工作位置」卡里，选中的「vm」选项仍叫「私有桌面」，卡片底部说明仍是 `place.view.vm.line`「本设备上的私有 Linux 桌面，与你自己的屏幕分开。」。共用模式下智能体用的是共用电脑里的一块屏，这个叫法和说明都不对。T-1248 只把网格里的小字描述换成了 `computer.dest.vmScreenDesc`（见 `src/lib/place.ts` 的 `vmDescriptionKey`），标题和底部说明漏了。

## 要改的
1. 去重：未分配屏幕时这句话只出现一次。保留预览框里的空态提示或按钮上方那行二选一（建议保留按钮上方那行，因为排队位置、出错提示也在那里；预览框在这种状态下不要再重复这句话，可以只留图标或换成不重复的简短说明）。排队中（有 queue_position）的提示照常。
2. 间距：「现在分配屏幕」按钮（含出错提示）与下面预览框之间留出和面板其他块一致的间距（例如 mb-3 / gap-3 一类），桌面和 390/360 手机都不能贴边。
3. 共用模式叫法：与 `vmDescriptionKey` 同一判定口径（抽成一个共用的判定函数，不要再写一份字符串比较），共用模式下：
   - 工作位置网格里 vm 选项的标题改用新文案键（中文「共用电脑」，英文「Shared computer」）；
   - 卡片底部说明（place view 的 vm 那行，`shared/place-view.ts` / `src/lib/place-view.ts`）改用新说明（中文「共用电脑里分给它的一块屏幕，与你自己的屏幕分开。」，英文对应）；短说明同理如有显示。
   - 面板里其他在共用模式下仍会显示「私有桌面」的地方（例如 `remote-desktop-panel.tsx` 266 行、`ComputerPanel.tsx` 1297 行在未分到屏号时的回退文字），一并按同一判定改成共用叫法。
   - 非共用模式（按智能体私有桌面、单屏共享）保持现状不变。
   - 新文案键按仓库现有规矩补齐 zh/en、`src/locales/source-hashes.json` 及相关文案测试；iOS 端若用到同一键，按仓库已有做法同步。
4. 不改服务端逻辑，不改分配/排队流程。

## 测试（沉淀进仓库）
- `AssignLocalVmScreen` / `ComputerPanel` 现有测试（如 `src/components/ComputerPanel.takeover.test.ts`、`src/components/remote-desktop-panel.screen.test.ts`）里补用例：未分配屏幕时那句话在渲染结果里只出现一次；排队提示不受影响。
- `WorksOnGrid` / place view 相关单测补用例：共用多屏模式 vm 选项标题与底部说明为共用叫法；按智能体模式仍为「私有桌面」。
- 跑改动相关的测试文件和 `pnpm exec tsc`，报告里写结果摘要。

## 验收
- 共用多屏模式、智能体未分屏：提示只出现一次；按钮与预览框之间有明显间距（1440 桌面、390、360 手机）。
- 共用多屏模式：工作位置卡选中项显示「共用电脑」，底部说明不再出现「私有 Linux 桌面」。
- 按智能体模式下文案与之前一致。
