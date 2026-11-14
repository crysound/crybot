import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { scanDiff } from "./scan.mjs";

const testKey = "public-scan-fictional-test-key";
const defaultDenyWord = ["sensitive", "fixture"].join("");
const scanPath = resolve(dirname(new URL(import.meta.url).pathname), "scan.mjs");
const hostHk = ["x", "foo", "hk"].join(".");
const hostSh = ["build", "foo", "sh"].join(".");
const hostApp = ["x", "foo", "app"].join(".");
const hostTop = ["wiki", "foo", "top"].join(".");
const sessionValue = ["cry_sess", "abcdefghijklmnopqrst"].join("_");
const realIp = ["10", "1", "2", "3"].join(".");
const realUuid = ["12345678", "1234", "1234", "1234", "123456789abc"].join("-");
const fixtureEmail = ["person@fictional", "internal"].join(".");
const fixtureJwt = ["eyJabc", "def", "ghi"].join(".");

function git(directory, args) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function runCli(t, path, args = [], options = {}, key = testKey) {
  const env = { ...process.env };
  delete env.PUBLIC_SCAN_DENYLIST_KEY;
  if (key !== null) env.PUBLIC_SCAN_DENYLIST_KEY = key;
  const result = spawnSync(process.execPath, [path, ...args], { ...options, env, encoding: "utf8" });
  if (result.error?.code === "EPERM") {
    t.skip("spawn blocked");
    return null;
  }
  assert.ifError(result.error);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  for (const value of new Set([testKey, key].filter(Boolean))) assert.ok(!output.includes(value), "CLI output must not contain the key");
  return { ...result, output };
}

function repository(t, initial = { "fixture.txt": "safe\n" }, denyWords = [defaultDenyWord]) {
  const root = mkdtempSync(join(tmpdir(), "public-scan-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, "repo");
  mkdirSync(directory);
  const scanner = join(root, "scanner");
  mkdirSync(scanner);
  for (const name of ["scan.mjs", "iana-tlds.txt", "allow-domains.txt"]) copyFileSync(join(dirname(scanPath), name), join(scanner, name));
  writeFileSync(join(scanner, "denylist.hmac"), denyWords.map((word) => createHmac("sha256", testKey).update(word.toLowerCase()).digest("hex")).join("\n"));
  const cliPath = join(scanner, "scan.mjs");
  git(directory, ["init", "-q"]);
  git(directory, ["config", ["user", "email"].join("."), "test@example.com"]);
  git(directory, ["config", ["user", "name"].join("."), "Public Scan Fixture"]);
  for (const [path, content] of Object.entries(initial)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), content);
  }
  git(directory, ["add", "."]);
  git(directory, ["commit", "-qm", "base"]);
  const base = git(directory, ["rev-parse", "HEAD"]);
  return {
    directory,
    base,
    update(files) {
      for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(directory, path)), { recursive: true });
        writeFileSync(join(directory, path), content);
      }
      git(directory, ["add", "."]);
      git(directory, ["commit", "-qm", "change"]);
    },
    cliPath,
    run(args = ["--base", base], key = testKey) {
      return runCli(t, cliPath, args, { cwd: directory }, key);
    },
  };
}

function assertFinding(result, file, line, rule) {
  assert.equal(result.status, 1, result.output);
  const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(result.output, new RegExp(`^public-scan: ${escapedFile}:${line}: ${rule}$`, "m"));
}

