import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { loadDesktopWindow } from "./remote-only.mjs";

test("a navigation retires the launch recovery, except the recovery's own", async () => {
  const source = readFileSync(new URL("./main.mjs", import.meta.url), "utf8");
  const start = source.indexOf("function navigateMainWindow(");
  assert.ok(start > 0);
  const close = /\r?\n\}\r?\n/.exec(source.slice(start)); // a Windows checkout ends lines with \r\n
  const end = start + close.index + close[0].length;
  const calls = [];
  const context = vm.createContext({
    loadDesktopWindow, desktopBuild: { remoteOnly: false },
    homeWindow: { cancel: () => calls.push("cancel") },
    mainWindow: { isDestroyed: () => false, loadURL: async (url) => { calls.push(`load:${url}`); } },
  });
  vm.runInContext(`${source.slice(start, end)}; this.navigateMainWindow = navigateMainWindow;`, context);
  await context.navigateMainWindow("https://studio.example.test/");
  assert.deepEqual(calls, ["cancel", "load:https://studio.example.test/"], "a place opened on purpose takes the window back");
  calls.length = 0;
  await context.navigateMainWindow("https://garage.example.test/", true);
  assert.deepEqual(calls, ["load:https://garage.example.test/"], "the recovery's own way back is not a choice");
});

for (const remoteOnly of [false, true]) test(`login popups and the return to the server stay inside (remoteOnly=${remoteOnly})`, async t => {
  const { defaultServerEnvironment, loginNavigationAllowed } = await import("./desktop-build-config.mjs");
  const { default: environments } = await import("./environments.cjs");
  const { externalLinkUrl } = await import("./app-permissions.mjs");
  const { attachLoginNavigation } = await import("./login-navigation.mjs");
  const source = readFileSync(new URL("./main.mjs", import.meta.url), "utf8");
  const start = source.indexOf("  attachLoginNavigation({");
  const end = source.indexOf('  // No page may embed', start);
  assert.ok(start > 0 && end > start);
  const handlers = new Map(), loaded = [], external = [], notices = [], logs = [];
  let popup, loginOptions, now = 1_000;
  t.mock.method(Date, "now", () => now);
  const loginHandlers = new Map();
  let loginClosed = false;
  function LoginWindow(options) {
    loginOptions = options;
    this.loadURL = async url => { loaded.push(`login:${url}`); };
    this.show = () => {};
    this.close = () => { loginClosed = true; };
    this.isDestroyed = () => false;
    this.on = () => {};
    this.webContents = {
      on: (event, handler) => loginHandlers.set(event, handler),
      setWindowOpenHandler: () => {},
      getURL: () => "https://example.com/chat?logged-in=1",
    };
  }
  const desktopBuild = { remoteOnly, defaultServerUrl: "https://example.com", loginHosts: ["login.example.com"] };
  const saved = { activeId: "local", environments: [] };
  const environmentsState = defaultServerEnvironment(saved, desktopBuild, remoteOnly, () => "gateway");
  const context = vm.createContext({
    loginNavigationAllowed, attachLoginNavigation, externalLinkUrl, loadDesktopWindow,
    activeRemote: environments.activeRemote, environmentsState, desktopBuild,
    rendererOrigin: () => "http://localhost:3000", workspaceNavigationAllowed: url => { try { return ["example.com", "localhost"].includes(new URL(url).hostname); } catch { return false; } },
    slog: line => logs.push(line), URL, Date: { now: () => now },
    shell: { openExternal: async url => { external.push(url); } },
    BrowserWindow: LoginWindow,
    dialog: { showMessageBox: async (_window, options) => { notices.push(options); } },
    win: {
      on: () => {},
      isDestroyed: () => false,
      loadURL: async url => { loaded.push(url); },
      webContents: { setWindowOpenHandler: handler => { popup = handler; }, on: (event, handler) => handlers.set(event, handler) },
    },
  });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(popup({ url: "https://example.com/help" }).action, "deny");
  assert.deepEqual(external, ["https://example.com/help"]);
  popup({ url: "https://login.example.com/oauth" });
  assert.deepEqual(loaded, ["login:https://login.example.com/oauth"]);
  assert.equal(loginOptions.webPreferences.preload, undefined);
  assert.ok(loginOptions.minWidth >= 800 && loginOptions.minHeight >= 640);
  let blocked = 0;
  const event = { preventDefault: () => blocked++ };
  handlers.get("will-navigate")(event, "https://outside.example.com/during-login");
  assert.equal(external.length, 1);
  assert.match(notices[0].message, /outside\.example\.com/);
  assert.deepEqual(logs, ["outside.example.com"]);
  loginHandlers.get("will-redirect")(event, "https://login.example.com/oauth");
  loginHandlers.get("will-redirect")(event, "https://example.com/chat?logged-in=1");
  assert.equal(blocked, 1);
  assert.equal(loginClosed, false);
  loginHandlers.get("did-frame-finish-load")({}, false);
  assert.equal(loginClosed, false);
  loginHandlers.get("did-frame-finish-load")({}, true);
  assert.equal(loginClosed, true);
  const outside = "https://outside.example.com/path";
  handlers.get("will-navigate")(event, outside);
  handlers.get("will-redirect")(event, outside);
  popup({ url: outside });
  now += 1_999;
  handlers.get("will-navigate")(event, outside);
  assert.equal(external.filter(url => url === outside).length, 1);
  handlers.get("will-navigate")(event, "https://outside.example.com/another");
  assert.ok(external.includes("https://outside.example.com/another"));
  now++;
  handlers.get("will-redirect")(event, outside);
  assert.equal(external.filter(url => url === outside).length, 2);
  assert.equal(blocked, 6);
  for (const url of ["javascript:alert(1)", "file:///tmp/example", "https://login.example.com.evil.example.com/"]) popup({ url });
  assert.deepEqual(loaded, ["login:https://login.example.com/oauth", "https://example.com/chat?logged-in=1"]);
  assert.ok(!external.some(url => url.startsWith("javascript:") || url.startsWith("file:")));
});
