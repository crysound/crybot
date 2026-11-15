import { afterEach, expect, it, vi } from "vitest";
import { loadConfig, saveConfig } from "../config.ts";
import { createConfigRoutes, type ConfigRouteDeps } from "./config.ts";
import type { RouteContext } from "./table.ts";

afterEach(() => vi.restoreAllMocks());

function fixture(busy = false, screens = 4) {
  saveConfig({ localVm: { mode: "shared", screens } });
  const cfg = loadConfig();
  const changed = vi.fn(async (_layout: boolean) => {}), broadcast = vi.fn();
  const deps = {
    cfg, store: { bots: [] }, hostedModels: false, cloudHome: false,
    browserRuntime: { heldBy: () => false }, providerConfigBusy: { get: () => false, set: vi.fn() },
    localVmModeChangeBusy: { set: vi.fn() }, computerProviderConfigTransitions: new Set(),
    localVmTurnsBusy: () => busy, localVmActiveThreads: new Map(), localVmLifecycleBusy: new Set(),
    localVmImageBusy: { get: () => false }, localVmModeChanging: () => () => {}, localVmScreensChanged: changed,
    providerConfigs: () => ({}), registry: { forgetSnapshots: vi.fn() }, lendingEnabled: () => true,
    revokeEngineCapabilities: vi.fn(), configStatus: () => ({ localVm: cfg.localVm }),
    configForAccess: (status: unknown) => status, broadcast,
  } as unknown as ConfigRouteDeps;
  const handler = createConfigRoutes(deps);
  return { cfg, changed, broadcast, request: async (patch: { screens?: unknown; mode?: "shared" | "per-bot" }) => {
    let response!: { status: number; body: { localVm: { screens: number; mode?: string }; warning?: string } };
    await handler({ req: {}, res: {}, url: new URL("http://fixture/api/config"), path: "/api/config", method: "PATCH", auth: {},
      readBody: async () => ({ localVm: patch }),
      json: (_res: unknown, status: number, body: unknown) => { response = { status, body: body as typeof response.body }; },
    } as unknown as RouteContext);
    return response;
  } };
}

it.each([0, 5, 1.5, "2"])("rejects invalid screen count %s before writing config", async screens => {
  const f = fixture();
  await expect(f.request({ screens })).rejects.toThrow();
  expect(loadConfig().localVm?.screens).toBe(4);
  expect(f.changed).not.toHaveBeenCalled();
});

it("refuses a busy layout switch before writing config", async () => {
  const f = fixture(true);
  expect((await f.request({ screens: 1 })).status).toBe(409);
  expect(loadConfig().localVm?.screens).toBe(4);
  expect(f.changed).not.toHaveBeenCalled();
});

it("returns a warning after a committed config when screen reconfiguration fails", async () => {
  const f = fixture(), log = vi.spyOn(console, "warn").mockImplementation(() => {});
  f.changed.mockRejectedValue(new Error("private runtime error"));
  const result = await f.request({ screens: 2 });
  expect(result.status).toBe(200);
  expect(result.body.localVm.screens).toBe(2);
  expect(result.body.warning).toContain("Settings saved");
  expect(loadConfig().localVm?.screens).toBe(2);
  expect(f.changed).toHaveBeenCalledWith(false);
  expect(f.broadcast).toHaveBeenCalled();
  expect(JSON.stringify(log.mock.calls)).not.toContain("private runtime error");
});

it("keeps a screen-independent setup turn from blocking a single-screen mode switch", async () => {
  const f = fixture(true, 1);
  const result = await f.request({ mode: "per-bot" });
  expect(result.status).toBe(200);
  expect(result.body.localVm.mode).toBe("per-bot");
  expect(f.changed).not.toHaveBeenCalled();
});
