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
      else reject(Object.assign(new Error(`docker exited ${code}: ${stderr}`), { code, stdout }));
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
import ctypes, ctypes.util, json, socket, struct, sys
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
def authenticate(port, password):
    with socket.create_connection(('127.0.0.1', port), 10) as sock:
        sock.settimeout(10)
        assert read(sock, 12) == b'RFB 003.008\n'
        sock.sendall(b'RFB 003.008\n')
        types = read(sock, read(sock, 1)[0])
        assert 2 in types and 1 not in types, 'VNC password auth required'
        sock.sendall(b'\x02')
        challenge = read(sock, 16)
        key = bytes(int(f'{b:08b}'[::-1], 2) for b in password.encode()[:8].ljust(8, b'\0'))
        schedule = (ctypes.c_ulong * 32)()
        crypto.DES_set_key_unchecked(ctypes.create_string_buffer(key), schedule)
        response = b''
        for offset in (0, 8):
            block = ctypes.create_string_buffer(8)
            crypto.DES_ecb_encrypt(ctypes.create_string_buffer(challenge[offset:offset+8]), block, schedule, 1)
            response += block.raw
        sock.sendall(response)
        return struct.unpack('!I', read(sock, 4))[0] == 0
for n, password in enumerate(passwords, 1):
    assert authenticate(5900+n, password), f's{n} correct password refused'
    assert not authenticate(5900+n, 'wrong-pw'), f's{n} wrong password accepted'
print('RFB authentication passed for s1 and s2 (correct and wrong passwords)')
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
  assert.equal((await docker(screenIdentityArgs(screen(2), ["id", "-u"]))).stdout.trim(), "61002");
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
  }
  await docker(screenIdentityArgs(screen(2), ["sh", "-c", "! test -r /home/crybot-s1 && ! test -r /home/cua/workspace/screens/s1 && ! test -r /run/user/61001/crybot-cua.sock"]));
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
  await docker(root(["sh", "-c", "mkdir -p /root/crybot-runtime-target; chown 0:0 /root/crybot-runtime-target; stat -c %u:%g /root/crybot-runtime-target"]));
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
  await docker(root(["sh", "-c", "test \"$(stat -c %u:%g /root/crybot-runtime-target)\" = 0:0"]));
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
