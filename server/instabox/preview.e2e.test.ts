import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { removeTempDir } from "../testing/cleanup.ts";
import { launchRestartableServer, type RestartableServer } from "../testing/restartable-server.ts";

it.each(["new", "legacy", "explicit"] as const)("cancels a stalled cloud lookup and previews the shared VM for an Auto %s bot", async kind => {
  const dir = mkdtempSync(join(tmpdir(), "cry-preview-"));
  const state = join(dir, "vm.json");
  writeFileSync(state, "{}");
  let cancelled = 0;
  const calls: string[] = [];
  const upstream = createServer((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    res.on("close", () => { if (!res.writableEnded) cancelled++; });
  });
  let app: RestartableServer | undefined;
  try {
    await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("Fixture did not listen");
    app = await launchRestartableServer({ env: {
      INSTABOX_API_KEY: "",
      CRYBOT_TEST_INSTABOX_API: `http://127.0.0.1:${address.port}`,
      CRYBOT_TEST_VM_STATE: state,
      NODE_OPTIONS: `--import=${new URL("../testing/group-local-vm-hooks.mjs", import.meta.url).href}`,
    } });
    const base = app.url;
    const request = async (method: string, path: string, body?: unknown) => {
      const response = await fetch(base + path, { method,
        headers: { origin: base, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5_000),
      });
      expect(response.ok).toBe(true);
      return await response.json() as any;
    };
    const bot = (await request("POST", "/api/bots", { name: "Auto preview fixture",
      modelSelection: { instanceId: "claude", model: "claude-sonnet-5" },
      ...(kind === "explicit" ? { settings: { cloudBackend: "instabox" } } : {}),
    })).bot;
    expect(bot.cloudBackend).toBe("instabox");
    expect(bot.computer).toBeUndefined();
    await app.stop();
    const configFile = join(app.dataDir, "config.json");
    const config = JSON.parse(readFileSync(configFile, "utf8"));
    writeFileSync(configFile, JSON.stringify({ ...config, localVm: { mode: "shared", screens: 1 }, instabox: { apiKey: "instabox-e2e-fixture" } }));
    if (kind === "legacy") {
      const botsFile = join(app.dataDir, "bots.json");
      const bots = JSON.parse(readFileSync(botsFile, "utf8"));
      delete bots.find((entry: { id: string }) => entry.id === bot.id).cloudBackend;
      writeFileSync(botsFile, JSON.stringify(bots));
    }
    await app.start();
    const saved = (await request("GET", "/api/bots?messages=0")).bots.find((entry: { id: string }) => entry.id === bot.id);
    expect(saved.cloudBackend).toBe(kind === "legacy" ? undefined : "instabox");
    expect((await request("GET", "/api/config")).instabox.configured).toBe(true);
    expect(await request("GET", "/api/local-computer")).toMatchObject({ ready: true, mode: "shared" });
    const start = performance.now();
    const preview = await request("GET", `/api/bots/${bot.id}/computer?threadId=${bot.threadId}`);
    expect(preview).toMatchObject({ surface: "vm" });
    expect(performance.now() - start).toBeLessThan(4_000);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^GET \/v1\/machines\?/);
    await expect.poll(() => cancelled, { timeout: 1_000 }).toBe(1);
  } finally {
    await app?.close();
    await new Promise<void>(resolve => { upstream.close(() => resolve()); upstream.closeAllConnections(); });
    await removeTempDir(dir);
  }
}, 45_000);
