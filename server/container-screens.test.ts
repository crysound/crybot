import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  containerRunArgs, cuaExecArgs, screenExecArgs, screenSocket, sharedScreenTarget,
  SHARED_LOCAL_VM_TARGET, perBotLocalVmTarget, poolLocalVmTarget, type Runtime, type DesktopRunOptions,
} from "./container-computer.ts";
import { GUEST_IDS_SCRIPT_BODY, guestIdsCommand } from "./container-isolation.ts";
import {
  multiScreenInitScript, screensSupervisorConf, screenSupervisorConf, vncTokenFile,
  screenProcessScript, crybotPkgScript, validateScreenPackages, screensLayoutOf, SCREENS_FALLBACK_FILE,
} from "./container-screens.ts";

const options: DesktopRunOptions = { platform: "linux", resources: { memoryGb: 8, cpus: 3 }, hostUser: null };

describe("container screen layout", () => {
  it("keeps all 108 single layout commands byte-for-byte compatible", () => {
    const cases = JSON.parse(readFileSync(new URL("./testing/fixtures/container-single-args.json", import.meta.url), "utf8")) as
      Array<{ runtime: Runtime; options: DesktopRunOptions; args: string[] }>;
    expect(cases).toHaveLength(108);
    for (const fixture of cases) {
      const target = { ...SHARED_LOCAL_VM_TARGET, workspaceDir: "/tmp/crybot-single-fixture" };
      expect(containerRunArgs(fixture.runtime, "fixture-password", target, fixture.options)).toEqual(fixture.args);
      expect(containerRunArgs(fixture.runtime, "fixture-password", target, { ...fixture.options, screensLayout: "single" })).toEqual(fixture.args);
    }
    expect(cuaExecArgs(["mcp", "--socket", "/run/user/1000/crybot-cua.sock"], { interactive: true })).toEqual([
      "exec", "-i", "-u", "cua", "-e", "HOME=/home/cua", "-e", "DISPLAY=:1",
      "-e", "CUA_DRIVER_INSTALL_CHANNEL=python_package", "-e", "CUA_DRIVER_RS_TELEMETRY_ENABLED=0",
      "crybot-computer", "/usr/local/libexec/crybot/cua-driver", "mcp", "--socket", "/run/user/1000/crybot-cua.sock",
    ]);
  });

  it("uses the screen identity, display and private socket for MCP", () => {
    const args = screenExecArgs(sharedScreenTarget(2), ["mcp", "--socket", screenSocket(2)], { interactive: true });
    expect(args).toEqual([
      "exec", "-i", "-u", "crybot-s2", "-e", "HOME=/home/crybot-s2", "-e", "DISPLAY=:2",
      "-e", "XDG_RUNTIME_DIR=/run/user/61002", "-e", "TMPDIR=/run/user/61002/tmp",
      "-e", "CUA_DRIVER_INSTALL_CHANNEL=python_package", "-e", "CUA_DRIVER_RS_TELEMETRY_ENABLED=0",
      "crybot-computer", "env", "-u", "VNC_PW", "prlimit", "--nproc=1500", "--",
      "sh", "-c", 'umask 007; exec "$@"', "crybot-screen-exec",
      "/usr/local/libexec/crybot/cua-driver", "mcp", "--socket", "/run/user/61002/crybot-cua.sock",
    ]);
  });

  it.each(["docker", "podman"] as const)("keeps %s capabilities and published ports identical", runtime => {
    const single = containerRunArgs(runtime, "fixture", SHARED_LOCAL_VM_TARGET, options);
    const multi = containerRunArgs(runtime, "fixture", SHARED_LOCAL_VM_TARGET, { ...options, screensLayout: "multi" });
    const flags = (args: string[]) => args.flatMap((arg, index) => ["--cap-drop", "--cap-add", "-p", "--security-opt"].includes(arg) ? [arg, args[index + 1]] : []);
    expect(flags(multi)).toEqual(flags(single));
    expect(multi).toContain("com.crybot.screens-layout=multi");
    expect(multi).toContain("2g");
    expect(multi).toContain("8192");
  });

  it("rejects multi layout outside the shared container", () => {
    for (const target of [perBotLocalVmTarget("fixture"), poolLocalVmTarget(1)]) {
      expect(() => containerRunArgs("docker", "fixture", target, { ...options, screensLayout: "multi" })).toThrow("shared container");
    }
  });

  it("keeps Apple on single layout and records Docker fallback", () => {
    expect(containerRunArgs("container", "fixture", SHARED_LOCAL_VM_TARGET, { ...options, screensLayout: "multi" }))
      .toEqual(containerRunArgs("container", "fixture", SHARED_LOCAL_VM_TARGET, options));
    expect(screensLayoutOf({ "com.crybot.screens-layout": "multi" }, true)).toBe("single");
    expect(screensLayoutOf(undefined)).toBe("single");
    expect(multiScreenInitScript({ maxScreens: 4 })).toContain(`touch ${SCREENS_FALLBACK_FILE}`);
  });

  it("generates a standalone supervisor with only the four screen groups and token proxy", () => {
    const conf = screensSupervisorConf(4);
    expect(conf.match(/\[group:screen-s\d\]/g)).toHaveLength(4);
    for (const section of ["supervisord", "unix_http_server", "rpcinterface:supervisor", "supervisorctl"]) expect(conf).toContain(`[${section}]`);
    for (const program of ["vncserver", "novnc", "dbus", "crybot-cua-driver"]) expect(conf).not.toContain(`[program:${program}]`);
    expect(conf).not.toContain("[include]");
    expect(conf).toContain("--token-source /etc/crybot/vnc-tokens 6901\nuser=cua");
    expect(conf).not.toContain("127.0.0.1:5901");
    expect(vncTokenFile(2)).toBe("s1: 127.0.0.1:5901\ns2: 127.0.0.1:5902\n");
  });

  it("sets process limits, desktop environment and group shutdown on every screen program", () => {
    const conf = screenSupervisorConf(2);
    expect(conf.match(/prlimit --nproc=1500 --/g)).toHaveLength(4);
    expect(conf.match(/stopasgroup=true\nkillasgroup=true/g)).toHaveLength(4);
    expect(conf).toContain("-localhost yes");
    expect(conf).toContain("-geometry 1280x900 -depth 24");
    expect(conf).toContain("screen-wait-display env CUA_DRIVER_BROWSER_NO_SANDBOX=1");
    for (const setting of ["CUA_DRIVER_WINDOW_CHANGE_TIMEOUT_MS=200", "NO_COLOR=1", "--cursor-reduced-motion on"]) expect(conf).toContain(setting);
  });

  it("keeps signal supervision at root and permanently drops the desktop child identity", () => {
    const script = screenProcessScript();
    expect(script.startsWith("#!/usr/bin/python3 -I\n")).toBe(true);
    expect(script).toContain("os.setgroups([])\n    os.setgid(user.pw_gid)\n    os.setuid(user.pw_uid)");
    expect(script).toContain("os.seteuid(user.pw_uid)\n        os.killpg(pid, signum)");
    expect(script).toContain("finally:\n        os.seteuid(0)");
    expect(screenSupervisorConf(2)).toContain("screen-process crybot-s2 /usr/bin/Xvnc");
    expect(screenSupervisorConf(2)).not.toContain("environment=HOME=");
    execFileSync("python3", ["-c", "import sys; compile(sys.argv[1], 'screen-process', 'exec')", script], { stdio: "ignore", timeout: 3000 });
  });

  it("reuses ID migration and creates private runtime parents before children", () => {
    const script = multiScreenInitScript({ maxScreens: 4 });
    expect(script).toContain(GUEST_IDS_SCRIPT_BODY);
    expect(guestIdsCommand({ uid: 1234, gid: 2345 })[2]).toBe(`${GUEST_IDS_SCRIPT_BODY}\nexec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf`);
    expect(script).toContain("rm -f /etc/sudoers.d/cua");
    expect(script).not.toContain("NOPASSWD");
    expect(script).not.toContain("ulimit -u");
    expect(script).not.toContain("/proc/$(id");
    expect(script).toContain("choom -n 500 --");
    expect(script).toContain("echo 500 > /proc/self/oom_score_adj\nexec env -u VNC_PW");
    for (let n = 1; n <= 4; n++) {
      expect(script).toContain(`groupadd -g ${61000 + n} crybot-s${n}`);
      expect(script).toContain(`useradd -u ${61000 + n} -g ${61000 + n}`);
      expect(script).toContain(`rm -rf /run/user/${61000 + n}\ninstall -d -o crybot-s${n} -g crybot-s${n} -m 0700 /run/user/${61000 + n}\ninstall -d -o crybot-s${n} -g crybot-s${n} -m 0700 /run/user/${61000 + n}/tmp`);
    }
    execFileSync("sh", ["-n", "-c", script], { timeout: 3000, stdio: "ignore" });
  });

  it.each(["-o", ".", "+x", "sudo-", "vim+", "", "vim;id", "a\nb"])("rejects unsafe package %j in server and shell", name => {
    expect(() => validateScreenPackages([name])).toThrow("invalid package");
    const script = crybotPkgScript().replace('[ "$(id -u)" = 0 ]', '[ 0 = 0 ]');
    const result = spawnSync("sh", ["-c", script, "fixture", name], { timeout: 3000, env: { ...process.env, CRYBOT_PACKAGE_SCREEN: "s2" } });
    expect(result.status).toBe(2);
  });

  it.each(["python3-pip", "g++"])("accepts %s in the shell validator", name => {
    const validation = crybotPkgScript().split("\numask 077")[0]!.replace('[ "$(id -u)" = 0 ]', '[ 0 = 0 ]');
    expect(spawnSync("sh", ["-c", validation, "fixture", name], {
      stdio: "ignore", env: { ...process.env, CRYBOT_PACKAGE_SCREEN: "s2" }, timeout: 3000,
    }).status).toBe(0);
  });

  it("records failed installations in a protected audit file", () => {
    const dir = mkdtempSync(join(tmpdir(), "crybot-package-audit-"));
    try {
      writeFileSync(join(dir, "apt-get"), "#!/bin/sh\nexit 7\n", { mode: 0o700 });
      const script = crybotPkgScript()
        .replace('[ "$(id -u)" = 0 ]', '[ 0 = 0 ]')
        .replaceAll("/var/log/crybot", join(dir, "audit"))
        .replace("-o root -g root ", "");
      const result = spawnSync("sh", ["-c", script, "fixture", "python3-pip", "g++"], {
        stdio: "ignore", env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, CRYBOT_PACKAGE_SCREEN: "s2" }, timeout: 3000,
      });
      expect(result.status).toBe(7);
      expect(readFileSync(join(dir, "audit/packages.log"), "utf8")).toMatch(/^\d{4}-.*Z screen=s2 packages=python3-pip g\+\+ result=7\n$/);
      expect(statSync(join(dir, "audit")).mode & 0o777).toBe(0o700);
      expect(statSync(join(dir, "audit/packages.log")).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("allows normal and C++ package names and caps request size", () => {
    expect(() => validateScreenPackages(["python3-pip", "g++"])).not.toThrow();
    expect(() => validateScreenPackages([])).toThrow();
    expect(() => validateScreenPackages(Array(21).fill("vim"))).toThrow();
    expect(crybotPkgScript()).toContain('install -d -o root -g root -m 0700 /var/log/crybot');
    expect(crybotPkgScript()).toContain('screen=%s packages=%s result=%s');
  });
});
