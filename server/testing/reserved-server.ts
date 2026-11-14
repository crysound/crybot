import { spawn, type SpawnOptions } from "node:child_process";
import { createServer, type Server } from "node:net";

async function reservePort(): Promise<{ server: Server; port: number; fd: number }> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  // Node 24 exposes the listening descriptor through _handle; spawn duplicates it into the child before returning.
  const fd = (server as Server & { _handle?: { fd?: number } })._handle?.fd;
  if (!address || typeof address === "string" || fd === undefined || fd < 0) {
    server.close();
    throw new Error("could not obtain the reserved listener's port and descriptor");
  }
  return { server, port: address.port, fd };
}

export async function spawnReservedServer(entry: string, options: Omit<SpawnOptions, "stdio">) {
  const app = await reservePort();
  let webhook: Awaited<ReturnType<typeof reservePort>> | undefined;
  try {
    webhook = await reservePort();
    const child = spawn(process.execPath, ["--import", new URL("./reserved-listen.ts", import.meta.url).href, entry], {
      ...options,
      env: { ...options.env, CRYBOT_PORT: String(app.port), CRYBOT_WEBHOOK_PORT: String(webhook.port) },
      stdio: ["ignore", "pipe", "pipe", app.fd, webhook.fd],
    });
    return { child, port: app.port, webhookPort: webhook.port };
  } finally {
    app.server.close();
    webhook?.server.close();
  }
}
