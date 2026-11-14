import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { compareDirectories } from "../server/testing/ios-contract/compare.ts";
import { typedSamples } from "../server/testing/ios-contract/fixtures.ts";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stableJson } from "../server/testing/ios-contract/normalize.ts";

type AreaSample = { name: string; swiftType: string; value: unknown };
const root = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = join(root, "mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract");
const areasRoot = join(root, "server/testing/ios-contract/areas");
const allowedSwiftTypes = new Set(["WireMessage", "WireBot", "WireGroup", "BotsSnapshot", "ThreadPage", "SendResponse", "ServerFrame", "RuntimeEvent", "WidgetNode", "CryChartSpec", "OptionCardData", "InboxPage", "InboxCount", "NotificationsPage", "ConfigResponse", "EnvironmentInfo", "AuthSession", "APIError"]);

const areaOf = (swiftType: string): string => swiftType === "WireMessage" ? "messages" : swiftType === "ServerFrame" ? "frames" : swiftType.toLowerCase();

async function collectAreas(): Promise<AreaSample[]> {
  const files = (await readdir(areasRoot)).filter((file) => file.endsWith(".ts")).sort();
  const samples: AreaSample[] = [];
  for (const file of files) {
    if (process.argv.includes("--typed-only") && file === "live.ts") continue;
    const module = await import(pathToFileURL(join(areasRoot, file)).href) as { collect?: () => AreaSample[] | Promise<AreaSample[]> };
    if (module.collect) samples.push(...await module.collect());
  }
  return samples;
}

async function build(directory: string): Promise<void> {
  const samples = await collectAreas();
  const index: Array<{ file: string; swiftType: string }> = [];
  const names = new Map<string, number>();
  for (const sample of samples) {
    if (!allowedSwiftTypes.has(sample.swiftType)) {
      console.warn(`Unregistered swiftType ${sample.swiftType}: ${sample.name} (not indexed)`);
      continue;
    }
    const area = areaOf(sample.swiftType);
    const base = sample.name.replace(/[^A-Za-z0-9_.-]+/g, "-");
    const count = (names.get(`${area}/${base}`) ?? 0) + 1;
    names.set(`${area}/${base}`, count);
    const suffix = count === 1 ? "" : `-${count}`;
    const name = `${base}${suffix}.json`;
    const file = join(area, name);
    await mkdir(join(directory, area), { recursive: true });
    await writeFile(join(directory, file), stableJson(sample.value));
    index.push({ file: relative(directory, join(directory, file)), swiftType: sample.swiftType });
  }
  index.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  await writeFile(join(directory, "index.json"), stableJson(index));
}

async function main(): Promise<void> {
  const checked = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.ios-contract.json", "--pretty", "false"], { cwd: root, encoding: "utf8" });
  if (checked.status !== 0) {
    const diagnostics = (checked.stdout ?? "") + (checked.stderr ?? "") + (checked.error?.message ?? "");
    console.error(diagnostics);
    const affected = typedSamples.filter(sample => Object.keys(sample.value).some(key => (diagnostics.includes(`'${key}'`) || diagnostics.includes(`'"${key}"'`))));
    for (const sample of affected) {
      const area = areaOf(sample.swiftType);
      console.error(`Affected contract file: ${area}/${sample.name}.json`);
    }
    process.exitCode = 1;
    return;
  }
  const update = process.argv.includes("--update");
  if (process.argv.includes("--typed-only")) console.warn("Typed fixtures only: live capture and full contract verification are NOT performed.");
  const temp = await mkdtemp(join(tmpdir(), "crybot-ios-contract-"));
  try {
    await build(temp);
    if (update) {
      await rm(fixtureRoot, { recursive: true, force: true });
      const { cp } = await import("node:fs/promises");
      await cp(temp, fixtureRoot, { recursive: true });
      console.log(`Updated ${fixtureRoot}`);
      return;
    }
    const changed = await compareDirectories(fixtureRoot, temp, { typedOnly: process.argv.includes("--typed-only") });
    if (changed.length) {
      console.error(`Contract fixtures differ: ${changed.join(", ")}`);
      console.error("Run pnpm contract:ios --update to refresh them.");
      process.exitCode = 1;
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await main();
