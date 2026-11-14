import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./preload.cjs", import.meta.url), "utf8");
const origin = "http://127.0.0.1:48992";
function load({ remote, active = true }) {
  const invoked = [];
  let bridge;
  const context = vm.createContext({
    process: { platform: "fixture", argv: [`--cry-local-origin=${origin}`, "--cry-company-desktop=1"] },
    location: { origin: remote ? "https://cry-u-aaaaaaaaaaaa.example.test" : origin }, TextEncoder,
    navigator: { userActivation: { isActive: active } },
    localStorage: { getItem: () => null },
    require: () => ({ webUtils: {}, contextBridge: { exposeInMainWorld: (_key, value) => { bridge = value; } }, ipcRenderer: {
      on: () => {}, removeListener: () => {}, send: () => {}, sendSync: () => false,
      invoke: (...args) => { invoked.push(args); return Promise.resolve(null); },
    } }),
  });
  vm.runInContext(source, context);
  return { bridge, invoked };
}

test("the My Cloud page gets no Files bridge at all", () => {
  const remote = load({ remote: true });
  assert.equal(remote.bridge.cloudAccount, undefined);
  assert.equal(remote.bridge.cloudSync, undefined);
});

test("this computer has no hosted Files bridge even with user activation", () => {
  for (const active of [true, false]) {
    const local = load({ remote: false, active });
    assert.equal(local.bridge.cloudAccount, undefined);
    assert.equal(local.bridge.cloudSync, undefined);
    assert.deepEqual(local.invoked, []);
  }
});
