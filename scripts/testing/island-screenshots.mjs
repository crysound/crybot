import { app, BrowserWindow, ipcMain, net, protocol, screen, session } from "electron";
import { mkdtempSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createIsland, isIslandWindow } from "../../electron/island.mjs";
import { ISLAND_PAGE, ISLAND_SCHEME, installIslandPage } from "../../electron/island-page.mjs";

const startedAt = Date.now();
const activeSteps = [];
const log = message => console.log(`[island-screenshots +${Date.now() - startedAt}ms] ${message}`);
const fail = error => {
  console.error(`[island-screenshots] FATAL at ${activeSteps.join(" > ") || "startup/idle"}:`, error);
  app.exit(1);
};
const watchdog = setTimeout(() => fail(new Error("Global timeout after 240000ms")), 240000);
log(`START Electron ${process.versions.electron} on ${process.platform}; watchdog=240000ms, step=20000ms`);
app.on("window-all-closed", () => log("EVENT window-all-closed; finishing fixture cleanup"));
app.on("child-process-gone", (_event, details) => log(`EVENT child-process-gone ${JSON.stringify(details)}`));

async function step(label, run) {
  activeSteps.push(label);
  log(`BEGIN ${label}`);
  let timer;
  try {
    const result = await Promise.race([
      Promise.resolve().then(run),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out after 20000ms: ${label}`)), 20000); }),
    ]);
    log(`DONE ${label}`);
    return result;
  } catch (error) {
    log(`FAIL ${label}: ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timer);
    activeSteps.splice(activeSteps.lastIndexOf(label), 1);
  }
}

const userData = mkdtempSync(path.join(tmpdir(), "crybot-island-fixture-"));
app.setPath("userData", userData);
protocol.registerSchemesAsPrivileged([{ scheme: ISLAND_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const output = path.resolve("artifacts/island-screenshots");
const names = ["Atlas", "Juniper", "Mochi", "Sage", "Nova", "Kiwi", "Pip", "Willow"];
const colors = ["green", "purple", "orange", "blue", "pink", "green", "purple", "blue"];
const bots = names.map((name, index) => ({ id: `b${index}`, threadId: `t${index}`, name, title: "Reviewing the release notes and preparing a summary", description: "", notifications: false, color: colors[index], mascotBody: index % 2 ? "star" : "dome", avatarUrl: null, unread: false, modelSelection: { instanceId: "fixture", model: "fixture" }, createdAt: index, activity: index === 1 ? "waiting-on-you" : index < 4 ? "working" : "idle", tasks: [{ threadId: `t${index}`, title: "Reviewing the release notes and preparing a summary", createdAt: index }] }));
let stream, opened = null;
const writes = [];
const request = async (_place, route, init = {}) => {
  if (route.startsWith("/api/events")) return new Response(new ReadableStream({ start(controller) { stream = controller; init.signal.addEventListener("abort", () => { try { controller.close(); } catch {} }); } }));
  if (route === "/api/bots?messages=0") return Response.json({ bots });
  if (route.includes("/messages?")) return Response.json({ messages: [
    { id: "user", role: "user", kind: "text", at: 1, text: "帮我检查这次发布，有需要确认的就告诉我。" },
    { id: "reply", role: "bot", kind: "text", at: 2, text: "已经核对了发布说明和测试结果。我正在整理最后几项检查。" },
    { id: "approval", role: "bot", kind: "options", at: 3, card: { title: "发布前确认", subtitle: "允许我运行最终构建吗？", requestId: "fixture-approval", requestType: "permission", options: ["allow", "deny"] } },
  ] });
  if (init.method === "POST") { writes.push({ route, body: JSON.parse(init.body) }); return Response.json({ ok: true }); }
  throw new Error(`unexpected fixture request ${route}`);
};
const waitFor = (predicate, label) => step(`waitFor ${label}`, async () => {
  while (!await predicate()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
});
let island;
async function main() {
  try {
    await step("app.whenReady", () => app.whenReady());
    await step("create output directory", () => mkdir(output, { recursive: true }));
    const display = screen.getPrimaryDisplay();
    let cursor = { x: display.bounds.x, y: display.bounds.y + 600 };
    const fixtureScreen = { getPrimaryDisplay: () => display, getCursorScreenPoint: () => cursor, on: (...args) => screen.on(...args), removeListener: (...args) => screen.removeListener(...args) };
    const pageLoaded = Promise.withResolvers();
    function ScreenshotWindow(options) {
      const win = new BrowserWindow({ ...options, paintWhenInitiallyHidden: true,
        webPreferences: { ...options.webPreferences, backgroundThrottling: false } });
      win.webContents.on("did-start-loading", () => log(`EVENT did-start-loading ${ISLAND_PAGE}`));
      win.webContents.once("did-finish-load", () => { log(`EVENT did-finish-load ${win.webContents.getURL()}`); pageLoaded.resolve(); });
      win.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => fail(new Error(`did-fail-load code=${code} description=${description} url=${url} mainFrame=${isMainFrame}`)));
      win.webContents.on("render-process-gone", (_event, details) => fail(new Error(`render-process-gone ${JSON.stringify(details)}`)));
      win.on("unresponsive", () => fail(new Error("unresponsive island window")));
      win.webContents.on("console-message", (_event, details) => log(`RENDERER ${details.level}: ${details.message}`));
      win.webContents.on("preload-error", (_event, preload, error) => fail(new Error(`preload-error ${preload}: ${error.message}`)));
      return win;
    }
    island = await step("create island window", () => createIsland({ platform: "darwin", BrowserWindow: ScreenshotWindow, ipcMain, screen: fixtureScreen, prefs: { island: () => ({ enabled: true, fullscreen: true, width: 200 }) },
      source: () => ({ key: "isolated-fixture", local: true }), request, page: ISLAND_PAGE,
      panelSession: installIslandPage({ session: session.fromPartition("island-fixture"), net }), language: () => "zh", openChat: chat => { opened = chat; return true; } }));
    const win = BrowserWindow.getAllWindows().find(isIslandWindow);
    assert.ok(win, "island window was created");
    await step("page did-finish-load", () => pageLoaded.promise);
    const evaluate = (label, code) => step(`executeJavaScript ${label}`, () => win.webContents.executeJavaScript(code));
    const mode = name => waitFor(() => evaluate(`mode ${name}`, `document.querySelector('main')?.dataset.mode === '${name}'`), name);
    const capture = async name => {
      await mode(name);
      await step(`showInactive ${name}`, () => { win.showInactive(); win.webContents.invalidate(); });
      await evaluate(`paint ${name}`, "document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))");
      await step(`settle animation ${name}`, () => new Promise(resolve => setTimeout(resolve, 500)));
      const state = await evaluate(`state ${name}`, `(() => {
        const main = document.querySelector('main');
        return { mode: main.dataset.mode, height: main.getBoundingClientRect().height, opacity: getComputedStyle(main).opacity };
      })()`);
      log(`STATE ${name} ${JSON.stringify({ ...state, visible: win.isVisible(), bounds: win.getBounds() })}`);
      assert.equal(state.mode, name);
      assert.equal(win.isVisible(), true);
      if (name === "hidden") { assert.equal(state.height, 0); assert.equal(state.opacity, "0"); }
      const image = await step(`capturePage ${name}`, () => win.webContents.capturePage(undefined, { stayAwake: true }));
      assert.equal(image.isEmpty(), false, `${name}: empty capture`);
      await step(`write ${name}.png`, () => writeFile(path.join(output, `${name}.png`), image.toPNG()));
      log(`SAVED ${name}.png ${JSON.stringify(image.getSize())}`);
    };
    await capture("hidden");
    cursor = { x: display.bounds.x + display.bounds.width / 2, y: display.bounds.y + 8 };
    await capture("summary");
    assert.match(await evaluate("summary overflow", "document.body.innerText"), /\+2/);
    await evaluate("open list", "document.querySelector('.summary-body').click()"); await capture("list");
    assert.equal(await evaluate("avatar count", "document.querySelectorAll('.agent svg').length"), 8);
    assert.match(await evaluate("first agent", "document.querySelector('.agent').innerText"), /Juniper/);
    await evaluate("open chat", "document.querySelector('.agent').click()"); await mode("chat");
    stream.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ kind: "runtime", event: { type: "content.delta", streamKind: "assistant_text", threadId: "t1", delta: "正在逐项检查构建配置…" } })}\n\n`));
    await waitFor(() => evaluate("streamed response", "document.body.innerText.includes('正在逐项检查')"), "streamed response");
    await capture("chat");
    await evaluate("approve", "document.querySelector('.approval-buttons .send').click()");
    await waitFor(() => writes.length === 1, "approval");
    assert.deepEqual(writes[0], { route: "/api/threads/t1/respond", body: { requestId: "fixture-approval", behavior: "allow" } });
    await evaluate("send fixture message", "window.island.ready().then(value => window.island.send(value.snapshot.revision, 'Fixture message'))");
    assert.equal(writes[1].body.threadId, "t1");
    await evaluate("open main", "document.querySelector('.open-main').click()");
    await waitFor(() => opened !== null, "open main chat"); assert.equal(opened.threadId, "t1");
    log(`Saved four island screenshots to ${output}`);
  } finally {
    await step("close fixture", () => island?.close());
    await step("remove fixture userData", () => rm(userData, { recursive: true, force: true }));
  }
  clearTimeout(watchdog);
  app.exit(0);
}

// Electron 43 waits for ESM entry evaluation before emitting ready.
void main().catch(fail);
