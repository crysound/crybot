import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalVmScreenRuntime, parkedLocalVmTurnBusy } from "./local-vm-screen-runtime.ts";
import { sharedScreenTarget, startScreen, stopScreen, screenStates, sh, cuaExecArgs, CUA_SOCKET } from "./container-computer.ts";
import { screenResource } from "./host/shared-vm-control.ts";
import type { TurnOwner } from "./turn-resources.ts";
import { COMPUTER_WAIT_MAX_MS, ComputerWaitParked } from "./turn-computer-wait.ts";
import { mountLazyScreenMcp } from "./local-vm-screen-mcp.ts";
import type { AutoVmClaimTable } from "./auto-vm-claims.ts";
import { createComputerCallGate } from "./computer-call-gate.ts";
import { gatedContainerRequests, lazyContainerRequests } from "./lazy-container-mcp.ts";
import { CONTROL_ACT_WITHIN_MS, CONTROL_BUSY, CONTROL_READ_TIMEOUT_MS, CONTROL_WAIT_MS, createControlClient } from "./computer-control-client.ts";
import type { AppClient } from "./mcp-app-connections.ts";
import { createComputerRoutes, type ComputerRouteDeps } from "./routes/computers.ts";
import type { RouteContext } from "./routes/table.ts";
import type { ScreenListPayload } from "../shared/local-vm-screens.ts";
import { z } from "zod";

vi.mock("./container-computer.ts", async original => ({
  ...await original<typeof import("./container-computer.ts")>(),
  startScreen: vi.fn(async () => {}), stopScreen: vi.fn(async () => {}),
  screenStates: vi.fn(async () => ({ 1: "off", 2: "off", 3: "off", 4: "off" })),
  sh: vi.fn(async () => ({ stdout: "{}" })),
  containerComputerScreenshot: vi.fn(async () => "fixture-image"),
  containerComputerStatus: vi.fn(async () => ({ runtime: "docker", managed: true, container: "running", screens_layout: "multi" })),
}));

describe("parked Local VM turns", () => {
  it("resumes a single-screen turn when the shared resource is free despite a shared VM hold", () => {
    expect(parkedLocalVmTurnBusy("computer:vm:shared", () => undefined, () => true, () => true)).toBe(false);
  });

  it("keeps a multi-screen turn parked while its screen resource is held", () => {
    expect(parkedLocalVmTurnBusy(screenResource(1), () => undefined, () => true, () => true)).toBe(true);
    expect(parkedLocalVmTurnBusy("computer:vm:screens:bot", () => undefined, () => true, () => true)).toBe(true);
    expect(parkedLocalVmTurnBusy(screenResource(1), () => false, () => false, () => true)).toBe(true);
  });
});

const homes: string[] = [];
const runtimes: ReturnType<typeof createLocalVmScreenRuntime>[] = [];
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv("CRYBOT_SCREEN_IDLE_MS", "1500"); vi.clearAllMocks(); });
afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.close();
  vi.useRealTimers(); vi.unstubAllEnvs();
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});
function fixture(screens = 2) {
  const home = mkdtempSync(join(tmpdir(), "cry-screen-runtime-")); homes.push(home);
  const busy = new Set<string>(), held = new Set<number>();
  const stopped = new Set<string>();
  const row = vi.fn(), started = vi.fn(), ended = vi.fn(), park = vi.fn();
  const idle = { touch: vi.fn(), cancel: vi.fn() };
  const runtime = createLocalVmScreenRuntime({
    dataDir: home, screens: () => screens,
    busy: n => busy.has(screenResource(n)) || held.has(n), held: n => held.has(n),
    bot: id => ({ id, name: id }), prepare: async () => "docker",
    bind: async (_owner, resource) => { busy.add(resource); },
    estimate: () => undefined, containerIdle: idle,
    wait: { active: owner => !stopped.has(owner.threadId), cancelled: () => new Error("cancelled"), row, started, ended, park },
  });
  runtimes.push(runtime);
  const owner = (id: string): TurnOwner => ({ threadId: id, generation: id });
  return { runtime, home, busy, held, idle, row, started, ended, park, owner, stopped };
}

