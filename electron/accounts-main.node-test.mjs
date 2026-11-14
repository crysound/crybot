import assert from "node:assert/strict";
import test from "node:test";
import { accountPlace, accountPlaces, clearPlaceStorage, createPlaceStash, withoutAccountPlaces, withoutPlaces, withPlacesBack } from "./account-places.mjs";
import { accountsView, createDesktopRing, installAccounts } from "./accounts-main.mjs";

const signedIn = { status: "connected", account: { id: "a", email: "a@example.test" }, deviceId: "d" };

function harness({ state = signedIn, others = [], placePage = () => true, ownPage = () => true } = {}) {
  const handlers = new Map(), calls = [];
  const client = { state: () => state, signOut: async () => { calls.push("client-sign-out"); return { status: "signed-out" }; } };
  const ring = { others: () => others, switchTo: async (id) => { calls.push(`switch:${id}`); return { outcome: "switched" }; }, signOut: async (id) => { calls.push(`sign-out:${id}`); return { outcome: "signed-out" }; },
    addStart: async (email) => { calls.push(`add:${email}`); return { outcome: "sent", email }; }, addVerify: async () => ({ outcome: "switched", email: "b@example.test" }) };
  const accounts = installAccounts({ ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) }, ownPage, placePage, account: () => client, client: () => client, ring: () => ring,
    holdSheet: (open) => calls.push(`hold:${open}`), tellSheet: () => calls.push("tell-sheet"), tell: () => calls.push("tell") });
  return { handlers, calls, accounts, call: (channel, ...args) => handlers.get(channel)({}, ...args) };
}

test("the view names the account in use and its address, never a token, and nothing while signed out; no page reads the others through it", () => {
  assert.deepEqual(accountsView(signedIn), { active: { id: "a", email: "a@example.test" } });
  assert.deepEqual(accountsView({ status: "reauth-required", account: { id: "a", email: "a@example.test" } }), { active: { id: "a", email: "a@example.test", signIn: true } });
  for (const state of [null, { status: "signed-out" }, { status: "connecting", account: { id: "a", email: "a@example.test" } }]) assert.deepEqual(accountsView(state), { active: null });
  assert.equal(JSON.stringify(accountsView({ ...signedIn, token: "omc_secret" })).includes("omc_"), false);
});

test("only this app's own pages read who is signed in or ask for account actions; no page opens a hosted sheet", async () => {
  const f = harness({ ownPage: () => false, others: [{ id: "b", email: "b@example.test" }] });
  for (const channel of ["accounts:list", "accounts:sign-out", "accounts:add-start", "accounts:add-verify", "accounts:add-browser", "accounts:add-reopen", "accounts:add-cancel", "accounts:sheet-pending", "accounts:sheet-closed"]) {
    await assert.rejects(async () => f.call(channel, "a"), /only available/, channel);
  }
  assert.equal(await f.call("accounts:offered"), false);
  assert.deepEqual(await f.call("accounts:open"), { outcome: "unavailable" });
  assert.deepEqual(f.calls, []);
  const refused = harness({ ownPage: () => false, placePage: () => false });
  assert.equal(await refused.call("accounts:offered"), false);
  assert.deepEqual(await refused.call("accounts:open"), { outcome: "unavailable" });
  assert.deepEqual(refused.calls, []);
});

test("no page can switch or read another account's address", async () => {
  const f = harness({ others: [{ id: "b", email: "b@example.test" }] });
  assert.equal(f.handlers.has("accounts:switch"), false);
  assert.deepEqual(await f.call("accounts:list"), { active: { id: "a", email: "a@example.test" } });
  assert.equal(JSON.stringify(await f.call("accounts:list")).includes("b@example.test"), false);
});

const places = {
  activeId: "cloud-a",
  environments: [
    { id: "home-a", origin: "https://home-a.test", name: "My Cloud", home: true },
    { id: "cloud-a", origin: "https://second-a.test", name: "Second", cloud: { id: "c2", role: "owner" } },
    { id: "team-a", origin: "https://shared-team.test", name: "Team", team: { id: "t1", role: "member" } },
    { id: "by-hand", origin: "https://mine.example", name: "By hand" },
    { id: "local-2", kind: "local", dataDir: "/x", name: "Another" },
  ],
};

