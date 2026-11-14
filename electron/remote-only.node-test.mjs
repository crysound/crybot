import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import vm from "node:vm";
import { defaultServerEnvironment } from "./desktop-build-config.mjs";
import { loadDesktopWindow, remoteOnlyLoadFailed } from "./remote-only.mjs";
import { createEnvironmentsFile } from "./environments-file.mjs";
import environments from "./environments.cjs";
import nativeText from "./native-text.cjs";

const source = readFileSync(new URL("./main.mjs", import.meta.url), "utf8");
const config = { remoteOnly: true, defaultServerUrl: "https://gateway.example", loginHosts: ["login.example"] };
const text = nativeText.createNativeText({ system: () => "zh-CN" });
function mainFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = /\r?\n\}\r?\n/.exec(source.slice(start));
  assert.ok(end);
  return source.slice(start, start + end.index + end[0].length);
}

for (const remoteOnly of [false, true]) test(`main-window loads enforce the build setting (${remoteOnly})`, async () => {
  const loaded = [];
  const win = { loadURL: async url => { loaded.push(url); } };
  for (const url of ["http://localhost:8799", "https://other.example", "https://gateway.example/chat", "https://login.example/oauth", "http://gateway.example", "file:///tmp/local.html", "data:text/html,local"]) {
    await loadDesktopWindow(win, url, { ...config, remoteOnly });
  }
  assert.deepEqual(loaded, remoteOnly ? [config.defaultServerUrl, config.defaultServerUrl, "https://gateway.example/chat", "https://login.example/oauth", config.defaultServerUrl, config.defaultServerUrl, config.defaultServerUrl]
    : ["http://localhost:8799", "https://other.example", "https://gateway.example/chat", "https://login.example/oauth", "http://gateway.example", "file:///tmp/local.html", "data:text/html,local"]);
});

