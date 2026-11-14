import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer, request, type Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ChildProcess } from "node:child_process";
import { afterAll, beforeAll, expect, it } from "vitest";
import { spawnWithSecrets } from "./cloud-home-start.ts";
import { cloudPairingSignature } from "./cloud-home.ts";
import { removeTempDir, waitForExit } from "./testing/cleanup.ts";
import { freePortBlock } from "./testing/ports.ts";
import { detectBox } from "./bot-box/detect.ts";
import { BOX_BROKER_PORT } from "./bot-box/box.ts";
import { fixtureEnginePath } from "./testing/fixture-engine.ts";

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const HOST = "cry-t-0123456789ab.example.test";
const secret = randomBytes(32).toString("base64url");
const VENICE = `venice-owner-${randomBytes(8).toString("hex")}`;
const OWNER_ANTHROPIC = `anthropic-owner-${randomBytes(8).toString("hex")}`;
const VENICE_LISTED = "listed-only-by-venice";
let home = "";
let dataDir = "";
let dump = "";
let base = "";
let child: ChildProcess;
let log = "";
let owner = "";
let upstream: Server | undefined;
let upstreamBase = "";
const modelCalls: Array<{ path: string | undefined; key: string | string[] | undefined }> = [];
const boxed = detectBox({ env: { PATH: process.env.PATH, CRYBOT_CLOUD_ROLE: "home" } }).box === "bwrap";

