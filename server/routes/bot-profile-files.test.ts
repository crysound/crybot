import { writeFileSync } from "node:fs";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it, vi } from "vitest";

import { soulFile } from "../bot-folder.ts";
import { profileRevision } from "../profile-revision.ts";
import { Store } from "../store.ts";
import { createBotProfileFilesRoutes } from "./bot-profile-files.ts";
import { PASS } from "./table.ts";

function fixture() {
  const store = new Store(() => ({ instanceId: "example", model: "example" }));
  const bot = store.createBot({ name: "Scout" });
  const broadcast = vi.fn();
  const route = createBotProfileFilesRoutes({
    store,
    wireBot: (record) => ({ ...record, avatarUrl: record.avatarUrl ?? null, tasks: undefined }),
    broadcast,
  });
  const call = async (path: string, method = "GET", body: unknown = {}) => {
    const req = new IncomingMessage(new Socket());
    const res = new ServerResponse(req);
    const replies: Array<{ status: number; body: unknown }> = [];
    const out = await route({
      req, res, url: new URL(path, "https://example.com"), path, method,
      auth: { kind: "loopback", scopes: ["admin", "client"] },
      readBody: async () => body,
      json: (_res, status, sent) => { replies.push({ status, body: sent }); },
    });
    return { out, replies };
  };
  return { store, bot, broadcast, call };
}

describe("bot profile file routes", () => {
  it("returns the saved soul and the separately edited file without applying it", async () => {
    const { store, bot, broadcast, call } = fixture();
    store.setSoul(bot.id, "Be brief.");
    writeFileSync(soulFile(bot.id), "Be thorough.");

    expect(await call(`/api/bots/${bot.id}/soul`)).toEqual({
      out: undefined,
      replies: [{ status: 200, body: {
        soul: "Be brief.",
        revision: profileRevision(store.bot(bot.id)!),
        bytes: 9,
        limit: 24_000,
        file: soulFile(bot.id),
        drift: true,
        fileText: "Be thorough.",
      } }],
    });
    expect(store.bot(bot.id)?.soul).toBe("Be brief.");
    expect(broadcast).not.toHaveBeenCalled();
  });

  it("answers missing bots consistently for file and history requests", async () => {
    const { call } = fixture();
    for (const [suffix, method] of [
      ["soul", "GET"], ["soul/apply-file", "POST"], ["soul/discard-file", "POST"],
      ["history", "GET"], ["history/rollback", "POST"],
    ]) {
      expect(await call(`/api/bots/missing/${suffix}`, method)).toEqual({
        out: undefined,
        replies: [{ status: 404, body: { error: "no such bot" } }],
      });
    }
  });

  it("leaves neighboring routes and unsupported methods to the next handler", async () => {
    const { bot, broadcast, call } = fixture();
    for (const [suffix, method] of [
      ["system-prompt", "GET"], ["overview", "GET"], ["soul", "PUT"],
      ["soul/apply-file", "GET"], ["soul/discard-file", "GET"],
      ["history", "POST"], ["history/rollback", "GET"],
    ]) {
      expect(await call(`/api/bots/${bot.id}/${suffix}`, method)).toEqual({ out: PASS, replies: [] });
    }
    expect(broadcast).not.toHaveBeenCalled();
  });
});
