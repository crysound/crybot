const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parse } = require("yaml");
const { desktopBuildConfig, writeDesktopBuildConfig } = require("./scripts/desktop-build-config.cjs");

module.exports = () => {
  const config = parse(readFileSync(join(__dirname, "electron-builder.base.yml"), "utf8"));
  const desktop = desktopBuildConfig();
  const resource = join(__dirname, "dist-electron", "desktop-config.json");
  config.extraResources.push({ from: resource, to: "desktop-config.json" });
  config.beforePack = () => writeDesktopBuildConfig(resource, desktop);
  if (desktop.updateFeedUrl) config.publish = { provider: "generic", url: desktop.updateFeedUrl, useMultipleRangeRequest: false };
  config.mac.notarize = ["APPLE_API_KEY", "APPLE_API_KEY_ID", "APPLE_API_ISSUER"].every(name => Boolean(process.env[name]?.trim()));
  config.win.signExecutable = false;
  return config;
};
