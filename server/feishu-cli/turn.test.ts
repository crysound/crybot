import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Message } from "../store.ts";
import { SessionRegistry } from "../sessions.ts";
import { linePersonKey } from "../host/thread-person.ts";
import { personKey } from "../person-key.ts";
import { resetFeishuLoginWarningsForTests } from "../feishu-login.ts";
import { stripWorkspaceCredentialEnv } from "../credential-env.ts";
import { boxEnvironment } from "../bot-box/env.ts";
import { botBox, BoxRunner } from "../bot-box/box.ts";
import { visibleInBox } from "../bot-box/plan.ts";
import { claudeTurnLaunch, maySteerClaudeTurn } from "../drivers/claude-turn-launch.ts";
import type { KeepWarmContract } from "../drivers/claude-keepwarm.ts";
import { feishuCliAccess, feishuCliPrompt, directFeishuCliAccess } from "./turn.ts";
import { brokerToken, BrokerAuthorizationError } from "./protocol.ts";
import { feishuCliUser } from "./config.ts";

vi.mock("./protocol.ts", async original => ({ ...await original<typeof import("./protocol.ts")>(), brokerToken: vi.fn() }));
let directory: string;
let sessions: SessionRegistry;
let env: NodeJS.ProcessEnv;
const short = "fixture-short-turn-token";
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "feishu-turn-"));
  sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  env = { CRYBOT_FEISHU_CLI_USERS: " test_union, test_union ", CRYBOT_FEISHU_BROKER_SOCKET: "/fixture/token.sock" };
  vi.spyOn(botBox, "startOptions").mockReturnValue({ dataDir: join(directory, "data"), home: directory, port: 0, denyEnv: new Set(), codeRoots: [], engineRoots: [] });
  vi.mocked(brokerToken).mockResolvedValue({ user_access_token: short, app_id: "fixture-app", expires_at: 9_000_000_000 });
  resetFeishuLoginWarningsForTests();
  vi.spyOn(botBox, "enabled").mockReturnValue(true);
});
afterEach(async () => { sessions.close(); vi.restoreAllMocks(); vi.mocked(brokerToken).mockReset(); await rm(directory, { recursive: true, force: true }); });

it("resolves the existing Feishu session identity and keeps turn credentials out of serialized state and logs", async () => {
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
  const session = sessions.issueDevice("feishu:test_union", "Fixture", { scopes: ["client"], maxAgeDays: 1 }).session;
  const unionId = sessions.feishuUnionIdForPerson(personKey(session));
  expect(unionId).toBe("test_union");
  const access = feishuCliAccess(unionId, env)!;
  expect(brokerToken).not.toHaveBeenCalled();
  expect(await access.environment()).toEqual({ CRYBOT_FEISHU_USER_TOKEN: short, CRYBOT_FEISHU_APP_ID: "fixture-app", CRYBOT_FEISHU_EXPIRES_AT: "9000000000", CRYBOT_FEISHU_BROKER_SOCKET: "/fixture/token.sock" });
  expect(JSON.stringify([access, sessions.list(), logs.map(log => log.mock.calls)])).not.toContain(short);
  expect(await readFile(join(directory, "sessions.json"), "utf8")).not.toContain(short);
});

it("does not enable another user, anonymous or ordinary non-Feishu sessions", () => {
  const session = sessions.issueDevice("feishu:other_union", "Fixture", { scopes: ["client"], maxAgeDays: 1 }).session;
  expect(feishuCliAccess(sessions.feishuUnionIdForPerson(personKey(session)), env)).toBeUndefined();
  const ordinary = sessions.issue({ label: "Fixture", scopes: ["client"] }).session;
  expect(sessions.feishuUnionIdForPerson(personKey(ordinary))).toBeUndefined();
  expect(feishuCliAccess(undefined, env)).toBeUndefined();
  expect(brokerToken).not.toHaveBeenCalled();
});

