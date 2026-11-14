import type { IncomingMessage, ServerResponse } from "node:http";
import type { JWTVerifyGetKey } from "jose";
import { createCfAccessTokenVerifier } from "./cf-access.ts";
import { parseCookies } from "./request-auth.ts";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function prefersChinese(header: string | undefined) {
  const languages = (header ?? "").split(",").map(entry => {
    const [language, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find(value => value.trim().startsWith("q="));
    return { language, weight: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter(entry => entry.weight > 0).sort((a, b) => b.weight - a.weight);
  return languages.find(entry => /^(zh|en)(-|$)/.test(entry.language ?? ""))?.language?.startsWith("zh") ?? false;
}

export function createAppHandoff(enabled: boolean, env: NodeJS.ProcessEnv = process.env, keySet?: JWTVerifyGetKey) {
  const verify = enabled ? createCfAccessTokenVerifier(env, keySet) : null;
  const configuredScheme = env.CRYBOT_APP_SCHEME ?? "crybot";
  const scheme = configuredScheme.match(/^[a-z][a-z0-9+.-]{1,30}$/)?.[0] === configuredScheme ? configuredScheme : "crybot";
  return async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    res.setHeader("cache-control", "no-store");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    if (!verify) { res.writeHead(404).end(); return; }
    const states = url.searchParams.getAll("state");
    const state = states[0] ?? "";
    if (states.length !== 1 || state.match(/^[A-Za-z0-9_-]{32,128}$/)?.[0] !== state) { res.writeHead(400).end(); return; }
    const token = req.headers["cf-access-jwt-assertion"] ?? parseCookies(req.headers.cookie).get("CF_Authorization");
    if (typeof token !== "string" || !token) { res.writeHead(401).end(); return; }
    const payload = await verify(token);
    if (!payload?.exp || payload.exp - Date.now() / 1000 < 60) { res.writeHead(401).end(); return; }
    const callback = escapeHtml(`${scheme}://auth?${new URLSearchParams({ state, token })}`);
    const chinese = prefersChinese(req.headers["accept-language"]);
    const label = escapeHtml(chinese ? "返回 Cry Bot" : "Return to Cry Bot");
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    });
    res.end(`<!doctype html><html lang="${chinese ? "zh-Hans" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${callback}"><title>${label}</title></head><body><a role="button" href="${callback}">${label}</a></body></html>`);
  };
}
