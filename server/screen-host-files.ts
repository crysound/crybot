import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { screenFilePath, screenHostWorkspace, type ScreenFileAccess } from "./screen-files.ts";

const within = (root: string, path: string) => {
  const suffix = relative(root, path);
  return suffix === "" || suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
};

export async function resolveScreenOrHost(requested: string, roots: readonly string[], access?: ScreenFileAccess, vmWorkspace?: string | null): Promise<{ path: string; access?: ScreenFileAccess; roots: readonly string[] }> {
  if (!access) return { path: requested, roots, access: undefined };
  let path = requested.trim();
  if (/^file:\/\//i.test(path)) {
    try { path = decodeURIComponent(new URL(path).pathname); } catch { return { path: requested, roots, access }; }
  }
  if (path.split(/[\\/]/).includes("..")) return { path: requested, roots, access };
  try {
    const guest = screenFilePath(access, path);
    if (await access.stat(guest)) return { path: guest, roots, access };
  } catch { /* Only explicitly allowed host roots can supply a fallback. */ }
  const excluded = await Promise.all([screenHostWorkspace(access), vmWorkspace, "/home/cua/workspace"].filter((p): p is string => Boolean(p))
    .map(async (p) => await realpath(p).catch(() => resolve(p))));
  const allowed = (await Promise.all(roots.map((root) => realpath(root).catch(() => null))))
    .filter((root): root is string => root !== null && !excluded.some((vm) => within(vm, root) || within(root, vm)));
  const candidates = isAbsolute(path) ? [path] : allowed.map((root) => resolve(root, path));
  for (const candidate of candidates) {
    const canonical = await realpath(candidate).catch(() => null);
    if (canonical && allowed.some((root) => within(root, canonical)) && !excluded.some((vm) => within(vm, canonical))) {
      return { path: canonical, roots: allowed, access: undefined };
    }
  }
  return { path: requested, roots, access };
}
