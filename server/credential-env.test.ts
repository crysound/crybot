import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripControlPlaneEnv, stripWorkspaceCredentialEnv } from "./credential-env.ts";
import { CHECK_DENY_ENV } from "./bot-box/box-check.ts";

it.each([stripControlPlaneEnv, stripWorkspaceCredentialEnv])("keeps operator relay and broker secrets out of child processes", strip => {
  const env = { PATH: process.env.PATH, CRYBOT_PHONE_RELAY_TOKEN: "relay-secret", CRYBOT_COMPOSIO_BROKER_TOKEN: "broker-secret", crybot_phone_relay_token: "windows-secret" };
  strip(env);
  expect(Object.keys(env).filter(key => /crybot_(phone_relay|composio_broker)_token/i.test(key))).toEqual([]);
  expect(env.PATH).toBe(process.env.PATH);
  expect(CHECK_DENY_ENV.has("CRYBOT_PHONE_RELAY_TOKEN")).toBe(true);
  const dir = mkdtempSync(join(tmpdir(), "cry-credential-env-"));
  try {
    const file = join(dir, "child-env.json");
    const child = spawnSync(process.execPath, ["-e", 'require("node:fs").writeFileSync(process.argv[1], JSON.stringify(process.env))', file], { env, stdio: "ignore" });
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    const inherited = JSON.parse(readFileSync(file, "utf8"));
    expect(Object.keys(inherited).filter(key => /crybot_(phone_relay|composio_broker)_token/i.test(key))).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
