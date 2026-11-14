// The tunnelListener and tailnetShare use independent listeners and are outside this fixture.
import { describe, expect, it } from "vitest";
import { appHostConfig, createAppHost } from "./app-host.ts";
import { memoryRequest } from "./testing/memory-http.ts";

const unauthenticatedSurface = [
  "/api/health", "/api/brand", "/.well-known/crybot/environment", "/.well-known/crybot/domain-check/" + "0".repeat(64),
  "/api/health/hosted", "/auth/app-handoff", "/api/auth/hosted/", "/mcp-oauth/callback", "/", "/pair",
  "/api/auth/email/start", "/api/auth/email/verify", "/api/auth/pair", "/api/pair", "/auth/feishu/start",
  "/auth/feishu/callback", "/auth/feishu/app-return", "/api/auth/feishu/exchange", "/api/bots", "/api/events",
  "/api/config", "/api/inbox", "/api/auth/sessions", "/api/auth/pairing", "/api/attachments/example", "/api/download/example",
];

describe("App channel unauthenticated surface", () => {
  it.each(["app.example.com", "legacy.example.com"]) ("classifies every listed route on %s", (host) => {
    const config = appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true });
    const app = createAppHost(config);
    for (const path of unauthenticatedSurface) {
      const headers = host === "app.example.com" ? { host } : { host, "x-forwarded-for": "203.0.113.44" };
      const { req } = memoryRequest(path, "GET", headers);
      expect(app.isRequest(req, false), path).toBe(true);
      expect(app.rejectRoute(req, path, false), path).toBe(path === "/auth/app-handoff" || path.startsWith("/api/auth/hosted/"));
    }
  });

  it("keeps an Access verified main-host request out of the app channel and blocks JWT on app host", () => {
    const config = appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true });
    const app = createAppHost(config);
    const { req: main } = memoryRequest("/auth/app-handoff", "GET", { host: "crybot.example.com", "x-forwarded-for": "203.0.113.44" });
    expect(app.isRequest(main, true)).toBe(false);
    const { req: appHost } = memoryRequest("/auth/app-handoff", "GET", { host: "app.example.com", "cf-access-jwt-assertion": "fixture" });
    expect(app.rejectAccessAssertion(appHost)).toBe(true);
    const { req: updates } = memoryRequest("/desktop-updates/example", "GET", { host: "app.example.com" });
    expect(app.rejectRoute(updates, "/desktop-updates/example", false)).toBe(false);
    const disabled = createAppHost(appHostConfig({}, { cfAccess: false }));
    expect(disabled.isRequest(updates, false)).toBe(false);
  });
});
