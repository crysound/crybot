import { createServer, request as httpRequest, type RequestListener, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { feishuLoginConfig } from "./feishu-login.ts";
import { feishuExchangeRoute } from "./feishu-routes.ts";
import { readBody, json } from "./harness/http.ts";
import { SessionRegistry } from "./sessions.ts";
import { startFakeFeishu, type FakeFeishu } from "./testing/fake-feishu.ts";
import { userError } from "./user-errors.ts";

let directory: string;
let fake: FakeFeishu;
let app: Server;
let origin: string;
let activeSessions: SessionRegistry;

function config(extra: NodeJS.ProcessEnv = {}) {
  return feishuLoginConfig({
    CRYBOT_FEISHU_APP_ID: "cli_example",
    CRYBOT_FEISHU_APP_SECRET: "secret_example",
    CRYBOT_FEISHU_TENANTS: "tenant_example",
    CRYBOT_FEISHU_ALLOW: "union_example",
    CRYBOT_FEISHU_TOKEN_ENDPOINT: fake.tokenEndpoint,
    CRYBOT_FEISHU_USER_INFO_ENDPOINT: fake.userInfoEndpoint,
    ...extra,
  })!;
}

async function listen(handler: RequestListener): Promise<Server> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  origin = `http://127.0.0.1:${address.port}`;
  return server;
}

async function call(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const request = httpRequest(`${origin}${path}`, { method: options.method ?? "POST", headers: { ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}), ...options.headers } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }));
    });
    request.on("error", reject);
    if (body) request.end(body); else request.end();
  });
}

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "cry-feishu-routes-"));
  fake = await startFakeFeishu({ code: "code_example", codeVerifier: "verifier_example" });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve) => app?.close(() => resolve()));
  await fake.close();
  rmSync(directory, { recursive: true, force: true });
});

async function start(configValue: ReturnType<typeof config> | null = config(), fetcher?: typeof fetch, onHandled?: () => void) {
  activeSessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  app = await listen((req, res) => {
    void feishuExchangeRoute({ config: configValue, publicOrigin: "https://example.com", sessions: activeSessions, cookieName: "cry_session_test", fetch: fetcher, readBody, json }, req, res, new URL(req.url ?? "/", "http://localhost").pathname, req.method ?? "GET").then((handled) => {
      if (!handled) json(res, 418, { error: "fallthrough" });
      onHandled?.();
    }).catch(() => { if (!res.destroyed) json(res, 500, { error: "route_failed" }); });
  });
}

const validBody = { code: "code_example", codeVerifier: "verifier_example", redirectUri: "https://example.com/auth/feishu/app-return", platform: "ios", label: "Phone" };

function authorize(): Promise<URL> {
  return new Promise((resolve, reject) => {
    const challenge = createHash("sha256").update("verifier_example").digest("base64url");
    const target = new URL(fake.authorizeEndpoint);
    target.search = new URLSearchParams({ client_id: "cli_example", response_type: "code", redirect_uri: validBody.redirectUri, state: "state_example", code_challenge: challenge, code_challenge_method: "S256" }).toString();
    httpRequest(target, (response) => {
      response.resume();
      response.on("end", () => {
        try { resolve(new URL(String(response.headers.location))); } catch (error) { reject(error); }
      });
    }).on("error", reject).end();
  });
}

