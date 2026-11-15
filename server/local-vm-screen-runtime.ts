import { newScreenPassword } from "./local-vm-screen-passwords.ts";
import type { ScreenListPayload } from "../shared/local-vm-screens.ts";
import {
  containerComputerStatus, sharedScreenTarget, SHARED_LOCAL_VM_TARGET, isScreenTarget,
  screenExecArgs, screenSocket, sh, startScreen, stopScreen, screenStates,
  type LocalVmTarget, type Runtime,
} from "./container-computer.ts";
import { LocalVmScreenPool, readScreenAffinity, writeScreenAffinity, type ScreenNumber } from "./local-vm-screens.ts";
import { prepareScreenProfiles } from "./local-vm-screen-tools.ts";
import { screenResource, screenViewer } from "./host/shared-vm-control.ts";
import { ComputerWaitParked, waitForComputer, type ComputerWaitHooks } from "./turn-computer-wait.ts";
import type { TurnOwner, TurnResources } from "./turn-resources.ts";

export function isScreenResource(resource: string): boolean {
  return /^computer:vm:(?:shared:s[1-4]|screens:[^:]+)$/.test(resource);
}

export function parkedLocalVmTurnBusy(
  resource: string,
  screenFree: (resource: string) => boolean | undefined,
  personHolds: (resource: string) => boolean,
  turnFree: (resource: string) => boolean,
): boolean {
  const free = screenFree(resource);
  return !(free ?? ((!isScreenResource(resource) || !personHolds(resource)) && turnFree(resource)));
}

export function bindParkedLocalVmTurnBusy(
  screenFree: LocalVmScreenRuntime["free"],
  personHolds: (resource: string) => boolean,
  turnResources: Pick<TurnResources, "free">,
): (resource: string) => boolean {
  return resource => parkedLocalVmTurnBusy(resource, screenFree, personHolds, r => turnResources.free(r));
}

const SCREEN_IDLE_MS = 10 * 60_000;
const WAIT_RESOURCE = "computer:vm:screens:";

