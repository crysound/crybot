import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

export const FEISHU_AUTHORIZE_ENDPOINT = "https://accounts.feishu.cn/open-apis/authen/v1/authorize";
export const FEISHU_USER_INFO_ENDPOINT = "https://open.feishu.cn/open-apis/authen/v1/user_info";
const DEFAULT_TOKEN_ENDPOINT = "https://accounts.feishu.cn/oauth/v3/token";
const MAX_SESSION_DAYS = 3650;

export interface FeishuLoginConfig {
  appId: string;
  appSecret: string;
  tenants: readonly string[];
  allow: readonly string[];
  admins?: readonly string[];
  sessionMaxDays: number;
  tokenEndpoint: string;
  userInfoEndpoint?: string;
  appHost?: string;
}

export interface FeishuUserInfo {
  unionId: string;
  tenantKey: string;
  displayName?: string;
  avatarUrl?: string;
  accessEmail?: string;
}

export type FeishuScopes = readonly ("admin" | "client")[];
export type FeishuAdmission =
  | { identity: string; unionId: string; tenantKey: string; displayName?: string; accessEmail?: string; scopes: FeishuScopes }
  | { denied: string };

const warnings = new Set<string>();

function list(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}

function identityList(value: string | undefined, name: string): string[] {
  const result: string[] = [];
  let warned = false;
  for (const item of list(value)) {
    if (item.includes("@")) {
      if (!warned) { const key = `${name}:email`; if (!warnings.has(key)) { warnings.add(key); console.warn(`${name} accepts union_id values only; email entries were ignored.`); } warned = true; }
      continue;
    }
    if (item === "*" || /^[A-Za-z0-9][A-Za-z0-9:_-]{0,255}$/.test(item)) result.push(item);
  }
  return [...new Set(result)];
}

export function feishuLoginConfig(env: NodeJS.ProcessEnv = process.env): FeishuLoginConfig | null {
  const on = (value: string | undefined) => value === "1" || value?.toLowerCase() === "true";
  if (on(env.HOSTED_WORKSPACE) || on(env.CLOUD_TEAM) || on(env.CRYBOT_HOSTED_WORKSPACE) || env.CRYBOT_CLOUD_ROLE === "team") return null;
  const appId = env.CRYBOT_FEISHU_APP_ID?.trim();
  if (!appId) return null;
  const tenants = list(env.CRYBOT_FEISHU_TENANTS);
  if (!tenants.length) {
    if (!warnings.has("tenants")) { warnings.add("tenants"); console.warn("CRYBOT_FEISHU_APP_ID is set but CRYBOT_FEISHU_TENANTS is empty; Feishu sign-in is disabled."); }
    return null;
  }
  let appSecret = env.CRYBOT_FEISHU_APP_SECRET?.trim() ?? "";
  const secretFile = env.CRYBOT_FEISHU_APP_SECRET_FILE?.trim();
  if (secretFile) {
    try { appSecret = readFileSync(secretFile, "utf8").trim(); } catch { appSecret = ""; }
  }
  if (!appSecret) return null;
  const allow = identityList(env.CRYBOT_FEISHU_ALLOW, "CRYBOT_FEISHU_ALLOW");
  const admins = identityList(env.CRYBOT_FEISHU_ADMINS, "CRYBOT_FEISHU_ADMINS");
  if (!env.CRYBOT_FEISHU_ADMINS?.trim() && allow.includes("*") && !warnings.has("wildcard")) { console.warn("CRYBOT_FEISHU_ALLOW=* grants admin scope to every allowed tenant user when CRYBOT_FEISHU_ADMINS is unset."); warnings.add("wildcard"); }
  const max = Number(env.CRYBOT_FEISHU_SESSION_MAX_DAYS);
  const globalMax = Number(env.CRYBOT_SESSION_MAX_DAYS);
  const globalDays = Number.isInteger(globalMax) && globalMax >= 1 && globalMax <= MAX_SESSION_DAYS ? globalMax : 180;
  const sessionMaxDays = Math.min(Number.isInteger(max) && max >= 1 && max <= MAX_SESSION_DAYS ? max : 90, globalDays);
  return {
    appId,
    appSecret,
    tenants,
    allow,
    ...(env.CRYBOT_FEISHU_ADMINS?.trim() ? { admins } : {}),
    sessionMaxDays,
    tokenEndpoint: env.CRYBOT_FEISHU_TOKEN_ENDPOINT?.trim() || DEFAULT_TOKEN_ENDPOINT,
    ...(env.CRYBOT_FEISHU_USER_INFO_ENDPOINT?.trim() ? { userInfoEndpoint: env.CRYBOT_FEISHU_USER_INFO_ENDPOINT.trim() } : {}),
    ...(env.CRYBOT_APP_HOST?.trim() ? { appHost: env.CRYBOT_APP_HOST.trim() } : {}),
  };
}

