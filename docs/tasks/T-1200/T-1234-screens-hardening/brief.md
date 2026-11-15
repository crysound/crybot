## 运行环境（云沙箱，必读）
- 开工先在 worktree 根目录运行 依赖准备脚本（镜像自带，把预装依赖链进 node_modules），之后 `pnpm exec vitest` / `pnpm exec tsc` 才可用。
- 这里**没有** systemd，说明里出现的 `systemd-run --scope ... --` 前缀一律去掉直接运行；本机 8G/4 核，一次只跑一个测试文件。
- 沙箱禁止监听端口的 e2e 跑不了，就在报告里写明，以 Actions 为准。

# T-1234 Cry Bot 多屏容器后续补强

- 沙箱里没有 Docker，真实容器冒烟 `scripts/smoke-screens-container.mjs` 跑不了，写明后以 Actions「Real VM screens」为准。

## 目标
多屏容器（一个容器多块虚拟屏，T-1228 已合入 main）补上复审时留下的几处加固和冒烟补测，行为对用户不变，只是更稳、更难被屏幕用户越权。

## 背景
- 多屏容器相关代码：`server/container-screens.ts`（容器初始化脚本 `multiScreenInitScript`、包安装脚本 `crybotPkgScript`、supervisor 配置、root 监护程序 `screenProcessScript`）、`server/container-computer-screens.ts`（屏内 exec 参数 `screenIdentityArgs`、`startScreen`/`stopScreen`/`installScreenPackages`）、`server/container-computer.ts`、真实镜像冒烟 `scripts/smoke-screens-container.mjs`（Actions 工作流 `.github/workflows/real-vm.yml` 里跑）。
- 原任务说明及各轮返工在 `docs/tasks/T-1200/T-1228-container-layout/`（brief.md、r2–r6.md），先读，了解屏幕用户 `crybot-sN`（uid 61000+N）、root 进程不得加载屏用户 user site、符号链接防护等既定规则。
- 下列各项是 T-1228 复审时的建议项，当时约定另建任务。开工先逐条核对 main 上是否已经做了，已做的不重复改，在报告里写「已在 main，见 文件:行」。

## 要做的事
1. **crybot-pkg 安装前先 `apt-get update`**（`crybotPkgScript`）：镜像里 apt 列表可能为空或过期，直接 `apt-get install` 会找不到包。改为先 update（同样 `env -u VNC_PW` + root python 环境变量），update 失败时记录日志并以非零退出，不继续 install；日志行里区分 update/install 的结果。补单测断言脚本内容顺序。
2. **屏内 exec 也降 OOM 优先级**（`screenIdentityArgs` 多屏分支）：supervisor 起的屏幕程序已经经 `screen-program` 设了 oom_score_adj=500，但服务端 `docker exec` 进屏内执行的命令（cua-driver 调用等）没有，内存紧张时可能先杀 supervisord。让屏内 exec 也以 oom_score_adj=500 运行（可复用 `/usr/local/libexec/crybot/screen-program` 的做法：有 `choom` 用 `choom -n 500`，否则写 `/proc/self/oom_score_adj`），注意不能破坏现有 `prlimit --nproc=1500`、`umask 007`、`env -u VNC_PW` 和 `-u` 身份；单屏（非 screen target）路径保持不变。补单测。
3. **stopScreen 不丢原始错误**（`container-computer-screens.ts` `stopScreen`）：现在 `supervisorctl stop` 失败后，finally 里的 pkill 如果也失败，会把第一个错误覆盖掉。改为两步都尝试；只有一步失败就抛那一步的错误；两步都失败时抛出的错误要保留 stop 的原始错误（例如 AggregateError 或 `cause`），消息里能看出两步各自失败。补单测覆盖三种情况。
4. **初始化脚本补符号链接判定**（`multiScreenInitScript`）：以 root 执行的 `mkdir -p /home/cua/workspace/screens`、`chmod 0711 /home/cua /home/cua/workspace /home/cua/workspace/screens`、`chmod 0700 /home/cua/.vnc` 这几处，路径由 cua 用户可控，可能被换成符号链接。对这些路径先做 `[ -L ]` 判定（是链接就删掉/重建或拒绝并退出，选最小改动且不影响正常启动的做法，在报告说明理由），chmod 不跟随链接。补单测断言脚本里的判定。
5. **单测补强**（`server/container-screens.test.ts`）：断言每个屏幕程序段（`[program:screen-sN-*]`）完全没有 `environment=` 行；断言 `screenProcessScript` 里设置屏用户环境（HOME/USER/XDG_RUNTIME_DIR 等，看实际代码）发生在 setuid/setgid 之后。
6. **冒烟补测**（`scripts/smoke-screens-container.mjs`，在现有流程里加检查，不改 `.github/workflows/real-vm.yml`）：
   - 令牌路由带认证：经 `/websockify?token=sN` 完成 RFB 握手后用正确 VNC 密码认证成功、用错误密码认证失败（现在只做到握手）。
   - 跨屏实连：用 s1 的密码经 token=s2 认证必须失败；以 crybot-s1 身份在容器里尝试连 s2 的 X 显示（`DISPLAY=:2 xset q`）和 s2 的 cua-driver socket（`/run/user/61002/crybot-cua.sock`）都必须失败。
   - sudo：以 crybot-s1、crybot-s2、cua 身份执行 `sudo -n true` 都必须失败（`/etc/sudoers.d/cua` 已被删）。
   - 现有 `/run/user/<uid>/tmp` 符号链接检查：除了比对目标目录属主，再比对目标目录的权限位（mode）不变。
   每项失败要有清楚的报错信息。冒烟脚本里的检查若需要辅助函数，放在脚本内，不新建依赖。
