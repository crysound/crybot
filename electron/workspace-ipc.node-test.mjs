import assert from "node:assert/strict";
import test from "node:test";
import { installPlaceLook } from "./place-look.mjs";
import { installRail } from "./rail.mjs";

const server = { id: "server", name: "Fixture server", opens: true, removable: true, forget: true, makeHome: true };
const profile = { id: "profile:fixture", profile: "fixture", name: "Fixture workspace", opens: true };
const event = { trusted: true };

function railFixture(remoteOnly) {
  const handlers = new Map(), calls = [];
  const observe = (name, result) => (...args) => { calls.push([name, ...args]); return result; };
  installRail({ config: { remoteOnly }, ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    guard: handler => (sender, ...args) => {
      calls.push(["guard", sender]);
      if (!sender.trusted) throw new Error("untrusted sender");
      return handler(sender, ...args);
    },
    trusted: sender => sender.trusted, places: observe("places", [server, profile]),
    open: observe("open", "opened"), makeHome: observe("makeHome", "home"), forget: observe("forget", true),
    add: { choices: observe("choices", { link: true, address: true }), run: observe("add", "added"), probe: observe("probe", "probed") },
    account: observe("account", null), targets: () => [],
    local: { creatable: observe("creatable", true), create: observe("create", { outcome: "made", id: "new" }),
      rename: observe("rename", "renamed"), recolor: observe("recolor", "recolored"), remove: observe("remove", "removed"), cancel: observe("cancel") },
  });
  return { handlers, calls };
}

const railCases = [
  ["places", [], { places: [server, profile], add: { link: true, address: true, cloud: false, organization: false, account: false, local: true } }, ["places"]],
  ["open", ["server"], "opened", ["open", "server"]],
  ["add", ["link", " https://fixture.example.test ", " code "], "added", ["add", "link", "https://fixture.example.test", "code"]],
  ["probe", [" https://fixture.example.test ", " code "], "probed", ["probe", "https://fixture.example.test", "code"]],
  ["remove", ["server"], { outcome: "removed" }, ["forget", "server"]],
  ["make-home", ["server"], "home", ["makeHome", "server"]],
  ["local-new", ["Fixture", "blue"], { outcome: "made", id: "new" }, ["create", { name: "Fixture", color: "blue" }]],
  ["local-edit", ["profile:fixture", { name: "Renamed" }], "renamed", ["rename", "fixture", "Renamed"]],
  ["local-edit", ["profile:fixture", { color: null }], "recolored", ["recolor", "fixture", null]],
  ["local-remove", ["profile:fixture"], "removed", ["remove", "fixture"]],
];

for (const remoteOnly of [true, false]) {
  for (const [name, args, result, effect] of railCases) {
    test(`rail workspaces:${name} ${JSON.stringify(args)} with remoteOnly=${remoteOnly}`, async () => {
      const { handlers, calls } = railFixture(remoteOnly);
      const handle = handlers.get(`workspaces:${name}`);
      if (remoteOnly) {
        assert.throws(() => handle(event, ...args), /Workspaces are unavailable in remote-only mode/);
        assert.deepEqual(calls, []);
      } else {
        assert.deepEqual(await handle(event, ...args), result);
        assert.deepEqual(calls[0], ["guard", event]);
        const observed = calls.find(([name]) => name === effect[0]);
        assert.deepEqual(observed.slice(0, effect.length), effect);
        assert.throws(() => handle({ trusted: false }, ...args), /untrusted sender/);
      }
    });
  }
}

function lookFixture(remoteOnly) {
  const handlers = new Map(), calls = [], entry = { id: "local", kind: "local", name: "Fixture", color: null };
  installPlaceLook({ config: { remoteOnly }, ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    guard: handler => (sender, ...args) => {
      calls.push(["guard", sender]);
      if (!sender.trusted) throw new Error("untrusted sender");
      return handler(sender, ...args);
    },
    place: () => { calls.push(["place"]); return entry; }, session: () => { calls.push(["session"]); return {}; },
    setColor: () => { throw new Error("local color must not reach the Admin"); },
    save: (id, color) => { calls.push(["save", id, color]); entry.color = color; },
    rail: { owns: sender => { calls.push(["owns", sender]); return sender.trusted; },
      places: () => [{ id: "local", paint: {} }], saved: () => entry },
  });
  return { handlers, calls, entry };
}

for (const remoteOnly of [true, false]) {
  for (const [name, args] of [["look", []], ["color", ["rose"]], ["recolor", ["local", "rose"]]]) {
    test(`place look workspaces:${name} with remoteOnly=${remoteOnly}`, async () => {
      const { handlers, calls, entry } = lookFixture(remoteOnly);
      const handle = handlers.get(`workspaces:${name}`);
      if (remoteOnly) {
        assert.throws(() => handle(event, ...args), /Workspaces are unavailable in remote-only mode/);
        assert.deepEqual(calls, []);
        assert.equal(entry.color, null);
      } else {
        const result = await handle(event, ...args);
        if (name === "look") {
          assert.deepEqual(result, { name: "Fixture", color: null, swatch: null, change: "local" });
          assert.equal(calls.some(([name]) => name === "save"), false);
        } else {
          assert.deepEqual(result, { outcome: "saved", look: { name: "Fixture", color: "red", swatch: "rose", change: "local" } });
          assert.deepEqual(calls.filter(([name]) => name === "save"), [["save", "local", "red"]]);
        }
        assert.throws(() => handle({ trusted: false }, ...args), /untrusted sender|only available to the window's rail/);
      }
    });
  }
}
