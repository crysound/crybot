import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, open, readdir, readlink, rm, stat as statFile } from "node:fs/promises";
import { constants, type Stats } from "node:fs";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadEntry } from "tar";
import { screenUser, screenWorkdir, type LocalVmTarget } from "./container-targets.ts";
import { augmentedPath, resolveCliSpawn } from "./env-path.ts";
import { screenIdentityArgs } from "./container-computer-screens.ts";
import { screenFileAccess, removeScreenFile, type ScreenStreamEntry, type ScreenFileAccess } from "./screen-files.ts";

const PROFILE_BYTES_MAX = 1024 * 1024 * 1024;
// Tar writes 512-byte headers and block padding for every entry; this bounds that metadata overhead.
const PROFILE_ARCHIVE_OVERHEAD_MAX = 16 * 1024 * 1024;
const BROWSER_CACHE_DIRS = new Set(["Cache", "Code Cache", "GPUCache", "ShaderCache", "GrShaderCache", "DawnCache", "component_crx_cache", "cache2", "startupCache"]);
const BROWSER_LOCKS = new Set(["SingletonLock", "SingletonSocket", "SingletonCookie", ".parentlock", "lock"]);

export interface ScreenProfileLimits {
  maxBytes?: number;
  archiveBytesMax?: number;
}

function profileLimits(limits?: ScreenProfileLimits) {
  const maxBytes = limits?.maxBytes ?? PROFILE_BYTES_MAX;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error("Invalid screen profile preservation limit.");
  const archiveBytesMax = limits?.archiveBytesMax ?? maxBytes + PROFILE_ARCHIVE_OVERHEAD_MAX;
  if (!Number.isSafeInteger(archiveBytesMax) || archiveBytesMax < maxBytes) throw new Error("Invalid screen profile archive limit.");
  return { maxBytes, archiveBytesMax };
}

function profileLimitError(maxBytes: number): Error {
  return new Error(maxBytes === PROFILE_BYTES_MAX
    ? "Screen profile exceeds the 1 GiB preservation limit."
    : "Screen profile exceeds the configured preservation limit.");
}

async function makeProfileStagingRemovable(path: string): Promise<void> {
  const info = await lstat(path).catch(() => undefined);
  if (!info?.isDirectory()) return;
  await chmod(path, 0o700).catch(() => undefined);
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) await makeProfileStagingRemovable(join(path, entry.name));
  }
}

async function removeProfileStaging(path: string): Promise<void> {
  await makeProfileStagingRemovable(path).catch(() => undefined);
  await rm(path, { recursive: true, force: true });
}

export async function rescueScreenProfile(runtime: string, target: LocalVmTarget & { screen: number }, source: string, durable: string,
  access: ScreenFileAccess = screenFileAccess(runtime, target), limits?: ScreenProfileLimits): Promise<"rescued" | "kept" | "none"> {
  const destination = `${screenWorkdir(target.screen)}/${durable}`;
  const pending = `${destination}.rescue-pending`;
  if (!await access.stat(pending) && await access.stat(destination) && (await access.list(destination)).length) return "kept";
  const staging = await mkdtemp(join(tmpdir(), "crybot-screen-profile-"));
  const archive = join(staging, "profile.tar");
  const copy = join(staging, "profile");
  try {
    const packaged = await packageScreenProfile(runtime, target, source, archive, limits);
    if (packaged !== "ok") return "none";
    await access.writeFile(pending, Buffer.alloc(0), 0o600);
    await extractScreenProfile(archive, copy, limits);
    await transferProfile(copy, destination, access, durable.startsWith(".browser-profiles/"));
    await removeScreenFile(access, pending);
    return "rescued";
  } finally { await removeProfileStaging(staging); }
}

const PROFILE_PACK_SCRIPT = `
set -eu
home=$1
source=$2
case "$source" in ""|/*|*..*) exit 42;; esac
home_real=$(realpath -- "$home") || exit 42
[ "$home_real" = "$home" ] || exit 42
home=$home_real
current=$home
old_ifs=$IFS
IFS=/
set -- $source
for part do
  [ -n "$part" ] || continue
  current=$current/$part
  [ ! -L "$current" ] || exit 42
done
IFS=$old_ifs
resolved=$(realpath -- "$current") || exit 44
case "$resolved" in "$home"/*) ;; *) exit 42;; esac
[ -d "$resolved" ] || exit 44
exec tar -C "$resolved" --hard-dereference -cf - -- .
`;

