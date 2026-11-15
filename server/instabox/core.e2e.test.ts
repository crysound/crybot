import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { launchVerificationServer } from "../../scripts/control-cry.ts";
import { launchRestartableServer } from "../testing/restartable-server.ts";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";
import { cloudPairingSignature } from "../cloud-home.ts";
import { VPS_CONTAINER_LABEL, VPS_ENVIRONMENT_LABEL, VPS_MANAGED_LABEL, vpsContainerName } from "../vps-computer.ts";

const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEA", "base64");

async function fakeBoatCore() {
  const boats = new Map<string, { id: string; name: string; state: string }>();
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  let sequence = 0;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://fixture");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ method: req.method ?? "GET", path: url.pathname, body });
    res.setHeader("content-type", "application/json");
    const reply = (status: number, value: unknown) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (url.pathname === "/sandboxes" && req.method === "GET") return reply(200, { sandboxes: [...boats.values()] });
    if (url.pathname === "/sandboxes" && req.method === "POST") {
      const id = ["bx_23456789", "bx_abcdefgh", "bx_jkmnpqrs"][sequence++] ?? "bx_23456789";
      boats.set(id, { id, name: `fixture-${id}`, state: "ready" });
      return reply(202, { sandbox: boats.get(id) });
    }
    const match = /^\/sandboxes\/([^/]+)(?:\/(.*))?$/.exec(url.pathname);
    if (!match) return reply(404, { error: "not found" });
    const boat = boats.get(match[1]!);
    if (!boat) return reply(404, { error: "not found" });
    if (!match?.[2] && req.method === "GET") return reply(200, { sandbox: boat });
    if (!match?.[2] && req.method === "PATCH") { boat.name = String((body as { name?: unknown })?.name ?? boat.name); return reply(200, { sandbox: boat }); }
    if (!match?.[2] && req.method === "DELETE") { boats.delete(boat.id); return reply(202, { ok: true }); }
    if (match[2] === "desktop") return reply(200, { desktopUrl: "https://fixture.invalid/desktop" });
    if (match[2] === "commands") return reply(200, { exitCode: 0, stdout: "captured", stderr: "" });
    if (match[2] === "artifacts") { res.writeHead(200, { "content-type": "image/jpeg" }); return res.end(JPEG); }
    if (match[2] === "files") return reply(200, { content: JPEG.toString("base64") });
    return reply(404, { error: "not found" });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake Boat failed to listen");
  return {
    url: `http://127.0.0.1:${address.port}`,
    calls,
    boats,
    close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}

it("boots an isolated InstaBox bot, persists its backend, suspends on switching, and deletes its retained machine", async () => {
  const fake = await fakeInstaboxCore();
  const env = { INSTABOX_API_KEY: "instabox-e2e-fixture", CRYBOT_TEST_INSTABOX_API: fake.url };
  const fixture = await launchRestartableServer({ env });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method,
      headers: { origin: fixture.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000),
    });
    const result = { status: response.status, body: await response.json() as any };
    expect(JSON.stringify(result)).not.toContain("instabox-e2e-fixture");
    return result;
  };
  try {
    const created = await request("POST", "/api/bots", { name: "InstaBox fixture", modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } });
    expect(created.status).toBe(201);
    const bot = created.body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    expect((await request("GET", `${path}/computer`)).body).toMatchObject({ backend: "instabox", configured: true, ready: false, machine: null });
    expect((await request("POST", `${path}/messages`, { text: "Say hello.", threadId: bot.threadId })).status).toBe(202);
    await expect.poll(() => fake.desktop.size, { timeout: 20_000 }).toBe(1);
    await expect.poll(async () => (await request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.busy, { timeout: 20_000 }).toBe(false);
    expect((await request("POST", `${path}/computer/provision`, {})).body.machine).toMatchObject({ state: "running", template: "linux" });
    expect(fake.desktop.size).toBe(1);
    expect(readFileSync(join(fixture.dataDir, "fake-claude-dump.json"), "utf8")).not.toContain("instabox-e2e-fixture");
    expect((await request("GET", `${path}/computer`)).body).toMatchObject({ backend: "instabox", ready: true });
    await fixture.stop();
    await fixture.start();
    expect((await request("GET", `${path}/computer`)).body.backend).toBe("instabox");
    expect((await request("PATCH", path, { cloudBackend: "box" })).status).toBe(200);
    await expect.poll(() => [...fake.machines.values()][0]?.state, { timeout: 20_000 }).toBe("suspended");
    expect((await request("PATCH", path, { cloudBackend: "instabox" })).status).toBe(200);
    const provisioned = await request("POST", `${path}/computer/provision`, {});
    expect(provisioned.status, JSON.stringify(provisioned.body)).toBe(200);
    expect(fake.machines.size).toBe(1);
    expect((await request("DELETE", path)).status).toBe(200);
    expect([...fake.machines.values()][0].state).toBe("deleted");
    expect(fake.calls.find(call => call.method === "DELETE")?.headers["x-confirm-delete"]).toBe("machine-1");
    const missing = await request("POST", "/api/bots", { name: "No key fixture", modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } });
    const missingPath = `/api/bots/${missing.body.bot.id}`;
    await request("PATCH", missingPath, { cloudBackend: "instabox", computer: "cloud" });
    await fixture.stop();
    env.INSTABOX_API_KEY = "";
    await fixture.start();
    expect((await request("GET", `${missingPath}/computer`)).body).toMatchObject({ backend: "instabox", configured: false, problem: "Add an InstaBox API key to use this computer." });
    const callsBeforeMissingProvision = fake.calls.length;
    expect(await request("POST", `${missingPath}/computer/provision`, {})).toMatchObject({ status: 409, body: { error: "Add an InstaBox API key to use this computer.", errorKey: "serverError.instabox.keyMissing" } });
    expect(fake.calls.slice(callsBeforeMissingProvision).some(call => call.path === "/v1/machines")).toBe(false);
    expect(readFileSync(fixture.logPath, "utf8")).not.toContain("instabox-e2e-fixture");
  } finally { await fixture.close(); await fake.close(); }
}, 90_000);