describe("Feishu exchange route", () => {
  it("exchanges a code for a device session", async () => {
    const logs = [vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
    await start();
    const response = await call("/api/auth/feishu/exchange", { body: validBody });
    expect(response.status).toBe(200);
    expect(response.body.token).toMatch(/^cry_sess_/);
    expect(response.body.session).toMatchObject({ source: "device", platform: "ios", scopes: ["admin", "client"] });
    expect(response.body.cookieName).toBe("cry_session_test");
    expect(activeSessions.authenticate(response.body.token)?.id).toBe(response.body.session.id);
    expect(JSON.stringify(response.body)).not.toContain("secret_example");
    expect(logs.flatMap((log) => log.mock.calls).flat().join(" ")).not.toContain("secret_example");
  });

  it("follows authorize redirect state and exchanges the real code", async () => {
    const callback = await authorize();
    expect(callback.searchParams.get("state")).toBe("state_example");
    await start();
    const response = await call("/api/auth/feishu/exchange", { body: { ...validBody, code: callback.searchParams.get("code") } });
    expect(response.status).toBe(200);
  });

  it("rejects a redirect URI that differs from authorize", async () => {
    const callback = await authorize();
    await start();
    await expect(call("/api/auth/feishu/exchange", { body: { ...validBody, code: callback.searchParams.get("code"), redirectUri: "https://example.com/auth/feishu/callback" } })).resolves.toMatchObject({ status: 400, body: { error: "feishu_code_invalid" } });
  });

  it.each([
    ["tenant", { user: { union_id: "union_example", tenant_key: "other_tenant" } }, 403, "feishu_not_allowed"],
    ["user", { user: { union_id: "other_union", tenant_key: "tenant_example" } }, 403, "feishu_not_allowed"],
    ["code", { code: "other_code" }, 400, "feishu_code_invalid"],
  ] as const)("rejects an invalid %s", async (_name, fakeOptions, status, error) => {
    await fake.close();
    fake = await startFakeFeishu({ code: "code_example", codeVerifier: "verifier_example", ...fakeOptions });
    await start();
    const response = await call("/api/auth/feishu/exchange", { body: validBody });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error });
  });

  it("rejects PKCE, redirect, and browser-origin requests", async () => {
    await start();
    await expect(call("/api/auth/feishu/exchange", { body: { ...validBody, codeVerifier: "wrong_verifier" } })).resolves.toMatchObject({ status: 400, body: { error: "feishu_code_invalid" } });
    await expect(call("/api/auth/feishu/exchange", { body: { ...validBody, redirectUri: "https://example.com/other" } })).resolves.toMatchObject({ status: 400, body: { error: "feishu_code_invalid" } });
    await expect(call("/api/auth/feishu/exchange", { body: validBody, headers: { "content-type": "text/plain" } })).resolves.toMatchObject({ status: 400, body: { error: "feishu_code_invalid" } });
    await expect(call("/api/auth/feishu/exchange", { body: validBody, headers: { origin: "https://example.com" } })).resolves.toMatchObject({ status: 403, body: { error: "feishu_origin_forbidden" } });
  });

  it("maps Feishu server errors and timeouts to unavailable", async () => {
    await fake.close();
    fake = await startFakeFeishu({ userInfoStatus: 503 });
    await start();
    await expect(call("/api/auth/feishu/exchange", { body: validBody })).resolves.toMatchObject({ status: 502, body: { error: "feishu_unavailable" } });
  });

  it("maps a token timeout to unavailable", async () => {
    await fake.close();
    fake = await startFakeFeishu({ tokenDelayMs: 10_100 });
    await start();
    await expect(call("/api/auth/feishu/exchange", { body: validBody })).resolves.toMatchObject({ status: 502, body: { error: "feishu_unavailable" } });
  }, 20_000);

  it("does not issue or evict a device session after a client disconnect", async () => {
    await fake.close();
    let receivedToken!: () => void;
    const tokenReceived = new Promise<void>((resolve) => { receivedToken = resolve; });
    let releaseToken!: () => void;
    const tokenReleased = new Promise<void>((resolve) => { releaseToken = resolve; });
    fake = await startFakeFeishu({ onTokenRequest: async () => { receivedToken(); await tokenReleased; } });
    let handled!: () => void;
    const routeHandled = new Promise<void>((resolve) => { handled = resolve; });
    await start(config(), undefined, handled);
    const devices = Array.from({ length: 10 }, (_, index) => activeSessions.issueDevice("feishu:union_example", `Device ${index}`, { scopes: ["client"], maxAgeDays: 90, tenantKey: "tenant_example" }));
    const access = activeSessions.issueAccess("feishu:union_example", "Browser");
    const before = activeSessions.list();
    const disconnected = new Promise<void>((resolve) => {
      app.once("request", (_req, res) => res.once("close", resolve));
    });
    let disconnect!: () => void;
    const clientClosed = new Promise<void>((resolve, reject) => {
      const body = JSON.stringify(validBody);
      const request = httpRequest(origin, { method: "POST", path: "/api/auth/feishu/exchange", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } });
      disconnect = () => { request.destroy(); };
      const timeout = setTimeout(() => {
        reject(new Error("client disconnect did not settle within 1000ms"));
        request.destroy();
      }, 1_000);
      const finish = (error?: NodeJS.ErrnoException) => {
        clearTimeout(timeout);
        if (error && error.code !== "ECONNRESET" && error.code !== "ABORT_ERR") reject(error);
        else resolve();
      };
      request.once("error", finish);
      request.once("close", () => finish());
      request.end(body);
    });
    try {
      await Promise.all([tokenReceived.then(disconnect), clientClosed]);
      await disconnected;
    } finally {
      releaseToken();
    }
    await routeHandled;
    expect(activeSessions.list()).toEqual(before);
    for (const device of devices) expect(activeSessions.authenticate(device.token)?.id).toBe(device.session.id);
    expect(activeSessions.authenticate(access.token)?.id).toBe(access.session.id);
    expect(app.listening).toBe(true);
    await expect(call("/api/auth/feishu/exchange", { body: validBody })).resolves.toMatchObject({ status: 200 });
  });

  it("returns 404 for every Feishu path when unconfigured", async () => {
    await start(null);
    await expect(call("/api/auth/feishu/exchange", { body: validBody, headers: { origin: "https://example.com" } })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/api/auth/feishu/other", { method: "GET" })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/api/auth/feishu/exchange", { method: "PUT", body: validBody })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/api/auth/feishu", { method: "GET" })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/auth/feishu/start", { method: "GET" })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/auth/feishu/callback", { method: "GET" })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/auth/feishu/app-return", { method: "GET" })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
    await expect(call("/auth/feishu", { method: "POST" })).resolves.toMatchObject({ status: 404, body: { error: "not_found" } });
  });

  it("maps permission failures and hides unknown issuance errors", async () => {
    await start();
    const { error, ...fields } = userError("serverError.cloud.personal");
    const issueDevice = vi.spyOn(activeSessions, "issueDevice").mockImplementationOnce(() => {
      throw Object.assign(new Error(error), { status: 403, code: "cloud_personal", ...fields });
    });
    await expect(call("/api/auth/feishu/exchange", { body: validBody })).resolves.toMatchObject({ status: 403, body: { error: "feishu_forbidden" } });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    issueDevice.mockImplementationOnce(() => { throw new Error("secret_example"); });
    await expect(call("/api/auth/feishu/exchange", { body: validBody })).resolves.toMatchObject({ status: 502, body: { error: "feishu_unavailable" } });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls.flat().join(" ")).not.toContain("secret_example");
  });
});
