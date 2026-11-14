import { expect, it } from "vitest";
import { createdBotConversation } from "./live.ts";

it("uses the active conversation returned by new-bot", () => {
  expect(createdBotConversation({ bot: { id: "bot-example", activeTaskId: "task-example", tasks: [] } })).toEqual({ botId: "bot-example", threadId: "task-example" });
});

it("reports missing or invalid new-bot fields before capture", () => {
  for (const value of [null, {}, []]) expect(() => createdBotConversation(value)).toThrow("new-bot: expected response.bot");
  for (const bot of [null, [], "bot"]) expect(() => createdBotConversation({ bot })).toThrow("response.bot to be an object");
  for (const id of [undefined, null, 1, "", " "]) expect(() => createdBotConversation({ bot: { id, activeTaskId: "task-example" } })).toThrow("bot.id to be a non-empty string");
  for (const activeTaskId of [undefined, null, 1, "", " "]) expect(() => createdBotConversation({ bot: { id: "bot-example", activeTaskId, threadId: "wrong-field" } })).toThrow("bot.activeTaskId to be a non-empty conversation id");
});
