// tunnelListener and tailnetShare use independent listeners and are outside this fixture.
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { expect, it, vi } from "vitest";
import { verificationServerArgs, verificationServerEnvironment } from "../scripts/control-cry.ts";
import { waitForExit } from "./testing/cleanup.ts";
import { freePortBlock } from "./testing/ports.ts";

const appHost = "app.example.com";
const legacyHost = "legacy.example.com";
const mainHost = "main.example.com";
const baseEnv = {
  CRYBOT_APP_HOST: appHost,
  CRYBOT_FEISHU_APP_ID: "cli_example",
  CRYBOT_APPLE_APP_IDS: "ABCDE12345.com.example.app",
  CRYBOT_ANDROID_PACKAGE: "com.example.app",
  CRYBOT_ANDROID_CERT_SHA256: Array(32).fill("AA").join(":"),
};

type Reply = { status: number; headers: Headers; body: string; json(): unknown };
function request(base: string, path: string, host = appHost, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: "127.0.0.1", port: new URL(base).port, path, method: init.method ?? "GET", headers: { host, ...init.headers } }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(Buffer.from(chunk)));
      res.on("error", reject);
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(key, item);
        }
        resolve({ status: res.statusCode!, headers, body, json: () => JSON.parse(body) });
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("Fixture request timed out")));
    req.end(init.body);
  });
}