it.each(["vps", "instabox"] as const)("forces %s onto Boat for a run_on=cloud routine", async backend => {
  const fake = await fakeInstaboxCore();
  const boat = await fakeBoatCore();
  const fixture = await launchVerificationServer({
    INSTABOX_API_KEY: "run-on-fixture", CRYBOT_TEST_INSTABOX_API: fake.url, FAKE_CLAUDE_USES_CLOUD_COMPUTER: "1",
  }, undefined, undefined, undefined, undefined, [], boat.url);
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.info.url + path, { method, headers: { origin: fixture.info.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots", { modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } })).body.bot;
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: backend, computer: "cloud" })).status).toBe(200);
    const routine = (await request("POST", "/api/routines", {
      name: `${backend} cloud fixture`, prompt: "Use the cloud computer.", botId: bot.id, runOn: "cloud",
      schedule: { type: "once", at: Date.now() + 60_000 },
    })).body.routine;
    expect((await request("POST", `/api/routines/${routine.id}/run`)).status).toBe(201);
    await expect.poll(async () => (await request("GET", "/api/routines")).body.runs.find((run: { routineId: string }) => run.routineId === routine.id)?.status,
      { timeout: 20_000 }).toBe("completed");
    expect(boat.calls.some(call => call.method === "POST" && call.path === "/sandboxes")).toBe(true);
    expect(fake.calls.some(call => call.method === "POST" && call.path === "/v1/machines")).toBe(false);
    await request("DELETE", `/api/bots/${bot.id}`);
  } finally { await fixture.close(); await fake.close(); await boat.close(); }
}, 60_000);

it("refuses an InstaBox cloud routine when the fixture offers no cloud provider", async () => {
  const fake = await fakeInstaboxCore();
  const fixture = await launchRestartableServer({ env: { INSTABOX_API_KEY: "no-cloud-fixture", CRYBOT_TEST_INSTABOX_API: fake.url } });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method, headers: { origin: fixture.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots")).body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    const routine = (await request("POST", "/api/routines", { name: "No cloud fixture", prompt: "Use the cloud computer.", botId: bot.id,
      runOn: "cloud", schedule: { type: "once", at: Date.now() + 60_000 } })).body.routine;
    expect((await request("POST", `/api/routines/${routine.id}/run`)).status).toBe(201);
    await expect.poll(async () => (await request("GET", "/api/routines")).body.runs.find((run: { routineId: string }) => run.routineId === routine.id)?.status,
      { timeout: 20_000 }).toBe("failed");
    expect(fake.calls.some(call => call.path === "/v1/machines")).toBe(false);
  } finally { await fixture.close(); await fake.close(); }
}, 60_000);

