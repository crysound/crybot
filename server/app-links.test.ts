import type { IncomingHttpHeaders } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appLinkOrigin, createAppLinks } from "./app-links.ts";
import { memoryHttp } from "./testing/memory-http.ts";

const aasaPath = "/.well-known/apple-app-site-association";
const assetlinksPath = "/.well-known/assetlinks.json";
const returnPath = "/auth/app-return";
const fingerprint = Array(32).fill("AA").join(":");
const env = {
  CRYBOT_APP_LINK_ORIGIN: "https://crybot-app.example.com",
  CRYBOT_APP_HOST: "crybot-app.example.com",
  CRYBOT_FEISHU_APP_ID: "cli_example",
  CRYBOT_APPLE_APP_IDS: "ABCDE12345.com.example.app",
  CRYBOT_ANDROID_PACKAGE: "com.example.app",
  CRYBOT_ANDROID_CERT_SHA256: fingerprint,
};
const aasa = {
  applinks: { details: [{ appIDs: ["ABCDE12345.com.example.app"], components: [{ "/": returnPath, comment: "Cry Bot login return" }, { "/": "/auth/feishu/app-return", comment: "Cry Bot Feishu login return" }] }] },
  webcredentials: { apps: ["ABCDE12345.com.example.app"] },
};
const assetlinks = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: { namespace: "android_app", package_name: "com.example.app", sha256_cert_fingerprints: [fingerprint] },
}];

function fixture(config: NodeJS.ProcessEnv = {}) {
  const handler = createAppLinks(config);
  return (path: string, headers: IncomingHttpHeaders = {}, method = "GET") => memoryHttp(async (req, res) => {
    if (!handler(req, res, new URL(req.url!, "https://crybot-app.example.com"))) res.writeHead(418).end();
  }, path, method, { ...(config.CRYBOT_APP_HOST ? { host: config.CRYBOT_APP_HOST } : {}), ...headers });
}

