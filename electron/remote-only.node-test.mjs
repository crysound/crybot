import assert from "node:assert/strict";
import test from "node:test";
import { defaultServerEnvironment } from "./desktop-build-config.mjs";
import { desktopEnvironmentsToSave, desktopEnvironmentSaveFailure, desktopReloadAction, desktopStartupUrl, desktopWindowTarget,
  loadDesktopWindow, reloadDesktopWindow, remoteOnlyFailurePage, remoteOnlyLoadFailed, workspaceActionsAllowed, workspaceHandler } from "./remote-only.mjs";
import environments from "./environments.cjs";
import nativeText from "./native-text.cjs";

const config = { remoteOnly: true, defaultServerUrl: "https://gateway.example", loginHosts: ["login.example"] };
const text = nativeText.createNativeText({ system: () => "zh-CN" });

for (const remoteOnly of [false, true]) test(`main-window loads enforce the build setting (${remoteOnly})`, async () => {
  const loaded = [];
  const win = { loadURL: async url => { loaded.push(url); } };
  const build = { ...config, remoteOnly };
  const urls = ["http://localhost:8799", "https://other.example", "https://gateway.example/chat", "https://login.example/oauth", "http://gateway.example", "file:///tmp/local.html", "data:text/html,local"];
  const expected = remoteOnly ? [config.defaultServerUrl, config.defaultServerUrl, urls[2], urls[3], config.defaultServerUrl, config.defaultServerUrl, config.defaultServerUrl] : urls;
  assert.deepEqual(urls.map(url => desktopWindowTarget(url, build)), expected);
  for (const url of urls) await loadDesktopWindow(win, url, build);
  assert.deepEqual(loaded, expected);
});

for (const remoteOnly of [false, true]) test(`saved environments and write failures respect remoteOnly=${remoteOnly}`, () => {
  const build = { ...config, remoteOnly };
  const saved = { activeId: "local", environments: [] };
  const initial = defaultServerEnvironment(saved, build, false, () => "gateway");
  const next = desktopEnvironmentsToSave(initial, build, () => "gateway");
  assert.equal(environments.activeRemote(next).origin, config.defaultServerUrl);
  const fallback = environments.withActive(next, "local");
  const after = desktopEnvironmentsToSave(fallback, build, () => "unused");
  assert.equal(after.activeId, remoteOnly ? "gateway" : "local");
  if (!remoteOnly) assert.equal(after, fallback);
  assert.equal(after.environments.length, 1);
  assert.equal(desktopEnvironmentSaveFailure(build, new Error("fixture write failure")), remoteOnly ? "remote-only environments save failed: fixture write failure" : null);
});

for (const failedUrl of ["https://gateway.example/chat", "https://login.example/oauth"]) test(`failed ${failedUrl} shows retry without switching environments`, async () => {
  const loaded = [];
  const win = { loadURL: async url => { loaded.push(url); } };
  const failure = { code: -105, url: failedUrl, mainFrame: true };
  for (const ignored of [{ ...failure, code: -3 }, { ...failure, mainFrame: false }, { ...failure, url: "https://other.example" }]) {
    assert.equal(remoteOnlyFailurePage(config, ignored, text), null);
    assert.equal(remoteOnlyLoadFailed(win, config, ignored, text), false);
  }
  assert.deepEqual(loaded, []);
  assert.equal(remoteOnlyLoadFailed(win, { ...config, remoteOnly: false }, failure, text), false);
  assert.equal(remoteOnlyLoadFailed(win, config, failure, text), true);
  assert.equal(loaded[0], remoteOnlyFailurePage(config, failure, text));
  const html = decodeURIComponent(loaded[0].split(",").slice(1).join(","));
  assert.ok(html.includes("连不上服务器"));
  assert.ok(html.includes("重试"));
  assert.ok(!html.includes("localhost"));
  await loadDesktopWindow(win, /href="([^"]+)"/.exec(html)[1], config);
  assert.equal(loaded[1], config.defaultServerUrl);
});

