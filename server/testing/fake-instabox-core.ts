import { createServer, type IncomingHttpHeaders } from "node:http";
import { WebSocketServer } from "ws";
import type { InstaboxMachineState } from "../instabox/machine.ts";

export async function fakeInstaboxCore() {
  const snapshots = new Map<string, { id: string; name: string; status: "pending" | "ready" | "failed"; sourceMachineId: string }>();
  const vncRequests: IncomingHttpHeaders[] = [];
  const sockets = new WebSocketServer({ noServer: true });
  const machines = new Map<string, { id: string; name: string; state: InstaboxMachineState; templateId: string; metadata: Record<string, unknown> }>();
  const operations = new Map<string, { id: string; machineId: string; state: string; finalState: InstaboxMachineState; polls: number }>();
  const files = new Map<string, Buffer>();
  const fileStreams = new Map<string, {
    chunk: Buffer; chunkCount: number; contentLength?: number;
    chunksSent: number; cancelled: boolean; completed: boolean;
  }>();
  const desktop = new Set<string>();
  const calls: Array<{ method: string; path: string; query: URLSearchParams; headers: IncomingHttpHeaders; body: any }> = [];
  let failure: { status: number; code: string; message?: string } | undefined;
  let operationFailure = false;
  const holds: Array<{ method: string; path: string; response: boolean; entered(): void; wait: Promise<void>; release(): void; cancelled: boolean }> = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks);
    const body = req.headers["content-type"] === "application/json" && raw.length ? JSON.parse(raw.toString()) : raw;
    calls.push({ method: req.method!, path: url.pathname, query: url.searchParams, headers: req.headers, body });
    const hold = holds.find(entry => entry.method === req.method && entry.path === url.pathname);
    if (hold) holds.splice(holds.indexOf(hold), 1);
    if (hold) res.on("close", () => { hold.cancelled = !res.writableEnded; });
    if (hold && !hold.response) { hold.entered(); await hold.wait; }
    const send = (status: number, value: unknown) => {
      const finish = () => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); };
      if (hold?.response) { hold.entered(); void hold.wait.then(finish); }
      else finish();
    };
    if (failure) { const next = failure; failure = undefined; return send(next.status, { error: next }); }
    if (!req.headers["x-api-key"]) return send(401, { error: { code: "unauthorized" } });
    if (url.pathname === "/v1/snapshots") return send(200, { snapshots: [...snapshots.values()] });
    if (url.pathname.startsWith("/v1/snapshots/")) {
      const snapshot = snapshots.get(url.pathname.split("/").at(-1)!);
      if (!snapshot) return send(404, { error: { code: "not_found" } });
      snapshot.status = "ready";
      return send(200, snapshot);
    }
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
      const operation = { id: `op-${operations.size + 1}`, machineId, type: "fixture", phase: "pending", state: "pending", finalState, polls: 0 };
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
    if (machine.state !== "running") return send(409, { error: { code: action === "snapshots" || action === "restore" ? "operation_conflict" : "machine_not_running" } });
    if (action === "desktop") {
      if (desktop.has(machine.id)) return send(409, { error: { code: "desktop_already_running" } });
      desktop.add(machine.id); return send(200, { running: true });
    }
    if (action === "snapshots") {
      const snapshot = { id: `snapshot-${snapshots.size + 1}`, name: body.name, status: "pending" as const, sourceMachineId: machine.id };
      snapshots.set(snapshot.id, snapshot);
      return finish(machine.id, "running");
    }
    if (action === "restore") { desktop.delete(machine.id); return finish(machine.id, "running"); }
    if (action === "exec") return send(200, { stdout: "fixture output", stderr: "", exitCode: 0, timedOut: false, truncated: false });
    const fileKey = `${machine.id}:${url.searchParams.get("path")}`;
    if (action === "files" && req.method === "PUT") { files.set(fileKey, raw); res.writeHead(204); return res.end(); }
    if (action === "files/content") {
      const stream = fileStreams.get(fileKey);
      if (stream) {
        res.writeHead(200, stream.contentLength === undefined ? {} : { "Content-Length": stream.contentLength });
        res.flushHeaders();
        const timer = setInterval(() => {
          res.write(stream.chunk);
          stream.chunksSent++;
          if (stream.chunksSent === stream.chunkCount) {
            clearInterval(timer);
            stream.completed = true;
            res.end();
          }
        }, 20);
        res.on("close", () => { clearInterval(timer); stream.cancelled = !stream.completed; });
        return;
      }
      res.writeHead(200); return res.end(files.get(fileKey) ?? (url.searchParams.get("path")?.startsWith("/tmp/cry-instabox-") ? Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==", "base64") : Buffer.alloc(0)));
    }
    send(404, { error: { code: "not_found" } });
  });
  server.on("upgrade", (req, socket, head) => {
    vncRequests.push(req.headers);
    sockets.handleUpgrade(req, socket, head, peer => { peer.on("error", () => {}); peer.send(Buffer.from("RFB 003.008\n")); });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake InstaBox failed to listen");
  return { url: `http://127.0.0.1:${address.port}`, calls, machines, operations, desktop, snapshots, vncRequests,
    holdNext: (method: string, path: string, response = false) => {
      let release!: () => void;
      let entered!: () => void;
      const wait = new Promise<void>(resolve => { release = resolve; });
      const reached = new Promise<void>(resolve => { entered = resolve; });
      const hold = { method, path, response, wait, entered, release, cancelled: false };
      holds.push(hold);
      return { reached, release, cancelled: () => hold.cancelled };
    },
    streamFile: (machineId: string, path: string, options: { chunk: Buffer; chunkCount: number; contentLength?: number }) => {
      const stream = { ...options, chunksSent: 0, cancelled: false, completed: false };
      fileStreams.set(`${machineId}:${path}`, stream);
      return stream;
    },
    failNext: (next: NonNullable<typeof failure>) => { failure = next; },
    failOperations: () => { operationFailure = true; },
    close: () => new Promise<void>((resolve, reject) => { for (const peer of sockets.clients) peer.terminate(); sockets.close(); server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}
