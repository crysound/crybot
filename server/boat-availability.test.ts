import { afterEach, expect, it, vi } from "vitest";
import { boatConfigured, boatOffered, boatNameFor, boatStatus, deleteManagedBoat, execOnBoat, joinBoat, joinReadyBoat, provisionBoat, readyBoat } from "./boat.ts";
import { CLOUD_COMPUTER_IDLE_MS, createCloudComputerPower } from "./host/cloud-computer-power.ts";

const cfg = { box: { token: "boat_fixture" } };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each(["0", "1"])("keeps configured accounts available for cleanup but gates user access (lock %s)", async lock => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", lock);
  expect(boatConfigured(cfg)).toBe(true);
  expect(boatOffered(cfg)).toBe(lock !== "1");
  expect(cfg.box.token).toBe("boat_fixture");
});

it("refuses create, wake and join without contacting Boat while locked", async () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  for (const action of [() => provisionBoat(cfg, "fixture", "Fixture"), () => readyBoat(cfg, "fixture"), () => joinBoat(cfg, "fixture"), () => joinReadyBoat(cfg, "fixture"), () => execOnBoat(cfg, "fixture", "true")]) {
    await expect(action()).rejects.toMatchObject({ status: 403, message: expect.stringContaining("CRYBOT_PROVIDER_LOCK=1") });
  }
  expect(await boatStatus(cfg, "fixture")).toEqual({ configured: false, box: null });
  expect(fetch).not.toHaveBeenCalled();
});

it.each(["0", "1"])("sleeps idle computers and reclaims owned machines with a configured account (lock %s)", async lock => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", lock);
  vi.useFakeTimers();
  const botId = `cleanup-fixture-${lock}`;
  const boxId = lock === "1" ? "bx_3456789a" : "bx_23456789";
  const name = await boatNameFor(botId);
  const owners = [{ botId, name: "Fixture", inUse: false }];
  let state = "ready", removed = false;
  const calls: Array<{ method: string; path: string }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit = {}) => {
    const path = new URL(url).pathname;
    const method = options.method ?? "GET";
    calls.push({ method, path });
    const machine = { id: boxId, name, state };
    if (path.endsWith("/sandboxes")) return Response.json({ ok: true, sandboxes: removed ? [] : [machine] });
    if (path.endsWith("/commands")) return Response.json({ ok: true, exitCode: 0, stdout: "", stderr: "" });
    if (path.endsWith("/stop")) { state = "archived"; return Response.json({ ok: true }); }
    if (path.endsWith(`/${boxId}`) && method === "DELETE") {
      removed = true;
      return Response.json({ ok: true, operation: { id: "bdop_0123456789abcdef0123456789abcdef", kind: "sandbox", targetId: boxId, status: "completed" } });
    }
    if (path.endsWith(`/${boxId}`)) return removed ? Response.json({ ok: false }, { status: 404 }) : Response.json({ ok: true, sandbox: machine });
    throw new Error(`Unexpected fixture request: ${method} ${path}`);
  }));
  const power = createCloudComputerPower({ cfg, busy: () => false, claim: () => () => {}, owners: () => owners,
    routines: () => [], routineComputer: () => null, broadcast: () => {}, log: () => {} });
  try {
    await power.armRunning();
    expect(power.awake()).toBe(true);
    await vi.advanceTimersByTimeAsync(CLOUD_COMPUTER_IDLE_MS);
    expect(calls.some(call => call.method === "POST" && call.path.endsWith(`/${boxId}/stop`))).toBe(true);
    expect(state).toBe("archived");
    await expect(deleteManagedBoat(cfg, owners, boxId, name, undefined, { pollDelaysMs: [] })).resolves.toEqual({ ok: true });
    expect(calls.some(call => call.method === "DELETE" && call.path.endsWith(`/${boxId}`))).toBe(true);
    expect(removed).toBe(true);
  } finally { power.close(); }
});
