// The mocked removal stands in for docker-over-SSH: these tests pin which aliases may reach it.
import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppConfig } from "../config.ts";
import type { RequestAuth } from "../request-auth.ts";
import type { BotRecord } from "../store.ts";
import * as boat from "../boat.ts";
import * as vps from "../vps-computer.ts";
import { createComputerRoutes, type ComputerRouteDeps } from "./computers.ts";
import { PASS, type RouteContext } from "./table.ts";

vi.mock("../vps-computer.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../vps-computer.ts")>();
  return { ...actual, removeManagedVpsComputer: vi.fn() };
});

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const remove = vi.mocked(vps.removeManagedVpsComputer);
const CONTAINER = "crybot-vps-test-abc123";

beforeEach(() => {
  remove.mockReset();
  remove.mockResolvedValue({ removed: true, name: CONTAINER });
});

function fixture(bots: BotRecord[], cfg: AppConfig) {
  // Only what the VPS remove endpoint touches; any other dependency is absent, and a route that reached for one would throw.
  const deps = {
    store: { bot: () => null, bots, sections: [] },
    cfg,
    computerProviderConfigTransitions: new Set(),
    managedBoatOwners: () => [],
    claimManagedVpsMutation: () => () => {},
    teamComputers: { list: () => [] },
    routines: () => null,
  } as unknown as ComputerRouteDeps;
  const handler = createComputerRoutes(deps);
  const request = async (path: string, method: string, body: Record<string, unknown> = {}) => {
    const sent: Array<{ status: number; body: any }> = [];
    const out = await handler({
      req: { headers: { "content-type": "application/json" } } as unknown as IncomingMessage,
      res: { setHeader() {} } as unknown as ServerResponse,
      url: new URL(path, "http://localhost"),
      path, method,
      auth: { kind: "loopback", scopes: ["admin"] } as RequestAuth,
      json: ((_res: ServerResponse, status: number, response: unknown) => {
        sent.push({ status, body: response });
      }) as RouteContext["json"],
      readBody: (async () => body) as RouteContext["readBody"],
    });
    expect(out).not.toBe(PASS);
    expect(sent).toHaveLength(1);
    return sent[0]!;
  };
  return { request, postRemove: (body: Record<string, unknown>) => request(`/api/computers/vps/${CONTAINER}/remove`, "POST", body) };
}

const cfgWith = (sshAlias: string): AppConfig => ({ vps: { sshAlias } }) as AppConfig;
const botWith = (vpsAlias?: string): BotRecord => ({ id: "bot-1", vpsAlias }) as BotRecord;

describe("POST /api/computers/vps/:name/remove", () => {
  it("refuses an alias no bot or default uses without touching SSH", async () => {
    const { postRemove } = fixture([botWith("alpha-vps")], cfgWith("production-vps"));

    const refused = await postRemove({ confirmName: CONTAINER, alias: "foreign-vps" });

    expect(refused.status).toBe(400);
    expect(refused.body.error).toMatch(/default server or a bot's own SSH alias/);
    expect(remove).not.toHaveBeenCalled();
  });

  it("lets a bot's own alias and the default through to removal", async () => {
    const { postRemove } = fixture([botWith("alpha-vps")], cfgWith("production-vps"));

    const perBot = await postRemove({ confirmName: CONTAINER, alias: "alpha-vps" });

    expect(perBot.status).toBe(200);
    expect(remove).toHaveBeenCalledWith({ vps: { sshAlias: "alpha-vps" } }, [], CONTAINER, CONTAINER);

    remove.mockClear();
    const fallback = await postRemove({ confirmName: CONTAINER, alias: "production-vps" });

    expect(fallback.status).toBe(200);
    expect(remove).toHaveBeenCalledWith({ vps: { sshAlias: "production-vps" } }, [], CONTAINER, CONTAINER);
  });

  it("keeps using the default server when no alias is given", async () => {
    const cfg = cfgWith("production-vps");
    const { postRemove } = fixture([botWith("alpha-vps")], cfg);

    const removed = await postRemove({ confirmName: CONTAINER });

    expect(removed.status).toBe(200);
    expect(remove).toHaveBeenCalledWith(cfg, [], CONTAINER, CONTAINER);
  });
});

it.each(["0", "1"])("shows Boat inventory only when offered (lock %s)", async lock => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", lock);
  const inventory = { configured: true, available: true, problem: null, instances: [] };
  const list = vi.spyOn(boat, "listManagedBoats").mockResolvedValue(inventory);
  const { request } = fixture([], { box: { token: "boat_fixture" } });
  const result = await request("/api/computers/boxes", "GET");
  expect(result).toEqual({ status: 200, body: lock === "1" ? { configured: false, available: false, problem: null, instances: [] } : inventory });
  expect(list).toHaveBeenCalledTimes(lock === "1" ? 0 : 1);
});

it("refuses a user request to create a team computer while locked", async () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const provision = vi.spyOn(boat, "provisionBoat");
  const { request } = fixture([], { box: { token: "boat_fixture" } });
  const result = await request("/api/team-computers", "POST", { requestId: "11111111-1111-4111-8111-111111111111", name: "Fixture", acknowledgeCost: true });
  expect(result.status).toBe(409);
  expect(provision).not.toHaveBeenCalled();
});

