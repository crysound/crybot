import { afterEach, expect, it, vi } from "vitest";
import { localVmResumeNotices, recentLocalVmWakeFailure } from "./local-vm-resume.ts";
import { readyLocalVm } from "./local-vm-ready.ts";
import { SHARED_LOCAL_VM_TARGET, invalidateContainerComputerStatus, type ContainerComputerStatus } from "./container-computer.ts";
import { startAutoVmClaim, type AutoVmClaimSlot } from "./auto-vm-claims.ts";

function fixture(target: string) {
  const stopped = { runtime: "podman", daemonUp: true, image: true, container: "stopped", ready: false,
    imageMatches: true, managed: true, network: "loopback", security: "hardened", persistence: "durable" } as ContainerComputerStatus;
  const readiness = {
    lifecycleBusy: new Set<string>(), provisionBusy: { get: () => false, set: (_busy: boolean) => {} },
    status: vi.fn(async (_fresh?: boolean) => stopped),
    startMachine: vi.fn(async (status: ContainerComputerStatus) => status), note: () => {},
    start: vi.fn(async (): Promise<ContainerComputerStatus> => { throw new Error("desktop failed"); }),
    touchIdle: () => {}, existingCount: async () => 0, maxInstances: () => 1, isCurrent: () => true, waitMs: 10_000,
  };
  const slot: AutoVmClaimSlot = { owner: { threadId: "thread", generation: "turn" },
    claim: async () => { await readyLocalVm({ ...SHARED_LOCAL_VM_TARGET, key: target }, readiness); } };
  const deps = { target, slot: () => slot, live: vi.fn(() => true), cancelled: () => false, append: vi.fn(), reject: vi.fn() };
  Object.assign(slot, localVmResumeNotices(deps));
  return { slot, deps, readiness, stopped, fail: async () => {
    startAutoVmClaim(new Map([["thread", slot]]), "thread", "turn");
    await slot.begin;
  } };
}
afterEach(() => vi.useRealTimers());

it("records a reason and fails closed without reporting or interrupting a chat", async () => {
  const { slot, deps, fail } = fixture("pure-chat");
  await fail();
  expect(slot).toMatchObject({ failed: true, failure: "desktop failed" });
  expect(deps.append).toHaveBeenCalledWith(expect.objectContaining({ nameCode: "chat.notice.computerWakeFailed", nameParams: { reason: "desktop failed" } }), false);
  expect(deps.reject).not.toHaveBeenCalled();
});

it("uses the existing rejection only when a computer call is waiting", async () => {
  const { slot, deps, fail } = fixture("waiting");
  slot.waitingCalls = 1;
  await fail();
  expect(deps.reject).toHaveBeenCalledWith("desktop failed", expect.any(Error));
  expect(deps.append).not.toHaveBeenCalled();
});

it("records a late failure as a translated historical notice, even with an old waiter", async () => {
  const { slot, deps, fail } = fixture("late");
  slot.waitingCalls = 1;
  deps.live.mockReturnValue(false);
  await fail();
  expect(deps.append).toHaveBeenCalledWith(expect.objectContaining({ nameCode: "chat.notice.previousComputerWakeFailed" }), true);
  expect(deps.reject).not.toHaveBeenCalled();
});

it("suppresses repeated wakes on the same target for sixty seconds", async () => {
  vi.useFakeTimers();
  const { fail } = fixture("cooldown");
  await fail();
  expect(recentLocalVmWakeFailure("cooldown")).toBe("desktop failed");
  expect(recentLocalVmWakeFailure("different-target")).toBeUndefined();
  await vi.advanceTimersByTimeAsync(59_999);
  expect(recentLocalVmWakeFailure("cooldown")).toBe("desktop failed");
  await vi.advanceTimersByTimeAsync(1);
  expect(recentLocalVmWakeFailure("cooldown")).toBeUndefined();
});

