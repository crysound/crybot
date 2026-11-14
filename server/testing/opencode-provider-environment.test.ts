import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { removeTempDir } from "./cleanup.ts";
import { recordOpenCodeProviderEnvironment } from "./opencode-provider-environment.ts";

const homes: string[] = [];
afterEach(async () => {
  for (const home of homes.splice(0)) await removeTempDir(home);
});

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "cry-provider-env-"));
  homes.push(home);
  const dump = join(home, "opencode.json");
  const read = (id: string | undefined) => JSON.parse(readFileSync(`${dump}.${id}.provider-env.json`, "utf8"));
  return { home, dump, read };
}

it("keeps initial, saved and removed provider environments separate when every box has the same PID", () => {
  const { home, dump, read } = fixture();
  const argv = ["node", "fixture.mjs", "acp"];
  const env = { FAKE_ACP_DUMP: dump };
  const initial = recordOpenCodeProviderEnvironment(argv, env, 2);
  const beforeSave = readdirSync(home);
  const saved = recordOpenCodeProviderEnvironment(argv, { ...env, VENICE_API_KEY: "fixture-venice", ANTHROPIC_API_KEY: "fixture-anthropic" }, 2);
  const beforeRemove = readdirSync(home);
  const removed = recordOpenCodeProviderEnvironment(argv, { ...env, ANTHROPIC_API_KEY: "fixture-anthropic" }, 2);
  expect(new Set([initial, saved, removed]).size).toBe(3);
  expect(beforeRemove.filter(name => !beforeSave.includes(name))).toEqual([`opencode.json.${saved}.provider-env.json`]);
  expect(readdirSync(home).filter(name => !beforeRemove.includes(name))).toEqual([`opencode.json.${removed}.provider-env.json`]);
  expect(read(initial)).toEqual({ startId: initial, startedAt: expect.any(Number), pid: 2, env: {} });
  expect(read(saved)).toEqual({ startId: saved, startedAt: expect.any(Number), pid: 2, env: { VENICE_API_KEY: "fixture-venice", ANTHROPIC_API_KEY: "fixture-anthropic" } });
  expect(read(removed)).toEqual({ startId: removed, startedAt: expect.any(Number), pid: 2, env: { ANTHROPIC_API_KEY: "fixture-anthropic" } });
});

it("ignores version and model commands and missing dump destinations", () => {
  const { home, dump } = fixture();
  for (const command of ["--version", "models"]) {
    expect(recordOpenCodeProviderEnvironment(["node", "fixture.mjs", command], { FAKE_ACP_DUMP: dump }, 2)).toBeUndefined();
  }
  expect(recordOpenCodeProviderEnvironment(["node", "fixture.mjs", "acp"], {}, 2)).toBeUndefined();
  expect(readdirSync(home)).toEqual([]);
});
