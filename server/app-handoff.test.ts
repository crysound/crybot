import { mkdtempSync, rmSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRemoteJWKSet, customFetch, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAppHandoff } from "./app-handoff.ts";
import { createCfAccess } from "./cf-access.ts";
import { SessionRegistry } from "./sessions.ts";
import { memoryHttp } from "./testing/memory-http.ts";

const env = {
  CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.example",
  CRYBOT_CF_ACCESS_AUD: "test-audience",
  CRYBOT_CF_ACCESS_ALLOW: "owner@crybot.example",
};
const state = "aB_9-".repeat(8);
const path = `/auth/app-handoff?state=${state}`;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let wrongKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwks: object;
const directories: string[] = [];

beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  wrongKeys = await generateKeyPair("RS256");
  jwks = { keys: [{ ...await exportJWK(keys.publicKey), kid: "fixture", alg: "RS256" }] };
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function jwt(options: { email?: string | null; sub?: string | null; aud?: string; iss?: string; exp?: number | null; wrong?: boolean } = {}) {
  const claims = {
    ...(options.email === null ? {} : { email: options.email ?? "OWNER@CRYBOT.EXAMPLE" }),
    ...(options.sub === null ? {} : { sub: options.sub ?? "fixture-subject" }),
    ...(options.exp === null ? {} : { exp: options.exp ?? Math.floor(Date.now() / 1000) + 300 }),
  };
  return new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "fixture" })
    .setIssuer(options.iss ?? "https://team.cloudflareaccess.example")
    .setAudience(options.aud ?? "test-audience")
    .sign(options.wrong ? wrongKeys.privateKey : keys.privateKey);
}

function fixture(config: NodeJS.ProcessEnv = env) {
  const directory = mkdtempSync(join(tmpdir(), "crybot-app-handoff-"));
  directories.push(directory);
  const sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  const keySet = createRemoteJWKSet(new URL("https://team.cloudflareaccess.example/cdn-cgi/access/certs"), {
    [customFetch]: async () => new Response(JSON.stringify(jwks)),
  });
  const access = createCfAccess(config, keySet);
  const handoff = createAppHandoff(access !== null, config, keySet);
  return {
    sessions,
    get: (headers: IncomingHttpHeaders = {}, target = path) => memoryHttp(async (req, res) => {
      const url = new URL(req.url!, "https://crybot.example");
      await access?.(req, res, url, sessions, "cry_session_fixture");
      await handoff(req, res, url);
    }, target, "GET", headers),
  };
}

