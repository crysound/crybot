import { spawn, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { openAppClient } from "./mcp-app-connections.ts";
import { createControlClient } from "./computer-control-client.ts";
import { freePortBlock } from "./testing/ports.ts";
import { removeTempDir, waitForExit } from "./testing/cleanup.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const fixtures: Array<{ child?: ChildProcess; home: string }> = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    if (fixture.child) await waitForExit(fixture.child, { signal: "SIGTERM" });
    await removeTempDir(fixture.home);
  }
});

async function fixture(screens = 4, waitMs = 15_000, initialState: Record<string, unknown> = {}) {
  const home = mkdtempSync(join(tmpdir(), "cry-screens-"));
  const cleanup: { child?: ChildProcess; home: string } = { home }; fixtures.push(cleanup);
  const data = join(home, "data"), bin = join(home, "bin"), ui = join(home, "static");
  for (const dir of [data, bin, join(ui, "assets")]) mkdirSync(dir, { recursive: true });
  const state = join(home, "vm.json");
  writeFileSync(state, JSON.stringify({ container: "running", layout: screens === 1 ? "single" : "multi", ...initialState }));
  writeFileSync(join(ui, "index.html"), "<title>Isolated screen fixture</title>");
  writeFileSync(join(ui, "assets", "test.css"), "body{}");
  const hook = join(ROOT, "server/testing/local-vm-screens-hooks.mjs");
  const quote = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;
  writeFileSync(join(bin, "docker"), `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(hook)} --fake-docker "$@"\n`);
  chmodSync(join(bin, "docker"), 0o755);
  const instances = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`fixture-${i}`, {
    driver: "claudeAgent", config: { cli: join(ROOT, "server/testing/fake-claude-cli.ts") },
    environment: { FAKE_CLAUDE_MODE: "slow", FAKE_CLAUDE_DUMP: join(home, `dump-${i}`), FAKE_CLAUDE_SLOW_FINISH_GATE: join(home, `finish-${i}`) },
  }]));
  writeFileSync(join(data, "config.json"), JSON.stringify({ localVm: { mode: "shared", screens }, instances }));
  const port = await freePortBlock([0, 1]);
  let stderr = "", stdout = "";
  const child = spawn(process.execPath, ["--import", pathToFileURL(hook).href,
    "--import", pathToFileURL(join(ROOT, "server/testing/desktop-parent.mjs")).href, join(ROOT, "server/index.ts")], {
    cwd: ROOT, env: {
      PATH: `${bin}:${dirname(process.execPath)}`, HOME: home, USERPROFILE: home,
      APPDATA: join(home, "appdata"), LOCALAPPDATA: join(home, "localappdata"),
      TEMP: home, TMP: home, TMPDIR: home, CRYBOT_DATA_DIR: data, CRYBOT_STATIC_DIR: ui,
      CRYBOT_PORT: String(port), CRYBOT_WEBHOOK_PORT: String(port + 1),
      CRYBOT_TEST_SEALED_PATH: "1", CRYBOT_DISABLE_MODEL_MANIFEST_FETCH: "1", CRYBOT_DISABLE_ANNOUNCEMENTS: "1",
      CRYBOT_TEST_VM_STATE: state, CRYBOT_SCREEN_IDLE_MS: "1500", CRYBOT_COMPUTER_WAIT_MAX_MS: String(waitMs),
      CRYBOT_COMPUTER_CALL_WAIT_MS: "500", CRYBOT_USER_DATA: join(home, "user-data"),
      CRYBOT_TEST_DESKTOP_CUA_CONNECTION: join(home, "missing-cua.json"),
    }, stdio: ["ignore", "pipe", "pipe"],
  });
  cleanup.child = child;
  child.stdout!.on("data", chunk => { stdout += chunk; }); child.stderr!.on("data", chunk => { stderr += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const until = async <T>(read: () => T | Promise<T>, accept: (value: T) => boolean): Promise<T> => {
    const deadline = Date.now() + 30_000;
    for (;;) {
      if (child.exitCode !== null) throw new Error(stderr);
      const value = await read();
      if (accept(value)) return value;
      if (Date.now() > deadline) throw new Error(`Screen fixture timed out: ${JSON.stringify(value)}\n${stderr}`);
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    }
  };
  await until(async () => { try { return (await fetch(base + "/api/health")).ok; } catch { return false; } }, Boolean);
  await until(() => stdout + stderr, logs => logs.includes("Local VM startup recovery complete"));
  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(base + path, { method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json() as any;
    expect(response.ok, `${method} ${path}: ${JSON.stringify(result)}\n${stderr}`).toBe(true);
    return result;
  };
  for (const bot of (await request("GET", "/api/bots?messages=0")).bots) {
    if (bot.chiefOfStaff) await request("PATCH", `/api/bots/${bot.id}`, { chiefOfStaff: false });
  }
  const refused = async (path: string, body: unknown) => {
    const response = await fetch(base + path, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const rows = (suffix: string): any[] => {
    if (!existsSync(state + suffix)) return [];
    return readFileSync(state + suffix, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  };
  const bot = async (i: number, auto = false) => {
    const created = (await request("POST", "/api/bots", { name: `Screen worker ${i + 1}`, browser: false })).bot;
    await request("PATCH", `/api/bots/${created.id}`, { ...(auto ? {} : { computer: "vm" }), modelSelection: { ...created.modelSelection, instanceId: `fixture-${i}` } });
    return created;
  };
  const send = (botId: string, text = "Use your own screen for this task.") => request("POST", `/api/bots/${botId}/messages`, { text });
  const dump = (i: number) => until<any>(() => {
    try { return JSON.parse(readFileSync(join(home, `dump-${i}`), "utf8")); } catch { return null; }
  }, Boolean);
  const finish = (i: number) => writeFileSync(join(home, `finish-${i}`), "finish");
  const idle = (botId: string) => until(() => request("GET", "/api/bots?messages=0"), result => !result.bots.find((b: any) => b.id === botId)?.busy);
  const screenList = async () => (await request("GET", "/api/local-computer")).screens;
  const control = (dump: any) => {
    const env = dump.mcpConfig.mcpServers.computer.env;
    return createControlClient({ url: env.CRYBOT_CONTROL_URL, token: env.CRYBOT_CONTROL_TOKEN });
  };
  const tool = async (dump: any) => {
    const mounted = dump.mcpConfig.mcpServers.computer;
    const client = await openAppClient({ ...mounted, env: { ...mounted.env, HOME: home, USERPROFILE: home, CRYBOT_DATA_DIR: data, CRYBOT_TEST_SEALED_PATH: "1", PATH: `${bin}:${dirname(process.execPath)}`, CRYBOT_TEST_VM_STATE: state } }, { onNotification() {} }, false, AbortSignal.timeout(15_000));
    try {
      const result = await client.request("tools/call", mounted.env.CRYBOT_CONTAINER_LAZY === "1"
        ? { name: "call_tool", arguments: { name: "get_desktop_state", arguments: {} } }
        : { name: "get_desktop_state", arguments: {} }, AbortSignal.timeout(15_000));
      expect(result, JSON.stringify(result)).not.toHaveProperty("isError", true);
    } finally { await client.close(); }
  };
  return { home, request, refused, until, rows, bot, send, dump, finish, idle, screenList, control, tool };
}

describe("shared Local VM screens through the server", () => {
  it.each([1, 4])("previews the shared VM in Auto with %s screens and the default cloud backend", async screens => {
    const f = await fixture(screens);
    const bot = await f.bot(0, true);
    expect(bot.cloudBackend).toBe("instabox");
    expect(bot.computer).toBeUndefined();
    expect((await f.request("GET", "/api/config")).instabox.configured).toBe(false);
    expect(await f.request("GET", "/api/local-computer")).toMatchObject({ ready: true, mode: "shared" });
    const preview = await f.request("GET", `/api/bots/${bot.id}/computer?threadId=${bot.threadId}`);
    expect(preview).toMatchObject({ surface: "vm" });
    expect(f.rows(".resources")).toEqual([]);
    expect(f.rows(".actions")).toEqual([]);
  });

  it("1: assigns two agents different resources, exec users, displays and sockets", async () => {
    const f = await fixture();
    expect((await f.request("GET", "/api/config")).localVm.screens).toBe(4);
    for (const screens of [2, 3, 4]) {
      await f.request("PATCH", "/api/config", { localVm: { screens } });
      expect((await f.request("GET", "/api/config")).localVm.screens).toBe(screens);
      expect((await f.screenList()).screens).toBe(screens);
    }
    expect(f.rows(".actions").some(row => row.action === "remove" || row.action === "run")).toBe(false);
    const a = await f.bot(0), b = await f.bot(1);
    await f.send(a.id); const first = await f.dump(0);
    await f.send(b.id); const second = await f.dump(1);
    for (const [index, dump] of [first, second].entries()) {
      const n = index + 1;
      await f.tool(dump);
      expect(dump.mcpConfig.mcpServers.computer.args).toEqual(expect.arrayContaining([`crybot-s${n}`, `:${n}`, `/run/user/6100${n}/crybot-cua.sock`]));
      expect(dump.mcpConfig.mcpServers.computer.args).not.toContain(`crybot-s${3 - n}`);
      const exec = f.rows(".execs").find(row => row.args.includes(`crybot-s${n}`) && row.args.includes(`/run/user/6100${n}/crybot-cua.sock`));
      expect(exec.args).toEqual(expect.arrayContaining(["-u", `crybot-s${n}`, `DISPLAY=:${n}`]));
      for (const row of f.rows(".execs").filter(row => row.args.includes(`crybot-s${n}`))) {
        expect(row.args).not.toContain(`DISPLAY=:${3 - n}`);
        expect(row.args.join(" ")).not.toContain(`/run/user/6100${3 - n}/crybot-cua.sock`);
      }
      expect(dump.mcpConfig.mcpServers.computer.args).not.toContain(`:${3 - n}`);
      expect(dump.mcpConfig.mcpServers.computer.args).not.toContain(`/run/user/6100${3 - n}/crybot-cua.sock`);
      expect(f.rows(".resources").some(row => row.resource === `computer:vm:shared:s${n}`)).toBe(true);
    }
    expect((await f.refused("/api/config", { localVm: { screens: 1 } })).status).toBe(409);
    expect((await f.screenList()).slots.filter((slot: any) => slot.bot).map((slot: any) => slot.bot.id)).toEqual([a.id, b.id]);
  });

  it("2: queues the fifth agent with position 1 and acquires a screen automatically", async () => {
    const f = await fixture();
    const bots = [];
    for (let i = 0; i < 5; i++) bots.push(await f.bot(i));
    for (let i = 0; i < 4; i++) { await f.send(bots[i].id); await f.dump(i); }
    await f.send(bots[4].id);
    await f.until(() => f.rows(".events"), rows => rows.some(row => row.type === "turn.wait_started" && row.position === 1));
    f.finish(1); await f.idle(bots[1].id);
    const resumed = await f.dump(4);
    expect(resumed.mcpConfig.mcpServers.computer.args).toContain("crybot-s2");
    f.finish(4); await f.idle(bots[4].id);
    expect(f.rows(".events").some(row => row.type === "turn.wait_ended" && row.outcome === "acquired")).toBe(true);
  });

  it("3: taking and handing back one screen leaves the other agent and its hold alone", async () => {
    const f = await fixture(); const a = await f.bot(0), b = await f.bot(1);
    await f.send(a.id); const da = await f.dump(0);
    await f.send(b.id); const db = await f.dump(1);
    const lease = "fixture-screen-one-lease";
    await f.request("POST", `/api/bots/${a.id}/computer/control`, { action: "take", target: "local/shared-s1", controlLeaseId: lease });
    expect((await f.control(da).state(true, { tool: "computer_click" })).held).toBe(true);
    expect((await f.control(db).state(true, { tool: "computer_click" })).held).toBe(false);
    f.finish(1); await f.idle(b.id);
    await f.request("POST", `/api/bots/${b.id}/computer/control`, { action: "take", target: "local/shared-s2", controlLeaseId: "fixture-screen-two-lease" });
    await f.request("POST", `/api/bots/${a.id}/computer/control`, { action: "release", controlLeaseId: lease });
    expect((await f.control(da).state(true)).held).toBe(false);
    expect((await f.request("GET", `/api/bots/${b.id}/computer/control`)).held).toBe(true);
    f.finish(0); await f.idle(a.id);
  });

  it("4: screens=1 keeps the original resource, MCP socket, viewer and control key", async () => {
    const f = await fixture(1);
    await f.request("POST", "/api/local-computer/remove", {});
    await f.request("POST", "/api/local-computer/run", {});
    const run = f.rows(".actions").find(row => row.action === "run");
    expect(run.args).toEqual(expect.arrayContaining(["--pids-limit", "4096", "--shm-size", "512m", "VNC_PW=single-fixture"]));
    expect(run.args.join(" ")).not.toContain("com.crybot.screens-layout");
    expect(run.args.join(" ")).not.toContain("crybot-screens");
    const a = await f.bot(0);
    await f.send(a.id); const dump = await f.dump(0);
    await f.tool(dump);
    const args = dump.mcpConfig.mcpServers.computer.args;
    expect(args).toContain("/run/user/1000/crybot-cua.sock");
    expect(f.rows(".execs").some(row => ["-u", "cua", "DISPLAY=:1", "/run/user/1000/crybot-cua.sock"].every(arg => row.args.includes(arg)))).toBe(true);
    expect(args.some((arg: string) => arg.startsWith("crybot-s"))).toBe(false);
    await f.control(dump).state(true);
    expect(f.rows(".resources").some(row => row.resource === "computer:vm:shared")).toBe(true);
    expect((await f.request("GET", `/api/bots/${a.id}/local-computer`)).viewerTarget).toBe("local/shared");
    await f.request("POST", `/api/bots/${a.id}/computer/control`, { action: "take", target: "local/shared", controlLeaseId: "fixture-single-screen-lease" });
    expect((await f.control(dump).state(true)).held).toBe(true);
    expect(f.rows(".execs").some(row => row.args.join(" ").includes("screen-s"))).toBe(false);
  });

  it("5: retires only the idle screen, preserves affinity and starts container idle only after all screens stop", async () => {
    const f = await fixture(); const a = await f.bot(0), b = await f.bot(1);
    await f.send(a.id); await f.dump(0);
    await f.send(b.id); await f.dump(1);
    const initialStops = f.rows(".actions").filter(row => row.action === "stop").length;
    f.finish(1); await f.idle(b.id);
    await f.until(f.screenList, list => list.slots[1].state === "off");
    expect(f.rows(".execs").some(row => row.args.join(" ").includes("stop screen-s2:*"))).toBe(true);
    expect(f.rows(".actions").filter(row => row.action === "stop")).toHaveLength(initialStops);
    const affinity = JSON.parse(readFileSync(join(f.home, "data", "local-vm-screens.json"), "utf8"));
    expect(affinity[b.id]).toBe(2);
    await f.send(b.id);
    await f.until(f.screenList, list => list.slots[1].bot?.id === b.id);
    f.finish(0); await f.idle(a.id); await f.idle(b.id);
    await f.until(() => f.rows(".actions"), rows => rows.filter(row => row.action === "stop").length > initialStops);
    const stop = f.rows(".actions").filter(row => row.action === "stop").at(-1);
    const lastScreenStop = f.rows(".execs").filter(row => row.args.join(" ").includes(" stop screen-s")).at(-1);
    expect(stop.at - lastScreenStop.at).toBeGreaterThanOrEqual(1_000);
  });

  it.each([0, 4])("Auto text completes without claiming or queueing when %i screens are busy", async occupied => {
    const f = await fixture();
    for (let i = 0; i < occupied; i++) { const bot = await f.bot(i); await f.send(bot.id); await f.dump(i); }
    const occupiedSlots = (await f.screenList()).slots.filter((slot: any) => slot.bot);
    expect(occupiedSlots).toHaveLength(occupied);
    expect(occupiedSlots.every((slot: any) => slot.state === "ready")).toBe(true);
    expect(new Set(occupiedSlots.map((slot: any) => slot.bot.id)).size).toBe(occupied);
    const chat = await f.bot(4, true);
    await f.send(chat.id, "Reply with a short greeting. Do not use tools.");
    const dump = await f.dump(4);
    expect(dump.mcpConfig.mcpServers.computer.env.CRYBOT_CONTAINER_DYNAMIC_SCREEN).toBe("1");
    f.finish(4); await f.idle(chat.id);
    const list = await f.screenList();
    expect(list.slots.some((slot: any) => slot.bot?.id === chat.id)).toBe(false);
    expect(list.queue).toEqual([]);
    expect(f.rows(".events").some(row => row.type === "turn.wait_started")).toBe(false);
  });

  it("Auto text proceeds without a computer while the multi-screen desktop update is pending", async () => {
    const f = await fixture(4, 15_000, { imageMissing: true, imageMatches: false, holdPull: true });
    const chat = await f.bot(0, true);
    await f.send(chat.id, "Check the dashboard when your desktop is ready.");
    const sent = await f.dump(0);
    expect(sent.mcpConfig?.mcpServers?.computer).toBeUndefined();
    expect(sent.systemPrompt).toContain("This bot's Local VM desktop is being updated to the new version");
    expect(sent.systemPrompt).toContain("do not use another computer");
    expect((await f.screenList()).slots.every((slot: any) => slot.bot === null)).toBe(true);
    expect(f.rows(".actions")).toEqual([]);
    f.finish(0); await f.idle(chat.id);
  });

  it.each([false, true])("an Auto routine never creates a missing multi-screen VM (imageMissing=%s)", async imageMissing => {
    const f = await fixture(4, 15_000, { container: "missing", imageMissing });
    const bot = await f.bot(0, true);
    const { routine } = await f.request("POST", "/api/routines", {
      botId: bot.id, name: "Screen routine", prompt: "Summarize the morning report.", enabled: false,
      schedule: { type: "interval", everyMinutes: 60, anchorAt: Date.now() + 3_600_000 },
    });
    await f.request("POST", `/api/routines/${routine.id}/run`, {});
    expect((await f.dump(0)).mcpConfig?.mcpServers?.computer).toBeUndefined();
    expect(f.rows(".actions").some(row => row.action === "run")).toBe(false);
    expect((await f.screenList()).slots.every((slot: any) => slot.bot === null)).toBe(true);
    f.finish(0); await f.idle(bot.id);
  });

  it.each([0, 2000])("Auto binds its MCP to the assigned screen only on its first tool call (screen startup delay: %i ms)", async delayMs => {
    const f = await fixture(4, 15_000, { screenReadyDelayMs: { 2: delayMs } });
    const first = await f.bot(0); await f.send(first.id); await f.dump(0);
    const chat = await f.bot(1, true); await f.send(chat.id); const dump = await f.dump(1);
    expect((await f.screenList()).slots.some((slot: any) => slot.bot?.id === chat.id)).toBe(false);
    await f.tool(dump);
    expect((await f.screenList()).slots[1]).toMatchObject({ state: "ready", bot: { id: chat.id } });
    const exec = f.rows(".execs").filter(row => row.args.includes("mcp") && row.args.includes("crybot-s2"));
    expect(exec).toHaveLength(1);
    expect(exec[0].args).toEqual(expect.arrayContaining(["DISPLAY=:2", "/run/user/61002/crybot-cua.sock"]));
    expect(exec[0].args).not.toContain("DISPLAY=:1");
    expect(exec[0].args).not.toContain("/run/user/61001/crybot-cua.sock");
  });

  it("automatically resumes a parked fifth turn after an idle screen is released", async () => {
    const f = await fixture(4, 1000), bots = [];
    for (let i = 0; i < 5; i++) bots.push(await f.bot(i));
    for (let i = 0; i < 4; i++) { await f.send(bots[i].id); await f.dump(i); }
    await f.send(bots[4].id);
    await f.until(() => f.rows(".events"), rows => rows.some(row => row.type === "turn.wait_ended" && row.outcome === "parked"));
    f.finish(1); await f.idle(bots[1].id);
    expect((await f.dump(4)).mcpConfig.mcpServers.computer.args).toContain("crybot-s2");
    f.finish(4); await f.idle(bots[4].id);
  });

});

it("manually assigns an idle bot, joins its ready desktop, and reclaims it on idle", async () => {
  const f = await fixture();
  const bot = await f.bot(0);
  const path = `/api/bots/${bot.id}/local-computer`;
  const assigned = await f.request("POST", `${path}/assign-screen`, {});
  expect(assigned.screen.screen).toBe(1);
  await f.until(() => f.request("GET", path), status => status.ready);
  const repeated = await f.request("POST", `${path}/assign-screen`, {});
  expect(repeated.screen.screen).toBe(1);
  const controlLeaseId = "fixture-manual-screen-lease";
  await f.request("POST", `/api/bots/${bot.id}/computer/control`, { action: "take", target: "local/shared-s1", controlLeaseId });
  const joined = await f.request("POST", `${path}/join?controlLeaseId=${controlLeaseId}`, {});
  expect(new URLSearchParams(new URL(joined.joinUrl).hash.slice(1)).get("path")).toBe("websockify?token=s1");
  await f.request("POST", `/api/bots/${bot.id}/computer/control`, { action: "release", controlLeaseId });
  await f.until(f.screenList, list => list.slots.every((slot: any) => !slot.bot));
});

it("manual requests queue behind four running tasks and automatically get the released screen", async () => {
  const f = await fixture();
  const bots = [];
  for (let i = 0; i < 5; i++) bots.push(await f.bot(i));
  for (let i = 0; i < 4; i++) { await f.send(bots[i].id); await f.dump(i); }
  const path = `/api/bots/${bots[4].id}/local-computer`;
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await f.request("POST", `${path}/assign-screen`, {})).toEqual({ screen: null, queue_position: 1 });
  }
  expect(await f.request("GET", path)).toEqual({ screen: null, queue_position: 1 });
  expect((await f.screenList()).slots.map((slot: any) => slot.bot.id)).toEqual(bots.slice(0, 4).map(bot => bot.id));
  f.finish(1); await f.idle(bots[1].id);
  const status = await f.until(() => f.request("GET", path), status => status.ready);
  expect(status.screen.screen).toBe(2);
  expect((await f.screenList()).slots.filter((slot: any) => slot.screen !== 2).map((slot: any) => slot.bot.id)).toEqual([bots[0].id, bots[2].id, bots[3].id]);
});

it("manual assignment is a no-op for the single desktop", async () => {
  const f = await fixture(1);
  const bot = await f.bot(0);
  const status = await f.request("POST", `/api/bots/${bot.id}/local-computer/assign-screen`, {});
  expect(status).not.toHaveProperty("screen");
  expect((await f.screenList()).layout).toBe("single");
  expect(f.rows(".actions").some(row => row.action === "run" || row.action === "start")).toBe(false);
});