it("fails closed at boot and launch when botBox.enabled() is false", async () => {
  vi.mocked(botBox.enabled).mockReturnValue(false);
  env.CRYBOT_BOT_BOX = "on";
  const warn = vi.fn();
  expect(feishuCliUser(env, warn)).toBeUndefined();
  expect(warn.mock.calls).toEqual([["飞书代领需要开启智能体沙箱，当前未开启，已停用"]]);
  const launch = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", feishuCli: feishuCliAccess("test_union", env) }, env);
  expect(launch.environment()).not.toHaveProperty("CRYBOT_FEISHU_USER_TOKEN");
  expect(launch.box({})).toEqual({ rw: [], allowEnv: [] });
  expect(launch.launchSystem).not.toContain("lark-cli");
  expect(brokerToken).not.toHaveBeenCalled();
});

it("requires a running sandbox as well as successful detection", () => {
  vi.mocked(botBox.enabled).mockReturnValue(false);
  expect(feishuCliAccess("test_union", env)).toBeUndefined();
  expect(brokerToken).not.toHaveBeenCalled();
});

it("rejects a socket visible in a read-only host mount", () => {
  env.CRYBOT_FEISHU_BROKER_SOCKET = "/opt/x/token.sock";
  const warn = vi.fn();
  expect(feishuCliUser(env, warn)).toBeUndefined();
  expect(warn).toHaveBeenCalledWith("飞书代领套接字路径对非授权盒子可见，已停用");
});

it("allows a socket in the private runtime mount", () => {
  env.CRYBOT_FEISHU_BROKER_SOCKET = "/run/crybot-feishu-broker/token.sock";
  expect(feishuCliUser(env)).toBe("test_union");
});

it("rejects multiple distinct users with a fixed boot warning", () => {
  env.CRYBOT_FEISHU_CLI_USERS = " test_union,other_union,test_union ";
  const warn = vi.fn();
  expect(feishuCliUser(env, warn)).toBeUndefined();
  expect(warn.mock.calls).toEqual([["飞书代领只支持一位用户，当前名单超过一人，已停用"]]);
  for (const user of ["test_union", "other_union"]) expect(feishuCliAccess(user, env)).toBeUndefined();
  expect(brokerToken).not.toHaveBeenCalled();
});

it("rejects and warns about wildcard entries using the shared union_id parser", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  env.CRYBOT_FEISHU_CLI_USERS = "*";
  expect(feishuCliAccess("test_union", env)).toBeUndefined();
  expect(feishuCliAccess("other_union", env)).toBeUndefined();
  expect(warn).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls[0][0]).toContain("does not allow *");
});

it("continues without Feishu when the broker is unreachable and never publishes unknown errors", async () => {
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
  vi.mocked(brokerToken).mockRejectedValue(new Error(short));
  const access = feishuCliAccess("test_union", env)!;
  expect(await access.environment()).toEqual({});
  expect(access.prompt()).toMatch(/飞书暂不可用|Feishu is temporarily unavailable/);
  expect(access.prompt()).not.toContain("lark-cli");
  expect(JSON.stringify([access.prompt(), logs.map(log => log.mock.calls)])).not.toContain(short);
});

it.each(["zh-CN", "en"])("provides consent, identity, timezone and credential rules in %s", language => {
  const prompt = feishuCliPrompt(language);
  expect(prompt).toContain("lark-cli --help");
  expect(prompt).toContain("lark-cli update");
  expect(prompt).toContain("2026-11-15T09:00:00+08:00");
  expect(prompt).toMatch(/明确同意|explicit consent/);
  expect(prompt).toMatch(/凭证文件|credential files/);
});

it("strips inherited Feishu and Meegle capability variables from normal child environments", () => {
  const child = { ...env, CRYBOT_FEISHU_USER_TOKEN: short, LARKSUITE_CLI_APP_SECRET: "fixture", MEEGLE_TOKEN: "fixture", PATH: "path" };
  stripWorkspaceCredentialEnv(child);
  expect(child).toEqual({ PATH: "path" });
});

