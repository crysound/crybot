import { describe, expect, it } from "vitest";
import { cleanIdentityClaim } from "./access-claims.ts";
import { cfAccessIdentityClaims } from "./cf-access.ts";

describe("Access identity names", () => {
  it("discards emails longer than 320 characters without truncating an identity", () => {
    const email = "a".repeat(307) + "@example.test";
    expect(email).toHaveLength(320);
    expect(cfAccessIdentityClaims({ email: email.toUpperCase() })).toEqual({ email, identity: email });
    expect(cfAccessIdentityClaims({ email: "a" + email })).toEqual({});
    expect(cfAccessIdentityClaims({ sub: "alex", email: "a" + email, name: "Alex" })).toEqual({ identity: "alex", displayName: "Alex" });
  });
  it("removes controls, line separators, bidi controls and invisible formatting", () => {
    expect(cleanIdentityClaim(" \u0000张\u2028\u2029\u200b\u200c\u200d\ufeff三\u202e\u2066 ")).toBe("张三");
    expect(cleanIdentityClaim("\ufeff ")).toBeUndefined();
  });
  it("limits names to 64 code points, keeping a complete final emoji", () => {
    expect(cleanIdentityClaim("a".repeat(63) + "😀Z")).toBe("a".repeat(63) + "😀");
    expect(cleanIdentityClaim("😀".repeat(65))).toBe("😀".repeat(64));
  });
  it("prefers custom.name and falls back when it is unusable", () => {
    expect(cfAccessIdentityClaims({ custom: { name: " 张三 " }, name: "Alex" }).displayName).toBe("张三");
    expect(cfAccessIdentityClaims({ custom: { name: "\u200b" }, name: " Alex " }).displayName).toBe("Alex");
  });
});
