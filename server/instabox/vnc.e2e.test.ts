import { once } from "node:events";
import { execFileSync } from "node:child_process";
import { createServer, request, type IncomingHttpHeaders } from "node:http";
import { globalAgent } from "node:https";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { WebSocket } from "ws";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { openHeadlessChrome } from "../../scripts/testing/headless-chrome.ts";
import { SessionRegistry } from "../sessions.ts";
import { resolveRequestAuth } from "../request-auth.ts";
import { json, readBody } from "../harness/http.ts";
import { createDesktopViewer } from "../routes/desktop-viewer.ts";
import { createUpgrades } from "../routes/upgrades.ts";
import { PASS } from "../routes/table.ts";
import { fakeInstaboxVnc } from "../testing/fake-instabox-vnc.ts";
import { instaboxDesktopTarget } from "./vnc.ts";

const secret = "synthetic-upstream-secret";
const base = "/api/desktop-viewer/vps/fixture-bot";
const leaseId = "fixture-control-lease";
const leased = `${base}/websockify?botId=fixture-bot&controlLeaseId=${leaseId}`;
const cleanups: Array<() => Promise<void>> = [];
const tlsDir = mkdtempSync(join(tmpdir(), "cry-instabox-vnc-tls-"));
let tls: { key: string; cert: string };
beforeAll(() => {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-noenc", "-days", "1",
    "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1",
    "-keyout", join(tlsDir, "key.pem"), "-out", join(tlsDir, "cert.pem")], { stdio: "pipe", timeout: 10_000 });
  tls = { key: readFileSync(join(tlsDir, "key.pem"), "utf8"), cert: readFileSync(join(tlsDir, "cert.pem"), "utf8") };
});
afterAll(() => rmSync(tlsDir, { recursive: true, force: true }));
afterEach(async () => {
  for (const close of cleanups.reverse()) await close();
  cleanups.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function trustFixtureCertificate() {
  const previous = globalAgent.options.ca;
  globalAgent.options.ca = tls.cert;
  cleanups.push(async () => { globalAgent.options.ca = previous; });
}

async function fixture(opts: Parameters<typeof fakeInstaboxVnc>[0] & { allowInsecure?: boolean } = {}) {
  const desktop = await fakeInstaboxVnc(opts);
  const dir = mkdtempSync(join(tmpdir(), "cry-instabox-vnc-"));
  const sessions = new SessionRegistry({ file: join(dir, "sessions.json") });
  const admin = sessions.issue({ label: "Fixture admin", scopes: ["admin", "client"] });
  const member = sessions.issue({ label: "Fixture member", scopes: ["client"] });
  const state = { live: true, holding: true, present: true, key: "instabox/fixture-bot/fixture-machine", retained: 0, script: "" };
  const provider = vi.fn(async () => ({ url: desktop.url, headers: { "X-API-Key": secret } }));
  const touch = vi.fn();
  const target = instaboxDesktopTarget(state.key, provider, { live: () => state.live, touch });
  const resolve = vi.fn(async () => ({ ...await target.resolve(), retain: () => {
    state.retained++; return () => { state.retained--; };
  } }));
  const upgrades = createUpgrades();
  const viewer = createDesktopViewer({
    target: id => id === "vps/fixture-bot" && state.present ? { key: state.key, resolve } : undefined,
    live: auth => auth.kind === "session" && sessions.isLive(auth.session.id),
    lease: (id, botId, lease) => id === "vps/fixture-bot" && botId === "fixture-bot" && lease === leaseId && state.holding
      ? () => state.holding : undefined,
    upgrades, allowInsecureLoopbackUpstream: opts.allowInsecure ?? true,
  });
  sessions.onSessionRevoked(id => viewer.closeForOwner(id));
  const handle = async (req: Parameters<typeof resolveRequestAuth>[0], res: Parameters<typeof json>[0]) => {
    const url = new URL(req.url!, "http://fixture");
    if (url.pathname === "/") return res.end('<div id="screen" style="width:640px;height:400px"></div><script type="module" src="/client.js"></script>');
    if (url.pathname === "/client.js") { res.setHeader("content-type", "text/javascript"); return res.end(state.script); }
    const gate = resolveRequestAuth(req, { sessions, cookieName: "fixture_session", url, streamPath: "/api/events", loopbackTrust: "service" });
    if (!gate.auth) return json(res, gate.status, { error: gate.error });
    if (url.pathname === "/api/bots/fixture-bot/computer/join") return json(res, 200, {});
    const answer = await viewer.route({ req, res, url, path: url.pathname, method: req.method!, auth: gate.auth, json, readBody });
    if (answer === PASS) json(res, 404, { error: "not found" });
  };
  const app = createServer((req, res) => { void handle(req, res); });
  viewer.attach(app, handle);
  await new Promise<void>(resolve => app.listen(0, "127.0.0.1", resolve));
  const port = (app.address() as { port: number }).port;
  const origin = `http://127.0.0.1:${port}`;
  const headers = { origin, cookie: `fixture_session=${admin.token}` };
  const browsers = new Set<WebSocket>();
  cleanups.push(async () => {
    viewer.closeAll(); upgrades.close();
    for (const socket of browsers) socket.terminate();
    await desktop.close();
    await new Promise<void>(resolve => { app.close(() => resolve()); app.closeAllConnections(); });
    rmSync(dir, { recursive: true, force: true });
  });
  function open(path = `${base}/websockify`, extra: Record<string, string> = {}) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers: { ...headers, ...extra } });
    browsers.add(socket);
    socket.on("error", () => {});
    const messages: Buffer[] = [];
    const binary: boolean[] = [];
    let responseHeaders: IncomingHttpHeaders = {};
    socket.on("message", (bytes, isBinary) => { messages.push(Buffer.from(bytes as Buffer)); binary.push(isBinary); });
    socket.on("upgrade", res => { responseHeaders = res.headers; });
    return { socket, messages, binary, headers: () => responseHeaders };
  }
  async function http(path = base, extra: Record<string, string> = {}, upgrade = false) {
    return new Promise<{ status: number; headers: IncomingHttpHeaders; body: string }>((resolve, reject) => {
      const req = request(`${origin}${path}`, { headers: { ...headers, ...extra, ...(upgrade ? {
        Upgrade: "websocket", Connection: "Upgrade", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==", "Sec-WebSocket-Version": "13",
      } : {}) } }, res => {
        let body = "";
        res.on("data", bytes => { body += bytes; });
        res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
      });
      req.once("error", reject); req.end();
    });
  }
  return { desktop, dir, state, provider, resolve, touch, viewer, upgrades, sessions, admin, member, origin, open, http };
}