test("an account's places are its Clouds and its teams'; a server saved by hand and a local workspace stay", () => {
  assert.equal(accountPlace(places.environments[3]), false);
  assert.equal(accountPlace(places.environments[3], "https://mine.example"), true, "My Cloud saved by hand before it was known to be one");
  assert.equal(accountPlace(places.environments[4], "https://mine.example"), false);
  const { saved, left } = withoutAccountPlaces(places);
  assert.deepEqual(left.map((entry) => entry.id), ["home-a", "cloud-a", "team-a"]);
  assert.deepEqual(saved.environments.map((entry) => entry.id), ["by-hand", "local-2"]);
  assert.equal(saved.activeId, "local", "the window showed one of them: This computer");
  assert.equal(withoutAccountPlaces({ ...places, activeId: "by-hand" }).saved.activeId, "by-hand");
});

test("a team's Cloud, which another account here may share, loses all it kept; a Cloud of one's own only its session", async () => {
  const cleared = [];
  await clearPlaceStorage({ clearStorageData: async (options) => { cleared.push(options); } }, places.environments.slice(0, 3));
  assert.deepEqual(cleared.find((entry) => entry.origin === "https://home-a.test").storages, ["cookies"]);
  assert.deepEqual(cleared.find((entry) => entry.origin === "https://second-a.test").storages, ["cookies"]);
  assert.deepEqual(cleared.find((entry) => entry.origin === "https://shared-team.test").storages, ["cookies", "localstorage", "indexdb", "cachestorage", "serviceworkers"]);
});

function memoryFile(start = null) { let held = start; return { read: () => held, write: (value) => { held = value; } }; }

test("an account's places wait with it and come back as they were: same ids, so what was lent to them comes back too", () => {
  const stash = createPlaceStash(memoryFile());
  const { saved: without, left } = withoutAccountPlaces(places);
  const rows = [{ id: "home-a", name: "My Cloud", color: "green", kind: "cloud", opens: true }];
  stash.put("a", left, rows);
  assert.deepEqual(stash.peek("b"), { places: [], rows: [] });
  assert.deepEqual(stash.peek("a").rows, rows, "what the rail shows while it waits");
  const backAgain = withPlacesBack(without, stash.take("a").places);
  assert.deepEqual(backAgain.environments.map((entry) => entry.id).sort(), ["by-hand", "cloud-a", "home-a", "local-2", "team-a"]);
  assert.deepEqual(stash.take("a"), { places: [], rows: [] }, "taken once");
  const keptOne = withPlacesBack({ ...without, environments: [...without.environments, { id: "new", origin: "https://shared-team.test", team: { id: "t1" } }] }, left);
  assert.equal(keptOne.environments.filter((entry) => entry.origin === "https://shared-team.test").length, 1, "a place at that address saved meanwhile stays the one");
  assert.deepEqual(createPlaceStash({ read: () => { throw new Error("unreadable"); }, write() {} }).take("a"), { places: [], rows: [] }, "an unreadable file is nothing kept");
});

test("a My Cloud saved by hand is the account's only while the sign-in names it; what left is removed by id, so a list that changed meanwhile loses nothing else", () => {
  const byHand = { id: "h", kind: "remote", origin: "https://byhand.example.test", name: "My server" };
  const saved = { activeId: "h", environments: [byHand, places.environments[3]] };
  assert.deepEqual(accountPlaces(saved, "https://byhand.example.test").map((entry) => entry.id), ["h"]);
  assert.deepEqual(accountPlaces(saved, null), [], "once the sign-in has ended, nothing says which server was My Cloud");
  const changed = { activeId: "h", environments: [...saved.environments, { id: "new", kind: "remote", origin: "https://new.example", name: "New" }] };
  assert.deepEqual(withoutPlaces(changed, [byHand]).environments.map((entry) => entry.id), ["by-hand", "new"]);
  assert.equal(withoutPlaces(changed, [byHand]).activeId, "local");
  assert.equal(withoutPlaces(changed, []), changed, "nothing to remove: the same list");
});

test("disabled account actions cannot sign in, sign out or hold a sheet", async () => {
  const f = harness();
  for (const channel of ["accounts:sign-out", "accounts:add-start", "accounts:add-verify", "accounts:add-browser", "accounts:add-reopen", "accounts:add-result", "accounts:add-cancel", "accounts:sheet-closed", "accounts:open"]) {
    assert.equal((await f.call(channel, "a")).outcome, "unavailable", channel);
  }
  assert.equal(await f.call("accounts:offered"), false);
  assert.equal(await f.call("accounts:sheet-pending"), false);
  assert.deepEqual(f.calls, []);
  const ring = createDesktopRing();
  assert.equal(ring(), null);
  assert.deepEqual(ring.waiting(), []);
  ring.close();
});
