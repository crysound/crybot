import test from "node:test";
import assert from "node:assert/strict";
import { HIDDEN, islandTransition as move, islandGeometry, botStatus, sortIslandBots, islandCounts, latestThread, islandSource } from "./island-model.mjs";

test("four shapes, return, immediate summary leave and delayed expanded leave", () => {
  let state = move(HIDDEN, { type: "enter" });
  assert.equal(state.mode, "summary");
  assert.equal(move(state, { type: "leave" }).mode, "hidden");
  state = move(state, { type: "expand" });
  assert.equal(move(state, { type: "leave" }).mode, "list");
  assert.equal(move(state, { type: "timeout" }).mode, "hidden");
  state = move(state, { type: "select", botId: "a" });
  assert.equal(state.mode, "chat");
  assert.equal(move(state, { type: "back" }).mode, "list");
  assert.equal(move(state, { type: "timeout" }).mode, "hidden");
  state = move(state, { type: "typing", value: true });
  assert.equal(move(state, { type: "timeout" }).mode, "chat");
  for (const type of ["escape", "outside", "place", "dismiss"]) assert.deepEqual(move(state, { type }), HIDDEN);
  assert.deepEqual(move(HIDDEN, { type: "select", botId: "a" }), HIDDEN);
});
test("status, stable waiting-first order and total counts", () => {
  const bots = [{ id: "idle" }, { id: "work", busy: true }, { id: "wait", activity: "waiting-on-you" }, { id: "hidden", hidden: true }];
  const sorted = sortIslandBots(bots);
  assert.deepEqual(sorted.map(bot => bot.id), ["wait", "idle", "work"]);
  assert.deepEqual(islandCounts(sorted), { total: 3, working: 1, waiting: 1 });
  assert.equal(botStatus(bots[2], false), "offline");
  assert.equal(botStatus({ activity: "dead" }), "offline");
  assert.equal(botStatus({ tasks: [{ activity: "waiting-on-you" }] }), "waiting");
});
test("sensor uses primary display bounds including nonzero origins and no-notch menu bars", () => {
  const display = { bounds: { x: -1920, y: 300, width: 1920 }, workArea: { y: 324 } };
  assert.deepEqual(islandGeometry(display), { x: -1220, y: 300, width: 520, height: 620, menuHeight: 24, sensorWidth: 200, notched: false });
  assert.equal(islandGeometry({ ...display, workArea: { y: 338 } }, 999).notched, true);
  assert.equal(islandGeometry(display, 999).sensorWidth, 320);
});
test("the latest conversation ignores pinning, detached routines and archived threads", () => {
  assert.equal(latestThread({ threadId: "selected", tasks: [{ threadId: "pinned", pinned: true, createdAt: 1 }, { threadId: "new", createdAt: 10 }, { threadId: "routine", routineRunId: "r", createdAt: 20 }] }), "new");
  assert.equal(latestThread({ threadId: "selected" }), "selected");
});
test("the current window is the source of truth for local, cloud, saved server and remote-only", () => {
  const base = { localOrigin: "http://127.0.0.1:8799", activeId: "local", localKey: "/fixture/a" };
  const local = islandSource({ ...base, url: base.localOrigin });
  assert.equal(local.local, true);
  assert.notEqual(local.key, islandSource({ ...base, url: base.localOrigin, revision: 1 }).key);
  assert.notEqual(local.key, islandSource({ ...base, localKey: "/fixture/b", url: base.localOrigin }).key);
  for (const remoteOrigin of ["https://cloud.example", "https://saved.example", "https://remote-only.example"]) {
    const remote = islandSource({ ...base, activeId: remoteOrigin, remoteOrigin, url: `${remoteOrigin}/?bot=a` });
    assert.equal(remote.origin, remoteOrigin);
    assert.equal(remote.local, false);
  }
  assert.equal(islandSource({ ...base, url: "https://login.example" }), null);
  assert.equal(islandSource({ ...base, url: base.localOrigin, ready: false }), null);
});

test("transparent space and rounded bottom corners pass the pointer through", async () => {
  const { islandHitTest, islandShape } = await import("./island-model.mjs");
  const geometry = islandGeometry({ bounds: { x: 0, y: 0, width: 1000 }, workArea: { y: 38 } });
  assert.equal(islandHitTest({ x: 500, y: 10 }, geometry, "hidden"), true);
  assert.equal(islandHitTest({ x: 350, y: 10 }, geometry, "hidden"), false);
  assert.equal(islandHitTest({ x: 271, y: 367 }, geometry, "list"), false);
  assert.equal(islandHitTest({ x: 500, y: 367 }, geometry, "list"), true);
  assert.notEqual(islandShape("summary", geometry).width, islandShape("summary", { ...geometry, sensorWidth: 240 }).width);
});

test("offline totals ignore cached working and waiting activity", () => {
  assert.deepEqual(islandCounts([{ busy: true }, { activity: "waiting-on-you" }], false), { total: 2, working: 0, waiting: 0 });
});
test("recent conversations use thread order then creation, never background updates", () => {
  assert.equal(latestThread({ tasks: [{ threadId: "background", updatedAt: 999, createdAt: 1 }, { threadId: "recent", createdAt: 20 }, { threadId: "old-order", lastThreadOrderAt: 10, createdAt: 100 }] }), "recent");
  assert.equal(latestThread({ tasks: [{ threadId: "a", lastThreadOrderAt: 30 }, { threadId: "b", createdAt: 20 }] }), "a");
});
