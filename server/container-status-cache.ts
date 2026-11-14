import { clearLocalVmWakeFailure } from "./local-vm-resume.ts";
import type { CommandRunner, ContainerComputerStatus, LocalVmTarget } from "./container-computer.ts";

const STATUS_TTL_MS = 5_000;
export type StatusOptions = { probeDesktop?: boolean; fresh?: boolean };
type StatusEntry = { result: Promise<ContainerComputerStatus>; expiresAt: number; generation: number };
const statusCaches = new WeakMap<CommandRunner, Map<string, StatusEntry>>();
let statusGeneration = 0;
let allStatusGeneration = 0;
const targetStatusGenerations = new Map<string, number>();
const changingTargets = new Map<string, number>();

export function invalidateContainerComputerStatus(target?: LocalVmTarget): void {
  clearLocalVmWakeFailure(target?.key);
  if (target) targetStatusGenerations.set(target.key, ++statusGeneration);
  else {
    targetStatusGenerations.clear();
    statusGeneration += 1;
    allStatusGeneration = statusGeneration;
  }
}

export function cachedContainerStatus(runner: CommandRunner, platform: NodeJS.Platform, target: LocalVmTarget, options: StatusOptions, probe: () => Promise<ContainerComputerStatus>): Promise<ContainerComputerStatus> {
  let cache = statusCaches.get(runner);
  if (!cache) { cache = new Map(); statusCaches.set(runner, cache); }
  const key = JSON.stringify([platform, target.key, target.containerName, target.workspaceDir, target.viewerPort, target.label, options.probeDesktop !== false]);
  const generation = Math.max(allStatusGeneration, targetStatusGenerations.get(target.key) ?? 0);
  const cached = cache.get(key);
  const cacheable = !changingTargets.has(target.key);
  if (!options.fresh && cacheable && cached && cached.generation === generation && cached.expiresAt > Date.now()) {
    return cached.result.then(status => ({ ...status }));
  }
  const entry: StatusEntry = { result: probe(), expiresAt: Infinity, generation };
  if (cacheable) cache.set(key, entry);
  void entry.result.then(() => { entry.expiresAt = Date.now() + STATUS_TTL_MS; }, () => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return entry.result.then(status => ({ ...status }));
}

export function changingContainerStatus(target: LocalVmTarget, all: boolean): () => void {
  invalidateContainerComputerStatus(all ? undefined : target);
  changingTargets.set(target.key, (changingTargets.get(target.key) ?? 0) + 1);
  return () => {
    const remaining = (changingTargets.get(target.key) ?? 1) - 1;
    if (remaining) changingTargets.set(target.key, remaining);
    else changingTargets.delete(target.key);
    invalidateContainerComputerStatus(all ? undefined : target);
  };
}
