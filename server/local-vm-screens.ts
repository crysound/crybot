import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic.ts";

export const MAX_SCREENS = 4;
export type ScreenNumber = 1 | 2 | 3 | 4;
export type ScreenState = "off" | "starting" | "ready" | "stopping" | "failed";
export interface ScreenSlot {
  screen: ScreenNumber;
  state: ScreenState;
  botId: string | null;
  lastBotId: string | null;
  lastActiveAt: number;
  startedAt: number | null;
  failure?: string;
}
export interface ScreenAssignment {
  botId: string;
  screen: ScreenNumber;
  assignedAt: number;
  lastActiveAt: number;
}
export interface ScreenWaiter {
  botId: string;
  threadId: string;
  generation: number;
  enqueuedAt: number;
}
export interface ScreenPoolSnapshot {
  screens: number;
  slots: ScreenSlot[];
  waiters: Array<{ botId: string; threadId: string; position: number; enqueuedAt: number }>;
}
export interface ScreenPoolDeps {
  now?: () => number;
  idleMs: number;
  startScreen(screen: ScreenNumber): Promise<void>;
  stopScreen(screen: ScreenNumber): Promise<void>;
  isBusy(screen: ScreenNumber): boolean;
  onChange?(snapshot: ScreenPoolSnapshot): void;
  onAllOff?(): void;
  onAnyOn?(): void;
  persist?(affinity: Record<string, ScreenNumber>): void;
}

type Pending = { waiter: ScreenWaiter; finish: (screen: ScreenNumber | Error) => void };
type ReleaseReason = "idle" | "removed" | "shutdown" | "recreate";

function screenNumber(value: unknown): value is ScreenNumber {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_SCREENS;
}

function checkedScreens(n: number): number {
  if (!screenNumber(n)) throw new RangeError("Screen count must be an integer from 1 to 4");
  return n;
}

function checkedIdleMs(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) throw new RangeError("Screen idle window must be positive");
  return Math.min(ms, 2 ** 31 - 1);
}

function cancelled(): Error {
  return new DOMException("Screen wait cancelled", "AbortError");
}

function sameThread(a: ScreenWaiter, b: Pick<ScreenWaiter, "botId" | "threadId">): boolean {
  return a.botId === b.botId && a.threadId === b.threadId;
}

export class LocalVmScreenPool {
  private screens: number;
  private idleMs: number;
  private readonly deps: ScreenPoolDeps;
  private readonly now: () => number;
  private readonly slots: ScreenSlot[];
  private readonly queue: ScreenWaiter[] = [];
  private readonly pending = new Set<Pending>();
  private readonly timers = new Map<ScreenNumber, ReturnType<typeof setTimeout>>();
  private readonly operations = new Map<ScreenNumber, Promise<void>>();
  private readonly active = new Set<ScreenNumber>();
  private readonly used = new Set<ScreenNumber>();
  private readonly busySeen = new Set<ScreenNumber>();
  private readonly cooldowns = new Set<ScreenNumber>();
  private readonly failedStarts = new Set<ScreenNumber>();
  private readonly retryDelays = new Map<ScreenNumber, number>();
  private stoppingAll: Promise<void> | null = null;

  constructor(screens: number, deps: ScreenPoolDeps, affinity: Record<string, ScreenNumber> = {}) {
    this.screens = checkedScreens(screens);
    this.idleMs = checkedIdleMs(deps.idleMs);
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.slots = ([1, 2, 3, 4] as const).map(screen => ({
      screen, state: "off", botId: null,
      lastBotId: Object.entries(affinity).find(([, n]) => n === screen)?.[0] ?? null,
      lastActiveAt: 0, startedAt: null,
    }));
    for (const slot of this.slots) if (slot.lastBotId !== null) this.used.add(slot.screen);
  }

  setScreens(n: number): { stopping: ScreenNumber[] } {
    this.screens = checkedScreens(n);
    const stopping: ScreenNumber[] = [];
    const requeued = [...this.pending].map(item => item.waiter).filter(waiter =>
      this.slots.some(slot => slot.screen > n && slot.state === "starting" && slot.botId === waiter.botId));
    for (const waiter of requeued.toReversed()) {
      this.removeQueued(waiter);
      this.queue.unshift({ ...waiter });
    }
    for (const slot of this.slots) {
      if (slot.screen <= n || slot.state === "off") continue;
      if (slot.state !== "starting" && this.deps.isBusy(slot.screen)) {
        this.arm(slot, this.idleMs / 10);
      } else {
        stopping.push(slot.screen);
        void this.stop(slot, slot.state === "starting");
      }
    }
    this.drain();
    this.changed();
    return { stopping };
  }