it.each(["zh-CN", "en"])("continues with an authorization link and no capability in %s", async language => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/configured-authorize";
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError(short, "https://example.invalid/authorize"));
  const access = feishuCliAccess("test_union", env, language)!;
  expect(await access.environment()).toEqual({});
  expect(access.prompt()).toContain("https://example.invalid/authorize");
  expect(access.prompt()).toMatch(/在回复中告诉用户|Tell the user in your reply/);
  expect(access.prompt()).not.toContain("lark-cli");
  expect(JSON.stringify([access.prompt(), logs.map(log => log.mock.calls)])).not.toContain(short);
});

it.each([
  "https://example.invalid/authorize\nfixture",
  "http://example.invalid/authorize",
  "https://example.invalid/authorize\u001b",
  `https://example.invalid/${"x".repeat(2048)}`,
])("does not put an unsafe upstream authorization URL in the prompt: %s", async authorizationUrl => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/configured-authorize";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", authorizationUrl));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  await access.environment();
  expect(access.prompt()).not.toContain(authorizationUrl);
  expect(access.prompt()).toBe(`飞书暂不可用。 请在回复中告诉用户去此链接重新授权：${env.CRYBOT_FEISHU_AUTHORIZATION_URL}`);
});

it.each([
  "https://other.invalid/authorize",
  "https://example.invalid:8443/authorize",
  "http://example.invalid/authorize",
])("falls back to the configured link for a different broker origin: %s", async authorizationUrl => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/configured-authorize";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", authorizationUrl));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  expect(await access.environment()).toEqual({});
  expect(access.prompt()).toBe("飞书暂不可用。 请在回复中告诉用户去此链接重新授权：https://example.invalid/configured-authorize");
  expect(access.prompt()).not.toContain(authorizationUrl);
  expect(access.prompt()).not.toContain("other.invalid");
});

it.each([
  ["https://example.invalid/authorize?state=fixture", "https://example.invalid/authorize?state=fixture"],
  ["https://EXAMPLE.invalid:443/授权?state=中文", "https://example.invalid/%E6%8E%88%E6%9D%83?state=%E4%B8%AD%E6%96%87"],
])("accepts and normalizes the broker link with the same origin: %s", async (brokerUrl, expected) => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://EXAMPLE.invalid:443/configured-authorize";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", brokerUrl));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  await access.environment();
  expect(access.prompt()).toBe(`飞书暂不可用。 请在回复中告诉用户去此链接重新授权：${expected}`);
});

it.each([
  undefined,
  "http://example.invalid/configured-authorize",
  "https://example.invalid/configured-authorize\nfixture",
  "https://example.invalid/configured-authorize\u001b",
  `https://example.invalid/${"x".repeat(2048)}`,
])("omits even a valid broker link without a valid configured URL: %s", async configuredUrl => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = configuredUrl;
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", "https://example.invalid/authorize"));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  await access.environment();
  expect(access.prompt()).toBe("飞书暂不可用。");
});

it("uses a valid configured authorization URL when the broker omits one", async () => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/configured-authorize";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权"));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  await access.environment();
  expect(access.prompt()).toContain(env.CRYBOT_FEISHU_AUTHORIZATION_URL);
});

it("rejects an unsafe configured authorization URL", async () => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "http://example.invalid/configured-authorize";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权"));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  await access.environment();
  expect(access.prompt()).toBe("飞书暂不可用。");
});

