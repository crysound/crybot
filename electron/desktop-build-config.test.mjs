import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import builderConfig from "../electron-builder.config.cjs";
import build from "../scripts/desktop-build-config.cjs";
import { defaultServerEnvironment, loginNavigationAllowed, readDesktopBuildConfig } from "./desktop-build-config.mjs";
import environments from "./environments.cjs";
import { createEnvironmentsFile } from "./environments-file.mjs";
import * as fs from "node:fs";
import * as path from "node:path";

const dirs = [];
afterEach(() => { vi.unstubAllEnvs(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const temporary = () => { const dir = mkdtempSync(join(tmpdir(), "cry-desktop-")); dirs.push(dir); return dir; };
it("omits publishing without a feed, and uses only the given generic feed", () => {
  vi.stubEnv("CRYBOT_UPDATE_FEED_URL", "");
  expect(builderConfig()).not.toHaveProperty("publish");
  vi.stubEnv("CRYBOT_UPDATE_FEED_URL", "https://example.com/desktop-updates/");
  expect(builderConfig().publish).toEqual({ provider: "generic", url: "https://example.com/desktop-updates/", useMultipleRangeRequest: false });
});
it("enables notarization only with all Apple API credentials, keeps hardened runtime, dmg/zip and unsigned Windows", () => {
  for (const name of ["APPLE_API_KEY", "APPLE_API_KEY_ID", "APPLE_API_ISSUER"]) vi.stubEnv(name, "");
  expect(builderConfig().mac.notarize).toBe(false);
  vi.stubEnv("APPLE_API_KEY", "/tmp/example.p8"); vi.stubEnv("APPLE_API_KEY_ID", "example");
  expect(builderConfig().mac.notarize).toBe(false);
  vi.stubEnv("APPLE_API_ISSUER", "example");
  const config = builderConfig();
  expect(config.mac.notarize).toBe(true); expect(config.mac.hardenedRuntime).toBe(true);
  expect(config.mac.target.map(entry => entry.target)).toEqual(["dmg", "zip"]);
  expect(readFileSync(config.mac.entitlements, "utf8")).toContain("com.apple.security.cs.allow-jit");
  expect(config.win.signExecutable).toBe(false);
  expect(config.win.target.some(entry => entry.target === "nsis")).toBe(true);
});
it("writes and reads build resources, selects the default once and preserves the user's later choice", () => {
  const dir = temporary();
  const config = build.desktopBuildConfig({ CRYBOT_DEFAULT_SERVER_URL: "https://example.com/", CRYBOT_LOGIN_HOSTS: "example.cloudflareaccess.com, login.example.com" });
  build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), config);
  expect(readDesktopBuildConfig(dir)).toEqual(config);
  const store = createEnvironmentsFile({ file: () => join(dir, "environments.json"), fs, path });
  const state = defaultServerEnvironment(store.read(), config, false, () => "default-server");
  expect(environments.activeRemote(state)?.origin).toBe("https://example.com");
  store.write(state);
  expect(environments.activeRemote(store.read())?.origin).toBe("https://example.com");
  const local = environments.withActive(store.read(), environments.LOCAL_ID);
  store.write(local);
  expect(defaultServerEnvironment(store.read(), config, true, () => "unused")).toEqual(store.read());
  expect(defaultServerEnvironment(local, { defaultServerUrl: null }, false, () => "unused")).toBe(local);
  expect(readDesktopBuildConfig(temporary()).updateFeedUrl).toBeNull();
});
it("keeps server and exact login hosts inside the window without extending IPC authority", () => {
  const state = defaultServerEnvironment({ environments: [], activeId: "local" }, { defaultServerUrl: "https://example.com" }, false, () => "remote");
  const remote = environments.activeRemote(state);
  const hosts = ["example.cloudflareaccess.com", "login.example.com"];
  for (const url of ["https://example.com/chat", "https://example.cloudflareaccess.com/login", "https://login.example.com/oauth"]) expect(loginNavigationAllowed(url, remote, hosts)).toBe(true);
  for (const url of ["https://outside.example.com", "https://login.example.com.evil.example.com", "https://example.com@outside.example.com", "javascript:alert(1)", "file:///tmp/example"]) expect(loginNavigationAllowed(url, remote, hosts)).toBe(false);
  expect(loginNavigationAllowed("https://login.example.com", null, hosts)).toBe(false);
  const frame = { url: "https://login.example.com" }, contents = { mainFrame: frame };
  expect(environments.workspaceSenderAllowed({ sender: contents, senderFrame: frame }, contents, state, "http://localhost")).toBe(false);
});
it("rejects malformed build URLs and login hosts", () => {
  for (const input of [{ CRYBOT_DEFAULT_SERVER_URL: "https://example.com/path" }, { CRYBOT_DEFAULT_SERVER_URL: "file:///tmp/example" }, { CRYBOT_UPDATE_FEED_URL: "https://user:password@example.com" }, { CRYBOT_LOGIN_HOSTS: "*.example.com" }]) expect(() => build.desktopBuildConfig(input)).toThrow();
});

it.each(["CRYBOT_DEFAULT_SERVER_URL", "CRYBOT_UPDATE_FEED_URL"])("requires HTTPS except loopback for %s, at build and resource loading", name => {
  const key = name === "CRYBOT_DEFAULT_SERVER_URL" ? "defaultServerUrl" : "updateFeedUrl";
  const dir = temporary();
  for (const url of ["https://example.com", "http://localhost:8080", "http://127.0.0.1:8080", "http://[::1]:8080"]) {
    const config = build.desktopBuildConfig({ [name]: url });
    build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), config);
    expect(readDesktopBuildConfig(dir)[key]).toBe(config[key]);
  }
  for (const url of ["http://example.com", "http://192.0.2.1", "http://localhost.example.com", "http://[::2]", "ftp://example.com", "https://user:pass@example.com", "not a URL"]) {
    expect(() => build.desktopBuildConfig({ [name]: url })).toThrow();
    build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), { [key]: url });
    expect(readDesktopBuildConfig(dir)[key]).toBeNull();
    vi.stubEnv(name, url);
    expect(() => builderConfig()).toThrow();
  }
});