test("denylist requires the matching key and missing keys skip only denylist", (t) => {
  const words = ["FictionalCrew", "虚构客"];
  const repo = repository(t, undefined, words);
  repo.update({ "fixture.txt": `${words[0].toUpperCase()}\n${words[1]}\n` });
  const matched = repo.run();
  if (!matched) return;
  for (const line of [1, 2]) assertFinding(matched, "fixture.txt", line, "denylist");
  assert.ok(!matched.output.includes("skipped"));
  for (const word of words) assert.ok(!matched.output.toLowerCase().includes(word.toLowerCase()));
  const wrong = repo.run(undefined, "fictional-wrong-key");
  if (!wrong) return;
  assert.equal(wrong.status, 0, wrong.output);
  assert.ok(!wrong.output.includes("denylist"));
  for (const key of [null, ""]) {
    const skipped = repo.run(undefined, key);
    if (!skipped) return;
    assert.equal(skipped.status, 0, skipped.output);
    assert.equal(skipped.output.split("\n").filter((line) => line === "denylist: skipped (no key)").length, 1);
  }
  repo.update({ "fixture.txt": `${words.join("\n")}\n${realIp}\n` });
  const other = repo.run(undefined, null);
  if (!other) return;
  assertFinding(other, "fixture.txt", 3, "ip");
  assert.equal(other.output.split("\n").filter((line) => line === "denylist: skipped (no key)").length, 1);
  assert.ok(!other.output.includes(": denylist"));
});

test("HMAC word helper reads stdin, normalizes words, and rejects missing keys or arguments", (t) => {
  const helper = join(dirname(scanPath), "hmac-word.mjs");
  const words = ["FictionalCrew", "虚构客", "example.com"];
  const generated = runCli(t, helper, [], { input: `  ${words[0]}  \r\n${words[1]}\n\n${words[2]}\n` });
  if (!generated) return;
  assert.equal(generated.status, 0, generated.output);
  assert.equal(generated.stderr, "");
  assert.equal(generated.stdout, words.map((word) => createHmac("sha256", testKey).update(word.toLowerCase()).digest("hex")).join("\n") + "\n");
  for (const [args, key] of [[[], null], [["--key", testKey], null], [[testKey], testKey]]) {
    const invalid = runCli(t, helper, args, { input: words.join("\n") }, key);
    if (!invalid) return;
    assert.equal(invalid.status, 2, invalid.output);
    assert.equal(invalid.stdout, "");
    for (const word of words) assert.ok(!invalid.output.includes(word));
  }
});

