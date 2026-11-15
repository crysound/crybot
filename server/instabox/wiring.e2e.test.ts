import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WebSocket } from "ws";
import { expect, it } from "vitest";
import { launchRestartableServer } from "../testing/restartable-server.ts";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";

import { wiringBackendsFixture } from "./wiring-backends-fixture.ts";

async function fixture(extraEnv: NodeJS.ProcessEnv = {}) {
  const fake = await fakeInstaboxCore();
  const env = { ...extraEnv, INSTABOX_API_KEY: "", CRYBOT_TEST_INSTABOX_API: fake.url };
  const app = await launchRestartableServer({ scripted: true, env });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(app.url + path, { method, headers: { origin: app.url, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30_000) });
    const data = await response.json() as any;
    expect(JSON.stringify(data)).not.toContain("instabox-e2e-fixture");
    return { status: response.status, body: data };
  };
  return { fake, env, app, request, close: async () => { await app.close(); await fake.close(); } };
}

it("wires saved and environment keys, turn tools, VNC, snapshots, replacement and deletion through the real entry", async () => {
  const f = await fixture();
  const { request, fake, app, env } = f;
  let socket: WebSocket | undefined;
  try {
    const stream = await fetch(app.url + "/api/events", { headers: { origin: app.url }, signal: AbortSignal.timeout(10_000) });
    const reader = stream.body!.getReader();
    let frames = "";
    const readFrames = (async () => { for (;;) { const chunk = await reader.read(); if (chunk.done) break; frames += new TextDecoder().decode(chunk.value); } })();
    expect((await request("PUT", "/api/config", { instabox: { apiKey: "instabox-e2e-fixture-file" } })).status).toBe(200);
    expect((await request("GET", "/api/config")).body.instabox).toEqual({ configured: true, last4: "file", fromEnv: false });
    await expect.poll(() => frames.includes('"last4":"file"'), { timeout: 5_000 }).toBe(true);
    expect(frames).not.toContain("instabox-e2e-fixture");
    await reader.cancel(); await readFrames;
    await app.stop();
    env.INSTABOX_API_KEY = "instabox-e2e-fixture-env";
    await app.start();
    expect((await request("GET", "/api/config")).body.instabox).toEqual({ configured: true, last4: "-env", fromEnv: true });
    expect((await request("PATCH", "/api/config", { instabox: { apiKey: "" } })).status).toBe(409);
    expect(JSON.parse(readFileSync(join(app.dataDir, "config.json"), "utf8")).instabox.apiKey).toBe("instabox-e2e-fixture-file");
    const created = await request("POST", "/api/bots", { name: "Wiring fixture", computer: "cloud", cloudBackend: "instabox", modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } });
    expect(created.status).toBe(201);
    const bot = created.body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { computer: "cloud", cloudBackend: "instabox" })).status).toBe(200);
    expect((await request("GET", path + "/computer")).body.backend).toBe("instabox");
    writeFileSync(app.planPath, JSON.stringify({ [bot.id]: { steps: [
      { server: "computer", tool: "exec", arguments: { command: "printf wiring-fixture" } },
      { server: "computer", tool: "screenshot", arguments: {} },
    ], reply: "Wiring complete." } }));
    expect((await request("POST", path + "/messages", { text: "Use the computer.", threadId: bot.threadId })).status).toBe(202);
    await expect.poll(() => fake.calls.some(call => call.path.endsWith("/files/content")), { timeout: 30_000 }).toBe(true);
    await expect.poll(async () => (await request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.busy, { timeout: 30_000 }).toBe(false);
    expect(fake.calls.some(call => call.path.endsWith("/exec") && call.body.cmd?.includes("printf wiring-fixture"))).toBe(true);
    expect(fake.calls.filter(call => call.path.endsWith("/exec")).every(call => call.body.envs.DISPLAY === ":1")).toBe(true);
    expect(fake.calls.every(call => call.headers["x-api-key"] === env.INSTABOX_API_KEY)).toBe(true);
    expect(JSON.stringify(fake.calls.map(call => call.body))).not.toContain("instabox-e2e-fixture");
    expect((await request("POST", path + "/computer/screenshot", {})).body).toMatchObject({ format: "jpeg", png: expect.any(String) });
    expect((await request("POST", path + "/computer/join", {})).body.joinUrl).toContain("vps%2F" + bot.id);
    expect((await request("GET", `/api/desktop-viewer/vps/${bot.id}`)).body).toEqual({ password: null });
    socket = new WebSocket(app.url.replace("http:", "ws:") + `/api/desktop-viewer/vps/${bot.id}/websockify`, { origin: app.url });
    const handshake = await new Promise<string>((resolve, reject) => { socket!.once("message", bytes => resolve(bytes.toString())); socket!.once("error", reject); });
    expect(handshake).toBe("RFB 003.008\n");
    expect(fake.vncRequests[0]["x-api-key"]).toBe(env.INSTABOX_API_KEY);
    const snapshots = path + "/instabox/snapshots";
    const start = fake.calls.length;
    const saved = await request("POST", snapshots, {});
    expect(saved.status).toBe(201);
    expect(fake.calls.slice(start).some(call => call.path.startsWith("/v1/operations/"))).toBe(true);
    expect(fake.calls.slice(start).some(call => call.method === "GET" && call.path === "/v1/snapshots")).toBe(true);
    expect((await request("GET", snapshots)).body.snapshots).toEqual([saved.body.snapshot]);
    const beforeRestore = fake.calls.length;
    expect((await request("POST", `${snapshots}/${saved.body.snapshot.id}/restore`, {})).status).toBe(200);
    expect(fake.calls.slice(beforeRestore).some(call => call.path.endsWith("/desktop"))).toBe(true);
    const closed = new Promise<void>(resolve => socket!.once("close", () => resolve()));
    expect((await request("POST", path + "/computer/remove", {})).status).toBe(200);
    expect((await request("POST", path + "/computer/provision", {})).status).toBe(200);
    await closed;
    expect(fake.machines.size).toBe(2);
    expect((await request("DELETE", path)).status).toBe(200);
    expect([...fake.machines.values()].every(machine => machine.state === "deleted")).toBe(true);
    for (const file of [app.logPath, join(app.dataDir, "fake-claude-dump.json"), app.planPath + ".evidence.jsonl"]) {
      expect(readFileSync(file, "utf8")).not.toContain("instabox-e2e-fixture");
    }
  } finally { socket?.terminate(); await f.close(); }
}, 120_000);

