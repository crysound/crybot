import { GUEST_IDS_SCRIPT_BODY } from "./container-isolation.ts";

export const SCREENS_LAYOUT_LABEL = "com.crybot.screens-layout";
export const SCREENS_FALLBACK_FILE = "/run/crybot/screens-layout-single";
export const SCREENS_SUPERVISOR_CONFIG = "/etc/crybot/supervisord.conf";
export const SCREEN_DRIVER_ENV = "CUA_DRIVER_BROWSER_NO_SANDBOX=1 CUA_DRIVER_INSTALL_CHANNEL=python_package CUA_DRIVER_RS_TELEMETRY_ENABLED=0 CUA_DRIVER_WINDOW_CHANGE_TIMEOUT_MS=200 NO_COLOR=1";
export const SCREEN_DRIVER_OPTIONS = "--permission-mode standard --grant existing-profile --cursor-reduced-motion on";
const ROOT_PYTHON_ENV = ["HOME=/root", "PYTHONNOUSERSITE=1"];

export function rootContainerExecArgs(containerName: string, args: string[], opts: { interactive?: boolean; env?: Record<string, string> } = {}): string[] {
  return ["exec", ...(opts.interactive ? ["-i"] : []), "-u", "0",
    ...Object.entries(opts.env ?? {}).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
    containerName, "env", "-u", "VNC_PW", ...ROOT_PYTHON_ENV, ...args];
}

export function screensLayoutOf(labels: Record<string, string> | undefined, fallback = false): "single" | "multi" {
  return !fallback && labels?.[SCREENS_LAYOUT_LABEL] === "multi" ? "multi" : "single";
}

function screenNumber(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 4) throw new RangeError("screen must be between 1 and 4");
  return n;
}

export function screenSupervisorConf(n: number): string {
  screenNumber(n);
  const user = `crybot-s${n}`;
  const runtime = `/run/user/${61000 + n}`;
  const programs = {
    x: `/usr/bin/Xvnc :${n} -rfbport ${5900 + n} -localhost yes -rfbauth /run/crybot/screens/s${n}/passwd -geometry 1280x900 -depth 24`,
    dbus: `/usr/bin/dbus-daemon --session --nofork --address=unix:path=${runtime}/bus`,
    session: "/usr/local/libexec/crybot/screen-wait-display /usr/bin/startxfce4",
    cua: `/usr/local/libexec/crybot/screen-wait-display env ${SCREEN_DRIVER_ENV} /usr/local/libexec/crybot/cua-driver serve --socket ${runtime}/crybot-cua.sock ${SCREEN_DRIVER_OPTIONS}`,
  };
  return `[group:screen-s${n}]\nprograms=${Object.keys(programs).map(name => `screen-s${n}-${name}`).join(",")}\n\n` +
    Object.entries(programs).map(([name, command]) => `[program:screen-s${n}-${name}]
command=prlimit --nproc=1500 -- /usr/local/libexec/crybot/screen-program /usr/local/libexec/crybot/screen-process ${user} ${command}
user=root
umask=007
stdout_logfile=/var/log/supervisor/screen-s${n}-${name}.log
stderr_logfile=/var/log/supervisor/screen-s${n}-${name}.error.log
autostart=false
autorestart=true
stopasgroup=true
killasgroup=true
`).join("\n");
}

export function screensSupervisorConf(maxScreens: number): string {
  screenNumber(maxScreens);
  return `[supervisord]
nodaemon=true
logfile=/var/log/supervisor/screens.log
pidfile=/run/crybot/supervisord.pid

[unix_http_server]
file=/run/crybot/supervisor.sock
chmod=0700

[rpcinterface:supervisor]
supervisor.rpcinterface_factory=supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///run/crybot/supervisor.sock

${Array.from({ length: maxScreens }, (_, i) => screenSupervisorConf(i + 1)).join("\n")}
[program:crybot-websockify]
command=/usr/local/libexec/crybot/screen-process cua /usr/bin/websockify --web /usr/share/novnc --token-plugin TokenFile --token-source /etc/crybot/vnc-tokens 6901
user=root
stdout_logfile=/var/log/supervisor/websockify.log
stderr_logfile=/var/log/supervisor/websockify.error.log
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
`;
}

export function vncTokenFile(maxScreens: number): string {
  screenNumber(maxScreens);
  return Array.from({ length: maxScreens }, (_, i) => `s${i + 1}: 127.0.0.1:${5901 + i}`).join("\n") + "\n";
}

