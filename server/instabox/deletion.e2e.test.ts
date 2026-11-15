import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";
import { launchRestartableServer } from "../testing/restartable-server.ts";

it.each([
  { keySource: "environment", backend: "instabox" },
  { keySource: "config", backend: "instabox" },
  { keySource: "environment", backend: "box" },
  { keySource: "config", backend: "vps" },
])("keeps a $backend bot after losing its $keySource key and restarting, then retries cleanup", async ({ keySource, backend }) => {
  const fake = await fakeInstaboxCore();
  const env = { INSTABOX_API_KEY: keySource === "environment" ? "deletion-fixture-key" : "", CRYBOT_TEST_INSTABOX_API: fake.url, FAKE_CLAUDE_MODE: "hang" };
  const app = await launchRestartableServer({ env });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(app.url + path, { method, headers: { origin: app.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000) });
    return { status: response.status, body: await response.json() as any };
  };
  const records = () => JSON.parse(readFileSync(join(app.dataDir, "instabox-machines.json"), "utf8"));
  try {
    if (keySource === "config") expect((await request("PATCH", "/api/config", { instabox: { apiKey: "deletion-fixture-key" } })).status).toBe(200);
    const created = await request("POST", "/api/bots", { name: "Deletion fixture" });
    expect(created.status).toBe(201);
    const botId = created.body.bot.id;
    const path = `/api/bots/${botId}`;
    const provisioned = await request("POST", `${path}/computer/provision`, {});
    expect(provisioned.status).toBe(200);
    const machineId = provisioned.body.machine.id;
    expect(records()).toEqual([[botId, machineId, createHash("sha256").update("deletion-fixture-key").digest("hex").slice(0, 16)]]);
    if (backend !== "instabox") expect((await request("PATCH", path, { cloudBackend: backend })).status).toBe(200);
    if (keySource === "config") {
      expect((await request("PATCH", "/api/config", { instabox: { apiKey: "" } })).status).toBe(200);
      if (backend === "instabox") expect((await request("GET", `${path}/computer`)).body.configured).toBe(false);
      expect((await request("DELETE", path)).status).toBe(503);
      expect(records()).toEqual([[botId, machineId, createHash("sha256").update("deletion-fixture-key").digest("hex").slice(0, 16)]]);
    }
    await app.stop();
    env.INSTABOX_API_KEY = "";
    await app.start();
    const callsBeforeDelete = fake.calls.length;
    expect(await request("DELETE", path)).toMatchObject({ status: 503, body: { error: expect.stringMatching(/Restore the InstaBox API key before deleting/) } });
    expect((await request("GET", "/api/bots")).body.bots.some((bot: { id: string }) => bot.id === botId)).toBe(true);
    expect(records()).toEqual([[botId, machineId, createHash("sha256").update("deletion-fixture-key").digest("hex").slice(0, 16)]]);
    expect(fake.machines.get(machineId)?.state).not.toBe("deleted");
    expect(fake.calls).toHaveLength(callsBeforeDelete);
    const unused = await request("POST", "/api/bots", { name: "Never provisioned" });
    expect(unused.status).toBe(201);
    expect(await request("DELETE", `/api/bots/${unused.body.bot.id}`)).toMatchObject({ status: 200, body: { ok: true } });
    expect(fake.calls).toHaveLength(callsBeforeDelete);
    const checkBusy = keySource === "environment" && backend === "instabox";
    const busy = async () => (await request("GET", "/api/bots")).body.bots.find((bot: { id: string }) => bot.id === botId)?.busy;
    if (checkBusy) {
      expect((await request("PATCH", path, { computer: "off" })).status).toBe(200);
      expect((await request("POST", `${path}/messages`, { text: "Hold this local turn.", threadId: created.body.bot.threadId })).status).toBe(202);
      await expect.poll(busy).toBe(true);
      expect(await request("DELETE", path)).toMatchObject({ status: 503, body: { error: expect.stringMatching(/Restore the InstaBox API key/) } });
      expect((await request("POST", `${path}/interrupt`, { threadId: created.body.bot.threadId })).status).toBe(200);
      await expect.poll(busy).toBe(false);
    }
    expect((await request("PATCH", "/api/config", { instabox: { apiKey: "deletion-fixture-key" } })).status).toBe(200);
    fake.failNext({ status: 503, code: "fixture_unavailable" });
    expect((await request("DELETE", path)).status).toBe(503);
    expect(records()).toEqual([[botId, machineId, createHash("sha256").update("deletion-fixture-key").digest("hex").slice(0, 16)]]);
    expect((await request("GET", "/api/bots")).body.bots.some((bot: { id: string }) => bot.id === botId)).toBe(true);
    expect(await request("DELETE", path)).toMatchObject({ status: 200, body: { ok: true } });
    expect(fake.machines.get(machineId)?.state).toBe("deleted");
    expect(records()).toEqual([]);
  } finally { await app.close(); await fake.close(); }
}, 90_000);

