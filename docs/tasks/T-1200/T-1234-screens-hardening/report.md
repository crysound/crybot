# T-1234 多屏容器后续加固报告

## 修改文件

- `server/container-screens.ts`：`crybot-pkg` 先执行带 root 环境隔离的 `apt-get update`，分别记录 update/install 结果，并在 root 初始化 chmod 前拒绝可控路径上的符号链接。
- `server/container-computer-screens.ts`：屏内 exec 经 `screen-program` 统一设置 `oom_score_adj=500`，并让 `stopScreen` 始终尝试清理且保留 supervisor stop 原始错误。
- `server/container-computer.ts`：多屏布局标记探测不再受 `probeDesktop` 选项影响。
- `server/container-screens.test.ts`：补充包安装顺序和失败日志、符号链接判定、屏幕 supervisor 环境、setuid 后环境设置及屏内 OOM 参数断言。
- `server/container-computer.test.ts`：补充三种 stopScreen 错误组合、屏内 OOM 参数和 marker 探测测试。
- `server/container-mcp.test.ts`：更新屏内 MCP 参数断言，锁定 OOM wrapper。
- `scripts/smoke-screens-container.mjs`：增加 token 路由的 RFB 密码认证、跨屏 X/socket 访问、三种 sudo 拒绝以及运行目录目标 mode 保持检查。

## 要做的事处理结果

1. **已完成**：`crybot-pkg` 先 update；update 失败写 `operation=update` 日志并立即退出，install 单独写 `operation=install` 日志；单测覆盖顺序、失败不安装和结果区分。
2. **已完成**：多屏 `screenIdentityArgs` 保留 `-u`、`env -u VNC_PW`、`prlimit --nproc=1500`、`umask 007`，通过 `screen-program` 设置 OOM 优先级；单屏路径参数 fixture 未变。
3. **已完成**：stop 和 pkill 清理都执行；单步失败抛对应错误，双失败抛 `AggregateError`，`cause` 和 `errors[0]` 保留原 stop 错误，消息包含两步错误。
4. **已完成**：初始化脚本对 `/home/cua`、`/home/cua/workspace`、`/home/cua/workspace/screens`、`/home/cua/.vnc` 逐项做 `[ -L ]` 拒绝，正常目录流程不变。
5. **已完成**：每个 `[program:screen-sN-*]` 段均断言没有 `environment=`；`screenProcessScript` 单测断言 setuid/setgid 后才设置 HOME/USER 等环境。
6. **已完成（脚本检查已补）**：冒烟脚本现在验证 token=s1/s2 的正确密码、错误密码和 s1 密码跨 token=s2 失败；s1 访问 `DISPLAY=:2`、s2 cua socket 和三种身份 sudo 均必须失败；运行目录符号链接目标同时比较属主和 mode。沙箱无法运行真实 Docker/端口型冒烟，结果以 Actions「Real VM screens」为准。
7. **已完成**：当前 main 仍存在 marker 探测受 `probeDesktop` 影响的问题，已改为多屏运行容器始终探测 marker，并补 `probeDesktop:false` 回归单测。

## 验证

先运行 依赖准备脚本，成功链接 73 项依赖；未使用 `systemd-run`，测试文件逐个执行。

- `pnpm exec vitest run server/container-screens.test.ts`：28/28 通过。
- `pnpm exec vitest run server/container-computer.test.ts`：154/154 通过。
- `pnpm exec vitest run server/container-mcp.test.ts`：9/13 通过；剩余 4 项是沙箱已知的子进程桥接 fixture `EPERM`/空 stdout 失败，未修改或跳过。
- `pnpm exec vitest run server/bot-box/env.test.ts`：10/10 通过。
- `pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`：1/1 通过，`server/container-computer.ts` 未超 ratchet 上限。
- `pnpm exec tsc -p tsconfig.server.json --pretty false`：通过。
- `pnpm exec oxlint --deny-warnings` 覆盖本轮改动 TS/MJS 文件：通过。
- `node --check scripts/smoke-screens-container.mjs`：通过；冒烟内嵌 Python RFB 检查也通过 `py_compile`。
- `git diff --check`：无输出。

