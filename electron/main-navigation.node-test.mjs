import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("a navigation retires the launch recovery, except the recovery's own", async () => {
  const source = readFileSync(new URL("./main.mjs", import.meta.url), "utf8");
  const start = source.indexOf("function navigateMainWindow(");
  assert.ok(start > 0);
  const close = /\r?\n\}\r?\n/.exec(source.slice(start)); // a Windows checkout ends lines with \r\n
  const end = start + close.index + close[0].length;
  const calls = [];
  const context = vm.createContext({
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

test("popups keep only login hosts inside, while top-level navigation keeps the server too", async () => {
  const { loginNavigationAllowed } = await import("./desktop-build-config.mjs");
  const { externalLinkUrl } = await import("./app-permissions.mjs");
  const source = readFileSync(new URL("./main.mjs", import.meta.url), "utf8");
  const start = source.indexOf("  const loginAllowed =");
  const end = source.indexOf('  // No page may embed', start);
  assert.ok(start > 0 && end > start);
  const handlers = new Map(), loaded = [], external = [];
  let popup, now = 1_000;
  const context = vm.createContext({
    loginNavigationAllowed, externalLinkUrl,
    activeRemote: () => ({ origin: "https://example.com" }),
    environmentsState: {}, desktopBuild: { loginHosts: ["login.example.com"] },
    rendererOrigin: () => "http://localhost:3000", workspaceNavigationAllowed: () => false,
    slog: () => {}, URL, Date: { now: () => now },
    shell: { openExternal: async url => { external.push(url); } },
    win: {
      loadURL: async url => { loaded.push(url); },
      webContents: { setWindowOpenHandler: handler => { popup = handler; }, on: (event, handler) => handlers.set(event, handler) },
    },
  });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(popup({ url: "https://example.com/help" }).action, "deny");
  assert.deepEqual(external, ["https://example.com/help"]);
  popup({ url: "https://login.example.com/oauth" });
  assert.deepEqual(loaded, ["https://login.example.com/oauth"]);
  let blocked = 0;
  const event = { preventDefault: () => blocked++ };
  handlers.get("will-navigate")(event, "https://example.com/chat");
  handlers.get("will-redirect")(event, "https://login.example.com/oauth");
  assert.equal(blocked, 0);
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
  assert.equal(blocked, 5);
  for (const url of ["javascript:alert(1)", "file:///tmp/example", "https://login.example.com.evil.example.com/"]) popup({ url });
  assert.deepEqual(loaded, ["https://login.example.com/oauth"]);
  assert.ok(!external.some(url => url.startsWith("javascript:") || url.startsWith("file:")));
});
