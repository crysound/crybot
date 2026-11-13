import type { IncomingMessage, ServerResponse } from "node:http";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const types: Record<string, string> = {
  ".yml": "text/yaml", ".zip": "application/zip", ".dmg": "application/x-apple-diskimage",
  ".exe": "application/vnd.microsoft.portable-executable", ".blockmap": "application/octet-stream",
  ".apk": "application/vnd.android.package-archive",
};
const inside = (root: string, file: string) => {
  const path = relative(root, file);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
};

export async function desktopUpdateFiles(req: IncomingMessage, res: ServerResponse, directory: string | undefined): Promise<boolean> {
  const raw = (req.url ?? "").split("?")[0];
  if (raw !== "/desktop-updates" && !raw.startsWith("/desktop-updates/")) return false;
  const missing = () => { res.writeHead(404).end(); return true; };
  if (!directory) return missing();
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { allow: "GET, HEAD" }).end(); return true; }
  let file;
  try {
    const name = decodeURIComponent(raw.slice("/desktop-updates/".length));
    if (!name || name.includes("\\") || name.includes("\0") || name.split("/").some(part => part === ".." || part === ".")) return missing();
    const root = await realpath(directory);
    const target = await realpath(resolve(root, name));
    if (!inside(root, target)) return missing();
    file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = await file.stat();
    if (!stat.isFile()) { await file.close(); return missing(); }
    // On Linux, verify the opened inode's path too, so swapping a parent symlink cannot escape the release directory.
    if (process.platform === "linux" && !inside(root, await realpath(`/proc/self/fd/${file.fd}`))) { await file.close(); return missing(); }
    const extension = extname(target).toLowerCase();
    res.setHeader("content-type", types[extension] ?? "application/octet-stream");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("cache-control", extension === ".yml" ? "no-store" : "public, max-age=3600");
    res.setHeader("accept-ranges", "bytes");
    let start = 0, end = stat.size - 1, status = 200;
    const range = req.headers.range;
    if (range && !req.headers["if-range"]) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match && (match[1] || match[2])) {
        start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
          await file.close(); res.writeHead(416, { "content-range": `bytes */${stat.size}` }).end(); return true;
        }
        status = 206;
        res.setHeader("content-range", `bytes ${start}-${end}/${stat.size}`);
      }
    }
    res.setHeader("content-length", Math.max(0, end - start + 1));
    res.writeHead(status);
    if (req.method === "HEAD" || stat.size === 0) { await file.close(); res.end(); return true; }
    const stream = file.createReadStream({ start, end });
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
    return true;
  } catch {
    await file?.close().catch(() => {});
    if (res.headersSent) res.destroy(); else missing();
    return true;
  }
}
