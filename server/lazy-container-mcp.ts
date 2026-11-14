import { allowsTool, parseToolScope, type ToolScope } from "../shared/tool-scope.ts";
import { createInterface } from "node:readline";
import { createControlClient, controlRefusal, type ControlState } from "./computer-control-client.ts";
import type { AppClient } from "./mcp-app-connections.ts";
import { CALL_TOOL, DESCRIBE_TOOL, SEARCH_TOOL, ToolDirectory, type CatalogTool } from "./mcp-directory.ts";
import { listsComputerTool } from "./computer-tool-list.ts";
import { textOnlyErrorResult } from "./mcp-error-result.ts";
import { MAX_INPUT_BYTES, failure } from "./harness-mcp-request.ts";

export function lazyContainerRequests(deps: {
  toolScope?: ToolScope;
  gate: () => Promise<ControlState>;
  connect: (signal: AbortSignal) => Promise<AppClient>;
}) {
  let connection: Promise<{ client: AppClient; directory: ToolDirectory }> | undefined;
  let closed = false;
  const controller = new AbortController();
  const listed = new ToolDirectory([]).listed({ server: "computer" }).map(tool => tool.name === SEARCH_TOOL
    ? { ...tool, description: "Find tools on the assigned Linux desktop by what you want to do. This waits for the computer to wake. Use describe_tool for exact inputs and call_tool to run a match." }
    : tool);
  const connect = (signal: AbortSignal) => connection ??= (async () => {
    const client = await deps.connect(signal);
    try {
      const tools: Array<CatalogTool & { inputSchema: Record<string, unknown> }> = [];
      let cursor: string | undefined;
      for (let page = 0; page < 100; page++) {
        const result = await client.request("tools/list", cursor ? { cursor } : {}, signal) as { tools: Array<CatalogTool & { inputSchema: Record<string, unknown> }>; nextCursor?: string };
        tools.push(...result.tools.filter(tool => listsComputerTool(tool.name, true) && allowsTool(deps.toolScope, { kind: "mcp", server: "computer", name: tool.name })));
        cursor = result.nextCursor;
        if (!cursor) break;
      }
      const { compileServerToolSchema } = await import("./mcp-schema-validator.ts");
      const validators = new Map(tools.map(tool => [tool.name, compileServerToolSchema(tool.inputSchema)]));
      const directory = new ToolDirectory(tools, { check: (tool, args) => validators.get(tool.name)!(args)
        ? undefined : ["Arguments do not match this tool's input schema."] });
      return { client, directory };
    } catch (error) {
      await client.close();
      throw error;
    }
  })();
  return {
    async request(frame: { id?: string | number | null; method?: string; params?: { name?: string; arguments?: unknown } }) {
      if (frame.id === undefined) return;
      const { id, method } = frame;
      const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
      if (method === "initialize") return reply({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "computer", version: "1" } });
      if (method === "ping") return reply({});
      if (method === "tools/list") return reply({ tools: listed });
      if (method !== "tools/call") return failure(id, method, "Method not found.", -32601);
      const { name, arguments: args } = frame.params ?? {};
      if (![SEARCH_TOOL, DESCRIBE_TOOL, CALL_TOOL].includes(name ?? "")) return failure(id, method, "Unknown computer tool.");
      try {
        if (closed) throw new Error("Computer connection closed.");
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]);
        const gate = await deps.gate();
        signal.throwIfAborted();
        if (gate.held) return failure(id, method, controlRefusal(gate));
        const { client, directory } = await connect(signal);
        if (name === SEARCH_TOOL) return reply(await directory.search(args));
        if (name === DESCRIBE_TOOL) return reply(directory.describe(args));
        const call = directory.call(args);
        if ("answer" in call) return reply(call.answer);
        const current = await deps.gate();
        signal.throwIfAborted();
        if (current.held) return failure(id, method, controlRefusal(current));
        return reply(textOnlyErrorResult(await client.request("tools/call", call, signal)));
      } catch (error) {
        return failure(id, method, error instanceof Error ? error.message : String(error));
      }
    },
    async close() {
      closed = true;
      controller.abort();
      await connection?.then(({ client }) => client.close(), () => {});
    },
  };
}

export function runLazyContainerMcp(command: string, args: string[], control: { url: string; token: string }): void {
  const parsed = parseToolScope(JSON.parse(process.env.CRYBOT_CONTAINER_TOOL_SCOPE ?? "{}"));
  if (!parsed.ok) throw new Error(parsed.error);
  const gate = createControlClient(control);
  const requests = lazyContainerRequests({
    toolScope: parsed.scope,
    gate: () => gate.state(true),
    connect: async signal => {
      const { openAppClient } = await import("./mcp-app-connections.ts");
      return openAppClient({ command, args, env: {} }, { onNotification() {} }, false, signal);
    },
  });
  const input = createInterface({ input: process.stdin });
  let pending = Promise.resolve();
  input.on("line", line => {
    pending = pending.then(async () => {
      let result: unknown;
      try {
        if (Buffer.byteLength(line) > MAX_INPUT_BYTES) throw new Error("Request too large.");
        result = await requests.request(JSON.parse(line));
      } catch { result = failure(null, null, "Invalid request.", -32600); }
      if (result !== undefined) process.stdout.write(JSON.stringify(result) + "\n");
    });
  });
  input.on("close", () => { void pending.finally(() => requests.close()); });
  process.once("SIGTERM", () => { void requests.close().finally(() => process.exit(0)); });
}
