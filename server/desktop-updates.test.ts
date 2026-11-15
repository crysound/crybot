import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { ContainerComputerStatus, LocalVmTarget } from "./container-computer.ts";
import { createLocalVmUpdater, localVmUpdateNeed, migrateScreenBrowserProfiles, vpsDesktopOutdated } from "./desktop-updates.ts";

const status = (over: Partial<ContainerComputerStatus>) => ({
  runtime: "docker", daemonUp: true, image: true, imageMatches: true, managed: true, container: "running",
  create_supported: true, ready: false, problem: null, ...over,
}) as ContainerComputerStatus;

describe("localVmUpdateNeed", () => {
  it("names the old desktops this release must update, and only those", () => {
    expect(localVmUpdateNeed(status({ imageMatches: false }), true)).toBe("recreate");
    expect(localVmUpdateNeed(status({ imageMatches: false, image: false }), false)).toBe("image");
    expect(localVmUpdateNeed(status({ container: "missing", image: false, imageMatches: false }), true)).toBe("image");
    // Nothing to update: a current desktop, a person who never used the VM, a container CryBot did not make, no runtime.
    expect(localVmUpdateNeed(status({}), true)).toBeNull();
    expect(localVmUpdateNeed(status({ container: "missing", image: false, imageMatches: false }), false)).toBeNull();
    expect(localVmUpdateNeed(status({ managed: false, imageMatches: false }), true)).toBeNull();
    expect(localVmUpdateNeed(status({ daemonUp: false, imageMatches: false }), true)).toBeNull();
  });
});

describe("vpsDesktopOutdated", () => {
  it("is true only for this bot's own VPS container on an image this release no longer runs", () => {
    const old = { configured: true, daemonUp: true, container: "running", managed: true, imageMatches: false };
    expect(vpsDesktopOutdated(old)).toBe(true);
    expect(vpsDesktopOutdated({ ...old, imageMatches: true })).toBe(false);
    expect(vpsDesktopOutdated({ ...old, container: "missing" })).toBe(false);
    expect(vpsDesktopOutdated({ ...old, managed: false })).toBe(false);
    expect(vpsDesktopOutdated({ ...old, daemonUp: false })).toBe(false);
    expect(vpsDesktopOutdated(null)).toBe(false);
  });
});

