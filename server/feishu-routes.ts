import type { IncomingMessage, ServerResponse } from "node:http";
import type { json, readBody } from "./harness/http.ts";
import { admitFeishuUser, allowedRedirectUris, exchangeCode, fetchUserInfo, type FeishuLoginConfig } from "./feishu-login.ts";
import type { SessionRegistry } from "./sessions.ts";

export interface FeishuExchangeRouteOptions {
  config: FeishuLoginConfig | null;
  publicOrigin: string;
  sessions: SessionRegistry;
  cookieName: string;
  fetch?: typeof fetch;
  readBody: typeof readBody;
  json: typeof json;
}

export async function feishuExchangeRoute(options: FeishuExchangeRouteOptions, req: IncomingMessage, res: ServerResponse, path: string, method: string): Promise<boolean> {
  if (!options.config) {
    if (path.startsWith("/api/auth/feishu") || path.startsWith("/auth/feishu")) {
      options.json(res, 404, { error: "not_found" });
      return true;
    }
    return false;
  }
  if (method !== "POST" || path !== "/api/auth/feishu/exchange") return false;
  if (req.headers.origin !== undefined) { options.json(res, 403, { error: "feishu_origin_forbidden" }); return true; }
  if (!/^application\/json\b/i.test(String(req.headers["content-type"] ?? ""))) { options.json(res, 400, { error: "feishu_code_invalid" }); return true; }
  let body: any;
  try { body = await options.readBody(req, 16 * 1024); } catch { options.json(res, 400, { error: "feishu_code_invalid" }); return true; }
  const platform = body?.platform;
  if (typeof body?.code !== "string" || typeof body?.codeVerifier !== "string" || typeof body?.redirectUri !== "string" || !["ios", "android", "desktop"].includes(platform) || (body?.label !== undefined && typeof body.label !== "string")) {
    options.json(res, 400, { error: "feishu_code_invalid" }); return true;
  }
  if (!allowedRedirectUris(options.config, options.publicOrigin).includes(body.redirectUri)) { options.json(res, 400, { error: "feishu_code_invalid" }); return true; }
  try {
    const token = await exchangeCode({ config: options.config, code: body.code, codeVerifier: body.codeVerifier, redirectUri: body.redirectUri, fetch: options.fetch });
    const info = await fetchUserInfo({ ...token, endpoint: options.config.userInfoEndpoint, fetch: options.fetch });
    const admission = admitFeishuUser(info, options.config);
    if ("denied" in admission) { options.json(res, 403, { error: "feishu_not_allowed" }); return true; }
    if (req.socket.destroyed || req.aborted || res.destroyed || res.writableEnded) return true;
    let issued;
    try {
      issued = options.sessions.issueDevice(admission.identity, body.label || `${platform} Feishu device`, { displayName: admission.displayName, accessEmail: admission.accessEmail, scopes: [...admission.scopes], maxAgeDays: options.config.sessionMaxDays, platform, tenantKey: admission.tenantKey });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status === 403) {
        options.json(res, 403, { error: "feishu_forbidden" });
        return true;
      }
      console.error("Feishu device session issuance failed.");
      options.json(res, 502, { error: "feishu_unavailable" });
      return true;
    }
    const cleanup = () => {
      res.off("error", revoke);
      res.off("close", onClose);
      res.off("finish", cleanup);
    };
    const revoke = () => {
      cleanup();
      try {
        options.sessions.revoke(issued.session.id);
      } catch {
        console.error("Could not persist undelivered Feishu session revocation.");
      }
    };
    const onClose = () => {
      if (!res.writableFinished) revoke();
      else cleanup();
    };
    res.once("error", revoke);
    res.once("close", onClose);
    res.once("finish", cleanup);
    try {
      options.json(res, 200, { token: issued.token, session: issued.session, cookieName: options.cookieName });
    } catch {
      revoke();
      res.destroy();
    }
  } catch (error) {
    const code = error instanceof Error && error.message === "feishu_code_invalid" ? "feishu_code_invalid" : "feishu_unavailable";
    options.json(res, code === "feishu_code_invalid" ? 400 : 502, { error: code });
  }
  return true;
}
