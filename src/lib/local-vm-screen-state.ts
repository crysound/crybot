import { viewerTargetId } from "../../shared/desktop-viewer";
import type { LocaleKey } from "@/locales";
import { t } from "@/lib/i18n";

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

export function localVmTakeoverTarget(
  phase: string,
  status: LocalVmStatus | null,
  current: boolean,
): string | null {
  if (!current || phase !== "vm" || !status) return null;
  return localVmViewerTarget(status);
}

export function localVmTakeoverSession(
  viewerConnectionKey: string,
  panelView: string,
  screenTarget: string | null,
): string {
  return `${viewerConnectionKey}:${panelView}${screenTarget ? `:${screenTarget}` : ""}`;
}

export function localVmUnassignedStatus(status: LocalVmStatus | null): LocalVmStatus | null {
  return status ? { ...status, screen: null, queue_position: undefined } : null;
}

export function localVmWaitingMessageKey(waitState: LocalVmWaitState): LocaleKey {
  return waitState === "queued" ? "vm.screens.queued" : "vm.screens.unassignedBot";
}

export function localVmEmptyStateText(args: {
  cloudBackend: string;
  cloudLine: string;
  autoLine: string;
  localLine: string;
  browserLine: string;
  offLine: string;
  cloudRefused: boolean;
  cloudBlocked: boolean;
  vmStatus: LocalVmStatus | null;
}): Record<string, string> {
  return {
    checking: t("computer.phase.checking"),
    starting: args.cloudBackend === "vps" ? t("computer.phase.starting") : args.cloudLine,
    "busy-boat": args.cloudLine,
    unconfigured: args.cloudLine,
    "auto-unavailable": args.autoLine,
    "team-boat": args.autoLine,
    "show-ready-boat": t("computer.phase.showReadyBoat"),
    "show-sleeping-boat": t("computer.phase.showSleepingBoat"),
    "show-pending-boat": t("computer.phase.showPendingBoat"),
    "cloud-new": args.cloudLine,
    "cloud-asleep": args.cloudLine,
    "vps-unconfigured": t("computer.phase.vpsUnconfigured"),
    "vps-incompatible": t("computer.phase.vpsIncompatible"),
    "vps-stopped": t("computer.phase.vpsStopped"),
    "local-unavailable": args.localLine,
    "vm-unavailable": t("computer.phase.vmUnavailable"),
    "vm-waiting": t(localVmWaitingMessageKey(args.vmStatus ? localVmWaitState(args.vmStatus) : "unassigned"), { position: args.vmStatus?.queue_position ?? 0 }),
    browser: args.browserLine,
    off: args.offLine,
    error: args.cloudRefused || args.cloudBlocked ? args.cloudLine : t("computer.phase.error"),
  };
}
