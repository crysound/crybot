import assert from "node:assert/strict";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const root = process.env.FAKE_UPDATE_FEED_DIR;
appendFileSync(join(root, "feed-requests.jsonl"), `${JSON.stringify(args)}\n`);
assert.equal(args[args.indexOf("--proto") + 1], "=https");
assert.equal(args[args.indexOf("--proto-redir") + 1], "=https");
assert.equal(args.includes("-L"), false);
const url = args.at(-1);
if (!url.startsWith("https://")) process.exit(1);
assert.equal(url, "https://feed.example.test/stable.json");
const file = join(root, "stable.json");
process.stdout.write(existsSync(file) ? `${readFileSync(file, "utf8")}\n200` : "\n404");
