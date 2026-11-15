import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const fixture = await mkdtemp(join(tmpdir(), "crybot-screens-smoke-"));
process.env.CRYBOT_DATA_DIR = join(fixture, "data");
const {
  BASE_IMAGE, IMAGE, SHARED_LOCAL_VM_TARGET, containerRunArgs, managedImageDockerfile,
  sharedScreenTarget, screenIdentityArgs, screenExecArgs, screenSocket, startScreen, stopScreen, screenStates,
} = await import("../server/container-computer.ts");
const { SCREENS_SUPERVISOR_CONFIG, rootContainerExecArgs } = await import("../server/container-screens.ts");
const { screenXauthority } = await import("../server/container-targets.ts");
const name = `crybot-screens-smoke-${randomBytes(6).toString("hex")}`;
const image = `localhost/crybot/screens-smoke:${randomBytes(6).toString("hex")}`;
const workspace = join(fixture, "workspace");
const target = { ...SHARED_LOCAL_VM_TARGET, containerName: name, workspaceDir: workspace, viewerPort: null };
const screen = n => ({ ...sharedScreenTarget(n), containerName: name, workspaceDir: workspace, viewerPort: null });
const passwords = [randomBytes(6).toString("base64url"), randomBytes(6).toString("base64url")];

function docker(args, { input, timeout = 60_000, inherit = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", inherit ? "inherit" : "pipe", inherit ? "inherit" : "pipe"] });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("docker operation timed out")); }, timeout);
    child.stdout?.on("data", chunk => { stdout += chunk; });
    child.stderr?.on("data", chunk => { stderr += chunk; });
    child.stdin.on("error", () => {});
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout });
      else reject(Object.assign(new Error(`docker exited ${code}: ${stderr}`), { code, stdout, stderr }));
    });
    child.stdin.end(input);
  });
}

const root = args => rootContainerExecArgs(name, args);
const systemPython = ["env", "-u", "PYTHONNOUSERSITE", "/usr/bin/python3"];

async function assertNotRootMarker(marker) {
  await docker(root(["sh", "-c", 'test ! -e "$1" || [ "$(stat -c %u "$1")" -ne 0 ]', "usercustomize-marker", marker]));
}

async function userSiteDiagnostics(execArgs) {
  await docker(execArgs(["/usr/bin/python3", "-c", "import site, sys; print('interpreter:', sys.executable); print('version:', sys.version); print('site.ENABLE_USER_SITE:', site.ENABLE_USER_SITE); print('user site:', site.getusersitepackages())"]), { inherit: true }).catch(error => console.warn(error.message));
  await docker(execArgs(["sh", "-c", 'directory=$(/usr/bin/python3 -c "import site; print(site.getusersitepackages())"); ls -la -- "$directory"']), { inherit: true }).catch(error => console.warn(error.message));
}

async function checkUsercustomize(userExec, home, uid, check) {
  const marker = `/tmp/crybot-usercustomize-${home.split("/").at(-1)}`;
  let userSite;
  try {
    console.log((await docker(userExec([...systemPython, "-c", "import sys; print(sys.executable, sys.version)"]))).stdout.trim());
    userSite = (await docker(userExec([...systemPython, "-c", "import site; print(site.getusersitepackages())"]))).stdout.trim();
    await docker(root(["rm", "-f", marker]));
    await docker(userExec(["sh", "-c", 'mkdir -p -- "$1"; printf \'%s\\n\' "$2" > "$1/usercustomize.py"', "usercustomize-fixture", userSite,
      `open(${JSON.stringify(marker)}, "w").write("injected\\n")`]));
    await docker(userExec([...systemPython, "-c", "pass"]));
    assert.equal((await docker(root(["stat", "-c", "%u", marker]))).stdout.trim(), uid);
    await docker(root(["rm", "-f", marker]));
    await check(marker);
  } catch (error) {
    console.error(`usercustomize check failed for ${home}`);
    await userSiteDiagnostics(args => userExec(["env", "-u", "PYTHONNOUSERSITE", ...args]));
    await userSiteDiagnostics(args => root(["env", "-u", "PYTHONNOUSERSITE", `HOME=${home}`, ...args]));
    await userSiteDiagnostics(root);
    throw error;
  } finally {
    if (userSite) await docker(root(["sh", "-c", 'rm -f -- "$1/usercustomize.py" "$1"/__pycache__/usercustomize.*.pyc "$2"', "usercustomize-cleanup", userSite, marker])).catch(error => console.warn(error.message));
  }
}

