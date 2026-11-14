import { describe, expect, it, vi } from "vitest";
import { appHostConfig, createAppHost, isAppChannelRequest } from "./app-host.ts";
import { memoryRequest } from "./testing/memory-http.ts";

describe("app channel", () => {
  it("accepts a hostname and rejects ports and paths", () => {
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true })).toEqual({ host: "app.example.com", enabled: true });
    expect(() => appHostConfig({ CRYBOT_APP_HOST: "app.example.com:443" }, { cfAccess: true })).toThrow();
    expect(() => appHostConfig({ CRYBOT_APP_HOST: "https://app.example.com/path" }, { cfAccess: true })).toThrow();
    expect(appHostConfig({ CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.example.com", CRYBOT_CF_ACCESS_AUD: "aud", CRYBOT_CF_ACCESS_ALLOW: "user@example.com" }).enabled).toBe(true);
  });

  it("derives the legacy origin once", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(appHostConfig({ CRYBOT_APP_LINK_ORIGIN: "https://app.example.com" }, { cfAccess: true }).host).toBe("app.example.com");
    expect(appHostConfig({ CRYBOT_APP_LINK_ORIGIN: "https://app.example.com" }, { cfAccess: true }).host).toBe("app.example.com");
    expect(warning).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  it("recognizes an unverified proxied request and the app host", () => {
    const config = appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true });
    const app = createAppHost(config);
    const { req } = memoryRequest("/", "GET", { host: "app.example.com:443" });
    expect(isAppChannelRequest(req, false, config)).toBe(true);
    expect(app.rejectAccessAssertion(req)).toBe(false);
    const { req: proxied } = memoryRequest("/", "GET", { host: "legacy.example.com", "x-forwarded-for": "203.0.113.7" });
    expect(app.isRequest(proxied, false)).toBe(true);
    expect(app.isRequest(proxied, true)).toBe(false);
  });

  it("disables hosted modes", () => {
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true, hostedWorkspace: true }).enabled).toBe(false);
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com" }, { cfAccess: true, cloudTeam: true }).enabled).toBe(false);
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com", CRYBOT_ADMIN_URL: "https://admin.example.com" }, { cfAccess: true }).enabled).toBe(false);
    expect(appHostConfig({ CRYBOT_APP_HOST: "app.example.com", CRYBOT_CLOUD_ROLE: "team" }, { cfAccess: true }).enabled).toBe(false);
  });
});
