import { createServer, type Server } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, it, vi } from "vitest";
import { json, readBody } from "../harness/http.ts";
import { createInstaboxWiring } from "./wiring.ts";

const botId = "snapshot-budget-bot";
const snapshot = { id: "saved", name: "backup", status: "ready", metadata: { app: "crybot", botId } };
const machine = { id: "machine", name: `crybot-${botId.slice(0, 12)}`, metadata: { botId }, state: "running" };
const basePath = `/api/bots/${botId}/instabox/snapshots`;
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  vi.unstubAllEnvs();
});
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture did not listen");
  return `http://127.0.0.1:${address.port}`;
}

async function fixture(stall: "lookup" | "pages" | "poll" | "desktop" | "body", timeoutMs = 600) {
  const calls: Array<{ path: string; wait: string | null }> = [];
  let cancelled = false;
  let locked = false;
  let reached!: () => void;
  const stalled = new Promise<void>(resolve => { reached = resolve; });
  const upstream = await listen(createServer(async (req, res) => {
    for await (const chunk of req) void chunk;
    const url = new URL(req.url!, "http://fixture");
    const path = url.pathname;
    calls.push({ path, wait: url.searchParams.get("wait") });
    const hanging = stall === "lookup" && path === "/v1/machines" || stall === "poll" && path.startsWith("/v1/operations/") || stall === "desktop" && path.endsWith("/desktop") || stall === "body";
    if (hanging) {
      res.on("close", () => { cancelled = !res.writableEnded; });
      if (stall === "body") { res.writeHead(200, { "content-type": "application/json" }); res.write('{"snapshots":['); }
      reached();
      return;
    }
    if (stall === "pages" && path === "/v1/snapshots") {
      await delay(220);
      return json(res, 200, { snapshots: [], nextCursor: `page-${calls.length}` });
    }
    if (path === "/v1/machines") { await delay(120); return json(res, 200, { machines: [machine] }); }
    if (path === "/v1/snapshots/saved") { await delay(120); return json(res, 200, snapshot); }
    if (req.method === "POST" && path.endsWith("/restore")) return json(res, 202, { id: "restore", state: "pending" });
    if (path.startsWith("/v1/operations/")) return json(res, 200, { id: "restore", state: "succeeded" });
    json(res, 500, { error: "unexpected_fixture_request" });
  }));
  vi.stubEnv("CRYBOT_TEST_INSTABOX_API", upstream);
  vi.stubEnv("INSTABOX_API_KEY", "instabox-e2e-fixture");
  const wiring = createInstaboxWiring({ cfg: () => ({}), eligible: id => id === botId,
    inUse: () => false, snapshotTimeoutMs: timeoutMs,
    claim: () => { if (locked) throw Object.assign(new Error("busy"), { status: 409 }); locked = true; return () => { locked = false; }; },
  });
  const app = await listen(createServer(async (req, res) => {
    const url = new URL(req.url!, "http://fixture");
    await wiring.routes({ req, res, url, path: url.pathname, method: req.method!, json, readBody, auth: { kind: "loopback", scopes: ["admin", "client"] } });
  }));
  const send = (signal?: AbortSignal) => fetch(app + basePath + (["poll", "desktop"].includes(stall) ? "/saved/restore" : ""), {
    method: ["pages", "body"].includes(stall) ? "GET" : "POST", headers: { origin: app, "content-type": "application/json" },
    ...(["pages", "body"].includes(stall) ? {} : { body: "{}" }), signal,
  });
  return { send, calls, stalled, cancelled: () => cancelled, locked: () => locked };
}

it.each(["lookup", "pages", "poll", "desktop", "body"] as const)("bounds the whole snapshot flow including slow %s responses", async stage => {
  const f = await fixture(stage);
  const start = Date.now();
  const response = await f.send();
  expect(response.status).toBe(504);
  expect(await response.json()).toMatchObject({ code: "instabox_snapshot_timeout" });
  expect(Date.now() - start).toBeLessThan(1_200);
  expect(f.locked()).toBe(false);
  if (stage === "desktop") expect(f.calls.map(call => call.path)).toContain("/v1/machines/machine/desktop");
  if (stage !== "pages") await expect.poll(f.cancelled).toBe(true);
  if (stage === "pages") expect(f.calls.length).toBeLessThanOrEqual(4);
  if (stage === "poll" || stage === "desktop") {
    const wait = f.calls.find(call => call.path.startsWith("/v1/operations/"))!.wait!;
    expect(parseFloat(wait)).toBeLessThan(0.45);
  }
  const count = f.calls.length;
  await delay(300);
  expect(f.calls).toHaveLength(count);
});

it("cancels the upstream flow and releases the lifecycle lock when the caller disconnects", async () => {
  const f = await fixture("lookup", 10_000);
  const controller = new AbortController();
  const response = f.send(controller.signal).catch(() => null);
  await f.stalled;
  expect(f.locked()).toBe(true);
  controller.abort();
  expect(await response).toBeNull();
  await expect.poll(f.cancelled).toBe(true);
  await expect.poll(f.locked).toBe(false);
  await delay(300);
  expect(f.calls).toHaveLength(1);
});
