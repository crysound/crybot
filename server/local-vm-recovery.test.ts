import { expect, it, vi } from "vitest";
import { type ContainerComputerStatus, type LocalVmTarget } from "./container-computer.ts";
import { recoverLocalVms } from "./desktop-updates.ts";

vi.mock("./container-computer.ts", async importOriginal => ({
  ...await importOriginal<typeof import("./container-computer.ts")>(),
  containerRuntimeStatus: async () => ({ runtime: "docker", daemonUp: true }),
  containerComputerExists: async () => true,
  localVmWorkspaceExists: () => false,
}));

it.each(["pool", "per-bot"] as const)("recovers healthy %s targets and arms their idle timers when another status probe fails", async mode => {
  const seen = new Set<string>();
  const healthy = { container: "running", managed: true } as ContainerComputerStatus;
  const status = vi.fn<(_: LocalVmTarget) => Promise<ContainerComputerStatus>>()
    .mockRejectedValueOnce(new Error("unavailable target"))
    .mockResolvedValue(healthy);
  const note = vi.fn((target: LocalVmTarget, current: ContainerComputerStatus | null) => {
    if (current) seen.add(target.key);
  });
  const armIdle = vi.fn();
  await recoverLocalVms({ mode, seats: 2, bots: [{ id: "a", name: "A" }, { id: "b", name: "B" }], seen, status, note, armIdle });
  expect(status).toHaveBeenCalledTimes(2);
  const [failedTarget, healthyTarget] = status.mock.calls.map(([target]) => target);
  expect(note).toHaveBeenCalledWith(failedTarget, null);
  expect(note).toHaveBeenCalledWith(healthyTarget, healthy);
  expect([...seen]).toEqual([healthyTarget.key]);
  expect(armIdle).toHaveBeenCalledExactlyOnceWith(healthyTarget);
});
