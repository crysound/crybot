import { expect, it, vi } from "vitest";
import { recoverLocalVmStartup } from "./local-vm-startup.ts";

it("keeps attach and claim waiting for screens and inventory, but not a pending sweep", async () => {
  let finishScreens!: () => void;
  const screens = new Promise<void>(resolve => { finishScreens = resolve; });
  let finishInventory!: () => void, finishSweep!: () => void;
  const inventory = vi.fn(() => new Promise<void>(resolve => { finishInventory = resolve; }));
  const sweep = vi.fn(() => new Promise<void>(resolve => { finishSweep = resolve; })), log = vi.fn();
  const ready = recoverLocalVmStartup({ screens: () => screens, inventory, sweep, log });
  const attach = vi.fn();
  const waiting = ready.then(attach);
  await Promise.resolve();
  expect(inventory).not.toHaveBeenCalled();
  expect(attach).not.toHaveBeenCalled();
  finishScreens();
  await Promise.resolve();
  expect(inventory).toHaveBeenCalledOnce();
  expect(attach).not.toHaveBeenCalled();
  expect(sweep).not.toHaveBeenCalled();
  finishInventory();
  await waiting;
  expect(inventory).toHaveBeenCalledOnce();
  expect(sweep).toHaveBeenCalledOnce();
  expect(attach).toHaveBeenCalledOnce();
  expect(log).toHaveBeenLastCalledWith("Local VM startup recovery complete");
  finishSweep();
});

it.each(["screens", "inventory"] as const)("logs a failed %s and still attempts every recovery phase", async failing => {
  const calls: string[] = [], log = vi.fn();
  const step = (name: string) => async () => { calls.push(name); if (name === failing) throw new Error("private exec output"); };
  await recoverLocalVmStartup({ screens: step("screens"), inventory: step("inventory"), sweep: step("sweep"), log });
  expect(calls).toEqual(["screens", "inventory", "sweep"]);
  expect(log).toHaveBeenCalledWith(`Local VM startup ${failing} failed`);
  expect(JSON.stringify(log.mock.calls)).not.toContain("private exec output");
});

it("catches a sweep failure after startup is ready without exposing private output", async () => {
  let rejectSweep!: (error: Error) => void;
  const log = vi.fn();
  await recoverLocalVmStartup({ screens: async () => {}, inventory: async () => {},
    sweep: () => new Promise<void>((_resolve, reject) => { rejectSweep = reject; }), log });
  expect(log).toHaveBeenLastCalledWith("Local VM startup recovery complete");
  rejectSweep(new Error("private exec output"));
  await vi.waitFor(() => expect(log).toHaveBeenLastCalledWith("Local VM startup sweep failed"));
  expect(JSON.stringify(log.mock.calls)).not.toContain("private exec output");
});
