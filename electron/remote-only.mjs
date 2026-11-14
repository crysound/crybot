import { loginNavigationAllowed } from "./desktop-build-config.mjs";
import { remoteServerErrorPage } from "./error-pages.mjs";

export function loadDesktopWindow(win, url, config) {
  const target = config.remoteOnly && !loginNavigationAllowed(url, { origin: config.defaultServerUrl }, config.loginHosts, { remoteOnly: true })
    ? config.defaultServerUrl : url;
  return win.loadURL(target);
}

export function remoteOnlyLoadFailed(win, config, { code, url, mainFrame }, text) {
  if (!config.remoteOnly || !mainFrame || code === -3 || !loginNavigationAllowed(url, { origin: config.defaultServerUrl }, config.loginHosts, { remoteOnly: true })) return false;
  void win.loadURL(remoteServerErrorPage(config.defaultServerUrl, text)).catch(() => {});
  return true;
}
