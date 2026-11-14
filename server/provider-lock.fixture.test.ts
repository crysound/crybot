import { spawn, type ChildProcess } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { verificationServerArgs, verificationServerEnvironment } from "../scripts/control-cry.ts";
import { DATA_DIR } from "./config.ts";
import { Store } from "./store.ts";
import { freePortBlock } from "./testing/ports.ts";
import { removeTempDir, waitForExit } from "./testing/cleanup.ts";
import { hostTimeout } from "./testing/host-timeout.ts";

it.each([true, false])("boots an isolated locked server with an endpoint=%s", async (hasEndpoint) => {
  const dir = mkdtempSync(join(tmpdir(), "cry-provider-lock-"));
  let child: ChildProcess | undefined;
  let output = "";
  let failure: Error | undefined;
  try {
    const port = await freePortBlock([0, 1]);
    mkdirSync(join(dir, "tmp"));
    const store = new Store(() => ({ instanceId: "fixture-missing", model: "claude-sonnet-5" }));
    const bot = store.createBot({}, { seedMessages: false });
    store.patchBot(bot.id, { fallback: [{ instanceId: "fixture-backup", model: "claude-sonnet-5" }] });
    copyFileSync(join(DATA_DIR, "bots.json"), join(dir, "bots.json"));
    writeFileSync(join(dir, "config.json"), JSON.stringify({
      defaultModelSelection: { instanceId: "fixture-missing", model: "claude-sonnet-5" },
      automaticRecovery: { enabled: true, backup: { instanceId: "fixture-backup", model: "claude-sonnet-5" } },
      instances: {
        claude: { driver: "claudeAgent" },
        ...(hasEndpoint ? { gateway: {
          driver: "claudeAgent", displayName: "Fixture endpoint", access: "custom",
          config: { cli: fileURLToPath(new URL("./testing/fake-claude-cli.ts", import.meta.url)), endpointModels: ["claude-sonnet-5"], requireApiKey: true },
          environment: { ANTHROPIC_BASE_URL: "https://gateway.example", ANTHROPIC_AUTH_TOKEN: "fixture-token", ANTHROPIC_API_KEY: "fixture-token", ANTHROPIC_MODEL: "claude-sonnet-5" },
        } } : {}),
      },
    }));
    const env = { ...verificationServerEnvironment({}, dir, port), CRYBOT_PROVIDER_LOCK: "1" };
    child = spawn(process.execPath, verificationServerArgs(env), { env, stdio: ["ignore", "pipe", "pipe"] });
    child.on("error", (error) => { failure = error; });
    child.stdout?.on("data", (chunk) => { output = (output + String(chunk)).slice(-4000); });
    child.stderr?.on("data", (chunk) => { output = (output + String(chunk)).slice(-4000); });
    const url = `http://127.0.0.1:${port}`;
    await vi.waitFor(async () => {
      if (failure) throw failure;
      if (child?.exitCode !== null) throw new Error(`Fixture exited: ${output}`);
      expect((await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) })).ok).toBe(true);
    }, { timeout: hostTimeout(20_000), interval: 150 });
    const get = async <T>(path: string): Promise<T> => {
      const response = await fetch(url + path, { headers: { origin: url }, signal: AbortSignal.timeout(10_000) });
      expect(response.status).toBe(200);
      return response.json() as Promise<T>;
    };
    expect(await get("/api/config")).toMatchObject({ providerLock: true, box: { configured: false } });
    expect(await get("/api/team-computers")).toMatchObject({ computers: [], configured: false });
    expect(await get("/api/computers/frames")).toMatchObject({ computers: [], configured: false });
    const { instances } = await get<{ instances: Array<{ instanceId: string; displayName: string; icon?: unknown; claudeEndpoint?: { baseUrl?: string } }> }>("/api/instances");
    expect(instances.map((instance: { instanceId: string }) => instance.instanceId)).toEqual(hasEndpoint ? ["gateway"] : []);
    if (hasEndpoint) {
      expect(instances[0].displayName).toBe("Cry Bot");
      expect(instances[0].icon).toEqual({ kind: "preset", preset: "crybot" });
      expect(instances[0].claudeEndpoint?.baseUrl).toBe("https://gateway.example");
    }
    const { bots } = await get<{ bots: Array<{ id: string; modelSelection: { instanceId: string }; fallback?: Array<{ instanceId: string }> }> }>("/api/bots");
    const savedBot = bots.find((entry: { id: string }) => entry.id === bot.id)!;
    expect(savedBot.modelSelection.instanceId).toBe(hasEndpoint ? "gateway" : "fixture-missing");
    expect(savedBot.fallback![0].instanceId).toBe(hasEndpoint ? "gateway" : "fixture-backup");
    const config = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
    expect(config.defaultModelSelection.instanceId).toBe(hasEndpoint ? "gateway" : "fixture-missing");
    expect(config.automaticRecovery.backup.instanceId).toBe(hasEndpoint ? "gateway" : "fixture-backup");
    expect(config.instances.claude.driver).toBe("claudeAgent");
  } finally {
    await waitForExit(child, { signal: "SIGTERM" });
    await removeTempDir(dir);
  }
}, hostTimeout(30_000));
