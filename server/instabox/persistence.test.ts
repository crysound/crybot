import { expect, it } from "vitest";
import { Store } from "../store.ts";

it("retains an InstaBox backend when reloading the bot store", () => {
  const selection = () => ({ instanceId: "claude", model: "claude-sonnet-5" });
  const store = new Store(selection);
  const bot = store.createBot({ name: "Fixture bot" });
  store.patchBot(bot.id, { cloudBackend: "instabox" });
  expect(new Store(selection).bot(bot.id)?.cloudBackend).toBe("instabox");
});
