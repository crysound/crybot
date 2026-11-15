import { fileURLToPath } from "node:url";
import { HIDDEN, islandGeometry, islandHitTest, islandTransition } from "./island-model.mjs";
import { createIslandData } from "./island-data.mjs";

const panels = new WeakSet();
export const isIslandWindow = win => panels.has(win);

export function openIslandChat({ window, reveal }, chat, place) {
  const win = window();
  const matches = () => {
    if (!chat || !place?.origin || !win || win.isDestroyed() || win.webContents.isLoadingMainFrame()) return false;
    try { return new URL(win.webContents.getURL()).origin === place.origin; } catch { return false; }
  };
  const ready = matches();
  reveal();
  if (!ready || window() !== win || !matches()) return false;
  win.webContents.send("desktop-notifications:open", { botId: chat.botId, threadId: chat.threadId });
  return true;
}

export function createIsland({ platform = process.platform, BrowserWindow, screen, ipcMain, prefs, source, request, page, panelSession, language, openChat }) {
  if (platform !== "darwin") return { refresh() {}, close() {} };
  let closed = false, timer = null;
  let win = null, loaded = false, state = { ...HIDDEN }, inside = false, leaveTimer = null, geometry;
  const payload = () => ({ state, snapshot: data.snapshot(), geometry, language: language() });
  const publish = () => { if (!closed && loaded && win && !win.isDestroyed()) win.webContents.send("island:update", payload()); };
  const data = createIslandData({ source: () => prefs.island().enabled ? source() : null, request, changed: publish });
  function act(action) {
    if (closed) return;
    const wasExpanded = ["list", "chat"].includes(state.mode);
    const next = islandTransition(state, action);
    const hiding = next.mode === "hidden";
    if (state.notice && next !== state) { clearTimeout(leaveTimer); leaveTimer = null; }
    state = next;
    if (!["list", "chat"].includes(next.mode)) {
      win?.setFocusable(false);
      if (wasExpanded) win?.blur();
    }
    if (hiding) {
      clearTimeout(leaveTimer);
      win?.setIgnoreMouseEvents(true, { forward: true });
      if (data.snapshot().chat) data.clearChat();
    }
    publish();
  }
  function position() {
    if (closed) return;
    geometry = islandGeometry(screen.getPrimaryDisplay(), prefs.island().width);
    if (win) {
      const { x, y, width, height } = geometry;
      win.setBounds({ x, y, width, height });
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: prefs.island().fullscreen });
    }
    publish();
  }
  function create() {
    if (closed) return;
    position();
    win = new BrowserWindow({ x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height,
      type: "panel", transparent: true, backgroundColor: "#00000000", frame: false, resizable: false, movable: false, show: false,
      minimizable: false, maximizable: false, fullscreenable: false,
      // Electron/macOS: lets a click on an inactive window reach the page.
      acceptFirstMouse: true,
      focusable: false, skipTaskbar: true, hiddenInMissionControl: true, hasShadow: false,
      webPreferences: { ...(panelSession ? { session: panelSession } : {}), preload: fileURLToPath(new URL("./island-preload.cjs", import.meta.url)), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    panels.add(win);
    win.excludedFromShownWindowsMenu = true;
    win.setAlwaysOnTop(true, "screen-saver");
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: prefs.island().fullscreen });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", event => event.preventDefault());
    win.webContents.on("before-input-event", (event, input) => { if (input.key === "Escape") { event.preventDefault(); act({ type: "escape" }); } });
    win.on("blur", () => { if (["list", "chat"].includes(state.mode)) act({ type: "outside" }); });
    win.on("closed", () => { win = null; loaded = false; });
    win.webContents.on("did-finish-load", () => { if (closed || !win) return; loaded = true; if (prefs.island().enabled) win.showInactive(); publish(); });
    void win.loadURL(page).catch(() => {});
  }
  const allowed = event => !closed && win && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame;
  const handle = (name, run) => ipcMain.handle(`island:${name}`, (event, ...args) => {
    // Only this bundled panel may exercise the island's write bridge.
    if (!allowed(event)) throw new Error("not-island");
    if (name !== "open") refresh();
    return run(...args);
  });
  handle("ready", () => payload());
  handle("action", async action => {
    if (!action || typeof action.type !== "string") return;
    const wasExpanded = ["list", "chat"].includes(state.mode);
    if (action.type === "select" && state.mode === "list") {
      await data.select(action.botId);
      act(action);
    } else {
      if (action.type === "back") data.clearChat();
      act(action);
    }
    if (!closed && win && !wasExpanded && ["list", "chat"].includes(state.mode)) { win.setFocusable(true); win.showInactive(); win.focus(); }
  });
  handle("send", (revision, text) => data.send(revision, text));
  handle("respond", (revision, requestId, behavior) => data.respond(revision, requestId, behavior));
  handle("open", revision => {
    const target = data.openTarget(revision);
    if (data.sync()) act({ type: "place" });
    const opened = openChat(target?.chat, target?.place);
    act({ type: "dismiss" });
    if (!opened && !closed && prefs.island().enabled) {
      state = { ...HIDDEN, mode: "summary", notice: "place-changed" };
      win?.showInactive();
      leaveTimer = setTimeout(() => act({ type: "dismiss" }), 3000);
      publish();
    }
  });
  function refresh() {
    if (closed) return;
    if (data.sync() && !state.notice) act({ type: "place" });
    if (!prefs.island().enabled) {
      if (timer !== null || win?.isVisible()) {
        clearInterval(timer); timer = null;
        inside = false;
        act({ type: "dismiss" });
        win?.hide();
      }
      return;
    }
    if (timer === null) { timer = setInterval(trackPointer, 100); timer.unref?.(); }
    if (!win) create();
    else if (loaded && !win.isVisible()) win.showInactive();
  }
  function trackPointer() {
    refresh();
    if (!win || !loaded || !prefs.island().enabled) return;
    const cursor = screen.getCursorScreenPoint();
    const nextInside = islandHitTest(cursor, geometry, state.mode);
    win.setIgnoreMouseEvents(!nextInside || state.mode === "hidden", { forward: true });
    if (state.notice) return;
    if (nextInside) {
      clearTimeout(leaveTimer); leaveTimer = null;
      if (!inside) act({ type: "enter" });
    } else if (inside) {
      act({ type: "leave" });
      leaveTimer = setTimeout(() => { leaveTimer = null; act({ type: "timeout" }); }, 1000);
    }
    if (!nextInside && !state.typing && state.mode === "chat" && !leaveTimer) leaveTimer = setTimeout(() => { leaveTimer = null; act({ type: "timeout" }); }, 1000);
    inside = nextInside;
  }
  const displays = () => { position(); act({ type: "dismiss" }); };
  screen.on("display-metrics-changed", displays);
  screen.on("display-added", displays);
  screen.on("display-removed", displays);
  refresh();
  return {
    refresh() { refresh(); position(); },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(timer); clearTimeout(leaveTimer); data.close();
      for (const name of ["ready", "action", "send", "respond", "open"]) ipcMain.removeHandler(`island:${name}`);
      for (const name of ["display-metrics-changed", "display-added", "display-removed"]) screen.removeListener(name, displays);
      win?.destroy();
    },
  };
}
