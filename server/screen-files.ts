import { execFile } from "node:child_process";
import { constants, lstatSync } from "node:fs";
import { mkdir, open, readdir, readlink, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { guestWorkspaceToHost } from "./guest-workspace.ts";
import { isScreenTarget, screenWorkdir, VM_WORKSPACE_GUEST, type LocalVmTarget } from "./container-targets.ts";
import { augmentedPath, resolveCliSpawn } from "./env-path.ts";
import { screenIdentityArgs } from "./container-computer-screens.ts";
import { SCREEN_FILES_SCRIPT } from "./screen-files-script.ts";

export interface ScreenFileAccess {
  guestToHost(guestPath: string): string | null;
  readFile(guestPath: string, maxBytes: number): Promise<Buffer>;
  writeFile(guestPath: string, data: Buffer, mode?: number): Promise<void>;
  stat(guestPath: string): Promise<{ size: number; isFile: boolean; mtimeMs?: number } | null>;
  tree?(guestPath: string): Promise<ScreenFileEntry[]>;
  readMany?(paths: string[], maxBytes: number, maxFileBytes: number): Promise<Buffer[]>;
  writeMany?(entries: ScreenWriteEntry[]): Promise<void>;
  writeStream?(entries: AsyncIterable<ScreenStreamEntry>): Promise<void>;
  list(guestDir: string): Promise<string[]>;
}

export interface ScreenFileEntry {
  path: string;
  type: "file" | "directory" | "link" | "other";
  size: number;
  mtimeMs: number;
}
export type ScreenWriteEntry = { path: string } & (
  { type: "file"; data: Buffer; mode: number } | { type: "link"; link: string } | { type: "directory" }
);
export type ScreenStreamEntry = { path: string } & (
  { type: "file"; data: AsyncIterable<Buffer>; size: number; mode: number } | { type: "link"; link: string } | { type: "directory" }
);

const workspaces = new WeakMap<ScreenFileAccess, string>();
export const screenHostWorkspace = (access: ScreenFileAccess): string | undefined => workspaces.get(access);

const removers = new WeakMap<ScreenFileAccess, (path: string) => Promise<void>>();
export function removeScreenFile(access: ScreenFileAccess, path: string): Promise<void> {
  const remove = removers.get(access);
  if (!remove) return Promise.reject(new Error("File access does not support removal."));
  return remove(path);
}

const roots = new WeakMap<ScreenFileAccess, string>();
export const screenFileRoot = (access: ScreenFileAccess): string => roots.get(access) ?? VM_WORKSPACE_GUEST;
const refused = () => Object.assign(new Error("Path is outside the screen workspace or is not a plain file or folder."), { status: 403, code: "outside_workspace" });

export function screenFilePath(access: ScreenFileAccess, input: string): string {
  let path = input.trim();
  if (/^file:\/\//i.test(path)) {
    try { path = decodeURIComponent(new URL(path).pathname); } catch { throw refused(); }
  }
  const root = screenFileRoot(access);
  if (!path || path.includes("\0") || path.split("/").includes("..")) throw refused();
  const screen = /^\/home\/cua\/workspace\/screens\/s([1-4])$/.exec(root)?.[1];
  const alias = screen ? `/home/crybot-s${screen}/workspace` : null;
  if (alias && (path === alias || path.startsWith(`${alias}/`))) path = root + path.slice(alias.length);
  const absolute = posix.resolve(root, path);
  if (absolute !== root && !absolute.startsWith(`${root}/`)) throw refused();
  return absolute;
}

export function screenFileAccess(runtime: string, target: LocalVmTarget): ScreenFileAccess {
  const screen = isScreenTarget(target) ? target.screen : undefined;
  if (target.screen !== undefined && screen === undefined) throw refused();
  const root = screen === undefined ? VM_WORKSPACE_GUEST : screenWorkdir(screen);
  const hostRoot = screen === undefined ? target.workspaceDir : join(target.workspaceDir, "screens", `s${screen}`);
  const hostPath = (path: string) => join(hostRoot, ...posix.relative(root, screenFilePath(access, path)).split("/"));
  const checkedHost = async (path: string) => {
    const host = await realpath(hostPath(path));
    const base = await realpath(hostRoot);
    const suffix = relative(base, host);
    if (suffix === ".." || suffix.startsWith(`..${sep}`) || !host.startsWith(base + sep) && host !== base) throw refused();
    return host;
  };
  const execute = (action: string, path: string, argument = 0, data?: Buffer | AsyncIterable<Buffer>): Promise<Buffer> => {
    const guest = screenFilePath(access, path);
    const spawn = resolveCliSpawn(runtime, screenIdentityArgs(target, ["python3", "-I", "-c", SCREEN_FILES_SCRIPT, root, posix.relative(root, guest), action, String(argument)], { interactive: true }));
    return new Promise((resolve, reject) => {
      let input: Promise<void> = Promise.resolve();
      let inputFailure: unknown;
      const child = execFile(spawn.command, spawn.args, { encoding: "buffer", timeout: action === "writeStream" ? 5 * 60_000 : 30_000,
        maxBuffer: action === "read" ? Math.max(argument, 1024) : action === "readMany" ? Math.ceil(argument * 4 / 3) + 4 * 1024 * 1024 : 32 * 1024 * 1024,
        env: { ...process.env, PATH: augmentedPath() } }, (error, stdout) => {
        if (!error) { void input.then(() => resolve(stdout), reject); return; }
        reject(inputFailure ?? Object.assign(new Error(error.code === 43 ? "File exceeds size limit." : error.code === 44 ? "File not found." : "Screen file operation failed."),
          { status: error.code === 43 ? 413 : error.code === 44 ? 404 : 403 }));
      });
      if (child.stdin && data && !Buffer.isBuffer(data)) {
        input = pipeline(Readable.from(data), child.stdin);
        void input.catch((error: unknown) => { inputFailure = error; });
      } else {
        child.stdin?.on("error", () => {});
        child.stdin?.end(data);
      }
    });
  };
  const access: ScreenFileAccess = {
    guestToHost(path) {
      if (screen === undefined) return guestWorkspaceToHost(path, root, hostRoot);
      try {
        const host = hostPath(path);
        const suffix = relative(target.workspaceDir, host);
        let current = target.workspaceDir;
        if (lstatSync(current).isSymbolicLink()) return null;
        for (const part of suffix.split(sep)) {
          current = join(current, part);
          try { if (lstatSync(current).isSymbolicLink()) return null; }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return null; }
        }
        return host;
      } catch { return null; }
    },
    async readFile(path, maxBytes) {
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError("invalid file size limit");
      if (screen !== undefined) return execute("read", path, maxBytes);
      const file = await open(await checkedHost(path), constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const info = await file.stat();
        if (!info.isFile()) throw refused();
        if (info.size > maxBytes) throw Object.assign(new Error("File exceeds size limit."), { status: 413 });
        const kernel = await readlink(`/proc/self/fd/${file.fd}`).catch(() => null);
        const base = await realpath(hostRoot);
        if (kernel !== null) {
          if (!kernel.startsWith(base + sep)) throw refused();
        } else {
          const current = await stat(await checkedHost(path));
          if (current.dev !== info.dev || current.ino !== info.ino) throw refused();
        }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of file.createReadStream({ autoClose: false })) {
          size += chunk.length;
          if (size > maxBytes) throw Object.assign(new Error("File exceeds size limit."), { status: 413 });
          chunks.push(chunk);
        }
        return Buffer.concat(chunks, size);
      } finally { await file.close(); }
    },
    async writeFile(path, data, mode = 0o600) {
      if (!Number.isInteger(mode) || mode < 0 || mode > 0o777 || !(mode & 0o400)) throw new RangeError("invalid file mode");
      if (screen !== undefined) { await execute("write", path, mode, data); return; }
      const host = hostPath(path);
      await mkdir(dirname(host), { recursive: true, mode: 0o700 });
      await checkedHost(posix.dirname(screenFilePath(access, path)));
      await writeFile(host, data, { mode, flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW });
    },
    async stat(path) {
      if (screen !== undefined) return JSON.parse((await execute("stat", path)).toString());
      try {
        const info = await stat(await checkedHost(path));
        return { size: info.size, isFile: info.isFile() };
      } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    },
    async list(path) {
      return screen !== undefined ? JSON.parse((await execute("list", path)).toString()) : readdir(await checkedHost(path));
    },
  };
  if (screen !== undefined) {
    access.tree = async (path) => JSON.parse((await execute("tree", path)).toString());
    access.readMany = async (paths, maxBytes, maxFileBytes) => {
      if (![maxBytes, maxFileBytes].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new RangeError("invalid file size limit");
      const entries = paths.map((path) => ({ path: posix.relative(root, screenFilePath(access, path)) }));
      const result: string[] = JSON.parse((await execute("readMany", root, maxBytes, Buffer.from(JSON.stringify({ entries, maxBytes, maxFileBytes })))).toString());
      return result.map((data) => Buffer.from(data, "base64"));
    };
    const writeStream = async (entries: AsyncIterable<ScreenStreamEntry>) => {
      async function* encode(): AsyncGenerator<Buffer> {
        for await (const entry of entries) {
          const path = posix.relative(root, screenFilePath(access, entry.path));
          if (entry.type !== "file") { yield Buffer.from(JSON.stringify({ ...entry, path }) + "\n"); continue; }
          const { mode, size } = entry;
          if (!Number.isInteger(mode) || mode < 0 || mode > 0o777 || !(mode & 0o400)) throw new RangeError("invalid file mode");
          if (!Number.isSafeInteger(size) || size < 0) throw new RangeError("invalid file size");
          yield Buffer.from(JSON.stringify({ path, type: "file", mode, size }) + "\n");
          let remaining = size;
          for await (const chunk of entry.data) {
            remaining -= chunk.length;
            if (remaining < 0) throw new Error("Screen source file changed size.");
            yield chunk;
          }
          if (remaining !== 0) throw new Error("Screen source file changed size.");
        }
      }
      await execute("writeStream", root, 0, encode());
    };
    access.writeStream = writeStream;
    access.writeMany = async (files) => writeStream((async function* () {
      for (const entry of files) {
        if (entry.type !== "file") { yield entry; continue; }
        yield { ...entry, size: entry.data.length, data: (async function* () { yield entry.data; })() };
      }
    })());
  }
  workspaces.set(access, target.workspaceDir);
  roots.set(access, root);
  removers.set(access, async (path) => {
    if (screen !== undefined) { await execute("remove", path); return; }
    await unlink(await checkedHost(path));
  });
  return access;
}

