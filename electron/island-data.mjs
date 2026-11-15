import { readFrames } from "./talk-server.mjs";
import { latestThread, islandPermission } from "./island-model.mjs";

const attachment = /^\/api\/attachments\/[A-Za-z0-9-]+\.(png|jpg|gif|webp)$/;

export function createIslandData({ source, request, changed, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let closed = false;
  let current = null, reading = null, retry = null, chatTurn = 0, streamItem = null;
  let chatUpdates = null;
  let snapshot = { revision: 0, bots: [], avatars: {}, online: false, chat: null };
  const publish = () => { if (!closed) changed(snapshot); };
  const valid = token => !closed && reading === token && !token.signal.aborted && source()?.key === current?.key;
  const json = async (route, init, token = reading) => {
    if (!token || !valid(token)) throw new Error("place-changed");
    const response = await request(current, route, { ...init, signal: AbortSignal.any([token.signal, AbortSignal.timeout(20_000)]) });
    if (!response.ok) throw new Error("request-failed");
    const body = await response.json();
    if (!valid(token)) throw new Error("place-changed");
    return body;
  };
  async function avatars(token) {
    for (const bot of snapshot.bots) {
      if (!valid(token)) return;
      const url = bot.avatarUrl;
      if (!attachment.test(url) || snapshot.avatars[url]) continue;
      try {
        const response = await request(current, url, { signal: token.signal });
        if (!response.ok) continue;
        const bytes = await response.arrayBuffer();
        if (!valid(token)) return;
        if (bytes.byteLength > 5 * 1024 * 1024) continue;
        const mime = { png: "png", jpg: "jpeg", gif: "gif", webp: "webp" }[url.split(".").at(-1)];
        snapshot = { ...snapshot, avatars: { ...snapshot.avatars, [url]: `data:image/${mime};base64,${Buffer.from(bytes).toString("base64")}` } };
        publish();
      } catch {}
    }
  }
  async function refreshChat(token = reading) {
    const chat = snapshot.chat;
    if (!chat) return;
    const turn = ++chatTurn;
    chatUpdates = [];
    const body = await json(`/api/threads/${encodeURIComponent(chat.threadId)}/messages?limit=20`, {}, token).catch(error => {
      if (turn === chatTurn) chatUpdates = null;
      throw error;
    });
    if (turn !== chatTurn || snapshot.chat?.threadId !== chat.threadId) return;
    const messages = new Map((body.messages ?? []).map(message => [message.id, message]));
    for (const message of chatUpdates ?? []) messages.set(message.id, message);
    chatUpdates = null;
    snapshot = { ...snapshot, chat: { ...snapshot.chat, messages: [...messages.values()].slice(-20) } };
    publish();
  }
  function frame(value, token) {
    if (!valid(token)) return;
    if (value.kind === "bot") {
      snapshot = { ...snapshot, bots: [...snapshot.bots.filter(bot => bot.id !== value.bot.id), value.bot] };
      void avatars(token);
    } else if (value.kind === "bot.deleted") {
      snapshot = { ...snapshot, bots: snapshot.bots.filter(bot => bot.id !== value.botId) };
    } else if ((value.kind === "message" || value.kind === "message.patch") && value.threadId === snapshot.chat?.threadId) {
      chatUpdates?.push(value.message);
      const messages = new Map(snapshot.chat.messages.map(message => [message.id, message]));
      messages.set(value.message.id, value.message);
      snapshot = { ...snapshot, chat: { ...snapshot.chat, messages: [...messages.values()].slice(-20), streaming: value.message.role === "bot" && value.message.kind === "text" ? "" : snapshot.chat.streaming } };
    } else if (value.kind === "runtime" && value.event.threadId === snapshot.chat?.threadId) {
      const event = value.event;
      if (event.type === "content.delta" && event.streamKind === "assistant_text") {
        const earlier = streamItem === event.itemId ? snapshot.chat.streaming : "";
        streamItem = event.itemId;
        snapshot = { ...snapshot, chat: { ...snapshot.chat, streaming: earlier + event.delta } };
      }
      if (event.type === "item.completed" && event.itemType === "assistant_text") snapshot = { ...snapshot, chat: { ...snapshot.chat, streaming: event.text } };
      if (event.type === "turn.completed") { snapshot = { ...snapshot, chat: { ...snapshot.chat, streaming: "" } }; void refreshChat(token).catch(() => {}); }
    } else if (value.kind === "thread" && value.threadId === snapshot.chat?.threadId) void refreshChat(token).catch(() => {});
    publish();
  }
  async function connect(token) {
    try {
      const response = await request(current, "/api/events?screens=off", { signal: token.signal });
      if (!response.ok || !response.body) throw new Error("events-failed");
      let initialized = false;
      const buffered = [];
      const stream = readFrames(response.body, value => initialized ? frame(value, token) : buffered.push(value), token.signal).catch(() => {});
      const body = await json("/api/bots?messages=0", {}, token);
      snapshot = { ...snapshot, bots: body.bots ?? [], online: true };
      initialized = true;
      for (const value of buffered) frame(value, token);
      publish();
      void avatars(token);
      await refreshChat(token);
      await stream;
    } catch {} finally {
      if (valid(token)) {
        token.abort();
        snapshot = { ...snapshot, online: false };
        publish();
        retry = setTimer(() => { if (!closed && reading === token && source()?.key === current?.key) { reading = new AbortController(); void connect(reading); } }, 2000);
      }
    }
  }
  function sync() {
    if (closed) return false;
    const next = source();
    if (next?.key === current?.key) return false;
    reading?.abort();
    clearTimer(retry);
    current = next;
    chatTurn++; streamItem = null; chatUpdates = null;
    snapshot = { revision: snapshot.revision + 1, bots: [], avatars: {}, online: false, chat: null };
    publish();
    reading = next ? new AbortController() : null;
    if (reading) void connect(reading);
    return true;
  }
  const guard = revision => {
    sync();
    if (closed || !snapshot.online || revision !== snapshot.revision || !snapshot.chat) throw new Error("place-changed");
    return snapshot.chat;
  };
  const post = (route, body) => json(route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return {
    sync, snapshot: () => snapshot,
    async select(botId) {
      if (closed) throw new Error("island-closed");
      sync();
      const bot = snapshot.bots.find(candidate => candidate.id === botId);
      if (!bot) throw new Error("missing-bot");
      streamItem = null; chatUpdates = null;
      snapshot = { ...snapshot, revision: snapshot.revision + 1, chat: { botId, threadId: latestThread(bot), messages: [], streaming: "" } };
      publish();
      await refreshChat();
    },
    clearChat() { chatTurn++; snapshot = { ...snapshot, revision: snapshot.revision + 1, chat: null }; publish(); },
    async send(revision, text) {
      const chat = guard(revision);
      if (typeof text !== "string" || !text.trim() || text.length > 20000) throw new Error("invalid-message");
      await post(`/api/bots/${encodeURIComponent(chat.botId)}/messages`, { text: text.trim(), threadId: chat.threadId, sendId: crypto.randomUUID() });
    },
    async respond(revision, requestId, behavior) {
      const chat = guard(revision);
      if (!["allow", "deny"].includes(behavior) || !chat.messages.some(message => message.card?.requestId === requestId && islandPermission(message.card))) throw new Error("invalid-approval");
      await post(`/api/threads/${encodeURIComponent(chat.threadId)}/respond`, { requestId, behavior });
      await refreshChat();
    },
    openTarget(revision) {
      return !closed && revision === snapshot.revision && snapshot.chat && current ? { chat: snapshot.chat, place: current } : null;
    },
    close() { closed = true; reading?.abort(); clearTimer(retry); current = null; },
  };
}
