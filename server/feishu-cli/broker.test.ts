import { mkdtemp, writeFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTokenBroker, startBroker } from "./broker.ts";

const secret = "fixture-long-credential-never-publish";
let directory: string;
let now: number;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
let token: ReturnType<typeof createTokenBroker>;
const good = () => ({ user_access_token: "fixture-short-token", app_id: "fixture-app", expires_at: Math.floor(now / 1000) + 3600 });
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "feishu-broker-"));
  await writeFile(join(directory, "credential.json"), JSON.stringify({ token: secret }));
  now = 1_800_000_000_000;
  fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(good()));
  token = createTokenBroker({ credentialFile: join(directory, "credential.json"), tokenUrl: "https://example.invalid/token", socketPath: join(directory, "broker.sock") }, { fetch: fetcher, now: () => now });
});
afterEach(async () => { vi.restoreAllMocks(); await rm(directory, { recursive: true, force: true }); });

it("POSTs with redirect rejection and a timeout, coalesces requests and refreshes five minutes before expiry", async () => {
  const replies = await Promise.all([token(), token(), token()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith("https://example.invalid/token", expect.objectContaining({ method: "POST", redirect: "error", headers: { authorization: `Bearer ${secret}` }, signal: expect.any(AbortSignal) }));
  expect(replies[0]).toEqual({ status: 200, body: good() });
  now += 3299_000;
  await token();
  expect(fetcher).toHaveBeenCalledTimes(1);
  now += 1000;
  await token();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(replies)).not.toContain(secret);
});

it("forwards only message and authorization_url and backs off for 30 seconds", async () => {
  const body = { message: "请授权", authorization_url: "https://example.invalid/authorize?a=1", ignored: "private" };
  fetcher.mockResolvedValue(Response.json(body, { status: 403 }));
  expect(await token()).toEqual({ status: 403, body: { message: body.message, authorization_url: body.authorization_url } });
  now += 29_999;
  await Promise.all([token(), token()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  now++;
  fetcher.mockImplementation(async () => Response.json(good()));
  expect((await token()).status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each([
  {}, { user_access_token: "x", app_id: "app" },
  { user_access_token: "", app_id: "app", expires_at: 9_000_000_000 },
  { user_access_token: "x", app_id: "", expires_at: 9_000_000_000 },
  { user_access_token: "x", app_id: "app", expires_at: "9000000000" },
  { user_access_token: "x", app_id: "app", expires_at: 1_800_000_000 },
  { user_access_token: "x", app_id: "app", expires_at: 1_800_000_000.5 },
])("rejects an invalid token response without guessing: %j", async body => {
  fetcher.mockResolvedValue(Response.json(body));
  expect((await token()).status).toBe(502);
  await token();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it.each([200, 401, 500])("never returns or logs a credential echoed by upstream (%s)", async status => {
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
  fetcher.mockResolvedValue(Response.json({ ...good(), message: secret, authorization_url: `https://example.invalid/${secret}` }, { status }));
  const result = await token();
  expect(result.status).toBe(502);
  expect(JSON.stringify([result, logs.map(log => log.mock.calls)])).not.toContain(secret);
});

it("suppresses transport errors containing credentials and cools down", async () => {
  const log = vi.spyOn(console, "error");
  fetcher.mockRejectedValue(new Error(secret));
  const result = await token();
  await token();
  expect(JSON.stringify([result, log.mock.calls])).not.toContain(secret);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("does not serve an old token after refresh fails", async () => {
  await token();
  now += 3300_000;
  fetcher.mockResolvedValue(Response.json({ message: "revoked" }, { status: 401 }));
  expect((await token()).status).toBe(401);
  expect((await token()).status).toBe(401);
});


it.skipIf(process.platform !== "linux")("refuses a credential readable by the Cry Bot group before listening", async () => {
  const credentialFile = join(directory, "credential.json");
  await chmod(credentialFile, 0o640);
  await expect(startBroker({ credentialFile, tokenUrl: "https://example.invalid/token", socketPath: join(directory, "runtime", "token.sock") })).rejects.toThrow("凭证文件必须仅 broker 用户可读");
});

it("maps invalid token URLs to the fixed configuration error", async () => {
  await expect(startBroker({ credentialFile: join(directory, "credential.json"), tokenUrl: "not a URL", socketPath: join(directory, "runtime", "token.sock") })).rejects.toThrow("飞书代领服务配置无效");
});

it.each(["http://example.com/token", "http://localhost.example.invalid/token", "http://127.0.0.2/token", "ftp://localhost/token", "https://user:password@example.invalid/token"])("rejects an insecure token URL: %s", async tokenUrl => { // public-scan: allow ip
  await expect(startBroker({ credentialFile: join(directory, "missing.json"), tokenUrl, socketPath: join(directory, "token.sock") })).rejects.toThrow("飞书代领服务配置无效");
});

it.each(["https://example.invalid/token", "http://127.0.0.1:1234/token", "http://[::1]:1234/token", "http://localhost:1234/token"])("accepts a secure or loopback URL before checking credentials: %s", async tokenUrl => {
  await expect(startBroker({ credentialFile: join(directory, "missing.json"), tokenUrl, socketPath: join(directory, "token.sock") })).rejects.toThrow("凭证文件必须仅 broker 用户可读");
});

it("maps a missing credential file to the fixed credential error", async () => {
  await expect(startBroker({ credentialFile: join(directory, "missing.json"), tokenUrl: "https://example.invalid/token", socketPath: join(directory, "runtime", "token.sock") })).rejects.toThrow("凭证文件必须仅 broker 用户可读");
});

it.skipIf(process.platform !== "linux")("maps socket directory creation failures to the fixed socket error", async () => {
  await chmod(join(directory, "credential.json"), 0o600);
  await chmod(directory, 0o500);
  try {
    await expect(startBroker({ credentialFile: join(directory, "credential.json"), tokenUrl: "https://example.invalid/token", socketPath: join(directory, "missing", "runtime", "token.sock") })).rejects.toThrow("飞书代领服务无法创建套接字");
  } finally { await chmod(directory, 0o700); }
});

it("reuses a newly issued token inside the refresh window for 60 seconds", async () => {
  const fresh = { ...good(), expires_at: Math.floor(now / 1000) + 120 };
  fetcher.mockImplementation(async () => Response.json(fresh));
  const first = await token();
  now += 59_999;
  expect(await token()).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  now++;
  await token();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("never reuses an expired token during the minimum refresh interval", async () => {
  fetcher.mockImplementationOnce(async () => Response.json({ ...good(), expires_at: Math.floor(now / 1000) + 10 }));
  await token();
  now += 10_000;
  expect(await token()).toEqual({ status: 200, body: good() });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