test("workflow command-shaped filenames always follow the fixed output prefix", (t) => {
  const repo = repository(t);
  const path = "::warning::fixture.txt";
  repo.update({ [path]: `${realIp}\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, path, 1, "ip");
  assert.ok(result.output.split("\n").every((line) => !line.startsWith("::")));
});

test("binary-skip exemptions persist in HEAD and do not suppress path checks", (t) => {
  const word = "FictionalCrew";
  const repo = repository(t, { "fixture.txt": "\0\npublic-scan: allow binary-skip\n" }, [word]);
  repo.update({
    "fixture.txt": `\0\npublic-scan: allow binary-skip\n${realIp}\n`,
    "allowed.txt": "\0\npublic-scan: allow binary-skip\n",
    "denied.txt": "\0\npublic-scan: allow all\npublic-scan: allow binary\n",
    [`${word}.txt`]: "\0\npublic-scan: allow binary-skip\n",
    [`${word}.png`]: "\0\n",
    [`${word}-hidden.txt`]: "\0\n",
  });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 1, result.output);
  assert.ok(result.output.includes("public-scan: denied.txt: binary-skip\n"));
  assert.match(result.output, /^public-scan: <redacted-path #\d+>: binary-skip$/m);
  assert.equal(result.output.match(/: binary-skip/g)?.length, 2);
  assert.equal(result.output.match(/: denylist/g)?.length, 3);
  for (const value of [word, realIp, "fixture.txt", "allowed.txt"]) assert.ok(!result.output.includes(value));
});

test("binary-skip alone fails and its explicit exemption permits the file", (t) => {
  const repo = repository(t);
  repo.update({ "fixture.txt": "safe\0\n" });
  const denied = repo.run();
  if (!denied) return;
  assert.equal(denied.status, 1, denied.output);
  assert.equal(denied.output.split("\n").filter((line) => line.startsWith("public-scan: ")).join("\n"), "public-scan: fixture.txt: binary-skip");
  repo.update({ "fixture.txt": "safe\0\npublic-scan: allow binary-skip\n" });
  const allowed = repo.run();
  if (!allowed) return;
  assert.equal(allowed.status, 0, allowed.output);
});

test("real git domain scan uses the IANA table and rejects member access false positives", (t) => {
  const repo = repository(t);
  repo.update({ "fixture.txt": `user.name\nlogger.info(x)\nre.test(s)\nself.name\nwindow.app\nimport.meta.env.DEV\n${["a", "b", "hk"].join(".")}\n"${hostSh}"\nhttps://${hostApp}/\nhost: ${hostSh}\n${hostTop}/page\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.txt", 7, "domain");
  assert.match(result.output, /fixture\.txt:8: domain/);
  assert.match(result.output, /fixture\.txt:9: domain/);
  assert.match(result.output, /fixture\.txt:10: domain/);
  assert.match(result.output, /fixture\.txt:11: domain/);
  for (const line of [1, 2, 3, 4, 5, 6]) assert.doesNotMatch(result.output, new RegExp(`fixture\\.txt:${line}: domain`));
  assert.doesNotMatch(result.output, /user\.name|logger\.info|re\.test|self\.name/);
});

test("sentence-final domains, IPs, emails, URLs and quoted hosts are reported", (t) => {
  const repo = repository(t);
  const domain = ["wiki", "fictional", "top"].join(".");
  const host = ["api", "fictional", "cloud"].join(".");
  const email = ["person@fictional", "cloud"].join(".");
  const privateHost = ["api", "fictional", "internal"].join(".");
  repo.update({
    "fixture.md": `See ${domain}.\nConnect to ${realIp}.\nMail ${email}.\nOpen https://${host}.\nHost is ${privateHost}.\n`,
    "fixture.ts": `const API = "${host}.";\n`,
  });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.md", 1, "domain");
  assertFinding(result, "fixture.md", 2, "ip");
  assertFinding(result, "fixture.md", 3, "domain");
  assertFinding(result, "fixture.md", 3, "email");
  assertFinding(result, "fixture.md", 4, "domain");
  assertFinding(result, "fixture.md", 5, "domain");
  assertFinding(result, "fixture.ts", 1, "domain");
});

test("sentence-final reserved hosts and loopback stay allowed and longer versions are not IPs", (t) => {
  const repo = repository(t);
  repo.update({
    "fixture.md": `See example.com.\nConnect to 127.0.0.1.\nMail person@example.com.\n${[1, 2, 3, 4, 5].join(".")}\n`,
    "fixture.ts": 'const API = "example.com.";\n',
  });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Public scan passed/);
});

test("real git scan accepts a diff larger than one megabyte and excludes generated lock paths", (t) => {
  const repo = repository(t, { "fixture.txt": "safe\n", "pnpm-lock.yaml": "safe\n" });
  repo.update({ "fixture.txt": `${"x".repeat(2_200_000)}\n`, "pnpm-lock.yaml": `https://${hostHk}\n` });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Public scan passed/);
});