逐文件测试输出摘要：

```text
server/container-screens.test.ts: 1 passed, 28 passed
server/container-computer.test.ts: 1 passed, 154 passed
server/container-mcp.test.ts: 1 failed, 9 passed, 4 failed (沙箱 EPERM 子进程桥接)
server/bot-box/env.test.ts: 1 passed, 10 passed
scripts/testing/file-size-ratchet.test.ts: 1 passed, 1 passed
tsc -p tsconfig.server.json: exit 0
oxlint --deny-warnings (改动文件): exit 0
node --check scripts/smoke-screens-container.mjs: exit 0
git diff --check: no output
```

当前 没有 Docker daemon 且禁止监听端口，未运行真实容器冒烟；Actions「Real VM screens」需要实际执行新增的 RFB token 认证、跨屏隔离、sudo 拒绝和运行目录 mode 检查。工作树中也不存在 AGENTS.md 要求引用的 `docs/verification/README.md`，请协调者确认是否需要补回该验证说明。

## 需要协调者处理

- 推送后运行 Actions「Real VM screens」，确认真实镜像中的 WebSocket RFB 认证、跨屏连接拒绝、sudo 拒绝及重启后的 mode 保持。
- 在当前分支补齐或确认 `docs/verification/README.md` 的来源，便于后续按仓库规定执行隔离 fixture 验证。


## 第 2 轮返工

### 修改及逐项处理结果

本轮只修改 `server/container-screens.ts`、`server/container-computer-screens.ts`、`server/container-screens.test.ts`、`server/container-computer.test.ts`、`scripts/smoke-screens-container.mjs` 和本报告。保留协调者 349f0e4a 修复的内容：`websocket_reader(sock, leftover)` 继续按字节缓冲，HTTP 握手多读的字节继续交给 RFB。未改工作流、ratchet 数字、单屏实现或用户列出的 main 已知失败文件；未提交 git、未联网、未安装依赖。

1. **控制帧已处理**：`websocket_frame` 消费完整 ping/pong 帧后返回空字节，不将载荷交给 RFB；ping 直接忽略。关闭帧仍抛出 `websocket closed during RFB`。
2. **screens 链接恢复已处理（补充上一轮第 4 条）**：`/home/cua/workspace/screens` 是链接就只 `rm -f` 删除链接，再用 `install -d -o root -g root -m 0711` 重建目录；正常目录及其内容保留。`install -d -o root -g root` 也会把宿主预先建立、非 root 属主的 screens 目录改为 root:root，更安全：cua 不能再列出或改名 screens 下的条目。workspace 是宿主 bind mount，screens 会持久化且宿主可写，若拒绝退出会使后续每次启动都失败；重建避免必须人工清理，也不跟随链接修改原目标。链接指向的内容不会搬回新目录。`/home/cua`、`/home/cua/workspace`、`/home/cua/.vnc` 仍拒绝链接并退出：这些是用户 HOME、挂载入口和凭据目录，自动替换会改变其存储/凭据含义，不能视为可重建的屏幕父目录；异常布局需人工恢复为正常目录后重启。单测断言拒绝路径列表和 screens 删除、指定属主/mode 重建的顺序。
3. **拒绝检查已处理**：`docker` 错误保留 stderr；`expectCommandFailure` 要求退出码为 1 且 stderr 匹配对应原因。sudo 匹配 `password is required` / `not in (the) sudoers` / `may not run sudo`；X 匹配 `unable to open display`；Python socket 匹配 `PermissionError: ... Permission denied`。命令缺失、Docker 执行错误、连接拒绝或 socket 不存在都不能算隔离成功。删除不可达 catch 分支。在跨屏实连前，crybot-s2 必须先成功执行 `DISPLAY=:2 xset q` 并连接自己的 `/run/user/61002/crybot-cua.sock`；这两项没有跳过分支，镜像上实际是否通过交由 Actions 判定。
4. **屏内 exec OOM 正向检查已处理**：直接复用服务端导出的 `screenIdentityArgs(screen(1), ["cat", "/proc/self/oom_score_adj"])`，期望输出严格为 `500`，包含服务端相同的身份、环境、prlimit 和 screen-program 参数。
5. **单测及错误处理已补强**：4 屏 × 每屏 x/dbus/session/cua 4 个程序，断言 program 段数量固定为 16，再检查无 `environment=`。三个 stopScreen 错误用例均断言第二次调用的完整 `setpriv --reuid=61002 --regid=61002 --clear-groups pkill -KILL -u crybot-s2 ...` 参数和 30 秒超时。stop、cleanup 分别用布尔标志记录失败；新增 stop 单独、cleanup 单独及两者同时 reject(undefined) 的三组用例，验证不会误当成功。
6. **报告已补全**：以下粘贴实际测试输出末尾；附从冒烟脚本抽取函数的完整 Python socketpair 验证脚本。临时验证程序只位于 `/tmp`，未作为仓库文件新增。

