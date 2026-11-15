import { runInstaboxComputerTool } from "./computer-tools.ts";
import { desktopViewerUrl } from "../routes/desktop-viewer.ts";
import { cloudKindOf } from "../cloud-backend.ts";
import type { AppConfig } from "../config.ts";
import type { RouteHandler } from "../routes/table.ts";
import type { BotRecord } from "../store.ts";
import { USER_ERROR, type UserErrorKey } from "../user-errors.ts";
import { createInstaboxRequest } from "./client.ts";
import { instaboxApiKey } from "./key.ts";
import type { InstaboxMachines, InstaboxRequest } from "./machine.ts";
import { createInstaboxMachines } from "./machines.ts";

class InstaboxUserError extends Error {
  readonly status: number;
  readonly errorKey: UserErrorKey;
  constructor(status: number, errorKey: UserErrorKey) {
    super(USER_ERROR[errorKey]);
    this.status = status;
    this.errorKey = errorKey;
  }
}

export function instaboxFailureResponse(error: unknown) {
  if (!(error instanceof InstaboxUserError)) throw error;
  return { status: error.status, body: { error: error.message, errorKey: error.errorKey } };
}

export function createInstaboxMachineCache(makeRequest: (key: string) => InstaboxRequest = createInstaboxRequest) {
  let cached: { key: string; machines: InstaboxMachines } | undefined;
  return (cfg: AppConfig): InstaboxMachines | null => {
    const key = instaboxApiKey(cfg);
    if (!key) { cached = undefined; return null; }
    if (cached?.key !== key) cached = { key, machines: createInstaboxMachines(makeRequest(key)) };
    return cached.machines;
  };
}

export function requireInstabox(machines: InstaboxMachines | null): InstaboxMachines {
  if (!machines) throw new InstaboxUserError(409, "serverError.instabox.keyMissing");
  return machines;
}

export async function instaboxStatus(machines: InstaboxMachines | null, botId: string) {
  if (!machines) {
    return { backend: "instabox" as const, configured: false, ready: false, machine: null,
      problem: USER_ERROR["serverError.instabox.keyMissing"], problemKey: "serverError.instabox.keyMissing" };
  }
  try {
    const machine = await machines.find(botId);
    return { backend: "instabox" as const, configured: true, ready: machine?.state === "running", machine };
  } catch (error) {
    return { backend: "instabox" as const, configured: true, ready: false, machine: null,
      problem: error instanceof Error ? error.message : String(error) };
  }
}

export async function instaboxComputerAction(machines: InstaboxMachines | null, botId: string, action: string, body: unknown) {
  const service = requireInstabox(machines);
  if (action === "provision") {
    const template = (body as { template?: unknown } | null)?.template;
    if (template !== undefined && template !== "linux" && template !== "android") {
      throw new InstaboxUserError(400, "serverError.instabox.template");
    }
    return { ready: true, machine: await service.ensureRunning(botId, template === undefined ? undefined : { template }) };
  }
  if (action === "screenshot") {
    const machine = await service.find(botId);
    if (machine?.state !== "running") throw new InstaboxUserError(409, "serverError.instabox.unavailable");
    const result = await runInstaboxComputerTool(service, machine.id, "screenshot", {}, AbortSignal.timeout(90_000));
    const image = result.content.find(part => part.type === "image");
    if (!image || image.type !== "image") throw new InstaboxUserError(502, "serverError.instabox.unavailable");
    return { png: image.data, format: "jpeg" };
  }
  if (action === "join") { await service.ensureRunning(botId); return { joinUrl: desktopViewerUrl(`vps/${botId}`) }; }
  if (action === "sleep") { await service.suspend(botId); return { ok: true }; }
  if (action === "remove") { await service.remove(botId); return { ok: true }; }
  throw new InstaboxUserError(501, "serverError.instabox.unavailable");
}

export function withInstaboxBackendPower(handler: RouteHandler, deps: {
  bot(id: string): BotRecord | null;
  machines(): InstaboxMachines | null;
}): RouteHandler {
  return async ctx => {
    const match = ctx.method === "PATCH" && /^\/api\/bots\/([\w-]+)$/.exec(ctx.path);
    const before = match ? deps.bot(match[1]) : null;
    if (!before || cloudKindOf(before) !== "instabox") return handler(ctx);
    const botId = before.id;
    let response: Parameters<typeof ctx.json> | undefined;
    const result = await handler({ ...ctx, json: (...args) => { response = args; } });
    if (response) {
      const after = deps.bot(botId);
      if (response[1] >= 200 && response[1] < 300 && after && cloudKindOf(after) !== "instabox") {
        void Promise.resolve().then(() => requireInstabox(deps.machines()).suspend(botId)).catch(error => {
          console.warn("InstaBox machine could not be suspended after a backend change", error instanceof Error ? error.message : String(error));
        });
      }
      ctx.json(...response);
    }
    return result;
  };
}