it.each(["box", "vps"])("keeps %s computer and snapshot/viewer paths away from InstaBox", async backend => {
  const backends = await wiringBackendsFixture();
  const f = await fixture(backends.env);
  try {
    expect((await f.request("PUT", "/api/config", { instabox: { apiKey: "instabox-e2e-fixture-file" }, box: { token: "boat-e2e-fixture" }, vps: { sshAlias: "fixture-vps" } })).status).toBe(200);
    const bot = (await f.request("POST", "/api/bots", { computer: "cloud", cloudBackend: backend, modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } })).body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await f.request("PATCH", path, { computer: "cloud", cloudBackend: backend })).status).toBe(200);
    await f.request("GET", path + "/computer");
    writeFileSync(f.app.planPath, JSON.stringify({ [bot.id]: { steps: [
      { server: "computer", tool: "exec", arguments: { command: "printf backend-fixture" } },
    ], reply: "Backend complete." } }));
    expect((await f.request("POST", path + "/messages", { text: "Use the computer.", threadId: bot.threadId })).status).toBe(202);
    await expect.poll(() => backends.calls.some(call => backend === "box"
      ? call.path.endsWith("/commands") && call.body.command?.includes("printf backend-fixture")
      : call.path === "/vps/exec" && call.body.arguments?.command === "printf backend-fixture"), { timeout: 30_000 }).toBe(true);
    await expect.poll(async () => (await f.request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.busy, { timeout: 20_000 }).toBe(false);
    expect((await f.request("GET", path + "/instabox/snapshots")).status).toBe(404);
    await f.request("GET", `/api/desktop-viewer/vps/${bot.id}`);
    expect(f.fake.calls).toEqual([]);
    expect(f.fake.vncRequests).toEqual([]);
  } finally { await f.close(); await backends.close(); }
}, 60_000);

