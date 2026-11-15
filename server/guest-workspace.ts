import { join, posix } from "node:path";

/** Maps a guest workspace path onto its bind-mounted host directory; anything outside it, `..` escapes included, is null. */
export function guestWorkspaceToHost(input: string, guestRoot: string, hostRoot: string): string | null {
  let value = input.trim();
  if (/^file:\/\//i.test(value)) {
    try {
      value = decodeURIComponent(new URL(value).pathname);
    } catch {
      return null;
    }
  }
  if (!value.startsWith("/")) return null;
  const normalized = posix.normalize(value);
  const relative = posix.relative(guestRoot, normalized);
  if (!relative || relative === ".." || relative.startsWith("../") || posix.isAbsolute(relative)) return null;
  return join(hostRoot, ...relative.split("/"));
}

