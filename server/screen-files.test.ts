import { link, mkdir, readFile, rename, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { guestWorkspaceToHost } from "./bot-attachment.ts";
import { screenWorkdir, SHARED_LOCAL_VM_TARGET } from "./container-targets.ts";
import { screenFileAccess, removeScreenFile } from "./screen-files.ts";
import { screenFilesFixture } from "./testing/screen-files-fixture.ts";
import { migrateLegacyBrowserProfilesToScreen, rescueFirefoxProfile } from "./local-vm-profiles.ts";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
const fixture = async () => { const f = await screenFilesFixture(); cleanups.push(f.cleanup); return f; };

describe.skipIf(process.platform === "win32")("screen file access", () => {
  it("keeps every legacy guest mapping unchanged", async () => {
    const f = await fixture();
    const access = screenFileAccess("unused", { ...SHARED_LOCAL_VM_TARGET, workspaceDir: f.workspace });
    for (const path of ["/home/cua/workspace/a.txt", "file:///home/cua/workspace/a%20b.txt", "/home/cua/workspace/a/../b", "/home/cua/workspace", "a.txt", "/etc/passwd", "/home/cua/workspace/../a"]) {
      expect(access.guestToHost(path)).toBe(guestWorkspaceToHost(path, "/home/cua/workspace", f.workspace));
    }
  });

  it("refuses s1 paths and traversal before invoking the runtime", async () => {
    const f = await fixture();
    for (const path of [screenWorkdir(1) + "/x", screenWorkdir(2) + "/../s1/x", "../s1/x", "/etc/passwd", "file:///etc/passwd"]) {
      expect(f.access.guestToHost(path)).toBeNull();
      await expect(f.access.readFile(path, 100)).rejects.toMatchObject({ status: 403 });
      await expect(f.access.writeFile(path, Buffer.from("x"))).rejects.toMatchObject({ status: 403 });
      await expect(f.access.stat(path)).rejects.toMatchObject({ status: 403 });
      await expect(f.access.list(path)).rejects.toMatchObject({ status: 403 });
    }
    expect(await f.calls()).toEqual([]);
  });

  it("reads binary private files, bounds reads, lists and reports missing files", async () => {
    const f = await fixture(), data = Buffer.from([0, 255, 1, 128]);
    await writeFile(join(f.screenDir, "private.bin"), data, { mode: 0o600 });
    expect(await f.access.readFile("private.bin", 4)).toEqual(data);
    await expect(f.access.readFile("private.bin", 3)).rejects.toMatchObject({ status: 413 });
    expect(await f.access.stat("private.bin")).toEqual({ size: 4, isFile: true });
    expect(await f.access.stat("missing")).toBeNull();
    expect(await f.access.list(screenWorkdir(2))).toEqual(["private.bin"]);
    await expect(f.access.readFile("missing", 8)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects symlink escapes in parent directories, final files and the screen root", async () => {
    const f = await fixture();
    await mkdir(join(f.workspace, "screens", "s1"));
    await writeFile(join(f.workspace, "screens", "s1", "private"), "other screen");
    await symlink("../s1", join(f.screenDir, "escape"));
    await symlink("../s1/private", join(f.screenDir, "linked"));
    expect(f.access.guestToHost(`${screenWorkdir(2)}/escape/private`)).toBeNull();
    for (const path of ["escape/private", "linked"]) {
      await expect(f.access.readFile(path, 100)).rejects.toMatchObject({ status: 403 });
    }
    await expect(f.access.writeFile("escape/private", Buffer.from("no"))).rejects.toMatchObject({ status: 403 });
    expect(await readFile(join(f.workspace, "screens", "s1", "private"), "utf8")).toBe("other screen");
    await rename(f.screenDir, `${f.screenDir}-saved`);
    await symlink("s1", f.screenDir);
    expect(f.access.guestToHost(`${screenWorkdir(2)}/private`)).toBeNull();
    await expect(f.access.readFile("private", 100)).rejects.toMatchObject({ status: 403 });
    await expect(f.access.writeFile("private", Buffer.from("no"))).rejects.toMatchObject({ status: 403 });
  });

  it("writes with the screen identity, private mode and stdin; replaces links without modifying their targets", async () => {
    const f = await fixture(), data = Buffer.from("fixture-private-value");
    await f.access.writeFile(".crybot-secrets/thread/card", data, 0o600);
    const file = join(f.screenDir, ".crybot-secrets", "thread", "card");
    expect(await readFile(file)).toEqual(data);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    const [args] = await f.calls();
    expect(args!.slice(0, 4)).toEqual(["exec", "-i", "-u", "crybot-s2"]);
    expect(args).toContain("HOME=/home/crybot-s2");
    expect(args).toContain("VNC_PW");
    expect(JSON.stringify(args)).not.toContain(data.toString());
    await link(file, join(f.screenDir, "hard"));
    await f.access.writeFile("hard", Buffer.from("replacement"));
    expect(await readFile(file)).toEqual(data);
    await f.access.writeFile("ordinary/nested/file", Buffer.from("shared directory"));
    expect((await stat(join(f.screenDir, "ordinary/nested"))).mode & 0o777).toBe(0o770);
    expect((await stat(join(f.screenDir, ".crybot-secrets/thread"))).mode & 0o777).toBe(0o700);
    await removeScreenFile(f.access, "hard");
    expect(await f.access.stat("hard")).toBeNull();
  });

  it("rescues only the selected screen's Firefox profile with screen-owned writes", async () => {
    const f = await fixture();
    const profile = join(f.root, "container", "home", "crybot-s2", ".mozilla", "firefox");
    await mkdir(profile, { recursive: true });
    await writeFile(join(profile, "cookies.sqlite"), "fixture-session");
    expect(await rescueFirefoxProfile(f.runtime, f.target)).toBe("rescued");
    expect(await f.access.readFile(".browser-profiles/mozilla/firefox/cookies.sqlite", 100)).toEqual(Buffer.from("fixture-session"));
    expect(await rescueFirefoxProfile(f.runtime, f.target)).toBe("kept");
    const calls = await f.calls();
    expect(calls.some((args) => args[0] === "cp")).toBe(false);
    expect(calls.find((args) => args.some((value) => value.includes("tar -C")))?.slice(0, 4)).toEqual(["exec", "-i", "-u", "crybot-s2"]);
  });
});

it.skipIf(process.platform === "win32")("seeds only s1 from legacy browser files and never replaces existing screen sign-ins", async () => {
  const f = await screenFilesFixture(1);
  cleanups.push(f.cleanup);
  const legacy = join(f.workspace, ".browser-profiles", "mozilla");
  await mkdir(legacy, { recursive: true });
  await writeFile(join(legacy, "cookies.sqlite"), "legacy-session");
  const target = { ...f.target, screen: 1 };
  expect(await migrateLegacyBrowserProfilesToScreen(f.runtime, target)).toBe("rescued");
  expect(await readFile(join(legacy, "cookies.sqlite"), "utf8")).toBe("legacy-session");
  expect(await f.access.readFile(".browser-profiles/mozilla/cookies.sqlite", 100)).toEqual(Buffer.from("legacy-session"));
  await f.access.writeFile(".browser-profiles/mozilla/cookies.sqlite", Buffer.from("screen-session"));
  expect(await migrateLegacyBrowserProfilesToScreen(f.runtime, target)).toBe("kept");
  expect(await f.access.readFile(".browser-profiles/mozilla/cookies.sqlite", 100)).toEqual(Buffer.from("screen-session"));
  expect(await migrateLegacyBrowserProfilesToScreen(f.runtime, { ...target, screen: 2, key: "shared:s2" })).toBe("none");
});

it.skipIf(process.platform === "win32")("expires screen secret files through the same screen identity", async () => {
  const { SecretVault, SECRET_FILE_TTL_MS } = await import("./secret-vault.ts");
  const f = await fixture();
  let now = 100_000;
  const vault = new SecretVault(() => now);
  const file = await vault.saveFileWithAccess({ botId: "bot", threadId: "thread" }, "card", "fixture-expiry-value", f.access);
  await vault.sweepAccess(f.access, () => 100_000, () => true);
  expect(await f.access.stat(file)).toMatchObject({ isFile: true });
  now += SECRET_FILE_TTL_MS;
  await vault.sweepAccess(f.access, () => 100_000, () => true);
  expect(await f.access.stat(file)).toBeNull();
  expect(vault.savedFor("card")).toBeNull();
});

it("crosses foreign-owned 0711 parents as an unprivileged uid and keeps directory modes", async (context) => {
  if (process.platform !== "linux" || process.getuid?.() !== 0) {
    process.stderr.write("Skipping foreign-owned 0711 fixture: Linux root is required to run setpriv with another uid.\n");
    context.skip("Linux root is required to run setpriv with another uid."); return;
  }
  const { execFile } = await import("node:child_process");
  const { chmod, chown } = await import("node:fs/promises");
  const { SCREEN_FILES_SCRIPT } = await import("./screen-files-script.ts");
  const f = await fixture();
  for (const path of [f.root, join(f.root, "container"), join(f.root, "container/home"), join(f.root, "container/home/cua"), f.workspace, join(f.workspace, "screens")]) {
    await chmod(path, 0o711);
    await chown(path, 0, 0);
  }
  await chown(f.screenDir, 61002, 61002);
  await chmod(f.screenDir, 0o2770);
  const run = (path: string, action: string, argument = 0, data?: string) => new Promise<Buffer>((resolve, reject) => {
    const child = execFile("setpriv", ["--reuid=61002", "--regid=61002", "--clear-groups", "--no-new-privs", "python3", "-I", "-c", SCREEN_FILES_SCRIPT, f.screenDir, path, action, String(argument)], { encoding: "buffer" }, (error, stdout) => error ? reject(error) : resolve(stdout));
    child.stdin?.end(data);
  });
  await run("files/nested/test.txt", "write", 0o660, "screen-owned");
  expect((await run("files/nested/test.txt", "read", 100)).toString()).toBe("screen-owned");
  expect(JSON.parse((await run("files/nested", "list")).toString())).toEqual(["test.txt"]);
  expect((await stat(join(f.screenDir, "files/nested/test.txt"))).uid).toBe(61002);
  expect((await stat(join(f.screenDir, "files/nested"))).mode & 0o777).toBe(0o770);
  await run(".crybot-secrets/thread/token", "write", 0o600, "private-fixture");
  expect((await stat(join(f.screenDir, ".crybot-secrets/thread"))).mode & 0o777).toBe(0o700);
});

it("maps only the current screen's HOME workspace alias", async () => {
  const f = await fixture();
  await f.access.writeFile("/home/crybot-s2/workspace/note.txt", Buffer.from("alias"));
  expect(await f.access.readFile("note.txt", 100)).toEqual(Buffer.from("alias"));
  await expect(f.access.readFile("/home/crybot-s1/workspace/note.txt", 100)).rejects.toMatchObject({ status: 403 });
});

it.each(["applications", "chrome"] as const)("rescues %s symlinks verbatim with a constant number of exec calls", async (kind) => {
  const { rescueInstalledApps } = await import("./local-vm-profiles.ts");
  const { readlink } = await import("node:fs/promises");
  const counts: number[] = [];
  for (const count of [1, 30]) {
    const f = await fixture();
    const profile = join(f.root, "container/home/crybot-s2", kind === "applications" ? ".local/bin" : ".config/google-chrome/bin");
    await mkdir(profile, { recursive: true });
    await symlink("/usr/bin/python3", join(profile, "python"));
    await symlink("/not-present-on-host/python", join(profile, "missing-python"));
    for (let n = 0; n < count; n++) await writeFile(join(profile, `app-${n}`), `app ${n}`);
    expect(await (kind === "applications" ? rescueInstalledApps : rescueFirefoxProfile)(f.runtime, f.target)).toBe("rescued");
    counts.push((await f.calls()).filter((call) => call[0] === "exec").length);
    const durable = kind === "applications" ? ".desktop-apps/local/bin" : ".browser-profiles/google-chrome/bin";
    const destination = join(f.screenDir, durable);
    expect(await readlink(join(destination, "python"))).toBe("/usr/bin/python3");
    expect(await readlink(join(destination, "missing-python"))).toBe("/not-present-on-host/python");
    expect(await readFile(join(destination, `app-${count - 1}`), "utf8")).toBe(`app ${count - 1}`);
    await expect(f.access.readFile(`${durable}/python`, 100)).rejects.toMatchObject({ status: 403 });
  }
  expect(counts).toEqual(kind === "applications" ? [6, 6] : [12, 12]);
});

it("refuses stopped screen preservation before invoking stop or the runtime", async () => {
  const { keepFirefoxProfileBeforeRemove, keepInstalledAppsBeforeRemove, SCREEN_RESCUE_REQUIRES_RUNNING } = await import("./local-vm-profiles.ts");
  const f = await fixture();
  for (const keep of [keepFirefoxProfileBeforeRemove, keepInstalledAppsBeforeRemove]) {
    await expect(keep(f.target, { runtime: "docker", container: "stopped", managed: true, imageMatches: true }, async () => { throw new Error("must not stop"); })).rejects.toThrow(SCREEN_RESCUE_REQUIRES_RUNNING);
  }
  expect(await f.calls()).toEqual([]);
});

it("uses constant exec counts for app collection, page bundles and metadata-only signatures", async () => {
  const { collectAppFiles } = await import("./host/app-publisher.ts");
  const { pageSignature, readPageBundle } = await import("./pages/bundle.ts");
  const { utimes } = await import("node:fs/promises");
  const counts: number[][] = [];
  for (const count of [1, 30]) {
    const f = await fixture();
    const folder = join(f.screenDir, "site");
    await mkdir(folder);
    await writeFile(join(folder, "index.html"), "<h1>Page</h1>");
    for (let n = 1; n < count; n++) await writeFile(join(folder, `${n}.css`), `body{order:${n}}`);
    const limits = { maxBytes: 100_000, maxFileBytes: 100_000, maxFiles: 100 };
    expect((await collectAppFiles("site", limits, f.access)).files).toHaveLength(count);
    const appCalls = (await f.calls()).length;
    expect((await readPageBundle("site", [], undefined, {}, f.access)).files).toHaveLength(count);
    const pageCalls = (await f.calls()).length - appCalls;
    const signature = await pageSignature("site", {}, undefined, f.access);
    const signatureCalls = (await f.calls()).slice(appCalls + pageCalls);
    expect(signatureCalls.map((call) => call.at(-2))).toEqual(["tree"]);
    counts.push([appCalls, pageCalls, signatureCalls.length]);
    await utimes(join(folder, "index.html"), new Date(1000), new Date(1000));
    expect(await pageSignature("site", {}, undefined, f.access)).not.toBe(signature);
  }
  expect(counts[0]).toEqual(counts[1]);
  expect(counts[0]).toEqual([2, 4, 1]);
});
