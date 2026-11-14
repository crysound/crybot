import { app, BrowserWindow, ipcMain, net, protocol, screen, session } from "electron";
import { mkdtempSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createIsland, isIslandWindow } from "../../electron/island.mjs";
import { ISLAND_PAGE, ISLAND_SCHEME, installIslandPage } from "../../electron/island-page.mjs";

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
const waitFor = async (predicate, label) => {
  const until = Date.now() + 15000;
  while (!await predicate()) {
    if (Date.now() > until) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};
let island;
try {
  await app.whenReady(); await mkdir(output, { recursive: true });
  const display = screen.getPrimaryDisplay();
  let cursor = { x: display.bounds.x, y: display.bounds.y + 600 };
  const fixtureScreen = { getPrimaryDisplay: () => display, getCursorScreenPoint: () => cursor, on: (...args) => screen.on(...args), removeListener: (...args) => screen.removeListener(...args) };
  island = createIsland({ platform: "darwin", BrowserWindow, ipcMain, screen: fixtureScreen, prefs: { island: () => ({ enabled: true, fullscreen: true, width: 200 }) },
    source: () => ({ key: "isolated-fixture", local: true }), request, page: ISLAND_PAGE,
    panelSession: installIslandPage({ session: session.fromPartition("island-fixture"), net }), language: () => "zh", openChat: chat => { opened = chat; return true; } });
  const win = BrowserWindow.getAllWindows().find(isIslandWindow);
  win.webContents.on("console-message", (_event, details) => { if (details.level === "error") console.error(details.message); });
  win.webContents.on("render-process-gone", (_event, details) => { throw new Error(`renderer gone: ${details.reason}`); });
  const evaluate = code => win.webContents.executeJavaScript(code);
  const mode = name => waitFor(() => evaluate(`document.querySelector('main')?.dataset.mode === '${name}'`), name);
  const capture = async name => {
    await mode(name); await new Promise(resolve => setTimeout(resolve, 500));
    const image = await win.webContents.capturePage(); assert.equal(image.isEmpty(), false);
    await writeFile(path.join(output, `${name}.png`), image.toPNG());
  };
  await capture("hidden");
  cursor = { x: display.bounds.x + display.bounds.width / 2, y: display.bounds.y + 8 };
  await capture("summary");
  assert.match(await evaluate("document.body.innerText"), /\+2/);
  await evaluate("document.querySelector('.summary-body').click()"); await capture("list");
  assert.equal(await evaluate("document.querySelectorAll('.agent svg').length"), 8);
  assert.match(await evaluate("document.querySelector('.agent').innerText"), /Juniper/);
  await evaluate("document.querySelector('.agent').click()"); await mode("chat");
  stream.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ kind: "runtime", event: { type: "content.delta", streamKind: "assistant_text", threadId: "t1", delta: "正在逐项检查构建配置…" } })}\n\n`));
  await waitFor(() => evaluate("document.body.innerText.includes('正在逐项检查')"), "streamed response");
  await capture("chat");
  await evaluate("document.querySelector('.approval-buttons .send').click()");
  await waitFor(() => writes.length === 1, "approval");
  assert.deepEqual(writes[0], { route: "/api/threads/t1/respond", body: { requestId: "fixture-approval", behavior: "allow" } });
  await evaluate("window.island.ready().then(value => window.island.send(value.snapshot.revision, 'Fixture message'))");
  assert.equal(writes[1].body.threadId, "t1");
  await evaluate("document.querySelector('.open-main').click()");
  await waitFor(() => opened !== null, "open main chat"); assert.equal(opened.threadId, "t1");
  console.log(`Saved four island screenshots to ${output}`);
} catch (error) {
  console.error(error); process.exitCode = 1;
} finally {
  island?.close(); await rm(userData, { recursive: true, force: true }); app.exit(process.exitCode ?? 0);
}
