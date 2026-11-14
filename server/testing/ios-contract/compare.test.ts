import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareJsonFiles } from "./compare.ts";

describe("fixture comparison", () => {
  it("accepts equal files and reports a changed field", async () => {
    const dir = await mkdtemp("/tmp/ios-contract-compare-");
    const expected = join(dir, "expected.json");
    const actual = join(dir, "actual.json");
    await writeFile(expected, '{\n  "field": "one"\n}\n');
    await writeFile(actual, '{\n  "field": "one"\n}\n');
    expect(compareJsonFiles(expected, actual)).toBe(true);
    await writeFile(actual, '{\n  "field": "two"\n}\n');
    expect(compareJsonFiles(expected, actual)).toBe(false);
  });
});
