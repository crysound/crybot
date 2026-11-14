import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import builderConfig from "../electron-builder.config.cjs";
import build from "../scripts/desktop-build-config.cjs";
import { defaultServerEnvironment, localServerEnvironment, loginNavigationAllowed, readDesktopBuildConfig } from "./desktop-build-config.mjs";
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

it("writes and reads the provider lock only for explicit true values", () => {
  const dir = temporary();
  expect(readDesktopBuildConfig(dir).providerLock).toBe(false);
  for (const [value, expected] of [[undefined, false], ["", false], ["0", false], ["true", false], ["1", true]]) {
    const config = build.desktopBuildConfig({ CRYBOT_PROVIDER_LOCK: value });
    build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), config);
    expect(JSON.parse(readFileSync(join(dir, "desktop-config.json"), "utf8")).providerLock).toBe(expected);
    expect(readDesktopBuildConfig(dir).providerLock).toBe(expected);
  }
  for (const value of [undefined, "true", "1", 1, false]) {
    build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), { providerLock: value });
    expect(readDesktopBuildConfig(dir).providerLock).toBe(false);
  }
});


it("enables the packaged lock in the local server without losing inherited environment", () => {
  const inherited = { FIXTURE: "kept", CRYBOT_PROVIDER_LOCK: "0" };
  expect(localServerEnvironment({ providerLock: true }, inherited)).toEqual({ FIXTURE: "kept", CRYBOT_PROVIDER_LOCK: "1" });
  expect(localServerEnvironment({ providerLock: false }, inherited)).toEqual(inherited);
  expect(localServerEnvironment({}, { CRYBOT_PROVIDER_LOCK: "1" })).toEqual({ CRYBOT_PROVIDER_LOCK: "1" });
  expect(inherited).toEqual({ FIXTURE: "kept", CRYBOT_PROVIDER_LOCK: "0" });
});

it("enables remote-only builds only with the explicit flag and a valid default server", () => {
  const dir = temporary();
  expect(readDesktopBuildConfig(dir).remoteOnly).toBe(false);
  for (const flag of [undefined, "", "0", "true", "1"]) {
    for (const server of [undefined, "https://gateway.example"]) {
      const config = build.desktopBuildConfig({ CRYBOT_DESKTOP_REMOTE_ONLY: flag, CRYBOT_DEFAULT_SERVER_URL: server });
      build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), config);
      expect(config.remoteOnly).toBe(flag === "1" && Boolean(server));
      expect(readDesktopBuildConfig(dir)).toEqual(config);
    }
  }
  for (const remoteOnly of [undefined, false, "1", "true", 1, true]) {
    for (const defaultServerUrl of [null, "invalid", "http://gateway.example", "https://gateway.example"]) {
      build.writeDesktopBuildConfig(join(dir, "desktop-config.json"), { remoteOnly, defaultServerUrl });
      expect(readDesktopBuildConfig(dir).remoteOnly).toBe(remoteOnly === true && defaultServerUrl === "https://gateway.example");
    }
  }
});

it.each(["local", "saved-local", "other", "gateway"])("selects the deployment server on every launch with a saved %s environment", activeId => {
  const dir = temporary();
  const store = createEnvironmentsFile({ file: () => join(dir, "environments.json"), fs, path });
  const saved = [
    { id: "saved-local", kind: "local", name: "Fixture", dataDir: dir },
    { id: "other", kind: "remote", name: "Other", origin: "https://other.example" },
    ...(activeId === "gateway" ? [{ id: "gateway", kind: "remote", name: "Deployment", origin: "https://gateway.example", color: "blue" }] : []),
  ];
  store.write({ environments: saved, activeId });
  const config = build.desktopBuildConfig({ CRYBOT_DESKTOP_REMOTE_ONLY: "1", CRYBOT_DEFAULT_SERVER_URL: "https://gateway.example" });
  for (let launch = 0; launch < 2; launch++) {
    store.write(defaultServerEnvironment(store.read(), config, true, () => "gateway"));
    const result = store.read();
    expect(environments.activeRemote(result)).toMatchObject({ id: "gateway", origin: "https://gateway.example" });
    expect(result.environments).toHaveLength(3);
    expect(result.environments.map(({ id }) => id)).toEqual(["saved-local", "other", "gateway"]);
    if (activeId === "gateway") expect(environments.activeRemote(result)).toMatchObject({ name: "Deployment", color: "blue" });
    store.write(environments.withActive(result, "local"));
  }
});