### 本地验收实际输出

先执行 依赖准备脚本（退出码 0）：

```text
依赖准备脚本: linked 73 entries into /data/home/codex-t-1234-screens-hardening-336f1b14551d/node_modules
```

测试文件逐个运行，没有使用 systemd；以下保留真实输出的计数、起始时间与耗时。

`pnpm exec vitest run server/container-screens.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  28 passed (28)
   Start at  22:03:56
   Duration  1.48s (transform 816ms, setup 934ms, import 174ms, tests 226ms, environment 0ms)
```

`pnpm exec vitest run server/container-computer.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  157 passed (157)
   Start at  22:04:28
   Duration  1.24s (transform 815ms, setup 775ms, import 274ms, tests 63ms, environment 0ms)
```

`pnpm exec vitest run server/container-mcp.test.ts`，退出码 1：

```text
 Test Files  1 failed (1)
      Tests  4 failed | 9 passed (13)
   Start at  22:04:45
   Duration  2.12s (transform 842ms, setup 799ms, import 285ms, tests 909ms, environment 0ms)
```

`pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:05:02
   Duration  1.70s (transform 603ms, setup 778ms, import 7ms, tests 778ms, environment 0ms)
```

`pnpm exec vitest run server/bot-box/env.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  22:05:17
   Duration  1.48s (transform 932ms, setup 1.18s, import 40ms, tests 109ms, environment 0ms)
```

MCP 失败的仍是用户说明中的 4 个子进程桥接用例，未修改或跳过。本次日志没有直接打印 EPERM，实际表现是空 stdout 导致 JSON 解析和响应断言失败；不将它们写成通过。对应原始输出：

```text
     × lists lazy computer tools without starting a runtime or waiting for the desktop 252ms
     × passes MCP bytes unchanged to cua-driver mcp over the container runtime 219ms
     × answers ping locally so the bundled cua-driver is not invoked 222ms
     × never hands an engine an error result that carries a screenshot 212ms
SyntaxError: Unexpected end of JSON input
AssertionError: expected '' to be '{"jsonrpc":"2.0","id":1,"method":"too…' // Object.is() equality
AssertionError: expected [] to deeply equal [ …(2) ]
SyntaxError: Unexpected end of JSON input
```

以下命令也已实际运行，均退出 0，stdout/stderr 为空（没有可粘贴的输出行）：

- `pnpm exec tsc -p tsconfig.server.json`
- `node --check scripts/smoke-screens-container.mjs`
- `pnpm exec oxlint --deny-warnings server/container-screens.ts server/container-computer-screens.ts server/container-screens.test.ts server/container-computer.test.ts scripts/smoke-screens-container.mjs`
- `git diff --check`

