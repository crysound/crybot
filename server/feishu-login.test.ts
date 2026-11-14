import { describe, expect, it, vi } from "vitest";
import { admitFeishuUser, allowedRedirectUris, authorizeUrl, createPkce, exchangeCode, feishuLoginConfig, feishuScopes, fetchUserInfo } from "./feishu-login.ts";

const env = (extra: NodeJS.ProcessEnv = {}) => ({ CRYBOT_FEISHU_APP_ID: "cli_example", CRYBOT_FEISHU_APP_SECRET: "secret_example", CRYBOT_FEISHU_TENANTS: "tenant_example", CRYBOT_FEISHU_ALLOW: "union_example", ...extra });

describe("Feishu login", () => {
  it("builds S256 PKCE authorization URLs", () => {
    const config = feishuLoginConfig(env())!;
    const pkce = createPkce();
    expect(pkce.codeVerifier).toHaveLength(43);
    const url = new URL(authorizeUrl({ config, redirectUri: "https://example.com/auth/feishu/app-return", state: "state_example", codeChallenge: pkce.codeChallenge }));
    expect(url.searchParams.get("client_id")).toBe("cli_example");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("uses form encoding and keeps the secret out of failures", async () => {
    const config = feishuLoginConfig(env())!;
    let request: RequestInit | undefined;
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => { request = init; return new Response(JSON.stringify({ access_token: "token_example" }), { status: 200 }); });
    const result = await exchangeCode({ config, code: "code_example", codeVerifier: "verifier_example", redirectUri: "https://example.com/auth/feishu/app-return", fetch: fetcher as typeof fetch });
    expect(result).toEqual({ userAccessToken: "token_example" });
    expect(request?.headers).toMatchObject({ "content-type": "application/x-www-form-urlencoded" });
    expect(String(request?.body)).toContain("client_secret=secret_example");
    expect(String(request?.body)).not.toContain("secret_example%0A");
  });

  it("applies tenant and union allow lists and scope rules", () => {
    const config = feishuLoginConfig(env())!;
    expect(admitFeishuUser({ unionId: "union_example", tenantKey: "tenant_example" }, config)).toMatchObject({ identity: "feishu:union_example", scopes: ["admin", "client"] });
    expect(admitFeishuUser({ unionId: "other", tenantKey: "tenant_example" }, config)).toEqual({ denied: "user is not allowed" });
    const admins = feishuLoginConfig(env({ CRYBOT_FEISHU_ADMINS: "admin_example" }))!;
    expect(feishuScopes("union_example", admins)).toEqual(["client"]);
    expect(feishuScopes("admin_example", admins)).toEqual(["admin", "client"]);
    expect(allowedRedirectUris(config, "https://example.com")).toEqual(["https://example.com/auth/feishu/callback", "https://example.com/auth/feishu/app-return"]);
  });

  it("reads user info without exposing bearer failures", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: { union_id: "union_example", tenant_key: "tenant_example", name: "Example" } }), { status: 200 }));
    await expect(fetchUserInfo({ userAccessToken: "token_example", fetch: fetcher as typeof fetch })).resolves.toMatchObject({ unionId: "union_example", tenantKey: "tenant_example" });
  });
});
