import assert from "node:assert/strict";
import { launchVerificationServer, runControlCry, type VerificationServer } from "../../../scripts/control-cry.ts";
import type { ContractSample } from "./fixtures.ts";

type JsonObject = Record<string, unknown>;
export type LiveCapture = { samples: ContractSample[]; statuses: Record<string, number>; frames: JsonObject[] };

export async function captureLiveContract(server: VerificationServer): Promise<LiveCapture> {
  const { url } = server.info;
  const statuses: Record<string, number> = {};
  let token: string | undefined;
  const request = async (path: string, body?: unknown, expected = 200): Promise<JsonObject> => {
    const headers = new Headers({ "content-type": "application/json" });
    if (token) headers.set("authorization", `Bearer ${token}`);
    else headers.set("origin", url);
    const response = await fetch(`${url}${path}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    statuses[path] = response.status;
    assert.equal(response.status, expected, `${path}: unexpected HTTP status`);
    const value: unknown = await response.json();
    assert(value && typeof value === "object" && !Array.isArray(value), `${path}: expected object`);
    return value as JsonObject;
  };
  const pairing = await request("/api/auth/pairing", { label: "Contract device", scopes: ["client", "admin"] });
  assert.equal(typeof pairing.code, "string");
  const paired = await request("/api/auth/pair", { code: pairing.code, label: "Contract device" });
  assert.equal(typeof paired.token, "string");
  token = String(paired.token);
  const session = await request("/api/auth/session");
  assert.equal(session.kind, "session");
  assert.equal(session.via, "bearer");
  const created = await runControlCry(["new-bot", "--name", "Contract Bot", "--url", url]) as { bot: { id: string; threadId: string } };
  const { id: botId, threadId } = created.bot;
  assert(botId && threadId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const frames: JsonObject[] = [];
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let send: JsonObject;
  try {
    const response = await fetch(`${url}/api/events?screens=off`, { headers: { authorization: `Bearer ${token}` }, signal: controller.signal });
    statuses["/api/events"] = response.status;
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream/);
    assert(response.body);
    reader = response.body.getReader();
    send = await request(`/api/bots/${botId}/messages`, { text: "Contract message", threadId }, 202);
    assert.equal(send.ok, true);
    assert.equal(send.threadId, threadId);
    const decoder = new TextDecoder();
    let buffer = "";
    while (!(frames.some(f => f.kind === "hello") && frames.some(f => f.kind === "message" && (f.message as JsonObject)?.role === "user") && frames.some(f => f.kind === "runtime" && (f.event as JsonObject)?.type === "turn.completed") && frames.some(f => f.kind === "ping"))) {
      const chunk = await reader.read();
      assert(!chunk.done, "SSE ended before required frames");
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, "\n");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = block.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (data) frames.push(JSON.parse(data) as JsonObject);
      }
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
    await reader?.cancel().catch(() => undefined);
  }
  const page = await request(`/api/threads/${threadId}/messages`);
  assert(Array.isArray(page.messages));
  const last = page.messages.at(-1) as JsonObject | undefined;
  assert(last && typeof last.id === "string");
  const before = await request(`/api/threads/${threadId}/messages?before=${encodeURIComponent(last.id)}`);
  assert(Array.isArray(before.messages));
  assert(before.messages.length > 0, "pagination must contain an older message");
  assert(!before.messages.some((message: JsonObject) => message.id === last.id));
  const samples: ContractSample[] = [
    { name: "live-session", swiftType: "AuthSession", value: session },
    { name: "live-send", swiftType: "SendResponse", value: send },
    { name: "live-messages", swiftType: "ThreadPage", value: page },
    { name: "live-before", swiftType: "ThreadPage", value: before },
  ];
  for (const [path, name, swiftType] of [
    ["/api/bots?messages=20", "bots", "BotsSnapshot"],
    ["/api/inbox", "inbox", "InboxPage"], ["/api/inbox/count", "inbox-count", "InboxCount"],
    ["/api/notifications", "notifications", "NotificationsPage"], ["/api/config", "config", "ConfigResponse"],
    ["/.well-known/crybot/environment", "environment", "EnvironmentInfo"],
  ]) {
    const value = await request(path);
    if (swiftType === "BotsSnapshot") { assert(Array.isArray(value.bots)); assert(value.bots.some((bot: JsonObject) => bot.id === botId)); }
    if (swiftType === "InboxPage") assert(Array.isArray(value.rows));
    if (swiftType === "InboxCount") assert.equal(typeof value.count, "number");
    if (swiftType === "NotificationsPage") assert(Array.isArray(value.notifications));
    if (swiftType === "EnvironmentInfo") { assert.equal(typeof value.environmentId, "string"); assert.equal((value.capabilities as JsonObject)?.remoteSessions, true); }
    if (swiftType === "ConfigResponse") assert(Object.keys(value).length > 0 && !("error" in value));
    samples.push({ name: `live-${name}`, swiftType, value });
  }
  const pairError = await request("/api/auth/pair", { code: pairing.code }, 401);
  assert.equal(typeof pairError.error, "string");
  assert.equal(pairError.errorKey, "serverError.pair.codeWrong");
  samples.push({ name: "live-pair-error", swiftType: "APIError", value: pairError });
  for (const kind of ["hello", "message", "runtime", "ping"]) {
    const frame = frames.find(f => f.kind === kind && (kind !== "message" || (f.message as JsonObject).role === "user") && (kind !== "runtime" || (f.event as JsonObject).type === "turn.started"));
    assert(frame, `missing ${kind} frame`);
    samples.push({ name: `live-${kind}`, swiftType: "ServerFrame", value: frame });
  }
  return { samples, statuses, frames };
}

export async function launchAndCapture(): Promise<LiveCapture> {
  const server = await launchVerificationServer({ ...process.env, FAKE_CLAUDE_VERSION: "2.1.284" });
  try { return await captureLiveContract(server); }
  finally { await server.close(); }
}
