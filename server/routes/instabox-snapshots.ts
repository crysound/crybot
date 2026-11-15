import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { InstaboxError } from "../instabox/client.ts";
import type { InstaboxMachines, InstaboxRequest } from "../instabox/machine.ts";
import { isSameOrigin } from "../request-auth.ts";
import { PASS, type RouteHandler } from "./table.ts";

const snapshotSchema = z.object({
  id: z.string().min(1), name: z.string(), state: z.string().optional(), status: z.string().optional(),
  createdAt: z.union([z.string(), z.number()]).optional(), created_at: z.union([z.string(), z.number()]).optional(),
  metadata: z.object({ app: z.string().optional(), botId: z.string().optional() }).optional(),
}).refine((snapshot) => snapshot.state !== undefined || snapshot.status !== undefined).transform((snapshot) => ({
  ...snapshot, state: snapshot.state ?? snapshot.status!, createdAt: snapshot.createdAt ?? snapshot.created_at,
}));
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

function call(request: InstaboxRequest, method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<Response> {
  return request(method, path, { body, query, idempotent: true });
}

export class SnapshotClaimError extends Error {
  readonly code: "busy" | "machine_busy";
  constructor(code: "busy" | "machine_busy") { super(code); this.code = code; }
}

async function saveOrRestore(request: InstaboxRequest, machines: InstaboxMachines, botId: string, path: string, body: unknown): Promise<Response> {
  try { return await call(request, "POST", path, body); }
  catch (error) {
    if (!(error instanceof InstaboxError) || error.status !== 409 || !["operation_conflict", "machine_not_running"].includes(error.code)) throw error;
    const machine = await machines.find(botId);
    if (!machine || !["suspended", "stopped"].includes(machine.state)) throw error;
    await machines.ensureRunning(botId);
    return call(request, "POST", path, body);
  }
}

async function runningMachine(machines: InstaboxMachines, botId: string, machineIdFor: () => Promise<string | null>): Promise<string | null> {
  const currentId = await machineIdFor();
  if (!currentId) return null;
  const current = await machines.find(botId);
  if (current?.state === "running") return current.id;
  return (await machines.ensureRunning(botId)).id;
}

async function readySnapshot(request: InstaboxRequest, id: string, signal?: AbortSignal): Promise<Snapshot> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = snapshotSchema.parse(await (await call(request, "GET", `/v1/snapshots/${encodeURIComponent(id)}`)).json());
    if (snapshot.state === "ready") return snapshot;
    if (["failed", "error", "deleted"].includes(snapshot.state)) throw new SnapshotError(502, "failed");
    await delay(500, undefined, { signal });
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

async function findSnapshotByName(request: InstaboxRequest, name: string, signal?: AbortSignal): Promise<Snapshot> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = (await listSnapshots(request)).find((candidate) => candidate.name === name);
    if (snapshot) return snapshot;
    await delay(500, undefined, { signal });
  }
  throw new SnapshotError(504, "timeout");
}

async function finishOperation(request: InstaboxRequest, response: Response, signal?: AbortSignal): Promise<void> {
  if (response.status === 204) return;
  await waitOperation(request, await response.json(), signal);
}

async function waitOperation(request: InstaboxRequest, initial: unknown, signal?: AbortSignal): Promise<void> {
  let operation = operationSchema.parse(initial);
  const deadline = Date.now() + 180_000;
  while (operation.state !== "succeeded") {
    if (["failed", "cancelled", "canceled"].includes(operation.state)) throw new SnapshotError(502, "failed");
    if (Date.now() >= deadline) throw new SnapshotError(504, "timeout");
    const next = await call(request, "GET", `/v1/operations/${encodeURIComponent(operation.id)}`, undefined, { wait: `${Math.max(1, Math.min(25, Math.ceil((deadline - Date.now()) / 1000)))}s` });
    operation = operationSchema.parse(await next.json());
    if (operation.state !== "succeeded") await delay(500, undefined, { signal });
  }
}

