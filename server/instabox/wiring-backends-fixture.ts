import { createServer } from "node:http";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { removeTempDir } from "../testing/cleanup.ts";

export async function wiringBackendsFixture() {
  const root = mkdtempSync(join(tmpdir(), "cry-wiring-backends-"));
  const calls: Array<{ path: string; body: any }> = [];
  const rows: Array<{ id: string; name: string; state: string }> = [];
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const path = new URL(req.url!, "http://fixture").pathname;
    calls.push({ path, body });
    const reply = (value: unknown) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(value)); };
    if (path === "/vps/exec") return reply({ content: [{ type: "text", text: "VPS fixture completed" }] });
    if (path === "/sandboxes" && req.method === "POST") {
      const sandbox = { id: "bx_23456789", name: body.name, state: "ready" }; rows.push(sandbox); return reply({ sandbox });
    }
    if (path === "/sandboxes") return reply({ sandboxes: rows });
    if (path.endsWith("/desktop")) return reply({ desktopUrl: "https://desktop.fixture.invalid" });
    if (path.endsWith("/commands")) return reply({ exitCode: 0, stdout: "Boat fixture completed", stderr: "" });
    const row = rows.find(row => path === `/sandboxes/${row.id}`);
    if (row) { if (body.name) row.name = body.name; return reply({ sandbox: row }); }
    reply({});
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture did not listen");
  const base = `http://127.0.0.1:${address.port}`;
  const mcp = join(root, "vps-mcp.mjs");
  writeFileSync(mcp, `
import { createInterface } from 'node:readline';
for await (const line of createInterface({ input: process.stdin })) {
  const request = JSON.parse(line);
  if (request.id === undefined) continue;
  let result = {};
  if (request.method === 'initialize') result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'fixture-vps', version: '1' } };
  if (request.method === 'tools/list') result = { tools: [{ name: 'exec', description: 'Fixture command', inputSchema: { type: 'object', properties: { command: { type: 'string' } } } }] };
  if (request.method === 'tools/call') result = await (await fetch(${JSON.stringify(base + "/vps/exec")}, { method: 'POST', body: JSON.stringify(request.params) })).json();
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\\n');
}
`);
  const actual = new URL("../vps-computer.ts?actual", import.meta.url).href;
  const hook = join(root, "vps-hooks.mjs");
  const mock = `
export * from ${JSON.stringify(actual)};
const status = { ready: true, daemonUp: true, configured: true, sshAlias: 'fixture-vps', container_id: 'fixture-container', container: 'running' };
export async function vpsComputerStatus() { return status; }
export async function inspectVpsForAuto() { return status; }
export async function vpsComputerAction() { return status; }
export function vpsComputerMcp() { return { command: process.execPath, args: [${JSON.stringify(mcp)}], env: {} }; }
`;
  writeFileSync(hook, `
import { registerHooks } from 'node:module';
registerHooks({
  load(url, context, next) {
    if (url.endsWith('/vps-computer.ts')) return { format: 'module', shortCircuit: true, source: ${JSON.stringify(mock)} };
    return next(url, context);
  }
});
`);
  return { calls, env: { CRYBOT_BOAT_API: base, NODE_OPTIONS: `--import=${pathToFileURL(hook).href}` },
    close: async () => {
      await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
      await removeTempDir(root);
    },
  };
}
