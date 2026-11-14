import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { afterEach, expect, it, vi } from "vitest";
import { instanceConfigs, type AppConfig } from "./config.ts";
import { ProviderRegistry } from "./harness/registry.ts";
import { ProviderAuthSessions } from "./provider-auth-sessions.ts";
import { lockedProviderConfigs } from "./provider-lock.ts";
import type { RequestAuth } from "./request-auth.ts";
import { createInstanceRoutes } from "./routes/instances.ts";
import { makeFakeDriver } from "./testing/fake-driver.ts";

const owner: RequestAuth = { kind: "loopback", scopes: ["admin"] };
afterEach(() => vi.unstubAllEnvs());

async function fixture(cfg: AppConfig) {
  const claude = makeFakeDriver({ kind: "claudeAgent" });
  const registry = new ProviderRegistry([claude.driver], { filterConfigs: lockedProviderConfigs });
  await registry.load(instanceConfigs(cfg));
  let busy = false;
  const route = createInstanceRoutes({
    cfg, registry, store: { bots: [], tasks: () => [] }, sessions: { isLive: () => true },
    providerAuthSessions: new ProviderAuthSessions(), hostedModels: false,
    providerConfigBusy: { get: () => busy, set: (value) => { busy = value; } }, providerInstancesChanging: new Set(),
    describeInstances: () => registry.describe(),
    persistProviderInstance: async (_id, instances) => { cfg.instances = instances; await registry.load(instanceConfigs(cfg)); },
    configStatus: () => ({ providerLock: true }), broadcast: () => {},
    testCliBinary: async () => ({}), cliProbeEnvironment: () => ({}), threadBusy: () => false,
    botForThread: () => null, activeGroupTurnForBot: () => null,
  });
  return async (path: string, method = "GET", body?: unknown, auth = owner) => {
    const req = new IncomingMessage(new Socket());
    req.headers["content-type"] = "application/json";
    const res = new ServerResponse(req);
    const json = vi.fn();
    await route({ req, res, url: new URL(path, "https://gateway.example"), path, method, auth, json, readBody: async () => body });
    expect(json).toHaveBeenCalledOnce();
    return { status: json.mock.calls[0][1] as number, body: json.mock.calls[0][2] as Record<string, any> };
  };
}

it.each(["owner", "admin", "member"] as const)("returns the endpoint address only to privileged callers: %s", async (role) => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const call = await fixture({ instances: { gateway: {
    driver: "claudeAgent", access: "custom", displayName: "Fixture", config: { endpointModels: ["fixture-model"] },
    environment: { ANTHROPIC_BASE_URL: "https://gateway.example", ANTHROPIC_AUTH_TOKEN: "fixture-token" },
  } } });
  const scopes = role === "admin" ? ["admin"] as const : ["client"] as const;
  const auth: RequestAuth = role === "owner" ? owner : { kind: "session", via: "bearer", scopes,
    session: { id: "fixture-session", tokenHash: "fixture-hash", label: "Fixture", scopes: [...scopes], createdAt: 0, lastSeenAt: 0, expiresAt: 1 } };
  const result = await call("/api/instances", "GET", undefined, auth);
  expect(result.status).toBe(200);
  expect(result.body.instances).toHaveLength(1);
  expect(result.body.instances[0].displayName).toBe("Cry Bot");
  expect(result.body.instances[0].claudeEndpoint.models).toEqual(["fixture-model"]);
  expect(JSON.stringify(result.body)).not.toContain("fixture-token");
  if (role === "member") {
    expect(result.body.instances[0]).not.toHaveProperty("url");
    expect(result.body.instances[0].claudeEndpoint).not.toHaveProperty("baseUrl");
    expect(JSON.stringify(result.body)).not.toContain("gateway.example");
  } else {
    expect(result.body.instances[0].url).toBe("https://gateway.example");
    expect(result.body.instances[0].claudeEndpoint.baseUrl).toBe("https://gateway.example");
  }
});

it("allows adding the first endpoint and blocks subsequent provider additions and removals", async () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const call = await fixture({ instances: { claude: { driver: "claudeAgent", hidden: true } } });
  expect((await call("/api/instances")).body.instances).toEqual([]);
  expect((await call("/api/instances/hidden")).body.instances).toEqual([]);
  const endpoint = { displayName: "Fixture endpoint", baseUrl: "https://gateway.example", token: "fixture-token", model: "claude-sonnet-5" };
  const added = await call("/api/instances/claude-endpoint", "POST", endpoint);
  expect(added.status).toBe(201);
  expect(added.body.instances.map((instance: { displayName: string }) => instance.displayName)).toEqual(["Cry Bot"]);
  expect((await call("/api/instances/claude-endpoint", "POST", endpoint)).status).toBe(403);
  expect((await call("/api/instances/codex-endpoint", "POST", endpoint)).status).toBe(403);
  expect((await call(`/api/instances/${added.body.instanceId}`, "DELETE")).status).toBe(403);
  expect((await call(`/api/instances/${added.body.instanceId}`, "PATCH", { hidden: true })).status).toBe(403);
  expect((await call(`/api/instances/${added.body.instanceId}/claude-endpoint`, "PATCH", { displayName: "Updated endpoint", baseUrl: "https://gateway.example/v2", token: "fixture-token-2", model: "claude-sonnet-6" })).status).toBe(403);
  const member: RequestAuth = { kind: "session", via: "bearer", scopes: ["client"], session: { id: "member-session", tokenHash: "member-hash", label: "Member", scopes: ["client"], createdAt: 0, lastSeenAt: 0, expiresAt: 1 } };
  expect((await call(`/api/instances/${added.body.instanceId}/claude-endpoint`, "PATCH", { displayName: "Nope", baseUrl: "https://gateway.example", token: "fixture-token" }, member)).status).toBe(403);
  expect((await call("/api/instances")).body.instances).toHaveLength(1);
});

it("requires an owner or admin for the first locked endpoint", async () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const call = await fixture({ instances: { claude: { driver: "claudeAgent", hidden: true } } });
  const member: RequestAuth = { kind: "session", via: "bearer", scopes: ["client"], session: { id: "member-session", tokenHash: "member-hash", label: "Member", scopes: ["client"], createdAt: 0, lastSeenAt: 0, expiresAt: 1 } };
  expect((await call("/api/instances/claude-endpoint", "POST", { displayName: "Fixture endpoint", baseUrl: "https://gateway.example", token: "fixture-token", model: "claude-sonnet-5" }, member)).status).toBe(403);
});