export function createLocalVmScreenRuntime(deps: {
  dataDir: string;
  screens(): number;
  busy(screen: number): boolean;
  held(screen: number): boolean;
  bot(botId: string): { id: string; name: string } | null;
  prepare(botId: string, owner: TurnOwner): Promise<Runtime | { runtime: Runtime; single: true }>;
  bind(owner: TurnOwner, resource: string): Promise<void>;
  wait: ComputerWaitHooks;
  estimate(resource: string): number | undefined;
  containerIdle: { touch(): void; cancel(): void };
  changed?(): void;
}) {
  const idleMs = Math.min(SCREEN_IDLE_MS, Math.max(100, Number(process.env.CRYBOT_SCREEN_IDLE_MS) || SCREEN_IDLE_MS));
  const passwords = new Map<number, string>();
  const generations = new Map<string, number>();
  let pendingClaims = 0;
  let nextGeneration = 0;
  let runtime: Runtime | null = null;
  let recovery: Promise<void> | undefined;
  let fallback = false;
  const enabled = () => deps.screens() > 1 && !fallback;
  const pool = new LocalVmScreenPool(deps.screens(), {
    idleMs,
    isBusy: deps.busy,
    persist: affinity => writeScreenAffinity(deps.dataDir, affinity),
    onAnyOn: () => deps.containerIdle.cancel(),
    onAllOff: () => deps.containerIdle.touch(),
    onChange: () => deps.changed?.(),
    startScreen: async screen => {
      if (!runtime) throw new Error("The Local VM is not ready");
      const target = sharedScreenTarget(screen);
      const states = await screenStates(runtime, target.containerName);
      if (states[screen] !== "off") await stopScreen(runtime, target);
      await prepareScreenProfiles(runtime, target);
      const password = newScreenPassword();
      await startScreen(runtime, target, password);
      passwords.set(screen, password);
      const deadline = Date.now() + 90_000;
      for (;;) {
        try {
          await sh(runtime, screenExecArgs(target, ["status", "--socket", screenSocket(screen)]), 8_000);
          break;
        } catch {
          if (Date.now() >= deadline) throw new Error("The screen did not become ready");
          await new Promise<void>(resolve => setTimeout(resolve, 200));
        }
      }
    },
    stopScreen: async screen => {
      if (runtime) {
        const status = await containerComputerStatus(undefined, undefined, SHARED_LOCAL_VM_TARGET, { probeDesktop: false });
        if (status.managed && status.container === "running") await stopScreen(runtime, sharedScreenTarget(screen));
      }
      passwords.delete(screen);
    },
  }, readScreenAffinity(deps.dataDir));

  function touch(target: LocalVmTarget): void {
    if (!isScreenTarget(target)) {
      if (!enabled() || !active()) deps.containerIdle.touch();
      return;
    }
    const botId = pool.snapshot().slots.find(slot => slot.screen === target.screen)?.botId;
    if (botId) pool.touch(botId);
  }
  const active = () => pool.snapshot().slots.some(slot => slot.state !== "off");
  const assigned = (botId: string) => enabled() ? pool.assigned(botId) : null;
  const targetFor = (botId: string): LocalVmTarget | null => {
    const n = assigned(botId);
    return n === null ? null : sharedScreenTarget(n);
  };

  async function recover(): Promise<void> {
    if (deps.screens() <= 1) return;
    recovery ??= (async () => {
      const status = await containerComputerStatus(undefined, undefined, SHARED_LOCAL_VM_TARGET);
      fallback = status.runtime === "container" || status.screens_fallback === true;
      if (fallback || !status.runtime || !status.managed || status.container !== "running" || status.screens_layout !== "multi") return;
      runtime = status.runtime;
      const states = await screenStates(runtime, SHARED_LOCAL_VM_TARGET.containerName);
      for (const n of [1, 2, 3, 4]) {
        const target = sharedScreenTarget(n);
        if (states[n] && states[n] !== "off" && !pool.snapshot().slots.some(slot => slot.screen === n && slot.botId !== null)) await stopScreen(runtime, target);
      }
      deps.containerIdle.touch();
    })().catch(error => { recovery = undefined; throw error; });
    return recovery;
  }

  async function claim(botId: string, owner: TurnOwner): Promise<LocalVmTarget> {
    pendingClaims++;
    try { return await claimScreen(botId, owner); }
    finally { pendingClaims--; }
  }

  async function claimScreen(botId: string, owner: TurnOwner): Promise<LocalVmTarget> {
    await recover();
    if (!enabled()) return SHARED_LOCAL_VM_TARGET;
    const prepared = await deps.prepare(botId, owner);
    if (typeof prepared !== "string") { runtime = prepared.runtime; fallback = true; return SHARED_LOCAL_VM_TARGET; }
    runtime = prepared;
    if (!deps.wait.active(owner)) throw deps.wait.cancelled();
    if (!generations.has(owner.generation)) generations.set(owner.generation, ++nextGeneration);
    const waiter = { botId, threadId: owner.threadId, generation: generations.get(owner.generation)!, enqueuedAt: Date.now() };
    const resource = WAIT_RESOURCE + botId;
    let result = pool.request(waiter);
    let parked = false;
    try {
      await waitForComputer(owner, resource, {
        claim: () => { result = pool.request(waiter); return "screen" in result; },
        position: () => pool.waitPosition(botId, owner.threadId) ?? 1,
        estimateMs: () => Math.min(pool.estimateMs() ?? idleMs, ...pool.snapshot().slots.map(slot => deps.estimate(screenResource(slot.screen)) ?? Infinity)),
        finish: () => {},
      }, deps.wait);
      const target = targetFor(botId);
      if (!target) throw new Error("Screen assignment was lost");
      await deps.bind(owner, screenResource(target.screen!));
      const abort = new AbortController();
      const watch = setInterval(() => { if (!deps.wait.active(owner)) abort.abort(); }, 100);
      try { await pool.waitFor(waiter, abort.signal); }
      finally { clearInterval(watch); }
      touch(target);
      return target;
    } catch (error) {
      parked = error instanceof ComputerWaitParked;
      throw error;
    } finally {
      if (!parked) pool.cancel(botId, owner.threadId);
      generations.delete(owner.generation);
    }
  }

  function payload(): ScreenListPayload {
    if (!enabled()) return { layout: "single", screens: 1, slots: [], queue: [] };
    const now = Date.now(), snapshot = pool.snapshot();
    return {
      layout: "multi", screens: snapshot.screens,
      slots: snapshot.slots.map(slot => ({
        screen: slot.screen, state: slot.state, bot: slot.botId ? deps.bot(slot.botId) : null,
        viewerTarget: screenViewer(slot.screen), controlledByPerson: deps.held(slot.screen),
        idleSeconds: slot.botId ? Math.max(0, Math.floor((now - slot.lastActiveAt) / 1000)) : null,
      })),
      queue: snapshot.waiters.flatMap(waiter => {
        const bot = deps.bot(waiter.botId);
        return bot ? [{ bot, position: waiter.position, waitingSeconds: Math.max(0, Math.floor((now - waiter.enqueuedAt) / 1000)) }] : [];
      }),
    };
  }

  return {
    enabled, pool, claim, recover, payload, assigned, targetFor, touch, active,
    claiming: () => pendingClaims > 0,
    password: (n: number) => passwords.get(n) ?? null,
    ready: (n: number) => enabled() && pool.snapshot().slots.some(slot => slot.screen === n && slot.state === "ready"),
    free: (resource: string): boolean | undefined => resource.startsWith(WAIT_RESOURCE)
      ? assigned(resource.slice(WAIT_RESOURCE.length)) !== null || pool.snapshot().slots.some(slot => slot.screen <= deps.screens() && slot.state === "off" && !deps.busy(slot.screen)) : undefined,
    touchControl: (key: string) => { const match = /^desktop:local\/shared-s([1-4])$/.exec(key); if (match) touch(sharedScreenTarget(Number(match[1]))); },
    async reset() { await pool.stopAll("recreate"); passwords.clear(); recovery = undefined; fallback = false; },
    configure: () => pool.setScreens(deps.screens()),
    remove: (botId: string) => pool.release(botId, "removed"),
    cancel: (botId: string, threadId: string) => pool.cancel(botId, threadId),
    cancelThread: (threadId: string) => { for (const waiter of pool.snapshot().waiters) if (waiter.threadId === threadId) pool.cancel(waiter.botId, threadId); },
    async close() { await pool.stopAll("shutdown"); },
  };
}

export type LocalVmScreenRuntime = ReturnType<typeof createLocalVmScreenRuntime>;
export type { ScreenNumber };
