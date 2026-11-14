#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isIP } from "node:net";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const allowDomainsPath = resolve(scriptDirectory, "allow-domains.txt");
const denylistPath = resolve(scriptDirectory, "denylist.hmac");
const tldsPath = resolve(scriptDirectory, "iana-tlds.txt");
const skippedNames = new Set(["pnpm-lock.yaml", "Package.resolved"]);
const skippedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".jar", ".jks", ".keystore", ".p12", ".woff", ".woff2", ".ttf", ".otf"]);
const reservedTlds = new Set(["example", "test", "invalid", "localhost"]);
const ambiguousTlds = new Set(["active", "app", "base", "bot", "case", "color", "config", "css", "data", "dev", "directory", "email", "file", "find", "go", "handle", "home", "host", "id", "index", "info", "js", "json", "length", "line", "live", "local", "map", "md", "messages", "name", "nam", "output", "path", "profile", "private", "pro", "py", "result", "rule", "rs", "run", "sh", "swift", "test", "text", "threadid", "true", "ts", "url", "value", "voice"]);

const privateTlds = new Set(["internal", "corp", "lan", "local", "home", "private", "intranet", "localdomain"]);
const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".swift", ".kt", ".kts", ".java", ".py", ".pyi", ".go", ".rs", ".c", ".h", ".cc", ".cpp", ".cxx", ".hpp", ".m", ".mm", ".cs", ".fs", ".fsx", ".rb", ".php", ".pl", ".pm", ".lua", ".r", ".dart", ".scala", ".sc", ".clj", ".cljs", ".ex", ".exs", ".erl", ".hrl", ".hs", ".lhs", ".ps1", ".psm1", ".sql", ".vue", ".svelte"]);

const fileExtensionTlds = new Set(["md", "sh", "py", "rs", "js", "ts", "json", "yml", "yaml", "txt", "zip", "mov", "mp4", "png", "jpg", "gz", "tar", "log", "csv", "html", "css", "swift", "kt", "java", "go", "rb", "pl", "tsx", "jsx", "mjs", "cjs", "mts", "cts", "bash", "zsh", "fish", "kts", "pyi", "c", "h", "cc", "cpp", "cxx", "hpp", "m", "mm", "cs", "fs", "fsx", "php", "pm", "lua", "r", "dart", "scala", "sc", "clj", "cljs", "ex", "exs", "erl", "hrl", "hs", "lhs", "ps1", "psm1", "sql", "vue", "svelte", "markdown", "mdx", "htm", "xml", "toml", "ini", "conf", "cfg", "env", "lock", "map", "svg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "avif", "pdf", "wav", "mp3", "ogg", "flac", "avi", "webm", "m4a", "m4v", "tgz", "bz2", "xz", "rar", "7z", "jar", "war", "wasm", "exe", "dll", "so", "dylib", "bin", "db", "sqlite", "woff", "woff2", "ttf", "otf"]);

const domainPattern = /(?<![A-Za-z0-9_.-])(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}(?![A-Za-z0-9_-]|\.[A-Za-z0-9])/g;
const ipv4Pattern = /(?<![A-Za-z0-9.])(?:\d{1,3}\.){3}\d{1,3}(?![A-Za-z0-9]|\.[0-9A-Za-z])/g;
const ipv6Pattern = /(?<![A-Za-z0-9:])(?:[0-9A-Fa-f]{0,4}:){2,}[0-9A-Fa-f:.%]*(?![A-Za-z0-9:])/g;
const emailPattern = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,63}(?![A-Za-z0-9_-]|\.[A-Za-z0-9])/g;
const jwtPattern = /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?![A-Za-z0-9_-])/g;
const sessionPattern = /(?<![A-Za-z0-9_-])cry_(?:sess|session)_([A-Za-z0-9_-]{20,})(?![A-Za-z0-9_-])/gi;
const uuidPattern = /(?<![A-Za-z0-9])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![A-Za-z0-9])/gi;
const identifierPattern = /[A-Za-z0-9_.-]+/g;
const chinesePattern = /[\u3400-\u9fff]+/g;

