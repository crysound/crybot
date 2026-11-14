import { createECDH } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { json } from "./harness/http.ts";
import { SessionRegistry } from "./sessions.ts";
import { memoryHttp } from "./testing/memory-http.ts";

const env = {
  CRYBOT_APP_HOST: "app.example.com",
  CRYBOT_APP_LINK_ORIGIN: "",
  CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.example",
  CRYBOT_CF_ACCESS_AUD: "fixture",
  CRYBOT_CF_ACCESS_ALLOW: "allowed@example.com",
  CRYBOT_ADMIN_URL: undefined,
  CRYBOT_ADMIN_WORKSPACE: undefined,
  CRYBOT_ADMIN_MEMBERSHIP: undefined,
  CRYBOT_CLOUD_ROLE: undefined,
};
const appKey = createECDH("prime256v1");
appKey.generateKeys();
const handoffPath = `/auth/app-handoff?state=${"s".repeat(32)}&pk=${appKey.getPublicKey().toString("base64url")}`;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let directory: string;
let sessions: SessionRegistry;
let gate: ReturnType<typeof import("./app-handoff.ts").createAppHandoffGate>;
let appGate: typeof import("./app-host.ts").appGate;
let appLinks: ReturnType<typeof import("./app-links.ts").createAppLinks>;

beforeAll(async () => { keys = await generateKeyPair("RS256"); });
beforeEach(async () => {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  directory = mkdtempSync(join(tmpdir(), "cry-handoff-gate-"));
  sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  const links = await import("./app-links.ts");
  appGate = links.appGate;
  appLinks = links.createAppLinks();
  const { createAppHandoffGate } = await import("./app-handoff.ts");
  gate = createAppHandoffGate(process.env, async () => keys.publicKey);
});
afterEach(() => {
  sessions.close();
  rmSync(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function jwt(email = "allowed@example.com") {
  return new SignJWT({ sub: "fixture-subject", email }).setProtectedHeader({ alg: "RS256" })
    .setIssuer("https://team.cloudflareaccess.example").setAudience("fixture").setExpirationTime("5m").sign(keys.privateKey);
}

function request(headers: IncomingHttpHeaders = {}, target = handoffPath, method = "GET") {
  return memoryHttp(async (req, res) => {
    const url = new URL(req.url!, "https://main.example.com");
    if (appGate(req, res, url.pathname, false, true) || appLinks(req, res, url)) return;
    if (await gate(req, res, url, method, url.pathname, sessions, "cry_session_fixture", json)) return;
    json(res, 418, { error: "fallthrough" });
  }, target, method, { host: "main.example.com", "x-forwarded-proto": "https", ...headers });
}

it("blocks app-host assertions before issuing an Access session", async () => {
  const result = await request({ host: "app.example.com", "cf-access-jwt-assertion": await jwt() });
  expect(result.status).toBe(400);
  expect(sessions.list()).toEqual([]);
});

it.each(["app.example.com", "main.example.com"])("blocks cookie-only handoff on the app channel at %s", async host => {
  const result = await request({ host, cookie: `CF_Authorization=${await jwt()}` });
  expect(result.status).toBe(404);
  expect(await result.json()).toEqual({ error: "not_found" });
});

it("checks Access before the app-channel route restriction", async () => {
  const invalid = await request({ "cf-access-jwt-assertion": "invalid" });
  expect(invalid.status).toBe(401);
  expect(await invalid.json()).toEqual({ error: "Invalid Cloudflare Access assertion" });
  const denied = await request({ "cf-access-jwt-assertion": await jwt("denied@example.com") });
  expect(denied.status).toBe(403);
  expect(await denied.json()).toEqual({ error: "Cloudflare Access identity is not allowed" });
});

it("marks valid Access requests before the app gate, including requests with local sessions", async () => {
  const token = await jwt();
  const local = sessions.issue({ label: "Fixture", scopes: ["admin", "client"] });
  for (const cookie of [undefined, `cry_session_fixture=${local.token}`]) {
    const result = await request({ "cf-access-jwt-assertion": token, ...(cookie ? { cookie } : {}) });
    expect(result.status).toBe(200);
    expect(result.body).toContain("https://app.example.com/auth/app-return?");
    expect(result.body).not.toContain(token);
  }
});

it("keeps public probes and app returns ahead of Access refusal", async () => {
  const headers = { "cf-access-jwt-assertion": "invalid" };
  expect((await request(headers, "/api/health")).status).toBe(418);
  expect((await request(headers, "/auth/app-return")).status).toBe(404);
  expect((await request({ host: "app.example.com" }, "/auth/app-return")).status).toBe(200);
  expect((await request(headers, "/api/health", "POST")).status).toBe(401);
});

it("leaves Feishu exchange to its own validator without requiring an existing session", async () => {
  expect((await request({ host: "app.example.com" }, "/api/auth/feishu/exchange", "POST")).status).toBe(418);
  expect((await request({ "cf-access-jwt-assertion": "invalid" }, "/api/auth/feishu/exchange", "POST")).status).toBe(401);
});

it("does not dispatch non-GET requests to the handoff page", async () => {
  expect((await request({ "cf-access-jwt-assertion": await jwt() }, handoffPath, "POST")).status).toBe(418);
});

it("applies the app-channel rate limit before falling through", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    for (let i = 0; i < 10; i++) expect((await request({}, "/api/auth/feishu/exchange", "POST")).status).toBe(418);
    expect((await request({}, "/api/auth/feishu/exchange", "POST")).status).toBe(429);
  } finally {
    log.mockRestore();
  }
});