function modelCall(url: string, key: string, socketPath?: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const target = new URL(`${url}/messages`);
    const req = request({ hostname: target.hostname, port: target.port, path: target.pathname, socketPath,
      method: "POST", headers: { "x-api-key": key, "content-type": "application/json" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    req.setTimeout(5_000, () => req.destroy(new Error("model fixture timed out")));
    req.end(JSON.stringify({ model: "fixture/warm", messages: [] }));
  });
}

async function api(method: string, path: string, body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      host: HOST, "x-forwarded-for": "203.0.113.9", "x-forwarded-proto": "https", origin: `https://${HOST}`,
      authorization: `Bearer ${owner}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, text, body: (() => { try { return JSON.parse(text); } catch { return null; } })() as any };
}

async function adminPairing(): Promise<string> {
  const body = JSON.stringify({ label: "Cry Bot app (Cloud)", ttlSeconds: 300 });
  const timestamp = String(Math.floor(Date.now() / 1000)), nonce = randomBytes(16).toString("base64url");
  const response = await fetch(`${base}/api/cloud/pairing`, { method: "POST", headers: {
    host: HOST, "x-forwarded-for": "203.0.113.9", "x-forwarded-proto": "https", "content-type": "application/json",
    "x-cry-cloud-timestamp": timestamp, "x-cry-cloud-nonce": nonce, "x-cry-cloud-signature": `v1=${cloudPairingSignature(secret, timestamp, nonce, body)}`,
  }, body });
  const granted = await response.json() as { code: string };
  return (await api("POST", "/api/auth/pair", { code: granted.code })).body.token;
}

const started = () => JSON.parse(readFileSync(dump, "utf8")) as { pid: number; env: Record<string, string> };
/** Existence alone can catch a half-written file on a busy runner (SyntaxError: Unexpected end). */
const written = (file: string, shape: "document" | "lines" = "document") => {
  try {
    const text = readFileSync(file, "utf8");
    JSON.parse(shape === "lines" ? text.trim().split("\n").at(-1)! : text);
    return true;
  } catch { return false; }
};

const providerStarts = () => readdirSync(home).filter((name) => /^opencode\.json\.\d+\.provider-env\.json$/.test(name));
const providerEnvironment = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;

async function nextProviderEnvironment(before: string[]) {
  let file = "";
  await expect.poll(() => {
    file = providerStarts().find((name) => !before.includes(name) && written(join(home, name))) ?? "";
    return Boolean(file);
  }, { timeout: 15_000 }).toBe(true);
  return providerEnvironment(join(home, file));
}

function expectAnthropicEnvironment(env: Record<string, string>) {
  if (boxed) {
    expect(env.ANTHROPIC_API_KEY).toMatch(/^cry_t0_[a-f0-9]{48}$/);
    expect(env.ANTHROPIC_BASE_URL).toBe(`http://127.0.0.1:${BOX_BROKER_PORT}/b/${env.ANTHROPIC_API_KEY}/anthropic`);
    expect(JSON.stringify(env)).not.toContain(OWNER_ANTHROPIC);
  } else {
    expect(env.ANTHROPIC_API_KEY).toBe(OWNER_ANTHROPIC);
    expect(env.ANTHROPIC_BASE_URL).toBe(upstreamBase);
  }
}

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), "cry-opencode-keys-"));
  dataDir = join(home, ".crybot");
  mkdirSync(dataDir, { recursive: true });
  dump = join(home, "opencode.json");
  const cli = fixtureEnginePath(dataDir, "fixture-opencode-provider-keys.mjs");
  writeFileSync(cli, `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
if (process.argv[2] === "acp" && process.env.FAKE_ACP_DUMP) {
  writeFileSync(process.env.FAKE_ACP_DUMP + "." + process.pid + ".provider-env.json", JSON.stringify({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    VENICE_API_KEY: process.env.VENICE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }));
}
await import(${JSON.stringify(pathToFileURL(join(SERVER_DIR, "testing", "fake-acp-cli.ts")).href)});
`, { mode: 0o755 });
  upstream = createServer((req, res) => {
    modelCalls.push({ path: req.url, key: req.headers["x-api-key"] });
    req.resume();
    res.writeHead(req.headers["x-api-key"] === OWNER_ANTHROPIC ? 200 : 401, { "content-type": "application/json" });
    res.end(JSON.stringify({ answer: "fixture model" }));
  });
  await new Promise<void>((resolve, reject) => { upstream!.once("error", reject); upstream!.listen(0, "127.0.0.1", resolve); });
  upstreamBase = `http://127.0.0.1:${(upstream.address() as { port: number }).port}/v1`;
  // Only OpenCode: nothing probes a CLI installed on this machine.
  writeFileSync(join(dataDir, "config.json"), JSON.stringify({
    instances: {
      opencodeGo: {
        driver: "opencodeGo", displayName: "OpenCode",
        config: { cli: `${JSON.stringify(process.execPath)} ${JSON.stringify(cli)}` },
        environment: { FAKE_ACP_MODELS: "fixture/warm", FAKE_ACP_DUMP: dump, ANTHROPIC_BASE_URL: upstreamBase },
      },
    },
  }));
  const port = await freePortBlock([0, 1]);
  base = `http://127.0.0.1:${port}`;
  const veniceListing = JSON.stringify({ data: [{ id: VENICE_LISTED }] });
  const offlinePrelude = `data:text/javascript,${encodeURIComponent(`const real = globalThis.fetch; globalThis.fetch = async (url, init) => String(url).startsWith("http://127.0.0.1:") ? real(url, init) : String(url) === "https://api.venice.ai/api/v1/models?type=text" && new Headers(init?.headers).get("authorization") === "Bearer ${VENICE}" ? new Response(${JSON.stringify(veniceListing)}) : new Response("offline fixture", { status: 503 });`)}`;
  child = spawnWithSecrets(process.execPath, ["--import", offlinePrelude, join(SERVER_DIR, "index.ts")], {
    PATH: process.env.PATH, ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    HOME: home, USERPROFILE: home, CRYBOT_DATA_DIR: dataDir, CRYBOT_PORT: String(port), CRYBOT_WEBHOOK_PORT: String(port + 1),
    CRYBOT_CLOUD_ROLE: "home", CRYBOT_CLOUD_MACHINE_ID: "3f9c2a4e-8b1d-4c6e-9a7f-2d5e8c1b0a93", CRYBOT_CLOUD_ADMIN_URL: "https://cloud.example.test",
    CRYBOT_PUBLIC_URL: `https://${HOST}`, CRYBOT_CLOUD_SECRETS_FD: "3",
    // Provider keys in the server's own environment: never the owner's to spend from a bot.
    ANTHROPIC_API_KEY: "anthropic-server-own", OPENAI_API_KEY: "openai-server-own",
  }, { CRYBOT_CLOUD_BOOTSTRAP_SECRET: secret }, undefined, true);
  for (const stream of [child.stdout, child.stderr]) stream?.on("data", (chunk) => { log += chunk; });
  const deadline = Date.now() + 20_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`the Cloud home exited:\n${log}`);
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error(`the Cloud home did not start:\n${log}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  owner = await adminPairing();
}, 40_000);

afterAll(async () => {
  if (child) await waitForExit(child, { signal: "SIGTERM" });
  if (upstream?.listening) await new Promise<void>((resolve) => upstream!.close(() => resolve()));
  if (home) await removeTempDir(home);
});

it("refuses a name CryBot keeps, in one plain line, and saves nothing", async () => {
  const before = readFileSync(join(dataDir, "config.json"), "utf8");
  const refused = await api("PUT", "/api/config", { opencodeGo: { providerKeys: { CRYBOT_CLOUD_BOAT_TOKEN: "x-token", VENICE_API_KEY: VENICE } } });
  expect(refused.status).toBe(400);
  expect(refused.body.error).toBe("Cry Bot keeps CRYBOT_CLOUD_BOAT_TOKEN for itself, so OpenCode can't be given it here. Put this key in opencode.json instead.");
  expect(readFileSync(join(dataDir, "config.json"), "utf8")).toBe(before);
  const opencodeKey = await api("PUT", "/api/config", { opencodeGo: { providerKeys: { OPENCODE_API_KEY: "zen" } } });
  expect(opencodeKey.status).toBe(400);
  expect(opencodeKey.body.error).toBe("Save the OpenCode key in the OpenCode API key box instead.");
  expect(readFileSync(join(dataDir, "config.json"), "utf8")).toBe(before);
});

it("saves keys for any OpenCode provider on a Cloud, shows only their names, and hands them to OpenCode alone", async () => {
  expect(owner).toMatch(/^cry_sess_/);
  expect((await api("GET", "/api/config")).body.opencodeGo).toEqual({ configured: false, providerKeys: [] });
  const initialEnv = await nextProviderEnvironment([]);
  expect(initialEnv.ANTHROPIC_API_KEY).toBeUndefined();
  expect(initialEnv.OPENAI_API_KEY).toBeUndefined();

  const beforeSave = providerStarts();
  rmSync(dump, { force: true });
  const saved = await api("PUT", "/api/config", { opencodeGo: { providerKeys: { VENICE_API_KEY: VENICE, ANTHROPIC_API_KEY: OWNER_ANTHROPIC } } });
  expect(saved.status, saved.text).toBe(200);
  expect(saved.body.opencodeGo).toEqual({ configured: false, providerKeys: ["ANTHROPIC_API_KEY", "VENICE_API_KEY"] });
  const reread = await api("GET", "/api/config");
  for (const response of [saved.text, reread.text]) {
    expect(response).not.toContain(VENICE);
    expect(response).not.toContain(OWNER_ANTHROPIC);
  }
  expect(reread.body.opencodeGo.providerKeys).toEqual(["ANTHROPIC_API_KEY", "VENICE_API_KEY"]);
  await expect.poll(async () => (await api("GET", "/api/instances?fresh=1")).body.instances
    .find((instance: any) => instance.instanceId === "opencodeGo")?.models.options.map((option: any) => option.id), { timeout: 15_000 })
    .toContain(`venice/${VENICE_LISTED}`);
  const savedEnv = await nextProviderEnvironment(beforeSave);
  expect(savedEnv.VENICE_API_KEY).toBe(VENICE);
  expectAnthropicEnvironment(savedEnv);
  expect(savedEnv.OPENAI_API_KEY).toBeUndefined();

  const { bot } = (await api("POST", "/api/bots", { name: "Venice bot", modelSelection: { instanceId: "opencodeGo", model: "fixture/warm" } })).body;
  const thread = (await api("POST", `/api/bots/${bot.id}/tasks`, { title: "Mine" })).body.task.threadId as string;
  const prompts = `${dump}.prompts.jsonl`;
  rmSync(prompts, { force: true });
  expect((await api("POST", `/api/bots/${bot.id}/messages`, { text: "Hello.", threadId: thread })).status).toBe(202);
  await expect.poll(() => written(prompts, "lines"), { timeout: 15_000 }).toBe(true);
  const turnPid = JSON.parse(readFileSync(prompts, "utf8").trim().split("\n").at(-1)!).pid as number;
  expect(started().pid).toBe(turnPid);
  expect(started().env.VENICE_API_KEY).toBe(VENICE);
  const providerDump = readFileSync(`${dump}.${turnPid}.provider-env.json`, "utf8");
  const turnEnv = JSON.parse(providerDump) as Record<string, string>;
  expect(turnEnv.ANTHROPIC_API_KEY).toBe(started().env.ANTHROPIC_API_KEY);
  expectAnthropicEnvironment(turnEnv);
  if (boxed) {
    expect(readFileSync(dump, "utf8")).not.toContain(OWNER_ANTHROPIC);
    expect(providerDump).not.toContain(OWNER_ANTHROPIC);
  }
  const socketPath = boxed ? join(dataDir, "box", "broker.sock") : undefined;
  expect(await modelCall(turnEnv.ANTHROPIC_BASE_URL!, turnEnv.ANTHROPIC_API_KEY!, socketPath))
    .toEqual({ status: 200, body: { answer: "fixture model" } });
  expect(modelCalls).toEqual([{ path: "/v1/messages", key: OWNER_ANTHROPIC }]);
  if (boxed) {
    expect(await modelCall(`http://127.0.0.1:${BOX_BROKER_PORT}/b/cry_t0_${"0".repeat(48)}/anthropic`, turnEnv.ANTHROPIC_API_KEY!, socketPath))
      .toEqual({ status: 401, body: { error: "unknown_token" } });
    expect(await modelCall(`http://127.0.0.1:${BOX_BROKER_PORT}/b/${turnEnv.ANTHROPIC_API_KEY}/openai`, turnEnv.ANTHROPIC_API_KEY!, socketPath))
      .toEqual({ status: 403, body: { error: "not_granted" } });
    expect(modelCalls).toHaveLength(1);
  }
  expect(started().env.OPENAI_API_KEY).toBeUndefined();
  await expect.poll(async () => (await api("GET", "/api/bots")).body.bots.find((entry: any) => entry.id === bot.id)
    ?.tasks.find((task: any) => task.threadId === thread)?.busy, { timeout: 15_000 }).toBe(false);

  const beforeRemove = providerStarts();
  rmSync(dump, { force: true });
  const removed = await api("PUT", "/api/config", { opencodeGo: { providerKeys: { VENICE_API_KEY: "" } } });
  expect(removed.status, removed.text).toBe(200);
  expect(removed.body.opencodeGo.providerKeys).toEqual(["ANTHROPIC_API_KEY"]);
  const removedEnv = await nextProviderEnvironment(beforeRemove);
  expect(removedEnv.VENICE_API_KEY).toBeUndefined();
  expectAnthropicEnvironment(removedEnv);
  expect(removedEnv.OPENAI_API_KEY).toBeUndefined();
}, 90_000);