另将 `expectCommandFailure` 抽取到临时 Node 程序，用模拟 docker 结果验证正常拒绝、缺命令、Docker 错误、socket 不存在/连接拒绝和意外成功，执行 `node /tmp/crybot-t1234-r2-validation/denial-check.mjs`（退出码 0），实际输出：

```text
PASS: 13 denial cases (expected diagnostics, missing command, Docker errors, socket errors, unexpected success)
```

### Python socketpair 验证

直接从当前冒烟脚本取出 `String.raw` Python 片段，用 AST 仅加载函数定义，不执行 Docker/RFB 网络认证入口。创建隔离的匿名 socketpair，喂入真实 WebSocket 字节；不绑定端口、不访问用户 app/数据。沙箱中的 `sendall` 和 `shutdown` 会报 `PermissionError: [Errno 1] Operation not permitted`，因此写端用 `os.write` 写同一 socketpair 的文件描述符、用 close 结束，读端仍由原函数直接调用 `sock.recv`。

执行 `python3 /tmp/crybot-t1234-r2-validation/websocket-reader.py`，退出码 0，实际输出：

```text
PASS: coalesced RFB fields, interleaved ping/pong, split fields, leftover=0/1/5/all
PASS: masked frames and 16/64-bit lengths
PASS: close frame still raises
PASS: handshake leftover is preserved
```

完整验证脚本（在 worktree 根目录执行）：

```python
import ast
from pathlib import Path
import socket
import os
import struct

source = Path('scripts/smoke-screens-container.mjs').read_text()
python = source.split('const rfbCheck = String.raw`', 1)[1].split('\n`;', 1)[0]
module = ast.parse(python)
functions = ast.Module(
    body=[node for node in module.body if isinstance(node, ast.FunctionDef)],
    type_ignores=[],
)
namespace = {'struct': struct}
exec(compile(functions, '<extracted-rfb-functions>', 'exec'), namespace)

def frame(payload, opcode=2, length_kind=0, masked=False):
    length = len(payload)
    if length_kind == 126:
        header = bytes([0x80 | opcode, 126]) + struct.pack('!H', length)
    elif length_kind == 127:
        header = bytes([0x80 | opcode, 127]) + struct.pack('!Q', length)
    else:
        header = bytes([0x80 | opcode, length])
    if masked:
        header = header[:1] + bytes([header[1] | 0x80]) + header[2:]
        mask = b'CBOT'
        return header + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    return header + payload

greeting = b'RFB 003.008\n'
challenge = bytes(range(16))
result = struct.pack('!I', 0)
fields = [greeting, b'\x01', b'\x02', challenge, result]
wire = (
    frame(greeting + b'\x01\x02' + challenge[:3])
    + frame(b'ping must not enter RFB', opcode=9)
    + frame(challenge[3:10])
    + frame(b'pong must not enter RFB', opcode=10, masked=True)
    + frame(challenge[10:] + result[:2])
    + frame(result[2:])
)
for buffered in (0, 1, 5, len(wire)):
    reader, writer = socket.socketpair()
    with reader, writer:
        reader.settimeout(1)
        os.write(writer.fileno(), wire[buffered:])
        writer.close()
        read_packet = namespace['websocket_reader'](reader, wire[:buffered])
        assert [read_packet(reader, len(field)) for field in fields] == fields
print('PASS: coalesced RFB fields, interleaved ping/pong, split fields, leftover=0/1/5/all')

for length_kind, size in ((126, 130), (127, 256)):
    reader, writer = socket.socketpair()
    with reader, writer:
        reader.settimeout(1)
        payload = bytes(range(256))[:size] if size == 256 else b'x' * size
        os.write(writer.fileno(), frame(payload, length_kind=length_kind, masked=True))
        read_packet = namespace['websocket_reader'](reader, b'')
        assert read_packet(reader, size) == payload
print('PASS: masked frames and 16/64-bit lengths')

reader, writer = socket.socketpair()
with reader, writer:
    reader.settimeout(1)
    os.write(writer.fileno(), frame(b'', opcode=8))
    read_packet = namespace['websocket_reader'](reader, b'')
    try:
        read_packet(reader, 1)
    except RuntimeError as error:
        assert str(error) == 'websocket closed during RFB'
    else:
        raise AssertionError('close frame must fail')
print('PASS: close frame still raises')

reader, writer = socket.socketpair()
with reader, writer:
    reader.settimeout(1)
    headers = b'HTTP/1.1 101 Switching Protocols\r\n\r\n'
    os.write(writer.fileno(), headers + frame(greeting))
    head, leftover = namespace['read_until'](reader, b'\r\n\r\n')
    assert head == headers
    assert namespace['websocket_reader'](reader, leftover)(reader, 12) == greeting
print('PASS: handshake leftover is preserved')
```

