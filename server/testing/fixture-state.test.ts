import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { planBox, visibleInBox } from "../bot-box/plan.ts";
import { engineInstallRoots } from "../engine-roots.ts";
import { audienceHome } from "../engine-homes/layout.ts";
import { engineOutput, fixtureInput, fixtureLines, fixtureOutput } from "./fixture-state.ts";

const homes: string[] = [];
afterEach(() => { for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true }); });

it("keeps plans and release gates readable, evidence writable, and other homes and bots hidden", () => {
  const home = mkdtempSync(join(tmpdir(), "cry-fixture-state-"));
  homes.push(home);
  const dataDir = join(home, ".crybot");
  const input = fixtureInput(home, "plan.json");
  const gate = fixtureInput(home, "release");
  writeFileSync(input, "{}");
  for (const botId of ["scout", "bolt"]) {
    for (const audience of [undefined, "team", "member:alice", "member:bob"] as const) {
      const cwd = join(dataDir, "task-workspaces", botId, "thread-one");
      mkdirSync(cwd, { recursive: true });
      const output = engineOutput(home, cwd, "plan.json.evidence.jsonl");
      expect(output).toBe(fixtureOutput(home, botId, "plan.json.evidence.jsonl"));
      const ownHome = audience && audienceHome(dataDir, audience);
      const plan = planBox({ dataDir, home, codeRoots: [], engineRoots: engineInstallRoots(dataDir), bridges: [] }, {
        command: process.execPath, args: [], cwd, env: { HOME: ownHome ?? home }, home: ownHome,
      });
      expect(visibleInBox(plan, input)).toBe("ro");
      expect(visibleInBox(plan, gate)).toBe("ro");
      expect(visibleInBox(plan, output)).toBe("rw");
      expect(visibleInBox(plan, fixtureOutput(home, "another-bot", "dump.json"))).toBe("none");
      expect(visibleInBox(plan, join(dataDir, "config.json"))).toBe("none");
      if (ownHome) expect(visibleInBox(plan, join(home, "dump.json"))).toBe("none");
      writeFileSync(output, `${JSON.stringify({ botId })}\n`);
    }
  }
  writeFileSync(gate, "finish");
  expect(readFileSync(gate, "utf8")).toBe("finish");
  expect(fixtureLines(home)).toEqual([{ botId: "bolt" }, { botId: "scout" }]);
});