async function packageScreenProfile(runtime: string, target: LocalVmTarget & { screen: number }, source: string, archive: string,
  limits?: ScreenProfileLimits): Promise<"ok" | "missing" | "unsafe"> {
  const { maxBytes, archiveBytesMax } = profileLimits(limits);
  const home = `/home/${screenUser(target.screen)}`;
  const args = screenIdentityArgs(target, ["sh", "-c", PROFILE_PACK_SCRIPT, "crybot-screen-profile", home, source], { interactive: true });
  const resolved = resolveCliSpawn(runtime, args);
  const child = spawn(resolved.command, resolved.args, { env: { ...process.env, PATH: augmentedPath() }, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => { if (stderr.length < 4096) stderr += chunk.toString(); });
  const output = child.stdout;
  if (!output) throw new Error("Could not preserve the screen's browser or application files.");
  let bytes = 0;
  const countBytes = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > archiveBytesMax) callback(profileLimitError(maxBytes));
      else callback(null, chunk);
    },
  });
  const close = once(child, "close").then(([code, signal]) => ({ code: typeof code === "number" ? code : -1, signal }));
  const timeout = setTimeout(() => child.kill("SIGKILL"), 5 * 60_000);
  try {
    const [result] = await Promise.all([close, pipeline(output, countBytes, createWriteStream(archive, { mode: 0o600 }))]);
    if (result.code === 0) return "ok";
    if (result.code === 44) return "missing";
    if (result.code === 42) return "unsafe";
    throw new Error(`Could not preserve the screen's browser or application files.${stderr ? ` ${stderr.trim().slice(0, 300)}` : ""}`);
  } catch (error) {
    if (!child.killed) child.kill("SIGKILL");
    await close.catch(() => undefined);
    await rm(archive, { force: true }).catch(() => undefined);
    if (error instanceof Error && error.message.startsWith("Could not preserve")) throw error;
    throw new Error("Could not preserve the screen's browser or application files.");
  } finally { clearTimeout(timeout); }
}

export async function extractScreenProfile(archive: string, destination: string, limits?: ScreenProfileLimits): Promise<void> {
  const { maxBytes, archiveBytesMax } = profileLimits(limits);
  const archiveInfo = await statFile(archive);
  if (!archiveInfo.isFile() || archiveInfo.size > archiveBytesMax) throw profileLimitError(maxBytes);
  const { extract } = await import("tar");
  const links = new Set<string>();
  let fileBytes = 0;
  let firstError: Error | undefined;
  const reject = (message: string) => { firstError ??= new Error(message); return false; };
  const extractor = extract({
    cwd: destination,
    strict: true,
    preservePaths: true,
    filter(path, entry: Stats | ReadEntry) {
      if (path.includes("\\") || path.includes("\0") || /^[A-Za-z]:/.test(path)) return reject("Screen profile archive contains an unsafe path.");
      const normalized = posix.normalize(path).replace(/\/+$/, "");
      const rawSegments = path.split("/");
      const segments = normalized.split("/");
      if (!path || posix.isAbsolute(path) || rawSegments.includes("..") || segments.includes("..")
        || rawSegments.some((segment) => segment && !/^[^\\/:]+$/.test(segment))) {
        return reject("Screen profile archive contains an unsafe path.");
      }
      const comparisonKey = normalized.normalize("NFC").toLowerCase();
      if ([...links].some((link) => comparisonKey === link || comparisonKey.startsWith(`${link}/`))) {
        return reject("Screen profile archive contains a symlink escape.");
      }
      const type = "type" in entry ? entry.type : entry.isSymbolicLink() ? "SymbolicLink"
        : entry.isDirectory() ? "Directory" : entry.isFile() ? "File" : undefined;
      if (type !== "File" && type !== "Directory" && type !== "SymbolicLink") {
        return reject("Screen profile archive contains an unsupported entry type.");
      }
      if (type === "File") {
        const size = "size" in entry ? entry.size : undefined;
        if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0 || size > maxBytes - fileBytes) {
          return reject(profileLimitError(maxBytes).message);
        }
        fileBytes += size;
      }
      if ((!normalized || normalized === ".") && type !== "Directory") {
        return reject("Screen profile archive contains an unsafe path.");
      }
      if (type === "SymbolicLink") {
        const target = "linkpath" in entry ? entry.linkpath : undefined;
        if (path.endsWith("/") || !target || target.includes("\\") || target.includes(":")) return reject("Screen profile archive contains an unsafe symlink.");
        const targetNormalized = posix.normalize(posix.join(posix.dirname(normalized), target));
        if (!posix.isAbsolute(target) && (targetNormalized === ".." || targetNormalized.startsWith("../"))) {
          return reject("Screen profile archive contains an unsafe symlink.");
        }
        links.add(comparisonKey);
      }
      return true;
    },
  });
  await mkdir(destination, { recursive: true, mode: 0o700 });
  await pipeline(createReadStream(archive), extractor);
  if (firstError) throw firstError;
}