function routes(f: ReturnType<typeof fixture>) {
  const bot = { id: "a", threadId: "a", name: "a" };
  const handler = createComputerRoutes({
    cfg: { localVm: { mode: "shared", screens: 4 } }, store: { bot: () => bot }, screens: f.runtime,
    localVmPayload: async () => ({ screens: f.runtime.payload() }),
    localVmTargetForStatus: () => f.runtime.targetFor("a"),
    computerPreviewBot: () => bot, computerPreviewSurface: async () => "vm", routines: () => null,
    controlLeaseIdSchema: z.string(), computerControl: { beat: () => true }, localVmLeaseKey: () => "desktop:local/shared-s1",
  } as unknown as ComputerRouteDeps);
  return async (path: string, method = "POST") => {
    let result!: { status: number; body: { screens: ScreenListPayload; image?: string } };
    const url = new URL(path, "http://fixture");
    await handler({ req: { headers: { "content-type": "application/json" } }, res: { setHeader() {} }, url, path: url.pathname, method,
      auth: { kind: "loopback", scopes: ["admin"] }, readBody: async () => ({}),
      json: (_res: unknown, status: number, body: unknown) => { result = { status, body: JSON.parse(JSON.stringify(body)) }; },
    } as unknown as RouteContext);
    return result;
  };
}

it("the screen inventory route supplies every field consumed by the shared frontend contract", async () => {
  const f = fixture(4), request = routes(f);
  for (const id of ["a", "b", "c", "d"]) await f.runtime.claim(id, f.owner(id));
  f.held.add(2);
  f.runtime.pool.request({ botId: "e", threadId: "e", generation: 1, enqueuedAt: Date.now() });
  await vi.advanceTimersByTimeAsync(1000);
  const response = await request("/api/local-computer", "GET");
  expect(response.status).toBe(200);
  const expected: ScreenListPayload = {
    layout: "multi", screens: 4,
    slots: ["a", "b", "c", "d"].map((id, index) => ({ screen: index + 1, state: "ready", bot: { id, name: id },
      viewerTarget: `local/shared-s${index + 1}`, controlledByPerson: index === 1, idleSeconds: 1 })),
    queue: [{ bot: { id: "e", name: "e" }, position: 1, waitingSeconds: 1 }],
  };
  expect(response.body.screens).toEqual(expected);
  expect(JSON.stringify(response.body)).not.toContain(f.runtime.password(1));
});

it("repeated admin and bot screenshots do not postpone screen retirement", async () => {
  const f = fixture(4), request = routes(f);
  await f.runtime.claim("a", f.owner("a"));
  f.busy.clear();
  for (let n = 0; n < 4; n++) {
    await vi.advanceTimersByTimeAsync(300);
    expect((await request("/api/local-computer/screens/1/screenshot")).status).toBe(200);
    expect((await request("/api/bots/a/local-computer/screenshot")).status).toBe(200);
  }
  await vi.advanceTimersByTimeAsync(500);
  expect(f.runtime.assigned("a")).toBeNull();
  expect(stopScreen).toHaveBeenCalledWith("docker", sharedScreenTarget(1));
  expect((await request("/api/local-computer/screens/1/screenshot")).status).toBe(409);
});