it.each([false, true])("does not fall back to the allowlisted thread starter without a human sender (peer: %s)", async peer => {
  const session = sessions.issueDevice("feishu:test_union", "Fixture", { scopes: ["client"], maxAgeDays: 1 }).session;
  const starter = personKey(session);
  expect(sessions.feishuUnionIdForPerson(starter)).toBe("test_union");
  const messages: Message[] = [
    { id: "starter", role: "user", kind: "text", text: "Fixture", at: 1, sender: { id: starter, name: "Fixture" } },
    { id: "request", role: "user", kind: "text", text: "Fixture", at: 2, ...(peer ? { sender: { id: starter, name: "Fixture" }, peerAsk: { botId: "fixture-peer", name: "Fixture peer" } } : {}) },
  ];
  const access = directFeishuCliAccess({ messageId: "request", generations: new Set(["generation"]) }, "generation",
    messageId => linePersonKey(messages.find(message => message.id === messageId)),
    person => sessions.feishuUnionIdForPerson(person), env);
  expect(access).toBeUndefined();
  expect(brokerToken).not.toHaveBeenCalled();
});

it("grants only the proven current request generation", async () => {
  const session = sessions.issueDevice("feishu:test_union", "Fixture", { scopes: ["client"], maxAgeDays: 1 }).session;
  const personOf = () => personKey(session);
  const unionOf = (person: string | undefined) => sessions.feishuUnionIdForPerson(person);
  const request = { messageId: "request", generations: new Set(["generation"]) };
  expect(directFeishuCliAccess(request, "stale", personOf, unionOf, env)).toBeUndefined();
  expect(directFeishuCliAccess({ ...request, stopped: true }, "generation", personOf, unionOf, env)).toBeUndefined();
  expect(directFeishuCliAccess(undefined, "generation", personOf, unionOf, env)).toBeUndefined();
  const access = directFeishuCliAccess(request, "generation", personOf, unionOf, env)!;
  expect((await access.environment()).CRYBOT_FEISHU_USER_TOKEN).toBe(short);
  const turn = { threadId: "thread", text: "Fixture", feishuCli: access };
  expect(maySteerClaudeTurn(turn, personOf())).toBe(true);
  expect(maySteerClaudeTurn(turn, "other-person")).toBe(false);
  expect(maySteerClaudeTurn(turn, undefined)).toBe(false);
  expect(maySteerClaudeTurn({ threadId: "thread", text: "Fixture" }, undefined)).toBe(true);
});

it.skipIf(process.platform === "win32")("mounts the token socket and grants environment names only to the authorized turn's box", async () => {
  env.CRYBOT_FEISHU_BROKER_SOCKET = "/run/crybot-feishu-broker/token.sock";
  env.CRYBOT_LARK_CLI_EXECUTABLE = "/opt/fixture/lark-cli";
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/authorize";
  const runner = new BoxRunner({
    bwrap: "/usr/bin/bwrap", denyEnv: new Set(),
    bridge: { socat: null, bridgeScript: "/app/bridge.js", node: "/usr/bin/node" },
    setup: { home: directory, dataDir: join(directory, "data"), codeRoots: ["/app"], engineRoots: [], bridges: [] },
  });
  for (const user of ["test_union", "other_union", undefined]) {
    const launch = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", feishuCli: feishuCliAccess(user, env) }, { ...env, CRYBOT_FEISHU_USER_TOKEN: "inherited" });
    const wrapped = runner.wrap({ command: "/usr/bin/node", args: [], env: launch.environment(), ...launch.box({ rw: ["/run/fixture-permission.sock"], ro: ["/app/hooks"] }) });
    expect(visibleInBox(wrapped.plan, env.CRYBOT_FEISHU_BROKER_SOCKET)).toBe(user === "test_union" ? "rw" : "none");
    expect(visibleInBox(wrapped.plan, "/run/crybot-feishu-broker/other.sock")).toBe("none");
    expect(visibleInBox(wrapped.plan, "/run/fixture-permission.sock")).toBe("rw");
    expect(wrapped.env.CRYBOT_FEISHU_USER_TOKEN).toBe(user === "test_union" ? short : undefined);
    expect(wrapped.env.CRYBOT_LARK_CLI_EXECUTABLE).toBe(user === "test_union" ? env.CRYBOT_LARK_CLI_EXECUTABLE : undefined);
    expect(wrapped.env.CRYBOT_FEISHU_CLI_USERS).toBeUndefined();
    if (user === "test_union") {
      expect(wrapped.env.CRYBOT_FEISHU_APP_ID).toBe("fixture-app");
      expect(wrapped.env.CRYBOT_FEISHU_EXPIRES_AT).toBe("9000000000");
      expect(wrapped.env.CRYBOT_FEISHU_AUTHORIZATION_URL).toBe(env.CRYBOT_FEISHU_AUTHORIZATION_URL);
      expect(wrapped.args).toContain("--unshare-pid");
    }
    wrapped.release();
  }
  expect(brokerToken).toHaveBeenCalledTimes(1);
});

