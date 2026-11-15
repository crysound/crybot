import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, expect, it } from "vitest";
import { json, readBody } from "../harness/http.ts";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";
import { createSnapshotWiring } from "./snapshot-wiring.ts";

const botId = "snapshot-bot";
const machine = () => ({ id: "machine-one", name: `crybot-${botId}`, state: "running" as const, templateId: "agent-browser", metadata: { botId } });
let fake: Awaited<ReturnType<typeof fakeInstaboxCore>>;
let server: Server;
let base: string;
let occupied: boolean;
let locked: boolean;
const path = `/api/bots/${botId}/instabox/snapshots`;
beforeEach(async () => {
  occupied = false; locked = false;
  fake = await fakeInstaboxCore();
  fake.machines.set("machine-one", machine());
  fake.snapshots.set("saved", { id: "saved", name: `crybot-${botId}-backup`, status: "ready", sourceMachineId: "machine-one" });
  const routes = createSnapshotWiring({ cfg: () => ({ instabox: { apiKey: "snapshot-fixture-key" } }), baseUrl: fake.url,
    eligible: id => id === botId, inUse: () => occupied,
    claim: () => { if (locked) throw Object.assign(new Error("Computer is in use"), { status: 409 }); locked = true; return () => { locked = false; }; },
  });
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, base);
    await routes({ req, res, url, path: url.pathname, method: req.method!, json, readBody, auth: { kind: "loopback", scopes: ["admin", "client"] } });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture did not listen");
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  await fake.close();
});
const send = (restore = false) => fetch(base + path + (restore ? "/saved/restore" : ""), {
  method: "POST", headers: { origin: base, "content-type": "application/json" }, body: "{}",
});

it.each([false, true])("wakes a sleeping computer before saving/restoring (restore=%s)", async restore => {
  fake.machines.get("machine-one")!.state = "suspended";
  expect((await send(restore)).status).toBe(restore ? 200 : 201);
  const writes = fake.calls.filter(call => call.method === "POST").map(call => call.path.split("/").at(-1));
  expect(writes.slice(0, 3)).toEqual(["resume", "desktop", restore ? "restore" : "snapshots"]);
});

it.each([false, true])("recovers an actual sleeping-machine 409 before retrying (restore=%s)", async restore => {
  const action = restore ? "restore" : "snapshots";
  const held = fake.holdNext("POST", `/v1/machines/machine-one/${action}`);
  const response = send(restore);
  await held.reached;
  fake.machines.get("machine-one")!.state = "suspended";
  held.release();
  expect((await response).status).toBe(restore ? 200 : 201);
  const writes = fake.calls.filter(call => call.method === "POST").map(call => call.path.split("/").at(-1));
  expect(writes.slice(0, 4)).toEqual([action, "resume", "desktop", action]);
  expect(locked).toBe(false);
});

it("reports overlapping snapshot requests as in progress and releases the lock", async () => {
  const held = fake.holdNext("POST", "/v1/machines/machine-one/snapshots");
  const first = send();
  await held.reached;
  const second = await send();
  expect(second.status).toBe(409);
  expect(await second.json()).toMatchObject({ code: "instabox_snapshot_busy" });
  held.release();
  expect((await first).status).toBe(201);
  expect((await send()).status).toBe(201);
});

it.each(["active work", "lifecycle action"])("separates machine occupation by %s from snapshots", async kind => {
  occupied = kind === "active work"; locked = kind === "lifecycle action";
  const response = await send();
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: "instabox_snapshot_machine_busy" });
  expect(fake.calls).toEqual([]);
});

it.each(["operation_in_progress", "machine_busy", "operation_conflict"])("classifies real client error %s and preserves the refusal reason", async code => {
  const held = fake.holdNext("POST", "/v1/machines/machine-one/snapshots");
  const pending = send();
  await held.reached;
  fake.failNext({ status: 409, code }); held.release();
  const response = await pending;
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject(code === "operation_conflict"
    ? { code: "instabox_snapshot_conflict", reason: code }
    : { code: code === "machine_busy" ? "instabox_snapshot_machine_busy" : "instabox_snapshot_busy" });
  expect(fake.calls.some(call => call.path.endsWith("/resume"))).toBe(false);
});
