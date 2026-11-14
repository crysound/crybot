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

  it("evicts the oldest saturated key and bounds the stored source count", () => {
    const limiter = createAuthRateLimiter({ maxKeys: 3, now: () => 1 });
    const key0 = memoryRequest("/", "POST", { "x-forwarded-for": "198.51.100.1" }).req;
    for (let i = 0; i < 10; i++) expect(limiter.check(key0, "/api/pair", true).limited).toBe(false);
    expect(limiter.check(key0, "/api/pair", true).limited).toBe(true);
    for (let i = 2; i <= 5; i++) {
      const { req } = memoryRequest("/", "POST", { "x-forwarded-for": `198.51.100.${i}` });
      expect(limiter.check(req, "/api/pair", true).limited).toBe(false);
    }
    expect(limiter.check(key0, "/api/pair", true).limited).toBe(false);
    expect(limiter.size).toBe(3);
  });

  it("reports the retry window", () => {
    let now = 0;
    const windowed = createAuthRateLimiter({ now: () => now });
    const request = memoryRequest("/", "POST", { "x-forwarded-for": "203.0.113.30" }).req;
    for (let i = 0; i < 10; i++) windowed.check(request, "/api/pair", true);
    expect(windowed.check(request, "/api/pair", true)).toMatchObject({ limited: true, retryAfter: 60 });
    now = 60_000;
    expect(windowed.check(request, "/api/pair", true).limited).toBe(false);
  });
});
