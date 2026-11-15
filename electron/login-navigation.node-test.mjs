import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { attachLoginNavigation, loginNavigationKind, navigationHostname } from "./login-navigation.mjs";

const classify = (url, loginInProgress) => loginNavigationKind({
  url,
  loginAllowed: value => value.includes("login.example.test"),
  workspaceAllowed: value => value.includes("server.example.test"),
  loginInProgress,
});

test("keeps an active login inside the app when a redirect is outside the allowlist", () => {
  assert.equal(classify("https://login.example.test/scan", false), "login");
  assert.equal(classify("https://outside.example.test/", true), "blocked-login");
  assert.equal(classify("https://server.example.test/callback", true), "server");
  assert.equal(classify("https://outside.example.test/", false), "external");
  assert.equal(classify("https://user:pass@server.example.test/callback", true), "blocked-login");
  assert.equal(classify("https://user:pass@server.example.test/callback", false), "external");
  assert.equal(classify("ftp://server.example.test/callback", true), "blocked-login");
  assert.equal(navigationHostname("https://user:pass@outside.example.test/path"), "outside.example.test");
  assert.equal(navigationHostname("file:///tmp/example"), null);
});

function fixture() {
  const windows = [], loaded = [], external = [], notices = [], logs = [];
  class Window extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.destroyed = false;
      this.url = "https://server.example.test/";
      this.webContents = new EventEmitter();
      this.webContents.getURL = () => this.url;
      this.webContents.setWindowOpenHandler = handler => { this.popup = handler; };
      windows.push(this);
    }
    async loadURL(url) { this.url = url; loaded.push(url); }
    show() {}
    close() { this.destroyed = true; this.emit("closed"); }
    isDestroyed() { return this.destroyed; }
  }
  const main = new Window();
  attachLoginNavigation({
    win: main, BrowserWindow: Window, desktopBuild: {},
    loadDesktopWindow: (win, url) => win.loadURL(url),
    shell: { openExternal: async url => { external.push(url); } },
    dialog: { showMessageBox: async (_win, notice) => { notices.push(notice); } },
    slog: line => { logs.push(line); },
    loginAllowed: url => new URL(url).hostname === "login.example.test",
    workspaceAllowed: url => new URL(url).origin === "https://server.example.test",
  });
  main.popup({ url: "https://login.example.test/start" });
  return { main, login: windows[1], windows, loaded, external, notices, logs };
}

test("rejects credentialed server URLs in main, login, and popup navigation", () => {
  const { main, login, loaded, external, notices, logs } = fixture();
  const credentialed = "https://user:pass@server.example.test/callback";
  const event = { preventDefault() {} };
  main.webContents.emit("will-navigate", event, credentialed, false, true);
  login.webContents.emit("will-redirect", event, credentialed, false, true);
  assert.equal(login.popup({ url: credentialed }).action, "deny");
  assert.deepEqual(loaded, ["https://login.example.test/start"]);
  assert.deepEqual(external, []);
  assert.deepEqual(logs, ["server.example.test", "server.example.test", "server.example.test"]);
  assert.equal(notices.length, 3);
  assert.ok(logs.every(line => !line.includes("user") && !line.includes("pass")));
});

for (const eventName of ["will-navigate", "will-redirect"]) {
  test(`${eventName} ignores subframes in both main and login windows`, () => {
    const { main, login, loaded, external, notices } = fixture();
    for (const win of [main, login]) {
      for (const target of ["https://server.example.test/callback", "https://outside.example.test/frame"]) {
        win.webContents.emit(eventName, { preventDefault: () => assert.fail("subframe canceled") }, target, false, false);
      }
    }
    login.webContents.emit("did-frame-finish-load", {}, false);
    assert.equal(login.isDestroyed(), false);
    assert.deepEqual(loaded, ["https://login.example.test/start"]);
    assert.deepEqual(external, []);
    assert.deepEqual(notices, []);
    login.webContents.emit(eventName, { preventDefault() {} }, "https://outside.example.test/top", false, true);
    assert.equal(notices.length, 1);
  });
}

test("server navigation is preserved until the main frame finishes loading", () => {
  const { main, login, loaded, external } = fixture();
  const callback = "https://server.example.test/callback";
  for (const win of [main, login]) {
    win.webContents.emit("will-redirect", { preventDefault: () => assert.fail("callback canceled") }, callback, false, true);
  }
  login.url = callback;
  login.webContents.emit("did-frame-finish-load", {}, false);
  assert.equal(login.isDestroyed(), false);
  assert.deepEqual(loaded, ["https://login.example.test/start"]);
  login.webContents.emit("did-frame-finish-load", {}, true);
  assert.equal(login.isDestroyed(), true);
  assert.deepEqual(loaded, ["https://login.example.test/start", callback]);
  assert.deepEqual(external, []);
});

test("closing the main window closes every managed login window", () => {
  const { main, login, windows } = fixture();
  const options = login.popup({ url: "https://login.example.test/child" });
  assert.equal(options.action, "allow");
  const child = new login.constructor(options.overrideBrowserWindowOptions);
  login.webContents.emit("did-create-window", child);
  assert.ok(child.webContents.listenerCount("will-redirect") > 0);
  assert.ok(child.webContents.listenerCount("did-frame-finish-load") > 0);
  main.close();
  assert.ok(windows.every(win => win.isDestroyed()));
});
