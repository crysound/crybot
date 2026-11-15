import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InstaboxMachines } from "../instabox/machine.ts";
import { json, readBody } from "../harness/http.ts";
import { fakeInstaboxSnapshots } from "../testing/fake-instabox-snapshots.ts";
import { createInstaboxSnapshotRoutes } from "./instabox-snapshots.ts";
import { createConfigRoutes, type ConfigRouteDeps } from "./config.ts";
import { PASS } from "./table.ts";

const botId = "bot-snapshots-one";
const basePath = `/api/bots/${botId}/instabox/snapshots`;
let fake: Awaited<ReturnType<typeof fakeInstaboxSnapshots>>;
let server: Server;
let base: string;
let configured = true;
let machineId: string | null = "machine-one";
const ensureRunning = vi.fn(async () => ({ id: "machine-one", name: "fixture", state: "running" as const, template: "linux" as const }));

beforeEach(async () => {
  vi.stubEnv("INSTABOX_API_KEY", "");
  configured = true;
  machineId = "machine-one";
  ensureRunning.mockClear();
  fake = await fakeInstaboxSnapshots();
  const route = createInstaboxSnapshotRoutes({
    request: () => configured ? fake.request : null,
    machines: () => configured ? { ensureRunning, find: async () => null } as unknown as InstaboxMachines : null,
    machineIdFor: async () => machineId,
    botExists: (id) => id === botId,
    claim: () => () => {},
  });
  const configRoute = createConfigRoutes({ cfg: { instabox: { apiKey: "fixture-only-key" } }, configStatus: () => ({ instabox: { apiKey: "never-return-this", last4: "this" } }), configForAccess: (status: unknown) => status } as unknown as ConfigRouteDeps);
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, base);
    const result = await (url.pathname === "/api/config" ? configRoute : route)({ req, res, url, path: url.pathname, method: req.method!, json, readBody,
      auth: { kind: "loopback", scopes: req.headers["x-fixture-role"] === "client" ? ["client"] : ["admin", "client"] } });
    if (result === PASS) json(res, 404, { error: "no route" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture address");
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => { server.close((error) => error ? reject(error) : resolve()); server.closeAllConnections(); });
  await fake.close();
  vi.unstubAllEnvs();
});

