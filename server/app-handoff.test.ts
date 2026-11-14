import { createDecipheriv, createECDH, hkdfSync, webcrypto } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRemoteJWKSet, customFetch, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAppHandoff, encryptAppHandoff } from "./app-handoff.ts";
import { createCfAccess } from "./cf-access.ts";
import { SessionRegistry } from "./sessions.ts";
import { memoryHttp } from "./testing/memory-http.ts";

const env = {
  CRYBOT_CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.example",
  CRYBOT_CF_ACCESS_AUD: "test-audience",
  CRYBOT_CF_ACCESS_ALLOW: "owner@crybot.example",
};
const state = "aB_9-".repeat(8);
const appKey = createECDH("prime256v1");
appKey.generateKeys();
const pk = appKey.getPublicKey().toString("base64url");
const path = `/auth/app-handoff?state=${state}&pk=${pk}`;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let wrongKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwks: object;
const directories: string[] = [];

const protocolVector = {
  appPrivateKeyHex: "0000000000000000000000000000000000000000000000000000000000000001",
  serverPrivateKeyHex: "0000000000000000000000000000000000000000000000000000000000000002",
  nonceHex: "000102030405060708090a0b",
  token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjIwMDAwMDAwMDAsInN1YiI6ImZpeHR1cmUifQ.Zml4dHVyZQ",
  pk: "BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLeszoPShOUXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU",
  sharedSecretHex: "7cf27b188d034f7e8a52380304b51ac3c08969e277f21b35a60b48fc47669978",
  aesKeyHex: "62371f9a481805df9fe05add01129e05ec0b298aca29520bbfa5af84e7c11ea8",
  callback: {
    v: "1",
    state: "0123456789abcdef0123456789abcdef",
    epk: "BHzyexiNA09-ilI4AwS1GsPAiWnid_IbNaYLSPxHZpl4B3dVENuO0EApPZrGn3Qw27p9reY86YIpngS3nSJ4c9E",
    iv: "AAECAwQFBgcICQoL",
    ct: "i7QqZAHkzgavssRt-d1cKJ7XAsIDcf3qMgDw0YHJtqlR7x7e0c-Zv29sSKnAecgqYTlVeAlizFsdMVRa4b7Mco2dWj8Hi2KdcGxEyT_49Z430ZMM5f9hlplDDaXCCQ",
  },
};

beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  wrongKeys = await generateKeyPair("RS256");
  jwks = { keys: [{ ...await exportJWK(keys.publicKey), kid: "fixture", alg: "RS256" }] };
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function jwt(options: { email?: string | null; sub?: string | null; aud?: string; iss?: string; exp?: number | null; wrong?: boolean } = {}) {
  const claims = {
    ...(options.email === null ? {} : { email: options.email ?? "OWNER@CRYBOT.EXAMPLE" }),
    ...(options.sub === null ? {} : { sub: options.sub ?? "fixture-subject" }),
    ...(options.exp === null ? {} : { exp: options.exp ?? Math.floor(Date.now() / 1000) + 300 }),
  };
  return new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "fixture" })
    .setIssuer(options.iss ?? "https://team.cloudflareaccess.example")
    .setAudience(options.aud ?? "test-audience")
    .sign(options.wrong ? wrongKeys.privateKey : keys.privateKey);
}

function fixture(config: NodeJS.ProcessEnv = env) {
  const directory = mkdtempSync(join(tmpdir(), "crybot-app-handoff-"));
  directories.push(directory);
  const sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  const keySet = createRemoteJWKSet(new URL("https://team.cloudflareaccess.example/cdn-cgi/access/certs"), {
    [customFetch]: async () => new Response(JSON.stringify(jwks)),
  });
  const access = createCfAccess(config, keySet);
  const handoff = createAppHandoff(access !== null, config, keySet);
  return {
    sessions,
    get: (headers: IncomingHttpHeaders = {}, target = path) => memoryHttp(async (req, res) => {
      const url = new URL(req.url!, "https://crybot.example");
      await handoff(req, res, url);
    }, target, "GET", headers),
    authenticate: (headers: IncomingHttpHeaders) => memoryHttp(async (req, res) => {
      await access?.(req, res, new URL(req.url!, "https://crybot.example"), sessions, "cry_session_fixture");
      res.end();
    }, "/", "GET", headers),
  };
}

function callbackURL(html: string): URL {
  const href = html.match(/href="([^"]+)"/)?.[1];
  expect(href).toBeDefined();
  return new URL(href!.replaceAll("&amp;", "&"));
}

