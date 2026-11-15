import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig, saveConfig } from "../config.ts";
import { keyStatus, withoutKeyHints } from "../key-hint.ts";
import { createConfigRoutes, type ConfigRouteDeps } from "./config.ts";
import type { RouteContext } from "./table.ts";

beforeEach(() => vi.stubEnv("INSTABOX_API_KEY", ""));
afterEach(() => vi.unstubAllEnvs());

function fixture(reported?: unknown) {
  saveConfig({ instabox: { apiKey: "fixture-instabox-key-1234" } });
  const cfg = loadConfig(), broadcast = vi.fn();
  const handler = createConfigRoutes({
    cfg, store: { bots: [] }, hostedModels: false, cloudHome: false,
    browserRuntime: { heldBy: () => false }, providerConfigBusy: { get: () => false, set: vi.fn() },
    computerProviderConfigTransitions: new Set(), providerOperationConflict: () => null,
    providerConfigs: () => ({}), registry: { forgetSnapshots: vi.fn() }, lendingEnabled: () => true,
    revokeEngineCapabilities: vi.fn(), broadcast,
    configStatus: () => ({ instabox: reported ?? { ...keyStatus(cfg.instabox?.apiKey), fromEnv: false } }),
    configForAccess: (status: Parameters<ConfigRouteDeps["configForAccess"]>[0], auth: Parameters<ConfigRouteDeps["configForAccess"]>[1]) => auth.scopes.includes("admin") ? status : withoutKeyHints(status),
  } as unknown as ConfigRouteDeps);
  return { cfg, broadcast, request: async (method = "GET", body?: unknown, admin = true) => {
    let response!: { status: number; body: Record<string, unknown> };
    await handler({ req: {}, res: {}, url: new URL("http://fixture/api/config"), path: "/api/config", method,
      auth: { kind: "loopback", scopes: admin ? ["admin", "client"] : ["client"] },
      readBody: async () => body,
      json: (_res: unknown, status: number, value: unknown) => { response = { status, body: value as Record<string, unknown> }; },
    } as unknown as RouteContext);
    return response;
  } };
}

it.each(["PUT", "PATCH"])("strips raw credentials from %s responses and broadcasts on save and clear", async (method) => {
  const secret = "fixture-new-instabox-key-5678";
  const f = fixture({ apiKey: secret, last4: secret, extra: { secret } });
  expect((await f.request()).body).toEqual({ instabox: { configured: true, fromEnv: false } });
  for (const apiKey of [secret, ""]) {
    const response = await f.request(method, { instabox: { apiKey } });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ instabox: { configured: !!apiKey, fromEnv: false } });
    expect(loadConfig().instabox?.apiKey).toBe(apiKey);
    expect(f.broadcast).toHaveBeenLastCalledWith({ kind: "config", ...response.body });
    expect(JSON.stringify(f.broadcast.mock.calls)).not.toContain(secret);
    expect((await f.request()).body).toEqual(response.body);
  }
});

it("preserves validated admin hints, strips client hints, and never hints a short key", async () => {
  const f = fixture();
  expect((await f.request()).body.instabox).toEqual({ configured: true, fromEnv: false, last4: "1234" });
  expect((await f.request("GET", undefined, false)).body.instabox).toEqual({ configured: true, fromEnv: false });
  for (const method of ["PUT", "PATCH"]) {
    expect((await f.request(method, { instabox: { apiKey: "fixture-new-instabox-key-5678" } })).body.instabox)
      .toEqual({ configured: true, fromEnv: false, last4: "5678" });
    expect((await f.request(method, { instabox: { apiKey: "tiny" } })).body.instabox)
      .toEqual({ configured: true, fromEnv: false });
  }
});

it("rejects stale or forged hints even if the reported status says configured", async () => {
  for (const last4 of ["wrong-secret", "nope", "tiny"]) {
    const f = fixture({ configured: true, fromEnv: false, last4 });
    expect((await f.request()).body.instabox).toEqual({ configured: true, fromEnv: false });
    f.cfg.instabox = { apiKey: "tiny" };
    expect((await f.request()).body.instabox).toEqual({ configured: true, fromEnv: false });
  }
});

it.each(["PUT", "PATCH"])("keeps environment overrides and invalid %s input out of error responses", async (method) => {
  const f = fixture(), secret = "fixture-secret-must-not-escape";
  const invalid = await f.request(method, { instabox: { apiKey: secret, extra: secret } });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid InstaBox key", code: "instabox_key_invalid" });
  vi.stubEnv("INSTABOX_API_KEY", secret);
  expect((await f.request()).body.instabox).toEqual({ configured: true, fromEnv: true });
  const refused = await f.request(method, { instabox: { apiKey: secret } });
  expect(refused.status).toBe(409);
  expect(refused.body).toEqual({ error: "InstaBox key is provided by the environment", code: "instabox_key_env" });
  expect(f.broadcast).not.toHaveBeenCalled();
});
