import type { IncomingMessage } from "node:http";
import { requestSource } from "./request-auth.ts";

export const AUTH_RATE_LIMIT_PATHS = new Set([
  "/api/auth/feishu/exchange", "/auth/feishu/callback", "/api/auth/pair", "/api/pair",
  "/api/auth/email/start", "/api/auth/email/verify",
]);

export interface AuthRateLimiter {
  check(req: IncomingMessage, path: string, appChannel: boolean): { limited: boolean; retryAfter: number };
  clear(): void;
}

export function authAudit(input: { action: string; req: IncomingMessage; result: string; identity?: string; unionId?: string; platform?: string }): void {
  const ua = String(input.req.headers["user-agent"] ?? "");
  const platform = input.platform ?? (/Android/i.test(ua) ? "android" : /iPhone|iPad/i.test(ua) ? "ios" : /Macintosh|Windows|Linux/i.test(ua) ? "desktop" : "unknown");
  console.log(JSON.stringify({ time: new Date().toISOString(), action: input.action, platform, identity: input.identity ?? "未知", ...(input.unionId ? { union_id: input.unionId } : {}), source_ip: requestSource(input.req), result: input.result }));
}

export function createAuthRateLimiter(options: { now?: () => number; windowMs?: number; limit?: number; maxKeys?: number } = {}): AuthRateLimiter {
  const now = options.now ?? (() => Date.now());
  const windowMs = options.windowMs ?? 60_000;
  const limit = options.limit ?? 10;
  const maxKeys = options.maxKeys ?? 10_000;
  const windows = new Map<string, number[]>();
  const prune = (at: number) => {
    for (const [key, entries] of windows) {
      const fresh = entries.filter((entry) => entry > at - windowMs);
      if (fresh.length) windows.set(key, fresh); else windows.delete(key);
    }
  };
  return {
    check(req, path, appChannel) {
      if (!appChannel || !AUTH_RATE_LIMIT_PATHS.has(path)) return { limited: false, retryAfter: 0 };
      const at = now();
      const key = requestSource(req);
      const entries = (windows.get(key) ?? []).filter((entry) => entry > at - windowMs);
      if (entries.length >= limit) {
        windows.set(key, entries);
        return { limited: true, retryAfter: Math.max(1, Math.ceil(((entries[0] ?? at) + windowMs - at) / 1000)) };
      }
      entries.push(at);
      windows.set(key, entries);
      if (windows.size > maxKeys) {
        const oldest = windows.keys().next().value;
        if (oldest !== undefined) windows.delete(oldest);
      }
      if (windows.size > maxKeys / 2) prune(at);
      return { limited: false, retryAfter: 0 };
    },
    clear: () => windows.clear(),
  };
}
