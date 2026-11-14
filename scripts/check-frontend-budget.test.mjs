import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, expect, it, vi } from "vitest";
import { checkBudget, ENTRY_GZIP_BUDGET_BYTES, localeEntry, staticAssets } from "./check-frontend-budget.mjs";

const manifest = {
  "index.html": { file: "assets/index.js", imports: ["shared"], dynamicImports: ["unused"] },
  "src/App.tsx": { file: "assets/App.js", imports: ["shared", "nested"] },
  shared: { file: "assets/shared.js", css: ["assets/styles.css"] },
  nested: { file: "assets/nested.js", imports: ["shared", "leaf"] },
  leaf: { file: "assets/leaf.js", imports: ["nested"] },
  "virtual/locales/zh.json.js": { file: "assets/zh.js" },
  unused: { file: "assets/unused.js" },
};
const entries = ["index.html", "src/App.tsx", "virtual/locales/zh.json.js"];
let fixture;
afterEach(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
  vi.restoreAllMocks();
});

it("counts transitive static JS and CSS once, including App and the selected locale", () => {
  expect(staticAssets(manifest, entries)).toEqual([
    "assets/App.js", "assets/index.js", "assets/leaf.js", "assets/nested.js",
    "assets/shared.js", "assets/styles.css", "assets/zh.js",
  ]);
  expect(localeEntry(manifest, "zh")).toBe(entries[2]);
  expect(ENTRY_GZIP_BUDGET_BYTES).toBe(500 * 1024);
});

it("rejects empty results and incomplete manifests", () => {
  expect(() => staticAssets({}, [])).toThrow("No JavaScript or CSS");
  expect(() => staticAssets(manifest, ["missing"])).toThrow("Missing manifest entry");
  expect(() => localeEntry({}, "zh")).toThrow("Expected one zh locale");
});

it("measures gzip -9 bytes from an isolated build fixture", () => {
  fixture = mkdtempSync(join(tmpdir(), "frontend-budget-"));
  mkdirSync(join(fixture, ".vite"));
  mkdirSync(join(fixture, "assets"));
  writeFileSync(join(fixture, ".vite/manifest.json"), JSON.stringify(manifest));
  const body = "export const value = 42;";
  for (const file of staticAssets(manifest, entries)) writeFileSync(join(fixture, file), body);
  vi.spyOn(console, "log").mockImplementation(() => {});
  expect(checkBudget(fixture)).toMatchObject({ passed: true, gzipBytes: 7 * gzipSync(body, { level: 9 }).length });
});
