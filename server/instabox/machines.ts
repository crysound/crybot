import { setTimeout as delay } from "node:timers/promises";
import { InstaboxError, instaboxVncUpstream, waitOperation } from "./client.ts";
import type { InstaboxExecResult, InstaboxMachine, InstaboxMachines, InstaboxRequest, InstaboxTemplate } from "./machine.ts";

const LIFECYCLE_TIMEOUT = 180_000;
const stableStates = new Set(["running", "stopped", "suspended", "deleted", "error"]);

function machineOf(row: InstaboxMachine & { templateId?: string }): InstaboxMachine {
  return { id: row.id, name: row.name, state: row.state, template: row.templateId === "android" || row.template === "android" ? "android" : "linux" };
}

export function createInstaboxMachines(request: InstaboxRequest): InstaboxMachines {
  const pending = new Map<string, Promise<InstaboxMachine>>();
  const pathOf = (id: string) => `/v1/machines/${encodeURIComponent(id)}`;
  const read = async (id: string) => machineOf(await (await request("GET", pathOf(id))).json() as InstaboxMachine & { templateId?: string });
  const lifecycle = async (method: string, path: string, opts: Parameters<InstaboxRequest>[2] = {}) => {
    const operation = await (await request(method, path, { ...opts, idempotent: true })).json() as { id: string; machineId: string };
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
        spec: { vcpus: 4, memoryGiB: 8 }, autoSuspendAfterSeconds: 600, metadata: { app: "crybot", botId },
      } });
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
    async suspend(botId) {
      await pending.get(botId);
      const found = await find(botId);
      if (!found) return;
      const machine = await stable(found);
      if (machine.state === "running") await lifecycle("POST", `${pathOf(machine.id)}/suspend`);
    },
    async remove(botId) {
      await pending.get(botId);
      const machine = await find(botId);
      if (machine) await lifecycle("DELETE", pathOf(machine.id), { headers: { "X-Confirm-Delete": machine.id } });
    },
    async exec(machineId, req) {
      return whileRunning(machineId, async () => (await request("POST", `${pathOf(machineId)}/exec`, { body: req })).json() as Promise<InstaboxExecResult>);
    },
    async readFile(machineId, path) {
      return whileRunning(machineId, async () => {
        const response = await request("GET", `${pathOf(machineId)}/files/content`, { query: { path } });
        return new Uint8Array(await response.arrayBuffer());
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
