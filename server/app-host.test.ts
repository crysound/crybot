import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appHostConfig, createAppHost, isAppChannelRequest } from "./app-host.ts";
import { userError } from "./user-errors.ts";
import { memoryHttp, memoryRequest } from "./testing/memory-http.ts";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("app channel", () => {
  it("accepts a hostname and rejects ports and paths", () => {
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true })).toEqual({ host: "app.example.com", enabled: true });
    expect(() => appHostConfig({ CRYBOT_APP_HOST: "app.example.com:443" }, { cfAccess: true })).toThrow();
    expect(() => appHostConfig({ CRYBOT_APP_HOST: "https://app.example.com/path" }, { cfAccess: true })).toThrow();
    expect(appHostConfig({ CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.example.com", CRYBOT_CF_ACCESS_AUD: "aud", CRYBOT_CF_ACCESS_ALLOW: "user@example.com" }).enabled).toBe(true);
  });

  it("derives the legacy origin once", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(appHostConfig({ CRYBOT_APP_LINK_ORIGIN: "https://app.example.com" }, { cfAccess: true }).host).toBe("app.example.com");
    expect(appHostConfig({ CRYBOT_APP_LINK_ORIGIN: "https://app.example.com" }, { cfAccess: true }).host).toBe("app.example.com");
    expect(warning).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  it("recognizes an unverified proxied request and the app host", () => {
    const config = appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true });
    const app = createAppHost(config);
    const { req } = memoryRequest("/", "GET", { host: "app.example.com:443" });
    expect(isAppChannelRequest(req, false, config)).toBe(true);
    expect(app.rejectAccessAssertion(req)).toBe(false);
    const { req: proxied } = memoryRequest("/", "GET", { host: "legacy.example.com", "x-forwarded-for": "203.0.113.7" });
    expect(app.isRequest(proxied, false)).toBe(true);
    expect(app.isRequest(proxied, true)).toBe(false);
  });

  it("normalizes case, trailing dots, ports, and bracketed IPv6 hosts", () => {
    const config = appHostConfig({ CRYBOT_APP_HOST: "[2001:DB8::1]" }, { cfAccess: true });
    expect(config.host).toBe("2001:db8::1");
    const { req } = memoryRequest("/", "GET", { host: "[2001:db8::1]:443" });
    expect(isAppChannelRequest(req, false, config)).toBe(true);
    const { req: dotted } = memoryRequest("/", "GET", { host: "APP.EXAMPLE.COM.:443" });
    expect(isAppChannelRequest(dotted, false, appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true }))).toBe(true);
  });

  it("disables hosted modes", () => {
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true, hostedWorkspace: true }).enabled).toBe(false);
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true, cloudTeam: true }).enabled).toBe(false);
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com", CRYBOT_ADMIN_URL: "https://admin.example.com" }, { cfAccess: true }).enabled).toBe(false);
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com", CRYBOT_CLOUD_ROLE: "team" }, { cfAccess: true }).enabled).toBe(false);
  });
});

async function configuredAppHost() {
  vi.stubEnv("CRYBOT_APP_HOST", "app.example.com");
  vi.resetModules();
  return import("./app-host.ts");
}

it("returns the rate-limit JSON and a numeric Retry-After through appGate", async () => {
  const { appGate } = await configuredAppHost();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(Date, "now").mockReturnValue(1000);
  const call = () => memoryHttp(async (req, res) => {
    if (!appGate(req, res, "/api/auth/email/start", false)) res.writeHead(204).end();
  }, "/api/auth/email/start", "POST", { host: "app.example.com", "x-forwarded-for": "203.0.113.77" });
  for (let i = 0; i < 10; i++) expect((await call()).status).toBe(204);
  const response = await call();
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ error: "rate_limited" });
  expect(response.headers["retry-after"]).toBe("60");
});

it("audits pairing and session revocation with identity labels and no credentials", async () => {
  const { auditLogin, auditSessionRevoke } = await configuredAppHost();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const req = memoryRequest("/api/auth/pair", "POST", { host: "app.example.com", "user-agent": "Android", "x-forwarded-for": "203.0.113.7" }).req;
  const result = { ok: true, session: { label: "Fixture device" }, token: "fixture-token-secret", code: "fixture-code-secret" };
  expect(auditLogin(req, result)).toBe(result);
  auditLogin(req, { ok: false });
  expect(auditSessionRevoke(req, true, "Fixture owner")).toBe(true);
  expect(auditSessionRevoke(req, false, "Fixture owner")).toBe(false);
  const records = log.mock.calls.map(([line]) => JSON.parse(line));
  expect(records).toMatchObject([
    { event: "auth_audit", action: "login", result: "success", identity: "Fixture device", platform: "android", source_ip: "203.0.113.7" },
    { event: "auth_audit", action: "login", result: "failure", identity: "未知" },
    { event: "auth_audit", action: "session_revoke", result: "success", identity: "Fixture owner" },
  ]);
  expect(JSON.stringify(records)).not.toContain("fixture-token-secret");
  expect(JSON.stringify(records)).not.toContain("fixture-code-secret");
  auditLogin(memoryRequest("/api/auth/pair").req, result);
  expect(log).toHaveBeenCalledTimes(3);
});

it("audits email verify success and failure without auditing email start or leaking codes", async () => {
  await configuredAppHost();
  const { emailSignInRoute } = await import("./routes/email-sign-in.ts");
  const { SessionRegistry } = await import("./sessions.ts");
  const directory = mkdtempSync(join(tmpdir(), "crybot-email-audit-"));
  const sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const deps: import("./routes/email-sign-in.ts").EmailSignInRouteDeps = {
    cloudHome: false, sessions, cookieName: "fixture-session", environment: () => ({}), target: () => null,
    emailSignIn: {
      enabled: () => true,
      start: async () => ({ ok: true }),
      verify: async (_email, code) => code === "fixture-code-secret"
        ? { ok: true, email: "fixture@example.com", userId: "fixture-user", scopes: ["admin", "client"] }
        : { ok: false, status: 401, ...userError("serverError.email.codeWrong") },
    },
  };
  const call = (path: string, code: string) => memoryHttp(async (req, res) => {
    req.complete = true;
    req.push(JSON.stringify({ email: "fixture@example.com", code, label: "Fixture device" }));
    req.push(null);
    await emailSignInRoute(deps, req, res, path, "POST");
  }, path, "POST", { host: "app.example.com", "content-type": "application/json" });
  try {
    expect((await call("/api/auth/email/start", "")).status).toBe(200);
    expect(log).not.toHaveBeenCalled();
    expect((await call("/api/auth/email/verify", "wrong-secret")).status).toBe(401);
    const success = await call("/api/auth/email/verify", "fixture-code-secret");
    expect(success.status).toBe(200);
    expect(success.headers["set-cookie"]).toBeTruthy();
    const records = log.mock.calls.map(([line]) => JSON.parse(line));
    expect(records).toMatchObject([
      { event: "auth_audit", action: "login", result: "failure", identity: "未知" },
      { event: "auth_audit", action: "login", result: "success", identity: "Fixture device" },
    ]);
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain("fixture-code-secret");
    expect(serialized).not.toContain("wrong-secret");
    expect(serialized).not.toContain("cry_sess_");
  } finally {
    sessions.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
