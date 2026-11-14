import { defaultServerEnvironment, loginNavigationAllowed } from "./desktop-build-config.mjs";
import { remoteServerErrorPage } from "./error-pages.mjs";
import environments from "./environments.cjs";

export function desktopWindowTarget(url, config) {
  return config.remoteOnly && !loginNavigationAllowed(url, { origin: config.defaultServerUrl }, config.loginHosts, { remoteOnly: true })
    ? config.defaultServerUrl : url;
}

export function loadDesktopWindow(win, url, config) {
  return win.loadURL(desktopWindowTarget(url, config));
}

export function remoteOnlyFailurePage(config, { code, url, mainFrame }, text) {
  if (!config.remoteOnly || !mainFrame || code === -3 || !loginNavigationAllowed(url, { origin: config.defaultServerUrl }, config.loginHosts, { remoteOnly: true })) return null;
  return remoteServerErrorPage(config.defaultServerUrl, text);
}

export function remoteOnlyLoadFailed(win, config, failure, text) {
  const page = remoteOnlyFailurePage(config, failure, text);
  if (!page) return false;
  void win.loadURL(page).catch(() => {});
  return true;
}

export function desktopReloadAction(config, { mainWindow, url, ignoreCache }) {
  if (config.remoteOnly && mainWindow) {
    let sameOrigin = false;
    try { sameOrigin = new URL(url).origin === new URL(config.defaultServerUrl).origin; } catch {}
    if (!sameOrigin) return { url: config.defaultServerUrl };
  }
  return { method: ignoreCache ? "reloadIgnoringCache" : "reload" };
}

export function reloadDesktopWindow(win, mainWindow, config, ignoreCache, navigate) {
  if (!win || win.isDestroyed()) return;
  const action = desktopReloadAction(config, { mainWindow: win === mainWindow, url: win.webContents.getURL(), ignoreCache });
  if (action.url) return navigate(action.url);
  win.webContents[action.method]();
}

export function desktopEnvironmentsToSave(next, config, randomUUID) {
  return config.remoteOnly ? defaultServerEnvironment(next, config, true, randomUUID) : next;
}

export function desktopEnvironmentSaveFailure(config, error) {
  return config.remoteOnly ? `remote-only environments save failed: ${error?.message ?? error}` : null;
}

export function workspaceActionsAllowed(config) { return !config.remoteOnly; }

export function workspaceHandler(config, handler) {
  return (...args) => {
    if (!workspaceActionsAllowed(config)) throw new Error("Workspaces are unavailable in remote-only mode");
    return handler(...args);
  };
}

export function desktopStartupUrl(config, state, handSaved) {
  if (config.remoteOnly) return config.defaultServerUrl;
  const remote = environments.activeRemote(state);
  return remote && handSaved(remote) ? remote.origin : null;
}
