import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalVmScreenPool, readScreenAffinity, writeScreenAffinity, type ScreenNumber, type ScreenWaiter } from "./local-vm-screens.ts";

const IDLE_MS = 10 * 60_000;
const waiter = (botId: string, threadId = botId, generation = 1): ScreenWaiter => ({ botId, threadId, generation, enqueuedAt: Date.now() });
const signal = () => new AbortController().signal;
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(screens = 4, affinity: Record<string, ScreenNumber> = {}) {
  const busy = new Set<ScreenNumber>();
  const deps = {
    now: () => Date.now(), idleMs: IDLE_MS,
    startScreen: vi.fn(async (_screen: ScreenNumber) => {}),
    stopScreen: vi.fn(async (_screen: ScreenNumber) => {}),
    isBusy: (screen: ScreenNumber) => busy.has(screen),
    onAnyOn: vi.fn(), onAllOff: vi.fn(), onChange: vi.fn(), persist: vi.fn(),
  };
  return { pool: new LocalVmScreenPool(screens, deps, affinity), deps, busy };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("LocalVmScreenPool", () => {
  it("assigns separate screens to bots and shares one screen between a bot's threads", async () => {
    const { pool, deps } = fixture();
    expect(pool.request(waiter("a"))).toEqual({ screen: 1 });
    expect(pool.request(waiter("b"))).toEqual({ screen: 2 });
    expect(pool.request(waiter("a", "another"))).toEqual({ screen: 1 });
    expect(pool.snapshot().slots[0]?.state).toBe("starting");
    await expect(pool.waitFor(waiter("a"), signal())).resolves.toBe(1);
    await expect(pool.waitFor(waiter("b"), signal())).resolves.toBe(2);
    expect(deps.startScreen.mock.calls).toEqual([[1], [2]]);
    expect(pool.snapshot().slots[0]).toMatchObject({ state: "ready", startedAt: Date.now() });
  });

  it("queues the fifth bot first and hands it the released screen only after stop and start complete", async () => {
    const { pool, deps } = fixture();
    for (const bot of ["a", "b", "c", "d"]) await pool.waitFor(waiter(bot), signal());
    expect(pool.request(waiter("e"))).toEqual({ queued: true, position: 1 });
    const next = pool.waitFor(waiter("e"), signal());
    expect(pool.waitPosition("e", "e")).toBe(1);
    expect(pool.request(waiter("f"))).toEqual({ queued: true, position: 2 });
    const stopped = deferred();
    deps.stopScreen.mockImplementationOnce(() => stopped.promise);
    pool.release("b", "idle");
    await vi.advanceTimersByTimeAsync(0);
    expect(pool.assigned("e")).toBeNull();
    expect(pool.snapshot().slots[1]?.state).toBe("stopping");
    stopped.resolve();
    await expect(next).resolves.toBe(2);
    expect(pool.waitPosition("f", "f")).toBe(1);
    expect(pool.waitPosition("e", "e")).toBeNull();
  });

  it("preserves affinity across idle stops and restarts", async () => {
    const { pool, deps } = fixture(4, { a: 3 });
    expect(await pool.waitFor(waiter("a"), signal())).toBe(3);
    expect(pool.estimateMs()).toBe(IDLE_MS);
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    expect(pool.assigned("a")).toBe(3);
    expect(pool.estimateMs()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(pool.assigned("a")).toBeNull();
    expect(pool.snapshot().slots[2]).toMatchObject({ state: "off", lastBotId: "a" });
    expect(deps.persist).toHaveBeenLastCalledWith({ a: 3 });
    expect(await pool.waitFor(waiter("a"), signal())).toBe(3);
  });

  it("prefers unused screens, then the least recently active free screen", async () => {
    const { pool } = fixture(3, { a: 1, b: 2 });
    expect(await pool.waitFor(waiter("c"), signal())).toBe(3);
    await vi.advanceTimersByTimeAsync(100);
    expect(await pool.waitFor(waiter("b"), signal())).toBe(2);
    pool.release("c", "idle");
    pool.release("b", "idle");
    await vi.advanceTimersByTimeAsync(0);
    expect(await pool.waitFor(waiter("d"), signal())).toBe(1);
    expect(await pool.waitFor(waiter("e"), signal())).toBe(3);
  });

  it("does not reclaim early for a queue, and touch renews the idle window", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    const waiting = pool.waitFor(waiter("b"), signal());
    await vi.advanceTimersByTimeAsync(IDLE_MS / 2);
    pool.touch("a");
    await vi.advanceTimersByTimeAsync(IDLE_MS / 2);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    expect(pool.estimateMs()).toBe(IDLE_MS / 2);
    await vi.advanceTimersByTimeAsync(IDLE_MS / 2);
    await expect(waiting).resolves.toBe(1);
  });

  it("protects a busy screen from idle release and updates the idle duration", async () => {
    const { pool, deps, busy } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    busy.add(1);
    pool.release("a", "idle");
    await vi.advanceTimersByTimeAsync(IDLE_MS * 2);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    busy.clear();
    pool.touch("a");
    pool.setIdleMs(1_000);
    await vi.advanceTimersByTimeAsync(999);
    expect(pool.assigned("a")).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(pool.assigned("a")).toBeNull();
  });

  it("starts a full quiet window after observing a busy screen become free", async () => {
    const { pool, busy, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    busy.add(1);
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    busy.clear();
    await vi.advanceTimersByTimeAsync(IDLE_MS / 10);
    expect(pool.estimateMs()).toBe(IDLE_MS);
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
  });

  it("does not treat an old affinity screen as unused when its bot moves", async () => {
    const { pool } = fixture(4, { a: 4 });
    expect(await pool.waitFor(waiter("a"), signal())).toBe(4);
    pool.setScreens(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(await pool.waitFor(waiter("a"), signal())).toBe(1);
    pool.setScreens(4);
    expect(await pool.waitFor(waiter("b"), signal())).toBe(2);
    expect(await pool.waitFor(waiter("c"), signal())).toBe(3);
  });

  it("shrinks immediately for quiet screens and waits for busy screens to be released", async () => {
    const { pool, deps, busy } = fixture();
    for (const bot of ["a", "b", "c", "d"]) await pool.waitFor(waiter(bot), signal());
    busy.add(4);
    expect(pool.setScreens(2)).toEqual({ stopping: [3] });
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.stopScreen.mock.calls).toEqual([[3]]);
    expect(pool.assigned("d")).toBe(4);
    pool.release("d", "idle");
    expect(pool.assigned("d")).toBe(4);
    busy.clear();
    pool.release("d", "idle");
    await vi.advanceTimersByTimeAsync(0);
    expect(pool.snapshot().slots.map(slot => slot.screen)).toEqual([1, 2]);
    const waiting = pool.waitFor(waiter("e"), signal());
    pool.setScreens(3);
    await expect(waiting).resolves.toBe(3);
  });

  it("eventually stops a retired screen when its busy resource becomes free", async () => {
    const { pool, busy } = fixture(2);
    await pool.waitFor(waiter("a"), signal());
    await pool.waitFor(waiter("b"), signal());
    busy.add(2);
    pool.setScreens(1);
    await vi.advanceTimersByTimeAsync(IDLE_MS / 10);
    expect(pool.assigned("b")).toBe(2);
    busy.clear();
    await vi.advanceTimersByTimeAsync(IDLE_MS / 10);
    expect(pool.assigned("b")).toBeNull();
  });

  it("fires container activity callbacks only on transitions between none and some", async () => {
    const { pool, deps } = fixture();
    await pool.waitFor(waiter("a"), signal());
    await pool.waitFor(waiter("b"), signal());
    expect(deps.onAnyOn).toHaveBeenCalledTimes(1);
    pool.release("a", "idle");
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.onAllOff).not.toHaveBeenCalled();
    await pool.stopAll("recreate");
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    await pool.stopAll("shutdown");
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    expect(await pool.waitFor(waiter("b"), signal())).toBe(2);
    expect(deps.onAnyOn).toHaveBeenCalledTimes(2);
  });

  it("cancels queued and aborted waits without blocking the next bot", async () => {
    const { pool } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    const controller = new AbortController();
    const first = expect(pool.waitFor(waiter("b"), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    const second = expect(pool.waitFor(waiter("c"), signal())).rejects.toMatchObject({ name: "AbortError" });
    const third = pool.waitFor(waiter("d"), signal());
    controller.abort();
    pool.cancel("c", "c");
    await first;
    await second;
    expect(pool.waitPosition("d", "d")).toBe(1);
    pool.release("a", "idle");
    await expect(third).resolves.toBe(1);
    await expect(pool.waitFor(waiter("e"), AbortSignal.abort())).rejects.toMatchObject({ name: "AbortError" });
    expect(pool.waitPosition("e", "e")).toBeNull();
  });

  it("keeps another subscriber to the same wait when one signal aborts", async () => {
    const { pool } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    const controller = new AbortController();
    const aborted = expect(pool.waitFor(waiter("b"), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    const remaining = pool.waitFor(waiter("b"), signal());
    controller.abort();
    await aborted;
    expect(pool.waitPosition("b", "b")).toBe(1);
    pool.release("a", "idle");
    await expect(remaining).resolves.toBe(1);
  });

  it("serializes release during startup before granting the next bot", async () => {
    const { pool, deps } = fixture(1);
    const starting = deferred();
    deps.startScreen.mockImplementationOnce(() => starting.promise);
    const first = expect(pool.waitFor(waiter("a"), signal())).rejects.toMatchObject({ name: "AbortError" });
    const next = pool.waitFor(waiter("b"), signal());
    pool.release("a", "idle");
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    starting.resolve();
    await first;
    await expect(next).resolves.toBe(1);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
    expect(deps.startScreen).toHaveBeenCalledTimes(2);
  });

  it("replaces a queued generation at the back and wakes all threads of the assigned bot", async () => {
    const { pool } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    const old = expect(pool.waitFor(waiter("b"), signal())).rejects.toMatchObject({ name: "AbortError" });
    const c = pool.waitFor(waiter("c"), signal());
    const b = pool.waitFor(waiter("b", "b", 2), signal());
    const other = pool.waitFor(waiter("b", "other"), signal());
    await old;
    expect(pool.waitPosition("c", "c")).toBe(1);
    expect(pool.waitPosition("b", "b")).toBe(2);
    pool.release("a", "idle");
    await expect(c).resolves.toBe(1);
    pool.release("c", "idle");
    await expect(b).resolves.toBe(1);
    await expect(other).resolves.toBe(1);
    expect(pool.snapshot().waiters).toEqual([]);
  });

  it("waits for an in-flight start before shutdown and cancels every waiter", async () => {
    const { pool, deps } = fixture(1);
    const starting = deferred();
    deps.startScreen.mockImplementationOnce(() => starting.promise);
    const a = expect(pool.waitFor(waiter("a"), signal())).rejects.toMatchObject({ name: "AbortError" });
    const b = expect(pool.waitFor(waiter("b"), signal())).rejects.toMatchObject({ name: "AbortError" });
    const stopped = pool.stopAll("shutdown");
    expect(() => pool.request(waiter("c"))).toThrow("stopping");
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    starting.resolve();
    await stopped;
    await a;
    await b;
    expect(pool.snapshot().slots[0]?.state).toBe("off");
    expect(deps.startScreen).toHaveBeenCalledTimes(1);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports start failures safely and keeps other screens available during cooldown", async () => {
    const { pool, deps } = fixture(2);
    deps.startScreen.mockRejectedValueOnce(new Error("sensitive-command-output"));
    await expect(pool.waitFor(waiter("a"), signal())).rejects.toThrow("Screen failed to start");
    await vi.advanceTimersByTimeAsync(0);
    expect(pool.snapshot().slots[0]).toMatchObject({ state: "off", botId: null, failure: "Screen failed to start" });
    expect(JSON.stringify(pool.snapshot())).not.toContain("sensitive-command-output");
    expect(deps.stopScreen).toHaveBeenCalledWith(1);
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    expect(await pool.waitFor(waiter("b"), signal())).toBe(2);
    await pool.stopAll("recreate");
    expect(await pool.waitFor(waiter("a"), signal())).toBe(1);
  });

  it("does not mark a failed stop as off or reuse it, and lets stopAll retry", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    deps.stopScreen.mockRejectedValueOnce(new Error("sensitive-command-output"));
    await expect(pool.stopAll("shutdown")).rejects.toThrow("could not stop");
    expect(pool.snapshot().slots[0]).toMatchObject({ state: "failed", failure: "Screen failed to stop" });
    expect(deps.onAllOff).not.toHaveBeenCalled();
    expect(pool.request(waiter("b"))).toEqual({ queued: true, position: 1 });
    await pool.stopAll("shutdown");
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    expect(await pool.waitFor(waiter("b"), signal())).toBe(1);
  });

  it("resumes a failed stop after stopAll and drains the next waiter", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    deps.stopScreen.mockRejectedValueOnce(new Error("stop failed"));
    await expect(pool.stopAll("shutdown")).rejects.toThrow("could not stop");
    const next = pool.waitFor(waiter("b"), signal());
    expect(pool.snapshot().slots[0]).toMatchObject({ state: "failed", botId: null });
    expect(pool.waitPosition("b", "b")).toBe(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(next).resolves.toBe(1);
    expect(pool.snapshot().slots[0]).toMatchObject({ state: "ready", botId: "b" });
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
  });

  it("reassigns a failed single screen automatically after its cooldown", async () => {
    const { pool, deps } = fixture(1);
    deps.startScreen.mockRejectedValueOnce(new Error("start failed"));
    await expect(pool.waitFor(waiter("a"), signal())).rejects.toThrow("Screen failed to start");
    await vi.advanceTimersByTimeAsync(0);
    const next = pool.waitFor(waiter("b"), signal());
    expect(pool.waitPosition("b", "b")).toBe(1);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(deps.startScreen).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(next).resolves.toBe(1);
    expect(pool.snapshot().slots[0]).toMatchObject({ state: "ready", botId: "b" });
    expect(pool.snapshot().slots[0]?.failure).toBeUndefined();
  });

  it("retries an idle stop and notifies when every screen is off", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    deps.stopScreen.mockRejectedValueOnce(new Error("stop failed"));
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(pool.snapshot().slots[0]?.state).toBe("failed");
    expect(deps.onAllOff).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(pool.snapshot().slots[0]?.state).toBe("off");
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("queues when all screens are cooling down and resumes in FIFO order", async () => {
    const { pool, deps } = fixture(2);
    deps.startScreen.mockRejectedValueOnce(new Error("start failed"));
    deps.startScreen.mockRejectedValueOnce(new Error("start failed"));
    await expect(pool.waitFor(waiter("a"), signal())).rejects.toThrow("Screen failed to start");
    await expect(pool.waitFor(waiter("b"), signal())).rejects.toThrow("Screen failed to start");
    await vi.advanceTimersByTimeAsync(0);
    const c = pool.waitFor(waiter("c"), signal());
    const d = pool.waitFor(waiter("d"), signal());
    expect(pool.waitPosition("c", "c")).toBe(1);
    expect(pool.waitPosition("d", "d")).toBe(2);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(deps.startScreen).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await expect(c).resolves.toBe(1);
    await expect(d).resolves.toBe(2);
  });

  it("serializes stopAll with in-flight failed-start cleanup without leaving recovery timers", async () => {
    const { pool, deps } = fixture(1);
    const cleanup = deferred();
    deps.startScreen.mockRejectedValueOnce(new Error("start failed"));
    deps.stopScreen.mockImplementationOnce(() => cleanup.promise);
    await expect(pool.waitFor(waiter("a"), signal())).rejects.toThrow("Screen failed to start");
    const stopped = pool.stopAll("shutdown");
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
    cleanup.resolve();
    await stopped;
    expect(pool.snapshot().slots[0]?.state).toBe("off");
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("backs off repeated stop failures up to five minutes and resumes retries after stopAll", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    deps.stopScreen.mockRejectedValue(new Error("stop failed"));
    pool.release("a", "idle");
    await vi.advanceTimersByTimeAsync(0);
    let calls = 1;
    for (const delay of [5_000, 15_000, 45_000, 135_000, 300_000, 300_000]) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(deps.stopScreen).toHaveBeenCalledTimes(calls);
      await vi.advanceTimersByTimeAsync(1);
      expect(deps.stopScreen).toHaveBeenCalledTimes(++calls);
    }
    await expect(pool.stopAll("shutdown")).rejects.toThrow("could not stop");
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(deps.stopScreen).toHaveBeenCalledTimes(calls + 1);
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.stopScreen).toHaveBeenCalledTimes(calls + 2);
  });

  it("retries failed startup cleanup before cooling down and reusing the screen", async () => {
    const { pool, deps } = fixture(1);
    deps.startScreen.mockRejectedValueOnce(new Error("start failed"));
    deps.stopScreen.mockRejectedValueOnce(new Error("cleanup failed"));
    await expect(pool.waitFor(waiter("a"), signal())).rejects.toThrow("Screen failed to start");
    await vi.advanceTimersByTimeAsync(0);
    const next = pool.waitFor(waiter("b"), signal());
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pool.snapshot().slots[0]?.state).toBe("off");
    expect(deps.onAllOff).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(pool.assigned("b")).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await expect(next).resolves.toBe(1);
  });

  it.each([false, true])("requeues a retired starting screen ahead of later waiters (start fails: %s)", async (fails) => {
    const { pool, deps } = fixture(2);
    await pool.waitFor(waiter("a"), signal());
    const starting = deferred();
    deps.startScreen.mockImplementationOnce(() => starting.promise);
    const next = pool.waitFor(waiter("b"), signal());
    pool.request(waiter("c"));
    pool.setScreens(1);
    expect(pool.waitPosition("b", "b")).toBe(1);
    expect(pool.waitPosition("c", "c")).toBe(2);
    if (fails) starting.reject(new Error("start failed"));
    else starting.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(pool.waitPosition("b", "b")).toBe(1);
    pool.release("a", "idle");
    await expect(next).resolves.toBe(1);
    expect(pool.waitPosition("c", "c")).toBe(1);
  });

  it("touch refreshes activity without publishing a snapshot", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    await vi.advanceTimersByTimeAsync(1_000);
    deps.onChange.mockClear();
    pool.touch("a");
    expect(deps.onChange).not.toHaveBeenCalled();
    expect(pool.snapshot().slots[0]?.lastActiveAt).toBe(Date.now());
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
  });

  it("caps idle timers at the platform limit on construction and updates", async () => {
    const { deps } = fixture();
    const pool = new LocalVmScreenPool(1, { ...deps, idleMs: 2 ** 32 });
    await pool.waitFor(waiter("a"), signal());
    expect(pool.estimateMs()).toBe(2 ** 31 - 1);
    pool.setIdleMs(2 ** 33);
    await vi.advanceTimersByTimeAsync(2 ** 31 - 2);
    expect(deps.stopScreen).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.stopScreen).toHaveBeenCalledTimes(1);
  });

  it("includes stopping screens in the wait estimate", async () => {
    const { pool, deps } = fixture(1);
    await pool.waitFor(waiter("a"), signal());
    const stopped = deferred();
    deps.stopScreen.mockImplementationOnce(() => stopped.promise);
    pool.release("a", "idle");
    expect(pool.estimateMs()).toBe(0);
    stopped.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(pool.estimateMs()).toBeNull();
  });

  it("forgets a removed bot but retains affinity for recreation", async () => {
    const { pool, deps } = fixture(2);
    await pool.waitFor(waiter("a"), signal());
    await pool.waitFor(waiter("b"), signal());
    pool.release("a", "removed");
    await pool.stopAll("recreate");
    expect(deps.persist).toHaveBeenLastCalledWith({ b: 2 });
    expect(await pool.waitFor(waiter("b"), signal())).toBe(2);
  });

  it("returns detached snapshots and rejects invalid sizes and timeouts", () => {
    const { pool } = fixture();
    const snapshot = pool.snapshot();
    snapshot.slots[0]!.botId = "changed";
    expect(pool.assigned("changed")).toBeNull();
    expect(pool.estimateMs()).toBeNull();
    for (const count of [0, 5, 1.5, NaN]) expect(() => pool.setScreens(count)).toThrow();
    for (const ms of [0, -1, Infinity, NaN]) expect(() => pool.setIdleMs(ms)).toThrow();
    expect(() => fixture(5)).toThrow();
  });
});

describe("screen affinity file", () => {
  it("round trips only bot IDs and valid screen numbers in an isolated data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "cry-screen-affinity-"));
    try {
      expect(readScreenAffinity(dir)).toEqual({});
      writeScreenAffinity(dir, { a: 1, b: 4 });
      expect(JSON.parse(readFileSync(join(dir, "local-vm-screens.json"), "utf8"))).toEqual({ a: 1, b: 4 });
      expect(readScreenAffinity(dir)).toEqual({ a: 1, b: 4 });
      for (const text of ['{"a":2,"b":5,"c":"1","d":1.5}', "null", "[]", "broken"]) {
        writeFileSync(join(dir, "local-vm-screens.json"), text);
        expect(readScreenAffinity(dir)).toEqual(text.startsWith("{") ? { a: 2 } : {});
      }
      writeScreenAffinity(join(dir, "nested"), { a: 3 });
      const pool = fixture(4, readScreenAffinity(join(dir, "nested"))).pool;
      expect(pool.request(waiter("a"))).toEqual({ screen: 3 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

it("manual requests reclaim only expired idle screens and keep FIFO order", async () => {
  const { pool, busy } = fixture(2);
  await pool.waitFor(waiter("a"), signal());
  await pool.waitFor(waiter("b"), signal());
  busy.add(1);
  expect(await pool.requestAvailable(waiter("c"))).toEqual({ queued: true, position: 1 });
  vi.setSystemTime(Date.now() + IDLE_MS);
  expect(await pool.requestAvailable(waiter("d"))).toEqual({ queued: true, position: 1 });
  expect(pool.assigned("a")).toBe(1);
  expect(pool.assigned("c")).toBe(2);
  expect(pool.assigned("d")).toBeNull();
  await vi.advanceTimersByTimeAsync(IDLE_MS);
  expect(pool.assigned("c")).toBeNull();
  expect(pool.assigned("d")).toBe(2);
});

it("reclaims enough expired screens to serve earlier waiters before a manual request", async () => {
  const { pool } = fixture(2);
  await pool.waitFor(waiter("a"), signal());
  await pool.waitFor(waiter("b"), signal());
  pool.request(waiter("c"));
  vi.setSystemTime(Date.now() + IDLE_MS);
  expect(await pool.requestAvailable(waiter("d"))).toEqual({ screen: 2 });
  expect(pool.assigned("c")).toBe(1);
});
