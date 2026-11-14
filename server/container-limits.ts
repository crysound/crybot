/** Firefox alone runs about 430 threads with seven tabs open (Debian 12, Oct 2026): under a 512 cap its next tab, and
 * every `docker exec` into the desktop, fail to fork. The cap still stops a fork bomb. */
export const PIDS_LIMIT = 4096;
/** The cap desktops were made with before. Any other value is someone's choice and stays. */
const PREVIOUS_PIDS_LIMIT = 512;

export interface DesktopResources {
  memoryGb: number;
  cpus: number;
}

export const DEFAULT_DESKTOP_RESOURCES: DesktopResources = { memoryGb: 4, cpus: 2 };
export const SHARED_DESKTOP_RESOURCES: DesktopResources = { memoryGb: 8, cpus: 3 };
export const MULTI_SCREEN_PIDS_LIMIT = 8192;
export const MULTI_SCREEN_SHM = "2g";
export const MIN_DESKTOP_MEMORY_GB = 2;
export const MAX_DESKTOP_MEMORY_GB = 128;
export const MIN_DESKTOP_CPUS = 1;
export const MAX_DESKTOP_CPUS = 64;

function resourceInteger(value: number, minimum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.floor(value)) : fallback;
}

export function clampDesktopResources(resources: DesktopResources, host: DesktopResources, reservedMemoryGb: 0 | 2 = 2): DesktopResources {
  const memoryGb = resourceInteger(host.memoryGb, MIN_DESKTOP_MEMORY_GB, DEFAULT_DESKTOP_RESOURCES.memoryGb);
  const cpus = resourceInteger(host.cpus, MIN_DESKTOP_CPUS, DEFAULT_DESKTOP_RESOURCES.cpus);
  const availableMemory = Math.floor(memoryGb - reservedMemoryGb);
  const memoryLimit = availableMemory >= MIN_DESKTOP_MEMORY_GB
    ? availableMemory : Math.min(DEFAULT_DESKTOP_RESOURCES.memoryGb, memoryGb);
  return {
    memoryGb: Math.min(resourceInteger(resources.memoryGb, MIN_DESKTOP_MEMORY_GB, DEFAULT_DESKTOP_RESOURCES.memoryGb), memoryLimit),
    cpus: Math.min(resourceInteger(resources.cpus, MIN_DESKTOP_CPUS, DEFAULT_DESKTOP_RESOURCES.cpus), cpus),
  };
}

/** Memory and swap share one limit, so a desktop gets no swap: past its budget the kernel kills processes in it rather than
 * letting it thrash the host. */
export function resourceArgs(resources: DesktopResources, options: { swap: boolean }): string[] {
  const memory = `${resources.memoryGb}g`;
  return ["--memory", memory, ...(options.swap ? ["--memory-swap", memory] : []), "--cpus", String(resources.cpus)];
}

const raised = new Set<string>();

/** Docker and Podman change an existing container's cap in place, running or stopped, so a desktop made under the old cap
 * needs no recreate. Tried once per container per run: an engine without `update --pids-limit` keeps the old cap. */
export function raisePidsLimit(
  container: string,
  current: number | null | undefined,
  docker: (args: string[], timeoutMs?: number) => Promise<unknown>,
): void {
  if (current !== PREVIOUS_PIDS_LIMIT || raised.has(container)) return;
  raised.add(container);
  void Promise.resolve().then(() => docker(["update", "--pids-limit", String(PIDS_LIMIT), container], 15_000)).catch(() => {});
}

/** A stopped desktop takes the configured limits before it starts. An engine without `update --memory` keeps the old ones. */
export async function applyResourcesBeforeStart(
  container: string,
  resources: DesktopResources,
  docker: (args: string[], timeoutMs?: number) => Promise<unknown>,
): Promise<void> {
  await docker(["update", ...resourceArgs(resources, { swap: true }), container], 15_000).catch(() => {});
}
