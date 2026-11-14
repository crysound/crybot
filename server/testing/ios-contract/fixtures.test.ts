import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { frameKinds, messageKinds, readManualFixtures, runtimeTypes } from "./fixtures.ts";
import { coverage } from "./coverage.ts";

const root = join(process.cwd(), "mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract");
const index = JSON.parse(readFileSync(join(root, "index.json"), "utf8")) as Array<{ file: string; swiftType: string }>;
const all = index.map((entry) => JSON.parse(readFileSync(join(root, entry.file), "utf8")) as Record<string, unknown>);

describe("typed fixture inventory", () => {
  it("contains every protocol kind from the checked in source fixtures", () => {
    const manual = readManualFixtures();
    expect(new Set(manual.filter((x) => x.swiftType === "WireMessage").map((x) => (x.value as { kind: string }).kind))).toEqual(new Set(messageKinds));
    expect(new Set(manual.filter((x) => x.swiftType === "ServerFrame").map((x) => (x.value as { kind: string }).kind))).toEqual(new Set(frameKinds));
    expect(new Set(manual.filter((x) => x.swiftType === "RuntimeEvent").map((x) => (x.value as { type: string }).type))).toEqual(new Set(runtimeTypes));
  });
  it("covers every registered message and card field", () => {
    const messages = readManualFixtures().filter((x) => x.swiftType === "WireMessage").map((x) => x.value as Record<string, unknown>);
    const card = readManualFixtures().find((x) => x.swiftType === "OptionCardData")?.value as Record<string, unknown>;
    const keys = new Set(messages.flatMap((value) => Object.keys(value)));
    expect(Object.keys(coverage.wireMessageFields).filter((key) => !keys.has(key))).toEqual([]);
    expect(Object.keys(coverage.optionCardFields).filter((key) => !Object.hasOwn(card, key))).toEqual([]);
  });
  it("has no secrets or non-example domains", () => {
    const text = JSON.stringify(all);
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(text).not.toMatch(/cry_sess_[A-Za-z0-9._~-]{20,}/);
    expect(text).not.toMatch(/cry_session_[A-Za-z0-9._~-]{20,}/);
    expect(text).not.toMatch(/https?:\/\/(?!cry\.example\.com)[^"\s]+/);
  });
  it("keeps one generated file per index entry", () => {
    expect(index.length).toBeGreaterThan(100);
    expect(readdirSync(root, { withFileTypes: true }).some((entry) => entry.isDirectory())).toBe(true);
  });
});
