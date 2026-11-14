# T-1228-container-layout 实现报告

本任务未提交 git、未推送分支，也没有修改 `server/index.ts`、`server/vps-computer.ts` 或 `IMAGE_LAYER_VERSION`。

## 完成内容

- 在 `server/container-computer.ts` 增加共享屏目标、屏幕身份、运行目录、屏幕执行参数和容器目标归一化；单屏 `cuaExecArgs` 与默认 `containerRunArgs` 保持原输出。
- 多屏容器参数增加布局标签、2G shm、8192 进程上限和初始化脚本命令；实现屏幕启动、停止、supervisor 状态读取、屏幕截图路径和屏幕 MCP 执行身份。
- 新建 `server/container-screens.ts`，生成 POSIX 初始化脚本、supervisor 配置、VNC token 文件和受限 `crybot-pkg` 安装助手。初始化脚本移除 `cua` 的无限 sudo 规则，并通过 `env -u VNC_PW` 启动 supervisor。
- `server/container-mcp.ts` 接受并校验 `/run/user/1000/` 与 `/run/user/61001..61004/` 套接字；屏目标传入对应用户和 DISPLAY。
- 容器状态缓存按共享容器目标归并屏目标缓存。
- 新增 `server/container-screens.test.ts`，覆盖单屏参数、屏 2 身份、多屏资源参数及初始化脚本安全条件。

## 验证

已先运行 `crybot-link-deps`。

- `pnpm exec tsc -b --pretty false`：通过。
- `pnpm exec tsc -p tsconfig.server.json --pretty false`：通过。
- `pnpm exec vitest run server/container-screens.test.ts server/container-computer.test.ts`：122/122 通过。
- 指定的 `server/container-mcp.test.ts` 在当前沙箱中 4 项均因子进程桥接 fixture 没有返回输出而失败；该现象在恢复基线 `container-mcp.ts` 后仍可复现，未能归因于本次套接字校验改动。
- `pnpm lint`：仓库已有 `scripts/public-scan/scan.mjs` 和 `server/lazy-container-mcp.ts` 两条 warning，在 `--deny-warnings` 下退出失败；本次新增文件没有 lint warning。

本机禁止监听端口，未运行真实容器或端口型 E2E；真实镜像隔离和 Actions 工作流需在 GitHub Actions 上验证。

## 第 2 轮返工（2026-11-14）

### 实现

- 多屏改用 `/etc/crybot/supervisord.conf` 独立配置：四个屏组、一个以 `cua` 运行的 token websockify，以及 supervisor 必要的四个管理段。没有 include，也不启动原镜像的 dbus、vncserver、novnc、crybot-cua-driver。所有 supervisorctl 调用显式指定新配置。
- websockify 只使用 TokenFile 目标映射；屏程序使用独立运行目录、固定 uid/gid、1280x900/24 位 Xvnc、`prlimit --nproc=1500`、umask 007、oom_score_adj=500，组启用 stopasgroup/killasgroup。目录按父目录、tmp 子目录分别设置属主和 0700。
- 单屏和多屏共用导出的 `GUEST_IDS_SCRIPT_BODY`，保留 UID/GID 分别迁移、绑定工作区单独处理、最终 id 校验；多屏正确传入两个 ID 参数。108 组单屏完整参数已在修改前保存为 fixture，默认布局及显式 single 都作完整相等断言。
- VNC 口令校验后仅经 stdin 交给 root，由 `vncpasswd -f` 生成 8 字节 rfbauth 文件，0400、屏用户属主，完成后才启动屏组。写入超时 30 秒 kill；失败不回传可能含输入的 stderr。屏起停显式 root exec。
- exec 身份环境和执行程序拆分为 `screenIdentityArgs` / `screenExecArgs`，修正非交互 `-w` 位置、命令被当成 driver 参数的问题。屏命令、MCP、截图及文件读取都清除 VNC_PW，截图直接使用屏运行目录。
- 状态缓存统一用 `containerTargetOf`：多屏只探测容器，不用 s3 的停屏套接字决定 s2 是否可截图；返回时重写 target_key。Docker 初始化回退写 marker，状态探测读 marker 返回 single；Apple 暂时完全沿用 single 参数，不打 multi 标签。独占/池目标拒绝 multi。
- supervisorctl status 的退出码 3 从错误 stdout 继续按屏汇总；支持 running/off/starting/stopping/failed，失败优先，真正的 CLI/超时错误继续抛出。
- driver 复用单屏环境和启动选项，包括 no-sandbox、200ms 窗口超时、reduced-motion、NO_COLOR，先等待对应 DISPLAY 就绪。
- 删除 `/etc/sudoers.d/cua`，不增加屏用户 sudo 规则。导出 `installScreenPackages`：服务端校验后 root exec 调用 crybot-pkg，脚本再次校验，最多 20 个包，安装结果写 root 专属目录中的 0600 日志（时间、屏、包名、结果）。按本轮明确验收项，`g++` 是末尾加号规则的唯一例外；`vim+`、`sudo-`、`-o`、`.`、`+x` 均拒绝。