async function waitForScreens(expected) {
  let last;
  for (let attempt = 0; attempt < 60; attempt++) {
    last = await screenStates("docker", name, (command, args, timeout) => docker(args, { timeout }));
    if (Object.entries(expected).every(([n, state]) => last[n] === state)) return;
    if (Object.values(last).includes("failed")) throw new Error(`screen failed: ${JSON.stringify(last)}`);
    await delay(1000);
  }
  throw new Error(`screen startup timed out: ${JSON.stringify(last)}`);
}

async function waitForReadyScreens() {
  await waitForScreens({ 1: "running", 2: "running" });
  for (const n of [1, 2]) {
    for (let attempt = 0; ; attempt++) {
      try {
        await docker(screenExecArgs(screen(n), ["status", "--socket", screenSocket(n)]), { timeout: 10_000 });
        break;
      } catch (error) {
        if (attempt >= 45) throw error;
        await delay(1000);
      }
    }
  }
}

const rfbCheck = String.raw`
import base64, ctypes, ctypes.util, json, os, socket, struct, sys
passwords = json.load(sys.stdin)
crypto = ctypes.CDLL(ctypes.util.find_library('crypto'))
crypto.DES_set_key_unchecked.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
crypto.DES_ecb_encrypt.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int]
def read(sock, count):
    data = b''
    while len(data) < count:
        more = sock.recv(count - len(data))
        if not more: raise RuntimeError('RFB disconnected')
        data += more
    return data
def read_until(sock, marker):
    data = b''
    while marker not in data:
        more = sock.recv(4096)
        if not more: raise RuntimeError('websocket handshake disconnected')
        data += more
    head, _, rest = data.partition(marker)
    return head + marker, rest
def websocket_frame(read_raw):
    first, second = read_raw(2)
    length = second & 0x7f
    if length == 126: length = struct.unpack('!H', read_raw(2))[0]
    elif length == 127: length = struct.unpack('!Q', read_raw(8))[0]
    mask = read_raw(4) if second & 0x80 else b''
    payload = bytearray(read_raw(length))
    if mask:
        for index in range(length): payload[index] ^= mask[index % 4]
    if first & 0x0f == 8: raise RuntimeError('websocket closed during RFB')
    if first & 0x0f in (9, 10): return b''
    return bytes(payload)
# RFB reads fixed byte counts, but websockify frames do not line up with them,
# and the handshake read may already hold the first frame.
def websocket_reader(sock, leftover):
    raw = bytearray(leftover)
    frames = bytearray()
    def read_raw(count):
        while len(raw) < count:
            more = sock.recv(4096)
            if not more: raise RuntimeError('RFB disconnected')
            raw.extend(more)
        data = bytes(raw[:count])
        del raw[:count]
        return data
    def read_packet(_sock, count):
        while len(frames) < count: frames.extend(websocket_frame(read_raw))
        data = bytes(frames[:count])
        del frames[:count]
        return data
    return read_packet
def websocket_write(sock, payload):
    mask = b'CBOT'
    length = len(payload)
    if length < 126: header = bytes([0x82, 0x80 | length])
    elif length < 65536: header = bytes([0x82, 0xfe]) + struct.pack('!H', length)
    else: header = bytes([0x82, 0xff]) + struct.pack('!Q', length)
    sock.sendall(header + mask + bytes(value ^ mask[index % 4] for index, value in enumerate(payload)))
def rfb_authenticate(sock, password, read_packet=read, write_packet=lambda s, data: s.sendall(data)):
    assert read_packet(sock, 12) == b'RFB 003.008\n'
    write_packet(sock, b'RFB 003.008\n')
    number = read_packet(sock, 1)[0]
    types = read_packet(sock, number)
    assert 2 in types and 1 not in types, 'VNC password auth required'
    write_packet(sock, b'\x02')
    challenge = read_packet(sock, 16)
    key = bytes(int(f'{b:08b}'[::-1], 2) for b in password.encode()[:8].ljust(8, b'\0'))
    schedule = (ctypes.c_ulong * 32)()
    crypto.DES_set_key_unchecked(ctypes.create_string_buffer(key), schedule)
    response = b''
    for offset in (0, 8):
        block = ctypes.create_string_buffer(8)
        crypto.DES_ecb_encrypt(ctypes.create_string_buffer(challenge[offset:offset+8]), block, schedule, 1)
        response += block.raw
    write_packet(sock, response)
    return struct.unpack('!I', read_packet(sock, 4))[0] == 0
def authenticate(port, password):
    with socket.create_connection(('127.0.0.1', port), 10) as sock:
        sock.settimeout(10)
        return rfb_authenticate(sock, password)
def authenticate_token(token, password):
    with socket.create_connection(('127.0.0.1', 6901), 10) as sock:
        sock.settimeout(10)
        key = base64.b64encode(os.urandom(16)).decode()
        sock.sendall((f'GET /websockify?token={token} HTTP/1.1\r\nHost: 127.0.0.1:6901\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Protocol: binary\r\n\r\n').encode())
        headers, leftover = read_until(sock, b'\r\n\r\n')
        assert b' 101 ' in headers, f'token {token} did not upgrade: {headers.splitlines()[0]!r}'
        return rfb_authenticate(sock, password, websocket_reader(sock, leftover), websocket_write)
for n, password in enumerate(passwords, 1):
    assert authenticate(5900+n, password), f's{n} correct password refused'
    assert not authenticate(5900+n, 'wrong-pw'), f's{n} wrong password accepted'
    assert authenticate_token(f's{n}', password), f'token s{n} correct password refused'
    assert not authenticate_token(f's{n}', 'wrong-pw'), f'token s{n} wrong password accepted'
assert not authenticate_token('s2', passwords[0]), 's1 password authenticated through token s2'
print('RFB authentication passed for direct and token routes (correct, wrong, and cross-screen passwords)')
`;

