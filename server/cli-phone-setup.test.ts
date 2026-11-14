import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CliOptions } from "./cli.ts";
import { SetupCancelled, type SetupIo } from "./cli-prompts.ts";
import { normalizePhoneOrigin, phonePairingInstructions, runPhoneSetup } from "./cli-phone-setup.ts";

const options: CliOptions = {
  command: "start", port: 18799, dataDir: "/fixture/phone-home", tailscale: false,
  pair: false, client: false, json: false,
};

function prompts(script: { choices?: Array<number | Error>; confirms?: boolean[]; answers?: Array<string | Error> } = {}) {
  const choices = [...script.choices ?? []];
  const confirms = [...script.confirms ?? []];
  const answers = [...script.answers ?? []];
  const lines: string[] = [];
  const take = <T>(values: Array<T | Error>, question: string): T => {
    if (!values.length) throw new Error(`Unexpected fixture prompt: ${question}`);
    const next = values.shift()!;
    if (next instanceof Error) throw next;
    return next;
  };
  const io: SetupIo = {
    log: vi.fn((line: string) => { lines.push(line); }),
    choose: vi.fn(async (question: string, choicesOffered: readonly string[]) => {
      lines.push(question, ...choicesOffered);
      return take(choices, question);
    }),
    ask: vi.fn(async (question: string) => take(answers, question)),
    secret: vi.fn(async () => { throw new Error("The fixture must inject account sign-in"); }),
    confirm: vi.fn(async (question: string) => { lines.push(question); return take(confirms, question); }),
  };
  return { io, lines, consumed: () => expect([choices, confirms, answers]).toEqual([[], [], []]) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Phone setup fixtures must not use the network"); }));
});
afterEach(() => vi.unstubAllGlobals());

describe("phone origin validation", () => {
  it.each([
    ["https://bot.example", "https://bot.example"],
    ["  https://BOT.example:443/  ", "https://bot.example"],
    ["https://mini.tail1234.ts.net:8443", "https://mini.tail1234.ts.net:8443"],
    ["https://[2001:db8::1]:8443/", "https://[2001:db8::1]:8443"],
  ])("normalizes an HTTPS origin without claiming reachability: %s", (input, expected) => {
    expect(normalizePhoneOrigin(input)).toBe(expected);
  });

  it.each([
    "", "not a url", "http://bot.example", "https:bot.example", "https:///bot.example", "https://@bot.example",
    "https://localhost", "https://localhost.",
    "https://mini.localhost", "https://127.0.0.1:8799", "https://127.1", "https://2130706433",
    "https://0.0.0.0", "https://[::]", "https://[::1]", "https://[::ffff:127.0.0.1]",
    "https://[::ffff:0.0.0.0]", "https://user:password@bot.example", "https://bot.example/pair",
    "https://bot.example/?token=secret", "https://bot.example/#code=ABCD-EFGH-JKLM",
    "https://bot.example/?", "https://bot.example/#", "https://bot.\nexample",
    "https://bot.example\\private", "crybot://pair?token=secret",
  ])("rejects a local, credential-bearing or non-origin input: %s", (input) => {
    expect(normalizePhoneOrigin(input)).toBeNull();
  });
});

describe("optional phone setup", () => {
  it("defaults to skipping without changing the options", async () => {
    const ui = prompts({ choices: [0] });
    expect(await runPhoneSetup(options, ui.io)).toEqual({ options });
    ui.consumed();
  });
  it("offers only operator-owned routes", async () => {
    const ui = prompts({ choices: [1, 3] });
    expect(await runPhoneSetup(options, ui.io)).toEqual({ options });
    expect(ui.lines).not.toContain("Managed HTTPS address — protected by pairing");
    ui.consumed();
  });
  it("requires consent for a Tailscale share", async () => {
    const ui = prompts({ choices: [1, 0], confirms: [true] });
    expect(await runPhoneSetup(options, ui.io)).toMatchObject({ phone: "ios", options: { tailscale: true, pair: true, client: true } });
    ui.consumed();
  });
  it("validates the operator's HTTPS address", async () => {
    const ui = prompts({ choices: [2, 1, 1], answers: ["http://localhost", "https://server.example.test"] });
    expect(await runPhoneSetup(options, ui.io)).toMatchObject({ phone: "android", options: { publicUrl: "https://server.example.test", tailscale: false } });
    ui.consumed();
  });
  it("preserves an existing route", async () => {
    const ui = prompts({ choices: [1] });
    expect(await runPhoneSetup({ ...options, publicUrl: "https://server.example.test" }, ui.io)).toMatchObject({ options: { publicUrl: "https://server.example.test", pair: true } });
    ui.consumed();
  });
  it("propagates cancellation without changing settings", async () => {
    const ui = prompts({ choices: [new SetupCancelled()] });
    await expect(runPhoneSetup(options, ui.io)).rejects.toBeInstanceOf(SetupCancelled);
  });
});

describe("phone pairing instructions", () => {
  it.each(["ios", "android"] as const)("refuses phone instructions for an unready %s route", (phone) => {
    const text = phonePairingInstructions(phone, { origin: "https://bot.example", ready: false }).join("\n");
    expect(text).toContain("not ready");
    expect(text).not.toContain("https://bot.example");
    expect(text).not.toContain("already connected");
  });

  it.each(["https://localhost", "https://bot.example/#code=secret", null])("never repeats a local or credential-bearing origin: %s", (origin) => {
    const text = phonePairingInstructions("ios", { origin, ready: true }).join("\n");
    expect(text).toContain("not ready");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("localhost");
  });

  it("describes iOS browser/native options without claiming an app-store release", () => {
    const text = phonePairingInstructions("ios", { origin: "https://bot.example", ready: true }).join("\n");
    expect(text).toContain("Safari");
    expect(text).toContain("already have");
    expect(text).toContain("https://bot.example/pair");
    expect(text).toContain("does not mean the phone is paired");
    expect(text).toContain("not settings or pairing administration");
    expect(text).not.toMatch(/apps\.apple|testflight|play\.google/);
  });

  it("sends an Android phone to the app first, and still offers the browser", () => {
    const text = phonePairingInstructions("android", { origin: "https://bot.example", ready: true }).join("\n");
    expect(text).toContain("open the Cry Bot app and scan the QR with its pairing scanner");
    expect(text).toContain("Camera will not open it in a browser");
    expect(text).toContain("https://bot.example/pair");
    expect(text).not.toContain("not the Android native pairing scanner");
    expect(text).toContain("five minutes");
  });
});
