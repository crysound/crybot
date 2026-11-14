import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "@typescript/typescript6";
import { createCompanionAccountService, resolveCompanionControlPlaneURL } from "./account-service.mjs";
import { installAccounts } from "./accounts-main.mjs";
import { disabledCloudAccount, hostedAvailable, hostedDisabledState, localEnvironmentsStore } from "./cloud-disabled.mjs";
import { installRail, railPlaces } from "./rail.mjs";

const main = ts.createSourceFile("main.mjs", readFileSync(new URL("./main.mjs", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function initializer(name) {
  for (const statement of main.statements) if (ts.isVariableStatement(statement)) {
    const found = statement.declarationList.declarations.find(node => ts.isIdentifier(node.name) && node.name.text === name);
    if (found?.initializer) return found.initializer.getText(main);
  }
  throw new Error(`Missing initializer: ${name}`);
}
function declaration(name) {
  const found = main.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(found, name);
  return found.getText(main);
}

test("a disabled hosted service returns unavailable without credentials, timers or network", async () => {
  assert.equal(resolveCompanionControlPlaneURL({ isPackaged: true, environment: { arbitrary: "https://example.test" } }), "");
  assert.equal(hostedAvailable, false);
  const fail = () => assert.fail("disabled service used an external dependency");
  let writes = 0, stops = 0;
  const account = createCompanionAccountService({ readCredentials: () => ({}), updateCredentials: async update => { assert.deepEqual(update({}), {}); writes++; }, setTimer: fail, autoRecover: true, onDemand: true, stopManagedEndpoint: async () => { stops++; } });
  try {
    assert.equal((await account.requestCode("person@example.test")).available, false);
    assert.equal((await account.verifyCode("person@example.test", "123456")).available, false);
    for (const method of ["state", "prepare", "retry", "restore"]) assert.equal((await account[method]()).available, false, method);
    assert.deepEqual([writes, stops], [0, 0]);
    assert.equal((await account.signOut()).available, false);
    assert.deepEqual([writes, stops], [1, 1]);
  } finally { account.dispose(); }
});

test("main never constructs hosted sync, team or organization clients while disabled", async () => {
  const context = vm.createContext({ hostedAvailable, disabledCloudAccount });
  const sync = vm.runInContext(`(${initializer("cloudSync")})`, context);
  assert.equal(sync.running(), false);
  sync.start(); sync.close();
  const teams = vm.runInContext(`(${initializer("teamLinks")})`, context);
  assert.equal(teams.fromUrl("crybot://team/example"), false);
  assert.equal(teams.fromArgs(["crybot://team/example"]), false);
  assert.equal(vm.runInContext(`${declaration("ensureManagedDesktop")}\nensureManagedDesktop()`, context), disabledCloudAccount);
  assert.equal(await vm.runInContext(`${declaration("openCloudEntry")}\nopenCloudEntry()`, context), false);
  assert.equal(await vm.runInContext(`${declaration("deliverOrganizationEntry")}\ndeliverOrganizationEntry()`, context), false);
  vm.runInContext(`${declaration("publicManagedCompanionState")}\n${declaration("startManagedCompanionConnection")}`, context);
  const tunnel = await vm.runInContext("startManagedCompanionConnection()", context);
  assert.deepEqual(JSON.parse(JSON.stringify(tunnel)), { status: "unconfigured", configured: false, ready: false });
  for (const method of ["begin", "reopen", "cancelEnrollment", "refresh", "disconnect", "requestBackup"]) assert.equal(await disabledCloudAccount[method](), hostedDisabledState);
});

test("organization and backup IPC return disabled before invoking their handlers", async () => {
  const context = vm.createContext({ hostedAvailable, hostedDisabledState, localOnly: (_channel, handler) => handler, workspaceOnly: handler => handler });
  const guard = vm.runInContext(`(${initializer("localWorkspaceOnly")})`, context);
  for (const channel of ["organization:state", "organization:begin", "organization:disconnect", "company-backups:configure-schedule", "company-backups:list", "company-backups:restore"]) {
    assert.equal(await guard(channel, () => assert.fail(channel))({}), hostedDisabledState);
  }
  assert.equal(await guard("environments:state", () => "local")({}), "local");
});

test("account IPC offers no sign-in sheet and responds without a client", async () => {
  const handlers = new Map();
  installAccounts({ ipcMain: { handle: (name, handler) => handlers.set(name, handler) }, ownPage: () => true, account: () => null, client: () => disabledCloudAccount, tell() {} });
  assert.equal(handlers.get("accounts:offered")({}), false);
  assert.equal(handlers.get("accounts:sheet-pending")({}), false);
  for (const name of ["open", "sign-out", "add-start", "add-verify", "add-browser", "add-reopen", "add-result", "add-cancel"]) {
    assert.equal((await handlers.get(`accounts:${name}`)({})).outcome, "unavailable", name);
  }
});

test("the rail keeps local and saved servers, hides hosted places, and registers no purchase channels", async () => {
  const saved = { activeId: "local", environments: [
    { id: "local", kind: "local", name: "Computer" },
    { id: "server", kind: "remote", name: "Office", origin: "https://office.example.test" },
    { id: "hosted", kind: "remote", name: "Hosted", origin: "https://hosted.example.test", cloud: { id: "cloud-1" } },
    { id: "team", kind: "remote", name: "Team", origin: "https://team.example.test", team: { id: "team-1" } },
  ] };
  const places = railPlaces({ saved });
  assert.deepEqual(places.map(place => place.id), ["local", "server"]);
  const handlers = new Map(), added = [], opened = [];
  installRail({ ipcMain: { handle: (name, handler) => handlers.set(name, handler) }, guard: handler => handler, trusted: () => true, places: () => places,
    open: id => opened.push(id), account: () => null, targets: () => [],
    add: { choices: () => ({ cloud: false, link: true, address: true }), run: (...args) => added.push(args) } });
  assert.equal([...handlers.keys()].some(name => name.startsWith("cloud-add:")), false);
  const state = handlers.get("workspaces:places")({});
  assert.deepEqual(state.add, { cloud: false, link: true, address: true, organization: false, account: false, local: false });
  await handlers.get("workspaces:open")({}, "server");
  assert.deepEqual(opened, ["server"]);
  await handlers.get("workspaces:add")({}, "link", "https://office.example.test", "ABCD");
  assert.deepEqual(added, [["link", "https://office.example.test", "ABCD"]]);
  assert.throws(() => handlers.get("workspaces:add")({}, "cloud"));
});

test("saved hosted places stay on disk but cannot open, poll or appear in server menus", () => {
  const hosted = { id: "cloud", origin: "https://hosted.example.test", home: true };
  const server = { id: "office", origin: "https://office.example.test", name: "Office" };
  let saved = { activeId: "cloud", environments: [server, hosted] };
  const store = localEnvironmentsStore({ read: () => saved, write: next => { saved = next; } });
  const visible = store.read();
  assert.equal(visible.activeId, "local");
  assert.deepEqual(visible.environments, [server]);
  store.write({ ...visible, activeId: "office", environments: [{ ...server, name: "Renamed" }] });
  assert.deepEqual(saved.environments, [{ ...server, name: "Renamed" }, hosted]);
  assert.equal(store.read().activeId, "office");
  store.write({ activeId: "local", environments: [] });
  assert.deepEqual(saved.environments, [hosted]);
  assert.deepEqual(store.read().environments, []);
});