it.each(["vps", "instabox"] as const)("checks run_on=cloud %s turns against the box policy before mounting cloud computers", async backend => {
  const fake = await fakeInstaboxCore();
  const boat = await fakeBoatCore();
  const fixture = await launchVerificationServer({
    INSTABOX_API_KEY: "policy-fixture", CRYBOT_TEST_INSTABOX_API: fake.url,
    CRYBOT_TEST_DESKTOP_OWNER_TOKEN: "a".repeat(43),
    CRYBOT_TEST_DESKTOP_POLICY_DELAY_MS: "5000",
    CRYBOT_TEST_DESKTOP_POLICY: JSON.stringify({ organizationId: "fixture-org", organizationName: "Fixture Agency", expiresAt: null,
      version: 1, companyModelsOnly: false, allowedEngines: "all", mcp: { allowCustom: true, allowlist: [] },
      computers: { thisComputer: true, localVm: true, box: false, vps: true }, remoteAccess: true }),
  }, undefined, undefined, undefined, undefined, [], boat.url);
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.info.url + path, { method, headers: { origin: fixture.info.url, "Content-Type": "application/json", "x-crybot-desktop-owner": "a".repeat(43) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const created = await request("POST", "/api/bots", { settings: { computer: "off", cloudBackend: backend } });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const bot = created.body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { cloudBackend: backend, computer: "cloud" })).status).toBe(200);
    await new Promise(resolve => setTimeout(resolve, 6_000));
    const routine = (await request("POST", "/api/routines", { name: "Policy fixture", prompt: "Use the cloud computer.", botId: bot.id,
      runOn: "cloud", schedule: { type: "once", at: Date.now() + 60_000 } })).body.routine;
    expect((await request("POST", `/api/routines/${routine.id}/run`)).status).toBe(201);
    await expect.poll(async () => (await request("GET", "/api/routines")).body.runs.find((run: { routineId: string }) => run.routineId === routine.id)?.status,
      { timeout: 20_000 }).toBe("failed");
    expect(fake.calls.some(call => call.path === "/v1/machines")).toBe(false);
    expect(boat.calls.some(call => call.method === "POST" && call.path === "/sandboxes")).toBe(false);
  } finally { await fixture.close(); await fake.close(); await boat.close(); }
}, 60_000);

it("refuses a normal InstaBox turn under the managed box policy before any machine request", async () => {
  const fake = await fakeInstaboxCore();
  const owner = "a".repeat(43);
  const fixture = await launchVerificationServer({
    INSTABOX_API_KEY: "normal-policy-fixture", CRYBOT_TEST_INSTABOX_API: fake.url,
    CRYBOT_TEST_DESKTOP_OWNER_TOKEN: owner, CRYBOT_TEST_DESKTOP_POLICY_DELAY_MS: "5000",
    CRYBOT_TEST_DESKTOP_POLICY: JSON.stringify({ organizationId: "fixture-org", organizationName: "Fixture Agency", expiresAt: null,
      version: 1, companyModelsOnly: false, allowedEngines: "all", mcp: { allowCustom: true, allowlist: [] },
      computers: { thisComputer: true, localVm: true, box: false, vps: true }, remoteAccess: true }),
  });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.info.url + path, { method,
      headers: { origin: fixture.info.url, "Content-Type": "application/json", "x-crybot-desktop-owner": owner },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const created = await request("POST", "/api/bots", { computer: "off", modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } });
    expect(created.status).toBe(201);
    const bot = created.body.bot;
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    await expect.poll(async () => (await request("GET", "/api/config")).body.managedPolicy?.computers?.box, { timeout: 10_000 }).toBe(false);
    expect((await request("POST", `/api/bots/${bot.id}/messages`, { text: "Use the cloud computer.", threadId: bot.threadId })).status).toBe(202);
    await expect.poll(async () => (await request("GET", `/api/threads/${bot.threadId}/messages`)).body.messages, { timeout: 20_000 })
      .toEqual(expect.arrayContaining([expect.objectContaining({ role: "bot", kind: "activity", turnSucceeded: false,
        tool: expect.objectContaining({ ok: false, name: "error: Fixture Agency does not allow bots to use cloud computers." }) })]));
    expect(fake.calls.filter(call => call.path.startsWith("/v1/machines"))).toEqual([]);
  } finally { await fixture.close(); await fake.close(); }
}, 60_000);

