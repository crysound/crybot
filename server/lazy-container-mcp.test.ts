import { afterEach, expect, it, vi } from "vitest";
import { PassThrough } from "node:stream";
import { lazyContainerRequests, serveLazyContainerRequests } from "./lazy-container-mcp.ts";
import type { AppClient } from "./mcp-app-connections.ts";
import type { ControlState } from "./computer-control-client.ts";
import { startAutoVmClaim, type AutoVmClaimTable } from "./auto-vm-claims.ts";

const request = (method: string, name?: string, args?: unknown) => ({ id: 1, method, params: { name, arguments: args } });
const click = { name: "click", description: "Click the desktop", inputSchema: { type: "object", properties: { x: { type: "integer" } }, required: ["x"] } };
function fixture(gate: (action: boolean, signal: AbortSignal) => Promise<ControlState>, toolScope?: { deny: string[] }) {
  const call = vi.fn(async (method: string) => method === "tools/list" ? { tools: [click, { ...click, name: "run_script" }] }
    : { content: [{ type: "text", text: "clicked" }] });
  const client: AppClient = { request: call, close: vi.fn(async () => {}), extensions: undefined, serverInfo: undefined, closed: false };
  const connect = vi.fn(async () => client);
  return { call, connect, proxy: lazyContainerRequests({ gate, connect, toolScope }) };
}
afterEach(() => vi.useRealTimers());

it("initializes and lists tools immediately while a five-second wake is in progress, then calls successfully", async () => {
  vi.useFakeTimers();
  const claims: AutoVmClaimTable = new Map();
  const claim = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 5000)));
  const slot = { owner: { threadId: "thread", generation: "generation" }, claim, lazy: true };
  claims.set("thread", slot);
  startAutoVmClaim(claims, "thread", "generation");
  const gate = async () => {
    startAutoVmClaim(claims, "thread", "generation");
    await claims.get("thread")!.begin;
    return { held: false, helpOpen: false };
  };
  const { proxy, connect, call } = fixture(gate);
  const start = Date.now();
  expect(await proxy.request(request("initialize"))).toHaveProperty("result.capabilities.tools");
  expect(await proxy.request(request("tools/list"))).toHaveProperty("result.tools");
  expect(Date.now() - start).toBeLessThan(1000);
  expect(connect).not.toHaveBeenCalled();
  let completed = false;
  const action = proxy.request(request("tools/call", "call_tool", { name: "click", arguments: { x: 10 } })).then(result => { completed = true; return result; });
  await vi.advanceTimersByTimeAsync(4999);
  expect(completed).toBe(false);
  expect(connect).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await action).toHaveProperty("result.content", [{ type: "text", text: "clicked" }]);
  expect(claim).toHaveBeenCalledTimes(1);
  expect(call).toHaveBeenCalledWith("tools/call", { name: "click", arguments: { x: 10 } }, expect.any(AbortSignal));
  await proxy.close();
});

it("returns wake failure without connecting to the stopped container", async () => {
  const { proxy, connect } = fixture(async () => ({ held: true, helpOpen: false, blockedReason: "fixture wake failed" }));
  const result = await proxy.request(request("tools/call", "search_tools", { query: "click" }));
  expect(JSON.stringify(result)).toContain("fixture wake failed");
  expect(result).toHaveProperty("result.isError", true);
  expect(connect).not.toHaveBeenCalled();
  await proxy.close();
});

it("filters upkeep and batch tools and validates the real driver's input before calling", async () => {
  const { proxy, call } = fixture(async () => ({ held: false, helpOpen: false }));
  await proxy.request(request("tools/call", "call_tool", { name: "run_script", arguments: {} }));
  await proxy.request(request("tools/call", "call_tool", { name: "click", arguments: { x: "invalid" } }));
  expect(call.mock.calls.filter(([method]) => method === "tools/call")).toHaveLength(0);
  const found = await proxy.request(request("tools/call", "search_tools", { query: "click desktop" }));
  expect(JSON.stringify(found)).toContain("click");
  expect(JSON.stringify(found)).not.toContain("run_script");
  await proxy.close();
});

it("rechecks ownership after connecting and refuses to act after a takeover", async () => {
  const gate = vi.fn<() => Promise<ControlState>>()
    .mockResolvedValueOnce({ held: false, helpOpen: false })
    .mockResolvedValue({ held: true, helpOpen: false, blockedReason: "ownership changed" });
  const { proxy, call } = fixture(gate);
  expect(JSON.stringify(await proxy.request(request("tools/call", "call_tool", { name: "click", arguments: { x: 1 } })))).toContain("ownership changed");
  expect(call.mock.calls.filter(([method]) => method === "tools/call")).toHaveLength(0);
  await proxy.close();
});


