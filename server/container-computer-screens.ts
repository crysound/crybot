import { spawn } from "node:child_process";
import type { CommandRunner, ContainerRuntimeStatus, Runtime } from "./container-computer.ts";
import { augmentedPath, resolveCliSpawn } from "./env-path.ts";
import { CONTAINER, CUA_EXECUTABLE, DISPLAY, isScreenTarget, screenDisplay, screenUid, screenUser, type LocalVmTarget } from "./container-targets.ts";
import { rootContainerExecArgs, SCREENS_SUPERVISOR_CONFIG, validateScreenPackages } from "./container-screens.ts";

export function cuaExecArgs(
  args: string[],
  options: { container?: string; interactive?: boolean } = {},
): string[] {
  return [
    "exec",
    ...(options.interactive ? ["-i"] : []),
    "-u",
    "cua",
    "-e",
    "HOME=/home/cua",
    "-e",
    `DISPLAY=${DISPLAY}`,
    "-e",
    "CUA_DRIVER_INSTALL_CHANNEL=python_package",
    "-e",
    "CUA_DRIVER_RS_TELEMETRY_ENABLED=0",
    options.container ?? CONTAINER,
    CUA_EXECUTABLE,
    ...args,
  ];
}

export function screenIdentityArgs(
  target: LocalVmTarget,
  args: string[],
  options: { interactive?: boolean; workdir?: string; env?: Record<string, string> } = {},
): string[] {
  if (!isScreenTarget(target)) {
    const base = cuaExecArgs([], { container: target.containerName, interactive: options.interactive });
    base.pop();
    base.push(...args);
    if (options.workdir) base.splice(base.indexOf("-u"), 0, "-w", options.workdir);
    if (options.env) {
      const at = base.indexOf(target.containerName);
      base.splice(at, 0, ...Object.entries(options.env).flatMap(([key, value]) => ["-e", `${key}=${value}`]));
    }
    return base;
  }
  const n = target.screen;
  const env = {
    HOME: `/home/${screenUser(n)}`,
    DISPLAY: screenDisplay(n),
    XDG_RUNTIME_DIR: `/run/user/${screenUid(n)}`,
    TMPDIR: `/run/user/${screenUid(n)}/tmp`,
    CUA_DRIVER_INSTALL_CHANNEL: "python_package",
    CUA_DRIVER_RS_TELEMETRY_ENABLED: "0",
    ...options.env,
  };
  return [
    "exec",
    ...(options.interactive ? ["-i"] : []),
    "-u", screenUser(n),
    ...(options.workdir ? ["-w", options.workdir] : []),
    ...Object.entries(env).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
    target.containerName,
    "env", "-u", "VNC_PW", "prlimit", "--nproc=1500", "--",
    "/usr/local/libexec/crybot/screen-program",
    "sh", "-c", 'umask 007; exec "$@"', "crybot-screen-exec",
    ...args,
  ];
}

export function screenExecArgs(
  target: LocalVmTarget,
  args: string[],
  options: { interactive?: boolean; workdir?: string; env?: Record<string, string> } = {},
): string[] {
  return screenIdentityArgs(target, [CUA_EXECUTABLE, ...args], options);
}

