import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { startBroker } from "./broker.ts";
import { brokerToken } from "./protocol.ts";

it.skipIf(process.platform !== "linux")("serves only a short token over a 660 socket in a 750 directory with the process group", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feishu-socket-"));
  const secret = "fixture-long-socket-credential";
  let requests = 0;
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn")];
  const upstream = createServer((req, res) => {
    requests++;
    expect(req.method).toBe("POST");
    expect(req.headers.authorization).toBe(`Bearer ${secret}`);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ user_access_token: "fixture-short", app_id: "fixture-app", expires_at: Math.floor(Date.now() / 1000) + 3600, ignored: "unused" }));
  });
  let broker: Awaited<ReturnType<typeof startBroker>> | undefined;
  try {
    await new Promise<void>((resolve, reject) => { upstream.once("error", reject); upstream.listen(0, "127.0.0.1", resolve); });
    const credentialFile = join(directory, "credential.json");
    await writeFile(credentialFile, JSON.stringify({ token: secret }), { mode: 0o600 });
    const socketPath = join(directory, "runtime", "token.sock");
    broker = await startBroker({ credentialFile, socketPath, tokenUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/token` });
    const replies = await Promise.all([brokerToken(socketPath), brokerToken(socketPath)]);
    expect(requests).toBe(1);
    expect(replies[0].user_access_token).toBe("fixture-short");
    expect((await stat(socketPath)).mode & 0o777).toBe(0o660);
    expect((await stat(broker.directory)).mode & 0o777).toBe(0o750);
    expect((await stat(socketPath)).gid).toBe(process.getgid!());
    expect(JSON.stringify([replies, logs.map(log => log.mock.calls)])).not.toContain(secret);
  } finally {
    await broker?.close();
    upstream.closeAllConnections();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  }
});

it.skipIf(process.platform !== "linux")("refreshes against a real local HTTP upstream and cools down after forwarded errors", async () => {
  const { createTokenBroker } = await import("./broker.ts");
  const directory = await mkdtemp(join(tmpdir(), "feishu-http-"));
  const secret = "fixture-http-long-credential";
  const credentialFile = join(directory, "credential.json");
  await writeFile(credentialFile, JSON.stringify({ token: secret }), { mode: 0o600 });
  let now = Date.now();
  let status = 200;
  let calls = 0;
  let payload: Record<string, unknown> = { user_access_token: "fixture-short", app_id: "fixture-app", expires_at: Math.floor(now / 1000) + 3600 };
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
  const upstream = createServer((req, res) => {
    calls++;
    expect(req.headers.authorization).toBe(`Bearer ${secret}`);
    expect(req.method).toBe("POST");
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
  });
  try {
    await new Promise<void>((resolve, reject) => { upstream.once("error", reject); upstream.listen(0, "127.0.0.1", resolve); });
    const get = createTokenBroker({ credentialFile, tokenUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/token`, socketPath: join(directory, "unused.sock") }, { now: () => now });
    const replies = [await get(), await get()];
    expect(calls).toBe(1);
    now += 3300_000;
    payload = { ...payload, expires_at: Math.floor(now / 1000) + 3600 };
    replies.push(await get());
    expect(calls).toBe(2);
    now += 3300_000;
    status = 403;
    payload = { message: "请重新授权", authorization_url: "https://example.invalid/authorize?fixture=1" };
    replies.push(await get());
    expect(replies.at(-1)).toEqual({ status, body: payload });
    now += 29_999;
    replies.push(await get());
    expect(calls).toBe(3);
    now++;
    status = 200;
    payload = { user_access_token: "fixture-short", app_id: "fixture-app" };
    expect((await get()).status).toBe(502);
    now += 30_000;
    status = 500;
    payload = { message: secret, authorization_url: `https://example.invalid/${secret}` };
    replies.push(await get());
    expect(replies.at(-1)?.status).toBe(502);
    expect(JSON.stringify([replies, logs.map(log => log.mock.calls)])).not.toContain(secret);
  } finally {
    upstream.closeAllConnections();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  }
});
