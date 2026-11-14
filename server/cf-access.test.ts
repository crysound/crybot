import { createServer, type IncomingMessage } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRemoteJWKSet, customFetch, exportJWK, generateKeyPair, SignJWT } from "jose";
import { WebSocketServer } from "ws";
import { memoryHttp, memoryRequest } from "./testing/memory-http.ts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createCfAccess, isCfAccessPublicProbe } from "./cf-access.ts";
import { SessionRegistry, SESSION_TTL_MS } from "./sessions.ts";
import { resolveRequestAuth } from "./request-auth.ts";
import { appendUpgradeCookies, createUpgrades } from "./routes/upgrades.ts";

const env = { CRYBOT_CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com", CRYBOT_CF_ACCESS_AUD: "first, second", CRYBOT_CF_ACCESS_ALLOW: "owner@example.com" };
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let wrongKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwks: object;
beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  wrongKeys = await generateKeyPair("RS256");
  jwks = { keys: [{ ...await exportJWK(keys.publicKey), kid: "test", alg: "RS256" }] };
});
const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function jwt({ email = "OWNER@EXAMPLE.COM", aud = "second", iss = "https://example.cloudflareaccess.com", exp = "5m", wrong = false, sub = "owner-sub" }: { email?: string | null; aud?: string; iss?: string; exp?: string; wrong?: boolean; sub?: string | null } = {}) {
  return new SignJWT({ ...(email === null ? {} : { email }), ...(sub === null ? {} : { sub }) }).setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer(iss).setAudience(aud).setExpirationTime(exp).sign(wrong ? wrongKeys.privateKey : keys.privateKey);
}
async function fixture(config: NodeJS.ProcessEnv = env) {
  const dir = mkdtempSync(join(tmpdir(), "cry-access-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const sessions = new SessionRegistry({ file: join(dir, "sessions.json") });
  const issue = vi.spyOn(sessions, "issueAccess");
  const fetchKeys = vi.fn(async () => new Response(JSON.stringify(jwks)));
  const keySet = createRemoteJWKSet(new URL("https://example.cloudflareaccess.com/cdn-cgi/access/certs"), { [customFetch]: fetchKeys });
  const access = createCfAccess(config, keySet);
  const upgrades = createUpgrades();
  upgrades.route(path => path === "/socket");
  const sockets = new WebSocketServer({ noServer: true });
  sockets.on("headers", appendUpgradeCookies);
  const handle = async (req: IncomingMessage, res: import("node:http").ServerResponse) => {
    const url = new URL(req.url!, "http://localhost");
    const refusal = await access?.(req, res, url, sessions, "cry_session_test");
    if (refusal) { res.writeHead(refusal).end(); return; }
    const result = resolveRequestAuth(req, { sessions, cookieName: "cry_session_test", url, streamPath: "/api/events" });
    if (!result.auth) { res.writeHead(result.status).end(); return; }
    const pending = upgrades.pending(req);
    if (pending) {
      pending.release();
      sockets.handleUpgrade(req, pending.socket, pending.head, socket => socket.close());
      return;
    }
    res.writeHead(200, { "content-type": url.pathname === "/api/events" ? "text/event-stream" : "application/json" }).end(JSON.stringify(result.auth));
  };
  const server = createServer();
  upgrades.attach(server, handle);
  cleanups.push(() => { upgrades.close(); sockets.close(); });
  const get = (headers: Record<string, string> = {}, path = "/api/bots") => memoryHttp(handle, path, "GET", { "x-forwarded-proto": "https", ...headers });
  const direct = (headers: Record<string, string>) => memoryHttp(handle, "/api/bots", "GET", headers);
  const upgrade = async (assertion: string) => {
    const { req, socket } = memoryRequest("/socket", "GET", { upgrade: "websocket", connection: "Upgrade", "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==", "sec-websocket-version": "13", "cf-access-jwt-assertion": assertion });
    server.emit("upgrade", req, socket, Buffer.alloc(0));
    for (let attempt = 0; attempt < 100 && !socket.chunks.length; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    const raw = Buffer.concat(socket.chunks).toString();
    socket.destroy();
    return raw;
  };
  return { get, direct, upgrade, sessions, issue, fetchKeys };
}

describe("Cloudflare Access", () => {
  it("recognizes only GET public probes", () => {
    const domainCheck = `/.well-known/crybot/domain-check/${"a".repeat(64)}`;
    const publicPaths = ["/api/health", "/api/brand", "/.well-known/crybot/environment", domainCheck];
    for (const path of publicPaths) expect(isCfAccessPublicProbe("GET", path)).toBe(true);
    for (const method of ["POST", "HEAD", "PUT"]) {
      for (const path of publicPaths) expect(isCfAccessPublicProbe(method, path)).toBe(false);
    }
    for (const path of [
      "/.well-known/crybot/domain-check/short",
      `/.well-known/crybot/domain-check/${"A".repeat(64)}`,
      `${domainCheck}/extra`,
      "/api/bots",
    ]) expect(isCfAccessPublicProbe("GET", path)).toBe(false);
  });

  it("issues an owner cookie, reuses it, and caches the JWKS", async () => {
    const f = await fixture();
    const token = await jwt();
    const response = await f.get({ "cf-access-jwt-assertion": token });
    expect(response.status).toBe(200);
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("Secure");
    expect(Number(/Max-Age=(\d+)/.exec(cookie)?.[1])).toBeGreaterThanOrEqual(SESSION_TTL_MS / 1000 - 1);
    const auth = await response.json();
    expect(auth.session.scopes).toEqual(["admin", "client"]);
    expect(auth.session.email).toBeUndefined();
    expect((await f.get({ cookie })).status).toBe(200);
    expect((await f.get({ cookie, "cf-access-jwt-assertion": "bad" })).status).toBe(200);
    expect(f.issue).toHaveBeenCalledTimes(1);
    expect((await f.get({ "cf-access-jwt-assertion": token })).status).toBe(200);
    expect(f.fetchKeys).toHaveBeenCalledTimes(1);
  });
  it("reuses one session and cookie for five cookie-free requests with the same sub", async () => {
    const f = await fixture({ ...env, CRYBOT_CF_ACCESS_ALLOW: "*" });
    const cookies = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const response = await f.get({ "cf-access-jwt-assertion": await jwt({ email: `owner${i}@example.com` }) });
      expect(response.status).toBe(200);
      cookies.add(String(response.headers["set-cookie"]).split(";")[0]);
    }
    expect(cookies.size).toBe(1);
    expect(f.sessions.list()).toHaveLength(1);
    const token = [...cookies][0]!.split("=")[1];
    expect(f.sessions.authenticate(token)?.accessIdentity).toBe("owner-sub");
  });
  it("revokes a mismatched cookie session and reuses the JWT identity's session", async () => {
    const f = await fixture();
    const first = await f.get({ "cf-access-jwt-assertion": await jwt({ sub: "first" }) });
    const second = await f.get({ "cf-access-jwt-assertion": await jwt({ sub: "second" }) });
    const oldCookie = String(first.headers["set-cookie"]).split(";")[0]!;
    const oldSession = f.sessions.authenticate(oldCookie.split("=")[1])!;
    const ticket = f.sessions.issueStreamTicket(oldSession.id).ticket;
    const changed = await f.get({ cookie: oldCookie, "cf-access-jwt-assertion": await jwt({ sub: "second" }) });
    expect(changed.status).toBe(200);
    expect(String(changed.headers["set-cookie"]).split(";")[0]).toBe(String(second.headers["set-cookie"]).split(";")[0]);
    expect(f.sessions.authenticate(oldCookie.split("=")[1])).toBeNull();
    expect(f.sessions.ticketOwner(ticket)).toBeNull();
    expect((await f.get({ cookie: oldCookie })).status).toBe(401);
    expect(f.sessions.list()).toHaveLength(1);
  });
  it("issues a replacement when the JWT identity has no session", async () => {
    const f = await fixture();
    const first = await f.get({ "cf-access-jwt-assertion": await jwt() });
    const cookie = String(first.headers["set-cookie"]).split(";")[0]!;
    const changed = await f.get({ cookie, "cf-access-jwt-assertion": await jwt({ sub: "other" }) });
    expect(changed.status).toBe(200);
    expect(f.sessions.authenticate(cookie.split("=")[1])).toBeNull();
    expect(f.sessions.list()).toHaveLength(1);
  });
  it("falls back to normalized email only without a sub and rejects unidentified JWTs", async () => {
    const f = await fixture({ ...env, CRYBOT_CF_ACCESS_ALLOW: "*" });
    for (const email of ["OWNER@EXAMPLE.COM", "owner@example.com"]) {
      expect((await f.get({ "cf-access-jwt-assertion": await jwt({ sub: null, email }) })).status).toBe(200);
    }
    expect(f.sessions.list()).toHaveLength(1);
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ sub: null, email: null }) })).status).toBe(401);
  });
  it.each([{ wrong: true }, { aud: "wrong" }, { iss: "https://other.example.com" }, { exp: "-1s" }])("rejects invalid JWT %j before loopback trust", async options => {
    const f = await fixture();
    const response = await f.direct({ "cf-access-jwt-assertion": await jwt(options) });
    expect(response.status).toBe(401); expect(f.issue).not.toHaveBeenCalled();
  });
  it("denies emails outside the allowlist and absent emails", async () => {
    const f = await fixture();
    for (const email of ["guest@example.com", null]) expect((await f.get({ "cf-access-jwt-assertion": await jwt({ email }) })).status).toBe(403);
  });
  it("wildcard accepts a verified identity with or without email", async () => {
    const f = await fixture({ ...env, CRYBOT_CF_ACCESS_ALLOW: "*" });
    for (const email of [null, "", "guest@example.com"]) expect((await f.get({ "cf-access-jwt-assertion": await jwt({ email }) })).status).toBe(200);
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ wrong: true }) })).status).toBe(401);
  });
  it("leaves unconfigured and assertion-free requests unchanged", async () => {
    const disabled = await fixture({});
    expect((await disabled.get({ "cf-access-jwt-assertion": await jwt() })).status).toBe(403);
    expect((await disabled.direct({ "cf-access-jwt-assertion": "bad" })).status).toBe(200);
    expect((await (await fixture()).get()).status).toBe(403);
  });
  it("replaces expired credentials and preserves live bearer sessions and stream tickets", async () => {
    const f = await fixture();
    const headers = { "cf-access-jwt-assertion": await jwt(), authorization: "Bearer cry_sess_expired", cookie: "cry_session_test=expired" };
    expect((await f.get(headers)).status).toBe(200);
    const issued = f.sessions.issue({ label: "test", scopes: ["admin", "client"] });
    f.issue.mockClear();
    expect((await f.get({ authorization: `Bearer ${issued.token}`, "cf-access-jwt-assertion": "bad" })).status).toBe(200);
    const ticket = f.sessions.issueStreamTicket(issued.session.id).ticket;
    expect((await f.get({ "cf-access-jwt-assertion": "bad" }, `/api/events?ticket=${ticket}`)).status).toBe(200);
    expect(f.issue).not.toHaveBeenCalled();
    const sse = await f.get({ "cf-access-jwt-assertion": await jwt() }, "/api/events?ticket=expired");
    expect(sse.status).toBe(200); expect(String(sse.headers["set-cookie"])).toContain("cry_sess_");
  });
  it("replaces expired bearer and ticket credentials even with a matching live Access cookie", async () => {
    const f = await fixture();
    const assertion = await jwt();
    const first = await f.get({ "cf-access-jwt-assertion": assertion });
    const cookie = String(first.headers["set-cookie"]).split(";")[0]!;
    for (const [authorization, path] of [["Bearer cry_sess_expired", "/api/bots"], ["", "/api/events?ticket=expired"]]) {
      const response = await f.get({ cookie, authorization: authorization!, "cf-access-jwt-assertion": assertion }, path);
      expect(response.status).toBe(200);
      expect(String(response.headers["set-cookie"]).split(";")[0]).toBe(cookie);
    }
    expect(f.sessions.list()).toHaveLength(1);
  });
  it("authenticates WebSocket upgrades and includes the session cookie in the handshake", async () => {
    const f = await fixture();
    const accepted = await f.upgrade(await jwt());
    expect(accepted).toContain("101 Switching Protocols");
    expect(accepted).toContain("Set-Cookie: cry_session_test=cry_sess_");
    expect(await f.upgrade("bad")).toContain("401 Unauthorized");
  });
  it("fails closed for partial configuration", () => {
    expect(() => createCfAccess({ CRYBOT_CF_ACCESS_ALLOW: "*" })).toThrow();
  });
});
