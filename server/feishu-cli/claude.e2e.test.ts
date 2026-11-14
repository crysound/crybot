import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { ClaudeDriver } from "../drivers/claude.ts";
import { ensureDirs } from "../config.ts";
import { recordEvents } from "../testing/events.ts";
import * as procs from "../procs.ts";
import { feishuCliPrompt } from "./turn.ts";

it("isolates turn tokens, disables warm forks and drops credentials when the same conversation loses access", async () => {
  ensureDirs();
  const directory = await mkdtemp(join(tmpdir(), "feishu-claude-"));
  const short = "fixture-short-process-token";
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
  const launches: NodeJS.ProcessEnv[] = [];
  const spawn = procs.spawnCli;
  vi.spyOn(procs, "spawnCli").mockImplementation((cli, args, opts, owner) => {
    if (owner === "bot") launches.push({ ...opts.env });
    return spawn(cli, args, opts, owner);
  });
  const instance = await ClaudeDriver.create({ instanceId: "feishu-fixture", displayName: "Fixture", enabled: true, environment: { FAKE_CLAUDE_MODE: "happy", CRYBOT_FEISHU_USER_TOKEN: "inherited-invalid", LARKSUITE_CLI_APP_SECRET: "inherited-invalid" }, config: { cli: fileURLToPath(new URL("../testing/fake-claude-cli.ts", import.meta.url)), permissionMode: "acceptEdits" } });
  const events = recordEvents(instance.adapter);
  const access = { prompt: () => feishuCliPrompt("zh"), environment: vi.fn(async () => ({ CRYBOT_FEISHU_USER_TOKEN: short, CRYBOT_FEISHU_APP_ID: "fixture-app", CRYBOT_FEISHU_EXPIRES_AT: "9000000000", CRYBOT_FEISHU_BROKER_SOCKET: "/fixture/token.sock" })) };
  try {
    const first = await instance.adapter.sendTurn({ threadId: "feishu-turn", text: "Fixture", cwd: directory, system: "Fixture", feishuCli: access });
    await events.until(event => event.type === "turn.completed" && event.turnId === first.turnId);
    expect(launches[0].CRYBOT_FEISHU_USER_TOKEN).toBe(short);
    expect(launches[0].LARKSUITE_CLI_APP_SECRET).toBeUndefined();
    expect(await instance.adapter.cacheKeepWarm!.ping("feishu-turn")).toMatchObject({ ok: false });
    const next = await instance.adapter.sendTurn({ threadId: "feishu-turn", text: "Fixture", cwd: directory, system: "Ordinary conversation" });
    await events.until(event => event.type === "turn.completed" && event.turnId === next.turnId);
    expect(launches).toHaveLength(2);
    expect(Object.keys(launches[1]).filter(key => /^(CRYBOT_FEISHU_|LARKSUITE_CLI_)/.test(key))).toEqual([]);
    expect(access.environment).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([events.events, logs.map(log => log.mock.calls)])).not.toContain(short);
    const files = await readdir(directory, { recursive: true, withFileTypes: true });
    for (const file of files.filter(file => file.isFile())) expect(await readFile(join(file.parentPath, file.name), "utf8")).not.toContain(short);
  } finally {
    events.stop();
    await instance.dispose();
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  }
});
