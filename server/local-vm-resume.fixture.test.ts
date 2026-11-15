import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { freePortBlock } from "./testing/ports.ts";
import { removeTempDir, waitForExit } from "./testing/cleanup.ts";
import { writeFileAtomic } from "./atomic.ts";
import { createControlClient } from "./computer-control-client.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
let fixtureDir = "", stateFile = "", dumpFile = "", finishFile = "", base = "", output = "";
let child: ChildProcess | undefined;
let scenario = 0;
const state = () => JSON.parse(readFileSync(stateFile, "utf8"));
const save = (value: Record<string, unknown>) => writeFileAtomic(stateFile, JSON.stringify(value));
async function until<T>(read: () => T | Promise<T>, accept: (value: T) => boolean): Promise<T> {
  const end = Date.now() + 15_000;
  for (;;) {
    const value = await read();
    if (accept(value)) return value;
    if (Date.now() >= end) throw new Error(`Fixture timed out: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function api(method: string, path: string, body?: unknown) {
  const response = await fetch(base + path, { method, headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json();
  expect(response.ok, JSON.stringify(value)).toBe(true);
  return value as any;
}
const messages = (threadId: string) => api("GET", `/api/threads/${threadId}/messages`).then(body => body.messages as any[]);
const idle = (botId: string) => until(() => api("GET", "/api/bots?messages=0"), body => !body.bots.find((bot: any) => bot.id === botId)?.busy);

beforeAll(async () => {
  fixtureDir = mkdtempSync(join(tmpdir(), "cry-resume-fixture-"));
  stateFile = join(fixtureDir, "vm.json"); dumpFile = join(fixtureDir, "dump.json"); finishFile = join(fixtureDir, "finish");
  const data = join(fixtureDir, "data"), ui = join(fixtureDir, "static");
  mkdirSync(data); mkdirSync(join(ui, "assets"), { recursive: true });
  writeFileSync(join(ui, "index.html"), "<title>Isolated resume fixture</title>");
  writeFileSync(join(ui, "assets", "test.css"), "body{}");
  save({ containers: ["shared"], stopped: ["shared"], startDelayMs: 5000 });
  writeFileSync(join(data, "config.json"), JSON.stringify({ localVm: { mode: "shared", screens: 1 }, instances: { claude: {
    driver: "claudeAgent", config: { cli: join(root, "server/testing/fake-claude-cli.ts") },
    environment: { FAKE_CLAUDE_MODE: "slow", FAKE_CLAUDE_DUMP: dumpFile, FAKE_CLAUDE_SLOW_FINISH_GATE: finishFile },
  } } }));
  const port = await freePortBlock([0, 1]); base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["--import", pathToFileURL(join(root, "server/testing/local-vm-resume-hooks.mjs")).href,
    "--import", pathToFileURL(join(root, "server/testing/desktop-parent.mjs")).href, join(root, "server/index.ts")], {
    cwd: root, env: {
      PATH: dirname(process.execPath), HOME: fixtureDir, USERPROFILE: fixtureDir, CRYBOT_DATA_DIR: data,
      APPDATA: join(fixtureDir, "appdata"), LOCALAPPDATA: join(fixtureDir, "localappdata"),
      TEMP: fixtureDir, TMP: fixtureDir, TMPDIR: fixtureDir,
      CRYBOT_PORT: String(port), CRYBOT_WEBHOOK_PORT: String(port + 1), CRYBOT_STATIC_DIR: ui,
      CRYBOT_TEST_DESKTOP_CUA_CONNECTION: join(fixtureDir, "cua-connection.json"),
      CRYBOT_TEST_VM_STATE: stateFile, CRYBOT_USER_DATA: join(fixtureDir, "user-data"),
      CRYBOT_COMPUTER_CALL_WAIT_MS: "10000", CRYBOT_DISABLE_MODEL_MANIFEST_FETCH: "1", CRYBOT_DISABLE_ANNOUNCEMENTS: "1",
    }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout!.on("data", chunk => { output = (output + chunk).slice(-8000); });
  child.stderr!.on("data", chunk => { output = (output + chunk).slice(-8000); });
  await until(async () => {
    if (child?.exitCode !== null) throw new Error(output);
    try { return (await fetch(base + "/api/health")).ok; } catch { return false; }
  }, Boolean);
  for (const bot of (await api("GET", "/api/bots?messages=0")).bots) {
    if (bot.chiefOfStaff) await api("PATCH", `/api/bots/${bot.id}`, { chiefOfStaff: false });
  }
});
afterAll(async () => {
  if (finishFile) writeFileSync(finishFile, "finish");
  await waitForExit(child, { signal: "SIGTERM" });
  if (fixtureDir) await removeTempDir(fixtureDir);
});

async function send(options: Record<string, unknown> = {}, strict = false) {
  for (const file of [dumpFile, finishFile, stateFile + ".events", stateFile + ".starting", stateFile + ".notifications", stateFile + ".incidents"]) rmSync(file, { force: true });
  save({ scenario: ++scenario, containers: ["shared"], stopped: ["shared"], startDelayMs: 5000, ...options });
  const { bot } = await api("POST", "/api/bots", { name: "Resume fixture" });
  if (strict) await api("PATCH", `/api/bots/${bot.id}`, { computer: "vm" });
  const { task } = await api("POST", `/api/bots/${bot.id}/tasks`, {});
  const startedAt = Date.now();
  await api("POST", `/api/bots/${bot.id}/messages`, { text: "Reply without using the computer.", threadId: task.threadId });
  const events = await until(() => {
    try {
      return readFileSync(stateFile + ".events", "utf8").trim().split("\n").map(line => JSON.parse(line))
        .filter(event => event.threadId === task.threadId);
    } catch { return []; }
  }, events => events.some(event => event.type === "turn.started"));
  const elapsed = events.find(event => event.type === "turn.started").at - startedAt;
  const dumped = await until(() => { try { return JSON.parse(readFileSync(dumpFile, "utf8")) as { mcpConfig: { mcpServers: { computer: any } } }; } catch { return null; } }, Boolean);
  return { bot, task, elapsed, computer: dumped!.mcpConfig.mcpServers.computer };
}

it("starts chat within one second; catalog readiness announces a seven-second wake only once", async () => {
  const { bot, task, elapsed, computer } = await send({ startDelayMs: 7000 });
  expect(elapsed).toBeLessThan(1000);
  expect(computer.env.CRYBOT_CONTAINER_LAZY).toBe("1");
  expect(state().stopped).toContain("shared");
  const gate = createControlClient({ url: computer.env.CRYBOT_CONTROL_URL, token: computer.env.CRYBOT_CONTROL_TOKEN });
  let settled = false;
  const firstCall = gate.state(true, { readinessOnly: "1" }).then(result => { settled = true; return result; });
  const repeatedCall = gate.state(true, { readinessOnly: "1" });
  await until(() => messages(task.threadId), rows => rows.some(row => row.tool?.nameCode === "chat.notice.wakingComputer"));
  expect(settled).toBe(false);
  expect(await firstCall).toMatchObject({ held: false });
  expect(await repeatedCall).toMatchObject({ held: false });
  expect(await gate.state(true)).toMatchObject({ held: false });
  expect(state().actions.filter((action: any) => action.action === "start")).toHaveLength(1);
  expect((await messages(task.threadId)).filter(row => row.tool?.nameCode === "chat.notice.wakingComputer")).toHaveLength(1);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
});

it("surfaces a background wake failure and settles the turn without a computer call", async () => {
  const { bot, task, elapsed } = await send({ failStart: true, startDelayMs: 1000 });
  expect(elapsed).toBeLessThan(1000);
  await until(() => messages(task.threadId), rows => rows.some(row => row.tool?.name?.includes("fixture wake failed")));
  expect((await api("GET", "/api/bots?messages=0")).bots.find((entry: any) => entry.id === bot.id).busy).toBe(true);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
  const recorded = (suffix: string) => {
    try { return readFileSync(stateFile + suffix, "utf8").trim().split("\n").map(line => JSON.parse(line)).filter(row => row?.threadId === task.threadId); }
    catch { return []; }
  };
  expect(recorded(".events").some(row => row.type === "turn.completed")).toBe(true);
  expect(recorded(".notifications").some(row => row.kind === "turn-failed")).toBe(false);
  expect(recorded(".incidents")).toEqual([]);
  rmSync(finishFile);
  await api("POST", `/api/bots/${bot.id}/messages`, { text: "Keep chatting.", threadId: task.threadId });
  await until(() => messages(task.threadId), rows => rows.filter(row => row.tool?.nameCode === "chat.notice.computerWakeFailed").length >= 2);
  expect(state().startAttempts).toBe(1);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
});

it("keeps explicit computer selection synchronous", async () => {
  const { bot, elapsed, computer } = await send({ startDelayMs: 1200 }, true);
  expect(elapsed).toBeGreaterThanOrEqual(1200);
  expect(computer.env.CRYBOT_CONTAINER_LAZY).toBeUndefined();
  writeFileSync(finishFile, "finish"); await idle(bot.id);
});

it("records a late wake failure against the old turn without interrupting the next chat", async () => {
  const { bot, task } = await send({ failStart: true, startDelayMs: 2000 });
  writeFileSync(finishFile, "finish"); await idle(bot.id);
  rmSync(finishFile);
  await api("POST", `/api/bots/${bot.id}/messages`, { text: "Continue chatting without the computer.", threadId: task.threadId });
  const rows = await until(() => messages(task.threadId), entries => entries.some(row => row.tool?.nameCode === "chat.notice.previousComputerWakeFailed"));
  expect(rows.find(row => row.tool?.nameCode === "chat.notice.previousComputerWakeFailed")?.turnId).toBeDefined();
  expect((await api("GET", "/api/bots?messages=0")).bots.find((entry: any) => entry.id === bot.id).busy).toBe(true);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
});

it("finishes pure chat before wake, keeps the lifecycle locked, and fences the late claim", async () => {
  const { bot, task, elapsed } = await send({ startDelayMs: 2000, idleMs: 300 });
  expect(elapsed).toBeLessThan(1000);
  await until(() => existsSync(stateFile + ".starting"), Boolean);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
  const change = await fetch(base + "/api/config", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ localVm: { mode: "per-bot" } }) });
  expect(change.status).toBe(409);
  await until(() => state().actions ?? [], actions => actions.some((action: any) => action.action === "start"));
  await new Promise(resolve => setTimeout(resolve, 100));
  expect((await messages(task.threadId)).some(row => row.tool?.name?.includes("lease expired"))).toBe(false);
  expect(state().actions.filter((action: any) => action.action === "start")).toHaveLength(1);
});

it("mounts a lazy claim on the next turn while the previous turn's startup is still locked", async () => {
  const { bot, task } = await send({ startDelayMs: 3000 });
  await until(() => existsSync(stateFile + ".starting"), Boolean);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
  rmSync(finishFile); rmSync(dumpFile);
  await api("POST", `/api/bots/${bot.id}/messages`, { text: "Use the computer now.", threadId: task.threadId });
  const dumped = await until(() => { try { return JSON.parse(readFileSync(dumpFile, "utf8")) as { mcpConfig: { mcpServers: { computer: any } } }; } catch { return null; } }, Boolean);
  const computer = dumped!.mcpConfig.mcpServers.computer;
  expect(computer.env.CRYBOT_CONTAINER_LAZY).toBe("1");
  const gate = createControlClient({ url: computer.env.CRYBOT_CONTROL_URL, token: computer.env.CRYBOT_CONTROL_TOKEN });
  expect(await gate.state(true)).toMatchObject({ held: false });
  expect(state().startAttempts).toBe(1);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
});

it("probes status only once across two beginTurn calls within five seconds", async () => {
  const startedAt = Date.now();
  const { bot, task } = await send({ stopped: [] });
  writeFileSync(finishFile, "finish"); await idle(bot.id);
  rmSync(finishFile); rmSync(dumpFile);
  await api("POST", `/api/bots/${bot.id}/messages`, { text: "One more chat reply.", threadId: task.threadId });
  await until(() => existsSync(dumpFile), Boolean);
  expect(Date.now() - startedAt).toBeLessThan(5000);
  const events = readFileSync(stateFile + ".events", "utf8").trim().split("\n").map(line => JSON.parse(line));
  expect(events.filter(event => event.threadId === task.threadId && event.type === "turn.started")).toHaveLength(2);
  expect(state().statusProbes).toBe(1);
  writeFileSync(finishFile, "finish"); await idle(bot.id);
});