it("allows a normal InstaBox turn in a real Cloud home without using Boat", async () => {
  const fake = await fakeInstaboxCore();
  const boat = await fakeBoatCore();
  const secret = randomBytes(32).toString("base64url");
  const host = "cloud-home.example.test";
  const offlinePrelude = `data:text/javascript,${encodeURIComponent('const real = globalThis.fetch; globalThis.fetch = async (url, init) => String(url).startsWith("http://127.0.0.1:") ? real(url, init) : new Response("offline fixture", { status: 503 });')}`;
  const fixture = await launchRestartableServer({ env: {
    INSTABOX_API_KEY: "cloud-home-fixture", CRYBOT_TEST_INSTABOX_API: fake.url, CRYBOT_BOAT_API: boat.url,
    CRYBOT_CLOUD_ROLE: "home", CRYBOT_CLOUD_MACHINE_ID: "instabox-cloud-home-fixture",
    CRYBOT_CLOUD_ADMIN_URL: "https://cloud.example.test", CRYBOT_CLOUD_BOOTSTRAP_SECRET: secret,
    CRYBOT_PUBLIC_URL: `https://${host}`, NODE_OPTIONS: `--import=${offlinePrelude}`,
  } });
  let token = "";
  const headers = { host, "x-forwarded-for": "203.0.113.9", "x-forwarded-proto": "https", origin: `https://${host}`, "Content-Type": "application/json" };
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method, headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const body = JSON.stringify({ label: "Cloud fixture owner", ttlSeconds: 300 });
    const timestamp = String(Math.floor(Date.now() / 1000)), nonce = randomBytes(16).toString("base64url");
    const pairing = await fetch(`${fixture.url}/api/cloud/pairing`, { method: "POST", body, headers: { ...headers,
      "x-cry-cloud-timestamp": timestamp, "x-cry-cloud-nonce": nonce, "x-cry-cloud-signature": `v1=${cloudPairingSignature(secret, timestamp, nonce, body)}` } });
    expect(pairing.status).toBe(200);
    const paired = await request("POST", "/api/auth/pair", { code: (await pairing.json() as { code: string }).code });
    expect(paired.status).toBe(200);
    token = paired.body.token;
    expect((await request("GET", "/api/auth/session")).body.cloudHome).toBe(true);
    expect((await request("PATCH", "/api/config", { box: { token: "box_cloud_home_fixture" } })).status).toBe(200);
    const created = await request("POST", "/api/bots", { modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } });
    expect(created.status).toBe(201);
    const bot = created.body.bot;
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    const boatCallsBeforeTurn = boat.calls.length;
    expect((await request("POST", `/api/bots/${bot.id}/messages`, { text: "Say hello from the cloud computer.", threadId: bot.threadId })).status).toBe(202);
    await expect.poll(() => fake.desktop.size, { timeout: 20_000 }).toBe(1);
    await expect.poll(async () => (await request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.busy,
      { timeout: 20_000 }).toBe(false);
    const messages = (await request("GET", `/api/threads/${bot.threadId}/messages`)).body.messages;
    expect(messages).toEqual(expect.arrayContaining([expect.objectContaining({ role: "bot", kind: "text" })]));
    expect(messages.some((message: { turnSucceeded?: boolean }) => message.turnSucceeded === false)).toBe(false);
    expect(fake.calls.filter(call => call.method === "POST" && call.path === "/v1/machines")).toHaveLength(1);
    expect(boat.calls.slice(boatCallsBeforeTurn)).toEqual([]);
  } finally { await fixture.close(); await fake.close(); await boat.close(); }
}, 60_000);

