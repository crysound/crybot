import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as islandModule from "./island.mjs";
import { createIsland, isIslandWindow } from "./island.mjs";

function fixture(t, platform = "darwin", overrides = {}) {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  let creates = 0, sourceReads = 0;
  let window, cursor = { x: 0, y: 500 }, settings = { enabled: true, fullscreen: true, width: 200 };
  const handlers = new Map();
  class Window extends EventEmitter {
    constructor(options) { super(); creates++; window = this; this.sends = 0; this.focusCalls = []; this.options = options; this.webContents = Object.assign(new EventEmitter(), { mainFrame: {}, send: (_name, value) => { this.value = value; this.sends++; }, setWindowOpenHandler() {} }); }
    isDestroyed() { return false; }
    setBounds(value) { this.bounds = value; }
    setAlwaysOnTop(...value) { this.top = value; }
    setIgnoreMouseEvents(value) { this.ignoring = value; }
    setVisibleOnAllWorkspaces(...value) { this.spaces = value; }
    setFocusable(value) { this.focusable = value; }
    focus() { this.focusCalls.push("focus"); this.focused = true; }
    blur() { this.focused = false; this.emit("blur"); }
    showInactive() { this.focusCalls.push("showInactive"); this.visible = true; }
    hide() { this.visible = false; }
    isVisible() { return this.visible; }
    async loadURL() { this.webContents.emit("did-finish-load"); }
    destroy() { this.emit("closed"); }
  }
  const screen = Object.assign(new EventEmitter(), { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1000 }, workArea: { y: 38 } }), getCursorScreenPoint: () => cursor });
  const island = createIsland({ platform, BrowserWindow: Window, screen, ipcMain: { handle: (name, handler) => handlers.set(name, handler), removeHandler: name => handlers.delete(name) }, prefs: { island: () => settings }, source: () => { sourceReads++; return null; }, request: () => { throw new Error("no live requests"); }, page: "crybot-island://app/island.html", language: () => "en", openChat() {}, ...overrides });
  t.after(() => island.close());
  return { island, open: revision => handlers.get("island:open")({ sender: window.webContents, senderFrame: window.webContents.mainFrame }, revision), creates: () => creates, sourceReads: () => sourceReads, window: () => window, cursor: next => { cursor = next; }, settings: next => { settings = { ...settings, ...next }; island.refresh(); }, action: value => handlers.get("island:action")({ sender: window.webContents, senderFrame: window.webContents.mainFrame }, value), handlers };
}
test("only macOS creates an isolated nonfocusable panel", t => {
  const f = fixture(t, "linux"); assert.equal(f.window(), undefined); assert.equal(f.handlers.size, 0);
});
test("hidden is transparent, hovering expands without focus, list dismisses after one second or blur", async t => {
  const f = fixture(t), win = f.window();
  assert.equal(isIslandWindow(win), true); assert.equal(win.excludedFromShownWindowsMenu, true); assert.equal(win.options.type, "panel"); assert.equal(win.options.focusable, false); assert.equal(win.ignoring, true);
  assert.deepEqual(win.top, [true, "screen-saver"]);
  f.cursor({ x: 500, y: 10 }); t.mock.timers.tick(100); assert.equal(win.value.state.mode, "summary"); assert.equal(win.focused, undefined);
  await f.action({ type: "expand" }); assert.equal(win.value.state.mode, "list"); assert.equal(win.focused, true);
  f.cursor({ x: 0, y: 500 }); t.mock.timers.tick(100); t.mock.timers.tick(999); assert.equal(win.value.state.mode, "list"); t.mock.timers.tick(1); assert.equal(win.value.state.mode, "hidden"); assert.equal(win.ignoring, true);
  f.cursor({ x: 500, y: 10 }); t.mock.timers.tick(100); await f.action({ type: "expand" }); win.emit("blur"); assert.equal(win.value.state.mode, "hidden");
  f.settings({ fullscreen: false }); assert.deepEqual(win.spaces, [true, { visibleOnFullScreen: false }]);
  f.settings({ enabled: false }); assert.equal(win.visible, false);
  assert.throws(() => f.handlers.get("island:send")({ sender: {}, senderFrame: {} }, 1, "hello"), /not-island/);
});

