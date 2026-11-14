import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { rmSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
import type { WireBot } from "../../shared/wire.ts";
import { DATA_DIR, loadConfig } from "../config.ts";
import { createPersonLanguages, THIS_COMPUTER } from "../host/person-languages.ts";
import { createVisibilityHost } from "../host/visibility-host.ts";
import { closeMessageDb } from "../message-db.ts";
import { initialGreeting, setupChoices } from "../initial-greeting.ts";
import { requiredScope, type RequestAuth } from "../request-auth.ts";
import { setupSuggestionsFor } from "../setup-suggestions.ts";
import { Store, type Message } from "../store.ts";
import { createBotCreateRoutes, type BotCreateRouteDeps } from "./bots-create.ts";
import type { RouteHandler } from "./table.ts";
import { denyReason } from "../../companion/src/routes.ts";

let route: RouteHandler;
let deps: BotCreateRouteDeps;
let auth: RequestAuth;
let people: ReturnType<typeof createPersonLanguages>;
const prompts: string[] = [];
let generated = "[]";

beforeEach(() => {
  closeMessageDb();
  rmSync(DATA_DIR, { recursive: true, force: true });
  prompts.length = 0;
  generated = "[]";
  const cfg = loadConfig();
  cfg.language = "zh";
  const store = new Store(() => ({ instanceId: "fixture", model: "fixture" }), undefined, undefined, () => cfg.language ?? "en");
  const visibility = createVisibilityHost({ store: () => store, routines: () => null, team: true, audiencesFor: () => undefined, threadsReferencing: () => [] });
  store.onChange(() => visibility.forgetVisibility());
  people = createPersonLanguages({ dataDir: DATA_DIR, configured: () => cfg.language });
  const suggestions = setupSuggestionsFor({
    store, config: () => cfg, shared: () => false, languageCode: () => cfg.language ?? "en",
    engine: () => ({ agentsMcp: true }), browserOn: () => false, withinBudget: () => true,
    writer: () => ({ via: "engine", generateText: async (prompt) => { prompts.push(prompt); return generated; } }),
    apps: { configured: () => false, mode: () => "fixture", connected: async () => ({}) },
  });
  deps = {
    store, cfg, presetStore: { resolve: () => null }, orgInstallStatuses: () => new Map(),
    hostedWorkspace: false, hostedFullAccessRefusal: "fixture", desktopManaged: false, maxWorkspaceBots: 200,
    paused: () => false, cloudOwnerKey: null, hostedModels: null, cloudRoutineAuthors: null, routines: () => null,
    storedAvatarExists: () => false, defaultSelection: async () => ({ instanceId: "fixture", model: "fixture" }),
    checkedModelSelection: () => ({ ok: true, selection: { instanceId: "fixture", model: "fixture" } }),
    cloudOwnerSession: () => false, wireBot: (bot) => bot as unknown as WireBot,
    visibleFor: (auth) => visibility.visibleTo(visibility.viewerFor(auth)),
    personLanguage: () => people.forPerson(THIS_COMPUTER),
    personaliseSetupCard: (bot, language) => suggestions.personalise(bot.id, language),
  };
  auth = { kind: "loopback", scopes: ["admin"] } as RequestAuth;
  route = createBotCreateRoutes(deps);
});

async function call(path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}) {
  const req = new IncomingMessage(new Socket());
  req.headers = headers;
  const res = new ServerResponse(req);
  const url = new URL(path, "http://localhost");
  let status = 0;
  let data: unknown;
  await route({ req, res, url, path: url.pathname, method: body ? "POST" : "GET", auth,
    readBody: async () => body,
    json: (_res, code, result) => { status = code; data = result; },
  });
  return { status, data };
}

async function create(body: Record<string, unknown> = {}, headers: Record<string, string> = {}, status = 201) {
  const response = await call("/api/bots", { name: "Fixture helper", ...body }, headers);
  const result = response.data as { bot: WireBot & { messages: Message[] }; error?: string };
  expect(response.status, result.error).toBe(status);
  return result.bot;
}

it.each(["zh", "zh-cn", "zh-hans", "zh-sg"])("creates a Simplified Chinese greeting and card for %s", async (language) => {
  deps.cfg.language = "en";
  const bot = await create({ language });
  expect(bot.messages[0]).toMatchObject({ text: "你好，我是 Fixture helper。你想让我帮你做什么？", setupOffer: true, setupChoices: setupChoices("zh") });
  expect(bot.description).toBe("");
  expect(bot.soul ?? "").toBe("");
  await vi.waitFor(() => expect(prompts).toHaveLength(1));
  expect(prompts[0]).toContain("Write every option in Simplified Chinese");
  expect(deps.cfg.language).toBe("en");
});

it("lets explicit English override both the person's recorded language and Chinese configuration", async () => {
  people.heard(THIS_COMPUTER, "zh");
  const bot = await create({ language: "en" });
  expect(bot.messages[0]).toMatchObject({ text: initialGreeting(bot.name, "en"), setupChoices: setupChoices("en") });
  await vi.waitFor(() => expect(prompts).toHaveLength(1));
  expect(prompts[0]).toContain("Write every option in English");
  expect(deps.cfg.language).toBe("zh");
});

