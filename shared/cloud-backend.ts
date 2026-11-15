import type { CloudBackend } from "./wire.ts";

export function cloudKindOf(bot: { cloudBackend?: CloudBackend }, teamComputer = false): CloudBackend {
  return teamComputer ? "box" : bot.cloudBackend ?? "instabox";
}
