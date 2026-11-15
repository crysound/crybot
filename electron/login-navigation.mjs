import { externalLinkUrl } from "./app-permissions.mjs";

function safeNavigationUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function loginNavigationKind({ url, loginAllowed, workspaceAllowed, loginInProgress }) {
  if (!safeNavigationUrl(url)) return loginInProgress ? "blocked-login" : "external";
  if (workspaceAllowed(url)) return "server";
  if (loginAllowed(url)) return "login";
  return loginInProgress ? "blocked-login" : "external";
}

export function navigationHostname(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.hostname : null;
  } catch {
    return null;
  }
}

export function attachLoginNavigation({
  win, BrowserWindow, desktopBuild, loadDesktopWindow, shell, dialog, slog,
  loginAllowed, workspaceAllowed,
}) {
  const loginWindows = new Set();
  const currentLoginWindow = () => [...loginWindows].at(-1);
  let loginInProgress = false;
  const showLoginBlockedNotice = url => {
    const hostname = navigationHostname(url) ?? "unknown";
    slog(hostname);
    void dialog.showMessageBox(currentLoginWindow() ?? win, {
      type: "warning",
      message: `登录跳到了未允许的网址 ${hostname}，请联系管理员`,
    }).catch(() => {});
  };
  const finishLogin = url => {
    loginInProgress = false;
    for (const opened of loginWindows) if (!opened.isDestroyed()) opened.close();
    loginWindows.clear();
    if (url && !win.isDestroyed()) void loadDesktopWindow(win, url, desktopBuild).catch(() => {});
  };
  const loginWindowOptions = {
    width: 1_000,
    height: 760,
    minWidth: 800,
    minHeight: 640,
    show: true,
    parent: win,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  };
  const manageLoginWindow = opened => {
    loginWindows.add(opened);
    loginInProgress = true;
    opened.on("closed", () => {
      loginWindows.delete(opened);
      if (!loginWindows.size) loginInProgress = false;
    });
    const handleLoginNavigation = (event, target, _isInPlace, isMainFrame = true) => {
      if (!isMainFrame) return;
      const kind = loginNavigationKind({ url: target, loginAllowed: value => loginAllowed(value), workspaceAllowed, loginInProgress });
      if (kind === "blocked-login") {
        event.preventDefault();
        showLoginBlockedNotice(target);
      }
    };
    opened.webContents.on("will-navigate", handleLoginNavigation);
    opened.webContents.on("will-redirect", handleLoginNavigation);
    opened.webContents.on("did-frame-finish-load", (_event, isMainFrame) => {
      if (!isMainFrame || !loginWindows.has(opened)) return;
      const target = opened.webContents.getURL();
      if (loginNavigationKind({ url: target, loginAllowed, workspaceAllowed, loginInProgress }) === "server") finishLogin(target);
    });
    opened.webContents.on("did-create-window", child => manageLoginWindow(child));
    opened.webContents.setWindowOpenHandler(({ url: target }) => {
      const kind = loginNavigationKind({ url: target, loginAllowed: value => loginAllowed(value, { popup: true }), workspaceAllowed, loginInProgress });
      if (kind === "login" || kind === "server") return { action: "allow", overrideBrowserWindowOptions: loginWindowOptions };
      if (kind === "blocked-login") showLoginBlockedNotice(target);
      else openNavigationExternal(target);
      return { action: "deny" };
    });
  };
  const openLoginWindow = url => {
    let opened = currentLoginWindow();
    if (!opened) {
      opened = new BrowserWindow(loginWindowOptions);
      manageLoginWindow(opened);
    }
    opened.show();
    void opened.loadURL(url).catch(() => {});
  };
  win.on("closed", () => finishLogin());
  const externalOpenedAt = new Map();
  const openNavigationExternal = url => {
    try {
      const external = externalLinkUrl(url);
      const now = Date.now();
      for (const [target, at] of externalOpenedAt) if (now - at >= 2_000) externalOpenedAt.delete(target);
      if (externalOpenedAt.has(external)) return;
      externalOpenedAt.set(external, now);
      void shell.openExternal(external).catch(() => {
        console.warn("The external web link could not be opened");
      });
    } catch {}
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    const kind = loginNavigationKind({ url, loginAllowed: value => loginAllowed(value, { popup: true }), workspaceAllowed, loginInProgress });
    if (kind === "login") { openLoginWindow(url); return { action: "deny" }; }
    if (kind === "server" && loginInProgress) { openLoginWindow(url); return { action: "deny" }; }
    if (kind === "blocked-login") { showLoginBlockedNotice(url); return { action: "deny" }; }
    openNavigationExternal(url);
    return { action: "deny" };
  });
  const guardNavigation = (event, url, _isInPlace, isMainFrame = true) => {
    if (!isMainFrame) return;
    const kind = loginNavigationKind({ url, loginAllowed, workspaceAllowed, loginInProgress });
    if (kind === "server") return;
    if (kind === "login") {
      event.preventDefault();
      openLoginWindow(url);
      return;
    }
    event.preventDefault();
    if (kind === "blocked-login") {
      showLoginBlockedNotice(url);
      return;
    }
    let origin = null;
    try { origin = new URL(url).origin; } catch {}
    slog(`blocked navigation to ${origin ?? "an invalid address"}`);
    openNavigationExternal(url);
  };
  win.webContents.on("will-navigate", guardNavigation);
  win.webContents.on("will-redirect", guardNavigation);
}