固定能力列表没有 CAP_KILL，Linux root 不能凭 UID 0 给其他 UID 发信号。因此屏程序增加 root 监护进程：实际 Xvnc/dbus/session/driver 子进程清空附加组并永久降权到屏用户，监护进程仅在转发停止信号时切换有效 UID。停组之后在 root exec 内通过 setpriv 降权运行 pkill，清除该屏 exec 留下的进程；没有增加能力、sudo 或其他用户提权途径。真实 stop 行为纳入下面的镜像冒烟。

### 真实镜像验收入口

新增 `scripts/smoke-screens-container.mjs` 和 `.github/workflows/real-vm.yml`。工作流支持 workflow_dispatch，以及 PR 改动 container-screens/container-computer/container-isolation 或冒烟文件时触发。

脚本在临时数据目录构建独立命名的测试镜像，拉取源码已有锁定摘要的 trycua/xfce-cua，使用 `managedImageDockerfile` 和 `containerRunArgs(... multi)` 起独立容器。校验四屏初始 off，s1/s2 组 RUNNING、各屏 driver status 成功、token websockify 路由、正确/错误口令的真实 RFB 认证、没有旧启动进程、屏 2 UID/env/umask/nproc、supervisor 程序 oom/nproc、口令文件格式/权限、跨屏读取隔离，以及停 s2 后 s1 仍正常且 s2 无残留进程。最后删除容器、临时镜像和目录。

规格中 s1 本身使用 5901，因此脚本断言的是“启屏前没有 5901 listener，启屏后唯一的 :1 Xvnc 属于 crybot-s1”，不是禁止 s1 使用 5901。

本机 `docker info` 明确返回 `/var/run/docker.sock` permission denied，不能执行真实镜像冒烟；沙箱也禁止端口型 E2E。镜像启动、信号转发和 RFB 端到端结果须以协调者推分支后的 Actions 为准，未声称本地真实镜像已通过。

### 验证结果

已先运行 `crybot-link-deps`，测试文件逐个执行，没有使用 systemd。

- `pnpm exec vitest run server/container-screens.test.ts`：22/22 通过，含 108 组完整单屏参数、配置/目录/身份/能力/端口、shell 包名校验和失败安装审计日志。
- `pnpm exec vitest run server/container-computer.test.ts`：146/146 通过，含完整 exec 参数、工作目录、口令 stdin/超时/错误脱敏、停屏、包安装、状态汇总和 s3→s2 缓存/截图回归。
- `pnpm exec vitest run server/container-mcp.test.ts`：新增 9 项参数校验全部通过；原有 4 项子进程桥接 fixture 仍因沙箱管道限制失败（退出 0、无 stdout）。保留这些测试，不跳过或放宽断言。独立最小复现：Node `spawnSync(process.execPath, ['-e', 'console.log("fixture")'], {stdio:'pipe'})` 返回 `error.code=EPERM`、空 stdout；改成 ignore/inherit 无此错误；`cat` 的管道输入也无法正常收到 EOF。该限制不依赖本任务的桥接代码，完整桥接结果以 Actions 为准。
- `pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json --pretty false`：通过。
- 本轮改动 TS/MJS 文件定向 `oxlint --deny-warnings`：通过。
- `pnpm lint`：仍被已有两条 warning 阻断：`server/lazy-container-mcp.ts:122` 的 no-useless-spread 和 `scripts/public-scan/scan.mjs:297` 的 no-control-regex，未修改无关文件。
- 初始化脚本 dash 语法、监护 Python 语法、冒烟 MJS/Python 语法、RFB 使用的 DES 标准已知答案、workflow YAML、`git diff --check`：通过。