test("real git scan decodes quoted non-ASCII paths", (t) => {
  const path = "café [demo].txt";
  const repo = repository(t, { [path]: "safe\n" });
  git(repo.directory, ["config", "core.quotePath", "true"]);
  repo.update({ [path]: `https://${hostHk}\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, path, 1, "domain");
});

test("real git scan checks an added path as well as its contents", (t) => {
  const path = hostHk;
  const repo = repository(t);
  repo.update({ [path]: "safe\n" });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, path, 0, "domain");
});

test("real git scan reports gitattributes binary declarations and still scans text with --text", (t) => {
  const repo = repository(t);
  repo.update({ ".gitattributes": "fixture.txt binary\n", "fixture.txt": `https://${hostHk}\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, ".gitattributes", 1, "gitattributes");
  assert.match(result.output, /fixture\.txt:1: domain/);
});

test("only named rules can be exempted and aliases or all do not bypass findings", (t) => {
  const repo = repository(t);
  const privateWord = ["sensitive", "fixture"].join("");
  repo.update({ "fixture.txt": `https://${hostHk} // public-scan: allow all\n${sessionValue} // public-scan: allow token\n${privateWord} // public-scan: allow hash\nhttps://${hostHk} ${realIp} // public-scan: allow domain // public-scan: allow ip\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.txt", 1, "domain");
  assert.match(result.output, /fixture\.txt:2: session-token/);
  assert.match(result.output, /fixture\.txt:3: denylist/);
  assert.doesNotMatch(result.output, /fixture\.txt:4:/);
  assert.doesNotMatch(result.output, new RegExp(`${hostHk}|${privateWord}|abcdefghijklmnopqrst`));
});

test("denylist HMACs domain suffixes, separators, camel case, and labels without printing words", (t) => {
  const repo = repository(t);
  const privateWord = ["sensitive", "fixture"].join("");
  repo.update({ "fixture.txt": [
    `${privateWord}.foo.example.com`,
    `${privateWord}_bot`,
    `${privateWord}-team`,
    `${privateWord[0].toUpperCase()}${privateWord.slice(1)}Client`,
    `${privateWord}.example.com`,
    "",
  ].join("\n") });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 1, result.output);
  for (let line = 1; line <= 5; line += 1) assert.match(result.output, new RegExp(`fixture\\.txt:${line}: denylist`));
  assert.doesNotMatch(result.output, new RegExp(privateWord, "i"));
});

test("session tokens require twenty value characters and reserved domains are allowed", (t) => {
  const repo = repository(t);
  repo.update({ "fixture.txt": `cry_sess_secret\ncry_sess_abc\ncry_session_cookie_name\n${sessionValue}\nhttps://foo.example.net\nhttps://foo.example.org\nhttps://foo.invalid\nhttps://foo.test\nhttps://foo.localhost\nlocalhost ${["127", "0", "0", "1"].join(".")} ::1\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.txt", 4, "session-token");
  for (const line of [1, 2, 3, 5, 6, 7, 8, 9, 10]) assert.doesNotMatch(result.output, new RegExp(`fixture\\.txt:${line}:`));
});

test("version-shaped IPv4 values are ignored while real IPs are reported", (t) => {
  const repo = repository(t);
  repo.update({ "fixture.txt": `v${["1", "2", "3", "4"].join(".")} version ${["5", "6", "7", "8"].join(".")} ${["9", "8", "7", "6"].join(".")}-rc\n${realIp}\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.txt", 2, "ip");
  assert.doesNotMatch(result.output, /fixture\.txt:1: ip/);
});

test("only added lines are scanned and generated dependency paths are skipped", (t) => {
  const repo = repository(t, { "fixture.txt": `https://${hostHk}\nsafe\n` });
  repo.update({ "fixture.txt": `https://${hostHk}\nsafe\nstill-safe\n`, "Package.resolved": `https://${hostHk}\n` });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 0, result.output);
});

test("an added line without a parseable file header fails closed", () => {
  assert.throws(() => scanDiff("diff --git a/x b/x\n@@ -0,0 +1 @@\n+unsafe\n"), /unparsed/);
});

test("other rule output is location-only", (t) => {
  const repo = repository(t);
  repo.update({ "fixture.txt": `${realIp} ${fixtureEmail} ${fixtureJwt} ${realUuid}\n` });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 1, result.output);
  for (const rule of ["ip", "email", "jwt", "uuid"]) assert.match(result.output, new RegExp(`fixture\\.txt:1: ${rule}`));
  for (const value of [fixtureEmail, fixtureJwt, realIp, realUuid]) assert.ok(!result.output.includes(value));
});

test("private suffixes, embedded host literals, and host field spellings are recognized", (t) => {
  const repo = repository(t);
  const suffixes = ["internal", "corp", "lan", "local", "home", "private", "intranet", "localdomain", "arpa"];
  const lines = suffixes.map((suffix) => `const API = "${["api", "fictional", suffix].join(".")}";`);
  const host = ["api", "fictional", "dev"].join(".");
  lines.push(`const API = "${host}";`, `{ endpoint: "${["api", "fictional", "live"].join(".")}" }`);
  for (const field of ["hostname:", "baseURL =", "apiUrl:", "endpoint:", "server:", "domain:", '"host":', "myAPIURL ="]) lines.push(`${field} "${host}"`);
  repo.update({ "fixture.ts": `${lines.join("\n")}\n`, "body.txt": `${["home", "arpa"].join(".")}\n${["wiki", "fictional", "net"].join(".")}/page\n` });
  const result = repo.run();
  if (!result) return;
  for (let line = 1; line <= lines.length; line += 1) assertFinding(result, "fixture.ts", line, "domain");
  assertFinding(result, "body.txt", 1, "domain");
  assertFinding(result, "body.txt", 2, "domain");
});

test("all TLDs need host context in code and method calls are excluded in prose too", (t) => {
  const repo = repository(t);
  const members = [["Date", "now"].join("."), ["Locale", "US"].join("."), ["AES", "GCM", "open"].join("."), ["event", "target"].join("."), ["class", "java"].join("."), ["url", "host"].join("."), "let host = url.host", ["host", "value", "name"].join("."), ["hostname", "value", "net"].join(".")];
  const calls = ["fixture.now()", "fixture.java ()", "fixture.net()"];
  const files = Object.fromEntries(["ts", "swift", "kt"].map((extension) => [`fixture.${extension}`, `${[...members, ...calls].join("\n")}\n`]));
  const proseFile = ["body", "md"].join(".");
  files[proseFile] = `${[...members, ...calls].join("\n")}\n`;
  repo.update(files);
  const result = repo.run();
  if (!result) return;
  for (const extension of ["ts", "swift", "kt"]) assert.ok(!result.output.includes(`fixture.${extension}:`), result.output);
  for (const line of [1, 2, 4, 5, 9]) assertFinding(result, proseFile, line, "domain");
  for (let line = members.length + 1; line <= members.length + calls.length; line += 1) assert.ok(!result.output.includes(`body.md:${line}:`), result.output);
});

test("raw domain suffixes and whole separated identifiers reach the denylist without context", (t) => {
  const word = ["fictional", "acme"].join("");
  const suffixes = ["dev", "net", "internal"].map((tld) => `${word}.${tld}`);
  const separated = ["-", "_"].map((separator) => [word, "ops"].join(separator));
  const translation = ["settings", "profile", "name"].join(".");
  const filename = ["README", "md"].join(".");
  const repo = repository(t, undefined, [...suffixes, ...separated, translation, filename]);
  const lines = [`ci.${suffixes[0]}`, `wiki.${suffixes[1]}/page`, `api.${suffixes[2]}`, ...separated, `t("${translation}")`, `"${filename}"`];
  repo.update({ "fixture.ts": `${lines.join("\n")}\n` });
  const result = repo.run();
  if (!result) return;
  for (let line = 1; line <= lines.length; line += 1) assertFinding(result, "fixture.ts", line, "denylist");
  assert.ok(!result.output.includes(word), result.output);
  for (const value of [...suffixes, ...separated, translation, filename]) assert.ok(!result.output.includes(value));
});

test("denylisted paths are redacted for both path and content findings", (t) => {
  const word = ["fictional", "acme"].join("");
  const separated = ["fictional", "ops"].join("-");
  const repo = repository(t, undefined, [word, separated]);
  repo.update({ [`${separated}.txt`]: "safe\n", [`${word}_bot/fixture.txt`]: `https://${hostHk}\n${word}\n` });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /<redacted-path #1>: denylist/);
  assert.match(result.output, /<redacted-path #2>: denylist/);
  assert.match(result.output, /<redacted-path #2>:1: domain/);
  assert.match(result.output, /<redacted-path #2>:2: denylist/);
  assert.ok(!result.output.includes(word), result.output);
  assert.ok(!result.output.includes(separated), result.output);
});

test("empty additions and pure renames scan destinations including quoted paths", (t) => {
  const word = ["fictional", "acme"].join("");
  const repo = repository(t, { "old.txt": "safe\n" }, [word]);
  const renamed = `${word}-café\t.txt`;
  renameSync(join(repo.directory, "old.txt"), join(repo.directory, renamed));
  repo.update({ [hostHk]: "" });
  const result = repo.run();
  if (!result) return;
  assert.match(git(repo.directory, ["diff", "--summary", repo.base, "HEAD"]), /100%/);
  assertFinding(result, hostHk, 0, "domain");
  assert.match(result.output, /<redacted-path #\d+>: denylist/);
  assert.ok(!result.output.includes(word), result.output);
});

test("NUL anywhere in HEAD reports binary-skip, including unchanged NUL lines", (t) => {
  const repo = repository(t, { "existing.txt": `\0\n${"safe\n".repeat(10)}`, "converted.txt": "\0\n" });
  repo.update({ "existing.txt": `\0\n${"safe\n".repeat(10)}https://${hostHk}\n`, "new.txt": `https://${hostHk}\n\0\n`, "asset.png": `https://${hostHk}\n\0\n`, "converted.txt": `https://${hostHk}\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "converted.txt", 1, "domain");
  for (const file of ["existing.txt", "new.txt"]) assert.ok(result.output.includes(`public-scan: ${file}: binary-skip\n`), result.output);
  assert.ok(!result.output.includes("asset.png"), result.output);
  assert.ok(!result.output.includes(hostHk));
  assert.equal(result.output.split("\n").filter((line) => line.includes(": domain")).length, 1);
});

test("unspecified and mapped loopback IPs and language colon syntax are allowed", (t) => {
  const repo = repository(t);
  const unspecified = ["0", "0", "0", "0"].join(".");
  const loopback = ["127", "0", "0", "1"].join(".");
  const path = ["fixture", "py"].join(".");
  repo.update({ [path]: `:: ${unspecified} ::ffff:${loopback}\na[::2]\na[::-1]\nx :: Int\n${realIp}\nhttps://[${["", "", "2"].join(":")}]/\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, path, 5, "ip");
  assertFinding(result, path, 6, "ip");
  for (let line = 1; line <= 4; line += 1) assert.ok(!result.output.includes(`fixture.py:${line}:`), result.output);
});

test("reserved email domains are allowed but public third party mail is still checked", (t) => {
  const repo = repository(t);
  const domains = ["example.com", "example.net", "example.org", "sub.example.com", "sub.example.net", "sub.example.org", "fictional.example", "fictional.test", "fictional.invalid", "fictional.localhost"];
  const external = ["person", ["github", "com"].join(".")].join("@");
  repo.update({ "fixture.txt": `${domains.map((domain) => `person@${domain}`).join("\n")}\n${external}\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.txt", domains.length + 1, "email");
  assert.equal(result.output.split("\n").filter((line) => line.includes(": email")).length, 1);
  assert.ok(!result.output.includes(external));
});

test("invalid base options and revisions fail without echoing input, valid refs work", (t) => {
  const word = ["fictional", "acme"].join("");
  const repo = repository(t, undefined, [word]);
  repo.update({ "fixture.txt": "safe again\n" });
  for (const base of [`--${word}`, `${word}..HEAD`, `${word}~1`, `${word}:file`, word]) {
    const result = repo.run(["--base", base]);
    if (!result) return;
    assert.equal(result.status, 2, result.output);
    assert.ok(!result.output.includes(word), result.output);
  }
  git(repo.directory, ["branch", "fixture-base", repo.base]);
  const result = repo.run(["--base", "fixture-base"]);
  if (!result) return;
  assert.equal(result.status, 0, result.output);
});

test("textconv is never run and malformed denylist errors never echo entries", (t) => {
  const word = ["fictional", "acme"].join("");
  const repo = repository(t, { "fixture.txt": "safe\n", ".gitattributes": "fixture.txt diff=fixture\n" }, [word]);
  git(repo.directory, ["config", "diff.fixture.textconv", "false"]);
  repo.update({ "fixture.txt": "still safe\n" });
  let result = repo.run();
  if (!result) return;
  assert.equal(result.status, 0, result.output);
  writeFileSync(join(dirname(repo.cliPath), "denylist.hmac"), word);
  result = repo.run();
  if (!result) return;
  assert.equal(result.status, 2, result.output);
  assert.ok(!result.output.includes(word), result.output);
  result = repo.run(undefined, null);
  if (!result) return;
  assert.equal(result.status, 2, result.output);
  assert.ok(!result.output.includes(word), result.output);
});


test("public domain entries support source comments without allowing sibling domains", (t) => {
  const repo = repository(t);
  const domains = readFileSync(join(dirname(scanPath), "allow-domains.txt"), "utf8").split(/\r?\n/).map((line) => line.split("#", 1)[0].trim()).filter(Boolean);
  const sibling = ["fictional", "feishu", "cn"].join(".");
  repo.update({ "fixture.txt": `${domains.map((domain) => `https://${domain}/`).join("\n")}\nhttps://${sibling}/\n` });
  const result = repo.run();
  if (!result) return;
  assertFinding(result, "fixture.txt", domains.length + 1, "domain");
  assert.equal(result.output.split("\n").filter((line) => line.includes(": domain")).length, 1);
});


test("deleting empty and binary files does not scan removed paths or read missing HEAD blobs", (t) => {
  const word = ["sensitive", "fixture"].join("");
  const repo = repository(t, { [word]: "", "binary.txt": "\0\n", "fixture.txt": "safe\n" });
  rmSync(join(repo.directory, word));
  rmSync(join(repo.directory, "binary.txt"));
  repo.update({ "fixture.txt": "safe again\n" });
  const result = repo.run();
  if (!result) return;
  assert.equal(result.status, 0, result.output);
  assert.ok(!result.output.includes(word));
});

test("code host literals exclude filenames, translation keys, and all bare expressions", (t) => {
  const repo = repository(t);
  const ignored = [
    "const host = window.location.host;",
    "let host = request.url.host",
    "const server = this.server.name;",
    "let pageHost = card.site;",
    "imapHost: account.imap.host",
    "host: req.headers.host",
    '"README.md"',
    '"build.sh"',
    '"assets.zip"',
    't("settings.profile.name")',
    'i18n.t ( "settings.profile.name", { count: 1 })',
    "t('settings.profile.name')",
    't(`settings.profile.name`)',
    't(flag ? "settings.profile.name" : "settings.profile.name")',
    'i18n.t(/* key */ "settings.profile.name")',
    't(select({ count: 1, keys: ["safe", "settings.profile.name"] }))',
    ...["host", "hostname", "baseURL", "endpoint", "server", "domain"].map((field) => `${field} = ${["x", "corp", "internal"].join(".")}`),
    ..."md sh py rs js ts json yml yaml txt zip mov mp4 png jpg gz tar log csv html css swift kt java go rb pl".split(" ").map((extension) => `const file = "fixture.${extension.toUpperCase()}";`),
  ];
  const api = ["api", "corp", "dev"].join(".");
  const url = ["api", "fictional", "dev"].join(".");
  const mail = ["fictional", "dev"].join(".");
  const reported = [
    `const API = "${api}";`,
    '"x.corp.internal"',
    `fetch("https://${url}/x")`,
    `user@${mail}`,
    `const API = '${api}';`,
    `const API = \`${api}\`;`,
    `fetch("https://${["build", "fictional", "sh"].join(".")}/x")`,
    `t("fallback", "${api}")`,
    `format("${api}")`,
    `t("fallback", { value: "${api}" })`,
    `t("fallback"); format("${api}")`,
    ...["internal", "corp", "lan", "local", "home", "private", "intranet", "localdomain"].map((suffix) => `t("${["x", "fictional", suffix].join(".")}")`),
    `t("${["home", "arpa"].join(".")}")`,
    `t("${["x", "home", "arpa"].join(".")}")`,
  ];
  repo.update(Object.fromEntries(["ts", "swift"].map((extension) => [`fixture.${extension}`, `${[...ignored, ...reported].join("\n")}\n`])));
  const result = repo.run();
  if (!result) return;
  for (const extension of ["ts", "swift"]) {
    for (let line = 1; line <= ignored.length; line += 1) assert.ok(!result.output.includes(`fixture.${extension}:${line}:`), result.output);
    for (let offset = 1; offset <= reported.length; offset += 1) assertFinding(result, `fixture.${extension}`, ignored.length + offset, "domain");
    assertFinding(result, `fixture.${extension}`, ignored.length + 4, "email");
  }
});

test("shell and prose keep bare hosts and filename-shaped host strings", (t) => {
  const repo = repository(t);
  const body = `DOMAIN=x.y.internal\nhost: ${["build", "fictional", "sh"].join(".")}\n"README.md"\n`;
  const extensions = ["sh", "bash", "zsh", "fish", "md", "txt", "yml", "yaml", "json"];
  repo.update(Object.fromEntries(extensions.map((extension) => [`fixture.${extension}`, body])));
  const result = repo.run();
  if (!result) return;
  for (const extension of extensions) for (let line = 1; line <= 3; line += 1) assertFinding(result, `fixture.${extension}`, line, "domain");
});

test("embedded separated denylist intervals redact paths and content with original separators", (t) => {
  const words = [["x", "ops"].join("-"), ["a", "b", "dev"].join("."), ["mixed", "ops_team", "zone"].join("..")];
  const repo = repository(t, undefined, words);
  const names = [`${words[0]}-bot`, `${words[1]}-notes.md`, `prefix_${words[2]}-suffix.txt`];
  repo.update({
    "fixture.ts": `${names.join("\n")}\n`,
    ...Object.fromEntries(names.map((name) => [name, `"x.corp.internal"\n${name}\n`])),
  });
  const result = repo.run();
  if (!result) return;
  for (let line = 1; line <= names.length; line += 1) assertFinding(result, "fixture.ts", line, "denylist");
  assert.equal(result.output.match(/<redacted-path #\d+>: denylist/g)?.length, 3);
  assert.equal(result.output.match(/<redacted-path #\d+>:1: domain/g)?.length, 3);
  assert.equal(result.output.match(/<redacted-path #\d+>:2: denylist/g)?.length, 3);
  for (const word of words) assert.ok(!result.output.includes(word), result.output);
});

test("denylist interval cap preserves 32-part windows, late matches, and whole long words", (t) => {
  const parts = Array.from({ length: 33 }, (_, index) => `segment${index}`);
  const withinCap = parts.slice(0, 32).join("-");
  const overCap = parts.join("-");
  const lateWord = ["late", "ops"].join("_");
  const repo = repository(t, undefined, [withinCap, overCap, lateWord]);
  const longWord = `${Array(10_000).fill("padding").join("-")}-${lateWord}-tail`;
  repo.update({ "fixture.ts": `${withinCap}-tail\n${overCap}\n${longWord}\n`, [`${longWord.slice(-100)}.txt`]: "safe\n" });
  const result = repo.run();
  if (!result) return;
  for (let line = 1; line <= 3; line += 1) assertFinding(result, "fixture.ts", line, "denylist");
  assert.match(result.output, /<redacted-path #\d+>: denylist/);
  for (const word of [withinCap, overCap, lateWord]) assert.ok(!result.output.includes(word));

  const limited = repository(t, undefined, [overCap]);
  limited.update({ "fixture.ts": `${overCap}-tail\n${overCap}\n` });
  const capped = limited.run();
  if (!capped) return;
  assert.ok(!capped.output.includes("fixture.ts:1:"), capped.output);
  assertFinding(capped, "fixture.ts", 2, "denylist");
  assert.ok(!capped.output.includes(overCap));
});
