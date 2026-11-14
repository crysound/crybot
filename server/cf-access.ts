import type { IncomingMessage, ServerResponse } from "node:http";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { bearerToken, labelFromUserAgent, parseCookies, requestOrigin, serializeSessionCookie } from "./request-auth.ts";
import { cookieMaxAgeSeconds, type SessionRegistry } from "./sessions.ts";

import { cleanAccessEmail, cleanIdentityClaim } from "./access-claims.ts";

const verifiedRequests = new WeakSet<IncomingMessage>();

export function accessVerified(req: IncomingMessage): boolean {
  return verifiedRequests.has(req);
}

export function cfAccessIdentityClaims(payload: { sub?: unknown; email?: unknown; name?: unknown; custom?: unknown }): { identity?: string; email?: string; displayName?: string } {
  const email = cleanAccessEmail(payload.email);
  const custom = payload.custom && typeof payload.custom === "object" ? payload.custom as { name?: unknown } : undefined;
  const displayName = cleanIdentityClaim(custom?.name, 64) ?? cleanIdentityClaim(payload.name, 64);
  const identity = cleanIdentityClaim(payload.sub, 320) ?? email;
  return { ...(identity ? { identity } : {}), ...(email ? { email } : {}), ...(displayName ? { displayName } : {}) };
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
    let claims: ReturnType<typeof cfAccessIdentityClaims> = {};
    try {
      if (typeof assertion !== "string") throw new Error("invalid assertion");
      const { payload } = await jwtVerify(assertion, keys, { issuer, audience, requiredClaims: ["exp"] });
      verifiedRequests.add(req);
      claims = cfAccessIdentityClaims(payload);
    } catch {
      if (bearer?.startsWith("cry_sess_") && sessions.authenticate(bearer)) return null;
      if (ticketOwner && sessions.isLive(ticketOwner)) return null;
      const existing = sessions.authenticate(cookie);
      const usingCookie = !bearer?.startsWith("cry_sess_") && !ticket;
      return existing && usingCookie ? null : 401;
    }
    if (bearer?.startsWith("cry_sess_") && sessions.authenticate(bearer)) return null;
    if (ticketOwner && sessions.isLive(ticketOwner)) return null;
    const existing = sessions.authenticate(cookie);
    const usingCookie = !bearer?.startsWith("cry_sess_") && !ticket;
    if (existing && !existing.accessIdentity && usingCookie) return null;
    if (!claims.identity) return 401;
    if (existing && existing.accessIdentity !== claims.identity) sessions.revoke(existing.id);
    if (existing?.accessIdentity === claims.identity && usingCookie) {
      sessions.refreshAccessDetails(existing.id, { accessEmail: claims.email, displayName: claims.displayName });
      return null;
    }
    if (!allow.includes("*") && (!claims.email || !allow.includes(claims.email))) return 403;
    // Access authorizes the local owner; email membership belongs to the separate email sign-in authority.
    const issued = sessions.issueAccess(claims.identity, labelFromUserAgent(req.headers["user-agent"]), { accessEmail: claims.email, displayName: claims.displayName });
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

export function createCfAccessTokenVerifier(env: NodeJS.ProcessEnv = process.env, keySet?: JWTVerifyGetKey) {
  const issuer = `https://${env.CRYBOT_CF_ACCESS_TEAM_DOMAIN?.trim()}`;
  const audience = env.CRYBOT_CF_ACCESS_AUD?.split(",").map(value => value.trim()).filter(Boolean);
  const allow = env.CRYBOT_CF_ACCESS_ALLOW?.split(",").map(value => value.trim().toLowerCase()).filter(Boolean) ?? [];
  const keys = keySet ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  return async (token: string) => {
    try {
      const { payload } = await jwtVerify(token, keys, { issuer, audience, requiredClaims: ["exp"] });
      const email = payload.email;
      const identity = payload.sub || (typeof email === "string" ? email.trim().toLowerCase() : undefined);
      if (!identity || (!allow.includes("*") && (typeof email !== "string" || !allow.includes(email.trim().toLowerCase())))) return null;
      return payload;
    } catch {
      return null;
    }
  };
}
