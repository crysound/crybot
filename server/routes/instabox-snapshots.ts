import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import type { InstaboxMachines, InstaboxRequest } from "../instabox/machine.ts";
import { isSameOrigin } from "../request-auth.ts";
import { PASS, type RouteHandler } from "./table.ts";

const snapshotSchema = z.object({
  id: z.string().min(1), name: z.string(), state: z.string().optional(), status: z.string().optional(),
  metadata: z.object({ app: z.string().optional(), botId: z.string().optional() }).optional(),
}).refine((snapshot) => snapshot.state !== undefined || snapshot.status !== undefined).transform((snapshot) => ({ ...snapshot, state: snapshot.state ?? snapshot.status! }));
type Snapshot = z.infer<typeof snapshotSchema>;
const createSchema = z.object({ name: z.string().max(200).optional() });
const operationSchema = z.object({ id: z.string().min(1), state: z.string() });
const snapshotListSchema = z.union([z.array(snapshotSchema), z.object({ snapshots: z.array(snapshotSchema), nextCursor: z.string().nullish() })]);
const prefixFor = (botId: string) => `crybot-${botId.slice(0, 12).toLowerCase()}-`;

function belongsTo(snapshot: Snapshot, botId: string): boolean {
  if (snapshot.metadata?.botId !== undefined) {
    return snapshot.metadata.botId === botId && (!snapshot.metadata.app || snapshot.metadata.app === "crybot");
  }
  return (!snapshot.metadata?.app || snapshot.metadata.app === "crybot") && snapshot.name.startsWith(prefixFor(botId));
}

