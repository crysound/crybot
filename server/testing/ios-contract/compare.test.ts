import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { compareDirectories } from "./compare.ts";

it("lists added, missing and changed files, including empty files", async () => {
  const dir = await mkdtemp("/tmp/ios-contract-compare-");
  try {
    const left = join(dir, "left"), right = join(dir, "right");
    await mkdir(left); await mkdir(right);
    await writeFile(join(left, "same.json"), '{"field":1}\n');
    await writeFile(join(right, "same.json"), '{"field":1}\n');
    expect(await compareDirectories(left, right)).toEqual([]);
    await writeFile(join(right, "same.json"), '{"field":2}\n');
    await writeFile(join(right, "added.json"), "");
    await writeFile(join(left, "missing.json"), "");
    expect(await compareDirectories(left, right)).toEqual(["added.json", "missing.json", "same.json"]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
