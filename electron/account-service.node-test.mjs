import assert from "node:assert/strict";
import test from "node:test";
import { createCompanionAccountService } from "./account-service.mjs";

const instance = "10000000-0000-4000-8000-000000000001";
const oldCredentials = () => ({
  companionClientInstanceId: instance,
  companionAccountToken: "fixture-old-account-token",
  companionAccountUserId: "fixture-user",
  companionAccountEmail: "person@example.test",
  companionInstallationId: instance,
  companionInstallationCredential: `cry_install_${"a".repeat(22)}.${"b".repeat(43)}`,
  companionInstallationCredentialExpiresAt: 1_900_000_000_000,
  companionAccountCleanupPending: true,
  companionEndpointReleasePending: true,
  companionEndpointPaused: true,
  companionTunnelRetired: true,
  companionTunnelWaiting: true,
  managedCompanionEndpointUrl: "https://endpoint.example.test",
  managedCompanionConnectorToken: "fixture-old-connector-token",
  managedCompanionOriginVersion: 2,
  managedCompanionReleaseAt: 1_900_000_000_000,
  providerKey: "fixture-unrelated-key",
});

function fixture(t, client, saved = oldCredentials(), { cleanupFailure } = {}) {
  let document = saved, stops = 0;
  const service = createCompanionAccountService({
    client,
    readCredentials: () => structuredClone(document),
    updateCredentials: async update => {
      if (cleanupFailure === "write") throw new Error("fixture credential store unavailable");
      document = update(document);
    },
    stopManagedEndpoint: async () => {
      stops++;
      if (cleanupFailure === "stop") throw new Error("fixture endpoint stop failed");
    },
    setTimer: () => assert.fail("sign-out must not schedule recovery"),
  });
  t.after(() => service.dispose());
  return { service, saved: () => document, stops: () => stops };
}

const retained = { companionClientInstanceId: instance, providerKey: "fixture-unrelated-key" };

test("sign-out without an account service clears saved tokens and account records", async t => {
  const f = fixture(t);
  const state = await f.service.signOut();
  assert.deepEqual(f.saved(), retained);
  assert.equal(f.stops(), 1);
  assert.equal(state.status, "signed-out");
  assert.equal(state.available, false);
  assert.equal(JSON.stringify(state).includes("fixture-old"), false);
});

test("an unconfigured sign-out clears an orphan token without a valid account record", async t => {
  const f = fixture(t, undefined, { companionAccountToken: "orphan-token" });
  await f.service.signOut();
  assert.deepEqual(f.saved(), {});
});

for (const failure of ["deleteEndpoint", "revokeInstallation", "listInstallations", "signOut", null]) {
  test(`sign-out clears local credentials when remote cleanup ${failure ? `fails at ${failure}` : "succeeds"}`, async t => {
    const calls = [];
    const client = Object.fromEntries(["deleteEndpoint", "revokeInstallation", "listInstallations", "signOut"].map(name => [name, async () => {
      calls.push(name);
      if (name === failure) throw new Error("fixture service unavailable");
      return name === "listInstallations" ? [{ id: instance, clientInstanceId: instance }] : undefined;
    }]));
    client.health = async () => {};
    const f = fixture(t, client);
    await f.service.state();
    const state = await f.service.signOut();
    assert.deepEqual(f.saved(), retained);
    assert.equal(state.status, "signed-out");
    assert.equal(Object.hasOwn(state, "email"), false);
    assert.equal(Object.hasOwn(await f.service.state(), "email"), false);
    assert.ok(f.stops() >= 1);
    if (failure) assert.ok(calls.includes(failure));
    else assert.ok(calls.includes("signOut"));
  });
}

for (const configured of [false, true]) {
  for (const cleanupFailure of ["write", "stop"]) {
    test(`sign-out returns an error without rejecting when local ${cleanupFailure} fails, configured=${configured}`, async t => {
      const client = configured ? {
        deleteEndpoint: async () => {},
        revokeInstallation: async () => {},
        listInstallations: async () => { throw new Error("fixture service unavailable"); },
      } : undefined;
      const saved = oldCredentials();
      const f = fixture(t, client, saved, { cleanupFailure });
      let state;
      await assert.doesNotReject(async () => { state = await f.service.signOut(); });
      assert.equal(state.status, "error");
      assert.ok(state.message);
      assert.deepEqual(f.saved(), cleanupFailure === "write" ? saved : retained);
    });
  }
}
