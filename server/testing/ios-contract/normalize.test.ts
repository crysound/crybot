import { describe, expect, it } from "vitest";
import { normalizeFixture, PLACEHOLDERS, stableJson } from "./normalize.ts";

describe("contract fixture normalization", () => {
  it("replaces credentials, cookies, JWTs, IDs and addresses", () => {
    const value = normalizeFixture({
      token: "cry_sess_abcdefghijklmnopqrstuvwxyz",
      cookieName: "cry_session_8799_environment1234",
      jwt: "eyJheader.eyJpayload.signature",
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://private.invalid/path",
    });
    expect(value).toEqual({ cookieName: PLACEHOLDERS.cookieName, id: "00000000-0000-4000-8000-000000000000", jwt: "jwt_placeholder", token: PLACEHOLDERS.token, url: PLACEHOLDERS.address });
  });
  it("sorts object keys and emits a trailing newline", () => {
    expect(stableJson({ z: 1, a: 2 })).toBe('{\n  "a": 2,\n  "z": 1\n}\n');
  });
});
