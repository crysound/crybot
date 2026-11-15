import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { removeTempDirStrict } from "./cleanup.ts";

describe.skipIf(process.platform === "win32" || process.getuid?.() === 0)("strict fixture cleanup permissions", () => {
  it.each([0o500, 0o000])("removes owned residual directories with mode %s without touching symlink targets", async (mode) => {
    const root = mkdtempSync(join(tmpdir(), "cry-cleanup-"));
    const outside = mkdtempSync(join(tmpdir(), "cry-cleanup-outside-"));
    const parent = join(root, ".crybot", "task-workspaces", "bot", "thread");
    const nested = join(parent, "residual");
    try {
      mkdirSync(nested, { recursive: true });
      writeFileSync(join(nested, "unfinished"), "fixture");
      writeFileSync(join(outside, "keep"), "outside fixture");
      symlinkSync(outside, join(nested, "external"));
      chmodSync(outside, 0o500);
      chmodSync(nested, 0o500);
      chmodSync(parent, mode);
      const info = statSync(parent);
      expect(info.uid).toBe(process.getuid?.());
      expect(() => rmSync(root, { recursive: true, force: true })).toThrow(/EACCES/);
      await removeTempDirStrict(root);
      expect(existsSync(root)).toBe(false);
      expect(statSync(outside).mode & 0o777).toBe(0o500);
      expect(existsSync(join(outside, "keep"))).toBe(true);
    } finally {
      if (existsSync(parent)) chmodSync(parent, 0o700);
      if (existsSync(nested)) chmodSync(nested, 0o700);
      chmodSync(outside, 0o700);
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
