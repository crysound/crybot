import { describe, expect, it } from "vitest";
import { createAuthRateLimiter } from "./auth-rate-limit.ts";
import { memoryRequest } from "./testing/memory-http.ts";

describe("app auth rate limit", () => {
  it("limits the eleventh request and recovers after a window", () => {
    let now = 0;
    const limiter = createAuthRateLimiter({ now: () => now });
    const { req } = memoryRequest("/", "POST", { "x-forwarded-for": "203.0.113.9" });
    for (let i = 0; i < 10; i++) expect(limiter.check(req, "/api/pair", true).limited).toBe(false);
    expect(limiter.check(req, "/api/pair", true).limited).toBe(true);
    now = 60_001;
    expect(limiter.check(req, "/api/pair", true).limited).toBe(false);
  });

  it("does not limit non app requests and includes /api/pair", () => {
    const limiter = createAuthRateLimiter();
    const { req } = memoryRequest("/", "POST");
    for (let i = 0; i < 20; i++) expect(limiter.check(req, "/api/auth/pair", false).limited).toBe(false);
    for (let i = 0; i < 10; i++) expect(limiter.check(req, "/api/pair", true).limited).toBe(false);
    expect(limiter.check(req, "/api/pair", true).limited).toBe(true);
  });
});