it.each(["ws", "wss"])("relays %s RFB 3.8 None authentication, frames and input byte-for-byte without leaking headers", async protocol => {
  if (protocol === "wss") trustFixtureCertificate();
  const f = await fixture(protocol === "wss" ? { tls, allowInsecure: false } : {});
  const status = await f.http();
  expect(status.status).toBe(200);
  expect(JSON.parse(status.body)).toEqual({ password: null });
  expect(status.headers["cache-control"]).toBe("private, no-store");
  const client = f.open(`${base}/websockify?url=wss://untrusted.invalid&headers=ignored`, { authorization: `Bearer ${f.admin.token}` });
  await once(client.socket, "open");
  await expect.poll(() => client.messages.length).toBe(1);
  expect(client.messages[0]).toEqual(Buffer.from("RFB 003.008\n"));
  client.socket.send(client.messages[0]);
  await expect.poll(() => client.messages.length).toBe(2);
  expect(client.messages[1]).toEqual(Buffer.from([1, 1]));
  client.socket.send(Buffer.from([1]));
  await expect.poll(() => client.messages.length).toBe(3);
  expect(client.messages[2]).toEqual(Buffer.alloc(4));
  client.socket.send(Buffer.from([1]));
  await expect.poll(() => client.messages.length).toBe(4);
  expect(client.messages[3].readUInt16BE(0)).toBe(1280);
  expect(client.messages[3].readUInt16BE(2)).toBe(800);
  const update = Buffer.from([3, 0, 0, 0, 0, 0, 5, 0, 3, 32]);
  client.socket.send(update.subarray(0, 3), { fin: false });
  client.socket.send(update.subarray(3), { fin: true });
  await expect.poll(() => client.messages.length).toBe(5);
  expect(client.messages[4]).toEqual(f.desktop.frame);
  expect(client.messages).toEqual(f.desktop.sent);
  expect(client.binary).toEqual([true, true, true, true, true]);
  expect(f.desktop.received).toEqual([Buffer.from("RFB 003.008\n"), Buffer.from([1]), Buffer.from([1]), update]);
  expect(f.desktop.requests[0].url).toBe("/v1/machines/fixture-machine/vnc");
  expect(f.desktop.requests[0].headers["x-api-key"]).toBe(secret);
  expect(f.desktop.requests[0].headers.cookie).toBeUndefined();
  expect(f.desktop.requests[0].headers.authorization).toBeUndefined();
  expect(JSON.stringify([status, client.headers(), client.messages])).not.toContain(secret);
  expect(f.touch).toHaveBeenCalledTimes(1);
});