  setIdleMs(ms: number): void {
    this.idleMs = checkedIdleMs(ms);
    for (const slot of this.slots) if (slot.botId !== null) this.arm(slot);
  }

  assigned(botId: string): ScreenNumber | null {
    return this.slots.find(slot => slot.botId === botId)?.screen ?? null;
  }

  request(waiter: ScreenWaiter): { screen: ScreenNumber } | { queued: true; position: number } {
    if (this.stoppingAll) throw new Error("Screen pool is stopping");
    this.replaceGeneration(waiter);
    const assigned = this.assigned(waiter.botId);
    if (assigned !== null) return { screen: assigned };
    if (!this.queue.some(item => sameThread(item, waiter))) this.queue.push({ ...waiter });
    this.drain();
    this.changed();
    const screen = this.assigned(waiter.botId);
    return screen === null ? { queued: true, position: this.waitPosition(waiter.botId, waiter.threadId)! } : { screen };
  }

  waitFor(waiter: ScreenWaiter, signal: AbortSignal): Promise<ScreenNumber> {
    if (signal.aborted) return Promise.reject(cancelled());
    return new Promise((resolve, reject) => {
      const result = this.request(waiter);
      if ("screen" in result && this.slots[result.screen - 1]!.state === "ready") {
        resolve(result.screen);
        return;
      }
      const abort = () => {
        pending.finish(cancelled());
        if (!this.hasPending(waiter)) this.removeQueued(waiter);
        this.drain();
        this.changed();
      };
      const pending: Pending = {
        waiter: { ...waiter },
        finish: outcome => {
          this.pending.delete(pending);
          signal.removeEventListener("abort", abort);
          if (outcome instanceof Error) reject(outcome);
          else resolve(outcome);
        },
      };
      this.pending.add(pending);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }

  cancel(botId: string, threadId: string): void {
    const waiter = { botId, threadId };
    this.removeQueued(waiter);
    for (const pending of this.pending) if (sameThread(pending.waiter, waiter)) pending.finish(cancelled());
    this.drain();
    this.changed();
  }

  waitPosition(botId: string, threadId: string): number | null {
    const index = this.queue.findIndex(waiter => waiter.botId === botId && waiter.threadId === threadId);
    return index < 0 ? null : index + 1;
  }

  estimateMs(): number | null {
    const remaining = this.slots.filter(slot => slot.screen <= this.screens && (slot.botId !== null || slot.state === "stopping"))
      .map(slot => slot.state === "stopping" ? 0 : Math.max(0, slot.lastActiveAt + this.idleMs - this.now()));
    return remaining.length ? Math.min(...remaining) : null;
  }

  touch(botId: string): void {
    const slot = this.slots.find(slot => slot.botId === botId);
    if (!slot) return;
    slot.lastActiveAt = this.now();
    this.busySeen.delete(slot.screen);
    this.arm(slot);
  }

  release(botId: string, reason: ReleaseReason): void {
    const slot = this.slots.find(slot => slot.botId === botId);
    if (reason === "removed") {
      const removed = this.queue.filter(item => item.botId === botId);
      for (const item of removed) this.cancel(item.botId, item.threadId);
      for (const item of this.slots) if (item.lastBotId === botId) item.lastBotId = null;
      this.persist();
    }
    if (!slot) return;
    if (reason === "idle" && this.deps.isBusy(slot.screen)) {
      this.touch(botId);
      return;
    }
    void this.stop(slot);
  }

  stopAll(reason: "shutdown" | "recreate"): Promise<void> {
    if (this.stoppingAll) return this.stoppingAll;
    for (const screen of this.timers.keys()) this.clearTimer(screen);
    this.cooldowns.clear();
    this.retryDelays.clear();
    this.queue.length = 0;
    for (const pending of this.pending) pending.finish(cancelled());
    this.stoppingAll = Promise.resolve().then(async () => {
      await Promise.all(this.slots.map(slot => this.stop(slot)));
      if (this.active.size) throw new Error(`Screen pool ${reason} could not stop every screen`);
    }).finally(() => {
      this.stoppingAll = null;
      for (const slot of this.slots) {
        if (slot.state === "failed") this.scheduleStopRetry(slot);
      }
    });
    this.changed();
    return this.stoppingAll;
  }

  snapshot(): ScreenPoolSnapshot {
    return {
      screens: this.screens,
      slots: this.slots.filter(slot => slot.screen <= this.screens || slot.state !== "off").map(slot => ({ ...slot })),
      waiters: this.queue.map(({ botId, threadId, enqueuedAt }, index) => ({ botId, threadId, enqueuedAt, position: index + 1 })),
    };
  }

  private hasPending(waiter: ScreenWaiter): boolean {
    return [...this.pending].some(item => sameThread(item.waiter, waiter) && item.waiter.generation === waiter.generation);
  }

  private removeQueued(waiter: Pick<ScreenWaiter, "botId" | "threadId">): void {
    const index = this.queue.findIndex(item => sameThread(item, waiter));
    if (index >= 0) this.queue.splice(index, 1);
  }

  private replaceGeneration(waiter: ScreenWaiter): void {
    const previous = this.queue.find(item => sameThread(item, waiter));
    if (previous && previous.generation !== waiter.generation) this.removeQueued(waiter);
    for (const pending of this.pending) {
      if (sameThread(pending.waiter, waiter) && pending.waiter.generation !== waiter.generation) pending.finish(cancelled());
    }
  }

  private drain(): void {
    if (this.stoppingAll) return;
    const waiting = this.queue.slice();
    for (const waiter of waiting) {
      const existing = this.assigned(waiter.botId);
      if (existing !== null) {
        this.removeQueued(waiter);
        if (this.slots[existing - 1]!.state === "ready") this.resolveBot(waiter.botId, existing);
        continue;
      }
      const available = this.slots.filter(slot => slot.screen <= this.screens && slot.state === "off"
        && !this.cooldowns.has(slot.screen) && !this.deps.isBusy(slot.screen));
      const candidate = available.find(slot => slot.lastBotId === waiter.botId)
        ?? available.find(slot => !this.used.has(slot.screen))
        ?? available.sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
      if (!candidate) continue;
      this.removeQueued(waiter);
      this.start(candidate, waiter.botId);
    }
  }

  private start(slot: ScreenSlot, botId: string): void {
    slot.botId = botId;
    for (const other of this.slots) if (other.lastBotId === botId) other.lastBotId = null;
    slot.lastBotId = botId;
    slot.lastActiveAt = this.now();
    slot.state = "starting";
    delete slot.failure;
    const first = this.active.size === 0;
    this.active.add(slot.screen);
    this.used.add(slot.screen);
    const operation = Promise.resolve().then(() => this.deps.startScreen(slot.screen)).then(() => {
      if (slot.state !== "starting") return;
      slot.state = "ready";
      slot.startedAt = this.now();
      slot.lastActiveAt = this.now();
      this.arm(slot);
      this.resolveBot(botId, slot.screen);
      this.changed();
    }, async () => {
      if (slot.state === "stopping") return;
      this.resolveBot(botId, new Error("Screen failed to start"));
      slot.botId = null;
      slot.state = "failed";
      slot.failure = "Screen failed to start";
      this.failedStarts.add(slot.screen);
      await this.cleanupFailedStart(slot);
      this.drain();
      this.changed();
    });
    this.operations.set(slot.screen, operation);
    if (first) this.deps.onAnyOn?.();
    this.persist();
  }

  private async cleanupFailedStart(slot: ScreenSlot): Promise<void> {
    try {
      await this.deps.stopScreen(slot.screen);
      if (slot.state !== "stopping") this.stopped(slot);
    } catch {
      if (slot.state !== "stopping") this.stopFailed(slot, "Screen failed to start and clean up");
    }
  }

  private stop(slot: ScreenSlot, requeued = false): Promise<void> {
    this.clearTimer(slot.screen);
    this.busySeen.delete(slot.screen);
    if (slot.state === "off") return Promise.resolve();
    if (slot.state === "stopping") return this.operations.get(slot.screen)!;
    const previous = this.operations.get(slot.screen);
    if (slot.botId !== null && !requeued) this.resolveBot(slot.botId, cancelled());
    slot.botId = null;
    slot.state = "stopping";
    const operation = Promise.resolve(previous).then(() => this.deps.stopScreen(slot.screen)).then(() => {
      this.stopped(slot);
    }, () => {
      this.stopFailed(slot, "Screen failed to stop");
    }).then(() => {
      this.drain();
      this.changed();
    });
    this.operations.set(slot.screen, operation);
    this.changed();
    return operation;
  }

  private stopped(slot: ScreenSlot): void {
    slot.state = "off";
    slot.startedAt = null;
    this.retryDelays.delete(slot.screen);
    if (this.failedStarts.delete(slot.screen) && !this.stoppingAll) {
      this.cooldowns.add(slot.screen);
      this.schedule(slot.screen, 30_000, () => {
        this.cooldowns.delete(slot.screen);
        this.drain();
        this.changed();
      });
    } else {
      delete slot.failure;
    }
    this.markOff(slot);
  }

  private stopFailed(slot: ScreenSlot, failure: string): void {
    slot.state = "failed";
    slot.failure = failure;
    if (this.stoppingAll) return;
    this.scheduleStopRetry(slot);
  }

  private scheduleStopRetry(slot: ScreenSlot): void {
    const delay = this.retryDelays.get(slot.screen) ?? 5_000;
    this.retryDelays.set(slot.screen, Math.min(delay * 3, 300_000));
    this.schedule(slot.screen, delay, () => { void this.stop(slot); });
  }

  private markOff(slot: ScreenSlot): void {
    if (this.active.delete(slot.screen) && !this.active.size) this.deps.onAllOff?.();
  }

  private resolveBot(botId: string, outcome: ScreenNumber | Error): void {
    for (const pending of this.pending) if (pending.waiter.botId === botId) pending.finish(outcome);
  }

  private clearTimer(screen: ScreenNumber): void {
    clearTimeout(this.timers.get(screen));
    this.timers.delete(screen);
  }

  private schedule(screen: ScreenNumber, delay: number, run: () => void): void {
    this.clearTimer(screen);
    const timer = setTimeout(() => {
      this.timers.delete(screen);
      run();
    }, delay);
    timer.unref?.();
    this.timers.set(screen, timer);
  }

  private arm(slot: ScreenSlot, delay = slot.screen > this.screens ? this.idleMs / 10 : Math.max(0, slot.lastActiveAt + this.idleMs - this.now())): void {
    if (slot.state !== "ready" && slot.state !== "starting") return;
    this.schedule(slot.screen, delay, () => {
      if (this.deps.isBusy(slot.screen)) {
        this.busySeen.add(slot.screen);
        slot.lastActiveAt = this.now();
        this.arm(slot, this.idleMs / 10);
      } else if (slot.screen <= this.screens && this.busySeen.delete(slot.screen)) {
        slot.lastActiveAt = this.now();
        this.arm(slot);
      } else if (slot.screen > this.screens || this.now() >= slot.lastActiveAt + this.idleMs) {
        void this.stop(slot);
      } else {
        this.arm(slot);
      }
    });
  }

  private persist(): void {
    this.deps.persist?.(Object.fromEntries(this.slots.flatMap(slot => slot.lastBotId === null ? [] : [[slot.lastBotId, slot.screen]])));
  }

  private changed(): void {
    this.deps.onChange?.(this.snapshot());
  }
}

function validAffinity(value: unknown): Record<string, ScreenNumber> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([botId, screen]) => botId.length > 0 && screenNumber(screen)));
}

export function readScreenAffinity(dataDir: string): Record<string, ScreenNumber> {
  try {
    return validAffinity(JSON.parse(readFileSync(join(dataDir, "local-vm-screens.json"), "utf8")));
  } catch {
    return {};
  }
}

export function writeScreenAffinity(dataDir: string, affinity: Record<string, ScreenNumber>): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileAtomic(join(dataDir, "local-vm-screens.json"), `${JSON.stringify(validAffinity(affinity))}\n`, { mode: 0o600 });
}