### 仍需协调者验收

环境核对补充：本轮实际发现 Docker CLI（`docker --version` 输出 `Docker version 29.8.2, build 7fc2dff`）及本地 socket，不能沿用上一轮“没有 Docker”的判断。沙箱禁止监听端口，本任务也禁止联网拉取镜像，因此按要求未运行真实容器冒烟或端口型 e2e；不能以本地单测或 socketpair 验证替代 Actions「Real VM screens」。请在那里确认正确/错误/跨屏密码认证、s2 自身 X/socket 正向对照、s1 跨屏拒绝的具体诊断、三种身份 sudo 拒绝、s1 exec OOM=500 和重启后的隔离检查。尚无证据表明镜像无法执行新增正向对照，因此没有跳过它们。

`docs/verification/README.md` 在本工作树仍不存在，无法按该缺失文档启动完整服务 fixture；本次测试使用既有测试 fixture 和匿名 socketpair，未对用户 live app 或数据做任何验证性修改。该文档来源仍请协调者确认。


## 第 3 轮返工

### 授权方案与修改范围

每次多屏容器初始化，系统 Python 在隔离模式下为 s1–s4 分别生成 16 字节密码学随机 MIT-MAGIC-COOKIE-1。直接写标准 Xauthority 二进制记录，使用 FamilyLocal、当前容器主机名与本屏显示编号，无需安装 xauth 或其他依赖。cookie 仅在容器启动时产生，不进入镜像、命令行参数或日志。授权文件位于 `/run/crybot/screens/sN/Xauthority`，目录 root:root / 0711，文件 crybot-sN:crybot-sN / 0400，与现有 passwd 约定一致。生成时 umask 077，先 unlink 旧文件或链接，再排他创建新文件；不跟随符号链接，初始化失败立即停止。每次容器启动更新 cookie，单独停启屏幕复用该次启动的 cookie。

Xvnc 显式使用本屏 `-auth` 文件，并加 `-nolisten tcp`；隔离依据是 cookie 授权，不依赖文件系统 X 套接字权限。screen-process 在 setgid/setuid 后设置 XAUTHORITY，session、startxfce4、cua-driver 与 screen-wait-display 都继承本屏环境。supervisor 的 16 个屏幕 program 段仍无 environment 配置。

本轮修改授权生成与 supervisor 包装、屏内 exec 环境、目标授权路径帮助函数、三个对应测试文件、冒烟脚本及本报告；全部位于本轮允许范围，无额外仓库文件。不改工作流、ratchet 数字或单屏实现；没有 git 提交、联网、安装依赖。容器主模块无需修改：截图与健康探测已经复用 screenExecArgs，自动取得新增授权变量。

### 接线位置及全仓 X 客户端核对

实际执行 `rg -n 'DISPLAY|xset|scrot|x11grab|screenDisplay'` 全仓检索，再核对各调用入口：

