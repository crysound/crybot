import { useEffect, useRef, useState } from "react";
import { BotAvatar } from "../components/Avatar";
import { t } from "../lib/i18n";
import { botStatus, islandCounts, islandPermission, islandShape, sortIslandBots } from "../../electron/island-model.mjs";
import type { IslandBridge, IslandGeometry, IslandSnapshot, IslandState } from "../../shared/island";
import type { WireBot } from "../../shared/wire";

export interface IslandProps {
  state: IslandState;
  snapshot: IslandSnapshot;
  geometry: IslandGeometry;
  bridge: IslandBridge;
}

export function Island({ state, snapshot, geometry, bridge }: IslandProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const revision = useRef(snapshot.revision);
  revision.current = snapshot.revision;
  const messages = useRef<HTMLDivElement>(null);
  const shape = islandShape(state.mode, geometry);
  const bots = sortIslandBots(snapshot.bots);
  const bot = bots.find(bot => bot.id === state.botId);
  const chat = snapshot.chat?.botId === bot?.id ? snapshot.chat : null;
  useEffect(() => { setDraft(""); setError(false); setPending(false); }, [snapshot.revision, state.botId]);
  useEffect(() => { messages.current?.scrollTo?.({ top: messages.current.scrollHeight }); }, [chat?.messages, chat?.streaming]);
  const run = async (action: () => Promise<void>) => {
    const started = snapshot.revision;
    setPending(true); setError(false);
    try { await action(); } catch { if (revision.current === started) setError(true); } finally { if (revision.current === started) setPending(false); }
  };
  const action = (type: "expand" | "back" | "dismiss" | "escape") => void run(() => bridge.action({ type }));
  const avatar = (bot: WireBot, size: number) => <BotAvatar bot={bot.avatarUrl && !snapshot.avatars[bot.avatarUrl] ? { ...bot, avatarUrl: null } : bot} rasterSource={bot.avatarUrl ? snapshot.avatars[bot.avatarUrl] : undefined} size={size} animated={false} />;
  const status = (bot: WireBot) => <span className={`status ${botStatus(bot, snapshot.online)}`}>{t(`island.${botStatus(bot, snapshot.online)}`)}</span>;
  return <main className={`island ${state.mode}`} data-mode={state.mode} style={{ paddingTop: geometry.menuHeight, width: shape.width, height: shape.height }}
    onKeyDown={event => { if (event.key === "Escape") action("escape"); }}>
    {state.mode === "summary" && <button className="summary-body" onClick={() => action("expand")} aria-label={t("island.title")}>
      {!state.notice && <span className="avatar-stack">{bots.slice(0, 6).map(bot => <span key={bot.id}>{avatar(bot, 22)}</span>)}{bots.length > 6 && <span className="overflow-count">+{bots.length - 6}</span>}</span>}
      <span className="summary-text">{state.notice ? t("island.placeChanged") : snapshot.online ? t("island.total", islandCounts(bots, snapshot.online)) : t("island.offline")}</span>
    </button>}
    {state.mode === "list" && <div className="agent-grid" aria-label={t("island.title")}>
      {bots.map(bot => <button className={`agent ${botStatus(bot, snapshot.online)}`} key={bot.id} onClick={() => void run(() => bridge.action({ type: "select", botId: bot.id }))}>
        <span className="agent-avatar">{avatar(bot, 52)}<i className={`status-dot ${botStatus(bot, snapshot.online)}`} /></span>
        <strong title={bot.name}>{bot.name}</strong>{status(bot)}
        <span className="task" title={bot.tasks?.find(task => task.busy || task.activity === "waiting-on-you")?.title ?? bot.tasks?.[0]?.title ?? bot.title}>{bot.tasks?.find(task => task.busy || task.activity === "waiting-on-you")?.title ?? bot.tasks?.[0]?.title ?? bot.title}</span>
      </button>)}
      {!bots.length && <p className="empty">{t(snapshot.online ? "island.empty" : "island.offline")}</p>}
    </div>}
    {state.mode === "chat" && bot && <div className="chat-body">
      <header><button className="back" aria-label={t("island.back")} onClick={() => action("back")}>←</button>{avatar(bot, 32)}<div className="identity"><strong>{bot.name}</strong>{status(bot)}</div><button className="open-main" onClick={() => void run(() => bridge.open(snapshot.revision))}>{t("island.open")} ↗</button></header>
      <div className="messages" ref={messages} aria-live="polite">
        {chat?.messages.filter(message => message.kind === "text" || message.card).map(message => <div key={message.id} className={`bubble ${message.role === "user" ? "user" : "bot"}`}>
          {message.text}{message.card && <div className="approval"><strong>{message.card.title}</strong><p>{message.card.subtitle}</p>
            {islandPermission(message.card) && <div className="approval-buttons">
              <button disabled={pending || !snapshot.online} className="send" onClick={() => void run(() => bridge.respond(snapshot.revision, message.card!.requestId!, "allow"))}>{t("island.allow")}</button>
              <button disabled={pending || !snapshot.online} onClick={() => void run(() => bridge.respond(snapshot.revision, message.card!.requestId!, "deny"))}>{t("island.deny")}</button>
            </div>}
            {!islandPermission(message.card) && <button onClick={() => void run(() => bridge.open(snapshot.revision))}>{t("island.open")} ↗</button>}
          </div>}
        </div>)}
        {chat?.streaming && <div className="bubble bot streaming">{chat.streaming}</div>}
      </div>
      <form onSubmit={event => { event.preventDefault(); if (!draft.trim() || pending) return; void run(async () => { await bridge.send(snapshot.revision, draft); if (revision.current !== snapshot.revision) return; setDraft(""); await bridge.action({ type: "typing", value: false }); }); }}>
        <input value={draft} placeholder={t("island.input", { name: bot.name })} aria-label={t("island.input", { name: bot.name })}
          onFocus={() => void bridge.action({ type: "typing", value: true })} onBlur={() => void bridge.action({ type: "typing", value: Boolean(draft) })}
          onChange={event => { setDraft(event.target.value); void bridge.action({ type: "typing", value: true }); }} />
        <div className="composer-buttons"><button type="button" onClick={() => action("dismiss")}>{t("island.cancel")}</button><button className="send" disabled={!draft.trim() || pending || !snapshot.online} type="submit">{t("island.send")}</button></div>
      </form>
    </div>}
    {error && state.mode !== "hidden" && <div className="error" role="alert">{t("island.error")}</div>}
  </main>;
}