function readLines(path) {
  return readFileSync(path, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function loadConfig() {
  const allowDomains = new Set(readLines(allowDomainsPath).map((domain) => domain.split("#", 1)[0].trim().toLowerCase().replace(/^\*\./, "")));
  const tlds = new Set(readLines(tldsPath));
  for (const tld of [...reservedTlds, ...privateTlds]) tlds.add(tld);
  const denylist = new Set();
  for (const line of readFileSync(denylistPath, "utf8").split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Invalid denylist entry");
    denylist.add(value.toLowerCase());
  }
  return { allowDomains, denylist, tlds, denylistKey: process.env.PUBLIC_SCAN_DENYLIST_KEY };
}

function isAllowedDomain(domain, allowDomains) {
  const normalized = domain.toLowerCase().replace(/\.$/, "");
  if (normalized === "localhost" || normalized === "example.com" || normalized === "example.net" || normalized === "example.org") return true;
  if ([".example.com", ".example.net", ".example.org", ".example", ".test", ".invalid", ".localhost"].some((suffix) => normalized.endsWith(suffix))) return true;
  for (const allowed of allowDomains) if (normalized === allowed || normalized.endsWith(`.${allowed}`)) return true;
  return false;
}

function isWholeStringHost(line, match) {
  for (const literal of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    if (literal.index + 1 === match.index && literal[2].replace(/\.$/, "") === match[0]) return true;
  }
  return false;
}

function hasHostContext(line, match) {
  const before = line.slice(0, match.index);
  if (before.endsWith("://") || before.endsWith("@") || isWholeStringHost(line, match)) return true;
  return /(?:hostname|baseurl|apiurl|endpoint|server|domain|host|url|href)["'`]?\s*[:=]\s*["'`]?\s*$/i.test(before);
}

function isTranslationArgument(line, match) {
  const stack = [];
  const beforeQuote = line.slice(0, match.index - 1);
  for (const token of beforeQuote.matchAll(/(["'`])(?:\\.|(?!\1)[^\\])*\1|\/\*.*?\*\/|\/\/.*|(?<![\w$])t\s*\(|[()[\]{},]/g)) {
    const value = token[0];
    if (/^t\s*\($/.test(value)) stack.push({ translation: true, firstArgument: true });
    else if (["(", "[", "{"].includes(value)) stack.push({ translation: false });
    else if ([")", "]", "}"].includes(value)) stack.pop();
    else if (value === "," && stack.length) stack.at(-1).firstArgument = false;
  }
  return stack.some((frame) => frame.translation && frame.firstArgument);
}

function isDomainCandidate(line, match, config, code) {
  const domain = match[0].toLowerCase();
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (!config.tlds.has(tld) || /^\s*\(/.test(line.slice(match.index + match[0].length))) return false;
  if (!code) return !ambiguousTlds.has(tld) || hasHostContext(line, match);
  const before = line.slice(0, match.index);
  if (before.endsWith("://") || before.endsWith("@")) return true;
  if (!isWholeStringHost(line, match)) return false;
  const homeSuffix = ["home", "arpa"].join(".");
  if (privateTlds.has(tld) || domain.endsWith(`.${homeSuffix}`) || domain === homeSuffix) return true;
  return !fileExtensionTlds.has(tld) && !isTranslationArgument(line, match);
}

function ipv4Number(value) { return value.split(".").reduce((total, octet) => total * 256 + Number(octet), 0); }

function isAllowedIp(value) {
  if (["127.0.0.1", "0.0.0.0", "::", "::1", "::ffff:127.0.0.1"].includes(value.toLowerCase())) return true;
  if (isIP(value) === 4) {
    const number = ipv4Number(value);
    return ["192.0.2.0", "198.51.100.0", "203.0.113.0"].some((base) => number >= ipv4Number(base) && number <= ipv4Number(base) + 255);
  }
  return false;
}

function isPlaceholderUuid(value) {
  const normalized = value.toLowerCase();
  return normalized === "00000000-0000-0000-0000-000000000000" || normalized.startsWith("00000000-0000-4000-8000-");
}

function isVersionNumber(line, match) {
  const before = line.slice(0, match.index);
  const after = line.slice(match.index + match[0].length);
  return /(?:^|\s)(?:v|version)\s*$/i.test(before) || after.startsWith("-");
}

const ruleNames = new Set(["domain", "ip", "email", "jwt", "session-token", "uuid", "denylist", "gitattributes", "binary-skip"]);
function exempted(line, rule) {
  for (const match of line.matchAll(/public-scan:\s*allow\s+([a-z0-9_-]+)/gi)) if (ruleNames.has(match[1].toLowerCase()) && match[1].toLowerCase() === rule) return true;
  return false;
}

function reportRule(findings, file, lineNumber, line, rule, matches) {
  if (matches.length && !exempted(line, rule)) findings.push({ file, line: lineNumber, rule });
}

function* splitIdentifierWords(value) {
  const pieces = [...value.matchAll(/[A-Za-z0-9]+/g)];
  for (const [index, match] of pieces.entries()) {
    const piece = match[0];
    yield piece;
    for (let end = index + 1; end < Math.min(pieces.length, index + 32); end += 1) {
      yield value.slice(match.index, pieces[end].index + pieces[end][0].length);
    }
    yield* piece.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/\s+/).filter(Boolean);
  }
}

function* hashWords(line, domainMatches) {
  for (const match of domainMatches) {
    const labels = match[0].split(".");
    for (let index = 0; index < labels.length - 1; index += 1) yield labels.slice(index).join(".");
    yield* labels;
  }
  for (const match of line.matchAll(identifierPattern)) {
    yield match[0];
    yield* splitIdentifierWords(match[0]);
  }
  for (const match of line.matchAll(chinesePattern)) {
    const characters = [...match[0]];
    for (let size = 2; size <= 4; size += 1) for (let index = 0; index + size <= characters.length; index += 1) yield characters.slice(index, index + size).join("");
  }
}

function hasDenylistedWord(line, config) {
  if (!config.denylistKey || !config.denylist.size) return false;
  for (const word of hashWords(line, line.matchAll(domainPattern))) {
    if (config.denylist.has(createHmac("sha256", config.denylistKey).update(word.toLowerCase()).digest("hex"))) return true;
  }
  return false;
}

function scanLine(line, file, lineNumber, config) {
  const findings = [];
  const jwtMatches = [...line.matchAll(jwtPattern)];
  const rawDomains = [...line.matchAll(domainPattern)];
  const domainMatches = rawDomains.filter((match) => isDomainCandidate(line, match, config, lineNumber !== 0 && codeExtensions.has(extname(file).toLowerCase())));
  reportRule(findings, file, lineNumber, line, "domain", domainMatches.filter((match) => !isAllowedDomain(match[0], config.allowDomains)));
  const ipv6 = [...line.matchAll(ipv6Pattern)].filter((match) => isIP(match[0]) === 6 && !(match[0].startsWith("::") && /[A-Za-z0-9_)\]]\[$/.test(line.slice(0, match.index))));
  const ipv4 = [...line.matchAll(ipv4Pattern)].filter((match) => isIP(match[0]) === 4 && !isVersionNumber(line, match) && !ipv6.some((v6) => match.index >= v6.index && match.index < v6.index + v6[0].length));
  reportRule(findings, file, lineNumber, line, "ip", [...ipv4, ...ipv6].filter((match) => !isAllowedIp(match[0])));
  const emails = [...line.matchAll(emailPattern)];
  reportRule(findings, file, lineNumber, line, "email", emails.filter((match) => !isAllowedDomain(match[0].split("@")[1], new Set())));
  reportRule(findings, file, lineNumber, line, "jwt", jwtMatches);
  reportRule(findings, file, lineNumber, line, "session-token", [...line.matchAll(sessionPattern)]);
  reportRule(findings, file, lineNumber, line, "uuid", [...line.matchAll(uuidPattern)].filter((match) => !isPlaceholderUuid(match[0])));
  if (basename(file) === ".gitattributes" && /(?:^|\s)(?:binary|-diff)(?:\s|$)/.test(line)) reportRule(findings, file, lineNumber, line, "gitattributes", [line]);
  reportRule(findings, file, lineNumber, line, "denylist", hasDenylistedWord(line, config) ? [line] : []);
  return findings;
}

function decodeGitQuotedPath(value) {
  let result = "";
  let bytes = [];
  const flushBytes = () => { if (bytes.length) { result += Buffer.from(bytes).toString("utf8"); bytes = []; } };
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\\") { flushBytes(); result += value[index]; continue; }
    const next = value[++index];
    if (next === undefined) return null;
    if (/[0-7]/.test(next)) {
      let octal = next;
      while (octal.length < 3 && /[0-7]/.test(value[index + 1] ?? "")) octal += value[++index];
      bytes.push(Number.parseInt(octal, 8));
    } else { flushBytes(); result += ({ "\\": "\\", '"': '"', "t": "\t", "n": "\n", "r": "\r", "b": "\b", "f": "\f", "v": "\v" })[next] ?? next; }
  }
  flushBytes();
  return result;
}

function parseGitPathHeader(line) {
  const value = line.slice(4).replace(/\t+$/, "");
  if (!value || value === "/dev/null") return null;
  if (value.startsWith('"')) {
    if (!value.endsWith('"')) return null;
    const decoded = decodeGitQuotedPath(value.slice(1, -1));
    if (decoded === null) return null;
    return decoded.startsWith("b/") ? decoded.slice(2) : decoded;
  }
  return value.startsWith("b/") ? value.slice(2) : value;
}

function shouldSkipFile(path) {
  const name = basename(path);
  return skippedNames.has(name) || skippedExtensions.has(name.slice(name.lastIndexOf(".")).toLowerCase());
}

function parseDiffDestination(line) {
  const value = line.slice("diff --git ".length);
  const identical = value.match(/^a\/(.*) b\/\1$/);
  if (identical) return identical[1];
  const pair = value.match(/^("(?:\\.|[^"\\])*"|a\/.*?) ("(?:\\.|[^"\\])*"|b\/.*)$/);
  return pair ? parseGitPathHeader(`+++ ${pair[2]}`) : null;
}

function addedFiles(diff) {
  const files = [];
  let current;
  let nextLine = 0;
  let sawOldHeader = false;
  let sawNewHeader = false;
  let inHunk = false;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      current = { file: parseDiffDestination(line), binary: false, lines: [] };
      files.push(current);
      nextLine = 0; sawOldHeader = false; sawNewHeader = false; inHunk = false;
      continue;
    }
    if (!current) {
      if (line.startsWith("+")) throw new Error("unparsed diff");
      continue;
    }
    if (line.startsWith("deleted file mode ") && !inHunk) { current.file = null; continue; }
    if (!line.startsWith("-") && line.includes("\0")) current.binary = true;
    if (line.startsWith("rename to ") && !inHunk) {
      const value = line.slice("rename to ".length);
      current.file = value.startsWith('"') ? decodeGitQuotedPath(value.slice(1, -1)) : value;
      continue;
    }
    if (line.startsWith("--- ") && !inHunk) { sawOldHeader = true; continue; }
    if (line.startsWith("+++ ") && sawOldHeader && !inHunk) {
      current.file = parseGitPathHeader(line);
      if (current.file === null && line.slice(4).trim() !== "/dev/null") throw new Error("unparsed diff");
      sawNewHeader = true;
      continue;
    }
    if (line.startsWith("Binary files ")) { current.binary = true; continue; }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) { nextLine = Number(hunk[1]); inHunk = true; continue; }
    if (line.startsWith("+")) {
      if (!inHunk || !sawNewHeader || !current.file) throw new Error("unparsed diff");
      current.lines.push({ line: nextLine++, text: line.slice(1) });
    } else if (inHunk && line.startsWith(" ")) nextLine += 1;
  }
  if (files.some(({ file, lines }) => !file && lines.length)) throw new Error("unparsed diff");
  return files;
}

function gitOutput(cwd, args, encoding = "utf8") {
  try {
    return execFileSync("git", args, { cwd, encoding, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
  } catch {
    throw new Error("Git scan failed; verify base and repository availability.");
  }
}

export function scan({ base, cwd = process.cwd() }) {
  if (!base || base.startsWith("-")) throw new Error("Invalid --base; expected a commit SHA or ref.");
  if (!/^[a-f0-9]{4,64}$/i.test(base)) gitOutput(cwd, ["check-ref-format", "--allow-onelevel", base]);
  const commit = gitOutput(cwd, ["rev-parse", "--verify", "--end-of-options", `${base}^{commit}`]).trim();
  const diff = gitOutput(cwd, ["-c", "core.quotePath=false", "diff", "--unified=0", "--no-ext-diff", "--no-textconv", "--text", "--end-of-options", `${commit}...HEAD`, "--", ":(exclude,glob)**/pnpm-lock.yaml", ":(exclude,glob)**/Package.resolved"]);
  return scanDiff(diff, (file) => gitOutput(cwd, ["show", "--no-ext-diff", "--no-textconv", `HEAD:${file}`], null));
}

export function scanDiff(diff, readHead = () => null) {
  const config = loadConfig();
  const findings = [];
  for (const [index, { file, binary, lines }] of addedFiles(diff).entries()) {
    if (!file) continue;
    const pathFindings = scanLine(file, file, 0, config);
    const pathDenied = hasDenylistedWord(file, config);
    if (pathDenied && !pathFindings.some(({ rule }) => rule === "denylist")) pathFindings.push({ file, line: 0, rule: "denylist" });
    const displayPath = pathDenied ? `<redacted-path #${index + 1}>` : file.replace(/[\x00-\x1f\x7f]/g, "?");
    const contentFindings = [];
    if (!shouldSkipFile(file)) {
      const head = readHead(file);
      if (binary || head?.includes(0)) {
        const content = head?.toString("utf8") ?? lines.map(({ text }) => text).join("\n");
        if (!exempted(content, "binary-skip")) contentFindings.push({ file, line: null, rule: "binary-skip" });
      } else contentFindings.push(...lines.flatMap(({ line, text }) => scanLine(text, file, line, config)));
    }
    findings.push(...[...pathFindings, ...contentFindings].map((finding) => ({ ...finding, file: displayPath })));
  }
  return findings;
}

function main() {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : undefined;
  try {
    const findings = scan({ base });
    if (!process.env.PUBLIC_SCAN_DENYLIST_KEY) console.log("denylist: skipped (no key)");
    for (const finding of findings) console.error(`public-scan: ${finding.file}${finding.line === null || (finding.line === 0 && finding.file.startsWith("<redacted-path #")) ? "" : `:${finding.line}`}: ${finding.rule}`);
    if (findings.length) { console.error(`Public scan failed: ${findings.length} finding(s).`); process.exitCode = 1; } else console.log("Public scan passed: no findings.");
  } catch { console.error("Public scan error: invalid base, configuration, repository, or unparsed diff."); process.exitCode = 2; }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
