const { mkdirSync, writeFileSync } = require("node:fs");
const { dirname } = require("node:path");

function webUrl(value, name) {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new Error(`${name} must be an HTTP(S) URL without credentials, query or fragment`);
  return url;
}

function desktopBuildConfig(env = process.env) {
  const server = webUrl(env.CRYBOT_DEFAULT_SERVER_URL, "CRYBOT_DEFAULT_SERVER_URL");
  if (server && server.pathname !== "/") throw new Error("CRYBOT_DEFAULT_SERVER_URL must be a server origin");
  const feed = webUrl(env.CRYBOT_UPDATE_FEED_URL, "CRYBOT_UPDATE_FEED_URL");
  const loginHosts = [...new Set((env.CRYBOT_LOGIN_HOSTS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean))];
  if (loginHosts.some(host => !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(host))) throw new Error("CRYBOT_LOGIN_HOSTS must contain exact hostnames, without schemes, ports or wildcards");
  return { defaultServerUrl: server?.origin ?? null, loginHosts, updateFeedUrl: feed?.href ?? null };
}

function writeDesktopBuildConfig(file, config) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
}

module.exports = { desktopBuildConfig, writeDesktopBuildConfig };
