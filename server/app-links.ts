import type { IncomingMessage, ServerResponse } from "node:http";

export function appLinkOrigin(env: NodeJS.ProcessEnv): string | null {
  const value = env.CRYBOT_APP_LINK_ORIGIN;
  if (!value) return null;
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

export function createAppLinks(env: NodeJS.ProcessEnv = process.env) {
  const origin = appLinkOrigin(env);
  if (env.CRYBOT_APP_LINK_ORIGIN && !origin) console.warn("Invalid CRYBOT_APP_LINK_ORIGIN; app link returns are disabled");
  if (origin && new URL(origin).port) console.warn("CRYBOT_APP_LINK_ORIGIN uses a non-443 port; Associated Domains and App Links require default HTTPS port 443");
  const appleIds = (env.CRYBOT_APPLE_APP_IDS ?? "").split(",").map(value => value.trim())
    .filter(value => /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/.test(value));
  const packageName = env.CRYBOT_ANDROID_PACKAGE ?? "";
  const validPackage = packageName.match(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/)?.[0] === packageName;
  const fingerprints = (env.CRYBOT_ANDROID_CERT_SHA256 ?? "").split(",").map(value => {
    const upper = value.trim().toUpperCase();
    return /^[0-9A-F]{64}$/.test(upper) ? upper.match(/.{2}/g)!.join(":") : upper;
  }).filter(value => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
  const aasa = appleIds.length ? { applinks: { details: [{ appIDs: appleIds, components: [{ "/": "/auth/app-return", comment: "Cry Bot login return" }] }] }, webcredentials: { apps: appleIds } } : null;
  const assetlinks = validPackage && fingerprints.length ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints } }] : null;
  return (req: IncomingMessage, res: ServerResponse, url: URL): boolean => {
    if (req.method !== "GET") return false;
    if (url.pathname === "/.well-known/apple-app-site-association" || url.pathname === "/.well-known/assetlinks.json") {
      const body = url.pathname === "/.well-known/apple-app-site-association" ? aasa : assetlinks;
      if (body) { res.setHeader("content-type", "application/json"); res.writeHead(200).end(JSON.stringify(body)); }
      else res.writeHead(404).end();
      return true;
    }
    if (url.pathname !== "/auth/app-return") return false;
    if (!origin) { res.writeHead(404).end(); return true; }
    const chinese = prefersChinese(req.headers["accept-language"]);
    const message = chinese
      ? "没能自动回到 Cry Bot App。请确认手机上已安装最新版 Cry Bot App，回到 App 重新点登录。"
      : "Could not return to the Cry Bot App automatically. Please make sure the latest Cry Bot App is installed on your phone, then return to the App and tap Sign in again.";
    res.setHeaders(new Headers({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    }));
    res.writeHead(200).end(`<!doctype html><html lang="${chinese ? "zh-Hans" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cry Bot</title></head><body><p>${message}</p></body></html>`);
    return true;
  };
}
