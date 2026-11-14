#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { createInterface } from "node:readline";

async function main() {
  const key = process.env.PUBLIC_SCAN_DENYLIST_KEY;
  if (!key || process.argv.length !== 2) {
    console.error("public-scan: hmac-word requires PUBLIC_SCAN_DENYLIST_KEY and stdin; no arguments accepted.");
    process.exitCode = 2;
    return;
  }
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    const word = line.trim().toLowerCase();
    if (word) console.log(createHmac("sha256", key).update(word).digest("hex"));
  }
}

main().catch(() => {
  console.error("public-scan: hmac-word failed.");
  process.exitCode = 2;
});
