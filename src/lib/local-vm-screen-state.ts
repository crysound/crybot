import { viewerTargetId } from "../../shared/desktop-viewer";

export interface LocalVmStatus {
  screen?: { screen: number; viewerTarget: string } | null;
  queue_position?: number;
  resumable?: boolean;
  stop_reason?: "idle" | null;
  mode: "shared" | "per-bot" | "pool";
  max_instances: number;
  image: boolean;
  create_supported: boolean;
  container: "running" | "stopped" | "missing";
  imageMatches: boolean;
  managed: boolean;
  network: "loopback" | "unsafe" | "unknown";
  security: "hardened" | "unsafe" | "unknown";
  persistence: "durable" | "unsafe" | "unknown";
  desktopReady: boolean;
  ready: boolean;
  problem: string | null;
  viewer_url: string;
  target_key: string;
}

export type LocalVmWaitState = "queued" | "unassigned" | null;

export function localVmWaitState(status: Pick<LocalVmStatus, "queue_position" | "screen">): LocalVmWaitState {
  if (status.queue_position !== undefined && status.queue_position > 0) return "queued";
  return status.screen === null ? "unassigned" : null;
}

export function localVmPollInterval(status: Pick<LocalVmStatus, "queue_position" | "screen">): number {
  return localVmWaitState(status) === "unassigned" ? 15_000 : 2_000;
}

export function localVmViewerTarget(status: Pick<LocalVmStatus, "screen" | "viewer_url" | "target_key">): string | null {
  return status.screen?.viewerTarget
    ?? (status.screen === undefined && status.viewer_url && status.target_key ? viewerTargetId({ key: status.target_key }) : null);
}
