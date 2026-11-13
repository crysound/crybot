import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { optionalFeedUrl } from "./optional-feed-url.ts";

const CACHE_MS = 60 * 60_000;
const STALE_MS = 24 * 60 * 60_000;

export type InstallKind = "desktop" | "managed" | "docker" | "podman" | "npm" | "git" | "unknown";

export type UpdateChannel = "stable" | "newest";

export function updateChannel(env: NodeJS.ProcessEnv = process.env): UpdateChannel {
  return env.CRYBOT_UPDATE_CHANNEL?.trim().toLowerCase() === "newest" ? "newest" : "stable";
}

export function updateCommand(install: InstallKind, target?: { version: string; stable: boolean }): { command: string; restart: boolean } | undefined {
  switch (install) {
    case "docker": return { command: target && !target.stable ? `git pull && ./update.sh --version ${target.version}` : "git pull && ./update.sh", restart: false };
    case "podman": return { command: "git pull && cd deploy/podman && PODMAN_COMPOSE_PROVIDER=podman-compose podman compose --env-file .env -f compose.yaml up -d --build", restart: false };
    case "npm": return undefined;
    case "git": return { command: "git pull && pnpm install", restart: true };
    default: return undefined;
  }
}

export function installKind(input: {
  desktopManaged: boolean;
  managed: boolean;
  serverRoot: string;
  exists?: (path: string) => boolean;
}): InstallKind {
  const exists = input.exists ?? existsSync;
  if (input.desktopManaged) return "desktop";
  if (input.managed) return "managed";
  if (exists("/.dockerenv")) return "docker";
  if (exists("/run/.containerenv")) return "podman";
  if (input.serverRoot.split(sep).includes("node_modules")) return "npm";
  if (exists(join(input.serverRoot, "..", ".git"))) return "git";
  return "unknown";
}

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (version: string) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
    return match ? { core: match.slice(1, 4).map(Number), pre: match[4]?.split(".") ?? [] } : null;
  };
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a.core[i]! !== b.core[i]!) return a.core[i]! > b.core[i]!;
  }
  if (!a.pre.length || !b.pre.length) return !a.pre.length && b.pre.length > 0;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined || y === undefined) return y === undefined;
    if (x === y) continue;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return Number(x) > Number(y);
    if (xn !== yn) return yn;
    return x > y;
  }
  return false;
}

export interface UpdateCheck {
  current: string;
  install: InstallKind;
  channel?: UpdateChannel;
  latest?: string;
  available: boolean;
  releaseUrl?: string;
  command?: string;
  restart?: boolean;
}

type Found = { version: string; releaseUrl?: string };

export function createUpdateChecker(options: {
  current: string;
  install: InstallKind;
  channel?: UpdateChannel;
  url?: string;
  fetch?: typeof fetch;
  now?: () => number;
}) {
  const updateUrl = optionalFeedUrl({ CRYBOT_UPDATE_URL: options.url ?? process.env.CRYBOT_UPDATE_URL }, "CRYBOT_UPDATE_URL");
  const fetchJson = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const channel = options.channel ?? "stable";
  let cached: { at: number; result: UpdateCheck } | undefined;
  let lastGood: { at: number; result: UpdateCheck } | undefined;
  let inflight: Promise<UpdateCheck> | undefined;
  const base = (): UpdateCheck => ({
    current: options.current,
    install: options.install,
    available: false,
    ...updateCommand(options.install),
  });
  const ask = (url: string) => fetchJson(url, {
    redirect: "error",
    headers: { accept: "application/json", "user-agent": "crybot-update-check" },
    signal: AbortSignal.timeout(8_000),
  });

  async function readFeed(): Promise<Found> {
    const response = await ask(updateUrl!.href);
    if (!response.ok) throw new Error(`Update feed answered ${response.status}`);
    const record = await response.json() as { version?: unknown; releaseUrl?: unknown };
    if (typeof record.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(record.version)) {
      throw new Error("Update feed named no valid version");
    }
    const release = optionalFeedUrl({ release: typeof record.releaseUrl === "string" ? record.releaseUrl : undefined }, "release");
    return { version: record.version, ...(release?.protocol === "https:" && release.origin === updateUrl!.origin ? { releaseUrl: release.href } : {}) };
  }

  return async function check(): Promise<UpdateCheck> {
    if (!updateUrl || options.install === "desktop" || options.install === "managed") return base();
    if (cached && now() - cached.at < CACHE_MS) return cached.result;
    inflight ??= (async () => {
      try {
        const found = await readFeed();
        const result: UpdateCheck = {
          ...base(),
          channel,
          latest: found.version,
          available: isNewerVersion(found.version, options.current),
          ...(found.releaseUrl ? { releaseUrl: found.releaseUrl } : {}),
          ...updateCommand(options.install, { version: found.version, stable: channel === "stable" }),
        };
        cached = lastGood = { at: now(), result };
        return result;
      } catch (error) {
        if (lastGood && now() - lastGood.at < STALE_MS) return lastGood.result;
        throw error;
      } finally {
        inflight = undefined;
      }
    })();
    return inflight;
  };
}
