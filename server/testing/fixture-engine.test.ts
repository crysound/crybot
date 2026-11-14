import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { distrustHomePrograms } from "../bot-box/program-trust.ts";
import { planBox, under } from "../bot-box/plan.ts";
import { engineInstallRoots } from "../engine-roots.ts";
import { outsideBoxOptions } from "../procs.ts";
import { fixtureEnginePath } from "./fixture-engine.ts";

it("keeps synthetic engines trusted for probes and read-only in personal and team boxes", () => {
  const home = mkdtempSync(join(tmpdir(), "cry-fixture-engine-"));
  const dataDir = join(home, ".crybot");
  try {
    const cli = fixtureEnginePath(dataDir, "synthetic.mjs");
    writeFileSync(cli, "console.log('synthetic 1.0.0');\n");
    distrustHomePrograms(home, [dataDir]);
    expect(() => outsideBoxOptions(join(home, "synthetic.mjs"), {})).toThrow(/bots can write/);
    expect(() => outsideBoxOptions(cli, {})).not.toThrow();
    for (const engineHome of [undefined, join(dataDir, "engine-homes", "member-one")]) {
      const plan = planBox({ dataDir, home, codeRoots: [], engineRoots: engineInstallRoots(dataDir), bridges: [] }, {
        command: process.execPath, args: [cli], env: { HOME: engineHome ?? home }, home: engineHome,
      });
      const covering = plan.mounts.filter((mount) => "target" in mount && under(dirname(cli), mount.target));
      expect(covering.at(-1)).toMatchObject({ kind: "ro", source: engineInstallRoots(dataDir)[0] });
    }
  } finally {
    distrustHomePrograms(null);
    rmSync(home, { recursive: true, force: true });
  }
});
