import type { IncomingMessage, ServerResponse } from "node:http";
import { accessVerified } from "./cf-access.ts";
import { isProxied } from "./request-auth.ts";
import { authAudit, createAuthRateLimiter } from "./auth-rate-limit.ts";

export interface AppHostConfig {
  host: string | null;
  enabled: boolean;
}

let warnedLegacyOrigin = false;

export function hostname(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  if (!input.includes("://") && /[/:?#]/.test(input) && !(input.startsWith("[") && input.endsWith("]"))) return null;
  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    if (parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

export function requestHost(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (text.startsWith("[")) {
    const end = text.indexOf("]");
    return end >= 0 ? text.slice(1, end) : null;
  }
  const colon = text.lastIndexOf(":");
  return (colon > 0 && /^\d+$/.test(text.slice(colon + 1)) ? text.slice(0, colon) : text).replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

export function appHostConfig(env: NodeJS.ProcessEnv = process.env, options: { cfAccess?: boolean; hostedWorkspace?: boolean; cloudTeam?: boolean } = {}): AppHostConfig {
  const explicit = env.CRYBOT_APP_HOST?.trim();
  let host = explicit ? hostname(explicit) : null;
  if (!host && explicit) throw new Error("CRYBOT_APP_HOST must be a hostname without a port or path");
  if (!host && env.CRYBOT_APP_LINK_ORIGIN?.trim()) {
    host = hostname(env.CRYBOT_APP_LINK_ORIGIN);
    if (host && !warnedLegacyOrigin) {
      warnedLegacyOrigin = true;
      console.warn("Deriving CRYBOT_APP_HOST from CRYBOT_APP_LINK_ORIGIN is deprecated; set CRYBOT_APP_HOST (HTTPS app return origin defaults to that host)");
    }
  }
  const hosted = options.hostedWorkspace ?? (env.CRYBOT_ADMIN_URL !== undefined || env.CRYBOT_ADMIN_WORKSPACE !== undefined || env.CRYBOT_ADMIN_MEMBERSHIP !== undefined);
  const cloudTeam = options.cloudTeam ?? env.CRYBOT_CLOUD_ROLE === "team";
  const access = options.cfAccess ?? Boolean(env.CRYBOT_CF_ACCESS_TEAM_DOMAIN?.trim() && env.CRYBOT_CF_ACCESS_AUD?.trim() && env.CRYBOT_CF_ACCESS_ALLOW?.trim());
  const disabled = hosted || cloudTeam;
  return { host, enabled: !disabled && (access || host !== null) };
}

export function isAppChannelRequest(req: IncomingMessage, accessVerified: boolean, config: AppHostConfig = appHostConfig()): boolean {
  if (!config.enabled) return false;
  return (config.host !== null && requestHost(req.headers.host) === config.host) || (isProxied(req) && !accessVerified);
}

export function createAppHost(config: AppHostConfig) {
  return {
    config,
    isRequest: (req: IncomingMessage, accessVerified: boolean) => isAppChannelRequest(req, accessVerified, config),
    rejectAccessAssertion: (req: IncomingMessage) => config.enabled && config.host !== null && requestHost(req.headers.host) === config.host && req.headers["cf-access-jwt-assertion"] !== undefined,
    rejectAssertion: (res: ServerResponse) => res.writeHead(400, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify({ error: "Access JWT is not accepted on the app host" })),
    rejectRoute: (req: IncomingMessage, path: string, accessVerified: boolean) => {
      if (!isAppChannelRequest(req, accessVerified, config)) return false;
      return path === "/auth/app-handoff" || path.startsWith("/api/auth/hosted/");
    },
  };
}

export function rejectAppRoute(res: ServerResponse): void {
  res.writeHead(404, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify({ error: "not_found" }));
}

const defaultAppHost = createAppHost(appHostConfig());
const defaultRateLimiter = createAuthRateLimiter();

export function appGate(req: IncomingMessage, res: ServerResponse, path: string, accessIsVerified: boolean, beforeAccess = false): boolean {
  if (beforeAccess) {
    if (!defaultAppHost.rejectAccessAssertion(req)) return false;
    defaultAppHost.rejectAssertion(res);
    return true;
  }
  if (defaultAppHost.rejectRoute(req, path, accessIsVerified)) {
    rejectAppRoute(res);
    return true;
  }
  const rate = defaultRateLimiter.check(req, path, defaultAppHost.isRequest(req, accessIsVerified));
  if (!rate.limited) return false;
  res.setHeader("retry-after", String(rate.retryAfter));
  authAudit({ action: "rate_limit", req, result: "limited" });
  res.writeHead(429, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify({ error: "rate_limited" }));
  return true;
}

export function isDefaultAppChannel(req: IncomingMessage, accessIsVerified: boolean): boolean {
  return defaultAppHost.isRequest(req, accessIsVerified);
}

export function auditLogin<T extends { ok: boolean; session?: { label: string } }>(req: IncomingMessage, result: T): T {
  if (isDefaultAppChannel(req, accessVerified(req))) {
    authAudit({ action: "login", req, result: result.ok ? "success" : "failure", identity: result.ok ? result.session?.label : undefined });
  }
  return result;
}

export function auditSessionRevoke(req: IncomingMessage, revoked: boolean, identity?: string): boolean {
  if (revoked && isDefaultAppChannel(req, accessVerified(req))) {
    authAudit({ action: "session_revoke", req, result: "success", identity });
  }
  return revoked;
}
