import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { patchOrganizationUpdater } from "../scripts/patch-organization-updater.mjs";
import { CLOUD_DEEP_LINK, createCloudEntry, isCloudDeepLink, takeCloudDeepLink } from "./cloud-entry.mjs";

const main = readFileSync(new URL("./main.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const between = (start, end) => {
  const from = main.indexOf(start), to = main.indexOf(end, from);
  assert.ok(from !== -1 && to !== -1, `${start} … ${end}`);
  return main.slice(from, to);
};
function fixture({ open = async () => true } = {}) {
  const calls = [];
  const entry = createCloudEntry({
    reveal: () => calls.push("reveal"),
    open: async () => { calls.push("open"); return open(); },
  });
  return { calls, entry };
}
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test("the Cloud protocol is a fixed action without URL routing or credentials", () => {
  assert.equal(CLOUD_DEEP_LINK, "crybot://cloud");
  assert.equal(isCloudDeepLink("crybot://cloud"), true);
  for (const value of [null, undefined, {}, ["crybot://cloud"], "", "crybot://cloud/", "crybot://cloud?", "crybot://cloud#",
    "crybot://cloud?code=ABCDE-FGHJK", "crybot://cloud#code=ABCD-EFGH-JKLM", "crybot://cloud?url=https://home.example",
    "crybot://cloud/pair", "crybot://user@cloud", "crybot://cloud:443", "crybot://cloud.evil", "crybot://CLOUD",
    "OPENBOTBOT://cloud", "crybot:cloud", "crybot:///cloud", "https://cloud", " crybot://cloud", "crybot://cloud ",
    "crybot://%63loud", "crybot://organization", "crybot://install?url=https://github.com/x/y"]) {
    assert.equal(isCloudDeepLink(value), false, String(value));
  }
});

test("consuming a launch action prevents it replaying on a later restart without changing other arguments", () => {
  const original = ["/Applications/CryBot", "--profile=fixture", "crybot://cloud?ignored", "crybot://organization", "crybot://install/example"];
  const argv = [...original, "crybot://cloud", "crybot://cloud"];
  assert.equal(takeCloudDeepLink(argv), true);
  assert.deepEqual(argv, original);
  assert.equal(takeCloudDeepLink(argv), false, "the action is consumed exactly once");
  assert.deepEqual(argv, original);
});

test("a cold-start link waits until main can navigate, then opens exactly once", async () => {
  const h = fixture();
  const argv = ["/Applications/CryBot", "--fixture", "crybot://cloud"];
  assert.equal(h.entry.fromLaunch(argv), true);
  assert.deepEqual(argv, ["/Applications/CryBot", "--fixture"]);
  await settle();
  assert.deepEqual(h.calls, [], "no window exists to reveal or navigate yet");
  assert.equal(await h.entry.ready(), true);
  assert.deepEqual(h.calls, ["open"]);
  assert.equal(await h.entry.ready(), false, "a delivered link is not delivered again");
  assert.deepEqual(h.calls, ["open"]);
});

test("a launch without the link leaves nothing pending", async () => {
  const h = fixture();
  assert.equal(h.entry.fromLaunch(["/Applications/CryBot", "crybot://cloud/"]), false);
  assert.equal(await h.entry.ready(), false);
  assert.deepEqual(h.calls, []);
});

test("macOS open-url before ready is held, and several links open once", async () => {
  const h = fixture();
  assert.equal(h.entry.fromUrl("crybot://cloud"), true);
  assert.equal(h.entry.fromUrl("crybot://cloud"), true);
  await settle();
  assert.deepEqual(h.calls, ["reveal", "reveal"]);
  assert.equal(await h.entry.ready(), true);
  assert.deepEqual(h.calls, ["reveal", "reveal", "open"]);
});

test("once ready, open-url and a second instance open immediately and consume the argument", async () => {
  const h = fixture();
  await h.entry.ready();
  assert.equal(h.entry.fromUrl("crybot://cloud"), true);
  await settle();
  assert.deepEqual(h.calls, ["reveal", "open"]);
  const commandLine = ["C:\\CryBot.exe", "--flag", "crybot://cloud"];
  assert.equal(h.entry.fromArgs(commandLine), true);
  await settle();
  assert.deepEqual(h.calls, ["reveal", "open", "reveal", "open"]);
  assert.deepEqual(commandLine, ["C:\\CryBot.exe", "--flag"]);
});

test("anything else is left to the other link handlers without revealing or opening", async () => {
  const h = fixture();
  await h.entry.ready();
  for (const url of ["crybot://organization", "crybot://install?url=https://github.com/x/y", "crybot://cloud?code=X", "crybot://cloud/"]) {
    assert.equal(h.entry.fromUrl(url), false);
    const argv = ["/app", url];
    assert.equal(h.entry.fromArgs(argv), false);
    assert.deepEqual(argv, ["/app", url]);
  }
  await settle();
  assert.deepEqual(h.calls, []);
});

test("a failed open is contained and a later link still opens", async () => {
  let fail = true;
  const h = fixture({ open: async () => { if (fail) throw new Error("load failed"); return true; } });
  h.entry.fromLaunch(["/app", "crybot://cloud"]);
  assert.equal(await h.entry.ready(), false);
  fail = false;
  h.entry.fromUrl("crybot://cloud");
  await settle();
  assert.deepEqual(h.calls, ["open", "reveal", "open"]);
});

test("a consumed launch link is not replayed by the companion or updater relaunch", () => {
  const argv = ["/fixture/CryBot", "--fixture", "crybot://cloud", "crybot://cloud?ignored"];
  takeCloudDeepLink(argv);
  const calls = [];
  runInNewContext(`${between("function relaunchAfterDesktopRemoteChange()", 'ipcMain.handle("desktop-remote:state"')}\nrelaunchAfterDesktopRemoteChange();`, {
    desktopShutdownStarted: false, process: { argv }, setTimeout: callback => { callback(); return {}; },
    app: { relaunch: options => calls.push(options.args), quit: () => {} },
  });
  const patched = patchOrganizationUpdater("      relaunch() {\n        this.app.relaunch();\n      }");
  runInNewContext(`({ app, ${patched} }).relaunch();`, { process: { argv }, app: { relaunch: options => calls.push(options.args) } });
  assert.deepEqual(calls, [["--fixture", "crybot://cloud?ignored"], ["--fixture", "crybot://cloud?ignored"]]);
});

test("main takes the link from launch arguments, open-url and a second instance", () => {
  assert.ok(main.indexOf("cloudEntry.fromLaunch(process.argv);") < main.indexOf("app.requestSingleInstanceLock()"),
    "the launch argument is consumed before anything can relaunch");
  assert.match(between('app.on("open-url"', "});"), /!queueOrganizationEntry\(url\) && !cloudEntry\.fromUrl\(url\) && !queuePackageInstall\(url\)/);
  const secondInstance = between('app.on("second-instance"', "\n});");
  assert.ok(secondInstance.indexOf("if (cloudEntry.fromArgs(commandLine)) return;") > secondInstance.indexOf("takeOrganizationDeepLink(commandLine)"));
  assert.ok(secondInstance.indexOf("if (cloudEntry.fromArgs(commandLine)) return;") < secondInstance.indexOf("packageUrlFromCommandLine(commandLine)"));
});

test("startup delivers a pending Cloud link before default navigation", () => {
  const startup = between("  let restoredOrganizationEntry = false;", "  // Registering from an unreadable store");
  const delivered = startup.indexOf("const deliveredCloudEntry = await cloudEntry.ready();");
  assert.ok(delivered > startup.indexOf("await deliverOrganizationEntry()"));
  assert.ok(delivered < startup.indexOf("await showStartPlace()"));

});

test("a hosted Cloud link cannot open a window or start a client", async () => {
  const entry = between("async function openCloudEntry()", "\n}\n");
  const result = await runInNewContext(`${entry}\n}\nopenCloudEntry()`);
  assert.equal(result, false);
});

test("hosted cloud offers stay disabled", () => {
  assert.match(between("function cloudOffersAllowed()", "\n}\n"), /return false;/);
});
