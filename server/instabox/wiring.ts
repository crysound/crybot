import type { AppConfig } from "../config.ts";
import { sealedFixture } from "../env-path.ts";
import type { DesktopTarget } from "../routes/desktop-viewer.ts";
import { createSnapshotWiring } from "./snapshot-wiring.ts";
import { createInstaboxRequest } from "./client.ts";
import { instaboxApiKey } from "./key.ts";
import type { InstaboxMachine, InstaboxMachines, InstaboxRequest } from "./machine.ts";
import { createInstaboxMachines } from "./machines.ts";
import { instaboxStatus, requireInstabox } from "./power.ts";
import { instaboxDesktopTarget } from "./vnc.ts";

export function createInstaboxWiring(deps: { cfg(): AppConfig; eligible(botId: string): boolean; claim(botId: string, allowPreview?: boolean): () => void; inUse(botId: string): boolean; snapshotTimeoutMs?: number }) {
  const testEnvironment = process.env.NODE_ENV === "test" || process.env.VITEST === "true" || sealedFixture();
  const fixtureApi = testEnvironment ? process.env.CRYBOT_TEST_INSTABOX_API : undefined;
  const fixture = /^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(fixtureApi ?? "");
  let cached: { key: string; machines: InstaboxMachines; request: InstaboxRequest } | undefined;
  const current = new Map<string, string>();
  function service() {
    const key = instaboxApiKey(deps.cfg());
    if (!key) { cached = undefined; current.clear(); return null; }
    if (cached?.key !== key) {
      current.clear();
      const request = createInstaboxRequest(key, fixture ? fixtureApi : undefined);
      const machines = createInstaboxMachines(request);
      const remember = (botId: string, machine: InstaboxMachine | null) => {
        if (machine && machine.state !== "deleted") current.set(botId, machine.id);
        else current.delete(botId);
        return machine;
      };
      cached = { key, request, machines: { ...machines,
        find: async botId => remember(botId, await machines.find(botId)),
        ensureRunning: async (botId, opts) => remember(botId, await machines.ensureRunning(botId, opts))!,
        remove: async botId => { await machines.remove(botId); current.delete(botId); },
      } };
    }
    return cached;
  }
  const machines = () => service()?.machines ?? null;
  return {
    machines,
    previewStatus(botId: string) {
      const key = instaboxApiKey(deps.cfg());
      const probe = key ? createInstaboxMachines(createInstaboxRequest(key, fixture ? fixtureApi : undefined, 2_500)) : null;
      return instaboxStatus(probe, botId);
    },
    allowInsecureLoopbackUpstream: fixture,
    tools(boxId: string | null | undefined) {
      if (!boxId?.startsWith("instabox/")) return undefined;
      const active = service();
      return { machines: requireInstabox(active?.machines ?? null), request: active!.request, machineId: () => boxId.slice(9) };
    },
    target(botId: string): DesktopTarget | undefined {
      if (!deps.eligible(botId)) return;
      const active = service();
      if (!active) return;
      const target = instaboxDesktopTarget(`instabox/${botId}/${current.get(botId) ?? "pending"}`, async () => {
        const release = deps.claim(botId, true);
        try {
          if (!deps.eligible(botId) || service() !== active) throw new Error("InstaBox computer is unavailable");
          const machine = await active.machines.ensureRunning(botId);
          target.key = `instabox/${botId}/${machine.id}`;
          return await active.machines.vncUpstream(machine.id);
        } finally { release(); }
      }, { live: () => deps.eligible(botId) && service() === active });
      return target;
    },
    routes: createSnapshotWiring({ ...deps, baseUrl: fixture ? fixtureApi : undefined }),
  };
}
