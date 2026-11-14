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

先运行 `crybot-link-deps`，成功链接 73 项依赖；未使用 `systemd-run`，测试文件逐个执行。

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

当前 InstaBox 没有 Docker daemon 且禁止监听端口，未运行真实容器冒烟；Actions「Real VM screens」需要实际执行新增的 RFB token 认证、跨屏隔离、sudo 拒绝和运行目录 mode 检查。工作树中也不存在 AGENTS.md 要求引用的 `docs/verification/README.md`，请协调者确认是否需要补回该验证说明。

## 需要协调者处理

- 推送后运行 Actions「Real VM screens」，确认真实镜像中的 WebSocket RFB 认证、跨屏连接拒绝、sudo 拒绝及重启后的 mode 保持。
- 在当前分支补齐或确认 `docs/verification/README.md` 的来源，便于后续按仓库规定执行隔离 fixture 验证。


## 第 2 轮返工

### 修改及逐项处理结果

本轮只修改 `server/container-screens.ts`、`server/container-computer-screens.ts`、`server/container-screens.test.ts`、`server/container-computer.test.ts`、`scripts/smoke-screens-container.mjs` 和本报告。保留协调者 349f0e4a 修复的内容：`websocket_reader(sock, leftover)` 继续按字节缓冲，HTTP 握手多读的字节继续交给 RFB。未改工作流、ratchet 数字、单屏实现或用户列出的 main 已知失败文件；未提交 git、未联网、未安装依赖。

1. **控制帧已处理**：`websocket_frame` 消费完整 ping/pong 帧后返回空字节，不将载荷交给 RFB；ping 直接忽略。关闭帧仍抛出 `websocket closed during RFB`。
2. **screens 链接恢复已处理（补充上一轮第 4 条）**：`/home/cua/workspace/screens` 是链接就只 `rm -f` 删除链接，再用 `install -d -o root -g root -m 0711` 重建目录；正常目录及其内容保留。workspace 是宿主 bind mount，screens 会持久化且宿主可写，若拒绝退出会使后续每次启动都失败；重建避免必须人工清理，也不跟随链接修改原目标。链接指向的内容不会搬回新目录。`/home/cua`、`/home/cua/workspace`、`/home/cua/.vnc` 仍拒绝链接并退出：这些是用户 HOME、挂载入口和凭据目录，自动替换会改变其存储/凭据含义，不能视为可重建的屏幕父目录；异常布局需人工恢复为正常目录后重启。单测断言拒绝路径列表和 screens 删除、指定属主/mode 重建的顺序。
3. **拒绝检查已处理**：`docker` 错误保留 stderr；`expectCommandFailure` 要求退出码为 1 且 stderr 匹配对应原因。sudo 匹配 `password is required` / `not in (the) sudoers` / `may not run sudo`；X 匹配 `unable to open display`；Python socket 匹配 `PermissionError: ... Permission denied`。命令缺失、Docker 执行错误、连接拒绝或 socket 不存在都不能算隔离成功。删除不可达 catch 分支。在跨屏实连前，crybot-s2 必须先成功执行 `DISPLAY=:2 xset q` 并连接自己的 `/run/user/61002/crybot-cua.sock`；这两项没有跳过分支，镜像上实际是否通过交由 Actions 判定。
4. **屏内 exec OOM 正向检查已处理**：直接复用服务端导出的 `screenIdentityArgs(screen(1), ["cat", "/proc/self/oom_score_adj"])`，期望输出严格为 `500`，包含服务端相同的身份、环境、prlimit 和 screen-program 参数。
5. **单测及错误处理已补强**：4 屏 × 每屏 x/dbus/session/cua 4 个程序，断言 program 段数量固定为 16，再检查无 `environment=`。三个 stopScreen 错误用例均断言第二次调用的完整 `setpriv --reuid=61002 --regid=61002 --clear-groups pkill -KILL -u crybot-s2 ...` 参数和 30 秒超时。stop、cleanup 分别用布尔标志记录失败；新增 stop 单独、cleanup 单独及两者同时 reject(undefined) 的三组用例，验证不会误当成功。
6. **报告已补全**：以下粘贴实际测试输出末尾；附从冒烟脚本抽取函数的完整 Python socketpair 验证脚本。临时验证程序只位于 `/tmp`，未作为仓库文件新增。

### 本地验收实际输出

先执行 `crybot-link-deps`（退出码 0）：

```text
crybot-link-deps: linked 73 entries from /opt/crybot-deps/node_modules into /data/home/codex-t-1234-screens-hardening-336f1b14551d/node_modules
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
AssertionError: expected '' to be '{"jsonrpc":"2.0","id":1,"method":"too…' // Object.is equality
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
