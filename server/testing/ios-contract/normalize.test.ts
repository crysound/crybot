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
  expect(normalizeFixture({ queues: { "arbitrary-id": [] } })).toEqual({ queues: { [a]: [] } });
  expect(normalizeFixture({ id: "arbitrary-id", map: { "arbitrary-id": "arbitrary-id" } })).toEqual({ id: a, map: { [a]: a } });
});
it("normalizes HTTP, plain email/IP, timestamps, ports, cursors and environment labels", () => {
  expect(normalizeFixture({ cwd: "/tmp/private-workspace", durationMs: 3742 })).toEqual({ cwd: "/fixture/path", durationMs: 1000 });
  expect(normalizeFixture({ environmentId: "environment-example", label: "private-host", at: 123456, createdAt: "2025-03-04T12:34:56.789Z", port: 8799, cursor: "stream-random:82", url: "http://private.invalid:8799/path", note: "person@private.invalid 192.0.2.4:8799" })).toEqual({ environmentId: `${PLACEHOLDERS.uuidPrefix}000000000000`, label: "Example device", at: 1767225600000, createdAt: "2026-01-01T00:00:00.000Z", port: 443, cursor: "cursor-0", url: PLACEHOLDERS.address, note: "person@example.com cry.example.com" });
});
it("sorts by Unicode code point rather than locale or UTF-16 units", () => {
  expect(Object.keys(normalizeFixture({ "𐀀": 1, "\uE000": 2, z: 3, A: 4 }) as object)).toEqual(["A", "z", "\uE000", "𐀀"]);
});
