import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { InstaboxError, instaboxVncUpstream, readInstaboxFile, waitOperation } from "./client.ts";
import type { InstaboxExecResult, InstaboxMachine, InstaboxMachines, InstaboxRequest, InstaboxTemplate } from "./machine.ts";
import type { createInstaboxMachineRecords } from "./machine-records.ts";

const LIFECYCLE_TIMEOUT = 180_000;
const stableStates = new Set(["running", "stopped", "suspended", "deleted", "error"]);

function machineOf(row: InstaboxMachine & { templateId?: string }): InstaboxMachine {
  return { id: row.id, name: row.name, state: row.state, template: row.templateId === "android" || row.template === "android" ? "android" : "linux" };
}

export function createInstaboxMachines(request: InstaboxRequest, records?: ReturnType<typeof createInstaboxMachineRecords>, apiKey?: string | null): InstaboxMachines {
  const keyFingerprint = apiKey ? createHash("sha256").update(apiKey).digest("hex").slice(0, 16) : null;
  const pending = new Map<string, Promise<InstaboxMachine>>();
  const suspending = new Map<string, Promise<void>>();
  const pathOf = (id: string) => `/v1/machines/${encodeURIComponent(id)}`;
  const read = async (id: string) => machineOf(await (await request("GET", pathOf(id))).json() as InstaboxMachine & { templateId?: string });
  const lifecycle = async (method: string, path: string, opts: Parameters<InstaboxRequest>[2] = {}, createdFor?: string) => {
    const operation = await (await request(method, path, { ...opts, idempotent: true })).json() as { id: string; machineId: string };
    if (createdFor) records?.remember(createdFor, operation.machineId, keyFingerprint);
    await waitOperation(request, operation.id, LIFECYCLE_TIMEOUT);
    return operation;
  };
  const stable = async (machine: InstaboxMachine, deadline = Date.now() + LIFECYCLE_TIMEOUT): Promise<InstaboxMachine> => {
    while (!stableStates.has(machine.state)) {
      if (Date.now() >= deadline) throw new Error("InstaBox machine timed out");
      await delay(100);
      machine = await read(machine.id);
    }
    if (machine.state === "error") throw new Error("InstaBox machine is in error state");
    return machine;
  };
  const find = async (botId: string) => {
    const name = `crybot-${botId.slice(0, 12)}`;
    const result = await (await request("GET", "/v1/machines", { query: { name } })).json() as Array<InstaboxMachine & { metadata?: Record<string, unknown> }> | { machines?: Array<InstaboxMachine & { metadata?: Record<string, unknown> }>; items?: Array<InstaboxMachine & { metadata?: Record<string, unknown> }> };
    const rows = Array.isArray(result) ? result : result.machines ?? result.items ?? [];
    const found = rows.find(row => row.name === name && row.metadata?.botId === botId && row.state !== "deleted");
    if (found) records?.remember(botId, found.id, keyFingerprint);
    return found ? machineOf(found) : null;
  };
  const wake = async (machine: InstaboxMachine): Promise<InstaboxMachine> => {
    machine = await stable(machine);
    if (machine.state === "suspended" || machine.state === "stopped") {
      await lifecycle("POST", `${pathOf(machine.id)}/${machine.state === "suspended" ? "resume" : "start"}`);
      machine = await stable(await read(machine.id));
    }
    if (machine.state !== "running") throw new Error("InstaBox machine is not running");
    return machine;
  };
  const whileRunning = async <T>(machineId: string, run: () => Promise<T>): Promise<T> => {
    try { return await run(); }
    catch (error) {
      if (!(error instanceof InstaboxError && error.status === 409 && error.code === "machine_not_running")) throw error;
      await wake(await read(machineId));
      return run();
    }
  };
  const start = async (botId: string, requestedTemplate?: InstaboxTemplate) => {
    let machine = await find(botId);
    if (machine) machine = await stable(machine);
    const template = requestedTemplate ?? machine?.template ?? "linux";
    if (machine && requestedTemplate !== undefined && machine.template !== requestedTemplate) {
      throw new Error(`InstaBox machine template mismatch: expected ${requestedTemplate}, found ${machine.template}`);
    }
    if (!machine || machine.state === "deleted") {
      const operation = await lifecycle("POST", "/v1/machines", { body: {
        name: `crybot-${botId.slice(0, 12)}`, templateId: template === "android" ? "android" : "agent-browser",
        vcpus: 4, memMiB: 8192, autoSuspendAfterSeconds: 600, metadata: { app: "crybot", botId },
      } }, botId);
      machine = await read(operation.machineId);
    }
    machine = await wake(machine);
    try {
      const response = await request("POST", `${pathOf(machine.id)}/desktop`, { body: { action: "start", width: 1280, height: 800 } });
      await response.body?.cancel();
    } catch (error) {
      if (!(error instanceof InstaboxError && error.status === 409 && ["desktop_already_running", "desktop_running"].includes(error.code))) throw error;
    }
    return machine;
  };
  return {
    find,
    ensureRunning(botId, opts) {
      const current = pending.get(botId);
      if (current) return current;
      const task = start(botId, opts?.template).finally(() => { pending.delete(botId); });
      pending.set(botId, task);
      return task;
    },
    suspend(botId) {
      const current = suspending.get(botId);
      if (current) return current;
      const task = (async () => {
        await pending.get(botId);
        const found = await find(botId);
        if (!found) return;
        const machine = await stable(found);
        if (machine.state === "running") await lifecycle("POST", `${pathOf(machine.id)}/suspend`);
      })().finally(() => { suspending.delete(botId); });
      suspending.set(botId, task);
      return task;
    },
    async remove(botId) {
      await pending.get(botId);
      await suspending.get(botId)?.catch(() => {});
      const machine = await find(botId);
      if (machine) {
        await lifecycle("DELETE", pathOf(machine.id), { headers: { "X-Confirm-Delete": machine.id } });
      } else {
        const record = records?.get(botId);
        if (!record) return;
        const deleted = await read(record.machineId).then(found => found.state === "deleted", error => error instanceof InstaboxError && error.status === 404);
        if (!keyFingerprint || record.keyFingerprint !== keyFingerprint) {
          throw new Error("This bot's cloud computer was created with another InstaBox API key, or its original key is unknown. Restore the original key before deleting this bot.");
        }
        if (!deleted) throw new Error("Cannot confirm this bot's InstaBox cloud computer was deleted. Restore the original key before deleting this bot.");
      }
      records?.forget(botId);
    },
    async exec(machineId, req) {
      return whileRunning(machineId, async () => (await request("POST", `${pathOf(machineId)}/exec`, { body: req })).json() as Promise<InstaboxExecResult>);
    },
    async readFile(machineId, path, options) {
      const maxBytes = options?.maxBytes ?? 256 * 1024 * 1024;
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error("InstaBox readFile maxBytes must be a non-negative safe integer");
      return whileRunning(machineId, async () => {
        const response = await request("GET", `${pathOf(machineId)}/files/content`, { query: { path } });
        return readInstaboxFile(response, maxBytes);
      });
    },
    async writeFile(machineId, path, data, opts) {
      await whileRunning(machineId, async () => {
        const response = await request("PUT", `${pathOf(machineId)}/files`, { raw: data, query: { path, mode: opts?.mode ?? "0644", parents: "true" } });
        await response.body?.cancel();
      });
    },
    async vncUpstream(machineId) { return instaboxVncUpstream(request, machineId); },
  };
}
