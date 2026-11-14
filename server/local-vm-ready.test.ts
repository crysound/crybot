import { afterEach, expect, it, vi } from "vitest";
import { readyLocalVm } from "./local-vm-ready.ts";
import { SHARED_LOCAL_VM_TARGET, type ContainerComputerStatus } from "./container-computer.ts";
import { ComputerIdleTimer } from "./computer-idle.ts";

function fixture() {
  let current = true, provision = false;
  const stopped = { runtime: "podman", daemonUp: true, image: true, container: "stopped", ready: false,
    imageMatches: true, managed: true, network: "loopback", security: "hardened", persistence: "durable" } as ContainerComputerStatus;
  const running = { ...stopped, container: "running" as const, ready: false };
  const ready = { ...running, ready: true };
  const deps = {
    lifecycleBusy: new Set<string>(),
    provisionBusy: { get: () => provision, set: (busy: boolean) => { provision = busy; } },
    status: vi.fn(async (_fresh?: boolean) => stopped),
    startMachine: vi.fn(async (status: ContainerComputerStatus) => status),
    note: vi.fn(), start: vi.fn(async (_action: "start" | "run") => ready), touchIdle: vi.fn(),
    existingCount: vi.fn(async () => 0), maxInstances: () => 1, isCurrent: () => current, waitMs: 10_000,
  };
  return { deps, stopped, running, ready, cancel: () => { current = false; } };
}
afterEach(() => vi.useRealTimers());

it("holds the lock during startup, releases it for desktop polling, and shares the pending wake", async () => {
  vi.useFakeTimers();
  const { deps, running, ready } = fixture();
  deps.start.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(running), 5000)));
  const stop = vi.fn(async () => {});
  const idle = new ComputerIdleTimer(1000, () => deps.lifecycleBusy.has("shared"), stop);
  idle.touch();
  const waking = readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  const joined = readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  await vi.advanceTimersByTimeAsync(5000);
  expect(deps.lifecycleBusy.has("shared")).toBe(false);
  expect(deps.provisionBusy.get()).toBe(false);
  expect(stop).not.toHaveBeenCalled();
  deps.status.mockResolvedValue(ready);
  await vi.advanceTimersByTimeAsync(2000);
  expect(await waking).toBe(ready);
  expect(await joined).toBe(ready);
  expect(deps.status).toHaveBeenLastCalledWith(true);
  expect(deps.start).toHaveBeenCalledTimes(1);
  expect(deps.lifecycleBusy.size).toBe(0);
  expect(deps.provisionBusy.get()).toBe(false);
  idle.cancel();
});

it("preserves wake failure details and releases lifecycle locks while arming the idle backstop", async () => {
  const { deps } = fixture();
  deps.start.mockRejectedValue(new Error("fixture wake failed"));
  await expect(readyLocalVm(SHARED_LOCAL_VM_TARGET, deps)).rejects.toThrow("fixture wake failed");
  expect(deps.touchIdle).toHaveBeenCalledOnce();
  expect(deps.lifecycleBusy.size).toBe(0);
  expect(deps.provisionBusy.get()).toBe(false);
});

it("never starts a machine for a turn cancelled during its status check", async () => {
  const { deps, stopped, cancel } = fixture();
  deps.status.mockImplementation(async () => { cancel(); return stopped; });
  await readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  expect(deps.startMachine).not.toHaveBeenCalled();
  expect(deps.start).not.toHaveBeenCalled();
  expect(deps.lifecycleBusy.size).toBe(0);
});

it("stops polling after cancellation and keeps the lock until the pending startup finishes", async () => {
  vi.useFakeTimers();
  const { deps, running, cancel } = fixture();
  deps.start.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(running), 5000)));
  const waking = readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  await vi.advanceTimersByTimeAsync(1);
  cancel();
  expect(deps.lifecycleBusy.has("shared")).toBe(true);
  await vi.advanceTimersByTimeAsync(4999);
  await waking;
  expect(deps.status).toHaveBeenCalledTimes(1);
  expect(deps.lifecycleBusy.size).toBe(0);
});

it("waits for an already running safe desktop without starting it again", async () => {
  vi.useFakeTimers();
  const { deps, running, ready } = fixture();
  deps.status.mockResolvedValueOnce(running).mockResolvedValue(ready);
  const waking = readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  await vi.advanceTimersByTimeAsync(2000);
  expect(await waking).toBe(ready);
  expect(deps.start).not.toHaveBeenCalled();
});

it("permits a stop during desktop polling and never restarts the stopped target", async () => {
  vi.useFakeTimers();
  const { deps, running, stopped } = fixture();
  deps.start.mockResolvedValue(running);
  const waking = readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  await vi.advanceTimersByTimeAsync(1);
  expect(deps.lifecycleBusy.has("shared")).toBe(false);
  deps.lifecycleBusy.add("shared");
  deps.status.mockResolvedValue(stopped);
  await vi.advanceTimersByTimeAsync(2000);
  expect(await waking).toBe(stopped);
  expect(deps.start).toHaveBeenCalledOnce();
  expect(deps.lifecycleBusy.has("shared")).toBe(true);
});

it("continues with the joining caller's live turn after the first caller ends", async () => {
  vi.useFakeTimers();
  const { deps, stopped, running, ready, cancel } = fixture();
  deps.status.mockResolvedValueOnce(stopped).mockResolvedValueOnce(running).mockResolvedValue(ready);
  deps.start.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(running), 5000)));
  const first = readyLocalVm(SHARED_LOCAL_VM_TARGET, deps);
  await vi.advanceTimersByTimeAsync(1);
  const joined = readyLocalVm(SHARED_LOCAL_VM_TARGET, { ...deps, isCurrent: () => true });
  cancel();
  await vi.advanceTimersByTimeAsync(6999);
  expect(await first).toBe(running);
  expect(await joined).toBe(ready);
  expect(deps.start).toHaveBeenCalledOnce();
  expect(deps.lifecycleBusy.size).toBe(0);
});
