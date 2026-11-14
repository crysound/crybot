import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { removeTempDir, waitForExit } from "./testing/cleanup.ts";
import { startFakeSmtp, testCertificate, type FakeSmtp } from "./testing/fake-smtp.ts";
import { openSse } from "./testing/sse.ts";
import { workerPort } from "./testing/worker-port.ts";

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SERVER_DIR, "..");
const PORT = workerPort(24000, 5000);
const HOST = "team.example.test";

let home: string | undefined;
let child: ChildProcess | undefined;
let smtp: FakeSmtp | undefined;
let stderr = "";

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

function call(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; from?: string } = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const payload = init.body === undefined ? undefined : JSON.stringify(init.body);
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method: init.method ?? (payload ? "POST" : "GET"),
        headers: {
          host: HOST,
          "x-forwarded-for": init.from ?? "203.0.113.7",
          "x-forwarded-proto": "https",
          ...(payload ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let body: unknown = raw;
          try {
            body = JSON.parse(raw);
          } catch {
          }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const cookieOf = (reply: Reply): string => {
  const raw = reply.headers["set-cookie"];
  const first = Array.isArray(raw) ? raw[0] : raw;
  return (first ?? "").split(";")[0];
};

function codeFor(email: string): string {
  const message = smtp!.received.findLast((mail) => mail.to.includes(email));
  expect(message, `SMTP message for ${email}`).toBeDefined();
  const match = /(\d{4}) (\d{4})/.exec(message!.data);
  expect(match).not.toBeNull();
  return match!.slice(1).join("");
}

async function signIn(email: string): Promise<string> {
  expect((await call("/api/auth/email/start", { body: { email } })).status).toBe(200);
  const reply = await call("/api/auth/email/verify", { body: { email, code: codeFor(email) } });
  expect(reply.status).toBe(200);
  return cookieOf(reply);
}

async function openEvents(cookie: string) {
  const stream = await openSse(`http://127.0.0.1:${PORT}/api/events`, {
    "x-forwarded-for": "203.0.113.7", "x-forwarded-proto": "https", cookie,
  });
  await stream.until((frame) => frame.kind === "hello");
  return stream;
}

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), "cry-email-signin-"));
  const certificate = testCertificate(["localhost"]);
  if (!certificate) throw new Error("SMTP fixture requires openssl to create its isolated certificate");
  const certificatePath = join(home, "smtp-ca.pem");
  writeFileSync(certificatePath, certificate.cert);
  smtp = await startFakeSmtp({ certificate, security: "starttls", mechanisms: ["PLAIN"], users: { "signin@example.test": "fixture-password" } });
  const staticDir = join(home, "static");
  mkdirSync(join(home, ".crybot"), { recursive: true });
  mkdirSync(join(staticDir, "assets"), { recursive: true });
  writeFileSync(join(staticDir, "index.html"), "<!doctype html><title>Served UI</title>");
  writeFileSync(join(home, ".crybot", "config.json"), JSON.stringify({
    instances: { fixture: { driver: "email-signin-test-shadow" } },
    signIn: { admins: ["her@example.test", "@team.example.test"], members: ["staff@example.test"] },
  }));
  child = spawn(process.execPath, [join(SERVER_DIR, "index.ts")], {
    cwd: ROOT,
    env: {
      ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
      ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
      HOME: home,
      USERPROFILE: home,
      CRYBOT_SIGNIN_SMTP_URL: `smtp://signin%40example.test:fixture-password@localhost:${smtp.port}`,
      NODE_EXTRA_CA_CERTS: certificatePath,
      CRYBOT_DISABLE_MODEL_MANIFEST_FETCH: "1",
      CRYBOT_DISABLE_ANNOUNCEMENTS: "1",
      CRYBOT_PORT: String(PORT),
      CRYBOT_WEBHOOK_PORT: String(PORT + 1),
      CRYBOT_STATIC_DIR: staticDir,
      CRYBOT_PUBLIC_URL: `https://${HOST}`,
      CRYBOT_ENVIRONMENT_LABEL: "fixture",
      CRYBOT_BROWSER_CONNECTION: join(home, "browser-test-connection.json"),
      CRYBOT_SSE_HEARTBEAT_MS: "50",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr?.on("data", (chunk) => (stderr += String(chunk)));
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not start:\n${stderr}`);
}, 30_000);

afterAll(async () => {
  if (child) await waitForExit(child, { signal: "SIGTERM" });
  smtp?.close();
  if (home) await removeTempDir(home);
});

describe("sign in with your email through self-hosted SMTP", () => {
  it("advertises the option in the public descriptor", async () => {
    const descriptor = await call("/.well-known/crybot/environment");
    expect(descriptor.status).toBe(200);
    expect(descriptor.body.capabilities.emailSignIn).toBe(true);
  });

  it("is JSON-only and refuses addresses that are not on the list", async () => {
    const form = await new Promise<Reply>((resolve, reject) => {
      const req = httpRequest({ hostname: "127.0.0.1", port: PORT, path: "/api/auth/email/start", method: "POST", headers: { host: HOST, "x-forwarded-for": "203.0.113.9", "content-type": "application/x-www-form-urlencoded" } }, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: raw }));
      });
      req.on("error", reject);
      req.end("email=her%40example.test");
    });
    expect(form.status).toBe(415);
    const stranger = await call("/api/auth/email/start", { body: { email: "stranger@example.test" } });
    expect(stranger.status).toBe(403);
    expect(stranger.body.error).toMatch(/not on this server's sign-in list/);
    expect(smtp!.received).toEqual([]);
  });

  it("emails a code to a welcome address, then turns the code into an admin cookie session that shows its email", async () => {
    const started = await call("/api/auth/email/start", { body: { email: "her@example.test" } });
    expect(started.status).toBe(200);
    expect(smtp!.received).toHaveLength(1);
    expect(smtp!.received[0]!.to).toEqual(["her@example.test"]);

    const code = codeFor("her@example.test");
    const wrong = await call("/api/auth/email/verify", { body: { email: "her@example.test", code: code === "00000000" ? "11111111" : "00000000", label: "Her iPad" } });
    expect(wrong.status).toBe(401);
    expect(cookieOf(wrong)).toBe("");

    const right = await call("/api/auth/email/verify", { body: { email: "her@example.test", code, label: "Her iPad" } });
    expect(right.status).toBe(200);
    expect(right.body.session).toMatchObject({ label: "Her iPad", scopes: ["admin", "client"], email: "her@example.test" });
    expect(right.body.environment.environmentId).toBeTruthy();
    const cookie = cookieOf(right);
    expect(cookie).toMatch(/^cry_session_/);
    expect(String(right.headers["set-cookie"])).toMatch(/HttpOnly/);

    const me = await call("/api/auth/session", { headers: { cookie, origin: `https://${HOST}` } });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ kind: "session", email: "her@example.test", scopes: ["admin", "client"], via: "cookie" });
    expect(me.body).not.toHaveProperty("hosted");
    const config = await call("/api/config", { method: "PUT", body: { language: "en" }, headers: { cookie, origin: `https://${HOST}` } });
    expect(config.status).toBe(200);
    const listed = await call("/api/auth/sessions", { headers: { cookie, origin: `https://${HOST}` } });
    expect(listed.status).toBe(200);
    expect(listed.body.sessions.some((s: { email?: string }) => s.email === "her@example.test")).toBe(true);
  });

  it("a member address gets a chat-only session; a domain entry welcomes the whole company", async () => {
    await call("/api/auth/email/start", { body: { email: "staff@example.test" } });
    const member = await call("/api/auth/email/verify", { body: { email: "staff@example.test", code: codeFor("staff@example.test"), label: "Staff phone" } });
    expect(member.status).toBe(200);
    expect(member.body.session.scopes).toEqual(["client"]);
    const cookie = cookieOf(member);
    const bots = await call("/api/bots", { headers: { cookie, origin: `https://${HOST}` } });
    expect(bots.status).toBe(200);
    const config = await call("/api/config", { method: "PUT", body: { language: "en" }, headers: { cookie, origin: `https://${HOST}` } });
    expect(config.status).toBe(403);

    await call("/api/auth/email/start", { body: { email: "anyone@team.example.test" } });
    const colleague = await call("/api/auth/email/verify", { body: { email: "anyone@team.example.test", code: codeFor("anyone@team.example.test") } });
    expect(colleague.status).toBe(200);
    expect(colleague.body.session.scopes).toEqual(["admin", "client"]);
    expect(colleague.body.session.label).toBe("Unnamed device");
  });

  it("locks a source out after repeated wrong codes, like pairing does", async () => {
    let last = 0;
    for (let i = 0; i < 12; i += 1) {
      const reply = await call("/api/auth/email/verify", { body: { email: "her@example.test", code: "99999999" }, from: "198.51.100.42" });
      last = reply.status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
    expect((await call("/api/auth/email/start", { body: { email: "her@example.test" }, from: "198.51.100.43" })).status).toBe(200);
    const code = codeFor("her@example.test");
    expect((await call("/api/auth/email/verify", { body: { email: "her@example.test", code }, from: "198.51.100.42" })).status).toBe(429);
    const other = await call("/api/auth/email/verify", { body: { email: "her@example.test", code }, from: "198.51.100.43" });
    expect(other.status).toBe(200);
  });

  it("revokes demoted email devices and live streams before the next frame, without changing paired devices", async () => {
    const owner = await signIn("her@example.test");
    const first = await signIn("anyone@team.example.test");
    const second = await signIn("anyone@team.example.test");
    const streams = await Promise.all([openEvents(first), openEvents(second)]);
    try {
      const ticket = await call("/api/auth/stream-ticket", { body: {}, headers: { cookie: first } });
      expect(ticket.status).toBe(200);
      const pairing = await call("/api/auth/pairing", { body: {}, headers: { cookie: owner } });
      expect(pairing.status).toBe(200);
      const paired = await call("/api/auth/pair", { body: { code: pairing.body.code, cookie: true, label: "QR device" } });
      expect(paired.status).toBe(200);
      const changed = await call("/api/config", {
        method: "PUT", headers: { cookie: owner },
        body: {
          signIn: { admins: ["her@example.test"], members: ["staff@example.test", "@team.example.test"] },
          profile: { name: "post-demotion-private-marker" },
        },
      });
      expect(changed.status).toBe(200);
      await Promise.all(streams.map((stream) => expect(stream.until(() => false, 2_000)).rejects.toThrow("SSE stream closed")));
      expect(JSON.stringify(streams.map((stream) => stream.frames))).not.toContain("post-demotion-private-marker");
      expect((await call("/api/bots", { headers: { cookie: first } })).status).toBe(401);
      expect((await call("/api/bots", { headers: { cookie: second } })).status).toBe(401);
      expect((await call(`/api/events?ticket=${ticket.body.ticket}`)).status).toBe(401);
      expect((await call("/api/auth/sessions", { headers: { cookie: cookieOf(paired) } })).status).toBe(200);

      const member = await signIn("anyone@team.example.test");
      expect((await call("/api/auth/session", { headers: { cookie: member } })).body.scopes).toEqual(["client"]);
      expect((await call("/api/config", { method: "PUT", headers: { cookie: member }, body: { language: "en" } })).status).toBe(403);
      expect((await call("/api/config", {
        method: "PUT", headers: { cookie: owner },
        body: { signIn: { admins: ["her@example.test", "@team.example.test"], members: ["staff@example.test"] } },
      })).status).toBe(200);
      expect((await call("/api/auth/session", { headers: { cookie: member } })).body.scopes).toEqual(["client"]);
    } finally { for (const stream of streams) stream.close(); }
  });

  it("ends an idle email stream after an external allow-list removal and never revives the old cookie", async () => {
    const cookie = await signIn("staff@example.test");
    const stream = await openEvents(cookie);
    const configPath = join(home!, ".crybot", "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    try {
      writeFileSync(configPath, JSON.stringify({ ...config, signIn: { ...config.signIn, members: [] } }));
      await expect(stream.until(() => false, 2_000)).rejects.toThrow("SSE stream closed");
      expect((await call("/api/bots", { headers: { cookie } })).status).toBe(401);
      expect((await call("/api/auth/email/start", { body: { email: "staff@example.test" } })).status).toBe(403);
      writeFileSync(configPath, JSON.stringify(config));
      expect((await call("/api/bots", { headers: { cookie } })).status).toBe(401);
    } finally { stream.close(); writeFileSync(configPath, JSON.stringify(config)); }
  });
});