describe("screen runtime lifecycle", () => {
  it.each([0, 4])("Auto text does not claim or queue with %i occupied screens", async occupied => {
    const f = fixture(4);
    for (let n = 0; n < occupied; n++) await f.runtime.claim(`bot-${n}`, f.owner(`turn-${n}`));
    const claims: AutoVmClaimTable = new Map();
    const owner = f.owner("chat"), claim = vi.fn(() => f.runtime.claim("chat", owner));
    mountLazyScreenMcp({ runtime: "docker", control: { url: "http://fixture/control", token: "fixture" }, toolScope: {},
      claims, owner, claim, onClaimed: vi.fn(), onRejected: vi.fn() });
    const gate = createComputerCallGate({ claims, snapshot: () => ({ held: false, heldSinceMs: null, helpReason: null }),
      isActive: () => true, claimResource: () => true, waiting: () => undefined, personAwayText: () => "held",
      waitMs: 500, actWithinMs: 500, personWaitMs: 1000 });
    const requests = lazyContainerRequests({ gate: (_action, signal) => gate({ ...owner, botId: "chat" }, signal),
      connect: vi.fn(async () => { throw new Error("Text must not connect"); }) });
    await requests.request({ id: 1, method: "initialize" });
    await requests.request({ id: 2, method: "tools/list" });
    await vi.advanceTimersByTimeAsync(2000);
    expect(claim).not.toHaveBeenCalled();
    expect(f.runtime.assigned("chat")).toBeNull();
    expect(f.runtime.payload().queue).toEqual([]);
    expect(f.started).not.toHaveBeenCalled();
    expect(f.park).not.toHaveBeenCalled();
    await requests.close();
  });

  it("claims the screen only on the first Auto tool request", async () => {
    const f = fixture(4), claims: AutoVmClaimTable = new Map(), owner = f.owner("chat");
    const claim = vi.fn(() => f.runtime.claim("chat", owner));
    mountLazyScreenMcp({ runtime: "docker", control: { url: "http://fixture/control", token: "fixture" }, toolScope: {},
      claims, owner, claim, onClaimed: vi.fn(), onRejected: vi.fn() });
    const gate = createComputerCallGate({ claims, snapshot: () => ({ held: false, heldSinceMs: null, helpReason: null }),
      isActive: () => true, claimResource: () => true, waiting: () => undefined, personAwayText: () => "held",
      waitMs: 500, actWithinMs: 500, personWaitMs: 1000 });
    expect(await gate({ ...owner, botId: "chat" })).toMatchObject({ held: false });
    expect(f.runtime.assigned("chat")).toBe(1);
    await gate({ ...owner, botId: "chat" });
    expect(claim).toHaveBeenCalledOnce();
  });

  it.each([false, true])("keeps an Auto claim queued after returning guidance and succeeds after a screen is released (queue text: %s)", async queueText => {
    const f = fixture(4), claims: AutoVmClaimTable = new Map(), owner = f.owner("chat");
    for (const botId of ["a", "b", "c", "d"]) await f.runtime.claim(botId, f.owner(botId));
    const claim = vi.fn(() => f.runtime.claim("chat", owner));
    const onRejected = vi.fn();
    mountLazyScreenMcp({ runtime: "docker", control: { url: "http://fixture/control", token: "fixture" }, toolScope: {},
      claims, owner, claim, onClaimed: vi.fn(), onRejected });
    const guidance = queueText ? "All four screens are occupied. Queue position 1; take a screenshot to keep waiting instead of ending your turn." : CONTROL_BUSY;
    const gate = createComputerCallGate({ claims, snapshot: () => ({ held: false, heldSinceMs: null, helpReason: null }),
      isActive: () => !f.stopped.has(owner.threadId), claimResource: () => true,
      waiting: () => queueText && f.runtime.payload().queue.length ? guidance : undefined, personAwayText: () => "held",
      waitMs: CONTROL_WAIT_MS, actWithinMs: CONTROL_ACT_WITHIN_MS, personWaitMs: 90_000 });
    const control = createControlClient({ url: "http://fixture/control", token: "fixture", fetchImpl: async (url, init) => {
      const state = await gate({ ...owner, botId: "chat" }, init?.signal ?? undefined, undefined, new URL(String(url)).searchParams.get("readinessOnly") === "1");
      return Response.json({ ...state, ...(!state.held ? { localVmScreen: f.runtime.assigned("chat") } : {}) });
    } });
    const call = vi.fn(async (method: string) => method === "tools/list"
      ? { tools: [{ name: "get_desktop_state", inputSchema: { type: "object" } }] }
      : { content: [{ type: "text", text: "released screen" }] });
    const open = vi.fn(async (): Promise<AppClient> => ({ request: call, close: async () => {}, closed: false, extensions: undefined, serverInfo: undefined }));
    const proxy = gatedContainerRequests("docker", cuaExecArgs(["mcp", "--socket", CUA_SOCKET], { interactive: true }), control,
      { dynamicScreen: true, open });
    const params = { name: "call_tool", arguments: { name: "get_desktop_state", arguments: {} } };
    try {
      const pending = proxy.request({ id: 1, method: "tools/call", params });
      await vi.advanceTimersByTimeAsync(CONTROL_READ_TIMEOUT_MS);
      expect(await pending).toHaveProperty("result.content", [{ type: "text", text: guidance }]);
      expect(open).not.toHaveBeenCalled();
      expect(call).not.toHaveBeenCalled();
      expect(f.runtime.claiming()).toBe(true);
      expect(f.row).toHaveBeenCalledWith("chat", expect.objectContaining({ nameCode: "chat.notice.waitingForScreen", nameParams: { position: 1 } }), undefined);
      expect(f.runtime.payload().queue).toEqual([{ bot: { id: "chat", name: "chat" }, position: 1, waitingSeconds: CONTROL_READ_TIMEOUT_MS / 1000 }]);
      expect(claims.get(owner.threadId)).toMatchObject({ attempts: 1 });
      expect(claims.get(owner.threadId)?.failed).toBeUndefined();
      expect(onRejected).not.toHaveBeenCalled();
      expect(f.park).not.toHaveBeenCalled();
      expect(f.ended).not.toHaveBeenCalled();
      f.busy.delete(screenResource(2));
      await f.runtime.remove("b");
      const next = proxy.request({ id: 2, method: "tools/call", params });
      await vi.advanceTimersByTimeAsync(100);
      expect(await next).toHaveProperty("result.content", [{ type: "text", text: "released screen" }]);
      expect(f.runtime.assigned("chat")).toBe(2);
      expect(f.runtime.ready(2)).toBe(true);
      expect(f.runtime.payload().queue).toEqual([]);
      expect(claims.get(owner.threadId)?.claimed).toBe(true);
      expect(claim).toHaveBeenCalledOnce();
      expect(f.ended).toHaveBeenCalledWith("chat", "computer:vm:screens:chat", "acquired", expect.any(Number), undefined);
      expect(open).toHaveBeenCalledExactlyOnceWith("docker", expect.arrayContaining(["crybot-s2", "/run/user/61002/crybot-cua.sock"]), expect.any(AbortSignal));
      expect(call.mock.calls.filter(([method]) => method === "tools/call")).toHaveLength(1);
    } finally { await proxy.close(); }
  });

  it.each([
    { waitMs: 500, readyMs: 2000 },
    { waitMs: 45_000, readyMs: 7000 },
    { waitMs: 45_000, readyMs: 47_000 },
  ])("binds the first Auto tool call after a $readyMs ms screen startup (gate budget $waitMs ms)", async ({ waitMs, readyMs }) => {
    const f = fixture(4), claims: AutoVmClaimTable = new Map(), owner = f.owner("chat");
    await f.runtime.claim("first", f.owner("first"));
    const readyAt = Date.now() + readyMs;
    vi.mocked(sh).mockImplementation(async (_runtime, args) => {
      if (args.includes("status") && args.includes("crybot-s2") && Date.now() < readyAt) throw new Error("screen socket is still starting");
      return { stdout: "{}" };
    });
    const claim = vi.fn(() => f.runtime.claim("chat", owner));
    const mounted = mountLazyScreenMcp({ runtime: "docker", control: { url: "http://fixture/control", token: "fixture" }, toolScope: {},
      claims, owner, claim, onClaimed: vi.fn(), onRejected: vi.fn() });
    const gate = createComputerCallGate({ claims, snapshot: () => ({ held: false, heldSinceMs: null, helpReason: null }),
      isActive: () => true, claimResource: () => true, waiting: () => undefined, personAwayText: () => "held",
      waitMs, actWithinMs: 5000, personWaitMs: 90_000 });
    const control = createControlClient({ url: "http://fixture/control", token: "fixture", fetchImpl: async (url, init) => {
      const state = await gate({ ...owner, botId: "chat" }, init?.signal ?? undefined, undefined, new URL(String(url)).searchParams.get("readinessOnly") === "1");
      return Response.json({ ...state, ...(!state.held ? { localVmScreen: f.runtime.assigned("chat") } : {}) });
    } });
    const call = vi.fn(async (method: string) => method === "tools/list"
      ? { tools: [{ name: "get_desktop_state", inputSchema: { type: "object" } }] }
      : { content: [{ type: "text", text: "screen two" }] });
    const open = vi.fn(async (): Promise<AppClient> => ({ request: call, close: async () => {}, closed: false, extensions: undefined, serverInfo: undefined }));
    const proxy = gatedContainerRequests("docker", cuaExecArgs(["mcp", "--socket", CUA_SOCKET], { interactive: true }), control,
      { dynamicScreen: mounted.env.CRYBOT_CONTAINER_DYNAMIC_SCREEN === "1", open });
    try {
      await proxy.request({ id: 1, method: "initialize" });
      await proxy.request({ id: 2, method: "tools/list" });
      expect(claim).not.toHaveBeenCalled();
      expect(f.runtime.assigned("chat")).toBeNull();
      const pending = proxy.request({ id: 3, method: "tools/call", params: { name: "call_tool", arguments: { name: "get_desktop_state", arguments: {} } } });
      await vi.advanceTimersByTimeAsync(readyMs - 1);
      expect(f.runtime.ready(2)).toBe(false);
      expect(open).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(501);
      const result = await pending;
      expect(result, JSON.stringify(result)).not.toHaveProperty("result.isError", true);
      expect(result).toHaveProperty("result.content", [{ type: "text", text: "screen two" }]);
      expect(f.runtime.ready(2)).toBe(true);
      expect(claim).toHaveBeenCalledOnce();
      expect(open).toHaveBeenCalledExactlyOnceWith("docker", expect.arrayContaining(["-u", "crybot-s2", "DISPLAY=:2", "/run/user/61002/crybot-cua.sock"]), expect.any(AbortSignal));
      expect(call.mock.calls.filter(([method]) => method === "tools/call")).toHaveLength(1);
    } finally {
      await proxy.close();
      vi.mocked(sh).mockResolvedValue({ stdout: "{}" });
    }
  });
  it("uses separate ready screens and never exposes passwords in the public inventory", async () => {
    const f = fixture();
    expect((await f.runtime.claim("a", f.owner("a"))).key).toBe("shared:s1");
    expect((await f.runtime.claim("b", f.owner("b"))).key).toBe("shared:s2");
    expect(vi.mocked(startScreen).mock.calls.map(call => call[1].screen)).toEqual([1, 2]);
    expect(f.busy).toEqual(new Set([screenResource(1), screenResource(2)]));
    expect(f.runtime.password(1)).toHaveLength(8);
    expect(f.runtime.password(2)).not.toBe(f.runtime.password(1));
    const publicState = JSON.stringify(f.runtime.payload());
    expect(publicState).not.toContain(f.runtime.password(1));
    expect(publicState).not.toContain("password");
    expect(vi.mocked(sh).mock.calls.some(call => call[1].includes("crybot-s2") && call[1].includes("/run/user/61002/crybot-cua.sock"))).toBe(true);
  });

  it("parks on a full pool and keeps FIFO assignment available to automatic resume", async () => {
    const f = fixture();
    await f.runtime.claim("a", f.owner("a")); await f.runtime.claim("b", f.owner("b"));
    const owner = f.owner("c");
    const waiting = f.runtime.claim("c", owner).catch(error => error);
    await vi.advanceTimersByTimeAsync(0);
    vi.setSystemTime(Date.now() + COMPUTER_WAIT_MAX_MS);
    await vi.advanceTimersByTimeAsync(100);
    expect(await waiting).toBeInstanceOf(ComputerWaitParked);
    expect(f.started).toHaveBeenCalledWith("c", "computer:vm:screens:c", 1, undefined);
    expect(f.runtime.free("computer:vm:screens:c")).toBe(false);
    f.busy.delete(screenResource(2)); f.runtime.touch(sharedScreenTarget(2));
    await vi.advanceTimersByTimeAsync(1_700);
    expect(f.runtime.free("computer:vm:screens:c")).toBe(true);
    expect((await f.runtime.claim("c", { threadId: "c", generation: "resumed" })).screen).toBe(2);
    expect(f.ended).toHaveBeenCalledWith("c", "computer:vm:screens:c", "parked", expect.any(Number), undefined);
  });

  it("preserves affinity and arms container idle only after the last screen stops", async () => {
    const f = fixture();
    await f.runtime.claim("a", f.owner("a")); await f.runtime.claim("b", f.owner("b"));
    f.idle.touch.mockClear();
    f.busy.delete(screenResource(2)); f.runtime.touch(sharedScreenTarget(2));
    await vi.advanceTimersByTimeAsync(1_700);
    expect(f.runtime.assigned("b")).toBeNull();
    expect(f.idle.touch).not.toHaveBeenCalled();
    expect(JSON.parse(readFileSync(join(f.home, "local-vm-screens.json"), "utf8")).b).toBe(2);
    expect((await f.runtime.claim("b", f.owner("b2"))).screen).toBe(2);
    f.busy.clear(); f.runtime.touch(sharedScreenTarget(1)); f.runtime.touch(sharedScreenTarget(2));
    await vi.advanceTimersByTimeAsync(1_700);
    expect(f.runtime.active()).toBe(false);
    expect(f.idle.touch).toHaveBeenCalledOnce();
    expect(stopScreen).toHaveBeenCalledWith("docker", sharedScreenTarget(2));
  });

  it("keeps a held screen on while retiring the other screen", async () => {
    const f = fixture();
    await f.runtime.claim("a", f.owner("a")); await f.runtime.claim("b", f.owner("b"));
    f.busy.clear(); f.held.add(1);
    await vi.advanceTimersByTimeAsync(1_700);
    expect(f.runtime.ready(1)).toBe(true); expect(f.runtime.ready(2)).toBe(false);
    expect(f.runtime.payload().slots[0]!.controlledByPerson).toBe(true);
  });

  it("cancels an interrupted queued turn without leaving a phantom waiter", async () => {
    const f = fixture();
    await f.runtime.claim("a", f.owner("a")); await f.runtime.claim("b", f.owner("b"));
    const waiting = f.runtime.claim("c", f.owner("c")).catch(error => error);
    await vi.advanceTimersByTimeAsync(100);
    expect(f.runtime.claiming()).toBe(true);
    expect(f.row).toHaveBeenCalledWith("c", expect.objectContaining({ nameCode: "chat.notice.waitingForScreen", nameParams: { position: 1 } }), undefined);
    f.stopped.add("c"); await vi.advanceTimersByTimeAsync(100);
    expect((await waiting).message).toBe("cancelled");
    expect(f.runtime.claiming()).toBe(false);
    expect(f.runtime.payload().queue).toEqual([]);
  });
});