describe("shared screen routes", () => {
  async function setup(assigned: number | null = 2, multi = true) {
    const container = await import("../container-computer.ts");
    const { z } = await import("zod");
    vi.spyOn(container, "containerComputerStatus").mockResolvedValue({
      ready: true, managed: true, container: "running", network: "loopback", imageMatches: true,
      viewer_url: "http://127.0.0.1:6080/vnc.html#password=container-only", viewer_port: 6080,
    } as never);
    vi.spyOn(container, "containerComputerAction").mockResolvedValue({ ready: true, runtime: "docker", container: "running" } as never);
    const screenshot = vi.spyOn(container, "containerComputerScreenshot").mockResolvedValue("fixture-image");
    const bot = { id: "screen-bot", threadId: "screen-thread", name: "Screen bot" } as BotRecord;
    const beat = vi.fn(() => true);
    const touch = vi.fn();
    const handler = createComputerRoutes({
      cfg: { localVm: { mode: "shared", screens: multi ? 4 : 1 } }, store: { bot: () => bot },
      computerPreviewBot: () => bot, computerPreviewSurface: async () => "vm",
      localVmTargetForStatus: () => multi ? container.sharedScreenTarget(assigned ?? 2) : container.SHARED_LOCAL_VM_TARGET,
      localVmLeaseKey: () => `desktop:local/shared-s${assigned}`,
      controlLeaseIdSchema: z.string().min(16), computerControl: { beat },
      localVmContainerBusy: () => true, localVmImageBusy: { get: () => false }, localVmModeChangeBusy: { get: () => false },
      localVmLifecycleBusy: new Set(), localVmLeaseFor: () => ({ current: () => null }), localVmActiveThreads: new Map(),
      localVmSeen: new Set(), localVmIdleFor: () => ({ touch, cancel: vi.fn() }), localVmIdleMs: () => 600000,
      screens: { enabled: () => multi, payload: () => ({ layout: multi ? "multi" : "single" }), assigned: () => assigned, ready: (n: number) => n === assigned, password: () => "screen-password", touch },
      localVmPayload: async () => ({ screens: { layout: "multi", screens: 4, slots: [], queue: [] } }),
      routines: () => null,
    } as unknown as ComputerRouteDeps);
    const request = async (path: string, method = "POST", scopes = ["admin"], remote = false) => {
      let result: { status: number; body: any } | undefined;
      const url = new URL(path, "http://localhost");
      await handler({
        req: { headers: { "content-type": "application/json" } }, res: { setHeader() {} },
        url, path: url.pathname, method,
        auth: remote ? { kind: "session", via: "bearer", session: {}, scopes } : { kind: "loopback", scopes },
        json: (_res: unknown, status: number, body: unknown) => { result = { status, body }; }, readBody: async () => ({}),
      } as unknown as RouteContext);
      return result!;
    };
    return { request, beat, touch, screenshot };
  }

  it("returns the shared screen list without credentials", async () => {
    const { request } = await setup();
    const result = await request("/api/local-computer", "GET");
    expect(result.body.screens.layout).toBe("multi");
    expect(JSON.stringify(result.body)).not.toContain("password");
  });
  it("requires an assigned screen for bot status and joins", async () => {
    const { request, beat } = await setup(null);
    for (const [path, method] of [["/api/bots/screen-bot/local-computer", "GET"], ["/api/bots/screen-bot/local-computer/join", "POST"]]) {
      expect(await request(path!, method)).toMatchObject({ status: 409, body: { error: "screen_not_assigned" } });
    }
    expect(beat).not.toHaveBeenCalled();
  });
  it("joins only the assigned screen with the screen password and direct token path", async () => {
    const { request, beat, touch } = await setup();
    const path = "/api/bots/screen-bot/local-computer/join?controlLeaseId=fixture-screen-lease";
    const direct = await request(path);
    expect(direct.status).toBe(200);
    const hash = new URLSearchParams(new URL(direct.body.joinUrl).hash.slice(1));
    expect(hash.get("password")).toBe("screen-password");
    expect(hash.get("path")).toBe("websockify?token=s2");
    expect(beat).toHaveBeenCalledWith("desktop:local/shared-s2", "fixture-screen-lease");
    const phone = await request(path, "POST", ["admin"], true);
    expect(phone.body).toMatchObject({ password: "screen-password", socketPath: expect.stringContaining("local/shared-s2/websockify?") });
    expect(touch).not.toHaveBeenCalled();
  });
  it("limits explicit screen joins to admins and screenshots to ready screens", async () => {
    const { request, screenshot, touch } = await setup();
    expect((await request("/api/local-computer/screens/2/join", "POST", ["client"])).status).toBe(403);
    expect((await request("/api/local-computer/screens/1/screenshot")).status).toBe(409);
    expect((await request("/api/local-computer/screens/2/screenshot")).body.image).toBe("fixture-image");
    expect(screenshot).toHaveBeenCalledWith(undefined, undefined, expect.objectContaining({ screen: 2 }));
    const joined = await request("/api/local-computer/screens/2/join");
    expect(joined.body.socketPath).toBe("api/desktop-viewer/local/shared-s2/websockify");
    expect(touch).not.toHaveBeenCalled();
  });
  it.each([false, true])("renews screenshot and bot join activity only in single-screen mode (multi=%s)", async multi => {
    const { request, touch } = await setup(2, multi);
    const paths = [
      multi ? "/api/local-computer/screens/2/screenshot" : "/api/local-computer/screenshot",
      "/api/bots/screen-bot/local-computer/screenshot",
      "/api/bots/screen-bot/local-computer/join?controlLeaseId=fixture-screen-lease",
    ];
    for (const path of paths) {
      touch.mockClear();
      for (let poll = 0; poll < 3; poll++) expect((await request(path)).status).toBe(200);
      expect(touch).toHaveBeenCalledTimes(multi ? 0 : 3);
    }
  });
  it.each([false, true])("applies the container-wide busy refusal only in multi-screen mode (%s)", async multi => {
    const { request } = await setup(2, multi);
    expect((await request("/api/local-computer/start")).status).toBe(multi ? 409 : 200);
  });

});
