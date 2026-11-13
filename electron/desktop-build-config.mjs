import { readFileSync } from "node:fs";
import { join } from "node:path";
import environments from "./environments.cjs";

export function readDesktopBuildConfig(resourcesPath) {
  try {
    const config = JSON.parse(readFileSync(join(resourcesPath, "desktop-config.json"), "utf8"));
    return {
      defaultServerUrl: environments.normalizeOrigin(config.defaultServerUrl),
      loginHosts: Array.isArray(config.loginHosts) ? config.loginHosts.filter(host => typeof host === "string") : [],
      updateFeedUrl: typeof config.updateFeedUrl === "string" && /^https?:\/\//.test(config.updateFeedUrl) ? config.updateFeedUrl : null,
    };
  } catch {
    return { defaultServerUrl: null, loginHosts: [], updateFeedUrl: null };
  }
}

export function defaultServerEnvironment(state, config, hasSavedFile, makeId) {
  if (hasSavedFile || !config.defaultServerUrl) return state;
  const next = environments.withEnvironment(state, { origin: config.defaultServerUrl }, makeId);
  const remote = next.environments.find(entry => entry.origin === config.defaultServerUrl);
  return remote ? environments.withActive(next, remote.id) : state;
}

export function loginNavigationAllowed(target, remote, loginHosts) {
  if (!remote) return false;
  try {
    const url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    return url.hostname === new URL(remote.origin).hostname || loginHosts.includes(url.hostname);
  } catch { return false; }
}
