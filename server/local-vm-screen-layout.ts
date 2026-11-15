import { availableParallelism, totalmem } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "./config.ts";
import { localVmResources, localVmScreens } from "./local-vm-settings.ts";
import { containerTargetOf, isScreenTarget, screenWorkdir, VM_WORKSPACE_GUEST, type LocalVmTarget } from "./container-computer.ts";

export function localVmLayout(cfg: AppConfig, target: LocalVmTarget): "single" | "multi" {
  return containerTargetOf(target).key === "shared" && localVmScreens(cfg) > 1 ? "multi" : "single";
}

export function localVmRunResources(cfg: AppConfig) {
  return localVmScreens(cfg) > 1 ? localVmResources(cfg, { memoryGb: totalmem() / 1024 ** 3, cpus: availableParallelism() }) : localVmResources(cfg);
}

export function localVmWorkspace(target: LocalVmTarget): { host: string; root: string } {
  return isScreenTarget(target) ? { host: join(target.workspaceDir, "screens", `s${target.screen}`), root: screenWorkdir(target.screen) }
    : { host: target.workspaceDir, root: VM_WORKSPACE_GUEST };
}

export function screenJoinUrl(viewerUrl: string, screen: number, password: string): string {
  const url = new URL(viewerUrl);
  const hash = new URLSearchParams(url.hash.slice(1));
  hash.set("password", password);
  hash.set("path", `websockify?token=s${screen}`);
  url.hash = hash.toString();
  return url.href;
}

export function localVmFolders(target: LocalVmTarget | undefined): { vmWorkspace: string | null; vmGuestRoot?: string } {
  if (!target) return { vmWorkspace: null };
  const workspace = localVmWorkspace(target);
  return { vmWorkspace: workspace.host, vmGuestRoot: workspace.root };
}
