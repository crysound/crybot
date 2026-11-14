import assert from "node:assert/strict";
import test from "node:test";
import { localEnvironmentsStore } from "./cloud-disabled.mjs";

for (const [name, dormant, keep] of [
  ["same id", { id: "saved", origin: "https://old.example.test" }, false],
  ["same normalized origin with another id", { id: "old", origin: "https://SERVER.example.test:443/" }, false],
  ["different id and origin", { id: "old", origin: "https://other.example.test" }, true],
]) {
  test(`newly written environments take priority: ${name}`, () => {
    const hosted = { ...dormant, home: true, name: "Dormant" };
    const next = { activeId: "saved", environments: [{ id: "saved", origin: "https://server.example.test", name: "Server" }] };
    let saved = { activeId: hosted.id, environments: [hosted] };
    const store = localEnvironmentsStore({ read: () => structuredClone(saved), write: value => { saved = value; } });
    assert.deepEqual(store.read(), { activeId: "local", environments: [] });
    store.write(next);
    assert.deepEqual(saved, { ...next, environments: [...next.environments, ...(keep ? [hosted] : [])] });
    assert.deepEqual(store.read(), next);
  });
}

test("local workspaces without origins do not collide with one another", () => {
  const hosted = { id: "dormant", home: true };
  let saved = { activeId: "local", environments: [hosted] };
  const store = localEnvironmentsStore({ read: () => saved, write: value => { saved = value; } });
  const local = [{ id: "local", kind: "local" }, { id: "second", kind: "local", dataDir: "/fixture/second" }];
  store.write({ activeId: "local", environments: local });
  assert.deepEqual(saved.environments, [...local, hosted]);
});
