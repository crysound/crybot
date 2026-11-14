import { afterEach, expect, it, vi } from "vitest";
import { createComputerCallGate } from "./computer-call-gate.ts";
import { startAutoVmClaim, type AutoVmClaimSlot } from "./auto-vm-claims.ts";
import { CONTROL_HANDED_BACK, CONTROL_WAITED } from "./computer-control-client.ts";
import { localVmResumeNotices } from "./local-vm-resume.ts";
import { lazyContainerRequests } from "./lazy-container-mcp.ts";

const owner = { botId: "bot", threadId: "thread", generation: "turn" };
function fixture() {
  const slot: AutoVmClaimSlot = { owner, lazy: true, localVm: true, startsComputer: true,
    claim: vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 7000))), onWaiting: vi.fn() };
  const claims = new Map([[owner.threadId, slot]]);
  const snapshot = { held: false, heldSinceMs: null as number | null, helpReason: null };
  const deps = { claims, snapshot: () => snapshot, isActive: vi.fn(() => true), claimResource: vi.fn(() => true),
    waiting: () => undefined, personAwayText: () => "away", waitMs: 45_000, actWithinMs: 5000, personWaitMs: 90_000 };
  return { slot, claims, snapshot, deps, gate: createComputerCallGate(deps) };
}
afterEach(() => vi.useRealTimers());

