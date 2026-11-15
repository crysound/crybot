import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { verificationServerEnvironment } from "../../scripts/control-cry.ts";
import { removeTempDir, waitForExit } from "../testing/cleanup.ts";
import { freePortBlock } from "../testing/ports.ts";
import { detectBox } from "./detect.ts";

const detection = detectBox({ env: { ...process.env, CRYBOT_BOT_BOX: "on" } });
const root = fileURLToPath(new URL("../../", import.meta.url));
let child: ChildProcess | undefined;
let home: string | undefined;

afterEach(async () => {
  if (child) await waitForExit(child, { signal: "SIGTERM" });
  if (home) await removeTempDir(home);
});

it.skipIf(detection.box !== "bwrap")(`reports blocked engines and warns during real isolated boot (${detection.reason ?? "bwrap available"})`, async () => {
  home = mkdtempSync(join(tmpdir(), "cry-engine-isolation-"));
  const dataDir = join(home, ".crybot"), bin = join(home, "custom-bin"), marker = join(home, "ran-cli");
  const safeBin = join(dataDir, "tools", "npm", "bin");
  for (const dir of [bin, safeBin, join(dataDir, "tmp")]) mkdirSync(dir, { recursive: true });
  symlinkSync(process.execPath, join(safeBin, "node"));
  for (const cli of ["claude", "cry-fixture-engine"]) {
    writeFileSync(join(bin, cli), `#!/bin/sh\necho ran >> "${marker}"\necho 1.2.3\n`, { mode: 0o755 });
  }
  writeFileSync(join(dataDir, "config.json"), JSON.stringify({ instances: {
    claude: { driver: "claudeAgent", config: {} },
    custom: { driver: "claudeAgent", config: { cli: "cry-fixture-engine" } },
  } }));
  const port = await freePortBlock([0, 1]);
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["--experimental-strip-types", join(root, "server/index.ts")], {
    cwd: root,
    env: {
      ...verificationServerEnvironment({}, dataDir, port),
      HOME: home, USERPROFILE: home,
      PATH: [bin, safeBin, "/usr/bin", "/bin"].join(delimiter),
      CRYBOT_BOT_BOX: "on",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout!.on("data", (chunk) => { output += chunk; });
  child.stderr!.on("data", (chunk) => { output += chunk; });
  await expect.poll(async () => {
    if (child!.exitCode !== null) throw new Error(`fixture exited:\n${output}`);
    try { return (await fetch(base + "/api/health")).ok; } catch { return false; }
  }, { timeout: 30_000 }).toBe(true);
  const response = await fetch(base + "/api/instances", { headers: { origin: base } });
  expect(response.ok).toBe(true);
  const { instances } = await response.json() as { instances: Array<{ instanceId: string; snapshot: { state: string; reason?: string }; capabilities: { computerMcp: boolean } }> };
  for (const [id, cli] of [["claude", "claude"], ["custom", "cry-fixture-engine"]]) {
    const instance = instances.find((item) => item.instanceId === id);
    expect(instance?.capabilities.computerMcp).toBe(true);
    expect(instance?.snapshot).toEqual({ state: "unavailable", reason: expect.stringContaining(join(bin, cli)) });
    expect(instance?.snapshot.reason).toContain("Install it in a location agents cannot write");
    await expect.poll(() => output, { timeout: 20_000 }).toContain(`bot box: warning: \`${cli}\` was found at ${join(bin, cli)}`);
  }
  await expect.poll(() => output, { timeout: 90_000 }).toMatch(/bot box: self-check/);
  expect(existsSync(marker)).toBe(false);
}, 120_000);