it("keeps an Android agent usable when a normal turn does not specify a template", async () => {
  const fake = await fakeInstaboxCore();
  const fixture = await launchRestartableServer({ env: {
    INSTABOX_API_KEY: "android-turn-fixture", CRYBOT_TEST_INSTABOX_API: fake.url, FAKE_CLAUDE_USES_CLOUD_COMPUTER: "1",
  } });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method, headers: { origin: fixture.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots", { modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } })).body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    expect((await request("POST", `${path}/computer/provision`, { template: "android" })).body.machine.template).toBe("android");
    expect((await request("POST", `${path}/messages`, { text: "Use the cloud computer.", threadId: bot.threadId })).status).toBe(202);
    await expect.poll(async () => (await request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.busy,
      { timeout: 20_000 }).toBe(false);
    expect((await request("GET", `${path}/computer`)).body.machine.template).toBe("android");
    expect(fake.calls.filter(call => call.method === "POST" && call.path === "/v1/machines")).toHaveLength(1);
  } finally { await fixture.close(); await fake.close(); }
}, 60_000);

it("deletes a Boat machine owned by an agent switched to InstaBox", async () => {
  const fake = await fakeInstaboxCore();
  const boat = await fakeBoatCore();
  const fixture = await launchVerificationServer({ INSTABOX_API_KEY: "delete-boat-fixture", CRYBOT_TEST_INSTABOX_API: fake.url },
    undefined, undefined, undefined, undefined, [], boat.url);
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.info.url + path, { method, headers: { origin: fixture.info.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots")).body.bot;
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { cloudBackend: "box", computer: "cloud" })).status).toBe(200);
    const provisioned = await request("POST", `${path}/computer/provision`, {});
    expect(provisioned.status, JSON.stringify(provisioned.body)).toBe(200);
    expect(boat.boats.size).toBe(1);
    expect((await request("PATCH", path, { cloudBackend: "instabox" })).status).toBe(200);
    expect((await request("DELETE", path)).status).toBe(200);
    expect(boat.calls.some(call => call.method === "DELETE" && call.path.startsWith("/sandboxes/"))).toBe(true);
  } finally { await fixture.close(); await fake.close(); await boat.close(); }
}, 60_000);

