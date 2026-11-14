import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type { SessionRegistry } from "./sessions.ts";

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

export function resetFeishuLoginWarningsForTests(): void {
  warnings.clear();
}

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
    try {
      appSecret = readFileSync(secretFile, "utf8").trim();
    } catch {
      appSecret = "";
      const key = `secret-file:${secretFile}`;
      if (!warnings.has(key)) {
        warnings.add(key);
        console.warn(`CRYBOT_FEISHU_APP_SECRET_FILE could not be read: ${secretFile}`);
      }
    }
  }
  if (!appSecret) {
    const warningKey = secretFile ? `secret-empty-file:${secretFile}` : "secret-value";
    if (!warnings.has(warningKey)) {
      warnings.add(warningKey);
      console.warn(secretFile ? `CRYBOT_FEISHU_APP_SECRET_FILE is empty: ${secretFile}` : "CRYBOT_FEISHU_APP_SECRET is empty; Feishu sign-in is disabled.");
    }
    return null;
  }
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

type FeishuRequestFailure = "unavailable" | "invalid";

class FeishuRequestError extends Error {
  readonly failure: FeishuRequestFailure;

  constructor(failure: FeishuRequestFailure) {
    super(failure === "unavailable" ? "feishu_unavailable" : "feishu_code_invalid");
    this.failure = failure;
  }
}

async function requestJson(fetcher: typeof fetch, input: string | URL | Request, init: RequestInit): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, 10_000); });
  try {
    const response = await Promise.race([fetcher(input, { ...init, signal: controller.signal }), deadline]);
    if (response.status >= 500) return { response, body: undefined };
    let body: unknown;
    try {
      body = await Promise.race([response.json(), deadline]);
    } catch (error) {
      throw new FeishuRequestError(error instanceof SyntaxError ? "invalid" : "unavailable");
    }
    return { response, body };
  } catch (error) {
    if (error instanceof FeishuRequestError) throw error;
    throw new FeishuRequestError("unavailable");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function exchangeCode(input: { config: FeishuLoginConfig; code: string; codeVerifier: string; redirectUri: string; fetch?: typeof fetch }): Promise<{ userAccessToken: string }> {
  const form = new URLSearchParams({ grant_type: "authorization_code", client_id: input.config.appId, client_secret: input.config.appSecret, code: input.code, code_verifier: input.codeVerifier, redirect_uri: input.redirectUri });
  const result = await requestJson(input.fetch ?? fetch, input.config.tokenEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString() });
  if (result.response.status >= 500) throw new FeishuRequestError("unavailable");
  if (!result.response.ok) throw new FeishuRequestError("invalid");
  const body: any = result.body;
  const token = typeof body?.access_token === "string" ? body.access_token : typeof body?.data?.access_token === "string" ? body.data.access_token : "";
  if (!token) throw new FeishuRequestError("invalid");
  return { userAccessToken: token };
}

export async function fetchUserInfo(input: { userAccessToken: string; endpoint?: string; fetch?: typeof fetch }): Promise<FeishuUserInfo> {
  const result = await requestJson(input.fetch ?? fetch, input.endpoint ?? FEISHU_USER_INFO_ENDPOINT, { headers: { authorization: `Bearer ${input.userAccessToken}` } });
  if (result.response.status >= 500) throw new FeishuRequestError("unavailable");
  if (!result.response.ok) throw new FeishuRequestError("invalid");
  const body: any = result.body;
  const data = body?.data ?? body;
  if (typeof data?.union_id !== "string" || typeof data?.tenant_key !== "string") throw new FeishuRequestError("invalid");
  return { unionId: data.union_id, tenantKey: data.tenant_key, ...(typeof data.name === "string" ? { displayName: data.name } : {}), ...(typeof data.avatar_url === "string" ? { avatarUrl: data.avatar_url } : {}), ...(typeof data.email === "string" ? { accessEmail: data.email } : {}) };
}

export function feishuScopes(unionId: string, config: FeishuLoginConfig): FeishuScopes {
  const inAllow = config.allow.includes("*") || config.allow.includes(unionId);
  if (!config.admins) {
    return inAllow ? ["admin", "client"] : ["client"];
  }
  return config.admins.includes("*") || config.admins.includes(unionId) ? ["admin", "client"] : ["client"];
}

export function revalidateFeishuDeviceSessions(sessions: SessionRegistry, config: FeishuLoginConfig | null): void {
  const revoked = sessions.revalidateFeishuSessions((unionId, tenantKey) => {
    if (!config) return null;
    const allowedTenant = tenantKey !== undefined && config.tenants.includes(tenantKey);
    const allowedUser = config.allow.includes("*") || config.allow.includes(unionId);
    return allowedTenant && allowedUser ? feishuScopes(unionId, config) : null;
  });
  console.log(`Feishu device session revalidation: revoked ${revoked}.`);
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
