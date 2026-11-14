import type { IncomingMessage, ServerResponse } from "node:http";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { bearerToken, labelFromUserAgent, parseCookies, requestOrigin, serializeSessionCookie } from "./request-auth.ts";
import { cookieMaxAgeSeconds, type SessionRegistry } from "./sessions.ts";

const CF_ACCESS_DOMAIN_CHECK_PATH = /^\/\.well-known\/crybot\/domain-check\/[a-f0-9]{64}$/;

export function isCfAccessPublicProbe(method: string, path: string): boolean {
  return method === "GET" && (path === "/api/health" || path === "/api/brand" || path === "/.well-known/crybot/environment" || CF_ACCESS_DOMAIN_CHECK_PATH.test(path));
}

export function createCfAccess(env: NodeJS.ProcessEnv = process.env, keySet?: JWTVerifyGetKey) {
  const team = env.CRYBOT_CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.CRYBOT_CF_ACCESS_AUD?.split(",").map(value => value.trim()).filter(Boolean);
  const allow = env.CRYBOT_CF_ACCESS_ALLOW?.split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!team && !audience?.length && !allow?.length) return null;
  if (!team || !/^[a-z0-9.-]+$/i.test(team) || !audience?.length || !allow?.length) {
    throw new Error("Cloudflare Access requires TEAM_DOMAIN, AUD and ALLOW");
  }
  const issuer = `https://${team}`;
  const keys = keySet ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  return async (req: IncomingMessage, res: ServerResponse, url: URL, sessions: SessionRegistry, cookieName: string): Promise<401 | 403 | null> => {
    const assertion = req.headers["cf-access-jwt-assertion"];
    if (assertion === undefined) return null;
    const bearer = bearerToken(req.headers.authorization);
    const cookie = parseCookies(req.headers.cookie).get(cookieName);
    const ticket = url.pathname === "/api/events" ? url.searchParams.get("ticket") : null;
    const ticketOwner = ticket ? sessions.ticketOwner(ticket) : null;
    if (bearer?.startsWith("cry_sess_") && sessions.authenticate(bearer)) return null;
    if (ticketOwner && sessions.isLive(ticketOwner)) return null;
    const existing = sessions.authenticate(cookie);
    const usingCookie = !bearer?.startsWith("cry_sess_") && !ticket;
    if (existing && !existing.accessIdentity && usingCookie) return null;
    let email: unknown;
    let identity: string | undefined;
    try {
      if (typeof assertion !== "string") return existing && usingCookie ? null : 401;
      const { payload } = await jwtVerify(assertion, keys, { issuer, audience, requiredClaims: ["exp"] });
      email = payload.email;
      identity = payload.sub || (typeof email === "string" ? email.trim().toLowerCase() : undefined);
    } catch {
      return existing && usingCookie ? null : 401;
    }
    if (!identity) return 401;
    if (existing && existing.accessIdentity !== identity) sessions.revoke(existing.id);
    if (existing?.accessIdentity === identity && usingCookie) return null;
    if (!allow.includes("*") && (typeof email !== "string" || !allow.includes(email.trim().toLowerCase()))) return 403;
    // Access authorizes the local owner; email membership belongs to the separate email sign-in authority.
    const issued = sessions.issueAccess(identity, labelFromUserAgent(req.headers["user-agent"]));
    res.appendHeader("set-cookie", serializeSessionCookie(cookieName, issued.token, {
      secure: requestOrigin(req)?.startsWith("https://") === true,
      maxAgeSeconds: cookieMaxAgeSeconds(issued.session),
    }));
    const cookies = parseCookies(req.headers.cookie);
    cookies.set(cookieName, issued.token);
    req.headers.cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    if (bearer?.startsWith("cry_sess_")) delete req.headers.authorization;
    if (ticket) {
      url.searchParams.delete("ticket");
      req.url = `${url.pathname}${url.search}`;
    }
    return null;
  };
}

export async function cfAccessRefusal(
  access: ReturnType<typeof createCfAccess>,
  method: string,
  path: string,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  sessions: SessionRegistry,
  cookieName: string,
): Promise<401 | 403 | null> {
  if (!access || isCfAccessPublicProbe(method, path)) return null;
  return access(req, res, url, sessions, cookieName);
}
