import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";
import { renderDrift } from "./ios-web-drift.mjs";
const exec = promisify(execFile);

test("ios web drift reports changed files, exports and members", async () => {
  const dir = await mkdtemp("/tmp/ios-web-drift-");
  await mkdir(`${dir}/shared`, { recursive: true });
  await mkdir(`${dir}/src/components`, { recursive: true });
  await exec("git", ["init", "-q"], { cwd: dir });
  await exec("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await exec("git", ["config", "user.name", "Test"], { cwd: dir });
  await writeFile(`${dir}/shared/wire.ts`, "export interface Thing {\n  old: string;\n}\n");
  await exec("git", ["add", "."], { cwd: dir }); await exec("git", ["commit", "-qm", "base"], { cwd: dir });
  const base = (await exec("git", ["rev-parse", "HEAD"], { cwd: dir })).stdout.trim();
  await writeFile(`${dir}/shared/wire.ts`, "export interface Thing {\n  old: string;\n  added?: number;\n}\nexport type NewThing = string;\n");
  await exec("git", ["add", "."], { cwd: dir }); await exec("git", ["commit", "-qm", "change"], { cwd: dir });
  const report = await renderDrift(base, dir);
  assert.match(report, /shared\/wire\.ts/);
  assert.match(report, /NewThing/);
  assert.match(report, /added/);
});
