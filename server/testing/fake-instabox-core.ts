import { createServer, type IncomingHttpHeaders } from "node:http";
import type { InstaboxMachineState } from "../instabox/machine.ts";

export async function fakeInstaboxCore() {
  const machines = new Map<string, { id: string; name: string; state: InstaboxMachineState; templateId: string; metadata: Record<string, unknown> }>();
  const operations = new Map<string, { id: string; machineId: string; state: string; finalState: InstaboxMachineState; polls: number }>();
  const files = new Map<string, Buffer>();
  const desktop = new Set<string>();
  const calls: Array<{ method: string; path: string; query: URLSearchParams; headers: IncomingHttpHeaders; body: any }> = [];
  let failure: { status: number; code: string; message?: string } | undefined;
  let operationFailure = false;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks);
    const body = req.headers["content-type"] === "application/json" && raw.length ? JSON.parse(raw.toString()) : raw;
    calls.push({ method: req.method!, path: url.pathname, query: url.searchParams, headers: req.headers, body });
    const send = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value));
    };
    if (failure) { const next = failure; failure = undefined; return send(next.status, { error: next }); }
    if (!req.headers["x-api-key"]) return send(401, { error: { code: "unauthorized" } });
    const op = url.pathname.match(/^\/v1\/operations\/(.+)$/);
    if (op) {
      const operation = operations.get(op[1]);
      if (!operation) return send(404, { error: { code: "not_found" } });
      if (operation.polls++ > 0) {
        operation.state = operationFailure ? "failed" : "succeeded";
        if (!operationFailure) machines.get(operation.machineId)!.state = operation.finalState;
      }
      return send(200, operation);
    }
    const finish = (machineId: string, finalState: InstaboxMachineState) => {
      if (!req.headers["idempotency-key"]) return send(400, { error: { code: "idempotency_required" } });
      const operation = { id: `op-${operations.size + 1}`, machineId, state: "pending", finalState, polls: 0 };
      operations.set(operation.id, operation);
      send(202, operation);
    };
    if (url.pathname === "/v1/machines") {
      if (req.method === "GET") return send(200, { machines: [...machines.values()] });
      const id = `machine-${machines.size + 1}`;
      machines.set(id, { id, name: body.name, state: "creating", templateId: body.templateId, metadata: body.metadata ?? {} });
      return finish(id, "running");
    }
    const match = url.pathname.match(/^\/v1\/machines\/([^/]+)(?:\/(.+))?$/);
    const machine = match && machines.get(match[1]);
    if (!machine) return send(404, { error: { code: "not_found" } });
    const action = match![2];
    if (!action && req.method === "GET") return send(200, machine);
    if (!action && req.method === "DELETE") {
      if (req.headers["x-confirm-delete"] !== machine.id) return send(400, { error: { code: "confirmation_required" } });
      machine.state = "deleting";
      return finish(machine.id, "deleted");
    }
    if (action === "resume" || action === "start" || action === "suspend") {
      machine.state = action === "resume" ? "resuming" : action === "start" ? "starting" : "suspending";
      return finish(machine.id, action === "suspend" ? "suspended" : "running");
    }
    if (machine.state !== "running") return send(409, { error: { code: "machine_not_running" } });
    if (action === "desktop") {
      if (desktop.has(machine.id)) return send(409, { error: { code: "desktop_already_running" } });
      desktop.add(machine.id); return send(200, { running: true });
    }
    if (action === "exec") return send(200, { stdout: "fixture output", stderr: "", exitCode: 0, timedOut: false, truncated: false });
    const fileKey = `${machine.id}:${url.searchParams.get("path")}`;
    if (action === "files" && req.method === "PUT") { files.set(fileKey, raw); res.writeHead(204); return res.end(); }
    if (action === "files/content") { res.writeHead(200); return res.end(files.get(fileKey) ?? Buffer.alloc(0)); }
    send(404, { error: { code: "not_found" } });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake InstaBox failed to listen");
  return { url: `http://127.0.0.1:${address.port}`, calls, machines, operations, desktop,
    failNext: (next: NonNullable<typeof failure>) => { failure = next; },
    failOperations: () => { operationFailure = true; },
    close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}