const send = (path = basePath, method = "GET", body?: unknown, headers?: Record<string, string>) => fetch(base + path, {
  method, headers: { origin: base, "content-type": "application/json", ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const ownSnapshot = () => fake.snapshots.set("own", { id: "own", name: "crybot-bot-snapshot-backup", status: "ready", sourceMachineId: "machine-one" });

describe("isolated InstaBox snapshot HTTP routes", () => {
  it("lists only owned snapshots by metadata or prefix and never relays metadata", async () => {
    ownSnapshot();
    fake.snapshots.set("meta", { id: "meta", name: "backup", status: "ready", sourceMachineId: "machine-one", metadata: { app: "crybot", botId } });
    fake.snapshots.set("other", { id: "other", name: "crybot-bot-snapshot-spoof", status: "ready", sourceMachineId: "machine-one", metadata: { botId: "other-bot" } });
    const response = await send();
    expect(response.status).toBe(200);
    const body = await response.json() as { snapshots: Array<{ id: string }> };
    expect(body.snapshots.map((s: { id: string }) => s.id)).toEqual(["own", "meta"]);
    expect(JSON.stringify(body)).not.toContain("metadata");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("saves normalized unique names, waits for ready, restores then starts the desktop, and deletes", async () => {
    const ids: string[] = [];
    const names: string[] = [];
    for (let n = 0; n < 2; n++) {
      const response = await send(basePath, "POST", { name: "HELLO 世界 !!! ".repeat(10) });
      expect(response.status).toBe(201);
      const { snapshot } = await response.json() as { snapshot: { id: string; name: string; state: string } };
      ids.push(snapshot.id); names.push(snapshot.name);
      expect(snapshot.state).toBe("ready");
      expect(snapshot.name).toMatch(/^[a-z0-9-]{1,63}$/);
      expect(snapshot.name.startsWith("crybot-bot-snapshot-")).toBe(true);
    }
    expect(names[0]).not.toBe(names[1]);
    expect(fake.calls.some(call => call.path.startsWith("/v1/operations/"))).toBe(true);
    expect(fake.calls.some(call => call.method === "GET" && call.path === "/v1/snapshots")).toBe(true);
    expect((await send(`${basePath}/${ids[0]}/restore`, "POST")).status).toBe(200);
    expect(ensureRunning).toHaveBeenCalledWith(botId);
    const restore = fake.calls.find((call) => call.path.endsWith("/restore"));
    expect(restore?.body).toEqual({ snapshotId: ids[0], desiredState: "running" });
    expect(fake.calls.some((call) => call.path.startsWith("/v1/operations/"))).toBe(true);
    expect((await send(`${basePath}/${ids[0]}`, "DELETE")).status).toBe(200);
    expect(fake.snapshots.has(ids[0]!)).toBe(false);
    expect(fake.calls.every((call) => !!call.idempotency)).toBe(true);
  });

  it("accepts a snapshot object when the create endpoint returns one", async () => {
    fake.setCreateResponse("snapshot");
    const response = await send(basePath, "POST", { name: "direct-shape" });
    expect(response.status).toBe(201);
    const { snapshot } = await response.json() as { snapshot: { id: string; name: string; state: string } };
    expect(snapshot.name).toContain("direct-shape");
    expect(snapshot.state).toBe("ready");
    expect(fake.calls.some((call) => call.path.startsWith("/v1/operations/"))).toBe(false);
  });

  it.each(["DELETE", "POST"])("refuses another bot's snapshot before %s", async (method) => {
    fake.snapshots.set("other", { id: "other", name: "crybot-other-bot-backup", status: "ready", sourceMachineId: "machine-one", metadata: { botId: "other-bot" } });
    const response = await send(`${basePath}/other${method === "POST" ? "/restore" : ""}`, method);
    expect(response.status).toBe(403);
    expect(fake.calls).toHaveLength(1);
    expect(fake.snapshots.has("other")).toBe(true);
    expect(ensureRunning).not.toHaveBeenCalled();
  });

  it("returns only configured/source flags for the shared key, including environment overrides", async () => {
    expect(await (await send("/api/config")).json()).toEqual({ instabox: { configured: true, fromEnv: false } });
    vi.stubEnv("INSTABOX_API_KEY", "fixture-environment-key");
    expect(await (await send("/api/config")).json()).toEqual({ instabox: { configured: true, fromEnv: true } });
    for (const apiKey of ["", "replacement-fixture"]) {
      const response = await send("/api/config", "PUT", { instabox: { apiKey } });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: "instabox_key_env" });
    }
  });

  it("rejects malformed InstaBox key patches before attempting to save", async () => {
    for (const instabox of [null, { apiKey: 2 }, { apiKey: "fixture", unexpected: true }]) {
      expect((await send("/api/config", "PUT", { instabox })).status).toBe(400);
    }
  });

  it("rejects a missing key clearly without provider calls", async () => {
    configured = false;
    const response = await send();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "instabox_key_missing" });
    expect(fake.calls).toHaveLength(0);
  });

  it("requires admin and same origin even for reads", async () => {
    expect((await send(basePath, "GET", undefined, { "x-fixture-role": "client" })).status).toBe(403);
    expect((await send(basePath, "POST", {}, { origin: "https://example.org" })).status).toBe(403);
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects unknown bots, invalid names and absent machines", async () => {
    expect((await send("/api/bots/unknown/instabox/snapshots")).status).toBe(404);
    expect((await send(basePath, "POST", { name: 5 })).status).toBe(400);
    machineId = null;
    expect((await send(basePath, "POST", {})).status).toBe(409);
    expect(fake.calls).toHaveLength(0);
  });

  it("lists an empty set before a machine exists but still reports a real provider failure", async () => {
    machineId = null;
    expect(await (await send()).json()).toEqual({ snapshots: [] });
    expect(fake.calls).toHaveLength(0);
    machineId = "machine-one";
    fake.failNext();
    const response = await send();
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "instabox_snapshot_upstream" });
  });

  it("does not expose provider errors and unlocks for retry", async () => {
    fake.failNext();
    const response = await send(basePath, "POST", {});
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sensitive-upstream-detail");
    expect((await send(basePath, "POST", {})).status).toBe(201);
  });

  it.each([["busy", "instabox_snapshot_busy"], ["refused", "instabox_snapshot_conflict"]] as const)("distinguishes an upstream %s conflict", async (kind, code) => {
    fake.conflict(kind);
    const response = await send(basePath, "POST", {});
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code });
  });

  it("reports failed snapshots and restore operations without starting the desktop", async () => {
    fake.failSnapshot();
    expect((await send(basePath, "POST", {})).status).toBe(502);
    ownSnapshot();
    fake.failOperation();
    expect((await send(`${basePath}/own/restore`, "POST")).status).toBe(502);
    expect(ensureRunning).toHaveBeenCalled();
  });
});