- `server/container-targets.ts:52`：校验屏号并统一生成本屏授权文件路径。
- `server/container-screens.ts:196`：授权文件生成脚本；`:290`：每个用户、root 所属授权目录建好后执行，指定本屏 uid/gid、显示编号，早于 supervisor 启动。
- `server/container-screens.ts:31`：Xvnc 使用本屏 `-auth`，禁用 X TCP 监听。
- `server/container-screens.ts:165`：降权后的 XAUTHORITY；`:33` 和 `:34`：桌面会话与 cua-driver；`:263`：等待显示的 xset。三者沿 supervisor → screen-program → screen-process → 降权子进程继承本屏授权。
- `server/container-computer-screens.ts:50`：screenIdentityArgs 给多屏 docker exec 配置本屏 XAUTHORITY；`:76`：screenExecArgs 复用此入口。原单屏 cua 参数不变。
- `server/container-computer.ts:585`、`:587`、`:590`：版本、状态和健康探测复用 screenExecArgs；`:951`：截图调用；`:964`：屏用户读取截图；`:1050`：屏内任意命令复用 screenIdentityArgs。核对后不存在绕过这些入口的多屏 root X 客户端；root 路径只处理标记、supervisor、凭据与包管理，无需注入屏授权。
- `server/container-mcp.ts:18`：MCP 经屏号校验后调用 screenExecArgs；启动参数解析保持不变。
- `scripts/smoke-screens-container.mjs:95`、`:298`、`:314`：就绪检查、环境检查、s2 X 正向及 s1 跨屏反向检查均取得对应屏的 XAUTHORITY。s1 查询 s2 的原命令、退出码 1 和 unable-to-open-display 原因检查没有放宽。
- 其他 DISPLAY 命中属于单屏 cua 桌面、远端 VPS、宿主 Electron/浏览器/会议或测试 fixture；scrot/x11grab 在远端桌面截图路径，不属于多屏容器。原单屏初始化等待、单屏 exec 及相关独立验证脚本不改。108 组单屏 run 参数的完整相等测试继续通过。

### 冒烟与单测验收点

- `scripts/smoke-screens-container.mjs:311`：以 root 断言各授权文件 uid/gid/mode 正确；`:316`：s2 查询自身显示必须成功；`:318`：s1 查询 s2 仍必须以原指定原因失败；`:319`：s1 读取 s2 授权文件必须退出 1，且诊断为 Permission denied，缺文件不能算成功。
- `scripts/smoke-screens-container.mjs:321`：以 root 断言 cua sudoers 规则不存在，也不能是悬空链接；`:322`：sudo 拒绝原因增加 no new privileges 和 effective uid is not 0，保留原 sudoers 原因匹配及退出码要求。s1/s2/cua 三种身份继续检查，其他失败原因仍报错。
- `server/container-screens.test.ts:102`：四屏 Xvnc 的独立授权路径和 exec 环境；`:109`：从实际初始化脚本抽取四个生成块，在隔离临时目录真实执行两次，验证二进制协议字段、uid/gid、0400、8 个 cookie 全不相同、无 stdout/stderr、旧符号链接目标内容与权限不变。fixture 将预期屏 uid/gid 映射为当前测试用户，并另断言产品脚本传入真实屏 uid/gid。
- `server/container-screens.test.ts:93`、`:162`：保留 16 个 program 段无 environment 配置，以及 setuid 后才设置 XAUTHORITY；`server/container-computer.test.ts:1621`、`:1790`：屏内命令与截图参数；`server/container-mcp.test.ts:221`：MCP 环境包含本屏授权。

### 实际运行命令与输出

先执行 依赖准备脚本，退出 0：

```text
依赖准备脚本: linked 73 entries into /data/home/codex-t-1234-screens-hardening-e62e22846c95/node_modules
```

测试一次一个文件，无 systemd 前缀。以下为实际输出结尾：

`pnpm exec vitest run server/container-screens.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  22:25:12
   Duration  1.63s (transform 817ms, setup 884ms, import 186ms, tests 416ms, environment 0ms)
```

`pnpm exec vitest run server/container-computer.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  157 passed (157)
   Start at  22:25:34
   Duration  1.29s (transform 858ms, setup 800ms, import 301ms, tests 61ms, environment 0ms)
```

`pnpm exec vitest run server/container-mcp.test.ts`，退出码 1：

