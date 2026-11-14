import test from "node:test";
import assert from "node:assert/strict";
import { installIslandPage, ISLAND_PAGE, ISLAND_SCHEME } from "./island-page.mjs";

test("the isolated page serves only bundled entry and assets from the supplied package directory", async () => {
  let handler;
  const fetched = [];
  const session = { protocol: { handle(scheme, run) { assert.equal(scheme, ISLAND_SCHEME); handler = run; } } };
  installIslandPage({ session, directory: "/fixture/resources/ui", net: { fetch(url) { fetched.push(url); return new Response("fixture"); } } });
  assert.equal(await handler({ url: ISLAND_PAGE }).text(), "fixture");
  assert.equal(await handler({ url: "crybot-island://app/assets/island-a1.js" }).text(), "fixture");
  assert.deepEqual(fetched, ["file:///fixture/resources/ui/island.html", "file:///fixture/resources/ui/assets/island-a1.js"]);
  for (const url of ["crybot-island://other/island.html", "crybot-island://app/api/bots", "crybot-island://app/assets/../main.mjs", "crybot-island://app/assets/%2e%2e%2fsecret"]) {
    assert.equal(handler({ url }).status, 404);
  }
  assert.equal(fetched.length, 2);
});
