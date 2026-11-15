import { readFileSync } from "node:fs";
import { join } from "node:path";
import environments from "./environments.cjs";

const loginHostPattern = /^\.?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/;

export function loginHostMatches(hostname, entry) {
  if (typeof hostname !== "string" || typeof entry !== "string") return false;
  const host = hostname.toLowerCase();
  const rule = entry.toLowerCase();
  if (!rule.startsWith(".")) return host === rule;
  const suffix = rule.slice(1);
  return Boolean(suffix) && (host === suffix || host.endsWith(`.${suffix}`));
}

function secureBuildUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (!(url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) || url.username || url.password || url.hash || url.search) return null;
    return value;
  } catch { return null; }
}

export function readDesktopBuildConfig(resourcesPath) {
  try {
    const config = JSON.parse(readFileSync(join(resourcesPath, "desktop-config.json"), "utf8"));
    const defaultServerUrl = environments.normalizeOrigin(secureBuildUrl(config.defaultServerUrl));
    return {
      defaultServerUrl,
      loginHosts: Array.isArray(config.loginHosts) ? config.loginHosts.filter(host => typeof host === "string" && loginHostPattern.test(host)) : [],
      updateFeedUrl: secureBuildUrl(config.updateFeedUrl),
      providerLock: config.providerLock === true,
      remoteOnly: config.remoteOnly === true && Boolean(defaultServerUrl),
    };
  } catch {
    return { defaultServerUrl: null, loginHosts: [], updateFeedUrl: null, providerLock: false, remoteOnly: false };
  }
}

export function defaultServerEnvironment(state, config, hasSavedFile, makeId) {
  if ((hasSavedFile && !config.remoteOnly) || !config.defaultServerUrl) return state;
  const next = environments.withEnvironment(state, { origin: config.defaultServerUrl }, makeId);
  const remote = next.environments.find(entry => entry.origin === config.defaultServerUrl);
  return remote ? environments.withActive(next, remote.id) : state;
}

export function localServerEnvironment(config, environment) {
  return { ...environment, ...(config.providerLock === true ? { CRYBOT_PROVIDER_LOCK: "1" } : {}) };
}

export function loginNavigationAllowed(target, remote, loginHosts, { popup = false, remoteOnly = false } = {}) {
  if (!remote) return false;
  try {
    const url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    return (!popup && (remoteOnly ? url.origin === remote.origin : url.hostname === new URL(remote.origin).hostname)) || loginHosts.some(entry => loginHostMatches(url.hostname, entry));
  } catch { return false; }
}