7. 如果核对后发现 `server/container-computer.ts` 里标记探测仍依赖 `probeDesktop`（复审提到约 704 行，`index.ts` 观看目标状态用 `probeDesktop:false` 时会漏掉标记），改为标记探测不依赖 `probeDesktop`，补单测；main 已不存在这个问题就跳过并说明。

## 范围
- 可以改：`server/container-screens.ts`、`server/container-computer-screens.ts`、`server/container-computer.ts`（仅第 7 条需要时）、对应的 `*.test.ts`、`scripts/smoke-screens-container.mjs`、本任务 report。
- 不要改：`.github/workflows/`、`scripts/testing/file-size-ratchet.test.ts` 里的上限数字、其他文件。确需改动在报告里说明，不要自己改。
- `server/container-computer.ts` 不得超过 ratchet 上限；新文件不超过 1000 行。

## 验收标准
- [ ] 逐条跑并贴输出（一次一个文件）：`pnpm exec vitest run server/container-screens.test.ts`、`server/container-computer.test.ts`、`server/container-mcp.test.ts`（沙箱里已知 4 个子进程桥接用例因 EPERM 失败，如仍是这 4 个照实写明，不改不跳过）、`server/bot-box/env.test.ts`、`scripts/testing/file-size-ratchet.test.ts`。
- [ ] `pnpm exec tsc -p tsconfig.server.json` 通过；`node --check scripts/smoke-screens-container.mjs` 通过；改动文件 `pnpm exec oxlint --deny-warnings <文件>` 通过；`git diff --check` 无输出。
- [ ] 新增单测覆盖第 1–5 条（第 7 条需要改时也要有）。
- [ ] 冒烟新增检查在报告里列出每项的预期结果；真实运行以 Actions「Real VM screens」为准。

## 约束
- 不要 git 提交。不联网、不装依赖；需要新依赖就在报告里列出。
- 只写必要的注释，解释代码看不出来的原因。
- 测试测行为：像调用方那样调用，断言具体期望值。
- 单屏模式（screens=1）行为、生成的 docker 参数与改动前完全一致。

## 汇报格式
报告写到 `docs/tasks/T-1200/T-1234-screens-hardening/report.md`。用中文：
1. 改了哪些文件，每个一句话；每条「要做的事」的处理结果（已做/已在 main/跳过及原因）。
2. 怎么验证的，命令和结果。
3. 需要协调者处理的事。
