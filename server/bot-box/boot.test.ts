import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetPathCacheForTests } from "../env-path.ts";
import { botBox } from "./box.ts";
import { startBotBoxAtBoot } from "./boot.ts";
import { distrustHomePrograms } from "./program-trust.ts";
import { runBoxSelfCheck } from "./self-check.ts";

vi.mock("./self-check.ts", () => ({ runBoxSelfCheck: vi.fn(async () => ({
  passed: 1, total: 1, failed: [], results: [], skipped: [], durationMs: 1, at: 1,
})) }));

afterEach(() => {
  distrustHomePrograms(null);
  resetPathCacheForTests();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe.skipIf(process.platform === "win32")("bot box boot engine diagnostics", () => {
  it("still runs the self-check when configured CLI diagnostics throw", async () => {
    vi.useFakeTimers();
    vi.mocked(runBoxSelfCheck).mockClear();
    vi.spyOn(botBox, "start").mockResolvedValue({ box: "bwrap", tools: { bwrap: "/usr/bin/bwrap", socat: null }, reason: null });
    vi.spyOn(botBox, "enabled").mockReturnValue(false);
    vi.spyOn(botBox, "seccomp").mockReturnValue(null);
    const noteChecks = vi.spyOn(botBox, "noteChecks").mockImplementation(() => {});
    const log = vi.fn();
    await startBotBoxAtBoot({
      dataDir: join(homedir(), ".crybot"), port: 1, log, delayMs: 1,
      configuredClis: () => { throw new Error("Cannot read engines\nInvalid configuration"); },
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(log.mock.calls).toEqual([
      ["bot box: engine diagnostics failed: Cannot read engines Invalid configuration"],
      ["bot box: self-check 1/1 in 1 ms"],
    ]);
    expect(runBoxSelfCheck).toHaveBeenCalledTimes(1);
    expect(noteChecks).toHaveBeenCalledWith({ passed: 1, total: 1, failed: [], at: 1 });
  });

  it.each(["blocked", "trusted", "missing", "off"] as const)("logs a warning only for a blocked configured CLI (%s)", async (mode) => {
    vi.useFakeTimers();
    vi.mocked(runBoxSelfCheck).mockClear();
    const home = homedir(), dataDir = join(home, ".crybot");
    const bin = join(home, "custom-bin"), safe = join(dataDir, "bin");
    const marker = join(home, "ran-boot-cli");
    mkdirSync(bin, { recursive: true });
    mkdirSync(safe, { recursive: true });
    const cli = `cry-boot-${mode}`;
    const script = `#!/bin/sh\necho ran > "${marker}"\n`;
    if (mode !== "missing") writeFileSync(join(bin, cli), script, { mode: 0o755 });
    if (mode === "trusted") writeFileSync(join(safe, cli), script, { mode: 0o755 });
    vi.stubEnv("PATH", [bin, safe, process.env.PATH].join(delimiter));
    vi.spyOn(botBox, "start").mockImplementation(async () => {
      if (mode !== "off") distrustHomePrograms(home, [dataDir]);
      return mode === "off" ? { box: "off", tools: null, reason: "switched-off" }
        : { box: "bwrap", tools: { bwrap: "/usr/bin/bwrap", socat: null }, reason: null };
    });
    vi.spyOn(botBox, "enabled").mockReturnValue(mode !== "off");
    vi.spyOn(botBox, "seccomp").mockReturnValue(null);
    vi.spyOn(botBox, "noteChecks").mockImplementation(() => {});
    const log = vi.fn();
    await startBotBoxAtBoot({ dataDir, home, port: 1, log, delayMs: 1, configuredClis: () => [cli, cli] });
    await vi.advanceTimersByTimeAsync(1);
    const warnings = log.mock.calls.map(([line]) => line as string).filter((line) => line.includes("warning:"));
    expect(warnings).toHaveLength(mode === "blocked" ? 1 : 0);
    if (mode === "blocked") {
      expect(warnings[0]).toContain(join(bin, cli));
      expect(warnings[0]).toContain("Install it in a location agents cannot write");
      expect(process.env.PATH!.split(delimiter)).not.toContain(bin);
    }
    expect(existsSync(marker)).toBe(false);
    expect(runBoxSelfCheck).toHaveBeenCalledTimes(mode === "off" ? 0 : 1);
  });
});
