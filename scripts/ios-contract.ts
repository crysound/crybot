import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stableJson } from "../server/testing/ios-contract/normalize.ts";

type AreaSample = { name: string; swiftType: string; value: unknown };
const root = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = join(root, "mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract");
const areasRoot = join(root, "server/testing/ios-contract/areas");
const allowedSwiftTypes = new Set(["WireMessage", "WireBot", "WireGroup", "BotsSnapshot", "ThreadPage", "SendResponse", "ServerFrame", "RuntimeEvent", "WidgetNode", "CryChartSpec", "OptionCardData", "InboxPage", "InboxCount", "NotificationsPage", "ConfigResponse", "EnvironmentInfo", "AuthSession", "APIError"]);

async function collectAreas(): Promise<AreaSample[]> {
  const files = (await readdir(areasRoot)).filter((file) => file.endsWith(".ts")).sort();
  const samples: AreaSample[] = [];
  for (const file of files) {
    const module = await import(pathToFileURL(join(areasRoot, file)).href) as { collect?: () => AreaSample[] };
    if (module.collect) samples.push(...module.collect());
  }
  return samples;
}

async function build(directory: string): Promise<void> {
  const samples = await collectAreas();
  const index: Array<{ file: string; swiftType: string }> = [];
  const names = new Map<string, number>();
  for (const sample of samples) {
    if (!allowedSwiftTypes.has(sample.swiftType)) continue;
    const area = sample.swiftType === "WireMessage" ? "messages" : sample.swiftType === "ServerFrame" ? "frames" : sample.swiftType.toLowerCase();
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
  const update = process.argv.includes("--update");
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
    if (!existsSync(fixtureRoot)) {
      console.error("Contract fixtures are missing. Run pnpm contract:ios --update");
      process.exitCode = 1;
      return;
    }
    const expected = new Set<string>();
    async function files(dir: string): Promise<void> {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await files(path); else expected.add(relative(fixtureRoot, path));
      }
    }
    await files(fixtureRoot);
    const actual = new Set<string>();
    async function generated(dir: string): Promise<void> {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await generated(path); else actual.add(relative(temp, path));
      }
    }
    await generated(temp);
    const changed: string[] = [];
    for (const file of new Set([...expected, ...actual])) {
      const [a, b] = await Promise.all([
        readFile(join(fixtureRoot, file), "utf8").catch(() => ""),
        readFile(join(temp, file), "utf8").catch(() => ""),
      ]);
      if (a !== b) changed.push(file);
    }
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