async function server(extra: NodeJS.ProcessEnv = {}, jwksUrl?: string) {
  const port = await freePortBlock([0, 1]);
  const directory = mkdtempSync(join(tmpdir(), "crybot-app-host-"));
  const updates = join(directory, "updates");
  const staticDir = join(directory, "static");
  mkdirSync(join(directory, "tmp"));
  mkdirSync(updates);
  mkdirSync(staticDir);
  writeFileSync(join(staticDir, "index.html"), "<!doctype html><title>Isolated App Host fixture</title>");
  writeFileSync(join(directory, "config.json"), JSON.stringify({ instances: { fixture: { driver: "unknown-fixture" } }, features: { smartSetupChoices: false } }));
  writeFileSync(join(updates, "latest.yml"), "version: 0.0.0-fixture\n");
  const preload = join(directory, "fixture-fetch.mjs");
  writeFileSync(preload, `const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = String(input?.url ?? input);
  if (url === "https://example.cloudflareaccess.com/cdn-cgi/access/certs" && ${JSON.stringify(jwksUrl ?? null)}) return original(${JSON.stringify(jwksUrl ?? null)}, init);
  if (new URL(url).hostname === "127.0.0.1") return original(input, init);
  return Promise.reject(new Error("Fixture blocked outbound fetch"));
};\n`);
  const childEnv = { ...verificationServerEnvironment({}, directory, port), ...baseEnv, CRYBOT_STATIC_DIR: staticDir, CRYBOT_DESKTOP_UPDATES_DIR: updates, CRYBOT_DISABLE_MODEL_CATALOG_FETCH: "1", ...extra };
  const child = spawn(process.execPath, ["--import", pathToFileURL(preload).href, ...verificationServerArgs(childEnv)], { env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const close = async () => {
    await waitForExit(child, { signal: "SIGTERM" });
    rmSync(directory, { recursive: true, force: true });
  };
  try {
    await vi.waitFor(async () => {
      if (child.exitCode !== null) throw new Error(output);
      expect((await request(base, "/api/health")).status).toBe(200);
    }, { timeout: 20_000, interval: 100 });
  } catch (error) {
    await close();
    throw error;
  }
  return { base, close };
}

type SurfaceRoute = { path: string; method?: "POST"; app: number; legacy?: number; unconfigured?: number };
const surface: SurfaceRoute[] = [
  { path: "/api/health", app: 200 },
  { path: "/api/brand", app: 200 },
  { path: "/.well-known/crybot/environment", app: 200 },
  { path: "/.well-known/crybot/domain-check/" + "0".repeat(64), app: 404 },
  { path: "/.well-known/apple-app-site-association", app: 200, legacy: 404, unconfigured: 404 },
  { path: "/.well-known/assetlinks.json", app: 200, legacy: 404, unconfigured: 404 },
  { path: "/desktop-updates/latest.yml", app: 200 },
  { path: "/api/health/hosted", app: 503 },
  { path: "/auth/app-handoff", app: 404 },
  { path: "/api/auth/hosted/", app: 404, unconfigured: 403 },
  { path: "/api/auth/hosted/session", app: 404, unconfigured: 403 },
  { path: "/mcp-oauth/callback", app: 400 },
  { path: "/", app: 200 },
  { path: "/pair", app: 200 },
  { path: "/auth/feishu/start", app: 404, legacy: 404 },
  { path: "/auth/feishu/callback", app: 404, legacy: 404 },
  { path: "/auth/app-return", app: 200, legacy: 404, unconfigured: 404 },
  { path: "/auth/feishu/app-return", app: 200, legacy: 404, unconfigured: 404 },
  { path: "/api/auth/feishu/exchange", method: "POST", app: 404, legacy: 404 },
  { path: "/api/auth/email/start", method: "POST", app: 404 },
  { path: "/api/auth/email/verify", method: "POST", app: 404 },
  { path: "/api/auth/pair", method: "POST", app: 401 },
  { path: "/api/pair", method: "POST", app: 401 },
  { path: "/api/cloud/pairing", method: "POST", app: 403 },
  { path: "/api/cloud/health", app: 403 },
  { path: "/api/cloud/box", app: 403 },
  { path: "/api/cloud/power", app: 403 },
  { path: "/api/cloud/power/sleep", method: "POST", app: 403 },
  { path: "/api/cloud/team/admin", app: 403 },
  { path: "/api/cloud/team/member-left", method: "POST", app: 403 },
  { path: "/api/cloud/team/policy-changed", method: "POST", app: 403 },
  { path: "/api/cloud/plan", method: "POST", app: 403 },
  { path: "/api/page-files/unsigned/index.html", app: 404 },
  { path: "/api/bots", app: 403 },
  { path: "/api/events", app: 403 },
  { path: "/api/config", app: 403 },
  { path: "/api/inbox", app: 403 },
  { path: "/api/auth/sessions", app: 403 },
  { path: "/api/auth/pairing", app: 403 },
  { path: "/api/attachments", method: "POST", app: 403 },
  { path: "/api/attachments/example", app: 403 },
  { path: "/api/files?name=fixture.txt", method: "POST", app: 403 },
];

async function checkSurface(base: string, unconfigured = false) {
  for (const host of [appHost, legacyHost]) {
    for (const route of surface) {
      const response = await request(base, route.path, host, {
        method: route.method,
        headers: { "content-type": "application/json", ...(host === legacyHost ? { "x-forwarded-for": "203.0.113.44" } : {}) },
        ...(route.method === "POST" ? { body: JSON.stringify({ code: "7KQ2M9XDH4TP" }) } : {}),
      });
      const expected = unconfigured ? route.unconfigured ?? route.app : host === legacyHost ? route.legacy ?? route.app : route.app;
      expect(response.status, `${host} ${route.method ?? "GET"} ${route.path}`).toBe(expected);
      if (route.path === "/desktop-updates/latest.yml") expect(response.body).toBe("version: 0.0.0-fixture\n");
    }
  }
}

it("runs the unauthenticated surface against a real server for app and legacy proxy hosts", async () => {
  const fixture = await server();
  try {
    const aasa = "/.well-known/apple-app-site-association";
    expect((await request(fixture.base, aasa, appHost)).status, "server sees App Host").toBe(200);
    expect((await request(fixture.base, aasa, legacyHost)).status, "server sees legacy Host").toBe(404);
    await checkSurface(fixture.base);
    const limited = { method: "POST", body: "{}", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.77" } };
    for (let i = 0; i < 10; i++) {
      const response = await request(fixture.base, "/api/auth/email/start", appHost, limited);
      expect(response.json()).not.toMatchObject({ error: "rate_limited" });
    }
    const eleventh = await request(fixture.base, "/api/auth/email/start", appHost, limited);
    expect(eleventh.status).toBe(429);
    expect(eleventh.json()).toEqual({ error: "rate_limited" });
    expect(Number(eleventh.headers.get("retry-after"))).toBeGreaterThan(0);
    const assertion = await request(fixture.base, "/auth/app-handoff", appHost, { headers: { "cf-access-jwt-assertion": "fixture" } });
    expect(assertion.status).toBe(400);
    for (const host of [appHost, legacyHost]) {
      const socket = createConnection(Number(new URL(fixture.base).port), "127.0.0.1");
      try {
        await once(socket, "connect");
        const proxyHeader = host === legacyHost ? "X-Forwarded-For: 203.0.113.44\r\n" : "";
        socket.write(`GET /api/bots/fixture/browser/stream HTTP/1.1\r\nHost: ${host}\r\n${proxyHeader}Connection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`);
        const [chunk] = await once(socket, "data") as [Buffer];
        expect(chunk.toString(), host).not.toMatch(/^HTTP\/1\.1 101\b/);
        expect(chunk.toString(), host).toMatch(/^HTTP\/1\.1 403\b/);
      } finally {
        socket.destroy();
      }
    }
  } finally {
    await fixture.close();
  }
}, 60_000);

it("keeps an unconfigured instance's complete public surface unchanged", async () => {
  const fixture = await server(Object.fromEntries(Object.keys(baseEnv).map(key => [key, ""])));
  try {
    await checkSurface(fixture.base, true);
  } finally {
    await fixture.close();
  }
}, 60_000);

it("verifies Access JWTs before the paired cookie shortcut on the main host", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = { ...await exportJWK(publicKey), kid: "fixture", alg: "RS256" };
  const jwks = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [publicJwk] }));
  });
  let fixture: Awaited<ReturnType<typeof server>> | undefined;
  try {
    jwks.listen(0, "127.0.0.1");
    await once(jwks, "listening");
    const address = jwks.address();
    if (!address || typeof address === "string") throw new Error("Missing fixture JWKS address");
    fixture = await server({ CRYBOT_CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com", CRYBOT_CF_ACCESS_AUD: "fixture", CRYBOT_CF_ACCESS_ALLOW: "*" }, `http://127.0.0.1:${address.port}/certs`);
    const token = await new SignJWT({ sub: "fixture-owner" }).setProtectedHeader({ alg: "RS256", kid: "fixture" }).setIssuer("https://example.cloudflareaccess.com").setAudience("fixture").setExpirationTime("5m").sign(privateKey);
    const headers = { "cf-access-jwt-assertion": token, "x-forwarded-for": "203.0.113.88", "x-forwarded-proto": "https" };
    const handoff = await request(fixture.base, "/auth/app-handoff", mainHost, { headers });
    expect(handoff.status).toBe(400);
    const opened = await request(fixture.base, "/api/auth/pairing", mainHost, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: "{}" });
    expect(opened.status).toBe(200);
    const { code } = opened.json() as { code: string };
    const paired = await request(fixture.base, "/api/auth/pair", appHost, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, cookie: true, label: "Fixture device" }) });
    expect(paired.status).toBe(200);
    const cookie = paired.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();
    const cookieHandoff = await request(fixture.base, "/auth/app-handoff", mainHost, { headers: { ...headers, cookie: cookie! } });
    expect(cookieHandoff.status).toBe(400);
    const invalid = await request(fixture.base, "/auth/app-handoff", mainHost, { headers: { ...headers, "cf-access-jwt-assertion": "invalid" } });
    expect(invalid.status).toBe(401);
    expect(invalid.json()).toEqual({ error: "Invalid Cloudflare Access assertion" });
  } finally {
    await fixture?.close();
    jwks.closeAllConnections();
    if (jwks.listening) await new Promise<void>((resolve, reject) => jwks.close(error => error ? reject(error) : resolve()));
  }
}, 60_000);