it("isolates launch credentials from other users, boxes and warm contracts", async () => {
  const inherited = { ...env, PATH: "/fixture/bin", CRYBOT_FEISHU_USER_TOKEN: "inherited-token" };
  const contracts = new Map<string, KeepWarmContract>();
  const ordinary = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", system: "Stable" }, inherited);
  ordinary.rememberWarmContract(contracts, "thread", [], directory, null, null);
  expect(contracts.has("thread")).toBe(true);
  const granted = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", system: "Stable", feishuCli: feishuCliAccess("test_union", env) }, inherited);
  expect(granted.environment().CRYBOT_FEISHU_USER_TOKEN).toBe(short);
  expect(granted.launchSystem).toContain("lark-cli --help");
  expect(boxEnvironment(granted.environment())).toEqual({ PATH: "/fixture/bin" });
  granted.rememberWarmContract(contracts, "thread", [], directory, null, null);
  expect(contracts.has("thread")).toBe(false);
  const denied = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", system: "Stable", feishuCli: feishuCliAccess("other_union", env) }, inherited);
  expect(denied.environment()).toEqual({ PATH: "/fixture/bin" });
  expect(denied.launchSystem).toBe("Stable");
  expect(brokerToken).toHaveBeenCalledTimes(1);
});

it("builds the launch prompt after a failed token request and cannot retain a warm contract", async () => {
  env.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/configured-authorize";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", "https://example.invalid/authorize"));
  const launch = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", system: "Stable", feishuCli: feishuCliAccess("test_union", env) }, env);
  expect(launch.environment()).toEqual({});
  expect(launch.box({})).toEqual({ rw: [], allowEnv: [] });
  expect(launch.launchSystem).toContain("https://example.invalid/authorize");
  expect(launch.launchSystem).not.toContain(env.CRYBOT_FEISHU_AUTHORIZATION_URL);
  expect(launch.launchSystem).not.toContain("lark-cli");
  const contracts = new Map<string, KeepWarmContract>();
  launch.rememberWarmContract(contracts, "thread", [], directory, null, null);
  expect(contracts.size).toBe(0);
});

it("copies ordinary launch contracts and excludes confined guests", async () => {
  const source = { PATH: "/fixture/bin" };
  const launch = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", systemStable: "Stable", systemVolatile: "Volatile" }, source);
  const contracts = new Map<string, KeepWarmContract>();
  const args = ["--fixture"];
  const config = { nested: { value: "original" } };
  launch.rememberWarmContract(contracts, "thread", args, directory, config, config);
  args.push("changed");
  config.nested.value = "changed";
  source.PATH = "/changed";
  expect(contracts.get("thread")).toEqual({ args: ["--fixture"], env: { PATH: "/fixture/bin" }, cwd: directory, system: "Stable", mcpServers: { nested: { value: "original" } }, settings: { nested: { value: "original" } } });
  const guest = await claudeTurnLaunch({ threadId: "thread", text: "Fixture", guestConfined: true }, source);
  guest.rememberWarmContract(contracts, "thread", [], directory, null, null);
  expect(contracts.size).toBe(0);
});