it.each(["other-account", "same-key-missing", "same-key-deleted"])("verifies recorded cleanup after an empty inventory: %s", async scenario => {
  const original = await fakeInstaboxCore();
  const other = await fakeInstaboxCore();
  const env = { INSTABOX_API_KEY: "", CRYBOT_TEST_INSTABOX_API: original.url };
  const app = await launchRestartableServer({ env });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(app.url + path, { method, headers: { origin: app.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000) });
    return { status: response.status, body: await response.json() as any };
  };
  const records = () => readFileSync(join(app.dataDir, "instabox-machines.json"), "utf8");
  try {
    expect((await request("PATCH", "/api/config", { instabox: { apiKey: "other-fixture-key" } })).status).toBe(200);
    await app.stop();
    env.INSTABOX_API_KEY = "original-fixture-key";
    await app.start();
    const created = await request("POST", "/api/bots", { name: "Recorded cleanup fixture" });
    expect(created.status).toBe(201);
    const botId = created.body.bot.id;
    const path = `/api/bots/${botId}`;
    const provisioned = await request("POST", `${path}/computer/provision`, {});
    expect(provisioned.status).toBe(200);
    const machineId = provisioned.body.machine.id;
    const recorded = records();
    const fingerprint = createHash("sha256").update(env.INSTABOX_API_KEY).digest("hex").slice(0, 16);
    expect(JSON.parse(recorded)).toEqual([[botId, machineId, fingerprint]]);
    await app.stop();
    if (scenario === "other-account") {
      env.INSTABOX_API_KEY = "";
      env.CRYBOT_TEST_INSTABOX_API = other.url;
    } else if (scenario === "same-key-missing") original.machines.clear();
    else original.machines.get(machineId)!.state = "deleted";
    await app.start();
    const active = scenario === "other-account" ? other : original;
    const before = active.calls.length;
    const deletion = await request("DELETE", path);
    expect(active.calls.slice(before).map(call => [call.method, call.path])).toEqual([
      ["GET", "/v1/machines"], ["GET", `/v1/machines/${machineId}`],
    ]);
    expect([...original.calls, ...other.calls].filter(call => call.method === "DELETE")).toHaveLength(0);
    const botExists = (await request("GET", "/api/bots")).body.bots.some((bot: { id: string }) => bot.id === botId);
    if (scenario === "other-account") {
      expect(deletion).toMatchObject({ status: 503, body: { error: expect.stringContaining("created with another InstaBox API key") } });
      expect(deletion.body.error).toContain("Restore the original key before deleting");
      expect(records()).toBe(recorded);
      expect(botExists).toBe(true);
      expect(original.machines.get(machineId)?.state).not.toBe("deleted");
      await app.stop();
      env.INSTABOX_API_KEY = "original-fixture-key";
      env.CRYBOT_TEST_INSTABOX_API = original.url;
      await app.start();
      expect((await request("DELETE", path)).status).toBe(200);
      expect(original.machines.get(machineId)?.state).toBe("deleted");
      expect(JSON.parse(records())).toEqual([]);
    } else {
      expect(deletion).toMatchObject({ status: 200, body: { ok: true } });
      expect(botExists).toBe(false);
      expect(JSON.parse(records())).toEqual([]);
    }
  } finally { await app.close(); await original.close(); await other.close(); }
}, 90_000);