it("deletes a VPS machine owned by an agent switched to InstaBox", async () => {
  const fake = await fakeInstaboxCore();
  const root = mkdtempSync(join(tmpdir(), "crybot-fake-vps-"));
  const binDir = join(root, "bin");
  mkdirSync(binDir);
  const detailPath = join(root, "detail.json");
  const deleteLog = join(root, "deleted.log");
  const docker = join(binDir, "docker");
  const ssh = join(binDir, "ssh");
  writeFileSync(ssh, "#!/bin/sh\nexit 0\n");
  chmodSync(ssh, 0o755);
  writeFileSync(docker, `#!/bin/sh
case "$*" in
  *"container ls"*) printf '%s\\n' "${"a".repeat(64)}" ;;
  *"container inspect"*) /bin/cat "${detailPath}" ;;
  *"rm -f"*) printf '%s\\n' "$*" >> "${deleteLog}" ;;
  *) : ;;
esac
`);
  chmodSync(docker, 0o755);
  const sshKey = join(root, "fixture-key"); writeFileSync(sshKey, "fixture");
  const fixture = await launchVerificationServer({ INSTABOX_API_KEY: "delete-vps-fixture", CRYBOT_TEST_INSTABOX_API: fake.url },
    undefined, { binDir, host: "ssh://127.0.0.1", sshKey, staticDir: root });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.info.url + path, { method, headers: { origin: fixture.info.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    expect((await request("PATCH", "/api/config", { vps: { sshAlias: "fixture-vps" } })).status).toBe(200);
    expect((await request("GET", "/api/config")).body.vps).toMatchObject({ configured: true, sshAlias: "fixture-vps" });
    const bot = (await request("POST", "/api/bots")).body.bot;
    const containerName = vpsContainerName(bot.id);
    const environmentId = readFileSync(join(fixture.info.dataDir, "environment-id"), "utf8").trim();
    writeFileSync(detailPath, JSON.stringify([{ Id: "a".repeat(64), Name: `/${containerName}`, Config: { Labels: {
      [VPS_MANAGED_LABEL]: "1", [VPS_CONTAINER_LABEL]: containerName, [VPS_ENVIRONMENT_LABEL]: environmentId,
    } }, State: { Status: "running", Running: true } }]));
    const path = `/api/bots/${bot.id}`;
    expect((await request("PATCH", path, { cloudBackend: "vps", computer: "cloud", vpsAlias: "fixture-vps" })).status).toBe(200);
    expect((await request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.vpsAlias).toBe("fixture-vps");
    const vpsInventory = await request("GET", "/api/computers/vps");
    expect(vpsInventory.body, JSON.stringify(vpsInventory.body)).toMatchObject({ available: true });
    expect(vpsInventory.body.instances).toEqual([expect.objectContaining({ name: containerName, ownerBotId: bot.id })]);
    expect((await request("PATCH", path, { cloudBackend: "instabox" })).status).toBe(200);
    expect((await request("GET", "/api/bots")).body.bots.find((entry: { id: string }) => entry.id === bot.id)?.vpsAlias).toBe("fixture-vps");
    expect((await request("DELETE", path)).status).toBe(200);
    const removals = (() => { try { return readFileSync(deleteLog, "utf8"); } catch { return "<none>"; } })();
    expect(removals).toContain("rm -f");
  } finally { await fixture.close(); await fake.close(); }
}, 60_000);

it("deletes a retained InstaBox machine after switching backend", async () => {
  const fake = await fakeInstaboxCore();
  const fixture = await launchRestartableServer({ env: { INSTABOX_API_KEY: "delete-leftovers-fixture", CRYBOT_TEST_INSTABOX_API: fake.url } });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method, headers: { origin: fixture.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots")).body.bot;
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    expect((await request("POST", `/api/bots/${bot.id}/computer/provision`, {})).status).toBe(200);
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: "box" })).status).toBe(200);
    const deleted = await request("DELETE", `/api/bots/${bot.id}`);
    expect(deleted.status).toBe(200);
    expect([...fake.machines.values()][0]?.state).toBe("deleted");
  } finally { await fixture.close(); await fake.close(); }
}, 60_000);

it.each(["http", "network"] as const)("keeps deletion independent of InstaBox %s failures for Boat bots", async mode => {
  const fake = await fakeInstaboxCore();
  const fixture = await launchRestartableServer({ env: { INSTABOX_API_KEY: "delete-failure-fixture", CRYBOT_TEST_INSTABOX_API: fake.url } });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method, headers: { origin: fixture.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots", { settings: { cloudBackend: "box" } })).body.bot;
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: "box" })).status).toBe(200);
    if (mode === "http") fake.failNext({ status: 503, code: "fixture_unavailable" });
    else await fake.close();
    const deleted = await request("DELETE", `/api/bots/${bot.id}`);
    expect(deleted).toMatchObject({ status: 200, body: { ok: true, notice: expect.stringMatching(/InstaBox/) } });
  } finally { await fixture.close(); if (mode === "http") await fake.close(); }
}, 60_000);

it("keeps an InstaBox bot when deleting its machine fails", async () => {
  const fake = await fakeInstaboxCore();
  const fixture = await launchRestartableServer({ env: { INSTABOX_API_KEY: "delete-failure-fixture", CRYBOT_TEST_INSTABOX_API: fake.url } });
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(fixture.url + path, { method, headers: { origin: fixture.url, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const bot = (await request("POST", "/api/bots")).body.bot;
    expect((await request("PATCH", `/api/bots/${bot.id}`, { cloudBackend: "instabox", computer: "cloud" })).status).toBe(200);
    expect((await request("POST", `/api/bots/${bot.id}/computer/provision`, {})).status).toBe(200);
    await fake.close();
    const deleted = await request("DELETE", `/api/bots/${bot.id}`);
    expect(deleted.status).toBe(503);
    expect((await request("GET", "/api/bots")).body.bots.some((entry: { id: string }) => entry.id === bot.id)).toBe(true);
  } finally { await fixture.close(); }
}, 60_000);
