import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { hostname, homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { WIDGET_NODE_TYPES } from "../../../shared/widget.ts";
import { coverage } from "./coverage.ts";
import { canonicalWidget, cards, frames, messages, runtimeEvents, widgets } from "./fixtures.ts";
import { isDistinctHostname } from "./normalize.ts";

const root = fileURLToPath(new URL("../../../mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/contract/", import.meta.url));
const index = JSON.parse(readFileSync(`${root}/index.json`, "utf8")) as Array<{ file: string; swiftType: string }>;
function sameMembers(actual: string[], expected: string[]) { expect([...new Set(actual)].sort()).toEqual([...expected].sort()); }

it("covers every message kind, field, card field, frame and runtime type", () => {
  sameMembers(messages.map(s => s.value.kind), Object.keys(coverage.wireMessageKinds));
  sameMembers(messages.flatMap(s => Object.keys(s.value)), Object.keys(coverage.wireMessageFields));
  sameMembers(cards.flatMap(s => Object.keys(s.value)), Object.keys(coverage.optionCardFields));
  sameMembers(frames.map(s => s.value.kind), Object.keys(coverage.serverFrameKinds).filter(k => !["hello", "ping", "snapshot"].includes(k)));
  sameMembers(runtimeEvents.map(s => s.value.type), Object.keys(coverage.runtimeEventTypes));
});
it("contains each widget in typed fixtures and generated samples", () => {
  sameMembers(widgets.map(s => canonicalWidget(s.value).type), [...WIDGET_NODE_TYPES]);
  const generated = index.filter(s => s.swiftType === "WidgetNode").map(s => JSON.parse(readFileSync(`${root}/${s.file}`, "utf8")).type as string);
  sameMembers(generated, [...WIDGET_NODE_TYPES]);
  expect(widgets.find(s => s.name === "Badge")?.value).toEqual({ type: "Badge", id: "n1", label: "Ready" });
});
function assertPublic(text: string, machine = { hostname: hostname(), homedir: homedir() }) {
  expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  expect(text).not.toMatch(/cry_(?:sess|session)_[A-Za-z0-9._~-]{20,}/);
  expect(text).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (isDistinctHostname(machine.hostname)) expect(text).not.toContain(JSON.stringify(machine.hostname));
  if (machine.homedir) {
    expect(text).not.toContain(JSON.stringify(machine.homedir));
    expect(text).not.toContain(JSON.stringify(`${machine.homedir}/`).slice(0, -1));
  }
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) expect(new URL(match[0]).hostname).toBe("cry.example.com");
  for (const match of text.matchAll(/[\w.+-]+@([\w.-]+\.[A-Za-z]{2,})/g)) expect(match[1] === "example.com" || match[1].endsWith(".example.com")).toBe(true);
  for (const match of text.matchAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi)) expect(match[0]).toMatch(/^(?:00000000-0000-0000-0000-000000000000|00000000-0000-4000-8000-[0-9a-f]{12})$/);
}
it("scans every generated JSON, including files outside the index", () => {
  const files = readdirSync(root, { recursive: true }).filter((path): path is string => typeof path === "string" && path.endsWith(".json"));
  expect(files.length).toBe(index.length + 1);
  for (const file of files) assertPublic(readFileSync(`${root}/${file}`, "utf8"));
});
it("rejects deceptive host suffixes, email, IPv4 and real UUIDs", () => {
  for (const value of ["https://cry.example.com" + ".evil" + ".com", "person@private.invalid", "192.0.2.4", randomUUID()]) expect(() => assertPublic(value)).toThrow();
});
it("scans machine names and home prefixes without matching protocol substrings", () => {
  const machine = { hostname: "app", homedir: "/home/app" };
  expect(() => assertPublic(JSON.stringify({ kind: "app", url: "https://cry.example.com", path: "/home/application" }), machine)).not.toThrow();
  for (const host of ["server", "example"]) expect(() => assertPublic(JSON.stringify({ kind: "app", text: host }), { ...machine, hostname: host })).not.toThrow();
  for (const path of [machine.homedir, `${machine.homedir}/file`]) expect(() => assertPublic(JSON.stringify({ path }), machine)).toThrow();
  expect(() => assertPublic(JSON.stringify({ host: "private-machine" }), { ...machine, hostname: "private-machine" })).toThrow();
});
