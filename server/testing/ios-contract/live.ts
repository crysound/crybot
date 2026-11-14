import { launchVerificationServer, type VerificationServer } from "../../../scripts/control-cry.ts";

export type LiveCapture = Record<string, unknown>;

export async function captureLiveContract(server: VerificationServer): Promise<LiveCapture> {
  const { url } = server.info;
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${url}${path}`, { ...init, headers: { origin: url, ...(init.headers ?? {}) } });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const get = async (path: string) => (await request(path)).body;
  const bots = await get("/api/bots?messages=20") as { bots?: Array<{ id?: string; threadId?: string }> };
  const bot = bots.bots?.[0];
  const thread = bot?.threadId;
  const result: LiveCapture = {
    bots,
    config: await get("/api/config"),
    environment: await get("/.well-known/crybot/environment"),
    inbox: await get("/api/inbox"),
    inboxCount: await get("/api/inbox/count"),
    notifications: await get("/api/notifications"),
    session: (await request("/api/auth/session", { headers: { authorization: "Bearer cry_sess_placeholder" } })).body,
  };
  if (thread) result.messages = await get(`/api/threads/${encodeURIComponent(thread)}/messages`);
  if (thread) {
    result.messagesBefore = await get(`/api/threads/${encodeURIComponent(thread)}/messages?before=00000000-0000-4000-8000-000000000000`);
    if (bot?.id) {
      result.send = await request(`/api/bots/${encodeURIComponent(bot.id)}/messages`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer cry_sess_placeholder" }, body: JSON.stringify({ text: "contract fixture", threadId: thread }) });
    }
  }
  result.events = await request("/api/events", { headers: { authorization: "Bearer cry_sess_placeholder" } });
  result.pairError = await request("/api/auth/pair", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "invalid" }) });
  return result;
}

export async function launchAndCapture(): Promise<{ server: VerificationServer; capture: LiveCapture }> {
  const server = await launchVerificationServer({ ...process.env, FAKE_CLAUDE_VERSION: "2.1.284" });
  return { server, capture: await captureLiveContract(server) };
}