it.each([
  { language: "zh", choices: ["整理每周销售报告", "检查待办日程安排", "追踪重要项目进展", "收集最新行业动态", "归纳客户反馈意见"] },
  { language: "en", choices: ["Review weekly sales reports", "Check upcoming calendar events", "Track important project updates", "Gather recent industry news", "Summarise customer feedback"] },
])("stores generated setup options in $language", async ({ language, choices }) => {
  generated = JSON.stringify(choices);
  const bot = await create({ language });
  await vi.waitFor(() => expect(deps.store.messagesFor(bot.threadId)[0].setupChoices).toEqual(choices));
});

it("preserves configured language when language and the person's record are absent", async () => {
  const bot = await create();
  expect(bot.messages[0]).toMatchObject({ text: initialGreeting(bot.name, "zh"), setupChoices: setupChoices("zh") });
});

it("uses only this person's saved language before configuration", async () => {
  people.heard("another-person", "ko");
  const configured = await create();
  expect(configured.messages[0].text).toBe(initialGreeting(configured.name, "zh"));
  people.heard(THIS_COMPUTER, "en");
  const personal = await create();
  expect(personal.messages[0]).toMatchObject({ text: initialGreeting(personal.name, "en"), setupChoices: setupChoices("en") });
  await vi.waitFor(() => expect(prompts).toHaveLength(2));
  expect(prompts[1]).toContain("Write every option in English");
});

it.each(["xx", "en<script>", "constructor", "__proto__", "en-US", "", 12, null, {}, ["zh"]])("ignores unsupported language %j", async (language) => {
  const bot = await create({ language });
  expect(bot.messages[0]).toMatchObject({ text: initialGreeting(bot.name, "zh"), setupChoices: setupChoices("zh") });
});

it("falls back through configuration, team and system locale without borrowing another person's choice", async () => {
  deps.team = { name: "Fixture team", language: "es", people: { has: () => false } };
  people.heard("another-person", "ko");
  const configured = await create();
  expect(configured.messages[0].text).toBe(initialGreeting(configured.name, "zh"));
  delete deps.cfg.language;
  const team = await create();
  expect(team.messages[0].text).toBe(initialGreeting(team.name, "es"));
  deps.team = null;
  const system = await create();
  expect(system.messages[0].text).toBe(initialGreeting(system.name, Intl.DateTimeFormat().resolvedOptions().locale));
});

it("keeps paired-device settings restricted while accepting language metadata", async () => {
  const headers = { "x-crybot-companion": "1" };
  const bot = await create({ language: "en", color: "blue" }, headers);
  expect(bot.messages[0].text).toBe(initialGreeting(bot.name, "en"));
  await create({ language: "zh", settings: { approvalMode: "auto" } }, headers, 403);
  await create({ language: "zh", section: "Restricted" }, headers, 403);
});

it("keeps a member's defaults and settings restrictions when language is supplied", async () => {
  deps.team = { name: "Fixture team", people: { has: () => true } };
  auth = { kind: "session", scopes: ["client"], session: { membershipAuthority: "team", email: "member@example.test" } } as unknown as RequestAuth;
  deps.cfg.newBotDefaults = { profile: { description: "Admin template", computer: "local", approvalMode: "auto" }, memory: {}, skills: [], routines: [] };
  const bot = await create({ language: "en", useDefaults: true });
  expect(bot.description).toBe("");
  expect(bot.messages[0].text).toBe(initialGreeting(bot.name, "en"));
  await create({ language: "zh", settings: { approvalMode: "auto" } }, {}, 403);
});

it("offers another unused name to clients without exposing defaults", async () => {
  const hidden = deps.store.createBot({ name: "Pixel" });
  deps.store.patchBot(hidden.id, { hidden: true });
  expect(requiredScope("GET", "/api/bot-name")).toBe("client");
  expect(requiredScope("GET", "/api/bot-defaults")).toBe("admin");
  expect(denyReason({ path: "/api/bot-name", method: "GET", authenticated: true })).toBeNull();
  const response = await call("/api/bot-name?exclude=Nova");
  const result = response.data as { suggestedName: string };
  expect(response.status).toBe(200);
  expect(Object.keys(result)).toEqual(["suggestedName"]);
  expect(["Pixel", "Nova"]).not.toContain(result.suggestedName);
});

it("ignores names of bots the caller cannot see while excluding visible and current names", async () => {
  deps.store.createBot({ name: "Scout" });
  auth = { kind: "session", scopes: ["client"], session: {} } as unknown as RequestAuth;
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  try {
    const before = await call("/api/bot-name?exclude=Pixel");
    expect(before).toEqual({ status: 200, data: { suggestedName: "Atlas" } });
    const privateBot = deps.store.createBot({ name: "Atlas" });
    deps.store.patchBot(privateBot.id, { visibility: "admins" });
    expect(await call("/api/bot-name?exclude=Pixel")).toEqual(before);
    auth = { kind: "session", scopes: ["admin"], session: {} } as unknown as RequestAuth;
    expect(await call("/api/bot-name?exclude=Pixel")).toEqual({ status: 200, data: { suggestedName: "Nova" } });
  } finally {
    random.mockRestore();
  }
});
