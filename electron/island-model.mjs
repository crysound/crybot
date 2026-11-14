export const HIDDEN = Object.freeze({ mode: "hidden", botId: null, typing: false });

export function islandTransition(state, event) {
  if (["escape", "outside", "place", "dismiss"].includes(event.type)) return { ...HIDDEN };
  if (event.type === "enter" && state.mode === "hidden") return { ...state, mode: "summary" };
  if (event.type === "expand" && state.mode === "summary") return { ...HIDDEN, mode: "list" };
  if (event.type === "select" && state.mode === "list") return { mode: "chat", botId: event.botId, typing: false };
  if (event.type === "back" && state.mode === "chat") return { ...HIDDEN, mode: "list" };
  if (event.type === "typing" && state.mode === "chat") return { ...state, typing: event.value === true };
  if (event.type === "leave" && state.mode === "summary") return { ...HIDDEN };
  if (event.type === "timeout" && !state.typing && ["list", "chat"].includes(state.mode)) return { ...HIDDEN };
  return state;
}

export function islandGeometry(display, width = 200) {
  const menuHeight = Math.max(24, display.workArea.y - display.bounds.y);
  return { menuHeight, notched: menuHeight >= 32, sensorWidth: Math.min(320, Math.max(120, width)),
    x: Math.round(display.bounds.x + (display.bounds.width - 520) / 2), y: display.bounds.y, width: 520, height: 620 };
}

export function islandShape(mode, geometry) {
  if (mode === "hidden") return { width: geometry.sensorWidth, height: geometry.menuHeight, radius: 0 };
  if (mode === "summary") return { width: Math.min(500, geometry.sensorWidth + 260), height: geometry.menuHeight + 24, radius: 22 };
  return { width: 460, height: geometry.menuHeight + (mode === "list" ? 330 : 500), radius: 28 };
}

export function islandHitTest(point, geometry, mode) {
  const { width, height, radius } = islandShape(mode, geometry);
  const x = Math.abs(point.x - geometry.x - geometry.width / 2), y = point.y - geometry.y;
  if (x > width / 2 || y < 0 || y > height) return false;
  if (!radius || y <= height - radius || x <= width / 2 - radius) return true;
  return (x - width / 2 + radius) ** 2 + (y - height + radius) ** 2 <= radius ** 2;
}

export function botStatus(bot, online = true) {
  if (!online || ["dead", "no-signal"].includes(bot.activity)) return "offline";
  if (bot.activity === "waiting-on-you" || bot.tasks?.some(task => task.activity === "waiting-on-you")) return "waiting";
  return bot.busy || bot.activity === "working" || bot.tasks?.some(task => task.busy) ? "working" : "idle";
}
export const sortIslandBots = bots => [...bots].filter(bot => !bot.hidden).sort((a, b) => Number(botStatus(b) === "waiting") - Number(botStatus(a) === "waiting"));
export const islandCounts = (bots, online = true) => ({ total: bots.length, working: bots.filter(bot => botStatus(bot, online) === "working").length, waiting: bots.filter(bot => botStatus(bot, online) === "waiting").length });
export function latestThread(bot) {
  return [...(bot.tasks ?? [])].filter(task => !task.routineRunId && !task.archivedAt && !task.botApi)
    .sort((a, b) => (b.lastThreadOrderAt ?? b.createdAt ?? 0) - (a.lastThreadOrderAt ?? a.createdAt ?? 0))[0]?.threadId ?? bot.threadId;
}

export function islandSource({ url, localOrigin, activeId, localKey, remoteOrigin, revision = 0, ready = true }) {
  if (!ready) return null;
  try {
    const origin = new URL(url).origin;
    if (origin === localOrigin) return { key: `${activeId}:${localKey}:${origin}:${revision}`, origin, local: true };
    if (origin === remoteOrigin) return { key: `${activeId}:${origin}:${revision}`, origin, local: false };
  } catch {}
  return null;
}

export function islandPermission(card) {
  return Boolean(card?.requestId && card.requestType === "permission" && !card.answered && !card.dismissed && !card.expired && !card.stopped
    && !Object.keys(card).some(key => key.endsWith("Request") && card[key])
    && !card.computerAsk && !card.outsideWrite && !card.lendingLift && !card.quotaSwitch && !card.fixedOptions && !card.autoApplied);
}