export function validateScreenPackages(names: string[]): void {
  if (!names.length || names.length > 20 || names.some(name =>
    !/^[a-z0-9][a-z0-9+.-]*$/.test(name) || (name !== "g++" && /[-+]$/.test(name)))) {
    throw new Error("invalid package names (1–20 required)");
  }
}

export function crybotPkgScript(): string {
  return `#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo 'root required' >&2; exit 1; }
[ "$#" -ge 1 ] && [ "$#" -le 20 ] || exit 2
case "\${CRYBOT_PACKAGE_SCREEN-}" in s[1-4]) ;; *) exit 2 ;; esac
for name do
  case "$name" in
    ''|[!a-z0-9]*|*[!a-z0-9+.-]*|*-) exit 2 ;;
    g++) ;;
    *+) exit 2 ;;
  esac
done
umask 077
install -d -o root -g root -m 0700 /var/log/crybot
log=/var/log/crybot/packages.log
if env -u VNC_PW ${ROOT_PYTHON_ENV.join(" ")} apt-get update; then
  printf '%s operation=update screen=%s result=0\\n' "$(date -u +%FT%TZ)" "$CRYBOT_PACKAGE_SCREEN" >> "$log"
else
  result=$?
  printf '%s operation=update screen=%s result=%s\\n' "$(date -u +%FT%TZ)" "$CRYBOT_PACKAGE_SCREEN" "$result" >> "$log"
  exit "$result"
fi
if env -u VNC_PW ${ROOT_PYTHON_ENV.join(" ")} apt-get install -y --no-install-recommends -- "$@"; then
  result=0
else
  result=$?
fi
printf '%s operation=install screen=%s packages=%s result=%s\\n' "$(date -u +%FT%TZ)" "$CRYBOT_PACKAGE_SCREEN" "$*" "$result" >> "$log"
exit "$result"
`;
}

// Linux kill(2) requires CAP_KILL across UIDs; the fixed desktop capability set omits it.
export function screenProcessScript(): string {
  return `#!/usr/bin/python3 -I
import ctypes
import os
import pwd
import signal
import sys

if os.geteuid() != 0:
    sys.exit("screen-process requires root")
user = pwd.getpwnam(sys.argv[1])
parent_pid = os.getpid()
libc = ctypes.CDLL(None, use_errno=True)
libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong]
libc.prctl.restype = ctypes.c_int
PR_SET_PDEATHSIG = 1
ready_read, ready_write = os.pipe()
pid = os.fork()
if pid == 0:
    os.close(ready_read)
    os.setsid()
    os.setgroups([])
    os.setgid(user.pw_gid)
    os.setuid(user.pw_uid)
    # Linux clears the parent-death signal on setuid; arm it after dropping privileges.
    if libc.prctl(PR_SET_PDEATHSIG, signal.SIGKILL, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "prctl(PR_SET_PDEATHSIG) failed")
    if os.getppid() != parent_pid:
        os.kill(os.getpid(), signal.SIGKILL)
    os.environ.update({
        "HOME": user.pw_dir,
        "USER": user.pw_name,
        "LOGNAME": user.pw_name,
    })
    if user.pw_name.startswith("crybot-s"):
        suffix = user.pw_name.rsplit("-s", 1)[-1]
        runtime = f"/run/user/{user.pw_uid}"
        os.environ.update({
            "DISPLAY": f":{suffix}",
            "XDG_RUNTIME_DIR": runtime,
            "TMPDIR": f"{runtime}/tmp",
            "DBUS_SESSION_BUS_ADDRESS": f"unix:path={runtime}/bus",
        })
    os.write(ready_write, b"1")
    os.close(ready_write)
    os.execvp(sys.argv[2], sys.argv[2:])
os.close(ready_write)

def forward(signum, frame):
    try:
        os.seteuid(user.pw_uid)
        os.killpg(pid, signum)
    except ProcessLookupError:
        pass
    except OSError as error:
        print(f"screen-process could not forward signal {signum}: {error}", file=sys.stderr, flush=True)
    finally:
        os.seteuid(0)

os.read(ready_read, 1)
os.close(ready_read)
for signum in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
    signal.signal(signum, forward)
_, status = os.waitpid(pid, 0)
code = os.waitstatus_to_exitcode(status)
sys.exit(code if code >= 0 else 128 - code)
`;
}

