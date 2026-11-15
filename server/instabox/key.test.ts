import { afterEach, expect, it, vi } from "vitest";
import { instaboxApiKey, instaboxConfigured } from "./key.ts";
import { parseStoredConfig, saveConfig, loadConfig, stripControlPlaneEnv, stripWorkspaceCredentialEnv } from "../config.ts";

afterEach(() => { vi.unstubAllEnvs(); });

it("prefers a nonempty environment key, then config, treating blanks as unconfigured", () => {
  vi.stubEnv("INSTABOX_API_KEY", " env-fixture ");
  expect(instaboxApiKey({ instabox: { apiKey: "config-fixture" } })).toBe("env-fixture");
  vi.stubEnv("INSTABOX_API_KEY", "  ");
  expect(instaboxApiKey({ instabox: { apiKey: " config-fixture " } })).toBe("config-fixture");
  expect(instaboxConfigured({ instabox: { apiKey: " " } })).toBe(false);
  expect(instaboxConfigured({})).toBe(false);
});

it("parses and persists the server config section", () => {
  expect(parseStoredConfig({ instabox: { apiKey: "config-fixture" } }).instabox).toEqual({ apiKey: "config-fixture" });
  saveConfig({ instabox: { apiKey: "saved-fixture" } });
  expect(loadConfig().instabox?.apiKey).toBe("saved-fixture");
  saveConfig({ instabox: { apiKey: "" } });
  expect(loadConfig().instabox?.apiKey).toBe("");
});


it.each([stripControlPlaneEnv, stripWorkspaceCredentialEnv])("keeps InstaBox credentials out of child environments", strip => {
  const env = { INSTABOX_API_KEY: "fixture-secret", instabox_api_key: "fixture-secret", PATH: "/fixture/bin" };
  strip(env);
  expect(env).toEqual({ PATH: "/fixture/bin" });
});
