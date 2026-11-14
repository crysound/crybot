import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { verificationServerArgs, verificationServerEnvironment } from "../scripts/control-cry.ts";
import { waitForExit } from "./testing/cleanup.ts";
import { freePortBlock } from "./testing/ports.ts";

const aasaPath = "/.well-known/apple-app-site-association";
const assetlinksPath = "/.well-known/assetlinks.json";
const returnPath = "/auth/app-return";
const fingerprint = Array(32).fill("AA").join(":");
const env = {
  CRYBOT_APP_LINK_ORIGIN: "https://crybot-app.example",
  CRYBOT_APPLE_APP_IDS: "ABCDE12345.com.example.app",
  CRYBOT_ANDROID_PACKAGE: "com.example.app",
  CRYBOT_ANDROID_CERT_SHA256: fingerprint,
};
const aasa = {
  applinks: { details: [{ appIDs: ["ABCDE12345.com.example.app"], components: [{ "/": returnPath, comment: "Cry Bot login return" }] }] },
  webcredentials: { apps: ["ABCDE12345.com.example.app"] },
};
const assetlinks = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: { namespace: "android_app", package_name: "com.example.app", sha256_cert_fingerprints: [fingerprint] },
}];

it("serves all three routes from index.ts before Access without creating a session", async () => {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => probe.close(error => error ? reject(error) : resolve()));
  });
  const port = await freePortBlock([0, 1]);
  const directory = mkdtempSync(join(tmpdir(), "crybot-app-links-"));
  mkdirSync(join(directory, "tmp"));
  writeFileSync(join(directory, "config.json"), JSON.stringify({ instances: { fixture: { driver: "unknown-fixture" } }, features: { smartSetupChoices: false } }));
  const childEnv = {
    ...verificationServerEnvironment({}, directory, port), ...env,
    CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.example",
    CRYBOT_CF_ACCESS_AUD: "test-audience",
    CRYBOT_CF_ACCESS_ALLOW: "owner@crybot.example",
  };
  const child = spawn(process.execPath, verificationServerArgs(childEnv), { env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  try {
    await vi.waitFor(async () => {
      if (child.exitCode !== null) throw new Error(output);
      expect((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) })).status).toBe(200);
    }, { timeout: 20_000, interval: 100 });
    const requestHeaders: Record<string, string>[] = [{}, { "cf-access-jwt-assertion": "invalid" }];
    for (const path of [aasaPath, assetlinksPath, returnPath]) {
      for (const headers of requestHeaders) {
        const response = await fetch(`${base}${path}`, { headers, redirect: "manual" });
        expect(response.status).toBe(200);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(response.headers.get("location")).toBeNull();
        if (path === aasaPath) expect(await response.json()).toEqual(aasa);
        if (path === assetlinksPath) expect(await response.json()).toEqual(assetlinks);
        if (path === returnPath) expect(await response.text()).toContain("Could not return to the Cry Bot App automatically.");
      }
    }
    const protectedResponse = await fetch(`${base}/auth/app-handoff`, { headers: { "cf-access-jwt-assertion": "invalid" } });
    expect(protectedResponse.status).toBe(401);
    expect(await protectedResponse.json()).toEqual({ error: "Invalid Cloudflare Access assertion" });
  } finally {
    await waitForExit(child, { signal: "SIGTERM" });
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