test("panel accepts the first click and cannot be minimized, maximized or fullscreened", t => {
  const { options } = fixture(t).window();
  assert.equal(options.acceptFirstMouse, true);
  assert.equal(options.backgroundColor, "#00000000");
  for (const key of ["minimizable", "maximizable", "fullscreenable"]) assert.equal(options[key], false);
});
test("expanded island becomes key without showing the app, then releases keyboard focus", async t => {
  const f = fixture(t), win = f.window();
  f.cursor({ x: 500, y: 10 }); t.mock.timers.tick(100);
  await f.action({ type: "expand" });
  assert.deepEqual(win.focusCalls.slice(-2), ["showInactive", "focus"]);
  await f.action({ type: "escape" });
  assert.equal(win.focused, false); assert.equal(win.focusable, false);
  t.mock.timers.tick(100);
  assert.equal(win.focusable, false);
});
test("disabled island stops publishing until enabled again", t => {
  const f = fixture(t), win = f.window();
  f.settings({ enabled: false }); const sends = win.sends;
  t.mock.timers.tick(2000); assert.equal(win.sends, sends);
  f.settings({ enabled: true }); f.cursor({ x: 500, y: 10 }); t.mock.timers.tick(100);
  assert.equal(win.value.state.mode, "summary"); assert.equal(win.visible, true);
});
test("close is final even when preferences and display metrics change", t => {
  const f = fixture(t); f.island.close(); const reads = f.sourceReads();
  f.island.refresh(); f.settings({ enabled: true }); t.mock.timers.tick(2000);
  assert.equal(f.creates(), 1); assert.equal(f.sourceReads(), reads); assert.equal(f.handlers.size, 0);
});
test("opening a chat sends to the current remote page without navigating", () => {
  for (const origin of ["https://team.example", "https://saved.example", "https://cloud.example", "http://localhost:8799"]) {
    const calls = [], contents = { getURL: () => `${origin}/?bot=other`, isLoadingMainFrame: () => false, send: (...args) => calls.push(args) };
    const win = { isDestroyed: () => false, webContents: contents };
    assert.equal(islandModule.openIslandChat({ window: () => win, reveal: () => calls.push("reveal") }, { botId: "atlas", threadId: "latest" }, { origin }), true);
    assert.deepEqual(calls, ["reveal", ["desktop-notifications:open", { botId: "atlas", threadId: "latest" }]]);
  }
});
test("a different origin or loading page is only revealed, never sent a thread", () => {
  for (const loading of [false, true]) {
    const calls = [], win = { isDestroyed: () => false, webContents: { getURL: () => "https://other.example/", isLoadingMainFrame: () => loading, send: (...args) => calls.push(args) } };
    for (const origin of loading ? ["https://other.example", "https://island.example"] : ["https://island.example"]) {
      calls.length = 0;
      assert.equal(islandModule.openIslandChat({ window: () => win, reveal: () => calls.push("reveal") }, { botId: "atlas", threadId: "latest" }, { origin }), false);
      assert.deepEqual(calls, ["reveal"]);
    }
  }
});

for (const changed of [false, true]) test(`open IPC preserves the selected place and ${changed ? "shows a mismatch hint" : "delivers the current chat"}`, async t => {
  const original = "https://team.example";
  let origin = original;
  const deliveries = [], win = { isDestroyed: () => false, webContents: { getURL: () => origin, isLoadingMainFrame: () => false, send: (...args) => deliveries.push(args) } };
  let reveals = 0;
  const f = fixture(t, "darwin", {
    source: () => ({ key: origin, origin, local: false }),
    request: async (_place, route, init) => {
      if (route.includes("events")) return new Response(new ReadableStream({ start(controller) { init.signal.addEventListener("abort", () => controller.close()); } }));
      if (route.startsWith("/api/bots")) return Response.json({ bots: [{ id: "atlas", threadId: "latest" }] });
      return Response.json({ messages: [] });
    },
    openChat: (chat, place) => islandModule.openIslandChat({ window: () => win, reveal: () => { reveals++; f.window().emit("blur"); } }, chat, place),
  });
  await new Promise(resolve => setImmediate(resolve));
  f.cursor({ x: 500, y: 10 }); t.mock.timers.tick(100); await f.action({ type: "expand" }); await f.action({ type: "select", botId: "atlas" });
  const revision = f.window().value.snapshot.revision;
  if (changed) origin = "https://other.example";
  await f.open(revision);
  assert.equal(reveals, 1); assert.equal(origin, changed ? "https://other.example" : original);
  if (changed) {
    assert.deepEqual(deliveries, []);
    f.cursor({ x: 0, y: 500 }); t.mock.timers.tick(100);
    assert.equal(f.window().value.state.mode, "summary"); assert.equal(f.window().value.state.notice, "place-changed");
    assert.equal(f.window().focusable, false);
    t.mock.timers.tick(3000); assert.equal(f.window().value.state.mode, "hidden");
  } else {
    assert.deepEqual(deliveries, [["desktop-notifications:open", { botId: "atlas", threadId: "latest" }]]);
    assert.equal(f.window().value.state.mode, "hidden");
  }
});