it("refuses a denied inner tool even when call_tool itself is allowed", async () => {
  const { proxy, call } = fixture(async () => ({ held: false, helpOpen: false }), { deny: ["mcp:computer:click"] });
  const result = await proxy.request(request("tools/call", "call_tool", { name: "click", arguments: { x: 1 } }));
  expect(JSON.stringify(result)).toContain("No tool named");
  expect(call.mock.calls.filter(([method]) => method === "tools/call")).toHaveLength(0);
  await proxy.close();
});

it.each(["search_tools", "describe_tool"])("%s only waits for readiness without the screen action gate", async name => {
  const gate = vi.fn(async (action: boolean) => ({ held: action, helpOpen: false, blockedReason: "person holds the screen" }));
  const { proxy, call } = fixture(gate);
  const result = await proxy.request(request("tools/call", name, name === "search_tools" ? { query: "click" } : { name: "click" }));
  expect(result).not.toHaveProperty("result.isError", true);
  expect(gate).toHaveBeenCalledExactlyOnceWith(false, expect.any(AbortSignal));
  expect(call.mock.calls.filter(([method]) => method === "tools/call")).toHaveLength(0);
  await proxy.close();
});

it("reconnects after a failed connection instead of retaining the rejected promise", async () => {
  const { proxy, connect } = fixture(async () => ({ held: false, helpOpen: false }));
  connect.mockRejectedValueOnce(new Error("connection failed"));
  expect(JSON.stringify(await proxy.request(request("tools/call", "search_tools", { query: "click" })))).toContain("connection failed");
  expect(await proxy.request(request("tools/call", "search_tools", { query: "click" }))).not.toHaveProperty("result.isError", true);
  expect(connect).toHaveBeenCalledTimes(2);
  await proxy.close();
});

it("cleans up and reconnects after tools/list fails", async () => {
  const { proxy, connect, call } = fixture(async () => ({ held: false, helpOpen: false }));
  call.mockRejectedValueOnce(new Error("catalog disconnected"));
  expect(await proxy.request(request("tools/call", "search_tools", { query: "click" }))).toHaveProperty("result.isError", true);
  const client = await connect.mock.results[0].value;
  expect(client.close).toHaveBeenCalledOnce();
  expect(await proxy.request(request("tools/call", "search_tools", { query: "click" }))).not.toHaveProperty("result.isError", true);
  expect(connect).toHaveBeenCalledTimes(2);
  await proxy.close();
});

it("answers ping and cancels a pending call without waiting for the gate", async () => {
  let release!: (state: ControlState) => void;
  let signal: AbortSignal | undefined;
  const { proxy, connect, call } = fixture(async (_action, requestSignal) => {
    signal = requestSignal;
    return new Promise(resolve => { release = resolve; });
  });
  const pending = proxy.request(request("tools/call", "call_tool", { name: "click", arguments: { x: 1 } }));
  expect(await proxy.request({ id: 2, method: "ping" })).toMatchObject({ id: 2, result: {} });
  await proxy.request({ method: "notifications/cancelled", params: { requestId: 1 } });
  expect(signal?.aborted).toBe(true);
  expect(JSON.stringify(await pending)).toContain("cancelled");
  release({ held: false, helpOpen: false });
  await Promise.resolve();
  expect(connect).not.toHaveBeenCalled();
  expect(call).not.toHaveBeenCalled();
  await proxy.close();
});

it("handles stdin ping and cancellation ahead of a blocked tools/call", async () => {
  const input = new PassThrough(), output = new PassThrough();
  const { proxy, connect } = fixture(async () => new Promise(() => {}));
  const replies: any[] = [];
  output.on("data", chunk => replies.push(JSON.parse(chunk.toString())));
  serveLazyContainerRequests(proxy, input, output);
  input.write(JSON.stringify(request("tools/call", "call_tool", { name: "click", arguments: { x: 1 } })) + "\n");
  input.write(JSON.stringify({ id: 2, method: "ping" }) + "\n");
  await vi.waitFor(() => expect(replies).toEqual([{ jsonrpc: "2.0", id: 2, result: {} }]));
  input.write(JSON.stringify({ method: "notifications/cancelled", params: { requestId: 1 } }) + "\n");
  await vi.waitFor(() => expect(replies).toHaveLength(2));
  expect(replies[1]).toHaveProperty("result.isError", true);
  expect(JSON.stringify(replies[1])).toContain("cancelled");
  expect(connect).not.toHaveBeenCalled();
  input.end();
  await proxy.close();
});
