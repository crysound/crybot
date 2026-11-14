import { mkdtempSync, rmSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeAll, expect, it } from "vitest";
import { createAppHandoffGate } from "./app-handoff.ts";
import { json } from "./harness/http.ts";
import { SessionRegistry } from "./sessions.ts";
import { memoryHttp } from "./testing/memory-http.ts";

const env = {
  CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.example",
  CRYBOT_CF_ACCESS_AUD: "gate-test",
  CRYBOT_CF_ACCESS_ALLOW: "owner@crybot.example",
};
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let keySet: ReturnType<typeof createLocalJWKSet>;
const directories: string[] = [];

beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  keySet = createLocalJWKSet({ keys: [{ ...await exportJWK(keys.publicKey), kid: "fixture", alg: "RS256" }] });
});

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function fixture(config: NodeJS.ProcessEnv = env) {
  const directory = mkdtempSync(join(tmpdir(), "cry-app-handoff-gate-"));
  directories.push(directory);
  const sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  const gate = createAppHandoffGate(config, keySet);
  return (path: string, headers: IncomingHttpHeaders = {}, method = "GET") => memoryHttp(async (req, res) => {
    const url = new URL(req.url!, "https://crybot.example");
    if (await gate(req, res, url, req.method!, url.pathname, sessions, "cry_session_fixture", json)) return;
    json(res, 200, { route: url.pathname });
  }, path, method, headers);
}

async function assertion(email: string) {
  return new SignJWT({ sub: email, email }).setProtectedHeader({ alg: "RS256", kid: "fixture" })
    .setIssuer(`https://${env.CRYBOT_CF_ACCESS_TEAM_DOMAIN}`).setAudience(env.CRYBOT_CF_ACCESS_AUD)
    .setExpirationTime("5m").sign(keys.privateKey);
}

it("ends a refused request with the Access 403 JSON response", async () => {
  const response = await fixture()("/auth/app-handoff", { "cf-access-jwt-assertion": await assertion("guest@crybot.example") });
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Cloudflare Access identity is not allowed" });
});

it.each(["/api/health", "/api/brand", "/.well-known/crybot/environment", `/.well-known/crybot/domain-check/${"a".repeat(64)}`])(
  "lets the public GET probe %s reach its route even with an invalid assertion", async (path) => {
    const response = await fixture()(path, { "cf-access-jwt-assertion": "invalid" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ route: path });
  },
);

it("checks Access on a public probe path when the method is POST", async () => {
  const response = await fixture()("/api/health", { "cf-access-jwt-assertion": "invalid" }, "POST");
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Invalid Cloudflare Access assertion" });
});

it("lets an allowed identity reach a normal route and issues its session cookie", async () => {
  const response = await fixture()("/api/bots", { "cf-access-jwt-assertion": await assertion("owner@crybot.example") });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ route: "/api/bots" });
  expect(response.headers["set-cookie"]).toMatch(/^cry_session_fixture=cry_sess_/);
});

it("lets normal requests through when Access is not configured", async () => {
  const response = await fixture({})("/api/bots");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ route: "/api/bots" });
  expect(response.headers["set-cookie"]).toBeUndefined();
});

it("handles an allowed handoff request without falling through to another route", async () => {
  const response = await fixture()("/auth/app-handoff", { "cf-access-jwt-assertion": await assertion("owner@crybot.example") });
  expect(response.status).toBe(400);
  expect(response.body).toBe("");
  expect(response.headers["cache-control"]).toBe("no-store");
});
