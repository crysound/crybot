import assert from "node:assert/strict";
import test from "node:test";
import { cleanCode, cleanEmail, parseSignInStart, signInIdentity, startFailure, verifyFailure } from "./cloud-signin.mjs";

const ATTEMPT = "a".repeat(43), CODE = "48201937";

test("the email, the code and the Admin's answers are read strictly", () => {
  assert.equal(cleanEmail("  Person@Example.TEST "), "person@example.test");
  for (const bad of ["", "person", "person@", "@example.test", "person@example", "per son@example.test", "per\u0000son@example.test", `${"a".repeat(250)}@example.test`, 42, null]) {
    assert.equal(cleanEmail(bad), null, String(bad));
  }
  assert.equal(cleanCode("4820 1937"), CODE); assert.equal(cleanCode("4820-1937"), CODE);
  for (const bad of ["4820193", "482019370", "4820193a", "", null, 48201937]) assert.equal(cleanCode(bad), null, String(bad));
  assert.deepEqual(signInIdentity({ deviceName: "Mac", platform: "darwin", appVersion: "0.1.113" }), { deviceName: "Mac", platform: "darwin", appVersion: "0.1.113" });
  assert.equal(signInIdentity({ deviceName: "Mac", platform: "ios", appVersion: "1" }), null, "this app signs in as a desktop only");
  assert.equal(signInIdentity({ deviceName: "Mac", platform: "linux", appVersion: "dev build!" }).appVersion, "0.0.0");
  assert.deepEqual(parseSignInStart({ cloudContractVersion: 1, attempt: ATTEMPT, expiresIn: 600, resendAfter: 30 }), { attempt: ATTEMPT, expiresIn: 600, resendAfter: 30, signupOpen: true });
  assert.equal(parseSignInStart({ cloudContractVersion: 1, attempt: ATTEMPT, expiresIn: 600, signupOpen: false }).signupOpen, false);
  for (const bad of [null, { attempt: ATTEMPT, expiresIn: 600 }, { cloudContractVersion: 1, attempt: "short", expiresIn: 600 }, { cloudContractVersion: 1, attempt: ATTEMPT, expiresIn: 5 }]) {
    assert.equal(parseSignInStart(bad), null, JSON.stringify(bad));
  }
  const admin = (status, code) => Object.assign(new Error("x"), { status, code });
  assert.deepEqual([admin(403, "sso"), admin(429, "rate_limited"), admin(404, "unsupported"), Object.assign(new Error("x"), { status: 404, opaque: true }), admin(400, "invalid_request"), admin(503, "x"), new TypeError("fetch failed")].map(startFailure),
    ["sso", "rate-limited", "browser", "browser", "invalid-email", "failed", "failed"]);
  assert.deepEqual([admin(400, "invalid_code"), admin(410, "expired"), admin(403, "sso"), admin(403, "two_factor"), admin(403, "signup_closed"), admin(403, "device_limit"), admin(429, "rate_limited"),
    Object.assign(new Error("x"), { status: 403, opaque: true })].map(verifyFailure), ["wrong-code", "expired", "sso", "two-factor", "signup-closed", "device-limit", "rate-limited", "failed"]);
});