it.each(["direct", "group"])("excludes snapshot restore and %s turns in both directions", async kind => {
  const f = await fixture();
  const holds: Array<{ release(): void }> = [];
  try {
    await f.request("PUT", "/api/config", { instabox: { apiKey: "instabox-e2e-fixture" } });
    const bot = (await f.request("POST", "/api/bots", { name: "Lifecycle fixture", modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } })).body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await f.request("PATCH", path, { computer: "cloud", cloudBackend: "instabox" })).status).toBe(200);
    expect((await f.request("POST", path + "/computer/provision", {})).status).toBe(200);
    const saved = await f.request("POST", path + "/instabox/snapshots", {});
    expect(saved.status).toBe(201);
    const restore = `${path}/instabox/snapshots/${saved.body.snapshot.id}/restore`;
    const room = kind === "group" ? (await f.request("POST", "/api/groups", { name: "Lifecycle room", botIds: [bot.id] })).body.group : null;
    const messages = room ? `/api/groups/${room.id}/messages` : path + "/messages";
    writeFileSync(f.app.planPath, JSON.stringify({ [bot.id]: { steps: [
      { server: "computer", tool: "exec", arguments: { command: "printf lifecycle-fixture" } },
    ], reply: "Lifecycle complete." } }));
    const exec = f.fake.holdNext("POST", "/v1/machines/machine-1/exec"); holds.push(exec);
    expect((await f.request("POST", messages, { text: "Use the computer.", threadId: room?.threadId ?? bot.threadId })).status).toBe(202);
    await exec.reached;
    const before = f.fake.calls.length;
    expect((await f.request("POST", restore, {})).status).toBe(409);
    expect(f.fake.calls.slice(before).some(call => call.path.endsWith("/restore"))).toBe(false);
    exec.release();
    await expect.poll(async () => {
      const state = (await f.request("GET", "/api/bots")).body;
      return room ? state.groups.find((entry: { id: string }) => entry.id === room.id)?.working : state.bots.find((entry: { id: string }) => entry.id === bot.id)?.busy;
    }, { timeout: 30_000 }).toBe(false);
    const heldRestore = f.fake.holdNext("POST", "/v1/machines/machine-1/restore"); holds.push(heldRestore);
    const restoring = f.request("POST", restore, {});
    await heldRestore.reached;
    const execCount = f.fake.calls.filter(call => call.path.endsWith("/exec")).length;
    expect((await f.request("POST", messages, { text: "Try during restore.", threadId: room?.threadId ?? bot.threadId })).status).toBe(409);
    expect((await f.request("DELETE", path)).status).toBe(409);
    expect((await f.request("POST", path + "/computer/control", { action: "take" })).status).toBe(409);
    expect(f.fake.calls.filter(call => call.path.endsWith("/exec"))).toHaveLength(execCount);
    heldRestore.release();
    expect((await restoring).status).toBe(200);
    expect((await f.request("POST", path + "/computer/control", { action: "take" })).status).toBe(200);
    expect((await f.request("POST", restore, {})).status).toBe(409);
    expect((await f.request("POST", path + "/computer/control", { action: "release" })).status).toBe(200);
    expect((await f.request("POST", restore, {})).status).toBe(200);
  } finally { for (const hold of holds) hold.release(); await f.close(); }
}, 90_000);

it("does not recreate a deleted machine when the viewer opens before bot deletion finishes", async () => {
  const f = await fixture();
  const holds: Array<{ release(): void }> = [];
  try {
    await f.request("PUT", "/api/config", { instabox: { apiKey: "instabox-e2e-fixture" } });
    const bot = (await f.request("POST", "/api/bots", { name: "Deletion fixture" })).body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await f.request("PATCH", path, { computer: "cloud", cloudBackend: "instabox" })).status).toBe(200);
    expect((await f.request("POST", path + "/computer/provision", {})).status).toBe(200);
    const deleting = f.fake.holdNext("DELETE", "/v1/machines/machine-1", true); holds.push(deleting);
    const deletion = f.request("DELETE", path);
    await deleting.reached;
    const operation = [...f.fake.operations.values()].find(op => op.finalState === "deleted")!;
    operation.polls = 1;
    const deleted = f.fake.holdNext("GET", `/v1/operations/${operation.id}`, true); holds.push(deleted);
    deleting.release();
    await deleted.reached;
    expect(f.fake.machines.get("machine-1")?.state).toBe("deleted");
    expect((await f.request("GET", "/api/bots")).body.bots.some((entry: { id: string }) => entry.id === bot.id)).toBe(true);
    expect((await f.request("GET", `/api/desktop-viewer/vps/${bot.id}`)).status).toBe(409);
    expect(f.fake.machines.size).toBe(1);
    deleted.release();
    expect((await deletion).status).toBe(200);
    expect((await f.request("GET", `/api/desktop-viewer/vps/${bot.id}`)).status).toBe(404);
    expect([...f.fake.machines.values()].every(machine => machine.state === "deleted")).toBe(true);
  } finally { for (const hold of holds) hold.release(); await f.close(); }
}, 60_000);
