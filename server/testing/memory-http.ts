import { IncomingMessage, ServerResponse, type IncomingHttpHeaders } from "node:http";
import { Socket } from "node:net";
import { once } from "node:events";

export class MemorySocket extends Socket {
  readonly chunks: Buffer[] = [];
  override _read(): void {}
  override _writev(chunks: Array<{ chunk: Buffer }>, callback: (error?: Error | null) => void): void {
    for (const { chunk } of chunks) this.chunks.push(Buffer.from(chunk));
    callback();
  }
  override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }
}

export function memoryRequest(path: string, method = "GET", headers: IncomingHttpHeaders = {}) {
  const socket = new MemorySocket();
  Object.defineProperty(socket, "remoteAddress", { value: "127.0.0.1" });
  const req = new IncomingMessage(socket);
  req.url = path; req.method = method; req.headers = { host: "localhost", ...headers };
  return { req, socket };
}

export async function memoryHttp(handle: (req: IncomingMessage, res: ServerResponse) => Promise<unknown>, path: string, method = "GET", headers: IncomingHttpHeaders = {}) {
  const { req, socket } = memoryRequest(path, method, headers);
  const res = new ServerResponse(req);
  res.assignSocket(socket);
  const done = once(res, "finish");
  await handle(req, res);
  await done;
  const raw = Buffer.concat(socket.chunks).toString();
  const body = raw.slice(raw.indexOf("\r\n\r\n") + 4);
  socket.destroy();
  return { status: res.statusCode, headers: res.getHeaders(), body, json: async () => JSON.parse(body) };
}