当前 worktree 缺少 `docs/verification/README.md` 和独立的 `docs/specs/2026-11-14-multi-screen.md`；已完整读取 brief 中附录的执行规格。所有能运行的验证使用 mock 或隔离临时 fixture，没有访问用户 live app/data。

服务端重启后经 root exec 读回口令，以及包安装工具层暴露，留给接线任务。未改 `server/index.ts`、`server/vps-computer.ts`、IMAGE_LAYER_VERSION 或两种端口安全判定；未处理 main 合入、未提交、未推送。

## 第 3 轮返工（2026-11-14）

### 实现

- 屏幕 supervisor 的 Python 监护脚本改用 `#!/usr/bin/python3 -I`。supervisor 程序段不再注入屏幕用户的 HOME、USER、DISPLAY、XDG_RUNTIME_DIR、TMPDIR 或 DBus 环境；监护进程在 setuid 子进程中设置这些变量后才 exec 屏幕程序。测试锁定 shebang 和 root 程序段环境。
- 初始化每块屏幕前删除 `/run/user/<uid>` 后重新建立父目录与 tmp 子目录；可被屏幕用户替换的工作区链接和运行目录链接在 root 操作前清理或重建，避免符号链接把 install/chown 导向其他目录。
- Docker 的 fallback 标记探测移到 network/image/managed/security/persistence 等容器字段赋值之后，使用单独的 try/catch。探测失败写入 `desktop_error` 并保持屏幕未就绪，容器级健康字段继续保留。
- 屏幕包安装调用改为绝对路径 `/usr/local/sbin/crybot-pkg`。
- 真实镜像冒烟增加 usercustomize 注入重启检查和运行目录 tmp 符号链接提权检查。收尾时先用容器 root 清空挂载工作区，再删除容器和宿主临时目录；清理错误只输出一行警告，不覆盖检查失败的退出码。

### 第 3 轮验证

- `crybot-link-deps`：通过。
- `pnpm exec vitest run server/container-screens.test.ts`：22/22 通过。
- `pnpm exec vitest run server/container-computer.test.ts`：148/148 通过，含标记探测失败回归。
- `pnpm exec vitest run server/container-mcp.test.ts`：9 项校验通过；原有 4 项子进程桥接 fixture 仍因当前沙箱禁止该管道子进程返回 stdout 而失败，和第 2 轮相同，完整桥接结果以 Actions 为准。
- `pnpm exec tsc -b --pretty false`、`pnpm exec tsc -p tsconfig.server.json --pretty false`：通过。
- 本轮改动文件 `oxlint --deny-warnings`、冒烟脚本语法检查、`git diff --check`：通过。
- `pnpm lint` 仍只报仓库已有的 `server/lazy-container-mcp.ts:122` 与 `scripts/public-scan/scan.mjs:297` 两条 warning，在 `--deny-warnings` 下退出失败；本轮改动文件没有 warning。
- 当前沙箱没有 Docker daemon，且禁止端口型 e2e；真实镜像 usercustomize、运行目录链接和收尾流程以 Actions「Real VM screens」为准。

## 第 4 轮返工（2026-11-14）

### 三项修复

