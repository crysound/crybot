import { createElement, type EffectCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ effects: [] as EffectCallback[], pair: vi.fn() }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (effect: EffectCallback) => { f.effects.push(effect); } }));
vi.mock("../lib/session", async original => ({ ...await original<typeof import("../lib/session")>(), pairWithCode: f.pair, readSessionState: vi.fn().mockResolvedValue({ kind: "unauthenticated", error: "" }) }));
vi.mock("../components/DesktopWorkspaceSwitcher", () => ({ DesktopWorkspaceSwitcher: () => null }));
import { codeProblem, codeReady, openInAppLink, PairPage, pairIntro, pairsAutomatically, pairTitle, TeamLeftPage, teamPage, unencryptedPublic } from "./PairPage";
import en from "../locales/en.json";
import type { EnvironmentDescriptor } from "../lib/session";

const code = "ABCD-EFGH-JK23";
const render = (initialCode: string | null) => { f.effects = []; return renderToStaticMarkup(createElement(PairPage, { initialCode })); };
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
let replaced: string[];
beforeEach(() => {
  f.pair.mockReset(); replaced = [];
  vi.stubGlobal("location", { replace: (url: string) => replaced.push(url) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
});
afterEach(() => vi.unstubAllGlobals());

it("in the desktop app, a code the link carried connects at once; a browser still asks", () => {
  expect(pairsAutomatically(code, true)).toBe(true);
  expect(pairsAutomatically(code, false)).toBe(false);
  expect(pairsAutomatically(null, true)).toBe(false);
});

it("opening a pairing link in the app needs no click and no code to type", async () => {
  vi.stubGlobal("window", { cry: { workspaces: {} } });
  f.pair.mockResolvedValue({ ok: true });
  const html = render(code);
  expect(html).toContain("Connecting to this Cry Bot…");
  expect(html).not.toContain("Pairing code"); expect(html).not.toContain("<form");
  f.effects[0](); await flush();
  expect(f.pair).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code }));
  expect(replaced).toEqual(["/"]);
});

it("a code that no longer works falls back to the form, with the reason", async () => {
  vi.stubGlobal("window", { cry: { workspaces: {} } });
  f.pair.mockResolvedValue({ ok: false, error: "That pairing code has expired." });
  render(code); f.effects[0](); await flush();
  expect(replaced).toEqual([]);
});

it("a browser keeps the code in the form for the person to confirm", () => {
  vi.stubGlobal("window", {});
  const html = render(code);
  expect(html).toContain(`value="${code}"`); expect(html).toContain(">Connect</button>");
  f.effects[0]?.(); expect(f.pair).not.toHaveBeenCalled();
});

it("a server asks for its pairing code and names itself", () => {
  expect(pairIntro({ mode: "code", sent: false, email: "", cloudHome: false })).toContain("from the server");
  expect(pairTitle(null, "code")).toBe("Connect to this Cry Bot");
});

it("names a wrong kind of code instead of letting it be sent as a wrong one", () => {
  expect(codeProblem("1234 5678")).toBe(en["serverError.pair.emailCode"]);
  expect(codeProblem("123456")).toBe(en["serverError.pair.oldCode"]);
  expect(codeProblem(`cry_sess_${"a".repeat(43)}`)).toBe(en["serverError.pair.scriptKey"]);
  expect(codeProblem("7KQ2-M9XD")).toBeNull();
  expect(codeReady("7kq2 m9xd h4tp")).toBe(true);
  expect(codeReady("1234 5678")).toBe(false);
});

it("opens the phone app at this server with the code filled in", () => {
  expect(openInAppLink("https://bot.example.com", "7kq2m9xdh4tp")).toBe("crybot://pair?address=https%3A%2F%2Fbot.example.com&code=7KQ2-M9XD-H4TP");
  expect(openInAppLink("http://192.168.1.20:8799", "")).toBe("crybot://pair?address=http%3A%2F%2F192.168.1.20%3A8799");
});

it("warns only on plain http across the open internet", () => {
  expect(unencryptedPublic({ protocol: "http:", hostname: "203.0.113.9" })).toBe(true);
  expect(unencryptedPublic({ protocol: "http:", hostname: "192.168.1.20" })).toBe(false);
  expect(unencryptedPublic({ protocol: "https:", hostname: "bot.example.com" })).toBe(false);
});

it("asks for the code first, with email sign-in as a link below, and says how to get a code", async () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("location", { replace: () => {}, protocol: "http:", hostname: "203.0.113.9", origin: "http://203.0.113.9:8799" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ environmentId: "e", label: "hetzner-1", platform: "linux", version: "1", capabilities: { emailSignIn: true } }) }));
  const html = render(code);
  expect(html).toContain(en["pair.notEncrypted"].replace("'", "&#x27;"));
  expect(html).toContain(en["pair.fromLink"]);
  expect(html).toContain("crybot://pair?address=http%3A%2F%2F203.0.113.9%3A8799&amp;code=ABCD-EFGH-JK23");
  expect(html).toContain("npx crybot pair");
  expect(html.indexOf("<form")).toBeLessThan(html.indexOf(en["pair.code"]));
});

it("a saved team page requires the session's team descriptor and a safe https link", () => {
  const team = { environmentId: "e", label: "Acme", platform: "linux", version: "1", capabilities: { remoteSessions: true as const, cloudHome: true as const, cloudTeam: true as const } } as unknown as EnvironmentDescriptor;
  expect(teamPage(team, "https://server.example.test/cloud/team/t1")).toBe("https://server.example.test/cloud/team/t1");
  expect(teamPage(team, null), "never told before sign-in").toBeNull();
  for (const bad of ["javascript:alert(1)", "http://evil.example/cloud", "https://u:p@cloud.example/x", "https://cloud.example/x#signin=1", "nope"]) expect(teamPage(team, bad)).toBeNull();
  expect(teamPage({ ...team, capabilities: { remoteSessions: true, cloudHome: true } } as unknown as EnvironmentDescriptor, "https://server.example.test/cloud/team/t1"), "a My Cloud has no team page").toBeNull();
});

it("a team's page whose person is no longer in the team says so in one sentence, with nothing to sign in to", () => {
  const html = renderToStaticMarkup(createElement(TeamLeftPage, { team: "Acme" }));
  expect(html).toContain("You&#x27;re no longer in Acme.");
  expect(html).not.toMatch(/<(input|button|a) /);
});
