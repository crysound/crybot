import { BOT_PROFILE_LIMITS } from "../../shared/bot-profile.ts";
import type { WireBot } from "../../shared/wire.ts";
import { readSoulDrift, soulFile, writeSoulMirror } from "../bot-folder.ts";
import { parseBotProfilePatch } from "../bot-profile.ts";
import { profileRevision, profileSnapshot } from "../profile-revision.ts";
import { flushProfileHistory, readHistory, recordProfileChange, soulChanges } from "../profile-versions.ts";
import type { BotRecord, Store } from "../store.ts";
import { PASS, type RouteHandler } from "./table.ts";

export interface BotProfileFilesRouteDeps {
  store: Pick<Store, "bot" | "setSoul" | "patchBot">;
  wireBot(bot: BotRecord): WireBot;
  broadcast(payload: Record<string, unknown>): void;
}

export function createBotProfileFilesRoutes(deps: BotProfileFilesRouteDeps): RouteHandler {
  const { store, wireBot, broadcast } = deps;
  return async ({ req, res, url, path, method, json, readBody }) => {
    let m: RegExpMatchArray | null = null;
    m = path.match(/^\/api\/bots\/([\w-]+)\/soul$/);
    if (m && method === "GET") {
      const bot = store.bot(m[1]);
      if (!bot) return json(res, 404, { error: "no such bot" });
      const soul = bot.soul ?? "";
      const drift = readSoulDrift(bot.id, soul, bot.soulHash ?? "");
      return json(res, 200, {
        soul,
        revision: profileRevision(bot),
        bytes: Buffer.byteLength(soul, "utf8"),
        limit: BOT_PROFILE_LIMITS.soul,
        file: soulFile(bot.id),
        drift: drift.drift,
        ...(drift.drift ? { fileText: drift.fileText } : {}),
      });
    }
    m = path.match(/^\/api\/bots\/([\w-]+)\/soul\/apply-file$/);
    if (m && method === "POST") {
      const body = await readBody(req);
      const bot = store.bot(m[1]);
      if (!bot) return json(res, 404, { error: "no such bot" });
      if (body?.expectedRevision !== profileRevision(bot)) {
        return json(res, 409, { error: "This bot's profile changed; reload and look again" });
      }
      const drift = readSoulDrift(bot.id, bot.soul ?? "", bot.soulHash ?? "");
      if (!drift.drift) return json(res, 409, { error: "SOUL.md matches the record; nothing to apply" });
      if (typeof body?.fileText !== "string" || body.fileText !== drift.fileText) {
        return json(res, 409, { error: "SOUL.md changed since you read it; reload and look again" });
      }
      const parsed = parseBotProfilePatch({ soul: drift.fileText });
      if (!parsed.ok) return json(res, 400, { error: parsed.error });
      // store.bot() returns the live record and setSoul mutates it in place: snapshot before the call.
      const beforeProfile = profileSnapshot(bot);
      const updated = store.setSoul(bot.id, parsed.patch.soul ?? "");
      if (!updated) return json(res, 404, { error: "no such bot" });
      recordProfileChange(bot.id, "file", "ui", beforeProfile, profileSnapshot(updated));
      const visible = wireBot(updated);
      broadcast({ kind: "bot", bot: visible });
      return json(res, 200, { bot: visible });
    }
    m = path.match(/^\/api\/bots\/([\w-]+)\/soul\/discard-file$/);
    if (m && method === "POST") {
      const body = await readBody(req);
      const bot = store.bot(m[1]);
      if (!bot) return json(res, 404, { error: "no such bot" });
      if (body?.expectedRevision !== profileRevision(bot)) {
        return json(res, 409, { error: "This bot's profile changed; reload and look again" });
      }
      const drift = readSoulDrift(bot.id, bot.soul ?? "", bot.soulHash ?? "");
      if (!drift.drift || typeof body?.fileText !== "string" || body.fileText !== drift.fileText) {
        return json(res, 409, { error: "SOUL.md changed since you read it; reload and look again" });
      }
      writeSoulMirror(bot.id, bot.soul ?? "");
      const updated = store.patchBot(bot.id, { soulDrift: false }) ?? bot;
      const visible = wireBot(updated);
      broadcast({ kind: "bot", bot: visible });
      return json(res, 200, { bot: visible });
    }
    m = path.match(/^\/api\/bots\/([\w-]+)\/history$/);
    if (m && method === "GET") {
      if (!store.bot(m[1])) return json(res, 404, { error: "no such bot" });
      // Profile rows land asynchronously; flush so a client sees its own change.
      await flushProfileHistory(m[1]);
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
      const full = url.searchParams.get("full") === "1";
      const rows = url.searchParams.get("view") === "changes" ? soulChanges(m[1], readHistory(m[1], limit)) : readHistory(m[1], limit).map((row) => {
        if (full || row.field !== "soul") return row;
        const rest: typeof row = { ...row };
        delete rest.before;
        delete rest.after;
        return rest;
      });
      const bot = store.bot(m[1]);
      if (!bot) return json(res, 404, { error: "no such bot" });
      return json(res, 200, { rows, revision: profileRevision(bot) });
    }
    m = path.match(/^\/api\/bots\/([\w-]+)\/history\/rollback$/);
    if (m && method === "POST") {
      const body = await readBody(req);
      await flushProfileHistory(m[1]);
      const bot = store.bot(m[1]);
      if (!bot) return json(res, 404, { error: "no such bot" });
      if (body?.expectedRevision !== profileRevision(bot)) {
        return json(res, 409, { error: "This bot's profile changed; reload history before undoing" });
      }
      const row = typeof body?.id === "string"
        ? readHistory(bot.id, Number.MAX_SAFE_INTEGER).find((r) => r.id === body.id && r.field === "soul")
        : undefined;
      if (!row || row.field !== "soul" || typeof row.before !== "string") {
        return json(res, 400, { error: "rollback is available for SOUL.md entries only" });
      }
      if (!row.canRestore) {
        return json(res, 400, { error: row.restoreUnavailableReason });
      }
      const parsed = parseBotProfilePatch({ soul: row.before });
      if (!parsed.ok) return json(res, 400, { error: parsed.error });
      const before = profileSnapshot(bot);
      const updated = store.setSoul(bot.id, parsed.patch.soul ?? "");
      if (!updated) return json(res, 404, { error: "no such bot" });
      recordProfileChange(bot.id, "user", "rollback", before, profileSnapshot(updated));
      const visible = wireBot(updated);
      broadcast({ kind: "bot", bot: visible });
      return json(res, 200, { bot: visible });
    }

    return PASS;
  };
}