test("persisting a fallback keeps the deployment server active on disk and in memory", t => {
  const dir = mkdtempSync(path.join(tmpdir(), "cry-remote-only-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const store = createEnvironmentsFile({ file: () => path.join(dir, "environments.json"), fs, path });
  const context = vm.createContext({ desktopBuild: config, defaultServerEnvironment, randomUUID: () => "gateway", environmentsStore: store,
    environmentsState: {}, refreshApplicationMenu() {}, mainWindow: null, railChanged() {} });
  vm.runInContext(mainFunction("persistEnvironments"), context);
  context.persistEnvironments({ environments: [], activeId: "local" });
  assert.equal(store.read().activeId, "gateway");
  assert.equal(environments.activeRemote(store.read()).origin, config.defaultServerUrl);
  context.persistEnvironments(environments.withActive(store.read(), "local"));
  assert.equal(store.read().activeId, "gateway");
  assert.equal(context.environmentsState.activeId, "gateway");
  assert.equal(store.read().environments.length, 1);
});

for (const failedUrl of ["https://gateway.example/chat", "https://login.example/oauth"]) test(`failed ${failedUrl} shows retry without switching or persisting local mode`, async () => {
  const handlers = new Map(), loaded = [];
  const state = defaultServerEnvironment({ environments: [], activeId: "local" }, config, true, () => "gateway");
  const win = { loadURL: async url => { loaded.push(url); }, webContents: { on: (event, handler) => handlers.set(event, handler) } };
  let fallback = 0;
  const context = vm.createContext({ win, desktopBuild: config, remoteOnlyLoadFailed, nativeText: text, environmentsState: state,
    activeRemote: environments.activeRemote, URL, homeWindow: { failed: () => false }, slog() {},
    dialog: { showMessageBox: () => { fallback++; } }, nativeT: text.t, cloudUnreachableText: () => null,
    cloudAccount: null, workspaceMenuAction: action => action(), switchEnvironment: () => { fallback++; }, LOCAL_ID: "local" });
  const start = source.indexOf('  win.webContents.on("did-fail-load",');
  const end = source.indexOf('  win.webContents.on("did-navigate",', start);
  assert.ok(start > 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  const failed = handlers.get("did-fail-load");
  failed({}, -3, "aborted", failedUrl, true);
  failed({}, -105, "offline", failedUrl, false);
  assert.equal(loaded.length, 0);
  failed({}, -105, "offline", failedUrl, true);
  const html = decodeURIComponent(loaded[0].split(",").slice(1).join(","));
  assert.ok(html.includes("连不上服务器"));
  assert.ok(html.includes("重试"));
  assert.ok(!html.includes("localhost"));
  assert.equal(fallback, 0);
  assert.equal(state.activeId, "gateway");
  const retry = /href="([^"]+)"/.exec(html)[1];
  await loadDesktopWindow(win, retry, config);
  assert.equal(loaded[1], config.defaultServerUrl);
  context.desktopBuild = { ...config, remoteOnly: false };
  failed({}, -105, "offline", config.defaultServerUrl, true);
  assert.equal(fallback, 2);
});

test("remote-only switching refuses local and other saved servers before changing anything", async () => {
  const calls = { switch: 0, persist: 0, navigate: 0, remember: 0, cancel: 0 };
  const context = vm.createContext({ desktopBuild: config, LOCAL_ID: "local",
    environmentsState: { activeId: "gateway", environments: [{ id: "other", origin: "https://other.example" }] },
    cleanWorkspace: { profile: () => null, active: () => false },
    runningDataDir: "/tmp/cry-other", desktopDataDir: () => "/tmp/cry-default",
    homeWindow: { cloudOrigin: () => null, cancel: () => calls.cancel++ },
    homePlaces: { remember: () => calls.remember++ }, cloudAccount: null, handSaved: () => false,
    switchLocalEnvironmentTo: async () => { calls.switch++; },
    persistEnvironments: () => calls.persist++, withActive: environments.withActive,
    navigateMainWindow: async () => { calls.navigate++; }, activeOrigin: () => "https://other.example" });
  vm.runInContext(`async ${mainFunction("switchEnvironment")}`, context);
  await context.switchEnvironment("local");
  await context.switchEnvironment("other");
  assert.deepEqual(calls, { switch: 0, persist: 0, navigate: 0, remember: 0, cancel: 0 });
  assert.equal(context.environmentsState.activeId, "gateway");
  context.desktopBuild = { ...config, remoteOnly: false };
  await context.switchEnvironment("local");
  await context.switchEnvironment("other");
  assert.deepEqual(calls, { switch: 1, persist: 1, navigate: 1, remember: 2, cancel: 2 });
});

for (const ignoreCache of [false, true]) test(`Reload preserves server routes and recovers other pages (ignoreCache=${ignoreCache})`, () => {
  const calls = [];
  let currentUrl;
  const context = vm.createContext({ desktopBuild: config, URL,
    mainWindow: { isDestroyed: () => false, webContents: { getURL: () => currentUrl,
      reload: () => calls.push("reload"), reloadIgnoringCache: () => calls.push("forceReload") } },
    navigateMainWindow: url => calls.push(url) });
  vm.runInContext(mainFunction("reloadServerPage"), context);
  for (currentUrl of ["https://gateway.example/chat/thread?view=details#latest", "https://gateway.example:443/settings"]) {
    context.reloadServerPage(ignoreCache);
  }
  for (currentUrl of ["data:text/html,error", "https://login.example/oauth", "https://other.example/chat", "http://gateway.example/chat", "https://gateway.example:444/chat", ""]) {
    context.reloadServerPage(ignoreCache);
  }
  assert.deepEqual(calls, [ignoreCache ? "forceReload" : "reload", ignoreCache ? "forceReload" : "reload", ...Array(6).fill(config.defaultServerUrl)]);
  context.mainWindow = null;
  context.reloadServerPage(ignoreCache);
  context.mainWindow = { isDestroyed: () => true };
  context.reloadServerPage(ignoreCache);
  assert.equal(calls.length, 8);
});

for (const remoteOnly of [false, true]) test(`startup handles an environments write failure (remoteOnly=${remoteOnly})`, () => {
  const saved = { activeId: "local", environments: [] };
  const failure = new Error("fixture write failure");
  const logs = [];
  let writes = 0, menus = 0;
  const context = vm.createContext({ desktopBuild: { ...config, remoteOnly }, defaultServerEnvironment,
    randomUUID: () => "gateway", environmentsState: null, environmentsFile: () => "/tmp/cry-fixture/environments.json",
    fs: { existsSync: () => false }, environmentsStore: { read: () => saved, write: () => { writes++; throw failure; } },
    refreshApplicationMenu: () => menus++, mainWindow: null, railChanged() {}, slog: line => logs.push(line) });
  vm.runInContext(mainFunction("persistEnvironments"), context);
  const start = source.indexOf("  environmentsState = environmentsStore.read();");
  const end = source.indexOf("  let bootDataDir =", start);
  assert.ok(start > 0 && end > start);
  const boot = () => vm.runInContext(source.slice(start, end), context);
  if (remoteOnly) {
    assert.doesNotThrow(boot);
    assert.equal(context.environmentsState.activeId, "gateway");
    assert.equal(environments.activeRemote(context.environmentsState).origin, config.defaultServerUrl);
    assert.equal(menus, 1);
    assert.deepEqual(logs, ["remote-only environments save failed: fixture write failure"]);
  } else {
    assert.throws(boot, error => error === failure);
    assert.equal(context.environmentsState, saved);
    assert.equal(menus, 0);
    assert.deepEqual(logs, []);
  }
  assert.equal(writes, 1);
});

for (const remoteOnly of [false, true]) test(`startup chooses the build server independently of the saved environment (remoteOnly=${remoteOnly})`, async () => {
  const calls = [];
  const context = vm.createContext({ desktopBuild: { ...config, remoteOnly },
    hiddenStart: false, restoredOrganizationEntry: false, deliveredOrganizationEntry: false, deliveredCloudEntry: false,
    mainWindow: null, environmentsState: { activeId: "local", environments: [] },
    activeRemote: state => { calls.push("readActive"); return environments.activeRemote(state); },
    handSaved: () => true, createWindow: options => calls.push(["create", options.deferNavigation]),
    navigateMainWindow: async url => { calls.push(url); }, showStartPlace: async () => { calls.push("startPlace"); } });
  const start = source.indexOf("  if (!hiddenStart && !restoredOrganizationEntry && !deliveredOrganizationEntry && !deliveredCloudEntry) {");
  const end = source.indexOf(" if (hostedAvailable)", start);
  assert.ok(start > 0 && end > start);
  const boot = () => vm.runInContext(`(async () => { ${source.slice(start, end)} })()`, context);
  await boot();
  assert.deepEqual(calls, remoteOnly ? [["create", true], config.defaultServerUrl] : ["readActive", "startPlace"]);
  calls.length = 0;
  context.environmentsState = { activeId: "other", environments: [{ id: "other", origin: "https://other.example" }] };
  await boot();
  assert.deepEqual(calls, remoteOnly ? [["create", true], config.defaultServerUrl] : ["readActive", ["create", true], "https://other.example"]);
});