export function multiScreenInitScript(opts: { maxScreens: number }): string {
  const max = screenNumber(opts.maxScreens);
  return `#!/bin/sh
set -eu
if [ "$#" -eq 2 ]; then
${GUEST_IDS_SCRIPT_BODY}
fi
install -d -m 0755 /run/crybot
if ! command -v useradd >/dev/null 2>&1 || ! command -v supervisorctl >/dev/null 2>&1; then
  touch ${SCREENS_FALLBACK_FILE}
  exec env ${ROOT_PYTHON_ENV.join(" ")} /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
fi
rm -f ${SCREENS_FALLBACK_FILE}
for path in /home/cua /home/cua/workspace /home/cua/workspace/screens /home/cua/.vnc; do
  if [ -L "$path" ]; then echo "refusing symlink path: $path" >&2; exit 1; fi
done
mkdir -p /home/cua/workspace/screens
chmod 0711 /home/cua /home/cua/workspace /home/cua/workspace/screens
if [ -d /home/cua/.vnc ]; then chmod 0700 /home/cua/.vnc; fi
rm -f /etc/sudoers.d/cua
install -d -m 0755 /usr/local/sbin /usr/local/libexec/crybot /run/crybot/screens /etc/crybot /var/log/supervisor
cat > /usr/local/sbin/crybot-pkg <<'PKG'
${crybotPkgScript().trim()}
PKG
chmod 0755 /usr/local/sbin/crybot-pkg
cat > /usr/local/libexec/crybot/screen-program <<'PROGRAM'
#!/bin/sh
set -eu
umask 007
if command -v choom >/dev/null 2>&1; then
  exec env -u VNC_PW choom -n 500 -- "$@"
fi
echo 500 > /proc/self/oom_score_adj
exec env -u VNC_PW "$@"
PROGRAM
cat > /usr/local/libexec/crybot/screen-process <<'PROCESS'
${screenProcessScript().trim()}
PROCESS
cat > /usr/local/libexec/crybot/screen-wait-display <<'WAIT'
#!/bin/sh
set -eu
attempt=0
until xset q >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 45 ]; then echo "X display $DISPLAY did not become ready within 45 seconds" >&2; exit 1; fi
  sleep 1
done
exec "$@"
WAIT
chmod 0755 /usr/local/libexec/crybot/screen-program /usr/local/libexec/crybot/screen-wait-display /usr/local/libexec/crybot/screen-process
cat > /etc/crybot/vnc-tokens <<'TOKENS'
${vncTokenFile(max).trimEnd()}
TOKENS
chmod 0644 /etc/crybot/vnc-tokens
${Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const uid = 61000 + n;
    const user = `crybot-s${n}`;
    return `getent group ${user} >/dev/null || groupadd -g ${uid} ${user}
id -u ${user} >/dev/null 2>&1 || useradd -u ${uid} -g ${uid} --create-home --shell /bin/sh ${user}
[ "$(id -u ${user}):$(id -g ${user})" = "${uid}:${uid}" ] || exit 1
chmod 0700 /home/${user}
if [ -L /home/cua/workspace/screens/s${n} ]; then rm -f /home/cua/workspace/screens/s${n}; fi
install -d -o ${user} -g cua -m 2770 /home/cua/workspace/screens/s${n}
rm -rf /run/user/${uid}
install -d -o ${user} -g ${user} -m 0700 /run/user/${uid}
install -d -o ${user} -g ${user} -m 0700 /run/user/${uid}/tmp
if [ -L /run/crybot/screens/s${n} ]; then rm -f /run/crybot/screens/s${n}; fi
install -d -o root -g root -m 0711 /run/crybot/screens/s${n}
rm -rf /home/${user}/workspace
ln -s /home/cua/workspace/screens/s${n} /home/${user}/workspace
`;
  }).join("")}
cat > ${SCREENS_SUPERVISOR_CONFIG} <<'CONF'
${screensSupervisorConf(max)}
CONF
chown root:root ${SCREENS_SUPERVISOR_CONFIG}
chmod 0644 ${SCREENS_SUPERVISOR_CONFIG}
exec env -u VNC_PW ${ROOT_PYTHON_ENV.join(" ")} /usr/bin/supervisord -c ${SCREENS_SUPERVISOR_CONFIG}
`;
}
