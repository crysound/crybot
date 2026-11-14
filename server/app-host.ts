import type { IncomingMessage, ServerResponse } from "node:http";
import { isProxied } from "./request-auth.ts";

export interface AppHostConfig {
  host: string | null;
  enabled: boolean;
}

let warnedLegacyOrigin = false;

function hostname(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  if (!input.includes("://") && /[/:?#]/.test(input)) return null;
  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    if (parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return parsed.hostname.toLowerCase().replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

function hostHeader(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (text.startsWith("[")) {
    const end = text.indexOf("]");
    return end >= 0 ? text.slice(1, end) : null;
  }
  const colon = text.lastIndexOf(":");
  return (colon > 0 && /^\d+$/.test(text.slice(colon + 1)) ? text.slice(0, colon) : text).replace(/\.$/, "");
}

export function appHostConfig(env: NodeJS.ProcessEnv = process.env, options: { cfAccess?: boolean; hostedWorkspace?: boolean; cloudTeam?: boolean } = {}): AppHostConfig {
  const explicit = env.CRYBOT_APP_HOST?.trim();
  let host = explicit ? hostname(explicit) : null;
  if (!host && explicit) throw new Error("CRYBOT_APP_HOST must be a hostname without a port or path");
  if (!host && env.CRYBOT_APP_LINK_ORIGIN?.trim()) {
    host = hostname(env.CRYBOT_APP_LINK_ORIGIN);
    if (host && !warnedLegacyOrigin) {
      warnedLegacyOrigin = true;
      console.warn("CRYBOT_APP_LINK_ORIGIN is deprecated; use CRYBOT_APP_HOST");
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
  return (config.host !== null && hostHeader(req.headers.host) === config.host) || (isProxied(req) && !accessVerified);
}

export function createAppHost(config: AppHostConfig) {
  return {
    config,
    isRequest: (req: IncomingMessage, accessVerified: boolean) => isAppChannelRequest(req, accessVerified, config),
    rejectAccessAssertion: (req: IncomingMessage) => config.enabled && config.host !== null && hostHeader(req.headers.host) === config.host && req.headers["cf-access-jwt-assertion"] !== undefined,
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
