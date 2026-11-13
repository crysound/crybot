import type { IncomingMessage, ServerResponse } from "node:http";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { bearerToken, labelFromUserAgent, parseCookies, requestOrigin, serializeSessionCookie } from "./request-auth.ts";
import { cookieMaxAgeSeconds, type SessionRegistry } from "./sessions.ts";

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
    const existing = bearer?.startsWith("cry_sess_") ? sessions.authenticate(bearer)
      : ticket ? ticketOwner && sessions.isLive(ticketOwner) : sessions.authenticate(cookie);
    if (existing) return null;
    let email: unknown;
    try {
      if (typeof assertion !== "string") return 401;
      const { payload } = await jwtVerify(assertion, keys, { issuer, audience, requiredClaims: ["exp"] });
      email = payload.email;
    } catch {
      return 401;
    }
    if (!allow.includes("*") && (typeof email !== "string" || !allow.includes(email.trim().toLowerCase()))) return 403;
    // Access authorizes the local owner; email membership belongs to the separate email sign-in authority.
    const issued = sessions.issue({ label: labelFromUserAgent(req.headers["user-agent"]), scopes: ["admin", "client"] });
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
