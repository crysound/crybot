import { build as bundle } from "esbuild";
import { build as buildStyles } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const task = dirname(fileURLToPath(import.meta.url));
const root = resolve(task, "../../../..");
await mkdir(join(task, "screenshots"), { recursive: true });
const scratch = await mkdtemp(join(tmpdir(), "crybot-screens-ui-"));
const mock = `
export const requests = [];
export function picture(screen) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 800;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e9eff4"; ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = "#202f41"; ctx.fillRect(0, 0, 1280, 42);
  ctx.fillStyle = "#fff"; ctx.font = "18px sans-serif";
  ctx.fillText("Applications     Files     Browser", 24, 28);
  ctx.fillText("Screen " + screen, 1140, 28);
  ctx.fillStyle = "#fff"; ctx.fillRect(100, 100, 1080, 600);
  ctx.fillStyle = "#dce4ec"; ctx.fillRect(100, 100, 1080, 48);
  ctx.fillStyle = "#526174"; ctx.font = "18px sans-serif"; ctx.fillText("Workspace / screen-" + screen, 124, 131);
  ctx.fillStyle = "#1d334a"; ctx.font = "bold 32px sans-serif"; ctx.fillText("Research workspace", 148, 220);
  ctx.font = "20px sans-serif"; ctx.fillText("Independent files and browser session", 148, 266);
  const rows = ["Project notes", "Reference documents", "Draft report"];
  rows.forEach((row, i) => {
    ctx.fillStyle = "#f0f4f7"; ctx.fillRect(148, 310 + i * 90, 984, 66);
    ctx.fillStyle = "#3c5165"; ctx.fillText(row, 170, 350 + i * 90);
  });
  canvas.style.cssText = "width:100%;height:100%;object-fit:contain";
  return canvas;
}
export async function api(path, init = {}) {
  const body = JSON.parse(init.body || "{}"); requests.push({ path, body });
  if (path.endsWith("/control")) return { held: body.action === "take", owned: true, helpReason: null };
  if (path.endsWith("/screenshot")) return { image: picture(Number(path.split("/").at(-2))).toDataURL() };
  throw new Error("Unexpected fixture request: " + path);
}
export async function connectDesktop(element, target, options) {
  element.append(picture(Number(target.slice(-1))));
  setTimeout(options.events.connected, 0);
  return { focus() {}, disconnect() {}, sendKey() {} };
}
export function typeOnDesktop() {}
`;
const entry = `
import React from "react";
import { createRoot } from "react-dom/client";
import { LocalVmScreens } from "./src/components/LocalVmScreens";
import { setLocale } from "./src/lib/i18n";
import { requests } from "screens-fixture";
import { en, locales } from "./src/locales";
import english from "./src/locales/en.json";
import chinese from "./src/locales/zh.json";
Object.assign(en, english); locales.zh = chinese;
setLocale("zh");
window.fixtureRequests = requests;
const names = ["资料整理", "研究助手", "测试助手", "文档助手"];
const payload = { layout: "multi", screens: 4,
 slots: [1,2,3,4].map(screen => ({screen, state: "ready", bot: { id: "fixture-" + screen, name: names[screen - 1] },
 viewerTarget: "local/shared-s" + screen, controlledByPerson: false, idleSeconds: screen * 18})),
 queue: [{ bot: { id: "fixture-5", name: "分析助手" }, position: 1, waitingSeconds: 42 }]
};
createRoot(document.getElementById("root")).render(<main className="mx-auto max-w-[880px] p-4 sm:p-8">
 <header className="mb-5"><p className="text-[12px] text-ink-secondary">CRY BOT · 模拟数据预览</p>
 <h1 className="mt-2 text-[24px] font-semibold text-ink">共享云电脑</h1>
 <p className="mt-1 text-[13px] text-ink-secondary">4 块独立屏幕 · 默认 8 GB 内存 / 3 核</p></header>
 <LocalVmScreens payload={payload} />
</main>);
`;
let browser;
try {
  await bundle({
    stdin: { contents: entry, resolveDir: root, loader: "tsx" },
    absWorkingDir: root, bundle: true, outfile: join(scratch, "app.js"), format: "iife", platform: "browser",
    jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@": join(root, "src") },
    plugins: [{ name: "isolated-screen-fixture", setup(build) {
      build.onResolve({ filter: /^virtual:english-contracts$/ }, () => ({ path: "contracts", namespace: "contracts" }));
      build.onLoad({ filter: /.*/, namespace: "contracts" }, () => ({ contents: "export const localeKeyCount = 0;", loader: "js" }));
      build.onResolve({ filter: /^(screens-fixture|@\/state\/store|@\/lib\/desktop-connection)$/ }, () => ({ path: "screens-fixture", namespace: "fixture" }));
      build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: mock, loader: "js" }));
    } }],
  });
  await buildStyles({ configFile: false, root, plugins: [tailwindcss()], logLevel: "error",
    build: { cssMinify: false, outDir: join(scratch, "style"), emptyOutDir: true, rollupOptions: { input: join(root, "src/styles.css") } },
  });
  const styles = (await readdir(join(scratch, "style/assets"))).find(name => name.endsWith(".css"));
  await writeFile(join(scratch, "index.html"), `<!doctype html><html lang="zh-CN" data-skin="daylight"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style/assets/${styles}"></head><body class="bg-app text-ink"><div id="root"></div><script src="app.js"></script></body></html>`);
  browser = spawn(process.env.CHROMIUM_PATH ?? "chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-crashpad-for-testing", "--remote-debugging-pipe", `--user-data-dir=${join(scratch, "browser")}`], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
  let id = 0, buffer = "";
  const pending = new Map();
  let browserError = "";
  browser.stderr.on("data", chunk => { browserError += chunk.toString(); });
  const failed = () => {
    for (const callback of pending.values()) callback({ error: browserError || "Chromium closed its debugging pipe" });
    pending.clear();
  };
  browser.on("error", error => { browserError += error.message; failed(); });
  browser.on("exit", failed);
  browser.stdio[3].on("error", failed);
  browser.stdio[4].on("error", failed);
  browser.stdio[4].on("data", chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf("\0")) !== -1) {
      const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      const callback = pending.get(message.id);
      if (callback) { pending.delete(message.id); callback(message); }
    }
  });
  const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timeout: ${method}`)); }, 15_000);
    pending.set(key, message => {
      clearTimeout(timeout);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    });
    browser.stdio[3].write(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }) + "\0");
  });
  for (const [name, width, height, mobile] of [["desktop-four-screens", 1440, 1080, false], ["mobile-screen-takeover", 390, 844, true]]) {
    const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }, sessionId);
    await cdp("Page.enable", {}, sessionId);
    await cdp("Page.navigate", { url: pathToFileURL(join(scratch, "index.html")).href }, sessionId);
    const evaluate = async expression => {
      const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await evaluate(`new Promise((resolve, reject) => { const start = Date.now(); const check = () => {
      if (document.querySelector('img')) resolve(true);
      else if (Date.now() - start > 10000) reject(new Error('Fixture did not render'));
      else setTimeout(check, 50);
    }; check(); })`);
    await evaluate(`document.querySelector('[aria-label="观看第 2 块屏"]').click()`);
    if (mobile) {
      await evaluate(`new Promise(resolve => setTimeout(resolve, 100))`);
      await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('接管这块屏')).click()`);
      await evaluate(`new Promise((resolve, reject) => { const start = Date.now(); const check = () => {
        if (document.querySelector('[data-state="connected"]')) resolve(true);
        else if (Date.now() - start > 10000) reject(new Error('Takeover did not connect'));
        else setTimeout(check, 50);
      }; check(); })`);
      const requests = await evaluate(`window.fixtureRequests.filter(r => r.body.action === 'take')`);
      if (requests.length !== 1 || requests[0].body.target !== "local/shared-s2") throw new Error("Wrong screen taken");
      await evaluate(`document.querySelector('section[aria-label="第 2 块屏"]').scrollIntoView({block:'center'})`);
    }
    await evaluate(`document.fonts.ready`);
    const overflow = await evaluate(`document.documentElement.scrollWidth > innerWidth`);
    if (overflow) throw new Error(`${name}: horizontal overflow`);
    const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
    await writeFile(join(task, "screenshots", `${name}.png`), Buffer.from(data, "base64"));
    console.log(`${name}: ${width}×${height}, no horizontal overflow${mobile ? ", took local/shared-s2" : ""}`);
    await cdp("Target.closeTarget", { targetId });
  }
} finally {
  browser?.kill();
  await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
