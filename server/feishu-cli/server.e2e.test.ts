import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { detectBox } from "../bot-box/detect.ts";
import { under } from "../bot-box/plan.ts";
import { SessionRegistry } from "../sessions.ts";
import { launchRestartableServer } from "../testing/restartable-server.ts";
import { openSse, type SseRecorder } from "../testing/sse.ts";

const hostBox = process.platform === "linux" ? detectBox({ env: { ...process.env, CRYBOT_BOT_BOX: "on" } }) : undefined;
const serviceBoxEnv = {
  ...process.env,
  CRYBOT_BOT_BOX: "on",
  PATH: [dirname(process.execPath), hostBox?.tools?.bwrap ? dirname(hostBox.tools.bwrap) : undefined, process.env.PATH].filter(Boolean).join(delimiter),
};
const serviceBox = process.platform === "linux" ? detectBox({ env: serviceBoxEnv }) : undefined;
const codeRoot = fileURLToPath(new URL("../..", import.meta.url));

it.for([false, true])("uses authenticated identity with sandbox=%s and never publishes turn tokens", { timeout: 120_000 }, async (boxed, context) => {
  if (process.platform !== "linux") { context.skip(); return; }
  if (boxed && !under(await realpath(tmpdir()), "/tmp")) {
    console.info("跳过 sandbox=true：测试进程的 tmpdir() 不在 /tmp 下，套接字路径校验会停用代领");
    context.skip();
    return;
  }
  if (boxed && serviceBox?.box !== "bwrap") {
    console.info(`跳过 sandbox=true：服务进程检测结果为 ${serviceBox?.reason ?? "not-linux"}`);
    context.skip();
    return;
  }
  const socketDirectory = await mkdtemp(join(tmpdir(), "feishu-broker-"));
  const directory = await mkdtemp(join(codeRoot, ".tmp-feishu-host-"));
  const socket = join(await realpath(socketDirectory), "broker.sock");
  const serviceTmp = join(socketDirectory, "tmp");
  if (boxed) await mkdir(serviceTmp);
  const short = "fixture-host-short-token";
  let requests = 0;
  let authorizationRequired = false;
  const authorizationUrl = "https://example.invalid/authorize";
  const broker = createServer((_req, res) => {
    requests++;
    res.setHeader("content-type", "application/json");
    if (authorizationRequired) {
      res.statusCode = 403;
      res.end(JSON.stringify({ message: "请重新授权", authorization_url: authorizationUrl }));
      return;
    }
    res.end(JSON.stringify({ user_access_token: short, app_id: "fixture-cli-app", expires_at: Math.floor(Date.now() / 1000) + 3600 }));
  });
  let fixture: Awaited<ReturnType<typeof launchRestartableServer>> | undefined;
  let events: SseRecorder | undefined;
  try {
    try {
      await new Promise<void>((resolve, reject) => { broker.once("error", reject); broker.listen(socket, resolve); });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") {
        console.info("跳过 server.e2e：当前沙箱禁止监听 Unix socket");
        context.skip();
        return;
      }
      throw error;
    }
    fixture = await launchRestartableServer({ env: {
      CRYBOT_BOT_BOX: boxed ? "on" : "off",
      ...(boxed ? { PATH: serviceBoxEnv.PATH, TMPDIR: serviceTmp, TMP: serviceTmp, TEMP: serviceTmp } : {}),
      CRYBOT_FEISHU_CLI_USERS: "test_union", CRYBOT_FEISHU_BROKER_SOCKET: socket,
      CRYBOT_FEISHU_APP_ID: "fixture-login-app", CRYBOT_FEISHU_APP_SECRET: "fixture-login-secret",
      CRYBOT_FEISHU_TENANTS: "test_tenant", CRYBOT_FEISHU_ALLOW: "test_union,other_union", CRYBOT_FEISHU_ADMINS: "test_union,other_union",
    } });
    const api = async (path: string, token?: string, body?: unknown): Promise<any> => {
      const response = await fetch(fixture!.url + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      expect(response.ok, await response.clone().text()).toBe(true);
      return response.json();
    };
    const { bot } = await api("/api/bots", undefined, { name: "Feishu fixture" });
    await fixture.stop();
    const sessions = new SessionRegistry({ file: join(fixture.dataDir, "sessions.json") });
    const first = sessions.issueDevice("feishu:test_union", "Fixture enabled", { displayName: "Fixture enabled", scopes: ["admin", "client"], maxAgeDays: 1, tenantKey: "test_tenant" });
    const second = sessions.issueDevice("feishu:other_union", "Fixture denied", { displayName: "Fixture denied", scopes: ["admin", "client"], maxAgeDays: 1, tenantKey: "test_tenant" });
    sessions.close();
    const configPath = join(fixture.dataDir, "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.language = "zh-CN";
    const cli = join(directory, "fake-cli.mjs");
    await writeFile(cli, [
      "#!/usr/bin/env node",
      'import { readFileSync } from "node:fs";',
      'import { createConnection } from "node:net";',
      'process.env.FAKE_CLAUDE_DUMP = process.cwd() + "/feishu-fixture-dump.json";',
      `const socket = ${boxed ? JSON.stringify(socket) : "process.env.CRYBOT_FEISHU_BROKER_SOCKET"};`,
      'process.env.FAKE_CLAUDE_SOCKET_PROBE = socket ? await new Promise(resolve => { const client = createConnection(socket); client.once("connect", () => { client.end(); resolve("connected"); }); client.once("error", error => resolve(error.code ?? "unknown")); }) : "missing";',
      'const at = process.argv.indexOf("--append-system-prompt-file");',
      'const system = at < 0 ? "" : readFileSync(process.argv[at + 1], "utf8");',
      `const link = ${JSON.stringify(authorizationUrl)};`,
      'process.env.FAKE_CLAUDE_REPLIES = JSON.stringify([system.includes(link) ? `飞书暂不可用，请去 ${link} 重新授权` : "Fixture reply"]);',
      `await import(${JSON.stringify(new URL("../testing/fake-claude-cli.ts", import.meta.url).href)});`,
    ].join("\n"), { mode: 0o700 });
    config.instances.claude.config.cli = cli;
    await writeFile(configPath, JSON.stringify(config));
    await fixture.start();
    events = await openSse(fixture.url + "/api/events", { authorization: `Bearer ${first.token}` });
    const { group } = await api("/api/groups", first.token, { name: "Fixture group", memberIds: [bot.id], setup: { bulletin: "", defaultResponder: { kind: "member", botId: bot.id } } });
    for (const scenario of ["allowed", "denied", "group", "reauthorize", "offline"] as const) {
      const token = scenario === "denied" ? second.token : first.token;
      const allowed = boxed && scenario === "allowed";
      const threadId = scenario === "group" ? group.threadId : bot.threadId;
      if (scenario === "reauthorize") authorizationRequired = true;
      if (scenario === "offline") await new Promise<void>(resolve => broker.close(() => resolve()));
      const before = await api(`/api/threads/${threadId}/messages?limit=200`, token);
      const previousIds = new Set(before.messages.map((message: { id: string }) => message.id));
      await api(scenario === "group" ? `/api/groups/${group.id}/messages` : `/api/bots/${bot.id}/messages`, token, { text: "Fixture request", threadId });
      let dumpFile: string | undefined;
      await expect.poll(async () => {
        const file = (await readdir(fixture!.dataDir, { recursive: true, withFileTypes: true })).find(file => file.name === "feishu-fixture-dump.json");
        dumpFile = file ? join(file.parentPath, file.name) : undefined;
        return dumpFile;
      }, { timeout: 30_000 }).toBeDefined();
      const dump = JSON.parse(await readFile(dumpFile!, "utf8"));
      if (allowed) {
        expect(dump.env.CRYBOT_FEISHU_USER_TOKEN).toBe(short);
        expect(dump.env.CRYBOT_FEISHU_APP_ID).toBe("fixture-cli-app");
        expect(dump.env.FAKE_CLAUDE_SOCKET_PROBE).toBe("connected");
        expect(dump.systemPrompt).toContain("lark-cli --help");
        expect(dump.systemPrompt).toMatch(/明确同意|explicit consent/);
      } else {
        expect(dump.env.CRYBOT_FEISHU_USER_TOKEN).toBeUndefined();
        expect(dump.env.CRYBOT_FEISHU_BROKER_SOCKET).toBeUndefined();
        if (boxed) expect(dump.env.FAKE_CLAUDE_SOCKET_PROBE).toMatch(/^(ENOENT|EACCES|EPERM)$/);
        else expect(dump.env.FAKE_CLAUDE_SOCKET_PROBE).toBe("missing");
        expect(dump.systemPrompt).not.toContain("lark-cli");
      }
      await expect.poll(async () => {
        const { bots } = await api("/api/bots", token);
        const current = bots.find((entry: { id: string }) => entry.id === bot.id);
        return Boolean(current.busy || current.activity === "working");
      }, { timeout: 30_000 }).toBe(false);
      await expect.poll(async () => {
        const history = await api(`/api/threads/${threadId}/messages?limit=200`, token);
        return history.messages.findLast((message: { id: string; role: string; kind: string }) => !previousIds.has(message.id) && message.role === "bot" && message.kind === "text")?.turnSucceeded;
      }, { timeout: 30_000 }).toBe(true);
      const history = await api(`/api/threads/${threadId}/messages?limit=200`, token);
      expect(JSON.stringify(history)).not.toContain(short);
      if (boxed && (scenario === "reauthorize" || scenario === "offline")) {
        expect(dump.systemPrompt).toContain("飞书暂不可用");
        expect(Object.keys(dump.env).filter(key => /^(CRYBOT_FEISHU_|LARKSUITE_CLI_)/.test(key))).toEqual([]);
        expect(history.messages.filter((message: { id: string; tool?: { ok: boolean } }) => !previousIds.has(message.id) && message.tool?.ok === false)).toEqual([]);
      }
      if (boxed && scenario === "reauthorize") {
        expect(dump.systemPrompt).toContain(authorizationUrl);
        expect(dump.systemPrompt).toContain("在回复中告诉用户");
        expect(history.messages.findLast((message: { role: string; kind: string }) => message.role === "bot" && message.kind === "text").text).toContain(authorizationUrl);
      }
      await rm(dumpFile!, { force: true });
    }
    expect(requests).toBe(boxed ? 2 : 0);
    expect(events.frames.filter(frame => frame.kind === "notify" && frame.notification?.kind === "incident")).toEqual([]);
    expect(JSON.stringify(events.frames)).not.toContain(short);
    events.close();
    await fixture.stop();
    const logs = await readFile(fixture.logPath, "utf8");
    expect(logs).not.toContain(short);
    if (!boxed) expect(logs).toContain("飞书代领需要开启智能体沙箱，当前未开启，已停用");
    for (const root of [fixture.dataDir, socketDirectory]) {
      for (const file of await readdir(root, { recursive: true, withFileTypes: true })) {
        if (file.isFile()) expect((await readFile(join(file.parentPath, file.name))).includes(Buffer.from(short)), file.name).toBe(false);
      }
    }
  } finally {
    events?.close();
    await fixture?.close();
    broker.closeAllConnections();
    await new Promise<void>(resolve => broker.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
    await rm(socketDirectory, { recursive: true, force: true });
  }
});
