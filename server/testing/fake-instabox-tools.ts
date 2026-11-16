import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createInstaboxRequest } from "../instabox/client.ts";
import type { InstaboxExecRequest, InstaboxExecResult, InstaboxMachines } from "../instabox/machine.ts";

type Request = { method: string; path: string; machineId: string; exec?: InstaboxExecRequest; data?: Uint8Array; mode?: string };
type Options = {
  exec?: (request: InstaboxExecRequest) => Promise<InstaboxExecResult>;
  read?: (path: string) => Promise<Uint8Array | { stream: AsyncIterable<Uint8Array>; size?: number }>;
  write?: (path: string, data: Uint8Array) => Promise<void>;
};

export async function fakeInstaboxTools(options: Options = {}) {
  const requests: Request[] = [];
  const leaseRequests: Array<{ method: string; path: string; body?: unknown; idempotencyKey?: string | string[] }> = [];
  const files = new Map<string, Uint8Array>();
  const state = { suspended: false, resumes: 0, hold: false };
  const server = createServer(async (req, res) => {
    res.setHeader("connection", "close");
    const url = new URL(req.url!, "http://127.0.0.1");
    const parts = url.pathname.split("/");
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    if (parts[4] === "activity-leases") {
      const body = bytes.length ? JSON.parse(bytes.toString()) : undefined;
      leaseRequests.push({ method: req.method!, path: url.pathname, body, idempotencyKey: req.headers["idempotency-key"] });
      if (!parts[5] || parts.length !== 6 || !["PUT", "DELETE"].includes(req.method!)) { res.writeHead(404); res.end(); return; }
      if (req.method === "PUT") {
        if (!body || Object.keys(body).length !== 1 || !Number.isInteger(body.ttlSeconds) || body.ttlSeconds < 30 || body.ttlSeconds > 3600) { res.writeHead(400); res.end(); return; }
        state.suspended = false;
      }
      res.writeHead(204); res.end(); return;
    }
    const request: Request = { method: req.method!, path: url.searchParams.get("path") ?? url.pathname, machineId: parts[3] };
    if (parts[4] === "exec") request.exec = JSON.parse(bytes.toString()) as InstaboxExecRequest;
    if (req.method === "PUT") { request.data = bytes; request.mode = url.searchParams.get("mode") ?? undefined; }
    requests.push(request);
    if (state.suspended) { res.writeHead(409); res.end(JSON.stringify({ code: "machine_not_running" })); return; }
    if (state.hold) return;
    try {
      if (request.exec) {
        res.end(JSON.stringify(await options.exec?.(request.exec) ?? { stdout: "captured", stderr: "", exitCode: 0, timedOut: false, truncated: false }));
      } else if (req.method === "PUT") {
        await options.write?.(request.path, bytes);
        files.set(request.path, bytes);
        res.end();
      } else if (parts[4] === "files") {
        const data = await options.read?.(request.path) ?? files.get(request.path);
        if (!data) { res.writeHead(404); res.end(); }
        else if ("stream" in data) {
          if (data.size !== undefined) res.setHeader("content-length", data.size);
          await pipeline(Readable.from(data.stream), res);
        } else res.end(data);
      } else { res.writeHead(404); res.end(); }
    } catch {
      if (!res.headersSent && !res.destroyed) { res.writeHead(500); res.end(); }
      else res.destroy();
    }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture did not bind");
  const url = `http://127.0.0.1:${address.port}`;
  const fetchRequest = async (path: string, init?: RequestInit): Promise<Response> => {
    let response = await fetch(url + path, init);
    if (response.status === 409) {
      await response.body?.cancel();
      state.suspended = false;
      state.resumes++;
      response = await fetch(url + path, init);
    }
    if (!response.ok) throw new Error(`fixture HTTP ${response.status}`);
    return response;
  };
  const machines: InstaboxMachines = {
    find: async () => null,
    ensureRunning: async () => ({ id: "fixture-machine", name: "fixture", state: "running", template: "linux" }),
    suspend: async () => { state.suspended = true; },
    remove: async () => {},
    exec: async (id, args) => await (await fetchRequest(`/v1/machines/${id}/exec`, { method: "POST", body: JSON.stringify(args) })).json() as InstaboxExecResult,
    readFile: async (id, path, options) => {
      const response = await fetchRequest(`/v1/machines/${id}/files/content?${new URLSearchParams({ path })}`);
      const maxBytes = options?.maxBytes ?? Infinity;
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw new Error("File exceeds maxBytes");
      }
      const reader = response.body?.getReader();
      if (!reader) return new Uint8Array();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.byteLength > maxBytes - total) throw new Error("File exceeds maxBytes");
          total += value.byteLength;
          chunks.push(value);
        }
        return Buffer.concat(chunks, total);
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
    },
    writeFile: async (id, path, data, opts) => {
      const response = await fetchRequest(`/v1/machines/${id}/files?${new URLSearchParams({ path, mode: opts?.mode ?? "0644", parents: "true" })}`, { method: "PUT", body: Buffer.from(data) });
      await response.body?.cancel();
    },
    vncUpstream: async () => ({ url, headers: {} }),
  };
  const request = createInstaboxRequest("fixture-key", url);
  return { machines, request, requests, leaseRequests, files, state, close: async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  } };
}
