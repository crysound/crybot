import { allowsTool, parseToolScope, type ToolScope } from "../shared/tool-scope.ts";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { createControlClient, controlRefusal, type ControlState, type ControlClient } from "./computer-control-client.ts";
import type { AppClient } from "./mcp-app-connections.ts";
import { CALL_TOOL, DESCRIBE_TOOL, SEARCH_TOOL, ToolDirectory, type CatalogTool } from "./mcp-directory.ts";
import { listsComputerTool } from "./computer-tool-list.ts";
import { textOnlyErrorResult } from "./mcp-error-result.ts";
import { MAX_INPUT_BYTES, failure } from "./harness-mcp-request.ts";
import { screenExecArgs, screenSocket, sharedScreenTarget } from "./container-computer.ts";
import { settledWithin } from "./auto-vm-claims.ts";

export function lazyContainerRequests(deps: {
  toolScope?: ToolScope;
  gate: (action: boolean, signal: AbortSignal) => Promise<ControlState>;
  connect: (signal: AbortSignal) => Promise<AppClient>;
}) {
  let connection: Promise<{ client: AppClient; directory: ToolDirectory }> | undefined;
  let closed = false;
  const active = new Map<string | number | null, AbortController>();
  const controller = new AbortController();
  const listed = new ToolDirectory([]).listed({ server: "computer" }).map(tool => tool.name === SEARCH_TOOL
    ? { ...tool, description: "Find tools on the assigned Linux desktop by what you want to do. This waits for the computer to wake. Use describe_tool for exact inputs and call_tool to run a match." }
    : tool);
  const connect = () => connection ??= (async () => {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]);
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
  })().catch(error => { connection = undefined; throw error; });
  return {
    async request(frame: { id?: string | number | null; method?: string; params?: { name?: string; arguments?: unknown; requestId?: string | number } }) {
      if (frame.method === "notifications/cancelled") {
        const id = frame.params?.requestId;
        if (id !== undefined) active.get(id)?.abort(new Error("Computer call cancelled."));
        return;
      }
      if (frame.id === undefined) return;
      const { id, method } = frame;
      const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
      if (method === "initialize") return reply({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "computer", version: "1" } });
      if (method === "ping") return reply({});
      if (method === "tools/list") return reply({ tools: listed });
      if (method !== "tools/call") return failure(id, method, "Method not found.", -32601);
      const { name, arguments: args } = frame.params ?? {};
      if (![SEARCH_TOOL, DESCRIBE_TOOL, CALL_TOOL].includes(name ?? "")) return failure(id, method, "Unknown computer tool.");
      if (active.has(id)) return failure(id, method, "Request ID is already active.");
      const requestController = new AbortController();
      active.set(id, requestController);
      try {
        if (closed) throw new Error("Computer connection closed.");
        const signal = AbortSignal.any([controller.signal, requestController.signal, AbortSignal.timeout(120_000)]);
        const gate = await abortable(deps.gate(name === CALL_TOOL, signal), signal);
        signal.throwIfAborted();
        if (gate.held) return failure(id, method, controlRefusal(gate));
        const { client, directory } = await abortable(connect(), signal);
        if (name === SEARCH_TOOL) return reply(await directory.search(args));
        if (name === DESCRIBE_TOOL) return reply(directory.describe(args));
        const call = directory.call(args);
        if ("answer" in call) return reply(call.answer);
        const current = await abortable(deps.gate(true, signal), signal);
        signal.throwIfAborted();
        if (current.held) return failure(id, method, controlRefusal(current));
        return reply(textOnlyErrorResult(await client.request("tools/call", call, signal)));
      } catch (error) {
        return failure(id, method, error instanceof Error ? error.message : String(error));
      } finally { active.delete(id); }
    },
    async close() {
      closed = true;
      controller.abort();
      await connection?.then(({ client }) => client.close(), () => {});
    },
  };
}

export function gatedContainerRequests(command: string, args: string[], gate: ControlClient, options: {
  toolScope?: ToolScope;
  dynamicScreen: boolean;
  open(command: string, args: string[], signal: AbortSignal): Promise<AppClient>;
}) {
  let screen: number | undefined;
  return lazyContainerRequests({
    toolScope: options.toolScope,
    gate: async (action, signal) => {
      if (options.dynamicScreen && screen === undefined) {
        for (;;) {
          signal.throwIfAborted();
          const readiness = await gate.state(true, { readinessOnly: "1" }, signal);
          signal.throwIfAborted();
          if (!readiness.held) {
            screen = readiness.localVmScreen;
            if (!action) return readiness;
            break;
          }
          if (!readiness.readinessPending) return readiness;
          await settledWithin(null, 250, signal);
        }
      }
      const state = await gate.state(true, action ? undefined : { readinessOnly: "1" }, signal);
      if (!state.held) screen = state.localVmScreen;
      return state;
    },
    connect: async signal => {
      if (options.dynamicScreen) {
        if (screen === undefined) throw new Error("No screen was assigned to this turn");
        if (screen > 0) args = screenExecArgs(sharedScreenTarget(screen), ["mcp", "--socket", screenSocket(screen)], { interactive: true });
      }
      return options.open(command, args, signal);
    },
  });
}

export function runLazyContainerMcp(command: string, args: string[], control: { url: string; token: string }): void {
  const parsed = parseToolScope(JSON.parse(process.env.CRYBOT_CONTAINER_TOOL_SCOPE ?? "{}"));
  if (!parsed.ok) throw new Error(parsed.error);
  const requests = gatedContainerRequests(command, args, createControlClient(control), {
    toolScope: parsed.scope, dynamicScreen: process.env.CRYBOT_CONTAINER_DYNAMIC_SCREEN === "1",
    open: async (command, args, signal) => {
      const { openAppClient } = await import("./mcp-app-connections.ts");
      return openAppClient({ command, args, env: {} }, { onNotification() {} }, false, signal);
    },
  });
  serveLazyContainerRequests(requests, process.stdin, process.stdout);
  process.once("SIGTERM", () => { void requests.close().finally(() => process.exit(0)); });
}

export function serveLazyContainerRequests(requests: ReturnType<typeof lazyContainerRequests>, stream: Readable, output: Writable): void {
  const input = createInterface({ input: stream });
  const pending = new Set<Promise<void>>();
  input.on("line", line => {
    const work = (async () => {
      let result: unknown;
      try {
        if (Buffer.byteLength(line) > MAX_INPUT_BYTES) throw new Error("Request too large.");
        result = await requests.request(JSON.parse(line));
      } catch { result = failure(null, null, "Invalid request.", -32600); }
      if (result !== undefined) output.write(JSON.stringify(result) + "\n");
    })();
    pending.add(work);
    void work.finally(() => pending.delete(work));
  });
  input.on("close", () => { void Promise.allSettled(pending).finally(() => requests.close()); });
}

function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
