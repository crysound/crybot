import { appendFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";

const file = process.env.CRYBOT_TEST_NETWORK_LOG;
if (!file) throw new Error("An isolated network audit log is required");
function check(input) {
  let hostname;
  try {
    hostname = new URL(typeof input === "string" || input instanceof URL ? input : input.url).hostname;
  } catch {
    hostname = input?.hostname ?? input?.host ?? "localhost";
  }
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) return;
  appendFileSync(file, `${hostname}\n`);
  throw new Error(`External request during fixture startup: ${hostname}`);
}
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => { check(input); return originalFetch(input, init); };
for (const module of [http, https]) {
  for (const method of ["request", "get"]) {
    const original = module[method];
    module[method] = function (input, ...args) { check(input); return original.call(this, input, ...args); };
  }
}
syncBuiltinESMExports();
