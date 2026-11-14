import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { waitForExit } from "./cleanup.ts";
import { spawnReservedServer } from "./reserved-server.ts";

it("keeps both OS-assigned ports reserved through spawn and serves on their inherited sockets", async () => {
  const home = mkdtempSync(join(tmpdir(), "cry-reserved-server-"));
  const entry = join(home, "server.mjs");
  writeFileSync(entry, `import { createServer } from 'node:http';
for (const port of [process.env.CRYBOT_PORT, process.env.CRYBOT_WEBHOOK_PORT]) {
  createServer((_req, res) => res.end(port)).listen(Number(port), '127.0.0.1');
}
`);
  const children: Awaited<ReturnType<typeof spawnReservedServer>>[] = [];
  try {
    for (let i = 0; i < 2; i++) children.push(await spawnReservedServer(entry, { env: { PATH: process.env.PATH, HOME: home } }));
    const ports = children.flatMap(({ port, webhookPort }) => [port, webhookPort]);
    expect(new Set(ports).size).toBe(4);
    for (const port of ports) {
      const conflict = createServer();
      const code = await new Promise<string>((resolve, reject) => {
        conflict.once("error", (error: NodeJS.ErrnoException) => resolve(error.code!));
        conflict.listen(port, "127.0.0.1", () => conflict.close(() => reject(new Error(`port ${port} was not reserved`))));
      });
      expect(code).toBe("EADDRINUSE");
      expect(await (await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(10_000) })).text()).toBe(String(port));
    }
  } finally {
    await Promise.all(children.map(({ child }) => waitForExit(child, { signal: "SIGTERM" })));
    rmSync(home, { recursive: true, force: true });
  }
});
