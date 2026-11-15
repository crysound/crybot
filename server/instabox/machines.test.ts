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
