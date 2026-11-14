import type { IncomingMessage } from "node:http";
import { requestSource } from "./request-auth.ts";

export const AUTH_RATE_LIMIT_PATHS = new Set([
  "/api/auth/feishu/exchange", "/auth/feishu/callback", "/api/auth/pair", "/api/pair",
  "/api/auth/email/start", "/api/auth/email/verify",
]);

export interface AuthRateLimiter {
  check(req: IncomingMessage, path: string, appChannel: boolean): { limited: boolean; retryAfter: number };
  readonly size: number;
  clear(): void;
}

export function authAudit(input: { action: string; req: IncomingMessage; result: string; identity?: string; unionId?: string; platform?: string }): void {
  const ua = String(input.req.headers["user-agent"] ?? "");
  const platform = input.platform ?? (/Android/i.test(ua) ? "android" : /iPhone|iPad/i.test(ua) ? "ios" : /Macintosh|Windows|Linux/i.test(ua) ? "desktop" : "unknown");
  console.log(JSON.stringify({ event: "auth_audit", time: new Date().toISOString(), action: input.action, platform, identity: input.identity ?? "未知", ...(input.unionId ? { union_id: input.unionId } : {}), source_ip: requestSource(input.req), result: input.result }));
}

export function createAuthRateLimiter(options: { now?: () => number; windowMs?: number; limit?: number; maxKeys?: number } = {}): AuthRateLimiter {
  const now = options.now ?? (() => Date.now());
  const windowMs = options.windowMs ?? 60_000;
  const limit = options.limit ?? 10;
  const maxKeys = options.maxKeys ?? 10_000;
  const windows = new Map<string, number[]>();
  return {
    get size() { return windows.size; },
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
      while (windows.size > maxKeys) {
        const oldest = windows.keys().next().value;
        if (oldest === undefined) break;
        windows.delete(oldest);
      }
      return { limited: false, retryAfter: 0 };
    },
    clear: () => windows.clear(),
  };
}
