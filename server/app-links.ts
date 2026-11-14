import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { hostname, requestHost } from "./app-host.ts";
export { appGate, auditLogin, auditSessionRevoke } from "./app-host.ts";

export function appLinkOrigin(env: NodeJS.ProcessEnv): string | null {
  const value = env.CRYBOT_APP_LINK_ORIGIN;
  if (!value) {
    const host = env.CRYBOT_APP_HOST?.trim() ? hostname(env.CRYBOT_APP_HOST) : null;
    return host ? `https://${host.includes(":") ? `[${host}]` : host}` : null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value.replace(/\/$/, "") ? url.origin : null;
  } catch {
    return null;
  }
}

export function prefersChinese(header: string | undefined) {
  const languages = (header ?? "").split(",").map(entry => {
    const [language, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find(value => value.trim().startsWith("q="));
    return { language, weight: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter(entry => entry.weight > 0).sort((a, b) => b.weight - a.weight);
  return languages.find(entry => /^(zh|en)(-|$)/.test(entry.language ?? ""))?.language?.startsWith("zh") ?? false;
}

function schemeOf(env: NodeJS.ProcessEnv): string {
  const configured = env.CRYBOT_APP_SCHEME ?? "crybot";
  return configured.match(/^[a-z][a-z0-9+.-]{1,30}$/)?.[0] === configured ? configured : "crybot";
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function scriptString(value: string): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function sendPage(req: IncomingMessage, res: ServerResponse, target: string): void {
  const chinese = prefersChinese(req.headers["accept-language"]);
  const script = `location.replace(${scriptString(target)});`;
  const hash = createHash("sha256").update(script).digest("base64");
  const label = chinese ? "返回 Cry Bot" : "Return to Cry Bot";
  const message = chinese ? "正在返回 Cry Bot App……" : "Returning to the Cry Bot App…";
  const body = `<!doctype html><html lang="${chinese ? "zh-Hans" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cry Bot</title></head><body><p>${message}</p><a href="${escapeHtml(target)}">${label}</a><script>${script}</script></body></html>`;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("content-security-policy", `default-src 'none'; script-src 'sha256-${hash}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`);
  res.writeHead(200);
  res.end(body);
}

function rawQuery(req: IncomingMessage): string {
  const value = req.url ?? "";
  const mark = value.indexOf("?");
  return mark < 0 ? "" : value.slice(mark + 1);
}

export function createAppLinks(env: NodeJS.ProcessEnv = process.env) {
  const origin = appLinkOrigin(env);
  if (env.CRYBOT_APP_LINK_ORIGIN && !origin) console.warn("Invalid CRYBOT_APP_LINK_ORIGIN; app link returns are disabled");
  if (origin && env.CRYBOT_APP_HOST && requestHost(new URL(origin).hostname) !== hostname(env.CRYBOT_APP_HOST)) {
    console.warn("CRYBOT_APP_LINK_ORIGIN host differs from CRYBOT_APP_HOST; app return links may not reach the app host");
  }
  if (origin && new URL(origin).port) console.warn("CRYBOT_APP_LINK_ORIGIN uses a non-443 port; Associated Domains and App Links require default HTTPS port 443");
  const appleIds = (env.CRYBOT_APPLE_APP_IDS ?? "").split(",").map(value => value.trim())
    .filter(value => /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/.test(value));
  const packageName = env.CRYBOT_ANDROID_PACKAGE ?? "";
  const validPackage = packageName.match(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/)?.[0] === packageName;
  const fingerprints = (env.CRYBOT_ANDROID_CERT_SHA256 ?? "").split(",").map(value => {
    const upper = value.trim().toUpperCase();
    return /^[0-9A-F]{64}$/.test(upper) ? upper.match(/.{2}/g)!.join(":") : upper;
  }).filter(value => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
  const aasa = appleIds.length ? { applinks: { details: [{ appIDs: appleIds, components: [{ "/": "/auth/app-return", comment: "Cry Bot login return" }, { "/": "/auth/feishu/app-return", comment: "Cry Bot Feishu login return" }] }] }, webcredentials: { apps: appleIds } } : null;
  const assetlinks = validPackage && fingerprints.length ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints } }] : null;
  const scheme = schemeOf(env);
  const appHost = env.CRYBOT_APP_HOST?.trim() ? hostname(env.CRYBOT_APP_HOST) : null;
  const restrictHost = Boolean(env.CRYBOT_APP_HOST?.trim());
  const hostAllowed = (req: IncomingMessage) => !restrictHost || (appHost !== null && requestHost(req.headers.host) === appHost);
  return (req: IncomingMessage, res: ServerResponse, url: URL): boolean => {
    const publicPath = url.pathname === "/.well-known/apple-app-site-association" || url.pathname === "/.well-known/assetlinks.json" || url.pathname === "/auth/app-return" || url.pathname === "/auth/feishu/app-return";
    if (req.method !== "GET") return false;
    if (!hostAllowed(req)) {
      if (publicPath) res.writeHead(404).end();
      return publicPath;
    }
    if (url.pathname === "/.well-known/apple-app-site-association" || url.pathname === "/.well-known/assetlinks.json") {
      const body = url.pathname === "/.well-known/apple-app-site-association" ? aasa : assetlinks;
      if (body) { res.setHeader("content-type", "application/json"); res.writeHead(200).end(JSON.stringify(body)); }
      else res.writeHead(404).end();
      return true;
    }
    if (url.pathname === "/auth/app-return") {
      if (!origin) { res.writeHead(404).end(); return true; }
      sendPage(req, res, `${scheme}://auth?${rawQuery(req)}`);
      return true;
    }
    if (url.pathname === "/auth/feishu/app-return") {
      if (!origin || !env.CRYBOT_FEISHU_APP_ID?.trim()) { res.writeHead(404).end(); return true; }
      const query = new URLSearchParams(url.search);
      const selected = new URLSearchParams();
      for (const key of ["code", "state", "error"]) for (const value of query.getAll(key)) selected.append(key, value);
      sendPage(req, res, `${scheme}://feishu?${selected}`);
      return true;
    }
    return false;
  };
}