it.each([
  "this Local VM is being started, stopped, or replaced — wait for setup to finish",
  "this Local VM is already being used by another turn — wait for that turn to finish",
  "the Local VM lease expired while preparing the turn",
])("does not cool down a temporary claim failure: %s", async reason => {
  const { slot, fail } = fixture(reason);
  slot.claim = async () => { throw new Error(reason); };
  await fail();
  expect(slot.failed).toBe(true);
  expect(recentLocalVmWakeFailure(reason)).toBeUndefined();
});
it.each([false, true])("allows the next turn to retry after lifecycle invalidation (all targets: %s)", async all => {
  const target = `lifecycle-${all}`;
  await fixture(target).fail();
  await fixture("unrelated-target").fail();
  expect(recentLocalVmWakeFailure(target)).toBe("desktop failed");
  invalidateContainerComputerStatus(all ? undefined : { ...SHARED_LOCAL_VM_TARGET, key: target });
  const next = fixture(target);
  next.slot.claim = vi.fn(async () => {});
  if (!recentLocalVmWakeFailure(target)) await next.fail();
  expect(next.slot.claim).toHaveBeenCalledOnce();
  expect(next.slot.claimed).toBe(true);
  expect(recentLocalVmWakeFailure("unrelated-target")).toBe(all ? undefined : "desktop failed");
});

it("retries background network failures without a notice or cooldown", async () => {
  const { slot, deps, fail } = fixture("transient-wake");
  Object.assign(slot, { localVm: true, startsComputer: true,
    claim: vi.fn().mockRejectedValueOnce(Object.assign(new Error("runtime disconnected"), { code: "ECONNRESET" })).mockResolvedValue(undefined) });
  await fail();
  expect(slot.retryReason).toBe("runtime disconnected");
  expect(slot.failed).toBeUndefined();
  expect(recentLocalVmWakeFailure("transient-wake")).toBeUndefined();
  expect(deps.append).not.toHaveBeenCalled();
  expect(deps.reject).not.toHaveBeenCalled();
  await fail();
  expect(slot.claimed).toBe(true);
});

it.each(["machine", "probe", "timeout"])("cools down an actual %s readiness failure", async phase => {
  vi.useFakeTimers();
  const target = `readiness-${phase}`;
  const { readiness, stopped, fail } = fixture(target);
  const running = { ...stopped, container: "running" as const };
  if (phase === "machine") readiness.startMachine.mockRejectedValue(new Error("machine failed"));
  else {
    readiness.start.mockResolvedValue(running);
    if (phase === "probe") readiness.status.mockResolvedValueOnce(stopped).mockRejectedValue(new Error("probe failed"));
    else readiness.status.mockResolvedValue(running);
  }
  const work = fail();
  await vi.advanceTimersByTimeAsync(10_000);
  await work;
  expect(recentLocalVmWakeFailure(target)).toBe(phase === "timeout" ? "the Local VM is not ready (App Settings → Computers)" : `${phase} failed`);
});

it("does not cool down lifecycle contention inside readiness", async () => {
  const { readiness, fail } = fixture("readiness-busy");
  readiness.lifecycleBusy.add("readiness-busy");
  await fail();
  expect(recentLocalVmWakeFailure("readiness-busy")).toBeUndefined();
  expect(readiness.start).not.toHaveBeenCalled();
});

it("preserves network retries through startup errors and never cools down exhausted network retries", async () => {
  const { slot, deps, readiness, fail } = fixture("startup-network");
  Object.assign(slot, { localVm: true, startsComputer: true });
  readiness.start.mockRejectedValue(Object.assign(new Error("runtime disconnected"), { code: "ECONNRESET" }));
  await fail();
  expect(slot.retryReason).toBe("runtime disconnected");
  expect(deps.append).not.toHaveBeenCalled();
  await fail();
  await fail();
  expect(readiness.start).toHaveBeenCalledTimes(3);
  expect(slot.failed).toBe(true);
  expect(recentLocalVmWakeFailure("startup-network")).toBeUndefined();
  expect(deps.append).toHaveBeenCalledOnce();
});