function snapshotName(botId: string, name = "snapshot"): string {
  const prefix = prefixFor(botId);
  const suffix = `-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const label = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "snapshot";
  return prefix + label.slice(0, 63 - prefix.length - suffix.length).replace(/-+$/, "") + suffix;
}

class SnapshotError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

async function call(request: InstaboxRequest, method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<Response> {
  const response = await request(method, path, { body, query, idempotent: true });
  if (!response.ok) throw new SnapshotError(response.status === 404 ? 404 : 502, "upstream");
  return response;
}

async function readySnapshot(request: InstaboxRequest, id: string): Promise<Snapshot> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = snapshotSchema.parse(await (await call(request, "GET", `/v1/snapshots/${encodeURIComponent(id)}`)).json());
    if (snapshot.state === "ready") return snapshot;
    if (["failed", "error", "deleted"].includes(snapshot.state)) throw new SnapshotError(502, "failed");
    await delay(500);
  }
  throw new SnapshotError(504, "timeout");
}

async function listSnapshots(request: InstaboxRequest): Promise<Snapshot[]> {
  const snapshots: Snapshot[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const response = await call(request, "GET", "/v1/snapshots", undefined, cursor ? { cursor } : undefined);
    const page = snapshotListSchema.parse(await response.json());
    snapshots.push(...(Array.isArray(page) ? page : page.snapshots));
    cursor = Array.isArray(page) ? undefined : page.nextCursor || undefined;
    if (cursor && (seen.has(cursor) || seen.size >= 100)) throw new SnapshotError(502, "upstream");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return snapshots;
}

async function findSnapshotByName(request: InstaboxRequest, name: string): Promise<Snapshot> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = (await listSnapshots(request)).find((candidate) => candidate.name === name);
    if (snapshot) return snapshot;
    await delay(500);
  }
  throw new SnapshotError(504, "timeout");
}

async function finishOperation(request: InstaboxRequest, response: Response): Promise<void> {
  if (response.status === 204) return;
  await waitOperation(request, await response.json());
}

async function waitOperation(request: InstaboxRequest, initial: unknown): Promise<void> {
  let operation = operationSchema.parse(initial);
  const deadline = Date.now() + 180_000;
  while (operation.state !== "succeeded") {
    if (["failed", "cancelled", "canceled"].includes(operation.state)) throw new SnapshotError(502, "failed");
    if (Date.now() >= deadline) throw new SnapshotError(504, "timeout");
    const next = await call(request, "GET", `/v1/operations/${encodeURIComponent(operation.id)}`, undefined, { wait: "25s" });
    operation = operationSchema.parse(await next.json());
    if (operation.state !== "succeeded") await delay(500);
  }
}

export function createInstaboxSnapshotRoutes(deps: { machines(): InstaboxMachines | null; request(): InstaboxRequest | null; machineIdFor(botId: string): Promise<string | null>; botExists(botId: string): boolean }): RouteHandler {
  const busy = new Set<string>();
  return async ({ req, res, path, method, auth, json, readBody }) => {
    const match = /^\/api\/bots\/([\w-]+)\/instabox\/snapshots(?:\/([\w-]+)(\/restore)?)?$/.exec(path);
    if (!match) return PASS;
    const botId = match[1]!, snapshotId = match[2], restore = match[3];
    const listing = !snapshotId && method === "GET";
    const saving = !snapshotId && method === "POST";
    const restoring = !!snapshotId && !!restore && method === "POST";
    const deleting = !!snapshotId && !restore && method === "DELETE";
    if (!listing && !saving && !restoring && !deleting) return PASS;
    if (!auth.scopes.includes("admin") || !isSameOrigin(req)) return json(res, 403, { error: "Forbidden", code: "forbidden" });
    if (!deps.botExists(botId)) return json(res, 404, { error: "Bot not found", code: "bot_missing" });
    const request = deps.request(), machines = deps.machines();
    if (!request || !machines) return json(res, 503, { error: "InstaBox key is not set", code: "instabox_key_missing" });
    if (!listing && busy.has(botId)) return json(res, 409, { error: "Snapshot operation in progress", code: "instabox_snapshot_busy" });
    res.setHeader("cache-control", "private, no-store");
    if (!listing) busy.add(botId);
    try {
      if (listing) {
        const snapshots = await listSnapshots(request);
        return json(res, 200, { snapshots: snapshots.filter((snapshot) => belongsTo(snapshot, botId)).map(({ id, name, state }) => ({ id, name, state })) });
      }
      if (saving) {
        if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw new SnapshotError(415, "invalid");
        const parsed = createSchema.safeParse(await readBody(req).catch(() => { throw new SnapshotError(400, "invalid"); }));
        if (!parsed.success) throw new SnapshotError(400, "invalid");
        const machineId = await deps.machineIdFor(botId);
        if (!machineId) throw new SnapshotError(409, "machine_missing");
        const name = snapshotName(botId, parsed.data.name);
        const response = await call(request, "POST", `/v1/machines/${encodeURIComponent(machineId)}/snapshots`, {
          name, description: `Cry Bot snapshot for ${botId}`,
        });
        const createdPayload: unknown = await response.json();
        const isOperation = typeof createdPayload === "object" && createdPayload !== null && ("type" in createdPayload || "phase" in createdPayload || "machineId" in createdPayload);
        let created: Snapshot;
        if (isOperation) {
          await waitOperation(request, createdPayload);
          created = await findSnapshotByName(request, name);
        } else {
          created = snapshotSchema.parse(createdPayload);
        }
        const { id, name: readyName, state } = await readySnapshot(request, created.id);
        return json(res, 201, { snapshot: { id, name: readyName, state } });
      }
      const response = await call(request, "GET", `/v1/snapshots/${encodeURIComponent(snapshotId!)}`);
      const snapshot = snapshotSchema.parse(await response.json());
      if (!belongsTo(snapshot, botId)) throw new SnapshotError(403, "ownership");
      if (restoring) {
        if (snapshot.state !== "ready") throw new SnapshotError(409, "not_ready");
        const machineId = await deps.machineIdFor(botId);
        if (!machineId) throw new SnapshotError(409, "machine_missing");
        await finishOperation(request, await call(request, "POST", `/v1/machines/${encodeURIComponent(machineId)}/restore`, { snapshotId, desiredState: "running" }));
        await machines.ensureRunning(botId);
      } else {
        await finishOperation(request, await call(request, "DELETE", `/v1/snapshots/${encodeURIComponent(snapshotId!)}`));
      }
      return json(res, 200, { ok: true });
    } catch (error) {
      const known = error instanceof SnapshotError;
      return json(res, known ? error.status : 502, { error: "InstaBox snapshot request failed", code: `instabox_snapshot_${known ? error.code : "upstream"}` });
    } finally {
      if (!listing) busy.delete(botId);
    }
  };
}
