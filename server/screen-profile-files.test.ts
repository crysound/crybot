import { chmod, mkdir, open, readFile, readdir, readlink, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { extractScreenProfile, migrateLegacyBrowserProfilesToScreen, rescueScreenProfile } from "./screen-profile-files.ts";
import { screenFilesFixture } from "./testing/screen-files-fixture.ts";
import { keepFirefoxProfileBeforeRemove, keepInstalledAppsBeforeRemove } from "./local-vm-profiles.ts";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
async function fixture(screen = 2) {
  const f = await screenFilesFixture(screen);
  cleanups.push(f.cleanup);
  return { ...f, target: { ...f.target, screen } };
}

type HostileArchive = "dotdot" | "symlink" | "hardlink" | "absolute" | "backslash" | "symlink-backslash" | "symlink-slash" | "symlink-double-slash" | "symlink-dotdot" | "root-file" | "root-link" | "device" | "fifo"
  | "drive-absolute" | "drive-relative" | "segment-colon" | "symlink-colon" | "symlink-case" | "symlink-unicode" | "symlink-case-same" | "symlink-unicode-same";

async function hostileArchiveFixture(kind: HostileArchive) {
  const f = await fixture(1);
  const outside = join(f.root, "outside");
  const outsideFile = join(outside, "source");
  const marker = `screen-profile-${kind}`;
  await mkdir(outside, { recursive: true });
  await writeFile(outsideFile, "outside");
  const archivePath = join(f.root, "hostile.tar");
  const script = `#!/usr/bin/env python3
import io, os, sys, tarfile
a = sys.argv[1:]
if "sh" in a and "tar -C" in " ".join(a):
    kind = ${JSON.stringify(kind)}
    marker = ${JSON.stringify(marker)}
    outside = ${JSON.stringify(outside)}
    outside_file = ${JSON.stringify(outsideFile)}
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w") as tar:
        def file(name, data=b"x"):
            info = tarfile.TarInfo(name)
            info.mode = 0o600
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
        if kind == "dotdot":
            file("./a/../../" + marker)
        elif kind in ("symlink", "symlink-slash", "symlink-double-slash"):
            suffix = {"symlink": "", "symlink-slash": "/", "symlink-double-slash": "//"}[kind]
            info = tarfile.TarInfo("./x" + suffix)
            info.type = tarfile.SYMTYPE
            info.linkname = outside
            tar.addfile(info)
            file("./x/" + marker)
        elif kind in ("symlink-case", "symlink-unicode", "symlink-case-same", "symlink-unicode-same"):
            unicode_name = "unicode" in kind
            info = tarfile.TarInfo("./" + ("e" + chr(0x301) if unicode_name else "x"))
            info.type = tarfile.SYMTYPE
            info.linkname = outside
            tar.addfile(info)
            name = chr(0xe9) if unicode_name else "X"
            file("./" + name + ("" if kind.endswith("-same") else "/f"))
        elif kind in ("drive-absolute", "drive-relative", "segment-colon"):
            file({"drive-absolute": "C:/x", "drive-relative": "C:x", "segment-colon": "a/b:c"}[kind])
        elif kind == "symlink-colon":
            info = tarfile.TarInfo("./x")
            info.type = tarfile.SYMTYPE
            info.linkname = "a/b:c"
            tar.addfile(info)
        elif kind == "hardlink":
            info = tarfile.TarInfo("./leak")
            info.type = tarfile.LNKTYPE
            info.linkname = outside_file
            tar.addfile(info)
        elif kind == "absolute":
            file(outside + "/" + marker)
        elif kind == "backslash":
            file("." + chr(92) + ".." + chr(92) + ".." + chr(92) + marker)
        elif kind == "symlink-backslash":
            info = tarfile.TarInfo("./x")
            info.type = tarfile.SYMTYPE
            info.linkname = ".." + chr(92) + "outside"
            tar.addfile(info)
        elif kind == "symlink-dotdot":
            info = tarfile.TarInfo("a/l")
            info.type = tarfile.SYMTYPE
            info.linkname = "../../x"
            tar.addfile(info)
        elif kind == "root-file":
            file(".")
        elif kind == "root-link":
            info = tarfile.TarInfo(".")
            info.type = tarfile.SYMTYPE
            info.linkname = outside
            tar.addfile(info)
        elif kind == "fifo":
            info = tarfile.TarInfo("./fifo")
            info.type = tarfile.FIFOTYPE
            tar.addfile(info)
        elif kind == "device":
            info = tarfile.TarInfo("./device")
            info.type = tarfile.CHRTYPE
            info.devmajor = 1
            info.devminor = 3
            tar.addfile(info)
    with open(${JSON.stringify(archivePath)}, "wb") as saved:
        saved.write(archive.getvalue())
    sys.stdout.buffer.write(archive.getvalue())
else:
    command = a[a.index("python3"):]
    command[4] = os.path.join(os.path.dirname(__file__), "container", command[4].lstrip("/"))
    os.execvp("python3", command)
`;
  await writeFile(f.runtime, script);
  await chmod(f.runtime, 0o755);
  return { ...f, outside, outsideFile, marker, archivePath };
}

it("streams a 400 MiB sparse profile through one exec", async () => {
  const f = await fixture(1);
  const source = join(f.workspace, ".browser-profiles/chromium/Default");
  await mkdir(source, { recursive: true });
  const size = 400 * 1024 * 1024;
  const file = await open(join(source, "Login Data"), "w");
  try {
    await file.truncate(size);
    await file.write(Buffer.from("signed-in"), 0, 9, size - 9);
  } finally { await file.close(); }
  expect(await migrateLegacyBrowserProfilesToScreen(f.runtime, f.target, f.access)).toBe("rescued");
  const target = join(f.screenDir, ".browser-profiles/chromium/Default/Login Data");
  expect((await stat(target)).size).toBe(size);
  const saved = await open(target, "r");
  try {
    const tail = Buffer.alloc(9);
    await saved.read(tail, 0, 9, size - 9);
    expect(tail.toString()).toBe("signed-in");
  } finally { await saved.close(); }
  expect((await f.calls()).filter((call) => call.at(-2) === "writeStream")).toHaveLength(1);
  expect(await f.access.stat(".browser-profiles-migration-pending")).toBeNull();
}, 60_000);

it.each([1024 * 1024 * 1024, 1024 * 1024 * 1024 + 1])("checks the 1 GiB profile limit at %i bytes without writing the payload", async (size) => {
  const f = await fixture(1);
  const source = join(f.workspace, ".browser-profiles");
  await mkdir(source);
  const file = await open(join(source, "boundary"), "w");
  try { await file.truncate(size); }
  finally { await file.close(); }
  const seenSizes: number[] = [];
  f.access.writeStream = async (entries) => {
    for await (const entry of entries) {
      if (entry.type === "file") seenSizes.push(entry.size);
    }
  };
  const migration = migrateLegacyBrowserProfilesToScreen(f.runtime, f.target, f.access);
  if (size === 1024 * 1024 * 1024) {
    await expect(migration).resolves.toBe("rescued");
    expect(seenSizes).toEqual([size]);
    expect(await f.access.stat(".browser-profiles-migration-pending")).toBeNull();
  } else {
    await expect(migration).rejects.toThrow("1 GiB");
    expect(seenSizes).toEqual([]);
    expect(await f.access.stat(".browser-profiles-migration-pending")).not.toBeNull();
  }
});

it.each(["rescue", "migration"])("excludes browser caches but preserves login data during %s", async (operation) => {
  const f = await fixture(1);
  const source = operation === "migration" ? join(f.workspace, ".browser-profiles/chromium")
    : join(f.root, "container/home/crybot-s1/.config/chromium");
  const caches = ["Default/Cache", "Default/Code Cache", "Default/GPUCache", "Default/Service Worker/CacheStorage",
    "ShaderCache", "GrShaderCache", "DawnCache", "component_crx_cache"];
  const kept = ["Default/Cookies", "Default/Login Data", "Default/Local Storage/state", "Default/IndexedDB/state", "Default/Service Worker/Database/state"];
  for (const path of caches) {
    await mkdir(join(source, path), { recursive: true });
    await writeFile(join(source, path, "discard"), "cache");
  }
  for (const path of kept) {
    await mkdir(join(source, path, ".."), { recursive: true });
    await writeFile(join(source, path), path);
  }
  const result = operation === "migration" ? await migrateLegacyBrowserProfilesToScreen(f.runtime, f.target, f.access)
    : await rescueScreenProfile(f.runtime, f.target, ".config/chromium", ".browser-profiles/chromium", f.access);
  expect(result).toBe("rescued");
  const destination = join(f.screenDir, ".browser-profiles/chromium");
  for (const path of caches) await expect(stat(join(destination, path))).rejects.toMatchObject({ code: "ENOENT" });
  for (const path of kept) expect(await readFile(join(destination, path), "utf8")).toBe(path);
});

it("keeps the migration pending and refuses symlink parents without touching the target", async () => {
  const f = await fixture(1);
  await mkdir(join(f.workspace, ".browser-profiles/chromium"), { recursive: true });
  await writeFile(join(f.workspace, ".browser-profiles/chromium/Cookies"), "login");
  const outside = join(f.root, "outside");
  await mkdir(outside);
  await mkdir(join(f.screenDir, ".browser-profiles"));
  await writeFile(join(f.screenDir, ".browser-profiles-migration-pending"), "");
  await symlink(outside, join(f.screenDir, ".browser-profiles/chromium"));
  await expect(migrateLegacyBrowserProfilesToScreen(f.runtime, f.target, f.access)).rejects.toThrow();
  expect(await readdir(outside)).toEqual([]);
  expect(await f.access.stat(".browser-profiles-migration-pending")).not.toBeNull();
});

it("does not read another screen when a source parent is a symlink", async () => {
  const f = await fixture(2);
  const other = join(f.root, "container/home/crybot-s1/.config");
  await mkdir(join(other, "google-chrome"), { recursive: true });
  await writeFile(join(other, "google-chrome", "Cookies"), "screen one secret");
  await mkdir(join(f.root, "container/home/crybot-s2"), { recursive: true });
  await symlink("/home/crybot-s1/.config", join(f.root, "container/home/crybot-s2/.config"));

  expect(await rescueScreenProfile(f.runtime, f.target, ".config/google-chrome", ".browser-profiles/google-chrome", f.access)).toBe("none");
  expect(await f.access.stat(".browser-profiles/google-chrome")).toBeNull();
  expect(await f.access.stat(".browser-profiles/google-chrome.rescue-pending")).toBeNull();
  const calls = await f.calls();
  expect(calls.some((call) => call[0] === "cp")).toBe(false);
  const pack = calls.find((call) => call.some((value) => value.includes("tar -C")));
  expect(pack?.slice(0, 4)).toEqual(["exec", "-i", "-u", "crybot-s2"]);
});

it.each([keepFirefoxProfileBeforeRemove, keepInstalledAppsBeforeRemove])("ignores missing and unmanaged screen containers", async (keep) => {
  const f = await fixture();
  for (const status of [
    { runtime: "docker", container: "missing", managed: true, imageMatches: false },
    { runtime: "docker", container: "stopped", managed: false, imageMatches: false },
    { runtime: "docker", container: "running", managed: false, imageMatches: false },
  ] as const) {
    expect(await keep(f.target, status, async () => { throw new Error("must not stop"); }, f.access)).toBe("none");
  }
  expect(await f.calls()).toEqual([]);
});

it("leaves migration pending when the profile exceeds the 1 GiB limit", async () => {
  const f = await fixture(1);
  const source = join(f.workspace, ".browser-profiles");
  await mkdir(source);
  const file = await open(join(source, "oversize"), "w");
  try { await file.truncate(1024 * 1024 * 1024 + 1); }
  finally { await file.close(); }
  await expect(migrateLegacyBrowserProfilesToScreen(f.runtime, f.target, f.access)).rejects.toThrow("1 GiB");
  expect(await f.access.stat(".browser-profiles-migration-pending")).not.toBeNull();
  expect(await f.access.stat(".browser-profiles/oversize")).toBeNull();
});

it("rejects incomplete streams without replacing the existing file", async () => {
  const f = await fixture();
  await f.access.writeFile("existing", Buffer.from("original"));
  await expect(f.access.writeStream!((async function* () {
    yield { path: "existing", type: "file" as const, size: 10, mode: 0o600, data: (async function* () { yield Buffer.from("short"); })() };
  })())).rejects.toThrow();
  expect(await f.access.readFile("existing", 100)).toEqual(Buffer.from("original"));
  expect(await readdir(f.screenDir)).toEqual(["existing"]);
});

it("refuses to write through a link created earlier in the same stream", async () => {
  const f = await fixture();
  const outside = join(f.root, "outside");
  await mkdir(outside);
  await expect(f.access.writeMany!([
    { path: "escape", type: "link", link: outside },
    { path: "escape/file", type: "file", data: Buffer.from("no"), mode: 0o600 },
  ])).rejects.toThrow();
  expect(await readdir(outside)).toEqual([]);
});

it.each([
  ["dotdot", "unsafe path"],
  ["symlink", "symlink escape"],
  ["symlink-case", "symlink escape"],
  ["symlink-unicode", "symlink escape"],
  ["symlink-case-same", "symlink escape"],
  ["symlink-unicode-same", "symlink escape"],
  ["drive-absolute", "unsafe path"],
  ["drive-relative", "unsafe path"],
  ["segment-colon", "unsafe path"],
  ["symlink-colon", "unsafe symlink"],
  ["symlink-slash", "unsafe symlink"],
  ["symlink-double-slash", "unsafe symlink"],
  ["symlink-dotdot", "unsafe symlink"],
  ["root-file", "unsafe path"],
  ["root-link", "unsafe path"],
  ["fifo", "unsupported entry type"],
  ["hardlink", "unsupported entry type"],
  ["absolute", "unsafe path"],
  ["backslash", "unsafe path"],
  ["symlink-backslash", "unsafe symlink"],
  ["device", "unsupported entry type"],
] as const)("rejects hostile %s archives and keeps rescue pending", async (kind, message) => {
  const f = await hostileArchiveFixture(kind);
  const destination = ".browser-profiles/chromium";
  await expect(rescueScreenProfile(f.runtime, f.target, ".config/chromium", destination, f.access)).rejects.toThrow(message);
  expect(await f.access.stat(`${destination}.rescue-pending`)).not.toBeNull();
  expect(await f.access.stat(destination)).toBeNull();
  expect(await readdir(f.outside)).toEqual(["source"]);
  const staging = join(f.root, "staging");
  await expect(extractScreenProfile(f.archivePath, join(staging, "profile"))).rejects.toThrow(message);
  expect(await readdir(staging)).toEqual(["profile"]);
  expect(await readdir(f.outside)).toEqual(["source"]);
});

it.each(["../share/app/run", "/opt/app/run"])("preserves the symlink target %s during application rescue", async (target) => {
  const f = await fixture(1);
  const source = join(f.root, "container/home/crybot-s1/.local");
  await mkdir(join(source, "bin"), { recursive: true });
  await mkdir(join(source, "share/app"), { recursive: true });
  await writeFile(join(source, "share/app/run"), "application");
  await symlink(target, join(source, "bin/app"));
  await expect(rescueScreenProfile(f.runtime, f.target, ".local", ".installed-apps/local", f.access)).resolves.toBe("rescued");
  expect(await readlink(join(f.screenDir, ".installed-apps/local/bin/app"))).toBe(target);
  expect(await readFile(join(f.screenDir, ".installed-apps/local/share/app/run"), "utf8")).toBe("application");
});
