import { join, sep } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createUpdateChecker as configuredUpdateChecker, installKind, isNewerVersion, updateChannel } from "./update-check.ts";

const FEED_URL = "https://updates.example.test/latest";
const promoted = (version: string) => new Response(JSON.stringify({ version, releaseUrl: `https://updates.example.test/releases/${version}` }));
const feed = (version: string) => vi.fn(async () => promoted(version));
const createUpdateChecker = (options: Parameters<typeof configuredUpdateChecker>[0]) => configuredUpdateChecker({ url: FEED_URL, ...options });

describe("server update check", () => {
  it("tells how this server was installed", () => {
    const none = () => false;
    const root = ["", "srv", "Cry Bot", "server"].join(sep);
    expect(installKind({ desktopManaged: true, managed: false, serverRoot: root, exists: () => true })).toBe("desktop");
    expect(installKind({ desktopManaged: false, managed: true, serverRoot: root, exists: () => true })).toBe("managed");
    expect(installKind({ desktopManaged: false, managed: false, serverRoot: root, exists: (path) => path === "/.dockerenv" })).toBe("docker");
    expect(installKind({ desktopManaged: false, managed: false, serverRoot: root, exists: (path) => path === "/run/.containerenv" })).toBe("podman");
    expect(installKind({
      desktopManaged: false, managed: false, exists: none,
      serverRoot: ["", "usr", "lib", "node_modules", "crybot", "dist-server"].join(sep),
    })).toBe("npm");
    expect(installKind({ desktopManaged: false, managed: false, serverRoot: root, exists: (path) => path === join(root, "..", ".git") })).toBe("git");
    expect(installKind({ desktopManaged: false, managed: false, serverRoot: root, exists: none })).toBe("unknown");
  });

  it("compares release versions numerically and never reports a malformed one", () => {
    expect(isNewerVersion("v0.1.93", "0.1.92")).toBe(true);
    expect(isNewerVersion("0.1.10", "0.1.9")).toBe(true);
    expect(isNewerVersion("v0.2.0", "0.1.99")).toBe(true);
    expect(isNewerVersion("v0.1.92", "0.1.92")).toBe(false);
    expect(isNewerVersion("v0.1.91", "0.1.92")).toBe(false);
    expect(isNewerVersion("nightly", "0.1.92")).toBe(false);
    expect(isNewerVersion("v0.1.93", "unknown")).toBe(false);
    expect(isNewerVersion("v0.1.93", "0.1.93-rc.1")).toBe(true);
    expect(isNewerVersion("v0.1.93-rc.2", "0.1.93-rc.1")).toBe(true);
    expect(isNewerVersion("v0.1.93-rc.10", "0.1.93-rc.9")).toBe(true);
    expect(isNewerVersion("v0.1.93-rc.1", "0.1.93")).toBe(false);
    expect(isNewerVersion("v0.1.93-rc.1", "0.1.93-rc.1")).toBe(false);
    expect(isNewerVersion("v0.1.93-rc.1.1", "0.1.93-rc.1")).toBe(true);
  });

  it("follows the stable channel, not the newest release, and gives the update command for this install", async () => {
    const fetch = feed("0.1.93");
    const check = createUpdateChecker({ current: "0.1.92", install: "docker", fetch });
    expect(await check()).toEqual({
      current: "0.1.92",
      install: "docker",
      channel: "stable",
      latest: "0.1.93",
      available: true,
      releaseUrl: "https://updates.example.test/releases/0.1.93",
      command: "git pull && ./update.sh",
      restart: false,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(FEED_URL, expect.anything());
    expect(await createUpdateChecker({ current: "0.1.92", install: "npm", fetch })()).toMatchObject({
      latest: "0.1.93",
      releaseUrl: "https://updates.example.test/releases/0.1.93",
    });
  });

  it("offers nothing to a server that is already on the stable version or past it", async () => {
    expect(await createUpdateChecker({ current: "0.1.93", install: "docker", fetch: feed("0.1.93") })()).toMatchObject({ channel: "stable", latest: "0.1.93", available: false });
    expect(await createUpdateChecker({ current: "0.1.95", install: "docker", fetch: feed("0.1.93") })()).toMatchObject({ available: false });
  });

  it("uses only the configured feed for either channel and rejects a missing feed", async () => {
    const fetch = feed("0.1.95");
    expect(await createUpdateChecker({ current: "0.1.92", install: "docker", channel: "newest", fetch })()).toMatchObject({ channel: "newest", latest: "0.1.95" });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(FEED_URL, expect.anything());
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(createUpdateChecker({ current: "0.1.92", install: "docker", fetch: missing })()).rejects.toThrow("Update feed answered 404");
    expect(missing).toHaveBeenCalledTimes(1);
    expect(updateChannel({})).toBe("stable");
    expect(updateChannel({ CRYBOT_UPDATE_CHANNEL: " Newest " })).toBe("newest");
  });

  it("does not take a broken channel record for a version, or fall back past it", async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ version: "invalid" }) }) as Response);
    await expect(createUpdateChecker({ current: "0.1.92", install: "docker", fetch })()).rejects.toThrow("Update feed named no valid version");
    fetch.mockImplementation(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response);
    await expect(createUpdateChecker({ current: "0.1.92", install: "docker", fetch })()).rejects.toThrow("Update feed answered 500");
  });

  it("gives the last answer while the channel cannot be read, for a day, and never the newest release instead", async () => {
    let now = 0;
    let down = false;
    const fetch = vi.fn(async () => {
      if (down) return { ok: false, status: 503, json: async () => ({}) } as Response;
      return promoted("0.1.93");
    });
    const check = createUpdateChecker({ current: "0.1.92", install: "docker", fetch, now: () => now });
    expect(await check()).toMatchObject({ channel: "stable", latest: "0.1.93", available: true });
    down = true;
    now = 2 * 60 * 60_000;
    expect(await check()).toMatchObject({ channel: "stable", latest: "0.1.93", available: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    now = 25 * 60 * 60_000;
    await expect(check()).rejects.toThrow("Update feed answered 503");
  });

  it("says up to date, and asks at most once an hour", async () => {
    let now = 0;
    const fetch = feed("0.1.92");
    const check = createUpdateChecker({ current: "0.1.92", install: "npm", fetch, now: () => now });
    expect(await check()).toMatchObject({ available: false, latest: "0.1.92", releaseUrl: "https://updates.example.test/releases/0.1.92" });
    now = 59 * 60_000;
    await check();
    expect(fetch).toHaveBeenCalledTimes(1);
    now = 61 * 60_000;
    await check();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not look anything up for a desktop or hosted server", async () => {
    const fetch = vi.fn();
    for (const install of ["desktop", "managed"] as const) {
      expect(await createUpdateChecker({ current: "0.1.92", install, fetch })()).toEqual({ current: "0.1.92", install, available: false });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails clearly when the feed cannot be reached, and tries again next time", async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }) as Response);
    const check = createUpdateChecker({ current: "0.1.92", install: "git", channel: "newest", fetch });
    await expect(check()).rejects.toThrow("Update feed answered 403");
    fetch.mockImplementation(async () => promoted("0.1.93"));
    expect(await check()).toMatchObject({ available: true, command: "git pull && pnpm install", restart: true });
  });
});