export async function rescueScreenBrowserProfiles(runtime: string, target: LocalVmTarget & { screen: number }, access?: ScreenFileAccess): Promise<"rescued" | "kept" | "none"> {
  const results: Array<"rescued" | "kept" | "none"> = [];
  for (const [source, durable] of [[".mozilla", "mozilla"], [".config/google-chrome", "google-chrome"], [".config/chromium", "chromium"]] as const) {
    results.push(await rescueScreenProfile(runtime, target, source, `.browser-profiles/${durable}`, access));
  }
  return results.includes("rescued") ? "rescued" : results.includes("kept") ? "kept" : "none";
}

export async function migrateLegacyBrowserProfilesToScreen(runtime: string, target: LocalVmTarget & { screen: number },
  access: ScreenFileAccess = screenFileAccess(runtime, target)): Promise<"rescued" | "kept" | "none"> {
  if (target.screen !== 1) return "none";
  const legacy = screenFileAccess(runtime, { ...target, key: "shared", screen: undefined });
  const source = ".browser-profiles", pending = ".browser-profiles-migration-pending";
  if (!await legacy.stat(source)) return "none";
  if (!await access.stat(pending) && await access.stat(source) && (await access.list(source)).length) return "kept";
  await access.writeFile(pending, Buffer.alloc(0));
  const host = legacy.guestToHost(`/home/cua/workspace/${source}`);
  if (!host) throw new Error("Legacy browser profile folder is unavailable.");
  await transferProfile(host, `${screenWorkdir(target.screen)}/${source}`, access, true);
  await removeScreenFile(access, pending);
  return "rescued";
}

async function transferProfile(folder: string, destination: string, access: ScreenFileAccess, browser: boolean): Promise<void> {
  if (!access.writeStream) throw new Error("Screen profile preservation requires streaming file access.");
  let bytes = 0, entries = 0;
  async function* walk(folder: string, guest: string, depth: number): AsyncGenerator<ScreenStreamEntry> {
    if (depth > 32) throw new Error("Screen profile folders are nested too deeply.");
    if (!(await lstat(folder)).isDirectory()) throw new Error("Screen profile source is not a directory.");
    yield { path: guest, type: "directory" };
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (browser && (BROWSER_LOCKS.has(entry.name) || BROWSER_CACHE_DIRS.has(entry.name)
        || entry.name === "CacheStorage" && guest.endsWith("/Service Worker"))) continue;
      if (++entries > 100000) throw new Error("Screen profile has too many entries.");
      const file = join(folder, entry.name), path = `${guest}/${entry.name}`;
      const info = await lstat(file);
      if (info.isSymbolicLink()) yield { path, type: "link", link: await readlink(file) };
      else if (info.isDirectory()) yield* walk(file, path, depth + 1);
      else if (info.isFile()) {
        const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const current = await handle.stat();
          if (!current.isFile()) throw new Error("Screen profile source is not a file.");
          bytes += current.size;
          if (bytes > PROFILE_BYTES_MAX) throw new Error("Screen profile exceeds the 1 GiB preservation limit.");
          yield { path, type: "file", data: handle.createReadStream({ autoClose: false, highWaterMark: 1024 * 1024 }),
            size: current.size, mode: (current.mode & 0o777) | 0o400 };
        } finally { await handle.close(); }
      }
    }
  }
  await access.writeStream(walk(folder, destination, 0));
}
