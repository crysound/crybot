import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import localOrigin from "./local-origin.cjs";
import environments from "./environments.cjs";
import { hostedAvailable, hostedDisabledState } from "./cloud-disabled.mjs";

// The preload bridge and the main IPC handler run from their real sources without Electron; the client behind them is a stub.
const ORIGIN = "http://127.0.0.1:48993";

function preload({ company = true } = {}) {
  const invoked = [];
  let bridge;
  const context = vm.createContext({
    process: { platform: "fixture", argv: [`--cry-local-origin=${ORIGIN}`, ...(company ? ["--cry-company-desktop=1"] : [])] },
    location: { origin: ORIGIN }, TextEncoder, localStorage: { getItem: () => null },
    require: name => {
      assert.equal(name, "electron");
      return { webUtils: {}, contextBridge: { exposeInMainWorld: (_key, value) => { bridge = value; } }, ipcRenderer: {
        on: () => {}, removeListener: () => {}, send: () => {},
        invoke: (...args) => { invoked.push(args); return Promise.resolve({ status: "connecting" }); },
      } };
    },
  });
  vm.runInContext(readFileSync(new URL("./preload.cjs", import.meta.url), "utf8"), context);
  return { bridge, invoked };
}

test("the preload exposes no organization sign-in or reopen bridge", () => {
  for (const company of [true, false]) {
    const f = preload({ company });
    assert.equal(f.bridge.organization, undefined);
    assert.deepEqual(f.invoked, []);
  }
});

const mainSource = readFileSync(new URL("./main.mjs", import.meta.url), "utf8");
function section(start, end) {
  const from = mainSource.indexOf(start), to = mainSource.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Main-process test section moved: ${start}`);
  return mainSource.slice(from, to);
}
const registrations = section("const workspaceOnly =", 'ipcMain.on("company-backups:client-state"');

function main() {
  const handlers = new Map(), calls = [];
  const frame = { url: `${ORIGIN}/` }, contents = { mainFrame: frame };
  const client = { reopen: (...args) => { calls.push(args); return { status: "connecting" }; } };
  localOrigin.setLocalOrigin(ORIGIN);
  const context = vm.createContext({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler), on: (channel, handler) => handlers.set(channel, handler) },
    localOnly: localOrigin.localOnly, workspaceSenderAllowed: environments.workspaceSenderAllowed,
    mainWindow: { webContents: contents }, rendererOrigin: () => ORIGIN, environmentsState: { environments: [], activeId: "local" },
    hostedAvailable, hostedDisabledState,
    ensureManagedDesktop: () => client, organizationEntry: {},
  });
  vm.runInContext(registrations, context, { filename: "main.mjs (organization IPC fixture)" });
  return { handlers, calls, context, event: { sender: contents, senderFrame: frame } };
}

test("organization:reopen returns disabled without forwarding renderer input to a client", async () => {
  const f = main();
  assert.deepEqual(await f.handlers.get("organization:reopen")(f.event, "https://attacker.example.test"), hostedDisabledState);
  assert.deepEqual(f.calls, []);
});

test("organization:reopen answers only the local main window's exact main frame", () => {
  const f = main();
  const reopen = sender => f.handlers.get("organization:reopen")(sender);
  const subframe = { sender: f.event.sender, senderFrame: { url: `${ORIGIN}/embedded` } };
  const anotherWindow = { sender: { mainFrame: f.event.senderFrame }, senderFrame: f.event.senderFrame };
  const external = { sender: f.event.sender, senderFrame: { url: "https://untrusted.example.test/" } };
  for (const sender of [subframe, anotherWindow, external, { sender: f.event.sender }]) assert.throws(() => reopen(sender), /only available/);
  f.context.environmentsState = { activeId: "remote", environments: [{ id: "remote", origin: "https://workspace.example.test", name: "Remote" }] };
  assert.throws(() => reopen({ sender: f.event.sender, senderFrame: { url: "https://workspace.example.test/" } }), /only available/);
  assert.deepEqual(f.calls, []);
});