it("allows and executes the first computer call after its own seven-second background wake", async () => {
  vi.useFakeTimers();
  const { slot, claims, gate } = fixture();
  startAutoVmClaim(claims, owner.threadId, owner.generation);
  const action = vi.fn(async (method: string) => method === "tools/list"
    ? { tools: [{ name: "click", inputSchema: { type: "object" } }] } : { content: [{ type: "text", text: "clicked" }] });
  const control = vi.fn((act: boolean, signal: AbortSignal) => gate(owner, signal, undefined, !act));
  const proxy = lazyContainerRequests({ gate: control,
    connect: async () => ({ request: action, close: async () => {}, closed: false, extensions: undefined, serverInfo: undefined }) });
  const call = proxy.request({ id: 1, method: "tools/call", params: { name: "call_tool", arguments: { name: "click", arguments: {} } } });
  await vi.advanceTimersByTimeAsync(6999);
  expect(action).not.toHaveBeenCalled();
  expect(slot.waitingCalls).toBe(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(await call).toHaveProperty("result.content", [{ type: "text", text: "clicked" }]);
  expect(await control.mock.results[0].value).toMatchObject({ held: false });
  expect(slot.waitingCalls).toBe(0);
  expect(slot.claim).toHaveBeenCalledOnce();
  await proxy.close();
});

it("catalog readiness ignores a person's screen hold and never enters the action gate", async () => {
  vi.useFakeTimers();
  const { gate, snapshot, slot, deps } = fixture();
  const onWaiting = slot.onWaiting;
  snapshot.held = true;
  const call = gate(owner, undefined, undefined, true);
  await vi.advanceTimersByTimeAsync(7000);
  expect(await call).toMatchObject({ held: false });
  expect(deps.claimResource).not.toHaveBeenCalled();
  expect(onWaiting).toHaveBeenCalledOnce();
  expect(slot.waitingCalls ?? 0).toBe(0);
});

it("still refuses a stale action after contention on a different turn", async () => {
  vi.useFakeTimers();
  const { gate, slot, deps } = fixture();
  slot.claimed = true;
  deps.claimResource.mockReturnValue(false);
  const call = gate(owner);
  await vi.advanceTimersByTimeAsync(7000);
  deps.claimResource.mockReturnValue(true);
  await vi.advanceTimersByTimeAsync(250);
  expect(await call).toMatchObject({ held: true, blockedReason: CONTROL_WAITED });
});

it("still refuses a call composed before a person's hold", async () => {
  vi.useFakeTimers();
  const { gate, slot, snapshot } = fixture();
  slot.claimed = true;
  snapshot.held = true;
  const call = gate(owner);
  await vi.advanceTimersByTimeAsync(1000);
  snapshot.held = false;
  await vi.advanceTimersByTimeAsync(250);
  expect(await call).toMatchObject({ held: true, blockedReason: CONTROL_HANDED_BACK });
});

it("removes a cancelled waiter while leaving the shared wake running", async () => {
  vi.useFakeTimers();
  const { gate, slot } = fixture();
  const controller = new AbortController();
  const call = gate(owner, controller.signal);
  expect(slot.waitingCalls).toBe(1);
  controller.abort();
  expect(slot.waitingCalls).toBe(0);
  expect(await call).toMatchObject({ held: true });
  expect(slot.waitingCalls).toBe(0);
  await vi.advanceTimersByTimeAsync(7000);
  expect(slot.claimed).toBe(true);
});

it.each([false, true])("only reports a failed wake while the first action is still waiting (cancelled: %s)", async cancelled => {
  vi.useFakeTimers();
  const { gate, slot, claims } = fixture();
  const append = vi.fn(), reject = vi.fn();
  slot.claim = () => new Promise((_, fail) => setTimeout(() => fail(new Error("desktop failed")), 7000));
  Object.assign(slot, localVmResumeNotices({ target: `gate-failure-${cancelled}`, slot: () => slot,
    live: () => true, cancelled: () => false, append, reject }));
  startAutoVmClaim(claims, owner.threadId, owner.generation);
  const controller = new AbortController();
  const waiting = gate(owner, controller.signal);
  if (cancelled) { controller.abort(); await waiting; }
  await vi.advanceTimersByTimeAsync(7000);
  expect(await waiting).toMatchObject({ held: true });
  expect(slot.failed).toBe(true);
  expect(reject).toHaveBeenCalledTimes(cancelled ? 0 : 1);
  expect(append.mock.calls.some(([tool]) => tool.nameCode === "chat.notice.computerWakeFailed")).toBe(cancelled);
  expect(await gate(owner)).toMatchObject({ held: true, blockedReason: expect.stringContaining("desktop failed") });
});

it("announces search_tools waiting exactly once and does not repeat it for call_tool", async () => {
  vi.useFakeTimers();
  const { gate, slot, claims, deps } = fixture();
  const append = vi.fn();
  Object.assign(slot, localVmResumeNotices({ target: "catalog-wake", slot: () => slot,
    live: () => true, cancelled: () => false, append, reject: vi.fn() }));
  startAutoVmClaim(claims, owner.threadId, owner.generation);
  const action = vi.fn(async (method: string) => method === "tools/list"
    ? { tools: [{ name: "click", inputSchema: { type: "object" } }] } : { content: [{ type: "text", text: "clicked" }] });
  const proxy = lazyContainerRequests({ gate: (act, signal) => gate(owner, signal, undefined, !act),
    connect: async () => ({ request: action, close: async () => {}, closed: false, extensions: undefined, serverInfo: undefined }) });
  const search = proxy.request({ id: 1, method: "tools/call", params: { name: "search_tools", arguments: { query: "click" } } });
  const repeated = proxy.request({ id: 2, method: "tools/call", params: { name: "search_tools", arguments: { query: "click" } } });
  await vi.advanceTimersByTimeAsync(6999);
  const whileWaiting = append.mock.calls.slice();
  expect(action).not.toHaveBeenCalled();
  expect(deps.claimResource).not.toHaveBeenCalled();
  expect(slot.waitingCalls ?? 0).toBe(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(await search).toHaveProperty("result");
  expect(await repeated).toHaveProperty("result");
  const call = await proxy.request({ id: 3, method: "tools/call", params: { name: "call_tool", arguments: { name: "click", arguments: {} } } });
  expect(call).toHaveProperty("result.content", [{ type: "text", text: "clicked" }]);
  await proxy.close();
  expect(whileWaiting).toEqual([[expect.objectContaining({ nameCode: "chat.notice.wakingComputer" }), false]]);
  expect(append).toHaveBeenCalledOnce();
  expect(slot.claim).toHaveBeenCalledOnce();
});
