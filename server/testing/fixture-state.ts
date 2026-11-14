import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { npmEnginesPrefix } from "../engine-roots.ts";

export function fixtureInputsRoot(home: string): string {
  return join(npmEnginesPrefix(join(home, ".crybot")), "fixture-inputs");
}

export function fixtureInput(home: string, name: string): string {
  const root = fixtureInputsRoot(home);
  mkdirSync(root, { recursive: true });
  return join(root, name);
}

export function fixtureOutput(home: string, botId: string, name: string): string {
  return join(home, ".crybot", "workspaces", botId, ".fixture-output", name);
}

export function engineOutput(home: string, cwd: string, name: string): string {
  const [kind, botId] = relative(join(home, ".crybot"), cwd).split(/[\\/]/);
  const root = (kind === "workspaces" || kind === "task-workspaces") && botId
    ? fixtureOutput(home, botId, "") : join(home, ".fixture-output");
  mkdirSync(root, { recursive: true });
  return join(root, name);
}

export function fixtureOutputs(home: string, name: string): string[] {
  const root = join(home, ".crybot", "workspaces");
  return existsSync(root) ? readdirSync(root).map((botId) => fixtureOutput(home, botId, name)).filter(existsSync) : [];
}

export function fixtureLines<T>(home: string, name = "plan.json.evidence.jsonl"): T[] {
  return fixtureOutputs(home, name).flatMap((file) => readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as T));
}

export function configureFixtureOutputs(home: string): void {
  for (const key of ["FAKE_CLAUDE_DUMP", "FAKE_CLAUDE_TEXT_DUMP", "FAKE_CLAUDE_SHELL_LOG"]) {
    if (process.env[key]) process.env[key] = engineOutput(home, process.cwd(), basename(process.env[key]));
  }
  if (process.env.FAKE_CLAUDE_ROOM_PLAN) process.env.FAKE_CLAUDE_ROOM_EVIDENCE = engineOutput(home, process.cwd(), `${basename(process.env.FAKE_CLAUDE_ROOM_PLAN)}.evidence.jsonl`);
}

export function withFixtureState(engine: string): string {
  return `import { configureFixtureOutputs, fixtureInputsRoot } from ${JSON.stringify(pathToFileURL(import.meta.filename).href)};
const fixtureHome = process.env.FAKE_CLAUDE_FIXTURE_DIR;
process.env.FAKE_CLAUDE_FIXTURE_DIR = fixtureInputsRoot(fixtureHome);
${engine}
if (process.argv[2] !== "--version") configureFixtureOutputs(fixtureHome);`;
}
