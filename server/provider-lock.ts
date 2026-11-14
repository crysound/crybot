import { productName } from "./brand.ts";
import { isClaudeEndpoint } from "./claude-endpoint-kind.ts";
import type { AppConfig } from "./config.ts";
import type { AnyProviderDriver, InstanceConfigMap } from "./contracts.ts";
import type { Store } from "./store.ts";
import type { RoutineManager } from "./routines.ts";

export const providerLockEnabled = () => process.env.CRYBOT_PROVIDER_LOCK === "1";

export function providerUpdateDrivers(drivers: readonly AnyProviderDriver[]): readonly AnyProviderDriver[] {
  return providerLockEnabled() ? drivers.filter((driver) => driver.driverKind === "claudeAgent") : drivers;
}

export function lockedProviderConfigs(configs: InstanceConfigMap): InstanceConfigMap {
  return Object.fromEntries(Object.entries(configs).filter(([, entry]) => isClaudeEndpoint(entry)).map(([id, entry]) => [id, {
    ...structuredClone(entry), displayName: productName(), hidden: false,
    icon: entry.icon ?? { kind: "preset", preset: "crybot" },
  }]));
}

export function providerLockReplacement(instanceId: string, configs: InstanceConfigMap): string | undefined {
  return providerLockEnabled() && !Object.hasOwn(configs, instanceId) ? Object.keys(configs)[0] : undefined;
}

export function providerLockConfigPatch(cfg: AppConfig, configs: InstanceConfigMap): Partial<AppConfig> {
  const patch: Partial<AppConfig> = {};
  const selection = <T extends { instanceId?: string }>(value: T | undefined): T | undefined => {
    const replacement = value?.instanceId && providerLockReplacement(value.instanceId, configs);
    return replacement ? { ...value, instanceId: replacement } : undefined;
  };
  const defaultModelSelection = selection(cfg.defaultModelSelection);
  if (defaultModelSelection) patch.defaultModelSelection = defaultModelSelection;
  const modelSelection = selection(cfg.newBotDefaults?.profile.modelSelection);
  if (modelSelection && cfg.newBotDefaults) patch.newBotDefaults = { ...cfg.newBotDefaults, profile: { ...cfg.newBotDefaults.profile, modelSelection } };
  const backup = selection(cfg.automaticRecovery?.backup);
  if (backup && cfg.automaticRecovery) patch.automaticRecovery = { ...cfg.automaticRecovery, backup };
  const helper = selection(cfg.helper);
  if (helper) patch.helper = helper;
  return patch;
}

export function migrateLockedProviderReferences(store: Pick<Store, "bots" | "renameInstances">, configs: InstanceConfigMap): number {
  const ids = new Map<string, string>();
  const add = (id: string | undefined) => {
    if (!id) return;
    const replacement = providerLockReplacement(id, configs);
    if (replacement) ids.set(id, replacement);
  };
  for (const bot of store.bots) {
    add(bot.modelSelection.instanceId);
    for (const candidate of bot.fallback ?? []) add(candidate.instanceId);
    for (const task of bot.tasks ?? []) {
      add(task.modelSelection?.instanceId);
    }
  }
  return store.renameInstances(ids);
}

export function migrateLockedRoutineReferences(routines: Pick<RoutineManager, "listRoutines" | "update">, configs: InstanceConfigMap): void {
  for (const routine of routines.listRoutines()) {
    const selection = routine.modelSelection;
    const replacement = selection && providerLockReplacement(selection.instanceId, configs);
    if (selection && replacement) routines.update(routine.id, { modelSelection: { ...selection, instanceId: replacement } });
  }
}
