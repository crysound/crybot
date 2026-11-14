import { createCipheriv, createECDH, ECDH, hkdfSync, randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { JWTVerifyGetKey } from "jose";
import { cfAccessRefusal, createCfAccess, createCfAccessTokenVerifier } from "./cf-access.ts";
import { parseCookies } from "./request-auth.ts";

type JsonResponder = (res: ServerResponse, status: number, body: unknown) => void;

function parsePublicKey(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]{87}$/.test(value)) return null;
  const key = Buffer.from(value, "base64url");
  if (key.length !== 65 || key[0] !== 4 || key.toString("base64url") !== value) return null;
  try {
    return Buffer.from(ECDH.convertKey(key, "prime256v1"));
  } catch {
    return null;
  }
}

export function encryptAppHandoff(token: string, state: string, publicKey: Uint8Array, entropy: { privateKey: Uint8Array; nonce: Uint8Array }) {
  const ephemeral = createECDH("prime256v1");
  ephemeral.setPrivateKey(entropy.privateKey);
  if (entropy.nonce.length !== 12) throw new Error("Invalid handoff nonce length");
  const stateBytes = Buffer.from(state, "utf8");
  const key = hkdfSync("sha256", ephemeral.computeSecret(publicKey), stateBytes, "crybot-app-handoff-v1", 32);
  const cipher = createCipheriv("aes-256-gcm", key, entropy.nonce, { authTagLength: 16 });
  cipher.setAAD(stateBytes);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return {
    v: "1",
    state,
    epk: ephemeral.getPublicKey().toString("base64url"),
    iv: Buffer.from(entropy.nonce).toString("base64url"),
    ct: ciphertext.toString("base64url"),
  };
}

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
    const publicKeys = url.searchParams.getAll("pk");
    const publicKey = publicKeys.length === 1 ? parsePublicKey(publicKeys[0]) : null;
    if (!publicKey) { res.writeHead(400).end(); return; }
    const token = req.headers["cf-access-jwt-assertion"] ?? parseCookies(req.headers.cookie).get("CF_Authorization");
    if (typeof token !== "string" || !token) { res.writeHead(401).end(); return; }
    const payload = await verify(token);
    if (!payload?.exp || payload.exp - Date.now() / 1000 < 60) { res.writeHead(401).end(); return; }
    const ephemeral = createECDH("prime256v1");
    ephemeral.generateKeys();
    const encrypted = encryptAppHandoff(token, state, publicKey, { privateKey: ephemeral.getPrivateKey(), nonce: randomBytes(12) });
    const callback = escapeHtml(`${scheme}://auth?${new URLSearchParams(encrypted)}`);
    const chinese = prefersChinese(req.headers["accept-language"]);
    const label = escapeHtml(chinese ? "返回 Cry Bot" : "Return to Cry Bot");
    const title = chinese ? "在 Cry Bot App 中登录" : "Sign in to the Cry Bot App";
    const accountLabel = chinese ? "当前账号：" : "Current account: ";
    const email = escapeHtml(typeof payload.email === "string" ? payload.email : (chinese ? "未提供邮箱" : "Email not provided"));
    const warning = chinese
      ? "只有你刚刚在 Cry Bot App 里点了登录，才点下面的按钮。如果你没有这样做，请直接关闭此页。"
      : "Only click the button below if you just tapped Sign in in the Cry Bot App. If you did not, close this page.";
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    });
    res.end(`<!doctype html><html lang="${chinese ? "zh-Hans" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body><h1>${title}</h1><p>${accountLabel}${email}</p><p><strong>${warning}</strong></p><a role="button" href="${callback}">${label}</a></body></html>`);
  };
}

export function createAppHandoffGate(
  env: NodeJS.ProcessEnv = process.env,
  keySet?: JWTVerifyGetKey,
) {
  const access = createCfAccess(env, keySet);
  const handoff = createAppHandoff(access !== null, env, keySet);
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    method: string,
    path: string,
    sessions: Parameters<typeof cfAccessRefusal>[6],
    cookieName: string,
    json: JsonResponder,
  ) => {
    const refusal = await cfAccessRefusal(access, method, path, req, res, url, sessions, cookieName);
    if (refusal) {
      json(res, refusal, { error: refusal === 401 ? "Invalid Cloudflare Access assertion" : "Cloudflare Access identity is not allowed" });
      return true;
    }
    if (method === "GET" && path === "/auth/app-handoff") {
      await handoff(req, res, url);
      return true;
    }
    return false;
  };
}