describe("createLocalVmUpdater", () => {
  const target: LocalVmTarget = { key: "bot:abc", containerName: "crybot-computer-abc", workspaceDir: "/nonexistent", viewerPort: null, label: "abc" };
  const setup = (opts: { held?: () => boolean } = {}) => {
    let current = status({ imageMatches: false, image: false });
    const calls: string[] = [];
    let imageBusy = false;
    let provisionBusy = false;
    const lifecycleBusy = new Set<string>();
    const updater = createLocalVmUpdater({
      status: async () => current,
      act: async (action) => {
        calls.push(action);
        if (action === "pull") current = { ...current, image: true };
        if (action === "stop") current = { ...current, container: "stopped" };
        if (action === "remove") current = { ...current, container: "missing" };
        if (action === "run") current = { ...current, container: "running", imageMatches: true };
        return current;
      },
      keepSignIns: async () => { calls.push(`keep (lifecycle busy: ${lifecycleBusy.has(target.key)}, provision busy: ${provisionBusy})`); return "rescued"; },
      keepApps: async () => "none",
      imageBusy: { get: () => imageBusy, set: (busy) => { imageBusy = busy; } },
      provisionBusy: { get: () => provisionBusy, set: (busy) => { provisionBusy = busy; } },
      lifecycleBusy,
      inUse: () => opts.held?.() ?? false,
      updated: () => { calls.push("updated"); },
      workspaceExists: () => true,
      pollMs: 5,
    });
    return { updater, calls, lifecycle: lifecycleBusy, now: () => current };
  };

  it("builds the image, keeps the sign-ins inside the update's own fence, then remakes the desktop", async () => {
    const { updater, calls, lifecycle } = setup();
    expect(updater.observe(target, status({ imageMatches: false, image: false }))).toBe(true);
    await updater.sweep();
    expect(calls).toEqual(["pull", "keep (lifecycle busy: true, provision busy: true)", "remove", "run", "updated"]);
    expect(lifecycle.size).toBe(0);
    expect(updater.pending(target)).toBe(false);
  });

  it("waits while a turn holds the desktop, and starts the moment it is free", async () => {
    let held = true;
    const { updater, calls } = setup({ held: () => held });
    updater.observe(target, status({ imageMatches: false, image: false }));
    const running = updater.sweep();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(calls).toEqual(["pull"]);
    held = false;
    await running;
    expect(calls.at(-1)).toBe("updated");
  });

  it("tells a waiting turn plainly, and lets it stop", async () => {
    let held = true;
    const { updater } = setup({ held: () => held });
    updater.observe(target, status({ imageMatches: false, image: false }));
    const announced: string[] = [];
    let current = true;
    const waiting = updater.waitFor(target, { isCurrent: () => current, cancelled: () => new Error("stopped"), announce: (text) => announced.push(text) });
    await new Promise((resolve) => setTimeout(resolve, 30));
    current = false;
    await expect(waiting).rejects.toThrow("stopped");
    expect(announced).toHaveLength(1);
    expect(announced[0]).toMatch(/^Updating this bot's desktop to the new version/);
    held = false;
  });
});

describe("screen layout migration", () => {
  it("shares a migration between concurrent first turns and permits a later retry after failure", async () => {
    const target = { key: "shared", containerName: "crybot-computer", workspaceDir: "/unused", viewerPort: 6080, label: "shared" };
    let failCopy!: (error: Error) => void;
    const copying = new Promise<{ stdout: string }>((_resolve, reject) => { failCopy = reject; });
    const runner = vi.fn(() => copying);
    const current = status({ screens_layout: "multi" });
    const first = migrateScreenBrowserProfiles(target, current, runner);
    const second = migrateScreenBrowserProfiles(target, current, runner);
    expect(runner).toHaveBeenCalledTimes(1);
    const finished = Promise.allSettled([first, second]);
    failCopy(new Error("copy failed"));
    expect((await finished).map(result => result.status)).toEqual(["rejected", "rejected"]);
    runner.mockResolvedValue({ stdout: "" });
    await migrateScreenBrowserProfiles(target, current, runner);
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("recreates local layouts without invalidating the image or VPS desktops", () => {
    const current = status({ screens_layout: "single" });
    expect(localVmUpdateNeed(current, true, "multi")).toBe("recreate");
    expect(localVmUpdateNeed(status({ screens_layout: "multi" }), true, "single")).toBe("recreate");
    expect(localVmUpdateNeed(status({ screens_layout: "multi" }), true, "multi")).toBeNull();
    expect(vpsDesktopOutdated({ ...current, configured: true })).toBe(false);
  });

  it("stops a current single screen, preserves its files, then migrates after initializing the replacement", async () => {
    const target = { key: "shared", containerName: "crybot-computer", workspaceDir: "/unused", viewerPort: 6080, label: "shared" };
    let current = status({ screens_layout: "single" });
    const calls: string[] = [];
    const flag = { get: () => false, set: () => {} };
    const updater = createLocalVmUpdater({
      status: async () => current, layout: () => "multi", workspaceExists: () => true,
      imageBusy: flag, provisionBusy: flag, lifecycleBusy: new Set(), inUse: () => false,
      beforeRecreate: async () => { calls.push("screens-off"); },
      keepSignIns: async () => { calls.push("keep-sign-ins"); return "kept"; },
      keepApps: async () => { calls.push("keep-apps"); return "kept"; },
      act: async action => {
        calls.push(action);
        if (action === "stop") current = { ...current, container: "stopped" };
        if (action === "remove") current = { ...current, container: "missing" };
        if (action === "run") current = { ...current, container: "running", screens_layout: "multi" };
        return current;
      },
      migrate: async (_target, next) => { expect(next.screens_layout).toBe("multi"); calls.push("copy-profiles"); },
      updated: () => { calls.push("updated"); },
    });
    updater.observe(target, current);
    await updater.sweep();
    expect(calls).toEqual(["screens-off", "stop", "keep-sign-ins", "keep-apps", "remove", "run", "copy-profiles", "updated"]);
    expect(updater.pending(target)).toBe(false);
  });
});

it("copies the retained browser profiles into s1 without replacing an existing screen profile", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cry-screen-migration-"));
  try {
    const workspace = join(dir, "workspace"), home = join(dir, "screen-home"), bin = join(dir, "bin");
    for (const path of [join(dir, "run"), join(workspace, ".browser-profiles", "mozilla"), join(workspace, "screens", "s1"), home, bin]) mkdirSync(path, { recursive: true });
    writeFileSync(join(workspace, ".browser-profiles", "mozilla", "cookies.sqlite"), "retained-cookie");
    writeFileSync(join(workspace, "original.txt"), "original-file");
    writeFileSync(join(bin, "chown"), '#!/bin/sh\n[ "$1" = "-hR" ] || [ "$1" = "-h" ]\n'); chmodSync(join(bin, "chown"), 0o755);
    writeFileSync(join(bin, "id"), '#!/bin/sh\nexit 0\n'); chmodSync(join(bin, "id"), 0o755);
    writeFileSync(join(dir, "supervisord.pid"), "fixture-supervisor");
    const outside = join(dir, "outside");
    writeFileSync(outside, "untouched");
    symlinkSync(outside, join(workspace, ".browser-profiles", "mozilla", "outside-link"));
    const target = { key: "shared", containerName: "crybot-computer", workspaceDir: workspace, viewerPort: 6080, label: "shared" };
    const run = async (_runtime: string, args: string[]) => {
      expect(args.slice(0, 3)).toEqual(["exec", "-u", "0"]);
      const script = args.at(-1)!.replaceAll("/home/cua/workspace", workspace).replaceAll("/home/crybot-s1", home).replaceAll("/run/crybot/screens", join(dir, "run")).replaceAll("/run/crybot/supervisord.pid", join(dir, "supervisord.pid"));
      execFileSync("sh", ["-c", script], { stdio: "ignore", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
      return { stdout: "" };
    };
    await migrateScreenBrowserProfiles(target, status({ screens_layout: "multi" }), run);
    const migrated = join(workspace, "screens", "s1", ".browser-profiles", "mozilla", "cookies.sqlite");
    expect(readFileSync(migrated, "utf8")).toBe("retained-cookie");
    expect(readFileSync(join(workspace, "original.txt"), "utf8")).toBe("original-file");
    writeFileSync(migrated, "screen-cookie");
    await migrateScreenBrowserProfiles(target, status({ screens_layout: "multi" }), run);
    expect(readFileSync(migrated, "utf8")).toBe("screen-cookie");
    expect(readFileSync(join(dir, "run", "browser-profiles-migrated"), "utf8")).toBe("");
    expect(readFileSync(outside, "utf8")).toBe("untouched");
    rmSync(join(workspace, "screens", "s1", ".browser-profiles"), { recursive: true });
    await migrateScreenBrowserProfiles(target, status({ screens_layout: "multi" }), run);
    expect(() => readFileSync(migrated)).toThrow();
    expect(readFileSync(join(workspace, ".browser-profiles", "mozilla", "cookies.sqlite"), "utf8")).toBe("retained-cookie");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
