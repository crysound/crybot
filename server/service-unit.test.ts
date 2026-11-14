import { describe, expect, it } from "vitest";

import {
  checkSentinelInstall, launchdPlist, sentinelCommand, sentinelLaunchdPlist, sentinelServicePlan, sentinelSystemdService, sentinelSystemdTimer,
  sentinelUnitCommand, serviceCommand, servicePlan, shippedSentinelCli, systemdUnit, unstableInstallWarning, type ServiceSpec,
} from "./service-unit.ts";

const spec: ServiceSpec = {
  node: "/usr/bin/node",
  script: "/usr/lib/node_modules/crybot/cli.js",
  serveArgs: ["--port", "8799", "--data-dir", "/home/bot/.crybot", "--domain", "bot.example.com", "--no-pair"],
  dataDir: "/home/bot/.crybot",
  user: "bot",
  home: "/home/bot",
  bindsLowPorts: true,
  label: "agentada",
};

describe("service units", () => {
  it("runs the same serve command, with strip-types only for a checkout", () => {
    expect(serviceCommand(spec)).toEqual(["/usr/bin/node", "/usr/lib/node_modules/crybot/cli.js", "serve", ...spec.serveArgs]);
    expect(serviceCommand({ ...spec, script: "/srv/CryBot/server/crybot.ts" })[1]).toBe("--experimental-strip-types");
  });

  it("renders a systemd unit that restarts, runs as the user, and grants low ports only for --domain", () => {
    const unit = systemdUnit(spec);
    expect(unit).toContain("Description=Cry Bot (agentada)");
    expect(unit).toContain("User=bot");
    expect(unit).toContain("Environment=CRYBOT_DATA_DIR=/home/bot/.crybot");
    expect(unit).toContain("ExecStart=/usr/bin/node /usr/lib/node_modules/crybot/cli.js serve --port 8799 --data-dir /home/bot/.crybot --domain bot.example.com --no-pair");
    expect(unit).toContain("Restart=always");
    expect(unit).toContain("AmbientCapabilities=CAP_NET_BIND_SERVICE");
    expect(unit).toContain("WantedBy=multi-user.target");
    const local = systemdUnit({ ...spec, bindsLowPorts: false, serveArgs: ["--port", "8799", "--data-dir", "/home/bot/.crybot"] });
    expect(local).not.toContain("CAP_NET_BIND_SERVICE");
    expect(systemdUnit({ ...spec, dataDir: "/home/bot/My Data", serveArgs: ["--data-dir", "/home/bot/My Data"] })).toContain('ExecStart=/usr/bin/node /usr/lib/node_modules/crybot/cli.js serve --data-dir "/home/bot/My Data"');
  });

  it("renders a launchd agent that keeps the server alive and logs under the data dir", () => {
    const plist = launchdPlist({ ...spec, home: "/Users/bot", dataDir: "/Users/bot/.crybot" });
    expect(plist).toContain("<string>com.crybot.serve</string>");
    expect(plist).toContain("<string>/usr/bin/node</string>");
    expect(plist).toContain("<string>serve</string>");
    expect(plist).toContain("<string>bot.example.com</string>");
    expect(plist).toContain("<key>KeepAlive</key>");
    expect(plist).toContain("/Users/bot/.crybot/logs/service.log");
    expect(launchdPlist({ ...spec, serveArgs: ["--label", "a & b <c>"] })).toContain("<string>a &amp; b &lt;c&gt;</string>");
  });

  it("refuses to point a service at an npx cache, and knows where each platform's file goes", () => {
    expect(unstableInstallWarning("/home/bot/.npm/_npx/abc123/node_modules/crybot/cli.js")).toMatch(/npm install -g crybot/);
    expect(unstableInstallWarning("/usr/lib/node_modules/crybot/cli.js")).toBeNull();
    const linux = servicePlan("linux", "/home/bot/.crybot");
    expect(linux?.installed).toBe("/etc/systemd/system/crybot.service");
    expect(linux?.activate.join("\n")).toContain("systemctl enable --now crybot");
    const mac = servicePlan("darwin", "/Users/bot/.crybot", "/Users/bot");
    expect(mac?.installed).toBe("/Users/bot/Library/LaunchAgents/com.crybot.serve.plist");
    expect(mac?.activate.join("\n")).toContain("launchctl bootstrap gui/$(id -u)");
    expect(servicePlan("win32", "C:\\x")).toBeNull();
  });

  it("renders Sentinel as a launchd agent on an interval, under its own label, logging outside the data dir", () => {
    const out = "/Users/bot/Library/Application Support/crybot-sentinel";
    const sentinel = { node: "/usr/bin/node", script: "/usr/lib/node_modules/crybot/cli.js", dataDir: "/Users/bot/.crybot", home: "/Users/bot", out };
    expect(sentinelCommand(sentinel)).toEqual(["/usr/bin/node", "/usr/lib/node_modules/crybot/cli.js", "sentinel", "--once", "--data-dir", "/Users/bot/.crybot", "--out", out]);
    expect(sentinelCommand({ ...sentinel, script: "/srv/CryBot/server/crybot.ts" })[1]).toBe("--experimental-strip-types");
    const plist = sentinelLaunchdPlist(sentinel);
    expect(plist).toContain("<string>com.crybot.sentinel</string>");
    expect(plist).toContain("<key>StartInterval</key>\n\t<integer>120</integer>");
    expect(plist).toContain("<string>sentinel</string>");
    expect(plist).not.toContain("KeepAlive");
    expect(plist).toContain(`<string>${out}/sentinel.log</string>`);
    expect(plist).not.toContain(".crybot/logs");
    const mac = sentinelServicePlan("darwin", out, "/Users/bot");
    expect(mac?.files).toEqual([{ name: "com.crybot.sentinel.plist", installed: "/Users/bot/Library/LaunchAgents/com.crybot.sentinel.plist" }]);
    // a path with a space is one argument in the printed commands
    expect(mac?.activate[0]).toBe("mkdir -p /Users/bot/Library/LaunchAgents && cp '/Users/bot/Library/Application Support/crybot-sentinel/com.crybot.sentinel.plist' /Users/bot/Library/LaunchAgents/com.crybot.sentinel.plist");
    expect(mac?.deactivate[0]).toBe("launchctl bootout gui/$(id -u)/com.crybot.sentinel");
  });

  it("renders Sentinel as a systemd user timer, with no root", () => {
    const sentinel = { node: "/usr/bin/node", script: "/usr/lib/node_modules/crybot/cli.js", dataDir: "/home/bot/My Data", home: "/home/bot", out: "/home/bot/.local/state/crybot-sentinel" };
    const unit = sentinelSystemdService(sentinel);
    expect(unit).toContain("Type=oneshot");
    expect(unit).toContain('ExecStart=/usr/bin/node /usr/lib/node_modules/crybot/cli.js sentinel --once --data-dir "/home/bot/My Data" --out /home/bot/.local/state/crybot-sentinel');
    expect(unit).not.toContain("User=");
    expect(sentinelSystemdTimer()).toContain("OnUnitActiveSec=120s");
    expect(sentinelSystemdTimer()).toContain("WantedBy=timers.target");
    const linux = sentinelServicePlan("linux", sentinel.out, "/home/bot");
    expect(linux?.files.map((file) => file.installed)).toEqual(["/home/bot/.config/systemd/user/crybot-sentinel.service", "/home/bot/.config/systemd/user/crybot-sentinel.timer"]);
    expect(linux?.activate[0]).toContain("cp /home/bot/.local/state/crybot-sentinel/crybot-sentinel.service");
    expect(linux?.activate.join("\n")).toContain("systemctl --user enable --now crybot-sentinel.timer");
    expect(linux?.activate.join("\n")).not.toContain("sudo");
    expect(sentinelServicePlan("win32", "C:\\x")).toBeNull();
  });

  it("finds the CLI the installed desktop app ships, and runs it as Node", () => {
    const app = "/Applications/CryBot.app/Contents";
    const present = new Set([`${app}/MacOS/Cry Bot`, `${app}/Resources/server/crybot.js`]);
    expect(shippedSentinelCli("darwin", "/Users/bot", (path) => present.has(path))).toEqual({ node: `${app}/MacOS/Cry Bot`, script: `${app}/Resources/server/crybot.js` });
    const user = "/Users/bot/Applications/CryBot.app/Contents";
    expect(shippedSentinelCli("darwin", "/Users/bot", (path) => path.startsWith(user))?.script).toBe(`${user}/Resources/server/crybot.js`);
    expect(shippedSentinelCli("linux", "/home/bot", (path) => path.startsWith("/opt/CryBot/"))).toEqual({ node: "/opt/CryBot/crybot", script: "/opt/CryBot/resources/server/crybot.js" });
    // an app with its script missing, or one released before Sentinel, is no CLI for it
    expect(shippedSentinelCli("darwin", "/Users/bot", (path) => path.endsWith("MacOS/Cry Bot"))).toBeNull();
    expect(shippedSentinelCli("darwin", "/Users/bot", (path) => present.has(path), () => false)).toBeNull();
    expect(shippedSentinelCli("win32", "C:\\Users\\bot", () => true)).toBeNull();

    const spec = { node: `${app}/MacOS/Cry Bot`, script: `${app}/Resources/server/crybot.js`, dataDir: "/Users/bot/.crybot", home: "/Users/bot", out: "/tmp/s", electronRunAsNode: true };
    expect(sentinelLaunchdPlist(spec)).toContain("<key>ELECTRON_RUN_AS_NODE</key>\n\t\t<string>1</string>");
    expect(sentinelSystemdService(spec)).toContain("Environment=ELECTRON_RUN_AS_NODE=1");
    expect(sentinelLaunchdPlist({ ...spec, electronRunAsNode: false })).not.toContain("ELECTRON_RUN_AS_NODE");
  });

  it("keeps every path one quoted value in the systemd unit, and refuses one no unit can hold", () => {
    const spec = { node: "/usr/bin/node", script: "/srv/cry/cli.js", dataDir: "/home/bot/100% $HOME\\", home: "/home/my bot", out: "/home/my bot/.local/state/crybot-sentinel" };
    const unit = sentinelSystemdService(spec);
    expect(unit).toContain('Environment="HOME=/home/my bot"');
    // % is no specifier, $ no variable, and the trailing backslash no continuation
    expect(unit).toContain('"/home/bot/100%% $$HOME\\\\"');
    expect(sentinelUnitCommand(unit)).toEqual({ node: "/usr/bin/node", script: "/srv/cry/cli.js" });
    expect(sentinelUnitCommand(sentinelSystemdService({ ...spec, script: "/srv/100% $x/cli.js" }))?.script).toBe("/srv/100% $x/cli.js");
    for (const bad of ["/home/bot\n[Service]\nExecStartPre=/bin/true", "/home/bot\r", "/home/\0bot"]) {
      expect(() => sentinelSystemdService({ ...spec, home: bad })).toThrow(/line break or NUL/);
      expect(() => sentinelLaunchdPlist({ ...spec, dataDir: bad })).toThrow(/line break or NUL/);
    }
  });

  it("reads back what an installed unit runs, and calls it stale when either path is gone", () => {
    const spec = { node: "/opt/node & co/bin/node", script: "/srv/cry/cli.js", dataDir: "/home/bot/My Data", home: "/home/bot", out: "/home/bot/.local/state/crybot-sentinel" };
    expect(sentinelUnitCommand(sentinelLaunchdPlist(spec))).toEqual({ node: "/opt/node & co/bin/node", script: "/srv/cry/cli.js" });
    expect(sentinelUnitCommand(sentinelSystemdService(spec))).toEqual({ node: "/opt/node & co/bin/node", script: "/srv/cry/cli.js" });
    expect(sentinelUnitCommand("[Service]\nType=oneshot\n")).toBeNull();

    const unit = "/home/bot/.config/systemd/user/crybot-sentinel.service";
    const timer = "/home/bot/.config/systemd/user/crybot-sentinel.timer";
    const files = new Map([[unit, sentinelSystemdService(spec)]]);
    const fs = (present: string[]) => ({ exists: (path: string) => files.has(path) || present.includes(path), read: (path: string) => files.get(path)! });
    expect(checkSentinelInstall("linux", "/home/bot", fs([spec.node, spec.script, timer]))).toMatchObject({ status: "ok", unit });
    expect(checkSentinelInstall("linux", "/home/bot", fs([spec.node, timer]))).toMatchObject({ status: "stale", missing: ["/srv/cry/cli.js"] });
    // the service without its timer never runs
    expect(checkSentinelInstall("linux", "/home/bot", fs([spec.node, spec.script]))).toMatchObject({ status: "stale", missing: [timer] });
    expect(checkSentinelInstall("darwin", "/Users/bot", fs([]))).toEqual({ status: "not_installed", unit: "/Users/bot/Library/LaunchAgents/com.crybot.sentinel.plist" });
    files.set(unit, "garbage");
    expect(checkSentinelInstall("linux", "/home/bot", fs([]))).toEqual({ status: "unreadable", unit });
    expect(checkSentinelInstall("win32", "C:\\Users\\bot", fs([]))).toEqual({ status: "unsupported" });
  });
});