it("stops orphaned running screens during server recovery before allocating them", async () => {
  vi.mocked(screenStates).mockResolvedValueOnce({ 1: "off", 2: "running", 3: "off", 4: "off" });
  const f = fixture();
  await f.runtime.recover();
  expect(stopScreen).toHaveBeenCalledExactlyOnceWith("docker", sharedScreenTarget(2));
  expect(sh).not.toHaveBeenCalled();
  expect(f.runtime.password(2)).toBeNull();
  expect(f.runtime.payload().slots.every(slot => slot.bot === null && slot.state === "off")).toBe(true);
});

it("manual claims prepare the VM, share the task queue, and retire while idle", async () => {
  const f = fixture(2);
  expect(await f.runtime.requestScreen("a")).toEqual({ screen: 1 });
  await vi.advanceTimersByTimeAsync(0);
  expect(f.runtime.ready(1)).toBe(true);
  await f.runtime.claim("b", f.owner("b"));
  expect(await f.runtime.requestScreen("c")).toEqual({ queued: true, position: 1 });
  expect(await f.runtime.requestScreen("c")).toEqual({ queued: true, position: 1 });
  await vi.advanceTimersByTimeAsync(1500);
  expect(f.runtime.assigned("a")).toBeNull();
  expect(f.runtime.assigned("b")).toBe(2);
  expect(f.runtime.assigned("c")).toBe(1);
});
it("manual claims leave the single desktop alone", async () => {
  const f = fixture(1);
  expect(await f.runtime.requestScreen("a")).toBeNull();
  expect(startScreen).not.toHaveBeenCalled();
});