async function tokenHandshake(port, n) {
  const deadline = Date.now() + 30_000;
  let lastError;
  let lastHttpStatus = "none (no HTTP response)";
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}/websockify?token=s${n}`, ["binary"]);
        let finished = false;
        const timer = setTimeout(() => finish(new Error("handshake/RFB greeting timed out")), Math.min(5000, deadline - Date.now()));
        function finish(error) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (error) { socket.terminate(); reject(error); }
          else { socket.close(); resolve(); }
        }
        socket.on("upgrade", response => { lastHttpStatus = response.statusCode; });
        socket.on("unexpected-response", (request, response) => {
          lastHttpStatus = response.statusCode;
          response.resume();
          finish(new Error(`HTTP ${response.statusCode}`));
        });
        socket.on("message", data => {
          try {
            assert.equal(data.toString(), "RFB 003.008\n");
            finish();
          } catch (error) { finish(error); }
        });
        socket.on("error", finish);
        socket.on("close", () => finish(new Error("closed before RFB greeting")));
      });
      return;
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, Math.max(0, deadline - Date.now())));
    }
  }
  throw new Error(`s${n} websockify failed after 30s; last HTTP status: ${lastHttpStatus}; ${lastError?.message}`);
}

async function expectCommandFailure(label, args, expectedDiagnostic) {
  try {
    await docker(args);
  } catch (error) {
    if (error.code !== 1 || typeof error.stderr !== "string" || !expectedDiagnostic.test(error.stderr)) {
      throw new Error(`${label}: failed for an unexpected reason: ${error.message}`, { cause: error });
    }
    console.log(`${label}: denied as expected`);
    return;
  }
  throw new Error(`${label}: unexpectedly succeeded`);
}

try {
  await mkdir(workspace, { recursive: true });
  await writeFile(join(fixture, "Dockerfile"), managedImageDockerfile());
  await docker(["pull", BASE_IMAGE], { inherit: true, timeout: 600_000 });
  await docker(["build", "-t", image, fixture], { inherit: true, timeout: 1_200_000 });
  const args = containerRunArgs("docker", randomBytes(12).toString("hex"), target, {
    platform: "linux", hostUser: { uid: process.getuid(), gid: process.getgid() },
    resources: { memoryGb: 4, cpus: 2 }, screensLayout: "multi",
  });
  args[args.indexOf(IMAGE)] = image;
  await docker(args);
  for (let attempt = 0; ; attempt++) {
    try {
      await docker(root(["test", "-S", "/run/crybot/supervisor.sock"]));
      break;
    } catch (error) {
      if (attempt >= 60) throw error;
      await delay(1000);
    }
  }
  const initial = await screenStates("docker", name, (command, args, timeout) => docker(args, { timeout }));
  assert.deepEqual(initial, { 1: "off", 2: "off", 3: "off", 4: "off" });
  await docker(root(["python3", "-c", 'import socket; s = socket.socket(); s.settimeout(2); assert s.connect_ex(("127.0.0.1", 5901)) != 0; s.close()']));
  await startScreen("docker", screen(1), passwords[0]);
  await startScreen("docker", screen(2), passwords[1]);
  await waitForReadyScreens();
  const supervisor = await docker(root(["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "status", "crybot-websockify"]));
  assert.match(supervisor.stdout, /RUNNING/);
  const port = (await docker(["port", name, "6901/tcp"])).stdout.trim().split(":").at(-1);
  await tokenHandshake(port, 1);
  await tokenHandshake(port, 2);
  console.log((await docker(rootContainerExecArgs(name, ["python3", "-c", rfbCheck], { interactive: true }), { input: JSON.stringify(passwords) })).stdout.trim());
  const processes = (await docker(root(["ps", "-eo", "user:20,args"]))).stdout;
  assert.doesNotMatch(processes, /(?:start-vnc\.sh|start-novnc\.sh|start-crybot-cua-driver\.sh)/);
  assert.match(processes, /^cua\s+.*\/usr\/bin\/websockify\b/m);
  assert.match(processes, /^root\s+.*\/screen-process cua \/usr\/bin\/websockify\b/m);
  assert.equal(processes.split("\n").filter(line => /^crybot-s1\s+.*Xvnc :1\b/.test(line)).length, 1);
  assert.match(processes, /crybot-s1\s+.*Xvnc :1\b/);
  const environment = (await docker(screenIdentityArgs(screen(2), ["env"]))).stdout;
  assert.doesNotMatch(environment, /^VNC_PW=/m);
  assert.match(environment, /^DISPLAY=:2$/m);
  assert.match(environment, /^XAUTHORITY=\/run\/crybot\/screens\/s2\/Xauthority$/m);
  assert.equal((await docker(screenIdentityArgs(screen(2), ["id", "-u"]))).stdout.trim(), "61002");
  assert.equal((await docker(screenIdentityArgs(screen(1), ["cat", "/proc/self/oom_score_adj"]))).stdout.trim(), "500");
  assert.equal((await docker(screenIdentityArgs(screen(2), ["sh", "-c", "umask; prlimit --pid $$ --nproc --noheadings --output SOFT,HARD"]))).stdout.trim().replace(/\s+/g, " "), "0007 1500 1500");
  for (const n of [1, 2]) {
    const programs = (await docker(root(["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "status", `screen-s${n}:*`]))).stdout;
    const pids = [...programs.matchAll(/RUNNING\s+pid (\d+)/g)].map(match => match[1]);
    assert.equal(pids.length, 4);
    for (const pid of pids) {
      assert.equal((await docker(root(["cat", `/proc/${pid}/oom_score_adj`]))).stdout.trim(), "500");
      assert.match((await docker(root(["cat", `/proc/${pid}/limits`]))).stdout, /^Max processes\s+1500\s+1500/m);
    }
    assert.equal((await docker(root(["stat", "-c", "%u:%a:%s", `/run/crybot/screens/s${n}/passwd`]))).stdout.trim(), `${61000 + n}:400:8`);
    assert.equal((await docker(root(["stat", "-c", "%u:%g:%a", screenXauthority(n)]))).stdout.trim(), `${61000 + n}:${61000 + n}:400`);
  }
  await docker(screenIdentityArgs(screen(2), ["sh", "-c", "! test -r /home/crybot-s1 && ! test -r /home/cua/workspace/screens/s1 && ! test -r /run/user/61001/crybot-cua.sock"]));
  const queryS2Display = ["sh", "-c", "DISPLAY=:2 xset q"];
  const connectS2Socket = ["/usr/bin/python3", "-c", "import socket; s=socket.socket(socket.AF_UNIX); s.settimeout(2); s.connect('/run/user/61002/crybot-cua.sock'); s.close()"];
  await docker(screenIdentityArgs(screen(2), queryS2Display));
  await docker(screenIdentityArgs(screen(2), connectS2Socket));
  await expectCommandFailure("crybot-s1 cannot query s2 display", screenIdentityArgs(screen(1), queryS2Display), /unable to open display/i);
  await expectCommandFailure("crybot-s1 cannot read s2 X authority", screenIdentityArgs(screen(1), ["cat", screenXauthority(2)]), /Permission denied/i);
  await expectCommandFailure("crybot-s1 cannot connect to s2 cua socket", screenIdentityArgs(screen(1), connectS2Socket), /^PermissionError:.*Permission denied/m);
  await docker(root(["sh", "-c", "test ! -e /etc/sudoers.d/cua && test ! -L /etc/sudoers.d/cua"]));
  const sudoDenied = /password is required|not in (?:the )?sudoers|may not run sudo|no new privileges|effective uid is not 0/i;
  for (const [label, args] of [
    ["crybot-s1 sudo", screenIdentityArgs(screen(1), ["sudo", "-n", "true"])],
    ["crybot-s2 sudo", screenIdentityArgs(screen(2), ["sudo", "-n", "true"])],
  ]) await expectCommandFailure(label, args, sudoDenied);
  await docker(screenIdentityArgs(screen(2), ["sh", "-c", "sleep 300 >/dev/null 2>&1 &"]));
  await checkUsercustomize(args => screenIdentityArgs(screen(2), args), "/home/crybot-s2", "61002", async marker => {
    await docker(root(["env", "-u", "PYTHONNOUSERSITE", "HOME=/home/crybot-s2",
      "/usr/local/libexec/crybot/screen-process", "crybot-s2", "true"]));
    await assertNotRootMarker(marker);
    await stopScreen("docker", screen(2));
    await waitForScreens({ 1: "running", 2: "off" });
    for (let attempt = 0; ; attempt++) {
      try { await docker(root(["sh", "-c", "! pgrep -u crybot-s2"])); break; }
      catch (error) { if (attempt >= 10) throw error; await delay(500); }
    }
    await startScreen("docker", screen(2), passwords[1]);
    await waitForScreens({ 1: "running", 2: "running" });
    await assertNotRootMarker(marker);
  });
  const cua = args => ["exec", "-u", "cua", name, "env", "-u", "VNC_PW", "HOME=/home/cua", ...args];
  await expectCommandFailure("cua sudo", cua(["sudo", "-n", "true"]), sudoDenied);
  const cuaUid = (await docker(cua(["id", "-u"]))).stdout.trim();
  await checkUsercustomize(cua, "/home/cua", cuaUid, async marker => {
    await docker(root(["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "status", "crybot-websockify"]));
    await assertNotRootMarker(marker);
  });
  await docker(root(["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "stop", "crybot-websockify"]));
  for (let attempt = 0; ; attempt++) {
    try { await docker(root(["sh", "-c", "! pgrep -u cua -f /usr/bin/websockify"])); break; }
    catch (error) { if (attempt >= 10) throw error; await delay(500); }
  }
  await docker(root(["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "start", "crybot-websockify"]));
  await tokenHandshake(port, 1);
  const runtimeTargetStat = (await docker(root(["sh", "-c", "mkdir -p /root/crybot-runtime-target; chown 0:0 /root/crybot-runtime-target; stat -c %u:%g:%a /root/crybot-runtime-target"]))).stdout.trim();
  await docker(screenIdentityArgs(screen(2), ["sh", "-c", "rm -rf \"$XDG_RUNTIME_DIR/tmp\"; ln -s /root/crybot-runtime-target \"$XDG_RUNTIME_DIR/tmp\""]));
  await docker(["restart", name], { timeout: 60_000 });
  const restartedPort = (await docker(["port", name, "6901/tcp"])).stdout.trim().split(":").at(-1);
  for (let attempt = 0; ; attempt++) {
    try {
      await docker(root(["test", "-S", "/run/crybot/supervisor.sock"]));
      break;
    } catch (error) {
      if (attempt >= 60) throw error;
      await delay(1000);
    }
  }
  const restartedRuntimeTargetStat = (await docker(root(["stat", "-c", "%u:%g:%a", "/root/crybot-runtime-target"]))).stdout.trim();
  assert.equal(restartedRuntimeTargetStat, runtimeTargetStat, `runtime tmp symlink target ownership/mode changed: ${runtimeTargetStat} -> ${restartedRuntimeTargetStat}`);
  await startScreen("docker", screen(1), passwords[0]);
  await startScreen("docker", screen(2), passwords[1]);
  await waitForReadyScreens();
  await tokenHandshake(restartedPort, 1);
  await tokenHandshake(restartedPort, 2);
  assert.doesNotMatch((await docker(root(["cat", "/var/log/supervisor/screens.log"]))).stdout, /unknown problem killing crybot-websockify|PermissionError/);
  console.log("Multi-screen smoke passed: isolated supervisor, VNC auth, token routing, UID/env/limits, stop cleanup");
} catch (error) {
  await docker(["logs", name], { inherit: true }).catch(() => {});
  await docker(root(["sh", "-c", "cat /var/log/supervisor/screens.log /var/log/supervisor/screen-*.log /var/log/supervisor/websockify*.log"]), { inherit: true }).catch(() => {});
  throw error;
} finally {
  const cleanupErrors = [];
  try {
    await docker(root(["sh", "-c", "find /home/cua/workspace -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +"]));
  } catch (error) {
    cleanupErrors.push(`workspace cleanup: ${error instanceof Error ? error.message : error}`);
  }
  try {
    await docker(["rm", "-f", name]);
  } catch (error) {
    cleanupErrors.push(`container cleanup: ${error instanceof Error ? error.message : error}`);
  }
  try {
    await docker(["image", "rm", image]);
  } catch (error) {
    cleanupErrors.push(`image cleanup: ${error instanceof Error ? error.message : error}`);
  }
  try {
    await rm(fixture, { recursive: true, force: true });
  } catch (error) {
    cleanupErrors.push(`fixture cleanup: ${error instanceof Error ? error.message : error}`);
  }
  if (cleanupErrors.length) console.warn(`Smoke cleanup warning: ${cleanupErrors.join("; ")}`);
}
