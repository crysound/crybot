import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeFixture, PLACEHOLDERS, stableJson } from "./normalize.ts";

describe("contract fixture normalization", () => {
  it("replaces credentials, cookies, JWTs, IDs and addresses", () => {
    const value = normalizeFixture({
      token: `cry_sess_${"x".repeat(24)}`,
      cookieName: "cry_session_8799_environment1234",
      jwt: ["eyJheader", "eyJpayload", "signature"].join("."),
      id: randomUUID(),
      url: "https://private.invalid/path",
    });
    expect(value).toEqual({ cookieName: PLACEHOLDERS.cookieName, id: "00000000-0000-4000-8000-000000000000", jwt: "jwt_placeholder", token: PLACEHOLDERS.token, url: PLACEHOLDERS.address });
  });
  it("sorts object keys and emits a trailing newline", () => {
    expect(stableJson({ z: 1, a: 2 })).toBe('{\n  "a": 2,\n  "z": 1\n}\n');
  });
});

it("preserves distinct UUID references, including map keys and embedded text", () => {
  const first = randomUUID();
  const second = randomUUID();
  const a = `${PLACEHOLDERS.uuidPrefix}000000000000`, b = `${PLACEHOLDERS.uuidPrefix}000000000001`;
  expect(normalizeFixture({ text: `${first} then ${second}`, id: second, byId: { [first]: { replyToId: second } } })).toEqual({ text: `${a} then ${b}`, id: b, byId: { [a]: { replyToId: b } } });
  expect(normalizeFixture({ id: first.toUpperCase(), reference: first })).toEqual({ id: a, reference: a });
  expect(normalizeFixture({ queues: { [first]: [] } })).toEqual({ queues: { [a]: [] } });
  expect(normalizeFixture({ id: "arbitrary-id", map: { "arbitrary-id": "arbitrary-id" } })).toEqual({ id: a, map: { [a]: a } });
});
it("preserves config fields and maps only complete registered references", () => {
  const id = randomUUID();
  const mapped = `${PLACEHOLDERS.uuidPrefix}000000000000`;
  expect(normalizeFixture({ threads: { maxConcurrentPerBot: 8 } })).toEqual({ threads: { maxConcurrentPerBot: 8 } });
  expect(normalizeFixture({ queues: { "not-an-id": [] }, threads: { maxConcurrentPerBot: 8 }, computerControl: { [id]: { enabled: true } } })).toEqual({ queues: { "not-an-id": [] }, threads: { maxConcurrentPerBot: 8 }, computerControl: { [mapped]: { enabled: true } } });
  expect(normalizeFixture({ map: { "arbitrary-id": "arbitrary-id", "prefix-arbitrary-id": "prefix-arbitrary-id" }, id: "arbitrary-id" })).toEqual({ map: { [mapped]: mapped, "prefix-arbitrary-id": "prefix-arbitrary-id" }, id: mapped });
});
it("stabilizes bot colors and environment versions without changing protocol versions", () => {
  const bot = { id: randomUUID(), name: "Contract Bot", color: "cyan", createdAt: Date.now() };
  const first = normalizeFixture({ bots: [bot] });
  expect(normalizeFixture({ bots: [bot] })).toEqual(first);
  expect(normalizeFixture({ bots: [{ ...bot, color: "orange", createdAt: bot.createdAt + 1000 }] })).toEqual(first);
  expect(first).toMatchObject({ bots: [{ color: PLACEHOLDERS.botColor }] });
  const environment = { environmentId: randomUUID(), version: "1.2.3", protocol: { version: 2 } };
  expect(normalizeFixture(environment)).toEqual(normalizeFixture({ ...environment, version: "4.5.6" }));
  expect(normalizeFixture(environment)).toMatchObject({ version: PLACEHOLDERS.version, protocol: { version: 2 } });
});
it("does not replace short or common hostnames inside protocol values or addresses", () => {
  for (const host of ["app", "example", "server"]) {
    const machine = { hostname: host, homedir: "/home/app" };
    expect(normalizeFixture({ kind: "app", hostName: host, address: "cry.example.com", url: PLACEHOLDERS.address, note: "application server example", pathText: "see /home/application" }, machine)).toEqual({ kind: "app", hostName: "Example device", address: "cry.example.com", url: PLACEHOLDERS.address, note: "application server example", pathText: "see /home/application" });
  }
  const machine = { hostname: "private-machine", homedir: "/home/app" };
  expect(normalizeFixture({ device: machine.hostname, note: "private-machine-suffix", path: "/home/app/file", notePath: "prefix/home/app/file" }, machine)).toEqual({ device: "fixture-host", note: "private-machine-suffix", path: "/fixture/path", notePath: "prefix/home/app/file" });
});
it("normalizes HTTP, plain email/IP, timestamps, ports, cursors and environment labels", () => {
  expect(normalizeFixture({ cwd: "/tmp/private-workspace", durationMs: 3742 })).toEqual({ cwd: "/fixture/path", durationMs: 1000 });
  expect(normalizeFixture({ environmentId: "environment-example", label: "private-host", at: 123456, createdAt: "2025-03-04T12:34:56.789Z", port: 8799, cursor: "stream-random:82", url: "http://private.invalid:8799/path", note: "person@private.invalid 192.0.2.4:8799" })).toEqual({ environmentId: `${PLACEHOLDERS.uuidPrefix}000000000000`, label: "Example device", at: 1767225600000, createdAt: "2026-01-01T00:00:00.000Z", port: 443, cursor: "cursor-0", url: PLACEHOLDERS.address, note: "person@example.com cry.example.com" });
});
it("sorts by Unicode code point rather than locale or UTF-16 units", () => {
  expect(Object.keys(normalizeFixture({ "𐀀": 1, "\uE000": 2, z: 3, A: 4 }) as object)).toEqual(["A", "z", "\uE000", "𐀀"]);
});
