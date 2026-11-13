import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const allowed = new Set(["LICENSE", "NOTICE", "CHANGES.md", "LICENSING.md"]);
const excluded = (path) => allowed.has(path) || path.startsWith("third_party/") || path.startsWith("docs/specs/") || path.startsWith("docs/tasks/") || path.split("/").includes("node_modules");
const pattern = /\u006daus|open\u006daus|\b\u006fmb[_-]|\b\u006fmb\b|open\u006dausbot\.com|\u006dausbot\.si|post\u0068og|mi\u006cind/i;
const files = new Set((await promisify(execFile)("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })).stdout.split("\0").filter(Boolean));
function collect(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile()) files.add(path);
  }
}
collect("dist");
collect("dist-server");
let hits = 0;
for (const path of [...files].sort()) {
  if (excluded(path) || !existsSync(path) || !lstatSync(path).isFile()) continue;
  if (pattern.test(path)) { console.error(`${path}: forbidden filename`); hits++; }
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  for (const [index, line] of bytes.toString("utf8").split("\n").entries()) {
    // OpenMailBox is a third-party nodemailer provider alias shipped in the build catalog.
    const buildProviderAlias = (path.startsWith("dist/") || path.startsWith("dist-server/")) && /openmailbox\.org/i.test(line);
    if (!pattern.test(line) || buildProviderAlias) continue;
    console.error(`${path}:${index + 1}: ${line.trim().slice(0, 180)}`);
    hits++;
  }
}
console.log(`${files.size} files checked; ${hits} forbidden references.`);
process.exitCode = hits ? 1 : 0;
