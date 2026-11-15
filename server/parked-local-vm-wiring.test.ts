import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { ComputerControl } from "./computer-control.ts";
import { createSharedVmControl, screenControlKey, screenResource, SHARED_VM_CONTROL_KEY } from "./host/shared-vm-control.ts";
import { bindParkedLocalVmTurnBusy, createLocalVmScreenRuntime } from "./local-vm-screen-runtime.ts";
import { TurnResources } from "./turn-resources.ts";

it.each([1, 4])("binds the parked busy hook to real resources with %i screens", async screens => {
  const dataDir = mkdtempSync(join(tmpdir(), "cry-parked-vm-wiring-"));
  const turnResources = new TurnResources();
  const control = new ComputerControl();
  const sharedVm = createSharedVmControl({
    control,
    store: { bots: [], bot: () => null, tasks: () => [] },
    mode: () => "shared", botForThread: () => null,
    turnBots: new Map(), teamTurns: new Map(), turnVmTargets: new Map(),
    teamComputer: () => undefined, place: () => undefined, busy: () => false,
  });
  const localVmScreensHost = createLocalVmScreenRuntime({
    dataDir, screens: () => screens,
    busy: n => !turnResources.free(screenResource(n)) || sharedVm.personHolds(screenResource(n)),
    held: n => sharedVm.personHolds(screenResource(n)),
    bot: () => null, prepare: async () => "docker", bind: async () => {},
    wait: { active: () => true, cancelled: () => new Error("cancelled"), row: vi.fn(), started: vi.fn(), ended: vi.fn(), park: vi.fn() },
    estimate: () => undefined, containerIdle: { touch: vi.fn(), cancel: vi.fn() },
  });
  try {
    const busy = bindParkedLocalVmTurnBusy(localVmScreensHost.free, sharedVm.personHolds, turnResources);
    const resource = screens === 1 ? "computer:vm:shared" : screenResource(1);
    const controlKey = screens === 1 ? SHARED_VM_CONTROL_KEY : screenControlKey(1);
    const holder = { threadId: "holder", generation: "holder-turn" };
    expect(localVmScreensHost.free(resource)).toBeUndefined();
    expect(busy(resource)).toBe(false);
    expect(turnResources.claim(resource, holder)).toBe(true);
    expect(busy(resource)).toBe(true);
    control.take(controlKey);
    turnResources.release(holder);
    expect(sharedVm.personHolds(resource)).toBe(true);
    expect(busy(resource)).toBe(screens > 1);
    control.release(controlKey);
    expect(busy(resource)).toBe(false);
  } finally {
    await localVmScreensHost.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
