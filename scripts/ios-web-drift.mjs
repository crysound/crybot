import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
async function runGit(args, cwd = process.cwd()) { return (await exec("git", args, { cwd, encoding: "utf8" })).stdout; }
async function addedLines(since, cwd) {
  const diff = await runGit(["diff", "--unified=0", "--end-of-options", since, "HEAD", "--", "shared", "src/components"], cwd);
  const files = new Map();
  let file;
  let previous;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) { file = undefined; previous = undefined; continue; }
    if (line.startsWith("--- a/")) { previous = line.slice(6); continue; }
    if (line.startsWith("+++ ")) {
      file = line === "+++ /dev/null" ? previous : line.startsWith("+++ b/") ? line.slice(6) : undefined;
      if (file) files.set(file, { added: 0, deleted: 0, exports: [], members: [] });
      continue;
    }
    if (!file) continue;
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) files.get(file).line = Number(match[1]);
      continue;
    }
    const item = files.get(file);
    if (line.startsWith("+") && !line.startsWith("+++")) {
      item.added++;
      const body = line.slice(1);
      const exported = body.match(/^\s*export\s+(?:async\s+)?(?:type|interface|const|let|var|function|class|enum)\s+([A-Za-z_$][\w$]*)/);
      if (exported) item.exports.push(exported[1]);
      if (/^\s*export\s+default\b/.test(body)) item.exports.push("default");
      const named = body.match(/^\s*export\s+(?:type\s+)?\{([^}]+)\}/);
      if (named) for (const name of named[1].split(",")) {
        const parts = name.trim().replace(/^type\s+/, "").split(/\s+as\s+/);
        if (parts.at(-1)) item.exports.push(parts.at(-1).trim());
      }
      const member = body.match(/^\s*([A-Za-z_$][\w$]*)\??\s*:/);
      if (member) item.members.push(member[1]);
    } else if (line.startsWith("-") && !line.startsWith("---")) item.deleted++;
  }
  return files;
}
export async function renderDrift(since, cwd = process.cwd()) {
  if (typeof since !== "string" || !/^[A-Za-z0-9_][A-Za-z0-9_./-]*(?:[~^][0-9]*)*$/.test(since) || since.includes("..") || since.includes("//")) throw new Error("--since must be a commit or ref, optionally followed by ~ or ^ revisions");
  const files = await addedLines(since, cwd);
  const lines = ["# iOS 网页差异清单", "", `基线提交：\`${since}\`（规格基线为 \`0f44b8b6\`）。`, ""];
  if (!files.size) return lines.concat("没有 shared/ 或 src/components/ 改动。", "").join("\n");
  for (const [file, item] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${file}`, ``, `- 增删行：+${item.added} / -${item.deleted}`);
    if (item.exports.length) lines.push(`- 新增 export：${[...new Set(item.exports)].join(", ")}`);
    if (item.members.length) lines.push(`- 新增类型成员：${[...new Set(item.members)].join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const index = process.argv.indexOf("--since");
  const since = index >= 0 ? process.argv[index + 1] : "0f44b8b6";
  if (!since) { console.error("用法：node scripts/ios-web-drift.mjs --since <提交>"); process.exit(2); }
  process.stdout.write(await renderDrift(since));
}
