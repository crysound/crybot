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
import { feishuCliAccess, feishuCliPrompt, directFeishuCliAccess } from "./turn.ts";
import { brokerToken, BrokerAuthorizationError } from "./protocol.ts";

vi.mock("./protocol.ts", async original => ({ ...await original<typeof import("./protocol.ts")>(), brokerToken: vi.fn() }));
let directory: string;
let sessions: SessionRegistry;
let env: NodeJS.ProcessEnv;
const short = "fixture-short-turn-token";
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "feishu-turn-"));
  sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  env = { CRYBOT_FEISHU_CLI_USERS: " test_union, test_union ", CRYBOT_FEISHU_BROKER_SOCKET: "/fixture/token.sock" };
  vi.mocked(brokerToken).mockResolvedValue({ user_access_token: short, app_id: "fixture-app", expires_at: 9_000_000_000 });
  resetFeishuLoginWarningsForTests();
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
  `https://example.invalid/${"x".repeat(2048)}`,
])("does not put an unsafe upstream authorization URL in the prompt: %s", async authorizationUrl => {
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", authorizationUrl));
  const access = feishuCliAccess("test_union", env, "zh-CN")!;
  await access.environment();
  expect(access.prompt()).not.toContain(authorizationUrl);
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
});