export async function snapshotScreenFiles(access: ScreenFileAccess, path: string,
  select: (entry: ScreenFileEntry) => boolean, limits: { bytes: number; files: number; fileBytes: number }): Promise<ScreenFileAccess> {
  if (!access.tree || !access.readMany) return access;
  const base = screenFilePath(access, path);
  const entries = await access.tree(base);
  const selected = entries.filter((entry) => entry.type === "file" && select(entry));
  if (selected.length > limits.files || selected.some((entry) => entry.size > limits.fileBytes)
    || selected.reduce((total, entry) => total + entry.size, 0) > limits.bytes) {
    throw Object.assign(new Error("Files exceed the size or count limit."), { status: 413 });
  }
  const buffers = !selected.length ? [] : await access.readMany(selected.map((entry) => posix.join(base, entry.path)), limits.bytes, limits.fileBytes);
  const files = new Map(selected.map((entry, i) => [posix.join(base, entry.path), buffers[i]]));
  const byPath = new Map(entries.map((entry) => [posix.join(base, entry.path), entry]));
  const snapshot: ScreenFileAccess = {
    ...access,
    stat: async (path) => {
      const entry = byPath.get(screenFilePath(access, path));
      if (!entry || entry.type === "link" || entry.type === "other") return null;
      return { size: entry.size, isFile: entry.type === "file", mtimeMs: entry.mtimeMs };
    },
    list: async (path) => {
      const parent = screenFilePath(access, path);
      return [...byPath.keys()].filter((key) => key !== base && posix.dirname(key) === parent).map((key) => posix.basename(key));
    },
    readFile: async (path, maxBytes) => {
      const data = files.get(screenFilePath(access, path));
      if (!data) throw refused();
      if (data.length > maxBytes) throw Object.assign(new Error("File exceeds size limit."), { status: 413 });
      return data;
    },
  };
  roots.set(snapshot, screenFileRoot(access));
  return snapshot;
}
