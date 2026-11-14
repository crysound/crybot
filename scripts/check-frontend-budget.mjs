import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Budget: entry + immediately loaded App and their complete static JS/CSS import closure + the merged Chinese locale, deduplicated, gzip -9.
export const ENTRY_GZIP_BUDGET_BYTES = 500 * 1024;

export function staticAssets(manifest, entries) {
  const visited = new Set();
  const assets = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing manifest entry: ${key}`);
    visited.add(key);
    for (const file of [chunk.file, ...(chunk.css ?? [])]) {
      if (/\.(?:js|css)$/.test(file)) assets.add(file);
    }
    for (const dependency of chunk.imports ?? []) visit(dependency);
  }
  for (const entry of entries) visit(entry);
  if (!assets.size) throw new Error("No JavaScript or CSS assets matched");
  return [...assets].sort();
}

export function localeEntry(manifest, language) {
  const matches = Object.keys(manifest).filter((key) =>
    key.endsWith(`/locales/${language}.json`) || key.endsWith(`/locales/${language}.json.js`) ||
    manifest[key]?.src?.includes(`/locales/${language}.json`));
  if (matches.length !== 1) throw new Error(`Expected one ${language} locale, found ${matches.length}`);
  return matches[0];
}

export function appEntry(manifest) {
  const matches = Object.keys(manifest).filter((key) => manifest[key]?.name === "App" || key.endsWith("/App.tsx"));
  if (matches.length !== 1) throw new Error(`Expected one App entry, found ${matches.length}`);
  return matches[0];
}

export function measureAssets(dist, assets) {
  if (!assets.length) throw new Error("No JavaScript or CSS assets matched");
  return assets.map((name) => {
    const bytes = readFileSync(resolve(dist, name));
    return { name, bytes: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
  });
}

export function checkBudget(dist = "dist", { reportOnly = false } = {}) {
  const manifest = JSON.parse(readFileSync(resolve(dist, ".vite/manifest.json"), "utf8"));
  const assets = staticAssets(manifest, ["index.html", appEntry(manifest), localeEntry(manifest, "zh")]);
  const files = measureAssets(dist, assets);
  const gzipBytes = files.reduce((sum, file) => sum + file.gzip, 0);
  for (const file of files) console.log(`${file.name}: ${file.bytes} B, ${file.gzip} B gzip -9`);
  console.log(`Entry + App static closure + zh: ${gzipBytes} B (budget ${ENTRY_GZIP_BUDGET_BYTES} B; ${gzipBytes > ENTRY_GZIP_BUDGET_BYTES ? "over by" : "remaining"} ${Math.abs(gzipBytes - ENTRY_GZIP_BUDGET_BYTES)} B)${reportOnly ? " [report-only]" : ""}`);
  return { files, gzipBytes, passed: reportOnly || gzipBytes <= ENTRY_GZIP_BUDGET_BYTES };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const result = checkBudget(args.find((arg) => !arg.startsWith("--")), { reportOnly: args.includes("--report-only") });
  if (!result.passed) process.exitCode = 1;
}