describe("mobile app login handoff", () => {
  it("returns 404 when Access is disabled, even with a valid token", async () => {
    expect((await fixture({}).get({ "cf-access-jwt-assertion": await jwt() })).status).toBe(404);
  });

  it.each([null, "", "a".repeat(31), "a".repeat(129), "a".repeat(31) + "/", "a".repeat(32) + "\n", '<script>alert("x")</script>'])("rejects invalid state %j", async value => {
    const target = value === null ? "/auth/app-handoff" : `/auth/app-handoff?${new URLSearchParams({ state: value })}`;
    const result = await fixture().get({ "cf-access-jwt-assertion": await jwt() }, target);
    expect(result.status).toBe(400);
    expect(result.body).toBe("");
  });

  it("rejects duplicate state parameters", async () => {
    expect((await fixture().get({}, `${path}&state=${state}`)).status).toBe(400);
  });

  it.each([32, 128])("accepts a state of length %i", async length => {
    expect((await fixture().get({ "cf-access-jwt-assertion": await jwt() }, `/auth/app-handoff?state=${"x".repeat(length)}`)).status).toBe(200);
  });

  it.each([{}, { "cf-access-jwt-assertion": "invalid" }, { cookie: "CF_Authorization=invalid" }, { "cf-access-jwt-assertion": ["one", "two"] }])("rejects missing or malformed tokens %j", async headers => {
    expect((await fixture().get(headers)).status).toBe(401);
  });

  it.each([
    { wrong: true }, { aud: "other-audience" }, { iss: "https://other.cloudflareaccess.example" },
    { email: "guest@crybot.example" }, { email: null }, { exp: null }, { exp: 1 },
  ])("revalidates JWT signature, issuer, audience, expiry and allowlist %j", async options => {
    const response = await fixture().get({ "cf-access-jwt-assertion": await jwt(options) });
    expect(response.status).toBe(401);
    expect(response.body).toBe("");
  });

  it("requires at least sixty seconds of remaining validity", async () => {
    const now = Math.floor(Date.now() / 1000);
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    const f = fixture();
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ exp: now + 59 }) })).status).toBe(401);
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ exp: now + 60 }) })).status).toBe(200);
  });

  it("returns an escaped automatic callback and a matching manual link without scripts", async () => {
    const token = await jwt();
    const result = await fixture().get({ "cf-access-jwt-assertion": token });
    const callback = `crybot://auth?state=${state}&amp;token=${token}`;
    expect(result.status).toBe(200);
    expect(result.body).toContain(`<meta http-equiv="refresh" content="0;url=${callback}">`);
    expect(result.body).toContain(`<a role="button" href="${callback}">Return to Cry Bot</a>`);
    expect(result.body).not.toContain(`&token=${token}`);
    expect(result.body).not.toContain("<script");
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["referrer-policy"]).toBe("no-referrer");
    expect(result.headers["x-frame-options"]).toBe("DENY");
    expect(result.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(result.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    expect(result.headers.location).toBeUndefined();
  });

  it("uses the Access cookie only when the assertion header is absent", async () => {
    const token = await jwt();
    const cookieToken = await jwt({ sub: "cookie-subject" });
    const f = fixture();
    const cookie = `unrelated=value; CF_Authorization=${cookieToken}`;
    expect((await f.get({ cookie })).body).toContain(`&amp;token=${cookieToken}`);
    expect((await f.get({ cookie, "cf-access-jwt-assertion": token })).body).toContain(`&amp;token=${token}`);
    expect((await f.get({ cookie, "cf-access-jwt-assertion": "invalid" })).status).toBe(401);
    expect((await f.get({ cookie, "cf-access-jwt-assertion": "" })).status).toBe(401);
  });

  it("does not trust a live local session instead of revalidating the Access token", async () => {
    const f = fixture();
    const session = f.sessions.issue({ label: "fixture", scopes: ["admin", "client"] });
    for (const assertion of ["invalid", await jwt({ email: "guest@crybot.example" })]) {
      expect((await f.get({ authorization: `Bearer ${session.token}`, "cf-access-jwt-assertion": assertion })).status).toBe(401);
    }
  });

  it("rechecks allowlist even for an already authenticated Access identity", async () => {
    const f = fixture();
    const first = await f.get({ "cf-access-jwt-assertion": await jwt() });
    const cookie = String(first.headers["set-cookie"]).split(";")[0];
    expect((await f.get({ cookie, "cf-access-jwt-assertion": await jwt({ email: "guest@crybot.example" }) })).status).toBe(401);
  });

  it("accepts wildcard identities and normalized email fallback, but rejects unidentified tokens", async () => {
    const f = fixture({ ...env, CRYBOT_CF_ACCESS_ALLOW: "*" });
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ email: null }) })).status).toBe(200);
    expect((await fixture().get({ "cf-access-jwt-assertion": await jwt({ sub: null }) })).status).toBe(200);
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ email: null, sub: null }) })).status).toBe(401);
  });

  it.each(["", "Crybot", "x", "custom\n", "https://crybot.example", 'bad"><script>', "a".repeat(32)])("falls back to crybot for invalid configured scheme %j", async scheme => {
    const response = await fixture({ ...env, CRYBOT_APP_SCHEME: scheme }).get({ "cf-access-jwt-assertion": await jwt() });
    expect(response.status).toBe(200);
    expect(response.body).toContain(`href="crybot://auth?state=${state}&amp;token=`);
  });

  it("takes the scheme only from server configuration", async () => {
    const query = new URLSearchParams({ scheme: "other", redirect_uri: "other://auth", callback: "https://other.example" });
    const headers = { "cf-access-jwt-assertion": await jwt() };
    const configured = await fixture({ ...env, CRYBOT_APP_SCHEME: "crybot.test+app-2" }).get(headers, `${path}&${query}`);
    expect(configured.body).toContain(`href="crybot.test+app-2://auth?state=${state}&amp;token=`);
    const defaultScheme = await fixture().get(headers, `${path}&${query}`);
    expect(defaultScheme.body).toContain(`href="crybot://auth?state=${state}&amp;token=`);
    expect(defaultScheme.body).not.toContain("other://");
    expect(defaultScheme.body).not.toContain("https://other.example");
  });

  it.each([
    ["zh-CN,zh;q=0.9,en;q=0.8", "zh-Hans", "返回 Cry Bot"],
    ["en;q=0.5,zh-Hans;q=0.9", "zh-Hans", "返回 Cry Bot"],
    ["en-US,zh;q=0.9", "en", "Return to Cry Bot"],
    ["zh;q=0,en;q=1", "en", "Return to Cry Bot"],
    ["fr", "en", "Return to Cry Bot"],
  ])("selects the page language for %s", async (language, lang, label) => {
    const response = await fixture().get({ "cf-access-jwt-assertion": await jwt(), "accept-language": language });
    expect(response.body).toContain(`<html lang="${lang}">`);
    expect(response.body).toContain(`>${label}</a>`);
  });
});