function returnTargets(body: string) {
  const href = /href="([^"]*)"/.exec(body)?.[1];
  expect(href).toBeDefined();
  const scriptTarget = /location\.replace\(("(?:\\.|[^"\\])*")\);/.exec(body)?.[1];
  expect(scriptTarget).toBeDefined();
  return {
    href: href!.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&"),
    script: JSON.parse(scriptTarget!),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("app link public routes", () => {
  it.each([aasaPath, assetlinksPath, returnPath])("returns 404 without configuration: %s", async path => {
    expect((await fixture()(path)).status).toBe(404);
  });

  it.each([[aasaPath, aasa], [assetlinksPath, assetlinks]] as const)("serves association JSON without redirects: %s", async (path, expected) => {
    const response = await fixture(env)(path);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(response.headers.location).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(await response.json()).toEqual(expected);
  });

  it("discards invalid Apple IDs and retains all valid IDs", async () => {
    const response = await fixture({ CRYBOT_APPLE_APP_IDS: "invalid, abcde12345.com.example.app, ABCDE12345.com.example.app, ABCDE12345.com.example.other, ABCDE1234.com.example.app, ABCDE12345.com_example" })(aasaPath);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      applinks: { details: [{ appIDs: ["ABCDE12345.com.example.app", "ABCDE12345.com.example.other"], components: [{ "/": returnPath, comment: "Cry Bot login return" }, { "/": "/auth/feishu/app-return", comment: "Cry Bot Feishu login return" }] }] },
      webcredentials: { apps: ["ABCDE12345.com.example.app", "ABCDE12345.com.example.other"] },
    });
    expect((await fixture({ CRYBOT_APP_HOST: "crybot-app.example.com", CRYBOT_APPLE_APP_IDS: "invalid,abcde12345.com.example.app" })(aasaPath, { host: "crybot-app.example.com" })).status).toBe(404);
  });

  it.each(["", "app", "1com.example", "com.1example", "com.example-app", "com.example.app\n"])("rejects invalid Android package %j", async value => {
    expect((await fixture({ ...env, CRYBOT_ANDROID_PACKAGE: value })(assetlinksPath)).status).toBe(404);
  });

  it.each(["", "AA", "AA:".repeat(32), "GG:".repeat(31) + "GG", "A:".repeat(31) + "A"])("rejects invalid Android fingerprint %j", async value => {
    expect((await fixture({ ...env, CRYBOT_ANDROID_CERT_SHA256: value })(assetlinksPath)).status).toBe(404);
  });

  it.each([fingerprint.toLowerCase(), "aa".repeat(32), "AA".repeat(32)])("normalizes fingerprints and drops invalid entries: %s", async value => {
    const response = await fixture({ ...env, CRYBOT_ANDROID_CERT_SHA256: `invalid, ${value}, AA:BB` })(assetlinksPath);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(assetlinks);
  });

  it("retains multiple valid signing fingerprints", async () => {
    const second = Array(32).fill("BB").join(":");
    const response = await fixture({ ...env, CRYBOT_ANDROID_CERT_SHA256: `${fingerprint},${second}` })(assetlinksPath);
    expect(await response.json()).toEqual([{ ...assetlinks[0], target: { ...assetlinks[0].target, sha256_cert_fingerprints: [fingerprint, second] } }]);
  });

  it.each([
    [undefined, "en", "Returning to the Cry Bot App…"],
    ["zh-CN,en;q=0.5", "zh-Hans", "正在返回 Cry Bot App……"],
    ["zh;q=0.2,en;q=0.9", "en", "Returning to the Cry Bot App…"],
  ])("serves a localized fallback with the original parameters in %s", async (language, lang, message) => {
    const query = new URLSearchParams({ state: "private-state", ct: '<script>alert("secret")</script>' });
    const response = await fixture(env)(`${returnPath}?${query}`, { "accept-language": language, host: "crybot-app.example.com" });
    expect(response.status).toBe(200);
    expect(response.body).toContain(`<html lang="${lang}">`);
    expect(response.body).toContain(`<p>${message}</p>`);
    expect(response.body).toContain("href=\"crybot://auth?");
    expect(response.body).toContain("location.replace(\"crybot://auth?");
    expect(response.body.match(/<script/g)?.length).toBe(1);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(response.headers.location).toBeUndefined();
  });

  it("keeps app-return on the configured host and forwards its raw query", async () => {
    const query = "v=1&state=//evil.example.com&epk=key%2Bvalue&iv=nonce&ct=cipher%2Ftext&x=https://evil.example.com&js=javascript:&quote=\"&tag=<script>";
    const response = await fixture(env)(`${returnPath}?${query}`, { host: "other.example.com" });
    expect(response.status).toBe(404);
    const page = await fixture(env)(`${returnPath}?${query}`, { host: "crybot-app.example.com" });
    expect(page.status).toBe(200);
    expect(returnTargets(page.body)).toEqual({ href: `crybot://auth?${query}`, script: `crybot://auth?${query}` });
    expect(page.body.match(/<script/g)).toHaveLength(1);
    expect(page.headers["content-security-policy"]).toContain("script-src 'sha256-");
  });

  it("serves the Feishu fallback with only selected encoded parameters", async () => {
    const selected = new URLSearchParams({ code: 'a&b"', state: '//evil.example.com https://evil.example.com javascript: <script>', error: "access_denied" });
    const response = await fixture(env)(`/auth/feishu/app-return?${selected}&extra=drop`, { host: "crybot-app.example.com" });
    expect(response.status).toBe(200);
    const target = `crybot://feishu?${selected}`;
    expect(returnTargets(response.body)).toEqual({ href: target, script: target });
    expect(response.body.match(/<script/g)).toHaveLength(1);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["content-security-policy"]).toContain("script-src 'sha256-");
  });

  it("returns Feishu fallback 404 when the app is not configured", async () => {
    expect((await fixture({ ...env, CRYBOT_FEISHU_APP_ID: "" })("/auth/feishu/app-return", { host: "crybot-app.example.com" })).status).toBe(404);
  });

  it.each(["http://crybot-app.example.com", "https://crybot-app.example.com/path", "https://crybot-app.example.com?query", "https://crybot-app.example.com/#fragment", "https://user@crybot-app.example.com", "invalid", "https://crybot-app.example.com//"])("ignores invalid origins and warns once at initialization: %s", async value => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const get = fixture({ CRYBOT_APP_LINK_ORIGIN: value });
    expect(warn).toHaveBeenCalledExactlyOnceWith("Invalid CRYBOT_APP_LINK_ORIGIN; app link returns are disabled");
    expect((await get(returnPath)).status).toBe(404);
    expect((await get(returnPath)).status).toBe(404);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each(["https://crybot-app.example.com", "https://crybot-app.example.com/"])("accepts default-port HTTPS origins without warnings: %s", async value => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await fixture({ CRYBOT_APP_LINK_ORIGIN: value })(returnPath)).status).toBe(200);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once at initialization for a non-443 origin while retaining its return URL", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = { CRYBOT_APP_LINK_ORIGIN: "https://crybot-app.example.com:8443/" };
    expect(appLinkOrigin(config)).toBe("https://crybot-app.example.com:8443");
    const get = fixture(config);
    expect(warn).toHaveBeenCalledExactlyOnceWith("CRYBOT_APP_LINK_ORIGIN uses a non-443 port; Associated Domains and App Links require default HTTPS port 443");
    expect((await get(returnPath)).status).toBe(200);
    expect((await get(returnPath)).status).toBe(200);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ CRYBOT_APP_HOST: "app.example.com" }, "https://app.example.com"],
    [{ CRYBOT_APP_LINK_ORIGIN: "https://legacy.example.com" }, "https://legacy.example.com"],
    [{ CRYBOT_APP_HOST: "app.example.com", CRYBOT_APP_LINK_ORIGIN: "https://legacy.example.com" }, "https://legacy.example.com"],
  ])("resolves the app return origin for %j", async (config, expected) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(appLinkOrigin(config)).toBe(expected);
    const get = fixture({ ...config, CRYBOT_FEISHU_APP_ID: "cli_example" });
    expect((await get(returnPath)).status).toBe(200);
    expect((await get("/auth/feishu/app-return")).status).toBe(200);
    const mismatch = "CRYBOT_APP_HOST" in config && "CRYBOT_APP_LINK_ORIGIN" in config;
    expect(warn).toHaveBeenCalledTimes(mismatch ? 1 : 0);
    if (mismatch) expect(warn).toHaveBeenCalledWith("CRYBOT_APP_LINK_ORIGIN host differs from CRYBOT_APP_HOST; app return links may not reach the app host");
  });

  it("does not warn when the origin is absent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fixture();
    expect(warn).not.toHaveBeenCalled();
  });

  it("leaves other paths and non-GET requests to the server", async () => {
    const get = fixture(env);
    expect((await get("/auth/app-handoff")).status).toBe(418);
    for (const path of [aasaPath, assetlinksPath, returnPath]) expect((await get(path, {}, "POST")).status).toBe(418);
  });
});