- 真实镜像冒烟在 `docker restart` 后重新执行 `docker port <name> 6901/tcp`，使用新的临时映射端口。重新启动 s1/s2 后复用首次启动的就绪检查：两屏 supervisor 为 running，且各屏 cua-driver status 成功，再检查两屏 token 路由。WebSocket 使用已有的 `ws` 依赖获取握手 HTTP 状态；30 秒内失败后每秒重试，单次握手及 RFB greeting 最多等待 5 秒，最终失败包含最后收到的 HTTP 状态和最后错误。
- `PermissionError killing crybot-websockify` 属于进程身份配置问题：此前 supervisor 为 root，websockify 直接以 cua 运行；固定能力白名单没有 CAP_KILL，Linux 不允许该 root 跨 UID 发信号。websockify 改用现有 `screen-process` root 监护脚本：子进程清空附加组、setgid/setuid 后仍以 cua 执行 websockify，监护进程仅转发信号时切换有效 UID。保留 Python `-I`，用户 HOME/USER/LOGNAME 仍在降权之后设置，屏幕专属环境仅用于 crybot-sN。没有添加能力或放宽权限。冒烟增加实际进程身份、websockify 停启后无残留进程、重启后日志无该 PermissionError 的断言；真实镜像效果仍待 Actions 确认。
- usercustomize 冒烟以 s2 执行 `python3 -c 'import site; print(site.getusersitepackages())'` 获取真实 user site，创建目录并写入钩子。先以 s2 不带 `-I` 执行 Python，断言 /tmp 标记存在且 uid 为 61002；删除标记后停启 s2，再断言标记不存在或不属 root。
- 布局标记探测条件改为 `status.runtime !== "container"`，覆盖共用初始化脚本的 Docker 和 Podman。新增 Podman 回退用例同时检查读取标记、返回 single、执行单屏 status 探测并达到 ready。

### 第 4 轮验证

已首先执行 `crybot-link-deps`；测试文件逐个运行，未使用 systemd。`docs/verification/README.md` 在当前 worktree 仍不存在；本轮仅使用 mock、临时目录和隔离脚本 fixture，没有访问用户 live app/data。

- 新 Podman 用例先红后绿：改生产代码前 `expected 'multi' to be 'single'`，改条件后单独运行通过。
- `pnpm exec vitest run server/container-screens.test.ts`：22/22 通过，含 108 组单屏参数完整相等断言。
- `pnpm exec vitest run server/container-computer.test.ts`：149/149 通过。
- `pnpm exec vitest run server/container-mcp.test.ts`：9/13 通过，原有 4 项子进程桥接测试仍因 stdout 为空失败，未修改或跳过测试。独立最小复现 `spawnSync(process.execPath, ['-e', 'console.log(123)'])` 返回 `error.code=EPERM`、status=0、空 stdout/stderr，与第 2、3 轮的沙箱限制一致；本地三文件合计 180/184 通过，不能声称全绿，完整桥接结果以 Actions 为准。
- `pnpm exec tsc -b`、`pnpm exec tsc -p tsconfig.server.json`：通过。
- 5 个改动 TS/MJS 文件的 `pnpm exec oxlint --deny-warnings`、`node --check scripts/smoke-screens-container.mjs`、`git diff --check`：通过。
- 无端口的隔离 WebSocket 模拟：503/连接失败后重试成功、连续 HTTP 失败保留最后 503 状态、连接失败诊断、无响应时 30 秒总超时及定时器/连接清理均通过。临时 HOME 下的真实 Python user site 正向对照和 `-I` 禁止加载对照通过；这不替代容器内 s2/root 隔离验收。

本沙箱无法运行容器或监听端口型 E2E，无法本地验证真实镜像冒烟。本条必须由协调者推分支后看 Actions「Real VM screens」全绿结果，目前未作该结论。

单屏 fixture、`server/index.ts`、`server/vps-computer.ts`、`IMAGE_LAYER_VERSION`、端口安全判定均未改动；`scripts/public-scan/allow-domains.txt` 末尾协调者添加的两行保留。没有提交 git 或推送分支。
