import { randomUUID } from "node:crypto";
import type { InstaboxRequest } from "./machine.ts";

const connections = new WeakMap<InstaboxRequest, { baseUrl: string; apiKey: string }>();

export class InstaboxError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(`InstaBox HTTP ${status}: ${code}`);
    this.name = "InstaboxError";
    this.status = status;
    this.code = code;
  }
}

function errorCode(value: unknown, apiKey?: string): string {
  return typeof value === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(value) && (!apiKey || !value.includes(apiKey))
    ? value : "request_failed";
}

export function createInstaboxRequest(apiKey: string, baseUrl = "https://api.instabox.sh"): InstaboxRequest {
  if (!apiKey || /[^\x21-\x7e]/.test(apiKey)) throw new Error("Invalid InstaBox API key");
  const origin = new URL(baseUrl);
  const request: InstaboxRequest = async (method, path, opts = {}) => {
    const url = new URL(path, origin);
    if (url.origin !== origin.origin || url.username || url.password) throw new Error("Invalid InstaBox API path");
    for (const [name, value] of Object.entries(opts.query ?? {})) url.searchParams.set(name, value);
    const headers = new Headers(opts.headers);
    headers.set("X-API-Key", apiKey);
    if (opts.idempotent) headers.set("Idempotency-Key", randomUUID());
    let body: string | Buffer | undefined;
    if (opts.raw !== undefined) {
      body = Buffer.from(opts.raw);
      headers.set("Content-Type", "application/octet-stream");
    } else if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
      headers.set("Content-Type", "application/json");
    }
    let response: Response;
    try {
      response = await fetch(url, { method: method.toUpperCase(), headers, ...(body === undefined ? {} : { body }), redirect: "error", signal: AbortSignal.timeout(650_000) });
    } catch {
      throw new InstaboxError(0, "network_error");
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { error?: { code?: unknown } | string; code?: unknown } | null;
      throw new InstaboxError(response.status, errorCode((typeof detail?.error === "object" ? detail.error?.code : detail?.error) ?? detail?.code, apiKey));
    }
    return response;
  };
  connections.set(request, { baseUrl: origin.href, apiKey });
  return request;
}

export function instaboxVncUpstream(request: InstaboxRequest, machineId: string) {
  const connection = connections.get(request);
  if (!connection) throw new Error("InstaBox connection metadata is unavailable");
  const url = new URL(`/v1/machines/${encodeURIComponent(machineId)}/vnc`, connection.baseUrl);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  return { url: url.href, headers: { "X-API-Key": connection.apiKey } };
}

export async function waitOperation(request: InstaboxRequest, opId: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const operation = await Promise.race([
        request("GET", `/v1/operations/${encodeURIComponent(opId)}`, { query: { wait: "25s" } }).then(response => response.json()),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error("InstaBox operation timed out")), deadline - Date.now());
        }),
      ]) as { state: string };
      if (operation.state === "succeeded") return;
      if (operation.state === "failed") throw new Error("InstaBox operation failed");
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("InstaBox operation timed out");
}