```text
 Test Files  1 failed (1)
      Tests  4 failed | 9 passed (13)
   Start at  22:25:55
   Duration  1.86s (transform 665ms, setup 635ms, import 233ms, tests 892ms, environment 0ms)
```

`pnpm exec vitest run scripts/testing/file-size-ratchet.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:26:11
   Duration  1.01s (transform 584ms, setup 766ms, import 9ms, tests 113ms, environment 0ms)
```

`pnpm exec vitest run server/bot-box/env.test.ts`，退出码 0：

```text
 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  22:26:49
   Duration  1.13s (transform 662ms, setup 848ms, import 31ms, tests 126ms, environment 0ms)
```

MCP 仍是已知的 4 个子进程桥接失败，未修改或跳过。用户说明将其归于沙箱 EPERM；本次日志没有直接打印 EPERM，实际为 stdout 为空，导致 JSON 解析和响应断言失败。真实失败用例输出如下：

```text
     × lists lazy computer tools without starting a runtime or waiting for the desktop 244ms
     × passes MCP bytes unchanged to cua-driver mcp over the container runtime 226ms
     × answers ping locally so the bundled cua-driver is not invoked 223ms
     × never hands an engine an error result that carries a screenshot 195ms
SyntaxError: Unexpected end of JSON input
AssertionError: expected [] to deeply equal [ …(2) ]
```

以下命令均实际执行并退出 0，stdout/stderr 为空，无可贴输出行：

- `pnpm exec tsc -p tsconfig.server.json`
- `node --check scripts/smoke-screens-container.mjs`
- `pnpm exec oxlint --deny-warnings server/container-screens.ts server/container-computer-screens.ts server/container-targets.ts server/container-screens.test.ts server/container-computer.test.ts server/container-mcp.test.ts scripts/smoke-screens-container.mjs`
- `git diff --check`

另外做了两项隔离验证（脚本仅在临时目录，不新增仓库文件）：

1. `python3 /tmp/t1234-xauth-format.py`：抽取产品 Python 生成脚本，写临时授权文件，用环境已有 xauth 读取，核对四屏显示编号、协议名和 cookie 长度，捕获读取结果且不打印 cookie。退出 0，真实输出：

```text
PASS: xauth reads all four generated FamilyLocal authority records (cookies not printed)
```

2. `node /tmp/t1234-denial-check.mjs`：抽取冒烟中的拒绝 helper 与 sudo 正则，注入模拟 docker 结果，验证五种预期原因、相同文本但错误退出码、命令缺失、Docker 错误、其他拒绝及意外成功。退出 0，真实输出：

```text
PASS: 15 sudo denial cases (expected reasons, wrong exit status, unrelated failures, unexpected success)
```


公开扫描：`node scripts/public-scan/scan.mjs --base origin/main` 退出 2，真实输出：

```text
Public scan error: invalid base, configuration, repository, or unparsed diff.
```

进一步执行 `git rev-parse --verify origin/main`，退出 128，输出 `fatal: Needed a single revision`，确认本地缺少该引用；未联网获取。改用 `node scripts/public-scan/scan.mjs --base HEAD` 检查本轮未提交改动，退出 0，真实输出：

```text
denylist: skipped (no key)
Public scan passed: no findings.
```

此替代检查只覆盖当前 HEAD 以来的工作区差异，且环境没有 denylist 密钥，不能声称完成了对 origin/main 的完整扫描。

### 本地限制与剩余真实验收

仓库指向的 `docs/verification/README.md` 仍不存在，无法依照缺失说明启动完整服务 fixture。本次使用测试已有 fixture 及独立临时目录，未触碰用户 live app 或数据。沙箱禁止监听端口，未运行端口型 e2e 或真实容器冒烟；不能用静态命令和授权格式测试声称真实 X 隔离已经通过。真实结果以 Actions「Real VM screens」为准，需要确认 s2 自身 X 查询成功、s1 跨屏 X/授权文件/socket 访问拒绝、三种身份 sudo 拒绝及重启后的既有检查。
