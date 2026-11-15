import { afterEach, beforeEach, expect, it } from "vitest";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";
import { createInstaboxRequest } from "./client.ts";
import { createInstaboxMachines } from "./machines.ts";
import type { InstaboxMachines } from "./machine.ts";

let fake: Awaited<ReturnType<typeof fakeInstaboxCore>>;
let service: InstaboxMachines;
const botId = "123456789012-more";
beforeEach(async () => { fake = await fakeInstaboxCore(); service = createInstaboxMachines(createInstaboxRequest("fixture-key", fake.url)); });
afterEach(async () => { await fake.close(); });

it.each(["linux", "android"] as const)("creates %s with the shared naming/spec contract, waits, then starts desktop", async template => {
  const machine = await service.ensureRunning(botId, { template });
  expect(machine).toMatchObject({ name: "crybot-123456789012", state: "running", template });
  expect(fake.calls.find(call => call.method === "POST" && call.path === "/v1/machines")?.body).toEqual({
    name: "crybot-123456789012", templateId: template === "linux" ? "agent-browser" : "android",
    spec: { vcpus: 4, memoryGiB: 8 }, autoSuspendAfterSeconds: 600, metadata: { app: "crybot", botId },
  });
  expect(fake.calls.at(-1)?.body).toEqual({ action: "start", width: 1280, height: 800 });
  expect(fake.calls.filter(call => call.path.includes("operations"))).toHaveLength(2);
  expect(await service.find(botId)).toEqual(machine);
  expect(await service.find("unrelated-bot")).toBeNull();
});

it("single-flights concurrent starts and tolerates an already running desktop", async () => {
  const machines = await Promise.all(Array.from({ length: 12 }, () => service.ensureRunning(botId)));
  expect(new Set(machines.map(machine => machine.id)).size).toBe(1);
  expect(fake.calls.filter(call => call.method === "POST" && call.path === "/v1/machines")).toHaveLength(1);
  await expect(service.ensureRunning(botId)).resolves.toEqual(machines[0]);
  fake.failNext({ status: 503, code: "unavailable" });
  await expect(service.ensureRunning(botId)).rejects.toThrow("unavailable");
  await expect(service.ensureRunning(botId)).resolves.toEqual(machines[0]);
});

it("finishes a pending suspension before deleting the machine", async () => {
  const machine = await service.ensureRunning(botId);
  const hold = fake.holdNext("POST", `/v1/machines/${machine.id}/suspend`, true);
  const suspension = service.suspend(botId);
  await hold.reached;
  const removal = service.remove(botId);
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(fake.calls.some(call => call.method === "DELETE")).toBe(false);
  } finally {
    hold.release();
    await Promise.all([suspension, removal]);
  }
  expect(fake.machines.get(machine.id)?.state).toBe("deleted");
});

it.each(["suspended", "stopped"] as const)("wakes a %s machine and retries exec exactly once", async state => {
  const machine = await service.ensureRunning(botId);
  fake.machines.get(machine.id)!.state = state;
  const result = await service.exec(machine.id, { argv: ["printf", "fixture"], timeoutSeconds: 12 });
  expect(result.stdout).toBe("fixture output");
  expect(fake.calls.filter(call => call.path.endsWith("/exec"))).toHaveLength(2);
  expect(fake.calls.some(call => call.path.endsWith(state === "suspended" ? "/resume" : "/start"))).toBe(true);
});

it("suspends, resumes, deletes with confirmation, and ignores deleted machines", async () => {
  const machine = await service.ensureRunning(botId);
  await service.suspend(botId);
  expect((await service.find(botId))?.state).toBe("suspended");
  await service.suspend(botId);
  expect(fake.calls.filter(call => call.path.endsWith("/suspend"))).toHaveLength(1);
  await service.ensureRunning(botId);
  await service.remove(botId);
  expect(fake.calls.find(call => call.method === "DELETE")?.headers["x-confirm-delete"]).toBe(machine.id);
  expect(await service.find(botId)).toBeNull();
  await service.remove(botId);
  await service.suspend(botId);
  expect((await service.ensureRunning(botId)).id).not.toBe(machine.id);
});

it("waits for intermediate state before deciding whether to resume and refuses error state", async () => {
  const machine = await service.ensureRunning(botId);
  fake.machines.get(machine.id)!.state = "suspending";
  const timer = setTimeout(() => { fake.machines.get(machine.id)!.state = "suspended"; }, 150);
  try { await expect(service.ensureRunning(botId)).resolves.toMatchObject({ state: "running" }); }
  finally { clearTimeout(timer); }
  fake.machines.get(machine.id)!.state = "error";
  await expect(service.ensureRunning(botId)).rejects.toThrow("InstaBox machine is in error state");
});

