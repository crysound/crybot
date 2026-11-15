import type { ToolScope } from "../shared/tool-scope.ts";
import type { AutoVmClaimOwner, AutoVmClaimTable } from "./auto-vm-claims.ts";
import { containerComputerMcp, SHARED_LOCAL_VM_TARGET, type Runtime } from "./container-computer.ts";

export function mountLazyScreenMcp(deps: {
  runtime: Runtime;
  control: { url: string; token: string };
  toolScope?: ToolScope;
  claims: AutoVmClaimTable;
  owner: AutoVmClaimOwner;
  claim(): Promise<unknown>;
  onClaimed(): void;
  onRejected(failure: string, error?: unknown): void;
}) {
  const launch = containerComputerMcp(deps.runtime, deps.control, SHARED_LOCAL_VM_TARGET, { toolScope: deps.toolScope });
  launch.env.CRYBOT_CONTAINER_DYNAMIC_SCREEN = "1";
  deps.claims.set(deps.owner.threadId, {
    owner: deps.owner, lazy: true, localVm: true, label: "the Local VM",
    claim: async () => { await deps.claim(); deps.onClaimed(); }, onRejected: deps.onRejected,
  });
  return launch;
}
