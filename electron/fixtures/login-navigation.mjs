import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { app, BrowserWindow } from "electron";
import { rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import path from "node:path";
import { attachLoginNavigation } from "../login-navigation.mjs";
import { loginHostMatches } from "../desktop-build-config.mjs";

const profile = mkdtempSync(path.join(tmpdir(), "crybot-login-fixture-"));
app.setPath("userData", profile);
const { address } = Object.values(networkInterfaces()).flat().find(network => network.internal && network.family === "IPv4");
app.commandLine.appendSwitch("host-resolver-rules", `MAP *.example.test ${address}`);
app.commandLine.appendSwitch("no-proxy-server");
app.on("window-all-closed", () => {});
const requests = [];
let port;
const url = (host, route) => `http://${host}.example.test:${port}${route}`;
const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const host = req.headers.host.split(":")[0];
  requests.push({ host, path: req.url, method: req.method, body, cookie: req.headers.cookie });
  const redirect = target => { res.writeHead(302, { location: target }); res.end(); };
  res.setHeader("content-type", "text/html");
  switch (`${host}${req.url}`) {
    case "server.example.test/start":
      res.end(`<a id="start" href="${url("gateway", "/login")}">Login</a>`);
      break;
    case "gateway.example.test/login": redirect(url("auth", "/login")); break;
    case "auth.example.test/login": redirect(url("passport", "/login")); break;
    case "passport.example.test/login": res.end("Ready to scan"); break;
    case "login.example.test/scan": redirect(url("accounts", "/confirm")); break;
    case "accounts.example.test/confirm":
      res.end(`<iframe src="${url("accounts", "/server-frame")}"></iframe>
        <iframe src="${url("accounts", "/outside-frame")}"></iframe>
        <form method="post" action="${url("server", "/callback")}">
          <input name="SAMLResponse" value="fixture-assertion"><input name="RelayState" value="fixture-state">
        </form>`);
      break;
    case "accounts.example.test/server-frame": redirect(url("server", "/frame")); break;
    case "accounts.example.test/outside-frame": redirect(url("outside", "/frame")); break;
    case "server.example.test/callback":
      if (req.method !== "POST" || body !== "SAMLResponse=fixture-assertion&RelayState=fixture-state") {
        res.writeHead(400); res.end("Invalid callback"); break;
      }
      res.writeHead(303, { location: url("server", "/done"), "set-cookie": "fixture_session=ready; Path=/; HttpOnly" });
      res.end();
      break;
    case "server.example.test/done": res.end(req.headers.cookie?.includes("fixture_session=ready") ? "Signed in" : "Not signed in"); break;
    default: res.end("Fixture frame");
  }
});
const until = async predicate => {
  const deadline = Date.now() + 15_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Fixture condition timed out");
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};
const timeout = setTimeout(() => { console.error("Electron login fixture timed out"); app.exit(1); }, 30_000);
async function run() {
  let exitCode = 0;
  try {
    server.listen(0, address);
    await once(server, "listening");
    port = server.address().port;
    await app.whenReady();
    const main = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const external = [], notices = [], logs = [], loginWindows = [];
    app.on("browser-window-created", (_event, opened) => loginWindows.push(opened));
    attachLoginNavigation({
      win: main, BrowserWindow, desktopBuild: {},
      loadDesktopWindow: (win, target) => win.loadURL(target),
      shell: { openExternal: async target => { external.push(target); } },
      dialog: { showMessageBox: async (_win, notice) => { notices.push(notice); } },
      slog: line => logs.push(line),
      loginAllowed: target => {
        const parsed = new URL(target);
        return !parsed.username && !parsed.password && parsed.protocol === "http:"
          && ["gateway", "auth", "passport", "login", "accounts"].some(host => loginHostMatches(parsed.hostname, `${host}.example.test`));
      },
      workspaceAllowed: target => new URL(target).origin === new URL(url("server", "/")).origin,
    });
    await main.loadURL(url("server", "/start"));
    await main.webContents.executeJavaScript('document.querySelector("#start").click()');
    await until(() => loginWindows.length === 1 && loginWindows[0].webContents.getURL() === url("passport", "/login") && !loginWindows[0].webContents.isLoading());
    const parent = loginWindows[0];
    await parent.webContents.executeJavaScript(`window.open(${JSON.stringify(url("login", "/scan"))}, "scan", "width=200,height=200"); void 0`, true);
    await until(() => loginWindows.length === 2 && !loginWindows[1].webContents.isLoading() && requests.some(req => req.host === "outside.example.test" && req.path === "/frame"));
    const child = loginWindows[1];
    assert.equal(child.webContents.getURL(), url("accounts", "/confirm"));
    assert.equal(requests.some(req => req.host === "server.example.test" && req.path === "/frame"), true);
    assert.equal(main.webContents.getURL(), url("server", "/start"));
    assert.equal(notices.length, 0);
    assert.equal(logs.length, 0);
    for (const opened of loginWindows) {
      assert.equal(opened.isDestroyed(), false);
      const [width, height] = opened.getMinimumSize();
      assert.ok(width >= 800 && height >= 640);
      const prefs = opened.webContents.getLastWebPreferences();
      assert.ok(!prefs.preload);
      assert.equal(prefs.sandbox, true);
      assert.equal(prefs.nodeIntegration, false);
    }
    await child.webContents.executeJavaScript(`window.open(${JSON.stringify(url("outside", "/blocked"))}); void 0`, true);
    await until(() => notices.length === 1);
    assert.deepEqual(logs, ["outside.example.test"]);
    assert.equal(BrowserWindow.getAllWindows().length, 3);
    await child.webContents.executeJavaScript('document.querySelector("form").submit()');
    await until(() => loginWindows.every(opened => opened.isDestroyed()) && main.webContents.getURL() === url("server", "/done") && !main.webContents.isLoading());
    assert.deepEqual(external, []);
    assert.equal(await main.webContents.executeJavaScript("document.body.textContent"), "Signed in");
    const callbacks = requests.filter(req => req.path === "/callback");
    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].method, "POST");
    assert.equal(callbacks[0].body, "SAMLResponse=fixture-assertion&RelayState=fixture-state");
    assert.equal(requests.filter(req => req.path === "/done").length, 2);
    for (const host of ["gateway", "auth", "passport", "login", "accounts"]) {
      assert.ok(requests.some(req => req.host === `${host}.example.test`));
    }
    console.log("PASS: real Electron redirect chain, managed popup, minimum size, no preload, subframes, POST body, shared session, all login windows closed, zero external opens");
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    for (const opened of BrowserWindow.getAllWindows()) opened.destroy();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(profile, { recursive: true, force: true });
    clearTimeout(timeout);
    app.exit(exitCode);
  }
}
void run();
