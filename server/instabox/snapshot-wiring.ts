import type { AppConfig } from "../config.ts";
import { createInstaboxSnapshotRoutes } from "../routes/instabox-snapshots.ts";
import { PASS, type RouteHandler } from "../routes/table.ts";
import { createInstaboxRequest } from "./client.ts";
import { instaboxApiKey } from "./key.ts";
import type { InstaboxRequest } from "./machine.ts";
import { createInstaboxMachines } from "./machines.ts";

export function createSnapshotWiring(deps: {
  cfg(): AppConfig;
  eligible(botId: string): boolean;
  claim(botId: string): () => void;
  inUse(botId: string): boolean;
  baseUrl?: string;
  snapshotTimeoutMs?: number;
}): RouteHandler {
  return async ctx => {
    if (!/^\/api\/bots\/[\w-]+\/instabox\/snapshots(?:\/|$)/.test(ctx.path)) return PASS;
    const controller = new AbortController();
    const deadline = Date.now() + (deps.snapshotTimeoutMs ?? 600_000);
    const cancel = () => controller.abort();
    const timer = setTimeout(cancel, deadline - Date.now());
    ctx.req.once("aborted", cancel);
    ctx.res.once("close", cancel);
    try {
      const key = instaboxApiKey(deps.cfg());
      const upstream = key ? createInstaboxRequest(key, deps.baseUrl, 30_000, controller.signal) : null;
      const request: InstaboxRequest | null = upstream && ((method, path, opts) => {
        if (Date.now() >= deadline) cancel();
        controller.signal.throwIfAborted();
        const query = opts?.query?.wait ? { ...opts.query, wait: `${Math.min(parseFloat(opts.query.wait), 25, (deadline - Date.now()) / 1000)}s` } : opts?.query;
        return upstream(method, path, { ...opts, query });
      });
      const machines = request ? createInstaboxMachines(request) : null;
      return await createInstaboxSnapshotRoutes({
        request: () => request, machines: () => machines,
        machineIdFor: async botId => (await machines?.find(botId))?.id ?? null,
        botExists: deps.eligible, signal: controller.signal,
        claim: botId => {
          const release = deps.claim(botId);
          if (deps.inUse(botId)) {
            release();
            throw Object.assign(new Error("Computer is in use"), { status: 409 });
          }
          return release;
        },
      })({ ...ctx, readBody: async req => {
        controller.signal.throwIfAborted();
        let abort!: () => void;
        const aborted = new Promise<never>((_resolve, reject) => {
          abort = () => reject(controller.signal.reason);
          controller.signal.addEventListener("abort", abort, { once: true });
        });
        try { return await Promise.race([ctx.readBody(req), aborted]); }
        finally { controller.signal.removeEventListener("abort", abort); }
      } });
    } finally {
      clearTimeout(timer);
      ctx.req.off("aborted", cancel);
      ctx.res.off("close", cancel);
      cancel();
    }
  };
}