it("uploads and downloads exact bytes and encodes file parameters", async () => {
  const machine = await service.ensureRunning(botId);
  const bytes = new Uint8Array([0, 255, 128, 13, 10]);
  await service.writeFile(machine.id, "/tmp/a & b", bytes, { mode: "0600" });
  expect(await service.readFile(machine.id, "/tmp/a & b")).toEqual(bytes);
  const write = fake.calls.find(call => call.method === "PUT")!;
  expect(Object.fromEntries(write.query)).toEqual({ path: "/tmp/a & b", mode: "0600", parents: "true" });
  expect(write.body).toEqual(Buffer.from(bytes));
  expect((await service.vncUpstream(machine.id)).url).toContain(`/v1/machines/${machine.id}/vnc`);
});

it.each([undefined, 128])("rejects excessive Content-Length and cancels the body with maxBytes=%s", async maxBytes => {
  const machine = await service.ensureRunning(botId);
  const limit = maxBytes ?? 256 * 1024 * 1024;
  const stream = fake.streamFile(machine.id, "/tmp/large", {
    chunk: Buffer.alloc(64), chunkCount: 100, contentLength: limit + 1,
  });
  await expect(service.readFile(machine.id, "/tmp/large", maxBytes === undefined ? undefined : { maxBytes })).rejects.toThrow(
    new Error(`InstaBox readFile exceeds maxBytes=${limit}`),
  );
  await expect.poll(() => stream.cancelled).toBe(true);
  expect(stream.completed).toBe(false);
  expect(stream.chunksSent * 64).toBeLessThan(limit + 1);
});

it("cancels an oversized chunked download before the server sends the entire file", async () => {
  const machine = await service.ensureRunning(botId);
  const stream = fake.streamFile(machine.id, "/tmp/chunked", { chunk: Buffer.alloc(64), chunkCount: 100 });
  await expect(service.readFile(machine.id, "/tmp/chunked", { maxBytes: 128 })).rejects.toThrow(
    new Error("InstaBox readFile exceeds maxBytes=128"),
  );
  await expect.poll(() => stream.cancelled).toBe(true);
  expect(stream.chunksSent).toBeGreaterThanOrEqual(3);
  expect(stream.chunksSent).toBeLessThan(stream.chunkCount);
  expect(stream.completed).toBe(false);
});

it.each([undefined, 12])("reads exact bytes up to the limit with Content-Length=%s", async contentLength => {
  const machine = await service.ensureRunning(botId);
  const chunk = Buffer.from([0, 255, 128, 10]);
  const stream = fake.streamFile(machine.id, "/tmp/bounded", { chunk, chunkCount: 3, contentLength });
  expect(await service.readFile(machine.id, "/tmp/bounded", { maxBytes: 12 })).toEqual(new Uint8Array(Buffer.concat([chunk, chunk, chunk])));
  expect(stream.completed).toBe(true);
  expect(stream.cancelled).toBe(false);
});

it("allows an empty file with a zero-byte limit and rejects nonempty files", async () => {
  const machine = await service.ensureRunning(botId);
  await service.writeFile(machine.id, "/tmp/empty", new Uint8Array());
  expect(await service.readFile(machine.id, "/tmp/empty", { maxBytes: 0 })).toEqual(new Uint8Array());
  await service.writeFile(machine.id, "/tmp/nonempty", new Uint8Array([1]));
  await expect(service.readFile(machine.id, "/tmp/nonempty", { maxBytes: 0 })).rejects.toThrow("maxBytes=0");
});

it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid maxBytes=%s before requesting a file", async maxBytes => {
  await expect(service.readFile("unused", "/tmp/file", { maxBytes })).rejects.toThrow("maxBytes must be a non-negative safe integer");
  expect(fake.calls).toHaveLength(0);
});

it("does not retry unrelated exec failures", async () => {
  const machine = await service.ensureRunning(botId);
  fake.failNext({ status: 409, code: "quota_exceeded" });
  await expect(service.exec(machine.id, { cmd: "true" })).rejects.toThrow("quota_exceeded");
  expect(fake.calls.filter(call => call.path.endsWith("/exec"))).toHaveLength(1);
});

it("does not claim a same-name machine with another bot's metadata", async () => {
  const machine = await service.ensureRunning(botId);
  fake.machines.get(machine.id)!.metadata.botId = "another-bot";
  expect(await service.find(botId)).toBeNull();
});

it("rejects an existing machine when the requested template changes", async () => {
  await service.ensureRunning(botId, { template: "android" });
  await expect(service.ensureRunning(botId, { template: "linux" })).rejects.toThrow("template mismatch");
});

it("reuses an existing Android machine when an ordinary turn omits the template", async () => {
  const android = await service.ensureRunning(botId, { template: "android" });
  await expect(service.ensureRunning(botId)).resolves.toMatchObject({ id: android.id, template: "android" });
  expect(fake.calls.filter(call => call.method === "POST" && call.path === "/v1/machines")).toHaveLength(1);
});


it("resumes manual suspension before file uploads and downloads", async () => {
  const machine = await service.ensureRunning(botId);
  const data = new Uint8Array([1, 2, 3]);
  await service.suspend(botId);
  await service.writeFile(machine.id, "/tmp/resume", data);
  await service.suspend(botId);
  expect(await service.readFile(machine.id, "/tmp/resume")).toEqual(data);
  expect(fake.calls.filter(call => call.path.endsWith("/resume"))).toHaveLength(2);
});