function decryptCallback(url: URL, privateKey = appKey, aad = url.searchParams.get("state")!) {
  const param = (name: string) => Buffer.from(url.searchParams.get(name)!, "base64url");
  const secret = privateKey.computeSecret(param("epk"));
  const key = hkdfSync("sha256", secret, Buffer.from(url.searchParams.get("state")!, "utf8"), "crybot-app-handoff-v1", 32);
  const encrypted = param("ct");
  const decipher = createDecipheriv("aes-256-gcm", key, param("iv"), { authTagLength: 16 });
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(encrypted.subarray(-16));
  return Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString("utf8");
}

describe("mobile app login handoff", () => {
  it("matches the platform-independent v1 vector and decrypts with WebCrypto", async () => {
    const vector = protocolVector;
    const client = createECDH("prime256v1");
    client.setPrivateKey(Buffer.from(vector.appPrivateKeyHex, "hex"));
    expect(client.getPublicKey().toString("base64url")).toBe(vector.pk);
    expect(encryptAppHandoff(vector.token, vector.callback.state, client.getPublicKey(), {
      privateKey: Buffer.from(vector.serverPrivateKeyHex, "hex"), nonce: Buffer.from(vector.nonceHex, "hex"),
    })).toEqual(vector.callback);

    const subtle = webcrypto.subtle;
    const publicBytes = Buffer.from(vector.pk, "base64url");
    const privateKey = await subtle.importKey("jwk", {
      kty: "EC", crv: "P-256",
      x: publicBytes.subarray(1, 33).toString("base64url"), y: publicBytes.subarray(33).toString("base64url"),
      d: Buffer.from(vector.appPrivateKeyHex, "hex").toString("base64url"),
    }, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
    const serverKey = await subtle.importKey("raw", Buffer.from(vector.callback.epk, "base64url"), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const secret = await subtle.deriveBits({ name: "ECDH", public: serverKey }, privateKey, 256);
    expect(Buffer.from(secret).toString("hex")).toBe(vector.sharedSecretHex);
    const hkdfKey = await subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
    const stateBytes = Buffer.from(vector.callback.state, "utf8");
    const key = await subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: stateBytes, info: Buffer.from("crybot-app-handoff-v1") },
      hkdfKey, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
    expect(Buffer.from(await subtle.exportKey("raw", key)).toString("hex")).toBe(vector.aesKeyHex);
    const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(vector.callback.iv, "base64url"), additionalData: stateBytes, tagLength: 128 },
      key, Buffer.from(vector.callback.ct, "base64url"));
    expect(Buffer.from(plaintext).toString("utf8")).toBe(vector.token);
  });

  it("returns 404 when Access is disabled, even with a valid token", async () => {
    expect((await fixture({}).get({ "cf-access-jwt-assertion": await jwt() })).status).toBe(404);
  });

  it.each([null, "", "a".repeat(31), "a".repeat(129), "a".repeat(31) + "/", "a".repeat(32) + "\n", '<script>alert("x")</script>'])("rejects invalid state %j", async value => {
    const query = new URLSearchParams({ pk });
    if (value !== null) query.set("state", value);
    const target = `/auth/app-handoff?${query}`;
    const result = await fixture().get({ "cf-access-jwt-assertion": await jwt() }, target);
    expect(result.status).toBe(400);
    expect(result.body).toBe("");
  });

  it("rejects duplicate state parameters", async () => {
    expect((await fixture().get({}, `${path}&state=${state}`)).status).toBe(400);
  });

  it.each([
    null, "", "invalid", `${pk}=`, pk + "\n", pk.slice(0, -1),
    appKey.getPublicKey(undefined, "compressed").toString("base64url"),
    Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"),
    Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 255)]).toString("base64url"),
    Buffer.concat([Buffer.from([5]), appKey.getPublicKey().subarray(1)]).toString("base64url"),
  ])("rejects missing, malformed or off-curve public keys %j", async value => {
    const query = new URLSearchParams({ state });
    if (value !== null) query.set("pk", value);
    const result = await fixture().get({ "cf-access-jwt-assertion": await jwt() }, `/auth/app-handoff?${query}`);
    expect(result.status).toBe(400);
    expect(result.body).toBe("");
  });

  it("rejects duplicate public keys", async () => {
    expect((await fixture().get({ "cf-access-jwt-assertion": await jwt() }, `${path}&pk=${pk}`)).status).toBe(400);
  });

  it.each([32, 128])("accepts a state of length %i", async length => {
    expect((await fixture().get({ "cf-access-jwt-assertion": await jwt() }, `/auth/app-handoff?state=${"x".repeat(length)}&pk=${pk}`)).status).toBe(200);
  });

  it.each([{}, { "cf-access-jwt-assertion": "invalid" }, { cookie: "CF_Authorization=invalid" }, { "cf-access-jwt-assertion": ["one", "two"] }])("rejects missing or malformed tokens %j", async headers => {
    expect((await fixture().get(headers)).status).toBe(401);
  });

  it.each([
    { wrong: true }, { aud: "other-audience" }, { iss: "https://other.cloudflareaccess.example" },
    { email: "guest@crybot.example" }, { email: null }, { exp: null }, { exp: 1 },
  ])("revalidates JWT signature, issuer, audience, expiry and allowlist %j", async options => {
    const response = await fixture().get({ "cf-access-jwt-assertion": await jwt(options) });
    expect(response.status).toBe(401);
    expect(response.body).toBe("");
  });

  it("requires at least sixty seconds of remaining validity", async () => {
    const now = Math.floor(Date.now() / 1000);
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    const f = fixture();
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ exp: now + 59 }) })).status).toBe(401);
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ exp: now + 60 }) })).status).toBe(200);
  });

  it("returns an escaped automatic callback and a matching manual link without scripts", async () => {
    const token = await jwt();
    const result = await fixture().get({ "cf-access-jwt-assertion": token });
    const url = callbackURL(result.body);
    const callback = url.href.replaceAll("&", "&amp;");
    expect(url.protocol).toBe("crybot:");
    expect(url.host).toBe("auth");
    expect([...url.searchParams.keys()]).toEqual(["v", "state", "epk", "iv", "ct"]);
    expect(url.searchParams.get("v")).toBe("1");
    expect(url.searchParams.get("state")).toBe(state);
    expect(Buffer.from(url.searchParams.get("epk")!, "base64url")).toHaveLength(65);
    expect(Buffer.from(url.searchParams.get("iv")!, "base64url")).toHaveLength(12);
    expect(Buffer.from(url.searchParams.get("ct")!, "base64url")).toHaveLength(Buffer.byteLength(token) + 16);
    expect(decryptCallback(url)).toBe(token);
    expect(url.href).not.toContain(token);
    expect(result.body).not.toContain(token);
    expect(result.body).not.toContain("token=");
    expect(result.status).toBe(200);
    expect(result.body).toContain(`<meta http-equiv="refresh" content="0;url=${callback}">`);
    expect(result.body).toContain(`<a role="button" href="${callback}">Return to Cry Bot</a>`);
    expect(result.body).not.toContain(`&token=${token}`);
    expect(result.body).not.toContain("<script");
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["referrer-policy"]).toBe("no-referrer");
    expect(result.headers["x-frame-options"]).toBe("DENY");
    expect(result.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(result.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    expect(result.headers.location).toBeUndefined();
  });

  it("uses the Access cookie only when the assertion header is absent", async () => {
    const token = await jwt();
    const cookieToken = await jwt({ sub: "cookie-subject" });
    const f = fixture();
    const cookie = `unrelated=value; CF_Authorization=${cookieToken}`;
    expect(decryptCallback(callbackURL((await f.get({ cookie })).body))).toBe(cookieToken);
    expect(decryptCallback(callbackURL((await f.get({ cookie, "cf-access-jwt-assertion": token })).body))).toBe(token);
    expect((await f.get({ cookie, "cf-access-jwt-assertion": "invalid" })).status).toBe(401);
    expect((await f.get({ cookie, "cf-access-jwt-assertion": "" })).status).toBe(401);
  });

  it("cannot be decrypted by a different app private key", async () => {
    const other = createECDH("prime256v1");
    other.generateKeys();
    const url = callbackURL((await fixture().get({ "cf-access-jwt-assertion": await jwt() })).body);
    expect(() => decryptCallback(url, other)).toThrow();
  });

  it("authenticates state as both HKDF salt and GCM AAD", async () => {
    const url = callbackURL((await fixture().get({ "cf-access-jwt-assertion": await jwt() })).body);
    const changedState = "b".repeat(32);
    expect(() => decryptCallback(url, appKey, changedState)).toThrow();
    url.searchParams.set("state", changedState);
    expect(() => decryptCallback(url)).toThrow();
  });

  it.each(["epk", "iv", "ct"])("rejects a modified %s", async parameter => {
    const url = callbackURL((await fixture().get({ "cf-access-jwt-assertion": await jwt() })).body);
    const bytes = Buffer.from(url.searchParams.get(parameter)!, "base64url");
    bytes[bytes.length - 1] ^= 1;
    url.searchParams.set(parameter, bytes.toString("base64url"));
    expect(() => decryptCallback(url)).toThrow();
  });

  it("uses a fresh ephemeral key and nonce for each response", async () => {
    const f = fixture();
    const headers = { "cf-access-jwt-assertion": await jwt() };
    const first = callbackURL((await f.get(headers)).body);
    const second = callbackURL((await f.get(headers)).body);
    for (const name of ["epk", "iv", "ct"]) expect(second.searchParams.get(name)).not.toBe(first.searchParams.get(name));
    expect(decryptCallback(second)).toBe(headers["cf-access-jwt-assertion"]);
  });

  it("does not trust a live local session instead of revalidating the Access token", async () => {
    const f = fixture();
    const session = f.sessions.issue({ label: "fixture", scopes: ["admin", "client"] });
    for (const assertion of ["invalid", await jwt({ email: "guest@crybot.example" })]) {
      expect((await f.get({ authorization: `Bearer ${session.token}`, "cf-access-jwt-assertion": assertion })).status).toBe(401);
    }
  });

  it("rechecks allowlist even for an already authenticated Access identity", async () => {
    const f = fixture();
    const first = await f.authenticate({ "cf-access-jwt-assertion": await jwt() });
    const cookie = String(first.headers["set-cookie"]).split(";")[0];
    expect((await f.get({ cookie, "cf-access-jwt-assertion": await jwt({ email: "guest@crybot.example" }) })).status).toBe(401);
  });

  it("accepts wildcard identities and normalized email fallback, but rejects unidentified tokens", async () => {
    const f = fixture({ ...env, CRYBOT_CF_ACCESS_ALLOW: "*" });
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ email: null }) })).status).toBe(200);
    expect((await fixture().get({ "cf-access-jwt-assertion": await jwt({ sub: null }) })).status).toBe(200);
    expect((await f.get({ "cf-access-jwt-assertion": await jwt({ email: null, sub: null }) })).status).toBe(401);
  });

  it.each(["", "Crybot", "x", "custom\n", "https://crybot.example", 'bad"><script>', "a".repeat(32)])("falls back to crybot for invalid configured scheme %j", async scheme => {
    const response = await fixture({ ...env, CRYBOT_APP_SCHEME: scheme }).get({ "cf-access-jwt-assertion": await jwt() });
    expect(response.status).toBe(200);
    expect(response.body).toContain(`href="crybot://auth?v=1&amp;state=${state}&amp;epk=`);
  });

  it("takes the scheme only from server configuration", async () => {
    const query = new URLSearchParams({ scheme: "other", redirect_uri: "other://auth", callback: "https://other.example" });
    const headers = { "cf-access-jwt-assertion": await jwt() };
    const configured = await fixture({ ...env, CRYBOT_APP_SCHEME: "crybot.test+app-2" }).get(headers, `${path}&${query}`);
    expect(configured.body).toContain(`href="crybot.test+app-2://auth?v=1&amp;state=${state}&amp;epk=`);
    const defaultScheme = await fixture().get(headers, `${path}&${query}`);
    expect(defaultScheme.body).toContain(`href="crybot://auth?v=1&amp;state=${state}&amp;epk=`);
    expect(defaultScheme.body).not.toContain("other://");
    expect(defaultScheme.body).not.toContain("https://other.example");
  });

  it.each([
    ["zh-CN,zh;q=0.9,en;q=0.8", "zh-Hans", "返回 Cry Bot"],
    ["en;q=0.5,zh-Hans;q=0.9", "zh-Hans", "返回 Cry Bot"],
    ["en-US,zh;q=0.9", "en", "Return to Cry Bot"],
    ["zh;q=0,en;q=1", "en", "Return to Cry Bot"],
    ["fr", "en", "Return to Cry Bot"],
  ])("selects the page language for %s", async (language, lang, label) => {
    const response = await fixture().get({ "cf-access-jwt-assertion": await jwt(), "accept-language": language });
    expect(response.body).toContain(`<html lang="${lang}">`);
    expect(response.body).toContain(`>${label}</a>`);
  });
});