export function createPkce(): { codeVerifier: string; codeChallenge: string; verifier: string; challenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge, verifier: codeVerifier, challenge: codeChallenge };
}

export function authorizeUrl(input: { config: FeishuLoginConfig; redirectUri: string; state: string; codeChallenge: string }): string {
  const url = new URL(FEISHU_AUTHORIZE_ENDPOINT);
  url.search = new URLSearchParams({ client_id: input.config.appId, response_type: "code", redirect_uri: input.redirectUri, state: input.state, code_challenge: input.codeChallenge, code_challenge_method: "S256", prompt: "consent" }).toString();
  return url.toString();
}

async function request(fetcher: typeof fetch, input: string | URL | Request, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, 10_000); });
  try { return await Promise.race([fetcher(input, { ...init, signal: controller.signal }), deadline]); }
  catch { throw new Error("Feishu request failed"); }
  finally { if (timeout) clearTimeout(timeout); }
}

export async function exchangeCode(input: { config: FeishuLoginConfig; code: string; codeVerifier: string; redirectUri: string; fetch?: typeof fetch }): Promise<{ userAccessToken: string }> {
  const form = new URLSearchParams({ grant_type: "authorization_code", client_id: input.config.appId, client_secret: input.config.appSecret, code: input.code, code_verifier: input.codeVerifier, redirect_uri: input.redirectUri });
  let response: Response;
  try { response = await request(input.fetch ?? fetch, input.config.tokenEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString() }); }
  catch { throw new Error("feishu_token_failed"); }
  if (!response.ok) throw new Error("feishu_token_failed");
  let body: any;
  try { body = await response.json(); } catch { throw new Error("feishu_token_failed"); }
  const token = typeof body?.access_token === "string" ? body.access_token : typeof body?.data?.access_token === "string" ? body.data.access_token : "";
  if (!token) throw new Error("feishu_token_failed");
  return { userAccessToken: token };
}

export async function fetchUserInfo(input: { userAccessToken: string; endpoint?: string; fetch?: typeof fetch }): Promise<FeishuUserInfo> {
  let response: Response;
  try { response = await request(input.fetch ?? fetch, input.endpoint ?? FEISHU_USER_INFO_ENDPOINT, { headers: { authorization: `Bearer ${input.userAccessToken}` } }); }
  catch { throw new Error("feishu_user_info_failed"); }
  if (!response.ok) throw new Error("feishu_user_info_failed");
  let body: any;
  try { body = await response.json(); } catch { throw new Error("feishu_user_info_failed"); }
  const data = body?.data ?? body;
  if (typeof data?.union_id !== "string" || typeof data?.tenant_key !== "string") throw new Error("feishu_user_info_failed");
  return { unionId: data.union_id, tenantKey: data.tenant_key, ...(typeof data.name === "string" ? { displayName: data.name } : {}), ...(typeof data.avatar_url === "string" ? { avatarUrl: data.avatar_url } : {}), ...(typeof data.email === "string" ? { accessEmail: data.email } : {}) };
}

export function feishuScopes(unionId: string, config: FeishuLoginConfig): FeishuScopes {
  const inAllow = config.allow.includes("*") || config.allow.includes(unionId);
  if (!config.admins) {
    return inAllow ? ["admin", "client"] : ["client"];
  }
  return config.admins.includes("*") || config.admins.includes(unionId) ? ["admin", "client"] : ["client"];
}

export function admitFeishuUser(info: FeishuUserInfo, config: FeishuLoginConfig): FeishuAdmission {
  const reason = !config.tenants.includes(info.tenantKey) ? "tenant is not allowed" : !(config.allow.includes("*") || config.allow.includes(info.unionId)) ? "user is not allowed" : null;
  if (reason) { console.warn(`Feishu sign-in denied union_id=${info.unionId} tenant_key=${info.tenantKey}: ${reason}`); return { denied: reason }; }
  return { identity: `feishu:${info.unionId}`, unionId: info.unionId, tenantKey: info.tenantKey, ...(info.displayName ? { displayName: info.displayName } : {}), ...(info.accessEmail ? { accessEmail: info.accessEmail } : {}), scopes: feishuScopes(info.unionId, config) };
}

export function allowedRedirectUris(config: FeishuLoginConfig, publicOrigin: string): string[] {
  const origin = config.appHost ? `https://${config.appHost}` : publicOrigin.replace(/\/$/, "");
  return [`${origin}/auth/feishu/callback`, `${origin}/auth/feishu/app-return`];
}
