import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

const source = await readFile(new URL("./island-screenshots.mjs", import.meta.url), "utf8");
const flush = () => new Promise(resolve => setImmediate(resolve));

async function fixture({ load = true, execute = true } = {}) {
  const logs = [], exits = [], timers = new Map(), windows = [];
  const ready = Promise.withResolvers();
  let now = 0, nextTimer = 0, evaluated = false, captureCalls = 0;
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.visible = false;
      this.webContents = Object.assign(new EventEmitter(), {
        getURL: () => "crybot-island://app/island.html",
        invalidate() {},
        executeJavaScript: code => {
          if (!execute) return new Promise(() => {});
          if (code.includes("getBoundingClientRect")) return Promise.resolve({ mode: "hidden", height: 0, opacity: "0" });
          return Promise.resolve(true);
        },
        capturePage: () => { captureCalls++; return new Promise(() => {}); },
      });
      windows.push(this);
    }
    showInactive() { this.visible = true; }
    isVisible() { return this.visible; }
    getBounds() { return { x: 0, y: 0, width: 520, height: 620 }; }
    static getAllWindows() { return windows; }
  }
  const modules = {
    electron: {
      app: Object.assign(new EventEmitter(), { whenReady: () => ready.promise, setPath() {}, exit: code => exits.push(code) }),
      BrowserWindow, ipcMain: {}, net: {}, protocol: { registerSchemesAsPrivileged() {} },
      screen: { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }) },
      session: { fromPartition: () => ({}) },
    },
    "node:fs": { mkdtempSync: () => "/tmp/crybot-mocked-fixture" },
    "node:fs/promises": { mkdir: async () => {}, writeFile: async () => {}, rm: async () => {} },
    "node:os": { tmpdir: () => "/tmp" },
    "node:path": { default: path },
    "node:assert/strict": { default: assert },
    "../../electron/island.mjs": {
      isIslandWindow: win => windows.includes(win),
      createIsland: options => {
        const win = new options.BrowserWindow({ webPreferences: { sandbox: true } });
        queueMicrotask(() => {
          win.webContents.emit("did-start-loading");
          if (load) win.webContents.emit("did-finish-load");
        });
        return { close() {} };
      },
    },
    "../../electron/island-page.mjs": {
      ISLAND_SCHEME: "crybot-island", ISLAND_PAGE: "crybot-island://app/island.html", installIslandPage: () => ({}),
    },
  };
  const context = createContext({
    console: { log: line => logs.push(line), error: (...args) => logs.push(args.join(" ")) },
    process: { versions: { electron: "43-fixture" }, platform: "darwin" },
    Date: { now: () => now }, Response, ReadableStream, TextEncoder,
    setTimeout: (run, delay) => { const id = ++nextTimer; timers.set(id, { run, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const entry = new SourceTextModule(source, { context });
  await entry.link(specifier => {
    const exports = modules[specifier];
    assert.ok(exports, `Unexpected import: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  const evaluation = entry.evaluate().then(() => { evaluated = true; });
  await flush();
  return {
    logs, exits, windows, ready, evaluation,
    get evaluated() { return evaluated; },
    get captureCalls() { return captureCalls; },
    async start() { ready.resolve(); await flush(); },
    async advance(ms) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at <= now && timers.has(id)) { timers.delete(id); timer.run(); }
      }
      await flush();
    },
  };
}

test("ESM entry completes before Electron releases the ready barrier", async t => {
  const f = await fixture();
  assert.equal(f.evaluated, true, "top-level await blocks Electron's ready event");
  assert.equal(f.windows.length, 0);
  assert.match(f.logs.join("\n"), /BEGIN app.whenReady/);
  await f.start();
  assert.equal(f.windows.length, 1);
  assert.match(f.logs.join("\n"), /DONE app.whenReady/);
  assert.match(f.logs.join("\n"), /EVENT did-finish-load/);
  t.diagnostic(f.logs.join("\n"));
});

test("whenReady timeout exits nonzero and names the blocked step", async () => {
  const f = await fixture();
  await f.advance(20000);
  assert.deepEqual(f.exits, [1]);
  assert.match(f.logs.join("\n"), /Timed out after 20000ms: app.whenReady/);
});

test("global watchdog exits with the active step", async () => {
  const f = await fixture();
  await f.advance(240000);
  assert.equal(f.exits[0], 1);
  assert.match(f.logs.join("\n"), /FATAL at app.whenReady: Error: Global timeout after 240000ms/);
});

test("missing did-finish-load times out before executing page JavaScript", async () => {
  const f = await fixture({ load: false });
  await f.start();
  await f.advance(20000);
  assert.deepEqual(f.exits, [1]);
  assert.match(f.logs.join("\n"), /Timed out after 20000ms: page did-finish-load/);
  assert.doesNotMatch(f.logs.join("\n"), /BEGIN executeJavaScript/);
});

test("a hung executeJavaScript cannot bypass the polling deadline", async () => {
  const f = await fixture({ execute: false });
  await f.start();
  await f.advance(20000);
  assert.deepEqual(f.exits, [1]);
  assert.match(f.logs.join("\n"), /Timed out after 20000ms: executeJavaScript mode hidden/);
  assert.equal(f.captureCalls, 0);
});

test("hidden capture paints a visible window and has its own deadline", async () => {
  const f = await fixture();
  await f.start();
  await f.advance(500);
  assert.equal(f.windows[0].visible, true);
  assert.equal(f.windows[0].options.paintWhenInitiallyHidden, true);
  assert.equal(f.windows[0].options.webPreferences.backgroundThrottling, false);
  assert.equal(f.windows[0].options.webPreferences.sandbox, true);
  assert.equal(f.captureCalls, 1);
  assert.match(f.logs.join("\n"), /STATE hidden .*"height":0,"opacity":"0","visible":true/);
  await f.advance(20000);
  assert.deepEqual(f.exits, [1]);
  assert.match(f.logs.join("\n"), /Timed out after 20000ms: capturePage hidden/);
});

for (const [target, event, args, diagnostic] of [
  ["webContents", "did-fail-load", [{}, -6, "ERR_FILE_NOT_FOUND", "crybot-island://app/island.html", true], /did-fail-load code=-6.*ERR_FILE_NOT_FOUND/],
  ["webContents", "render-process-gone", [{}, { reason: "crashed", exitCode: 1 }], /render-process-gone.*crashed/],
  ["window", "unresponsive", [], /unresponsive island window/],
]) {
  test(`${event} logs and exits nonzero without throwing from the listener`, async () => {
    const f = await fixture();
    await f.start();
    const emitter = target === "window" ? f.windows[0] : f.windows[0].webContents;
    assert.doesNotThrow(() => emitter.emit(event, ...args));
    assert.deepEqual(f.exits, [1]);
    assert.match(f.logs.join("\n"), diagnostic);
  });
}