it.each(["browser", "upstream"])("closes the other side when %s disconnects and releases only its own retain", async side => {
  const f = await fixture();
  const first = f.open(); const second = f.open();
  await Promise.all([once(first.socket, "open"), once(second.socket, "open")]);
  expect(f.state.retained).toBe(2);
  if (side === "browser") first.socket.close();
  else [...f.desktop.sockets.clients][0].terminate();
  await expect.poll(() => first.socket.readyState).toBe(WebSocket.CLOSED);
  await expect.poll(() => f.desktop.sockets.clients.size).toBe(1);
  await expect.poll(() => f.state.retained).toBe(1);
  expect(second.socket.readyState).toBe(WebSocket.OPEN);
});

it.each(["member", "origin", "lease"])("checks %s before resolving upstream for HTTP and upgrades", async denied => {
  const f = await fixture();
  const extra: Record<string, string> = denied === "member" ? { cookie: `fixture_session=${f.member.token}` }
    : denied === "origin" ? { origin: "https://untrusted.invalid" } : {};
  f.state.holding = false;
  for (const upgrade of [false, true]) {
    const answer = await f.http(denied === "lease" ? leased : upgrade ? `${base}/websockify` : base, extra, upgrade);
    expect(answer.status).toBe(denied === "lease" ? 409 : 403);
  }
  expect(f.provider).not.toHaveBeenCalled();
  expect(f.desktop.requests).toEqual([]);
});

it.each(["live", "holding", "present", "key"] as const)("rechecks %s and touches only a live viewer", async field => {
  const f = await fixture();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  const client = f.open(leased);
  await once(client.socket, "open");
  await vi.advanceTimersByTimeAsync(5000);
  expect(f.touch).toHaveBeenCalledTimes(2);
  if (field === "key") f.state.key = "instabox/replacement";
  else f.state[field] = false;
  await vi.advanceTimersByTimeAsync(5000);
  await expect.poll(() => client.socket.readyState).toBe(WebSocket.CLOSED);
  expect(f.touch).toHaveBeenCalledTimes(2);
  expect(f.state.retained).toBe(0);
});

it.each(["revoke", "shutdown", "gate"])("closes established viewers on %s", async action => {
  const f = await fixture();
  const client = f.open();
  await once(client.socket, "open");
  if (action === "revoke") f.sessions.revoke(f.admin.session.id);
  else if (action === "gate") f.upgrades.close();
  else f.viewer.closeAll();
  await expect.poll(() => client.socket.readyState).toBe(WebSocket.CLOSED);
  await expect.poll(() => f.state.retained).toBe(0);
  await expect.poll(() => f.desktop.sockets.clients.size).toBe(0);
  if (action === "gate") await expect(f.http(`${base}/websockify`, {}, true)).rejects.toThrow();
});

it.each(["resolve", "handshake"])("rechecks liveness after an asynchronous %s", async phase => {
  let unblock!: () => void;
  const pending = new Promise<void>(resolve => { unblock = resolve; });
  const f = await fixture(phase === "handshake" ? { beforeUpgrade: () => pending } : {});
  if (phase === "resolve") f.provider.mockImplementation(async () => { await pending; return { url: f.desktop.url, headers: { "X-API-Key": secret } }; });
  const answer = f.http(`${base}/websockify`, {}, true);
  await expect.poll(() => phase === "resolve" ? f.provider.mock.calls.length : f.desktop.requests.length).toBe(1);
  f.state.live = false;
  unblock();
  expect((await answer).status).toBe(phase === "resolve" ? 401 : 502);
  await expect.poll(() => f.state.retained).toBe(0);
});

it("does not connect after a browser leaves during provider resolution", async () => {
  let unblock!: () => void;
  const pending = new Promise<void>(resolve => { unblock = resolve; });
  const f = await fixture();
  f.provider.mockImplementation(async () => { await pending; return { url: f.desktop.url, headers: { "X-API-Key": secret } }; });
  const client = f.open();
  await expect.poll(() => f.provider.mock.calls.length).toBe(1);
  client.socket.terminate();
  await expect.poll(() => client.socket.readyState).toBe(WebSocket.CLOSED);
  await expect.poll(() => f.viewer.closeForOwner(f.admin.session.id)).toBe(0);
  unblock();
  await f.resolve.mock.results[0].value;
  expect(f.desktop.requests).toEqual([]);
  expect(f.state.retained).toBe(0);
});

