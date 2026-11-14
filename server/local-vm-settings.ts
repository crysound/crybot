// The Local VM's settings, read from the config the server loaded.
// Callers supply container engine resource limits.
import { z } from "zod";

import type { AppConfig } from "./config.ts";
import {
  DEFAULT_DESKTOP_RESOURCES,
  SHARED_DESKTOP_RESOURCES,
  clampDesktopResources,
  MAX_DESKTOP_CPUS,
  MAX_DESKTOP_MEMORY_GB,
  MIN_DESKTOP_CPUS,
  MIN_DESKTOP_MEMORY_GB,
  type DesktopResources,
} from "./container-limits.ts";

export const DEFAULT_LOCAL_VM_MODE = "shared" as const;
export const DEFAULT_LOCAL_VM_MAX_INSTANCES = 2;
export const MIN_LOCAL_VM_MAX_INSTANCES = 1;
export const MAX_LOCAL_VM_MAX_INSTANCES = 8;
export const DEFAULT_LOCAL_VM_IDLE_TIMEOUT_MINUTES = 480;
export const MIN_LOCAL_VM_IDLE_TIMEOUT_MINUTES = 5;
export const MAX_LOCAL_VM_IDLE_TIMEOUT_MINUTES = 1_440;

/** Bot desktop isolation, default "shared"; `maxInstances` caps per-bot desktops or pool seats. Switching modes cold-starts every desktop. */
export const localVmConfigSchema = z.object({
  mode: z.enum(["shared", "per-bot", "pool"]).optional(),
  /** Shared desktop screen count, default 4; other modes always use one screen. */
  screens: z.number().int().min(1).max(4).optional(),
  maxInstances: z
    .number()
    .int()
    .min(MIN_LOCAL_VM_MAX_INSTANCES)
    .max(MAX_LOCAL_VM_MAX_INSTANCES)
    .optional(),
  idleTimeoutMinutes: z
    .number()
    .int()
    .min(MIN_LOCAL_VM_IDLE_TIMEOUT_MINUTES)
    .max(MAX_LOCAL_VM_IDLE_TIMEOUT_MINUTES)
    .optional(),
  preserveInstalledApps: z.boolean().optional(),
  /** Memory limit in GiB, with no swap beyond it; shared defaults reserve 2 GiB when engine resources are supplied. On Docker and Podman, stopped containers apply changes on their next start. */
  memoryGb: z.number().int().min(MIN_DESKTOP_MEMORY_GB).max(MAX_DESKTOP_MEMORY_GB).optional(),
  /** CPU limit; Docker refuses more CPUs than its engine has. Defaults to 3 in shared mode with engine resources supplied and 2 otherwise. Stopped containers apply changes on their next start. */
  cpus: z.number().int().min(MIN_DESKTOP_CPUS).max(MAX_DESKTOP_CPUS).optional(),
});

export function localVmMode(cfg: AppConfig): "shared" | "per-bot" | "pool" {
  return cfg.localVm?.mode ?? DEFAULT_LOCAL_VM_MODE;
}

export function localVmMaxInstances(cfg: AppConfig): number {
  return cfg.localVm?.maxInstances ?? DEFAULT_LOCAL_VM_MAX_INSTANCES;
}

export function localVmIdleTimeoutMinutes(cfg: AppConfig): number {
  return cfg.localVm?.idleTimeoutMinutes ?? DEFAULT_LOCAL_VM_IDLE_TIMEOUT_MINUTES;
}

/** App preservation is deliberately opt-in: a normal image replacement keeps its existing small, predictable footprint. */
export function localVmPreservesInstalledApps(cfg: AppConfig): boolean {
  return cfg.localVm?.preserveInstalledApps === true;
}

function localVmSettings(config: unknown): z.infer<typeof localVmConfigSchema> {
  const parsed = z.object({ localVm: z.record(z.string(), z.unknown()).optional() }).safeParse(config);
  const settings = parsed.success ? parsed.data.localVm ?? {} : {};
  return Object.fromEntries(Object.entries(localVmConfigSchema.shape).flatMap(([key, schema]) => {
    const field = schema.safeParse(settings[key]);
    return field.success ? [[key, field.data]] : [];
  }));
}

export function localVmScreens(config: unknown): number {
  const settings = localVmSettings(config);
  return (settings.mode ?? DEFAULT_LOCAL_VM_MODE) === "shared" ? settings.screens ?? 4 : 1;
}

export function localVmResources(config: unknown, host?: DesktopResources): DesktopResources {
  const settings = localVmSettings(config);
  const shared = (settings.mode ?? DEFAULT_LOCAL_VM_MODE) === "shared";
  const defaults = shared && host ? clampDesktopResources(SHARED_DESKTOP_RESOURCES, host) : DEFAULT_DESKTOP_RESOURCES;
  const resources = { memoryGb: settings.memoryGb ?? defaults.memoryGb, cpus: settings.cpus ?? defaults.cpus };
  return shared && host ? clampDesktopResources(resources, host, 0) : resources;
}
