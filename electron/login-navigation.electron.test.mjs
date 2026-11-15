import { execFile, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const electron = createRequire(import.meta.url)("electron");
const fixture = fileURLToPath(new URL("./fixtures/login-navigation.mjs", import.meta.url));
const xvfb = process.platform === "linux" && !process.env.DISPLAY
  ? spawnSync("which", ["xvfb-run"], { encoding: "utf8" }).stdout?.trim()
  : "";
const canRun = process.platform !== "linux" || Boolean(process.env.DISPLAY) || Boolean(xvfb);

it.runIf(canRun)("completes a real login through a managed popup, subframes and a POST callback without external navigation", async () => {
  const args = ["--no-sandbox", "--log-level=3", fixture];
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = await promisify(execFile)(xvfb || electron, xvfb ? ["-a", electron, ...args] : args, {
    env, timeout: 45_000,
  }).catch(error => { throw new Error(`Electron fixture failed\n${error.stdout}\n${error.stderr}`, { cause: error }); });
  expect(result.stdout, result.stderr).toContain("PASS: real Electron redirect chain");
}, 50_000);
