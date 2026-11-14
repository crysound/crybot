import assert from "node:assert/strict";
import test from "node:test";
import { ACME, CLOUD, connected, TEAM, world } from "./fixtures/home-window-world.mjs";

test("while the window is on the place's own sign-in page, its 401s start no second sign-in (a team's and My Cloud's alike)", async () => {
  const w = world({ state: { ...connected(), teams: [ACME] }, team: { signedIn: false } });
  await w.home.show({ place: { team: "team-acme" } });
  assert.deepEqual(w.teamPairs, ["team-acme"]);
  assert.equal(w.url, `${TEAM}/pair#code=TTTT-EEEE-AAAA`);
  w.home.responded({ url: `${TEAM}/api/auth/session`, statusCode: 401, webContentsId: 7 });
  await w.later(0);
  assert.deepEqual(w.teamPairs, ["team-acme"], "the code on its way is not replaced");
  w.url = `${TEAM}/chats/b1`;
  w.home.responded({ url: `${TEAM}/api/bots`, statusCode: 401, webContentsId: 7 });
  await w.home.repair();
  assert.deepEqual(w.teamPairs, ["team-acme", "team-acme"], "once on its page, a 401 signs in again as before");
  const mine = world({ cloud: { signedIn: false } });
  await mine.home.show();
  mine.home.responded({ url: `${CLOUD}/api/auth/session`, statusCode: 401, webContentsId: 7 });
  await mine.later(0);
  assert.equal(mine.pairs, 1);
});
