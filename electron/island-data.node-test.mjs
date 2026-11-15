import test from "node:test";
import assert from "node:assert/strict";
import { createIslandData } from "./island-data.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve));
const bot = { id: "atlas", threadId: "selected", tasks: [{ threadId: "latest", updatedAt: 10 }], name: "Atlas" };
function fixture() {
  let source = { key: "local", local: true }, snapshot;
  const streams = new Map(), calls = [];
  const request = async (place, route, init = {}) => {
    calls.push({ place: place.key, route, init });
    if (route.startsWith("/api/events")) return new Response(new ReadableStream({ start(controller) {
      streams.set(place.key, controller);
      init.signal.addEventListener("abort", () => { try { controller.close(); } catch {} });
    } }));
    if (route === "/api/bots?messages=0") return Response.json({ bots: [bot] });
    if (route.includes("/messages?")) return Response.json({ messages: [{ id: "permission", kind: "options", role: "bot", card: { requestId: "ask", title: "Run", requestType: "permission" } }] });
    return Response.json({ ok: true });
  };
  const data = createIslandData({ source: () => source, request, changed: next => { snapshot = next; } });
  return { data, calls, snapshot: () => snapshot, source: next => { source = next; }, frame: (key, frame) => streams.get(key).enqueue(new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`)) };
}
test("isolated SSE fixture streams into the latest conversation and writes to that same thread", async t => {
  const f = fixture(); t.after(() => f.data.close()); f.data.sync(); await tick();
  await f.data.select("atlas");
  const revision = f.snapshot().revision;
  assert.equal(f.snapshot().chat.threadId, "latest");
  f.frame("local", { kind: "runtime", event: { type: "content.delta", threadId: "latest", streamKind: "assistant_text", delta: "Hello" } }); await tick();
  assert.equal(f.snapshot().chat.streaming, "Hello");
  await f.data.send(revision, "hi");
  const sent = f.calls.find(call => call.init.method === "POST");
  assert.equal(sent.route, "/api/bots/atlas/messages");
  assert.equal(JSON.parse(sent.init.body).threadId, "latest");
  await f.data.respond(revision, "ask", "deny");
  assert.equal(f.calls.at(-2).route, "/api/threads/latest/respond");
  await assert.rejects(f.data.respond(revision, "forged", "allow"), /invalid-approval/);
});
test("changing place clears private data, aborts old SSE and rejects stale sends", async t => {
  const f = fixture(); t.after(() => f.data.close()); f.data.sync(); await tick(); await f.data.select("atlas");
  const revision = f.snapshot().revision;
  f.source({ key: "cloud", origin: "https://fixture.invalid", local: false });
  await assert.rejects(f.data.send(revision, "wrong place"), /place-changed/);
  assert.equal(f.snapshot().chat, null);
  assert.deepEqual(f.snapshot().bots, []);
  assert.equal(f.calls[0].init.signal.aborted, true);
  await tick();
  assert.equal(f.calls.at(-1).place, "cloud");
  assert.equal(f.calls.some(call => call.init.method === "POST"), false);
});
test("an old list response cannot populate a newly selected place", async t => {
  let source = { key: "a" }, finish;
  const data = createIslandData({ source: () => source, changed() {}, request: async (_place, route, init) => {
    if (route.includes("events")) return new Response(new ReadableStream({ start(controller) { init.signal.addEventListener("abort", () => controller.close()); } }));
    return new Promise(resolve => { finish = resolve; });
  } });
  t.after(() => data.close()); data.sync(); await tick(); source = null; data.sync(); finish(Response.json({ bots: [bot] })); await tick();
  assert.deepEqual(data.snapshot().bots, []); assert.equal(data.snapshot().online, false);
});

test("an SSE message arriving during the history read survives that read", async t => {
  let stream, finish;
  const data = createIslandData({ source: () => ({ key: "fixture" }), changed() {}, request: async (_place, route, init) => {
    if (route.includes("events")) return new Response(new ReadableStream({ start(controller) { stream = controller; init.signal.addEventListener("abort", () => controller.close()); } }));
    if (route.startsWith("/api/bots")) return Response.json({ bots: [bot] });
    return new Promise(resolve => { finish = resolve; });
  } });
  t.after(() => data.close()); data.sync(); await tick();
  const selecting = data.select("atlas"); await tick();
  stream.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ kind: "message", threadId: "latest", message: { id: "live", kind: "text", role: "bot", text: "Live reply" } })}\n\n`)); await tick();
  finish(Response.json({ messages: [{ id: "earlier", kind: "text", text: "Earlier" }] })); await selecting;
  assert.deepEqual(data.snapshot().chat.messages.map(message => message.id), ["earlier", "live"]);
});

test("aborted avatar fetches cannot request the old place's other avatars from a new place", async t => {
  let source = { key: "old" }, refuse;
  const calls = [];
  const data = createIslandData({ source: () => source, changed() {}, request: async (place, route, init) => {
    calls.push([place.key, route]);
    if (route.includes("events")) return new Response(new ReadableStream({ start(controller) { init.signal.addEventListener("abort", () => controller.close()); } }));
    if (route.startsWith("/api/bots")) return Response.json({ bots: place.key === "old" ? [{ ...bot, avatarUrl: "/api/attachments/a.png" }, { ...bot, id: "second", avatarUrl: "/api/attachments/b.png" }] : [] });
    return new Promise((_resolve, reject) => { refuse = reject; });
  } });
  t.after(() => data.close()); data.sync(); await tick(); source = { key: "new" }; data.sync(); refuse(new Error("aborted")); await tick();
  assert.equal(calls.some(([key, route]) => key === "new" && route.includes("attachments")), false);
});

test("closed data cannot reconnect through sync", async t => {
  const f = fixture(); t.after(() => f.data.close()); f.data.sync(); await tick(); f.data.close();
  const count = f.calls.length; f.source({ key: "next" });
  assert.equal(f.data.sync(), false); await tick(); assert.equal(f.calls.length, count);
});

test("special review cards cannot be approved through the island bridge", async t => {
  const f = fixture(); t.after(() => f.data.close()); f.data.sync(); await tick(); await f.data.select("atlas");
  f.frame("local", { kind: "message", threadId: "latest", message: { id: "skill", kind: "options", card: { requestId: "skill", requestType: "permission", skillRequest: { sha256: "review-required" } } } });
  await tick();
  for (const behavior of ["allow", "deny"]) await assert.rejects(f.data.respond(f.snapshot().revision, "skill", behavior), /invalid-approval/);
  assert.equal(f.calls.some(call => call.init.method === "POST"), false);
});
test("a retry already queued before close cannot restart the data source", async () => {
  let retry, calls = 0, publishes = 0;
  const data = createIslandData({ source: () => ({ key: "fixture" }), request: async () => { calls++; throw new Error("offline"); }, changed: () => { publishes++; }, setTimer: callback => { retry = callback; return 1; }, clearTimer() {} });
  data.sync(); await tick(); assert.equal(typeof retry, "function");
  data.close(); const before = publishes; retry(); await tick();
  assert.equal(calls, 1); assert.equal(publishes, before);
});