export function createInstaboxSnapshotRoutes(deps: { machines(): InstaboxMachines | null; request(): InstaboxRequest | null; machineIdFor(botId: string): Promise<string | null>; botExists(botId: string): boolean; claim(botId: string): () => void; signal?: AbortSignal }): RouteHandler {
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
    res.setTimeout(700_000);
    res.setHeader("cache-control", "private, no-store");
    let release: (() => void) | undefined;
    try {
      if (!listing) {
        try { release = deps.claim(botId); }
        catch (error) {
          if (error instanceof SnapshotClaimError) throw new SnapshotError(409, error.code);
          if (error instanceof Error && "status" in error && error.status === 409) throw new SnapshotError(409, "machine_busy");
          throw error;
        }
      }
      if (!deps.botExists(botId)) throw new SnapshotError(404, "bot_missing");
      if (listing) {
        if (!await deps.machineIdFor(botId)) return json(res, 200, { snapshots: [] });
        const snapshots = await listSnapshots(request);
        return json(res, 200, { snapshots: snapshots.filter((snapshot) => belongsTo(snapshot, botId)).map(({ id, name, state, createdAt }) => ({ id, name, state, ...(createdAt === undefined ? {} : { createdAt }) })) });
      }
      if (saving) {
        if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw new SnapshotError(415, "invalid");
        const parsed = createSchema.safeParse(await readBody(req).catch(() => { throw new SnapshotError(400, "invalid"); }));
        if (!parsed.success) throw new SnapshotError(400, "invalid");
        const machineId = await runningMachine(machines, botId, () => deps.machineIdFor(botId));
        if (!machineId) throw new SnapshotError(409, "machine_missing");
        const name = snapshotName(botId, parsed.data.name);
        const response = await saveOrRestore(request, machines, botId, `/v1/machines/${encodeURIComponent(machineId)}/snapshots`, {
          name, description: `Cry Bot snapshot for ${botId}`,
        });
        const createdPayload: unknown = await response.json();
        const isOperation = typeof createdPayload === "object" && createdPayload !== null && ("type" in createdPayload || "phase" in createdPayload);
        let created: Snapshot;
        if (isOperation) {
          await waitOperation(request, createdPayload, deps.signal);
          created = await findSnapshotByName(request, name, deps.signal);
        } else {
          created = snapshotSchema.parse(createdPayload);
        }
        const { id, name: readyName, state } = await readySnapshot(request, created.id, deps.signal);
        return json(res, 201, { snapshot: { id, name: readyName, state, ...(created.createdAt === undefined ? {} : { createdAt: created.createdAt }) } });
      }
      const response = await call(request, "GET", `/v1/snapshots/${encodeURIComponent(snapshotId!)}`);
      const snapshot = snapshotSchema.parse(await response.json());
      if (!belongsTo(snapshot, botId)) throw new SnapshotError(403, "ownership");
      if (restoring) {
        if (snapshot.state !== "ready") throw new SnapshotError(409, "not_ready");
        const machineId = await runningMachine(machines, botId, () => deps.machineIdFor(botId));
        if (!machineId) throw new SnapshotError(409, "machine_missing");
        await finishOperation(request, await saveOrRestore(request, machines, botId, `/v1/machines/${encodeURIComponent(machineId)}/restore`, { snapshotId, desiredState: "running" }), deps.signal);
        await machines.ensureRunning(botId);
      } else {
        await finishOperation(request, await call(request, "DELETE", `/v1/snapshots/${encodeURIComponent(snapshotId!)}`), deps.signal);
      }
      return json(res, 200, { ok: true });
    } catch (error) {
      if (deps.signal?.aborted) return json(res, 504, { error: "InstaBox snapshot request timed out or disconnected", code: "instabox_snapshot_timeout" });
      if (error instanceof InstaboxError) {
        const code = error.status === 409
          ? ["operation_in_progress", "snapshot_in_progress"].includes(error.code) ? "busy"
            : ["machine_busy", "machine_locked"].includes(error.code) ? "machine_busy" : "conflict"
          : "upstream";
        return json(res, error.status === 404 ? 404 : error.status === 409 ? 409 : 502, {
          error: code === "busy" ? "Another snapshot operation is in progress" : code === "machine_busy" ? "Computer is in use" : "InstaBox snapshot request was refused",
          code: `instabox_snapshot_${code}`, ...(code === "conflict" ? { reason: error.code } : {}),
        });
      }
      const known = error instanceof SnapshotError;
      const code = known ? error.code : "upstream";
      const message = code === "busy" ? "Another snapshot operation is in progress" : code === "machine_busy" ? "Computer is in use" : "InstaBox snapshot request failed";
      return json(res, known ? error.status : 502, { error: message, code: `instabox_snapshot_${code}` });
    } finally {
      release?.();
    }
  };
}
