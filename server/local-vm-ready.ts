import { autoLocalVmAttachable, localVmWakeAction, type Runtime, type ContainerComputerStatus, type LocalVmTarget } from "./container-computer.ts";

interface ReadinessDependencies {
  lifecycleBusy: Set<string>;
  provisionBusy: { get(): boolean; set(value: boolean): void };
  status(fresh?: boolean): Promise<ContainerComputerStatus>;
  startMachine(status: ContainerComputerStatus): Promise<ContainerComputerStatus>;
  note(status: ContainerComputerStatus): void;
  start(action: "run" | "start"): Promise<ContainerComputerStatus>;
  touchIdle(): void;
  existingCount(runtime: Runtime): Promise<number>;
  maxInstances(): number;
  isCurrent(): boolean;
  waitMs: number;
}

export async function readyLocalVm(target: LocalVmTarget, deps: ReadinessDependencies): Promise<ContainerComputerStatus> {
  if (deps.lifecycleBusy.has(target.key)) throw new Error("this Local VM is being started, stopped, or replaced — wait for setup to finish");
  deps.lifecycleBusy.add(target.key);
  const pooled = target.key.startsWith("pool:");
  const ownsProvision = !pooled && !deps.provisionBusy.get();
  if (ownsProvision) deps.provisionBusy.set(true);
  try {
    let status = await deps.status();
    if (!deps.isCurrent()) return status;
    status = await deps.startMachine(status);
    deps.note(status);
    if (!deps.isCurrent() || status.ready || !status.runtime) return status;
    const action = localVmWakeAction(status);
    if (!action && !autoLocalVmAttachable(status)) return status;
    if (action) {
      if (action === "run" && !pooled && !ownsProvision) return status;
      if (action === "run" && target.key.startsWith("bot:")) {
        const count = await deps.existingCount(status.runtime);
        if (!deps.isCurrent() || count >= deps.maxInstances()) return status;
      }
      try {
        status = await deps.start(action);
      } finally {
        deps.touchIdle();
      }
    }
    const deadline = Date.now() + deps.waitMs;
    while (deps.isCurrent() && !status.ready && status.container === "running" && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!deps.isCurrent()) break;
      status = await deps.status(true);
    }
    return status;
  } finally {
    if (ownsProvision) deps.provisionBusy.set(false);
    deps.lifecycleBusy.delete(target.key);
  }
}