for (const ignoreCache of [false, true]) test(`reload targets only the focused window (ignoreCache=${ignoreCache})`, () => {
  const calls = [];
  let currentUrl;
  const main = { isDestroyed: () => false, webContents: { getURL: () => currentUrl,
    reload: () => calls.push("reload"), reloadIgnoringCache: () => calls.push("reloadIgnoringCache") } };
  const navigate = url => calls.push(url);
  const method = ignoreCache ? "reloadIgnoringCache" : "reload";
  for (currentUrl of ["https://gateway.example/chat/thread?view=details#latest", "https://gateway.example:443/settings"]) {
    assert.deepEqual(desktopReloadAction(config, { mainWindow: true, url: currentUrl, ignoreCache }), { method });
    reloadDesktopWindow(main, main, config, ignoreCache, navigate);
  }
  for (currentUrl of ["data:text/html,error", "https://login.example/oauth", "https://other.example/chat", "http://gateway.example/chat", "https://gateway.example:444/chat", ""]) {
    assert.deepEqual(desktopReloadAction(config, { mainWindow: true, url: currentUrl, ignoreCache }), { url: config.defaultServerUrl });
    reloadDesktopWindow(main, main, config, ignoreCache, navigate);
  }
  assert.deepEqual(calls, [method, method, ...Array(6).fill(config.defaultServerUrl)]);
  for (const url of ["file:///tmp/settings.html", "https://login.example/oauth", "https://gateway.example/popup", "data:text/html,error"]) {
    const popup = { isDestroyed: () => false, webContents: { getURL: () => url,
      reload: () => calls.push("popup reload"), reloadIgnoringCache: () => calls.push("popup force") } };
    reloadDesktopWindow(popup, main, config, ignoreCache, navigate);
    assert.equal(calls.at(-1), ignoreCache ? "popup force" : "popup reload");
  }
  reloadDesktopWindow(null, main, config, ignoreCache, navigate);
  reloadDesktopWindow({ isDestroyed: () => true }, main, config, ignoreCache, navigate);
  assert.equal(calls.length, 12);
  reloadDesktopWindow(main, main, { ...config, remoteOnly: false }, ignoreCache, navigate);
  assert.equal(calls.at(-1), method);
});

for (const remoteOnly of [false, true]) test(`startup chooses the expected server (remoteOnly=${remoteOnly})`, () => {
  const build = { ...config, remoteOnly };
  const local = { activeId: "local", environments: [] };
  const other = { activeId: "other", environments: [{ id: "other", origin: "https://other.example" }] };
  let reads = 0;
  const saved = () => { reads++; return true; };
  assert.equal(desktopStartupUrl(build, local, saved), remoteOnly ? config.defaultServerUrl : null);
  assert.equal(desktopStartupUrl(build, other, saved), remoteOnly ? config.defaultServerUrl : "https://other.example");
  assert.equal(reads, remoteOnly ? 0 : 1);
  assert.equal(desktopStartupUrl(build, other, () => false), remoteOnly ? config.defaultServerUrl : null);
});

for (const remoteOnly of [false, true]) test(`workspace IPC refuses before executing handlers (remoteOnly=${remoteOnly})`, async () => {
  const build = { ...config, remoteOnly };
  assert.equal(workspaceActionsAllowed(build), !remoteOnly);
  for (const channel of ["workspaces:state", "workspaces:line", "workspaces:menu"]) {
    const calls = [];
    const event = { sender: "main" };
    const wrapped = workspaceHandler(build, (...args) => { calls.push(args); return channel; });
    if (remoteOnly) {
      assert.throws(() => wrapped(event, "fixture"), /remote-only/);
      assert.deepEqual(calls, []);
    } else {
      assert.equal(await wrapped(event, "fixture"), channel);
      assert.deepEqual(calls, [[event, "fixture"]]);
    }
  }
});
