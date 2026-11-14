import { BUILT_IN_DRIVERS } from "./drivers/builtIn.ts";
import { enginePlans } from "./engine-updates.ts";
import { RoutineManager, type RoutineManagerOptions } from "./routines.ts";
import { rmSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DATA_DIR, instanceConfigs, loadConfig, saveConfig, type AppConfig } from "./config.ts";
import { migrateLockedProviderReferences, providerLockConfigPatch, lockedProviderConfigs, migrateLockedRoutineReferences, providerUpdateDrivers } from "./provider-lock.ts";
import { newBotDefaultsSchema } from "./new-bot-defaults.ts";
import { Store } from "./store.ts";
import { ProviderRegistry } from "./harness/registry.ts";
import { makeFakeDriver } from "./testing/fake-driver.ts";

beforeEach(() => { rmSync(DATA_DIR, { recursive: true, force: true }); });
afterEach(() => vi.unstubAllEnvs());
const endpoints: AppConfig = { instances: {
  gateway: { driver: "claudeAgent", access: "custom", config: { endpointModels: ["claude-sonnet-5"] } },
  second: { driver: "claudeAgent", access: "custom", config: { endpointModels: ["claude-sonnet-5"] } },
} };

it("migrates all persisted bot and task references, including backups, to the first endpoint", () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const store = new Store(() => ({ instanceId: "removed", model: "claude-sonnet-5" }));
  const bot = store.createBot({}, { seedMessages: false });
  store.patchBot(bot.id, { fallback: [{ instanceId: "missing-backup", model: "claude-sonnet-5" }] });
  const task = store.createTask(bot.id, "Fixture task")!;
  store.patchTask(bot.id, task.threadId, { modelSelection: { instanceId: "missing-task", model: "claude-sonnet-5" } });
  const kept = store.createBot({ modelSelection: { instanceId: "second", model: "claude-sonnet-5" } }, { seedMessages: false });
  expect(migrateLockedProviderReferences(store, instanceConfigs(endpoints))).toBe(1);
  const reloaded = new Store(() => ({ instanceId: "", model: "" }));
  expect(reloaded.bot(bot.id)?.modelSelection).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(reloaded.bot(bot.id)?.fallback).toEqual([{ instanceId: "gateway", model: "claude-sonnet-5" }]);
  expect(reloaded.taskByThread(bot.id, task.threadId)?.modelSelection).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(reloaded.bot(kept.id)?.modelSelection?.instanceId).toBe("second");
  expect(migrateLockedProviderReferences(reloaded, instanceConfigs(endpoints))).toBe(0);
});

it("persists the default, bot template, recovery and helper selections", () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const cfg: AppConfig = {
    ...endpoints, defaultModelSelection: { instanceId: "old-default", model: "claude-sonnet-5" },
    newBotDefaults: newBotDefaultsSchema.parse({ profile: { modelSelection: { instanceId: "old-default", model: "claude-sonnet-5" } } }),
    automaticRecovery: { enabled: true, backup: { instanceId: "old-backup", model: "claude-sonnet-5" } },
    helper: { instanceId: "old-helper", model: "claude-sonnet-5" },
  };
  saveConfig(cfg);
  saveConfig(providerLockConfigPatch(cfg, instanceConfigs(cfg)));
  const saved = loadConfig();
  expect(saved.defaultModelSelection).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(saved.newBotDefaults?.profile.modelSelection).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(saved.automaticRecovery?.backup).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(saved.helper).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(providerLockConfigPatch(saved, instanceConfigs(saved))).toEqual({});
});

it.each(["0", "1"])("leaves references alone with no endpoint (lock %s)", (lock) => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", lock);
  const store = new Store(() => ({ instanceId: "removed", model: "fixture-model" }));
  const bot = store.createBot({}, { seedMessages: false });
  const cfg = { defaultModelSelection: bot.modelSelection };
  expect(providerLockConfigPatch(cfg, {})).toEqual({});
  expect(migrateLockedProviderReferences(store, {})).toBe(0);
  expect(store.bot(bot.id)?.modelSelection.instanceId).toBe("removed");
});

it("does not construct or probe excluded drivers even on subsequent registry loads", async () => {
  const fake = makeFakeDriver();
  const registry = new ProviderRegistry([fake.driver], { filterConfigs: lockedProviderConfigs });
  await registry.load({ excluded: { driver: "fake" } });
  expect(await registry.describe()).toEqual([]);
  await registry.load({ later: { driver: "fake" } });
  expect(registry.instances()).toEqual([]);
  expect(fake.probes).toEqual([]);
});


it("migrates routine model references on disk before scheduling starts", () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  const options: RoutineManagerOptions = { botState: () => "ready", createTask: () => null, startTurn: async () => {} };
  const routines = new RoutineManager(options);
  const input = { name: "Fixture routine", prompt: "Fixture prompt", botId: "fixture-bot", enabled: false, schedule: { type: "daily" as const, time: "12:00", weekdays: [1, 2, 3, 4, 5] } };
  const moved = routines.create({ ...input, modelSelection: { instanceId: "removed", model: "claude-sonnet-5" } });
  const kept = routines.create({ ...input, modelSelection: { instanceId: "second", model: "claude-sonnet-5" } });
  migrateLockedRoutineReferences(routines, instanceConfigs(endpoints));
  const saved = new RoutineManager(options).listRoutines();
  expect(saved.find((routine) => routine.id === moved.id)?.modelSelection).toEqual({ instanceId: "gateway", model: "claude-sonnet-5" });
  expect(saved.find((routine) => routine.id === kept.id)?.modelSelection?.instanceId).toBe("second");
});

it("does not migrate saved selections when the lock is disabled", () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "0");
  const store = new Store(() => ({ instanceId: "removed", model: "fixture-model" }));
  const bot = store.createBot({}, { seedMessages: false });
  const configs = instanceConfigs(endpoints);
  expect(providerLockConfigPatch({ defaultModelSelection: bot.modelSelection }, configs)).toEqual({});
  expect(migrateLockedProviderReferences(store, configs)).toBe(0);
  expect(store.bot(bot.id)?.modelSelection.instanceId).toBe("removed");
});


it("limits updater plans to Claude while leaving the unlocked plans intact", () => {
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "0");
  const unlocked = enginePlans(BUILT_IN_DRIVERS);
  expect(enginePlans(providerUpdateDrivers(BUILT_IN_DRIVERS))).toEqual(unlocked);
  expect(unlocked.some((plan) => plan.driverKind === "codex")).toBe(true);
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  expect(enginePlans(providerUpdateDrivers(BUILT_IN_DRIVERS)).map((plan) => plan.driverKind)).toEqual(["claudeAgent"]);
});
