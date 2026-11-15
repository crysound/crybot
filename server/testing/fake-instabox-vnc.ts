import { createServer, type IncomingHttpHeaders } from "node:http";
import { createServer as createSecureServer } from "node:https";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";

export async function fakeInstaboxVnc(opts: {
  beforeUpgrade?: () => Promise<void>;
  response?: string;
  tls?: { key: string; cert: string };
} = {}) {
  const server = opts.tls ? createSecureServer(opts.tls) : createServer();
  server.on("request", (_req, res) => res.writeHead(404).end());
  const sockets = new WebSocketServer({ noServer: true });
  const peers = new Set<Duplex>();
  const requests: Array<{ headers: IncomingHttpHeaders; url: string | undefined }> = [];
  const received: Buffer[] = [];
  const sent: Buffer[] = [];
  const keys: number[] = [];
  const frame = Buffer.alloc(20);
  frame.writeUInt16BE(1, 2);
  frame.writeUInt16BE(1, 8);
  frame.writeUInt16BE(1, 10);
  frame[16] = 255;
  sockets.on("headers", headers => headers.push("X-API-Key: synthetic-upstream-secret", "Set-Cookie: upstream=synthetic-upstream-secret"));
  server.on("upgrade", (req, socket, head) => {
    peers.add(socket);
    socket.on("error", () => socket.destroy());
    socket.once("close", () => peers.delete(socket));
    requests.push({ headers: req.headers, url: req.url });
    void (async () => {
      await opts.beforeUpgrade?.();
      if (socket.destroyed) return;
      if (opts.response !== undefined) { socket.end(opts.response); return; }
      sockets.handleUpgrade(req, socket, head, peer => sockets.emit("connection", peer, req));
    })();
  });
  sockets.on("connection", socket => {
    let pending: Buffer = Buffer.alloc(0);
    let phase = 0;
    let sentFrame = false;
    const send = (bytes: Buffer) => { sent.push(bytes); socket.send(bytes); };
    send(Buffer.from("RFB 003.008\n"));
    socket.on("error", () => socket.terminate());
    socket.on("message", (raw, binary) => {
      if (!binary) { socket.close(); return; }
      const bytes = Buffer.from(raw as Buffer);
      received.push(bytes);
      pending = Buffer.concat([pending, bytes]);
      for (;;) {
        let length: number;
        if (phase === 0) length = 12;
        else if (phase <= 2) length = 1;
        else {
          if (!pending.length) return;
          switch (pending[0]) {
            case 0: length = 20; break;
            case 2: if (pending.length < 4) return; length = 4 + pending.readUInt16BE(2) * 4; break;
            case 3: length = 10; break;
            case 4: length = 8; break;
            case 5: length = 6; break;
            case 6: if (pending.length < 8) return; length = 8 + pending.readUInt32BE(4); break;
            default: socket.close(); return;
          }
        }
        if (pending.length < length) return;
        const message = pending.subarray(0, length);
        pending = pending.subarray(length);
        if (phase === 0) { phase++; send(Buffer.from([1, 1])); }
        else if (phase === 1) { phase++; send(Buffer.alloc(4)); }
        else if (phase === 2) {
          phase++;
          const name = Buffer.from("Isolated InstaBox desktop");
          const init = Buffer.alloc(24 + name.length);
          init.writeUInt16BE(1280, 0); init.writeUInt16BE(800, 2);
          init[4] = 32; init[5] = 24; init[7] = 1;
          init.writeUInt16BE(255, 8); init.writeUInt16BE(255, 10); init.writeUInt16BE(255, 12);
          init[14] = 16; init[15] = 8;
          init.writeUInt32BE(name.length, 20); name.copy(init, 24);
          send(init);
        } else if (message[0] === 3 && !sentFrame) { sentFrame = true; send(frame); }
        else if (message[0] === 4 && message[1] === 1) keys.push(message.readUInt32BE(4));
      }
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return {
    url: `${opts.tls ? "wss" : "ws"}://127.0.0.1:${port}/v1/machines/fixture-machine/vnc`,
    requests, received, sent, keys, frame, sockets,
    async close() {
      for (const socket of sockets.clients) socket.terminate();
      for (const peer of peers) peer.destroy();
      await new Promise<void>(resolve => sockets.close(() => resolve()));
      await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    },
  };
}
