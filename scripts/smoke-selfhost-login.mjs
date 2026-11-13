import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { verificationServerEnvironment } from "./control-cry.ts";

const run = promisify(execFile);
const root = mkdtempSync(join(tmpdir(), "cry-selfhost-"));
let child;
let jwksServer;
let output = "";
try {
  const dataDir = join(root, "data");
  const updates = join(root, "updates");
  mkdirSync(dataDir); mkdirSync(updates); mkdirSync(join(dataDir, "tmp"));
  writeFileSync(join(dataDir, "config.json"), JSON.stringify({ features: { smartSetupChoices: false }, instances: { claude: { driver: "claudeAgent", config: { cli: resolve("server/testing/fake-claude-cli.ts") } } } }));
  writeFileSync(join(updates, "latest.yml"), "version: 1.0.0\n");
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  jwksServer = createServer((_req, res) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ keys: [publicJwk] })); });
  const publicJwk = { ...await exportJWK(publicKey), kid: "fixture", alg: "RS256" };
  jwksServer.listen(0, "127.0.0.1"); await once(jwksServer, "listening");
  const jwksUrl = `http://127.0.0.1:${jwksServer.address().port}/certs`;
  const ports = [];
  const listeners = [];
  for (let index = 0; index < 2; index++) {
    const listener = createServer(); listener.listen(0, "127.0.0.1"); await once(listener, "listening");
    ports.push(listener.address().port); listeners.push(listener);
  }
  await Promise.all(listeners.map(listener => new Promise(resolve => listener.close(resolve))));
  const [port, webhookPort] = ports;
  const preload = join(root, "fixture-fetch.mjs");
  writeFileSync(preload, `const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = String(input?.url ?? input);
  if (url === "https://example.cloudflareaccess.com/cdn-cgi/access/certs") return original(${JSON.stringify(jwksUrl)}, init);
  if (new URL(url).hostname === "127.0.0.1") return original(input, init);
  return Promise.reject(new Error("Fixture blocked outbound fetch"));
};\n`);
  const env = { ...verificationServerEnvironment({}, dataDir, port), CRYBOT_DATA_DIR: dataDir, CRYBOT_PORT: String(port), CRYBOT_WEBHOOK_PORT: String(webhookPort),
    CRYBOT_CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com", CRYBOT_CF_ACCESS_AUD: "fixture", CRYBOT_CF_ACCESS_ALLOW: "*", CRYBOT_DESKTOP_UPDATES_DIR: updates,
    CRYBOT_DISABLE_MODEL_CATALOG_FETCH: "1" };
  child = spawn(process.execPath, ["--import", preload, resolve("dist-server/index.js")], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(origin + "/api/health", { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(ready, output);
  const token = await new SignJWT({}).setProtectedHeader({ alg: "RS256", kid: "fixture" }).setIssuer("https://example.cloudflareaccess.com").setAudience("fixture").setExpirationTime("5m").sign(privateKey);
  async function curl(path, args, expected) {
    const headers = join(root, "headers"), body = join(root, "body");
    const options = ["--silent", "--show-error", "--path-as-is", "--max-time", "10", "-D", headers, "-o", body, "-w", "%{http_code}", ...args, origin + path];
    console.log("$ curl " + options.map(value => JSON.stringify(value === token ? "$JWT" : value.replace(token, "$JWT"))).join(" "));
    const { stdout } = await run("curl", options);
    const responseHeaders = readFileSync(headers, "utf8");
    console.log(responseHeaders.replace(/(cry_sess_)[^;\r\n]+/g, "$1<fixture-token>"));
    console.log(readFileSync(body, "utf8").slice(0, 300));
    assert.equal(Number(stdout), expected);
    return responseHeaders;
  }
  const proxy = ["-H", "X-Forwarded-Proto: https"];
  await curl("/api/auth/session", proxy, 403);
  await curl("/api/auth/session", [...proxy, "-H", "Cf-Access-Jwt-Assertion: forged"], 401);
  const headers = await curl("/api/auth/session", [...proxy, "-H", `Cf-Access-Jwt-Assertion: ${token}`], 200);
  const cookie = /^set-cookie:\s*([^;\r\n]+)/im.exec(headers)?.[1];
  assert(cookie);
  await curl("/api/bots", [...proxy, "-H", `Cookie: ${cookie}`], 200);
  await curl("/api/health", proxy, 200);
  await curl("/desktop-updates/latest.yml", proxy, 200);
  await curl("/desktop-updates/", proxy, 404);
  await curl("/desktop-updates/..%2fpackage.json", proxy, 404);
  console.log("PASS: isolated built-server Access login and public desktop downloads");
} catch (error) {
  console.error(error);
  if (output) console.error(output.slice(-4000));
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) { const exited = once(child, "exit"); child.kill("SIGKILL"); await exited; }
  jwksServer?.closeAllConnections();
  if (jwksServer?.listening) await new Promise(resolve => jwksServer.close(resolve));
  rmSync(root, { recursive: true, force: true });
}
