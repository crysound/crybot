import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { json, readBody } from "../harness/http.ts";
import type { InstaboxRequest } from "../instabox/machine.ts";

export interface FakeSnapshot { id: string; name: string; status: "pending" | "ready" | "failed"; sourceMachineId: string; metadata?: { app?: string; botId?: string } }
type CreateResponseShape = "operation" | "snapshot";

export async function fakeInstaboxSnapshots(options: { createResponse?: CreateResponseShape } = {}) {
  const snapshots = new Map<string, FakeSnapshot>();
  const calls: Array<{ method: string; path: string; body: unknown; idempotency: string | undefined }> = [];
  const operations = new Map<string, { id: string; state: string }>();
  let failNext = false;
  let snapshotFails = false;
  let operationFails = false;
  let createResponse = options.createResponse ?? "operation";
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const body = await readBody(req);
    const method = req.method!;
    const idempotency = req.headers["idempotency-key"] as string | undefined;
    calls.push({ method, path: url.pathname, body, idempotency });
    if (!idempotency) return json(res, 400, { error: "Idempotency-Key required" });
    if (failNext) { failNext = false; return json(res, 500, { error: "sensitive-upstream-detail" }); }
    if (url.pathname === "/v1/snapshots") return json(res, 200, { snapshots: [...snapshots.values()] });
    const id = url.pathname.split("/").at(-1)!;
    if (method === "POST" && url.pathname.endsWith("/snapshots")) {
      const snapshot = { id: randomUUID(), name: body.name, status: "pending" as const, sourceMachineId: "machine-one" };
      snapshots.set(snapshot.id, snapshot);
      if (createResponse === "snapshot") return json(res, 202, snapshot);
      const operation = { id: randomUUID(), machineId: "machine-one", type: "create", state: "pending", phase: "snapshotting", error: null };
      operations.set(operation.id, operation);
      return json(res, 202, operation);
    }
    if (method === "GET" && url.pathname.startsWith("/v1/snapshots/")) {
      const snapshot = snapshots.get(id);
      if (!snapshot) return json(res, 404, { error: "not found" });
      if (snapshot.status === "pending") snapshot.status = snapshotFails ? "failed" : "ready";
      return json(res, 200, snapshot);
    }
    if (method === "DELETE" || (method === "POST" && url.pathname.endsWith("/restore"))) {
      if (method === "DELETE") snapshots.delete(id);
      const operation = { id: randomUUID(), state: "pending" };
      operations.set(operation.id, operation);
      return json(res, 202, operation);
    }
    if (method === "GET" && url.pathname.startsWith("/v1/operations/")) {
      const operation = operations.get(id);
      return json(res, 200, { ...operation, state: operationFails ? "failed" : "succeeded" });
    }
    return json(res, 404, { error: "unexpected request" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture address");
  const base = `http://127.0.0.1:${address.port}`;
  const request: InstaboxRequest = (method, path, opts) => {
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(opts?.query ?? {})) url.searchParams.set(key, value);
    return fetch(url, { method, headers: { "content-type": "application/json", ...(opts?.idempotent ? { "Idempotency-Key": randomUUID() } : {}) },
      ...(opts?.body === undefined ? {} : { body: JSON.stringify(opts.body) }) });
  };
  return { request, calls, snapshots,
    setCreateResponse: (shape: CreateResponseShape) => { createResponse = shape; },
    failNext: () => { failNext = true; },
    failSnapshot: () => { snapshotFails = true; },
    failOperation: () => { operationFails = true; },
    close: () => new Promise<void>((resolve, reject) => { server.close((error) => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}