it.each(["ws-default", "remote-ws", "http", "https", "invalid", "userinfo", "fragment"])("rejects %s without exposing credentials", async kind => {
  const f = await fixture({ allowInsecure: kind !== "ws-default" });
  const url = kind === "ws-default" ? f.desktop.url : ({
    "remote-ws": "ws://example.invalid/vnc", http: "http://127.0.0.1/vnc", https: "https://api.instabox.sh/vnc",
    invalid: "invalid", userinfo: `wss://user:${secret}@example.invalid/vnc`, fragment: `wss://example.invalid/vnc#${secret}`,
  }[kind]!);
  f.provider.mockResolvedValue({ url, headers: { "X-API-Key": secret } });
  for (const upgrade of [false, true]) {
    const answer = await f.http(upgrade ? `${base}/websockify` : base, {}, upgrade);
    expect(answer.status).toBe(502);
    expect(answer.body).toBe(JSON.stringify({ error: "Could not connect to the desktop viewer" }));
    expect(JSON.stringify(answer)).not.toContain(secret);
  }
  expect(f.desktop.requests).toEqual([]);
});

it.each(["refused", "invalid-header", "provider", "rejected", "forged", "tls", "untrusted-cert"])("sanitizes %s failures and releases retains", async failure => {
  const logs = ["log", "warn", "error", "info", "debug"] as const;
  const spies = logs.map(method => vi.spyOn(console, method).mockImplementation(() => {}));
  const response = failure === "rejected" ? `HTTP/1.1 401 Unauthorized\r\nX-API-Key: ${secret}\r\nContent-Length: ${secret.length}\r\n\r\n${secret}`
    : failure === "forged" ? `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${secret}\r\n\r\n` : undefined;
  const f = await fixture({ response, ...(failure === "untrusted-cert" ? { tls, allowInsecure: false } : {}) });
  if (failure === "refused") { await f.desktop.close(); f.desktop.close = async () => {}; }
  if (failure === "invalid-header") f.provider.mockResolvedValue({ url: f.desktop.url, headers: { "X-API-Key": `${secret}\ninvalid` } });
  if (failure === "provider") f.provider.mockRejectedValue(new Error(secret));
  if (failure === "tls") f.provider.mockResolvedValue({ url: f.desktop.url.replace("ws:", "wss:"), headers: { "X-API-Key": secret } });
  const answer = await f.http(`${base}/websockify`, {}, true);
  expect(answer.status).toBe(502);
  expect(JSON.stringify(answer)).not.toContain(secret);
  expect(JSON.stringify(spies.map(spy => spy.mock.calls))).not.toContain(secret);
  await expect.poll(() => f.state.retained).toBe(0);
  if (failure === "untrusted-cert") expect(f.desktop.requests).toEqual([]);
});

it("renders the 1280×800 None-authenticated desktop with the unchanged browser client", async () => {
  trustFixtureCertificate();
  const f = await fixture({ tls, allowInsecure: false });
  const bundle = await build({ stdin: { contents: `
    import { connectDesktop } from './src/lib/desktop-connection.ts';
    connectDesktop(document.getElementById('screen'), 'vps/fixture-bot', {
      signal: new AbortController().signal,
      events: { connected() { window.connected = true; }, disconnected() { window.disconnected = true; } }
    }).then(client => window.client = client).catch(error => window.failure = error.message);
  `, resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "browser" });
  f.state.script = bundle.outputFiles[0].text;
  const page = await openHeadlessChrome(join(f.dir, "chrome"));
  try {
    await page.send("Network.setCookie", { name: "fixture_session", value: f.admin.token, url: f.origin });
    await page.send("Page.navigate", { url: f.origin });
    await page.until("window.connected === true", 15_000);
    await page.until("document.querySelector('canvas')?.getContext('2d').getImageData(0,0,1,1).data[0] === 255", 15_000);
    expect(await page.evaluate("[document.querySelector('canvas').width, document.querySelector('canvas').height]")).toEqual([1280, 800]);
    expect(await page.evaluate("[document.querySelector('canvas').getBoundingClientRect().width, document.querySelector('canvas').getBoundingClientRect().height]")).toEqual([640, 400]);
    await page.evaluate("window.client.sendKey(65, null)");
    await expect.poll(() => f.desktop.keys).toContain(65);
    expect(await page.evaluate("document.documentElement.outerHTML")).not.toContain(secret);
    await page.evaluate("window.client.disconnect()");
    await expect.poll(() => f.desktop.sockets.clients.size).toBe(0);
  } finally { page.close(); }
}, 30_000);