async function execContainerWithInput(runtime: Runtime, args: string[], input: string): Promise<void> {
  const resolved = resolveCliSpawn(runtime, args);
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(resolved.command, resolved.args, { env: { ...process.env, PATH: augmentedPath() }, stdio: ["pipe", "ignore", "pipe"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${runtime} exec timed out after 30 seconds`));
    }, 30_000);
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("error", () => { clearTimeout(timer); reject(new Error(`${runtime} exec could not start`)); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(`${runtime} exec failed (exit ${code})`));
    });
    child.stdin.end(input);
  });
}

export async function startScreen(runtime: Runtime, target: LocalVmTarget, password: string): Promise<void> {
  if (!isScreenTarget(target)) throw new Error("startScreen requires a screen target");
  if (password.length < 8 || /[\r\n\0]/.test(password)) throw new Error("screen password requires at least 8 characters and no line breaks");
  const n = target.screen;
  const path = `/run/crybot/screens/s${n}/passwd`;
  await execContainerWithInput(runtime, rootContainerExecArgs(target.containerName, ["sh", "-c",
    `set -eu; umask 077; vncpasswd -f > ${path}.tmp; chown ${screenUser(n)}:${screenUser(n)} ${path}.tmp; chmod 0400 ${path}.tmp; mv -f ${path}.tmp ${path}; supervisorctl -c ${SCREENS_SUPERVISOR_CONFIG} start screen-s${n}:*`,
  ], { interactive: true }), `${password}\n`);
}

export type ContainerScreenState = "running" | "off" | "starting" | "stopping" | "failed";

export function createContainerScreens({ sh, containerRuntimeStatus }: {
  sh: CommandRunner;
  containerRuntimeStatus: () => Promise<ContainerRuntimeStatus>;
}) {
  async function stopScreen(runtime: Runtime, target: LocalVmTarget, runner: CommandRunner = sh): Promise<void> {
    if (!isScreenTarget(target)) throw new Error("stopScreen requires a screen target");
    let stopError: unknown;
    let cleanupError: unknown;
    try {
      await runner(runtime, rootContainerExecArgs(target.containerName, ["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "stop", `screen-s${target.screen}:*`]), 30_000);
    } catch (error) {
      stopError = error;
    }
    try {
      await runner(runtime, rootContainerExecArgs(target.containerName, ["sh", "-c",
        `setpriv --reuid=${screenUid(target.screen)} --regid=${screenUid(target.screen)} --clear-groups pkill -KILL -u ${screenUser(target.screen)} || { code=$?; [ "$code" -eq 1 ] || exit "$code"; }`]), 30_000);
    } catch (error) {
      cleanupError = error;
    }
    if (stopError && cleanupError) {
      throw new AggregateError([stopError, cleanupError], `stopScreen failed: supervisor stop: ${String(stopError)}; process cleanup: ${String(cleanupError)}`, { cause: stopError });
    }
    if (stopError) throw stopError;
    if (cleanupError) throw cleanupError;
  }

  async function screenStates(runtime: Runtime, containerName: string, runner: CommandRunner = sh): Promise<Record<number, ContainerScreenState>> {
    let stdout: string;
    try {
      ({ stdout } = await runner(runtime, rootContainerExecArgs(containerName, ["supervisorctl", "-c", SCREENS_SUPERVISOR_CONFIG, "status"]), 30_000));
    } catch (error) {
      const failure = error as { code?: number; stdout?: unknown; killed?: boolean; signal?: string };
      if (failure.code !== 3 || typeof failure.stdout !== "string" || failure.killed || failure.signal ||
        !/^screen-s[1-4]:\S+\s+[A-Z]+/m.test(failure.stdout)) throw error;
      stdout = failure.stdout;
    }
    const groups = new Map<number, string[]>();
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^screen-s([1-4]):[^\s]+\s+([A-Z]+)/);
      if (!match) continue;
      const n = Number(match[1]);
      groups.set(n, [...(groups.get(n) ?? []), match[2]!]);
    }
    const states: Record<number, ContainerScreenState> = {};
    for (const [n, programs] of groups) {
      states[n] = programs.some(state => ["FATAL", "BACKOFF", "EXITED"].includes(state)) ? "failed"
        : programs.every(state => state === "RUNNING") ? "running"
        : programs.includes("STARTING") ? "starting"
        : programs.includes("STOPPING") ? "stopping"
        : programs.every(state => state === "STOPPED") ? "off" : "failed";
    }
    return states;
  }

  async function installScreenPackages(target: LocalVmTarget, names: string[], options: { runtime?: Runtime; runner?: CommandRunner } = {}): Promise<void> {
    if (!isScreenTarget(target)) throw new Error("installScreenPackages requires a screen target");
    validateScreenPackages(names);
    const runtime = options.runtime ?? (await containerRuntimeStatus()).runtime;
    if (!runtime) throw new Error("No container runtime is available");
    await (options.runner ?? sh)(runtime, rootContainerExecArgs(target.containerName,
      ["/usr/local/sbin/crybot-pkg", ...names], { env: { CRYBOT_PACKAGE_SCREEN: `s${target.screen}` } }), 300_000);
  }

  return { stopScreen, screenStates, installScreenPackages };
}
