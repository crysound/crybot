import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

export const ENTRY_GZIP_BUDGET_BYTES = 500 * 1024;

const dist = process.argv[2] ?? "dist";
const html = readFileSync(`${dist}/index.html`, "utf8");
const assets = new Set([
  ...html.matchAll(/(?:src|href)="\/assets\/([^"?]+)"/g),
].map((match) => match[1]).filter((name) => name.endsWith(".js") || name.endsWith(".css")));

const files = [...assets].map((name) => {
  const path = `${dist}/assets/${name}`;
  return { name, gzip: gzipSync(readFileSync(path), { level: 9 }).length };
});
const gzipBytes = files.reduce((sum, file) => sum + file.gzip, 0);
console.log(`index entry assets: ${files.map((file) => `${file.name} ${file.gzip} B gzip`).join(", ")}`);
console.log(`index entry gzip total: ${gzipBytes} B (budget ${ENTRY_GZIP_BUDGET_BYTES} B)`);
if (gzipBytes > ENTRY_GZIP_BUDGET_BYTES) process.exitCode = 1;
