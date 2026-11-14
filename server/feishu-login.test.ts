import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { admitFeishuUser, allowedRedirectUris, authorizeUrl, createPkce, exchangeCode, feishuLoginConfig, feishuScopes, fetchUserInfo, resetFeishuLoginWarningsForTests } from "./feishu-login.ts";

const env = (extra: NodeJS.ProcessEnv = {}) => ({ CRYBOT_FEISHU_APP_ID: "cli_example", CRYBOT_FEISHU_APP_SECRET: "secret_example", CRYBOT_FEISHU_TENANTS: "tenant_example", CRYBOT_FEISHU_ALLOW: "union_example", ...extra });

describe("Feishu login", () => {
  beforeEach(() => resetFeishuLoginWarningsForTests());
  afterEach(() => vi.restoreAllMocks());

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

  it.each([
    ["non-2xx", async () => new Response(JSON.stringify({ code: 20013 }), { status: 400 }), "feishu_code_invalid"],
    ["server failure", async () => new Response(JSON.stringify({ code: 20013 }), { status: 503 }), "feishu_unavailable"],
    ["bad JSON", async () => new Response("not json", { status: 200 }), "feishu_code_invalid"],
    ["missing token", async () => new Response(JSON.stringify({}), { status: 200 }), "feishu_code_invalid"],
  ] as const)("classifies token %s", async (_name, fetcher, error) => {
    await expect(exchangeCode({ config: feishuLoginConfig(env())!, code: "code_example", codeVerifier: "verifier_example", redirectUri: "https://example.com/auth/feishu/app-return", fetch: fetcher as typeof fetch })).rejects.toThrow(error);
  });

  it("classifies a token request failure and timeout as unavailable", async () => {
    await expect(exchangeCode({ config: feishuLoginConfig(env())!, code: "code_example", codeVerifier: "verifier_example", redirectUri: "https://example.com/auth/feishu/app-return", fetch: vi.fn(async () => { throw new Error("offline"); }) as typeof fetch })).rejects.toThrow("feishu_unavailable");
    vi.useFakeTimers();
    try {
      const pending = exchangeCode({ config: feishuLoginConfig(env())!, code: "code_example", codeVerifier: "verifier_example", redirectUri: "https://example.com/auth/feishu/app-return", fetch: vi.fn(() => new Promise<Response>(() => {})) as typeof fetch });
      const assertion = expect(pending).rejects.toThrow("feishu_unavailable");
      await vi.advanceTimersByTimeAsync(10_001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies tenant and union allow lists and scope rules", () => {
    const config = feishuLoginConfig(env())!;
    expect(admitFeishuUser({ unionId: "union_example", tenantKey: "tenant_example" }, config)).toMatchObject({ identity: "feishu:union_example", scopes: ["admin", "client"] });
    expect(admitFeishuUser({ unionId: "other", tenantKey: "tenant_example" }, config)).toEqual({ denied: "user is not allowed" });
    const admins = feishuLoginConfig(env({ CRYBOT_FEISHU_ADMINS: "admin_example" }))!;
    expect(feishuScopes("union_example", admins)).toEqual(["client"]);
    expect(feishuScopes("admin_example", admins)).toEqual(["admin", "client"]);
    expect(feishuScopes("any_union", feishuLoginConfig(env({ CRYBOT_FEISHU_ALLOW: "*" }))!)).toEqual(["admin", "client"]);
    expect(feishuScopes("any_union", feishuLoginConfig(env({ CRYBOT_FEISHU_ALLOW: "*", CRYBOT_FEISHU_ADMINS: "*" }))!)).toEqual(["admin", "client"]);
    expect(feishuScopes("other", feishuLoginConfig(env({ CRYBOT_FEISHU_ALLOW: "*", CRYBOT_FEISHU_ADMINS: "admin_example" }))!)).toEqual(["client"]);
    expect(allowedRedirectUris(config, "https://example.com")).toEqual(["https://example.com/auth/feishu/callback", "https://example.com/auth/feishu/app-return"]);
  });

  it("rejects a tenant and logs only operational identity fields", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = admitFeishuUser({ unionId: "union_denied", tenantKey: "tenant_denied" }, feishuLoginConfig(env())!);
    expect(result).toEqual({ denied: "tenant is not allowed" });
    expect(warn.mock.calls.flat().join(" ")).toContain("union_denied");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("code_example");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("secret_example");
  });

  it("ignores email entries in ALLOW and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = feishuLoginConfig(env({ CRYBOT_FEISHU_ALLOW: "person@example.com,union_example" }))!;
    expect(config.allow).toEqual(["union_example"]);
    expect(warn.mock.calls.flat().join(" ")).toContain("CRYBOT_FEISHU_ALLOW");
  });

  it("disables incomplete and managed environments, and prefers the secret file", () => {
    expect(feishuLoginConfig(env({ CRYBOT_FEISHU_TENANTS: "" }))).toBeNull();
    expect(feishuLoginConfig(env({ HOSTED_WORKSPACE: "1" }))).toBeNull();
    expect(feishuLoginConfig(env({ CLOUD_TEAM: "true" }))).toBeNull();
    const directory = mkdtempSync(join(tmpdir(), "cry-feishu-secret-"));
    const path = join(directory, "secret");
    writeFileSync(path, "file_secret_example\n");
    expect(feishuLoginConfig(env({ CRYBOT_FEISHU_APP_SECRET: "direct_secret_example", CRYBOT_FEISHU_APP_SECRET_FILE: path }))?.appSecret).toBe("file_secret_example");
    rmSync(directory, { recursive: true, force: true });
  });

  it("warns once when the configured secret is unavailable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(feishuLoginConfig(env({ CRYBOT_FEISHU_APP_SECRET: "" }))).toBeNull();
    expect(feishuLoginConfig(env({ CRYBOT_FEISHU_APP_SECRET: "" }))).toBeNull();
    const directory = mkdtempSync(join(tmpdir(), "cry-feishu-empty-secret-"));
    const emptyFile = join(directory, "secret");
    writeFileSync(emptyFile, "");
    expect(feishuLoginConfig(env({ CRYBOT_FEISHU_APP_SECRET_FILE: emptyFile }))).toBeNull();
    const messages = warn.mock.calls.flat().join(" ");
    expect(messages).toContain("CRYBOT_FEISHU_APP_SECRET");
    expect(messages).toContain(emptyFile);
    expect(warn.mock.calls.filter(([message]) => String(message).includes("CRYBOT_FEISHU_APP_SECRET is empty")).length).toBe(1);
    rmSync(directory, { recursive: true, force: true });
  });

  it("reads user info without exposing bearer failures", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ authorization: "Bearer token_example" });
      return new Response(JSON.stringify({ data: { union_id: "union_example", tenant_key: "tenant_example", name: "Example" } }), { status: 200 });
    });
    await expect(fetchUserInfo({ userAccessToken: "token_example", fetch: fetcher as typeof fetch })).resolves.toMatchObject({ unionId: "union_example", tenantKey: "tenant_example" });
  });
});
