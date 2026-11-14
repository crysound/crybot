import assert from "node:assert/strict";
import test from "node:test";

import { externalWebUrl } from "./app-permissions.mjs";
import { chatLinkFrom, chatLinkFromCommandLine } from "./chat-link.mjs";

const THREAD_LINK = "crybot://thread/2633ea27-cc9d-4690-97bf-aca853eca4c6?bot=1f72ec75-821b-44a5-a7a3-93ff64276c7d";
const BOT_LINK = "crybot://bot/1f72ec75-821b-44a5-a7a3-93ff64276c7d";

test("recognizes the links Copy link and a dashboard make", () => {
  assert.equal(chatLinkFrom(THREAD_LINK), THREAD_LINK);
  assert.equal(chatLinkFrom(BOT_LINK), BOT_LINK);
  assert.equal(chatLinkFrom(` ${BOT_LINK}\n`), BOT_LINK);
  assert.equal(chatLinkFrom("CryBot://Bot/abc"), "CryBot://Bot/abc");
});

test("leaves every other link to its own handler", () => {
  for (const other of [
    "crybot://cloud",
    "crybot://organization",
    "crybot://install?url=https://github.com/a/b/team.md",
    "crybot://threads/abc",
    "crybot://bots/abc",
    "https://example.com/crybot://bot/abc",
    `crybot://bot/${"x".repeat(1024)}`,
    undefined,
    42,
  ]) assert.equal(chatLinkFrom(other), null);
});

// A published page's Open in the desktop app reaches main as desktop:open-external or window.open: both go to the
// system browser through externalWebUrl, and no page link is ever taken for a chat link, so it never opens a chat.
test("a published page's link opens in the browser, never as a chat", () => {
  for (const page of ["https://server.example.test/", "https://server.example.test/thread/abc?bot=pepper"]) {
    assert.equal(chatLinkFrom(page), null);
    assert.equal(chatLinkFromCommandLine(["/usr/bin/crybot", page]), null);
    assert.equal(externalWebUrl(page), page);
  }
});

test("finds the link among a second launch's arguments", () => {
  assert.equal(chatLinkFromCommandLine(["/usr/bin/crybot", "--no-sandbox", THREAD_LINK]), THREAD_LINK);
  assert.equal(chatLinkFromCommandLine(["/usr/bin/crybot", "--no-sandbox", BOT_LINK]), BOT_LINK);
  assert.equal(chatLinkFromCommandLine(["/usr/bin/crybot", "crybot://cloud"]), null);
});
